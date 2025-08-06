package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"time"
)

// DiscoverService 处理发现页面相关的服务
type DiscoverService struct{}

// NewSongData 新歌速递数据结构
type NewSongData struct {
	Hash       string `json:"hash"`
	SongName   string `json:"songname"`
	FileName   string `json:"filename"`
	TimeLength int    `json:"time_length"`
	AlbumName  string `json:"album_name"`
	AlbumID    string `json:"album_id"`
	AuthorName string `json:"author_name"`
	UnionCover string `json:"union_cover"`
}

// NewSongResponse 新歌速递响应结构
type NewSongResponse = ApiResponse[[]NewSongData]

// NewAlbumData 新碟上架数据结构
type NewAlbumData struct {
	ID          string `json:"id"`
	Title       string `json:"album_name"`
	Artist      string `json:"author_name"`
	ReleaseDate string `json:"release_date"`
	SongCount   int    `json:"song_count"`
	UnionCover  string `json:"union_cover"`
	Description string `json:"description"`
}

// NewAlbumResponse 新碟上架响应结构
type NewAlbumResponse = ApiResponse[[]NewAlbumData]

// NewAlbumCategoryResponse 新碟上架分类响应结构
type NewAlbumCategoryResponse struct {
	Success   bool                      `json:"success"`
	Message   string                    `json:"message"`
	ErrorCode int                       `json:"error_code"`
	Status    int                       `json:"status"`
	Data      map[string][]NewAlbumData `json:"data"`
}

// RecommendSongData 推荐歌曲数据结构
type RecommendSongData struct {
	Hash       string `json:"hash"`
	SongName   string `json:"songname"`
	FileName   string `json:"filename"`
	TimeLength int    `json:"time_length"`
	AlbumName  string `json:"album_name"`
	AlbumID    string `json:"album_id"`
	AuthorName string `json:"author_name"`
	UnionCover string `json:"union_cover"`
}

// RecommendSongResponse 推荐歌曲响应结构
type RecommendSongResponse = ApiResponse[[]RecommendSongData]

// readCookieFromFile 从全局Cookie管理器读取cookie
func (d *DiscoverService) readCookieFromFile() (string, error) {
	cookie := GlobalCookieManager.GetCookie()
	return cookie, nil
}

// parseAlbumCategory 解析专辑分类数据的通用函数
func (d *DiscoverService) parseAlbumCategory(categoryData []interface{}) []NewAlbumData {
	var albums []NewAlbumData

	for _, item := range categoryData {
		itemMap, ok := item.(map[string]interface{})
		if !ok {
			continue
		}

		album := NewAlbumData{}

		// 按照用户提供的数据对应关系解析字段
		// "id":$.data.chn[0].albumid
		if albumid, ok := itemMap["albumid"].(float64); ok {
			album.ID = fmt.Sprintf("%.0f", albumid)
		}

		// "title":$.data.chn[0].albumname
		if albumname, ok := itemMap["albumname"].(string); ok {
			album.Title = albumname
		}

		// "artist":$.data.chn[0].singername
		if singername, ok := itemMap["singername"].(string); ok {
			album.Artist = singername
		}

		// "release_date":$.data.chn[0].publishtime
		if publishtime, ok := itemMap["publishtime"].(string); ok {
			album.ReleaseDate = func() string {
				if len(publishtime) > 10 {
					return publishtime[0:10]
				}
				return publishtime
			}()
		}

		// "song_count":$.data.chn[0].songcount
		if songcount, ok := itemMap["songcount"].(float64); ok {
			album.SongCount = int(songcount)
		}

		// "union_cover":$.data.chn[0].imgurl
		if imgurl, ok := itemMap["imgurl"].(string); ok {
			album.UnionCover = imgurl
		}

		// "description":$.data.chn[0].intro
		if intro, ok := itemMap["intro"].(string); ok {
			album.Description = intro
		}

		albums = append(albums, album)
	}

	return albums
}

