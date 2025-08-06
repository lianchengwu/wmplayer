// 发现页面功能模块
import { DiscoverService } from "./bindings/wmplayer/index.js";

// 缓存配置
const DISCOVER_CACHE_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24小时（毫秒）
const DISCOVER_CACHE_KEYS = {
    NEW_SONGS: 'discoverNewSongsCache',
    NEW_ALBUMS: 'discoverNewAlbumsCache',
    RECOMMENDATIONS: 'discoverRecommendationsCache',
    // 各个推荐tab的单独缓存
    RECOMMEND_PERSONAL: 'discoverRecommendPersonalCache',
    RECOMMEND_CLASSIC: 'discoverRecommendClassicCache',
    RECOMMEND_POPULAR: 'discoverRecommendPopularCache',
    RECOMMEND_VIP: 'discoverRecommendVipCache',
    RECOMMEND_TREASURE: 'discoverRecommendTreasureCache',
    RECOMMEND_TRENDY: 'discoverRecommendTrendyCache'
};

// 缓存工具函数
function setDiscoverCache(key, data) {
    try {
        const cacheData = {
            data: data,
            timestamp: Date.now(),
            expiry: Date.now() + DISCOVER_CACHE_EXPIRY_TIME
        };
        localStorage.setItem(key, JSON.stringify(cacheData));
        console.log(`✅ 发现页缓存已保存: ${key}`);
    } catch (error) {
        console.error(`❌ 保存发现页缓存失败: ${key}`, error);
    }
}

function getDiscoverCache(key) {
    try {
        const cached = localStorage.getItem(key);
        if (!cached) {
            console.log(`📭 无发现页缓存数据: ${key}`);
            return null;
        }

        const cacheData = JSON.parse(cached);
        if (Date.now() > cacheData.expiry) {
            console.log(`⏰ 发现页缓存已过期: ${key}`);
            localStorage.removeItem(key);
            return null;
        }

        console.log(`📦 读取发现页缓存成功: ${key}`);
        return cacheData.data;
    } catch (error) {
        console.error(`❌ 读取发现页缓存失败: ${key}`, error);
        localStorage.removeItem(key);
        return null;
    }
}

function clearDiscoverCache(key) {
    try {
        localStorage.removeItem(key);
        console.log(`🗑️ 发现页缓存已清除: ${key}`);
    } catch (error) {
        console.error(`❌ 清除发现页缓存失败: ${key}`, error);
    }
}

// 发现页面数据管理
class DiscoverPageManager {
    constructor() {
        this.currentRecommendTab = 'personal'; // 当前推荐tab
        this.data = {
            newSongs: [],
            newAlbums: [],
            recommendations: {
                personal: [],
                classic: [],
                popular: [],
                vip: [],
                treasure: [],
                trendy: []
            }
        };
        this.loading = {
            newSongs: false,
            newAlbums: false,
            recommendations: false
        };
    }

    // 初始化发现页面
    async init() {
        console.log('🎵 初始化发现页面');
        this.bindEvents();
        await this.loadAllData();
    }

