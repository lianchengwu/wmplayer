#!/bin/bash

# 音乐播放器启动脚本
# 确保在不同环境下都能正确显示无边框窗口

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_PATH="$SCRIPT_DIR/bin/wmplayer"

# 检查应用是否存在
if [ ! -f "$APP_PATH" ]; then
    echo "错误: 找不到应用程序 $APP_PATH"
    echo "请先运行 'wails3 build' 构建应用"
    exit 1
fi

# 打印环境信息
echo "=== 环境信息 ==="
echo "DISPLAY: $DISPLAY"
echo "XDG_CURRENT_DESKTOP: $XDG_CURRENT_DESKTOP"
echo "WAYLAND_DISPLAY: $WAYLAND_DISPLAY"
echo "GDK_BACKEND: $GDK_BACKEND"
echo "================"

# 设置环境变量以确保一致的窗口行为
export GDK_BACKEND=x11  # 强制使用X11后端，确保无边框窗口正确显示

# 启动应用
echo "启动音乐播放器..."
exec "$APP_PATH" "$@"
