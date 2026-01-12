/**
 * 测试支付通知功能
 * 用于验证邮件发送和飞书保存是否正常工作
 */

require('dotenv').config();
const crypto = require('crypto');

// 模拟支付通知数据
const testNotifyData = {
    pid: '2999',
    trade_no: 'TEST' + Date.now(),
    out_trade_no: 'SB1768215249247',
    type: 'alipay',
    name: '体验包',
    money: '9.9',
    trade_status: 'TRADE_SUCCESS',
    param: JSON.stringify({
        childName: '浩浩',
        voiceType: '爸爸',
        email: '1543827@qq.com',
        productName: '体验包'
    })
};

// 生成签名
const key = 'hkd9KnN9ets4NZB7sGtK1s2zt7abhinH';
const signContent = Object.keys(testNotifyData)
    .filter(k => testNotifyData[k] !== '' && k !== 'sign' && k !== 'sign_type')
    .sort()
    .map(k => `${k}=${testNotifyData[k]}`)
    .join('&') + key;

testNotifyData.sign = crypto.createHash('md5').update(signContent, 'utf8').digest('hex');
testNotifyData.sign_type = 'MD5';

console.log('📤 发送测试通知到本地 API...');
console.log('测试数据:', JSON.stringify(testNotifyData, null, 2));

// 发送到 Vercel 部署的 API
const VERCEL_URL = 'https://story.66668888.cloud/api/payment-notify';

fetch(VERCEL_URL, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(testNotifyData)
})
.then(response => response.text())
.then(result => {
    console.log('✅ API 响应:', result);
    console.log('\n请检查：');
    console.log('1. 邮箱 1543827@qq.com 是否收到邮件');
    console.log('2. 飞书表格是否有新记录');
})
.catch(error => {
    console.error('❌ 请求失败:', error);
});
