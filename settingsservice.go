package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// SettingsService 设置服务
type SettingsService struct{}

// NewSettingsService 创建设置服务实例
func NewSettingsService() *SettingsService {
	return &SettingsService{}
}

// Settings 设置数据结构
type Settings struct {
	// 播放设置
	Playback PlaybackSettings `json:"playback"`
	// 音质设置
	Quality QualitySettings `json:"quality"`
	// 界面设置
	Interface InterfaceSettings `json:"interface"`
	// 下载设置
	Download DownloadSettings `json:"download"`
	// 快捷键设置
	Hotkeys HotkeysSettings `json:"hotkeys"`
	// 隐私设置
	Privacy PrivacySettings `json:"privacy"`
	// 应用行为设置
	Behavior BehaviorSettings `json:"behavior"`
}

// PlaybackSettings 播放设置
type PlaybackSettings struct {
	AutoPlay          bool `json:"autoPlay"`
	Crossfade         bool `json:"crossfade"`
	CrossfadeDuration int  `json:"crossfadeDuration"`
	GaplessPlayback   bool `json:"gaplessPlayback"`
	ReplayGain        bool `json:"replayGain"`
	Volume            int  `json:"volume"`
}

// QualitySettings 音质设置
type QualitySettings struct {
	StreamingQuality string `json:"streamingQuality"`
	DownloadQuality  string `json:"downloadQuality"`
	WifiOnly         bool   `json:"wifiOnly"`
}

// InterfaceSettings 界面设置
type InterfaceSettings struct {
	Theme        string `json:"theme"`
	Language     string `json:"language"`
	ShowLyrics   bool   `json:"showLyrics"`
	ShowSpectrum bool   `json:"showSpectrum"`
	MiniPlayer   bool   `json:"miniPlayer"`
}

// DownloadSettings 下载设置
type DownloadSettings struct {
	DownloadPath   string `json:"downloadPath"`
	AutoDownload   bool   `json:"autoDownload"`
	DownloadLyrics bool   `json:"downloadLyrics"`
	DownloadCover  bool   `json:"downloadCover"`
}

// HotkeysSettings 快捷键设置
type HotkeysSettings struct {
	PlayPause     string `json:"playPause"`
	NextTrack     string `json:"nextTrack"`
	PrevTrack     string `json:"prevTrack"`
	VolumeUp      string `json:"volumeUp"`
	VolumeDown    string `json:"volumeDown"`
	ToggleLyrics  string `json:"toggleLyrics"`
}

// PrivacySettings 隐私设置
type PrivacySettings struct {
	SaveHistory    bool `json:"saveHistory"`
	ShareListening bool `json:"shareListening"`
	Analytics      bool `json:"analytics"`
}

// BehaviorSettings 应用行为设置
type BehaviorSettings struct {
	CloseAction    string `json:"closeAction"`    // "ask", "minimize", "exit"
	StartMinimized bool   `json:"startMinimized"`
	AutoStart      bool   `json:"autoStart"`
}

// getSettingsPath 获取设置文件路径
func (s *SettingsService) getSettingsPath() (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("无法获取用户主目录: %v", err)
	}
	
	configDir := filepath.Join(homeDir, ".config", "gomusic")
	
	// 确保配置目录存在
	if err := os.MkdirAll(configDir, 0755); err != nil {
		return "", fmt.Errorf("无法创建配置目录: %v", err)
	}
	
	return filepath.Join(configDir, "settings.json"), nil
}

// getDefaultSettings 获取默认设置
func (s *SettingsService) getDefaultSettings() Settings {
	return Settings{
		Playback: PlaybackSettings{
			AutoPlay:          true,
			Crossfade:         false,
			CrossfadeDuration: 3,
			GaplessPlayback:   true,
			ReplayGain:        false,
			Volume:            80,
		},
		Quality: QualitySettings{
			StreamingQuality: "high",
			DownloadQuality:  "lossless",
			WifiOnly:         false,
		},
		Interface: InterfaceSettings{
			Theme:        "auto",
			Language:     "zh-CN",
			ShowLyrics:   true,
			ShowSpectrum: false,
			MiniPlayer:   false,
		},
		Download: DownloadSettings{
			DownloadPath:   "",
			AutoDownload:   false,
			DownloadLyrics: true,
			DownloadCover:  true,
		},
		Hotkeys: HotkeysSettings{
			PlayPause:    "Space",
			NextTrack:    "Ctrl+Right",
			PrevTrack:    "Ctrl+Left",
			VolumeUp:     "Ctrl+Up",
			VolumeDown:   "Ctrl+Down",
			ToggleLyrics: "Ctrl+L",
		},
		Privacy: PrivacySettings{
			SaveHistory:    true,
			ShareListening: false,
			Analytics:      true,
		},
		Behavior: BehaviorSettings{
			CloseAction:    "ask",
			StartMinimized: false,
			AutoStart:      false,
		},
	}
}

// LoadSettings 加载设置
func (s *SettingsService) LoadSettings() (*ApiResponse[Settings], error) {
	settingsPath, err := s.getSettingsPath()
	if err != nil {
		return &ApiResponse[Settings]{
			Success: false,
			Message: err.Error(),
		}, err
	}
	
	// 如果文件不存在，返回默认设置
	if _, err := os.Stat(settingsPath); os.IsNotExist(err) {
		defaultSettings := s.getDefaultSettings()
		return &ApiResponse[Settings]{
			Success: true,
			Message: "使用默认设置",
			Data:    defaultSettings,
		}, nil
	}
	
	// 读取设置文件
	data, err := os.ReadFile(settingsPath)
	if err != nil {
		return &ApiResponse[Settings]{
			Success: false,
			Message: fmt.Sprintf("读取设置文件失败: %v", err),
		}, err
	}
	
	var settings Settings
	if err := json.Unmarshal(data, &settings); err != nil {
		// 如果解析失败，返回默认设置
		defaultSettings := s.getDefaultSettings()
		return &ApiResponse[Settings]{
			Success: true,
			Message: "设置文件格式错误，使用默认设置",
			Data:    defaultSettings,
		}, nil
	}
	
	return &ApiResponse[Settings]{
		Success: true,
		Message: "设置加载成功",
		Data:    settings,
	}, nil
}

// SaveSettings 保存设置
func (s *SettingsService) SaveSettings(settings Settings) (*ApiResponse[bool], error) {
	settingsPath, err := s.getSettingsPath()
	if err != nil {
		return &ApiResponse[bool]{
			Success: false,
			Message: err.Error(),
		}, err
	}
	
	// 将设置序列化为JSON
	data, err := json.MarshalIndent(settings, "", "  ")
	if err != nil {
		return &ApiResponse[bool]{
			Success: false,
			Message: fmt.Sprintf("序列化设置失败: %v", err),
		}, err
	}
	
	// 写入文件
	if err := os.WriteFile(settingsPath, data, 0644); err != nil {
		return &ApiResponse[bool]{
			Success: false,
			Message: fmt.Sprintf("保存设置文件失败: %v", err),
		}, err
	}
	
	return &ApiResponse[bool]{
		Success: true,
		Message: "设置保存成功",
		Data:    true,
	}, nil
}

// GetSettingsPath 获取设置文件路径（用于前端显示）
func (s *SettingsService) GetSettingsPath() (*ApiResponse[string], error) {
	settingsPath, err := s.getSettingsPath()
	if err != nil {
		return &ApiResponse[string]{
			Success: false,
			Message: err.Error(),
		}, err
	}
	
	return &ApiResponse[string]{
		Success: true,
		Message: "获取设置路径成功",
		Data:    settingsPath,
	}, nil
}
