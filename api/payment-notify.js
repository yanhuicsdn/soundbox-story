/**
 * Vercel Serverless Function - 支付异步通知
 * 路径: /api/payment-notify
 * PayQixiang 会在支付成功后调用这个接口
 */

const crypto = require('crypto');

const PAY_CONFIG = {
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
    // PayQixiang 使用 POST 请求发送通知
    if (req.method !== 'POST') {
        return res.status(405).send('fail');
    }

    try {
        console.log('🔔 收到PayQixiang支付异步通知');

        const params = req.body;

        // 打印所有接收到的参数
        console.log('接收到的参数:', JSON.stringify(params, null, 2));

        // 验签
        const receivedSign = params.pay_md5sign || params.sign;
        if (!receivedSign) {
            console.error('❌ 缺少签名参数');
            return res.send('fail');
        }

        // 计算签名
        const calculatedSign = signParams(params);

        // 比对签名
        if (calculatedSign !== receivedSign) {
            console.error('❌ 签名验证失败');
            console.error('接收签名:', receivedSign);
            console.error('计算签名:', calculatedSign);
            return res.send('fail');
        }

        console.log('✅ 验签成功');

        // 提取订单信息
        const outTradeNo = params.pay_orderid || params.orderid;
        const transactionId = params.pay_transaction_id || params.transaction_id;
        const amount = params.pay_amount || params.amount;
        const status = params.pay_status || params.status;

        console.log('订单号:', outTradeNo);
        console.log('交易号:', transactionId);
        console.log('金额:', amount);
        console.log('状态:', status);

        // TODO: 在这里添加业务逻辑
        // 1. 更新数据库订单状态
        // 2. 发送确认邮件
        // 3. 调用语音克隆服务

        if (status === '1' || status === 'success' || status === 'SUCCESS') {
            console.log('✅ 订单支付成功！');

            // TODO: 处理支付成功后的业务
            // await handlePaymentSuccess(order);

        } else {
            console.log('❌ 订单支付失败:', status);
        }

        // 必须返回字符串 "success"
        res.send('success');

    } catch (error) {
        console.error('❌ 处理异步通知失败:', error);
        res.send('fail');
    }
}
