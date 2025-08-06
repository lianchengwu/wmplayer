package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"time"
)

// PlayHistoryService 播放历史服务
type PlayHistoryService struct{}

// PlayHistoryRecord 播放历史记录
type PlayHistoryRecord struct {
	ID           string    `json:"id"`             // 记录ID（使用歌曲hash）
	Hash         string    `json:"hash"`           // 歌曲hash
	SongName     string    `json:"songname"`       // 歌曲名称
	Filename     string    `json:"filename"`       // 文件名
	ArtistName   string    `json:"author_name"`    // 艺术家名称
	AlbumName    string    `json:"album_name"`     // 专辑名称
	AlbumID      string    `json:"album_id"`       // 专辑ID
	Duration     int       `json:"time_length"`    // 歌曲时长（秒）
	UnionCover   string    `json:"union_cover"`    // 封面图片
	PlayTime     time.Time `json:"play_time"`      // 播放时间
	PlayCount    int       `json:"play_count"`     // 播放次数
	LastPlayTime time.Time `json:"last_play_time"` // 最后播放时间
}

// PlayHistoryData 播放历史数据结构
type PlayHistoryData struct {
	Records    []PlayHistoryRecord `json:"records"`     // 播放记录列表
	TotalCount int                 `json:"total_count"` // 总记录数
	UpdateTime time.Time           `json:"update_time"` // 更新时间
}

// PlayHistoryResponse 播放历史响应结构
type PlayHistoryResponse = ApiResponse[PlayHistoryData]

// AddPlayHistoryRequest 添加播放历史请求
type AddPlayHistoryRequest struct {
	Hash       string `json:"hash"`
	SongName   string `json:"songname"`
	Filename   string `json:"filename"`
	ArtistName string `json:"author_name"`
	AlbumName  string `json:"album_name"`
	AlbumID    string `json:"album_id"`
	Duration   int    `json:"time_length"`
	UnionCover string `json:"union_cover"`
}

// GetPlayHistoryRequest 获取播放历史请求
type GetPlayHistoryRequest struct {
	Page     int    `json:"page"`      // 页码
	PageSize int    `json:"page_size"` // 每页数量
	Filter   string `json:"filter"`    // 过滤条件：all, today, yesterday, week
}

// getCacheDir 获取缓存目录
func (p *PlayHistoryService) getCacheDir() (string, error) {
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

// getHistoryFilePath 获取播放历史文件路径
func (p *PlayHistoryService) getHistoryFilePath() (string, error) {
	cacheDir, err := p.getCacheDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(cacheDir, "play_history.json"), nil
}

// loadPlayHistory 加载播放历史
func (p *PlayHistoryService) loadPlayHistory() (*PlayHistoryData, error) {
	filePath, err := p.getHistoryFilePath()
	if err != nil {
		return nil, err
	}

	// 检查文件是否存在
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		// 文件不存在，返回空的播放历史
		return &PlayHistoryData{
			Records:    []PlayHistoryRecord{},
			TotalCount: 0,
			UpdateTime: time.Now(),
		}, nil
	}

	// 读取文件内容
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("读取播放历史文件失败: %v", err)
	}

	// 解析JSON
	var historyData PlayHistoryData
	if err := json.Unmarshal(data, &historyData); err != nil {
		return nil, fmt.Errorf("解析播放历史数据失败: %v", err)
	}

	return &historyData, nil
}

// savePlayHistory 保存播放历史
func (p *PlayHistoryService) savePlayHistory(historyData *PlayHistoryData) error {
	filePath, err := p.getHistoryFilePath()
	if err != nil {
		return err
	}

	// 更新时间戳
	historyData.UpdateTime = time.Now()
	historyData.TotalCount = len(historyData.Records)

	// 序列化为JSON
	data, err := json.MarshalIndent(historyData, "", "  ")
	if err != nil {
		return fmt.Errorf("序列化播放历史数据失败: %v", err)
	}

	// 写入文件
	if err := os.WriteFile(filePath, data, 0644); err != nil {
		return fmt.Errorf("写入播放历史文件失败: %v", err)
	}

	return nil
}

