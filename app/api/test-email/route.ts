import { NextRequest, NextResponse } from 'next/server';
import { sendTestEmail } from '../../../lib/email';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

/**
 * 测试邮件发送功能（使用 Resend）
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
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            return NextResponse.json({
                success: false,
                message: 'SMTP 配置不完整',
                hint: '请在 Vercel 环境变量中配置 SMTP_USER 和 SMTP_PASS',
                config: {
                    SMTP_HOST: process.env.SMTP_HOST || 'smtp.sohu.com',
                    SMTP_PORT: process.env.SMTP_PORT || '25',
                    SMTP_USER_configured: !!process.env.SMTP_USER,
                    SMTP_PASS_configured: !!process.env.SMTP_PASS
                }
            }, { status: 500 });
        }

        // 发送测试邮件
        const result = await sendTestEmail(testEmail);

        return NextResponse.json({
            success: true,
            message: '测试邮件发送成功',
            data: {
                messageId: result.messageId,
                recipient: testEmail,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error: any) {
        console.error('❌ 测试邮件发送失败:', error);
        return NextResponse.json({
            success: false,
            message: '测试邮件发送失败',
            error: error.message
        }, { status: 500 });
    }
}
