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
    getAccessToken
};
