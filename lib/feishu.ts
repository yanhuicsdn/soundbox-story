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
            { field_name: '录音文件', type: 17 }, // 附件
            // 故事生成相关字段
            { field_name: '任务ID', type: 1 }, // 文本 - taskId
            { field_name: '故事状态', type: 3, property: { options: [{ name: '生成中' }, { name: '生成完成' }, { name: '生成失败' }] } }, // 单选
            { field_name: '下载链接', type: 15 }, // URL
            { field_name: '错误信息', type: 1 } // 文本
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
        
        // 使用 curl 命令上传文件（已验证可以成功）
        const fs = require('fs');
        const { execSync } = require('child_process');
        const tmpFile = `/tmp/${fileName}`;
        
        // 将 buffer 写入临时文件
        fs.writeFileSync(tmpFile, fileBuffer);
        
        const url = `${FEISHU_CONFIG.baseUrl}/drive/v1/medias/upload_all`;
        
        console.log('📤 使用 curl 上传文件到飞书...');
        console.log('URL:', url);
        console.log('文件名:', fileName);
        console.log('文件大小:', fileBuffer.length, 'bytes');
        
        // 构建 curl 命令
        const curlCommand = `curl -s -X POST '${url}' \
            -H 'Authorization: Bearer ${accessToken}' \
            -F 'file_name=${fileName}' \
            -F 'parent_type=bitable_image' \
            -F 'parent_node=${FEISHU_CONFIG.baseToken}' \
            -F 'size=${fileBuffer.length}' \
            -F 'file=@${tmpFile}'`;
        
        // 执行 curl 命令
        const responseText = execSync(curlCommand, { encoding: 'utf-8' });
        
        // 删除临时文件
        fs.unlinkSync(tmpFile);
        
        console.log('📥 收到响应:', responseText.substring(0, 200));

        // 解析响应
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
        
        // 构建记录数据 - 只使用飞书表格中存在的字段
        const now = Date.now(); // 使用时间戳（毫秒）
        const record = {
            fields: {} as any
        };

        // 只添加有值的字段，避免 FieldNameNotFound 错误
        if (orderData.orderId) record.fields['订单号'] = orderData.orderId;
        if (orderData.transactionId) record.fields['交易号'] = orderData.transactionId;
        if (orderData.amount) record.fields['支付金额'] = parseFloat(orderData.amount);
        if (orderData.productName) record.fields['商品名称'] = orderData.productName;
        if (orderData.childName) record.fields['宝宝名字'] = orderData.childName;
        if (orderData.voiceType) record.fields['声音类型'] = orderData.voiceType;
        if (orderData.email) record.fields['用户邮箱'] = orderData.email;
        if (orderData.status) record.fields['支付状态'] = orderData.status;

        // 如果有录音文件，上传到飞书并添加到附件字段
        if (orderData.audioFile) {
            try {
                console.log('🎙️ 上传录音文件到飞书...');
                const fileToken = await uploadFileToFeishu(
                    orderData.audioFile.buffer,
                    orderData.audioFile.filename
                );
                
                // 使用附件字段格式：数组包含对象
                record.fields['录音文件'] = [{
                    file_token: fileToken
                }];
                console.log('✅ 录音文件已上传，file_token:', fileToken);
            } catch (uploadError) {
                console.error('❌ 上传录音文件失败:', uploadError);
                // 录音文件上传失败不影响订单保存，记录到备注
                const fileInfo = `录音文件上传失败: ${orderData.audioFile.filename}, 大小: ${orderData.audioFile.buffer.length} bytes`;
                record.fields['备注'] = fileInfo;
            }
        }

        console.log('📝 准备写入的字段名称:', Object.keys(record.fields));
        console.log('📝 订单数据:', JSON.stringify(record, null, 2));

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
            console.error('错误代码:', result.code);
            console.error('错误信息:', result.msg);
            throw new Error(`保存失败: ${result.msg}`);
        }

        console.log('✅ 订单已保存到飞书表格, 记录ID:', result.data.record.record_id);
        return result.data.record;

    } catch (error) {
        console.error('❌ 保存订单到飞书表格失败:', error);
        throw error;
    }
}

/**
 * 根据订单号查找记录
 * @param {string} orderId - 订单号
 */
