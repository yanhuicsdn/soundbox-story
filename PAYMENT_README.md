# 声宝盒 - PayQixiang 支付集成指南

## 📋 概述

本支付系统使用 PayQixiang 第三方支付网关，支持支付宝和微信支付。

### 配置信息

```
接口地址: https://api.payqixiang.cn/
商户ID: 2999
MD5密钥: hkd9KnN9ets4NZB7sGtK1s2zt7abhinH
```

---

## 🚀 快速开始

### 1. 安装依赖

```bash
cd /Users/yanhui/soundbox-story
npm install express axios
```

### 2. 启动支付服务器

```bash
node payment-payqixiang.js
```

服务启动后运行在 `http://localhost:3000`

### 3. 配置异步通知地址（生产环境）

在 PayQixiang 商户后台设置：
- 异步通知URL: `https://your-domain.com/api/payment/notify`
- 同步跳转URL: `https://your-domain.com/payment/result`

---

## 📡 API 接口

### 1. 创建支付订单

**POST** `/api/payment/create`

**请求参数**:
```json
{
  "orderId": "SB2025011212345",
  "productName": "哄睡故事包",
  "productDesc": "哄睡故事包 - 小明的定制故事",
  "amount": 79.00,
  "childName": "小明",
  "voiceType": "妈妈",
  "email": "user@example.com",
  "payType": "alipay"
}
```

**响应**:
```json
{
  "success": true,
  "orderId": "SB2025011212345",
  "payUrl": "https://api.payqixiang.cn/pay.php?...",
  "message": "订单创建成功"
}
```

---

### 2. 查询订单状态

**GET** `/api/payment/status/:orderId`

**响应**:
```json
{
  "success": true,
  "order": {
    "orderId": "SB2025011212345",
    "productName": "哄睡故事包",
    "amount": 79.00,
    "status": "paid",
    "paidAt": "2025-01-12T14:30:00.000Z",
    "transactionId": "2025011222001xxxxx"
  }
}
```

---

### 3. 主动查询支付结果

**POST** `/api/payment/query`

**请求参数**:
```json
{
  "orderId": "SB2025011212345"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "pay_status": "1",
    "pay_transaction_id": "2025011222001xxxxx",
    "pay_amount": "79.00"
  }
}
```

---

### 4. 支付异步通知（由PayQixiang调用）

**POST** `/api/payment/notify`

PayQixiang会在支付成功后自动调用此接口。

**通知参数**:
```
pay_memberid: 商户ID
pay_orderid: 商户订单号
pay_transaction_id: 平台交易号
pay_amount: 支付金额
pay_status: 支付状态 (1=成功)
pay_md5sign: 签名
pay_attach: 附加数据
```

**响应**: 返回字符串 `"success"` 或 `"fail"`

---

## 🔐 签名算法

### MD5 签名步骤

1. **过滤空值**: 移除参数中的空值
2. **排序参数**: 按参数名 ASCII 码升序排列
3. **拼接字符串**: `key1=value1&key2=value2...商户MD5密钥`
4. **MD5加密**: 对拼接字符串进行MD5加密
5. **转大写**: 将签名转为大写

### 示例代码

```javascript
function signParams(params, md5Key) {
    // 1. 过滤空值并排序
    const sortedParams = Object.keys(params)
        .filter(key => params[key] !== '' && params[key] !== null && params[key] !== undefined)
        .sort()
        .reduce((result, key) => {
            result[key] = params[key];
            return result;
        }, {});

    // 2. 拼接字符串
    const signContent = Object.keys(sortedParams)
        .map(key => `${key}=${sortedParams[key]}`)
        .join('&') + md5Key;

    // 3. MD5加密并转大写
    const sign = crypto
        .createHash('md5')
        .update(signContent, 'utf8')
        .digest('hex')
        .toUpperCase();

    return sign;
}
```

### 测试签名

```bash
# 调用测试接口
curl http://localhost:3000/api/payment/sign/test
```

---

## 💳 支付流程

### 方案1: 跳转支付（推荐）

```
1. 用户点击"立即支付"
   ↓
2. 前端调用 POST /api/payment/create
   ↓
3. 后端返回 payUrl
   ↓
4. 前端跳转到 payUrl（PayQixiang支付页面）
   ↓
5. 用户完成支付
   ↓
6. PayQixiang异步通知 POST /api/payment/notify
   ↓
7. PayQixiang同步跳转 GET /payment/result
```

### 方案2: 扫码支付

```
1. 用户点击"立即支付"
   ↓
2. 前端调用 POST /api/payment/create
   ↓
3. 后端返回二维码URL
   ↓
4. 前端生成二维码图片
   ↓
5. 用户扫码支付
   ↓
6. 前端定时查询支付状态
   ↓
7. PayQixiang异步通知 POST /api/payment/notify
```

