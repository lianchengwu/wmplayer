// 沉浸式播放页面功能模块

class ImmersivePlayer {
    constructor() {
        this.isActive = false;
        this.container = null;
        this.background = null;
        this.coverElement = null;
        this.songNameElement = null;
        this.authorElement = null;
        this.albumElement = null;
        this.lyricsDisplay = null;
        this.controls = null;
        this.currentActiveLyricsIndex = -1; // 添加歌词高亮索引跟踪
        this.timeUpdateInterval = null; // 时间更新定时器
        this.isFullscreen = false; // 全屏状态
        this.clockInterval = null; // 数字时钟更新定时器

        // 控制元素
        this.playPauseBtn = null;
        this.prevBtn = null;
        this.nextBtn = null;
        this.shuffleBtn = null;
        this.repeatBtn = null;
        this.favoriteBtn = null;
        this.volumeBtn = null;
        this.volumeSlider = null;
        this.progressBar = null;
        this.progressFill = null;
        this.currentTimeElement = null;
        this.totalTimeElement = null;

        // 垂直音量控制元素
        this.volumeControl = null;
        this.volumeIcon = null;

        // 数字时钟元素
        this.clockTimeElement = null;

        this.init();
    }
    
    init() {
        this.container = document.getElementById('immersivePlayer');
        if (!this.container) {
            console.error('沉浸式播放器容器未找到');
            return;
        }
        
        this.initElements();
        this.bindEvents();
        this.setupKeyboardShortcuts();
        this.setupFullscreenListeners();

        console.log('🎵 沉浸式播放器初始化完成');
    }
    
    initElements() {
        // 获取主要元素
        this.background = this.container.querySelector('.immersive-background');
        this.coverElement = this.container.querySelector('.immersive-cover');
        this.songNameElement = this.container.querySelector('.immersive-songname');
        this.authorElement = this.container.querySelector('.immersive-author');
        this.albumElement = this.container.querySelector('.immersive-album');
        this.lyricsDisplay = this.container.querySelector('.immersive-lyrics-display');
        this.controls = this.container.querySelector('.immersive-controls');
        
        // 获取控制元素
        this.playPauseBtn = this.container.querySelector('.play-pause-btn');
        this.prevBtn = this.container.querySelector('.prev-btn');
        this.nextBtn = this.container.querySelector('.next-btn');
        this.favoriteBtn = this.container.querySelector('.favorite-btn');
        this.progressBar = this.container.querySelector('.immersive-progress-bar');
        this.progressFill = this.container.querySelector('.immersive-progress-fill');
        this.currentTimeElement = this.container.querySelector('.immersive-time-current');
        this.totalTimeElement = this.container.querySelector('.immersive-time-total');

        // 获取歌词显示元素（现在直接使用主页面的歌词组件）
        this.lyricsDisplay = this.container.querySelector('.lyrics-display');

        // 获取数字时钟元素
        this.clockTimeElement = this.container.querySelector('.clock-time');
        
        // 获取底部时间显示元素
        this.datetimeElement = this.container.querySelector('.datetime-text');

        // 获取垂直音量控制元素
        this.volumeControl = this.container.querySelector('.immersive-volume-control');
        this.volumeSlider = this.container.querySelector('.volume-slider.vertical');
        this.volumeIcon = this.container.querySelector('.immersive-volume-control .volume-icon i');
    }
    
