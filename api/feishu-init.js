/**
 * Vercel Serverless Function - 初始化飞书表格字段
 * 路径: /api/feishu-init
 * 用于一次性创建飞书表格所需的所有字段
 */

const { createTableFields } = require('./lib/feishu');

export default async function handler(req, res) {
    // 只允许 POST 请求
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        console.log('🚀 开始初始化飞书表格字段...');

        // 创建表格字段
        const fields = await createTableFields();

        res.json({
            success: true,
            message: '飞书表格字段初始化成功',
            fields: fields.map(f => ({
                field_id: f.field_id,
                field_name: f.field_name,
                type: f.type
            }))
        });

    } catch (error) {
        console.error('❌ 初始化飞书表格字段失败:', error);

        res.status(500).json({
            success: false,
            message: '初始化失败: ' + error.message
        });
    }
}
