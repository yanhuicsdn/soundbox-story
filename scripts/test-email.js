/**
 * 测试邮件发送功能
 */

const nodemailer = require('nodemailer');

// SMTP 配置
const SMTP_CONFIG = {
    host: 'smtp.sohu.com',
    port: 25,
    user: '13001274087@sohu.com',
    pass: '3RWJBEFLXTHK'
};

console.log('📧 测试 SMTP 邮件发送...');
console.log('配置:', {
    host: SMTP_CONFIG.host,
    port: SMTP_CONFIG.port,
    user: SMTP_CONFIG.user
});

// 创建邮件传输器
const transporter = nodemailer.createTransport({
    host: SMTP_CONFIG.host,
    port: SMTP_CONFIG.port,
    secure: false,
    auth: {
        user: SMTP_CONFIG.user,
        pass: SMTP_CONFIG.pass
    },
    debug: true, // 启用调试
    logger: true // 启用日志
});

// 测试邮件内容
const mailOptions = {
    from: `"声宝盒测试" <${SMTP_CONFIG.user}>`,
    to: '1543827@qq.com',
    subject: '【声宝盒】邮件发送测试',
    html: `
        <h1>测试邮件</h1>
        <p>这是一封测试邮件，用于验证 SMTP 配置是否正确。</p>
        <p>如果您收到这封邮件，说明邮件发送功能正常。</p>
        <p>测试时间: ${new Date().toLocaleString('zh-CN')}</p>
    `
};

// 发送邮件
transporter.sendMail(mailOptions)
    .then(result => {
        console.log('✅ 邮件发送成功!');
        console.log('Message ID:', result.messageId);
        console.log('Response:', result.response);
    })
    .catch(error => {
        console.error('❌ 邮件发送失败:');
        console.error('错误类型:', error.name);
        console.error('错误信息:', error.message);
        console.error('完整错误:', error);
    });
