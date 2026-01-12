# 声宝盒 x Gradio 自动化工作流

## 🎯 架构设计

```
┌─────────────┐      ┌─────────────┐      ┌──────────────┐
│   前端网站   │ ───> │  API网关    │ ───> │  MongoDB     │
│  (用户下单)  │      │  (Express)  │      │  (订单存储)  │
└─────────────┘      └─────────────┘      └──────────────┘
                            │
                            │ HTTP调用
                            ▼
                    ┌──────────────┐
                    │  Gradio程序   │
                    │  (算力机器)   │
                    │  - Index TTS  │
                    │  - GPU加速    │
                    └──────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │  文件存储     │
                    │  (OSS/本地)   │
                    └──────────────┘
```

---

## 🖥️ Gradio 程序改造

### 方案1: Gradio 原生接口（推荐）

在你的 Gradio 程序中添加 REST API：

```python
# gradio_app.py
import gradio as gr
from index_tts import clone_voice
import os
import uuid
from fastapi import FastAPI
from pydantic import BaseModel
import shutil

# ========== 数据模型 ==========
class ProcessRequest(BaseModel):
    order_id: str
    child_name: str
    voice_type: str
    stories: list
    reference_audio_url: str

class ProgressUpdate(BaseModel):
    order_id: str
    current: int
    total: int
    current_story: str

# ========== FastAPI 接口 ==========
app = FastAPI()

# 全局状态（生产环境建议用Redis）
processing_status = {}

@app.post("/process_order")
async def process_order(req: ProcessRequest):
    """
    处理整个订单
    API网关调用这个接口触发处理
    """
    import asyncio

    # 异步处理，避免阻塞
    asyncio.create_task(process_order_async(req))

    return {
        "success": True,
        "message": "订单已接收，正在处理",
        "order_id": req.order_id
    }

async def process_order_async(req: ProcessRequest):
    """异步处理订单"""
    try:
        order_id = req.order_id

        # 初始化状态
        processing_status[order_id] = {
            "status": "processing",
            "current": 0,
            "total": len(req.stories),
            "current_story": "",
            "percentage": 0
        }

        # 1. 下载参考音频
        print(f"[{order_id}] 下载参考音频...")
        reference_audio_path = f"/tmp/{order_id}_reference.wav"

        # 从API网关下载或从URL下载
        import requests
        audio_response = requests.get(req.reference_audio_url)
        with open(reference_audio_path, 'wb') as f:
            f.write(audio_response.content)

        # 2. 为每个故事生成音频
        output_files = []

        for i, story in enumerate(req.stories, 1):
            story_name = story.get('name', f'故事{i}')
            story_content = story.get('content', '')
            story_id = story.get('cid', f'{i:03d}')

            print(f"[{order_id}] 生成 {i}/{len(req.stories)}: {story_name}")

            # 更新进度
            processing_status[order_id].update({
                "current": i,
                "current_story": story_name,
                "percentage": (i / len(req.stories)) * 100
            })

            # 生成音频
            output_path = f"/tmp/{order_id}_{story_id}.mp3"

            # 调用你的 Index TTS 克隆函数
            clone_voice(
                reference_audio=reference_audio_path,
                target_text=story_content,
                output_path=output_path
            )

            # 上传到OSS（或者返回本地路径）
            audio_url = upload_to_oss(output_path, order_id, story_id)

            output_files.append({
                "story_id": story_id,
                "story_name": story_name,
                "audio_url": audio_url,
                "duration": story.get('estimated_duration', 120)
            })

        # 3. 打包成ZIP
        print(f"[{order_id}] 打包音频文件...")
        zip_url = create_zip_package(order_id, output_files)

        # 4. 更新状态为完成
        processing_status[order_id] = {
            "status": "completed",
            "output_files": output_files,
            "package_url": zip_url,
            "progress": 100
        }

        # 5. 回调通知API网关
        await notify_api_gateway(order_id, output_files, zip_url)

        print(f"[{order_id}] ✅ 订单完成!")

    except Exception as e:
        print(f"[{order_id}] ❌ 错误: {e}")
        processing_status[order_id] = {
            "status": "failed",
            "error": str(e)
        }

@app.get("/progress/{order_id}")
def get_progress(order_id: str):
    """查询订单进度"""
    return processing_status.get(order_id, {"status": "not_found"})

@app.post("/update_progress")
def update_progress_manual(req: ProgressUpdate):
    """手动更新进度（用于调试）"""
    if req.order_id in processing_status:
        processing_status[req.order_id].update({
            "current": req.current,
            "total": req.total,
            "current_story": req.current_story,
            "percentage": (req.current / req.total) * 100
        })
    return {"success": True}

# ========== Gradio界面（可选，用于手动测试） ==========
def gradio_process(reference_audio, child_name, voice_type, story_text):
    """Gradio界面的处理函数"""
    order_id = str(uuid.uuid4())[:8]

    # 保存参考音频
    reference_path = f"/tmp/{order_id}_reference.wav"
    shutil.copy(reference_audio, reference_path)

    # 生成音频
    output_path = f"/tmp/{order_id}_output.mp3"
    clone_voice(reference_path, story_text, output_path)

    return output_path, f"订单ID: {order_id}"

# 创建Gradio界面
with gr.Blocks() as demo:
    gr.Markdown("# 🎙️ 声宝盒 - 语音克隆")

    with gr.Row():
        with gr.Column():
            audio_input = gr.Audio(label="参考音频")
            name_input = gr.Textbox(label="孩子名字")
            voice_input = gr.Radio(["妈妈", "爸爸"], label="声音类型")
            text_input = gr.Textbox(label="故事文本", lines=5)
            process_btn = gr.Button("生成")

        with gr.Column():
            audio_output = gr.Audio(label="生成的音频")
            status_output = gr.Textbox(label="状态")

    process_btn.click(
        fn=gradio_process,
        inputs=[audio_input, name_input, voice_input, text_input],
        outputs=[audio_output, status_output]
    )

    with gr.Accordion("API文档", open=False):
        gr.Markdown("""
        ### REST API接口

        **处理订单:**
        ```
        POST /process_order
        Content-Type: application/json

        {
          "order_id": "ord_123",
          "child_name": "小明",
          "voice_type": "妈妈",
          "stories": [...],
          "reference_audio_url": "https://..."
        }
        ```

        **查询进度:**
        ```
        GET /progress/{order_id}
        ```
        """)

# ========== 挂载FastAPI到Gradio ==========
app = gr.mount_gradio_app(app, demo, path="/")

# ========== 辅助函数 ==========
def upload_to_oss(file_path, order_id, story_id):
    """
    上传音频到OSS
    实际使用时替换成你的OSS上传逻辑
    """
    import oss2
    # 示例：阿里云OSS
    # auth = oss2.Auth('YOUR_ACCESS_KEY', 'YOUR_SECRET_KEY')
    # bucket = oss2.Bucket(auth, 'https://oss-cn-hangzhou.aliyuncs.com', 'soundbox')
    # bucket.put_object(f'orders/{order_id}/{story_id}.mp3', open(file_path, 'rb'))
    # return f"https://your-bucket.oss-cn-hangzhou.aliyuncs.com/orders/{order_id}/{story_id}.mp3"

    # 临时方案：返回本地路径
    return f"http://your-server.com/audio/{order_id}/{story_id}.mp3"

def create_zip_package(order_id, files):
    """打包所有音频为ZIP"""
    import zipfile
    zip_path = f"/tmp/{order_id}.zip"

    with zipfile.ZipFile(zip_path, 'w') as zipf:
        for file_info in files:
            # 从URL或本地路径添加到ZIP
            # 实际使用时需要下载音频文件
            pass

    # 上传ZIP到OSS
    zip_url = upload_to_oss(zip_path, order_id, "package")
    return zip_url

async def notify_api_gateway(order_id, files, package_url):
    """通知API网关订单完成"""
    import httpx
    async with httpx.AsyncClient() as client:
        await client.post(
            "http://your-api-server.com/api/orders/complete",
            json={
                "orderId": order_id,
                "audioFiles": files,
                "packageUrl": package_url
            }
        )

# ========== 启动 ==========
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
```

