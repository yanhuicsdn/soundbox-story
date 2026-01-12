/**
 * 声宝盒 - 支付宝支付服务器
 * 支持支付宝沙箱测试环境
 */

const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const querystring = require('querystring');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// ========== 支付宝配置 ==========
const ALIPAY_CONFIG = {
    // 应用ID（沙箱环境）
    appId: '2021000000000000', // 替换为你的沙箱应用ID

    // 商户私钥（沙箱环境）
    // 从支付宝开放平台获取：https://open.alipay.com/develop/sandbox/app
    privateKey: `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
wIDAQABAoIBAExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
-----END RSA PRIVATE KEY-----`,

    // 支付宝公钥（沙箱环境）
    alipayPublicKey: `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxQAB
-----END PUBLIC KEY-----`,

    // 支付宝网关（沙箱环境）
    gateway: 'https://openapi.alipaydev.com/gateway.do',

    // 编码格式
    charset: 'utf-8',

    // 签名类型
    signType: 'RSA2',

    // 格式
    format: 'JSON',

    // 异步通知地址
    notifyUrl: 'https://your-domain.com/api/payment/notify',

    // 同步跳转地址
    returnUrl: 'https://your-domain.com/payment/result'
};

// ========== 内存存储（生产环境用数据库）==========
const orders = new Map();

// ========== 签名函数 ==========
function signParams(params, privateKey) {
    // 1. 排序
    const sortedParams = Object.keys(params)
        .filter(key => params[key] && key !== 'sign')
        .sort()
        .reduce((result, key) => {
            result[key] = params[key];
            return result;
        }, {});

    // 2. 拼接
    const signContent = Object.keys(sortedParams)
        .map(key => `${key}=${sortedParams[key]}`)
        .join('&');

    // 3. RSA签名
    const sign = crypto
        .createSign('RSA-SHA256')
        .update(signContent, 'utf8')
        .sign(privateKey, 'base64');

    return sign;
}

// ========== 验签函数 ==========
function verifySign(params, publicKey) {
    const sign = params.sign;
    delete params.sign;

    const sortedParams = Object.keys(params)
        .filter(key => params[key])
        .sort()
        .reduce((result, key) => {
            result[key] = params[key];
            return result;
        }, {});

    const signContent = Object.keys(sortedParams)
        .map(key => `${key}=${sortedParams[key]}`)
        .join('&');

    const verify = crypto
        .createVerify('RSA-SHA256')
        .update(signContent, 'utf8');

    return verify.verify(publicKey, sign, 'base64');
}

// ========== 创建支付订单 ==========
app.post('/api/payment/create', async (req, res) => {
    try {
        const {
            orderId,
            productName,
            productDesc,
            amount,
            childName,
            voiceType,
            email
        } = req.body;

        // 生成订单号
        const outTradeNo = orderId || `ORD${Date.now()}`;

        // 构建请求参数
        const bizContent = {
            out_trade_no: outTradeNo,
            product_code: 'FAST_INSTANT_TRADE_PAY',
            total_amount: amount,
            subject: productName,
            body: productDesc || `${productName} - ${childName}`,
            quit_url: 'https://your-domain.com'
        };

        const params = {
            app_id: ALIPAY_CONFIG.appId,
            method: 'alipay.trade.page.pay',
            charset: ALIPAY_CONFIG.charset,
            sign_type: ALIPAY_CONFIG.signType,
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            version: '1.0',
            biz_content: JSON.stringify(bizContent),
            notify_url: ALIPAY_CONFIG.notifyUrl,
            return_url: ALIPAY_CONFIG.returnUrl
        };

        // 签名
        params.sign = signParams(params, ALIPAY_CONFIG.privateKey);

        // 保存订单信息
        orders.set(outTradeNo, {
            orderId: outTradeNo,
            productName,
            amount,
            childName,
            voiceType,
            email,
            status: 'pending',
            createdAt: new Date()
        });

        // 构建支付URL
        const payUrl = `${ALIPAY_CONFIG.gateway}?${querystring.stringify(params)}`;

        res.json({
            success: true,
            orderId: outTradeNo,
            payUrl: payUrl,
            message: '订单创建成功'
        });

    } catch (error) {
        console.error('创建支付订单失败:', error);
        res.status(500).json({
            success: false,
            message: '创建支付订单失败'
        });
    }
});

// ========== 支付异步通知 ==========
app.post('/api/payment/notify', async (req, res) => {
    try {
        const params = req.body;

        console.log('收到支付宝通知:', params);

        // 验签
        const isValid = verifySign({...params}, ALIPAY_CONFIG.alipayPublicKey);

        if (!isValid) {
            console.error('验签失败');
            return res.send('fail');
        }

        const outTradeNo = params.out_trade_no;
        const tradeStatus = params.trade_status;

        // 更新订单状态
        if (orders.has(outTradeNo)) {
            const order = orders.get(outTradeNo);

            if (tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED') {
                order.status = 'paid';
                order.tradeNo = params.trade_no;
                order.paidAt = new Date();
                order.totalAmount = params.total_amount;

                console.log(`订单 ${outTradeNo} 支付成功`);

                // TODO: 这里可以添加业务逻辑
                // - 发送邮件通知
                // - 调用语音克隆服务
                // - 更新数据库等

            }
        }

        res.send('success');

    } catch (error) {
        console.error('处理通知失败:', error);
        res.send('fail');
    }
});

