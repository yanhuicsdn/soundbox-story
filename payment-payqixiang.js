/**
 * 声宝盒 - PayQixiang 支付网关集成
 * 接口文档: https://qixiangpay.cn/doc_old.html
 */

const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const querystring = require('querystring');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// ========== PayQixiang 配置 ==========
const PAY_CONFIG = {
    // 接口地址
    apiUrl: 'https://api.payqixiang.cn/',

    // 商户ID
    merchantId: '2999',

    // 商户MD5密钥
    md5Key: 'hkd9KnN9ets4NZB7sGtK1s2zt7abhinH',

    // 支付类型（支付宝扫码）
    payType: 'alipay',  // alipay=支付宝, wechat=微信

    // 异步通知地址
    notifyUrl: 'https://your-domain.com/api/payment/notify',

    // 同步跳转地址
    returnUrl: 'https://your-domain.com/payment/result'
};

// ========== 订单存储（生产环境用数据库）==========
const orders = new Map();

// ========== MD5 签名函数 ==========
function signParams(params) {
    // 1. 过滤空值
    const filteredParams = Object.keys(params)
        .filter(key => params[key] !== '' && params[key] !== null && params[key] !== undefined)
        .sort()
        .reduce((result, key) => {
            result[key] = params[key];
            return result;
        }, {});

    // 2. 拼接字符串: key1=value1&key2=value2...商户MD5密钥
    const signContent = Object.keys(filteredParams)
        .map(key => `${key}=${filteredParams[key]}`)
        .join('&') + PAY_CONFIG.md5Key;

    console.log('签名原文:', signContent);

    // 3. MD5加密并转大写
    const sign = crypto
        .createHash('md5')
        .update(signContent, 'utf8')
        .digest('hex')
        .toUpperCase();

    return sign;
}

// ========== 验签函数 ==========
function verifySign(params, receivedSign) {
    const calculatedSign = signParams(params);
    return calculatedSign === receivedSign;
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
            email,
            payType = 'alipay'  // alipay 或 wechat
        } = req.body;

        // 生成商户订单号
        const outTradeNo = orderId || `SB${Date.now()}${Math.floor(Math.random() * 10000)}`;

        // 构建请求参数（根据PayQixiang文档）
        const params = {
            pay_memberid: PAY_CONFIG.merchantId,       // 商户ID
            pay_orderid: outTradeNo,                   // 商户订单号
            pay_amount: amount.toFixed(2),             // 金额（保留2位小数）
            pay_applydate: new Date().toISOString().replace('T', ' ').substring(0, 19), // 订单时间
            pay_bankcode: payType,                     // 支付类型: alipay/wechat
            pay_notifyurl: PAY_CONFIG.notifyUrl,       // 异步通知
            pay_callbackurl: PAY_CONFIG.returnUrl,     // 同步跳转
            pay_attach: JSON.stringify({               // 附加数据
                childName,
                voiceType,
                email,
                productName
            })
        };

        // 计算签名
        params.pay_md5sign = signParams(params);

        // 保存订单信息
        orders.set(outTradeNo, {
            orderId: outTradeNo,
            productName,
            productDesc,
            amount,
            childName,
            voiceType,
            email,
            payType,
            status: 'pending',
            createdAt: new Date()
        });

        console.log('创建支付订单:', params);

        // 发起支付请求
        const response = await axios.post(PAY_CONFIG.apiUrl + 'submit.php', querystring.stringify(params), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 30000
        });

        console.log('支付接口响应:', response.data);

        // 解析响应
        // PayQixiang通常返回JSON或跳转URL
        let result;

        if (typeof response.data === 'string') {
            // 尝试解析JSON
            try {
                result = JSON.parse(response.data);
            } catch (e) {
                // 可能是HTML跳转页面
                res.json({
                    success: true,
                    orderId: outTradeNo,
                    payUrl: PAY_CONFIG.apiUrl + 'pay.php?' + querystring.stringify(params),
                    html: response.data,
                    message: '订单创建成功'
                });
                return;
            }
        } else {
            result = response.data;
        }

        if (result && result.status === 1) {
            res.json({
                success: true,
                orderId: outTradeNo,
                payUrl: result.payurl || result.qrcode,
                qrCode: result.qrcode,
                message: '订单创建成功'
            });
        } else {
            res.json({
                success: false,
                message: result.msg || '创建订单失败',
                error: result
            });
        }

    } catch (error) {
        console.error('创建支付订单失败:', error);

        // 开发环境下返回测试URL
        if (process.env.NODE_ENV === 'development') {
            const outTradeNo = req.body.orderId || `SB${Date.now()}`;
            const params = {
                pay_memberid: PAY_CONFIG.merchantId,
                pay_orderid: outTradeNo,
                pay_amount: req.body.amount.toFixed(2),
                pay_applydate: new Date().toISOString().replace('T', ' ').substring(0, 19),
                pay_bankcode: req.body.payType || 'alipay',
                pay_notifyurl: PAY_CONFIG.notifyUrl,
                pay_callbackurl: PAY_CONFIG.returnUrl
            };
            params.pay_md5sign = signParams(params);

            return res.json({
                success: true,
                orderId: outTradeNo,
                payUrl: PAY_CONFIG.apiUrl + 'pay.php?' + querystring.stringify(params),
                message: '订单创建成功（测试模式）'
            });
        }

        res.status(500).json({
            success: false,
            message: '创建支付订单失败',
            error: error.message
        });
    }
});

