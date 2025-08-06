
import {Window, Events} from "@wailsio/runtime";
import {initLoginModule} from "./login.js";
import {initHomePage} from "./homepage.js";
import * as SettingsService from "./bindings/wmplayer/settingsservice.js";

import {initLocalMusic} from "./local.js";
import "./playlists.js";
import "./album-detail.js";
 
// 移除了示例时间元素代码，因为页面中没有对应的元素

// 暴露 Wails Events 到全局作用域，供其他模块使用
window.Events = Events;
console.log('🎵 Wails Events 已暴露到全局作用域');

// 窗口控制功能
window.minimizeWindow = () => {
    Window.Minimise();
}

window.maximizeWindow = async () => {
    try {
        const isMaximised = await Window.IsMaximised();
        console.log('🪟 当前窗口状态:', isMaximised ? '已最大化' : '未最大化');

        if (isMaximised) {
            await Window.UnMaximise();
            console.log('🪟 执行还原操作');
        } else {
            await Window.Maximise();
            console.log('🪟 执行最大化操作');
        }

        // 多次检查状态变化，确保图标更新
        let attempts = 0;
        const maxAttempts = 5;
        const checkAndUpdate = async () => {
            attempts++;
            const newState = await Window.IsMaximised();
            console.log(`🪟 状态检查 ${attempts}/${maxAttempts}:`, newState ? '已最大化' : '未最大化');

            await window.updateMaximizeIcon();

            if (attempts < maxAttempts && newState === isMaximised) {
                // 状态还没有变化，继续检查
                setTimeout(checkAndUpdate, 50);
            }
        };

        setTimeout(checkAndUpdate, 50);
    } catch (error) {
        console.error('❌ 窗口操作失败:', error);
    }
}

// 全局设置变量
window.appSettings = null;

// 关闭窗口功能 - 根据设置决定行为
window.closeWindow = () => {
    // 检查是否已加载设置并有关闭行为配置
    if (window.appSettings && window.appSettings.behavior && window.appSettings.behavior.closeAction) {
        const closeAction = window.appSettings.behavior.closeAction;
        console.log('执行配置的关闭行为:', closeAction);

        if (closeAction === 'minimize') {
            minimizeToTray();
        } else if (closeAction === 'exit') {
            exitApplication();
        } else {
            // 如果是 'ask' 或其他值，显示选择对话框
            showCloseDialog();
        }
    } else {
        // 如果没有加载设置，显示选择对话框
        console.log('未找到关闭行为设置，显示选择对话框');
        showCloseDialog();
    }
}

