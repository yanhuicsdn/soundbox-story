/**
 * 测试使用 curl 下载飞书文件
 */

require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');

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

// 使用 curl 测试下载
function testDownloadWithCurl(fileToken, accessToken, fileName) {
    console.log('\n🔧 使用 curl 测试下载...');
    console.log('file_token:', fileToken);
    console.log('文件名:', fileName);
    
    const url = `${FEISHU_CONFIG.baseUrl}/drive/v1/medias/${fileToken}/download`;
    console.log('URL:', url);
    
    // 构建 curl 命令
    const curlCommand = `curl -v -X GET '${url}' \
        -H 'Authorization: Bearer ${accessToken}' \
        -o /tmp/${fileName}`;
    
    console.log('\n📝 执行 curl 命令:');
    console.log(curlCommand);
    console.log('\n');
    
    try {
        const output = execSync(curlCommand, { encoding: 'utf-8', stdio: 'inherit' });
        
        // 检查文件是否下载成功
        const filePath = `/tmp/${fileName}`;
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            console.log('\n✅ 文件下载成功！');
            console.log('文件路径:', filePath);
            console.log('文件大小:', stats.size, 'bytes');
            
            // 显示文件前100字节（如果是文本）
            if (stats.size > 0) {
                const buffer = fs.readFileSync(filePath);
                console.log('\n文件前100字节（hex）:');
                console.log(buffer.slice(0, 100).toString('hex'));
            }
        } else {
            console.log('❌ 文件未下载');
        }
    } catch (error) {
        console.error('❌ curl 执行失败:', error.message);
    }
}

// 主函数
async function main() {
    try {
        console.log('🔍 开始测试飞书文件下载（使用 curl）...\n');
        
        // 获取访问令牌
        console.log('🔑 获取访问令牌...');
        const accessToken = await getAccessToken();
        console.log('✅ 访问令牌获取成功');
        console.log('Token 前20字符:', accessToken.substring(0, 20) + '...\n');
        
        // 获取所有订单
        console.log('📊 获取订单列表...');
        const orders = await getAllOrders();
        console.log('✅ 成功获取', orders.length, '条订单\n');
        
        // 找到所有有录音文件的订单
        const ordersWithAudio = orders.filter(order => 
            order.fields['录音文件'] && 
            order.fields['录音文件'].length > 0
        );
        
        console.log('📋 找到', ordersWithAudio.length, '条包含录音文件的订单\n');
        
        if (ordersWithAudio.length < 3) {
            console.log('⚠️ 录音文件少于3条，无法获取倒数第三条');
            if (ordersWithAudio.length > 0) {
                console.log('使用第一条记录进行测试');
                const order = ordersWithAudio[0];
                console.log('\n📋 订单信息:');
                console.log('  订单号:', order.fields['订单号']);
                console.log('  宝宝名字:', order.fields['宝宝名字']);
                console.log('  录音文件:', JSON.stringify(order.fields['录音文件'], null, 2));
                
                const fileToken = order.fields['录音文件'][0].file_token;
                const fileName = `${order.fields['宝宝名字']}_${order.fields['声音类型']}.webm`;
                
                testDownloadWithCurl(fileToken, accessToken, fileName);
            }
            return;
        }
        
        // 获取倒数第三条
        const order = ordersWithAudio[ordersWithAudio.length - 3];
        
        console.log('📋 倒数第三条订单信息:');
        console.log('  订单号:', order.fields['订单号']);
        console.log('  宝宝名字:', order.fields['宝宝名字']);
        console.log('  声音类型:', order.fields['声音类型']);
        console.log('  录音文件:', JSON.stringify(order.fields['录音文件'], null, 2));
        
        const fileToken = order.fields['录音文件'][0].file_token;
        const fileName = `${order.fields['宝宝名字']}_${order.fields['声音类型']}.webm`;
        
        testDownloadWithCurl(fileToken, accessToken, fileName);
        
    } catch (error) {
        console.error('❌ 测试失败:', error);
        console.error('错误详情:', error.message);
    }
}

main();
