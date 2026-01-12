/**
 * 测试脚本 - 模拟支付通知
 * 用于测试邮件发送和飞书保存功能
 */

const crypto = require('crypto');
const nodemailer = require('nodemailer');

// 配置
const CONFIG = {
    // SMTP 配置
    smtp: {
        host: 'smtp.sohu.com',
        port: 25,
        user: '13001274087@sohu.com',
        pass: '3RWJBEFLXTHK'
    },
    // 飞书配置
    feishu: {
        appId: 'cli_a834914dcf6c500d',
        appSecret: 'LLweMTeb33fFvJ4pDec9LhHfEtswX1L1',
        baseUrl: 'https://open.feishu.cn/open-apis',
        baseToken: 'BwfBbSdPmaXjuls14RZcA22znUY',
        tableId: 'tblU7uysGphfPxab'
    }
};

// 测试订单数据
const testOrderData = {
    orderId: 'TEST' + Date.now(),
    transactionId: 'TXN' + Date.now(),
    amount: '19.00',
    productName: '体验包',
    childName: 'haohao',
    voiceType: '爸爸',
    email: '1543827@qq.com',
    status: '已支付'
};

/**
 * 测试邮件发送
 */
async function testEmail() {
    console.log('\n📧 测试邮件发送...');
    
    try {
        const transporter = nodemailer.createTransport({
            host: CONFIG.smtp.host,
            port: CONFIG.smtp.port,
            secure: false,
            auth: {
                user: CONFIG.smtp.user,
                pass: CONFIG.smtp.pass
            }
        });

        const mailOptions = {
            from: `"声宝盒" <${CONFIG.smtp.user}>`,
            to: testOrderData.email,
            subject: `【声宝盒】支付成功测试 - 订单 ${testOrderData.orderId}`,
            html: `
                <h2>🎉 支付成功测试</h2>
                <p>这是一封测试邮件，验证邮件发送功能是否正常。</p>
                <p><strong>订单号:</strong> ${testOrderData.orderId}</p>
                <p><strong>交易号:</strong> ${testOrderData.transactionId}</p>
                <p><strong>金额:</strong> ¥${testOrderData.amount}</p>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('✅ 邮件发送成功!');
        console.log('   Message ID:', result.messageId);
        return true;
    } catch (error) {
        console.error('❌ 邮件发送失败:', error.message);
        return false;
    }
}

/**
 * 获取飞书访问令牌
 */
async function getFeishuToken() {
    const url = `${CONFIG.feishu.baseUrl}/auth/v3/tenant_access_token/internal`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            app_id: CONFIG.feishu.appId,
            app_secret: CONFIG.feishu.appSecret
        })
    });

    const result = await response.json();
    
    if (result.code !== 0) {
        throw new Error(`获取令牌失败: ${result.msg}`);
    }

    return result.tenant_access_token;
}

/**
 * 测试飞书表格保存
 */
async function testFeishu() {
    console.log('\n📊 测试飞书表格保存...');
    
    try {
        const accessToken = await getFeishuToken();
        console.log('✅ 获取飞书访问令牌成功');

        const now = Date.now(); // 使用时间戳（毫秒）
        const record = {
            fields: {
                '订单号': testOrderData.orderId,
                '交易号': testOrderData.transactionId,
                '支付金额': parseFloat(testOrderData.amount),
                '商品名称': testOrderData.productName,
                '宝宝名字': testOrderData.childName,
                '声音类型': testOrderData.voiceType,
                '用户邮箱': testOrderData.email,
                '支付状态': testOrderData.status,
                '支付时间': now,
                '创建时间': now
            }
        };

        const url = `${CONFIG.feishu.baseUrl}/bitable/v1/apps/${CONFIG.feishu.baseToken}/tables/${CONFIG.feishu.tableId}/records`;
        
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
            throw new Error(`保存失败: ${result.msg}`);
        }

        console.log('✅ 订单已保存到飞书表格!');
        console.log('   记录 ID:', result.data.record.record_id);
        return true;
    } catch (error) {
        console.error('❌ 飞书保存失败:', error.message);
        return false;
    }
}

/**
 * 运行所有测试
 */
async function runTests() {
    console.log('🧪 开始测试支付通知功能...');
    console.log('测试订单数据:', testOrderData);

    const emailResult = await testEmail();
    const feishuResult = await testFeishu();

    console.log('\n📋 测试结果汇总:');
    console.log('   邮件发送:', emailResult ? '✅ 成功' : '❌ 失败');
    console.log('   飞书保存:', feishuResult ? '✅ 成功' : '❌ 失败');

    if (emailResult && feishuResult) {
        console.log('\n🎉 所有测试通过！支付通知功能正常。');
        console.log('   请检查邮箱和飞书表格确认数据已保存。');
    } else {
        console.log('\n⚠️  部分测试失败，请检查配置和网络连接。');
    }
}

// 执行测试
runTests()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('\n💥 测试失败:', error);
        process.exit(1);
    });
