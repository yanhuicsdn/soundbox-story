# 声宝盒 - 部署指南

## 🌐 部署架构

```
前端网站 (Vercel)
  https://story.66668888.cloud/
  ├─ index.html (主页面)
  ├─ payment-integration.html (支付页面)
  └─ script.js

支付服务器 (需要单独部署)
  ├─ payment-payqixiang.js (PayQixiang 支付宝接口)
  └─ 需要部署到云服务器
```

---

## 📋 部署步骤

### 第一步：前端已部署 ✅

前端网站已经部署在 Vercel 上：
- **域名**: https://story.66668888.cloud/
- **状态**: 已完成

### 第二步：部署支付服务器

支付服务器需要单独部署到一个有公网IP的服务器上（因为PayQixiang需要通过异步通知来告知支付结果）。

#### 选项1: 使用云服务器（推荐）

1. **购买云服务器**
   - 阿里云 ECS / 腾讯云 CVM
   - 配置: 1核2GB 即可
   - 系统: Ubuntu 20.04+

2. **连接服务器**
   ```bash
   ssh root@your-server-ip
   ```

3. **安装 Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

4. **上传代码**
   ```bash
   # 在本地执行
   scp payment-payqixiang.js payment-package.json root@your-server-ip:/root/soundbox-payment/
   ```

5. **安装依赖**
   ```bash
   cd /root/soundbox-payment
   npm install
   ```

6. **配置环境变量**
   ```bash
   export NOTIFY_URL='http://your-server-ip:3000/api/payment/notify'
   export RETURN_URL='https://story.66668888.cloud/payment/result'
   ```

7. **使用PM2管理进程**
   ```bash
   npm install -g pm2
   pm2 start payment-payqixiang.js --name soundbox-payment
   pm2 save
   pm2 startup
   ```

8. **配置防火墙**
   ```bash
   sudo ufw allow 3000
   ```

9. **获取服务器公网IP并配置域名**（可选）
   - 购买域名（如: pay.yourdomain.com）
   - 解析A记录到服务器IP
   - 配置Nginx反向代理

#### 选项2: 使用内网穿透（开发测试）

如果只是测试，可以使用内网穿透工具：

```bash
# 使用 ngrok
ngrok http 3000

# 会生成一个公网地址，如:
# https://abc123.ngrok.io

# 然后配置环境变量
export NOTIFY_URL='https://abc123.ngrok.io/api/payment/notify'
export RETURN_URL='https://story.66668888.cloud/payment/result'
```

---

## ⚙️ 配置支付页面

部署支付服务器后，需要修改 `payment-integration.html` 中的 API 地址：

### 开发环境（本地测试）

```javascript
const API_BASE_URL = 'http://localhost:3000';
```

### 生产环境

将 `payment-integration.html` 第276行修改为：

```javascript
const API_BASE_URL = 'http://your-server-ip:3000';
// 或使用域名
const API_BASE_URL = 'https://pay.yourdomain.com';
```

然后重新部署到 Vercel：
```bash
git add .
git commit -m "chore: 更新支付服务器地址"
git push
```

---

## 🧪 测试支付流程

### 本地测试

1. **启动支付服务器**
   ```bash
   cd /Users/yanhui/soundbox-story
   node payment-payqixiang.js
   ```

2. **访问前端网站**
   ```
   https://story.66668888.cloud/
   ```

3. **选择产品并填写信息**

4. **点击支付**，会跳转到支付页面

5. **在支付页面点击"前往支付宝支付"**

6. **检查控制台日志**，确认API调用成功

### 生产环境测试

1. 确保支付服务器正在运行：
   ```bash
   pm2 status
   ```

2. 测试健康检查：
   ```bash
   curl http://your-server-ip:3000/health
   ```

3. 访问网站并完成一次小额支付测试（如0.01元）

---

## 🔧 配置 PayQixiang 商户后台

登录 PayQixiang 商户后台，配置以下信息：

1. **异步通知URL**: `http://your-server-ip:3000/api/payment/notify`
2. **同步跳转URL**: `https://story.66668888.cloud/payment/result`

**注意**: 异步通知地址必须是公网可访问的URL

---

## 📊 支付流程图

```
用户 → 前端网站 (Vercel)
  ↓ 选择产品
  ↓ 填写信息
  ↓ 录音
  ↓ 点击支付
  ↓
跳转到 payment-integration.html
  ↓ 点击"前往支付宝支付"
  ↓
调用支付服务器 API
  ↓ 创建订单
  ↓ 返回支付URL
  ↓
跳转到支付宝收银台
  ↓ 用户完成支付
  ↓
PayQixiang 异步通知支付服务器
  ↓
支付服务器处理订单
  ↓ 发送邮件/调用语音克隆
  ↓
用户浏览器跳转回前端网站
```

---

## ❓ 常见问题

### Q1: 点击支付没有反应？

**检查**:
1. 打开浏览器控制台 (F12)
2. 查看是否有 JavaScript 错误
3. 查看网络请求是否成功

### Q2: 提示 "Failed to fetch"？

**原因**: 支付服务器未启动或地址配置错误

**解决**:
1. 确认支付服务器已启动: `pm2 status`
2. 检查 `payment-integration.html` 中的 `API_BASE_URL` 是否正确
3. 检查服务器防火墙是否开放3000端口

### Q3: 支付成功后没有收到通知？

**检查**:
1. 查看支付服务器日志: `pm2 logs soundbox-payment`
2. 确认 PayQixiang 后台配置的异步通知URL是否正确
3. 确认异步通知URL可以从公网访问

### Q4: 如何查看支付服务器日志？

```bash
# 实时查看日志
pm2 logs soundbox-payment

# 查看最近100行
pm2 logs soundbox-payment --lines 100
```

---

## 📝 生产环境检查清单

部署到生产环境前，请确认：

- [ ] 支付服务器已部署到云服务器
- [ ] 支付服务器使用PM2管理，开机自启
- [ ] 服务器防火墙已开放3000端口
- [ ] `payment-integration.html` 中的 `API_BASE_URL` 已更新
- [ ] PayQixiang 后台配置了正确的异步通知URL
- [ ] 异步通知URL可以从公网访问
- [ ] 已完成至少一次小额支付测试
- [ ] 支付成功后的业务逻辑已实现（邮件、语音克隆等）

---

## 🚀 快速部署命令

```bash
# 1. 克隆代码
git clone https://github.com/yanhuicsdn/soundbox-story.git
cd soundbox-story

# 2. 安装依赖
npm install

# 3. 启动支付服务器（开发环境）
node payment-payqixiang.js

# 4. 或使用PM2（生产环境）
pm2 start payment-payqixiang.js --name soundbox-payment
pm2 save
pm2 startup
```

---

## 📞 技术支持

- PayQixiang 文档: https://qixiangpay.cn/doc_old.html
- 仓库地址: https://github.com/yanhuicsdn/soundbox-story

---

*更新时间: 2025-01-12*
*版本: v1.0*
