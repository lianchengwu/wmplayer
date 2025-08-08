package main

import (
	"context"
	"log"
	"runtime"
	"sync"
)

// MediaKeyService 媒体键服务
type MediaKeyService struct {
	ctx          context.Context
	app          any
	isRegistered bool
	mu           sync.RWMutex
	mprisService *MPRISService // MPRIS服务实例
}

// NewMediaKeyService 创建媒体键服务
func NewMediaKeyService() *MediaKeyService {
	return &MediaKeyService{}
}

// SetContext 设置上下文
func (m *MediaKeyService) SetContext(ctx context.Context) {
	m.ctx = ctx
}

// SetApp 设置应用实例
func (m *MediaKeyService) SetApp(app any) {
	m.app = app
	log.Println("🎵 媒体键服务：应用实例已设置")
}

// SetPlayerService 设置播放器服务（预留接口）
func (m *MediaKeyService) SetPlayerService(playerService any) {
	// 预留接口，当前版本主要依赖前端实现
	log.Println("🎵 媒体键服务：播放器服务接口已设置（当前版本主要依赖前端）")
}

// RegisterMediaKeys 注册媒体键
func (m *MediaKeyService) RegisterMediaKeys() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.isRegistered {
		log.Println("🎵 媒体键已注册，跳过重复注册")
		return nil
	}

	log.Println("🎵 开始注册媒体键服务...")

	// 检查平台支持
	if !m.isPlatformSupported() {
		log.Println("⚠️ 当前平台不支持系统级媒体键，使用前端键盘监听")
		return m.registerFrontendKeys()
	}

	// 尝试注册系统级媒体键
	if err := m.registerSystemMediaKeys(); err != nil {
		log.Printf("⚠️ 系统级媒体键注册失败: %v，降级到前端键盘监听", err)
		return m.registerFrontendKeys()
	}

	m.isRegistered = true
	log.Println("✅ 系统级媒体键注册成功")
	m.printSupportedKeys()

	return nil
}

// isPlatformSupported 检查平台是否支持系统级媒体键
func (m *MediaKeyService) isPlatformSupported() bool {
	switch runtime.GOOS {
	case "windows", "darwin", "linux":
		return true
	default:
		return false
	}
}

// registerSystemMediaKeys 注册系统级媒体键
func (m *MediaKeyService) registerSystemMediaKeys() error {
	log.Println("🎵 尝试注册系统级媒体键...")

	// 这里可以根据不同平台实现具体的媒体键注册逻辑
	switch runtime.GOOS {
	case "linux":
		return m.registerLinuxMediaKeys()
	case "windows":
		return m.registerWindowsMediaKeys()
	case "darwin":
		return m.registerMacMediaKeys()
	default:
		return m.registerFrontendKeys()
	}
}

// registerLinuxMediaKeys Linux平台媒体键注册
func (m *MediaKeyService) registerLinuxMediaKeys() error {
	log.Println("🐧 Linux平台：启用MPRIS D-Bus媒体控制")

	// 创建MPRIS服务
	if m.mprisService == nil {
		m.mprisService = NewMPRISService()
		m.mprisService.SetContext(m.ctx)
		m.mprisService.SetApp(m.app)
		m.mprisService.SetMediaKeyService(m)
	}

	// 启动MPRIS服务
	if err := m.mprisService.Start(); err != nil {
		log.Printf("⚠️ MPRIS服务启动失败: %v，降级到前端键盘监听", err)
		return m.registerFrontendKeys()
	}

	log.Println("✅ MPRIS D-Bus媒体控制启动成功")

	// 同时启用前端键盘监听作为备用
	return m.registerFrontendKeys()
}

// registerWindowsMediaKeys Windows平台媒体键注册
func (m *MediaKeyService) registerWindowsMediaKeys() error {
	log.Println("🪟 Windows平台：使用前端键盘监听（推荐方案）")
	// Windows下可以使用RegisterHotKey API，但需要CGO
	// 目前使用前端键盘监听作为主要方案
	return m.registerFrontendKeys()
}

// registerMacMediaKeys macOS平台媒体键注册
func (m *MediaKeyService) registerMacMediaKeys() error {
	log.Println("🍎 macOS平台：使用前端键盘监听（推荐方案）")
	// macOS下可以使用Carbon或Cocoa API，但需要CGO
	// 目前使用前端键盘监听作为主要方案
	return m.registerFrontendKeys()
}

