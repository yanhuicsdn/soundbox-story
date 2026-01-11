# 声宝盒 - 儿童故事语音克隆网站

## 项目简介

声宝盒是一个面向父母的儿童故事语音克隆服务,父母只需录制1分钟声音,AI就能批量生成专属的儿童故事音频。

## 核心功能

- ✅ 在线录音功能(浏览器麦克风)
- ✅ 示例音频播放
- ✅ 多场景故事包选择
- ✅ 订单表单收集
- ✅ 微信支付/支付宝集成
- ✅ 响应式设计(手机+电脑)
- ✅ 美观的UI设计

## 技术栈

- **前端**: 纯HTML + CSS + JavaScript
- **录音**: MediaRecorder API
- **部署**: Vercel/Netlify(推荐)
- **支付**: 微信支付/支付宝API

## 快速开始

### 本地开发

1. 克隆或下载项目
```bash
cd ~/soundbox-story
```

2. 启动本地服务器
```bash
# 使用Python
python -m http.server 8000

# 或使用Node.js
npx http-server

# 或使用PHP
php -S localhost:8000
```

3. 在浏览器中访问
```
http://localhost:8000
```

### 部署到Vercel

1. 安装Vercel CLI
```bash
npm install -g vercel
```

2. 在项目目录下运行
```bash
vercel
```

3. 按照提示完成部署

### 部署到Netlify

1. 将项目推送到GitHub
2. 在Netlify中导入项目
3. 设置构建命令为空(纯静态网站)
4. 设置发布目录为 `/`

## 配置说明

### 1. 示例音频

在 `index.html` 中替换示例音频:
```html
<audio controls>
    <source src="demo-mom.mp3" type="audio/mpeg">
</audio>
```

将 `demo-mom.mp3` 和 `demo-dad.mp3` 放在项目根目录。

### 2. 支付配置

在 `script.js` 中配置支付接口:
```javascript
// 微信支付
window.location.href = 'YOUR_WECHAT_PAY_URL';

// 支付宝
window.location.href = 'YOUR_ALIPAY_URL';
```

### 3. 后端API配置

在 `script.js` 的 `uploadRecordingAndOrder()` 函数中配置你的后端API:
```javascript
async function uploadRecordingAndOrder() {
    const formData = new FormData();
    formData.append('audio', recordedBlob, 'recording.wav');
    formData.append('order', JSON.stringify(orderData));

    const response = await fetch('YOUR_API_ENDPOINT', {
        method: 'POST',
        body: formData
    });

    return await response.json();
}
```

## 后端API需求

你需要创建一个后端API来处理:

1. **接收录音文件**
   - 文件格式: WAV/MP3
   - 文件大小: 约1-3MB
   - 存储到服务器或云存储

2. **接收订单数据**
   ```json
   {
     "product": {
       "name": "哄睡故事包",
       "price": 79
     },
     "name": "用户姓名",
     "email": "user@example.com",
     "wechat": "微信号(可选)",
     "childAge": "5"
   }
   ```

3. **触发批量生成任务**
   - 调用你的AI语音克隆模型
   - 批量生成故事音频
   - 打包成压缩文件

4. **发送邮件**
   - 生成完成后发送到用户邮箱
   - 包含下载链接或附件

## 推荐的后端技术栈

### 方案1: Python + Flask(推荐)

```python
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename

app = Flask(__name__)

@app.route('/api/order', methods=['POST'])
def create_order():
    audio_file = request.files['audio']
    order_data = request.form['order']

    # 保存音频文件
    filename = secure_filename(audio_file.filename)
    audio_file.save(f'/uploads/{filename}')

    # 触发批量生成任务
    # ...调用你的AI模型...

    return jsonify({'success': True, 'order_id': '12345'})

if __name__ == '__main__':
    app.run(debug=True)
```

### 方案2: Serverless函数(Vercel/阿里云)

使用Vercel Serverless Functions或阿里云函数计算,无需管理服务器。

### 方案3: 第三方服务

- **文件存储**: 阿里云OSS、腾讯云COS、七牛云
- **邮件服务**: SendGrid、阿里云邮件推送
- **支付**: 微信支付、支付宝

## 文件结构

```
soundbox-story/
├── index.html          # 主页面
├── styles.css          # 样式文件
├── script.js           # JavaScript逻辑
├── README.md           # 说明文档
├── demo-mom.mp3        # 示例音频(妈妈)
├── demo-dad.mp3        # 示例音频(爸爸)
└── .vercelignore       # Vercel部署配置(可选)
```

## 自定义配置

### 修改价格

在 `script.js` 中修改产品价格:
```javascript
const products = {
    sleep: {
        name: '哄睡故事包',
        price: 79  // 修改这里
    },
    // ...
};
```

### 修改录音文本

在 `index.html` 中修改录音文本:
```html
<div class="recording-text">
    <p>你的录音文本...</p>
</div>
```

### 修改品牌颜色

在 `styles.css` 中修改主题色:
```css
:root {
    --primary-color: #FF6B6B;    /* 主色调 */
    --secondary-color: #4ECDC4;  /* 次要色调 */
    --accent-color: #FFE66D;     /* 强调色 */
}
```

## 浏览器兼容性

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 11+
- ✅ Edge 79+
- ❌ IE不支持

**注意**: 录音功能需要麦克风权限,请在HTTPS环境下使用(localhost除外)。

## 安全建议

1. **HTTPS**: 生产环境必须使用HTTPS
2. **数据验证**: 后端必须验证所有用户输入
3. **文件类型检查**: 只接受音频文件
4. **文件大小限制**: 限制上传文件大小
5. **速率限制**: 防止恶意提交大量订单

## 性能优化

1. **图片优化**: 压缩所有图片资源
2. **音频压缩**: 示例音频使用压缩格式
3. **CDN**: 使用CDN加速静态资源
4. **缓存**: 设置合适的缓存策略

## 营销建议

1. **SEO优化**:
   - 修改meta标签
   - 添加结构化数据
   - 创建sitemap

2. **内容营销**:
   - 小红书/抖音发布示例音频
   - 宝妈群/家长群推广
   - KOL合作

3. **转化优化**:
   - A/B测试不同的CTA文案
   - 添加用户评价
   - 提供首单优惠

## 更新日志

### v1.0.0 (2024-01-11)
- ✅ 完成基础网站开发
- ✅ 实现在线录音功能
- ✅ 完成响应式设计
- ✅ 集成支付流程

## 待办事项

- [ ] 对接实际的后端API
- [ ] 添加真实的示例音频
- [ ] 配置微信支付/支付宝
- [ ] 添加订单查询功能
- [ ] 添加数据统计(埋点)
- [ ] SEO优化

## 联系方式

如有问题,请联系:
- 邮箱: hello@soundbox.com
- 微信: soundbox_support

## 许可证

Copyright © 2024 声宝盒. All rights reserved.
