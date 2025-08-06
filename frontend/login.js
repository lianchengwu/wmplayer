// login.js - 登录相关功能模块
import {LoginService} from "./bindings/wmplayer";

// 用户登录状态管理
let isLoggedIn = false;
let userInfo = null;

// 二维码登录状态管理
let currentQRKey = null;
let qrPollingTimer = null;

// 用户头像功能
window.showUserProfile = () => {
    if (isLoggedIn) {
        // 已登录，显示用户信息弹窗
        showUserProfileModal();
    } else {
        // 未登录，显示登录弹窗
        showLoginModal();
    }
}

// 显示登录弹窗
function showLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden'; // 防止背景滚动

        // 重置表单
        resetLoginForm();

        // 默认显示手机号登录
        switchLoginTab('phone');
    }
}

// 隐藏登录弹窗
function hideLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = ''; // 恢复背景滚动

        // 清理二维码轮询
        clearQRPolling();
        currentQRKey = null;
    }
}

// 重置登录表单
function resetLoginForm() {
    const phoneForm = document.getElementById('phoneLoginForm');
    if (phoneForm) {
        phoneForm.reset();
    }

    // 重置发送验证码按钮
    const sendCodeBtn = document.getElementById('sendCodeBtn');
    if (sendCodeBtn) {
        sendCodeBtn.disabled = false;
        sendCodeBtn.textContent = '发送验证码';
    }
}

// 切换登录标签页
function switchLoginTab(tabType) {
    // 更新标签按钮状态
    document.querySelectorAll('.login-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabType) {
            btn.classList.add('active');
        }
    });

    // 更新内容显示
    document.querySelectorAll('.login-content').forEach(content => {
        content.classList.remove('active');
    });

    const targetContent = tabType === 'phone' ? 'phoneLogin' : 'qrcodeLogin';
    const contentElement = document.getElementById(targetContent);
    if (contentElement) {
        contentElement.classList.add('active');
    }

    console.log('切换到登录方式:', tabType === 'phone' ? '手机号登录' : '扫码登录');
}

// 发送验证码
async function sendVerificationCode() {
    const phoneInput = document.getElementById('phoneNumber');
    const sendCodeBtn = document.getElementById('sendCodeBtn');

    if (!phoneInput || !sendCodeBtn) return;

    const phoneNumber = phoneInput.value.trim();

    // 验证手机号格式
    if (!validatePhoneNumber(phoneNumber)) {
        alert('请输入正确的手机号');
        return;
    }

    // 禁用按钮并显示发送中状态
    sendCodeBtn.disabled = true;
    sendCodeBtn.textContent = '发送中...';

    try {
        // 调用后端API发送验证码
        console.log('发送验证码到:', phoneNumber);
        const response = await LoginService.SendCaptcha(phoneNumber);

        if (response.success) {
            // 发送成功，开始倒计时
            alert('验证码已发送，请注意查收');
            startCountdown(sendCodeBtn);
        } else {
            // 发送失败，显示错误信息
            alert(response.message || '验证码发送失败，请重试');
            sendCodeBtn.disabled = false;
            sendCodeBtn.textContent = '发送验证码';
        }
    } catch (error) {
        console.error('发送验证码失败:', error);
        alert('网络错误，请检查网络连接后重试');
        sendCodeBtn.disabled = false;
        sendCodeBtn.textContent = '发送验证码';
    }
}

// 开始倒计时
function startCountdown(button) {
    let countdown = 60;

    const updateCountdown = () => {
        if (countdown > 0) {
            button.textContent = `${countdown}秒后重发`;
            countdown--;
            setTimeout(updateCountdown, 1000);
        } else {
            button.disabled = false;
            button.textContent = '发送验证码';
        }
    };

    updateCountdown();
}

// 验证手机号格式
function validatePhoneNumber(phone) {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
}

