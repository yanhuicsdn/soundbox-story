# 🚀 声宝盒邮件服务 - 快速启动指南

## ✅ 已完成

邮件服务已成功集成!现在当用户提交订单时,会自动:
1. ✅ 发送录音文件到指定邮箱
2. ✅ 文件名格式: `宝宝名称_爸爸(或妈妈)_邮箱.wav`
3. ✅ 发送精美HTML邮件,包含完整订单信息

---

## 📋 快速启动(3步)

### 步骤1: 安装依赖

```bash
cd ~/soundbox-story
npm install
```

### 步骤2: 配置SMTP

```bash
# 复制配置文件
cp .env.example .env

# 编辑.env文件,填入你的SMTP配置
nano .env  # 或使用其他编辑器
```

**配置示例(使用搜狐邮箱):**
```bash
SMTP_HOST=smtp.sohu.com
SMTP_PORT=25
SMTP_USER=your-email@sohu.com
SMTP_PASS=your-smtp-authorization-code
PORT=3000
NODE_ENV=development
```

### 步骤3: 启动服务

```bash
# 开发模式(自动重启)
npm run dev

# 或生产模式
npm start
```

看到以下信息表示启动成功:
```
╔════════════════════════════════════════╗
║   声宝盒邮件服务已启动                  ║
╚════════════════════════════════════════╝

📧 服务地址: http://localhost:3000
🏥 健康检查: http://localhost:3000/health
📮 API端点: http://localhost:3000/api/send-recording
```

---

## 🧪 测试服务

### 方法1: 使用网站测试

1. 启动邮件服务: `npm run dev`
2. 打开网站: https://yanhuicsdn.github.io/soundbox-story/
3. 点击任意故事包的"立即购买"
4. 填写表单并录音
5. 点击支付按钮
6. 检查邮箱 `1543827@qq.com` 是否收到邮件

### 方法2: 使用cURL测试

```bash
# 准备测试音频文件
# 然后执行:

curl -X POST http://localhost:3000/api/send-recording \
  -F "audio=@test.wav" \
  -F "childName=测试宝宝" \
  -F "voiceType=爸爸" \
  -F "email=test@example.com" \
  -F "childAge=5" \
  -F "wechat=wx123456" \
  -F 'product={"name":"哄睡故事包","price":79}'
```

---

## 📧 收到的邮件

### 收件人
- `1543827@qq.com`

### 邮件主题
- `新订单: 测试宝宝(爸爸的声音)`

### 邮件内容
```
声宝盒 - 新订单信息

====================
宝宝信息
====================
姓名: 测试宝宝
声音: 爸爸的声音
年龄: 5

====================
家长信息
====================
邮箱: test@example.com
微信: wx123456

====================
订单信息
====================
故事包: 哄睡故事包
价格: ¥79

====================
录音文件
====================
文件名: 测试宝宝_爸爸_test@example.com.wav
文件大小: XX KB
上传时间: 2024-01-12 10:30:00
```

### 邮件附件
- 文件名: `测试宝宝_爸爸_test@example.com.wav`
- 内容: 用户录制的音频文件

---

## 🔧 如何获取SMTP授权码?

### 搜狐邮箱

1. 登录 https://mail.sohu.com
2. 设置 → 邮箱设置 → SMTP服务
3. 开启服务并生成授权码

### 网易邮箱(163)

1. 登录 https://mail.163.com
2. 设置 → POP3/SMTP/IMAP
3. 开启SMTP服务
4. 生成授权码

### QQ邮箱

1. 登录 https://mail.qq.com
2. 设置 → 账户
3. 开启SMTP服务
4. 生成授权码

---

## 🌐 生产环境部署

### 修改API地址

编辑 `script.js` 第253行:
```javascript
// 本地开发
const apiUrl = 'http://localhost:3000/api/send-recording';

// 生产环境(修改为实际服务器地址)
const apiUrl = 'https://your-server.com/api/send-recording';
```

### 推荐部署平台

#### Railway(免费)
1. 访问 https://railway.app
2. 创建新项目
3. 连接GitHub仓库
4. 添加环境变量
5. 部署

#### Render(免费额度)
1. 访问 https://render.com
2. 创建Web Service
3. 连接GitHub仓库
4. 配置环境变量
5. 部署

#### 自己的服务器
```bash
# 安装PM2
npm install -g pm2

# 启动服务
pm2 start server.js --name soundbox-email

# 保存配置
pm2 save

# 开机自启
pm2 startup
```

---

## 📊 文件结构

```
soundbox-story/
├── server.js              # 邮件服务器主文件
├── package.json           # Node.js依赖
├── .env.example           # 环境变量配置示例
├── .env                   # 实际配置文件(不提交到Git)
├── script.js              # 前端调用代码(已更新)
├── EMAIL_SERVICE_GUIDE.md # 详细使用指南
└── QUICKSTART_EMAIL.md    # 本文件
```

---

## ⚠️ 注意事项

1. **不要提交 `.env` 文件到Git**
   - 包含敏感信息(SMTP密码)
   - 已添加到 `.gitignore`

2. **使用SMTP授权码,不是邮箱密码**
   - 更安全
   - 不会被轻易盗用

3. **文件大小限制**
   - 当前限制: 10MB
   - 可在 `server.js` 中调整

4. **网络要求**
   - 确保服务器能访问SMTP服务器
   - 检查防火墙设置

---

## 🐛 常见问题

### Q: 邮件发送失败?

**检查:**
1. SMTP配置是否正确
2. 授权码是否正确
3. 网络连接是否正常
4. 查看服务器日志

**解决:**
```bash
# 查看日志
pm2 logs soundbox-email

# 或直接运行查看输出
npm start
```

### Q: 前端调用失败?

**检查:**
1. 邮件服务是否启动
2. API地址是否正确
3. 浏览器控制台错误信息

**解决:**
```bash
# 检查服务是否运行
curl http://localhost:3000/health
```

### Q: 收不到邮件?

**检查:**
1. 邮箱是否被标记为垃圾邮件
2. 收件箱是否已满
3. SMTP服务是否正常

---

## 📞 获取帮助

- 详细文档: `EMAIL_SERVICE_GUIDE.md`
- 项目文档: `README.md`
- GitHub: https://github.com/yanhuicsdn/soundbox-story

---

## 🎉 完成!

现在你的声宝盒产品已经具备完整的邮件功能了!

**功能清单:**
- ✅ 精美的网站
- ✅ 在线录音功能
- ✅ 订单收集
- ✅ 邮件发送
- ✅ 文件附件
- ✅ 精美HTML邮件

**开始使用吧!** 🚀
