# 声宝盒 - 快速开始指南

## 🚀 5分钟快速部署

### 步骤1: 本地测试

```bash
cd ~/soundbox-story

# 启动本地服务器
python -m http.server 8000
```

在浏览器中打开: http://localhost:8000

### 步骤2: 准备示例音频

你需要准备2个示例音频文件,放在项目根目录:

- `demo-mom.mp3` - 妈妈声音的示例
- `demo-dad.mp3` - 爸爸声音的示例

**提示**: 可以先用你自己的声音克隆一段作为示例。

### 步骤3: 部署到Vercel(推荐)

1. 安装Vercel CLI
```bash
npm install -g vercel
```

2. 在项目目录下运行
```bash
vercel
```

3. 按照提示完成部署
- 首次使用需要登录
- 选择你的团队
- 确认项目设置

4. 部署完成后,你会获得一个URL,比如:
   https://soundbox-story.vercel.app

### 步骤4: 配置后端(可选)

如果你需要处理订单和录音,有3种方案:

#### 方案A: 使用Serverless函数(推荐)

Vercel支持Serverless Functions,创建 `api/order.js`:

```javascript
export default function handler(req, res) {
  if (req.method === 'POST') {
    // 处理订单
    const audio = req.body.audio;
    const order = req.body.order;

    // TODO: 保存到数据库或云存储

    res.status(200).json({ success: true, orderId: '12345' });
  }
}
```

#### 方案B: 使用第三方服务

- **文件存储**: 阿里云OSS、腾讯云COS、七牛云
- **表单服务**: Formspree、Getform
- **邮件服务**: SendGrid

#### 方案C: 部署Python后端

参考 `backend-example.py`:

```bash
# 安装依赖
pip install -r requirements.txt

# 运行服务器
python backend-example.py
```

然后部署到:
- Heroku
- Railway
- 阿里云/腾讯云

## 📝 必须完成的配置

### 1. 替换示例音频

编辑 `index.html` 第118-135行:

```html
<div class="audio-card">
    <div class="audio-label">示例1: 妈妈的声音 - 睡前故事</div>
    <audio controls class="audio-player">
        <source src="YOUR_DEMO_MOM_URL" type="audio/mpeg">
    </audio>
</div>
```

### 2. 配置支付接口

编辑 `script.js` 第318-326行:

```javascript
if (paymentMethod === 'wechat') {
    // 替换为你的微信支付链接
    window.location.href = 'YOUR_WECHAT_PAY_URL';
} else {
    // 替换为你的支付宝链接
    window.location.href = 'YOUR_ALIPAY_URL';
}
```

### 3. 修改联系方式

编辑 `index.html` 第371-373行:

```html
<a href="mailto:YOUR_EMAIL">邮箱</a>
<a href="YOUR_WECHAT">微信客服</a>
```

### 4. 配置后端API

编辑 `script.js` 第277-295行:

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

## 🎨 自定义品牌

### 修改颜色

编辑 `styles.css` 第8-14行:

```css
:root {
    --primary-color: #FF6B6B;    /* 主色调 */
    --secondary-color: #4ECDC4;  /* 次要色调 */
    --accent-color: #FFE66D;     /* 强调色 */
}
```

### 修改价格

编辑 `script.js` 第10-25行:

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

编辑 `index.html` 第273-287行:

```html
<div class="recording-text">
    <p>你的录音文本...</p>
</div>
```

## 📱 测试检查清单

- [ ] 在Chrome浏览器中测试录音功能
- [ ] 在手机浏览器中测试录音
- [ ] 测试表单提交
- [ ] 测试支付流程(可以用测试链接)
- [ ] 测试响应式布局(调整浏览器窗口大小)
- [ ] 测试所有按钮和链接
- [ ] 检查页面加载速度
- [ ] 检查SEO(meta标签)

## 🐛 常见问题

### Q: 录音功能不工作?

A: 确保在HTTPS环境下(localhost除外),并且已授予麦克风权限。

### Q: 支付后如何处理订单?

A: 目前MVP版本是手动处理。后期需要:
1. 对接支付API的回调
2. 自动发送邮件
3. 自动触发批量生成

### Q: 如何批量生成音频?

A: 使用你的AI模型脚本,例如:

```python
# batch_generate.py
import subprocess

stories = ['story1.txt', 'story2.txt', ...]
reference_audio = 'user_recording.wav'

for story in stories:
    subprocess.run([
        'python',
        'your_tts_model.py',
        '--text', story,
        '--reference', reference_audio,
        '--output', f'output/{story}.mp3'
    ])
```

### Q: 如何交付给用户?

A: 有两种方式:

**方式1: 邮件附件**
- 打包所有音频为ZIP
- 发送邮件附件
- 限制: 文件大小不能超过25MB

**方式2: 离线播放器**
- 使用 `player-template.html`
- 修改故事列表
- 打包成ZIP发送给用户

## 📊 下一步工作

- [ ] 准备示例音频
- [ ] 对接支付接口
- [ ] 开发后端API
- [ ] 准备故事内容
- [ ] 设计营销材料
- [ ] 寻找测试用户
- [ ] 收集反馈并优化

## 🎯 营销建议

### 内容营销

1. **小红书/抖音**
   - 发布示例音频视频
   - 展示录音过程
   - 用户反馈截图

2. **朋友圈/微信群**
   - 发布产品介绍
   - 提供内测优惠
   - 请求朋友转发

3. **宝妈群/家长群**
   - 联系群主合作
   - 提供免费体验
   - 换取真实反馈

### 转化优化

1. **添加信任元素**
   - 用户评价
   - 使用截图
   - 示例音频

2. **优化CTA**
   - A/B测试不同文案
   - 添加紧迫感(限时优惠)
   - 突出核心价值

3. **降低门槛**
   - 首单优惠
   - 退款承诺(后期)
   - 免费试用(1个故事)

## 📞 需要帮助?

如果遇到问题:
1. 查看 README.md 详细文档
2. 检查浏览器控制台错误
3. 确认所有配置是否正确
4. 联系技术支持

---

**祝部署顺利! 🎉**