// GetNewAlbumsByCategory 获取分类的新碟上架数据
func (d *DiscoverService) GetNewAlbumsByCategory() NewAlbumCategoryResponse {
	log.Println("开始获取新碟上架分类数据...")

	// 读取cookie
	cookie, err := d.readCookieFromFile()
	if err != nil {
		return NewAlbumCategoryResponse{
			Success: false,
			Message: fmt.Sprintf("读取cookie失败: %v", err),
		}
	}

	// 构建请求URL
	requestURL := fmt.Sprintf("%s/top/album", baseApi)

	// 构建查询参数
	queryParams := url.Values{}
	queryParams.Add("cookie", cookie)

	// 添加查询参数到URL
	requestURL += "?" + queryParams.Encode()

	// 创建HTTP客户端，设置超时
	client := &http.Client{
		Timeout: 15 * time.Second,
	}

	// 发送GET请求
	resp, err := client.Get(requestURL)
	if err != nil {
		log.Printf("新碟上架API请求失败: %v", err)
		return NewAlbumCategoryResponse{
			Success: false,
			Message: "API请求失败",
		}
	}
	defer resp.Body.Close()

	// 读取响应
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("读取新碟上架响应失败: %v", err)
		return NewAlbumCategoryResponse{
			Success: false,
			Message: "读取响应失败",
		}
	}

	// 检查响应状态码
	if resp.StatusCode != 200 {
		log.Printf("新碟上架API返回非200状态码: %d", resp.StatusCode)
		return NewAlbumCategoryResponse{
			Success: false,
			Message: fmt.Sprintf("API返回状态码: %d", resp.StatusCode),
		}
	}

	// 解析JSON响应
	var apiResponse map[string]interface{}
	if err := json.Unmarshal(body, &apiResponse); err != nil {
		log.Printf("解析新碟上架JSON失败: %v", err)
		return NewAlbumCategoryResponse{
			Success: false,
			Message: "解析响应失败",
		}
	}

	// 检查API响应状态
	if status, ok := apiResponse["status"].(float64); !ok || status != 1 {
		errorMsg := "API返回错误状态"
		if errStr, ok := apiResponse["error"].(string); ok && errStr != "" {
			errorMsg = errStr
		}
		log.Printf("新碟上架API错误: %s", errorMsg)
		return NewAlbumCategoryResponse{
			Success: false,
			Message: errorMsg,
		}
	}

	// 获取data对象
	dataInterface, ok := apiResponse["data"]
	if !ok {
		return NewAlbumCategoryResponse{
			Success: false,
			Message: "响应中缺少data字段",
		}
	}

	dataMap, ok := dataInterface.(map[string]interface{})
	if !ok {
		return NewAlbumCategoryResponse{
			Success: false,
			Message: "data字段格式错误",
		}
	}

	// 使用通用解析函数处理不同分类的数据
	categoryData := make(map[string][]NewAlbumData)
	categories := []string{"chn", "eur", "jpn", "kor"}

	for _, category := range categories {
		if categoryArray, ok := dataMap[category].([]interface{}); ok {
			categoryData[category] = d.parseAlbumCategory(categoryArray)
		}
	}

	totalCount := 0
	for _, albums := range categoryData {
		totalCount += len(albums)
	}

	log.Printf("成功获取新碟上架分类数据，共%d张专辑", totalCount)

	return NewAlbumCategoryResponse{
		Success:   true,
		Message:   "获取新碟上架分类数据成功",
		ErrorCode: 0,
		Status:    0,
		Data:      categoryData,
	}
}

