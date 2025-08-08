package main

import (
	"context"
	"fmt"
	"log"
	"runtime"
	"sync"
	"time"

	"github.com/godbus/dbus/v5"
	"github.com/godbus/dbus/v5/introspect"
	"github.com/godbus/dbus/v5/prop"
)

// MPRISService MPRIS D-Bus媒体控制服务
type MPRISService struct {
	ctx             context.Context
	app             any
	conn            *dbus.Conn
	props           *prop.Properties
	mu              sync.RWMutex
	isActive        bool
	mediaKeyService *MediaKeyService // 引用MediaKeyService

	// 播放器状态
	playbackStatus string // "Playing", "Paused", "Stopped"
	metadata       map[string]dbus.Variant
	volume         float64
	position       int64 // 微秒
	canPlay        bool
	canPause       bool
	canSeek        bool
	canControl     bool
	canGoNext      bool
	canGoPrevious  bool
}

// MPRIS接口常量
const (
	mprisPath            = "/org/mpris/MediaPlayer2"
	mprisInterface       = "org.mpris.MediaPlayer2"
	mprisPlayerInterface = "org.mpris.MediaPlayer2.Player"
	busName              = "org.mpris.MediaPlayer2.wmplayer"
)

// NewMPRISService 创建MPRIS服务
func NewMPRISService() *MPRISService {
	return &MPRISService{
		playbackStatus: "Stopped",
		metadata:       make(map[string]dbus.Variant),
		volume:         0.5,
		position:       0,
		canPlay:        true,
		canPause:       true,
		canSeek:        true,
		canControl:     true,
		canGoNext:      true,
		canGoPrevious:  true,
	}
}

// SetContext 设置上下文
func (m *MPRISService) SetContext(ctx context.Context) {
	m.ctx = ctx
}

// SetApp 设置应用实例
func (m *MPRISService) SetApp(app any) {
	m.app = app
}

// SetMediaKeyService 设置MediaKeyService实例
func (m *MPRISService) SetMediaKeyService(service *MediaKeyService) {
	m.mediaKeyService = service
}

// Start 启动MPRIS服务
func (m *MPRISService) Start() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.isActive {
		log.Println("🎵 MPRIS服务已启动，跳过重复启动")
		return nil
	}

	// 检查平台支持
	if runtime.GOOS != "linux" {
		log.Printf("⚠️ MPRIS仅支持Linux平台，当前平台: %s", runtime.GOOS)
		return fmt.Errorf("MPRIS仅支持Linux平台")
	}

	log.Println("🎵 启动MPRIS D-Bus媒体控制服务...")

	// 连接到会话总线
	conn, err := dbus.ConnectSessionBus()
	if err != nil {
		return fmt.Errorf("连接D-Bus会话总线失败: %v", err)
	}
	m.conn = conn

	// 请求总线名称
	reply, err := conn.RequestName(busName, dbus.NameFlagDoNotQueue)
	if err != nil {
		conn.Close()
		return fmt.Errorf("请求D-Bus名称失败: %v", err)
	}

	if reply != dbus.RequestNameReplyPrimaryOwner {
		conn.Close()
		return fmt.Errorf("无法获取D-Bus名称所有权")
	}

	// 设置属性管理器
	m.setupProperties()

	// 导出对象
	if err := m.exportObjects(); err != nil {
		conn.Close()
		return fmt.Errorf("导出D-Bus对象失败: %v", err)
	}

	m.isActive = true
	log.Println("✅ MPRIS D-Bus服务启动成功")
	log.Printf("📡 D-Bus服务名称: %s", busName)
	log.Printf("📡 D-Bus对象路径: %s", mprisPath)

	return nil
}

// StopService 停止MPRIS服务
func (m *MPRISService) StopService() {
	m.mu.Lock()
	defer m.mu.Unlock()

	if !m.isActive {
		return
	}

	log.Println("🎵 停止MPRIS D-Bus服务...")

	if m.conn != nil {
		// 释放总线名称
		_, err := m.conn.ReleaseName(busName)
		if err != nil {
			log.Printf("⚠️ 释放D-Bus名称失败: %v", err)
		}

		// 关闭连接
		m.conn.Close()
		m.conn = nil
	}

	m.isActive = false
	log.Println("✅ MPRIS D-Bus服务已停止")
}

