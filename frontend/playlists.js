// 收藏的歌单页面功能模块
import { FavoritesService } from "./bindings/wmplayer/index.js";

// 收藏的歌单页面数据管理
class PlaylistsPageManager {
    constructor() {
        this.data = {
            myPlaylists: [], // 我创建的歌单
            collectedPlaylists: [] // 我收藏的歌单
        };
        this.loading = {
            playlists: false
        };
        this.currentTab = 'created'; // 'created' 或 'collected'
        this.stats = {
            totalCreated: 0,
            totalCollected: 0
        };
    }

    // 初始化收藏的歌单页面
    async init() {
        console.log('🎵 初始化收藏的歌单页面');
        this.bindEvents();
        await this.loadPlaylists();
    }

    // 绑定事件
    bindEvents() {
        // 标签页切换
        const filterTabs = document.querySelectorAll('#playlistsPage .filter-tab');
        filterTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.textContent.includes('创建') ? 'created' : 'collected');
            });
        });

        // 搜索框
        const searchInput = document.querySelector('#playlistsPage .search-box-small input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterPlaylists(e.target.value);
            });
        }

        // 排序选择已移除

        // 创建歌单按钮
        const createBtn = document.querySelector('#playlistsPage .action-btn-primary');
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                this.showCreatePlaylistDialog();
            });
        }
    }

    // 加载歌单
    async loadPlaylists() {
        console.log('📊 加载用户歌单');
        
        if (this.loading.playlists) {
            console.log('⏳ 歌单正在加载中...');
            return;
        }

        this.loading.playlists = true;
        this.showLoadingState();

        try {
            const response = await FavoritesService.GetUserPlaylists();
            console.log('用户歌单API响应:', response);

            if (response.success && response.data) {
                // 分类歌单
                this.data.myPlaylists = response.data.filter(playlist => playlist.type === 0);
                this.data.collectedPlaylists = response.data.filter(playlist => playlist.type === 1);
                
                this.updateStats();
                this.renderPlaylists();
                console.log('✅ 用户歌单加载成功，我创建的:', this.data.myPlaylists.length, '个，我收藏的:', this.data.collectedPlaylists.length, '个');
            } else {
                console.error('❌ 用户歌单加载失败:', response.message);
                this.showErrorState(response.message || '加载失败');
            }
        } catch (error) {
            console.error('❌ 用户歌单加载异常:', error);
            this.showErrorState('网络错误，请稍后重试');
        } finally {
            this.loading.playlists = false;
        }
    }

    // 更新统计信息
    updateStats() {
        this.stats.totalCreated = this.data.myPlaylists.length;
        this.stats.totalCollected = this.data.collectedPlaylists.length;

        // 更新标签页显示
        const tabs = document.querySelectorAll('#playlistsPage .filter-tab');
        if (tabs.length >= 2) {
            tabs[0].textContent = `我创建的 (${this.stats.totalCreated})`;
            tabs[1].textContent = `我收藏的 (${this.stats.totalCollected})`;
        }
    }

    // 切换标签页
    switchTab(tab) {
        this.currentTab = tab;
        
        // 更新标签页样式
        const tabs = document.querySelectorAll('#playlistsPage .filter-tab');
        tabs.forEach((tabElement, index) => {
            tabElement.classList.remove('active');
            if ((tab === 'created' && index === 0) || (tab === 'collected' && index === 1)) {
                tabElement.classList.add('active');
            }
        });

        // 重新渲染歌单
        this.renderPlaylists();
    }

    // 渲染歌单列表
    renderPlaylists() {
        const container = document.querySelector('#playlistsPage .playlists-grid');
        if (!container) {
            console.error('❌ 找不到歌单容器');
            return;
        }

        const currentPlaylists = this.currentTab === 'created' ? this.data.myPlaylists : this.data.collectedPlaylists;

        if (currentPlaylists.length === 0) {
            const emptyText = this.currentTab === 'created' ? '还没有创建歌单' : '还没有收藏歌单';
            const emptySubtext = this.currentTab === 'created' ? '点击上方按钮创建你的第一个歌单' : '去发现页面找找喜欢的歌单吧';
            
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-list-music"></i>
                    </div>
                    <div class="empty-text">${emptyText}</div>
                    <div class="empty-subtext">${emptySubtext}</div>
                </div>
            `;
            return;
        }

        const playlistsHTML = currentPlaylists.map((playlist, index) => {
            const coverUrl = playlist.union_cover ? playlist.union_cover.replace('{size}', '200') : '';
            const createTime = new Date(playlist.create_time * 1000).toLocaleDateString();

            return `
                <div class="new-album-item playlist-item" data-playlist-id="${playlist.listid}" data-index="${index}">
                    <div class="album-cover">
                        ${coverUrl ?
                            `<img src="${coverUrl}" alt="${playlist.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                             <div class="cover-placeholder" style="display: none;">
                                <i class="fas fa-list-music"></i>
                             </div>` :
                            `<div class="cover-placeholder">
                                <i class="fas fa-list-music"></i>
                             </div>`
                        }
                        <div class="album-overlay">
                            <button class="play-album-btn" title="播放歌单">
                                <i class="fas fa-play"></i>
                            </button>
                        </div>
                    </div>
                    <div class="album-info">
                        <div class="album-title">${playlist.name || '未命名歌单'}</div>
                        <div class="album-author_name">由${playlist.create_username || '未知用户'}${playlist.type === 0 ? '创建' : '收藏'}</div>
                        <div class="album-meta">
                            <span class="album-count">${playlist.count}首</span>
                            <span class="album-date">${createTime}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = playlistsHTML;

        // 绑定歌单项事件
        this.bindPlaylistEvents();
    }

    // 绑定歌单项事件
    bindPlaylistEvents() {
        const container = document.querySelector('#playlistsPage .playlists-grid');
        if (!container) return;

        // 按钮事件
        container.addEventListener('click', (e) => {
            // 播放按钮事件
            if (e.target.closest('.play-album-btn')) {
                e.stopPropagation(); // 阻止事件冒泡
                const playlistCard = e.target.closest('.playlist-item');
                const playlistId = playlistCard.dataset.playlistId;
                this.playPlaylist(playlistId);
                return;
            }

            // 歌单卡片单击事件 - 跳转到歌单详情
            const playlistCard = e.target.closest('.playlist-item');
            if (playlistCard) {
                const playlistId = playlistCard.dataset.playlistId;
                this.viewPlaylistDetail(playlistId);
            }
        });

        // 双击播放
        container.addEventListener('dblclick', (e) => {
            const playlistCard = e.target.closest('.playlist-item');
            if (playlistCard) {
                const playlistId = playlistCard.dataset.playlistId;
                this.playPlaylist(playlistId);
            }
        });
    }

    // 播放歌单
    async playPlaylist(playlistId) {
        console.log('🎵 播放歌单:', playlistId);

        try {
            // 获取歌单的global_collection_id
            const globalCollectionId = this.getPlaylistGlobalCollectionId(playlistId);
            if (!globalCollectionId) {
                console.error('❌ 无法找到歌单的global_collection_id:', playlistId);
                this.showToast('播放失败: 歌单ID无效', 'error');
                return;
            }

            console.log('🎵 使用global_collection_id获取歌单歌曲:', globalCollectionId);

            // 获取歌单歌曲列表
            const { GetPlaylistSongs } = await import('./bindings/wmplayer/favoritesservice.js');
            const response = await GetPlaylistSongs(globalCollectionId);

            if (response && response.success && response.data && response.data.length > 0) {
                console.log('✅ 获取歌单歌曲成功，共', response.data.length, '首歌曲');

                // 转换歌曲数据格式，使其与播放器兼容
                const songs = response.data.map(song => ({
                    hash: song.hash || '',
                    songname: song.songname || song.song_name || '',
                    filename: song.filename || song.file_name || '',
                    author_name: song.author_name || '',
                    album_name: song.album_name || '',
                    album_id: song.album_id || '',
                    time_length: parseInt(song.time_length) || 0,
                    union_cover: song.union_cover || ''
                }));

                // 找到歌单名称
                const playlistName = this.getPlaylistName(playlistId);

                // 使用统一的播放控制器播放歌单
                if (window.PlayerController) {
                    const success = await window.PlayerController.playPlaylist(songs, 0, playlistName);
                    if (success) {
                        console.log('✅ 歌单播放成功');
                    } else {
                        console.error('❌ 歌单播放失败');
                    }
                } else {
                    console.error('❌ PlayerController不可用');
                }
            } else {
                console.error('❌ 获取歌单歌曲失败:', response?.message || '未知错误');
                this.showToast('播放失败: ' + (response?.message || '获取歌单歌曲失败'), 'error');
            }
        } catch (error) {
            console.error('❌ 播放歌单失败:', error);
            this.showToast('播放失败: ' + error.message, 'error');
        }
    }

    // 获取歌单名称
    getPlaylistName(playlistId) {
        // 在我创建的歌单中查找
        const createdPlaylist = this.data.myPlaylists.find(p => p.listid == playlistId);
        if (createdPlaylist) {
            return createdPlaylist.name;
        }

        // 在我收藏的歌单中查找
        const collectedPlaylist = this.data.collectedPlaylists.find(p => p.listid == playlistId);
        if (collectedPlaylist) {
            return collectedPlaylist.name;
        }

        return '歌单';
    }

    // 获取歌单的global_collection_id
    getPlaylistGlobalCollectionId(playlistId) {
        // 在我创建的歌单中查找
        const createdPlaylist = this.data.myPlaylists.find(p => p.listid == playlistId);
        if (createdPlaylist) {
            return createdPlaylist.global_collection_id;
        }

        // 在我收藏的歌单中查找
        const collectedPlaylist = this.data.collectedPlaylists.find(p => p.listid == playlistId);
        if (collectedPlaylist) {
            return collectedPlaylist.global_collection_id;
        }

        return null;
    }

    // 查看歌单详情
    viewPlaylistDetail(playlistId) {
        console.log('🎵 查看歌单详情:', playlistId);

        // 获取歌单的global_collection_id
        const globalCollectionId = this.getPlaylistGlobalCollectionId(playlistId);
        if (!globalCollectionId) {
            console.error('❌ 无法找到歌单的global_collection_id:', playlistId);
            this.showToast('查看详情失败: 歌单ID无效', 'error');
            return;
        }

        console.log('🎵 使用global_collection_id查看歌单详情:', globalCollectionId);

        // 先导航到碟片页面
        if (window.PAGE_STATES && window.navigateToPage) {
            console.log('🧭 开始导航到碟片页面...');
            window.navigateToPage(window.PAGE_STATES.ALBUM_DETAIL);
            console.log('✅ 导航调用完成');
        } else {
            console.error('❌ 导航函数或PAGE_STATES不可用');
            return;
        }

        // 然后调用专辑详情管理器显示歌单详情，传递global_collection_id
        if (window.AlbumDetailManager) {
            console.log('🎵 调用AlbumDetailManager.showPlaylistDetail...');
            window.AlbumDetailManager.showPlaylistDetail(globalCollectionId);
        } else {
            console.error('❌ AlbumDetailManager不可用');
        }
    }

    // 显示提示消息
    showToast(message, type = 'info') {
        // 创建提示元素
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#f56565' : '#48bb78'};
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;

        document.body.appendChild(toast);

        // 3秒后自动移除
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    }

    // 切换歌单收藏状态
    togglePlaylistFavorite(index) {
        console.log('❤️ 切换歌单收藏状态:', index);
        // TODO: 实现收藏/取消收藏歌单功能
    }

    // 显示歌单菜单
    showPlaylistMenu(index, event) {
        console.log('📋 显示歌单菜单:', index);
        // TODO: 实现右键菜单功能
    }

    // 显示创建歌单对话框
    showCreatePlaylistDialog() {
        console.log('➕ 显示创建歌单对话框');
        // TODO: 实现创建歌单对话框
    }

    // 过滤歌单
    filterPlaylists(query) {
        console.log('🔍 过滤歌单:', query);
        // TODO: 实现搜索过滤功能
    }

    // 排序歌单
    sortPlaylists(sortType) {
        console.log('📊 排序歌单:', sortType);
        // TODO: 实现排序功能
    }

    // 显示加载状态
    showLoadingState() {
        const container = document.querySelector('#playlistsPage .playlists-grid');
        if (container) {
            container.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">正在加载歌单...</div>
                </div>
            `;
        }
    }

    // 显示错误状态
    showErrorState(message) {
        const container = document.querySelector('#playlistsPage .playlists-grid');
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="error-text">${message}</div>
                    <button class="retry-btn" onclick="window.playlistsPageManager?.loadPlaylists()">
                        重试
                    </button>
                </div>
            `;
        }
    }
}

// 创建全局实例
window.playlistsPageManager = new PlaylistsPageManager();

// 初始化收藏的歌单页面的函数
window.initPlaylistsPage = async () => {
    console.log('🎵 初始化收藏的歌单页面');
    await window.playlistsPageManager.init();
};

// 刷新收藏的歌单页面
window.refreshPlaylistsPage = async () => {
    console.log('🔄 刷新收藏的歌单页面');
    if (window.playlistsPageManager) {
        await window.playlistsPageManager.loadPlaylists();
    }
};

// 导出管理器类
export { PlaylistsPageManager };