// GetNewSongs 获取新歌速递
func (d *DiscoverService) GetNewSongs() NewSongResponse {
	// 读取cookie
	cookie, err := d.readCookieFromFile()
	if err != nil {
		return NewSongResponse{
			Success: false,
			Message: fmt.Sprintf("读取cookie失败: %v", err),
		}
	}

	// 构建请求URL
	requestURL := fmt.Sprintf("%s/top/song", baseApi)

	// 构建查询参数
	queryParams := url.Values{}
	queryParams.Add("cookie", cookie)

	// 添加查询参数到URL
	requestURL += "?" + queryParams.Encode()

	// 创建HTTP客户端，设置超时
	client := &http.Client{
		Timeout: 15 * time.Second,
	}

	// 发送GET请求
	resp, err := client.Get(requestURL)
	if err != nil {
		return NewSongResponse{
			Success: false,
			Message: fmt.Sprintf("请求失败: %v", err),
		}
	}
	defer resp.Body.Close()

	// 读取响应体
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return NewSongResponse{
			Success: false,
			Message: fmt.Sprintf("读取响应失败: %v", err),
		}
	}

	// 解析JSON响应
	var apiResponse map[string]interface{}
	if err := json.Unmarshal(body, &apiResponse); err != nil {
		return NewSongResponse{
			Success: false,
			Message: fmt.Sprintf("解析响应失败: %v", err),
		}
	}

	// 检查API响应状态
	if status, ok := apiResponse["status"].(float64); !ok || status != 1 {
		errorMsg := "API请求失败"
		if msg, ok := apiResponse["error"].(string); ok {
			errorMsg = msg
		}
		return NewSongResponse{
			Success: false,
			Message: errorMsg,
		}
	}

	// 获取data数组
	dataInterface, ok := apiResponse["data"]
	if !ok {
		return NewSongResponse{
			Success: false,
			Message: "响应中缺少data字段",
		}
	}

	dataArray, ok := dataInterface.([]interface{})
	if !ok {
		return NewSongResponse{
			Success: false,
			Message: "data字段格式错误",
		}
	}

	// 转换为前端需要的格式
	var newSongsList []NewSongData
	for _, item := range dataArray {
		itemMap, ok := item.(map[string]interface{})
		if !ok {
			continue
		}

		song := NewSongData{}

		// 安全地提取字段
		if hash, ok := itemMap["hash"].(string); ok {
			song.Hash = hash
		}
		if songname, ok := itemMap["songname"].(string); ok {
			song.SongName = songname
		}
		if filename, ok := itemMap["filename"].(string); ok {
			song.FileName = filename
		}

		// 处理时长字段，需要除以1000转换为秒
		if timelength, ok := itemMap["timelength"].(float64); ok {
			song.TimeLength = int(timelength / 1000)
		} else if timelengthInt, ok := itemMap["timelength"].(int); ok {
			song.TimeLength = timelengthInt / 1000
		}

		if albumname, ok := itemMap["album_name"].(string); ok {
			song.AlbumName = albumname
		}
		if albumID, ok := itemMap["album_id"].(string); ok {
			song.AlbumID = albumID
		} else if albumIDFloat, ok := itemMap["album_id"].(float64); ok {
			song.AlbumID = fmt.Sprintf("%.0f", albumIDFloat)
		}
		if authorname, ok := itemMap["author_name"].(string); ok {
			song.AuthorName = authorname
		}

		// 处理封面图片URL，从trans_param.union_cover获取
		if transParam, ok := itemMap["trans_param"].(map[string]interface{}); ok {
			if unionCover, ok := transParam["union_cover"].(string); ok {
				song.UnionCover = unionCover
			}
		}

		newSongsList = append(newSongsList, song)
	}

	return NewSongResponse{
		Success:   true,
		Message:   "获取新歌速递成功",
		ErrorCode: 0,
		Status:    0,
		Data:      newSongsList,
	}
}

