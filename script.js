// ===== 全局变量 =====
let selectedProduct = null;
let recordedBlob = null;
let mediaRecorder = null;
let audioChunks = [];
let orderData = {};
let karaokeTimer = null;
let recordingStartTime = null;
let karaokeInterval = null;

// 录音文本和时间轴(单位:毫秒) - 按逗号分句
const recordingText = [
    { text: '小兔子乖乖，把门儿开开，', duration: 4000 },
    { text: '快点儿开开，我要进来。', duration: 3000 },
    { text: '从前有一座大山，山里住着一只小熊。', duration: 3500 }
];

// 产品信息
const products = {
    trial: {
        name: '体验包',
        price: 19,
        duration: '30分钟',
        description: '精选短篇故事，快速体验AI定制语音'
    },
    age1to3: {
        name: '1-3岁故事包',
        price: 79,
        duration: '120分钟',
        description: '适合幼儿，语言简单，情节重复'
    },
    age4to6: {
        name: '4-6岁故事包',
        price: 79,
        duration: '120分钟',
        description: '适合学龄前儿童，情节丰富有趣'
    },
    age6to11: {
        name: '6-11岁故事包',
        price: 79,
        duration: '120分钟',
        description: '适合学龄儿童，情节复杂有深度'
    },
    sleep: {
        name: '哄睡故事包',
        price: 79,
        duration: '120分钟',
        description: '温柔安静，帮助孩子入睡'
    },
    brave: {
        name: '勇敢成长包',
        price: 79,
        duration: '120分钟',
        description: '培养勇气和探索精神'
    },
    emotion: {
        name: '情绪管理包',
        price: 79,
        duration: '120分钟',
        description: '帮助孩子理解和管理情绪'
    },
    combo: {
        name: '全能组合包',
        price: 199,
        duration: '360分钟',
        description: '包含全部三个场景故事包'
    }
};

// ===== 产品选择 =====
function selectProduct(productId) {
    selectedProduct = productId;
    orderData.product = products[productId];

    // 打开模态框
    document.getElementById('order-modal').style.display = 'block';
    document.getElementById('selected-product').value = orderData.product.name;

    // 重置表单状态
    document.getElementById('order-form').style.display = 'block';
    document.getElementById('recording-section').style.display = 'none';
    document.getElementById('payment-section').style.display = 'none';
}

// ===== 模态框控制 =====
const modal = document.getElementById('order-modal');
const closeBtn = document.getElementsByClassName('close')[0];

closeBtn.onclick = function() {
    modal.style.display = 'none';
    resetForm();
}

window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = 'none';
        resetForm();
    }
}

function resetForm() {
    document.getElementById('orderForm').reset();
    document.getElementById('recording-section').style.display = 'none';
    document.getElementById('payment-section').style.display = 'none';
    document.getElementById('order-form').style.display = 'block';
    recordedBlob = null;
    audioChunks = [];

    // 重置录音按钮
    document.getElementById('startRecord').style.display = 'inline-block';
    document.getElementById('stopRecord').style.display = 'none';
    document.getElementById('playRecord').style.display = 'none';
    document.getElementById('reRecord').style.display = 'none';
    document.getElementById('confirmRecording').style.display = 'none';
    document.getElementById('audioPreview').style.display = 'none';
    document.getElementById('recording-status').textContent = '';
}

// ===== 表单提交 =====
function submitOrder(event) {
    event.preventDefault();

    // 收集表单数据
    orderData.childName = document.getElementById('child-name').value;
    orderData.voiceType = document.getElementById('voice-type').value;
    orderData.email = document.getElementById('email').value;
    orderData.wechat = document.getElementById('wechat').value;

    // 切换到录音界面
    document.getElementById('order-form').style.display = 'none';
    document.getElementById('recording-section').style.display = 'block';

    // 初始化卡拉OK文本
    initKaraokeText();

    // 滚动到顶部
    document.querySelector('.modal-content').scrollTop = 0;
}

// ===== 录音功能 =====
const startRecordBtn = document.getElementById('startRecord');
const stopRecordBtn = document.getElementById('stopRecord');
const playRecordBtn = document.getElementById('playRecord');
const reRecordBtn = document.getElementById('reRecord');
const confirmRecordingBtn = document.getElementById('confirmRecording');
const audioPreview = document.getElementById('audioPreview');
const recordingStatus = document.getElementById('recording-status');

