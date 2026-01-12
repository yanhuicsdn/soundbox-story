// ===== 全局变量 =====
let selectedProduct = null;
let recordedBlob = null;
let mediaRecorder = null;
let audioChunks = [];
let orderData = {};

// 产品信息
const products = {
    sleep: {
        name: '哄睡故事包',
        price: 79
    },
    brave: {
        name: '勇敢成长包',
        price: 79
    },
    emotion: {
        name: '情绪管理包',
        price: 79
    },
    combo: {
        name: '全能组合包',
        price: 199
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
    orderData.childAge = document.getElementById('child-age').value;
    orderData.email = document.getElementById('email').value;
    orderData.wechat = document.getElementById('wechat').value;

    // 切换到录音界面
    document.getElementById('order-form').style.display = 'none';
    document.getElementById('recording-section').style.display = 'block';

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

            // 显示试听和确认按钮
            playRecordBtn.style.display = 'inline-block';
            confirmRecordingBtn.style.display = 'inline-block';
        };

        // 开始录音
        mediaRecorder.start();
        recordingStatus.textContent = '🔴 正在录音...';
        recordingStatus.classList.add('recording');

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
        audioPreview.play();
    }
}

function reRecord() {
    // 重置录音状态
    recordedBlob = null;
    audioChunks = [];
    audioPreview.src = '';
    audioPreview.style.display = 'none';

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
document.getElementById('submitPayment').addEventListener('click', async function() {
    const paymentMethod = document.querySelector('input[name="payment"]:checked').value;

    // 禁用按钮,防止重复提交
    this.disabled = true;
    this.textContent = '处理中...';

    try {
        // TODO: 这里需要对接你的后端API
        // 1. 上传录音文件
        // 2. 提交订单数据
        // 3. 获取支付链接

        // 模拟API调用
        await uploadRecordingAndOrder();

        // 跳转到支付页面
        if (paymentMethod === 'wechat') {
            // 微信支付
            window.location.href = 'https://pay.weixin.qq.com/'; // 替换为实际的支付链接
        } else {
            // 支付宝
            window.location.href = 'https://www.alipay.com/'; // 替换为实际的支付链接
        }

    } catch (error) {
        console.error('支付失败:', error);
        alert('订单提交失败,请重试。错误信息: ' + error.message);
        this.disabled = false;
        this.textContent = '立即支付';
    }
});

async function uploadRecordingAndOrder() {
    // 准备FormData
    const formData = new FormData();
    formData.append('audio', recordedBlob, 'recording.wav');
    formData.append('childName', orderData.childName);
    formData.append('voiceType', orderData.voiceType);
    formData.append('email', orderData.email);
    formData.append('childAge', orderData.childAge || '');
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
