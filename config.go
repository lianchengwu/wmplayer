package main

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// baseApi 后端服务的默认地址
var baseApi = "http://127.0.0.1:40000"

// GetBaseAPI 获取后端服务地址（支持环境变量覆盖）
func GetBaseAPI() string {
	if envAPI := os.Getenv("WMPLAYER_API_URL"); envAPI != "" {
		return envAPI
	}
	return baseApi
}

// defaultHTTPClient 全局复用的 HTTP 连接池客户端
var defaultHTTPClient = &http.Client{
	Timeout: 25 * time.Second,
	Transport: &http.Transport{
		Proxy: http.ProxyFromEnvironment,
		DialContext: (&net.Dialer{
			Timeout:   10 * time.Second,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 20,
		IdleConnTimeout:     90 * time.Second,
		TLSHandshakeTimeout: 10 * time.Second,
		DisableCompression:  false,
	},
}

// executeJSONGet 发送 HTTP GET 请求并流式解析 JSON 响应
func executeJSONGet(requestURL string, target any) error {
	req, err := http.NewRequest("GET", requestURL, nil)
	if err != nil {
		return fmt.Errorf("创建请求失败: %w", err)
	}

	req.Header.Set("User-Agent", "wmplayer/3.0")
	req.Header.Set("Accept", "application/json, text/plain, */*")

	resp, err := defaultHTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("网络请求失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("HTTP 状态码异常: %d", resp.StatusCode)
	}

	if err := json.NewDecoder(resp.Body).Decode(target); err != nil {
		return fmt.Errorf("解析响应 JSON 失败: %w", err)
	}

	return nil
}

var (
	appConfigDirOnce sync.Once
	appConfigDir     string
	appCacheDirOnce  sync.Once
	appCacheDir      string
)

// GetAppConfigDir 获取应用程序配置目录（跨平台兼容，自动兼容历史目录）
func GetAppConfigDir() (string, error) {
	var initErr error
	appConfigDirOnce.Do(func() {
		userConfigDir, err := os.UserConfigDir()
		if err != nil {
			homeDir, hErr := os.UserHomeDir()
			if hErr != nil {
				initErr = fmt.Errorf("获取配置目录失败: %v", err)
				return
			}
			userConfigDir = filepath.Join(homeDir, ".config")
		}

		targetDir := filepath.Join(userConfigDir, "wmplayer")

		// 检查历史目录并做兼容/迁移检查
		homeDir, _ := os.UserHomeDir()
		if homeDir != "" {
			oldGomusic := filepath.Join(homeDir, ".config", "gomusic")
			if _, statErr := os.Stat(targetDir); os.IsNotExist(statErr) {
				if _, oldErr := os.Stat(oldGomusic); oldErr == nil {
					// 优先保留旧目录数据兼容
					targetDir = oldGomusic
				}
			}
		}

		if err := os.MkdirAll(targetDir, 0755); err != nil {
			initErr = fmt.Errorf("创建配置目录失败: %v", err)
			return
		}

		appConfigDir = targetDir
	})

	return appConfigDir, initErr
}

// GetAppCacheDir 获取应用程序缓存目录（跨平台兼容，自动兼容历史目录）
func GetAppCacheDir() (string, error) {
	var initErr error
	appCacheDirOnce.Do(func() {
		userCacheDir, err := os.UserCacheDir()
		if err != nil {
			homeDir, hErr := os.UserHomeDir()
			if hErr != nil {
				initErr = fmt.Errorf("获取缓存目录失败: %v", err)
				return
			}
			userCacheDir = filepath.Join(homeDir, ".cache")
		}

		targetDir := filepath.Join(userCacheDir, "wmplayer")

		// 检查历史目录并做兼容
		homeDir, _ := os.UserHomeDir()
		if homeDir != "" {
			oldGomusic := filepath.Join(homeDir, ".cache", "gomusic")
			if _, statErr := os.Stat(targetDir); os.IsNotExist(statErr) {
				if _, oldErr := os.Stat(oldGomusic); oldErr == nil {
					targetDir = oldGomusic
				}
			}
		}

		if err := os.MkdirAll(targetDir, 0755); err != nil {
			initErr = fmt.Errorf("创建缓存目录失败: %v", err)
			return
		}

		appCacheDir = targetDir
	})

	return appCacheDir, initErr
}
