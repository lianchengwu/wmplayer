package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"os"
	"path/filepath"
	"time"
)

// PlaylistService 播放列表服务
type PlaylistService struct{}

// PlayerPlaylistData 播放器播放列表数据结构
type PlayerPlaylistData struct {
	Songs        []PlayerPlaylistSong `json:"songs"`         // 歌曲列表
	CurrentIndex int                  `json:"current_index"` // 当前播放索引
	PlayMode     string               `json:"play_mode"`     // 播放模式：normal, shuffle, repeat_one, repeat_all
	ShuffleMode  bool                 `json:"shuffle_mode"`  // 随机播放模式
	RepeatMode   string               `json:"repeat_mode"`   // 循环模式：off, one, all
	Name         string               `json:"name"`          // 播放列表名称
	UpdateTime   time.Time            `json:"update_time"`   // 更新时间
	ShuffleOrder []int                `json:"shuffle_order"` // 随机播放顺序
}

// PlayerPlaylistSong 播放列表中的歌曲
type PlayerPlaylistSong struct {
	Hash       string `json:"hash"`        // 歌曲hash
	SongName   string `json:"songname"`    // 歌曲名称
	Filename   string `json:"filename"`    // 文件名
	ArtistName string `json:"author_name"` // 艺术家名称
	AlbumName  string `json:"album_name"`  // 专辑名称
	AlbumID    string `json:"album_id"`    // 专辑ID
	Duration   int    `json:"time_length"` // 歌曲时长（秒）
	UnionCover string `json:"union_cover"` // 封面图片
}

// PlayerPlaylistResponse 播放列表响应结构
type PlayerPlaylistResponse = ApiResponse[PlayerPlaylistData]

// SetPlaylistRequest 设置播放列表请求
type SetPlaylistRequest struct {
	Songs        []PlayerPlaylistSong `json:"songs"`         // 歌曲列表
	CurrentIndex int                  `json:"current_index"` // 当前播放索引
	Name         string               `json:"name"`          // 播放列表名称
	PlayMode     string               `json:"play_mode"`     // 播放模式
	ClearFirst   bool                 `json:"clear_first"`   // 是否先清空现有列表
}

// AddToPlaylistRequest 添加到播放列表请求
type AddToPlaylistRequest struct {
	Song   PlayerPlaylistSong `json:"song"`   // 要添加的歌曲
	Insert bool               `json:"insert"` // 是否插入到当前位置后面
}

// UpdatePlayModeRequest 更新播放模式请求
type UpdatePlayModeRequest struct {
	ShuffleMode bool   `json:"shuffle_mode"` // 随机播放模式
	RepeatMode  string `json:"repeat_mode"`  // 循环模式：off, one, all
}

// getCacheDir 获取缓存目录
func (p *PlaylistService) getCacheDir() (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("获取用户主目录失败: %v", err)
	}

	cacheDir := filepath.Join(homeDir, ".cache", "gomusic")

	// 确保缓存目录存在
	if err := os.MkdirAll(cacheDir, 0755); err != nil {
		return "", fmt.Errorf("创建缓存目录失败: %v", err)
	}

	return cacheDir, nil
}

// getPlaylistFilePath 获取播放列表文件路径
func (p *PlaylistService) getPlaylistFilePath() (string, error) {
	cacheDir, err := p.getCacheDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(cacheDir, "playlist.json"), nil
}

// loadPlaylist 加载播放列表
func (p *PlaylistService) loadPlaylist() (*PlayerPlaylistData, error) {
	filePath, err := p.getPlaylistFilePath()
	if err != nil {
		return nil, err
	}

	// 检查文件是否存在
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		// 文件不存在，返回空的播放列表
		return &PlayerPlaylistData{
			Songs:        []PlayerPlaylistSong{},
			CurrentIndex: -1,
			PlayMode:     "normal",
			ShuffleMode:  false,
			RepeatMode:   "off",
			Name:         "播放列表",
			UpdateTime:   time.Now(),
			ShuffleOrder: []int{},
		}, nil
	}

	// 读取文件内容
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("读取播放列表文件失败: %v", err)
	}

	// 解析JSON
	var playlistData PlayerPlaylistData
	if err := json.Unmarshal(data, &playlistData); err != nil {
		return nil, fmt.Errorf("解析播放列表数据失败: %v", err)
	}

	// 兼容旧数据，如果没有ShuffleOrder字段，初始化为空
	if playlistData.ShuffleOrder == nil {
		playlistData.ShuffleOrder = []int{}
	}

	return &playlistData, nil
}

