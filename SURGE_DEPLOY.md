# 使用Surge部署声宝盒网站

## 📦 手动部署步骤

由于命令行交互式输入的限制,请按照以下步骤手动部署:

### 步骤1: 打开终端

```bash
cd ~/soundbox-story
```

### 步骤2: 运行Surge部署命令

```bash
surge . soundbox-story.surge.sh
```

### 步骤3: 输入登录信息

当提示时,输入以下信息:
- **email**: `yanhui@csdn.net`
- **password**: `easyway12345`

### 步骤4: 等待部署完成

几秒钟后,你会看到类似这样的输出:

```
Success! - Published to soundbox-story.surge.sh
```

### 步骤5: 访问网站

部署完成后,你的网站将发布在:
```
https://soundbox-story.surge.sh
```

---

## 🔄 更新网站

以后如果需要更新网站,只需要:

```bash
cd ~/soundbox-story
surge .
```

(Surge会记住你的登录状态,不需要再次输入密码)

---

## 📝 备选方案

如果Surge有问题,可以使用其他免费平台:

### 1. Netlify Drop (最简单)
1. 访问: https://app.netlify.com/drop
2. 拖拽 `~/soundbox-story` 文件夹
3. 获得网址

### 2. Vercel
```bash
cd ~/soundbox-story
npm install -g vercel
vercel
```

### 3. GitHub Pages
```bash
cd ~/soundbox-story
git init
git add .
git commit -m "Initial commit"
# 推送到GitHub后,在Settings中启用Pages
```

---

## ✅ 部署后的检查清单

部署完成后,请检查:

- [ ] 访问 https://soundbox-story.surge.sh
- [ ] 网站可以正常打开
- [ ] 页面样式正常
- [ ] 可以点击所有按钮
- [ ] 移动端显示正常
- [ ] 录音功能正常(需要HTTPS,Surge自动提供)

---

## 🎯 下一步

部署成功后,你需要:

1. **准备示例音频**
   - 创建 `demo-mom.mp3` 和 `demo-dad.mp3`
   - 放到项目目录
   - 重新运行 `surge` 更新网站

2. **配置支付**
   - 编辑 `script.js` 第318-326行
   - 替换为实际的支付链接

3. **测试功能**
   - 测试录音功能
   - 测试表单提交
   - 测试支付流程

---

## 🆘 遇到问题?

如果遇到部署问题:

1. 检查网络连接
2. 确认Surge账号密码正确
3. 查看错误信息
4. 尝试其他部署平台(Netlify/Vercel)

---

**祝部署顺利! 🚀**