// AddPlayHistory 添加播放历史记录
func (p *PlayHistoryService) AddPlayHistory(request AddPlayHistoryRequest) PlayHistoryResponse {
	fmt.Printf("🎵 后端处理播放历史: %s - %s\n", request.SongName, request.ArtistName)

	if request.Hash == "" {
		fmt.Printf("❌ 播放历史处理失败: 歌曲hash不能为空\n")
		return PlayHistoryResponse{Success: false, Message: "歌曲hash不能为空"}
	}

	// 加载现有播放历史
	historyData, err := p.loadPlayHistory()
	if err != nil {
		fmt.Printf("❌ 播放历史处理失败: 加载播放历史失败: %v\n", err)
		return PlayHistoryResponse{Success: false, Message: "加载播放历史失败"}
	}

	now := time.Now()

	// 查找是否已存在该歌曲的记录
	var existingRecord *PlayHistoryRecord
	for i := range historyData.Records {
		if historyData.Records[i].Hash == request.Hash {
			existingRecord = &historyData.Records[i]
			break
		}
	}

	if existingRecord != nil {
		// 更新现有记录
		fmt.Printf("📝 更新播放记录: %s (播放次数: %d -> %d)\n", request.SongName, existingRecord.PlayCount, existingRecord.PlayCount+1)
		existingRecord.PlayCount++
		existingRecord.LastPlayTime = now
		existingRecord.PlayTime = now // 更新为最新播放时间，用于排序

		// 更新歌曲信息（可能有变化）
		existingRecord.SongName = request.SongName
		existingRecord.Filename = request.Filename
		existingRecord.ArtistName = request.ArtistName
		existingRecord.AlbumName = request.AlbumName
		existingRecord.AlbumID = request.AlbumID
		existingRecord.Duration = request.Duration
		existingRecord.UnionCover = request.UnionCover
	} else {
		// 创建新记录
		fmt.Printf("➕ 创建新播放记录: %s\n", request.SongName)
		newRecord := PlayHistoryRecord{
			ID:           request.Hash,
			Hash:         request.Hash,
			SongName:     request.SongName,
			Filename:     request.Filename,
			ArtistName:   request.ArtistName,
			AlbumName:    request.AlbumName,
			AlbumID:      request.AlbumID,
			Duration:     request.Duration,
			UnionCover:   request.UnionCover,
			PlayTime:     now,
			PlayCount:    1,
			LastPlayTime: now,
		}
		historyData.Records = append(historyData.Records, newRecord)
	}

	// 按播放时间倒序排序（最新播放的在前面）
	sort.Slice(historyData.Records, func(i, j int) bool {
		return historyData.Records[i].PlayTime.After(historyData.Records[j].PlayTime)
	})

	// 限制记录数量（保留最近1000条记录）
	maxRecords := 1000
	if len(historyData.Records) > maxRecords {
		fmt.Printf("🗂️ 播放历史记录超过限制，保留最近%d条记录\n", maxRecords)
		historyData.Records = historyData.Records[:maxRecords]
	}

	// 保存播放历史
	if err := p.savePlayHistory(historyData); err != nil {
		fmt.Printf("❌ 播放历史处理失败: 保存播放历史失败: %v\n", err)
		return PlayHistoryResponse{Success: false, Message: "保存播放历史失败"}
	}

	fmt.Printf("✅ 播放历史处理完成，当前总记录数: %d\n", len(historyData.Records))
	return PlayHistoryResponse{Success: true, Message: "播放历史处理成功"}
}

// GetPlayHistory 获取播放历史
func (p *PlayHistoryService) GetPlayHistory(request GetPlayHistoryRequest) PlayHistoryResponse {
	// 设置默认值
	if request.Page <= 0 {
		request.Page = 1
	}
	if request.PageSize <= 0 {
		request.PageSize = 50
	}
	if request.Filter == "" {
		request.Filter = "all"
	}

	// 加载播放历史
	historyData, err := p.loadPlayHistory()
	if err != nil {
		return PlayHistoryResponse{
			Success: false,
			Message: fmt.Sprintf("加载播放历史失败: %v", err),
		}
	}

	// 根据过滤条件筛选记录
	filteredRecords := p.filterRecords(historyData.Records, request.Filter)

	// 分页处理
	totalCount := len(filteredRecords)
	startIndex := (request.Page - 1) * request.PageSize
	endIndex := startIndex + request.PageSize

	if startIndex >= totalCount {
		// 超出范围，返回空结果
		filteredRecords = []PlayHistoryRecord{}
	} else {
		if endIndex > totalCount {
			endIndex = totalCount
		}
		filteredRecords = filteredRecords[startIndex:endIndex]
	}

	result := PlayHistoryData{
		Records:    filteredRecords,
		TotalCount: totalCount,
		UpdateTime: historyData.UpdateTime,
	}

	return PlayHistoryResponse{
		Success: true,
		Message: "获取播放历史成功",
		Data:    result,
	}
}

// filterRecords 根据过滤条件筛选记录
func (p *PlayHistoryService) filterRecords(records []PlayHistoryRecord, filter string) []PlayHistoryRecord {
	if filter == "all" {
		return records
	}

	now := time.Now()
	var filteredRecords []PlayHistoryRecord

	for _, record := range records {
		switch filter {
		case "today":
			if p.isSameDay(record.PlayTime, now) {
				filteredRecords = append(filteredRecords, record)
			}
		case "yesterday":
			yesterday := now.AddDate(0, 0, -1)
			if p.isSameDay(record.PlayTime, yesterday) {
				filteredRecords = append(filteredRecords, record)
			}
		case "week":
			weekAgo := now.AddDate(0, 0, -7)
			if record.PlayTime.After(weekAgo) {
				filteredRecords = append(filteredRecords, record)
			}
		}
	}

	return filteredRecords
}

// isSameDay 判断两个时间是否为同一天
func (p *PlayHistoryService) isSameDay(t1, t2 time.Time) bool {
	y1, m1, d1 := t1.Date()
	y2, m2, d2 := t2.Date()
	return y1 == y2 && m1 == m2 && d1 == d2
}

// ClearPlayHistory 清空播放历史
func (p *PlayHistoryService) ClearPlayHistory() PlayHistoryResponse {
	// 创建空的播放历史数据
	emptyData := &PlayHistoryData{
		Records:    []PlayHistoryRecord{},
		TotalCount: 0,
		UpdateTime: time.Now(),
	}

	// 保存空数据
	if err := p.savePlayHistory(emptyData); err != nil {
		return PlayHistoryResponse{
			Success: false,
			Message: fmt.Sprintf("清空播放历史失败: %v", err),
		}
	}

	return PlayHistoryResponse{
		Success: true,
		Message: "清空播放历史成功",
		Data:    *emptyData,
	}
}