---

## 🌐 API网关改造

### Express 服务器调用 Gradio

```javascript
// api-server.js
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('uploads'));

// Gradio服务地址
const GRADIO_URL = process.env.GRADIO_URL || 'http://localhost:7860';

// MongoDB连接
mongoose.connect('mongodb://localhost:27017/soundbox');

// 订单模型
const Order = mongoose.model('Order', {
  orderId: String,
  childName: String,
  voiceType: String,
  email: String,
  wechat: String,
  product: Object,
  audioPath: String,
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  progress: {
    current: Number,
    total: Number,
    currentStory: String,
    percentage: Number
  },
  outputFiles: [Object],
  packageUrl: String,
  createdAt: { type: Date, default: Date.now },
  completedAt: Date
});

// 上传配置
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});
const upload = multer({ storage });

// ========== 接口定义 ==========

// 1. 创建订单（前端调用）
app.post('/api/orders/create', upload.single('audio'), async (req, res) => {
  try {
    const { childName, voiceType, email, wechat, product } = req.body;
    const audioPath = req.file ? req.file.path : null;

    const orderId = `ord_${Date.now()}`;

    // 创建订单
    const order = await Order.create({
      orderId,
      childName,
      voiceType,
      email,
      wechat,
      product: JSON.parse(product),
      audioPath,
      status: 'pending'
    });

    // 生成音频的公共URL
    const audioUrl = `${req.protocol}://${req.get('host')}/${audioPath}`;

    // 准备发送给Gradio的数据
    const gradioRequest = {
      order_id: orderId,
      child_name: childName,
      voice_type: voiceType,
      stories: JSON.parse(product).stories,
      reference_audio_url: audioUrl
    };

    // 发送给Gradio处理
    console.log(`[${orderId}] 发送订单到Gradio...`);

    try {
      const gradioResponse = await axios.post(
        `${GRADIO_URL}/process_order`,
        gradioRequest,
        { timeout: 5000 } // 5秒超时，只确认接收
      );

      console.log(`[${orderId}] Gradio已接收:`, gradioResponse.data);

      res.json({
        success: true,
        orderId,
        message: '订单已提交，正在处理中',
        estimatedTime: '约30分钟完成'
      });

    } catch (error) {
      console.error(`[${orderId}] Gradio调用失败:`, error.message);

      // 标记订单失败
      await Order.updateOne(
        { orderId },
        { status: 'failed' }
      );

      res.status(500).json({
        success: false,
        message: 'Gradio服务不可用'
      });
    }

  } catch (error) {
    console.error('创建订单失败:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 2. 查询订单进度（前端轮询）
app.get('/api/orders/:orderId/progress', async (req, res) => {
  try {
    const { orderId } = req.params;

    // 从本地数据库查询
    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    // 如果正在处理，从Gradio获取最新进度
    if (order.status === 'processing') {
      try {
        const gradioProgress = await axios.get(
          `${GRADIO_URL}/progress/${orderId}`
        );

        // 更新本地进度
        if (gradioProgress.data.status !== 'not_found') {
          await Order.updateOne(
            { orderId },
            {
              progress: {
                current: gradioProgress.data.current,
                total: gradioProgress.data.total,
                currentStory: gradioProgress.data.current_story,
                percentage: gradioProgress.data.percentage
              }
            }
          );

          return res.json({
            success: true,
            orderId: order.orderId,
            status: gradioProgress.data.status,
            progress: gradioProgress.data,
            estimatedTime: gradioProgress.data.status === 'processing'
              ? `剩余约${Math.ceil((gradioProgress.data.total - gradioProgress.data.current) * 1)}分钟`
              : null
          });
        }
      } catch (error) {
        console.error('获取Gradio进度失败:', error.message);
      }
    }

    // 返回本地状态
    return res.json({
      success: true,
      orderId: order.orderId,
      status: order.status,
      progress: order.progress,
      outputFiles: order.outputFiles,
      packageUrl: order.packageUrl
    });

  } catch (error) {
    console.error('查询进度失败:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 3. Gradio回调（订单完成时调用）
app.post('/api/orders/complete', async (req, res) => {
  try {
    const { orderId, audioFiles, packageUrl } = req.body;

    console.log(`[${orderId}] 订单完成，更新数据库...`);

    // 更新订单状态
    await Order.updateOne(
      { orderId },
      {
        status: 'completed',
        outputFiles: audioFiles,
        packageUrl: packageUrl,
        completedAt: new Date()
      }
    );

    // TODO: 发送邮件通知用户
    // await sendCompletionEmail(orderId, packageUrl);

    res.json({ success: true });

  } catch (error) {
    console.error('更新订单失败:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 4. 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    gradio: GRADIO_URL
  });
});

// 启动服务器
app.listen(3000, () => {
  console.log('API服务器运行在端口3000');
  console.log(`Gradio服务地址: ${GRADIO_URL}`);
});
```

---

## 🔄 工作流程

### 完整流程图

```
1. 用户在前端下单
   ↓
2. 前端 → API网关: POST /api/orders/create
   - 上传录音文件
   - 提交订单信息
   ↓
3. API网关保存订单到MongoDB (status: pending)
   ↓
4. API网关 → Gradio: POST /process_order
   - 发送订单数据
   - 提供录音URL
   ↓
5. Gradio开始处理
   - 下载录音
   - 批量生成音频
   - 更新进度
   ↓
6. 前端轮询: GET /api/orders/:orderId/progress
   - API网关 → Gradio: GET /progress/:orderId
   - 返回实时进度
   ↓
7. Gradio完成处理
   - 上传音频到OSS
   - 打包成ZIP
   ↓
8. Gradio → API网关: POST /api/orders/complete
   - 通知订单完成
   - 传递音频文件列表
   ↓
9. API网关更新数据库
   - status: completed
   - 保存文件URL
   ↓
10. 前端显示完成
    - 提供下载链接
    - 发送邮件通知
```

---

## 🔧 配置和部署

### 1. 算力机器（Gradio）

```bash
# 安装依赖
pip install gradio fastapi uvicorn index-tts python-multipart

# 启动Gradio
python gradio_app.py

# 或使用Gunicorn（生产环境）
gunicorn -w 4 -b 0.0.0.0:7860 gradio_app:app
```

### 2. API服务器

```bash
# 安装依赖
npm install express mongoose multer axios cors

# 配置环境变量
export GRADIO_URL=http://your-gradio-server:7860

# 启动服务
node api-server.js
```

### 3. 网络配置

**重要**: 确保API网关能访问Gradio服务

```bash
# 方案1: 同一内网
API网关 (内网IP) <---> Gradio (内网IP:7860)

# 方案2: 公网访问
API网关 <---> Gradio公网域名
```

---

## 🎯 测试流程

### 1. 测试Gradio接口

```bash
# 测试提交订单
curl -X POST http://localhost:7860/process_order \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "test_001",
    "child_name": "测试宝宝",
    "voice_type": "妈妈",
    "stories": [
      {
        "cid": "001",
        "name": "小兔子乖乖",
        "content": "小兔子乖乖，把门儿开开..."
      }
    ],
    "reference_audio_url": "http://example.com/audio.wav"
  }'

# 查询进度
curl http://localhost:7860/progress/test_001
```

### 2. 测试完整流程

```bash
# 1. 提交订单
curl -X POST http://localhost:3000/api/orders/create \
  -F "audio=@test.wav" \
  -F "childName=小明" \
  -F "voiceType=妈妈" \
  -F "email=test@example.com" \
  -F 'product={"stories": [...]}'

# 2. 查询进度
curl http://localhost:3000/api/orders/ord_xxx/progress
```

---

## 📊 监控和调试

### Gradio添加监控

```python
@app.get("/stats")
def get_stats():
    """获取处理统计"""
    stats = {
        "total": len(processing_status),
        "processing": len([s for s in processing_status.values() if s.get('status') == 'processing']),
        "completed": len([s for s in processing_status.values() if s.get('status') == 'completed']),
        "failed": len([s for s in processing_status.values() if s.get('status') == 'failed']),
    }
    return stats
```

### 日志记录

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('gradio_app.log'),
        logging.StreamHandler()
    ]
)
```

---

## 💡 优化建议

1. **异步处理**: Gradio使用后台任务处理
2. **进度推送**: WebSocket替代轮询
3. **断点续传**: 支持失败重试
4. **负载均衡**: 多个Gradio实例
5. **缓存机制**: 相同文本复用结果

---

*更新时间: 2025-01-12*
*版本: v2.0 (Gradio版)*
