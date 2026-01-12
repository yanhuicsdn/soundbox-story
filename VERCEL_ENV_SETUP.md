# Vercel 环境变量配置指南

## 📧 SMTP 邮件配置

支付成功后系统会自动发送确认邮件到用户邮箱。需要在 Vercel 项目中配置以下环境变量：

### 配置步骤

1. **登录 Vercel 控制台**
   - 访问: https://vercel.com/
   - 进入你的项目: `soundbox-story`

2. **进入环境变量设置**
   - 点击项目 → Settings → Environment Variables

3. **添加以下环境变量**

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `SMTP_HOST` | `smtp.sohu.com` | 搜狐邮箱 SMTP 服务器 |
| `SMTP_PORT` | `25` | SMTP 端口 |
| `SMTP_USER` | `13001274087@sohu.com` | 你的搜狐邮箱账号 |
| `SMTP_PASS` | `3RWJBEFLXTHK` | 搜狐邮箱授权码 |

### 重要说明

⚠️ **所有环境变量都需要应用到以下环境：**
- ✅ Production
- ✅ Preview
- ✅ Development

### 配置完成后

1. **重新部署项目**
   - 在 Vercel 控制台点击 "Redeploy" 按钮
   - 或者推送新的代码到 GitHub（会自动触发部署）

2. **验证配置**
   - 完成一次测试支付
   - 检查邮箱是否收到确认邮件
   - 查看 Vercel Functions 日志确认邮件发送状态

## 📝 环境变量截图示例

```
Name: SMTP_HOST
Value: smtp.sohu.com
Environments: ✅ Production ✅ Preview ✅ Development
```

## 🔍 故障排查

### 如果没有收到邮件

1. **检查 Vercel Functions 日志**
   ```
   Vercel Dashboard → Deployments → 选择最新部署 → Functions
   ```

2. **常见问题**
   - ❌ 环境变量未配置或配置错误
   - ❌ SMTP 授权码过期
   - ❌ 邮件被拦截到垃圾箱
   - ❌ PayQixiang 异步通知未到达

3. **查看日志关键字**
   - `✅ 邮件发送成功` - 邮件发送成功
   - `❌ SMTP 配置不完整` - 环境变量未配置
   - `❌ 发送邮件失败` - SMTP 连接或认证失败

## 📧 邮件内容

支付成功后，用户会收到包含以下信息的确认邮件：

- 订单号
- 交易号
- 支付金额
- 宝宝名字
- 声音类型
- 预计制作时间（24-48小时）
- 交付方式说明

---

**配置完成后记得删除此文件中的敏感信息！**
