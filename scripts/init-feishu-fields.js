/**
 * 本地脚本 - 初始化飞书表格字段
 * 使用方法: node scripts/init-feishu-fields.js
 */

// 飞书配置
const FEISHU_CONFIG = {
    appId: 'cli_a834914dcf6c500d',
    appSecret: 'LLweMTeb33fFvJ4pDec9LhHfEtswX1L1',
    baseUrl: 'https://open.feishu.cn/open-apis',
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

    console.log('✅ 获取访问令牌成功');
    return result.tenant_access_token;
}

/**
 * 创建飞书表格字段
 */
async function createTableFields() {
    try {
        console.log('📋 开始创建飞书表格字段...\n');
        
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
                    console.log(`⚠️  字段 "${field.field_name}" 已存在，跳过`);
                } else {
                    console.error(`❌ 字段 "${field.field_name}" 创建失败:`, result.msg);
                }
            } catch (error) {
                console.error(`❌ 创建字段 "${field.field_name}" 时出错:`, error.message);
            }
        }

        console.log(`\n✅ 字段创建完成，共创建 ${createdFields.length} 个新字段`);
        console.log('\n📊 飞书表格已准备就绪！');
        return createdFields;

    } catch (error) {
        console.error('❌ 创建飞书表格字段失败:', error.message);
        throw error;
    }
}

// 执行创建
createTableFields()
    .then(() => {
        console.log('\n🎉 初始化完成！');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 初始化失败:', error);
        process.exit(1);
    });
