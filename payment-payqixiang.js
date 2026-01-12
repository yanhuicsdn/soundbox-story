/**
 * 声宝盒 - PayQixiang 支付宝支付集成
 * 接口文档: https://qixiangpay.cn/doc_old.html#pay1
 *
 * 配置信息:
 * - 接口地址: https://api.payqixiang.cn/
 * - 商户ID: 2999
 * - MD5密钥: hkd9KnN9ets4NZB7sGtK1s2zt7abhinH
 */

const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const querystring = require('querystring');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== PayQixiang 支付配置 ==========
const PAY_CONFIG = {
    // 接口地址
    apiUrl: 'https://api.payqixiang.cn/',

    // 商户ID
    merchantId: '2999',

    // 商户MD5密钥
    md5Key: 'hkd9KnN9ets4NZB7sGtK1s2zt7abhinH',

    // 支付类型（支付宝）
    payType: 'alipay',

    // 异步通知地址（支付成功后PayQixiang会调用这个接口）
    // 开发环境使用内网穿透: https://ngrok.com/
    // 生产环境使用真实域名
    notifyUrl: process.env.NOTIFY_URL || 'http://localhost:3000/api/payment/notify',

    // 同步跳转地址（支付完成后用户浏览器跳转）
    returnUrl: process.env.RETURN_URL || 'http://localhost:3000/payment/result'
};

// ========== 订单存储（生产环境使用MongoDB/Redis）==========
const orders = new Map();

// ========== MD5 签名函数 ==========
/**
 * 按照PayQixiang规则生成MD5签名
 * 算法: MD5(key1=value1&key2=value2...商户MD5密钥).toUpperCase()
 */
function signParams(params) {
    // 1. 过滤空值和sign字段
    const filteredParams = Object.keys(params)
        .filter(key => params[key] !== '' && params[key] !== null && params[key] !== undefined && key !== 'pay_md5sign')
        .sort()
        .reduce((result, key) => {
            result[key] = params[key];
            return result;
        }, {});

    // 2. 拼接字符串: key1=value1&key2=value2...商户MD5密钥
    const signContent = Object.keys(filteredParams)
        .map(key => `${key}=${filteredParams[key]}`)
        .join('&') + PAY_CONFIG.md5Key;

    console.log('📝 签名原文:', signContent);

    // 3. MD5加密并转大写
    const sign = crypto
        .createHash('md5')
        .update(signContent, 'utf8')
        .digest('hex')
        .toUpperCase();

    console.log('✍️  生成签名:', sign);

    return sign;
}

// ========== 验签函数 ==========
/**
 * 验证PayQixiang回调签名
 */
function verifySign(params, receivedSign) {
    // 克隆参数避免修改原对象
    const paramsForSign = { ...params };

    // 计算签名
    const calculatedSign = signParams(paramsForSign);

    // 比对签名
    const isValid = calculatedSign === receivedSign;

    if (!isValid) {
        console.error('❌ 验签失败!');
        console.error('接收签名:', receivedSign);
        console.error('计算签名:', calculatedSign);
    } else {
        console.log('✅ 验签成功');
    }

    return isValid;
}

