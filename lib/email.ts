import nodemailer from 'nodemailer';

/**
 * 获取 SMTP 配置
 */
function getSMTPConfig() {
    const config = {
        host: process.env.SMTP_HOST || 'smtp.sohu.com',
        port: parseInt(process.env.SMTP_PORT || '25'),
        secure: false, // 端口25使用false，465使用true
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    };

    if (!config.auth.user || !config.auth.pass) {
        throw new Error('SMTP_USER 或 SMTP_PASS 未配置');
    }

    return config;
}

/**
 * 创建邮件传输器
 */
function createTransporter() {
    const config = getSMTPConfig();
    return nodemailer.createTransport(config);
}

/**
 * 获取发件人邮箱地址
 */
function getFromEmail() {
    const smtpUser = process.env.SMTP_USER;
    return `声宝盒 <${smtpUser}>`;
}

/**
 * 发送订单确认邮件
 */
export async function sendOrderConfirmationEmail(orderInfo: {
    orderId: string;
    transactionId: string;
    amount: string;
    email: string;
    childName: string;
    voiceType: string;
}) {
    const { orderId, transactionId, amount, email, childName, voiceType } = orderInfo;

    console.log('📧 开始发送确认邮件...');
    console.log('收件人:', email);
    console.log('订单号:', orderId);

    if (!email) {
        console.log('⚠️ 未提供邮箱地址，跳过邮件发送');
        return;
    }

    const transporter = createTransporter();
    const fromEmail = getFromEmail();

    const emailHtml = `
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
                    <p><strong>🎙️ 录音文件：</strong>您的录音文件已成功上传，我们会根据您的录音进行语音克隆。</p>
                    
                    <p style="margin-top: 30px;">如有任何问题，请随时联系我们的客服。</p>
                    
                    <div class="footer">
                        <p>此邮件由系统自动发送，请勿直接回复</p>
                        <p>© 2026 声宝盒 - 为孩子定制专属语音故事</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;

    try {
        console.log('📤 准备发送邮件...');
        console.log('发件人:', fromEmail);
        console.log('收件人:', email);
        console.log('主题:', `【声宝盒】支付成功 - 订单 ${orderId}`);
        
        const result = await transporter.sendMail({
            from: fromEmail,
            to: email,
            subject: `【声宝盒】支付成功 - 订单 ${orderId}`,
            html: emailHtml
        });

        console.log('✅ 邮件发送成功');
        console.log('邮件ID:', result.messageId);
        console.log('完整响应:', JSON.stringify(result, null, 2));
        return result;
    } catch (error: any) {
        console.error('❌ 邮件发送失败');
        console.error('错误信息:', error.message);
        console.error('错误详情:', JSON.stringify(error, null, 2));
        throw error;
    }
}

/**
 * 发送测试邮件
 */
export async function sendTestEmail(email: string) {
    console.log('📧 开始发送测试邮件...');
    console.log('收件人:', email);

    const transporter = createTransporter();
    const fromEmail = getFromEmail();

    const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                .success-box { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; color: #999; font-size: 14px; margin-top: 30px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✅ 测试邮件</h1>
                    <p>邮件发送功能测试</p>
                </div>
                <div class="content">
                    <div class="success-box">
                        <strong>🎉 恭喜！</strong> 如果您收到这封邮件，说明邮件发送功能配置正确，工作正常。
                    </div>
                    
                    <p>这是一封由声宝盒系统自动发送的测试邮件。</p>
                    <p><strong>发送时间：</strong>${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</p>
                    <p><strong>收件人：</strong>${email}</p>
                    
                    <p style="margin-top: 30px;">订单支付成功后，系统会自动发送类似格式的确认邮件给用户。</p>
                    
                    <div class="footer">
                        <p>此邮件由系统自动发送，请勿直接回复</p>
                        <p>© 2026 声宝盒 - 为孩子定制专属语音故事</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;

    try {
        console.log('📤 准备发送测试邮件...');
        console.log('发件人:', fromEmail);
        console.log('收件人:', email);
        console.log('主题: 【声宝盒】测试邮件 - 邮件发送功能正常');
        
        const result = await transporter.sendMail({
            from: fromEmail,
            to: email,
            subject: '【声宝盒】测试邮件 - 邮件发送功能正常',
            html: emailHtml
        });

        console.log('✅ 测试邮件发送成功');
        console.log('邮件ID:', result.messageId);
        console.log('完整响应:', JSON.stringify(result, null, 2));
        return result;
    } catch (error: any) {
        console.error('❌ 测试邮件发送失败');
        console.error('错误信息:', error.message);
        console.error('错误详情:', JSON.stringify(error, null, 2));
        throw error;
    }
}
