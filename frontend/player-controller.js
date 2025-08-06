// 播放器控制模块
// 统一的播放控制逻辑，基于播放列表管理器

// 播放器状态 - 现在由 HTML5 Audio API 管理

// 备用的 updatePlayerBar 函数，防止HTML5音频集成脚本未加载
function fallbackUpdatePlayerBar() {
    console.log('🎵 使用备用 updatePlayerBar 函数');
    const playPauseBtn = document.querySelector('.play-pause-btn');
    if (playPauseBtn) {
        // 简单的播放/暂停按钮更新
        const isPlaying = window.currentPlayingSong ? true : false;
        const icon = playPauseBtn.querySelector('i');
        if (icon) {
            icon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
        }
        playPauseBtn.title = isPlaying ? '暂停' : '播放';
    }
}
 

// 统一播放函数 - 单曲播放
async function playSong(song) {
    console.log('🎵 播放单曲:', song.songname);

    if (!song || !song.hash) {
        console.error('❌ 歌曲信息无效');
        return false;
    }

    if (!window.PlaylistManager) {
        console.error('❌ PlaylistManager不可用');
        return false;
    }

    try {
        // 清空当前播放列表，设置为单曲播放
        const success = await window.PlaylistManager.setPlaylist([song], 0, '单曲播放', true, 'normal');
        if (!success) {
            console.error('❌ 设置单曲播放列表失败');
            return false;
        }

        // 播放当前歌曲
        return await playCurrentSong();
    } catch (error) {
        console.error('❌ 播放单曲失败:', error);
        return false;
    }
}

// 统一播放函数 - 歌单播放
async function playPlaylist(songs, startIndex = 0, playlistName = '播放列表', playMode = 'repeat_all') {
    console.log('🎵 播放歌单:', { songs: songs.length, startIndex, playlistName, playMode });

    if (!songs || songs.length === 0) {
        console.error('❌ 歌曲列表为空');
        return false;
    }

    if (!window.PlaylistManager) {
        console.error('❌ PlaylistManager不可用');
        return false;
    }

    try {
        // 设置播放列表
        console.log('🎵 调用PlaylistManager.setPlaylist...');
        const success = await window.PlaylistManager.setPlaylist(songs, startIndex, playlistName, true, playMode);
        if (!success) {
            console.error('❌ 设置播放列表失败');
            return false;
        }

        console.log('🎵 播放列表设置成功，开始播放当前歌曲...');
        // 播放当前歌曲
        return await playCurrentSong();
    } catch (error) {
        console.error('❌ 播放歌单失败:', error);
        return false;
    }
}