// registerFrontendKeys 注册前端键盘监听（主要方案）
func (m *MediaKeyService) registerFrontendKeys() error {
	log.Println("🎵 媒体键服务：启用前端键盘监听模式")
	log.Println("💡 这是推荐的实现方式，具有更好的兼容性和稳定性")

	m.isRegistered = true
	m.printSupportedKeys()
	return nil
}

// printSupportedKeys 打印支持的快捷键
func (m *MediaKeyService) printSupportedKeys() {
	log.Println("📋 支持的媒体快捷键:")
	log.Println("   🎵 播放控制:")
	log.Println("      - Space: 播放/暂停")
	log.Println("      - F8: 播放/暂停")
	log.Println("   ⏭️ 切换歌曲:")
	log.Println("      - Ctrl+←: 上一首")
	log.Println("      - Ctrl+→: 下一首")
	log.Println("      - F7: 上一首")
	log.Println("      - F9: 下一首")
	log.Println("   🔊 音量控制:")
	log.Println("      - Ctrl+↑: 音量+")
	log.Println("      - Ctrl+↓: 音量-")
	log.Println("   ℹ️ 注意：需要应用窗口处于焦点状态")
}

// UnregisterMediaKeys 取消注册媒体键
func (m *MediaKeyService) UnregisterMediaKeys() {
	m.mu.Lock()
	defer m.mu.Unlock()

	if !m.isRegistered {
		return
	}

	log.Println("🎵 正在取消注册媒体键...")

	// 停止MPRIS服务
	if m.mprisService != nil {
		m.mprisService.StopService()
		m.mprisService = nil
	}

	m.isRegistered = false
	log.Println("✅ 媒体键已取消注册")
}

// GetMediaKeyStatus 获取媒体键状态
func (m *MediaKeyService) GetMediaKeyStatus() map[string]any {
	m.mu.RLock()
	defer m.mu.RUnlock()

	status := map[string]any{
		"success":    true,
		"registered": m.isRegistered,
		"platform":   runtime.GOOS,
		"supported":  m.isPlatformSupported(),
	}

	// 检查MPRIS状态
	if runtime.GOOS == "linux" && m.mprisService != nil && m.mprisService.IsActive() {
		status["mode"] = "mpris_dbus"
		status["message"] = "MPRIS D-Bus媒体控制（系统级）"
		status["mpris"] = m.mprisService.GetStatus()
		status["note"] = "支持全局媒体键控制，无需应用窗口焦点"
	} else {
		status["mode"] = "frontend_keyboard_listener"
		status["message"] = "前端键盘监听模式"
		status["note"] = "需要应用窗口处于焦点状态"
	}

	status["keys"] = []string{
		"Space - 播放/暂停",
		"F8 - 播放/暂停",
		"Ctrl+Left - 上一首",
		"Ctrl+Right - 下一首",
		"F7 - 上一首",
		"F9 - 下一首",
		"Ctrl+Up - 音量+",
		"Ctrl+Down - 音量-",
	}

	return status
}

// IsRegistered 检查是否已注册
func (m *MediaKeyService) IsRegistered() bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.isRegistered
}

// HandleMediaKeyEvent 处理媒体键事件（供前端调用）
func (m *MediaKeyService) HandleMediaKeyEvent(action string) map[string]any {
	log.Printf("🎵 收到前端媒体键事件: %s", action)

	switch action {
	case "play_pause":
		return m.handlePlayPause()
	case "next_track":
		return m.handleNextTrack()
	case "previous_track":
		return m.handlePreviousTrack()
	case "volume_up":
		return m.handleVolumeUp()
	case "volume_down":
		return m.handleVolumeDown()
	default:
		return map[string]any{
			"success": false,
			"message": "未知的媒体键动作: " + action,
		}
	}
}

// handlePlayPause 处理播放/暂停
func (m *MediaKeyService) handlePlayPause() map[string]any {
	log.Println("🎵 媒体键触发：播放/暂停")

	// 这里可以添加具体的播放/暂停逻辑
	// 由于当前架构主要依赖前端，这里主要做日志记录

	return map[string]any{
		"success": true,
		"message": "播放/暂停命令已处理",
		"action":  "play_pause",
	}
}

// handleNextTrack 处理下一首
func (m *MediaKeyService) handleNextTrack() map[string]any {
	log.Println("🎵 媒体键触发：下一首")

	return map[string]any{
		"success": true,
		"message": "下一首命令已处理",
		"action":  "next_track",
	}
}