async function findRecordByOrderId(orderId) {
    try {
        console.log('🔍 查找订单记录:', orderId);
        const accessToken = await getAccessToken();
        
        // 使用筛选条件查询
        const url = `${FEISHU_CONFIG.baseUrl}/bitable/v1/apps/${FEISHU_CONFIG.baseToken}/tables/${FEISHU_CONFIG.tableId}/records/search`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                field_names: ['订单号', '支付状态', 'record_id'],
                filter: {
                    conjunction: 'and',
                    conditions: [{
                        field_name: '订单号',
                        operator: 'is',
                        value: [orderId]
                    }]
                }
            })
        });

        const result = await response.json();
        
        if (result.code !== 0) {
            console.error('❌ 查询记录失败:', result);
            return null;
        }

        if (result.data.items && result.data.items.length > 0) {
            console.log('✅ 找到订单记录, record_id:', result.data.items[0].record_id);
            return result.data.items[0];
        }

        console.log('⚠️ 未找到订单记录:', orderId);
        return null;

    } catch (error) {
        console.error('❌ 查找订单记录失败:', error);
        return null;
    }
}

/**
 * 更新飞书表格中的订单记录
 * @param {string} orderId - 订单号
 * @param {Object} updateData - 要更新的数据
 */
async function updateOrderInFeishu(orderId, updateData) {
    try {
        console.log('📝 开始更新订单记录:', orderId);
        
        // 先查找记录
        const existingRecord = await findRecordByOrderId(orderId);
        
        if (!existingRecord) {
            console.error('❌ 未找到订单记录:', orderId);
            throw new Error(`订单 ${orderId} 不存在`);
        }

        const recordId = existingRecord.record_id;
        console.log('📌 找到记录ID:', recordId);
        
        // 获取访问令牌
        const accessToken = await getAccessToken();
        
        // 构建更新数据
        const updateFields = {} as any;
        
        if (updateData.transactionId) updateFields['交易号'] = updateData.transactionId;
        if (updateData.amount) updateFields['支付金额'] = parseFloat(updateData.amount);
        if (updateData.status) updateFields['支付状态'] = updateData.status;
        
        // 故事生成相关字段
        if (updateData.taskId) updateFields['任务ID'] = updateData.taskId;
        if (updateData.storyStatus) updateFields['故事状态'] = updateData.storyStatus;
        if (updateData.downloadUrl) updateFields['下载链接'] = updateData.downloadUrl;
        if (updateData.storyError) updateFields['错误信息'] = updateData.storyError;
        
        console.log('📝 准备更新的字段:', Object.keys(updateFields));
        
        // 更新记录
        const url = `${FEISHU_CONFIG.baseUrl}/bitable/v1/apps/${FEISHU_CONFIG.baseToken}/tables/${FEISHU_CONFIG.tableId}/records/${recordId}`;
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: updateFields
            })
        });

        const result = await response.json();
        
        if (result.code !== 0) {
            console.error('❌ 更新记录失败:', result);
            throw new Error(`更新失败: ${result.msg}`);
        }

        console.log('✅ 订单记录已更新');
        return result.data.record;

    } catch (error) {
        console.error('❌ 更新订单记录失败:', error);
        throw error;
    }
}

/**
 * 获取所有订单记录（管理员用）
 */
async function getAllOrders() {
    try {
        console.log('📊 开始获取所有订单记录...');
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
            console.error('❌ 获取订单列表失败:', result);
            throw new Error(`获取失败: ${result.msg}`);
        }

        // 格式化订单数据
        const orders = result.data.items.map((item: any) => ({
            recordId: item.record_id,
            orderId: item.fields['订单号'],
            transactionId: item.fields['交易号'],
            amount: item.fields['支付金额'],
            productName: item.fields['商品名称'],
            childName: item.fields['宝宝名字'],
            voiceType: item.fields['声音类型'],
            email: item.fields['用户邮箱'],
            status: item.fields['支付状态'],
            audioFile: item.fields['录音文件'],
            // 故事生成相关字段
            taskId: item.fields['任务ID'],
            storyStatus: item.fields['故事状态'],
            downloadUrl: item.fields['下载链接'],
            storyError: item.fields['错误信息'],
            createdTime: item.created_time,
            modifiedTime: item.last_modified_time
        }));

        console.log('✅ 成功获取', orders.length, '条订单');
        return orders;

    } catch (error) {
        console.error('❌ 获取所有订单失败:', error);
        throw error;
    }
}

