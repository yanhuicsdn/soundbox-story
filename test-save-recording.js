/**
 * 测试完整的录音保存到飞书流程
 */

const fs = require('fs');
const FormData = require('form-data');

// 飞书配置
const FEISHU_CONFIG = {
    appId: process.env.FEISHU_APP_ID || 'cli_a834914dcf6c500d',
    appSecret: process.env.FEISHU_APP_SECRET || 'LLweMTeb33fFvJ4pDec9LhHfEtswX1L1',
    baseUrl: 'https://open.feishu.cn/open-apis',
    baseToken: process.env.FEISHU_BASE_TOKEN || 'BwfBbSdPmaXjuls14RZcA22znUY',
    tableId: process.env.FEISHU_TABLE_ID || 'tblU7uysGphfPxab'
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

    console.log('✅ 访问令牌获取成功');
    return result.tenant_access_token;
}

// 上传文件到飞书
async function uploadFileToFeishu(accessToken, fileBuffer, fileName) {
    const form = new FormData();
    form.append('file_name', fileName);
    form.append('parent_type', 'bitable_image');
    form.append('parent_node', FEISHU_CONFIG.baseToken);
    form.append('size', fileBuffer.length);
    form.append('file', fileBuffer, fileName);

    const url = `${FEISHU_CONFIG.baseUrl}/drive/v1/medias/upload_all`;
    
    console.log('📤 上传文件到飞书...');
    console.log('文件名:', fileName);
    console.log('文件大小:', fileBuffer.length, 'bytes');

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            ...form.getHeaders()
        },
        body: form
    });

    const responseText = await response.text();
    console.log('上传响应:', responseText);

    if (!response.ok) {
        throw new Error(`上传失败: ${response.status} ${responseText}`);
    }

    const result = JSON.parse(responseText);
    
    if (result.code !== 0) {
        throw new Error(`上传失败: ${result.msg}`);
    }

    console.log('✅ 文件上传成功, file_token:', result.data.file_token);
    return result.data.file_token;
}

// 保存订单到飞书表格
async function saveOrderToFeishu(accessToken, orderData, fileToken) {
    const record = {
        fields: {}
    };

    // 添加订单字段
    if (orderData.orderId) record.fields['订单号'] = orderData.orderId;
    if (orderData.productName) record.fields['商品名称'] = orderData.productName;
    if (orderData.childName) record.fields['宝宝名字'] = orderData.childName;
    if (orderData.voiceType) record.fields['声音类型'] = orderData.voiceType;
    if (orderData.email) record.fields['用户邮箱'] = orderData.email;
    if (orderData.status) record.fields['支付状态'] = orderData.status;

    // 添加录音文件（数组格式）
    if (fileToken) {
        record.fields['录音文件'] = [{
            file_token: fileToken
        }];
    }

    console.log('\n📝 准备写入的字段:', Object.keys(record.fields));
    console.log('📝 订单数据:', JSON.stringify(record, null, 2));

    const url = `${FEISHU_CONFIG.baseUrl}/bitable/v1/apps/${FEISHU_CONFIG.baseToken}/tables/${FEISHU_CONFIG.tableId}/records`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(record)
    });

    const result = await response.json();
    
    console.log('\n保存响应:', JSON.stringify(result, null, 2));

    if (result.code !== 0) {
        throw new Error(`保存失败: code=${result.code}, msg=${result.msg}`);
    }

    console.log('✅ 订单已保存到飞书表格, 记录ID:', result.data.record.record_id);
    return result.data.record;
}

// 主测试函数
async function testSaveRecording() {
    try {
        console.log('开始测试录音保存到飞书流程...\n');

        // 1. 获取访问令牌
        const accessToken = await getAccessToken();

        // 2. 读取测试文件
        const fileBuffer = fs.readFileSync('/tmp/test_audio.wav');
        const fileName = 'test_recording.wav';
        console.log('测试文件大小:', fileBuffer.length, 'bytes\n');

        // 3. 上传文件获取 file_token
        const fileToken = await uploadFileToFeishu(accessToken, fileBuffer, fileName);

        // 4. 准备订单数据
        const orderData = {
            orderId: 'SB' + Date.now(),
            productName: '体验包',
            childName: '测试宝宝',
            voiceType: '妈妈',
            email: 'test@example.com',
            status: '待支付'
        };

        // 5. 保存订单到飞书表格
        const record = await saveOrderToFeishu(accessToken, orderData, fileToken);

        console.log('\n🎉 测试成功！');
        console.log('记录ID:', record.record_id);

    } catch (error) {
        console.error('\n❌ 测试失败:', error);
        console.error('错误详情:', error.message);
        process.exit(1);
    }
}

// 运行测试
testSaveRecording();
