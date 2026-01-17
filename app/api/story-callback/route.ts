import { NextRequest, NextResponse } from 'next/server';

/**
 * 故事生成完成回调接口
 * 接收算力机器发送的生成完成通知
 */
export async function POST(request: NextRequest) {
    try {
        const data = await request.json();
        
        console.log('🔔 收到故事生成回调通知');
        console.log('回调数据:', JSON.stringify(data, null, 2));

        const { task_id, status, data: taskData } = data;

        if (!task_id) {
            console.error('❌ 缺少 task_id');
            return NextResponse.json({ status: 'error', message: '缺少 task_id' }, { status: 400 });
        }

        // 更新飞书表格中的任务状态
        try {
            const { updateTaskStatus } = await import('../../../lib/feishu');
            
            if (status === 'completed') {
                console.log('✅ 故事生成完成');
                const downloadUrl = taskData?.download_url;
                
                await updateTaskStatus(task_id, {
                    status: '生成完成',
                    downloadUrl: downloadUrl
                });

                // 发送邮件通知用户
                try {
                    const { sendStoryCompletedEmail } = await import('../../../lib/email');
                    const orderInfo = await getOrderInfoByTaskId(task_id);
                    
                    if (orderInfo) {
                        await sendStoryCompletedEmail({
                            email: orderInfo.email,
                            childName: orderInfo.childName,
                            downloadUrl: downloadUrl,
                            orderId: orderInfo.orderId
                        });
                        console.log('✅ 完成通知邮件已发送');
                    }
                } catch (emailError) {
                    console.error('❌ 发送完成通知邮件失败:', emailError);
                }

            } else if (status === 'failed') {
                console.log('❌ 故事生成失败');
                const error = taskData?.error || '未知错误';
                
                await updateTaskStatus(task_id, {
                    status: '生成失败',
                    error: error
                });

                // 可以选择发送失败通知邮件
                console.log('生成失败原因:', error);
            }

            return NextResponse.json({ status: 'ok' });

        } catch (updateError) {
            console.error('❌ 更新任务状态失败:', updateError);
            return NextResponse.json({ status: 'error', message: '更新状态失败' }, { status: 500 });
        }

    } catch (error: any) {
        console.error('❌ 处理回调失败:', error);
        return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
    }
}

/**
 * 根据 task_id 获取订单信息
 */
async function getOrderInfoByTaskId(taskId: string) {
    try {
        const { getAllOrders } = await import('../../../lib/feishu');
        const orders = await getAllOrders();
        
        const order = orders.find((o: any) => o.taskId === taskId);
        
        if (order) {
            return {
                orderId: order.orderId,
                email: order.email,
                childName: order.childName
            };
        }
        
        return null;
    } catch (error) {
        console.error('❌ 获取订单信息失败:', error);
        return null;
    }
}