    bindEvents() {
        // 全屏按钮
        const fullscreenBtn = this.container.querySelector('.immersive-fullscreen-btn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }

        // 退出按钮
        const exitBtn = this.container.querySelector('.immersive-exit-btn');
        if (exitBtn) {
            exitBtn.addEventListener('click', () => this.exit());
        }

        // 鼠标移动检测，用于控制UI显示
        this.setupMouseActivityDetection();
        
        // 播放控制按钮事件
        if (this.playPauseBtn) {
            this.playPauseBtn.addEventListener('click', () => {
                if (window.PlayerController) {
                    window.PlayerController.togglePlayPause();
                }
            });
        }
        
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', () => {
                if (window.PlayerController) {
                    window.PlayerController.playPrevious();
                }
            });
        }
        
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => {
                if (window.PlayerController) {
                    window.PlayerController.playNext();
                }
            });
        }
        
        if (this.favoriteBtn) {
            this.favoriteBtn.addEventListener('click', () => {
                this.toggleFavorite();
            });
        }

        // 垂直音量控制事件
        this.bindVolumeEvents();

        // 进度条控制
        if (this.progressBar) {
            this.progressBar.addEventListener('click', (e) => {
                const rect = this.progressBar.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                
                if (window.audioPlayer && window.audioPlayer()) {
                    const player = window.audioPlayer();
                    if (player.audio && player.audio.duration) {
                        const newTime = percent * player.audio.duration;
                        player.audio.currentTime = newTime;
                    }
                }
            });
        }
        
        // 歌词点击跳转
        if (this.lyricsDisplay) {
            this.lyricsDisplay.addEventListener('click', (e) => {
                const lyricsLine = e.target.closest('.lyrics-line');
                if (lyricsLine && lyricsLine.dataset.time) {
                    const time = parseFloat(lyricsLine.dataset.time);
                    if (window.audioPlayer && window.audioPlayer()) {
                        const player = window.audioPlayer();
                        if (player.audio) {
                            player.audio.currentTime = time;

                            // 添加点击反馈效果
                            lyricsLine.style.transform = 'scale(1.05)';
                            lyricsLine.style.color = '#ffffff';
                            setTimeout(() => {
                                lyricsLine.style.transform = '';
                                lyricsLine.style.color = '';
                            }, 200);
                        }
                    }
                }
            });
        }
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (!this.isActive) return;
            
            switch (e.code) {
                case 'Escape':
                    e.preventDefault();
                    this.exit();
                    break;
                case 'Space':
                    e.preventDefault();
                    if (window.PlayerController) {
                        window.PlayerController.togglePlayPause();
                    }
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    if (window.PlayerController) {
                        window.PlayerController.playPrevious();
                    }
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    if (window.PlayerController) {
                        window.PlayerController.playNext();
                    }
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.adjustVolume(0.1);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.adjustVolume(-0.1);
                    break;
                case 'F11':
                    e.preventDefault();
                    this.toggleFullscreen();
                    break;
            }
        });
    }
    
    enter() {
        if (this.isActive) return;

        // 预加载和预处理
        this.preloadResources();

        this.isActive = true;
        this.container.style.display = 'flex';

        // 强制重排后添加active类以触发动画
        requestAnimationFrame(() => {
            this.container.classList.add('active');

            // 同步当前播放状态
            this.syncWithPlayer();

            // 初始化音量显示
            this.initVolumeDisplay();

            // 设置统一控制器事件监听
            this.setupUnifiedControllerListeners();

            // 同步歌词内容
            this.syncLyrics();

            // 启动时间更新监听器
            this.startTimeUpdateListener();

            // 启动数字时钟
            this.startDigitalClock();

            // 启动底部时间显示
            this.startDateTimeDisplay();
        });
    }

    preloadResources() {
        // 预加载当前歌曲封面，避免进入后再加载导致卡顿
        if (window.PlayerController) {
            const currentSong = window.PlayerController.getCurrentSong();
            if (currentSong && currentSong.union_cover) {
                const img = new Image();
                img.src = currentSong.union_cover.replace('{size}', '500');
            }
        }
    }

    exit() {
        if (!this.isActive) return;

        this.isActive = false;

        // 停止时间更新监听器
        this.stopTimeUpdateListener();

        // 停止数字时钟
        this.stopDigitalClock();
        
        // 停止底部日期时间显示
        this.stopDateTimeDisplay();

        // 使用RAF确保动画流畅
        requestAnimationFrame(() => {
            this.container.classList.remove('active');

            // 等待动画完成后隐藏
            setTimeout(() => {
                if (!this.isActive) {
                    this.container.style.display = 'none';
                }
            }, 400); // 略小于CSS过渡时间
        });
    }
    
    syncWithPlayer() {
        // 同步歌曲信息
        const currentSong = window.PlayerController ? window.PlayerController.getCurrentSong() : null;
        if (currentSong) {
            this.updateSongInfo(currentSong);
        }
        
        // 同步播放状态
        this.updatePlayState();
        
        // 同步音量
        this.syncVolume();

        // 同步歌词
        this.syncLyrics();
    }

    // 同步音量状态
    syncVolume() {
        if (window.audioPlayer && window.audioPlayer()) {
            const player = window.audioPlayer();
            if (player.volume !== undefined) {
                const volume = Math.round(player.volume * 100);
                this.updateVolumeDisplay(volume);
            }
        }
    }

    // 绑定音量控制事件
    bindVolumeEvents() {
        if (!this.volumeSlider) return;

        // 音量滑块事件
        this.volumeSlider.addEventListener('input', (e) => {
            const volume = parseInt(e.target.value);
            this.setVolume(volume);
        });

        // 音量图标点击事件（静音/取消静音）
        if (this.volumeIcon) {
            this.volumeIcon.addEventListener('click', () => {
                this.toggleMute();
            });
        }

        // 鼠标滚轮控制音量
        if (this.volumeControl) {
            this.volumeControl.addEventListener('wheel', (e) => {
                e.preventDefault();
                const currentVolume = parseInt(this.volumeSlider.value);
                const delta = e.deltaY > 0 ? -5 : 5;
                const newVolume = Math.max(0, Math.min(100, currentVolume + delta));
                this.setVolume(newVolume);
            });
        }
    }

    // 设置音量 - 使用统一控制器
    setVolume(volume) {
        volume = Math.max(0, Math.min(100, volume));

        if (window.UnifiedPlayerController) {
            window.UnifiedPlayerController.setVolume(volume);
        } else {
            // 降级处理
            if (window.audioPlayer && window.audioPlayer()) {
                const player = window.audioPlayer();
                if (player.setVolume) {
                    player.setVolume(volume / 100);
                } else if (player.audio) {
                    player.audio.volume = volume / 100;
                }
            }
            // 手动更新显示
            this.updateVolumeDisplay(volume);
        }
    }

    // 更新音量显示
    updateVolumeDisplay(volume) {
        if (this.volumeSlider) {
            this.volumeSlider.value = volume;
        }

        // 更新音量图标
        if (this.volumeIcon) {
            if (volume === 0) {
                this.volumeIcon.className = 'fas fa-volume-mute';
            } else if (volume < 30) {
                this.volumeIcon.className = 'fas fa-volume-down';
            } else {
                this.volumeIcon.className = 'fas fa-volume-up';
            }
        }
    }

    // 切换静音状态 - 使用统一控制器
    toggleMute() {
        if (window.UnifiedPlayerController) {
            window.UnifiedPlayerController.toggleMute();
        } else {
            // 降级处理
            if (!this.volumeSlider) return;

            const currentVolume = parseInt(this.volumeSlider.value);

            if (currentVolume === 0) {
                const lastVolume = this.lastVolume || 50;
                this.setVolume(lastVolume);
            } else {
                this.lastVolume = currentVolume;
                this.setVolume(0);
            }
        }
    }

    // 初始化音量显示
    initVolumeDisplay() {
        // 获取当前播放器音量
        let currentVolume = 50; // 默认音量

        if (window.UnifiedPlayerController) {
            currentVolume = window.UnifiedPlayerController.getVolume();
        } else if (window.audioPlayer && window.audioPlayer()) {
            const player = window.audioPlayer();
            if (player.volume !== undefined) {
                currentVolume = Math.round(player.volume * 100);
            } else if (player.audio && player.audio.volume !== undefined) {
                currentVolume = Math.round(player.audio.volume * 100);
            }
        }

        // 更新显示
        this.updateVolumeDisplay(currentVolume);

        console.log('🎵 沉浸式播放器音量初始化:', currentVolume + '%');
    }

    // 设置统一控制器事件监听
    setupUnifiedControllerListeners() {
        if (!window.UnifiedPlayerController) {
            console.warn('⚠️ 统一播放器控制器未加载，沉浸式播放器跳过事件监听设置');
            return;
        }

        // 监听音量变化
        window.UnifiedPlayerController.on('volumeChanged', (data) => {
            console.log('🔊 沉浸式播放器收到音量变化事件:', data.volume + '%');
            this.updateVolumeDisplay(data.volume);
        });

        // 监听静音状态变化
        window.UnifiedPlayerController.on('muteStateChanged', (isMuted) => {
            console.log('🔇 沉浸式播放器收到静音状态变化:', isMuted ? '静音' : '取消静音');
            const volume = isMuted ? 0 : window.UnifiedPlayerController.getVolume();
            this.updateVolumeDisplay(volume);
        });

        // 监听播放状态变化
        window.UnifiedPlayerController.on('playStateChanged', (isPlaying) => {
            console.log('▶️ 沉浸式播放器收到播放状态变化:', isPlaying ? '播放' : '暂停');
            // 更新播放按钮状态（如果有的话）
            this.updatePlayButtonState(isPlaying);
        });

        // 监听歌曲变化
        window.UnifiedPlayerController.on('songChanged', (data) => {
            console.log('🎵 沉浸式播放器收到歌曲变化事件:', data.currentSong?.title || data.currentSong?.songname);
            if (data.currentSong) {
                this.updateSongInfo(data.currentSong);
            }
        });

        console.log('✅ 沉浸式播放器统一控制器事件监听已设置');
    }

    // 更新播放按钮状态
    updatePlayButtonState(isPlaying) {
        // 这里可以添加播放按钮状态更新逻辑
        // 目前沉浸式播放器可能没有播放按钮，所以暂时留空
        console.log('🎵 沉浸式播放器播放状态更新:', isPlaying ? '播放中' : '已暂停');
    }
    
    updateSongInfo(song) {
        if (!song) return;

        // 使用全局统一的歌曲信息格式化函数
        const formattedInfo = window.formatSongInfo ? window.formatSongInfo(song) : {
            songname: song.songname || song.title || song.name || song.filename || '未知歌曲',
            author_name: song.author_name || '未知艺术家',
            album_name: song.album_name || '未知专辑'
        };

        // 更新歌曲名称
        if (this.songNameElement) {
            this.songNameElement.textContent = formattedInfo.songname;
            console.log('🎵 沉浸式播放器歌名更新:', formattedInfo.songname);
        }

        // 更新艺术家
        if (this.authorElement) {
            this.authorElement.textContent = formattedInfo.author_name;
        }

        // 更新专辑
        if (this.albumElement) {
            this.albumElement.textContent = formattedInfo.album_name;
        }

        // 更新封面
        this.updateCover(song.union_cover);

        // 更新背景
        this.updateBackground(song.union_cover);
    }
    
    updateCover(coverUrl) {
        if (!this.coverElement) return;
        
        if (coverUrl) {
            const coverImageUrl = window.getCoverImageUrl ? window.getCoverImageUrl(coverUrl, 400) : coverUrl;
            
            let imgEl = this.coverElement.querySelector('img');
            if (!imgEl) {
                imgEl = document.createElement('img');
                imgEl.alt = '歌曲封面';
                this.coverElement.innerHTML = '';
                this.coverElement.appendChild(imgEl);
            }
            
            imgEl.src = coverImageUrl;
            imgEl.onerror = () => {
                this.coverElement.innerHTML = `
                    <div class="cover-placeholder">
                        <i class="fas fa-music"></i>
                    </div>
                `;
            };
        } else {
            this.coverElement.innerHTML = `
                <div class="cover-placeholder">
                    <i class="fas fa-music"></i>
                </div>
            `;
        }
    }
    
    updateBackground(coverUrl) {
        if (!this.background || !coverUrl) return;
        
        const backgroundImageUrl = window.getCoverImageUrl ? window.getCoverImageUrl(coverUrl, 800) : coverUrl;
        this.background.style.backgroundImage = `url(${backgroundImageUrl})`;
    }
    
    updatePlayState() {
        if (!this.playPauseBtn) return;

        const isPlaying = window.audioPlayer && window.audioPlayer() && window.audioPlayer().isPlaying && window.audioPlayer().isPlaying();
        const icon = this.playPauseBtn.querySelector('i');

        if (icon) {
            icon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
        }

        // 更新容器的播放状态类
        if (isPlaying) {
            this.container.classList.add('playing');
        } else {
            this.container.classList.remove('playing');
        }
    }
    
    updateProgress(currentTime, duration) {
        // 更新进度条（只在百分比有明显变化时更新）
        if (this.progressFill && duration > 0) {
            const percent = Math.round((currentTime / duration) * 100 * 10) / 10; // 保留1位小数
            if (Math.abs(percent - this.lastProgressPercent) > 0.1) {
                this.progressFill.style.width = `${percent}%`;
                this.lastProgressPercent = percent;
            }
        }

        // 更新时间显示（只在秒数变化时更新）
        const currentSeconds = Math.floor(currentTime);
        const durationSeconds = Math.floor(duration);

        if (currentSeconds !== this.lastCurrentSeconds) {
            if (this.currentTimeElement) {
                this.currentTimeElement.textContent = this.formatTime(currentTime);
            }
            this.lastCurrentSeconds = currentSeconds;
        }

        if (durationSeconds !== this.lastDurationSeconds) {
            if (this.totalTimeElement) {
                this.totalTimeElement.textContent = this.formatTime(duration);
            }
            this.lastDurationSeconds = durationSeconds;
        }
    }
    
    syncLyrics() {
        if (!this.lyricsDisplay) {
            console.log('🎵 沉浸式播放器：lyricsDisplay 不存在');
            return;
        }

        // 从主页面的歌词显示组件复制内容 - 使用正确的选择器
        const mainLyricsDisplay = document.querySelector('#lyricsTab .lyrics-display');
        console.log('🎵 查找主页面歌词组件:', !!mainLyricsDisplay);

        if (mainLyricsDisplay) {
            console.log('🎵 主页面歌词内容:', mainLyricsDisplay.innerHTML);

            // 检查是否有实际的歌词内容（不只是"聆听音乐"）
            const hasRealLyrics = mainLyricsDisplay.innerHTML.includes('lyrics-line') &&
                                 !mainLyricsDisplay.innerHTML.includes('聆听音乐');

            if (hasRealLyrics || mainLyricsDisplay.innerHTML.trim()) {
                // 直接复制主页面的歌词内容
                this.lyricsDisplay.innerHTML = mainLyricsDisplay.innerHTML;
                console.log('🎵 沉浸式播放器歌词已同步，内容长度:', mainLyricsDisplay.innerHTML.length);

                // 同步后立即同步高亮状态
                setTimeout(() => {
                    this.syncLyricsHighlight();
                }, 100);
            } else {
                // 如果主页面也是"聆听音乐"，保持同步
                this.lyricsDisplay.innerHTML = mainLyricsDisplay.innerHTML;
                console.log('🎵 沉浸式播放器：同步了"聆听音乐"状态');
            }
        } else {
            // 如果找不到主页面歌词组件，显示默认内容
            this.lyricsDisplay.innerHTML = '<div class="lyrics-line">聆听音乐</div>';
            console.log('🎵 沉浸式播放器：未找到主页面歌词组件');
        }
    }
    
    // 移除歌词高亮逻辑，因为现在直接使用主页面的歌词组件
    // 主页面的歌词高亮会自动更新，沉浸式播放器无需额外处理

    scrollToActiveLyric(activeLine = null) {
        if (!this.lyricsDisplay) return;

        // 如果没有传入activeLine，则查找当前高亮的歌词行
        if (!activeLine) {
            activeLine = this.lyricsDisplay.querySelector('.lyrics-line.active');
        }

        if (!activeLine) return;

        // 防抖处理，避免频繁滚动导致卡顿
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
        }

        this.scrollTimeout = setTimeout(() => {
            console.log(`🎵 沉浸式播放器滚动到活跃歌词`);

            // 使用原生滚动，借鉴主页面的scrollToActiveLyrics方法
            const containerRect = this.lyricsDisplay.getBoundingClientRect();
            const lineRect = activeLine.getBoundingClientRect();

            // 计算当前行相对于容器的位置
            const lineRelativeTop = lineRect.top - containerRect.top + this.lyricsDisplay.scrollTop;
            const containerHeight = this.lyricsDisplay.clientHeight;
            const lineHeight = lineRect.height;

            // 计算目标滚动位置（让当前行显示在容器中央）
            const targetScrollTop = lineRelativeTop - (containerHeight * 0.5) + (lineHeight / 2);

            // 检查是否需要滚动（避免不必要的滚动）
            const currentScrollTop = this.lyricsDisplay.scrollTop;
            const scrollDifference = Math.abs(targetScrollTop - currentScrollTop);

            // 只有当滚动距离超过阈值时才进行滚动
            if (scrollDifference > 30) { // 降低阈值，提高响应性
                // 使用自定义平滑滚动，避免浏览器原生smooth滚动的性能问题
                this.smoothScrollTo(Math.max(0, targetScrollTop));
            }
        }, 50); // 50ms防抖，提高滚动响应速度
    }

    // 优化的平滑滚动方法，更流畅的60fps动画
    smoothScrollTo(targetScrollTop) {
        if (!this.lyricsDisplay) return;

        // 如果已经有滚动动画在进行，取消它
        if (this.scrollAnimationId) {
            cancelAnimationFrame(this.scrollAnimationId);
        }

        const startScrollTop = this.lyricsDisplay.scrollTop;
        const distance = targetScrollTop - startScrollTop;

        // 根据距离调整动画时间，短距离用更短时间
        const duration = Math.min(400, Math.max(200, Math.abs(distance) * 0.5));
        let startTime = null;

        const animateScroll = (currentTime) => {
            if (startTime === null) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);

            // 使用更平滑的easeOutQuart缓动函数
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            this.lyricsDisplay.scrollTop = startScrollTop + distance * easeOutQuart;

            if (progress < 1) {
                this.scrollAnimationId = requestAnimationFrame(animateScroll);
            } else {
                this.scrollAnimationId = null;
            }
        };

        this.scrollAnimationId = requestAnimationFrame(animateScroll);
    }

    syncLyricsHighlight() {
        if (!this.lyricsDisplay) return;

        // 防抖处理，避免频繁同步导致卡顿
        if (this.syncHighlightTimeout) {
            clearTimeout(this.syncHighlightTimeout);
        }

        this.syncHighlightTimeout = setTimeout(() => {
            // 获取主页面的歌词显示组件
            const mainLyricsDisplay = document.querySelector('#lyricsTab .lyrics-display');
            if (!mainLyricsDisplay) return;

            // 获取主页面和沉浸式播放器的所有歌词行
            const mainLyricsLines = mainLyricsDisplay.querySelectorAll('.lyrics-line');
            const immersiveLyricsLines = this.lyricsDisplay.querySelectorAll('.lyrics-line');

            // 确保两边的歌词行数量一致
            if (mainLyricsLines.length !== immersiveLyricsLines.length) {
                console.log('🎵 歌词行数不一致，重新同步歌词内容');
                this.syncLyrics();
                return;
            }

            // 同步高亮状态 - 包括行级和字级高亮
            let activeIndex = -1;
            let hasChanges = false;

            mainLyricsLines.forEach((mainLine, index) => {
                const immersiveLine = immersiveLyricsLines[index];
                if (immersiveLine) {
                    const shouldBeActive = mainLine.classList.contains('active');
                    const isCurrentlyActive = immersiveLine.classList.contains('active');

                    if (shouldBeActive !== isCurrentlyActive) {
                        hasChanges = true;
                        if (shouldBeActive) {
                            immersiveLine.classList.add('active');
                            activeIndex = index;
                            // 移除频繁的日志输出
                        } else {
                            immersiveLine.classList.remove('active');
                            // 移除所有高亮相关的类
                            immersiveLine.classList.remove('jelly-active', 'current-playing');
                        }
                    } else if (shouldBeActive) {
                        activeIndex = index;
                    }

                    // 同步KRC格式的逐字高亮和当前行样式
                    this.syncWordHighlight(mainLine, immersiveLine);
                }
            });

            // 果冻效果已移除，不再触发动画

            // 只有当高亮状态发生变化时才滚动，避免不必要的滚动
            if (hasChanges && activeIndex >= 0) {
                const activeLine = immersiveLyricsLines[activeIndex];
                if (activeLine) {
                    console.log(`🎵 高亮变化，滚动到第${activeIndex}行`);
                    this.scrollToActiveLyric(activeLine);
                }
            }
        }, 16); // 16ms防抖，约60fps的响应速度
    }

    // 同步渐进式高亮（KRC格式）- 高亮当前字符之前的所有字符
    syncWordHighlight(mainLine, immersiveLine) {
        if (!mainLine || !immersiveLine) return;

        // 检查是否是当前播放行
        const isCurrentLine = mainLine.classList.contains('active');

        if (isCurrentLine) {
            // 当前播放行：实现渐进式高亮效果
            const mainWords = mainLine.querySelectorAll('.lyrics-word');
            const immersiveWords = immersiveLine.querySelectorAll('.lyrics-word');

            // 确保字符数量一致
            if (mainWords.length === immersiveWords.length && mainWords.length > 0) {
                // KRC格式：找到当前正在播放的字符位置
                let currentActiveIndex = -1;
                mainWords.forEach((mainWord, index) => {
                    if (mainWord.classList.contains('active-word')) {
                        currentActiveIndex = index;
                    }
                });

                // 高亮当前字符及之前的所有字符
                // 移除频繁的日志输出以减少CPU占用

                immersiveWords.forEach((immersiveWord, index) => {
                    if (currentActiveIndex >= 0 && index <= currentActiveIndex) {
                        // 当前字符及之前的字符：已播放状态（默认样式已经是亮白色、粗体、发光）
                        immersiveWord.classList.add('played');
                        immersiveWord.classList.remove('unplayed');
                    } else {
                        // 之后的字符：未播放状态
                        immersiveWord.classList.remove('played');
                        immersiveWord.classList.add('unplayed');
                    }
                });

                // 添加渐进式高亮的容器类
                immersiveLine.classList.add('progressive-highlight');
            } else {
                // LRC格式或无逐字数据：整行高亮
                immersiveLine.classList.add('current-playing');
                immersiveLine.classList.remove('progressive-highlight');
            }
        } else {
            // 非当前播放行：移除所有播放状态
            const immersiveWords = immersiveLine.querySelectorAll('.lyrics-word');
            immersiveWords.forEach(word => {
                word.classList.remove('played', 'unplayed');
            });
            immersiveLine.classList.remove('current-playing', 'progressive-highlight');
        }
    }

    async toggleFavorite() {
        const currentSong = window.PlayerController ? window.PlayerController.getCurrentSong() : null;
        if (!currentSong) return;

        // 调用收藏功能
        if (window.addToFavorites) {
            await window.addToFavorites(currentSong);
        }
    }

    setupMouseActivityDetection() {
        let mouseTimer = null;
        let cursorTimer = null;
        let isMouseInside = false;

        const showControls = () => {
            this.container.classList.add('show-controls');
        };

        const hideControls = () => {
            this.container.classList.remove('show-controls');
        };

        const showCursor = () => {
            this.container.classList.add('show-cursor');
        };

        const hideCursor = () => {
            this.container.classList.remove('show-cursor');
        };

        const resetTimer = () => {
            clearTimeout(mouseTimer);
            clearTimeout(cursorTimer);
            showControls();
            showCursor();

            // 只有在鼠标在容器内时才设置隐藏定时器
            if (isMouseInside) {
                // 控制元素3秒后隐藏
                mouseTimer = setTimeout(() => {
                    if (isMouseInside) {
                        hideControls();
                    }
                }, 3000);

                // 鼠标指针2秒后隐藏（比控制元素早一点）
                cursorTimer = setTimeout(() => {
                    if (isMouseInside) {
                        hideCursor();
                    }
                }, 2000);
            }
        };

        // 鼠标进入容器
        this.container.addEventListener('mouseenter', () => {
            isMouseInside = true;
            resetTimer();
        });

        // 鼠标在容器内移动
        this.container.addEventListener('mousemove', () => {
            if (isMouseInside) {
                resetTimer();
            }
        });

        // 鼠标离开容器
        this.container.addEventListener('mouseleave', () => {
            isMouseInside = false;
            clearTimeout(mouseTimer);
            clearTimeout(cursorTimer);
            hideControls();
            hideCursor();
        });

        // 控制区域本身的鼠标事件，防止在控制按钮上时隐藏
        if (this.controls) {
            this.controls.addEventListener('mouseenter', () => {
                clearTimeout(mouseTimer);
                clearTimeout(cursorTimer);
                showControls();
                showCursor();
            });

            this.controls.addEventListener('mouseleave', () => {
                if (isMouseInside) {
                    resetTimer();
                }
            });
        }

        // 为所有控制按钮添加鼠标事件，确保悬停时显示指针
        const allControlButtons = this.container.querySelectorAll('button, input[type="range"], .volume-icon');
        allControlButtons.forEach(button => {
            button.addEventListener('mouseenter', () => {
                clearTimeout(cursorTimer);
                showCursor();
            });
        });

        // 初始状态隐藏控制按钮和鼠标指针
        hideControls();
        hideCursor();
    }
    
    adjustVolume(delta) {
        if (!window.audioPlayer || !window.audioPlayer()) return;
        
        const player = window.audioPlayer();
        const currentVolume = player.volume || 0.5;
        const newVolume = Math.max(0, Math.min(1, currentVolume + delta));
        
        player.setVolume(newVolume);
        
        if (this.volumeSlider) {
            this.volumeSlider.value = newVolume * 100;
        }
    }
    
    startTimeUpdateListener() {
        // 停止现有的监听器
        this.stopTimeUpdateListener();

        // 记录上次更新的数据，避免重复更新
        this.lastLyricsLength = 0;
        this.lastCurrentTime = -1;
        this.lastProgressPercent = -1;

        // 使用requestAnimationFrame优化更新频率
        const updateLoop = () => {
            if (!this.isActive) return;

            if (window.audioPlayer && window.audioPlayer()) {
                const player = window.audioPlayer();
                if (player.audio && !isNaN(player.audio.currentTime)) {
                    const currentTime = player.audio.currentTime;
                    const duration = player.audio.duration;

                    // 只更新进度条，歌词由主页面组件自动处理
                    if (Math.abs(currentTime - this.lastCurrentTime) > 0.05) {
                        this.updateProgress(currentTime, duration);
                        this.lastCurrentTime = currentTime;
                    }
                }
            }

            this.animationFrameId = requestAnimationFrame(updateLoop);
        };

        this.animationFrameId = requestAnimationFrame(updateLoop);
        console.log('🎵 沉浸式播放器时间更新监听器已启动（使用RAF优化）');
    }

    stopTimeUpdateListener() {
        if (this.timeUpdateInterval) {
            clearInterval(this.timeUpdateInterval);
            this.timeUpdateInterval = null;
        }
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        console.log('🎵 沉浸式播放器时间更新监听器已停止');
    }

    // 启动数字时钟
    startDigitalClock() {
        // 立即更新一次时钟显示
        this.updateDigitalClock();

        // 每秒更新一次时钟
        this.clockInterval = setInterval(() => {
            this.updateDigitalClock();
        }, 1000);

        console.log('🕐 数字时钟已启动');
    }

    // 停止数字时钟
    stopDigitalClock() {
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
            this.clockInterval = null;
            console.log('🕐 数字时钟已停止');
        }
    }

    // 更新数字时钟显示
    updateDigitalClock() {
        if (!this.clockTimeElement) {
            return;
        }

        const now = new Date();

        // 格式化时间 (HH:MM:SS)
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        const timeString = `${hours}:${minutes}:${seconds}`;

        // 更新显示
        this.clockTimeElement.textContent = timeString;
    }

    // 启动底部时间显示
    startDateTimeDisplay() {
        // 立即更新一次时间显示
        this.updateDateTimeDisplay();

        // 每秒更新一次时间
        this.datetimeInterval = setInterval(() => {
            this.updateDateTimeDisplay();
        }, 1000);

        console.log('🕐 底部时间显示已启动');
    }

    // 停止底部时间显示
    stopDateTimeDisplay() {
        if (this.datetimeInterval) {
            clearInterval(this.datetimeInterval);
            this.datetimeInterval = null;
            console.log('🕐 底部时间显示已停止');
        }
    }

    // 更新底部时间显示
    updateDateTimeDisplay() {
        if (!this.datetimeElement) {
            return;
        }

        const now = new Date();

        // 格式化时间（只显示时间，不显示日期）
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');

        const timeString = `${hours}:${minutes}:${seconds}`;

        // 更新显示
        this.datetimeElement.textContent = timeString;
    }

    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';

        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    // 切换全屏模式
    toggleFullscreen() {
        if (!document.fullscreenEnabled) {
            console.warn('🎵 浏览器不支持全屏API');
            return;
        }

        if (this.isFullscreen) {
            this.exitFullscreen();
        } else {
            this.enterFullscreen();
        }
    }

    // 进入全屏
    async enterFullscreen() {
        try {
            await this.container.requestFullscreen();
            this.isFullscreen = true;
            this.updateFullscreenButton();
            console.log('🎵 进入全屏模式');
        } catch (error) {
            console.error('❌ 进入全屏失败:', error);
        }
    }

    // 退出全屏
    async exitFullscreen() {
        try {
            await document.exitFullscreen();
            this.isFullscreen = false;
            this.updateFullscreenButton();
            console.log('🎵 退出全屏模式');
        } catch (error) {
            console.error('❌ 退出全屏失败:', error);
        }
    }

    // 更新全屏按钮图标
    updateFullscreenButton() {
        const fullscreenBtn = this.container.querySelector('.immersive-fullscreen-btn');
        if (fullscreenBtn) {
            const icon = fullscreenBtn.querySelector('i');
            if (icon) {
                if (this.isFullscreen) {
                    icon.className = 'fas fa-compress';
                    fullscreenBtn.title = '退出全屏';
                } else {
                    icon.className = 'fas fa-expand';
                    fullscreenBtn.title = '全屏';
                }
            }
        }
    }

    // 监听全屏状态变化
    setupFullscreenListeners() {
        document.addEventListener('fullscreenchange', () => {
            this.isFullscreen = !!document.fullscreenElement;
            this.updateFullscreenButton();

            if (this.isFullscreen) {
                console.log('🎵 已进入全屏模式');
            } else {
                console.log('🎵 已退出全屏模式');
            }
        });

        document.addEventListener('fullscreenerror', (event) => {
            console.error('❌ 全屏操作失败:', event);
            this.isFullscreen = false;
            this.updateFullscreenButton();
        });
    }
}

