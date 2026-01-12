#!/usr/bin/env python3
"""
声宝盒 - Gradio语音克隆服务
在算力机器上运行，提供REST API和Web界面
"""

import gradio as gr
from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import asyncio
import logging
import uuid
import os
import json
from datetime import datetime
import requests
from pathlib import Path

# ========== 配置日志 ==========
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('gradio_service.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# ========== 数据模型 ==========
class Story(BaseModel):
    cid: str
    name: str
    content: str
    estimated_duration: int = 120

class ProductInfo(BaseModel):
    id: str
    name: str
    price: int
    stories: List[Story]

class ProcessRequest(BaseModel):
    order_id: str
    child_name: str
    voice_type: str
    email: str
    product: ProductInfo
    reference_audio_url: str

class ProgressInfo(BaseModel):
    order_id: str
    current: int
    total: int
    current_story: str
    percentage: float

class CompleteRequest(BaseModel):
    order_id: str
    audio_files: List[dict]
    package_url: str

# ========== 全局状态 ==========
# 生产环境建议用Redis
processing_status = {}
API_GATEWAY_URL = os.getenv("API_GATEWAY_URL", "http://localhost:3000")

# ========== FastAPI应用 ==========
api_app = FastAPI(title="声宝盒语音克隆API")

# ========== 核心处理函数 ==========
async def clone_voice_async(reference_audio_path: str, text: str, output_path: str):
    """
    异步语音克隆函数
    TODO: 替换为你的Index TTS实际调用
    """
    logger.info(f"开始克隆: {text[:50]}...")

    # 这里调用你的Index TTS
    # 示例代码（需要替换）:
    # from index_tts import clone_voice
    # clone_voice(reference_audio_path, text, output_path)

    # 模拟处理时间（实际使用时删除）
    await asyncio.sleep(2)

    # 生成一个空音频作为占位符（实际使用时删除）
    with open(output_path, 'wb') as f:
        f.write(b'fake audio data')

    logger.info(f"克隆完成: {output_path}")
    return output_path

def download_audio(url: str, save_path: str) -> str:
    """下载音频文件"""
    logger.info(f"下载音频: {url}")
    response = requests.get(url, timeout=30)
    with open(save_path, 'wb') as f:
        f.write(response.content)
    return save_path

def upload_to_storage(file_path: str, order_id: str, story_id: str) -> str:
    """
    上传音频到存储
    TODO: 替换为你的OSS上传逻辑
    """
    # 示例：上传到阿里云OSS
    # import oss2
    # auth = oss2.Auth('ACCESS_KEY', 'SECRET_KEY')
    # bucket = oss2.Bucket(auth, 'ENDPOINT', 'BUCKET_NAME')
    # bucket.put_object(f'orders/{order_id}/{story_id}.mp3', open(file_path, 'rb'))
    # return f"https://your-bucket.oss-cn-hangzhou.aliyuncs.com/orders/{order_id}/{story_id}.mp3"

    # 临时方案：返回本地URL
    filename = os.path.basename(file_path)
    return f"{API_GATEWAY_URL}/output/{order_id}/{filename}"

def create_package(order_id: str, audio_files: list) -> str:
    """打包所有音频"""
    import zipfile

    # 创建输出目录
    output_dir = Path(f"output/{order_id}")
    output_dir.mkdir(parents=True, exist_ok=True)

    zip_path = output_dir / "package.zip"

    with zipfile.ZipFile(zip_path, 'w') as zipf:
        for file_info in audio_files:
            # 从URL下载并添加到ZIP
            try:
                audio_data = requests.get(file_info['audio_url'], timeout=30).content
                zipf.writestr(f"{file_info['story_id']}.mp3", audio_data)
            except Exception as e:
                logger.error(f"添加文件失败: {e}")

    # 上传ZIP
    zip_url = upload_to_storage(str(zip_path), order_id, "package")
    return zip_url

async def notify_completion(order_id: str, audio_files: list, package_url: str):
    """通知API网关订单完成"""
    try:
        import httpx
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{API_GATEWAY_URL}/api/orders/complete",
                json={
                    "orderId": order_id,
                    "audioFiles": audio_files,
                    "packageUrl": package_url
                }
            )
            logger.info(f"通知完成: {response.status_code}")
    except Exception as e:
        logger.error(f"通知失败: {e}")

