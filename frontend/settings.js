// settings.js - 设置页面功能模块

// 导入设置服务
import * as SettingsService from './bindings/wmplayer/settingsservice.js';

// 设置数据存储
let settingsData = {
    // 播放设置
    playback: {
        autoPlay: true,
        crossfade: false,
        crossfadeDuration: 3,
        gaplessPlayback: true,
        replayGain: false,
        volume: 80
    },
    // 音质设置
    quality: {
        streamingQuality: 'high',
        downloadQuality: 'lossless',
        wifiOnly: false
    },
    // 界面设置
    interface: {
        theme: 'auto',
        language: 'zh-CN',
        showLyrics: true,
        showSpectrum: false,
        miniPlayer: false
    },
    // 下载设置
    download: {
        downloadPath: '',
        autoDownload: false,
        downloadLyrics: true,
        downloadCover: true
    },
    // 快捷键设置
    hotkeys: {
        playPause: 'Space',
        nextTrack: 'Ctrl+Right',
        prevTrack: 'Ctrl+Left',
        volumeUp: 'Ctrl+Up',
        volumeDown: 'Ctrl+Down',
        toggleLyrics: 'Ctrl+L'
    },
    // 隐私设置
    privacy: {
        saveHistory: true,
        shareListening: false,
        analytics: true
    },
    // 应用行为设置
    behavior: {
        closeAction: 'ask', // 'ask', 'minimize', 'exit'
        startMinimized: false,
        autoStart: false
    }
};

// 初始化设置页面
window.initSettingsPage = async () => {
    console.log('初始化设置页面');
    await loadSettings();
    applyAllSettings();
    renderSettingsPage();
    await loadSettingsPath();
};

// 加载设置文件路径
async function loadSettingsPath() {
    try {
        const response = await SettingsService.GetSettingsPath();
        if (response.Success && response.Data) {
            const pathElement = document.getElementById('settingsPath');
            if (pathElement) {
                pathElement.textContent = response.Data;
            }
        }
    } catch (error) {
        console.error('获取设置文件路径失败:', error);
        const pathElement = document.getElementById('settingsPath');
        if (pathElement) {
            pathElement.textContent = '获取路径失败';
        }
    }
}

// 加载设置数据
async function loadSettings() {
    try {
        const response = await SettingsService.LoadSettings();
        if (response.Success && response.Data) {
            settingsData = response.Data;
            console.log('设置加载成功:', response.Message);

            // 同步关闭行为设置到全局变量
            if (window.closeAction !== undefined) {
                window.closeAction = settingsData.behavior.closeAction;
            }
        } else {
            console.error('加载设置失败:', response.Message);
        }
    } catch (error) {
        console.error('加载设置失败:', error);
    }
}