// 显示关闭选择对话框
function showCloseDialog() {
    const modal = document.getElementById('closeConfirmModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

// 隐藏关闭选择对话框
function hideCloseDialog() {
    const modal = document.getElementById('closeConfirmModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// 最小化到托盘
function minimizeToTray() {
    Window.Hide();
}

// 直接退出应用
function exitApplication() {
    Window.Close();
}

// 加载应用设置到前端
async function loadAppSettings() {
    try {
        console.log('🔧 前端开始加载应用设置...');
        const response = await SettingsService.LoadSettings();
        console.log('🔧 前端收到设置响应:', response);

        // 检查响应结构 - 使用小写字段名（JSON格式）
        if (response && response.success && response.data) {
            window.appSettings = response.data;
            console.log('✅ 前端设置加载成功:', window.appSettings);

            // 应用设置到前端
            applySettingsToFrontend(window.appSettings);
        } else {
            console.error('❌ 前端加载设置失败:');
            console.error('   响应对象:', response);
            console.error('   success:', response?.success);
            console.error('   message:', response?.message);
            console.error('   data:', response?.data);
        }
    } catch (error) {
        console.error('❌ 前端加载设置异常:', error);
    }
}

// 将设置应用到前端
function applySettingsToFrontend(settings) {
    console.log('🎨 开始应用设置到前端...');

    // 应用主题设置
    if (settings.interface && settings.interface.theme && settings.interface.theme !== 'auto') {
        document.documentElement.setAttribute('data-theme', settings.interface.theme);
        console.log('🎨 主题设置已应用:', settings.interface.theme);
    }

    // 应用音量设置
    if (settings.playback && settings.playback.volume !== undefined) {
        // 延迟应用音量设置，等待播放器初始化
        setTimeout(() => {
            if (window.PlayerController && window.PlayerController.setVolume) {
                window.PlayerController.setVolume(settings.playback.volume);
                console.log('🔊 音量设置已应用:', settings.playback.volume);
            }
        }, 1000);
    }

    console.log('✅ 设置应用到前端完成');
}

// 重新加载前端设置缓存
window.reloadAppSettings = async function() {
    try {
        console.log('🔄 重新加载前端设置缓存...');
        const response = await SettingsService.LoadSettings();

        if (response && response.success && response.data) {
            window.appSettings = response.data;
            console.log('✅ 前端设置缓存已重新加载:', window.appSettings);

            // 重新应用设置到前端
            applySettingsToFrontend(window.appSettings);

            return true;
        } else {
            console.error('❌ 重新加载设置失败:', response?.message);
            return false;
        }
    } catch (error) {
        console.error('❌ 重新加载设置异常:', error);
        return false;
    }
}



// 导航历史管理
let navigationHistory = ['home']; // 导航历史记录
let currentHistoryIndex = 0; // 当前位置索引

// 定时器管理
const managedTimers = new Set();
const managedIntervals = new Set();

// 管理定时器的辅助函数
function addManagedTimer(callback, delay) {
    const timerId = setTimeout(() => {
        managedTimers.delete(timerId);
        callback();
    }, delay);
    managedTimers.add(timerId);
    return timerId;
}

function addManagedInterval(callback, interval) {
    const intervalId = setInterval(callback, interval);
    managedIntervals.add(intervalId);
    return intervalId;
}

// 清理所有定时器
function cleanupTimers() {
    managedTimers.forEach(id => clearTimeout(id));
    managedIntervals.forEach(id => clearInterval(id));
    managedTimers.clear();
    managedIntervals.clear();
    console.log('✅ 所有定时器已清理');
}

// 页面状态定义
const PAGE_STATES = {
    HOME: 'home',
    SEARCH: 'search',
    DISCOVER: 'discover',
    HISTORY: 'history',
    LOCAL: 'local',
    DOWNLOADS: 'downloads',
    FAVORITES: 'favorites',
    PLAYLISTS: 'playlists',
    SETTINGS: 'settings',
    ALBUM_DETAIL: 'album-detail'
};

// 将PAGE_STATES暴露到全局作用域
window.PAGE_STATES = PAGE_STATES;

// 导航到指定页面
window.navigateToPage = (pageState, addToHistory = true) => {
    console.log('🧭 导航到页面:', pageState, '添加到历史:', addToHistory);

    // 如果正在离开播放历史页面，取消渲染
    if (window.historyPageManager && pageState !== PAGE_STATES.HISTORY) {
        window.historyPageManager.cancelRendering();
    }

    if (addToHistory) {
        // 如果不在历史记录末尾，删除后面的记录
        if (currentHistoryIndex < navigationHistory.length - 1) {
            navigationHistory = navigationHistory.slice(0, currentHistoryIndex + 1);
        }

        // 添加新页面到历史记录
        navigationHistory.push(pageState);
        currentHistoryIndex = navigationHistory.length - 1;
        console.log('📚 导航历史更新:', navigationHistory);
    }

    try {
        // 更新页面内容
        console.log('🔄 更新页面内容...');
        updatePageContent(pageState);

        // 更新导航按钮状态
        console.log('🔄 更新导航按钮状态...');
        updateNavigationButtons();

        console.log('✅ 页面导航完成');
    } catch (error) {
        console.error('❌ 页面导航失败:', error);
    }
}

// 更新页面内容
function updatePageContent(pageState) {
    // 移除所有侧栏项的活动状态
    document.querySelectorAll('.list-item').forEach(item => {
        item.classList.remove('active');
    });

    // 根据页面状态激活对应的侧栏项和显示内容
    switch (pageState) {
        case PAGE_STATES.HOME:
            activateSidebarItem('首页');
            showMainContent(pageState);
            break;
        case PAGE_STATES.SEARCH:
            activateSidebarItem('搜索');
            showMainContent(pageState);
            break;
        case PAGE_STATES.DISCOVER:
            activateSidebarItem('发现音乐');
            showMainContent(pageState);
            break;
        case PAGE_STATES.HISTORY:
            activateSidebarItem('播放历史');
            showMainContent(pageState);
            break;
        case PAGE_STATES.LOCAL:
            activateSidebarItem('本地音乐');
            showMainContent(pageState);
            break;
        case PAGE_STATES.DOWNLOADS:
            activateSidebarItem('下载管理');
            showMainContent(pageState);
            // 加载下载记录
            if (window.DownloadManager) {
                window.DownloadManager.loadDownloadRecords();
            }
            break;
        case PAGE_STATES.FAVORITES:
            activateSidebarItem('我喜欢的');
            showMainContent(pageState);
            break;
        case PAGE_STATES.PLAYLISTS:
            activateSidebarItem('收藏的歌单');
            showMainContent(pageState);
            break;
        case PAGE_STATES.SETTINGS:
            // 设置页面不需要激活侧栏项，因为它是通过标题栏按钮访问的
            showMainContent(pageState);
            break;
        case PAGE_STATES.ALBUM_DETAIL:
            activateSidebarItem('碟片');
            showMainContent(pageState);
            break;
        default:
            showMainContent(pageState);
    }
}

// 激活侧栏项
function activateSidebarItem(itemText) {
    // 先移除所有项的active类
    document.querySelectorAll('.list-item').forEach(item => {
        item.classList.remove('active');
    });

    // 然后激活指定项
    document.querySelectorAll('.list-item').forEach(item => {
        const text = item.querySelector('.item-text')?.textContent;
        if (text === itemText) {
            item.classList.add('active');
        }
    });
}

// 显示主要内容
function showMainContent(pageState) {
    // 隐藏所有页面
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.remove('active');
    });

    // 显示对应的页面
    const pageMap = {
        [PAGE_STATES.HOME]: 'homePage',
        [PAGE_STATES.SEARCH]: 'searchPage',
        [PAGE_STATES.DISCOVER]: 'discoverPage',
        [PAGE_STATES.HISTORY]: 'historyPage',
        [PAGE_STATES.LOCAL]: 'localPage',
        [PAGE_STATES.DOWNLOADS]: 'downloadsPage',
        [PAGE_STATES.FAVORITES]: 'favoritesPage',
        [PAGE_STATES.PLAYLISTS]: 'playlistsPage',
        [PAGE_STATES.SETTINGS]: 'settingsPage',
        [PAGE_STATES.ALBUM_DETAIL]: 'albumDetailPage'
    };

    const targetPageId = pageMap[pageState];
    if (targetPageId) {
        const targetPage = document.getElementById(targetPageId);
        if (targetPage) {
            targetPage.classList.add('active');
            console.log(`显示页面: ${getPageDisplayName(pageState)}`);

            // 如果是搜索页面，初始化搜索功能
            if (pageState === PAGE_STATES.SEARCH && window.initSearchPage) {
                window.initSearchPage();
            }

            // 如果是发现页面，初始化发现页面功能
            if (pageState === PAGE_STATES.DISCOVER && window.initDiscoverPage) {
                window.initDiscoverPage();
            }

            // 如果是播放历史页面，初始化播放历史功能
            if (pageState === PAGE_STATES.HISTORY && window.initHistoryPage) {
                window.initHistoryPage();
            }

            // 如果是我喜欢的页面，初始化我喜欢的页面功能
            if (pageState === PAGE_STATES.FAVORITES && window.initFavoritesPage) {
                window.initFavoritesPage();
            }

            // 如果是收藏的歌单页面，初始化收藏的歌单页面功能
            if (pageState === PAGE_STATES.PLAYLISTS && window.initPlaylistsPage) {
                window.initPlaylistsPage();
            }

            // 如果是设置页面，初始化设置页面功能
            if (pageState === PAGE_STATES.SETTINGS && window.initSettingsPage) {
                window.initSettingsPage();
            }

            // 如果是专辑详情页面，确保AlbumDetailManager已初始化
            if (pageState === PAGE_STATES.ALBUM_DETAIL && window.AlbumDetailManager) {
                console.log('🎵 碟片详情页面已激活，当前专辑ID:', window.AlbumDetailManager.currentAlbumId, '当前歌单ID:', window.AlbumDetailManager.currentPlaylistId);

                // 检查是否是通过侧栏导航直接进入的（没有专辑ID和歌单ID的情况）
                // 如果是从发现页面或歌单页面跳转过来的，相应的ID应该已经被设置了
                if (!window.AlbumDetailManager.currentAlbumId && !window.AlbumDetailManager.currentPlaylistId) {
                    console.log('🎵 没有专辑ID，显示默认状态');
                    window.AlbumDetailManager.showDefaultState();
                } else {
                    console.log('🎵 有专辑ID，专辑详情应该正在加载或已加载');
                }
            }
        }
    }
}

// 将showMainContent函数暴露到全局作用域
window.showMainContent = showMainContent;

// 导航功能
window.goBack = () => {
    if (currentHistoryIndex > 0) {
        currentHistoryIndex--;
        const previousPage = navigationHistory[currentHistoryIndex];
        window.navigateToPage(previousPage, false); // 不添加到历史记录
        console.log('后退到:', previousPage);
    }
}

window.goForward = () => {
    if (currentHistoryIndex < navigationHistory.length - 1) {
        currentHistoryIndex++;
        const nextPage = navigationHistory[currentHistoryIndex];
        window.navigateToPage(nextPage, false); // 不添加到历史记录
        console.log('前进到:', nextPage);
    }
}

window.goHome = () => {
    window.navigateToPage(PAGE_STATES.HOME);
    console.log('回到主页');
}

// 获取当前页面状态
function getCurrentPage() {
    return navigationHistory[currentHistoryIndex] || PAGE_STATES.HOME;
}

window.refreshPage = () => {
    const currentPage = getCurrentPage();
    console.log('刷新当前页面:', currentPage);

    // 根据当前页面类型执行相应的刷新操作
    switch (currentPage) {
        case PAGE_STATES.HOME:
            // 刷新首页内容
            console.log('刷新首页内容');
            if (window.refreshHomePage) {
                window.refreshHomePage();
            }
            break;
        case PAGE_STATES.SEARCH:
            // 重新执行搜索
            const searchInput = document.querySelector('.search-input');
            if (searchInput && searchInput.value.trim() && window.performGlobalSearch) {
                window.performGlobalSearch(searchInput.value);
            }
            break;
        case PAGE_STATES.DISCOVER:
            // 刷新发现音乐页面
            console.log('刷新发现音乐页面');
            if (window.refreshDiscoverPage) {
                window.refreshDiscoverPage();
            }
            break;
        case PAGE_STATES.HISTORY:
            // 刷新播放历史
            console.log('刷新播放历史');
            if (window.initHistoryPage) {
                window.initHistoryPage();
            }
            break;
        case PAGE_STATES.LOCAL:
            // 刷新本地音乐
            console.log('刷新本地音乐');
            if (window.refreshLocalPage) {
                window.refreshLocalPage();
            }
            break;
        case PAGE_STATES.DOWNLOADS:
            // 刷新下载管理
            console.log('刷新下载管理');
            if (window.DownloadManager) {
                window.DownloadManager.loadDownloadRecords();
            }
            break;
        case PAGE_STATES.FAVORITES:
            // 刷新我喜欢的音乐
            console.log('刷新我喜欢的音乐');
            if (window.refreshFavoritesPage) {
                window.refreshFavoritesPage();
            }
            break;
        case PAGE_STATES.PLAYLISTS:
            // 刷新收藏的歌单
            console.log('刷新收藏的歌单');
            if (window.refreshPlaylistsPage) {
                window.refreshPlaylistsPage();
            }
            break;
        default:
            console.log('刷新页面:', currentPage);
            // 通用刷新逻辑
            window.navigateToPage(currentPage, false);
            break;
    }
}

// 更新导航按钮状态
function updateNavigationButtons() {
    const backBtn = document.querySelector('.back-btn');
    const forwardBtn = document.querySelector('.forward-btn');

    if (backBtn) {
        if (currentHistoryIndex > 0) {
            backBtn.disabled = false;
            backBtn.classList.remove('disabled');
            backBtn.title = `后退到: ${getPageDisplayName(navigationHistory[currentHistoryIndex - 1])}`;
        } else {
            backBtn.disabled = true;
            backBtn.classList.add('disabled');
            backBtn.title = '无法后退';
        }
    }

    if (forwardBtn) {
        if (currentHistoryIndex < navigationHistory.length - 1) {
            forwardBtn.disabled = false;
            forwardBtn.classList.remove('disabled');
            forwardBtn.title = `前进到: ${getPageDisplayName(navigationHistory[currentHistoryIndex + 1])}`;
        } else {
            forwardBtn.disabled = true;
            forwardBtn.classList.add('disabled');
            forwardBtn.title = '无法前进';
        }
    }

    console.log('导航状态更新:', {
        current: navigationHistory[currentHistoryIndex],
        canGoBack: currentHistoryIndex > 0,
        canGoForward: currentHistoryIndex < navigationHistory.length - 1,
        history: navigationHistory
    });
}

// 获取页面显示名称
function getPageDisplayName(pageState) {
    const displayNames = {
        [PAGE_STATES.HOME]: '主页',
        [PAGE_STATES.SEARCH]: '搜索',
        [PAGE_STATES.DISCOVER]: '发现',
        [PAGE_STATES.HISTORY]: '播放历史',
        [PAGE_STATES.LOCAL]: '本地音乐',
        [PAGE_STATES.DOWNLOADS]: '下载',
        [PAGE_STATES.FAVORITES]: '我喜欢',
        [PAGE_STATES.PLAYLISTS]: '歌单',
        [PAGE_STATES.SETTINGS]: '设置',
        [PAGE_STATES.ALBUM_DETAIL]: '碟片'
    };
    return displayNames[pageState] || pageState;
}

// 搜索功能
window.performSearch = (query) => {
    const trimmedQuery = query?.trim();
    if (trimmedQuery) {
        console.log('搜索:', trimmedQuery);
        // 导航到搜索页面
        window.navigateToPage(PAGE_STATES.SEARCH);

        // 初始化搜索页面（如果还没有初始化）
        if (window.initSearchPage) {
            window.initSearchPage();
        }

        // 执行搜索
        if (window.performGlobalSearch) {
            window.performGlobalSearch(trimmedQuery);
        }
    }
}

// 用户头像功能将在login.js中处理

// 登录弹窗相关功能已移动到login.js

// 验证码和手机号验证功能已移动到login.js

// 手机号登录功能已移动到login.js

// 登录成功处理、二维码等功能已移动到login.js

// 主题切换功能 - 支持四个主题循环切换
window.toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    let newTheme;

    // 四个主题循环切换：light -> dark -> frosted -> frosted-dark -> light
    switch (currentTheme) {
        case 'light':
            newTheme = 'dark';
            break;
        case 'dark':
            newTheme = 'frosted';
            break;
        case 'frosted':
            newTheme = 'frosted-dark';
            break;
        case 'frosted-dark':
            newTheme = 'light';
            break;
        default:
            newTheme = 'light';
    }

    document.documentElement.setAttribute('data-theme', newTheme);

    // 更新主题切换按钮图标
    const themeBtn = document.querySelector('.theme-toggle-btn i');
    if (themeBtn) {
        switch (newTheme) {
            case 'light':
                themeBtn.className = 'fas fa-moon';
                break;
            case 'dark':
                themeBtn.className = 'fas fa-sun';
                break;
            case 'frosted':
                themeBtn.className = 'fas fa-snowflake';
                break;
            case 'frosted-dark':
                themeBtn.className = 'fas fa-gem';
                break;
        }
    }

    console.log('切换主题到:', newTheme);
}

// 选项功能
window.showOptions = () => {
    console.log('显示设置页面');
    // 导航到设置页面
    window.navigateToPage('settings');
    // 初始化设置页面
    if (window.initSettingsPage) {
        window.initSettingsPage();
    }
}

// 播放器功能现在完全由 PlayerController 处理，移除重复的函数定义


// updateSongInfo 函数现在由 HTML5 播放器统一提供，不在此重复定义

// 注意：这个函数已被 HTML5 音频集成替代，已移除以避免冲突
// 进度条更新现在完全由 html5-audio-player-unified.js 处理

window.formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

window.setVolume = (value) => {
    // 音量值现在由 HTML5 Audio API 管理，这里只更新UI
    const volumeBtn = document.querySelector('.volume-btn i');
    if (volumeBtn) {
        if (value === 0) {
            volumeBtn.className = 'fas fa-volume-mute';
        } else if (value < 50) {
            volumeBtn.className = 'fas fa-volume-down';
        } else {
            volumeBtn.className = 'fas fa-volume-up';
        }
    }
    console.log('音量设置为:', value);
}

// 左侧栏功能
window.toggleSidebar = () => {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebarToggle');

    if (sidebar && toggleBtn) {
        sidebar.classList.toggle('expanded');
        const isExpanded = sidebar.classList.contains('expanded');

        // 更新按钮图标
        const icon = toggleBtn.querySelector('i');
        if (icon) {
            icon.className = isExpanded ? 'fas fa-chevron-left' : 'fas fa-chevron-right';
        }

        console.log('侧栏状态:', isExpanded ? '展开' : '收起');
    }
}



// 侧栏点击事件处理函数
function handleSidebarClick(event) {
    console.log('🖱️ 侧栏点击事件触发', event.target);

    // 找到被点击的 list-item
    const listItem = event.target.closest('.list-item');
    if (!listItem) {
        console.log('ℹ️ 点击的不是 list-item，忽略');
        return; // 如果不是点击的 list-item，忽略
    }

    event.preventDefault();
    event.stopPropagation();

    const section = listItem.querySelector('.item-text')?.textContent || '';
    if (section) {
        console.log('✅ 侧边栏点击:', section);
        try {
            window.navigateToSection(section, listItem);
        } catch (error) {
            console.error('❌ 导航失败:', error);
        }
    } else {
        console.warn('⚠️ 未找到导航文本');
    }
}

// 侧栏导航功能
window.navigateToSection = (section, clickedElement) => {
    console.log('🧭 开始导航到:', section);

    // 将中文名称映射到页面状态
    const sectionToPageState = {
        '首页': PAGE_STATES.HOME,
        '搜索': PAGE_STATES.SEARCH,
        '发现音乐': PAGE_STATES.DISCOVER,
        '碟片': PAGE_STATES.ALBUM_DETAIL,
        '播放历史': PAGE_STATES.HISTORY,
        '本地音乐': PAGE_STATES.LOCAL,
        '下载管理': PAGE_STATES.DOWNLOADS,
        '我喜欢的': PAGE_STATES.FAVORITES,
        '收藏的歌单': PAGE_STATES.PLAYLISTS
    };

    const pageState = sectionToPageState[section];
    if (pageState) {
        console.log('✅ 映射到页面状态:', pageState);
        try {
            // 如果是通过侧栏导航到碟片页面，清理当前专辑ID和歌单ID
            if (pageState === PAGE_STATES.ALBUM_DETAIL && window.AlbumDetailManager) {
                console.log('🎵 通过侧栏导航到碟片页面，清理当前专辑ID和歌单ID');
                window.AlbumDetailManager.currentAlbumId = null;
                window.AlbumDetailManager.currentPlaylistId = null;
                window.AlbumDetailManager.currentType = 'album';
            }

            window.navigateToPage(pageState);
            console.log('✅ 导航成功完成');
        } catch (error) {
            console.error('❌ 导航过程中出错:', error);
        }
    } else {
        console.warn('⚠️ 未知页面:', section, '可用的页面:', Object.keys(sectionToPageState));
    }
}

// 初始化最大化按钮图标状态
window.updateMaximizeIcon = async () => {
    try {
        const isMaximised = await Window.IsMaximised();
        const maximizeBtn = document.querySelector('.maximize-btn i');

        if (maximizeBtn) {
            if (isMaximised) {
                maximizeBtn.className = 'fas fa-compress';
                maximizeBtn.title = '还原';
                console.log('🪟 图标更新: 显示还原图标 (compress)');
            } else {
                maximizeBtn.className = 'fas fa-expand';
                maximizeBtn.title = '最大化';
                console.log('🪟 图标更新: 显示最大化图标 (expand)');
            }
        } else {
            console.warn('⚠️ 未找到最大化按钮图标元素');
        }
    } catch (error) {
        console.error('❌ 更新最大化图标失败:', error);
    }
}

// 设置窗口状态变化监听器
window.setupWindowStateListeners = () => {
    // 监听窗口大小变化事件
    window.addEventListener('resize', async () => {
        // 延迟更新图标，确保状态已经变化
        setTimeout(async () => {
            await window.updateMaximizeIcon();
        }, 100);
    });

    // 监听双击标题栏事件（可能触发最大化/还原）
    const titlebar = document.querySelector('.custom-titlebar');
    if (titlebar) {
        titlebar.addEventListener('dblclick', async () => {
            setTimeout(async () => {
                await window.updateMaximizeIcon();
            }, 150);
        });
    }
}



// 存储事件监听器引用，用于清理
const eventListeners = new Map();

// 添加事件监听器的辅助函数
function addManagedEventListener(element, event, handler, options) {
    if (!element) return;
    
    element.addEventListener(event, handler, options);
    
    if (!eventListeners.has(element)) {
        eventListeners.set(element, []);
    }
    eventListeners.get(element).push({ event, handler, options });
}

// 清理所有事件监听器
function cleanupEventListeners() {
    eventListeners.forEach((listeners, element) => {
        listeners.forEach(({ event, handler }) => {
            try {
                element.removeEventListener(event, handler);
            } catch (error) {
                console.warn('清理事件监听器时出错:', error);
            }
        });
    });
    eventListeners.clear();
    console.log('✅ 所有事件监听器已清理');
}

// 全局资源清理函数
function cleanupAllResources() {
    console.log('🧹 开始清理所有前端资源...');
    
    // 清理事件监听器
    cleanupEventListeners();
    
    // 清理定时器
    cleanupTimers();
    
    // 清理全局资源管理器
    if (window.GlobalResourceManager) {
        window.GlobalResourceManager.cleanup();
    }
    
    // 清理内存监控器
    if (window.MemoryMonitor) {
        window.MemoryMonitor.stopMonitoring();
    }
    
    console.log('✅ 所有前端资源清理完成');
}

// 页面卸载时清理资源
window.addEventListener('beforeunload', cleanupAllResources);

// 当页面加载完成后，为标题栏按钮添加事件监听器
document.addEventListener('DOMContentLoaded', async () => {
    // 首先加载应用设置
    await loadAppSettings();

    // 窗口控制按钮
    const minimizeBtn = document.querySelector('.minimize-btn');
    const maximizeBtn = document.querySelector('.maximize-btn');
    const closeBtn = document.querySelector('.close-btn');

    if (minimizeBtn) {
        addManagedEventListener(minimizeBtn, 'click', window.minimizeWindow);
    }

    if (maximizeBtn) {
        addManagedEventListener(maximizeBtn, 'click', window.maximizeWindow);
    }

    if (closeBtn) {
        addManagedEventListener(closeBtn, 'click', window.closeWindow);
    }

    // 导航按钮
    const backBtn = document.querySelector('.back-btn');
    const forwardBtn = document.querySelector('.forward-btn');
    const homeBtn = document.querySelector('.home-btn');
    const refreshBtn = document.querySelector('.refresh-btn');

    if (backBtn) {
        backBtn.addEventListener('click', window.goBack);
    }

    if (forwardBtn) {
        forwardBtn.addEventListener('click', window.goForward);
    }

    if (homeBtn) {
        homeBtn.addEventListener('click', window.goHome);
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', window.refreshPage);
    }

    // 搜索功能
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                window.performSearch(e.target.value);
            }
        });

        // 当搜索框获得焦点时，也导航到搜索页面
        searchInput.addEventListener('focus', () => {
            window.navigateToPage(PAGE_STATES.SEARCH);
        });
    }

    // 用户控制按钮
    const themeToggleBtn = document.querySelector('.theme-toggle-btn');
    const optionsBtn = document.querySelector('.options-btn');

    // 用户头像按钮事件在login.js中处理

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', window.toggleTheme);
    }

    if (optionsBtn) {
        optionsBtn.addEventListener('click', window.showOptions);
    }



    // 初始化最大化按钮图标
    await window.updateMaximizeIcon();

    // 设置窗口状态监听器
    window.setupWindowStateListeners();

    // 播放器控制按钮事件绑定已移动到 homepage.js 的 initPlayerBarEvents() 函数中
    // 避免重复绑定导致的冲突

    // 进度条点击事件已在 homepage.js 中处理，这里注释掉避免冲突
    // if (progressBar) {
    //     progressBar.addEventListener('click', (e) => {
    //         const rect = progressBar.getBoundingClientRect();
    //         const clickX = e.clientX - rect.left;
    //         const percentage = clickX / rect.width;
    //         const newTime = percentage * duration;
    //         window.updateProgress(newTime, duration);
    //         console.log('跳转到:', window.formatTime(newTime));
    //     });
    // }

    // 初始化播放器状态 - 现在由 HTML5 Audio API 管理
    // window.updateProgress(0, 0); // 注释掉，避免与 HTML5 音频集成冲突
    window.setVolume(50);

    // 左侧栏功能
    const sidebarToggle = document.getElementById('sidebarToggle');

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', window.toggleSidebar);
    }

    // 为侧栏导航项添加点击事件 - 使用事件委托避免重复绑定
    const sidebarElement = document.getElementById('sidebar');
    if (sidebarElement) {
        // 检查是否已经绑定过事件监听器
        if (!sidebarElement.hasAttribute('data-sidebar-events-bound')) {
            // 添加事件监听器
            sidebarElement.addEventListener('click', handleSidebarClick);
            // 标记已绑定事件
            sidebarElement.setAttribute('data-sidebar-events-bound', 'true');
            console.log('✅ 侧栏事件监听器已绑定');
        } else {
            console.log('ℹ️ 侧栏事件监听器已存在，跳过重复绑定');
        }
    }



    // 初始化导航状态
    updateNavigationButtons();

    // 设置初始页面为主页
    window.navigateToPage(PAGE_STATES.HOME, false);

    // 初始化登录模块
    initLoginModule();

    // 初始化侧栏状态（默认展开）
    const sidebarToggleIcon = document.querySelector('#sidebarToggle i');
    if (sidebarElement && sidebarToggleIcon) {
        // 默认展开状态，添加expanded类并显示左箭头
        sidebarElement.classList.add('expanded');
        sidebarToggleIcon.className = 'fas fa-chevron-left';
    }

    // 初始化主题（默认浅色主题）
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    // 确保主题属性被正确设置到DOM上
    document.documentElement.setAttribute('data-theme', currentTheme);

    const themeBtn = document.querySelector('.theme-toggle-btn i');
    if (themeBtn) {
        switch (currentTheme) {
            case 'light':
                themeBtn.className = 'fas fa-moon';
                break;
            case 'dark':
                themeBtn.className = 'fas fa-sun';
                break;
            case 'frosted':
                themeBtn.className = 'fas fa-snowflake';
                break;
            case 'frosted-dark':
                themeBtn.className = 'fas fa-gem';
                break;
            default:
                themeBtn.className = 'fas fa-moon';
        }
    }

    // 右侧栏功能初始化
    const lyricsBtn = document.querySelector('.lyrics-btn');
    const playlistBtn = document.querySelector('.playlist-btn');
    const immersiveBtn = document.querySelector('.immersive-btn');
    const rightSidebarClose = document.querySelector('.right-sidebar-close');

    console.log('Right sidebar initialization:');
    console.log('lyricsBtn found:', !!lyricsBtn);
    console.log('playlistBtn found:', !!playlistBtn);
    console.log('immersiveBtn found:', !!immersiveBtn);
    console.log('rightSidebarClose found:', !!rightSidebarClose);

    if (lyricsBtn) {
        lyricsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Lyrics button clicked!');
            window.toggleRightSidebar('lyrics');
        });
    } else {
        console.error('Lyrics button not found! Check CSS selector: .lyrics-btn');
    }

    if (playlistBtn) {
        playlistBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Playlist button clicked!');
            window.toggleRightSidebar('playlist');
        });
    } else {
        console.error('Playlist button not found! Check CSS selector: .playlist-btn');
    }

    if (immersiveBtn) {
        immersiveBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Immersive player button clicked!');
            if (window.ImmersivePlayer) {
                window.ImmersivePlayer.enter();
            } else {
                console.error('ImmersivePlayer not available');
            }
        });
    } else {
        console.error('Immersive button not found! Check CSS selector: .immersive-btn');
    }

    if (rightSidebarClose) {
        rightSidebarClose.addEventListener('click', window.closeRightSidebar);
    }

    // 为标签按钮添加事件监听器
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            window.switchTab(tab);
        });
    });
});