// ========== 支付异步通知 ==========
app.post('/api/payment/notify', async (req, res) => {
    try {
        const params = req.body;

        console.log('收到支付异步通知:', params);

        // 验签
        const isValid = verifySign(params, params.pay_md5sign || params.sign);

        if (!isValid) {
            console.error('验签失败');
            console.error('接收到的签名:', params.pay_md5sign || params.sign);
            return res.send('fail');
        }

        const outTradeNo = params.pay_orderid || params.orderid;
        const transactionId = params.pay_transaction_id || params.transaction_id;
        const amount = params.pay_amount || params.amount;
        const status = params.pay_status || params.status;

        // 更新订单状态
        if (orders.has(outTradeNo)) {
            const order = orders.get(outTradeNo);

            if (status === '1' || status === 'success') {
                order.status = 'paid';
                order.transactionId = transactionId;
                order.paidAmount = amount;
                order.paidAt = new Date();

                // 解析附加数据
                if (params.pay_attach) {
                    try {
                        order.attach = JSON.parse(params.pay_attach);
                    } catch (e) {
                        console.error('解析附加数据失败:', e);
                    }
                }

                console.log(`✅ 订单 ${outTradeNo} 支付成功！`);
                console.log(`金额: ${amount}`);
                console.log(`流水号: ${transactionId}`);

                // TODO: 业务逻辑
                // 1. 发送确认邮件
                // 2. 调用语音克隆服务
                // 3. 更新数据库
                // sendConfirmationEmail(order);
                // callVoiceCloningService(order);

            } else {
                order.status = 'failed';
                order.failReason = status;
                console.log(`❌ 订单 ${outTradeNo} 支付失败: ${status}`);
            }
        }

        res.send('success');

    } catch (error) {
        console.error('处理异步通知失败:', error);
        res.send('fail');
    }
});