// 应用所有设置
function applyAllSettings() {
    console.log('应用所有设置...');

    // 应用主题设置
    if (settingsData.interface.theme && settingsData.interface.theme !== 'auto') {
        document.documentElement.setAttribute('data-theme', settingsData.interface.theme);

        // 更新主题切换按钮图标
        const themeBtn = document.querySelector('.theme-toggle-btn i');
        if (themeBtn) {
            switch (settingsData.interface.theme) {
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
        console.log('主题设置已应用:', settingsData.interface.theme);
    }

    // 应用音量设置
    if (settingsData.playback.volume !== undefined) {
        if (window.PlayerController && window.PlayerController.setVolume) {
            window.PlayerController.setVolume(settingsData.playback.volume);
            console.log('音量设置已应用:', settingsData.playback.volume);
        }
    }

    // 应用关闭行为设置
    if (settingsData.behavior.closeAction) {
        window.closeAction = settingsData.behavior.closeAction;
        console.log('关闭行为设置已应用:', settingsData.behavior.closeAction);
    }

    console.log('所有设置应用完成');
}

// 全局函数：加载并应用设置（供其他模块使用）
window.loadAndApplySettings = async () => {
    await loadSettings();
    applyAllSettings();
};

// 保存设置数据
async function saveSettings() {
    try {
        const response = await SettingsService.SaveSettings(settingsData);
        if (response.success) {
            console.log('设置已保存:', response.message);

            // 更新前端全局设置缓存
            if (window.appSettings) {
                window.appSettings = { ...settingsData };
                console.log('前端设置缓存已更新:', window.appSettings);
            }

            // 如果有全局重新加载函数，也调用它确保同步
            if (window.reloadAppSettings) {
                await window.reloadAppSettings();
            }
        } else {
            console.error('保存设置失败:', response.message);
        }
    } catch (error) {
        console.error('保存设置失败:', error);
    }
}

// 渲染设置页面
function renderSettingsPage() {
    const container = document.querySelector('#settingsPage .settings-content');
    if (!container) return;

    container.innerHTML = `
        <!-- 播放设置 -->
        <div class="settings-group">
            <h3 class="settings-group-title">
                <i class="fas fa-play"></i>
                播放设置
            </h3>
            
            <div class="settings-item">
                <div class="settings-item-info">
                    <div class="settings-item-title">自动播放</div>
                    <div class="settings-item-description">启动时自动播放上次的音乐</div>
                </div>
                <div class="settings-item-control">
                    <label class="settings-switch">
                        <input type="checkbox" ${settingsData.playback.autoPlay ? 'checked' : ''} 
                               onchange="updateSetting('playback.autoPlay', this.checked)">
                        <span class="settings-switch-slider"></span>
                    </label>
                </div>
            </div>

            <div class="settings-item">
                <div class="settings-item-info">
                    <div class="settings-item-title">音量</div>
                    <div class="settings-item-description">默认播放音量</div>
                </div>
                <div class="settings-item-control">
                    <input type="range" class="settings-slider" min="0" max="100" 
                           value="${settingsData.playback.volume}"
                           onchange="updateSetting('playback.volume', parseInt(this.value))">
                    <span class="settings-value">${settingsData.playback.volume}%</span>
                </div>
            </div>

            <div class="settings-item">
                <div class="settings-item-info">
                    <div class="settings-item-title">无缝播放</div>
                    <div class="settings-item-description">歌曲间无停顿播放</div>
                </div>
                <div class="settings-item-control">
                    <label class="settings-switch">
                        <input type="checkbox" ${settingsData.playback.gaplessPlayback ? 'checked' : ''} 
                               onchange="updateSetting('playback.gaplessPlayback', this.checked)">
                        <span class="settings-switch-slider"></span>
                    </label>
                </div>
            </div>
        </div>

        <!-- 音质设置 -->
        <div class="settings-group">
            <h3 class="settings-group-title">
                <i class="fas fa-music"></i>
                音质设置
            </h3>
            
            <div class="settings-item">
                <div class="settings-item-info">
                    <div class="settings-item-title">流媒体音质</div>
                    <div class="settings-item-description">在线播放时的音质</div>
                </div>
                <div class="settings-item-control">
                    <select class="settings-select" onchange="updateSetting('quality.streamingQuality', this.value)">
                        <option value="low" ${settingsData.quality.streamingQuality === 'low' ? 'selected' : ''}>标准 (128kbps)</option>
                        <option value="medium" ${settingsData.quality.streamingQuality === 'medium' ? 'selected' : ''}>高品质 (320kbps)</option>
                        <option value="high" ${settingsData.quality.streamingQuality === 'high' ? 'selected' : ''}>超高品质 (FLAC)</option>
                    </select>
                </div>
            </div>

            <div class="settings-item">
                <div class="settings-item-info">
                    <div class="settings-item-title">仅WiFi高音质</div>
                    <div class="settings-item-description">移动网络时自动降低音质</div>
                </div>
                <div class="settings-item-control">
                    <label class="settings-switch">
                        <input type="checkbox" ${settingsData.quality.wifiOnly ? 'checked' : ''} 
                               onchange="updateSetting('quality.wifiOnly', this.checked)">
                        <span class="settings-switch-slider"></span>
                    </label>
                </div>
            </div>
        </div>

        <!-- 界面设置 -->
        <div class="settings-group">
            <h3 class="settings-group-title">
                <i class="fas fa-palette"></i>
                界面设置
            </h3>
            
            <div class="settings-item">
                <div class="settings-item-info">
                    <div class="settings-item-title">主题</div>
                    <div class="settings-item-description">选择应用主题</div>
                </div>
                <div class="settings-item-control">
                    <select class="settings-select" onchange="updateSetting('interface.theme', this.value)">
                        <option value="auto" ${settingsData.interface.theme === 'auto' ? 'selected' : ''}>跟随系统</option>
                        <option value="light" ${settingsData.interface.theme === 'light' ? 'selected' : ''}>浅色</option>
                        <option value="dark" ${settingsData.interface.theme === 'dark' ? 'selected' : ''}>深色</option>
                        <option value="frosted" ${settingsData.interface.theme === 'frosted' ? 'selected' : ''}>磨砂</option>
                        <option value="frosted-dark" ${settingsData.interface.theme === 'frosted-dark' ? 'selected' : ''}>磨砂黑</option>
                    </select>
                </div>
            </div>

            <div class="settings-item">
                <div class="settings-item-info">
                    <div class="settings-item-title">显示歌词</div>
                    <div class="settings-item-description">播放时自动显示歌词</div>
                </div>
                <div class="settings-item-control">
                    <label class="settings-switch">
                        <input type="checkbox" ${settingsData.interface.showLyrics ? 'checked' : ''} 
                               onchange="updateSetting('interface.showLyrics', this.checked)">
                        <span class="settings-switch-slider"></span>
                    </label>
                </div>
            </div>
        </div>

        <!-- 下载设置 -->
        <div class="settings-group">
            <h3 class="settings-group-title">
                <i class="fas fa-download"></i>
                下载设置
            </h3>
            
            <div class="settings-item">
                <div class="settings-item-info">
                    <div class="settings-item-title">下载路径</div>
                    <div class="settings-item-description">音乐文件保存位置</div>
                    ${settingsData.download.downloadPath ? `<div class="settings-path">${settingsData.download.downloadPath}</div>` : ''}
                </div>
                <div class="settings-item-control">
                    <button class="settings-button" onclick="selectDownloadPath()">选择文件夹</button>
                </div>
            </div>

            <div class="settings-item">
                <div class="settings-item-info">
                    <div class="settings-item-title">同时下载歌词</div>
                    <div class="settings-item-description">下载音乐时一并下载歌词文件</div>
                </div>
                <div class="settings-item-control">
                    <label class="settings-switch">
                        <input type="checkbox" ${settingsData.download.downloadLyrics ? 'checked' : ''} 
                               onchange="updateSetting('download.downloadLyrics', this.checked)">
                        <span class="settings-switch-slider"></span>
                    </label>
                </div>
            </div>
        </div>

        <!-- 应用行为设置 -->
        <div class="settings-group">
            <h3 class="settings-group-title">
                <i class="fas fa-cogs"></i>
                应用行为
            </h3>

            <div class="settings-item">
                <div class="settings-item-info">
                    <div class="settings-item-title">关闭按钮行为</div>
                    <div class="settings-item-description">点击关闭按钮时的默认行为</div>
                </div>
                <div class="settings-item-control">
                    <select class="settings-select" onchange="updateSetting('behavior.closeAction', this.value)">
                        <option value="ask" ${settingsData.behavior.closeAction === 'ask' ? 'selected' : ''}>每次询问</option>
                        <option value="minimize" ${settingsData.behavior.closeAction === 'minimize' ? 'selected' : ''}>最小化到托盘</option>
                        <option value="exit" ${settingsData.behavior.closeAction === 'exit' ? 'selected' : ''}>直接退出</option>
                    </select>
                </div>
            </div>

            <div class="settings-item">
                <div class="settings-item-info">
                    <div class="settings-item-title">启动时最小化</div>
                    <div class="settings-item-description">应用启动时直接最小化到托盘</div>
                </div>
                <div class="settings-item-control">
                    <label class="settings-switch">
                        <input type="checkbox" ${settingsData.behavior.startMinimized ? 'checked' : ''}
                               onchange="updateSetting('behavior.startMinimized', this.checked)">
                        <span class="settings-switch-slider"></span>
                    </label>
                </div>
            </div>
        </div>

        <!-- 关于设置 -->
        <div class="settings-group">
            <h3 class="settings-group-title">
                <i class="fas fa-info-circle"></i>
                关于设置
            </h3>

            <div class="settings-item">
                <div class="settings-item-info">
                    <div class="settings-item-title">设置文件位置</div>
                    <div class="settings-item-description">设置数据保存的文件路径</div>
                    <div class="settings-path" id="settingsPath">加载中...</div>
                </div>
                <div class="settings-item-control">
                    <button class="settings-button" onclick="showSettingsPath()">显示文件</button>
                </div>
            </div>

            <div class="settings-item">
                <div class="settings-item-info">
                    <div class="settings-item-title">导出设置</div>
                    <div class="settings-item-description">将当前设置导出为JSON文件</div>
                </div>
                <div class="settings-item-control">
                    <button class="settings-button" onclick="exportSettings()">导出</button>
                </div>
            </div>

            <div class="settings-item">
                <div class="settings-item-info">
                    <div class="settings-item-title">重置设置</div>
                    <div class="settings-item-description">恢复所有设置为默认值</div>
                </div>
                <div class="settings-item-control">
                    <button class="settings-button" onclick="resetSettings()">重置</button>
                </div>
            </div>
        </div>

        <!-- 隐私设置 -->
        <div class="settings-group">
            <h3 class="settings-group-title">
                <i class="fas fa-shield-alt"></i>
                隐私设置
            </h3>

            <div class="settings-item">
                <div class="settings-item-info">
                    <div class="settings-item-title">保存播放历史</div>
                    <div class="settings-item-description">记录您的播放历史</div>
                </div>
                <div class="settings-item-control">
                    <label class="settings-switch">
                        <input type="checkbox" ${settingsData.privacy.saveHistory ? 'checked' : ''}
                               onchange="updateSetting('privacy.saveHistory', this.checked)">
                        <span class="settings-switch-slider"></span>
                    </label>
                </div>
            </div>

            <div class="settings-item">
                <div class="settings-item-info">
                    <div class="settings-item-title">数据分析</div>
                    <div class="settings-item-description">帮助改善应用体验</div>
                </div>
                <div class="settings-item-control">
                    <label class="settings-switch">
                        <input type="checkbox" ${settingsData.privacy.analytics ? 'checked' : ''}
                               onchange="updateSetting('privacy.analytics', this.checked)">
                        <span class="settings-switch-slider"></span>
                    </label>
                </div>
            </div>
        </div>
    `;
}

// 更新设置项
window.updateSetting = async (path, value) => {
    const keys = path.split('.');
    let obj = settingsData;

    for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]];
    }

    obj[keys[keys.length - 1]] = value;
    await saveSettings();

    // 应用设置变更
    applySetting(path, value);

    console.log(`设置已更新: ${path} = ${value}`);
};