async def process_order_task(req: ProcessRequest):
    """后台处理订单任务"""
    order_id = req.order_id

    try:
        logger.info(f"[{order_id}] 开始处理订单")

        # 初始化状态
        processing_status[order_id] = {
            "status": "processing",
            "current": 0,
            "total": len(req.product.stories),
            "current_story": "准备中...",
            "percentage": 0,
            "started_at": datetime.now().isoformat()
        }

        # 创建临时目录
        temp_dir = Path(f"/tmp/{order_id}")
        temp_dir.mkdir(exist_ok=True)

        # 1. 下载参考音频
        logger.info(f"[{order_id}] 下载参考音频")
        reference_audio_path = temp_dir / "reference.wav"
        download_audio(req.reference_audio_url, str(reference_audio_path))

        # 2. 批量生成音频
        audio_files = []
        stories = req.product.stories

        for i, story in enumerate(stories, 1):
            story_id = story.cid
            story_name = story.name

            logger.info(f"[{order_id}] 生成 {i}/{len(stories)}: {story_name}")

            # 更新进度
            processing_status[order_id].update({
                "current": i,
                "current_story": story_name,
                "percentage": (i / len(stories)) * 100
            })

            # 生成音频
            output_path = temp_dir / f"{story_id}.mp3"

            await clone_voice_async(
                str(reference_audio_path),
                story.content,
                str(output_path)
            )

            # 上传音频
            audio_url = upload_to_storage(str(output_path), order_id, story_id)

            audio_files.append({
                "story_id": story_id,
                "story_name": story_name,
                "audio_url": audio_url,
                "duration": story.estimated_duration
            })

        # 3. 打包
        logger.info(f"[{order_id}] 打包音频文件")
        package_url = create_package(order_id, audio_files)

        # 4. 更新状态为完成
        processing_status[order_id] = {
            "status": "completed",
            "current": len(stories),
            "total": len(stories),
            "percentage": 100,
            "output_files": audio_files,
            "package_url": package_url,
            "completed_at": datetime.now().isoformat()
        }

        # 5. 通知API网关
        await notify_completion(order_id, audio_files, package_url)

        logger.info(f"[{order_id}] ✅ 订单完成")

    except Exception as e:
        logger.error(f"[{order_id}] ❌ 处理失败: {e}")
        processing_status[order_id] = {
            "status": "failed",
            "error": str(e),
            "failed_at": datetime.now().isoformat()
        }

# ========== REST API端点 ==========

@api_app.post("/process_order")
async def api_process_order(req: ProcessRequest, background_tasks: BackgroundTasks):
    """接收订单并异步处理"""
    logger.info(f"收到订单: {req.order_id}")

    # 验证数据
    if not req.product.stories:
        return {"success": False, "message": "故事列表为空"}

    # 后台处理
    background_tasks.add_task(process_order_task, req)

    return {
        "success": True,
        "message": "订单已接收，正在处理",
        "order_id": req.order_id,
        "estimated_time": f"约{len(req.product.stories) * 1}分钟"
    }

@api_app.get("/progress/{order_id}")
def api_get_progress(order_id: str):
    """查询订单进度"""
    if order_id not in processing_status:
        return {"status": "not_found", "message": "订单不存在"}

    return processing_status[order_id]

@api_app.post("/update_progress")
def api_update_progress(req: ProgressInfo):
    """手动更新进度（调试用）"""
    if req.order_id in processing_status:
        processing_status[req.order_id].update({
            "current": req.current,
            "total": req.total,
            "current_story": req.current_story,
            "percentage": req.percentage
        })
    return {"success": True}

@api_app.get("/stats")
def api_get_stats():
    """获取统计信息"""
    stats = {
        "total_orders": len(processing_status),
        "by_status": {}
    }

    for status in processing_status.values():
        s = status.get('status', 'unknown')
        stats["by_status"][s] = stats["by_status"].get(s, 0) + 1

    return stats

@api_app.get("/health")
def api_health():
    """健康检查"""
    return {
        "status": "healthy",
        "service": "声宝盒Gradio服务",
        "processing": len([s for s in processing_status.values() if s.get('status') == 'processing'])
    }