// savePlaylist 保存播放列表
func (p *PlaylistService) savePlaylist(playlistData *PlayerPlaylistData) error {
	filePath, err := p.getPlaylistFilePath()
	if err != nil {
		return err
	}

	// 更新时间戳
	playlistData.UpdateTime = time.Now()

	// 序列化为JSON
	data, err := json.MarshalIndent(playlistData, "", "  ")
	if err != nil {
		return fmt.Errorf("序列化播放列表数据失败: %v", err)
	}

	// 写入文件
	if err := os.WriteFile(filePath, data, 0644); err != nil {
		return fmt.Errorf("写入播放列表文件失败: %v", err)
	}

	return nil
}

// generateShuffleOrder 生成随机播放顺序
func (p *PlaylistService) generateShuffleOrder(songCount int, currentIndex int) []int {
	if songCount <= 1 {
		return []int{}
	}

	// 创建索引数组（排除当前播放的歌曲）
	indices := make([]int, 0, songCount-1)
	for i := 0; i < songCount; i++ {
		if i != currentIndex {
			indices = append(indices, i)
		}
	}

	// 随机打乱
	rand.Seed(time.Now().UnixNano())
	for i := len(indices) - 1; i > 0; i-- {
		j := rand.Intn(i + 1)
		indices[i], indices[j] = indices[j], indices[i]
	}

	return indices
}

// GetPlaylist 获取当前播放列表
func (p *PlaylistService) GetPlaylist() PlayerPlaylistResponse {
	playlistData, err := p.loadPlaylist()
	if err != nil {
		return PlayerPlaylistResponse{
			Success: false,
			Message: fmt.Sprintf("加载播放列表失败: %v", err),
		}
	}

	return PlayerPlaylistResponse{
		Success: true,
		Message: "获取播放列表成功",
		Data:    *playlistData,
	}
}

// SetPlaylist 设置播放列表
func (p *PlaylistService) SetPlaylist(request SetPlaylistRequest) PlayerPlaylistResponse {
	var playlistData *PlayerPlaylistData
	var err error

	if request.ClearFirst {
		// 创建新的播放列表
		playlistData = &PlayerPlaylistData{
			Songs:        []PlayerPlaylistSong{},
			CurrentIndex: -1,
			PlayMode:     "normal",
			ShuffleMode:  false,
			RepeatMode:   "off",
			Name:         "播放列表",
			UpdateTime:   time.Now(),
			ShuffleOrder: []int{},
		}
	} else {
		// 加载现有播放列表
		playlistData, err = p.loadPlaylist()
		if err != nil {
			return PlayerPlaylistResponse{
				Success: false,
				Message: fmt.Sprintf("加载播放列表失败: %v", err),
			}
		}
	}

	// 验证请求参数
	if request.CurrentIndex < -1 || request.CurrentIndex >= len(request.Songs) {
		request.CurrentIndex = -1
	}

	if request.Name == "" {
		request.Name = "播放列表"
	}

	if request.PlayMode == "" {
		request.PlayMode = "normal"
	}

	// 调试：打印第一首歌曲的数据
	if len(request.Songs) > 0 {
		firstSong := request.Songs[0]
		log.Printf("🎵 后端接收到的第一首歌曲数据: Hash=%s, SongName=%s, Filename=%s, ArtistName=%s",
			firstSong.Hash, firstSong.SongName, firstSong.Filename, firstSong.ArtistName)
	}

	// 更新播放列表数据
	if request.ClearFirst {
		playlistData.Songs = request.Songs
	} else {
		// 追加歌曲到现有列表
		playlistData.Songs = append(playlistData.Songs, request.Songs...)
	}

	playlistData.CurrentIndex = request.CurrentIndex
	playlistData.PlayMode = request.PlayMode
	playlistData.Name = request.Name

	// 如果是第一首歌且没有设置索引，设置为0
	if len(playlistData.Songs) > 0 && playlistData.CurrentIndex == -1 {
		playlistData.CurrentIndex = 0
	}

	// 保存播放列表
	if err := p.savePlaylist(playlistData); err != nil {
		return PlayerPlaylistResponse{
			Success: false,
			Message: fmt.Sprintf("保存播放列表失败: %v", err),
		}
	}

	return PlayerPlaylistResponse{
		Success: true,
		Message: "设置播放列表成功",
		Data:    *playlistData,
	}
}

