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

### SMTP 邮件配置

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `SMTP_HOST` | `smtp.sohu.com` | 搜狐邮箱 SMTP 服务器 |
| `SMTP_PORT` | `25` | SMTP 端口 |
| `SMTP_USER` | `13001274087@sohu.com` | 你的搜狐邮箱账号 |
| `SMTP_PASS` | `3RWJBEFLXTHK` | 搜狐邮箱授权码 |

### 飞书多维表格配置

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `FEISHU_APP_ID` | `cli_a834914dcf6c500d` | 飞书应用 ID |
| `FEISHU_APP_SECRET` | `LLweMTeb33fFvJ4pDec9LhHfEtswX1L1` | 飞书应用密钥 |
| `FEISHU_BASE_URL` | `https://open.feishu.cn/open-apis` | 飞书 API 基础地址 |
| `FEISHU_BASE_TOKEN` | `BwfBbSdPmaXjuls14RZcA22znUY` | 飞书多维表格 Base Token |
| `FEISHU_TABLE_ID` | `tblU7uysGphfPxab` | 飞书表格 ID |

**提取方法：** 从飞书表格 URL 中提取
```
https://wcntwr2lxgsq.feishu.cn/base/{BASE_TOKEN}?table={TABLE_ID}
                                      ↑                    ↑
                              FEISHU_BASE_TOKEN    FEISHU_TABLE_ID
```

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

## 📊 飞书表格字段说明

订单数据会自动保存到飞书多维表格，包含以下字段：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| 订单号 | 文本 | PayQixiang 订单号 |
| 交易号 | 文本 | 支付宝交易号 |
| 支付金额 | 数字 | 实际支付金额（元）|
| 商品名称 | 文本 | 购买的产品名称 |
| 宝宝名字 | 文本 | 定制故事的宝宝名字 |
| 声音类型 | 文本 | 选择的声音类型（爸爸/妈妈）|
| 用户邮箱 | 文本 | 用户邮箱地址 |
| 支付状态 | 文本 | 订单状态（已支付）|
| 支付时间 | 日期时间 | 支付完成时间 |
| 创建时间 | 日期时间 | 订单创建时间 |

**注意：** 请确保飞书表格中已创建这些字段，字段名称需要完全匹配。

---

**配置完成后记得删除此文件中的敏感信息！**
