/**
 * Vercel Serverless Function - 支付异步通知
 * 路径: /api/payment-notify
 * PayQixiang 会在支付成功后调用这个接口
 */

const crypto = require('crypto');

const PAY_CONFIG = {
    pid: '2999',
    key: 'hkd9KnN9ets4NZB7sGtK1s2zt7abhinH'
};

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

    return crypto.createHash('md5')
        .update(signContent, 'utf8')
        .digest('hex'); // 小写
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
        const receivedSign = params.sign;
        if (!receivedSign) {
            console.error('❌ 缺少签名参数');
            return res.send('fail');
        }

        // 计算签名
        const calculatedSign = signParams(params, PAY_CONFIG.key);

        // 比对签名
        if (calculatedSign !== receivedSign) {
            console.error('❌ 签名验证失败');
            console.error('接收签名:', receivedSign);
            console.error('计算签名:', calculatedSign);
            return res.send('fail');
        }

        console.log('✅ 验签成功');

        // 提取订单信息
        const outTradeNo = params.out_trade_no;
        const transactionId = params.trade_no;
        const amount = params.money;
        const status = params.trade_status;

        console.log('订单号:', outTradeNo);
        console.log('交易号:', transactionId);
        console.log('金额:', amount);
        console.log('状态:', status);

        // 处理支付成功后的业务逻辑
        if (status === 'TRADE_SUCCESS') {
            console.log('✅ 订单支付成功！');

            // 解析附加数据
            let orderDetails = {};
            if (params.param) {
                try {
                    orderDetails = JSON.parse(params.param);
                } catch (e) {
                    console.error('解析附加数据失败:', e);
                }
            }

            // 发送确认邮件
            try {
                await sendConfirmationEmail({
                    orderId: outTradeNo,
                    transactionId,
                    amount,
                    email: orderDetails.email,
                    childName: orderDetails.childName,
                    voiceType: orderDetails.voiceType
                });
                console.log('✅ 确认邮件已发送');
            } catch (emailError) {
                console.error('❌ 发送邮件失败:', emailError);
                // 邮件发送失败不影响支付成功的确认
            }

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

// 发送确认邮件
async function sendConfirmationEmail(orderInfo) {
    const { orderId, transactionId, amount, email, childName, voiceType } = orderInfo;

    if (!email) {
        console.log('⚠️ 未提供邮箱地址，跳过邮件发送');
        return;
    }

    // 使用 Resend API 发送邮件
    const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_123456789';

    const emailContent = {
        from: '声宝盒 <noreply@story.66668888.cloud>',
        to: email,
        subject: `【声宝盒】支付成功 - 订单 ${orderId}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                    .order-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
                    .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e9ecef; }
                    .info-row:last-child { border-bottom: none; }
                    .label { color: #666; }
                    .value { font-weight: 600; color: #333; }
                    .footer { text-align: center; color: #999; font-size: 14px; margin-top: 30px; }
                    .button { display: inline-block; background: #1677FF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 支付成功！</h1>
                        <p>感谢您购买声宝盒定制语音故事</p>
                    </div>
                    <div class="content">
                        <p>亲爱的用户，</p>
                        <p>您的订单已支付成功！我们将尽快为 <strong>${childName}</strong> 制作专属的 <strong>${voiceType}</strong> 语音故事。</p>
                        
                        <div class="order-info">
                            <h3>📦 订单信息</h3>
                            <div class="info-row">
                                <span class="label">订单号</span>
                                <span class="value">${orderId}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">交易号</span>
                                <span class="value">${transactionId}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">支付金额</span>
                                <span class="value">¥${amount}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">宝宝名字</span>
                                <span class="value">${childName}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">声音类型</span>
                                <span class="value">${voiceType}</span>
                            </div>
                        </div>

                        <p><strong>⏰ 制作时间：</strong>我们将在 24-48 小时内完成语音故事的制作。</p>
                        <p><strong>📧 交付方式：</strong>完成后会发送邮件到此邮箱，包含音频文件下载链接。</p>
                        
                        <p style="margin-top: 30px;">如有任何问题，请随时联系我们的客服。</p>
                        
                        <div class="footer">
                            <p>此邮件由系统自动发送，请勿直接回复</p>
                            <p>© 2026 声宝盒 - 为孩子定制专属语音故事</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    // 发送邮件请求
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailContent)
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`邮件发送失败: ${error}`);
    }

    const result = await response.json();
    console.log('邮件发送结果:', result);
    return result;
}
