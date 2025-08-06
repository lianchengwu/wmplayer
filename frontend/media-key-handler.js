/**
 * 媒体键处理模块
 * 监听键盘事件并执行相应的播放控制操作
 */

console.log('🎵 媒体键处理模块加载中...');

// 媒体键事件处理器
class MediaKeyHandler {
    constructor() {
        this.isInitialized = false;
        this.isEnabled = true;
        this.keyDownHandler = null;
        this.init();
    }

    // 初始化媒体键监听
    init() {
        if (this.isInitialized) {
            return;
        }

        console.log('🎵 初始化键盘媒体键监听器...');

        // 创建事件处理器引用，便于后续清理
        this.keyDownHandler = (event) => {
            this.handleKeyDown(event);
        };

        // 监听键盘事件
        document.addEventListener('keydown', this.keyDownHandler);

        // 监听媒体会话API（如果支持）
        this.initMediaSession();

        this.isInitialized = true;
        console.log('✅ 媒体键监听器初始化完成');
        console.log('📋 支持的快捷键:');
        console.log('   - Space: 播放/暂停');
        console.log('   - ← 方向键: 上一首');
        console.log('   - → 方向键: 下一首');
        console.log('   - ↑ 方向键: 音量+');
        console.log('   - ↓ 方向键: 音量-');
    }

    // 处理键盘按下事件
    handleKeyDown(event) {
        if (!this.isEnabled) return;

        // 检查是否在输入框中，如果是则不处理媒体键
        const activeElement = document.activeElement;
        if (activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.contentEditable === 'true'
        )) {
            return;
        }

        // 处理不同的按键
        switch (event.code) {
            case 'Space':
                event.preventDefault();
                console.log('🎵 键盘媒体键：播放/暂停 (Space)');
                this.handlePlayPause();
                break;

            case 'ArrowLeft':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    console.log('🎵 键盘媒体键：上一首 (Ctrl+←)');
                    this.handlePrevious();
                }
                break;