// 应用设置变更
function applySetting(path, value) {
    switch (path) {
        case 'interface.theme':
            if (value !== 'auto') {
                document.documentElement.setAttribute('data-theme', value);

                // 更新主题切换按钮图标
                const themeBtn = document.querySelector('.theme-toggle-btn i');
                if (themeBtn) {
                    switch (value) {
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
            }
            break;
        case 'playback.volume':
            // 更新音量显示
            const volumeDisplay = document.querySelector('.settings-value');
            if (volumeDisplay) {
                volumeDisplay.textContent = value + '%';
            }
            break;
        case 'behavior.closeAction':
            // 更新全局关闭行为设置
            if (window.closeAction !== undefined) {
                window.closeAction = value;
            }
            break;
    }
}

// 选择下载路径
window.selectDownloadPath = async () => {
    try {
        // 这里应该调用系统文件选择对话框
        // 暂时使用模拟路径
        const path = '/Users/username/Music/Downloads';
        updateSetting('download.downloadPath', path);
        renderSettingsPage(); // 重新渲染以显示路径
    } catch (error) {
        console.error('选择下载路径失败:', error);
    }
};

// 导出设置数据
window.exportSettings = () => {
    const dataStr = JSON.stringify(settingsData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'music-app-settings.json';
    link.click();
    
    URL.revokeObjectURL(url);
};

// 导入设置数据
window.importSettings = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            settingsData = { ...settingsData, ...imported };
            saveSettings();
            renderSettingsPage();
            console.log('设置导入成功');
        } catch (error) {
            console.error('设置导入失败:', error);
            alert('设置文件格式错误');
        }
    };
    reader.readAsText(file);
};

