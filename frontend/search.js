// 搜索页面JavaScript功能

// 导入Wails绑定
import * as SearchServiceBinding from './bindings/wmplayer/searchservice.js';

// 搜索服务类
class SearchService {
    constructor() {
        // 使用Wails绑定，不需要直接的HTTP请求
    }

    // 综合搜索
    async search(keyword, page = 1, pageSize = 30) {
        try {
            // 使用Wails绑定调用Go后端
            const result = await SearchServiceBinding.Search(keyword, page, pageSize);
            return {
                success: result.success,
                message: result.message,
                data: result.data
            };
        } catch (error) {
            console.error('搜索失败:', error);
            return { success: false, message: '搜索失败' };
        }
    }

    // 获取热搜列表
    async getHotSearch() {
        try {
            // 使用Wails绑定调用Go后端
            const result = await SearchServiceBinding.GetHotSearch();
            return {
                success: result.success,
                message: result.message,
                data: result.data
            };
        } catch (error) {
            console.error('获取热搜失败:', error);
            return { success: false, message: '获取热搜失败' };
        }
    }

    // 获取搜索建议
    async getSearchSuggest(keyword) {
        try {
            // 使用Wails绑定调用Go后端
            const result = await SearchServiceBinding.GetSearchSuggest(keyword);
            return {
                success: result.success,
                message: result.message,
                data: result.data
            };
        } catch (error) {
            console.error('获取搜索建议失败:', error);
            return { success: false, message: '获取搜索建议失败' };
        }
    }

    // 搜索歌曲
    async searchSongs(keyword, page = 1, pageSize = 30) {
        try {
            // 使用Wails绑定调用Go后端
            const result = await SearchServiceBinding.SearchSongs(keyword, page, pageSize);
            return {
                success: result.success,
                message: result.message,
                data: {
                    songs: result.data?.songs?.list || [],
                    total: result.data?.songs?.total || 0
                }
            };
        } catch (error) {
            console.error('搜索歌曲失败:', error);
            return { success: false, message: '搜索歌曲失败' };
        }
    }

    // 搜索艺人
    async searchArtists(keyword, page = 1, pageSize = 30) {
        try {
            // 使用Wails绑定调用Go后端
            const result = await SearchServiceBinding.SearchArtists(keyword, page, pageSize);
            return {
                success: result.success,
                message: result.message,
                data: {
                    author_names: result.data?.artists?.list || [],
                    total: result.data?.artists?.total || 0
                }
            };
        } catch (error) {
            console.error('搜索艺人失败:', error);
            return { success: false, message: '搜索艺人失败' };
        }
    }

    // 搜索歌单
    async searchPlaylists(keyword, page = 1, pageSize = 30) {
        try {
            // 使用Wails绑定调用Go后端
            const result = await SearchServiceBinding.SearchPlaylists(keyword, page, pageSize);
            return {
                success: result.success,
                message: result.message,
                data: {
                    playlists: result.data?.playlists?.list || [],
                    total: result.data?.playlists?.total || 0
                }
            };
        } catch (error) {
            console.error('搜索歌单失败:', error);
            return { success: false, message: '搜索歌单失败' };
        }
    }

    // 搜索专辑
    async searchAlbums(keyword, page = 1, pageSize = 30) {
        try {
            // 使用Wails绑定调用Go后端
            const result = await SearchServiceBinding.SearchAlbums(keyword, page, pageSize);
            return {
                success: result.success,
                message: result.message,
                data: {
                    albums: result.data?.albums?.list || [],
                    total: result.data?.albums?.total || 0
                }
            };
        } catch (error) {
            console.error('搜索专辑失败:', error);
            return { success: false, message: '搜索专辑失败' };
        }
    }

    // 搜索MV
    async searchMVs(keyword, page = 1, pageSize = 30) {
        try {
            // 使用Wails绑定调用Go后端
            const result = await SearchServiceBinding.SearchMVs(keyword, page, pageSize);
            return {
                success: result.success,
                message: result.message,
                data: {
                    mvs: result.data?.mvs?.list || [],
                    total: result.data?.mvs?.total || 0
                }
            };
        } catch (error) {
            console.error('搜索MV失败:', error);
            return { success: false, message: '搜索MV失败' };
        }
    }
}