// 播放当前歌曲
async function playCurrentSong() {
    console.log('🎵 获取当前歌曲...');
    const song = window.PlaylistManager.getCurrentSong();
    if (!song) {
        console.error('❌ 没有当前歌曲可播放');
        return false;
    }

    console.log('🎵 播放当前歌曲:', song.songname);
    console.log('🎵 歌曲详细信息:', song);

    try {
        // 🛑 [CRITICAL] 强制停止当前播放器实例（防止多个播放器同时播放）
        console.log('🛑 [CRITICAL] PlayerController 强制停止当前播放器实例');

        if (window.audioPlayer && typeof window.audioPlayer === 'function') {
            const player = window.audioPlayer();
            if (player && player.stop) {
                player.stop();
            }
        }

        // 设置当前播放歌曲（使用统一字段格式）
        const legacySong = {
            hash: song.hash,
            songname: song.songname,
            filename: song.filename,
            author_name: song.author_name,
            album_name: song.album_name,
            album_id: song.album_id,
            time_length: song.time_length,
            union_cover: song.union_cover
        };

        // 🎵 歌曲信息更新现在由HTML5播放器统一处理，无需在此重复调用
        console.log('🎵 歌曲信息将由HTML5播放器统一更新');

        // 🎵 获取播放地址
        console.log('🎵 获取播放地址，歌曲hash:', song.hash);
        const playUrlsPromise = window.getSongPlayUrls(song.hash);
        const playUrls = await playUrlsPromise;
        console.log('🎵 获取到播放地址:', Array.isArray(playUrls) ? `${playUrls.length}个` : '无效');

        // 清除加载状态（如果存在）
        if (window.setPlayerLoadingState) {
            window.setPlayerLoadingState(false);
        }

        // 🎵 立即更新歌曲信息显示（不等待播放地址）
        console.log('🎵 立即更新歌曲信息显示');
        if (typeof window.updateSongInfo === 'function') {
            console.log('🎵 调用全局 updateSongInfo 立即更新歌曲信息');
            try {
                window.updateSongInfo(legacySong);
                console.log('🎵 歌曲信息立即更新完成');



            } catch (error) {
                console.error('❌ 立即更新歌曲信息失败:', error);
            }
        } else {
            console.error('❌ 全局 updateSongInfo 函数不存在');
        }

        // 检查播放地址是否有效
        if (!playUrls || (Array.isArray(playUrls) && playUrls.length === 0)) {
            console.error('❌ 无法播放：未获取到有效的播放地址');
            console.error('❌ playUrls值:', playUrls);
            console.error('❌ 歌曲信息:', legacySong);

            // 设置错误状态
            if (window.setPlayerErrorState) {
                window.setPlayerErrorState('无法获取播放地址，8秒后自动下一首');
            }

            // 等待8秒后自动播放下一首
            console.log('🎵 播放地址获取失败，8秒后自动播放下一首');
            setTimeout(async () => {
                console.log('🎵 开始自动播放下一首（播放地址获取失败）');
                try {
                    const success = await playNextSong();
                    if (!success) {
                        console.warn('⚠️ 自动播放下一首失败，可能已到播放列表末尾');
                    }
                } catch (error) {
                    console.error('❌ 自动播放下一首时出错:', error);
                }
            }, 8000);

            return false;
        }

        // 使用 HTML5 音频播放器
        let success = false;
        if (window.audioPlayer && typeof window.audioPlayer === 'function') {
            const player = window.audioPlayer();
            if (player && player.play) {
                try {
                    // 直接调用HTML5播放器的play方法，避免循环调用
                    success = await player.play(legacySong, playUrls);
                    console.log('✅ HTML5 音频播放器播放成功');
                } catch (error) {
                    console.error('❌ HTML5 音频播放器播放失败:', error);
                    success = false;
                }
            } else {
                console.error('❌ HTML5 音频播放器实例无效');
                success = false;
            }
        } else {
            console.error('❌ HTML5 音频播放器未初始化');
            success = false;
        }

        if (!success) {
            // 设置错误状态
            if (window.setPlayerErrorState) {
                window.setPlayerErrorState('播放器播放失败，8秒后自动下一首');
            }

            // 等待8秒后自动播放下一首
            console.log('🎵 播放器播放失败，8秒后自动播放下一首');
            setTimeout(async () => {
                console.log('🎵 开始自动播放下一首（播放器播放失败）');
                try {
                    const success = await playNextSong();
                    if (!success) {
                        console.warn('⚠️ 自动播放下一首失败，可能已到播放列表末尾');
                    }
                } catch (error) {
                    console.error('❌ 自动播放下一首时出错:', error);
                }
            }, 8000);
        }

        if (!success) {
            // 播放状态现在由 PlaylistManager 管理
        } else {
            // 播放成功后，通知后端记录播放历史（后端处理所有逻辑）
            console.log('✅ 播放成功，通知后端记录播放历史');
            await window.addPlayHistory(legacySong);
        }

        return success;
    } catch (error) {
        console.error('❌ 播放当前歌曲失败:', error);
        // 播放状态现在由 PlaylistManager 管理，不需要直接设置 currentPlayingSong
        return false;
    }
}

