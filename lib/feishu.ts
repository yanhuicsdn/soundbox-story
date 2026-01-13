/**
 * 飞书多维表格 API 集成
 * 用于保存订单数据到飞书表格
 */

// 飞书配置
const FEISHU_CONFIG = {
    appId: process.env.FEISHU_APP_ID,
    appSecret: process.env.FEISHU_APP_SECRET,
    baseUrl: process.env.FEISHU_BASE_URL || 'https://open.feishu.cn/open-apis',
    // 多维表格信息（从环境变量读取，不在代码中硬编码）
    baseToken: process.env.FEISHU_BASE_TOKEN,
    tableId: process.env.FEISHU_TABLE_ID
};

/**
 * 获取飞书访问令牌
 */
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
        throw new Error(`获取飞书访问令牌失败: ${result.msg}`);
    }

    return result.tenant_access_token;
}

/**
 * 创建飞书表格字段
 */
async function createTableFields() {
    try {
        console.log('📋 开始创建飞书表格字段...');
        
        const accessToken = await getAccessToken();
        
        // 定义需要创建的字段
        const fields = [
            { field_name: '订单号', type: 1 }, // 文本
            { field_name: '交易号', type: 1 }, // 文本
            { field_name: '支付金额', type: 2 }, // 数字
            { field_name: '商品名称', type: 1 }, // 文本
            { field_name: '宝宝名字', type: 1 }, // 文本
            { field_name: '声音类型', type: 1 }, // 文本
            { field_name: '用户邮箱', type: 1 }, // 文本
            { field_name: '支付状态', type: 1 }, // 文本
            { field_name: '支付时间', type: 5 }, // 日期
            { field_name: '创建时间', type: 5 }, // 日期
            { field_name: '录音文件', type: 17 } // 附件
        ];

        const url = `${FEISHU_CONFIG.baseUrl}/bitable/v1/apps/${FEISHU_CONFIG.baseToken}/tables/${FEISHU_CONFIG.tableId}/fields`;
        
        const createdFields = [];
        
        for (const field of fields) {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(field)
                });

                const result = await response.json();
                
                if (result.code === 0) {
                    console.log(`✅ 字段 "${field.field_name}" 创建成功`);
                    createdFields.push(result.data.field);
                } else if (result.code === 1254034) {
                    console.log(`⚠️ 字段 "${field.field_name}" 已存在，跳过`);
                } else {
                    console.error(`❌ 字段 "${field.field_name}" 创建失败:`, result.msg);
                }
            } catch (error) {
                console.error(`❌ 创建字段 "${field.field_name}" 时出错:`, error);
            }
        }

        console.log(`✅ 字段创建完成，共创建 ${createdFields.length} 个字段`);
        return createdFields;

    } catch (error) {
        console.error('❌ 创建飞书表格字段失败:', error);
        throw error;
    }
}

/**
 * 上传文件到飞书
 * @param {Buffer} fileBuffer - 文件内容
 * @param {string} fileName - 文件名
 */
async function uploadFileToFeishu(fileBuffer, fileName) {
    try {
        console.log('🔑 获取飞书访问令牌...');
        const accessToken = await getAccessToken();
        console.log('✅ 访问令牌获取成功');
        
        // 创建 FormData - 使用最简单的方式上传文件
        const FormData = require('form-data');
        const form = new FormData();
        form.append('file_name', fileName);
        form.append('parent_type', 'explorer');  // 上传到云空间
        form.append('file', fileBuffer, {
            filename: fileName,
            contentType: 'audio/wav'
        });
        
        const url = `${FEISHU_CONFIG.baseUrl}/drive/v1/files/upload_all`;
        
        console.log('📤 发送文件上传请求到飞书...');
        console.log('URL:', url);
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

        console.log('📥 收到响应, 状态码:', response.status);
        console.log('响应头 Content-Type:', response.headers.get('content-type'));

        // 先获取响应文本
        const responseText = await response.text();
        console.log('响应内容:', responseText.substring(0, 500));

        // 检查响应状态
        if (!response.ok) {
            throw new Error(`HTTP错误: ${response.status} ${response.statusText}, 响应: ${responseText}`);
        }

        // 尝试解析 JSON
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            throw new Error(`解析响应JSON失败: ${parseError.message}, 响应内容: ${responseText}`);
        }
        
        if (result.code !== 0) {
            throw new Error(`文件上传失败: code=${result.code}, msg=${result.msg}`);
        }

        console.log('✅ 文件上传成功, file_token:', result.data.file_token);
        return result.data.file_token;

    } catch (error: any) {
        console.error('❌ 上传文件到飞书失败:', error);
        console.error('错误详情:', error.message);
        throw error;
    }
}

/**
 * 保存订单数据到飞书表格
 * @param {Object} orderData - 订单数据
 */
async function saveOrderToFeishu(orderData) {
    try {
        console.log('📊 开始保存订单到飞书表格...');
        
        // 获取访问令牌
        const accessToken = await getAccessToken();
        
        // 构建记录数据
        const now = Date.now(); // 使用时间戳（毫秒）
        const record = {
            fields: {
                '订单号': orderData.orderId,
                '交易号': orderData.transactionId || '',
                '支付金额': parseFloat(orderData.amount),
                '商品名称': orderData.productName || '',
                '宝宝名字': orderData.childName || '',
                '声音类型': orderData.voiceType || '',
                '用户邮箱': orderData.email || '',
                '支付状态': orderData.status || '已支付',
                '支付时间': now,
                '创建时间': now
            }
        };

        // 暂时不上传文件到飞书附件字段，将文件信息保存为备注
        // TODO: 后续研究飞书附件字段的正确上传方式
        if (orderData.audioFile) {
            console.log('🎙️ 记录录音文件信息（暂不上传文件）');
            const fileInfo = `录音文件: ${orderData.audioFile.filename}, 大小: ${orderData.audioFile.buffer.length} bytes`;
            // 可以添加一个备注字段来记录文件信息
            if (!record.fields['备注']) {
                record.fields['备注'] = fileInfo;
            }
            console.log('✅ 录音文件信息已记录');
        }

        console.log('📝 订单数据:', record);

        // 添加记录到表格
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
        
        if (result.code !== 0) {
            console.error('❌ 保存到飞书表格失败:', result);
            throw new Error(`保存失败: ${result.msg}`);
        }

        console.log('✅ 订单已保存到飞书表格, 记录ID:', result.data.record.record_id);
        return result.data.record;

    } catch (error) {
        console.error('❌ 保存订单到飞书表格失败:', error);
        throw error;
    }
}

export {
    saveOrderToFeishu,
    getAccessToken,
    createTableFields,
    uploadFileToFeishu
};