/**
 * 下载飞书文件
 * @param {string} downloadUrl - 直接下载URL（包含extra参数）
 */
async function downloadFileFromFeishu(downloadUrl: string) {
    try {
        console.log('📥 开始下载文件');
        console.log('下载URL:', downloadUrl);
        const accessToken = await getAccessToken();
        
        // 使用 fetch API 下载文件
        console.log('📥 使用 fetch 下载文件...');
        
        const response = await fetch(downloadUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        console.log('📡 响应状态:', response.status, response.statusText);
        console.log('📋 响应头:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ 下载失败');
            console.error('响应内容:', errorText);
            
            // 尝试解析错误信息
            let errorMsg = errorText;
            try {
                const errorJson = JSON.parse(errorText);
                errorMsg = `code: ${errorJson.code}, msg: ${errorJson.msg}`;
                console.error('错误详情:', errorJson);
            } catch (e) {
                console.error('无法解析为JSON');
            }
            
            throw new Error(`下载失败: ${response.status} ${response.statusText} - ${errorMsg.substring(0, 200)}`);
        }

        // 获取文件内容
        const arrayBuffer = await response.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);
        console.log('✅ 文件下载成功，大小:', fileBuffer.length, 'bytes');
        
        return fileBuffer;

    } catch (error: any) {
        console.error('❌ 下载文件失败:', error);
        console.error('错误详情:', error.message);
        throw error;
    }
}

/**
 * 根据任务ID更新故事生成状态
 * @param {string} taskId - 故事生成任务ID
 * @param {Object} updates - 要更新的数据
 */
async function updateTaskStatus(taskId: string, updates: {
    status?: string;
    downloadUrl?: string;
    error?: string;
}) {
    try {
        console.log('📝 开始更新任务状态:', taskId);
        console.log('更新内容:', updates);
        
        // 获取所有订单，找到对应的任务
        const orders = await getAllOrders();
        const order = orders.find((o: any) => o.taskId === taskId);
        
        if (!order || !order.recordId) {
            console.error('❌ 未找到对应的订单记录，taskId:', taskId);
            throw new Error(`未找到任务ID为 ${taskId} 的订单`);
        }

        console.log('✅ 找到订单记录:', order.orderId, 'recordId:', order.recordId);
        
        // 获取访问令牌
        const accessToken = await getAccessToken();
        
        // 构建更新字段
        const updateFields: any = {};
        
        if (updates.status) {
            updateFields['故事状态'] = updates.status;
            console.log('更新故事状态:', updates.status);
        }
        
        if (updates.downloadUrl) {
            updateFields['下载链接'] = updates.downloadUrl;
            console.log('更新下载链接:', updates.downloadUrl);
        }
        
        if (updates.error) {
            updateFields['错误信息'] = updates.error;
            console.log('更新错误信息:', updates.error);
        }

        if (Object.keys(updateFields).length === 0) {
            console.log('⚠️ 没有需要更新的字段');
            return;
        }

        console.log('📝 准备更新的字段:', Object.keys(updateFields));
        
        // 更新记录
        const url = `${FEISHU_CONFIG.baseUrl}/bitable/v1/apps/${FEISHU_CONFIG.baseToken}/tables/${FEISHU_CONFIG.tableId}/records/${order.recordId}`;
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: updateFields
            })
        });

        const result = await response.json();
        
        if (result.code !== 0) {
            console.error('❌ 更新任务状态失败:', result);
            throw new Error(`更新失败: ${result.msg}`);
        }

        console.log('✅ 任务状态已更新');
        return result.data.record;

    } catch (error: any) {
        console.error('❌ 更新任务状态失败:', error);
        console.error('错误详情:', error.message);
        throw error;
    }
}

export {
    saveOrderToFeishu,
    updateOrderInFeishu,
    getAllOrders,
    downloadFileFromFeishu,
    getAccessToken,
    createTableFields,
    uploadFileToFeishu,
    updateTaskStatus
};