// 显示设置文件
window.showSettingsPath = async () => {
    try {
        const response = await SettingsService.GetSettingsPath();
        if (response.Success && response.Data) {
            // 在系统中显示文件（这里可以调用系统API打开文件管理器）
            alert(`设置文件位置：\n${response.Data}`);
        }
    } catch (error) {
        console.error('获取设置文件路径失败:', error);
        alert('获取设置文件路径失败');
    }
};

// 重置所有设置
window.resetSettings = async () => {
    if (confirm('确定要重置所有设置吗？此操作不可撤销。')) {
        try {
            // 加载默认设置并保存
            settingsData = {
                playback: {
                    autoPlay: true,
                    crossfade: false,
                    crossfadeDuration: 3,
                    gaplessPlayback: true,
                    replayGain: false,
                    volume: 80
                },
                quality: {
                    streamingQuality: 'high',
                    downloadQuality: 'lossless',
                    wifiOnly: false
                },
                interface: {
                    theme: 'auto',
                    language: 'zh-CN',
                    showLyrics: true,
                    showSpectrum: false,
                    miniPlayer: false
                },
                download: {
                    downloadPath: '',
                    autoDownload: false,
                    downloadLyrics: true,
                    downloadCover: true
                },
                hotkeys: {
                    playPause: 'Space',
                    nextTrack: 'Ctrl+Right',
                    prevTrack: 'Ctrl+Left',
                    volumeUp: 'Ctrl+Up',
                    volumeDown: 'Ctrl+Down',
                    toggleLyrics: 'Ctrl+L'
                },
                privacy: {
                    saveHistory: true,
                    shareListening: false,
                    analytics: true
                },
                behavior: {
                    closeAction: 'ask',
                    startMinimized: false,
                    autoStart: false
                }
            };

            await saveSettings();
            renderSettingsPage();
            alert('设置已重置为默认值');
        } catch (error) {
            console.error('重置设置失败:', error);
            alert('重置设置失败');
        }
    }
};