// setupProperties 设置属性管理器
func (m *MPRISService) setupProperties() {
	m.props = prop.New(m.conn, mprisPath, map[string]map[string]*prop.Prop{
		mprisInterface: {
			"CanQuit":             {Value: true, Writable: false, Emit: prop.EmitTrue, Callback: nil},
			"CanRaise":            {Value: true, Writable: false, Emit: prop.EmitTrue, Callback: nil},
			"HasTrackList":        {Value: false, Writable: false, Emit: prop.EmitTrue, Callback: nil},
			"Identity":            {Value: "wmPlayer Music", Writable: false, Emit: prop.EmitTrue, Callback: nil},
			"DesktopEntry":        {Value: "wmplayer", Writable: false, Emit: prop.EmitTrue, Callback: nil},
			"SupportedUriSchemes": {Value: []string{"file", "http", "https"}, Writable: false, Emit: prop.EmitTrue, Callback: nil},
			"SupportedMimeTypes":  {Value: []string{"audio/mpeg", "audio/flac", "audio/ogg", "audio/wav", "audio/aac", "audio/mp4"}, Writable: false, Emit: prop.EmitTrue, Callback: nil},
		},
		mprisPlayerInterface: {
			"PlaybackStatus": {Value: m.playbackStatus, Writable: false, Emit: prop.EmitTrue, Callback: nil},
			"Rate":           {Value: 1.0, Writable: true, Emit: prop.EmitTrue, Callback: m.onRateChanged},
			"Metadata":       {Value: m.metadata, Writable: false, Emit: prop.EmitTrue, Callback: nil},
			"Volume":         {Value: m.volume, Writable: true, Emit: prop.EmitTrue, Callback: m.onVolumeChanged},
			"Position":       {Value: m.position, Writable: false, Emit: prop.EmitFalse, Callback: nil},
			"MinimumRate":    {Value: 1.0, Writable: false, Emit: prop.EmitTrue, Callback: nil},
			"MaximumRate":    {Value: 1.0, Writable: false, Emit: prop.EmitTrue, Callback: nil},
			"CanGoNext":      {Value: m.canGoNext, Writable: false, Emit: prop.EmitTrue, Callback: nil},
			"CanGoPrevious":  {Value: m.canGoPrevious, Writable: false, Emit: prop.EmitTrue, Callback: nil},
			"CanPlay":        {Value: m.canPlay, Writable: false, Emit: prop.EmitTrue, Callback: nil},
			"CanPause":       {Value: m.canPause, Writable: false, Emit: prop.EmitTrue, Callback: nil},
			"CanSeek":        {Value: m.canSeek, Writable: false, Emit: prop.EmitTrue, Callback: nil},
			"CanControl":     {Value: m.canControl, Writable: false, Emit: prop.EmitTrue, Callback: nil},
		},
	})
}

// exportObjects 导出D-Bus对象
func (m *MPRISService) exportObjects() error {
	// 导出根接口
	if err := m.conn.Export(m, mprisPath, mprisInterface); err != nil {
		return fmt.Errorf("导出MPRIS根接口失败: %v", err)
	}

	// 导出播放器接口
	if err := m.conn.Export(m, mprisPath, mprisPlayerInterface); err != nil {
		return fmt.Errorf("导出MPRIS播放器接口失败: %v", err)
	}

	// 导出属性接口
	if err := m.conn.Export(m.props, mprisPath, "org.freedesktop.DBus.Properties"); err != nil {
		return fmt.Errorf("导出属性接口失败: %v", err)
	}

	// 导出内省接口
	if err := m.conn.Export(introspect.Introspectable(m.getIntrospectData()), mprisPath, "org.freedesktop.DBus.Introspectable"); err != nil {
		return fmt.Errorf("导出内省接口失败: %v", err)
	}

	return nil
}

