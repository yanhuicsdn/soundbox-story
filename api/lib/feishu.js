/**
 * 飞书多维表格 API 集成
 * 用于保存订单数据到飞书表格
 */

// 飞书配置
const FEISHU_CONFIG = {
    appId: process.env.FEISHU_APP_ID || 'cli_a834914dcf6c500d',
    appSecret: process.env.FEISHU_APP_SECRET || 'LLweMTeb33fFvJ4pDec9LhHfEtswX1L1',
    baseUrl: process.env.FEISHU_BASE_URL || 'https://open.feishu.cn/open-apis',
    // 多维表格信息
    baseToken: 'BwfBbSdPmaXjuls14RZcA22znUY',
    tableId: 'tblU7uysGphfPxab'
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
        const accessToken = await getAccessToken();
        
        // 创建 FormData
        const FormData = require('form-data');
        const form = new FormData();
        form.append('file', fileBuffer, fileName);
        form.append('parent_type', 'bitable_file');
        form.append('parent_node', FEISHU_CONFIG.baseToken);
        form.append('size', fileBuffer.length.toString());
        
        const url = `${FEISHU_CONFIG.baseUrl}/drive/v1/files/upload_all`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                ...form.getHeaders()
            },
            body: form
        });

        const result = await response.json();
        
        if (result.code !== 0) {
            throw new Error(`文件上传失败: ${result.msg}`);
        }

        console.log('✅ 文件上传成功, file_token:', result.data.file_token);
        return result.data.file_token;

    } catch (error) {
        console.error('❌ 上传文件到飞书失败:', error);
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
                '支付时间': new Date().toISOString(),
                '创建时间': new Date().toISOString()
            }
        };

        // 如果有录音文件，上传到飞书
        if (orderData.audioFile) {
            try {
                console.log('🎙️ 上传录音文件到飞书...');
                const fileToken = await uploadFileToFeishu(
                    orderData.audioFile.buffer,
                    orderData.audioFile.filename
                );
                record.fields['录音文件'] = [{
                    file_token: fileToken,
                    name: orderData.audioFile.filename,
                    size: orderData.audioFile.buffer.length,
                    type: orderData.audioFile.mimetype
                }];
                console.log('✅ 录音文件已添加到记录');
            } catch (uploadError) {
                console.error('❌ 上传录音文件失败:', uploadError);
                // 录音文件上传失败不影响订单保存
            }
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

module.exports = {
    saveOrderToFeishu,
    getAccessToken,
    createTableFields,
    uploadFileToFeishu
};