// 搜索页面管理类
class SearchPageManager {
    constructor() {
        this.searchService = new SearchService();
        this.currentKeyword = '';
        this.searchTimeout = null;
        this.searchData = {
            songs: { data: [], page: 1, total: 0, hasMore: true, loading: false },
            author_names: { data: [], page: 1, total: 0, hasMore: true, loading: false },
            playlists: { data: [], page: 1, total: 0, hasMore: true, loading: false },
            albums: { data: [], page: 1, total: 0, hasMore: true, loading: false },
            mvs: { data: [], page: 1, total: 0, hasMore: true, loading: false }
        };
        this.isScrollLoading = false;
        this.pageSize = 30; // 每页显示数量
        this.init();
    }

    init() {
        this.bindScrollEvents();
        this.loadHotSearch(); // 加载热搜列表
        this.showEmptyState();
    }

    // 绑定滚动事件
    bindScrollEvents() {
        const resultsContainer = document.querySelector('.search-results-container');
        if (!resultsContainer) return;

        let scrollTimeout;
        resultsContainer.addEventListener('scroll', () => {
            // 防抖处理
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.handleScroll();
            }, 100);
        });
    }

    // 处理滚动事件
    handleScroll() {
        const resultsContainer = document.querySelector('.search-results-container');
        if (!resultsContainer || this.isScrollLoading) return;

        const scrollTop = resultsContainer.scrollTop;
        const scrollHeight = resultsContainer.scrollHeight;
        const clientHeight = resultsContainer.clientHeight;

        // 当滚动到底部附近时加载更多
        if (scrollTop + clientHeight >= scrollHeight - 200) {
            this.loadMoreContent();
        }
    }

    // 显示空状态
    showEmptyState() {
        const resultsContainer = document.querySelector('.search-results-container');
        const searchInfo = document.getElementById('searchInfo');
        const searchHeader = document.getElementById('searchHeader');

        if (resultsContainer) {
            resultsContainer.classList.remove('active');
            resultsContainer.style.display = 'none';
        }
        if (searchInfo) {
            searchInfo.style.display = 'none';
        }
        if (searchHeader) {
            searchHeader.style.display = 'none';
        }

        // 显示热搜列表
        this.showHotSearch();
    }

    // 加载热搜列表
    async loadHotSearch() {
        console.log('🔥 开始加载热搜列表...');

        try {
            const response = await this.searchService.getHotSearch();

            if (response.success && response.data && response.data.list) {
                console.log('✅ 热搜列表加载成功:', response.data.list.length, '个分类');
                this.renderHotSearch(response.data.list);
                this.showHotSearch();
            } else {
                console.error('❌ 热搜列表加载失败:', response.message);
                this.hideHotSearch();
            }
        } catch (error) {
            console.error('❌ 热搜列表加载异常:', error);
            this.hideHotSearch();
        }
    }

    // 渲染热搜列表
    renderHotSearch(categories) {
        const hotSearchContent = document.getElementById('hotSearchContent');
        if (!hotSearchContent) return;

        const html = categories.map(category => {
            const keywords = category.keywords || [];
            const keywordsHtml = keywords.map((keyword, index) => {
                const isPopular = index < 3; // 前3个关键词标记为热门
                return `
                    <span class="hot-search-keyword ${isPopular ? 'popular' : ''}"
                          data-keyword="${keyword.keyword}"
                          title="${keyword.reason || keyword.keyword}">
                        ${keyword.keyword}
                    </span>
                `;
            }).join('');

            return `
                <div class="hot-search-category">
                    <div class="hot-search-category-title">
                        <i class="fas fa-fire"></i>
                        ${category.name}
                    </div>
                    <div class="hot-search-keywords">
                        ${keywordsHtml}
                    </div>
                </div>
            `;
        }).join('');

        hotSearchContent.innerHTML = html;

        // 绑定点击事件
        this.bindHotSearchEvents();
    }

    // 绑定热搜关键词点击事件
    bindHotSearchEvents() {
        const keywords = document.querySelectorAll('.hot-search-keyword');
        keywords.forEach(keyword => {
            keyword.addEventListener('click', (e) => {
                const searchKeyword = e.target.dataset.keyword;
                if (searchKeyword) {
                    console.log('🔍 点击热搜关键词:', searchKeyword);
                    this.search(searchKeyword);

                    // 更新搜索框的值
                    const searchInput = document.querySelector('.search-input');
                    if (searchInput) {
                        searchInput.value = searchKeyword;
                    }
                }
            });
        });
    }

    // 显示热搜列表
    showHotSearch() {
        const hotSearchContainer = document.getElementById('hotSearchContainer');
        const resultsContainer = document.querySelector('.search-results-container');

        if (hotSearchContainer) {
            hotSearchContainer.style.display = 'block';
        }
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
        }
    }

    // 隐藏热搜列表
    hideHotSearch() {
        const hotSearchContainer = document.getElementById('hotSearchContainer');
        if (hotSearchContainer) {
            hotSearchContainer.style.display = 'none';
        }
    }

    // 公共搜索方法，供外部调用
    search(keyword) {
        if (!keyword || !keyword.trim()) {
            this.showEmptyState();
            return;
        }
        this.performSearch(keyword.trim());
    }

    // 执行搜索
    async performSearch(keyword) {
        if (!keyword || !keyword.trim()) {
            this.showEmptyState();
            return;
        }

        keyword = keyword.trim();
        this.currentKeyword = keyword;

        // 重置搜索数据
        this.resetSearchData();

        // 显示搜索结果容器和搜索信息
        this.showSearchResults();
        this.updateSearchInfo(keyword);

        // 并发加载所有栏目的第一页数据
        await this.loadAllSections();
    }

    // 重置搜索数据
    resetSearchData() {
        Object.keys(this.searchData).forEach(key => {
            this.searchData[key] = {
                data: [],
                page: 1,
                total: 0,
                hasMore: true,
                loading: false
            };
        });
        this.isScrollLoading = false;
    }

    // 显示搜索结果
    showSearchResults() {
        const resultsContainer = document.querySelector('.search-results-container');
        const searchHeader = document.getElementById('searchHeader');

        if (resultsContainer) {
            resultsContainer.classList.add('active');
            resultsContainer.style.display = 'block';
        }
        if (searchHeader) {
            searchHeader.style.display = 'block';
        }

        // 隐藏热搜列表
        this.hideHotSearch();

        // 清空所有栏目内容
        this.clearAllSections();
    }

    // 更新搜索信息
    updateSearchInfo(keyword) {
        const searchInfo = document.getElementById('searchInfo');
        const searchKeyword = searchInfo?.querySelector('.search-keyword');
        const searchStats = searchInfo?.querySelector('.search-stats');

        if (searchInfo && searchKeyword) {
            searchKeyword.textContent = `"${keyword}"`;
            searchInfo.style.display = 'flex';
        }

        if (searchStats) {
            searchStats.textContent = '搜索中...';
        }
    }

    // 更新搜索统计
    updateSearchStats() {
        const searchStats = document.querySelector('.search-stats');
        if (!searchStats) return;

        let totalCount = 0;
        Object.values(this.searchData).forEach(section => {
            totalCount += section.data.length;
        });

        if (totalCount > 0) {
            searchStats.textContent = `找到 ${totalCount} 个结果`;
        } else {
            searchStats.textContent = '未找到相关结果';
        }
    }

    // 清空所有栏目内容
    clearAllSections() {
        const sections = ['songs', 'author_names', 'playlists', 'albums', 'mvs'];
        sections.forEach(section => {
            const grid = document.getElementById(`${section}Grid`);
            const count = document.getElementById(`${section}Count`);
            const sectionElement = document.getElementById(`${section}Section`);

            if (grid) grid.innerHTML = '';
            if (count) count.textContent = '';
            if (sectionElement) {
                sectionElement.classList.remove('visible');
                sectionElement.style.display = 'none';
            }
        });
    }

    // 加载所有栏目
    async loadAllSections() {
        const sections = ['songs', 'author_names', 'playlists', 'albums', 'mvs'];

        // 显示所有栏目的加载状态
        sections.forEach(section => {
            this.showSectionLoading(section);
        });

        // 并发加载所有栏目
        const promises = sections.map(section => this.loadSectionData(section));
        await Promise.allSettled(promises);

        // 显示有数据的栏目
        this.showVisibleSections();
    }

    // 加载栏目数据
    async loadSectionData(sectionName, page = 1) {
        if (this.searchData[sectionName].loading) {
            return; // 防止重复加载
        }

        this.searchData[sectionName].loading = true;

        try {
            let result;
            const keyword = this.currentKeyword;
            const pageSize = 30;

            switch (sectionName) {
                case 'songs':
                    result = await this.searchService.searchSongs(keyword, page, pageSize);
                    break;
                case 'author_names':
                    result = await this.searchService.searchArtists(keyword, page, pageSize);
                    break;
                case 'playlists':
                    result = await this.searchService.searchPlaylists(keyword, page, pageSize);
                    break;
                case 'albums':
                    result = await this.searchService.searchAlbums(keyword, page, pageSize);
                    break;
                case 'mvs':
                    result = await this.searchService.searchMVs(keyword, page, pageSize);
                    break;
                default:
                    throw new Error(`未知的栏目: ${sectionName}`);
            }
            console.log(`[DEBUG] ${sectionName} - 加载数据结果:`, result);
            if (result.success && result.data) {
                console.log(`[DEBUG] ${sectionName} - 完整的result.data:`, result.data);
                // 获取对应的数据和总数（搜索方法已经处理了数据结构）
                let newData = [];
                let totalCount = 0;
                switch (sectionName) {
                    case 'songs':
                        newData = result.data.songs || [];
                        totalCount = result.data.total || 0;
                        break;
                    case 'author_names':
                        newData = result.data.author_names || [];
                        totalCount = result.data.total || 0;
                        break;
                    case 'playlists':
                        newData = result.data.playlists || [];
                        totalCount = result.data.total || 0;
                        break;
                    case 'albums':
                        newData = result.data.albums || [];
                        totalCount = result.data.total || 0;
                        break;
                    case 'mvs':
                        newData = result.data.mvs || [];
                        totalCount = result.data.total || 0;
                        break;
                }
                console.log(`[DEBUG] ${sectionName} - 获取到的数据:`, newData);
                console.log(`[DEBUG] ${sectionName} - 获取到的总数:`, totalCount);

                // 更新数据
                // 对于翻页，直接替换数据；对于无限滚动，追加数据
                if (page === 1 || this.searchData[sectionName].data.length === 0) {
                    // 第一页或数据已清空（翻页情况），直接替换
                    this.searchData[sectionName].data = newData;
                } else {
                    // 无限滚动，追加数据
                    this.searchData[sectionName].data = this.searchData[sectionName].data.concat(newData);
                }

                // 更新总数
                this.searchData[sectionName].total = totalCount;
                console.log(`[DEBUG] ${sectionName} - 设置总数: ${totalCount}`);

                // 更新页码和是否有更多数据
                this.searchData[sectionName].page = page;
                this.searchData[sectionName].hasMore = newData.length >= pageSize;

                // 显示数据
                this.displaySectionData(sectionName, page === 1);
            } else {
                this.showSectionError(sectionName, result.message || '加载失败');
            }
        } catch (error) {
            console.error(`加载${sectionName}数据失败:`, error);
            this.showSectionError(sectionName, '网络错误，请稍后重试');
        } finally {
            this.searchData[sectionName].loading = false;
            this.hideSectionLoading(sectionName);
        }
    }

    // 显示栏目数据
    displaySectionData(sectionName, isFirstLoad = true) {
        const data = this.searchData[sectionName].data;
        const grid = document.getElementById(`${sectionName}Grid`);
        const count = document.getElementById(`${sectionName}Count`);

        if (!grid) return;

        // 更新计数（显示总数）
        if (count) {
            const total = this.searchData[sectionName].total;
            console.log(`[DEBUG] ${sectionName} - 显示计数: total=${total}, data.length=${data.length}`);
            if (total > 0) {
                count.textContent = total > 999 ? '999+' : total.toString();
                console.log(`[DEBUG] ${sectionName} - 设置计数为总数: ${total}`);
            } else {
                count.textContent = data.length > 99 ? '99+' : data.length.toString();
                console.log(`[DEBUG] ${sectionName} - 设置计数为数据长度: ${data.length}`);
            }
        }

        // 更新或创建翻页组件
        this.updatePagination(sectionName);

        if (isFirstLoad) {
            // 首次加载，清空并重新创建
            grid.innerHTML = '';
            data.forEach((item, index) => {
                const card = this.createCard(item, sectionName, index);
                if (card) {
                    // 添加延迟动画
                    setTimeout(() => {
                        card.classList.add('new-item');
                        grid.appendChild(card);
                    }, index * 50);
                }
            });
        } else {
            // 追加新数据
            const startIndex = (this.searchData[sectionName].page - 1) * 30;
            const newData = data.slice(startIndex);

            newData.forEach((item, index) => {
                const globalIndex = startIndex + index;
                const card = this.createCard(item, sectionName, globalIndex);
                if (card) {
                    setTimeout(() => {
                        card.classList.add('new-item');
                        grid.appendChild(card);
                    }, index * 30);
                }
            });
        }
    }

    // 创建卡片
    createCard(item, sectionName, index = 0) {
        switch (sectionName) {
            case 'songs':
                return this.createSongCard(item, index);
            case 'author_names':
                return this.createArtistCard(item);
            case 'playlists':
                return this.createContentCard(item, 'playlist');
            case 'albums':
                return this.createContentCard(item, 'album');
            case 'mvs':
                return this.createContentCard(item, 'mv');
            default:
                return null;
        }
    }

    // 显示栏目加载状态
    showSectionLoading(sectionName) {
        const section = document.getElementById(`${sectionName}Section`);
        const loading = section?.querySelector('.section-loading');

        if (section) {
            section.style.display = 'block';
        }
        if (loading) {
            loading.style.display = 'flex';
        }
    }

    // 隐藏栏目加载状态
    hideSectionLoading(sectionName) {
        const section = document.getElementById(`${sectionName}Section`);
        const loading = section?.querySelector('.section-loading');

        if (loading) {
            loading.style.display = 'none';
        }
    }

    // 显示栏目错误
    showSectionError(sectionName, message) {
        const section = document.getElementById(`${sectionName}Section`);
        const grid = document.getElementById(`${sectionName}Grid`);

        if (grid) {
            grid.innerHTML = `
                <div class="section-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>加载失败</h3>
                    <p>${message}</p>
                    <button class="section-retry-btn" onclick="searchPageManager.loadSectionData('${sectionName}')">
                        重试
                    </button>
                </div>
            `;
        }

        if (section) {
            section.style.display = 'block';
            section.classList.add('visible');
        }
    }

    // 显示有数据的栏目
    showVisibleSections() {
        const sections = ['songs', 'author_names', 'playlists', 'albums', 'mvs'];

        sections.forEach((sectionName, index) => {
            const data = this.searchData[sectionName].data;
            const section = document.getElementById(`${sectionName}Section`);

            if (data.length > 0 && section) {
                section.style.display = 'block';
                // 添加渐入动画
                setTimeout(() => {
                    section.classList.add('visible');
                }, index * 200);
            }
        });

        // 更新搜索统计
        this.updateSearchStats();
    }

    // 加载更多内容
    async loadMoreContent() {
        if (this.isScrollLoading) return;

        // 找到还有更多数据的栏目
        const sectionsToLoad = Object.keys(this.searchData).filter(section =>
            this.searchData[section].hasMore &&
            !this.searchData[section].loading &&
            this.searchData[section].data.length > 0
        );

        if (sectionsToLoad.length === 0) {
            this.showNoMoreContent();
            return;
        }

        this.isScrollLoading = true;
        this.showLoadMoreIndicator();

        // 加载下一页数据
        const promises = sectionsToLoad.map(section => {
            const nextPage = this.searchData[section].page + 1;
            return this.loadSectionData(section, nextPage);
        });

        await Promise.allSettled(promises);

        this.isScrollLoading = false;
        this.hideLoadMoreIndicator();

        // 检查是否还有更多数据
        const hasMoreData = Object.values(this.searchData).some(section => section.hasMore);
        if (!hasMoreData) {
            this.showNoMoreContent();
        }
    }

    // 显示加载更多指示器
    showLoadMoreIndicator() {
        const indicator = document.getElementById('loadMoreIndicator');
        if (indicator) {
            indicator.style.display = 'flex';
        }
    }

    // 隐藏加载更多指示器
    hideLoadMoreIndicator() {
        const indicator = document.getElementById('loadMoreIndicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    // 显示无更多内容
    showNoMoreContent() {
        const noMore = document.getElementById('noMoreContent');
        if (noMore) {
            noMore.style.display = 'flex';
        }
    }

    // 隐藏无更多内容
    hideNoMoreContent() {
        const noMore = document.getElementById('noMoreContent');
        if (noMore) {
            noMore.style.display = 'none';
        }
    }
    // 创建歌曲卡片
    createSongCard(song, index = 0) {
        const card = document.createElement('div');
        card.className = 'song-list-item';

        console.log('[DEBUG] 歌曲数据:', song); // 调试歌曲数据结构
        const coverUrl = this.getImageUrl(song.union_cover, 'small');
        // 处理封面图片URL
        song.coverOriginal = song.union_cover;
        song.conver = coverUrl;
        if (coverUrl) {
            song.union_cover = coverUrl;
        }
        console.log('[DEBUG] 封面URL:', song.union_cover, '->', coverUrl); // 调试封面URL

        // 使用全局统一的歌曲信息格式化函数
        const formattedInfo = window.formatSongInfo ? window.formatSongInfo(song) : {
            songname: song.songname || song.title || song.name || song.filename || '未知歌曲',
            author_name: song.author_name || '未知艺术家'
        };

        card.innerHTML = `
            <div class="song-index">${index + 1}</div>
            <div class="song-cover">
                ${coverUrl ? `<img src="${coverUrl}" alt="${formattedInfo.songname}">` :
                  '<div class="cover-placeholder"><i class="fas fa-music"></i></div>'}
            </div>
            <div class="song-info">
                <div class="songname">${formattedInfo.songname}</div>
                <div class="author_name">${formattedInfo.author_name}</div>
            </div>
            <div class="song-actions">
                <button class="action-btn play-btn" title="播放">
                    <i class="fas fa-play"></i>
                </button>
                <button class="action-btn favorite-btn" title="收藏">
                    <i class="fas fa-heart"></i>
                </button>
            </div>
        `;

        // 播放按钮事件
        const playBtn = card.querySelector('.play-btn');
        if (playBtn) {
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('播放歌曲:', song);
                this.playSong(song);
            });
        }

        // 收藏按钮事件
        const favoriteBtn = card.querySelector('.favorite-btn');
        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await this.addToFavorites(song);
            });
        }

        return card;
    }



    // 创建艺人卡片
    createArtistCard(author_name) {
        const card = document.createElement('div');
        card.className = 'author_name-card';
        
        const avatarUrl = this.getImageUrl(author_name.avatar, 'small');
        
        card.innerHTML = `
            <div class="author_name-avatar">
                ${avatarUrl ? `<img src="${avatarUrl}" alt="${author_name.author_name}">` : 
                  '<div class="placeholder"><i class="fas fa-user"></i></div>'}
            </div>
            <div class="author_name-name">${author_name.author_name}</div>
            <div class="author_name-song-count">${author_name.song_count} 首歌曲</div>
        `;

        card.addEventListener('click', () => {
            this.viewArtist(author_name);
        });

        return card;
    }



    // 创建通用内容卡片
    createContentCard(item, type) {
        const card = document.createElement('div');
        card.className = 'content-card';

        let coverUrl, title, subtitle, meta, duration = '';

        switch (type) {
            case 'playlist':
                coverUrl = this.getImageUrl(item.img_url, 'medium');
                title = item.special_name;
                subtitle = item.author_name;
                meta = `${item.song_count} 首歌曲`;
                break;
            case 'album':
                coverUrl = this.getImageUrl(item.img_url, 'medium');
                title = item.album_name;
                subtitle = item.author_name;
                meta = `${item.song_count} 首歌曲`;
                break;
            case 'mv':
                coverUrl = this.getImageUrl(item.img_url, 'medium');
                title = item.mv_name;
                subtitle = item.author_name;
                duration = `<div class="mv-duration">${this.formatDuration(item.time_length)}</div>`;
                break;
        }

        card.innerHTML = `
            <div class="content-cover">
                ${coverUrl ?
                    `<img src="${coverUrl}" alt="${title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                     <div class="placeholder" style="display: none;">
                        <i class="fas fa-${type === 'mv' ? 'video' : type === 'album' ? 'compact-disc' : 'list-music'}"></i>
                     </div>` :
                    `<div class="placeholder">
                        <i class="fas fa-${type === 'mv' ? 'video' : type === 'album' ? 'compact-disc' : 'list-music'}"></i>
                     </div>`
                }
                ${duration}
            </div>
            <div class="content-info">
                <div class="content-title">${title}</div>
                <div class="content-subtitle">${subtitle}</div>
                ${meta ? `<div class="content-meta"><span>${meta}</span></div>` : ''}
            </div>
        `;

        card.addEventListener('click', () => {
            this.handleContentClick(item, type);
        });

        return card;
    }

    // 处理内容点击
    handleContentClick(item, type) {
        switch (type) {
            case 'playlist':
                this.viewPlaylist(item);
                break;
            case 'album':
                this.viewAlbum(item);
                break;
            case 'mv':
                this.playMV(item);
                break;
        }
    }

    // 播放歌曲
    async playSong(song) {
        console.log('播放歌曲:', song);

        // 使用统一的 PlayerController 播放歌曲
        if (window.PlayerController) {
            try {
                const success = await window.PlayerController.playSong(song);
                if (success) {
                    console.log('✅ 搜索页面歌曲播放成功');
                } else {
                    console.error('❌ 搜索页面歌曲播放失败');
                }
            } catch (error) {
                console.error('❌ 搜索页面歌曲播放失败:', error);
            }
        } else {
            console.error('❌ PlayerController不可用');
        }
    }

    // 查看艺人
    viewArtist(author_name) {
        console.log('查看艺人:', author_name);
        // 这里可以导航到艺人页面
    }

    // 查看歌单
    viewPlaylist(playlist) {
        console.log('🎵 搜索页面查看歌单:', playlist);

        if (!playlist || !playlist.special_id) {
            console.error('❌ 歌单数据无效或缺少special_id');
            return;
        }

        const playlistId = playlist.special_id;
        console.log('🎵 准备跳转到歌单详情，playlistId:', playlistId);

        // 检查全局对象
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

            // 延迟一下确保页面切换完成，然后加载歌单详情
            setTimeout(() => {
                if (window.AlbumDetailManager) {
                    console.log('🎵 调用AlbumDetailManager.showPlaylistDetail...');
                    window.AlbumDetailManager.showPlaylistDetail(playlistId);
                } else {
                    console.error('❌ AlbumDetailManager不可用');
                }
            }, 100);
        } else {
            console.error('❌ 导航函数或PAGE_STATES不可用');
        }
    }

    // 查看专辑
    viewAlbum(album) {
        console.log('🎵 搜索页面查看专辑:', album);

        if (!album || !album.album_id) {
            console.error('❌ 专辑数据无效或缺少album_id');
            return;
        }

        const albumId = album.album_id;
        console.log('🎵 准备跳转到专辑详情，albumId:', albumId);

        // 检查全局对象
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

            // 延迟一下确保页面切换完成，然后加载专辑详情
            setTimeout(() => {
                if (window.AlbumDetailManager) {
                    console.log('🎵 调用AlbumDetailManager.showAlbumDetail...');
                    window.AlbumDetailManager.showAlbumDetail(albumId);
                } else {
                    console.error('❌ AlbumDetailManager不可用');
                }
            }, 100);
        } else {
            console.error('❌ 导航函数或PAGE_STATES不可用');
        }
    }

    // 播放MV
    playMV(mv) {
        console.log('播放MV:', mv);
        // 这里可以调用MV播放功能
    }

    // 格式化时长
    formatDuration(seconds) {
        if (!seconds) return '00:00';

        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
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
            console.error('搜索页面添加收藏失败:', error);
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

    // 获取图片URL
    getImageUrl(url, size = 'medium') {
        if (!url) return null;

        // 根据尺寸调整图片大小
        const sizeMap = {
            small: '100',
            medium: '300',
            large: '500'
        };

        const targetSize = sizeMap[size] || sizeMap.medium;

        // 如果URL包含尺寸参数，替换它
        if (url.includes('{size}')) {
            return url.replace('{size}', targetSize);
        }

        // 如果是酷狗的图片URL，添加尺寸参数
        if (url.includes('kugou.com') || url.includes('kg.qq.com')) {
            const separator = url.includes('?') ? '&' : '?';
            return `${url}${separator}param=${targetSize}y${targetSize}`;
        }

        return url;
    }

    // 更新"查看更多"按钮
    updatePagination(sectionName) {
        const section = document.getElementById(`${sectionName}Section`);
        if (!section) return;

        const total = this.searchData[sectionName].total;
        const currentDataLength = this.searchData[sectionName].data.length;
        const hasMore = currentDataLength < total;

        // 查找或创建按钮容器
        let loadMoreContainer = section.querySelector('.load-more-container');
        if (!loadMoreContainer) {
            loadMoreContainer = document.createElement('div');
            loadMoreContainer.className = 'load-more-container';
            section.appendChild(loadMoreContainer);
        }

        // 如果没有更多数据，隐藏按钮
        if (!hasMore) {
            loadMoreContainer.style.display = 'none';
            return;
        }

        // 显示"查看更多"按钮
        loadMoreContainer.style.display = 'block';
        loadMoreContainer.innerHTML = this.generateLoadMoreHTML(sectionName, currentDataLength, total);


    }



    // 移除"查看更多"按钮
    removePagination(sectionName) {
        const section = document.getElementById(`${sectionName}Section`);
        if (!section) return;

        const loadMoreContainer = section.querySelector('.load-more-container');
        if (loadMoreContainer) {
            loadMoreContainer.remove();
        }
    }

    // 生成"查看更多"按钮HTML
    generateLoadMoreHTML(sectionName, currentDataLength, total) {
        return `
            <div class="load-more-row">
                <div class="load-more-info">
                    <span>已显示 ${currentDataLength} 项，共 ${total} 项</span>
                </div>
                <span class="load-more-link" onclick="searchPageManager.loadMoreData('${sectionName}')" title="加载更多数据">
                    + 查看更多
                </span>
            </div>
        `;
    }

    // 加载更多数据（追加模式）
    async loadMoreData(sectionName) {
        console.log(`[DEBUG] 加载更多数据: ${sectionName}`);

        if (this.searchData[sectionName].loading) {
            console.log(`[DEBUG] ${sectionName} 正在加载中，跳过请求`);
            return;
        }

        const currentPage = this.searchData[sectionName].page;
        const totalPages = Math.ceil(this.searchData[sectionName].total / this.pageSize);

        if (currentPage >= totalPages) {
            console.log(`[DEBUG] ${sectionName} 已加载完所有数据`);
            return;
        }

        const nextPage = currentPage + 1;
        console.log(`[DEBUG] ${sectionName} 加载第${nextPage}页数据`);

        // 显示加载状态
        this.showSectionLoading(sectionName);

        // 加载下一页数据（追加模式）
        await this.loadSectionData(sectionName, nextPage);
    }



    // 跳转到指定页
    async goToPage(sectionName, page) {
        console.log(`[DEBUG] 翻页: ${sectionName} -> 第${page}页`);

        if (this.searchData[sectionName].loading) {
            console.log(`[DEBUG] ${sectionName} 正在加载中，跳过翻页请求`);
            return;
        }

        const totalPages = Math.ceil(this.searchData[sectionName].total / this.pageSize);
        if (page < 1 || page > totalPages) {
            console.log(`[DEBUG] 页码超出范围: ${page}, 总页数: ${totalPages}`);
            return;
        }

        console.log(`[DEBUG] 重置 ${sectionName} 数据，跳转到第${page}页`);

        // 重置该栏目的数据
        this.searchData[sectionName].data = [];
        this.searchData[sectionName].page = page;

        // 显示加载状态
        this.showSectionLoading(sectionName);

        // 加载指定页的数据
        await this.loadSectionData(sectionName, page);

        console.log(`[DEBUG] 翻页完成: ${sectionName} 第${page}页，数据量: ${this.searchData[sectionName].data.length}`);
    }
}

// 全局搜索页面管理器实例
let searchPageManager = null;

// 初始化搜索页面
window.initSearchPage = () => {
    if (!searchPageManager) {
        searchPageManager = new SearchPageManager();
        // 将搜索页面管理器暴露到全局作用域，供翻页按钮使用
        window.searchPageManager = searchPageManager;
    }
};

// 全局搜索方法，供其他页面调用
window.performGlobalSearch = (keyword) => {
    if (!searchPageManager) {
        searchPageManager = new SearchPageManager();
        window.searchPageManager = searchPageManager;
    }
    searchPageManager.search(keyword);
};

// 执行搜索（供外部调用）
window.performSearchInPage = (keyword) => {
    if (searchPageManager) {
        searchPageManager.performSearch(keyword);
    }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 如果当前在搜索页面，初始化搜索功能
    if (document.getElementById('searchPage')) {
        window.initSearchPage();
    }
});