            case 'ArrowRight':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    console.log('🎵 键盘媒体键：下一首 (Ctrl+→)');
                    this.handleNext();
                }
                break;

            case 'ArrowUp':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    console.log('🎵 键盘媒体键：音量+ (Ctrl+↑)');
                    this.handleVolumeUp();
                }
                break;

            case 'ArrowDown':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    console.log('🎵 键盘媒体键：音量- (Ctrl+↓)');
                    this.handleVolumeDown();
                }
                break;

            // 支持F键媒体键
            case 'F7':
                event.preventDefault();
                console.log('🎵 键盘媒体键：上一首 (F7)');
                this.handlePrevious();
                break;

            case 'F8':
                event.preventDefault();
                console.log('🎵 键盘媒体键：播放/暂停 (F8)');
                this.handlePlayPause();
                break;

            case 'F9':
                event.preventDefault();
                console.log('🎵 键盘媒体键：下一首 (F9)');
                this.handleNext();
                break;
        }
    }

    // 初始化媒体会话API
    initMediaSession() {
        if ('mediaSession' in navigator) {
            console.log('🎵 初始化 Media Session API...');
            
            // 设置媒体会话动作处理器
            navigator.mediaSession.setActionHandler('play', () => {
                console.log('🎵 Media Session: 播放');
                this.handlePlay();
            });

            navigator.mediaSession.setActionHandler('pause', () => {
                console.log('🎵 Media Session: 暂停');
                this.handlePause();
            });

            navigator.mediaSession.setActionHandler('previoustrack', () => {
                console.log('🎵 Media Session: 上一首');
                this.handlePrevious();
            });

            navigator.mediaSession.setActionHandler('nexttrack', () => {
                console.log('🎵 Media Session: 下一首');
                this.handleNext();
            });

            navigator.mediaSession.setActionHandler('stop', () => {
                console.log('🎵 Media Session: 停止');
                this.handleStop();
            });

            console.log('✅ Media Session API 初始化完成');
        } else {
            console.log('⚠️ 浏览器不支持 Media Session API');
        }
    }

    // 处理播放/暂停
    handlePlayPause() {
        try {
            if (window.PlayerController) {
                const audioElement = document.querySelector('audio');
                if (audioElement) {
                    if (audioElement.paused) {
                        console.log('🎵 媒体键触发：开始播放');
                        window.PlayerController.play();
                    } else {
                        console.log('🎵 媒体键触发：暂停播放');
                        window.PlayerController.pause();
                    }
                } else {
                    console.log('🎵 媒体键触发：播放（无当前音频）');
                    window.PlayerController.play();
                }
            } else {
                console.warn('⚠️ PlayerController 不可用');
            }
        } catch (error) {
            console.error('❌ 媒体键播放/暂停处理失败:', error);
        }
    }

    // 处理播放
    handlePlay() {
        try {
            if (window.PlayerController) {
                console.log('🎵 媒体键触发：播放');
                window.PlayerController.play();
            } else {
                console.warn('⚠️ PlayerController 不可用');
            }
        } catch (error) {
            console.error('❌ 媒体键播放处理失败:', error);
        }
    }

    // 处理暂停
    handlePause() {
        try {
            if (window.PlayerController) {
                console.log('🎵 媒体键触发：暂停');
                window.PlayerController.pause();
            } else {
                console.warn('⚠️ PlayerController 不可用');
            }
        } catch (error) {
            console.error('❌ 媒体键暂停处理失败:', error);
        }
    }

    // 销毁媒体键处理器
    destroy() {
        console.log('🧹 销毁媒体键处理器');
        
        // 移除键盘事件监听器
        if (this.keyDownHandler) {
            document.removeEventListener('keydown', this.keyDownHandler);
            this.keyDownHandler = null;
        }
        
        // 清理媒体会话处理器
        if ('mediaSession' in navigator) {
            try {
                navigator.mediaSession.setActionHandler('play', null);
                navigator.mediaSession.setActionHandler('pause', null);
                navigator.mediaSession.setActionHandler('previoustrack', null);
                navigator.mediaSession.setActionHandler('nexttrack', null);
                navigator.mediaSession.setActionHandler('stop', null);
            } catch (error) {
                console.warn('清理媒体会话处理器时出错:', error);
            }
        }
        
        this.isInitialized = false;
        this.isEnabled = false;
        
        console.log('✅ 媒体键处理器已销毁');
    }
}

// 创建全局媒体键处理器实例
let globalMediaKeyHandler = null;

// 初始化媒体键处理器
function initMediaKeyHandler() {
    if (!globalMediaKeyHandler) {
        globalMediaKeyHandler = new MediaKeyHandler();
    }
}

