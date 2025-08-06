// 我喜欢的页面功能模块
import { FavoritesService } from "./bindings/wmplayer/index.js";

// 我喜欢的页面数据管理
class FavoritesPageManager {
    constructor() {
        this.data = {
            favoritesSongs: []
        };
        this.loading = {
            favoritesSongs: false,
            loadingMore: false
        };
        this.stats = {
            totalSongs: 0,
            totalDuration: 0
        };
        this.pagination = {
            currentPage: 1,
            pageSize: 200,
            hasMore: true,
            isInitialLoad: true
        };
    }

    // 初始化我喜欢的页面
    async init() {
        console.log('🎵 初始化我喜欢的页面');
        this.bindEvents();
        await this.loadFavoritesSongs(true); // 初始加载
    }

    // 绑定事件
    bindEvents() {
        // 搜索框
        const searchInput = document.querySelector('#favoritesPage .search-box-small input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterFavorites(e.target.value);
            });
        }

        // 绑定滚动事件进行懒加载
        this.bindScrollEvent();
    }

    // 绑定滚动事件
    bindScrollEvent() {
        const favoritesContent = document.querySelector('#favoritesPage .favorites-content');
        if (favoritesContent) {
            favoritesContent.addEventListener('scroll', () => {
                this.handleScroll();
            });
        }
    }

    // 处理滚动事件
    handleScroll() {
        const favoritesContent = document.querySelector('#favoritesPage .favorites-content');
        if (!favoritesContent) return;

        const scrollTop = favoritesContent.scrollTop;
        const scrollHeight = favoritesContent.scrollHeight;
        const clientHeight = favoritesContent.clientHeight;

        // 当滚动到底部附近时加载更多
        if (scrollTop + clientHeight >= scrollHeight - 100) {
            this.loadMoreFavorites();
        }
    }

    // 加载我喜欢的歌曲
    async loadFavoritesSongs(isInitialLoad = false) {
        console.log('📊 加载我喜欢的歌曲，页码:', this.pagination.currentPage);

        if (this.loading.favoritesSongs) {
            console.log('⏳ 我喜欢的歌曲正在加载中...');
            return;
        }

        this.loading.favoritesSongs = true;

        if (isInitialLoad) {
            this.showLoadingState();
        }

        try {
            const response = await FavoritesService.GetFavoritesSongs(
                this.pagination.currentPage,
                this.pagination.pageSize
            );
            console.log('我喜欢的歌曲API响应:', response);

            if (response.success && response.data) {
                if (isInitialLoad) {
                    // 初始加载，替换数据
                    this.data.favoritesSongs = response.data;
                } else {
                    // 懒加载，追加数据
                    this.data.favoritesSongs = [...this.data.favoritesSongs, ...response.data];
                }

                // 检查是否还有更多数据
                this.pagination.hasMore = response.data.length === this.pagination.pageSize;

                this.updateStats();
                this.renderFavoritesSongs();
                console.log('✅ 我喜欢的歌曲加载成功，当前共', this.data.favoritesSongs.length, '首');
            } else {
                console.error('❌ 我喜欢的歌曲加载失败:', response.message);
                if (isInitialLoad) {
                    this.showErrorState(response.message || '加载失败');
                }
            }
        } catch (error) {
            console.error('❌ 我喜欢的歌曲加载异常:', error);
            if (isInitialLoad) {
                this.showErrorState('网络错误，请稍后重试');
            }
        } finally {
            this.loading.favoritesSongs = false;
        }
    }

    // 加载更多我喜欢的歌曲
    async loadMoreFavorites() {
        if (this.loading.loadingMore || !this.pagination.hasMore) {
            return;
        }

        console.log('📊 加载更多我喜欢的歌曲...');
        this.loading.loadingMore = true;
        this.showLoadMoreState();

        try {
            this.pagination.currentPage++;
            const response = await FavoritesService.GetFavoritesSongs(
                this.pagination.currentPage,
                this.pagination.pageSize
            );

            if (response.success && response.data) {
                // 追加新数据
                this.data.favoritesSongs = [...this.data.favoritesSongs, ...response.data];

                // 检查是否还有更多数据
                this.pagination.hasMore = response.data.length === this.pagination.pageSize;

                this.updateStats();
                this.renderFavoritesSongs();
                console.log('✅ 加载更多成功，当前共', this.data.favoritesSongs.length, '首');
            } else {
                console.error('❌ 加载更多失败:', response.message);
                // 回退页码
                this.pagination.currentPage--;
            }
        } catch (error) {
            console.error('❌ 加载更多异常:', error);
            // 回退页码
            this.pagination.currentPage--;
        } finally {
            this.loading.loadingMore = false;
            this.hideLoadMoreState();
        }
    }

    // 更新统计信息
    updateStats() {
        const songs = this.data.favoritesSongs;
        this.stats.totalSongs = songs.length;
        this.stats.totalDuration = songs.reduce((total, song) => total + (song.time_length || 0), 0);

        // 更新页面显示
        const statsNumber = document.querySelector('#favoritesPage .stats-number');
        const statsLabel = document.querySelector('#favoritesPage .stats-label');
        
        if (statsNumber) {
            statsNumber.textContent = this.stats.totalSongs;
        }
        if (statsLabel) {
            statsLabel.textContent = `首喜欢的歌曲`;
        }

        // 更新总时长显示
        const durationStats = document.querySelectorAll('#favoritesPage .stats-info')[1];
        if (durationStats) {
            const durationNumber = durationStats.querySelector('.stats-number');
            if (durationNumber) {
                const hours = Math.floor(this.stats.totalDuration / 3600);
                const minutes = Math.floor((this.stats.totalDuration % 3600) / 60);
                durationNumber.textContent = `${hours}小时${minutes}分钟`;
            }
        }
    }

    // 渲染我喜欢的歌曲列表
    renderFavoritesSongs() {
        const container = document.querySelector('#favoritesPage .favorites-list');
        if (!container) {
            console.error('❌ 找不到我喜欢的歌曲容器');
            return;
        }

        if (this.data.favoritesSongs.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-heart"></i>
                    </div>
                    <div class="empty-text">还没有喜欢的歌曲</div>
                    <div class="empty-subtext">去发现页面找找喜欢的音乐吧</div>
                </div>
            `;
            // 更新播放全部按钮状态
            this.updatePlayAllButton();
            return;
        }

        const songsHTML = this.data.favoritesSongs.map((song, index) => {
            const coverUrl = song.union_cover ?
                song.union_cover.replace('{size}', '100') : '';

            // 格式化时长
            const formatDuration = (seconds) => {
                if (!seconds || seconds <= 0) return '--:--';
                const mins = Math.floor(seconds / 60);
                const secs = seconds % 60;
                return `${mins}:${secs.toString().padStart(2, '0')}`;
            };

            return `
                <div class="song-list-item" data-index="${index}" data-song-id="${song.hash}">
                    <div class="song-cover">
                        ${coverUrl ?
                            `<img src="${coverUrl}" alt="${song.songname}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                             <div class="cover-placeholder" style="display: none;">
                                <i class="fas fa-music"></i>
                             </div>` :
                            `<div class="cover-placeholder">
                                <i class="fas fa-music"></i>
                             </div>`
                        }
                    </div>
                    <div class="song-info">
                        <div class="songname" title="${song.songname || '未知歌曲'}">${song.songname || '未知歌曲'}</div>
                        <div class="author_name" title="${song.author_name || '未知艺术家'}">${song.author_name || '未知艺术家'}</div>
                    </div>
                    <div class="song-duration">${formatDuration(song.time_length)}</div>
                    <div class="song-actions">
                        <button class="action-btn play-btn" title="播放" data-hash="${song.hash}">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="action-btn like-btn liked" title="取消收藏" data-hash="${song.hash}">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = songsHTML;

        // 添加加载更多按钮或状态
        this.addLoadMoreButton();

        // 更新播放全部按钮状态
        this.updatePlayAllButton();

        // 绑定歌曲项事件
        this.bindSongEvents();
    }

    // 添加加载更多按钮
    addLoadMoreButton() {
        const container = document.querySelector('#favoritesPage .favorites-list');
        if (!container) return;

        // 移除现有的加载更多指示器
        const existingIndicator = container.querySelector('.load-more-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        // 如果正在加载或没有更多数据，不显示按钮
        if (this.loading.loadingMore) {
            return;
        }

        // 创建加载更多指示器
        const loadMoreIndicator = document.createElement('div');
        loadMoreIndicator.className = 'load-more-indicator';

        if (this.pagination.hasMore) {
            // 还有更多数据，显示加载更多按钮
            loadMoreIndicator.innerHTML = `
                <button class="load-more-btn" onclick="window.favoritesPageManager?.loadMoreFavorites()">
                    加载更多
                </button>
            `;
        } else if (this.data.favoritesSongs.length > this.pagination.pageSize) {
            // 没有更多数据了，但已经加载了多页数据
            loadMoreIndicator.innerHTML = `
                <div class="no-more-data">
                    <i class="fas fa-check-circle"></i>
                    <span>已加载全部歌曲</span>
                </div>
            `;
        }

        container.appendChild(loadMoreIndicator);
    }

    // 更新播放全部按钮状态
    updatePlayAllButton() {
        const playAllBtn = document.querySelector('#favoritesPage .play-all-btn');
        if (playAllBtn) {
            const hasSongs = this.data.favoritesSongs && this.data.favoritesSongs.length > 0;
            playAllBtn.disabled = !hasSongs;

            if (hasSongs) {
                playAllBtn.title = `播放全部 ${this.data.favoritesSongs.length} 首歌曲`;
            } else {
                playAllBtn.title = '暂无歌曲可播放';
            }
        }
    }

    // 绑定歌曲项事件
    bindSongEvents() {
        const container = document.querySelector('#favoritesPage .favorites-list');
        if (!container) return;

        // 播放按钮事件
        container.addEventListener('click', (e) => {
            if (e.target.closest('.play-btn')) {
                const songItem = e.target.closest('.song-list-item');
                const index = parseInt(songItem.dataset.index);
                this.playSong(index);
            }

            // 收藏按钮事件（取消收藏）
            if (e.target.closest('.like-btn')) {
                const hash = e.target.closest('.like-btn').dataset.hash;
                this.removeFavorite(hash);
            }
        });

        // 双击播放
        container.addEventListener('dblclick', (e) => {
            const songItem = e.target.closest('.song-list-item');
            if (songItem) {
                const index = parseInt(songItem.dataset.index);
                this.playSong(index);
            }
        });
    }

    // 播放歌曲
    async playSong(index) {
        const song = this.data.favoritesSongs[index];
        if (!song) return;

        console.log('🎵 播放我喜欢的歌曲:', song.songname);

        // 使用统一的播放控制器播放歌单
        if (window.PlayerController) {
            const success = await window.PlayerController.playPlaylist(this.data.favoritesSongs, index, '我喜欢');
            if (success) {
                console.log('✅ 我喜欢的歌曲播放成功');
            } else {
                console.error('❌ 我喜欢的歌曲播放失败');
            }
        } else {
            console.error('❌ PlayerController不可用');
        }
    }

    // 播放全部我喜欢的歌曲
    async playAllFavorites() {
        if (!this.data.favoritesSongs || this.data.favoritesSongs.length === 0) {
            console.warn('⚠️ 没有喜欢的歌曲可播放');
            return;
        }

        console.log('🎵 播放全部我喜欢的歌曲，共', this.data.favoritesSongs.length, '首');

        // 使用统一的播放控制器播放歌单
        if (window.PlayerController) {
            const success = await window.PlayerController.playPlaylist(this.data.favoritesSongs, 0, '我喜欢');
            if (success) {
                console.log('✅ 我喜欢的歌曲播放成功');
            } else {
                console.error('❌ 我喜欢的歌曲播放失败');
            }
        } else {
            console.error('❌ PlayerController不可用');
        }
    }

    // 下载歌曲
    downloadSong(hash) {
        console.log('📥 下载歌曲:', hash);
        // TODO: 实现下载功能
    }

    // 取消收藏歌曲
    async removeFavorite(hash) {
        console.log('💔 取消收藏歌曲:', hash);

        try {
            // 调用全局的取消收藏函数
            if (window.removeFromFavorites) {
                const success = await window.removeFromFavorites(hash);
                if (success) {
                    // 从本地数据中移除
                    this.data.favoritesSongs = this.data.favoritesSongs.filter(song => song.hash !== hash);
                    // 重新渲染列表
                    this.renderFavoritesSongs();
                    // 更新统计信息
                    this.updateStats();
                    console.log('✅ 歌曲已从收藏中移除');
                } else {
                    console.error('❌ 取消收藏失败');
                }
            } else {
                console.error('❌ removeFromFavorites函数不可用');
            }
        } catch (error) {
            console.error('❌ 取消收藏异常:', error);
        }
    }



    // 过滤收藏歌曲
    filterFavorites(query) {
        console.log('🔍 过滤收藏歌曲:', query);
        // TODO: 实现搜索过滤功能
    }



    // 格式化时长
    formatDuration(seconds) {
        if (!seconds || seconds <= 0) return '--:--';
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    // 显示加载状态
    showLoadingState() {
        const container = document.querySelector('#favoritesPage .favorites-list');
        if (container) {
            container.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">正在加载我喜欢的歌曲...</div>
                </div>
            `;
        }
    }

    // 显示错误状态
    showErrorState(message) {
        const container = document.querySelector('#favoritesPage .favorites-list');
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="error-text">${message}</div>
                    <button class="retry-btn" onclick="window.favoritesPageManager?.loadFavoritesSongs(true)">
                        重试
                    </button>
                </div>
            `;
        }
    }

    // 显示加载更多状态
    showLoadMoreState() {
        const container = document.querySelector('#favoritesPage .favorites-list');
        if (container) {
            // 检查是否已经有加载更多指示器
            let loadMoreIndicator = container.querySelector('.load-more-indicator');
            if (!loadMoreIndicator) {
                loadMoreIndicator = document.createElement('div');
                loadMoreIndicator.className = 'load-more-indicator';
                container.appendChild(loadMoreIndicator);
            }

            loadMoreIndicator.innerHTML = `
                <div class="loading-more">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">正在加载更多...</div>
                </div>
            `;
        }
    }

    // 隐藏加载更多状态
    hideLoadMoreState() {
        const loadMoreIndicator = document.querySelector('#favoritesPage .load-more-indicator');
        if (loadMoreIndicator) {
            if (this.pagination.hasMore) {
                // 如果还有更多数据，显示加载更多按钮
                loadMoreIndicator.innerHTML = `
                    <button class="load-more-btn" onclick="window.favoritesPageManager?.loadMoreFavorites()">
                        加载更多
                    </button>
                `;
            } else {
                // 没有更多数据了
                loadMoreIndicator.innerHTML = `
                    <div class="no-more-data">
                        <i class="fas fa-check-circle"></i>
                        <span>已加载全部歌曲</span>
                    </div>
                `;
            }
        }
    }
}

// 创建全局实例
window.favoritesPageManager = new FavoritesPageManager();

// 初始化我喜欢的页面的函数
window.initFavoritesPage = async () => {
    console.log('🎵 初始化我喜欢的页面');
    await window.favoritesPageManager.init();
};

// 刷新我喜欢的页面
window.refreshFavoritesPage = async () => {
    console.log('🔄 刷新我喜欢的页面');
    if (window.favoritesPageManager) {
        // 重置分页状态
        window.favoritesPageManager.pagination.currentPage = 1;
        window.favoritesPageManager.pagination.hasMore = true;
        // 重新加载数据
        await window.favoritesPageManager.loadFavoritesSongs(true);
    }
};

// 导出管理器类
export { FavoritesPageManager };