// 下一首
async function playNextSong() {
    console.log('🎵 播放下一首');

    try {
        console.log('🎵 调用 PlaylistManager.getNextSong()...');
        const nextSong = await window.PlaylistManager.getNextSong();
        console.log('🎵 getNextSong() 返回结果:', nextSong);

        if (nextSong) {
            console.log('🎵 准备播放下一首歌曲:', nextSong.songname);
            const success = await playCurrentSong();
            console.log('🎵 播放下一首结果:', success);
            return success;
        } else {
            console.warn('⚠️ 没有下一首歌曲');
            return false;
        }
    } catch (error) {
        console.error('❌ 播放下一首失败:', error);
        return false;
    }
}

// 上一首
async function playPreviousSong() {
    console.log('🎵 播放上一首');
    
    try {
        const prevSong = await window.PlaylistManager.getPreviousSong();
        if (prevSong) {
            return await playCurrentSong();
        } else {
            console.warn('⚠️ 没有上一首歌曲');
            return false;
        }
    } catch (error) {
        console.error('❌ 播放上一首失败:', error);
        return false;
    }
}

// 播放指定索引的歌曲
async function playByIndex(index) {
    console.log('🎵 播放指定索引歌曲:', index);
    
    try {
        const song = await window.PlaylistManager.setCurrentIndex(index);
        if (song) {
            return await playCurrentSong();
        } else {
            console.error('❌ 设置播放索引失败');
            return false;
        }
    } catch (error) {
        console.error('❌ 播放指定索引歌曲失败:', error);
        return false;
    }
}

// 切换随机播放模式
async function toggleShuffleMode() {
    const currentPlaylist = window.PlaylistManager.getCurrentPlaylist();
    const newShuffleMode = !currentPlaylist.shuffle_mode;
    
    console.log('🔀 切换随机播放模式:', newShuffleMode);
    
    try {
        const success = await window.PlaylistManager.updatePlayMode(newShuffleMode, currentPlaylist.repeat_mode);
        if (success) {
            console.log('✅ 随机播放模式已更新');
        }
        return success;
    } catch (error) {
        console.error('❌ 切换随机播放模式失败:', error);
        return false;
    }
}

// 切换循环播放模式
async function toggleRepeatMode() {
    const currentPlaylist = window.PlaylistManager.getCurrentPlaylist();
    // 切换顺序：列表播放(off) → 列表循环(all) → 单曲循环(one) → 列表播放(off)
    const modes = ['off', 'all', 'one'];
    const currentIndex = modes.indexOf(currentPlaylist.repeat_mode);
    const nextIndex = (currentIndex + 1) % modes.length;
    const newRepeatMode = modes[nextIndex];

    const modeNames = {
        'off': '列表播放',
        'all': '列表循环',
        'one': '单曲循环'
    };

    console.log('🔁 切换循环播放模式:', `${modeNames[currentPlaylist.repeat_mode]} → ${modeNames[newRepeatMode]}`);

    try {
        const success = await window.PlaylistManager.updatePlayMode(currentPlaylist.shuffle_mode, newRepeatMode);
        if (success) {
            console.log('✅ 循环播放模式已更新');
        }
        return success;
    } catch (error) {
        console.error('❌ 切换循环播放模式失败:', error);
        return false;
    }
}

// 暂停/继续播放
function togglePlayPause() {
    console.log('🎵 togglePlayPause 被调用');

    // 检查是否有 HTML5 音频播放器
    if (!window.audioPlayer || typeof window.audioPlayer !== 'function') {
        console.error('❌ HTML5 音频播放器未初始化');
        return;
    }

    const player = window.audioPlayer();
    if (!player) {
        console.error('❌ HTML5 音频播放器实例无效');
        return;
    }

    // 检查是否正在播放
    if (player.isPlaying && player.isPlaying()) {
        player.pause();
        console.log('⏸️ 暂停播放');
    } else {
        // 检查是否有当前播放歌曲
        const currentSong = window.PlaylistManager ? window.PlaylistManager.getCurrentSong() : null;

        if (currentSong) {
            // 检查播放器是否有播放地址
            if (player.playUrls && player.playUrls.length > 0) {
                // 有播放地址，继续播放
                player.resume();
                console.log('▶️ 继续播放');
            } else {
                // 没有播放地址，需要重新获取并播放
                console.log('🎵 没有播放地址，重新获取并播放当前歌曲');
                playCurrentSong();
            }
        } else {
            // 没有歌曲，提示用户选择歌曲
            console.log('⚠️ 没有当前播放歌曲，请先选择要播放的歌曲');
        }
    }
}

