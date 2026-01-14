import { NextRequest, NextResponse } from 'next/server';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

/**
 * 测试下载功能 - 读取倒数第三条记录并测试下载
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

        console.log('🔍 开始测试下载功能...');

        // 获取所有订单
        const { getAllOrders } = await import('../../../lib/feishu');
        const orders = await getAllOrders();
        
        console.log('✅ 成功获取', orders.length, '条订单');

        // 找到所有有录音文件的订单
        const ordersWithAudio = orders.filter((order: any) => 
            order.audioFile && 
            order.audioFile.length > 0
        );
        
        console.log('📋 找到', ordersWithAudio.length, '条包含录音文件的订单');

        if (ordersWithAudio.length === 0) {
            return NextResponse.json({
                success: false,
                message: '没有找到包含录音文件的订单'
            });
        }

        // 获取倒数第三条，如果不足3条就用第一条
        const index = ordersWithAudio.length >= 3 ? ordersWithAudio.length - 3 : 0;
        const order = ordersWithAudio[index];
        
        console.log('📋 测试订单信息:');
        console.log('  订单号:', order.orderId);
        console.log('  宝宝名字:', order.childName);
        console.log('  声音类型:', order.voiceType);
        console.log('  录音文件:', JSON.stringify(order.audioFile));

        const audioFileObj = order.audioFile[0];
        const fileName = `${order.childName}_${order.voiceType}.webm`;
        
        console.log('📥 开始测试下载');
        console.log('audioFile 完整对象:', JSON.stringify(audioFileObj, null, 2));
        console.log('tmp_url:', audioFileObj.tmp_url);
        console.log('url:', audioFileObj.url);

        // 测试下载
        const { downloadFileFromFeishu, getAccessToken } = await import('../../../lib/feishu');
        
        // 先获取 access token 用于诊断
        const accessToken = await getAccessToken();
        console.log('✅ Access Token 获取成功，前20字符:', accessToken.substring(0, 20) + '...');
        
        let fileBuffer;
        let downloadError = null;
        
        try {
            // 使用tmp_url获取临时下载链接
            fileBuffer = await downloadFileFromFeishu(audioFileObj.tmp_url);
            console.log('✅ 下载测试成功！文件大小:', fileBuffer.length, 'bytes');
        } catch (downloadErr: any) {
            downloadError = downloadErr;
            console.error('❌ 下载失败:', downloadErr.message);
        }

        // 无论下载成功与否，都返回诊断信息
        return NextResponse.json({
            success: !!fileBuffer,
            message: fileBuffer ? '下载测试成功' : '下载测试失败',
            data: {
                orderId: order.orderId,
                childName: order.childName,
                voiceType: order.voiceType,
                fileToken: audioFileObj.file_token,
                downloadUrl: audioFileObj.url,
                fileName: fileName,
                audioFileObject: audioFileObj,
                fileSize: fileBuffer ? fileBuffer.length : 0,
                fileSizeKB: fileBuffer ? (fileBuffer.length / 1024).toFixed(2) : '0',
                filePreview: fileBuffer ? fileBuffer.slice(0, 100).toString('hex') : null,
                error: downloadError ? downloadError.message : null
            }
        }, { status: fileBuffer ? 200 : 500 });

    } catch (error: any) {
        console.error('❌ 测试失败:', error);
        console.error('错误详情:', error.message);
        console.error('错误堆栈:', error.stack);
        
        return NextResponse.json({
            success: false,
            message: error.message || '测试失败',
            error: error.toString()
        }, { status: 500 });
    }
}