// 处理手机号登录
async function handlePhoneLogin(event) {
    event.preventDefault();

    const phoneInput = document.getElementById('phoneNumber');
    const codeInput = document.getElementById('verificationCode');
    const loginBtn = document.querySelector('#phoneLoginForm button[type="submit"]');

    if (!phoneInput || !codeInput) return;

    const phoneNumber = phoneInput.value.trim();
    const verificationCode = codeInput.value.trim();

    // 验证输入
    if (!validatePhoneNumber(phoneNumber)) {
        alert('请输入正确的手机号');
        return;
    }

    if (!verificationCode || verificationCode.length !== 6) {
        alert('请输入6位验证码');
        return;
    }

    // 显示登录中状态
    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = '登录中...';
    }

    try {
        // 调用后端API进行登录
        console.log('手机号登录:', { phoneNumber, verificationCode });
        const response = await LoginService.LoginWithPhone(phoneNumber, verificationCode);

        if (response.success) {
            // 登录成功
            loginSuccess({
                phone: phoneNumber,
                loginMethod: 'phone',
                token: response.data.token,
                userid: response.data.userid,
                userData: response.data.user_info,
                rawData: response.raw_data
            });
        } else {
            // 登录失败，显示错误信息
            alert(response.message || '登录失败，请检查手机号和验证码');
        }
    } catch (error) {
        console.error('登录失败:', error);
        alert('网络错误，请检查网络连接后重试');
    } finally {
        // 恢复登录按钮状态
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.textContent = '登录';
        }
    }
}

// 登录成功处理
function loginSuccess(userData) {
    isLoggedIn = true;
    userInfo = userData;

    // 更新用户头像按钮
    updateAvatarButton();

    // 隐藏登录弹窗
    hideLoginModal();

    // 显示成功提示
    console.log('登录成功:', userData);
    // 移除登录成功的弹窗提示，直接进入应用
}

// 更新用户头像按钮
function updateAvatarButton() {
    const avatarBtn = document.querySelector('.avatar-btn');
    if (avatarBtn) {
        if (isLoggedIn && userInfo) {
            avatarBtn.title = '用户信息';

            // 如果有用户头像，显示用户头像
            if (userInfo.userData && userInfo.userData.pic) {
                // 创建头像图片元素
                const existingImg = avatarBtn.querySelector('img');
                if (existingImg) {
                    existingImg.src = userInfo.userData.pic;
                } else {
                    // 隐藏原有图标，添加头像图片
                    const icon = avatarBtn.querySelector('i');
                    if (icon) icon.style.display = 'none';

                    const avatarImg = document.createElement('img');
                    avatarImg.src = userInfo.userData.pic;
                    avatarImg.style.cssText = 'width: 24px; height: 24px; border-radius: 50%; object-fit: cover;';
                    avatarImg.onerror = () => {
                        // 头像加载失败时恢复图标
                        avatarImg.style.display = 'none';
                        if (icon) icon.style.display = '';
                    };
                    avatarBtn.appendChild(avatarImg);
                }
            }
        } else {
            avatarBtn.title = '登录';

            // 恢复默认图标
            const existingImg = avatarBtn.querySelector('img');
            if (existingImg) {
                existingImg.remove();
            }
            const icon = avatarBtn.querySelector('i');
            if (icon) icon.style.display = '';
        }
    }
}

// 生成二维码
async function generateQRCode() {
    const qrcodePlaceholder = document.getElementById('qrcodePlaceholder');
    if (!qrcodePlaceholder) return;

    // 清理之前的轮询
    clearQRPolling();

    // 显示加载状态
    qrcodePlaceholder.innerHTML = `
        <div style="width: 160px; height: 160px; background: #f0f0f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #666;">
            生成中...
        </div>
        <p>正在生成二维码，请稍候</p>
    `;

    try {
        // 第一步：生成二维码Key
        console.log('生成二维码Key...');
        const keyResponse = await LoginService.GenerateQRKey();

        if (!keyResponse.success) {
            throw new Error(keyResponse.message || '生成二维码Key失败');
        }

        currentQRKey = keyResponse.data.qrcode;
        console.log('二维码Key生成成功:', currentQRKey);

        // 第二步：根据Key生成二维码图片
        console.log('生成二维码图片...');
        const codeResponse = await LoginService.CreateQRCode(currentQRKey);

        if (!codeResponse.success) {
            throw new Error(codeResponse.message || '生成二维码图片失败');
        }

        // 显示二维码
        qrcodePlaceholder.innerHTML = `
            <img src="${codeResponse.data.base64}"
                 style="width: 160px; height: 160px; border-radius: 8px;"
                 alt="登录二维码" />
            <p class="qr-status">请使用酷狗扫描二维码登录</p>
        `;

        console.log('二维码生成成功');

        // 第三步：开始轮询检测扫码状态
        startQRCodePolling();

    } catch (error) {
        console.error('生成二维码失败:', error);
        qrcodePlaceholder.innerHTML = `
            <div style="width: 160px; height: 160px; background: #ffebee; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #c62828; text-align: center;">
                生成失败
                <br>
                <button onclick="generateQRCode()" style="margin-top: 8px; padding: 4px 8px; font-size: 10px;">重试</button>
            </div>
            <p class="qr-status" style="color: #c62828;">二维码生成失败，请点击重试</p>
        `;
    }
}