// ========== 创建支付订单 ==========
app.post('/api/payment/create', async (req, res) => {
    try {
        console.log('\n========================================');
        console.log('📦 收到创建支付订单请求');
        console.log('========================================');

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

        // 构建请求参数（严格按照PayQixiang文档）
        const params = {
            pay_memberid: PAY_CONFIG.merchantId,           // 商户ID
            pay_orderid: outTradeNo,                       // 商户订单号
            pay_amount: amount.toFixed(2),                 // 金额（保留2位小数）
            pay_applydate: new Date().toISOString().replace('T', ' ').substring(0, 19), // 订单时间
            pay_bankcode: PAY_CONFIG.payType,              // 支付类型: alipay
            pay_notifyurl: PAY_CONFIG.notifyUrl,           // 异步通知地址
            pay_callbackurl: PAY_CONFIG.returnUrl,         // 同步跳转地址
            pay_attach: JSON.stringify({                   // 附加数据
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
            status: 'pending',
            createdAt: new Date()
        });

        console.log('\n📤 发送支付请求到PayQixiang...');
        console.log('请求URL:', PAY_CONFIG.apiUrl + 'submit.php');

        // 发起支付请求到PayQixiang
        const response = await axios.post(
            PAY_CONFIG.apiUrl + 'submit.php',
            querystring.stringify(params),
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 30000,
                transformResponse: [data => data] // 保持原始响应
            }
        );

        console.log('📥 PayQixiang响应状态:', response.status);
        console.log('📥 PayQixiang响应类型:', response.headers['content-type']);

        // 解析响应
        let result;
        const responseData = response.data.trim();

        try {
            // 尝试解析JSON
            result = JSON.parse(responseData);
            console.log('📥 PayQixiang JSON响应:', result);
        } catch (e) {
            // 不是JSON，可能是HTML或其他格式
            console.log('📥 PayQixiang响应不是JSON格式');
            console.log('📥 响应内容前200字符:', responseData.substring(0, 200));

            // 直接返回跳转URL
            const payUrl = PAY_CONFIG.apiUrl + 'pay.php?' + querystring.stringify(params);

            return res.json({
                success: true,
                orderId: outTradeNo,
                payUrl: payUrl,
                message: '订单创建成功，请点击链接支付'
            });
        }

        if (result && result.status === 1) {
            // 成功响应
            res.json({
                success: true,
                orderId: outTradeNo,
                payUrl: result.payurl || result.qrcode || result.url,
                qrCode: result.qrcode,
                message: '订单创建成功'
            });
        } else {
            // 失败响应
            console.error('❌ PayQixiang返回错误:', result);
            res.json({
                success: false,
                message: result.msg || result.message || '创建订单失败',
                error: result
            });
        }

    } catch (error) {
        console.error('❌ 创建支付订单失败:', error.message);
        console.error('错误详情:', error);

        res.status(500).json({
            success: false,
            message: '创建支付订单失败: ' + error.message,
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// ========== 支付异步通知（重要）==========
/**
 * PayQixiang会在支付成功后自动调用此接口
 * 必须返回字符串 "success" 或 "fail"
 */
app.post('/api/payment/notify', async (req, res) => {
    try {
        console.log('\n========================================');
        console.log('🔔 收到PayQixiang支付异步通知');
        console.log('========================================');

        const params = req.body;

        // 打印所有接收到的参数
        console.log('接收到的参数:', JSON.stringify(params, null, 2));

        // 验签
        const receivedSign = params.pay_md5sign || params.sign;
        if (!receivedSign) {
            console.error('❌ 缺少签名参数');
            return res.send('fail');
        }

        const isValid = verifySign(params, receivedSign);

        if (!isValid) {
            console.error('❌ 签名验证失败');
            return res.send('fail');
        }

        // 提取订单信息
        const outTradeNo = params.pay_orderid || params.orderid;
        const transactionId = params.pay_transaction_id || params.transaction_id;
        const amount = params.pay_amount || params.amount;
        const status = params.pay_status || params.status;

        console.log('订单号:', outTradeNo);
        console.log('交易号:', transactionId);
        console.log('金额:', amount);
        console.log('状态:', status);

        // 更新订单状态
        if (orders.has(outTradeNo)) {
            const order = orders.get(outTradeNo);

            if (status === '1' || status === 'success' || status === 'SUCCESS') {
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

                console.log('✅ 订单支付成功！');
                console.log('========================================\n');

                // TODO: 在这里添加业务逻辑
                // 1. 发送确认邮件
                // 2. 调用语音克隆服务
                // 3. 更新数据库
                await handlePaymentSuccess(order);

            } else {
                order.status = 'failed';
                order.failReason = status;
                console.log('❌ 订单支付失败:', status);
            }
        } else {
            console.warn('⚠️  订单不存在:', outTradeNo);
        }

        // 必须返回字符串 "success"
        res.send('success');

    } catch (error) {
        console.error('❌ 处理异步通知失败:', error);
        res.send('fail');
    }
});

// ========== 处理支付成功业务逻辑 ==========
async function handlePaymentSuccess(order) {
    try {
        console.log('🎉 开始处理支付成功后的业务逻辑...');

        // TODO: 1. 发送确认邮件
        console.log('📧 发送确认邮件到:', order.email);

        // TODO: 2. 调用语音克隆服务
        console.log('🎙️  调用语音克隆服务...');

        // TODO: 3. 更新数据库
        console.log('💾 更新数据库...');

        console.log('✅ 业务逻辑处理完成');

    } catch (error) {
        console.error('❌ 处理业务逻辑失败:', error);
    }
}

// ========== 同步跳转处理 ==========
/**
 * 支付完成后用户浏览器跳转到此页面
 */
app.post('/payment/result', (req, res) => {
    console.log('\n========================================');
    console.log('↪️  收到支付同步跳转');
    console.log('========================================');

    const params = req.body;
    console.log('跳转参数:', params);

    // 验签
    const receivedSign = params.pay_md5sign || params.sign;
    const isValid = verifySign(params, receivedSign);

    if (isValid && (params.pay_status === '1' || params.pay_status === 'success')) {
        console.log('✅ 支付成功，跳转到成功页面');
        // 支付成功，跳转到前端成功页面
        res.redirect(`/#/payment/result?orderId=${params.pay_orderid}&status=success`);
    } else {
        console.log('❌ 支付失败，跳转到失败页面');
        // 支付失败，跳转到前端失败页面
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

        console.log('\n========================================');
        console.log('🔍 查询订单支付结果');
        console.log('========================================');
        console.log('订单号:', orderId);

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

        console.log('📤 发送查询请求...');

        // 发起查询请求
        const response = await axios.post(
            PAY_CONFIG.apiUrl + 'order_query.php',
            querystring.stringify(params),
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 30000,
                transformResponse: [data => data]
            }
        );

        console.log('📥 查询响应状态:', response.status);

        let result;
        try {
            result = JSON.parse(response.data);
        } catch (e) {
            result = response.data;
        }

        console.log('📥 查询结果:', result);

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
        console.error('❌ 查询支付结果失败:', error);
        res.status(500).json({
            success: false,
            message: '查询支付结果失败',
            error: error.message
        });
    }
});

// ========== 测试接口 ==========
app.get('/api/payment/test', (req, res) => {
    res.json({
        message: 'PayQixiang 支付宝支付服务运行正常',
        config: {
            apiUrl: PAY_CONFIG.apiUrl,
            merchantId: PAY_CONFIG.merchantId,
            payType: PAY_CONFIG.payType,
            notifyUrl: PAY_CONFIG.notifyUrl,
            returnUrl: PAY_CONFIG.returnUrl
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

// ========== 健康检查 ==========
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'PayQixiang Alipay Payment Gateway',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// ========== 错误处理 ==========
app.use((err, req, res, next) => {
    console.error('❌ 服务器错误:', err);
    res.status(500).json({
        success: false,
        message: '服务器内部错误'
    });
});

// ========== 启动服务器 ==========
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('\n========================================');
    console.log('🚀 PayQixiang 支付宝支付服务器启动成功！');
    console.log('========================================');
    console.log(`📡 服务地址: http://localhost:${PORT}`);
    console.log(`🔔 异步通知: ${PAY_CONFIG.notifyUrl}`);
    console.log(`↪️  同步跳转: ${PAY_CONFIG.returnUrl}`);
    console.log(`\n📊 商户信息:`);
    console.log(`   商户ID: ${PAY_CONFIG.merchantId}`);
    console.log(`   接口地址: ${PAY_CONFIG.apiUrl}`);
    console.log(`   支付类型: ${PAY_CONFIG.payType}`);
    console.log(`\n🧪 测试接口:`);
    console.log(`   GET  /api/payment/test - 查看服务状态`);
    console.log(`   GET  /health           - 健康检查`);
    console.log(`\n📝 环境变量:`);
    console.log(`   NOTIFY_URL  - 异步通知地址`);
    console.log(`   RETURN_URL  - 同步跳转地址`);
    console.log('========================================\n');
});

module.exports = app;
