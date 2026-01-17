import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const PAY_CONFIG = {
    pid: '2999',
    key: 'hkd9KnN9ets4NZB7sGtK1s2zt7abhinH'
};

function signParams(params: any, key: string) {
    const filteredParams = Object.keys(params)
        .filter(k => params[k] !== '' && params[k] !== null && params[k] !== undefined && k !== 'sign' && k !== 'sign_type')
        .sort()
        .reduce((result: any, k) => {
            result[k] = params[k];
            return result;
        }, {});

    const signContent = Object.keys(filteredParams)
        .map(k => `${k}=${filteredParams[k]}`)
        .join('&') + key;

    return crypto.createHash('md5')
        .update(signContent, 'utf8')
        .digest('hex');
}

async function handlePaymentNotify(params: any) {
    try {
        console.log('🔔 收到PayQixiang支付异步通知');
        console.log('接收到的参数:', JSON.stringify(params, null, 2));

        // 验签
        const receivedSign = params.sign;
        if (!receivedSign) {
            console.error('❌ 缺少签名参数');
            return new NextResponse('fail', { status: 400 });
        }

        const calculatedSign = signParams(params, PAY_CONFIG.key);
        console.log('计算签名:', calculatedSign);
        console.log('接收签名:', receivedSign);

        if (calculatedSign !== receivedSign) {
            console.error('❌ 签名验证失败');
            return new NextResponse('fail', { status: 400 });
        }

        console.log('✅ 签名验证通过');

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
            let orderDetails: any = {};
            if (params.param) {
                try {
                    orderDetails = JSON.parse(params.param);
                    console.log('📋 订单详情:', {
                        childName: orderDetails.childName,
                        voiceType: orderDetails.voiceType,
                        email: orderDetails.email,
                        productName: orderDetails.productName,
                        hasAudioFile: !!orderDetails.audioFileBase64
                    });
                } catch (e) {
                    console.error('❌ 解析附加数据失败:', e);
                }
            } else {
                console.warn('⚠️ 未收到附加数据 (param)');
            }

            // 准备订单数据
            const orderData: any = {
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
                    console.log('🎙️ 开始解码录音文件...');
                    const audioBuffer = Buffer.from(orderDetails.audioFileBase64, 'base64');
                    orderData.audioFile = {
                        buffer: audioBuffer,
                        filename: orderDetails.audioFileName,
                        mimetype: orderDetails.audioFileMimeType || 'audio/webm'
                    };
                    console.log('✅ 录音文件已解码，大小:', audioBuffer.length, 'bytes', '文件名:', orderDetails.audioFileName);
                } catch (decodeError) {
                    console.error('❌ 解码录音文件失败:', decodeError);
                }
            } else {
                console.warn('⚠️ 未收到录音文件数据');
            }

            // 保存/更新订单到飞书表格
            try {
                const { saveOrderToFeishu, updateOrderInFeishu } = await import('../../../lib/feishu');
                
                // 尝试更新订单，如果不存在则创建完整订单
                try {
                    await updateOrderInFeishu(outTradeNo, {
                        transactionId,
                        amount,
                        status: '已支付'
                    });
                    console.log('✅ 订单状态已更新到飞书表格');
                } catch (updateError) {
                    // 如果更新失败，创建完整的订单记录
                    console.log('⚠️ 更新失败，创建新订单记录');
                    await saveOrderToFeishu(orderData);
                    console.log('✅ 新订单已创建到飞书表格');
                }
            } catch (feishuError) {
                console.error('❌ 飞书表格操作失败:', feishuError);
            }

            // 调用故事生成 API
            if (orderData.audioFile && orderData.audioFile.buffer) {
                try {
                    const { createStoryTask, getPackageId } = await import('../../../lib/storyApi');
                    
                    console.log('🎬 开始创建故事生成任务...');
                    
                    const taskResult = await createStoryTask({
                        babyName: orderDetails.childName,
                        parentType: orderDetails.voiceType,
                        packageId: getPackageId(orderDetails.productName),
                        voiceFileBuffer: orderData.audioFile.buffer,
                        voiceFileName: orderData.audioFile.filename
                    });

                    if (taskResult.success && taskResult.taskId) {
                        console.log('✅ 故事生成任务已创建，task_id:', taskResult.taskId);
                        
                        // 更新订单，添加 taskId
                        try {
                            const { updateOrderInFeishu } = await import('../../../lib/feishu');
                            await updateOrderInFeishu(outTradeNo, {
                                taskId: taskResult.taskId,
                                storyStatus: '生成中'
                            });
                            console.log('✅ 任务ID已保存到订单');
                        } catch (updateError) {
                            console.error('❌ 保存任务ID失败:', updateError);
                        }
                    } else {
                        console.error('❌ 创建故事生成任务失败:', taskResult.error);
                    }
                } catch (apiError) {
                    console.error('❌ 调用故事生成API异常:', apiError);
                }
            } else {
                console.warn('⚠️ 没有录音文件，跳过故事生成');
            }

            // 发送确认邮件（带录音附件）
            try {
                const { sendOrderConfirmationEmail } = await import('../../../lib/email');
                
                // 从飞书表格获取录音文件信息
                let audioFileUrl = undefined;
                let audioFileName = undefined;
                
                try {
                    const { getAllOrders } = await import('../../../lib/feishu');
                    const orders = await getAllOrders();
                    const orderRecord = orders.find((order: any) => order.orderId === outTradeNo);
                    
                    if (orderRecord && orderRecord.audioFile && orderRecord.audioFile.length > 0) {
                        const audioFileObj = orderRecord.audioFile[0];
                        audioFileUrl = audioFileObj.url;
                        audioFileName = audioFileObj.name;
                        console.log('📎 找到录音文件:', audioFileName);
                    } else {
                        console.log('⚠️ 订单中没有录音文件');
                    }
                } catch (fetchError) {
                    console.error('⚠️ 获取录音文件信息失败:', fetchError);
                }
                
                await sendOrderConfirmationEmail({
                    orderId: outTradeNo,
                    transactionId,
                    amount,
                    email: orderDetails.email,
                    childName: orderDetails.childName,
                    voiceType: orderDetails.voiceType,
                    audioFileUrl,
                    audioFileName
                });
                console.log('✅ 确认邮件已发送');
            } catch (emailError) {
                console.error('❌ 发送邮件失败:', emailError);
            }

        } else {
            console.log('❌ 订单支付失败:', status);
        }

        return new NextResponse('success');

    } catch (error) {
        console.error('❌ 处理异步通知失败:', error);
        return new NextResponse('fail', { status: 500 });
    }
}

// 支持 POST 方法（JSON 格式）
export async function POST(request: NextRequest) {
    const params = await request.json();
    return handlePaymentNotify(params);
}

// 支持 GET 方法（URL 参数格式）
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const params: any = {};
    
    // 将 URL 参数转换为对象
    searchParams.forEach((value, key) => {
        params[key] = value;
    });
    
    console.log('📥 收到 GET 请求，参数:', params);
    return handlePaymentNotify(params);
}

// 旧的 nodemailer 邮件发送函数已删除，现在使用 lib/email.ts 中的 Resend 服务