// GetNewAlbums 获取新碟上架
func (d *DiscoverService) GetNewAlbums() NewAlbumResponse {
	log.Println("开始获取新碟上架...")

	// 读取cookie
	cookie, err := d.readCookieFromFile()
	if err != nil {
		return NewAlbumResponse{
			Success: false,
			Message: fmt.Sprintf("读取cookie失败: %v", err),
		}
	}

	// 构建请求URL
	requestURL := fmt.Sprintf("%s/top/album", baseApi)

	// 构建查询参数
	queryParams := url.Values{}
	queryParams.Add("cookie", cookie)

	// 添加查询参数到URL
	requestURL += "?" + queryParams.Encode()

	log.Printf("调用新碟上架API: %s", requestURL)

	// 创建HTTP客户端，设置超时
	client := &http.Client{
		Timeout: 15 * time.Second,
	}

	// 发送GET请求
	resp, err := client.Get(requestURL)
	if err != nil {
		log.Printf("新碟上架API请求失败: %v", err)
		return NewAlbumResponse{
			Success: false,
			Message: "API请求失败",
		}
	}
	defer resp.Body.Close()

	// 读取响应
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("读取新碟上架响应失败: %v", err)
		return NewAlbumResponse{
			Success: false,
			Message: "读取响应失败",
		}
	}

	log.Printf("新碟上架API响应状态码: %d", resp.StatusCode)

	// 检查响应状态码
	if resp.StatusCode != 200 {
		log.Printf("新碟上架API返回非200状态码: %d", resp.StatusCode)
		return NewAlbumResponse{
			Success: false,
			Message: fmt.Sprintf("API返回状态码: %d", resp.StatusCode),
		}
	}

	// 解析JSON响应
	var apiResponse map[string]interface{}
	if err := json.Unmarshal(body, &apiResponse); err != nil {
		log.Printf("解析新碟上架JSON失败: %v", err)
		log.Printf("响应内容不是有效的JSON: %s", string(body))
		return NewAlbumResponse{
			Success: false,
			Message: "解析响应失败",
		}
	}

	// 检查API响应状态
	if status, ok := apiResponse["status"].(float64); !ok || status != 1 {
		errorMsg := "API返回错误状态"
		if errStr, ok := apiResponse["error"].(string); ok && errStr != "" {
			errorMsg = errStr
		}
		log.Printf("新碟上架API错误: %s", errorMsg)
		return NewAlbumResponse{
			Success: false,
			Message: errorMsg,
		}
	}

	// 获取data对象
	dataInterface, ok := apiResponse["data"]
	if !ok {
		return NewAlbumResponse{
			Success: false,
			Message: "响应中缺少data字段",
		}
	}

	dataMap, ok := dataInterface.(map[string]interface{})
	if !ok {
		return NewAlbumResponse{
			Success: false,
			Message: "data字段格式错误",
		}
	}

	// 使用通用解析函数转换为前端需要的格式
	var newAlbumsList []NewAlbumData
	categories := []string{"chn", "eur", "jpn", "kor"}

	for _, category := range categories {
		if categoryArray, ok := dataMap[category].([]interface{}); ok {
			categoryAlbums := d.parseAlbumCategory(categoryArray)
			newAlbumsList = append(newAlbumsList, categoryAlbums...)
		}
	}

	log.Printf("成功获取新碟上架，共%d张专辑", len(newAlbumsList))

	return NewAlbumResponse{
		Success:   true,
		Message:   "获取新碟上架成功",
		ErrorCode: 0,
		Status:    0,
		Data:      newAlbumsList,
	}
}