startRecordBtn.addEventListener('click', startRecording);
stopRecordBtn.addEventListener('click', stopRecording);
playRecordBtn.addEventListener('click', playRecording);
reRecordBtn.addEventListener('click', reRecord);
confirmRecordingBtn.addEventListener('click', proceedToPayment);

async function startRecording() {
    try {
        // 请求麦克风权限
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // 创建MediaRecorder实例
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = function(event) {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = function() {
            recordedBlob = new Blob(audioChunks, { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(recordedBlob);
            audioPreview.src = audioUrl;

            // 停止卡拉OK更新
            stopKaraoke();

            // 显示试听和确认按钮
            playRecordBtn.style.display = 'inline-block';
            confirmRecordingBtn.style.display = 'inline-block';
        };

        // 开始录音
        mediaRecorder.start();
        recordingStartTime = Date.now();
        recordingStatus.textContent = '🔴 正在录音...';
        recordingStatus.classList.add('recording');

        // 启动卡拉OK高亮更新
        karaokeInterval = setInterval(() => {
            const elapsedTime = Date.now() - recordingStartTime;
            updateKaraokeHighlight(elapsedTime);
        }, 50); // 每50毫秒更新一次

        // 更新按钮显示
        startRecordBtn.style.display = 'none';
        stopRecordBtn.style.display = 'inline-block';

    } catch (error) {
        console.error('录音失败:', error);
        alert('无法访问麦克风,请确保已授予麦克风权限。\\n\\n错误信息: ' + error.message);
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());

        recordingStatus.textContent = '✅ 录音完成!';
        recordingStatus.classList.remove('recording');

        // 更新按钮显示
        stopRecordBtn.style.display = 'none';
        reRecordBtn.style.display = 'inline-block';
    }
}

function playRecording() {
    if (audioPreview.src) {
        audioPreview.style.display = 'block';

        // 重置卡拉OK状态
        resetKaraoke();

        // 播放时也启动卡拉OK更新
        audioPreview.play();
        recordingStartTime = Date.now();

        karaokeInterval = setInterval(() => {
            const elapsedTime = Date.now() - recordingStartTime;
            if (elapsedTime >= 17000) { // 17秒后停止
                stopKaraoke();
            }
            updateKaraokeHighlight(elapsedTime);
        }, 50);

        // 播放结束时停止更新
        audioPreview.onended = () => {
            stopKaraoke();
        };
    }
}

function reRecord() {
    // 停止卡拉OK
    stopKaraoke();

    // 重置录音状态
    recordedBlob = null;
    audioChunks = [];
    audioPreview.src = '';
    audioPreview.style.display = 'none';

    // 重置卡拉OK状态
    resetKaraoke();

    // 重置按钮
    startRecordBtn.style.display = 'inline-block';
    stopRecordBtn.style.display = 'none';
    playRecordBtn.style.display = 'none';
    reRecordBtn.style.display = 'none';
    confirmRecordingBtn.style.display = 'none';
    recordingStatus.textContent = '';
}

function proceedToPayment() {
    if (!recordedBlob) {
        alert('请先完成录音!');
        return;
    }

    // 切换到支付界面
    document.getElementById('recording-section').style.display = 'none';
    document.getElementById('payment-section').style.display = 'block';

    // 填充订单摘要
    document.getElementById('summary-product').textContent = orderData.product.name;
    document.getElementById('summary-name').textContent = orderData.childName + '（' + orderData.voiceType + '的声音）';
    document.getElementById('summary-email').textContent = orderData.email;
    document.getElementById('summary-price').textContent = '¥' + orderData.product.price;

    // 滚动到顶部
    document.querySelector('.modal-content').scrollTop = 0;
}

// ===== 支付提交 =====
document.getElementById('submitPayment').addEventListener('click', function() {
    // 禁用按钮,防止重复提交
    this.disabled = true;
    this.textContent = '跳转中...';

    // 生成订单ID
    const orderId = 'SB' + Date.now();

    // 构建支付页面URL参数
    const params = new URLSearchParams({
        orderId: orderId,
        product: orderData.product.name,
        amount: orderData.product.price,
        childName: orderData.childName,
        voiceType: orderData.voiceType,
        email: orderData.email
    });

    // 跳转到支付页面
    const payUrl = window.location.origin + '/payment-integration.html?' + params.toString();

    console.log('跳转到支付页面:', payUrl);
    window.location.href = payUrl;
});

async function uploadRecordingAndOrder() {
    // 准备FormData
    const formData = new FormData();
    formData.append('audio', recordedBlob, 'recording.wav');
    formData.append('childName', orderData.childName);
    formData.append('voiceType', orderData.voiceType);
    formData.append('email', orderData.email);
    formData.append('wechat', orderData.wechat || '');
    formData.append('product', JSON.stringify(orderData.product));

    // 发送到邮件服务器
    // 注意: 需要将下面的URL替换为你的实际服务器地址
    const apiUrl = 'http://localhost:3000/api/send-recording'; // 本地开发

    // 生产环境请替换为实际的服务器地址,例如:
    // const apiUrl = 'https://your-server.com/api/send-recording';

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '服务器错误');
        }

        return await response.json();
    } catch (error) {
        console.error('提交订单失败:', error);
        throw error;
    }
}