// ========== 查询订单状态 ==========
app.get('/api/payment/status/:orderId', (req, res) => {
    const { orderId } = req.params;

    if (orders.has(orderId)) {
        res.json({
            success: true,
            order: orders.get(orderId)
        });
    } else {
        res.status(404).json({
            success: false,
            message: '订单不存在'
        });
    }
});

// ========== 同步跳转处理 ==========
app.get('/payment/result', (req, res) => {
    const params = req.query;

    // 验签
    const isValid = verifySign({...params}, ALIPAY_CONFIG.alipayPublicKey);

    if (isValid) {
        // 支付成功，跳转到前端页面
        res.redirect(`/#/payment/result?orderId=${params.out_trade_no}&status=success`);
    } else {
        res.redirect(`/#/payment/result?status=fail`);
    }
});

// ========== 查询支付结果（主动查询）==========
app.post('/api/payment/query', async (req, res) => {
    try {
        const { orderId } = req.body;

        const bizContent = {
            out_trade_no: orderId
        };

        const params = {
            app_id: ALIPAY_CONFIG.appId,
            method: 'alipay.trade.query',
            charset: ALIPAY_CONFIG.charset,
            sign_type: ALIPAY_CONFIG.signType,
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            version: '1.0',
            biz_content: JSON.stringify(bizContent)
        };

        params.sign = signParams(params, ALIPAY_CONFIG.privateKey);

        const response = await axios.post(ALIPAY_CONFIG.gateway, querystring.stringify(params), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const result = JSON.parse(response.data.replace(/^.+\{/, '{'));

        if (result.alipay_trade_query_response) {
            const tradeResponse = result.alipay_trade_query_response;

            if (tradeResponse.code === '10000') {
                // 更新本地订单
                if (orders.has(orderId)) {
                    const order = orders.get(orderId);
                    order.tradeStatus = tradeResponse.trade_status;
                    order.tradeNo = tradeResponse.trade_no;
                }

                res.json({
                    success: true,
                    data: tradeResponse
                });
            } else {
                res.json({
                    success: false,
                    message: tradeResponse.sub_msg || tradeResponse.msg
                });
            }
        } else {
            res.json({
                success: false,
                message: '查询失败'
            });
        }

    } catch (error) {
        console.error('查询支付结果失败:', error);
        res.status(500).json({
            success: false,
            message: '查询支付结果失败'
        });
    }
});

// ========== 测试接口 ==========
app.get('/api/payment/test', (req, res) => {
    res.json({
        message: '支付服务运行正常',
        orders: Array.from(orders.entries()).map(([id, order]) => ({ id, ...order }))
    });
});

// ========== 退款接口 ==========
app.post('/api/payment/refund', async (req, res) => {
    try {
        const { orderId, refundAmount, refundReason } = req.body;

        const order = orders.get(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: '订单不存在'
            });
        }

        if (!order.tradeNo) {
            return res.status(400).json({
                success: false,
                message: '订单未支付'
            });
        }

        const bizContent = {
            out_trade_no: orderId,
            trade_no: order.tradeNo,
            refund_amount: refundAmount || order.totalAmount,
            refund_reason: refundReason || '用户申请退款',
            out_request_no: `REF${Date.now()}`
        };

        const params = {
            app_id: ALIPAY_CONFIG.appId,
            method: 'alipay.trade.refund',
            charset: ALIPAY_CONFIG.charset,
            sign_type: ALIPAY_CONFIG.signType,
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            version: '1.0',
            biz_content: JSON.stringify(bizContent)
        };

        params.sign = signParams(params, ALIPAY_CONFIG.privateKey);

        const response = await axios.post(ALIPAY_CONFIG.gateway, querystring.stringify(params), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const result = JSON.parse(response.data.replace(/^.+\{/, '{'));

        if (result.alipay_trade_refund_response) {
            const refundResponse = result.alipay_trade_refund_response;

            if (refundResponse.code === '10000') {
                order.status = 'refunded';
                order.refundAmount = refundAmount;

                res.json({
                    success: true,
                    message: '退款成功'
                });
            } else {
                res.json({
                    success: false,
                    message: refundResponse.sub_msg || refundResponse.msg
                });
            }
        } else {
            res.json({
                success: false,
                message: '退款失败'
            });
        }

    } catch (error) {
        console.error('退款失败:', error);
        res.status(500).json({
            success: false,
            message: '退款失败'
        });
    }
});

// ========== 启动服务器 ==========
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('🚀 支付服务器启动成功！');
    console.log(`📡 服务地址: http://localhost:${PORT}`);
    console.log(`🔔 异步通知: ${ALIPAY_CONFIG.notifyUrl}`);
    console.log(`↪️  同步跳转: ${ALIPAY_CONFIG.returnUrl}`);
    console.log('\n使用沙箱环境测试:');
    console.log('1. 沙箱APP: https://open.alipay.com/develop/sandbox/app');
    console.log('2. 沙箱账号: https://open.alipay.com/develop/sandbox/account');
});

module.exports = app;