// 停止播放
function stopPlaying() {
    console.log('⏹️ PlayerController 停止播放');

    // 使用 HTML5 音频播放器
    if (window.audioPlayer && typeof window.audioPlayer === 'function') {
        const player = window.audioPlayer();
        if (player && player.stop) {
            player.stop();
        }
        
        // 清理播放器资源
        if (player && player.destroyAudioElement) {
            player.destroyAudioElement();
        }
    }

    // 播放状态现在由 PlaylistManager 管理，不需要直接设置 currentPlayingSong

    // 清空歌词数据
    if (window.currentLyricsLines) {
        window.currentLyricsLines = [];
    }
    if (window.currentActiveLyricsIndex !== undefined) {
        window.currentActiveLyricsIndex = -1;
    }

    // 清除歌词高亮
    const lyricsLines = document.querySelectorAll('.lyrics-line');
    lyricsLines.forEach(line => line.classList.remove('active'));
}

// 清理播放器控制器资源
function cleanupPlayerController() {
    console.log('🧹 清理播放器控制器资源');
    
    // 停止播放
    stopPlaying();
    
    // 清理全局引用
    if (window.PlayerController) {
        window.PlayerController = null;
    }
    
    console.log('✅ 播放器控制器资源已清理');
}

// 页面卸载时清理资源
window.addEventListener('beforeunload', cleanupPlayerController);

// 设置当前歌曲信息但不播放
function setCurrentSongInfo(song) {
    console.log('🎵 设置当前歌曲信息（不播放）:', song?.songname);

    if (!song) {
        console.error('❌ 歌曲信息为空');
        return;
    }

    // 更新播放器的当前歌曲信息
    if (window.audioPlayer && typeof window.audioPlayer === 'function') {
        const player = window.audioPlayer();
        if (player) {
            player.currentSong = song;
            // 清除之前的播放地址，确保下次播放时重新获取
            player.playUrls = [];
            player.currentUrlIndex = 0;
            console.log('✅ 播放器歌曲信息已设置');
        }
    }

    // 更新界面显示
    if (window.updateSongInfo && typeof window.updateSongInfo === 'function') {
        window.updateSongInfo(song);
        console.log('✅ 界面歌曲信息已更新');
    }

    // 播放状态现在由 PlaylistManager 管理，不需要直接设置 currentPlayingSong
    // 通过 Object.defineProperty 设置的 getter 会自动从 PlayerController 获取当前歌曲
    console.log('✅ 歌曲信息设置完成（通过 PlaylistManager 管理）');
}

// 暴露到全局作用域
window.PlayerController = {
    playSong,
    playPlaylist,
    playCurrentSong,
    playNext: playNextSong,
    playPrevious: playPreviousSong,
    playByIndex,
    toggleShuffle: toggleShuffleMode,
    toggleRepeat: toggleRepeatMode,
    togglePlayPause,
    stop: stopPlaying,
    setCurrentSongInfo,
    getCurrentSong: () => {
        // 从 PlaylistManager 获取当前播放歌曲，避免循环依赖
        if (window.PlaylistManager) {
            return window.PlaylistManager.getCurrentSong();
        }
        return null;
    },
    getAudioPlayer: () => window.audioPlayer ? window.audioPlayer() : null
};

// 兼容性：暴露旧的播放函数，统一使用PlayerController
// 注意：window.playSong 由 HTML5 音频播放器提供，避免循环调用
window.nextTrack = playNextSong;
window.previousTrack = playPreviousSong;
window.togglePlayPause = togglePlayPause;
window.toggleShuffle = toggleShuffleMode;
window.toggleRepeat = toggleRepeatMode;