// GetRecommendSongs 获取推荐歌曲
func (d *DiscoverService) GetRecommendSongs(category string) RecommendSongResponse {
	// 读取cookie
	cookie, err := d.readCookieFromFile()
	if err != nil {
		return RecommendSongResponse{
			Success: false,
			Message: fmt.Sprintf("读取cookie失败: %v", err),
		}
	}

	// 将前端分类映射到对应的card_id
	categoryToCardID := map[string]string{
		"personal": "1", // 精选好歌随心听 || 私人专属好歌
		"classic":  "2", // 经典怀旧金曲
		"popular":  "3", // 热门好歌精选
		"treasure": "4", // 小众宝藏佳作
		"trendy":   "5", // 潮流尝鲜
		"vip":      "6", // vip 专属推荐
	}

	// 获取对应的card_id
	cardID, exists := categoryToCardID[category]
	if !exists {
		cardID = "1" // 默认使用精选好歌
	}

	// 构建请求URL
	requestURL := fmt.Sprintf("%s/top/card", baseApi)

	// 构建查询参数
	queryParams := url.Values{}
	queryParams.Add("card_id", cardID)
	queryParams.Add("cookie", cookie)

	// 添加查询参数到URL
	requestURL += "?" + queryParams.Encode()

	log.Printf("调用推荐歌曲API: %s (category: %s, card_id: %s)", requestURL, category, cardID)

	// 创建HTTP客户端，设置超时
	client := &http.Client{
		Timeout: 15 * time.Second,
	}

	// 发送GET请求
	resp, err := client.Get(requestURL)
	if err != nil {
		return RecommendSongResponse{
			Success: false,
			Message: fmt.Sprintf("请求失败: %v", err),
		}
	}
	defer resp.Body.Close()

	// 读取响应体
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return RecommendSongResponse{
			Success: false,
			Message: fmt.Sprintf("读取响应失败: %v", err),
		}
	}

	log.Printf("推荐歌曲API响应状态码: %d", resp.StatusCode)

	// 解析JSON响应
	var apiResponse map[string]interface{}
	if err := json.Unmarshal(body, &apiResponse); err != nil {
		return RecommendSongResponse{
			Success: false,
			Message: fmt.Sprintf("解析响应失败: %v", err),
		}
	}

	// 检查API响应状态
	if status, ok := apiResponse["status"].(float64); !ok || status != 1 {
		errorMsg := "API请求失败"
		if msg, ok := apiResponse["error"].(string); ok {
			errorMsg = msg
		}
		return RecommendSongResponse{
			Success: false,
			Message: errorMsg,
		}
	}

	// 获取data对象
	dataInterface, ok := apiResponse["data"]
	if !ok {
		return RecommendSongResponse{
			Success: false,
			Message: "响应中缺少data字段",
		}
	}

	dataMap, ok := dataInterface.(map[string]interface{})
	if !ok {
		return RecommendSongResponse{
			Success: false,
			Message: "data字段格式错误",
		}
	}

	// 获取song_list数组
	songListInterface, ok := dataMap["song_list"]
	if !ok {
		return RecommendSongResponse{
			Success: false,
			Message: "响应中缺少song_list字段",
		}
	}

	songListArray, ok := songListInterface.([]interface{})
	if !ok {
		return RecommendSongResponse{
			Success: false,
			Message: "song_list字段格式错误",
		}
	}

	// 转换为前端需要的格式
	var recommendSongsList []RecommendSongData
	for _, item := range songListArray {
		itemMap, ok := item.(map[string]interface{})
		if !ok {
			continue
		}

		song := RecommendSongData{}

		// 安全地提取字段，按照API文档的数据对应关系
		if hash, ok := itemMap["hash"].(string); ok {
			song.Hash = hash
		}
		if songname, ok := itemMap["songname"].(string); ok {
			song.SongName = songname
		}
		if filename, ok := itemMap["filename"].(string); ok {
			song.FileName = filename
		}
		if timeLength, ok := itemMap["time_length"].(float64); ok {
			song.TimeLength = int(timeLength)
		} else if timeLengthInt, ok := itemMap["time_length"].(int); ok {
			song.TimeLength = timeLengthInt
		}
		if albumName, ok := itemMap["album_name"].(string); ok {
			song.AlbumName = albumName
		}
		if albumID, ok := itemMap["album_id"].(string); ok {
			song.AlbumID = albumID
		} else if albumIDFloat, ok := itemMap["album_id"].(float64); ok {
			song.AlbumID = fmt.Sprintf("%.0f", albumIDFloat)
		}
		if authorName, ok := itemMap["author_name"].(string); ok {
			song.AuthorName = authorName
		}
		if sizableCover, ok := itemMap["sizable_cover"].(string); ok {
			song.UnionCover = sizableCover
		}

		recommendSongsList = append(recommendSongsList, song)
	}

	log.Printf("成功获取%s推荐歌曲，共%d首", category, len(recommendSongsList))

	return RecommendSongResponse{
		Success:   true,
		Message:   fmt.Sprintf("获取%s推荐歌曲成功", category),
		ErrorCode: 0,
		Status:    0,
		Data:      recommendSongsList,
	}
}
