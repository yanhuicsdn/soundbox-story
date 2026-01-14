import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

/**
 * 测试邮件发送功能
 */
export async function GET(request: NextRequest) {
    try {
        // 验证管理员密码
        const authHeader = request.headers.get('authorization');
        if (!authHeader || authHeader !== `Bearer ${ADMIN_PASSWORD}`) {
            return NextResponse.json({
                success: false,
                message: '未授权访问'
            }, { status: 401 });
        }

        // 获取测试邮箱地址
        const searchParams = request.nextUrl.searchParams;
        const testEmail = searchParams.get('email');

        if (!testEmail) {
            return NextResponse.json({
                success: false,
                message: '请提供测试邮箱地址，例如: ?email=test@example.com'
            }, { status: 400 });
        }

        console.log('📧 开始测试邮件发送...');
        console.log('测试邮箱:', testEmail);

        // 检查 SMTP 配置
        const SMTP_CONFIG = {
            host: process.env.SMTP_HOST || 'smtp.sohu.com',
            port: parseInt(process.env.SMTP_PORT || '25'),
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        };

        console.log('📮 SMTP配置:', {
            host: SMTP_CONFIG.host,
            port: SMTP_CONFIG.port,
            user: SMTP_CONFIG.user ? SMTP_CONFIG.user.substring(0, 5) + '***' : '未配置',
            pass: SMTP_CONFIG.pass ? '***已配置***' : '未配置'
        });

        if (!SMTP_CONFIG.user || !SMTP_CONFIG.pass) {
            return NextResponse.json({
                success: false,
                message: 'SMTP 配置不完整',
                config: {
                    host: SMTP_CONFIG.host,
                    port: SMTP_CONFIG.port,
                    user_configured: !!SMTP_CONFIG.user,
                    pass_configured: !!SMTP_CONFIG.pass
                }
            }, { status: 500 });
        }

        // 创建邮件传输器
        console.log('🔧 创建SMTP传输器...');
        const transporter = nodemailer.createTransport({
            host: SMTP_CONFIG.host,
            port: SMTP_CONFIG.port,
            secure: false,
            auth: {
                user: SMTP_CONFIG.user,
                pass: SMTP_CONFIG.pass
            }
        });

        // 验证 SMTP 连接
        console.log('🔍 验证SMTP连接...');
        try {
            await transporter.verify();
            console.log('✅ SMTP连接验证成功');
        } catch (verifyError: any) {
            console.error('❌ SMTP连接验证失败:', verifyError);
            return NextResponse.json({
                success: false,
                message: 'SMTP连接验证失败',
                error: verifyError.message
            }, { status: 500 });
        }

        // 发送测试邮件
        const mailOptions = {
            from: `"声宝盒" <${SMTP_CONFIG.user}>`,
            to: testEmail,
            subject: '【声宝盒】测试邮件 - 邮件发送功能正常',
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
                            <p><strong>收件人：</strong>${testEmail}</p>
                            
                            <p style="margin-top: 30px;">订单支付成功后，系统会自动发送类似格式的确认邮件给用户。</p>
                            
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

        console.log('📤 发送测试邮件...');
        const result = await transporter.sendMail(mailOptions);
        console.log('✅ 邮件发送成功:', result.messageId);

        return NextResponse.json({
            success: true,
            message: '测试邮件发送成功',
            data: {
                messageId: result.messageId,
                recipient: testEmail,
                from: SMTP_CONFIG.user,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error: any) {
        console.error('❌ 测试邮件发送失败:', error);
        return NextResponse.json({
            success: false,
            message: '测试邮件发送失败',
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
