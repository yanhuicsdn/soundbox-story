# 邮件发送测试说明

## 环境变量配置

已在 Vercel 项目中配置以下环境变量：

```
RESEND_API_KEY=re_QMVudMDx_99vsrRDuXBQyhZ1fxYk4iMGw
```

## 测试命令

配置完成后，运行以下命令测试邮件发送：

```bash
# 测试发送邮件到 yanhui@csdn.net
curl -H "Authorization: Bearer 12345678" \
  "https://story.66668888.cloud/api/test-email?email=yanhui@csdn.net"
```

## 预期结果

如果配置正确，应该返回：

```json
{
  "success": true,
  "message": "测试邮件发送成功",
  "data": {
    "id": "...",
    "recipient": "yanhui@csdn.net",
    "timestamp": "..."
  }
}
```

同时，`yanhui@csdn.net` 邮箱会收到一封测试邮件。

## 如果失败

如果返回错误，检查：

1. Vercel 环境变量是否正确配置
2. 是否重新部署了项目（环境变量修改后需要重新部署）
3. Resend API Key 是否有效

## 订单支付成功后的邮件

配置完成后，每次订单支付成功，系统会自动发送确认邮件给用户，包含：

- 订单号
- 交易号
- 支付金额
- 宝宝名字
- 声音类型
- 制作时间说明
- 交付方式说明

邮件不包含录音附件，只是纯文本通知。
