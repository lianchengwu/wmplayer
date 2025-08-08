# wmPlayer MPRIS D-Bus 媒体控制

本文档介绍wmPlayer的MPRIS D-Bus媒体控制功能，该功能为KDE等Linux桌面环境提供系统级媒体控制支持。

## 🎯 功能特性

### ✅ 已实现功能

- **系统级媒体键支持** - 无需应用窗口焦点即可控制播放
- **KDE媒体控制面板集成** - 在KDE系统托盘和通知中心显示媒体控制
- **MPRIS 2.0标准兼容** - 支持标准的D-Bus媒体播放器接口
- **实时状态同步** - 播放状态、歌曲信息、音量等实时同步到系统
- **第三方控制器兼容** - 支持任何兼容MPRIS的媒体控制器

### 🎵 支持的媒体控制操作

- **播放控制**: 播放、暂停、停止、播放/暂停切换
- **曲目控制**: 上一首、下一首
- **音量控制**: 音量调节（通过D-Bus属性）
- **进度控制**: 跳转到指定位置（Seek）
- **元数据显示**: 歌曲标题、艺术家、专辑、封面、时长

## 🚀 使用方法

### 自动启用

在Linux系统上，MPRIS功能会自动启用：

1. 启动wmPlayer应用
2. MPRIS服务会自动在D-Bus上注册
3. 系统媒体控制器会自动检测到wmPlayer

### 验证MPRIS服务

使用提供的测试脚本验证MPRIS功能：

```bash
./test-mpris.sh
```

或手动检查D-Bus服务：

```bash
# 检查服务是否注册
dbus-send --session --dest=org.mpris.MediaPlayer2.wmplayer --type=method_call --print-reply /org/mpris/MediaPlayer2 org.freedesktop.DBus.Properties.Get string:"org.mpris.MediaPlayer2" string:"Identity"
```

### KDE集成

在KDE桌面环境中，wmPlayer会自动集成到：

- **系统托盘媒体控制器**
- **通知中心媒体控制**
- **锁屏界面媒体控制**
- **全局媒体键响应**

## 🔧 技术实现

### D-Bus接口

- **服务名称**: `org.mpris.MediaPlayer2.wmplayer`
- **对象路径**: `/org/mpris/MediaPlayer2`
- **接口**: 
  - `org.mpris.MediaPlayer2` (根接口)
  - `org.mpris.MediaPlayer2.Player` (播放器接口)

### 架构设计

```
前端 JavaScript ←→ Go MediaKeyService ←→ Go MPRISService ←→ D-Bus
```

1. **前端集成** (`frontend/mpris-integration.js`)
   - 监听播放器状态变化
   - 实时同步播放信息到后端

2. **媒体键服务** (`mediakeyservice.go`)
   - 统一的媒体控制接口
   - 前端和MPRIS之间的桥梁

3. **MPRIS服务** (`mprisservice.go`)
   - 完整的MPRIS 2.0实现
   - D-Bus接口导出和属性管理

## 📊 状态同步

### 自动同步的信息

- **播放状态**: Playing, Paused, Stopped
- **歌曲元数据**: 标题、艺术家、专辑、封面、时长
- **播放位置**: 当前播放进度（微秒精度）
- **音量**: 0.0-1.0范围的音量值
- **控制能力**: 可播放、可暂停、可跳转等

### 同步频率

- **播放状态**: 实时同步
- **元数据**: 歌曲切换时同步
- **播放位置**: 每秒同步一次
- **音量**: 音量变化时实时同步

## 🛠️ 开发和调试

### 查看MPRIS状态

```bash
# 查看播放状态
dbus-send --session --dest=org.mpris.MediaPlayer2.wmplayer --type=method_call --print-reply /org/mpris/MediaPlayer2 org.freedesktop.DBus.Properties.Get string:"org.mpris.MediaPlayer2.Player" string:"PlaybackStatus"

# 查看当前歌曲
dbus-send --session --dest=org.mpris.MediaPlayer2.wmplayer --type=method_call --print-reply /org/mpris/MediaPlayer2 org.freedesktop.DBus.Properties.Get string:"org.mpris.MediaPlayer2.Player" string:"Metadata"

# 查看所有属性
dbus-send --session --dest=org.mpris.MediaPlayer2.wmplayer --type=method_call --print-reply /org/mpris/MediaPlayer2 org.freedesktop.DBus.Properties.GetAll string:"org.mpris.MediaPlayer2.Player"
```

### 发送控制命令

```bash
# 播放/暂停
dbus-send --session --dest=org.mpris.MediaPlayer2.wmplayer --type=method_call /org/mpris/MediaPlayer2 org.mpris.MediaPlayer2.Player.PlayPause

# 下一首
dbus-send --session --dest=org.mpris.MediaPlayer2.wmplayer --type=method_call /org/mpris/MediaPlayer2 org.mpris.MediaPlayer2.Player.Next

# 上一首
dbus-send --session --dest=org.mpris.MediaPlayer2.wmplayer --type=method_call /org/mpris/MediaPlayer2 org.mpris.MediaPlayer2.Player.Previous
```

### 日志监控

wmPlayer会在控制台输出MPRIS相关的日志信息：

```
🎵 启动MPRIS D-Bus媒体控制服务...
✅ MPRIS D-Bus服务启动成功
📡 D-Bus服务名称: org.mpris.MediaPlayer2.wmplayer
📡 D-Bus对象路径: /org/mpris/MediaPlayer2
🎵 MPRIS: 收到PlayPause请求
🎵 MPRIS: 元数据更新 - 标题: 歌曲名, 艺术家: 艺术家名, 专辑: 专辑名
```

## 🐛 故障排除

### 常见问题

1. **MPRIS服务未启动**
   - 检查是否在Linux系统上运行
   - 确认D-Bus会话总线可用
   - 查看应用启动日志

2. **媒体键不响应**
   - 确认MPRIS服务已注册
   - 检查其他媒体播放器是否占用了媒体键
   - 验证KDE媒体控制设置

3. **状态同步问题**
   - 检查前端JavaScript控制台错误
   - 确认播放器状态变化事件正常触发
   - 查看MPRIS属性更新日志

### 调试工具

- **D-Bus监控**: `dbus-monitor --session`
- **MPRIS测试**: `./test-mpris.sh`
- **属性查看**: `qdbus org.mpris.MediaPlayer2.wmplayer`

## 📝 更新日志

### v1.0.0 (当前版本)
- ✅ 完整的MPRIS 2.0接口实现
- ✅ KDE桌面环境集成
- ✅ 实时状态同步
- ✅ 前端JavaScript集成
- ✅ 媒体键全局响应

### 计划功能
- 🔄 播放列表接口支持 (MPRIS TrackList)
- 🔄 播放速率控制
- 🔄 更多桌面环境优化

## 🤝 贡献

欢迎提交问题报告和功能请求！MPRIS功能的改进建议特别受欢迎。