// getIntrospectData 获取内省数据
func (m *MPRISService) getIntrospectData() string {
	return `
<node>
	<interface name="org.mpris.MediaPlayer2">
		<method name="Raise"/>
		<method name="Quit"/>
		<property name="CanQuit" type="b" access="read"/>
		<property name="CanRaise" type="b" access="read"/>
		<property name="HasTrackList" type="b" access="read"/>
		<property name="Identity" type="s" access="read"/>
		<property name="DesktopEntry" type="s" access="read"/>
		<property name="SupportedUriSchemes" type="as" access="read"/>
		<property name="SupportedMimeTypes" type="as" access="read"/>
	</interface>
	<interface name="org.mpris.MediaPlayer2.Player">
		<method name="Next"/>
		<method name="Previous"/>
		<method name="Pause"/>
		<method name="PlayPause"/>
		<method name="Stop"/>
		<method name="Play"/>
		<method name="Seek">
			<arg direction="in" name="Offset" type="x"/>
		</method>
		<method name="SetPosition">
			<arg direction="in" name="TrackId" type="o"/>
			<arg direction="in" name="Position" type="x"/>
		</method>
		<method name="OpenUri">
			<arg direction="in" name="Uri" type="s"/>
		</method>
		<signal name="Seeked">
			<arg name="Position" type="x"/>
		</signal>
		<property name="PlaybackStatus" type="s" access="read"/>
		<property name="Rate" type="d" access="readwrite"/>
		<property name="Metadata" type="a{sv}" access="read"/>
		<property name="Volume" type="d" access="readwrite"/>
		<property name="Position" type="x" access="read"/>
		<property name="MinimumRate" type="d" access="read"/>
		<property name="MaximumRate" type="d" access="read"/>
		<property name="CanGoNext" type="b" access="read"/>
		<property name="CanGoPrevious" type="b" access="read"/>
		<property name="CanPlay" type="b" access="read"/>
		<property name="CanPause" type="b" access="read"/>
		<property name="CanSeek" type="b" access="read"/>
		<property name="CanControl" type="b" access="read"/>
	</interface>
	<interface name="org.freedesktop.DBus.Properties">
		<method name="Get">
			<arg direction="in" name="interface_name" type="s"/>
			<arg direction="in" name="property_name" type="s"/>
			<arg direction="out" name="value" type="v"/>
		</method>
		<method name="GetAll">
			<arg direction="in" name="interface_name" type="s"/>
			<arg direction="out" name="properties" type="a{sv}"/>
		</method>
		<method name="Set">
			<arg direction="in" name="interface_name" type="s"/>
			<arg direction="in" name="property_name" type="s"/>
			<arg direction="in" name="value" type="v"/>
		</method>
		<signal name="PropertiesChanged">
			<arg name="interface_name" type="s"/>
			<arg name="changed_properties" type="a{sv}"/>
			<arg name="invalidated_properties" type="as"/>
		</signal>
	</interface>
	<interface name="org.freedesktop.DBus.Introspectable">
		<method name="Introspect">
			<arg direction="out" name="xml_data" type="s"/>
		</method>
	</interface>
</node>`
}

// ==================== MPRIS根接口方法 ====================

// Raise 将应用窗口提到前台
func (m *MPRISService) Raise() *dbus.Error {
	log.Println("🎵 MPRIS: 收到Raise请求")

	// TODO: 实现窗口提升逻辑
	// 这里可以通过Wails API来实现窗口提升

	return nil
}

// Quit 退出应用
func (m *MPRISService) Quit() *dbus.Error {
	log.Println("🎵 MPRIS: 收到Quit请求")

	// TODO: 实现应用退出逻辑
	// 这里可以通过Wails API来实现应用退出

	return nil
}

// ==================== MPRIS播放器接口方法 ====================

// Next 下一首
func (m *MPRISService) Next() *dbus.Error {
	log.Println("🎵 MPRIS: 收到Next请求")

	// 调用前端播放控制
	go m.callFrontendMethod("next_track")

	return nil
}

