/**
 * Vercel Serverless Function - 创建支付订单
 * 路径: /api/payment-create
 */

const crypto = require('crypto');

// PayQixiang 配置
const PAY_CONFIG = {
    apiUrl: 'https://api.payqixiang.cn/',
    merchantId: '2999',
    md5Key: 'hkd9KnN9ets4NZB7sGtK1s2zt7abhinH',
    payType: 'alipay',
    // 异步通知地址 - 需要配置为 Vercel 域名
    notifyUrl: 'https://story.66668888.cloud/api/payment-notify',
    // 同步跳转地址
    returnUrl: 'https://story.66668888.cloud/payment-result'
};

// MD5 签名函数
function signParams(params) {
    const filteredParams = Object.keys(params)
        .filter(key => params[key] !== '' && params[key] !== null && params[key] !== undefined && key !== 'pay_md5sign')
        .sort()
        .reduce((result, key) => {
            result[key] = params[key];
            return result;
        }, {});

    const signContent = Object.keys(filteredParams)
        .map(key => `${key}=${filteredParams[key]}`)
        .join('&') + PAY_CONFIG.md5Key;

    const sign = crypto
        .createHash('md5')
        .update(signContent, 'utf8')
        .digest('hex')
        .toUpperCase();

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

        // 构建请求参数
        const params = {
            pay_memberid: PAY_CONFIG.merchantId,
            pay_orderid: outTradeNo,
            pay_amount: amount.toFixed(2),
            pay_applydate: new Date().toISOString().replace('T', ' ').substring(0, 19),
            pay_bankcode: PAY_CONFIG.payType,
            pay_notifyurl: PAY_CONFIG.notifyUrl,
            pay_callbackurl: PAY_CONFIG.returnUrl,
            pay_attach: JSON.stringify({
                childName,
                voiceType,
                email,
                productName
            })
        };

        // 计算签名
        params.pay_md5sign = signParams(params);

        console.log('📤 发送支付请求到PayQixiang...');

        // 发起支付请求到 PayQixiang
        const querystring = Object.keys(params)
            .map(key => `${key}=${encodeURIComponent(params[key])}`)
            .join('&');

        const payResponse = await fetch(PAY_CONFIG.apiUrl + 'submit.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: querystring
        });

        const responseText = await payResponse.text();
        console.log('📥 PayQixiang响应:', responseText.substring(0, 200));

        // 解析响应
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            // 不是JSON，直接返回跳转URL
            const payUrl = PAY_CONFIG.apiUrl + 'pay.php?' + querystring;

            return res.json({
                success: true,
                orderId: outTradeNo,
                payUrl: payUrl,
                message: '订单创建成功，请点击链接支付'
            });
        }

        if (result && result.status === 1) {
            res.json({
                success: true,
                orderId: outTradeNo,
                payUrl: result.payurl || result.qrcode || result.url,
                qrCode: result.qrcode,
                message: '订单创建成功'
            });
        } else {
            res.json({
                success: false,
                message: result.msg || result.message || '创建订单失败',
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
