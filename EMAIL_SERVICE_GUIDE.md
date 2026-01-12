# 📧 声宝盒 - 邮件服务使用指南

## 📋 功能说明

声宝盒邮件服务可以:
1. ✅ 接收用户填写的订单信息(宝宝名字、声音类型、邮箱等)
2. ✅ 接收用户录制的音频文件
3. ✅ 将录音文件作为附件发送到指定邮箱(1543827@qq.com)
4. ✅ 文件名自动格式化为: `宝宝名称_爸爸(或妈妈)_邮箱.wav`
5. ✅ 发送精美的HTML邮件,包含完整的订单信息

---

## 🚀 快速开始

### 1. 安装依赖

```bash
cd ~/soundbox-story
npm install
```

### 2. 配置SMTP

复制环境变量配置文件:
```bash
cp .env.example .env
```

编辑 `.env` 文件,填入你的SMTP配置:
```bash
# SMTP 服务器地址(以搜狐为例)
SMTP_HOST=smtp.sohu.com

# SMTP 端口
SMTP_PORT=25

# SMTP 用户名(你的邮箱)
SMTP_USER=your-email@sohu.com

# SMTP 密码(SMTP授权码,不是邮箱密码)
SMTP_PASS=your-smtp-authorization-code

# 服务器端口
PORT=3000

# 环境
NODE_ENV=development
```

### 3. 启动服务器

```bash
# 开发模式(自动重启)
npm run dev

# 或生产模式
npm start
```

服务器将在 `http://localhost:3000` 启动

### 4. 测试服务

访问健康检查:
```bash
curl http://localhost:3000/health
```

应该返回:
```json
{
  "status": "ok",
  "message": "声宝盒邮件服务运行正常"
}
```

---

## 🔧 SMTP配置说明

### 如何获取SMTP授权码?

#### 网易邮箱(163.com)

1. 登录网易邮箱
2. 点击"设置" → "POP3/SMTP/IMAP"
3. 开启"SMTP服务"
4. 点击"生成授权码"
5. 通过手机验证后获得授权码

#### QQ邮箱(qq.com)

1. 登录QQ邮箱
2. 点击"设置" → "账户"
3. 找到"POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务"
4. 开启"SMTP服务"
5. 点击"生成授权码"
6. 通过手机验证后获得授权码

#### 搜狐邮箱(sohu.com)

1. 登录搜狐邮箱
2. 点击"设置" → "邮箱设置"
3. 找到"SMTP服务"
4. 开启服务并生成授权码

#### Gmail

1. 登录Google账户
2. 开启两步验证
3. 生成应用专用密码
4. 使用该密码作为SMTP密码

---

## 📮 API端点

### POST /api/send-recording

发送录音和订单信息到邮箱

**请求方式:** `POST` (multipart/form-data)

**请求参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| audio | File | ✅ | 录音文件(wav/mp3/m4a等) |
| childName | String | ✅ | 宝宝名字 |
| voiceType | String | ✅ | 声音类型(爸爸/妈妈) |
| email | String | ✅ | 用户邮箱 |
| childAge | String | ❌ | 孩子年龄 |
| wechat | String | ❌ | 微信号 |
| product | String | ❌ | 故事包信息(JSON字符串) |

**请求示例(cURL):**

```bash
curl -X POST http://localhost:3000/api/send-recording \
  -F "audio=@recording.wav" \
  -F "childName=小明" \
  -F "voiceType=爸爸" \
  -F "email=user@example.com" \
  -F "childAge=5" \
  -F "wechat=wx123456" \
  -F 'product={"name":"哄睡故事包","price":79}'
```

**成功响应:**

```json
{
  "success": true,
  "message": "订单提交成功",
  "messageId": "<message-id@smtp.server.com>",
  "filename": "小明_爸爸_user@example.com.wav"
}
```

**错误响应:**

```json
{
  "success": false,
  "error": "错误信息",
  "details": "详细错误描述"
}
```

---

## 📧 邮件格式

### 收件人
- 固定发送到: `1543827@qq.com`

### 邮件主题
- 格式: `新订单: 宝宝名字(爸爸/妈妈的声音)`
- 例如: `新订单: 小明(爸爸的声音)`

### 邮件内容
包含以下信息:
1. ✅ 宝宝信息(姓名、声音类型、年龄)
2. ✅ 家长信息(邮箱、微信)
3. ✅ 订单信息(故事包、价格)
4. ✅ 录音文件信息(文件名、大小、上传时间)

### 邮件附件
- 文件名格式: `宝宝名称_爸爸(或妈妈)_邮箱.wav`
- 例如: `小明_爸爸_user@example.com.wav`

---

## 🌐 前端集成

前端代码已更新,会自动调用邮件API。

**API地址配置:**

编辑 `script.js` 第253行:
```javascript
const apiUrl = 'http://localhost:3000/api/send-recording'; // 本地开发
```

**生产环境配置:**

部署到生产时,修改为实际服务器地址:
```javascript
const apiUrl = 'https://your-server.com/api/send-recording';
```

---

## 🔒 安全建议

1. **永远不要提交 `.env` 文件到Git**
   ```bash
   # .gitignore 应包含
   .env
   .env.local
   .env.*.local
   ```

2. **使用环境变量**
   - 不要在代码中硬编码敏感信息
   - 所有密码都通过环境变量传递

3. **限制文件大小**
   - 当前限制为10MB
   - 可在代码中调整 `multer` 配置

4. **验证文件类型**
   - 只接受音频文件
   - 已添加文件类型验证

---

## 🚢 部署到生产环境

### 方式1: Vercel/Netlify(推荐)

由于邮件服务器需要Node.js运行时,建议部署到支持Node.js的平台:

#### 使用Railway

1. 访问 https://railway.app
2. 创建新项目
3. 连接GitHub仓库
4. 在Variables中添加环境变量
5. 部署完成

#### 使用Render

1. 访问 https://render.com
2. 创建Web Service
3. 连接GitHub仓库
4. 配置环境变量
5. 部署完成

### 方式2: 自己的服务器

1. 安装Node.js
2. 克隆代码
3. 安装依赖: `npm install`
4. 配置 `.env` 文件
5. 使用PM2保持运行:
   ```bash
   npm install -g pm2
   pm2 start server.js --name soundbox-email
   pm2 save
   pm2 startup
   ```

---

## 🐛 常见问题

### 1. 邮件发送失败

**检查项:**
- ✅ SMTP配置是否正确
- ✅ SMTP授权码是否正确
- ✅ 网络连接是否正常
- ✅ SMTP端口是否被防火墙阻止

**解决方案:**
- 尝试使用不同的SMTP服务
- 检查邮箱是否开启了SMTP服务
- 查看服务器日志获取详细错误信息

### 2. 文件上传失败

**检查项:**
- ✅ 文件大小是否超过10MB
- ✅ 文件格式是否正确
- ✅ 网络连接是否稳定

### 3. CORS错误

前端调用API时可能出现CORS错误。

**解决方案:**
- 确保前端和后端在同一域名下
- 或配置正确的CORS设置(已在代码中配置)

---

## 📞 技术支持

如有问题,请:
1. 查看 `README.md` - 项目总体说明
2. 查看 `QUICKSTART.md` - 快速开始指南
3. 查看服务器日志获取详细错误信息

---

## 📄 相关文件

- `server.js` - 邮件服务器主文件
- `package.json` - Node.js依赖
- `.env.example` - 环境变量配置示例
- `script.js` - 前端调用代码

---

**祝使用愉快!** 🎉
