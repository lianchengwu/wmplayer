package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

// CookieManager 全局Cookie管理器
type CookieManager struct {
	cookie string
	mutex  sync.RWMutex
}

// 全局Cookie管理器实例
var GlobalCookieManager = &CookieManager{}

// GetCookieFilePath 获取cookie文件路径
func GetCookieFilePath() (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("获取用户主目录失败: %v", err)
	}
	
	configDir := filepath.Join(homeDir, ".config", "gomusic")
	cookieFile := filepath.Join(configDir, "cookies.txt")
	
	return cookieFile, nil
}

// LoadCookieFromFile 从文件加载cookie到内存
func (cm *CookieManager) LoadCookieFromFile() error {
	cm.mutex.Lock()
	defer cm.mutex.Unlock()
	
	cookieFile, err := GetCookieFilePath()
	if err != nil {
		return err
	}
	
	// 检查文件是否存在
	if _, err := os.Stat(cookieFile); os.IsNotExist(err) {
		cm.cookie = ""
		return nil // 文件不存在不算错误，只是没有cookie
	}
	
	// 读取文件内容
	content, err := os.ReadFile(cookieFile)
	if err != nil {
		return fmt.Errorf("读取cookie文件失败: %v", err)
	}
	
	cm.cookie = strings.TrimSpace(string(content))
	return nil
}

// GetCookie 获取当前cookie
func (cm *CookieManager) GetCookie() string {
	cm.mutex.RLock()
	defer cm.mutex.RUnlock()
	return cm.cookie
}

// SetCookie 设置cookie到内存
func (cm *CookieManager) SetCookie(cookie string) {
	cm.mutex.Lock()
	defer cm.mutex.Unlock()
	cm.cookie = cookie
}

// SaveCookieToFile 保存cookie到文件并更新内存
func (cm *CookieManager) SaveCookieToFile(token string, userid int64) error {
	// 获取cookie文件路径
	cookieFile, err := GetCookieFilePath()
	if err != nil {
		return err
	}
	
	// 确保目录存在
	configDir := filepath.Dir(cookieFile)
	if err := os.MkdirAll(configDir, 0755); err != nil {
		return fmt.Errorf("创建配置目录失败: %v", err)
	}
	
	// 构建cookie内容
	cookieContent := fmt.Sprintf("token=%s;userid=%d", token, userid)
	
	// 写入文件
	if err := os.WriteFile(cookieFile, []byte(cookieContent), 0644); err != nil {
		return fmt.Errorf("写入cookie文件失败: %v", err)
	}
	
	// 更新内存中的cookie
	cm.SetCookie(cookieContent)
	
	return nil
}

// ClearCookie 清除cookie（内存和文件）
func (cm *CookieManager) ClearCookie() error {
	cm.mutex.Lock()
	defer cm.mutex.Unlock()
	
	// 清除内存中的cookie
	cm.cookie = ""
	
	// 删除cookie文件
	cookieFile, err := GetCookieFilePath()
	if err != nil {
		return err
	}
	
	if _, err := os.Stat(cookieFile); err == nil {
		if err := os.Remove(cookieFile); err != nil {
			return fmt.Errorf("删除cookie文件失败: %v", err)
		}
	}
	
	return nil
}

// IsLoggedIn 检查是否已登录（有有效的cookie）
func (cm *CookieManager) IsLoggedIn() bool {
	cm.mutex.RLock()
	defer cm.mutex.RUnlock()
	return cm.cookie != ""
}

// InitializeCookieManager 初始化Cookie管理器（在应用启动时调用）
func InitializeCookieManager() error {
	return GlobalCookieManager.LoadCookieFromFile()
}