---

## 🧪 测试

### 测试接口

```bash
# 查看服务状态
curl http://localhost:3000/api/payment/test

# 测试签名
curl http://localhost:3000/api/payment/sign/test

# 健康检查
curl http://localhost:3000/health
```

### 创建测试订单

```bash
curl -X POST http://localhost:3000/api/payment/create \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "TEST001",
    "productName": "测试商品",
    "amount": 0.01,
    "childName": "测试",
    "voiceType": "妈妈",
    "email": "test@example.com",
    "payType": "alipay"
  }'
```

### 查询订单

```bash
curl http://localhost:3000/api/payment/status/TEST001
```

---

## 🔗 前端集成

### 方式1: 跳转到支付页面

```javascript
// 在 script.js 的 submitOrder() 函数中
async function submitOrder(productId) {
    // ... 现有代码 ...

    // 提交订单后跳转到支付页面
    const payUrl = `payment-integration.html?orderId=${orderId}&product=${encodeURIComponent(product.name)}&amount=${product.price}&childName=${encodeURIComponent(childName)}&voiceType=${encodeURIComponent(voiceType)}&email=${encodeURIComponent(email)}`;

    window.location.href = payUrl;
}
```

### 方式2: 内嵌支付

```javascript
// 使用 iframe 内嵌支付页面
function showPaymentFrame(payUrl) {
    const iframe = document.createElement('iframe');
    iframe.src = payUrl;
    iframe.style.width = '100%';
    iframe.style.height = '600px';
    iframe.style.border = 'none';

    document.getElementById('payment-container').appendChild(iframe);
}
```

---

## 📊 支付状态说明

| 状态 | 说明 |
|------|------|
| `pending` | 待支付 |
| `paid` | 已支付 |
| `failed` | 支付失败 |
| `refunded` | 已退款 |
| `expired` | 已过期 |

---

## 🛡️ 安全建议

1. **验签**: 所有异步通知必须验签
2. **HTTPS**: 生产环境必须使用HTTPS
3. **订单检查**: 支付成功后检查订单金额是否匹配
4. **防重放**: 记录已处理的交易号，防止重复通知
5. **日志记录**: 记录所有支付相关日志
6. **异常处理**: 妥善处理网络异常和超时

---

## 📱 支付方式

| 支付方式 | pay_type 参数 |
|---------|--------------|
| 支付宝 | `alipay` |
| 微信支付 | `wechat` |

---

## 🔄 生产环境部署

### 1. 修改配置

编辑 `payment-payqixiang.js`:

```javascript
const PAY_CONFIG = {
    apiUrl: 'https://api.payqixiang.cn/',
    merchantId: '2999',  // 替换为你的商户ID
    md5Key: 'hkd9KnN9ets4NZB7sGtK1s2zt7abhinH',  // 替换为你的MD5密钥
    notifyUrl: 'https://your-domain.com/api/payment/notify',
    returnUrl: 'https://your-domain.com/payment/result'
};
```

### 2. 使用PM2管理进程

```bash
# 安装PM2
npm install -g pm2

# 启动服务
pm2 start payment-payqixiang.js --name soundbox-payment

# 查看状态
pm2 status

# 查看日志
pm2 logs soundbox-payment

# 设置开机自启
pm2 startup
pm2 save
```

### 3. Nginx反向代理

```nginx
server {
    listen 80;
    server_name pay.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4. 配置SSL证书

```bash
# 使用Let's Encrypt
sudo certbot --nginx -d pay.yourdomain.com
```

---

## 🐛 常见问题

### 问题1: 签名验证失败

**原因**:
- 参数顺序错误
- MD5密钥错误
- 字符编码问题

**解决**:
```javascript
// 确保使用UTF-8编码
const signContent = Object.keys(sortedParams)
    .map(key => `${key}=${sortedParams[key]}`)
    .join('&') + PAY_CONFIG.md5Key;
```

### 问题2: 异步通知未收到

**原因**:
- 通知URL无法访问
- 防火墙阻止
- 响应不是"success"

**解决**:
```javascript
// 确保返回正确的响应
app.post('/api/payment/notify', (req, res) => {
    // ... 处理逻辑 ...
    res.send('success');  // 必须返回字符串"success"
});
```

### 问题3: 跨域问题

**解决**:
```javascript
const cors = require('cors');
app.use(cors());
```

---

## 📞 技术支持

- PayQixiang文档: https://qixiangpay.cn/doc_old.html
- 商户后台: https://payqixiang.cn/

---

*更新时间: 2025-01-12*
*版本: v1.0*