// AddToPlaylist 添加歌曲到播放列表
func (p *PlaylistService) AddToPlaylist(request AddToPlaylistRequest) PlayerPlaylistResponse {
	// 加载现有播放列表
	playlistData, err := p.loadPlaylist()
	if err != nil {
		return PlayerPlaylistResponse{
			Success: false,
			Message: fmt.Sprintf("加载播放列表失败: %v", err),
		}
	}

	// 检查歌曲是否已存在
	for _, song := range playlistData.Songs {
		if song.Hash == request.Song.Hash {
			return PlayerPlaylistResponse{
				Success: false,
				Message: "歌曲已存在于播放列表中",
			}
		}
	}

	// 添加歌曲
	if request.Insert && playlistData.CurrentIndex >= 0 {
		// 插入到当前播放位置后面
		insertIndex := playlistData.CurrentIndex + 1
		if insertIndex >= len(playlistData.Songs) {
			playlistData.Songs = append(playlistData.Songs, request.Song)
		} else {
			playlistData.Songs = append(playlistData.Songs[:insertIndex], append([]PlayerPlaylistSong{request.Song}, playlistData.Songs[insertIndex:]...)...)
		}
	} else {
		// 添加到末尾
		playlistData.Songs = append(playlistData.Songs, request.Song)
	}

	// 如果是第一首歌，设置为当前播放
	if len(playlistData.Songs) == 1 {
		playlistData.CurrentIndex = 0
	}

	// 保存播放列表
	if err := p.savePlaylist(playlistData); err != nil {
		return PlayerPlaylistResponse{
			Success: false,
			Message: fmt.Sprintf("保存播放列表失败: %v", err),
		}
	}

	return PlayerPlaylistResponse{
		Success: true,
		Message: "添加歌曲成功",
		Data:    *playlistData,
	}
}

// RemoveFromPlaylist 从播放列表移除歌曲
func (p *PlaylistService) RemoveFromPlaylist(hash string) PlayerPlaylistResponse {
	if hash == "" {
		return PlayerPlaylistResponse{
			Success: false,
			Message: "歌曲hash不能为空",
		}
	}

	// 加载现有播放列表
	playlistData, err := p.loadPlaylist()
	if err != nil {
		return PlayerPlaylistResponse{
			Success: false,
			Message: fmt.Sprintf("加载播放列表失败: %v", err),
		}
	}

	// 查找并移除歌曲
	removeIndex := -1
	for i, song := range playlistData.Songs {
		if song.Hash == hash {
			removeIndex = i
			break
		}
	}

	if removeIndex == -1 {
		return PlayerPlaylistResponse{
			Success: false,
			Message: "歌曲不存在于播放列表中",
		}
	}

	// 移除歌曲
	playlistData.Songs = append(playlistData.Songs[:removeIndex], playlistData.Songs[removeIndex+1:]...)

	// 调整当前播放索引
	if playlistData.CurrentIndex > removeIndex {
		playlistData.CurrentIndex--
	} else if playlistData.CurrentIndex == removeIndex {
		// 如果移除的是当前播放的歌曲
		if playlistData.CurrentIndex >= len(playlistData.Songs) {
			playlistData.CurrentIndex = len(playlistData.Songs) - 1
		}
		if len(playlistData.Songs) == 0 {
			playlistData.CurrentIndex = -1
		}
	}

	// 保存播放列表
	if err := p.savePlaylist(playlistData); err != nil {
		return PlayerPlaylistResponse{
			Success: false,
			Message: fmt.Sprintf("保存播放列表失败: %v", err),
		}
	}

	return PlayerPlaylistResponse{
		Success: true,
		Message: "移除歌曲成功",
		Data:    *playlistData,
	}
}

