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

        // 获取查询参数
        const searchParams = request.nextUrl.searchParams;
        const downloadUrl = searchParams.get('downloadUrl');
        const fileName = searchParams.get('fileName') || 'download.webm';

        if (!downloadUrl) {
            return NextResponse.json({
                success: false,
                message: '缺少下载URL'
            }, { status: 400 });
        }

        console.log('📥 开始下载文件');
        console.log('下载URL:', downloadUrl);
        console.log('文件名:', fileName);

        // 下载文件
        const { downloadFileFromFeishu } = await import('../../../../lib/feishu');
        const fileBuffer = await downloadFileFromFeishu(downloadUrl);

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
        console.error('错误堆栈:', error.stack);
        return NextResponse.json({
            success: false,
            message: error.message || '下载文件失败',
            error: error.toString()
        }, { status: 500 });
    }
}
