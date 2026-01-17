/**
 * 在飞书多维表格中添加故事生成相关字段
 * 运行方式: npx tsx scripts/add-feishu-fields.ts
 */

import { createTableFields } from '../lib/feishu';

async function main() {
    console.log('========================================');
    console.log('  在飞书表格中添加字段');
    console.log('========================================\n');

    try {
        // 检查环境变量
        const requiredEnvVars = [
            'FEISHU_APP_ID',
            'FEISHU_APP_SECRET',
            'FEISHU_BASE_TOKEN',
            'FEISHU_TABLE_ID'
        ];

        const missingVars = requiredEnvVars.filter(v => !process.env[v]);
        
        if (missingVars.length > 0) {
            console.error('❌ 缺少必要的环境变量:');
            missingVars.forEach(v => console.error(`   - ${v}`));
            console.error('\n请在 .env 文件中配置这些变量');
            process.exit(1);
        }

        console.log('✅ 环境变量检查通过\n');
        console.log('将添加以下字段到飞书表格：\n');
        console.log('基础字段：');
        console.log('  - 订单号 (文本)');
        console.log('  - 交易号 (文本)');
        console.log('  - 支付金额 (数字)');
        console.log('  - 商品名称 (文本)');
        console.log('  - 宝宝名字 (文本)');
        console.log('  - 声音类型 (文本)');
        console.log('  - 用户邮箱 (文本)');
        console.log('  - 支付状态 (文本)');
        console.log('  - 支付时间 (日期)');
        console.log('  - 创建时间 (日期)');
        console.log('  - 录音文件 (附件)\n');
        
        console.log('故事生成字段：');
        console.log('  - 任务ID (文本)');
        console.log('  - 故事状态 (单选: 生成中/生成完成/生成失败)');
        console.log('  - 下载链接 (URL)');
        console.log('  - 错误信息 (文本)\n');

        console.log('开始创建字段...\n');

        // 调用创建字段函数
        const createdFields = await createTableFields();

        console.log('\n========================================');
        console.log('  字段添加完成！');
        console.log('========================================\n');

        if (createdFields && createdFields.length > 0) {
            console.log(`✅ 成功创建 ${createdFields.length} 个新字段`);
        } else {
            console.log('ℹ️  所有字段可能已存在，未创建新字段');
        }

        console.log('\n下一步：');
        console.log('1. 登录飞书，查看多维表格确认字段已添加');
        console.log('2. 检查"故事状态"字段的选项是否正确');
        console.log('3. 测试订单系统与故事生成API的集成\n');

    } catch (error: any) {
        console.error('\n========================================');
        console.error('  字段添加失败！');
        console.error('========================================\n');
        console.error('错误信息:', error.message);
        
        if (error.message.includes('tenant_access_token')) {
            console.error('\n可能的原因：');
            console.error('  - FEISHU_APP_ID 或 FEISHU_APP_SECRET 配置错误');
            console.error('  - 应用权限不足');
        } else if (error.message.includes('app_token') || error.message.includes('table_id')) {
            console.error('\n可能的原因：');
            console.error('  - FEISHU_BASE_TOKEN 或 FEISHU_TABLE_ID 配置错误');
            console.error('  - 应用没有访问该表格的权限');
        }
        
        console.error('\n请检查：');
        console.error('1. .env 文件中的飞书配置是否正确');
        console.error('2. 飞书应用是否有"多维表格"的读写权限');
        console.error('3. 应用是否已添加到对应的多维表格中\n');
        
        process.exit(1);
    }
}

// 运行主函数
main();
