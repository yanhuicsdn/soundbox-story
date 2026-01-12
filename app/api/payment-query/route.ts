import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const PAY_CONFIG = {
    apiUrl: 'https://api.payqixiang.cn/',
    merchantId: '2999',
    md5Key: 'hkd9KnN9ets4NZB7sGtK1s2zt7abhinH'
};

function signParams(params: any) {
    const filteredParams = Object.keys(params)
        .filter(key => params[key] !== '' && params[key] !== null && params[key] !== undefined && key !== 'pay_md5sign')
        .sort()
        .reduce((result: any, key) => {
            result[key] = params[key];
            return result;
        }, {});

    const signContent = Object.keys(filteredParams)
        .map(key => `${key}=${filteredParams[key]}`)
        .join('&') + PAY_CONFIG.md5Key;

    return crypto.createHash('md5')
        .update(signContent, 'utf8')
        .digest('hex')
        .toUpperCase();
}

export async function POST(request: NextRequest) {
    try {
        const { orderId } = await request.json();

        console.log('🔍 查询订单支付结果');
        console.log('订单号:', orderId);

        const params: any = {
            pay_memberid: PAY_CONFIG.merchantId,
            pay_orderid: orderId
        };

        params.pay_md5sign = signParams(params);

        const querystring = Object.keys(params)
            .map(key => `${key}=${encodeURIComponent(params[key])}`)
            .join('&');

        const response = await fetch(PAY_CONFIG.apiUrl + 'order_query.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: querystring
        });

        const result = await response.json();

        console.log('查询结果:', result);

        if (result.code === 1) {
            return NextResponse.json({
                success: true,
                status: result.status,
                orderId: result.order_id,
                amount: result.amount,
                tradeNo: result.trade_no
            });
        } else {
            return NextResponse.json({
                success: false,
                message: result.msg || '查询失败'
            }, { status: 400 });
        }

    } catch (error: any) {
        console.error('❌ 查询支付状态异常:', error);
        return NextResponse.json({
            success: false,
            message: '服务器错误',
            error: error.message
        }, { status: 500 });
    }
}
