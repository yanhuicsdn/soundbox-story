# 声宝盒自动化语音克隆工作流设计

## 🎯 整体架构

```
┌─────────────┐      ┌─────────────┐      ┌──────────────┐
│   前端网站   │ ───> │  API网关    │ ───> │ 消息队列     │
│  (用户下单)  │      │  (接收订单)  │      │  (任务队列)  │
└─────────────┘      └─────────────┘      └──────────────┘
                                                     │
                                                     ▼
                                            ┌──────────────┐
                                            │ 订单存储服务  │
                                            │ (MongoDB/SQL) │
                                            └──────────────┘
                                                     │
                                                     ▼
┌─────────────┐      ┌─────────────┐      ┌──────────────┐
│  用户收货    │ <─── │  文件服务   │ <─── │ 语音克隆程序  │
│ (下载音频)   │      │ (存储音频)  │      │ (Index TTS)  │
└─────────────┘      └─────────────┘      └──────────────┘
```

---

## 📡 接口设计

### 1. 前端 → API网关（提交订单）

**POST** `/api/orders/create`

```json
// Request
{
  "orderId": "ord_20250112_abc123",
  "childName": "小明",
  "voiceType": "妈妈",
  "email": "user@example.com",
  "wechat": "wx123456",
  "product": {
    "id": "sleep",
    "name": "哄睡故事包",
    "stories": ["cid1", "cid2", ...]
  },
  "audioBlob": "<base64 encoded audio>",
  "status": "pending",
  "createdAt": "2025-01-12T13:30:00Z"
}

// Response
{
  "success": true,
  "orderId": "ord_20250112_abc123",
  "message": "订单已提交，正在处理中",
  "estimatedTime": "约30分钟完成"
}
```

---

### 2. 语音克隆程序 → API网关（获取待处理订单）

**GET** `/api/orders/pending`

```json
// Response
{
  "orders": [
    {
      "orderId": "ord_20250112_abc123",
      "childName": "小明",
      "voiceType": "妈妈",
      "product": {
        "id": "sleep",
        "stories": [
          {
            "cid": "13806",
            "name": "晚安，月亮",
            "content": "七点了，小兔子...",
            "duration": 120
          }
        ]
      },
      "audioUrl": "https://storage.example.com/audio/ord_20250112_abc123.wav"
    }
  ]
}
```

---

### 3. 语音克隆程序 → API网关（更新进度）

**POST** `/api/orders/progress`

```json
// Request
{
  "orderId": "ord_20250112_abc123",
  "status": "processing",
  "progress": {
    "current": 3,
    "total": 35,
    "currentStory": "星星为什么闪？",
    "percentage": 8.5
  }
}

// Response
{
  "success": true
}
```

---

### 4. 语音克隆程序 → API网关（完成订单）

**POST** `/api/orders/complete`

```json
// Request
{
  "orderId": "ord_20250112_abc123",
  "status": "completed",
  "audioFiles": [
    {
      "storyId": "13806",
      "storyName": "晚安，月亮",
      "audioUrl": "https://storage.example.com/output/ord_20250112_abc123/001.mp3",
      "duration": 120,
      "size": 1024000
    }
  ],
  "packageUrl": "https://storage.example.com/output/ord_20250112_abc123.zip",
  "completedAt": "2025-01-12T14:00:00Z"
}

// Response
{
  "success": true,
  "message": "订单已完成，用户将收到通知"
}
```

---

### 5. 前端 → API网关（查询订单状态）

**GET** `/api/orders/:orderId/status`

```json
// Response
{
  "orderId": "ord_20250112_abc123",
  "status": "processing",
  "progress": {
    "current": 10,
    "total": 35,
    "percentage": 28.5,
    "currentStory": "月亮的秘密"
  },
  "estimatedTime": "剩余20分钟",
  "createdAt": "2025-01-12T13:30:00Z"
}
```

---

## 🔧 数据存储设计

### MongoDB 订单集合结构

