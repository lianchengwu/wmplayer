import { defineConfig } from 'vite'

export default defineConfig({
  // 构建配置
  build: {
    // 输出目录
    outDir: 'dist',
    // 清空输出目录
    emptyOutDir: true,
    // 复制 public 目录中的文件
    copyPublicDir: true,
    // 构建时复制额外的文件
    rollupOptions: {
      input: 'index.html'
    }
  },
  
  // 开发服务器配置
  server: {
    // 端口由 Wails 动态设置
    strictPort: true,
    // 允许外部访问
    host: true
  },
  
  // 公共基础路径
  base: './',
  
  // 静态资源处理
  publicDir: 'public'
})
