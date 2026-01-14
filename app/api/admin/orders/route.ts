import { NextRequest, NextResponse } from 'next/server';

// 简单的管理员密码验证
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

/**
 * 获取所有订单列表
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

        console.log('📊 管理员请求获取订单列表');

        // 从飞书获取所有订单
        const { getAllOrders } = await import('../../../../lib/feishu');
        const orders = await getAllOrders();

        console.log('✅ 成功获取', orders.length, '条订单');

        return NextResponse.json({
            success: true,
            data: orders,
            total: orders.length
        });

    } catch (error: any) {
        console.error('❌ 获取订单列表失败:', error);
        return NextResponse.json({
            success: false,
            message: error.message || '获取订单列表失败'
        }, { status: 500 });
    }
}