```javascript
{
  _id: ObjectId("..."),
  orderId: "ord_20250112_abc123",
  status: "pending", // pending | processing | completed | failed

  // 用户信息
  userInfo: {
    childName: "小明",
    voiceType: "妈妈",
    email: "user@example.com",
    wechat: "wx123456"
  },

  // 产品信息
  product: {
    id: "sleep",
    name: "哄睡故事包",
    price: 79,
    stories: [
      {
        cid: "13806",
        name: "晚安，月亮",
        content: "...",
        estimatedDuration: 120
      }
    ]
  },

  // 音频文件
  audio: {
    originalUrl: "https://storage.example.com/audio/ord_20250112_abc123.wav",
    processedUrls: [],
    packageUrl: null
  },

  // 进度跟踪
  progress: {
    current: 0,
    total: 35,
    percentage: 0,
    currentStory: null,
    logs: []
  },

  // 时间戳
  createdAt: ISODate("2025-01-12T13:30:00Z"),
  startedAt: null,
  completedAt: null,

  // 错误信息
  error: null
}
```

---

## 🤖 语音克隆程序接口

### Python 示例（使用 Index TTS）

```python
import requests
import time
from index_tts import clone_voice, generate_audio

class VoiceCloningWorker:
    def __init__(self, api_base_url, api_key):
        self.api_base_url = api_base_url
        self.headers = {"Authorization": f"Bearer {api_key}"}

    def get_pending_orders(self):
        """获取待处理订单"""
        response = requests.get(
            f"{self.api_base_url}/api/orders/pending",
            headers=self.headers
        )
        return response.json()['orders']

    def download_reference_audio(self, audio_url):
        """下载用户录制的参考音频"""
        response = requests.get(audio_url)
        return response.content

    def clone_voice_for_story(self, reference_audio, story_text, output_path):
        """为单个故事克隆语音"""
        # 使用 Index TTS 克隆语音
        cloned_audio = clone_voice(
            reference_audio=reference_audio,
            target_text=story_text
        )

        # 保存音频文件
        with open(output_path, 'wb') as f:
            f.write(cloned_audio)

        return output_path

    def upload_audio(self, file_path, order_id, story_id):
        """上传生成的音频到文件服务器"""
        # 上传到你的文件存储服务
        # 返回音频URL
        return f"https://storage.example.com/output/{order_id}/{story_id}.mp3"

    def update_progress(self, order_id, current, total, story_name):
        """更新订单进度"""
        requests.post(
            f"{self.api_base_url}/api/orders/progress",
            headers=self.headers,
            json={
                "orderId": order_id,
                "status": "processing",
                "progress": {
                    "current": current,
                    "total": total,
                    "currentStory": story_name,
                    "percentage": (current / total) * 100
                }
            }
        )

    def complete_order(self, order_id, audio_files, package_url):
        """标记订单完成"""
        requests.post(
            f"{self.api_base_url}/api/orders/complete",
            headers=self.headers,
            json={
                "orderId": order_id,
                "status": "completed",
                "audioFiles": audio_files,
                "packageUrl": package_url,
                "completedAt": datetime.now().isoformat()
            }
        )

    def process_order(self, order):
        """处理整个订单"""
        order_id = order['orderId']

        try:
            # 1. 下载参考音频
            print(f"[{order_id}] 下载参考音频...")
            reference_audio = self.download_reference_audio(order['audioUrl'])

            # 2. 获取故事列表
            stories = order['product']['stories']
            audio_files = []

            # 3. 为每个故事生成音频
            for i, story in enumerate(stories, 1):
                print(f"[{order_id}] 生成 {i}/{len(stories)}: {story['name']}")

                output_path = f"/tmp/{order_id}_{story['cid']}.mp3"

                # 克隆语音
                self.clone_voice_for_story(
                    reference_audio,
                    story['content'],
                    output_path
                )

                # 上传音频
                audio_url = self.upload_audio(output_path, order_id, story['cid'])
                audio_files.append({
                    "storyId": story['cid'],
                    "storyName": story['name'],
                    "audioUrl": audio_url,
                    "duration": story['estimatedDuration']
                })

                # 更新进度
                self.update_progress(
                    order_id,
                    i,
                    len(stories),
                    story['name']
                )

            # 4. 打包成ZIP
            package_url = self.create_package(order_id, audio_files)

            # 5. 标记订单完成
            self.complete_order(order_id, audio_files, package_url)

            print(f"[{order_id}] ✅ 订单完成!")

        except Exception as e:
            print(f"[{order_id}] ❌ 错误: {e}")
            # 标记订单失败
            self.mark_failed(order_id, str(e))

    def run(self):
        """主循环"""
        print("🎙️ 语音克隆工作器启动...")

        while True:
            try:
                # 获取待处理订单
                orders = self.get_pending_orders()

                if orders:
                    for order in orders:
                        self.process_order(order)
                else:
                    print("暂无待处理订单，等待中...")
                    time.sleep(30)

            except Exception as e:
                print(f"错误: {e}")
                time.sleep(60)


# 使用示例
if __name__ == "__main__":
    worker = VoiceCloningWorker(
        api_base_url="https://api.soundbox.com",
        api_key="your-api-key"
    )
    worker.run()
```