// Previous 上一首
func (m *MPRISService) Previous() *dbus.Error {
	log.Println("🎵 MPRIS: 收到Previous请求")

	// 调用前端播放控制
	go m.callFrontendMethod("previous_track")

	return nil
}

// Pause 暂停
func (m *MPRISService) Pause() *dbus.Error {
	log.Println("🎵 MPRIS: 收到Pause请求")

	// 调用前端播放控制
	go m.callFrontendMethod("pause")

	// 更新播放状态
	m.SetPlaybackStatus("Paused")

	return nil
}

// PlayPause 播放/暂停切换
func (m *MPRISService) PlayPause() *dbus.Error {
	log.Println("🎵 MPRIS: 收到PlayPause请求")

	// 调用前端播放控制
	go m.callFrontendMethod("play_pause")

	return nil
}

// Stop 停止
func (m *MPRISService) Stop() *dbus.Error {
	log.Println("🎵 MPRIS: 收到Stop请求")

	// 调用前端播放控制
	go m.callFrontendMethod("stop")

	// 更新播放状态
	m.SetPlaybackStatus("Stopped")

	return nil
}

// Play 播放
func (m *MPRISService) Play() *dbus.Error {
	log.Println("🎵 MPRIS: 收到Play请求")

	// 调用前端播放控制
	go m.callFrontendMethod("play")

	// 更新播放状态
	m.SetPlaybackStatus("Playing")

	return nil
}

// Seek 跳转播放位置
func (m *MPRISService) Seek(offset int64) *dbus.Error {
	log.Printf("🎵 MPRIS: 收到Seek请求，偏移量: %d微秒", offset)

	// 调用前端播放控制
	go m.callFrontendSeek(offset)

	return nil
}

// SetPosition 设置播放位置
func (m *MPRISService) SetPosition(trackId dbus.ObjectPath, position int64) *dbus.Error {
	log.Printf("🎵 MPRIS: 收到SetPosition请求，位置: %d微秒", position)

	// 调用前端播放控制
	go m.callFrontendSetPosition(position)

	return nil
}

// OpenUri 打开URI
func (m *MPRISService) OpenUri(uri string) *dbus.Error {
	log.Printf("🎵 MPRIS: 收到OpenUri请求: %s", uri)

	// TODO: 实现URI打开逻辑

	return nil
}

// ==================== 属性回调方法 ====================

// onVolumeChanged 音量变化回调
func (m *MPRISService) onVolumeChanged(c *prop.Change) *dbus.Error {
	if volume, ok := c.Value.(float64); ok {
		log.Printf("🎵 MPRIS: 音量变化: %.2f", volume)
		m.volume = volume

		// 调用前端音量控制
		go m.callFrontendSetVolume(volume)
	}
	return nil
}

// onRateChanged 播放速率变化回调
func (m *MPRISService) onRateChanged(c *prop.Change) *dbus.Error {
	if rate, ok := c.Value.(float64); ok {
		log.Printf("🎵 MPRIS: 播放速率变化: %.2f", rate)
		// 当前不支持变速播放，忽略
	}
	return nil
}

// ==================== 状态更新方法 ====================

// SetPlaybackStatus 设置播放状态
func (m *MPRISService) SetPlaybackStatus(status string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.playbackStatus != status {
		m.playbackStatus = status
		if m.props != nil {
			m.props.SetMust(mprisPlayerInterface, "PlaybackStatus", status)
		}
		log.Printf("🎵 MPRIS: 播放状态更新为: %s", status)
	}
}