// handlePreviousTrack 处理上一首
func (m *MediaKeyService) handlePreviousTrack() map[string]any {
	log.Println("🎵 媒体键触发：上一首")

	return map[string]any{
		"success": true,
		"message": "上一首命令已处理",
		"action":  "previous_track",
	}
}

// handleVolumeUp 处理音量增加
func (m *MediaKeyService) handleVolumeUp() map[string]any {
	log.Println("🎵 媒体键触发：音量+")

	return map[string]any{
		"success": true,
		"message": "音量增加命令已处理",
		"action":  "volume_up",
	}
}

// handleVolumeDown 处理音量减少
func (m *MediaKeyService) handleVolumeDown() map[string]any {
	log.Println("🎵 媒体键触发：音量-")

	return map[string]any{
		"success": true,
		"message": "音量减少命令已处理",
		"action":  "volume_down",
	}
}

// ==================== MPRIS状态更新方法 ====================

// UpdateMPRISPlaybackStatus 更新MPRIS播放状态
func (m *MediaKeyService) UpdateMPRISPlaybackStatus(status string) {
	if m.mprisService != nil && m.mprisService.IsActive() {
		m.mprisService.SetPlaybackStatus(status)
	}
}

// UpdateMPRISMetadata 更新MPRIS歌曲元数据
func (m *MediaKeyService) UpdateMPRISMetadata(title, artist, album, artUrl string, duration int64) {
	if m.mprisService != nil && m.mprisService.IsActive() {
		m.mprisService.SetMetadata(title, artist, album, artUrl, duration)
	}
}

// UpdateMPRISVolume 更新MPRIS音量
func (m *MediaKeyService) UpdateMPRISVolume(volume float64) {
	if m.mprisService != nil && m.mprisService.IsActive() {
		m.mprisService.SetVolume(volume)
	}
}

// UpdateMPRISPosition 更新MPRIS播放位置
func (m *MediaKeyService) UpdateMPRISPosition(position int64) {
	if m.mprisService != nil && m.mprisService.IsActive() {
		m.mprisService.SetPositionMicroseconds(position)
	}
}

// EmitMPRISSeeked 发射MPRIS Seeked信号
func (m *MediaKeyService) EmitMPRISSeeked(position int64) {
	if m.mprisService != nil && m.mprisService.IsActive() {
		m.mprisService.EmitSeeked(position)
	}
}

// ==================== 前端调用的MPRIS更新方法 ====================

// UpdatePlaybackStatus 更新播放状态（供前端调用）
func (m *MediaKeyService) UpdatePlaybackStatus(status string) map[string]any {
	log.Printf("🎵 前端请求更新播放状态: %s", status)

	m.UpdateMPRISPlaybackStatus(status)

	return map[string]any{
		"success": true,
		"message": "播放状态已更新",
		"status":  status,
	}
}

// UpdateSongMetadata 更新歌曲元数据（供前端调用）
func (m *MediaKeyService) UpdateSongMetadata(title, artist, album, artUrl string, duration int64) map[string]any {
	log.Printf("🎵 前端请求更新歌曲元数据: %s - %s", title, artist)

	m.UpdateMPRISMetadata(title, artist, album, artUrl, duration)

	return map[string]any{
		"success": true,
		"message": "歌曲元数据已更新",
		"title":   title,
		"artist":  artist,
		"album":   album,
	}
}

// UpdatePlayerVolume 更新播放器音量（供前端调用）
func (m *MediaKeyService) UpdatePlayerVolume(volume float64) map[string]any {
	log.Printf("🎵 前端请求更新音量: %.2f", volume)

	m.UpdateMPRISVolume(volume)

	return map[string]any{
		"success": true,
		"message": "音量已更新",
		"volume":  volume,
	}
}

// UpdatePlayerPosition 更新播放位置（供前端调用）
func (m *MediaKeyService) UpdatePlayerPosition(position int64) map[string]any {
	// 位置更新比较频繁，减少日志输出
	// log.Printf("🎵 前端请求更新播放位置: %d微秒", position)

	m.UpdateMPRISPosition(position)

	return map[string]any{
		"success":  true,
		"message":  "播放位置已更新",
		"position": position,
	}
}

// NotifySeek 通知跳转事件（供前端调用）
func (m *MediaKeyService) NotifySeek(position int64) map[string]any {
	log.Printf("🎵 前端通知跳转事件: %d微秒", position)

	m.EmitMPRISSeeked(position)

	return map[string]any{
		"success":  true,
		"message":  "跳转事件已发射",
		"position": position,
	}
}
