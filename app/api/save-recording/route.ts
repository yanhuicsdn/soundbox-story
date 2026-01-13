import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        console.log('🎙️ 收到录音保存请求');

        const body = await request.json();
        const {
            orderId,
            childName,
            voiceType,
            email,
            productName,
            audioFileBase64,
            audioFileName,
            audioFileMimeType
        } = body;

        console.log('📋 录音信息:', {
            orderId,
            childName,
            voiceType,
            email,
            productName,
            hasAudio: !!audioFileBase64
        });

        // 准备订单数据
        const orderData: any = {
            orderId,
            childName,
            voiceType,
            email,
            productName,
            status: '待支付',
            amount: '待确认'
        };

        // 解码录音文件
        if (audioFileBase64 && audioFileName) {
            try {
                console.log('🎙️ 开始解码录音文件...');
                const audioBuffer = Buffer.from(audioFileBase64, 'base64');
                const mimeType = audioFileMimeType || 'audio/webm';
                
                // 根据实际的音频格式确定文件扩展名
                let fileExtension = '.webm'; // 默认扩展名
                
                if (mimeType.includes('wav')) {
                    fileExtension = '.wav';
                } else if (mimeType.includes('webm')) {
                    fileExtension = '.webm';
                } else if (mimeType.includes('ogg')) {
                    fileExtension = '.ogg';
                } else if (mimeType.includes('mp3')) {
                    fileExtension = '.mp3';
                } else if (mimeType.includes('mp4') || mimeType.includes('m4a')) {
                    fileExtension = '.m4a';
                }
                
                // 生成文件名：宝宝名称_爸爸(或妈妈)_邮箱.扩展名
                const sanitizedChildName = (childName || '未命名').replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
                const sanitizedEmail = (email || 'noemail').replace(/[^a-zA-Z0-9@._-]/g, '');
                const newFileName = `${sanitizedChildName}_${voiceType}_${sanitizedEmail}${fileExtension}`;
                
                orderData.audioFile = {
                    buffer: audioBuffer,
                    filename: newFileName,
                    mimetype: mimeType
                };
                
                console.log('🎵 音频格式:', mimeType, '文件扩展名:', fileExtension);
                console.log('✅ 录音文件已解码，大小:', audioBuffer.length, 'bytes');
                console.log('📝 文件名:', newFileName);
            } catch (decodeError) {
                console.error('❌ 解码录音文件失败:', decodeError);
                return NextResponse.json({
                    success: false,
                    message: '录音文件解码失败'
                }, { status: 400 });
            }
        } else {
            console.warn('⚠️ 未收到录音文件数据');
            return NextResponse.json({
                success: false,
                message: '缺少录音文件'
            }, { status: 400 });
        }

        // 保存到飞书表格
        try {
            const { saveOrderToFeishu } = await import('../../../lib/feishu');
            const result = await saveOrderToFeishu(orderData);
            console.log('✅ 录音和订单信息已保存到飞书表格');

            return NextResponse.json({
                success: true,
                message: '录音保存成功',
                recordId: result?.record_id
            });
        } catch (feishuError: any) {
            console.error('❌ 保存到飞书表格失败:', feishuError);
            return NextResponse.json({
                success: false,
                message: '保存到飞书失败: ' + feishuError.message
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error('❌ 处理录音保存请求失败:', error);
        return NextResponse.json({
            success: false,
            message: '服务器错误: ' + error.message
        }, { status: 500 });
    }
}
