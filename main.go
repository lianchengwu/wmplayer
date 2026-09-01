package main

import (
	"context"
	"embed"
	"log"
	"os"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/services/notifications"
)

// 全局缓存服务实例
var globalCacheService *CacheService

// Wails uses Go's `embed` package to embed the frontend files into the binary.
// Any files in the frontend/dist folder will be embedded into the binary and
// made available to the frontend.
// See https://pkg.go.dev/embed for more information.

//go:embed all:frontend/dist
var assets embed.FS

// 嵌入自定义图标
//
//go:embed build/tray-icon.png
var customIcon []byte

// main function serves as the application's entry point. It initializes the application, creates a window,
// and starts a goroutine that emits a time-based event every second. It subsequently runs the application and
// logs any error that might occur.
func main() {
	// 打印环境信息用于调试
	log.Printf("DISPLAY: %s", os.Getenv("DISPLAY"))
	log.Printf("XDG_CURRENT_DESKTOP: %s", os.Getenv("XDG_CURRENT_DESKTOP"))
	log.Printf("WAYLAND_DISPLAY: %s", os.Getenv("WAYLAND_DISPLAY"))

	// 自动启动/连接 KuGouMusicApi 后台服务
	GlobalAPIManager.Start()

	// 在程序启动时初始化Cookie管理器
	log.Printf("🍪 初始化Cookie管理器...")
	if err := InitializeCookieManager(); err != nil {
		log.Printf("❌ 初始化Cookie管理器失败: %v", err)
	} else {
		log.Printf("✅ Cookie管理器初始化成功")
		if GlobalCookieManager.IsLoggedIn() {
			log.Printf("🔐 检测到已保存的登录状态")
		} else {
			log.Printf("🔓 未检测到登录状态")
		}
	}

	// 在程序启动时加载设置文件并打印
	log.Printf("🔧 程序启动，开始加载设置文件...")
	settingsService := NewSettingsService()
	response, err := settingsService.LoadSettings()
	if err != nil {
		log.Printf("❌ 加载设置文件失败: %v", err)
	} else {
		log.Printf("✅ 设置文件加载成功: %s", response.Message)
		if response.Success {
			log.Printf("📋 设置内容:")
			log.Printf("   播放设置: AutoPlay=%v, Volume=%d", response.Data.Playback.AutoPlay, response.Data.Playback.Volume)
			log.Printf("   界面设置: Theme=%s, Language=%s", response.Data.Interface.Theme, response.Data.Interface.Language)
			log.Printf("   关闭行为: %s", response.Data.Behavior.CloseAction)
			log.Printf("   启动最小化: %v", response.Data.Behavior.StartMinimized)
			log.Printf("   自动启动: %v", response.Data.Behavior.AutoStart)
		}
	}

	// Create a new Wails application by providing the necessary options.
	// Variables 'Name' and 'Description' are for application metadata.
	// 'Assets' configures the asset server with the 'FS' variable pointing to the frontend files.
	// 'Bind' is a list of Go struct instances. The frontend has access to the methods of these instances.
	// 'Mac' options tailor the application when running an macOS.

	// 创建缓存服务实例
	cacheService := NewCacheService()
	globalCacheService = cacheService // 设置全局实例

	// 创建首页服务实例，传入缓存服务
	homepageService := NewHomepageService(cacheService)

	// 创建媒体键服务实例
	mediaKeyService := NewMediaKeyService()

	// 创建更新服务与原生系统通知服务
	updateService := NewUpdateService()
	notificationService := notifications.New()

	// 启动HTTP服务器，传入OSD歌词服务以支持SSE
	if err := cacheService.StartHTTPServerWithOSDLyrics(); err != nil {
		log.Printf("❌ 启动HTTP缓存服务器失败: %v", err)
	}

	var app *application.App
	app = application.New(application.Options{
		Name:        "wmplayer",
		Description: "wmplayer - 一个基于 GOLANG 技术的音乐播放器",
		Services: []application.Service{
			application.NewService(&LoginService{}),
			application.NewService(homepageService),
			application.NewService(&SearchService{}),
			application.NewService(&DiscoverService{}),
			application.NewService(&AlbumService{}),
			application.NewService(&LocalMusicService{}),
			application.NewService(&PlayHistoryService{}),
			application.NewService(&FavoritesService{}),
			application.NewService(&PlaylistService{}),
			application.NewService(cacheService),
			application.NewService(NewSettingsService()),
			application.NewService(NewDownloadService()),
			application.NewService(mediaKeyService),
			application.NewService(updateService),
			application.NewService(notificationService),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		SingleInstance: &application.SingleInstanceOptions{
			UniqueID: "com.wmplayer.app",
			OnSecondInstanceLaunch: func(data application.SecondInstanceData) {
				log.Printf("🔔 收到多开请求，激活当前播放器窗口...")
				if currentWindow := app.Window.Current(); currentWindow != nil {
					currentWindow.Show()
					currentWindow.Focus()
					currentWindow.Restore()
				}
			},
		},
		OnShutdown: func() {
			log.Printf("🔴 正在退出应用，执行全局清理...")
			mediaKeyService.UnregisterMediaKeys()
			if cacheService != nil {
				cacheService.stopOSDLyricsProcess()
				if stopErr := cacheService.StopHTTPServer(); stopErr != nil {
					log.Printf("❌ 停止HTTP缓存服务器失败: %v", stopErr)
				}
			}
			GlobalAPIManager.Stop()
			log.Printf("✅ 全局清理完成")
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
		Linux: application.LinuxOptions{
			ProgramName: "wmplayer",
		},
	})

	// 初始化更新服务
	updateService.SetApp(app)
	_ = updateService.InitUpdater()

	// 创建窗口并配置原生属性
	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:                      "wmplayer",
		Height:                     900,
		Width:                      1600,
		MinWidth:                   1024,
		MinHeight:                  640,
		Frameless:                  true,
		InitialPosition:            application.WindowCentered,
		DefaultContextMenuDisabled: true,
		BackgroundColour:           application.NewRGB(248, 250, 252),
		URL:                        "/",
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 50,
			Backdrop:                application.MacBackdropTranslucent,
			TitleBar:                application.MacTitleBarHiddenInset,
		},
		Linux: application.LinuxWindow{
			Icon: customIcon,
		},
	})

	// 创建系统托盘图标
	systemTray := app.SystemTray.New()
	systemTray.SetLabel("wmplayer")
	systemTray.SetIcon(customIcon)
	systemTray.SetTooltip("wmplayer")

	// 设置双击事件 - 显示/隐藏窗口（作为左键点击的替代）
	// systemTray.OnClick(func() {
	// 	currentWindow := app.Window.Current()
	// 	if currentWindow != nil {
	// 		if currentWindow.IsVisible() {
	// 			currentWindow.Hide()
	// 		} else {
	// 			currentWindow.Show()
	// 			currentWindow.Center()
	// 		}
	// 	}
	// })
	// 创建系统托盘菜单（右键菜单）
	myMenu := app.Menu.New()

	// 显示/隐藏主窗口 - 移到菜单顶部作为主要功能
	myMenu.Add("🏠 显示/隐藏主窗口").OnClick(func(ctx *application.Context) {
		currentWindow := app.Window.Current()
		if currentWindow != nil {
			if currentWindow.IsVisible() {
				currentWindow.Hide()
			} else {
				currentWindow.Show()
				currentWindow.Center()
			}
		}
	})

	myMenu.AddSeparator()

	// 播放/暂停
	playPauseItem := myMenu.Add("⏯ 播放/暂停")
	playPauseItem.OnClick(func(ctx *application.Context) {
		log.Printf("🎵 托盘菜单: 播放/暂停")
		// 使用正确的Wails3事件API发送到前端
		app.Event.Emit("systray:toggle-play-pause", nil)
	})

	// 上一首
	prevItem := myMenu.Add("⏮ 上一首")
	prevItem.OnClick(func(ctx *application.Context) {
		log.Printf("🎵 托盘菜单: 上一首")
		// 使用正确的Wails3事件API发送到前端
		app.Event.Emit("systray:previous-song", nil)
	})

	// 下一首
	nextItem := myMenu.Add("⏭ 下一首")
	nextItem.OnClick(func(ctx *application.Context) {
		log.Printf("🎵 托盘菜单: 下一首")
		// 使用正确的Wails3事件API发送到前端
		app.Event.Emit("systray:next-song", nil)
	})

	// 喜欢当前歌曲
	favoriteItem := myMenu.Add("♥️ 喜欢当前歌曲")
	favoriteItem.OnClick(func(ctx *application.Context) {
		log.Printf("🎵 托盘菜单: 喜欢当前歌曲")
		// 使用正确的Wails3事件API发送到前端
		app.Event.Emit("systray:favorite-song", nil)
	})

	myMenu.AddSeparator()

	// 桌面歌词开关
	osdLyricsItem := myMenu.Add("🎵 桌面歌词")
	osdLyricsItem.OnClick(func(ctx *application.Context) {
		log.Printf("🎵 托盘菜单: 切换桌面歌词")
		// 使用正确的Wails3事件API发送到前端
		app.Event.Emit("systray:toggle-osd-lyrics", nil)
	})

	myMenu.AddSeparator()

	// 退出应用
	myMenu.Add("⏏ 退出应用").OnClick(func(_ *application.Context) {
		app.Quit()
	})

	// 设置右键菜单
	systemTray.SetMenu(myMenu)

	// 🔧 内存泄漏修复：移除无限循环的时间事件goroutine
	// 原代码会导致内存持续增长，因为：
	// 1. 每秒创建新的时间字符串
	// 2. 持续发送事件到前端（前端可能不需要）
	// 3. 无法正确退出，导致goroutine泄漏
	// 如果前端需要时间显示，建议使用前端的定时器实现

	// 设置媒体键服务的应用实例
	mediaKeyService.SetApp(app)
	mediaKeyService.SetContext(context.Background())

	// 注册媒体键（在应用启动后）
	go func() {
		// 等待应用完全启动
		time.Sleep(2 * time.Second)
		err := mediaKeyService.RegisterMediaKeys()
		if err != nil {
			log.Printf("❌ 媒体键注册失败: %v", err)
		}
	}()

	// 运行应用（阻塞直到退出）
	err = app.Run()
	if err != nil {
		log.Fatal(err)
	}
}

// GetCacheService 获取全局缓存服务实例
func GetCacheService() *CacheService {
	return globalCacheService
}
