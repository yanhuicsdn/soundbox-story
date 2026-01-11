"""
声宝盒后端API示例
使用Python Flask框架

功能:
1. 接收录音文件上传
2. 保存订单数据
3. 触发AI批量生成任务
4. 发送交付邮件
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import json
import uuid
from datetime import datetime
import subprocess

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 配置
UPLOAD_FOLDER = 'uploads'
ORDERS_FILE = 'orders.json'
ALLOWED_EXTENSIONS = {'wav', 'mp3', 'ogg'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 最大16MB

# 确保上传目录存在
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def allowed_file(filename):
    """检查文件类型"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def save_order(order_data):
    """保存订单到JSON文件"""
    try:
        if os.path.exists(ORDERS_FILE):
            with open(ORDERS_FILE, 'r', encoding='utf-8') as f:
                orders = json.load(f)
        else:
            orders = []

        order_data['order_id'] = str(uuid.uuid4())
        order_data['created_at'] = datetime.now().isoformat()
        order_data['status'] = 'pending'

        orders.append(order_data)

        with open(ORDERS_FILE, 'w', encoding='utf-8') as f:
            json.dump(orders, f, ensure_ascii=False, indent=2)

        return order_data['order_id']
    except Exception as e:
        print(f"保存订单失败: {e}")
        return None


def trigger_generation_task(order_id, audio_file_path, product_type):
    """
    触发AI批量生成任务

    TODO: 根据你的实际AI模型和生成脚本修改
    """
    try:
        # 示例: 调用你的批量生成脚本
        # subprocess.run([
        #     'python',
        #     'batch_generate.py',
        #     '--order_id', order_id,
        #     '--audio', audio_file_path,
        #     '--product', product_type
        # ])

        print(f"触发生成任务: order_id={order_id}, audio={audio_file_path}, product={product_type}")
        return True
    except Exception as e:
        print(f"触发生成任务失败: {e}")
        return False


def send_delivery_email(email, order_id, download_url):
    """
    发送交付邮件

    TODO: 集成邮件服务(如SendGrid、阿里云邮件推送等)
    """
    try:
        # 示例: 使用SendGrid
        # import sendgrid
        # from sendgrid.helpers.mail import Mail
        #
        # message = Mail(
        #     from_email='hello@soundbox.com',
        #     to_emails=email,
        #     subject='您的声宝盒故事包已生成',
        #     html_content=f'<p>您的专属故事包已生成!</p><p>下载链接: <a href="{download_url}">点击下载</a></p>'
        # )
        # sg = sendgrid.SendGridAPIClient(os.environ.get('SENDGRID_API_KEY'))
        # response = sg.send(message)

        print(f"发送邮件到 {email}: order_id={order_id}, url={download_url}")
        return True
    except Exception as e:
        print(f"发送邮件失败: {e}")
        return False


@app.route('/')
def index():
    """提供静态网站"""
    return send_from_directory('.', 'index.html')


@app.route('/api/order', methods=['POST'])
def create_order():
    """创建订单并上传录音"""

    # 检查是否有文件
    if 'audio' not in request.files:
        return jsonify({'error': '没有音频文件'}), 400

    audio_file = request.files['audio']

    # 检查文件名
    if audio_file.filename == '':
        return jsonify({'error': '未选择文件'}), 400

    # 检查文件类型
    if not allowed_file(audio_file.filename):
        return jsonify({'error': '不支持的文件类型'}), 400

    # 获取订单数据
    order_data_str = request.form.get('order')
    if not order_data_str:
        return jsonify({'error': '缺少订单数据'}), 400

    try:
        order_data = json.loads(order_data_str)
    except json.JSONDecodeError:
        return jsonify({'error': '订单数据格式错误'}), 400

    # 保存音频文件
    filename = secure_filename(audio_file.filename)
    order_id = str(uuid.uuid4())
    audio_filename = f"{order_id}_{filename}"
    audio_path = os.path.join(app.config['UPLOAD_FOLDER'], audio_filename)
    audio_file.save(audio_path)

    # 保存订单
    order_data['audio_file'] = audio_filename
    order_data['audio_path'] = audio_path
    saved_order_id = save_order(order_data)

    if not saved_order_id:
        return jsonify({'error': '保存订单失败'}), 500

    # 触发生成任务
    product_type = order_data.get('product', {}).get('name', 'combo')
    trigger_generation_task(saved_order_id, audio_path, product_type)

    return jsonify({
        'success': True,
        'order_id': saved_order_id,
        'message': '订单创建成功,我们将在24小时内发送到您的邮箱'
    }), 200


@app.route('/api/order/<order_id>', methods=['GET'])
def get_order(order_id):
    """查询订单状态"""
    try:
        if os.path.exists(ORDERS_FILE):
            with open(ORDERS_FILE, 'r', encoding='utf-8') as f:
                orders = json.load(f)

            for order in orders:
                if order.get('order_id') == order_id:
                    return jsonify({'success': True, 'order': order}), 200

        return jsonify({'error': '订单不存在'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/webhook/payment', methods=['POST'])
def payment_webhook():
    """
    支付回调webhook

    TODO: 根据微信支付/支付宝的文档实现
    """
    data = request.json
    order_id = data.get('order_id')
    payment_status = data.get('status')

    # 更新订单状态
    if order_id and payment_status == 'success':
        # TODO: 更新订单支付状态
        pass

    return jsonify({'success': True}), 200


@app.route('/api/webhook/generation-complete', methods=['POST'])
def generation_complete_webhook():
    """
    生成完成webhook

    当AI批量生成完成后调用此接口
    """
    data = request.json
    order_id = data.get('order_id')
    download_url = data.get('download_url')

    try:
        # 更新订单状态
        if os.path.exists(ORDERS_FILE):
            with open(ORDERS_FILE, 'r', encoding='utf-8') as f:
                orders = json.load(f)

            for order in orders:
                if order.get('order_id') == order_id:
                    order['status'] = 'completed'
                    order['download_url'] = download_url

                    # 发送邮件
                    send_delivery_email(
                        order.get('email'),
                        order_id,
                        download_url
                    )

                    with open(ORDERS_FILE, 'w', encoding='utf-8') as f:
                        json.dump(orders, f, ensure_ascii=False, indent=2)

                    break

        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health_check():
    """健康检查"""
    return jsonify({'status': 'healthy'}), 200


if __name__ == '__main__':
    # 开发环境
    app.run(debug=True, host='0.0.0.0', port=5000)

    # 生产环境建议使用Gunicorn
    # gunicorn -w 4 -b 0.0.0.0:5000 app:app
