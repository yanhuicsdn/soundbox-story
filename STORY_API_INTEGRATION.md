# 故事生成 API 集成方案

## 📋 概述

本文档说明如何将算力机器上的故事生成 API 集成到订单系统中，实现支付成功后自动生成故事。

## 🎯 集成目标

1. ✅ 用户支付成功后，自动调用故事生成 API
2. ✅ 保存任务 ID 到订单数据
3. ✅ 接收生成完成的回调通知
4. ✅ 发送邮件通知用户下载故事

## 📁 已创建的文件

### 1. `/lib/storyApi.ts` - 故事生成 API 客户端

封装了与故事生成 API 的交互逻辑：

- `createStoryTask()` - 创建生成任务
- `getTaskStatus()` - 查询任务状态
- `getPackageId()` - 产品名称到故事包 ID 的映射
- `healthCheck()` - API 健康检查
- `getAvailablePackages()` - 获取可用故事包

### 2. `/app/api/story-callback/route.ts` - 回调接口

接收故事生成完成的通知：

- 更新订单状态
- 发送完成通知邮件
- 处理失败情况

### 3. 已修改的文件

- `/app/api/payment-notify/route.ts` - 支付通知接口（已添加 API 调用）
- `/.env.example` - 环境变量配置（已添加 API 配置）

## 🔧 需要手动完成的步骤

### 步骤 1: 配置环境变量

在 Vercel 或本地 `.env` 文件中添加：

```bash
# 故事生成 API 地址（算力机器的地址）
STORY_API_URL=http://your-gpu-server:8000

# 当前网站地址（用于回调）
NEXT_PUBLIC_URL=https://story.66668888.cloud
```

### 步骤 2: 更新飞书表格字段

需要在飞书多维表格中添加以下字段：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| taskId | 文本 | 故事生成任务 ID |
| storyStatus | 单选 | 故事状态：生成中/生成完成/生成失败 |
| downloadUrl | 文本 | 故事下载链接 |
| storyError | 文本 | 生成失败的错误信息 |

### 步骤 3: 更新 `lib/feishu.ts`

需要添加以下函数（目前缺失，会导致 lint 错误）：

```typescript
/**
 * 更新任务状态
 */
export async function updateTaskStatus(taskId: string, updates: {
    status?: string;
    downloadUrl?: string;
    error?: string;
}) {
    try {
        const client = getFeishuClient();
        const orders = await getAllOrders();
        
        // 找到对应的订单
        const order = orders.find((o: any) => o.taskId === taskId);
        if (!order || !order.recordId) {
            console.error('未找到对应的订单记录');
            return;
        }

        const fields: any = {};
        
        if (updates.status) {
            fields['故事状态'] = updates.status;
        }
        
        if (updates.downloadUrl) {
            fields['下载链接'] = updates.downloadUrl;
        }
        
        if (updates.error) {
            fields['错误信息'] = updates.error;
        }

        await client.bitable.appTableRecord.update({
            path: {
                app_token: APP_TOKEN,
                table_id: TABLE_ID,
                record_id: order.recordId
            },
            data: {
                fields
            }
        });

        console.log('✅ 任务状态已更新');
    } catch (error) {
        console.error('❌ 更新任务状态失败:', error);
        throw error;
    }
}
```

### 步骤 4: 更新 `lib/email.ts`

需要添加故事完成通知邮件函数（目前缺失）：

