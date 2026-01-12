/**
 * Vercel Serverless Function - 支付异步通知
 * 路径: /api/payment-notify
 * PayQixiang 会在支付成功后调用这个接口
 */

const crypto = require('crypto');
const { saveOrderToFeishu } = require('./lib/feishu');

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

            // 准备订单数据（在外层作用域定义，供后续使用）
            const orderData = {
                orderId: outTradeNo,
                transactionId,
                amount,
                productName: orderDetails.productName,
                childName: orderDetails.childName,
                voiceType: orderDetails.voiceType,
                email: orderDetails.email,
                status: '已支付'
            };

            // 如果有录音文件，解码并添加到订单数据
            if (orderDetails.audioFileBase64 && orderDetails.audioFileName) {
                try {
                    const audioBuffer = Buffer.from(orderDetails.audioFileBase64, 'base64');
                    orderData.audioFile = {
                        buffer: audioBuffer,
                        filename: orderDetails.audioFileName,
                        mimetype: orderDetails.audioFileMimeType || 'audio/webm'
                    };
                    console.log('🎙️ 录音文件已解码，大小:', audioBuffer.length, 'bytes');
                } catch (decodeError) {
                    console.error('❌ 解码录音文件失败:', decodeError);
                }
            }

            // 保存订单到飞书表格
            try {
                await saveOrderToFeishu(orderData);
                console.log('✅ 订单已保存到飞书表格');
            } catch (feishuError) {
                console.error('❌ 保存到飞书表格失败:', feishuError);
                // 飞书保存失败不影响支付成功的确认
            }

            // 发送确认邮件（可选功能）
            try {
                // 检查 nodemailer 是否可用
                let nodemailer;
                try {
                    nodemailer = require('nodemailer');
                } catch (e) {
                    console.warn('⚠️ nodemailer 模块不可用，跳过邮件发送');
                    nodemailer = null;
                }

                if (nodemailer) {
                    await sendConfirmationEmail({
                        orderId: outTradeNo,
                        transactionId,
                        amount,
                        email: orderDetails.email,
                        childName: orderDetails.childName,
                        voiceType: orderDetails.voiceType,
                        audioFile: orderData.audioFile // 传递录音文件
                    });
                    console.log('✅ 确认邮件已发送');
                } else {
                    console.log('⚠️ 邮件功能暂时不可用，订单已保存到飞书');
                }
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

// 发送确认邮件（使用 SMTP）
async function sendConfirmationEmail(orderInfo) {
    const { orderId, transactionId, amount, email, childName, voiceType, audioFile } = orderInfo;

    if (!email) {
        console.log('⚠️ 未提供邮箱地址，跳过邮件发送');
        return;
    }

    // 尝试加载 nodemailer
    let nodemailer;
    try {
        nodemailer = require('nodemailer');
    } catch (e) {
        console.warn('⚠️ nodemailer 模块不可用，无法发送邮件');
        return;
    }

    // SMTP 配置
    const SMTP_CONFIG = {
        host: process.env.SMTP_HOST || 'smtp.sohu.com',
        port: parseInt(process.env.SMTP_PORT || '25'),
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    };

    // 检查 SMTP 配置
    if (!SMTP_CONFIG.user || !SMTP_CONFIG.pass) {
        console.error('❌ SMTP 配置不完整，请在 Vercel 环境变量中配置 SMTP_USER 和 SMTP_PASS');
        throw new Error('SMTP 配置不完整');
    }

    // 创建邮件传输器
    const transporter = nodemailer.createTransport({
        host: SMTP_CONFIG.host,
        port: SMTP_CONFIG.port,
        secure: false, // 端口25不使用SSL
        auth: {
            user: SMTP_CONFIG.user,
            pass: SMTP_CONFIG.pass
        }
    });

    // 邮件内容
    const mailOptions = {
        from: `"声宝盒" <${SMTP_CONFIG.user}>`,
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
                        ${audioFile ? '<p><strong>🎙️ 录音文件：</strong>您的录音文件已作为附件发送。</p>' : ''}
                        
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

    // 如果有录音文件，添加为附件
    if (audioFile && audioFile.buffer) {
        mailOptions.attachments = [{
            filename: audioFile.filename || 'recording.wav',
            content: audioFile.buffer,
            contentType: audioFile.mimetype || 'audio/wav'
        }];
        console.log('🎙️ 录音文件已添加为邮件附件');
    }

    // 发送邮件
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ 邮件发送成功:', result.messageId);
    return result;
}
