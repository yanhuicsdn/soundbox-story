import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const envCheck = {
        smtp: {
            host: process.env.SMTP_HOST ? '✅ 已配置' : '❌ 未配置',
            port: process.env.SMTP_PORT ? '✅ 已配置' : '❌ 未配置',
            user: process.env.SMTP_USER ? '✅ 已配置' : '❌ 未配置',
            pass: process.env.SMTP_PASS ? '✅ 已配置' : '❌ 未配置'
        },
        feishu: {
            appId: process.env.FEISHU_APP_ID ? '✅ 已配置' : '❌ 未配置',
            appSecret: process.env.FEISHU_APP_SECRET ? '✅ 已配置' : '❌ 未配置',
            baseUrl: process.env.FEISHU_BASE_URL ? '✅ 已配置' : '❌ 未配置',
            baseToken: process.env.FEISHU_BASE_TOKEN ? '✅ 已配置' : '❌ 未配置',
            tableId: process.env.FEISHU_TABLE_ID ? '✅ 已配置' : '❌ 未配置'
        }
    };

    const envValues = {
        smtp: {
            host: process.env.SMTP_HOST || '未配置',
            port: process.env.SMTP_PORT || '未配置',
            user: process.env.SMTP_USER ? process.env.SMTP_USER.substring(0, 5) + '***' : '未配置',
            pass: process.env.SMTP_PASS ? '***' + process.env.SMTP_PASS.substring(process.env.SMTP_PASS.length - 3) : '未配置'
        },
        feishu: {
            appId: process.env.FEISHU_APP_ID ? process.env.FEISHU_APP_ID.substring(0, 8) + '***' : '未配置',
            baseToken: process.env.FEISHU_BASE_TOKEN ? process.env.FEISHU_BASE_TOKEN.substring(0, 8) + '***' : '未配置',
            tableId: process.env.FEISHU_TABLE_ID ? process.env.FEISHU_TABLE_ID.substring(0, 8) + '***' : '未配置'
        }
    };

    return NextResponse.json({
        message: '环境变量配置检查',
        status: envCheck,
        values: envValues,
        timestamp: new Date().toISOString()
    });
}