// 开始二维码扫描轮询
function startQRCodePolling() {
    if (!currentQRKey) {
        console.error('没有有效的二维码Key，无法开始轮询');
        return;
    }

    console.log('开始轮询二维码状态...');

    // 立即检查一次状态
    checkQRStatus();

    // 每3秒检查一次状态
    // 🔧 内存泄漏修复：使用全局资源管理器管理定时器
    if (window.GlobalResourceManager) {
        qrPollingTimer = window.GlobalResourceManager.addInterval(checkQRStatus, 3000);
    } else {
        qrPollingTimer = setInterval(checkQRStatus, 3000);
    }
}

// 检查二维码状态
async function checkQRStatus() {
    if (!currentQRKey) {
        clearQRPolling();
        return;
    }

    try {
        const response = await LoginService.CheckQRStatus(currentQRKey);

        if (!response.success) {
            console.error('检查二维码状态失败:', response.message);
            return;
        }

        const status = response.data.status;
        console.log('二维码状态:', status, response.message);

        // 更新UI状态提示
        updateQRStatusUI(status, response.message);

        // 根据状态处理
        switch (status) {
            case 0: // 二维码过期
                clearQRPolling();
                showQRExpired();
                break;
            case 1: // 等待扫码
                // 继续轮询
                break;
            case 2: // 已扫描，待确认
                // 继续轮询
                break;
            case 4: // 登录成功
                clearQRPolling();
                handleQRLoginSuccess(response.data);
                break;
            default:
                console.warn('未知的二维码状态:', status);
                break;
        }

    } catch (error) {
        console.error('检查二维码状态出错:', error);
    }
}

// 清理二维码轮询
function clearQRPolling() {
    if (qrPollingTimer) {
        // 🔧 内存泄漏修复：使用全局资源管理器清理定时器
        if (window.GlobalResourceManager) {
            window.GlobalResourceManager.removeInterval(qrPollingTimer);
        } else {
            clearInterval(qrPollingTimer);
        }
        qrPollingTimer = null;
    }
}

// 更新二维码状态UI
function updateQRStatusUI(status, message) {
    const qrcodePlaceholder = document.getElementById('qrcodePlaceholder');
    if (!qrcodePlaceholder) return;

    // 找到状态提示元素
    let statusElement = qrcodePlaceholder.querySelector('.qr-status');
    if (!statusElement) {
        // 如果没有状态元素，说明还没有生成二维码，直接返回
        return;
    }

    // 根据状态设置不同的样式和文本
    switch (status) {
        case 1: // 等待扫码
            statusElement.textContent = '请使用手机扫描二维码登录';
            statusElement.style.color = '#666';
            break;
        case 2: // 已扫描，待确认
            statusElement.textContent = '已扫描，请在手机上确认登录';
            statusElement.style.color = '#1976d2';
            break;
        case 4: // 登录成功
            statusElement.textContent = '登录成功！';
            statusElement.style.color = '#4caf50';
            break;
        default:
            statusElement.textContent = message || '未知状态';
            statusElement.style.color = '#666';
            break;
    }
}

// 处理二维码登录成功
function handleQRLoginSuccess(data) {
    console.log('二维码登录成功:', data);

    loginSuccess({
        loginMethod: 'qrcode',
        token: data.token,
        userid: data.userid,
        userData: {
            nickname: data.nickname,
            pic: data.pic,
            userid: data.userid
        },
        scanTime: new Date().toISOString()
    });
}

// 显示二维码过期
function showQRExpired() {
    const qrcodePlaceholder = document.getElementById('qrcodePlaceholder');
    if (!qrcodePlaceholder) return;

    qrcodePlaceholder.innerHTML = `
        <div style="width: 160px; height: 160px; background: #ffebee; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #c62828; text-align: center;">
            二维码已过期
            <br>
            <button onclick="refreshQRCode()" style="margin-top: 8px; padding: 4px 8px; font-size: 10px;">刷新</button>
        </div>
        <p class="qr-status" style="color: #c62828;">二维码已过期，请点击刷新</p>
    `;
}

// 刷新二维码
function refreshQRCode() {
    console.log('刷新二维码');
    clearQRPolling();
    currentQRKey = null;
    generateQRCode();
}

