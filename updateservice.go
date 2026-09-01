package main

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/updater"
	"github.com/wailsapp/wails/v3/pkg/updater/providers/github"
)

// CurrentAppVersion 当前应用版本号
const CurrentAppVersion = "0.6.0"

// UpdateService 自动更新服务
type UpdateService struct {
	app     *application.App
	mu      sync.RWMutex
	ready   bool
	release *updater.Release
}

// NewUpdateService 创建自动更新服务
func NewUpdateService() *UpdateService {
	return &UpdateService{}
}

// SetApp 设置 Wails App 实例
func (u *UpdateService) SetApp(app *application.App) {
	u.app = app
}

// InitUpdater 初始化更新模块
func (u *UpdateService) InitUpdater() error {
	if u.app == nil || u.app.Updater == nil {
		return fmt.Errorf("app updater not initialized")
	}

	provider, err := github.New(github.Config{
		Repository: "lianchengwu/lmplayer",
	})
	if err != nil {
		return fmt.Errorf("failed to create github updater provider: %w", err)
	}

	err = u.app.Updater.Init(updater.Config{
		CurrentVersion: CurrentAppVersion,
		Providers:      []updater.Provider{provider},
	})
	if err != nil {
		log.Printf("⚠️ 自动更新器初始化提示: %v", err)
	} else {
		u.ready = true
		log.Printf("✅ 自动更新器初始化成功 (当前版本: %s)", CurrentAppVersion)
	}
	return nil
}

// UpdateCheckResponse 检查更新响应结构
type UpdateCheckResponse struct {
	Success        bool   `json:"success"`
	HasUpdate      bool   `json:"hasUpdate"`
	CurrentVersion string `json:"currentVersion"`
	LatestVersion  string `json:"latestVersion"`
	ReleaseNotes   string `json:"releaseNotes"`
	ReleaseURL     string `json:"releaseUrl"`
	Message        string `json:"message"`
}

// CheckForUpdates 检查是否有可用更新
func (u *UpdateService) CheckForUpdates() UpdateCheckResponse {
	if u.app == nil || u.app.Updater == nil {
		return UpdateCheckResponse{
			Success:        false,
			CurrentVersion: CurrentAppVersion,
			Message:        "更新模块未就绪",
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	rel, err := u.app.Updater.Check(ctx)
	if err != nil {
		log.Printf("❌ 检查更新失败: %v", err)
		return UpdateCheckResponse{
			Success:        false,
			CurrentVersion: CurrentAppVersion,
			Message:        fmt.Sprintf("检查更新失败: %v", err),
		}
	}

	if rel == nil {
		return UpdateCheckResponse{
			Success:        true,
			HasUpdate:      false,
			CurrentVersion: CurrentAppVersion,
			LatestVersion:  CurrentAppVersion,
			Message:        "当前已是最新版本",
		}
	}

	u.mu.Lock()
	u.release = rel
	u.mu.Unlock()

	return UpdateCheckResponse{
		Success:        true,
		HasUpdate:      true,
		CurrentVersion: CurrentAppVersion,
		LatestVersion:  rel.Version,
		ReleaseNotes:   rel.Notes,
		ReleaseURL:     fmt.Sprintf("https://github.com/lianchengwu/lmplayer/releases/tag/v%s", rel.Version),
		Message:        fmt.Sprintf("发现新版本 v%s", rel.Version),
	}
}

// GetCurrentVersion 获取当前版本
func (u *UpdateService) GetCurrentVersion() string {
	return CurrentAppVersion
}