// ===== 平滑滚动 =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// ===== 导航栏滚动效果 =====
let lastScroll = 0;
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll <= 0) {
        navbar.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    } else {
        navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
    }

    lastScroll = currentScroll;
});

// ===== 页面加载动画 =====
document.addEventListener('DOMContentLoaded', function() {
    // 初始化卡拉OK文本
    initKaraokeText();

    // 添加淡入动画
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // 观察所有需要动画的元素
    const animatedElements = document.querySelectorAll('.pain-card, .feature, .product-card, .testimonial-card, .faq-item');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});

// ===== 浏览器兼容性检查 =====
function checkBrowserSupport() {
    // 检查是否支持MediaRecorder API
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('您的浏览器不支持录音功能,请使用Chrome、Firefox或Safari最新版本。');
        return false;
    }

    // 检查是否支持WebSocket(用于实时进度)
    if (!window.WebSocket) {
        console.warn('浏览器不支持WebSocket,将无法显示实时进度');
    }

    return true;
}

// 页面加载时检查浏览器支持
checkBrowserSupport();

// ===== 调试信息 =====
console.log('声宝盒网站已加载');
console.log('浏览器支持:', {
    mediaDevices: !!navigator.mediaDevices,
    getUserMedia: !!navigator.mediaDevices?.getUserMedia,
    mediaRecorder: !!window.MediaRecorder,
    webSocket: !!window.WebSocket
});
// ===== 卡拉OK功能 =====

// 初始化卡拉OK文本
function initKaraokeText() {
    const container = document.getElementById('karaoke-text');
    if (!container) return;

    container.innerHTML = '';
    let currentTime = 0;

    recordingText.forEach((line, lineIndex) => {
        const lineElement = document.createElement('span');
        lineElement.className = 'karaoke-line';
        lineElement.textContent = line.text;
        lineElement.dataset.lineIndex = lineIndex;
        lineElement.dataset.activateTime = currentTime;
        lineElement.dataset.duration = line.duration;

        container.appendChild(lineElement);
        currentTime += line.duration;
    });
}

// 更新卡拉OK高亮
function updateKaraokeHighlight(elapsedTime) {
    const lines = document.querySelectorAll('.karaoke-line');

    lines.forEach(line => {
        const activateTime = parseFloat(line.dataset.activateTime);
        const duration = parseFloat(line.dataset.duration);

        if (elapsedTime >= activateTime && elapsedTime < activateTime + duration) {
            // 当前正在读的句子
            line.classList.add('active');
            line.classList.remove('completed');
        } else if (elapsedTime >= activateTime + duration) {
            // 已读完的句子
            line.classList.remove('active');
            line.classList.add('completed');
        } else {
            // 还未读的句子
            line.classList.remove('active', 'completed');
        }
    });
}

// 重置卡拉OK状态
function resetKaraoke() {
    const lines = document.querySelectorAll('.karaoke-line');
    lines.forEach(line => {
        line.classList.remove('active', 'completed');
    });
}

// 停止卡拉OK更新
function stopKaraoke() {
    if (karaokeInterval) {
        clearInterval(karaokeInterval);
        karaokeInterval = null;
    }
}