    // 绑定事件
    bindEvents() {
        // 推荐tab切换事件
        const tabButtons = document.querySelectorAll('.recommend-tab-btn');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabType = e.target.dataset.tab;
                this.switchRecommendTab(tabType);
            });
        });

        // 新歌速递播放事件
        this.bindNewSongsEvents();

        // 新歌速递播放全部按钮事件
        this.bindPlayAllNewSongsEvent();

        // 新碟上架播放事件
        this.bindNewAlbumsEvents();

        // 推荐歌曲播放事件
        this.bindRecommendationsEvents();

        // 推荐歌曲播放全部按钮事件
        this.bindPlayAllRecommendationsEvent();

        // 刷新按钮事件
        this.bindRefreshEvents();
    }

    // 加载所有数据
    async loadAllData() {
        console.log('📊 加载发现页面所有数据');

        // 并发加载所有数据
        const promises = [
            this.loadNewSongs(),
            this.loadNewAlbums(),
            this.loadRecommendations()
        ];

        try {
            await Promise.allSettled(promises);
            console.log('✅ 发现页面数据加载完成');
        } catch (error) {
            console.error('❌ 发现页面数据加载失败:', error);
        }
    }

    // 加载新歌速递
    async loadNewSongs(forceRefresh = false) {
        if (this.loading.newSongs) return;

        this.loading.newSongs = true;
        this.showNewSongsLoading();

        try {
            // 如果不是强制刷新，先检查缓存
            if (!forceRefresh) {
                const cachedData = getDiscoverCache(DISCOVER_CACHE_KEYS.NEW_SONGS);
                if (cachedData && cachedData.length > 0) {
                    this.data.newSongs = cachedData;
                    this.renderNewSongs();
                    console.log('✅ 从缓存加载新歌速递成功，共', cachedData.length, '首歌曲');
                    this.loading.newSongs = false;
                    return;
                }
            }

            console.log('📡 调用新歌速递API...', forceRefresh ? '(强制刷新)' : '');

            // 调用后端API获取新歌速递
            const response = await DiscoverService.GetNewSongs();

            if (response && response.success) {
                console.log('✅ 新歌速递API调用成功');

                // 转换数据格式以适配前端显示
                const newSongs = response.data.map(song => ({
                    id: song.hash,
                    hash: song.hash,
                    songname: song.songname,
                    author_name: song.author_name,
                    album: song.album_name,
                    time_length: song.time_length, // 保持数字格式，用于播放列表
                    durationText: this.formatDuration(song.time_length), // 格式化文本，用于显示
                    cover: this.getImageUrl(song.union_cover, 120),
                    filename: song.filename,
                    album_id: song.album_id,
                    union_cover: song.union_cover // 保留原始封面URL
                }));

                this.data.newSongs = newSongs;

                // 保存到缓存
                setDiscoverCache(DISCOVER_CACHE_KEYS.NEW_SONGS, newSongs);

                this.renderNewSongs();

            } else {
                console.error('❌ 新歌速递API返回错误:', response);
                this.showNewSongsError();
            }

        } catch (error) {
            console.error('❌ 加载新歌速递失败:', error);
            this.showNewSongsError();
        } finally {
            this.loading.newSongs = false;
        }
    }

    // 加载新碟上架
    async loadNewAlbums() {
        console.log('🎵 loadNewAlbums 函数被调用');
        if (this.loading.newAlbums) {
            console.log('⚠️ 新碟上架正在加载中，跳过重复请求');
            return;
        }

        this.loading.newAlbums = true;
        this.showNewAlbumsLoading();

        try {
            console.log('📡 调用新碟上架API...');
            // console.log('🔧 DiscoverService.GetNewAlbums:', DiscoverService.GetNewAlbums);

            // 调用后端API获取新碟上架
            const response = await DiscoverService.GetNewAlbums();

            if (response && response.success) {
                console.log('✅ 新碟上架API调用成功');
                console.log('新碟上架API响应数据:', response.data);

                // 转换数据格式以适配前端显示，使用新的字段名
                const newAlbums = response.data.map(album => ({
                    id: album.id,
                    title: album.album_name,
                    author_name: album.author_name,
                    releaseDate: album.release_date,
                    songCount: album.song_count,
                    cover: this.getImageUrl(album.union_cover, 300),
                    description: album.description
                }));

                this.data.newAlbums = newAlbums;
                this.renderNewAlbums();

            } else {
                console.error('❌ 新碟上架API返回错误:', response);
                this.showNewAlbumsError();
            }

        } catch (error) {
            console.error('❌ 加载新碟上架失败:', error);
            this.showNewAlbumsError();
        } finally {
            this.loading.newAlbums = false;
        }
    }

    // 加载推荐歌曲
    async loadRecommendations(forceRefresh = false) {
        if (this.loading.recommendations) return;

        this.loading.recommendations = true;
        this.showRecommendationsLoading();

        try {
            const categories = ['personal', 'classic', 'popular', 'vip', 'treasure', 'trendy'];
            const cacheKeyMap = {
                'personal': DISCOVER_CACHE_KEYS.RECOMMEND_PERSONAL,
                'classic': DISCOVER_CACHE_KEYS.RECOMMEND_CLASSIC,
                'popular': DISCOVER_CACHE_KEYS.RECOMMEND_POPULAR,
                'vip': DISCOVER_CACHE_KEYS.RECOMMEND_VIP,
                'treasure': DISCOVER_CACHE_KEYS.RECOMMEND_TREASURE,
                'trendy': DISCOVER_CACHE_KEYS.RECOMMEND_TRENDY
            };

            const recommendations = {};
            const categoriesToLoad = [];

            // 如果不是强制刷新，先检查各个tab的缓存
            if (!forceRefresh) {
                for (const category of categories) {
                    const cachedData = getDiscoverCache(cacheKeyMap[category]);
                    if (cachedData && cachedData.length > 0) {
                        recommendations[category] = cachedData;
                        console.log(`✅ 从缓存加载${category}推荐歌曲成功，共${cachedData.length}首`);
                    } else {
                        categoriesToLoad.push(category);
                    }
                }

                // 如果所有tab都有缓存，直接返回
                if (categoriesToLoad.length === 0) {
                    this.data.recommendations = recommendations;
                    this.renderRecommendations();
                    console.log('✅ 所有推荐歌曲tab都从缓存加载成功');
                    this.loading.recommendations = false;
                    return;
                }
            } else {
                // 强制刷新时，清除所有tab的缓存
                categories.forEach(category => {
                    clearDiscoverCache(cacheKeyMap[category]);
                });
                categoriesToLoad.push(...categories);
            }

            console.log('📡 调用推荐歌曲API...', forceRefresh ? '(强制刷新)' : `(加载${categoriesToLoad.join(', ')})`);

            // 只加载需要的类别
            const promises = categoriesToLoad.map(category =>
                DiscoverService.GetRecommendSongs(category)
            );

            const responses = await Promise.allSettled(promises);

            responses.forEach((result, index) => {
                const category = categoriesToLoad[index];
                if (result.status === 'fulfilled' && result.value && result.value.success) {
                    console.log(`✅ ${category}推荐歌曲API调用成功`);

                    // 转换数据格式以适配前端显示
                    const categoryData = result.value.data.map(song => ({
                        id: song.hash,
                        hash: song.hash,
                        songname: song.songname,
                        author_name: song.author_name,
                        album: song.album_name,
                        time_length: song.time_length,
                        durationText: this.formatDuration(song.time_length),
                        cover: this.getImageUrl(song.union_cover, 60),
                        filename: song.filename,
                        album_id: song.album_id,
                        union_cover: song.union_cover // 保留原始封面URL，用于播放器显示
                    }));

                    recommendations[category] = categoryData;

                    // 为每个tab单独缓存
                    setDiscoverCache(cacheKeyMap[category], categoryData);
                } else {
                    console.error(`❌ ${category}推荐歌曲API调用失败:`, result);
                    recommendations[category] = [];
                }
            });

            this.data.recommendations = recommendations;
            this.renderRecommendations();

        } catch (error) {
            console.error('❌ 加载推荐歌曲失败:', error);
            this.showRecommendationsError();
        } finally {
            this.loading.recommendations = false;
        }
    }

    // 切换推荐tab
    switchRecommendTab(tabType) {
        if (this.currentRecommendTab === tabType) return;

        this.currentRecommendTab = tabType;

        // 更新tab按钮状态
        document.querySelectorAll('.recommend-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabType}"]`).classList.add('active');

        // 检查当前tab是否有数据，没有则加载
        if (!this.data.recommendations[tabType] || this.data.recommendations[tabType].length === 0) {
            console.log(`📡 当前tab(${tabType})无数据，开始加载...`);
            this.loadSingleRecommendTab(tabType);
        } else {
            // 渲染对应的推荐内容
            this.renderRecommendations();
        }
    }

    // 加载单个推荐tab的数据
    async loadSingleRecommendTab(category) {
        const cacheKeyMap = {
            'personal': DISCOVER_CACHE_KEYS.RECOMMEND_PERSONAL,
            'classic': DISCOVER_CACHE_KEYS.RECOMMEND_CLASSIC,
            'popular': DISCOVER_CACHE_KEYS.RECOMMEND_POPULAR,
            'vip': DISCOVER_CACHE_KEYS.RECOMMEND_VIP,
            'treasure': DISCOVER_CACHE_KEYS.RECOMMEND_TREASURE,
            'trendy': DISCOVER_CACHE_KEYS.RECOMMEND_TRENDY
        };

        try {
            // 先检查缓存
            const cachedData = getDiscoverCache(cacheKeyMap[category]);
            if (cachedData && cachedData.length > 0) {
                this.data.recommendations[category] = cachedData;
                this.renderRecommendations();
                console.log(`✅ 从缓存加载${category}推荐歌曲成功，共${cachedData.length}首`);
                return;
            }

            // 显示加载状态
            this.showRecommendationsLoading();

            console.log(`📡 调用${category}推荐歌曲API...`);
            const response = await DiscoverService.GetRecommendSongs(category);

            if (response && response.success) {
                console.log(`✅ ${category}推荐歌曲API调用成功`);

                // 转换数据格式
                const categoryData = response.data.map(song => ({
                    id: song.hash,
                    hash: song.hash,
                    songname: song.songname,
                    author_name: song.author_name,
                    album: song.album_name,
                    time_length: song.time_length,
                    durationText: this.formatDuration(song.time_length),
                    cover: this.getImageUrl(song.union_cover, 60),
                    filename: song.filename,
                    album_id: song.album_id,
                    union_cover: song.union_cover
                }));

                this.data.recommendations[category] = categoryData;

                // 缓存数据
                setDiscoverCache(cacheKeyMap[category], categoryData);

                // 渲染内容
                this.renderRecommendations();
            } else {
                console.error(`❌ ${category}推荐歌曲API返回错误:`, response);
                this.data.recommendations[category] = [];
                this.showRecommendationsError();
            }
        } catch (error) {
            console.error(`❌ 加载${category}推荐歌曲失败:`, error);
            this.data.recommendations[category] = [];
            this.showRecommendationsError();
        }
    }

    // 渲染新歌速递
    renderNewSongs() {
        const container = document.getElementById('newSongsList');
        if (!container) return;

        const html = this.data.newSongs.map((song, index) => `
            <div class="song-list-item" data-song-id="${song.id}">
                <div class="song-index">${index + 1}</div>
                <div class="song-cover">
                    <img src="${song.cover}" alt="${song.songname}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="cover-placeholder" style="display: none;">
                        <i class="fas fa-music"></i>
                    </div>
                </div>
                <div class="song-info">
                    <div class="songname">${song.songname}</div>
                    <div class="author_name">${song.author_name}</div>
                </div>
                <div class="song-actions">
                    <button class="action-btn play-btn" title="播放" data-song-id="${song.id}">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="action-btn like-btn" title="收藏" data-song-id="${song.id}">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
        this.bindNewSongsEvents();
        this.bindPlayAllNewSongsEvent();
    }

    // 渲染新碟上架
    renderNewAlbums() {
        const container = document.getElementById('newAlbumsList');
        if (!container) return;

        const html = this.data.newAlbums.map(album => `
            <div class="new-album-item" data-album-id="${album.id}">
                <div class="album-cover">
                    <img src="${album.cover}" alt="${album.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="cover-placeholder" style="display: none;">
                        <i class="fas fa-compact-disc"></i>
                    </div>
                    <div class="album-overlay">
                        <button class="play-album-btn" data-album-id="${album.id}">
                            <i class="fas fa-play"></i>
                        </button>
                    </div>
                </div>
                <div class="album-info">
                    <div class="album-title">${album.title}</div>
                    <div class="album-author_name">${album.author_name}</div>
                    <div class="album-meta">
                        <span class="album-date">${album.releaseDate}</span>
                        <span class="album-count">${album.songCount}首</span>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
        this.bindNewAlbumsEvents();
    }

    // 渲染推荐歌曲
    renderRecommendations() {
        const container = document.getElementById('recommendationsList');
        if (!container) return;

        const currentData = this.data.recommendations[this.currentRecommendTab] || [];
        
        const html = currentData.map((song, index) => `
            <div class="song-list-item" data-song-id="${song.id}">
                <div class="song-index">${index + 1}</div>
                <div class="song-cover">
                    <img src="${song.cover}" alt="${song.songname}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="cover-placeholder" style="display: none;">
                        <i class="fas fa-music"></i>
                    </div>
                </div>
                <div class="song-info">
                    <div class="songname">${song.songname}</div>
                    <div class="author_name">${song.author_name}</div>
                </div>
                <div class="song-actions">
                    <button class="action-btn play-btn" title="播放" data-song-id="${song.id}">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="action-btn like-btn" title="收藏" data-song-id="${song.id}">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
        this.bindRecommendationsEvents();
    }

    // 绑定新歌速递事件
    bindNewSongsEvents() {
        const playButtons = document.querySelectorAll('#newSongsList .play-btn');
        playButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const songId = e.target.closest('.play-btn').dataset.songId;
                this.playNewSong(songId);
            });
        });

        const likeButtons = document.querySelectorAll('#newSongsList .like-btn');
        likeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const songId = e.target.closest('.like-btn').dataset.songId;
                this.likeSong(songId);
            });
        });
    }

    // 绑定播放全部新歌事件
    bindPlayAllNewSongsEvent() {
        const playAllBtn = document.getElementById('playAllNewSongs');
        if (playAllBtn) {
            playAllBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.playAllNewSongs();
            });
        }
    }

    // 绑定播放全部推荐歌曲事件
    bindPlayAllRecommendationsEvent() {
        const playAllBtn = document.getElementById('playAllRecommendations');
        if (playAllBtn) {
            playAllBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.playAllRecommendations();
            });
        }
    }

    // 绑定新碟上架事件
    bindNewAlbumsEvents() {
        // 专辑播放按钮事件
        const playButtons = document.querySelectorAll('.play-album-btn');
        playButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const albumId = e.target.closest('.play-album-btn').dataset.albumId;
                this.playAlbum(albumId);
            });
        });

        // 专辑项点击事件 - 跳转到专辑详情页面
        const albumItems = document.querySelectorAll('.new-album-item');
        console.log('🔗 绑定专辑点击事件，找到', albumItems.length, '个专辑项');
        albumItems.forEach(item => {
            item.addEventListener('click', (e) => {
                console.log('🖱️ 专辑项被点击:', item.dataset.albumId);

                // 如果点击的是播放按钮，不处理
                if (e.target.closest('.play-album-btn')) {
                    console.log('🎵 点击的是播放按钮，跳过专辑详情');
                    return;
                }

                const albumId = item.dataset.albumId;
                console.log('🎵 准备查看专辑详情，albumId:', albumId);
                this.viewAlbumDetail(albumId);
            });
        });
    }

    // 绑定推荐歌曲事件
    bindRecommendationsEvents() {
        const playButtons = document.querySelectorAll('#recommendationsList .play-btn');
        playButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const songId = e.target.closest('.play-btn').dataset.songId;
                this.playRecommendSong(songId);
            });
        });

        const likeButtons = document.querySelectorAll('#recommendationsList .like-btn');
        likeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const songId = e.target.closest('.like-btn').dataset.songId;
                this.likeSong(songId);
            });
        });
    }

    // 播放新歌
    playNewSong(songId) {
        const song = this.data.newSongs.find(s => s.id === songId);
        if (song) {
            console.log('🎵 播放新歌:', song.songname);
            console.log('🔍 发现页歌曲数据详细检查:', {
                '完整歌曲对象': song,
                'songname字段': song.songname,
                'songname类型': typeof song.songname,
                'hash字段': song.hash,
                'author_name字段': song.author_name,
                'filename字段': song.filename
            });
            // 使用统一的 PlayerController
            if (window.PlayerController) {
                window.PlayerController.playSong(song);
            }
        }
    }

    // 播放全部新歌
    async playAllNewSongs() {
        if (!this.data.newSongs || this.data.newSongs.length === 0) {
            console.warn('⚠️ 没有新歌可播放');
            return;
        }

        console.log('🎵 播放全部新歌，共', this.data.newSongs.length, '首');

        // 使用统一的 PlayerController 播放歌单
        if (window.PlayerController) {
            const success = await window.PlayerController.playPlaylist(this.data.newSongs, 0, '新歌速递');
            if (success) {
                console.log('✅ 新歌速递播放成功');
            } else {
                console.error('❌ 新歌速递播放失败');
            }
        } else {
            console.error('❌ PlayerController不可用');
        }
    }

    // 播放全部推荐歌曲
    async playAllRecommendations() {
        const currentTabData = this.data.recommendations[this.currentRecommendTab];
        if (!currentTabData || currentTabData.length === 0) {
            console.warn('⚠️ 当前推荐tab没有歌曲可播放');
            return;
        }

        // 获取当前tab的名称
        const tabNames = {
            'personal': '私人专属好歌',
            'classic': '经典怀旧金曲',
            'popular': '热门好歌精选',
            'vip': 'VIP专属推荐',
            'treasure': '小众宝藏佳作',
            'trendy': '潮流尝鲜'
        };
        const tabName = tabNames[this.currentRecommendTab] || '歌曲推荐';

        console.log('🎵 播放全部推荐歌曲:', tabName, '共', currentTabData.length, '首');

        // 使用统一的 PlayerController 播放歌单
        if (window.PlayerController) {
            const success = await window.PlayerController.playPlaylist(currentTabData, 0, tabName);
            if (success) {
                console.log('✅ 推荐歌曲播放成功');
            } else {
                console.error('❌ 推荐歌曲播放失败');
            }
        } else {
            console.error('❌ PlayerController不可用');
        }
    }

    // 播放专辑
    playAlbum(albumId) {
        const album = this.data.newAlbums.find(a => a.id === albumId);
        if (album) {
            console.log('💿 播放专辑:', album.title);
            // 这里应该调用专辑播放函数
        }
    }

    // 查看专辑详情
    viewAlbumDetail(albumId) {
        console.log('🎵 viewAlbumDetail 被调用，albumId:', albumId);

        const album = this.data.newAlbums.find(a => a.id === albumId);
        if (album) {
            console.log('🎵 查看专辑详情:', album.title);
            console.log('🔍 检查全局对象:', {
                'window.PAGE_STATES': !!window.PAGE_STATES,
                'window.navigateToPage': !!window.navigateToPage,
                'window.AlbumDetailManager': !!window.AlbumDetailManager,
                'PAGE_STATES.ALBUM_DETAIL': window.PAGE_STATES?.ALBUM_DETAIL
            });

            // 先导航到碟片页面
            if (window.PAGE_STATES && window.navigateToPage) {
                console.log('🧭 开始导航到碟片页面...');
                window.navigateToPage(window.PAGE_STATES.ALBUM_DETAIL);
                console.log('✅ 导航调用完成');
            } else {
                console.error('❌ 导航函数或PAGE_STATES不可用');
            }

            // 然后调用专辑详情管理器显示专辑详情
            if (window.AlbumDetailManager) {
                console.log('🎵 调用AlbumDetailManager.showAlbumDetail...');
                window.AlbumDetailManager.showAlbumDetail(albumId);
            } else {
                console.error('❌ AlbumDetailManager不可用');
            }
        } else {
            console.error('❌ 找不到专辑:', albumId, '可用专辑:', this.data.newAlbums.map(a => a.id));
        }
    }

    // 播放推荐歌曲
    playRecommendSong(songId) {
        const song = this.data.recommendations[this.currentRecommendTab]?.find(s => s.id === songId);
        if (song) {
            console.log('🎵 播放推荐歌曲:', song.songname);
            console.log('🔍 发现页推荐歌曲数据详细检查:', {
                '完整歌曲对象': song,
                'songname字段': song.songname,
                'songname类型': typeof song.songname,
                'hash字段': song.hash,
                'author_name字段': song.author_name,
                'filename字段': song.filename
            });
            // 使用统一的 PlayerController
            if (window.PlayerController) {
                window.PlayerController.playSong(song);
            }
        }
    }

    // 收藏歌曲
    async likeSong(songId) {
        console.log('❤️ 收藏歌曲:', songId);

        // 根据歌曲ID找到对应的歌曲数据
        let song = null;

        // 在新歌列表中查找
        if (this.data.newSongs) {
            song = this.data.newSongs.find(s => s.id === songId);
        }

        // 在推荐歌曲中查找
        if (!song && this.data.recommendations[this.currentRecommendTab]) {
            song = this.data.recommendations[this.currentRecommendTab].find(s => s.id === songId);
        }

        if (!song) {
            console.warn('未找到歌曲数据:', songId);
            this.showToast('收藏失败: 未找到歌曲信息', 'error');
            return;
        }

        await this.addToFavorites(song);
    }

    // 添加歌曲到收藏 - 调用全局函数
    async addToFavorites(song) {
        try {
            // 调用全局的 addToFavorites 函数
            if (window.addToFavorites) {
                return await window.addToFavorites(song);
            } else {
                console.error('全局 addToFavorites 函数不可用');
                this.showToast('收藏失败: 系统错误', 'error');
                return false;
            }
        } catch (error) {
            console.error('发现页面添加收藏失败:', error);
            this.showToast('收藏失败: ' + error.message, 'error');
            return false;
        }
    }

    // 显示提示消息
    showToast(message, type = 'info') {
        // 创建提示元素
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        // 添加样式
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            padding: 12px 24px;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 10000;
            font-size: 14px;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;

        // 添加到页面
        document.body.appendChild(toast);

        // 显示动画
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }, 10);

        // 自动隐藏
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    // 显示加载状态
    showNewSongsLoading() {
        const container = document.getElementById('newSongsList');
        if (container) {
            container.innerHTML = '<div class="loading-placeholder">加载中...</div>';
        }
    }

    showNewAlbumsLoading() {
        const container = document.getElementById('newAlbumsList');
        if (container) {
            container.innerHTML = '<div class="loading-placeholder">加载中...</div>';
        }
    }

    showRecommendationsLoading() {
        const container = document.getElementById('recommendationsList');
        if (container) {
            container.innerHTML = '<div class="loading-placeholder">加载中...</div>';
        }
    }

    // 显示错误状态
    showNewSongsError() {
        const container = document.getElementById('newSongsList');
        if (container) {
            container.innerHTML = '<div class="error-placeholder">加载失败，请重试</div>';
        }
    }

    showNewAlbumsError() {
        const container = document.getElementById('newAlbumsList');
        if (container) {
            container.innerHTML = '<div class="error-placeholder">加载失败，请重试</div>';
        }
    }

    showRecommendationsError() {
        const container = document.getElementById('recommendationsList');
        if (container) {
            container.innerHTML = '<div class="error-placeholder">加载失败，请重试</div>';
        }
    }

    // 辅助函数：格式化时长（秒转换为 mm:ss 格式）
    formatDuration(seconds) {
        if (!seconds || seconds <= 0) return '00:00';

        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;

        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    // 辅助函数：获取图片URL（处理尺寸替换）
    getImageUrl(unionCover, size = 60) {
        if (!unionCover) {
            return `/api/placeholder/${size}/${size}`;
        }

        // 如果包含{size}占位符，替换为实际尺寸
        if (unionCover.includes('{size}')) {
            const finalUrl = unionCover.replace('{size}', `${size}`);
            return finalUrl;
        }

        return unionCover;
    }

    // 绑定刷新按钮事件
    bindRefreshEvents() {
        // 推荐歌曲刷新按钮
        const refreshRecommendationsBtn = document.getElementById('refreshRecommendations');
        if (refreshRecommendationsBtn) {
            refreshRecommendationsBtn.addEventListener('click', () => this.refreshRecommendations());
        }

        // 新歌速递刷新按钮
        const refreshNewSongsBtn = document.getElementById('refreshNewSongs');
        if (refreshNewSongsBtn) {
            refreshNewSongsBtn.addEventListener('click', () => this.refreshNewSongs());
        }
    }

    // 刷新推荐歌曲
    async refreshRecommendations() {
        console.log('🔄 刷新推荐歌曲...');

        // 显示刷新动画
        const refreshBtn = document.getElementById('refreshRecommendations');
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.querySelector('i').style.animation = 'spin 1s linear infinite';
        }

        try {
            // 清除所有推荐tab的缓存
            clearDiscoverCache(DISCOVER_CACHE_KEYS.RECOMMEND_PERSONAL);
            clearDiscoverCache(DISCOVER_CACHE_KEYS.RECOMMEND_CLASSIC);
            clearDiscoverCache(DISCOVER_CACHE_KEYS.RECOMMEND_POPULAR);
            clearDiscoverCache(DISCOVER_CACHE_KEYS.RECOMMEND_VIP);
            clearDiscoverCache(DISCOVER_CACHE_KEYS.RECOMMEND_TREASURE);
            clearDiscoverCache(DISCOVER_CACHE_KEYS.RECOMMEND_TRENDY);

            // 强制刷新所有推荐数据
            await this.loadRecommendations(true);
            console.log('✅ 推荐歌曲刷新完成');
        } catch (error) {
            console.error('❌ 推荐歌曲刷新失败:', error);
        } finally {
            // 恢复按钮状态
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.querySelector('i').style.animation = '';
            }
        }
    }

    // 刷新新歌速递
    async refreshNewSongs() {
        console.log('🔄 刷新新歌速递...');

        // 显示刷新动画
        const refreshBtn = document.getElementById('refreshNewSongs');
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.querySelector('i').style.animation = 'spin 1s linear infinite';
        }

        try {
            // 清除缓存并强制刷新
            clearDiscoverCache(DISCOVER_CACHE_KEYS.NEW_SONGS);
            await this.loadNewSongs(true);
            console.log('✅ 新歌速递刷新完成');
        } catch (error) {
            console.error('❌ 新歌速递刷新失败:', error);
        } finally {
            // 恢复按钮状态
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.querySelector('i').style.animation = '';
            }
        }
    }

    // 刷新整个发现音乐页面
    async refreshDiscoverPage() {
        console.log('🔄 刷新发现音乐页面...');

        try {
            // 同时刷新推荐歌曲和新歌速递
            await Promise.all([
                this.refreshRecommendations(),
                this.refreshNewSongs()
            ]);

            console.log('✅ 发现音乐页面刷新完成');
        } catch (error) {
            console.error('❌ 发现音乐页面刷新失败:', error);
        }
    }
}

// 全局发现页面管理器实例
let discoverPageManager = null;

// 初始化发现页面
window.initDiscoverPage = () => {
    if (!discoverPageManager) {
        discoverPageManager = new DiscoverPageManager();
        // 将管理器暴露到全局作用域
        window.discoverPageManager = discoverPageManager;
    }
    discoverPageManager.init();
};

// 暴露发现页面刷新函数
window.refreshDiscoverPage = () => {
    if (window.discoverPageManager) {
        return window.discoverPageManager.refreshDiscoverPage();
    } else {
        console.warn('发现页面管理器未初始化');
    }
};