# ========== Gradio界面（可选，用于手动测试）==========
def gradio_clone(reference_audio, child_name, voice_type, story_text):
    """Gradio手动处理界面"""
    order_id = f"manual_{uuid.uuid4().hex[:8]}"

    try:
        # 保存参考音频
        temp_dir = Path("output/manual")
        temp_dir.mkdir(parents=True, exist_ok=True)

        reference_path = temp_dir / f"{order_id}_reference.wav"
        if reference_audio:
            shutil.copy(reference_audio, reference_path)
        else:
            return None, "请上传参考音频"

        # 生成音频
        output_path = temp_dir / f"{order_id}_output.mp3"
        await clone_voice_async(
            str(reference_path),
            story_text,
            str(output_path)
        )

        return str(output_path), f"✅ 完成！订单ID: {order_id}"

    except Exception as e:
        return None, f"❌ 错误: {str(e)}"

with gr.Blocks() as demo:
    gr.Markdown("# 🎙️ 声宝盒 - 语音克隆服务")

    with gr.Tabs():
        # Tab1: 自动处理（API调用）
        with gr.Tab("API服务"):
            gr.Markdown("""
            ### REST API接口

            此服务运行在算力机器上，通过REST API接收订单。

            **处理订单:**
            ```
            POST /process_order
            Content-Type: application/json

            {
              "order_id": "ord_123",
              "child_name": "小明",
              "voice_type": "妈妈",
              "email": "user@example.com",
              "product": {
                "id": "sleep",
                "name": "哄睡故事包",
                "stories": [...]
              },
              "reference_audio_url": "http://..."
            }
            ```

            **查询进度:**
            ```
            GET /progress/{order_id}
            ```

            **统计信息:**
            ```
            GET /stats
            ```

            **健康检查:**
            ```
            GET /health
            ```
            """)

            with gr.Row():
                with gr.Column():
                    order_input = gr.Textbox(label="订单ID", placeholder="输入订单ID查询进度")
                    query_btn = gr.Button("查询进度")

                with gr.Column():
                    progress_output = gr.JSON(label="进度信息")

            query_btn.click(
                fn=lambda oid: api_get_progress(oid),
                inputs=[order_input],
                outputs=[progress_output]
            )

        # Tab2: 手动测试
        with gr.Tab("手动测试"):
            gr.Markdown("### 生成单个故事音频")

            with gr.Row():
                with gr.Column():
                    audio_input = gr.Audio(label="参考音频 (10秒录音)")
                    name_input = gr.Textbox(label="孩子名字", placeholder="例如：小明")
                    voice_input = gr.Radio(["妈妈", "爸爸"], label="声音类型", value="妈妈")
                    text_input = gr.Textbox(
                        label="故事文本",
                        lines=8,
                        placeholder="输入要生成的故事文本...",
                        value="小兔子乖乖，把门儿开开，快点儿开开，我要进来。"
                    )
                    generate_btn = gr.Button("🎙️ 生成音频", variant="primary")

                with gr.Column():
                    audio_output = gr.Audio(label="生成的音频")
                    status_output = gr.Textbox(label="状态")

            generate_btn.click(
                fn=gradio_clone,
                inputs=[audio_input, name_input, voice_input, text_input],
                outputs=[audio_output, status_output]
            )

        # Tab3: 监控面板
        with gr.Tab("监控"):
            gr.Markdown("### 服务监控")

            stats_btn = gr.Button("刷新统计")
            stats_output = gr.JSON(label="统计信息")

            stats_btn.click(
                fn=api_get_stats,
                outputs=[stats_output]
            )

            gr.Markdown("""
            ### 当前处理中的订单

            定期刷新查看正在处理的订单列表和进度。
            """)

            with gr.Row():
                list_btn = gr.Button("查看所有订单")
                all_orders_output = gr.JSON(label="所有订单状态")

            list_btn.click(
                fn=lambda: processing_status,
                outputs=[all_orders_output]
            )

# ========== 挂载FastAPI到Gradio ==========
app = gr.mount_gradio_app(api_app, demo, path="/")

# ========== 启动服务 ==========
if __name__ == "__main__":
    import shutil

    # 创建输出目录
    Path("output").mkdir(exist_ok=True)

    logger.info("🚀 启动声宝盒Gradio服务...")
    logger.info(f"📡 API网关地址: {API_GATEWAY_URL}")
    logger.info(f"🎯 服务地址: http://0.0.0.0:7860")

    # 启动Uvicorn服务器
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=7860,
        log_level="info"
    )