// SetCurrentIndex 设置当前播放索引
func (p *PlaylistService) SetCurrentIndex(index int) PlayerPlaylistResponse {
	// 加载现有播放列表
	playlistData, err := p.loadPlaylist()
	if err != nil {
		return PlayerPlaylistResponse{
			Success: false,
			Message: fmt.Sprintf("加载播放列表失败: %v", err),
		}
	}

	// 验证索引
	if index < -1 || index >= len(playlistData.Songs) {
		return PlayerPlaylistResponse{
			Success: false,
			Message: "索引超出范围",
		}
	}

	playlistData.CurrentIndex = index

	// 保存播放列表
	if err := p.savePlaylist(playlistData); err != nil {
		return PlayerPlaylistResponse{
			Success: false,
			Message: fmt.Sprintf("保存播放列表失败: %v", err),
		}
	}

	return PlayerPlaylistResponse{
		Success: true,
		Message: "设置当前播放索引成功",
		Data:    *playlistData,
	}
}

// UpdatePlayMode 更新播放模式
func (p *PlaylistService) UpdatePlayMode(request UpdatePlayModeRequest) PlayerPlaylistResponse {
	// 加载现有播放列表
	playlistData, err := p.loadPlaylist()
	if err != nil {
		return PlayerPlaylistResponse{
			Success: false,
			Message: fmt.Sprintf("加载播放列表失败: %v", err),
		}
	}

	// 更新播放模式
	playlistData.ShuffleMode = request.ShuffleMode
	playlistData.RepeatMode = request.RepeatMode

	// 根据模式设置PlayMode字段
	if request.ShuffleMode {
		playlistData.PlayMode = "shuffle"
		// 生成新的随机播放顺序
		playlistData.ShuffleOrder = p.generateShuffleOrder(len(playlistData.Songs), playlistData.CurrentIndex)
	} else {
		playlistData.ShuffleOrder = []int{} // 清空随机顺序
		switch request.RepeatMode {
		case "one":
			playlistData.PlayMode = "repeat_one"
		case "all":
			playlistData.PlayMode = "repeat_all"
		default:
			playlistData.PlayMode = "normal"
		}
	}

	// 保存播放列表
	if err := p.savePlaylist(playlistData); err != nil {
		return PlayerPlaylistResponse{
			Success: false,
			Message: fmt.Sprintf("保存播放列表失败: %v", err),
		}
	}

	return PlayerPlaylistResponse{
		Success: true,
		Message: "更新播放模式成功",
		Data:    *playlistData,
	}
}

