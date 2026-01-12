/**
 * 简单测试支付通知功能
 */

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

console.log('📤 测试数据准备完成');
console.log('订单号:', testNotifyData.out_trade_no);
console.log('签名:', testNotifyData.sign);
console.log('\n完整数据:');
console.log(JSON.stringify(testNotifyData, null, 2));

console.log('\n\n使用 curl 测试命令:');
console.log('curl -X POST https://story.66668888.cloud/api/payment-notify \\');
console.log('  -H "Content-Type: application/json" \\');
console.log(`  -d '${JSON.stringify(testNotifyData)}'`);