```typescript
/**
 * 发送故事生成完成通知邮件
 */
export async function sendStoryCompletedEmail(params: {
    email: string;
    childName: string;
    downloadUrl: string;
    orderId: string;
}) {
    const { email, childName, downloadUrl, orderId } = params;

    console.log('📧 发送故事完成通知邮件...');
    console.log('收件人:', email);

    const transporter = createTransporter();
    const fromEmail = getFromEmail();

    const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; background: #FF6B6B; color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: bold; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 ${childName}的专属故事已生成！</h1>
                </div>
                <div class="content">
                    <p>亲爱的家长，您好！</p>
                    
                    <p>好消息！为<strong>${childName}</strong>定制的专属故事已经生成完成啦！</p>
                    
                    <p>现在您可以下载故事音频，让孩子享受您声音讲述的温暖故事了。</p>
                    
                    <div style="text-align: center;">
                        <a href="${downloadUrl}" class="button">立即下载故事</a>
                    </div>
                    
                    <p><strong>订单信息：</strong></p>
                    <ul>
                        <li>订单号：${orderId}</li>
                        <li>孩子姓名：${childName}</li>
                    </ul>
                    
                    <p><strong>温馨提示：</strong></p>
                    <ul>
                        <li>下载链接有效期为 30 天，请及时下载保存</li>
                        <li>建议使用电脑或手机浏览器下载</li>
                        <li>下载后是一个 ZIP 压缩包，解压后即可播放</li>
                    </ul>
                    
                    <p>祝您和孩子享受美好的亲子时光！</p>
                </div>
                <div class="footer">
                    <p>声宝盒 - 用你的声音，给孩子最好的陪伴</p>
                    <p>如有问题，请联系客服</p>
                </div>
            </div>
        </body>
        </html>
    `;

    try {
        const result = await transporter.sendMail({
            from: fromEmail,
            to: email,
            subject: `🎉 ${childName}的专属故事已生成完成！`,
            html: emailHtml
        });

        console.log('✅ 故事完成通知邮件发送成功');
        console.log('Message ID:', result.messageId);

        return {
            success: true,
            messageId: result.messageId
        };

    } catch (error: any) {
        console.error('❌ 发送邮件失败:', error);
        throw error;
    }
}
```

## 🔄 完整工作流程

```
用户支付 → 支付通知 → 创建故事任务 → 保存 taskId
                ↓
         发送确认邮件
                ↓
        （等待 15-30 分钟）
                ↓
         故事生成完成
                ↓
         回调通知接口
                ↓
         更新订单状态
                ↓
      发送完成通知邮件
                ↓
         用户下载故事
```

## 📊 数据流转

### 1. 支付成功时

```typescript
{
  orderId: "ORDER_123",
  childName: "小明",
  voiceType: "爸爸",
  productName: "第一次体验",
  audioFile: Buffer,
  status: "已支付"
}
```

### 2. 创建任务后

```typescript
{
  orderId: "ORDER_123",
  taskId: "task_1705478460_a1b2c3d4",
  storyStatus: "生成中",
  ...
}
```

### 3. 生成完成后

```typescript
{
  orderId: "ORDER_123",
  taskId: "task_1705478460_a1b2c3d4",
  storyStatus: "生成完成",
  downloadUrl: "http://api-server:8000/api/download/task_xxx",
  ...
}
```

## 🧪 测试步骤

### 1. 本地测试

```bash
# 1. 启动故事生成 API（在算力机器上）
cd story
./启动API服务.sh

# 2. 配置环境变量
export STORY_API_URL=http://localhost:8000
export NEXT_PUBLIC_URL=http://localhost:3000

# 3. 启动订单系统
npm run dev

# 4. 模拟支付成功
curl -X POST http://localhost:3000/api/payment-notify \
  -H "Content-Type: application/json" \
  -d '{...}'
```

### 2. 生产环境测试

1. 在 Vercel 配置环境变量
2. 确保算力机器的 API 可以被公网访问
3. 确保回调 URL 可以被算力机器访问
4. 进行真实支付测试

## ⚠️ 注意事项

### 1. 网络访问

- 订单系统需要能访问算力机器的 API（出站）
- 算力机器需要能访问订单系统的回调接口（入站）
- 如果算力机器在内网，需要配置内网穿透或 VPN

### 2. 超时处理

- 故事生成可能需要 15-30 分钟
- 使用异步回调机制，不要同步等待
- 设置合理的超时时间

### 3. 错误处理

- API 调用失败时，不影响支付流程
- 记录详细的错误日志
- 可以添加重试机制

### 4. 安全性

- 建议为 API 添加认证（API Key 或 JWT）
- 验证回调请求的来源
- 使用 HTTPS 传输

## 📝 TODO 清单

- [ ] 在 Vercel 配置环境变量
- [ ] 在飞书表格添加新字段
- [ ] 在 `lib/feishu.ts` 添加 `updateTaskStatus` 函数
- [ ] 在 `lib/email.ts` 添加 `sendStoryCompletedEmail` 函数
- [ ] 配置算力机器的网络访问
- [ ] 测试完整流程
- [ ] 部署到生产环境

## 🔗 相关文档

- 故事生成 API 文档：`story/API使用文档.md`
- 快速开始指南：`story/API快速开始.md`
- 测试工具：`story/test_api.py`

---

**集成完成后，用户支付成功就会自动开始生成故事，无需人工干预！** 🎉
