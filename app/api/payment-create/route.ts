import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const PAY_CONFIG = {
    apiUrl: 'https://api.payqixiang.cn/',
    pid: '2999',
    key: 'hkd9KnN9ets4NZB7sGtK1s2zt7abhinH',
    notifyUrl: 'https://story.66668888.cloud/api/payment-notify',
    returnUrl: 'https://story.66668888.cloud/payment-result'
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

    return crypto.createHash('md5').update(signContent, 'utf8').digest('hex');
}

export async function POST(request: NextRequest) {
    try {
        console.log('📦 收到创建支付订单请求');

        const body = await request.json();
        const {
            orderId,
            productName,
            productDesc,
            amount,
            childName,
            voiceType,
            email,
            audioFileBase64,
            audioFileName,
            audioFileMimeType
        } = body;

        const outTradeNo = orderId || `SB${Date.now()}${Math.floor(Math.random() * 10000)}`;

        console.log('订单号:', outTradeNo);
        console.log('商品名称:', productName);
        console.log('金额:', amount);

        const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                        request.headers.get('x-real-ip') || 
                        '127.0.0.1';

        console.log('客户端IP:', clientIp);

        const params: any = {
            pid: PAY_CONFIG.pid,
            type: 'alipay',
            out_trade_no: outTradeNo,
            notify_url: PAY_CONFIG.notifyUrl,
            return_url: PAY_CONFIG.returnUrl,
            name: productName,
            money: parseFloat(amount).toFixed(2),
            clientip: clientIp,
            device: 'jump',
            param: JSON.stringify({
                childName,
                voiceType,
                email,
                productName,
                audioFileBase64,
                audioFileName,
                audioFileMimeType
            })
        };

        const sign = signParams(params, PAY_CONFIG.key);
        params.sign = sign;
        params.sign_type = 'MD5';

        console.log('请求参数:', { ...params, param: '[已省略]', sign: sign.substring(0, 8) + '...' });

        const response = await fetch(PAY_CONFIG.apiUrl + 'mapi.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(params).toString()
        });

        const responseText = await response.text();
        console.log('📥 PayQixiang响应:', responseText);

        let result;
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            console.error('❌ 解析响应失败:', e);
            return NextResponse.json({
                success: false,
                message: '支付接口返回格式错误',
                raw: responseText
            }, { status: 500 });
        }

        if (result.code === 1) {
            console.log('✅ 支付订单创建成功');
            return NextResponse.json({
                success: true,
                orderId: outTradeNo,
                payUrl: result.payurl,
                tradeNo: result.trade_no
            });
        } else {
            console.error('❌ 创建支付订单失败:', result);
            return NextResponse.json({
                success: false,
                message: result.msg || '创建支付订单失败',
                code: result.code
            }, { status: 400 });
        }

    } catch (error: any) {
        console.error('❌ 创建支付订单异常:', error);
        return NextResponse.json({
            success: false,
            message: '服务器错误',
            error: error.message
        }, { status: 500 });
    }
}