// SetMetadata 设置歌曲元数据
func (m *MPRISService) SetMetadata(title, artist, album, artUrl string, duration int64) {
	m.mu.Lock()
	defer m.mu.Unlock()

	metadata := make(map[string]dbus.Variant)

	if title != "" {
		metadata["xesam:title"] = dbus.MakeVariant(title)
	}
	if artist != "" {
		metadata["xesam:artist"] = dbus.MakeVariant([]string{artist})
	}
	if album != "" {
		metadata["xesam:album"] = dbus.MakeVariant(album)
	}
	if artUrl != "" {
		metadata["mpris:artUrl"] = dbus.MakeVariant(artUrl)
	}
	if duration > 0 {
		metadata["mpris:length"] = dbus.MakeVariant(duration)
	}

	// 设置轨道ID
	trackId := fmt.Sprintf("/org/mpris/MediaPlayer2/Track/%d", time.Now().Unix())
	metadata["mpris:trackid"] = dbus.MakeVariant(dbus.ObjectPath(trackId))

	m.metadata = metadata
	if m.props != nil {
		m.props.SetMust(mprisPlayerInterface, "Metadata", metadata)
	}

	log.Printf("🎵 MPRIS: 元数据更新 - 标题: %s, 艺术家: %s, 专辑: %s", title, artist, album)
}

// SetVolume 设置音量
func (m *MPRISService) SetVolume(volume float64) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.volume != volume {
		m.volume = volume
		if m.props != nil {
			m.props.SetMust(mprisPlayerInterface, "Volume", volume)
		}
		log.Printf("🎵 MPRIS: 音量更新为: %.2f", volume)
	}
}

// SetPosition 设置播放位置
func (m *MPRISService) SetPositionMicroseconds(position int64) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.position = position
	if m.props != nil {
		m.props.SetMust(mprisPlayerInterface, "Position", position)
	}
}

// EmitSeeked 发射Seeked信号
func (m *MPRISService) EmitSeeked(position int64) {
	if m.conn != nil {
		err := m.conn.Emit(mprisPath, mprisPlayerInterface+".Seeked", position)
		if err != nil {
			log.Printf("⚠️ 发射Seeked信号失败: %v", err)
		}
	}
}

// ==================== 前端调用方法 ====================

// callFrontendMethod 调用前端播放控制方法
func (m *MPRISService) callFrontendMethod(action string) {
	// 通过注入的MediaKeyService来调用前端
	if m.mediaKeyService != nil {
		result := m.mediaKeyService.HandleMediaKeyEvent(action)
		log.Printf("🎵 MPRIS调用前端结果: %v", result)
	} else {
		log.Println("⚠️ MPRIS: MediaKeyService不可用")
	}
}

// callFrontendSeek 调用前端跳转
func (m *MPRISService) callFrontendSeek(offset int64) {
	// 将微秒转换为秒
	offsetSeconds := float64(offset) / 1000000.0
	log.Printf("🎵 MPRIS: 跳转 %.2f 秒", offsetSeconds)

	// TODO: 实现具体的跳转逻辑
	// 这里需要与前端播放器集成
}

// callFrontendSetPosition 调用前端设置位置
func (m *MPRISService) callFrontendSetPosition(position int64) {
	// 将微秒转换为秒
	positionSeconds := float64(position) / 1000000.0
	log.Printf("🎵 MPRIS: 设置位置 %.2f 秒", positionSeconds)

	// TODO: 实现具体的位置设置逻辑
	// 这里需要与前端播放器集成
}

// callFrontendSetVolume 调用前端设置音量
func (m *MPRISService) callFrontendSetVolume(volume float64) {
	// 音量范围是0.0-1.0，转换为0-100
	volumePercent := int(volume * 100)
	log.Printf("🎵 MPRIS: 设置音量 %d%%", volumePercent)

	// TODO: 实现具体的音量设置逻辑
	// 这里需要与前端播放器集成
}

// ==================== 公共API方法 ====================

// IsActive 检查服务是否活跃
func (m *MPRISService) IsActive() bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.isActive
}

// GetStatus 获取MPRIS服务状态
func (m *MPRISService) GetStatus() map[string]any {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return map[string]any{
		"active":          m.isActive,
		"playback_status": m.playbackStatus,
		"volume":          m.volume,
		"position":        m.position,
		"bus_name":        busName,
		"object_path":     mprisPath,
	}
}