---

## 🔄 工作流程

### 方案1: 轮询模式（简单）

```python
# 语音克隆程序持续轮询待处理订单
while True:
    orders = get_pending_orders()
    for order in orders:
        process_order(order)
    sleep(30)
```

**优点**: 简单易实现
**缺点**: 有延迟（最多30秒）

---

### 方案2: 消息队列模式（推荐）

```javascript
// API网关 - 收到订单后发送到消息队列
const { publishToQueue } = require('./message-queue');

app.post('/api/orders/create', async (req, res) => {
  const order = req.body;

  // 保存订单到数据库
  await db.orders.create(order);

  // 发送到消息队列
  await publishToQueue('voice-cloning-queue', order);

  res.json({
    success: true,
    orderId: order.orderId,
    message: "订单已提交"
  });
});
```

```python
# 语音克隆程序 - 监听队列
from message_queue import consume_queue

@consume_queue('voice-cloning-queue')
def process_order(order):
    # 立即处理订单
    generate_all_audios(order)

    mark_order_completed(order)
```

**优点**:
- 实时处理，无延迟
- 支持分布式部署
- 自动重试机制

**推荐**: Redis / RabbitMQ / AWS SQS

---

### 方案3: Webhook 模式（最快）

```javascript
// API网关 - 直接调用语音克隆服务
app.post('/api/orders/create', async (req, res) => {
  const order = req.body;

  // 保存订单
  await db.orders.create(order);

  // 立即触发语音克隆（异步）
  fetch('http://voice-cloning-service/process', {
    method: 'POST',
    body: JSON.stringify(order),
    headers: {'Content-Type': 'application/json'}
  }).catch(err => console.error('触发失败:', err));

  res.json({
    success: true,
    orderId: order.orderId
  });
});
```

**优点**: 响应最快
**缺点**: 需要处理失败重试

---

## 📁 文件存储

### 推荐方案

**方案1: 对象存储（推荐）**
- 阿里云 OSS
- 腾讯云 COS
- AWS S3

```python
import oss2

# 上传音频到OSS
auth = oss2.Auth('ACCESS_KEY', 'SECRET_KEY')
bucket = oss2.Bucket(auth, 'https://oss-cn-hangzhou.aliyuncs.com', 'soundbox-audio')

bucket.put_object(f'orders/{order_id}/{story_id}.mp3', audio_data)
```

**方案2: 本地存储 + CDN**
- 适合小规模
- 成本低

---

## 🚀 快速开始

### 第一步：创建订单数据库

```bash
# 使用 MongoDB
docker run -d -p 27017:27017 --name mongodb mongo:latest

# 或使用云服务
# MongoDB Atlas / 阿里云MongoDB
```

### 第二步：部署 API 网关

```bash
# Node.js + Express
npm install express mongoose cors dotenv

node api-server.js
```

### 第三步：启动语音克隆工作器

```bash
# 安装依赖
pip install index-tts requests pymongo

# 启动工作器
python worker.py
```

### 第四步：测试流程

```bash
# 提交测试订单
curl -X POST https://api.soundbox.com/api/orders/create \
  -H "Content-Type: application/json" \
  -d '{
    "childName": "测试宝宝",
    "voiceType": "妈妈",
    "email": "test@example.com",
    "product": {...}
  }'

# 查询订单状态
curl https://api.soundbox.com/api/orders/ord_xxx/status
```

---

## 💡 优化建议

1. **并行处理**: 多个故事同时生成（如果有多个GPU）
2. **缓存机制**: 相同文本只生成一次
3. **进度推送**: WebSocket 实时推送进度给前端
4. **监控告警**: 失败订单自动重试 + 钉钉/邮件通知
5. **负载均衡**: 多个工作器并行处理

---

## 🔐 安全要点

1. **API Key**: 所有接口需要验证
2. **数据加密**: 音频文件传输加密
3. **访问控制**: 用户只能访问自己的订单
4. **限流**: 防止恶意刷单
5. **数据保留**: 定期清理临时文件

---

*设计时间: 2025-01-12*
*版本: v1.0*
