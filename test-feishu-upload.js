/**
 * 测试飞书文件上传 API
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

// 测试文件上传
async function testFileUpload() {
    try {
        console.log('开始测试飞书文件上传...\n');

        // 读取真实的测试文件
        const testBuffer = fs.readFileSync('/tmp/test_audio.wav');
        const fileName = 'test_recording.wav';

        console.log('测试文件大小:', testBuffer.length, 'bytes');

        const accessToken = await getAccessToken();

        // 只测试方法6: 使用上传素材API - /drive/v1/medias/upload_all
        console.log('\n=== 测试方法6: 上传素材API (官方推荐) ===');
        const fileToken = await testMethod6(accessToken, testBuffer, fileName);
        
        if (fileToken) {
            console.log('\n✅ 成功获取 file_token:', fileToken);
            console.log('现在可以在创建记录时使用这个 file_token');
        }

    } catch (error) {
        console.error('❌ 测试失败:', error);
        process.exit(1);
    }
}

// 方法1: /drive/v1/files/upload_all
async function testMethod1(accessToken, fileBuffer, fileName) {
    const form = new FormData();
    form.append('file_name', fileName);
    form.append('parent_type', 'explorer');
    form.append('file', fileBuffer, {
        filename: fileName,
        contentType: 'audio/wav'
    });

    const url = `${FEISHU_CONFIG.baseUrl}/drive/v1/files/upload_all`;
    
    console.log('URL:', url);
    console.log('参数:', {
        file_name: fileName,
        parent_type: 'explorer',
        file_size: fileBuffer.length
    });

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            ...form.getHeaders()
        },
        body: form
    });

    console.log('状态码:', response.status);
    const responseText = await response.text();
    console.log('响应:', responseText.substring(0, 500));

    if (response.ok) {
        const result = JSON.parse(responseText);
        if (result.code === 0) {
            console.log('✅ 方法1成功! file_token:', result.data.file_token);
            return result.data.file_token;
        } else {
            console.log('❌ 方法1失败:', result.msg);
        }
    } else {
        console.log('❌ 方法1 HTTP错误');
    }
}

// 方法2: /drive/v1/medias/upload_all
async function testMethod2(accessToken, fileBuffer, fileName) {
    const form = new FormData();
    form.append('file_name', fileName);
    form.append('file_type', 'opus');
    form.append('duration', '10000');
    form.append('file', fileBuffer, {
        filename: fileName,
        contentType: 'audio/wav'
    });

    const url = `${FEISHU_CONFIG.baseUrl}/drive/v1/medias/upload_all`;
    
    console.log('URL:', url);
    console.log('参数:', {
        file_name: fileName,
        file_type: 'opus',
        duration: '10000',
        file_size: fileBuffer.length
    });

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            ...form.getHeaders()
        },
        body: form
    });

    console.log('状态码:', response.status);
    const responseText = await response.text();
    console.log('响应:', responseText.substring(0, 500));

    if (response.ok) {
        const result = JSON.parse(responseText);
        if (result.code === 0) {
            console.log('✅ 方法2成功! file_key:', result.data.file_key);
            return result.data.file_key;
        } else {
            console.log('❌ 方法2失败:', result.msg);
        }
    } else {
        console.log('❌ 方法2 HTTP错误');
    }
}

// 方法3: /drive/v1/files/upload_all 带 parent_node
async function testMethod3(accessToken, fileBuffer, fileName) {
    const form = new FormData();
    form.append('file_name', fileName);
    form.append('parent_type', 'bitable_image');
    form.append('parent_node', FEISHU_CONFIG.baseToken);
    form.append('size', fileBuffer.length.toString());
    form.append('file', fileBuffer, {
        filename: fileName,
        contentType: 'audio/wav'
    });

    const url = `${FEISHU_CONFIG.baseUrl}/drive/v1/files/upload_all`;
    
    console.log('URL:', url);
    console.log('参数:', {
        file_name: fileName,
        parent_type: 'bitable_image',
        parent_node: FEISHU_CONFIG.baseToken,
        size: fileBuffer.length,
        file_size: fileBuffer.length
    });

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            ...form.getHeaders()
        },
        body: form
    });

    console.log('状态码:', response.status);
    const responseText = await response.text();
    console.log('响应:', responseText.substring(0, 500));

    if (response.ok) {
        const result = JSON.parse(responseText);
        if (result.code === 0) {
            console.log('✅ 方法3成功! file_token:', result.data.file_token);
            return result.data.file_token;
        } else {
            console.log('❌ 方法3失败:', result.msg);
        }
    } else {
        console.log('❌ 方法3 HTTP错误');
    }
}

// 方法4: 最简单方式
async function testMethod4(accessToken, fileBuffer, fileName) {
    const form = new FormData();
    form.append('file', fileBuffer, {
        filename: fileName,
        contentType: 'audio/wav'
    });

    const url = `${FEISHU_CONFIG.baseUrl}/drive/v1/files/upload_all`;
    
    console.log('URL:', url);
    console.log('参数: 只有 file');

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            ...form.getHeaders()
        },
        body: form
    });

    console.log('状态码:', response.status);
    const responseText = await response.text();
    console.log('响应:', responseText.substring(0, 500));

    if (response.ok) {
        const result = JSON.parse(responseText);
        if (result.code === 0) {
            console.log('✅ 方法4成功! file_token:', result.data.file_token);
            return result.data.file_token;
        } else {
            console.log('❌ 方法4失败:', result.msg);
        }
    } else {
        console.log('❌ 方法4 HTTP错误');
    }
}

// 方法5: 使用 parent_type=bitable_file
async function testMethod5(accessToken, fileBuffer, fileName) {
    const form = new FormData();
    form.append('file_name', fileName);
    form.append('parent_type', 'bitable_file');
    form.append('parent_node', FEISHU_CONFIG.baseToken);
    form.append('size', fileBuffer.length.toString());
    form.append('file', fileBuffer, fileName);

    const url = `${FEISHU_CONFIG.baseUrl}/drive/v1/files/upload_all`;
    
    console.log('URL:', url);
    console.log('参数:', {
        file_name: fileName,
        parent_type: 'bitable_file',
        parent_node: FEISHU_CONFIG.baseToken,
        size: fileBuffer.length
    });

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            ...form.getHeaders()
        },
        body: form
    });

    console.log('状态码:', response.status);
    const responseText = await response.text();
    console.log('响应:', responseText);

    if (response.ok) {
        try {
            const result = JSON.parse(responseText);
            if (result.code === 0) {
                console.log('✅ 方法5成功! file_token:', result.data.file_token);
                return result.data.file_token;
            } else {
                console.log('❌ 方法5失败: code=' + result.code + ', msg=' + result.msg);
            }
        } catch (e) {
            console.log('❌ 方法5解析JSON失败');
        }
    } else {
        console.log('❌ 方法5 HTTP错误');
    }
}

// 方法6: 使用上传素材API - 修正版本
async function testMethod6(accessToken, fileBuffer, fileName) {
    const form = new FormData();
    form.append('file_name', fileName);
    form.append('parent_type', 'bitable_image');
    form.append('parent_node', FEISHU_CONFIG.baseToken);
    form.append('size', fileBuffer.length);  // 注意：这里是整数，不是字符串！
    form.append('file', fileBuffer, fileName);

    const url = `${FEISHU_CONFIG.baseUrl}/drive/v1/medias/upload_all`;
    
    console.log('URL:', url);
    console.log('参数:', {
        file_name: fileName,
        parent_type: 'bitable_image',
        parent_node: FEISHU_CONFIG.baseToken
    });

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            ...form.getHeaders()
        },
        body: form
    });

    console.log('状态码:', response.status);
    const responseText = await response.text();
    console.log('响应:', responseText);

    if (response.ok) {
        try {
            const result = JSON.parse(responseText);
            if (result.code === 0) {
                console.log('✅ 方法6成功! file_token:', result.data.file_token);
                return result.data.file_token;
            } else {
                console.log('❌ 方法6失败: code=' + result.code + ', msg=' + result.msg);
            }
        } catch (e) {
            console.log('❌ 方法6解析JSON失败:', e.message);
        }
    } else {
        console.log('❌ 方法6 HTTP错误');
    }
    return null;
}

// 运行测试
testFileUpload();
