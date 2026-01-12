/**
 * 声宝盒 - 邮件发送服务器
 *
 * 功能:
 * 1. 接收用户信息和录音文件
 * 2. 将录音文件作为附件发送到指定邮箱
 * 3. 文件名格式: 宝宝名称_爸爸(或妈妈)_邮箱.wav
 */

// 加载环境变量
require('dotenv').config();

const express = require('express');
const nodemailer = require('nodemailer');
const multer = require('multer');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 配置 multer 用于文件上传
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 限制10MB
  },
  fileFilter: (req, file, cb) => {
    // 只接受音频文件
    const allowedTypes = /wav|mp3|m4a|ogg|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname || mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('只接受音频文件'));
    }
  },
});

// 创建 SMTP 传输器
const createTransporter = () => {
  const smtpPort = parseInt(process.env.SMTP_PORT || '25');
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.sohu.com',
    port: smtpPort,
    secure: smtpPort === 465, // 465端口使用SSL,其他端口使用STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    debug: process.env.NODE_ENV === 'development',
    logger: process.env.NODE_ENV === 'development',
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });
};

/**
 * 健康检查
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: '声宝盒邮件服务运行正常' });
});

/**
 * 发送录音邮件
 * POST /api/send-recording
 *
 * Body (multipart/form-data):
 * - audio: 录音文件
 * - childName: 宝宝名字
 * - voiceType: 声音类型 (爸爸/妈妈)
 * - email: 用户邮箱
 * - childAge: 孩子年龄 (可选)
 * - wechat: 微信号 (可选)
 * - product: 故事包信息 (JSON字符串)
 */
app.post('/api/send-recording', upload.single('audio'), async (req, res) => {
  try {
    // 检查是否有上传的文件
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '没有上传录音文件',
      });
    }

    // 获取表单数据
    const {
      childName,
      voiceType,
      email,
      childAge,
      wechat,
      product,
    } = req.body;

    // 验证必填字段
    if (!childName || !voiceType || !email) {
      return res.status(400).json({
        success: false,
        error: '缺少必填字段: childName, voiceType, email',
      });
    }

    // 解析产品信息
    let productInfo = {};
    if (product) {
      try {
        productInfo = JSON.parse(product);
      } catch (e) {
        console.error('解析产品信息失败:', e);
      }
    }

    // 生成文件名: 宝宝名称_爸爸(或妈妈)_邮箱.wav
    const filename = `${childName}_${voiceType}_${email}.wav`;

    // 创建邮件内容
    const mailOptions = {
      from: `"声宝盒" <${process.env.SMTP_USER}>`,
      to: '1543827@qq.com', // 发送到指定的邮箱
      subject: `新订单: ${childName}(${voiceType}的声音)`,
      text: `
声宝盒 - 新订单信息

====================
宝宝信息
====================
姓名: ${childName}
声音: ${voiceType}的声音
年龄: ${childAge || '未填写'}

====================
家长信息
====================
邮箱: ${email}
微信: ${wechat || '未填写'}

====================
订单信息
====================
故事包: ${productInfo.name || '未选择'}
价格: ¥${productInfo.price || '0'}

====================
录音文件
====================
文件名: ${filename}
文件大小: ${(req.file.size / 1024).toFixed(2)} KB
上传时间: ${new Date().toLocaleString('zh-CN')}

此邮件由声宝盒系统自动发送。
      `,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }
    .section { margin: 20px 0; padding: 15px; background: white; border-radius: 8px; }
    .section-title { font-size: 16px; font-weight: bold; color: #FF6B6B; margin-bottom: 10px; border-bottom: 2px solid #FF6B6B; padding-bottom: 5px; }
    .info-row { display: flex; padding: 8px 0; border-bottom: 1px solid #eee; }
    .info-label { font-weight: bold; width: 100px; color: #666; }
    .info-value { flex: 1; color: #333; }
    .footer { text-align: center; margin-top: 20px; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎵 声宝盒 - 新订单</h1>
    </div>
    <div class="content">
      <div class="section">
        <div class="section-title">👶 宝宝信息</div>
        <div class="info-row">
          <span class="info-label">姓名:</span>
          <span class="info-value">${childName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">声音:</span>
          <span class="info-value">${voiceType}的声音</span>
        </div>
        <div class="info-row">
          <span class="info-label">年龄:</span>
          <span class="info-value">${childAge || '未填写'}</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">👨‍👩‍👧 家长信息</div>
        <div class="info-row">
          <span class="info-label">邮箱:</span>
          <span class="info-value">${email}</span>
        </div>
        <div class="info-row">
          <span class="info-label">微信:</span>
          <span class="info-value">${wechat || '未填写'}</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">📦 订单信息</div>
        <div class="info-row">
          <span class="info-label">故事包:</span>
          <span class="info-value">${productInfo.name || '未选择'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">价格:</span>
          <span class="info-value">¥${productInfo.price || '0'}</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">🎙️ 录音文件</div>
        <div class="info-row">
          <span class="info-label">文件名:</span>
          <span class="info-value">${filename}</span>
        </div>
        <div class="info-row">
          <span class="info-label">文件大小:</span>
          <span class="info-value">${(req.file.size / 1024).toFixed(2)} KB</span>
        </div>
        <div class="info-row">
          <span class="info-label">上传时间:</span>
          <span class="info-value">${new Date().toLocaleString('zh-CN')}</span>
        </div>
      </div>
    </div>
    <div class="footer">
      <p>此邮件由声宝盒系统自动发送</p>
      <p>上传时间: ${new Date().toLocaleString('zh-CN')}</p>
    </div>
  </div>
</body>
</html>
      `,
      attachments: [
        {
          filename: filename,
          content: req.file.buffer,
        },
      ],
    };

    // 发送邮件
    const transporter = createTransporter();
    const info = await transporter.sendMail(mailOptions);

    console.log('邮件发送成功:', info.messageId);

    res.json({
      success: true,
      message: '订单提交成功',
      messageId: info.messageId,
      filename: filename,
    });
  } catch (error) {
    console.error('邮件发送失败:', error);
    res.status(500).json({
      success: false,
      error: '邮件发送失败',
      details: error.message,
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   声宝盒邮件服务已启动                  ║
╚════════════════════════════════════════╝

📧 服务地址: http://localhost:${PORT}
🏥 健康检查: http://localhost:${PORT}/health
📮 API端点: http://localhost:${PORT}/api/send-recording

环境配置:
  - SMTP_HOST: ${process.env.SMTP_HOST || 'smtp.sohu.com'}
  - SMTP_PORT: ${process.env.SMTP_PORT || '25'}
  - SMTP_USER: ${process.env.SMTP_USER || '未设置'}

⚠️  请确保已正确配置SMTP环境变量
  `
  );
});

module.exports = app;