// 创建全局实例
const immersivePlayer = new ImmersivePlayer();

// 暴露到全局作用域
window.ImmersivePlayer = immersivePlayer;

// 监听播放器状态变化
if (window.addEventListener) {
    // 监听歌曲信息更新
    document.addEventListener('songInfoUpdated', (e) => {
        if (immersivePlayer.isActive && e.detail) {
            immersivePlayer.updateSongInfo(e.detail);

            // 歌曲切换时重新同步歌词
            setTimeout(() => {
                immersivePlayer.syncLyrics();
            }, 200); // 减少延迟到200ms，提高响应速度
        }
    });

    // 监听主页面歌词更新
    const observeLyricsChanges = () => {
        const mainLyricsDisplay = document.querySelector('#lyricsTab .lyrics-display');
        if (mainLyricsDisplay) {
            // 🔧 内存泄漏修复：使用全局资源管理器管理MutationObserver
            const addObserver = (target, callback, options) => {
                if (window.GlobalResourceManager) {
                    return window.GlobalResourceManager.addObserver(target, callback, options);
                } else {
                    const observer = new MutationObserver(callback);
                    observer.observe(target, options);
                    return observer;
                }
            };

            const observer = addObserver(mainLyricsDisplay, (mutations) => {
                if (immersivePlayer.isActive) {
                    mutations.forEach(mutation => {
                        // 检查是否是歌词高亮变化
                        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                            const target = mutation.target;
                            if (target.classList.contains('lyrics-line')) {
                                // 防抖处理，避免频繁触发
                                if (immersivePlayer.highlightChangeTimeout) {
                                    clearTimeout(immersivePlayer.highlightChangeTimeout);
                                }

                                // 🔧 内存泄漏修复：使用全局资源管理器管理定时器
                                const addTimer = (callback, delay) => {
                                    if (window.GlobalResourceManager) {
                                        return window.GlobalResourceManager.addTimer(callback, delay);
                                    } else {
                                        return setTimeout(callback, delay);
                                    }
                                };

                                immersivePlayer.highlightChangeTimeout = addTimer(() => {
                                    // 移除频繁的日志输出以减少CPU占用
                                    immersivePlayer.syncLyricsHighlight();
                                }, 32); // 32ms防抖，约30fps的更新频率，平衡性能和流畅度
                            }
                        }
                        // 检查是否是歌词内容变化
                        else if (mutation.type === 'childList') {
                            // 移除频繁的日志输出以减少CPU占用
                            // 🔧 内存泄漏修复：使用全局资源管理器管理定时器
                            addTimer(() => {
                                immersivePlayer.syncLyrics();
                            }, 200); // 增加延迟，减少频繁触发
                        }
                    });
                }
            }, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class']
            });

            console.log('🎵 沉浸式播放器：开始监听主页面歌词变化');
        } else {
            console.log('🎵 沉浸式播放器：未找到主页面歌词组件，无法监听变化');
        }
    };

    // 延迟启动歌词监听，确保DOM已加载
    // 🔧 内存泄漏修复：使用全局资源管理器管理定时器
    const addTimer = (callback, delay) => {
        if (window.GlobalResourceManager) {
            return window.GlobalResourceManager.addTimer(callback, delay);
        } else {
            return setTimeout(callback, delay);
        }
    };

    addTimer(observeLyricsChanges, 1000);
    
    // 监听播放状态变化
    document.addEventListener('playStateChanged', () => {
        if (immersivePlayer.isActive) {
            immersivePlayer.updatePlayState();
        }
    });
    
    // 移除重复的进度和歌词监听器，因为我们已经在RAF循环中处理了
}

