import nodemailer from 'nodemailer';

/**
 * 获取 SMTP 配置
 */
function getSMTPConfig() {
    const port = parseInt(process.env.SMTP_PORT || '25');
    const config = {
        host: process.env.SMTP_HOST || 'smtp.sohu.com',
        port: port,
        secure: port === 465, // 端口465使用SSL，其他端口使用false
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    };

    if (!config.auth.user || !config.auth.pass) {
        throw new Error('SMTP_USER 或 SMTP_PASS 未配置');
    }

    console.log('📮 SMTP配置:', {
        host: config.host,
        port: config.port,
        secure: config.secure,
        user: config.auth.user
    });

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
    audioFileUrl?: string;
    audioFileName?: string;
}) {
    const { orderId, transactionId, amount, email, childName, voiceType, audioFileUrl, audioFileName } = orderInfo;

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
        
        // 准备邮件选项
        const mailOptions: any = {
            from: fromEmail,
            to: email,
            subject: `【声宝盒】支付成功 - 订单 ${orderId}`,
            html: emailHtml
        };

        // 如果有录音文件，下载并添加为附件
        if (audioFileUrl && audioFileName) {
            try {
                console.log('📥 下载录音文件作为附件...');
                console.log('文件URL:', audioFileUrl);
                console.log('文件名:', audioFileName);
                
                // 动态导入 downloadFileFromFeishu 函数
                const { downloadFileFromFeishu } = await import('./feishu');
                const fileBuffer = await downloadFileFromFeishu(audioFileUrl);
                
                mailOptions.attachments = [{
                    filename: audioFileName,
                    content: fileBuffer,
                    contentType: 'audio/webm'
                }];
                
                console.log('✅ 录音文件已添加为附件，大小:', fileBuffer.length, 'bytes');
            } catch (attachError: any) {
                console.error('⚠️ 添加录音附件失败:', attachError.message);
                console.log('📧 继续发送邮件（不带附件）');
            }
        }
        
        const result = await transporter.sendMail(mailOptions);

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

/**
 * 发送故事生成完成通知邮件
 */
export async function sendStoryCompletedEmail(params: {
    email: string;
    childName: string;
    downloadUrl: string;
    orderId: string;
}) {
    const { email, childName, downloadUrl, orderId } = params;

    console.log('📧 发送故事完成通知邮件...');
    console.log('收件人:', email);

    const transporter = createTransporter();
    const fromEmail = getFromEmail();

    const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; background: #FF6B6B; color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: bold; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
                .info-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #FF6B6B; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 ${childName}的专属故事已生成！</h1>
                </div>
                <div class="content">
                    <p>亲爱的家长，您好！</p>
                    
                    <p>好消息！为<strong>${childName}</strong>定制的专属故事已经生成完成啦！</p>
                    
                    <p>现在您可以下载故事音频，让孩子享受您声音讲述的温暖故事了。</p>
                    
                    <div style="text-align: center;">
                        <a href="${downloadUrl}" class="button">立即下载故事</a>
                    </div>
                    
                    <div class="info-box">
                        <p><strong>📋 订单信息：</strong></p>
                        <ul style="margin: 10px 0; padding-left: 20px;">
                            <li>订单号：${orderId}</li>
                            <li>孩子姓名：${childName}</li>
                        </ul>
                    </div>
                    
                    <div class="info-box">
                        <p><strong>💡 温馨提示：</strong></p>
                        <ul style="margin: 10px 0; padding-left: 20px;">
                            <li>下载链接有效期为 30 天，请及时下载保存</li>
                            <li>建议使用电脑或手机浏览器下载</li>
                            <li>下载后是一个 ZIP 压缩包，解压后即可播放</li>
                            <li>故事音频为 WAV 格式，支持所有播放器</li>
                        </ul>
                    </div>
                    
                    <p style="margin-top: 20px;">祝您和${childName}享受美好的亲子时光！</p>
                </div>
                <div class="footer">
                    <p><strong>声宝盒</strong> - 用你的声音，给孩子最好的陪伴</p>
                    <p>如有问题，请联系客服</p>
                </div>
            </div>
        </body>
        </html>
    `;

    try {
        const result = await transporter.sendMail({
            from: fromEmail,
            to: email,
            subject: `🎉 ${childName}的专属故事已生成完成！`,
            html: emailHtml
        });

        console.log('✅ 故事完成通知邮件发送成功');
        console.log('Message ID:', result.messageId);

        return {
            success: true,
            messageId: result.messageId
        };

    } catch (error: any) {
        console.error('❌ 发送邮件失败:', error);
        throw error;
    }
}
