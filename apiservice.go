package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sync"
	"time"
)

// KuGouAPIManager KuGouMusicApi 后台服务管理器
type KuGouAPIManager struct {
	cmd       *exec.Cmd
	mu        sync.Mutex
	isStarted bool
	port      string
}

// GlobalAPIManager 全局 API 进程管理器
var GlobalAPIManager = &KuGouAPIManager{
	port: "40000",
}

// isPortListening 检查端口是否正在被监听
func isPortListening(addr string) bool {
	conn, err := net.DialTimeout("tcp", addr, 500*time.Millisecond)
	if err != nil {
		return false
	}
	_ = conn.Close()
	return true
}

// isAPIReady 检查 API 服务是否可响应
func isAPIReady(url string) bool {
	client := &http.Client{
		Timeout: 1 * time.Second,
	}
	resp, err := client.Get(url)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode > 0
}

// findExecutable 寻找可执行文件
func (m *KuGouAPIManager) findExecutable() (string, []string) {
	execPath, err := os.Executable()
	var execDir string
	if err == nil {
		execDir = filepath.Dir(execPath)
	}

	cwd, _ := os.Getwd()

	binaryNames := []string{"KuGouMusicApi"}
	switch runtime.GOOS {
	case "windows":
		binaryNames = []string{"KuGouMusicApi.exe", "app_win.exe", "KuGouMusicApi"}
	case "darwin":
		binaryNames = []string{"KuGouMusicApi", "app_macos"}
	default:
		binaryNames = []string{"KuGouMusicApi", "app_linux"}
	}

	var candidatePaths []string
	for _, binaryName := range binaryNames {
		candidatePaths = append(candidatePaths,
			// 1. 同级目录
			filepath.Join(execDir, binaryName),
			filepath.Join(cwd, binaryName),
			// 2. api 子目录
			filepath.Join(execDir, "api", binaryName),
			filepath.Join(cwd, "api", binaryName),
			filepath.Join(execDir, "KuGouMusicApi", binaryName),
			filepath.Join(cwd, "KuGouMusicApi", binaryName),
			// 3. macOS App Bundle 资源目录
			filepath.Join(execDir, "..", "Resources", binaryName),
			filepath.Join(execDir, "..", "Resources", "api", binaryName),
		)
	}

	for _, p := range candidatePaths {
		if fi, err := os.Stat(p); err == nil && !fi.IsDir() {
			return p, nil
		}
	}

	// 4. Node.js 源码包备用：若存在 app.js 且系统有 node
	candidateNodeApps := []string{
		filepath.Join(execDir, "KuGouMusicApi", "app.js"),
		filepath.Join(cwd, "KuGouMusicApi", "app.js"),
		filepath.Join(execDir, "api", "app.js"),
		filepath.Join(cwd, "api", "app.js"),
		filepath.Join(execDir, "app.js"),
		filepath.Join(cwd, "app.js"),
	}

	nodeBin, nodeErr := exec.LookPath("node")
	if nodeErr == nil {
		for _, appPath := range candidateNodeApps {
			if fi, err := os.Stat(appPath); err == nil && !fi.IsDir() {
				return nodeBin, []string{appPath}
			}
		}
	}

	// 5. 检查系统 PATH
	if p, err := exec.LookPath("KuGouMusicApi"); err == nil {
		return p, nil
	}

	return "", nil
}

// Start 启动 KuGouMusicApi 后台服务
func (m *KuGouAPIManager) Start() {
	m.mu.Lock()
	defer m.mu.Unlock()

	targetAddr := fmt.Sprintf("127.0.0.1:%s", m.port)
	targetURL := fmt.Sprintf("http://127.0.0.1:%s", m.port)

	// 1. 检查是否已有服务在运行
	if isPortListening(targetAddr) {
		log.Printf("✅ 检测到 KuGouMusicApi 服务已在运行: %s", targetURL)
		return
	}

	// 2. 查找可执行文件
	binPath, extraArgs := m.findExecutable()
	if binPath == "" {
		log.Printf("⚠️ 未在本地找到 KuGouMusicApi 可执行文件或 Node 服务脚本，请确保已手动启动 API 服务 (http://127.0.0.1:%s)", m.port)
		return
	}

	log.Printf("🚀 正在自启动 KuGouMusicApi 服务: %s %v ...", binPath, extraArgs)

	cmd := exec.Command(binPath, extraArgs...)
	cmd.Dir = filepath.Dir(binPath)

	// 注入运行环境变量
	env := os.Environ()
	env = append(env,
		fmt.Sprintf("PORT=%s", m.port),
		"platform=lite",
		"NODE_ENV=production",
	)
	cmd.Env = env

	// 绑定标准输出以便在开发时查看日志
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Start(); err != nil {
		log.Printf("❌ 启动 KuGouMusicApi 失败: %v", err)
		return
	}

	m.cmd = cmd
	m.isStarted = true
	log.Printf("✅ KuGouMusicApi 进程已启动 (PID: %d)", cmd.Process.Pid)

	// 等待服务监听就绪
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		ticker := time.NewTicker(200 * time.Millisecond)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				log.Printf("⚠️ KuGouMusicApi 服务启动等待超时，请检查服务状态")
				return
			case <-ticker.C:
				if isPortListening(targetAddr) {
					log.Printf("🎉 KuGouMusicApi 服务就绪: %s", targetURL)
					return
				}
			}
		}
	}()
}

// Stop 停止由本应用拉起的 KuGouMusicApi 服务
func (m *KuGouAPIManager) Stop() {
	m.mu.Lock()
	defer m.mu.Unlock()

	if !m.isStarted || m.cmd == nil || m.cmd.Process == nil {
		return
	}

	log.Printf("🛑 正在停止 KuGouMusicApi (PID: %d)...", m.cmd.Process.Pid)

	// 优雅终止或强制终止
	if runtime.GOOS == "windows" {
		_ = m.cmd.Process.Kill()
	} else {
		_ = m.cmd.Process.Signal(os.Interrupt)
		time.Sleep(200 * time.Millisecond)
		_ = m.cmd.Process.Kill()
	}

	m.isStarted = false
	m.cmd = nil
	log.Printf("✅ KuGouMusicApi 已停止")
}