// 扩展HTML5播放器以支持沉浸式播放器同步
function extendAudioPlayerForImmersive() {
    if (!window.audioPlayer || typeof window.audioPlayer !== 'function') {
        setTimeout(extendAudioPlayerForImmersive, 100);
        return;
    }

    const originalUpdateSongInfo = window.updateSongInfo;
    if (originalUpdateSongInfo && !originalUpdateSongInfo._immersiveExtended) {
        window.updateSongInfo = function(song) {
            // 调用原始函数
            originalUpdateSongInfo(song);

            // 触发自定义事件
            document.dispatchEvent(new CustomEvent('songInfoUpdated', { detail: song }));
        };
        window.updateSongInfo._immersiveExtended = true;
    }

    // 只添加一次事件监听器
    const player = window.audioPlayer();
    if (player && player.audio && !player.audio._immersiveListenersAdded) {
        player.audio.addEventListener('play', () => {
            document.dispatchEvent(new CustomEvent('playStateChanged'));
        });

        player.audio.addEventListener('pause', () => {
            document.dispatchEvent(new CustomEvent('playStateChanged'));
        });

        player.audio._immersiveListenersAdded = true;
    }
}

// 扩展歌词更新函数
function extendLyricsForImmersive() {
    const originalUpdateLyricsDisplay = window.updateLyricsDisplay;
    if (originalUpdateLyricsDisplay) {
        window.updateLyricsDisplay = function(lyricsContent) {
            // 调用原始函数
            originalUpdateLyricsDisplay(lyricsContent);

            // 同步到沉浸式播放器
            if (immersivePlayer.isActive) {
                setTimeout(() => {
                    immersivePlayer.syncLyrics();
                }, 50); // 减少延迟，提高响应速度
            }
        };
        console.log('🎵 已扩展 updateLyricsDisplay 函数');
    } else {
        console.warn('🎵 updateLyricsDisplay 函数不存在，无法扩展');
    }

    // 移除对 updateLyricsHighlight 的扩展，因为现在沉浸式播放器直接复用主页面歌词
    // 歌词高亮由主页面处理，沉浸式播放器通过 MutationObserver 监听变化并同步滚动
}

// 初始化扩展
document.addEventListener('DOMContentLoaded', () => {
    extendAudioPlayerForImmersive();
    extendLyricsForImmersive();
});

// 如果DOM已经加载完成，立即执行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        extendAudioPlayerForImmersive();
        extendLyricsForImmersive();
    });
} else {
    extendAudioPlayerForImmersive();
    extendLyricsForImmersive();
}

console.log('🎵 沉浸式播放器模块加载完成');
