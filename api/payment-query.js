/**
 * Vercel Serverless Function - 查询支付状态
 * 路径: /api/payment-query
 */

const crypto = require('crypto');

const PAY_CONFIG = {
    apiUrl: 'https://api.payqixiang.cn/',
    merchantId: '2999',
    md5Key: 'hkd9KnN9ets4NZB7sGtK1s2zt7abhinH'
};

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

    return crypto.createHash('md5')
        .update(signContent, 'utf8')
        .digest('hex')
        .toUpperCase();
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        const { orderId } = req.body;

        console.log('🔍 查询订单支付结果');
        console.log('订单号:', orderId);

        // 构建查询参数
        const params = {
            pay_memberid: PAY_CONFIG.merchantId,
            pay_orderid: orderId
        };

        params.pay_md5sign = signParams(params);

        // 发起查询请求
        const querystring = Object.keys(params)
            .map(key => `${key}=${encodeURIComponent(params[key])}`)
            .join('&');

        const response = await fetch(PAY_CONFIG.apiUrl + 'order_query.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: querystring
        });

        const responseText = await response.text();
        console.log('📥 查询响应:', responseText.substring(0, 200));

        let result;
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            result = responseText;
        }

        if (result && result.status === 1) {
            res.json({
                success: true,
                data: result
            });
        } else {
            res.json({
                success: false,
                message: result.msg || '查询失败'
            });
        }

    } catch (error) {
        console.error('❌ 查询支付结果失败:', error);

        res.status(500).json({
            success: false,
            message: '查询支付结果失败',
            error: error.message
        });
    }
}
