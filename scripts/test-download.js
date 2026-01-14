/**
 * 测试飞书文件下载 API
 */

require('dotenv').config();

const FEISHU_CONFIG = {
    baseUrl: 'https://open.feishu.cn/open-apis',
    appId: process.env.FEISHU_APP_ID,
    appSecret: process.env.FEISHU_APP_SECRET,
    baseToken: process.env.FEISHU_BASE_TOKEN,
    tableId: process.env.FEISHU_TABLE_ID
};

// 获取访问令牌
async function getAccessToken() {
    const url = `${FEISHU_CONFIG.baseUrl}/auth/v3/tenant_access_token/internal`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            app_id: FEISHU_CONFIG.appId,
            app_secret: FEISHU_CONFIG.appSecret
        })
    });

    const result = await response.json();
    
    if (result.code !== 0) {
        throw new Error(`获取访问令牌失败: ${result.msg}`);
    }

    return result.tenant_access_token;
}

// 获取所有订单记录
async function getAllOrders() {
    const accessToken = await getAccessToken();
    
    const url = `${FEISHU_CONFIG.baseUrl}/bitable/v1/apps/${FEISHU_CONFIG.baseToken}/tables/${FEISHU_CONFIG.tableId}/records`;
    
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    });

    const result = await response.json();
    
    if (result.code !== 0) {
        throw new Error(`获取订单列表失败: ${result.msg}`);
    }

    return result.data.items;
}

// 测试下载文件
async function testDownload(fileToken) {
    console.log('\n📥 测试下载文件...');
    console.log('file_token:', fileToken);
    
    const accessToken = await getAccessToken();
    console.log('✅ 访问令牌获取成功');
    
    const url = `${FEISHU_CONFIG.baseUrl}/drive/v1/medias/${fileToken}/download`;
    console.log('📍 下载URL:', url);
    
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    console.log('📡 响应状态:', response.status, response.statusText);
    console.log('📋 响应头:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ 下载失败响应:', errorText);
        return;
    }

    const buffer = await response.arrayBuffer();
    console.log('✅ 文件下载成功，大小:', buffer.byteLength, 'bytes');
}

// 主函数
async function main() {
    try {
        console.log('🔍 开始测试飞书文件下载...\n');
        
        // 获取所有订单
        console.log('📊 获取订单列表...');
        const orders = await getAllOrders();
        console.log('✅ 成功获取', orders.length, '条订单\n');
        
        // 找到第一个有录音文件的订单
        const orderWithAudio = orders.find(order => 
            order.fields['录音文件'] && 
            order.fields['录音文件'].length > 0
        );
        
        if (!orderWithAudio) {
            console.log('⚠️ 没有找到包含录音文件的订单');
            return;
        }
        
        console.log('📋 找到订单:');
        console.log('  订单号:', orderWithAudio.fields['订单号']);
        console.log('  宝宝名字:', orderWithAudio.fields['宝宝名字']);
        console.log('  录音文件:', orderWithAudio.fields['录音文件']);
        
        const fileToken = orderWithAudio.fields['录音文件'][0].file_token;
        
        // 测试下载
        await testDownload(fileToken);
        
    } catch (error) {
        console.error('❌ 测试失败:', error);
        console.error('错误详情:', error.message);
    }
}

main();