// 初始化登录模块
export function initLoginModule() {
    console.log('初始化登录模块');

    // 初始化登录弹窗事件
    initLoginModalEvents();

    // 初始化用户信息弹窗事件
    initUserProfileModalEvents();

    // 初始化用户头像按钮
    initAvatarButton();

    // 检查登录状态
    checkLoginStatusOnStartup();
}

// 初始化用户头像按钮
function initAvatarButton() {
    const avatarBtn = document.querySelector('.avatar-btn');
    if (avatarBtn) {
        avatarBtn.addEventListener('click', window.showUserProfile);
    }
}

// 初始化用户信息弹窗事件
function initUserProfileModalEvents() {
    // 关闭按钮
    const profileModalCloseBtn = document.getElementById('profileModalCloseBtn');
    const profileModalOverlay = document.getElementById('profileModalOverlay');
    const profileCloseBtn = document.getElementById('profileCloseBtn');

    if (profileModalCloseBtn) {
        profileModalCloseBtn.addEventListener('click', hideUserProfileModal);
    }

    if (profileModalOverlay) {
        profileModalOverlay.addEventListener('click', hideUserProfileModal);
    }

    if (profileCloseBtn) {
        profileCloseBtn.addEventListener('click', hideUserProfileModal);
    }

    // 退出登录按钮
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // 领取VIP按钮
    const claimVipBtn = document.getElementById('claimVipBtn');
    if (claimVipBtn) {
        claimVipBtn.addEventListener('click', handleClaimVip);
    }

    // ESC键关闭弹窗
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('userProfileModal');
            if (modal && modal.classList.contains('show')) {
                hideUserProfileModal();
            }
        }
    });
}

// 初始化登录弹窗事件
function initLoginModalEvents() {
    // 关闭按钮
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const modalOverlay = document.getElementById('modalOverlay');

    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', hideLoginModal);
    }

    if (modalOverlay) {
        modalOverlay.addEventListener('click', hideLoginModal);
    }

    // 标签页切换
    const phoneTab = document.getElementById('phoneTab');
    const qrcodeTab = document.getElementById('qrcodeTab');

    if (phoneTab) {
        phoneTab.addEventListener('click', () => switchLoginTab('phone'));
    }

    if (qrcodeTab) {
        qrcodeTab.addEventListener('click', () => {
            switchLoginTab('qrcode');
            generateQRCode(); // 切换到二维码时生成二维码
        });
    }

    // 手机号登录表单
    const phoneLoginForm = document.getElementById('phoneLoginForm');
    if (phoneLoginForm) {
        phoneLoginForm.addEventListener('submit', handlePhoneLogin);
    }

    // 发送验证码按钮
    const sendCodeBtn = document.getElementById('sendCodeBtn');
    if (sendCodeBtn) {
        sendCodeBtn.addEventListener('click', sendVerificationCode);
    }

    // 刷新二维码按钮
    const refreshQrcodeBtn = document.getElementById('refreshQrcodeBtn');
    if (refreshQrcodeBtn) {
        refreshQrcodeBtn.addEventListener('click', refreshQRCode);
    }

    // ESC键关闭弹窗
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('loginModal');
            if (modal && modal.classList.contains('show')) {
                hideLoginModal();
            }
        }
    });
}

// 获取登录状态
export function getLoginStatus() {
    return {
        isLoggedIn,
        userInfo
    };
}

// 登出功能
export function logout() {
    isLoggedIn = false;
    userInfo = null;
    updateAvatarButton();

    // 这里可以添加清理cookie文件的逻辑
    // 但由于安全考虑，前端无法直接删除本地文件
    // 可以考虑添加后端接口来清理cookie

    console.log('用户已登出');
}

// 显示用户信息弹窗
function showUserProfileModal() {
    if (!isLoggedIn || !userInfo) {
        console.error('用户未登录或用户信息不存在');
        return;
    }

    const modal = document.getElementById('userProfileModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';

        // 填充用户信息
        populateUserProfile();
    }
}