// GetNextSong 获取下一首歌曲
func (p *PlaylistService) GetNextSong() PlayerPlaylistResponse {
	// 加载现有播放列表
	playlistData, err := p.loadPlaylist()
	if err != nil {
		return PlayerPlaylistResponse{
			Success: false,
			Message: fmt.Sprintf("加载播放列表失败: %v", err),
		}
	}

	if len(playlistData.Songs) == 0 {
		return PlayerPlaylistResponse{
			Success: false,
			Message: "播放列表为空",
		}
	}

	var nextIndex int

	switch playlistData.PlayMode {
	case "repeat_one":
		// 单曲循环，保持当前索引
		nextIndex = playlistData.CurrentIndex
	case "shuffle":
		// 随机播放，使用随机顺序
		if len(playlistData.ShuffleOrder) == 0 {
			// 重新生成随机顺序
			playlistData.ShuffleOrder = p.generateShuffleOrder(len(playlistData.Songs), playlistData.CurrentIndex)
		}
		if len(playlistData.ShuffleOrder) > 0 {
			nextIndex = playlistData.ShuffleOrder[0]
			// 移除已播放的索引
			playlistData.ShuffleOrder = playlistData.ShuffleOrder[1:]
		} else {
			nextIndex = playlistData.CurrentIndex
		}
	default:
		// 正常播放和列表循环
		nextIndex = playlistData.CurrentIndex + 1
		if nextIndex >= len(playlistData.Songs) {
			if playlistData.PlayMode == "repeat_all" {
				nextIndex = 0 // 列表循环，回到第一首
			} else {
				return PlayerPlaylistResponse{
					Success: false,
					Message: "已播放完所有歌曲",
				}
			}
		}
	}

	playlistData.CurrentIndex = nextIndex

	// 保存播放列表
	if err := p.savePlaylist(playlistData); err != nil {
		return PlayerPlaylistResponse{
			Success: false,
			Message: fmt.Sprintf("保存播放列表失败: %v", err),
		}
	}

	return PlayerPlaylistResponse{
		Success: true,
		Message: "获取下一首歌曲成功",
		Data:    *playlistData,
	}
}

// GetPreviousSong 获取上一首歌曲
func (p *PlaylistService) GetPreviousSong() PlayerPlaylistResponse {
	// 加载现有播放列表
	playlistData, err := p.loadPlaylist()
	if err != nil {
		return PlayerPlaylistResponse{
			Success: false,
			Message: fmt.Sprintf("加载播放列表失败: %v", err),
		}
	}

	if len(playlistData.Songs) == 0 {
		return PlayerPlaylistResponse{
			Success: false,
			Message: "播放列表为空",
		}
	}

	var prevIndex int

	switch playlistData.PlayMode {
	case "repeat_one":
		// 单曲循环，保持当前索引
		prevIndex = playlistData.CurrentIndex
	case "shuffle":
		// 随机播放，随机选择一首歌（排除当前播放的）
		if len(playlistData.Songs) == 1 {
			prevIndex = 0
		} else {
			prevIndex = (playlistData.CurrentIndex - 1 + len(playlistData.Songs)) % len(playlistData.Songs)
		}
	default:
		// 正常播放和列表循环
		prevIndex = playlistData.CurrentIndex - 1
		if prevIndex < 0 {
			if playlistData.PlayMode == "repeat_all" {
				prevIndex = len(playlistData.Songs) - 1 // 列表循环，回到最后一首
			} else {
				return PlayerPlaylistResponse{
					Success: false,
					Message: "已是第一首歌曲",
				}
			}
		}
	}

	playlistData.CurrentIndex = prevIndex

	// 保存播放列表
	if err := p.savePlaylist(playlistData); err != nil {
		return PlayerPlaylistResponse{
			Success: false,
			Message: fmt.Sprintf("保存播放列表失败: %v", err),
		}
	}

	return PlayerPlaylistResponse{
		Success: true,
		Message: "获取上一首歌曲成功",
		Data:    *playlistData,
	}
}

// ClearPlaylist 清空播放列表
func (p *PlaylistService) ClearPlaylist() PlayerPlaylistResponse {
	// 创建空的播放列表数据
	emptyData := &PlayerPlaylistData{
		Songs:        []PlayerPlaylistSong{},
		CurrentIndex: -1,
		PlayMode:     "normal",
		ShuffleMode:  false,
		RepeatMode:   "off",
		Name:         "播放列表",
		UpdateTime:   time.Now(),
		ShuffleOrder: []int{},
	}

	// 保存空数据
	if err := p.savePlaylist(emptyData); err != nil {
		return PlayerPlaylistResponse{
			Success: false,
			Message: fmt.Sprintf("清空播放列表失败: %v", err),
		}
	}

	return PlayerPlaylistResponse{
		Success: true,
		Message: "清空播放列表成功",
		Data:    *emptyData,
	}
}