// ========== 同步跳转处理 ==========
app.post('/payment/result', (req, res) => {
    const params = req.body;

    console.log('收到同步跳转:', params);

    // 验签
    const isValid = verifySign(params, params.pay_md5sign || params.sign);

    if (isValid && (params.pay_status === '1' || params.pay_status === 'success')) {
        // 支付成功
        res.redirect(`/#/payment/result?orderId=${params.pay_orderid}&status=success`);
    } else {
        // 支付失败
        res.redirect(`/#/payment/result?status=fail&msg=${encodeURIComponent(params.pay_errmsg || '支付失败')}`);
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

// ========== 主动查询支付结果 ==========
app.post('/api/payment/query', async (req, res) => {
    try {
        const { orderId } = req.body;

        const order = orders.get(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: '订单不存在'
            });
        }

        // 构建查询参数
        const params = {
            pay_memberid: PAY_CONFIG.merchantId,
            pay_orderid: orderId
        };

        params.pay_md5sign = signParams(params);

        console.log('查询订单:', params);

        // 发起查询请求
        const response = await axios.post(PAY_CONFIG.apiUrl + 'order_query.php', querystring.stringify(params), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 30000
        });

        console.log('查询结果:', response.data);

        let result;
        if (typeof response.data === 'string') {
            try {
                result = JSON.parse(response.data);
            } catch (e) {
                result = response.data;
            }
        } else {
            result = response.data;
        }

        if (result && result.status === 1) {
            // 更新本地订单
            if (result.pay_status === '1') {
                order.status = 'paid';
                order.transactionId = result.pay_transaction_id;
                order.paidAmount = result.pay_amount;
                order.paidAt = new Date();
            }

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
        console.error('查询支付结果失败:', error);
        res.status(500).json({
            success: false,
            message: '查询支付结果失败',
            error: error.message
        });
    }
});

// ========== 生成二维码（如果需要）==========
app.get('/api/payment/qrcode/:orderId', (req, res) => {
    const { orderId } = req.params;
    const order = orders.get(orderId);

    if (!order) {
        return res.status(404).json({
            success: false,
            message: '订单不存在'
        });
    }

    // 生成支付URL
    const params = {
        pay_memberid: PAY_CONFIG.merchantId,
        pay_orderid: orderId,
        pay_amount: order.amount.toFixed(2),
        pay_applydate: order.createdAt.toISOString().replace('T', ' ').substring(0, 19),
        pay_bankcode: order.payType,
        pay_notifyurl: PAY_CONFIG.notifyUrl,
        pay_callbackurl: PAY_CONFIG.returnUrl
    };

    params.pay_md5sign = signParams(params);

    const payUrl = PAY_CONFIG.apiUrl + 'pay.php?' + querystring.stringify(params);

    res.json({
        success: true,
        payUrl: payUrl,
        orderId: orderId
    });
});

// ========== 测试接口 ==========
app.get('/api/payment/test', (req, res) => {
    res.json({
        message: 'PayQixiang 支付服务运行正常',
        config: {
            apiUrl: PAY_CONFIG.apiUrl,
            merchantId: PAY_CONFIG.merchantId,
            payType: PAY_CONFIG.payType
        },
        orders: Array.from(orders.entries()).map(([id, order]) => ({
            id,
            ...order,
            // 隐藏敏感信息
            childName: order.childName ? '***' : null,
            email: order.email ? '***@***.***' : null
        }))
    });
});

// ========== 测试签名 ==========
app.get('/api/payment/sign/test', (req, res) => {
    const testParams = {
        pay_memberid: PAY_CONFIG.merchantId,
        pay_orderid: 'TEST123456',
        pay_amount: '0.01',
        pay_applydate: '2025-01-12 12:00:00',
        pay_bankcode: 'alipay',
        pay_notifyurl: PAY_CONFIG.notifyUrl,
        pay_callbackurl: PAY_CONFIG.returnUrl
    };

    const sign = signParams(testParams);

    res.json({
        params: testParams,
        sign: sign,
        md5Key: PAY_CONFIG.md5Key.substring(0, 10) + '...'
    });
});

// ========== 健康检查 ==========
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'PayQixiang Payment Gateway',
        timestamp: new Date().toISOString()
    });
});

// ========== 启动服务器 ==========
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('🚀 PayQixiang 支付服务器启动成功！');
    console.log(`📡 服务地址: http://localhost:${PORT}`);
    console.log(`🔔 异步通知: ${PAY_CONFIG.notifyUrl}`);
    console.log(`↪️  同步跳转: ${PAY_CONFIG.returnUrl}`);
    console.log(`\n📊 商户信息:`);
    console.log(`   商户ID: ${PAY_CONFIG.merchantId}`);
    console.log(`   接口地址: ${PAY_CONFIG.apiUrl}`);
    console.log(`\n🧪 测试接口:`);
    console.log(`   GET  /api/payment/test      - 查看服务状态`);
    console.log(`   GET  /api/payment/sign/test - 测试签名`);
    console.log(`   GET  /health                  - 健康检查`);
});

module.exports = app;