// 销毁媒体键处理器
function destroyMediaKeyHandler() {
    if (globalMediaKeyHandler) {
        globalMediaKeyHandler.destroy();
        globalMediaKeyHandler = null;
    }
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', initMediaKeyHandler);

// 页面卸载时清理
window.addEventListener('beforeunload', destroyMediaKeyHandler);

console.log('✅ 媒体键处理模块加载完成');
            }
        } catch (error) {
            console.error('❌ 媒体键暂停处理失败:', error);
        }
    }

    // 处理下一首
    handleNext() {
        try {
            if (window.PlayerController && window.PlayerController.playNext) {
                console.log('🎵 媒体键触发：下一首');
                window.PlayerController.playNext();
            } else {
                console.warn('⚠️ PlayerController.playNext 不可用');
            }
        } catch (error) {
            console.error('❌ 媒体键下一首处理失败:', error);
        }
    }

    // 处理上一首
    handlePrevious() {
        try {
            if (window.PlayerController && window.PlayerController.playPrevious) {
                console.log('🎵 媒体键触发：上一首');
                window.PlayerController.playPrevious();
            } else {
                console.warn('⚠️ PlayerController.playPrevious 不可用');
            }
        } catch (error) {
            console.error('❌ 媒体键上一首处理失败:', error);
        }
    }

    // 处理停止
    handleStop() {
        try {
            if (window.PlayerController) {
                console.log('🎵 媒体键触发：停止播放');
                window.PlayerController.pause();
                
                // 重置播放进度到开始
                const audioElement = document.querySelector('audio');
                if (audioElement) {
                    audioElement.currentTime = 0;
                }
            } else {
                console.warn('⚠️ PlayerController 不可用');
            }
        } catch (error) {
            console.error('❌ 媒体键停止处理失败:', error);
        }
    }

    // 处理音量增加
    handleVolumeUp() {
        try {
            const audioElement = document.querySelector('audio');
            if (audioElement) {
                const newVolume = Math.min(1, audioElement.volume + 0.1);
                audioElement.volume = newVolume;
                console.log('🎵 媒体键触发：音量+', Math.round(newVolume * 100) + '%');
                
                // 更新UI中的音量显示
                this.updateVolumeDisplay(newVolume);
            }
        } catch (error) {
            console.error('❌ 媒体键音量+处理失败:', error);
        }
    }

    // 处理音量减少
    handleVolumeDown() {
        try {
            const audioElement = document.querySelector('audio');
            if (audioElement) {
                const newVolume = Math.max(0, audioElement.volume - 0.1);
                audioElement.volume = newVolume;
                console.log('🎵 媒体键触发：音量-', Math.round(newVolume * 100) + '%');
                
                // 更新UI中的音量显示
                this.updateVolumeDisplay(newVolume);
            }
        } catch (error) {
            console.error('❌ 媒体键音量-处理失败:', error);
        }
    }

    // 更新音量显示
    updateVolumeDisplay(volume) {
        try {
            // 更新音量滑块
            const volumeSlider = document.querySelector('.volume-slider input[type="range"]');
            if (volumeSlider) {
                volumeSlider.value = volume * 100;
            }

            // 更新音量图标
            const volumeIcon = document.querySelector('.volume-icon i');
            if (volumeIcon) {
                if (volume === 0) {
                    volumeIcon.className = 'fas fa-volume-mute';
                } else if (volume < 0.5) {
                    volumeIcon.className = 'fas fa-volume-down';
                } else {
                    volumeIcon.className = 'fas fa-volume-up';
                }
            }
        } catch (error) {
            console.error('❌ 更新音量显示失败:', error);
        }
    }

    // 启用/禁用媒体键
    setEnabled(enabled) {
        this.isEnabled = enabled;
        console.log('🎵 媒体键监听器:', enabled ? '已启用' : '已禁用');
    }

    // 更新媒体会话元数据
    updateMediaSessionMetadata(title, artist, album, artwork) {
        if ('mediaSession' in navigator) {
            try {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: title || '未知歌曲',
                    artist: artist || '未知艺术家',
                    album: album || '未知专辑',
                    artwork: artwork ? [{ src: artwork, sizes: '512x512', type: 'image/jpeg' }] : []
                });
                console.log('🎵 Media Session 元数据已更新:', title);
            } catch (error) {
                console.error('❌ 更新 Media Session 元数据失败:', error);
            }
        }
    }

    // 获取当前播放状态
    getPlaybackStatus() {
        const audioElement = document.querySelector('audio');
        return {
            isPlaying: audioElement && !audioElement.paused,
            currentTime: audioElement ? audioElement.currentTime : 0,
            duration: audioElement ? audioElement.duration : 0,
            hasAudio: !!audioElement
        };
    }
}

// 创建全局媒体键处理器实例
window.MediaKeyHandler = new MediaKeyHandler();

// 确保在页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.MediaKeyHandler.init();
    });
} else {
    window.MediaKeyHandler.init();
}

console.log('✅ 媒体键处理模块加载完成');

export default MediaKeyHandler;