// 隐藏用户信息弹窗
function hideUserProfileModal() {
    const modal = document.getElementById('userProfileModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// 填充用户信息到弹窗
function populateUserProfile() {
    if (!userInfo) return;

    // 用户头像
    const avatarImg = document.getElementById('userAvatarImg');
    if (avatarImg && userInfo.userData && userInfo.userData.pic) {
        avatarImg.src = userInfo.userData.pic;
        avatarImg.onerror = () => {
            // 如果头像加载失败，使用默认头像
            avatarImg.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iNDAiIGZpbGw9IiNFNUU3RUIiLz4KPGNpcmNsZSBjeD0iNDAiIGN5PSIzMiIgcj0iMTIiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTIwIDY4QzIwIDU2IDI4IDQ4IDQwIDQ4UzYwIDU2IDYwIDY4IiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo=';
        };
    }

    // 用户昵称
    const nicknameElement = document.getElementById('userNickname');
    if (nicknameElement && userInfo.userData && userInfo.userData.nickname) {
        nicknameElement.textContent = userInfo.userData.nickname;
    }

    // VIP状态
    const vipStatusElement = document.getElementById('userVipStatus');
    if (vipStatusElement && userInfo.userData) {
        const isVip = userInfo.userData.is_vip || userInfo.userData.vip_type > 0 || userInfo.userData.vip_level > 0;

        if (isVip) {
            let vipText = 'VIP';

            // 优先使用VIP详情中的类型信息
            if (userInfo.userData.vip_detail && userInfo.userData.vip_detail.product_type) {
                vipText = userInfo.userData.vip_detail.product_type;
            } else if (userInfo.userData.vip_level) {
                vipText = `VIP ${userInfo.userData.vip_level}`;
            }

            vipStatusElement.textContent = vipText;
            vipStatusElement.className = 'vip-badge';
        } else {
            vipStatusElement.textContent = '普通用户';
            vipStatusElement.className = 'vip-badge normal';
        }
    }

    // 用户ID
    const userIdElement = document.getElementById('userIdDisplay');
    if (userIdElement && userInfo.userid) {
        userIdElement.textContent = userInfo.userid.toString();
    }

    // 登录方式
    const loginMethodElement = document.getElementById('loginMethodDisplay');
    if (loginMethodElement && userInfo.loginMethod) {
        let methodText;
        switch (userInfo.loginMethod) {
            case 'qrcode':
                methodText = '扫码登录';
                break;
            case 'phone':
                methodText = '手机号登录';
                break;
            case 'unknown':
                methodText = '未知方式';
                break;
            default:
                methodText = userInfo.loginMethod;
        }
        loginMethodElement.textContent = methodText;
    }

    // 登录时间
    const loginTimeElement = document.getElementById('loginTimeDisplay');
    if (loginTimeElement) {
        let loginTime;
        if (userInfo.userData && userInfo.userData.login_time) {
            // 使用后端返回的真实登录时间（秒时间戳）
            loginTime = new Date(userInfo.userData.login_time * 1000);
        } else if (userInfo.scanTime) {
            // 兼容扫码登录时的时间
            loginTime = new Date(userInfo.scanTime);
        } else if (userInfo.loginTime) {
            // 使用设置的登录时间
            loginTime = new Date(userInfo.loginTime);
        } else {
            // 默认使用当前时间
            loginTime = new Date();
        }
        const formattedTime = loginTime.toLocaleString('zh-CN');
        loginTimeElement.textContent = formattedTime;
    }

    // VIP详情信息
    const vipTypeItem = document.getElementById('vipTypeItem');
    const vipTypeDisplay = document.getElementById('vipTypeDisplay');
    const vipEndTimeItem = document.getElementById('vipEndTimeItem');
    const vipEndTimeDisplay = document.getElementById('vipEndTimeDisplay');

    if (userInfo.userData && userInfo.userData.vip_detail) {
        const vipDetail = userInfo.userData.vip_detail;

        // 显示VIP类型
        if (vipDetail.product_type && vipTypeItem && vipTypeDisplay) {
            vipTypeDisplay.textContent = vipDetail.product_type;
            vipTypeItem.style.display = 'flex';
        }

        // 显示VIP结束时间
        if (vipDetail.vip_end_time && vipEndTimeItem && vipEndTimeDisplay) {
            vipEndTimeDisplay.textContent = vipDetail.vip_end_time;
            vipEndTimeItem.style.display = 'flex';
        }
    } else {
        // 如果没有VIP详情，隐藏相关元素
        if (vipTypeItem) vipTypeItem.style.display = 'none';
        if (vipEndTimeItem) vipEndTimeItem.style.display = 'none';
    }
}

// 处理退出登录
function handleLogout() {
    logout();
    hideUserProfileModal();
    console.log('用户已退出登录');
}

// 处理领取VIP
async function handleClaimVip() {
    const claimVipBtn = document.getElementById('claimVipBtn');
    if (!claimVipBtn) return;

    try {
        // 设置按钮为加载状态
        claimVipBtn.disabled = true;
        claimVipBtn.classList.add('loading');
        const originalText = claimVipBtn.querySelector('span').textContent;
        claimVipBtn.querySelector('span').textContent = '领取中...';
        claimVipBtn.querySelector('i').className = 'fas fa-spinner';

        // 调用后端API
        const response = await LoginService.ClaimDailyVip();

        if (response.success) {
            // 领取成功
            claimVipBtn.querySelector('span').textContent = '领取成功';
            claimVipBtn.querySelector('i').className = 'fas fa-check';
            claimVipBtn.style.background = 'linear-gradient(135deg, #4caf50, #66bb6a)';

            // 显示成功消息
            console.log('VIP领取成功:', response.message);

            // 3秒后恢复按钮状态
            setTimeout(() => {
                claimVipBtn.querySelector('span').textContent = originalText;
                claimVipBtn.querySelector('i').className = 'fas fa-gift';
                claimVipBtn.style.background = '';
                claimVipBtn.disabled = false;
                claimVipBtn.classList.remove('loading');
            }, 3000);

        } else {
            // 领取失败
            claimVipBtn.querySelector('span').textContent = '领取失败';
            claimVipBtn.querySelector('i').className = 'fas fa-exclamation-triangle';
            claimVipBtn.style.background = 'linear-gradient(135deg, #f44336, #ef5350)';

            console.error('VIP领取失败:', response.message);

            // 3秒后恢复按钮状态
            setTimeout(() => {
                claimVipBtn.querySelector('span').textContent = originalText;
                claimVipBtn.querySelector('i').className = 'fas fa-gift';
                claimVipBtn.style.background = '';
                claimVipBtn.disabled = false;
                claimVipBtn.classList.remove('loading');
            }, 3000);
        }

    } catch (error) {
        console.error('领取VIP时发生错误:', error);

        // 恢复按钮状态
        claimVipBtn.querySelector('span').textContent = '网络错误';
        claimVipBtn.querySelector('i').className = 'fas fa-exclamation-triangle';
        claimVipBtn.style.background = 'linear-gradient(135deg, #f44336, #ef5350)';

        setTimeout(() => {
            claimVipBtn.querySelector('span').textContent = '领取VIP';
            claimVipBtn.querySelector('i').className = 'fas fa-gift';
            claimVipBtn.style.background = '';
            claimVipBtn.disabled = false;
            claimVipBtn.classList.remove('loading');
        }, 3000);
    }
}

// 检查登录状态（应用启动时调用）
async function checkLoginStatusOnStartup() {
    console.log('检查登录状态...');

    try {
        const response = await LoginService.CheckLoginStatus();

        if (response.success) {
            // 登录状态有效，设置用户信息
            console.log('登录状态有效，用户信息:', response.data);

            isLoggedIn = true;
            userInfo = {
                loginMethod: response.data.user_info.login_method || 'unknown', // 使用后端返回的登录方式
                userid: response.data.userid,
                userData: {
                    nickname: response.data.user_info.nickname,
                    pic: response.data.user_info.pic,
                    userid: response.data.userid,
                    vip_type: response.data.user_info.vip_type,
                    vip_level: response.data.user_info.vip_level,
                    is_vip: response.data.user_info.is_vip,
                    login_time: response.data.user_info.login_time,
                    login_method: response.data.user_info.login_method,
                    vip_detail: response.data.user_info.vip_detail // 添加VIP详情信息
                },
                loginTime: response.data.user_info.login_time ? new Date(response.data.user_info.login_time * 1000).toISOString() : new Date().toISOString()
            };

            // 更新头像按钮
            updateAvatarButton();

            console.log('自动登录成功:', userInfo.userData.nickname);
        } else {
            // 登录状态无效
            console.log('登录状态无效:', response.message);

            // 清理登录状态
            isLoggedIn = false;
            userInfo = null;
            updateAvatarButton();
        }
    } catch (error) {
        console.error('检查登录状态失败:', error);

        // 出错时清理登录状态
        isLoggedIn = false;
        userInfo = null;
        updateAvatarButton();
    }
}

// 获取用户详情
async function getUserDetail() {
    try {
        const response = await LoginService.GetUserDetail();

        if (response.success) {
            console.log('获取用户详情成功:', response.data);
            return response.data;
        } else {
            console.error('获取用户详情失败:', response.message);
            return null;
        }
    } catch (error) {
        console.error('获取用户详情出错:', error);
        return null;
    }
}

// 暴露二维码相关函数到全局作用域，供HTML调用
window.generateQRCode = generateQRCode;
window.refreshQRCode = refreshQRCode;