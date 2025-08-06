/**
 * 应用主入口文件
 * 统一导入所有模块，确保 Vite 构建时正确打包
 */

console.log('🚀 开始加载应用模块...');

// 使用静态导入，确保 Vite 正确打包
import './playlist-manager.js';
import './player-controller.js';
import './media-key-handler.js';
import './main.js';
import './search.js';
import './discover.js';
import './history.js';
import './favorites.js';
import './album-detail.js';
import './playlists.js';

console.log('🚀 应用模块加载完成');
