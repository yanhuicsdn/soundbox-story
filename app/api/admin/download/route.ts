import { NextRequest, NextResponse } from 'next/server';

// 简单的管理员密码验证
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

/**
 * 下载录音文件
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

        // 获取文件token和文件名
        const { searchParams } = new URL(request.url);
        const fileToken = searchParams.get('fileToken');
        const fileName = searchParams.get('fileName') || 'recording.webm';

        if (!fileToken) {
            return NextResponse.json({
                success: false,
                message: '缺少文件token'
            }, { status: 400 });
        }

        console.log('📥 管理员请求下载文件:', fileName);

        // 从飞书下载文件
        const { downloadFileFromFeishu } = await import('../../../../lib/feishu');
        const fileBuffer = await downloadFileFromFeishu(fileToken);

        console.log('✅ 文件下载成功，准备返回');

        // 返回文件
        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
                'Content-Length': fileBuffer.length.toString()
            }
        });

    } catch (error: any) {
        console.error('❌ 下载文件失败:', error);
        return NextResponse.json({
            success: false,
            message: error.message || '下载文件失败'
        }, { status: 500 });
    }
}