// 右侧栏功能
let currentRightSidebarTab = 'playlist';

window.toggleRightSidebar = (tab) => {
    console.log('toggleRightSidebar called with tab:', tab);
    const rightSidebar = document.getElementById('rightSidebar');
    const contentArea = document.querySelector('.content-area');

    console.log('rightSidebar element:', rightSidebar);
    console.log('contentArea element:', contentArea);

    if (!rightSidebar || !contentArea) {
        console.error('Required elements not found');
        return;
    }

    const isOpen = rightSidebar.classList.contains('open');
    console.log('isOpen:', isOpen, 'currentTab:', currentRightSidebarTab);

    if (isOpen && currentRightSidebarTab === tab) {
        // 如果当前标签页已经打开，则关闭右侧栏
        console.log('Closing right sidebar');
        window.closeRightSidebar();
    } else {
        // 打开右侧栏并切换到指定标签页
        console.log('Opening right sidebar');
        rightSidebar.classList.add('open');
        contentArea.classList.add('with-right-sidebar');
        window.switchTab(tab);
    }
}

window.closeRightSidebar = () => {
    console.log('closeRightSidebar called');
    const rightSidebar = document.getElementById('rightSidebar');
    const contentArea = document.querySelector('.content-area');

    if (rightSidebar) {
        rightSidebar.classList.remove('open');
    }
    if (contentArea) {
        contentArea.classList.remove('with-right-sidebar');
    }
}

