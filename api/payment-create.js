/**
 * Vercel Serverless Function - 创建支付订单
 * 路径: /api/payment-create
 */

const crypto = require('crypto');

// PayQixiang 配置
const PAY_CONFIG = {
    apiUrl: 'https://api.payqixiang.cn/',
    pid: '2999',
    key: 'hkd9KnN9ets4NZB7sGtK1s2zt7abhinH',
    // 异步通知地址 - 需要配置为 Vercel 域名
    notifyUrl: 'https://story.66668888.cloud/api/payment-notify',
    // 同步跳转地址
    returnUrl: 'https://story.66668888.cloud/payment-result'
};

// MD5 签名函数 - 根据文档,MD5结果为小写
function signParams(params, key) {
    const filteredParams = Object.keys(params)
        .filter(key => params[key] !== '' && params[key] !== null && params[key] !== undefined && key !== 'sign' && key !== 'sign_type')
        .sort()
        .reduce((result, key) => {
            result[key] = params[key];
            return result;
        }, {});

    const signContent = Object.keys(filteredParams)
        .map(key => `${key}=${filteredParams[key]}`)
        .join('&') + key;

    const sign = crypto
        .createHash('md5')
        .update(signContent, 'utf8')
        .digest('hex'); // 小写,不转大写

    return sign;
}

export default async function handler(req, res) {
    // 只允许 POST 请求
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        console.log('📦 收到创建支付订单请求');

        const {
            orderId,
            productName,
            productDesc,
            amount,
            childName,
            voiceType,
            email
        } = req.body;

        // 生成商户订单号
        const outTradeNo = orderId || `SB${Date.now()}${Math.floor(Math.random() * 10000)}`;

        console.log('订单号:', outTradeNo);
        console.log('商品名称:', productName);
        console.log('金额:', amount);

        // 获取客户端IP地址
        const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || 
                        req.headers['x-real-ip'] || 
                        req.connection?.remoteAddress || 
                        '127.0.0.1';

        console.log('客户端IP:', clientIp);

        // 构建请求参数 - 使用 mapi.php 接口(推荐)
        const params = {
            pid: PAY_CONFIG.pid,
            type: 'alipay',
            out_trade_no: outTradeNo,
            notify_url: PAY_CONFIG.notifyUrl,
            return_url: PAY_CONFIG.returnUrl,
            name: productName,
            money: amount.toFixed(2),
            clientip: clientIp, // 用户IP地址（必需）
            device: 'jump', // 自适应页面
            param: JSON.stringify({
                childName,
                voiceType,
                email
            })
        };

        // 计算签名
        params.sign = signParams(params, PAY_CONFIG.key);
        params.sign_type = 'MD5';

        console.log('📤 发送支付请求到PayQixiang...');
        console.log('请求参数:', params);

        // 发起支付请求到 PayQixiang - 使用 mapi.php
        const querystring = Object.keys(params)
            .map(key => `${key}=${encodeURIComponent(params[key])}`)
            .join('&');

        const payResponse = await fetch(PAY_CONFIG.apiUrl + 'mapi.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: querystring
        });

        const responseText = await payResponse.text();
        console.log('📥 PayQixiang响应:', responseText);

        // 解析响应
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            console.error('解析响应失败:', e);
            return res.status(500).json({
                success: false,
                message: '支付接口返回格式错误',
                response: responseText.substring(0, 500)
            });
        }

        // 检查返回结果
        if (result.code === 1) {
            // 成功
            res.json({
                success: true,
                orderId: outTradeNo,
                payUrl: result.payurl,
                qrCode: result.qrcode,
                message: '订单创建成功'
            });
        } else {
            // 失败
            console.error('创建订单失败:', result);
            res.json({
                success: false,
                message: result.msg || '创建订单失败',
                error: result
            });
        }

    } catch (error) {
        console.error('❌ 创建支付订单失败:', error);

        res.status(500).json({
            success: false,
            message: '创建支付订单失败: ' + error.message
        });
    }
}
