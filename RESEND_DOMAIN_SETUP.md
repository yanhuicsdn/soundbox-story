# Resend 域名验证配置指南

## 问题说明

当前使用 Resend 测试域名 `onboarding@resend.dev` 发送邮件时，有以下限制：

- ❌ **只能发送到 Resend 账号注册时使用的邮箱**
- ❌ 无法发送到其他用户邮箱（如 `yanhui@csdn.net`）
- ⚠️ 邮件可能被标记为垃圾邮件

## 解决方案：验证自己的域名

### 步骤 1：在 Resend 添加域名

1. 访问 https://resend.com/domains
2. 点击 **"Add Domain"** 按钮
3. 输入你的域名：`66668888.cloud`
4. 点击 **"Add"**

### 步骤 2：添加 DNS 记录

Resend 会提供需要添加的 DNS 记录，通常包括：

#### SPF 记录（TXT）
```
类型: TXT
主机: @
值: v=spf1 include:_spf.resend.com ~all
```

#### DKIM 记录（TXT）
```
类型: TXT
主机: resend._domainkey
值: [Resend 提供的 DKIM 值]
```

#### DMARC 记录（TXT，可选）
```
类型: TXT
主机: _dmarc
值: v=DMARC1; p=none; rua=mailto:dmarc@66668888.cloud
```

### 步骤 3：在域名服务商添加 DNS 记录

1. 登录你的域名服务商（如阿里云、腾讯云、Cloudflare 等）
2. 找到 DNS 管理页面
3. 按照 Resend 提供的信息添加上述 DNS 记录
4. 保存设置

### 步骤 4：等待 DNS 生效

- DNS 记录通常需要 **5-30 分钟**生效
- 可以使用在线工具检查：https://mxtoolbox.com/

### 步骤 5：在 Resend 验证域名

1. 返回 https://resend.com/domains
2. 点击你添加的域名
3. 点击 **"Verify DNS Records"** 按钮
4. 等待验证完成（显示绿色 ✓）

### 步骤 6：配置 Vercel 环境变量

域名验证成功后，在 Vercel 项目中添加环境变量：

```
RESEND_FROM_EMAIL=声宝盒 <noreply@66668888.cloud>
```

或者使用其他子域名：
```
RESEND_FROM_EMAIL=声宝盒 <notify@66668888.cloud>
RESEND_FROM_EMAIL=声宝盒 <order@66668888.cloud>
```

### 步骤 7：重新部署并测试

1. 在 Vercel 配置环境变量后，触发重新部署
2. 运行测试命令：
   ```bash
   curl -H "Authorization: Bearer 12345678" \
     "https://story.66668888.cloud/api/test-email?email=yanhui@csdn.net"
   ```
3. 检查邮箱是否收到邮件

## 验证 DNS 记录的命令

可以使用以下命令检查 DNS 记录是否正确：

```bash
# 检查 SPF 记录
dig TXT 66668888.cloud +short

# 检查 DKIM 记录
dig TXT resend._domainkey.66668888.cloud +short

# 检查 DMARC 记录
dig TXT _dmarc.66668888.cloud +short
```

## 常见问题

### Q: DNS 记录添加后多久生效？
A: 通常 5-30 分钟，最长可能需要 24-48 小时。

### Q: 验证失败怎么办？
A: 
1. 检查 DNS 记录是否正确添加
2. 等待更长时间让 DNS 传播
3. 使用 `dig` 命令检查记录是否可查询
4. 联系域名服务商确认配置

### Q: 可以使用子域名吗？
A: 可以，例如 `mail.66668888.cloud`，但需要单独验证。

### Q: 免费版有发送限制吗？
A: Resend 免费版每月可发送 3000 封邮件，对于大多数应用足够使用。

## 临时解决方案

在域名验证完成前，如果需要测试邮件功能：

1. 使用 Resend 账号注册时的邮箱地址进行测试
2. 或者先不配置 `RESEND_FROM_EMAIL`，等域名验证完成后再配置

## 参考链接

- Resend 官方文档：https://resend.com/docs
- DNS 记录检查工具：https://mxtoolbox.com/
- SPF 记录生成器：https://www.spfwizard.net/