window.switchTab = (tab) => {
    console.log('switchTab called with tab:', tab);
    currentRightSidebarTab = tab;

    // 更新标签按钮状态
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tab) {
            btn.classList.add('active');
        }
    });

    // 更新标签内容显示
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    const targetTab = tab === 'playlist' ? 'playlistTab' : 'lyricsTab';
    const targetElement = document.getElementById(targetTab);
    console.log('targetTab:', targetTab, 'targetElement:', targetElement);
    if (targetElement) {
        targetElement.classList.add('active');
    }
}

// 登录弹窗事件已移动到login.js，首页功能已移动到homepage.js
// 在页面加载完成后初始化首页功能
document.addEventListener('DOMContentLoaded', () => {
    initHomePage();
    initLocalMusic();

    // 初始化专辑详情管理器
    if (window.AlbumDetailManager) {
        window.AlbumDetailManager.init();
    }

    // 设置关闭对话框的事件处理
    setupCloseDialogEvents();
});

// 设置关闭对话框的事件处理
function setupCloseDialogEvents() {
    const closeConfirmBtn = document.getElementById('closeConfirmBtn');
    const closeCancelBtn = document.getElementById('closeCancelBtn');
    const closeModalOverlay = document.getElementById('closeModalOverlay');

    if (closeConfirmBtn) {
        closeConfirmBtn.addEventListener('click', () => {
            const selectedAction = document.querySelector('input[name="closeAction"]:checked')?.value;
            const rememberChoice = document.getElementById('rememberChoice')?.checked;

            // 如果用户选择记住选择，保存设置
            if (rememberChoice && selectedAction) {
                saveCloseActionSetting(selectedAction);
            }

            hideCloseDialog();

            // 执行选择的操作
            if (selectedAction === 'minimize') {
                minimizeToTray();
            } else {
                exitApplication();
            }
        });
    }

    if (closeCancelBtn) {
        closeCancelBtn.addEventListener('click', hideCloseDialog);
    }

    if (closeModalOverlay) {
        closeModalOverlay.addEventListener('click', hideCloseDialog);
    }
}

// 保存关闭行为设置
async function saveCloseActionSetting(action) {
    try {
        if (window.appSettings) {
            // 更新本地设置
            window.appSettings.behavior.closeAction = action;

            // 保存到后端
            const response = await SettingsService.SaveSettings(window.appSettings);
            if (response.success) {
                console.log('关闭行为设置已保存:', action);
                console.log('前端设置缓存已同步更新');
            } else {
                console.error('保存关闭行为设置失败:', response.message);
            }
        }
    } catch (error) {
        console.error('保存关闭行为设置异常:', error);
    }
}
