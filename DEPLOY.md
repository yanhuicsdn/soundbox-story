# 声宝盒 - 免费部署指南

## 🚀 最简单的部署方式(3分钟完成)

### 方式1: 使用GitHub Pages(最推荐,完全免费)

#### 步骤1: 推送到GitHub

```bash
cd ~/soundbox-story

# 初始化Git仓库
git init
git add .
git commit -m "Initial commit: 声宝盒网站"

# 创建GitHub仓库后,推送代码
# 替换YOUR_USERNAME为你的GitHub用户名
# 替换soundbox-story为你的仓库名
git remote add origin https://github.com/YOUR_USERNAME/soundbox-story.git
git branch -M main
git push -u origin main
```

#### 步骤2: 启用GitHub Pages

1. 访问你刚创建的GitHub仓库
2. 点击 **Settings** (设置)
3. 在左侧菜单找到 **Pages**
4. 在 **Source** 下拉菜单选择:
   - Branch: `main`
   - Folder: `/root`
5. 点击 **Save**

#### 步骤3: 访问网站

几分钟后,你的网站将发布在:
```
https://YOUR_USERNAME.github.io/soundbox-story/
```

---

### 方式2: 使用Vercel(推荐,免费快速)

#### 步骤1: 安装Vercel CLI

```bash
npm install -g vercel
```

#### 步骤2: 登录并部署

```bash
cd ~/soundbox-story
vercel
```

按照提示操作:
1. 首次使用需要登录(会打开浏览器)
2. 选择你的团队(个人账户即可)
3. 确认项目设置(全部按Enter使用默认设置)

#### 步骤3: 访问网站

部署完成后,你会看到类似这样的URL:
```
https://soundbox-story.vercel.app
```
或
```
https://soundbox-story-xyz.vercel.app
```

---

### 方式3: 使用Netlify Drop(最简单,无需命令行)

#### 步骤1: 打开Netlify Drop

访问: https://app.netlify.com/drop

#### 步骤2: 拖拽部署

1. 打开Finder(访达)
2. 找到 `~/soundbox-story` 文件夹
3. 将整个文件夹拖拽到Netlify Drop页面

#### 步骤3: 获取网址

几秒钟后,你会得到一个随机URL,例如:
```
https://amazing-pudding-123456.netlify.app
```

你可以自定义域名(免费)。

---

### 方式4: 使用Surge(需要注册)

#### 步骤1: 安装Surge

```bash
npm install -g surge
```

#### 步骤2: 注册账号

```bash
surge login
```

按照提示输入邮箱和密码(首次会自动创建账号)。

#### 步骤3: 部署

```bash
cd ~/soundbox-story
surge . soundbox-story.surge.sh
```

#### 步骤4: 访问网站

```
https://soundbox-story.surge.sh
```

---

### 方式5: 使用Gitee Pages(国内访问快)

#### 步骤1: 推送到Gitee

```bash
cd ~/soundbox-story

# 初始化Git仓库(如果还没有)
git init
git add .
git commit -m "Initial commit"

# 添加Gitee远程仓库
git remote add origin https://gitee.com/YOUR_USERNAME/soundbox-story.git
git push -u origin master
```

#### 步骤2: 启用Gitee Pages

1. 访问你刚创建的Gitee仓库
2. 点击 **服务** → **Gitee Pages**
3. 点击 **启动**
4. 选择部署分支为 `master`
5. 点击 **更新**

#### 步骤3: 访问网站

```
https://YOUR_USERNAME.gitee.io/soundbox-story
```

---

## 📊 部署方式对比

| 平台 | 速度 | 稳定性 | 国内访问 | 自定义域名 | 推荐度 |
|------|------|--------|----------|------------|--------|
| **GitHub Pages** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ✅ 免费 | ⭐⭐⭐⭐⭐ |
| **Vercel** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ✅ 免费 | ⭐⭐⭐⭐⭐ |
| **Netlify** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ✅ 免费 | ⭐⭐⭐⭐⭐ |
| **Surge** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ✅ 免费 | ⭐⭐⭐ |
| **Gitee Pages** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ 免费 | ⭐⭐⭐⭐ |

---

## ✅ 我的推荐

**如果你是新手**: 使用 **Netlify Drop**(拖拽即可,无需命令行)

**如果你有GitHub账号**: 使用 **GitHub Pages**

**如果你想要最快速度**: 使用 **Vercel**

**如果你在国内**: 使用 **Gitee Pages**

---

## 🔧 部署后的配置

### 1. 替换示例音频

将以下文件放到项目目录并重新部署:
- `demo-mom.mp3` - 妈妈声音示例
- `demo-dad.mp3` - 爸爸声音示例

### 2. 修改联系方式

编辑 `index.html` 第371-373行:
```html
<a href="mailto:YOUR_EMAIL">邮箱</a>
<a href="YOUR_WECHAT">微信客服</a>
```

### 3. 配置支付接口

编辑 `script.js` 第318-326行,替换为实际的支付链接。

### 4. 自定义域名

大部分平台都支持免费的自定义域名:
1. 购买域名(推荐阿里云、腾讯云)
2. 在部署平台添加域名
3. 配置DNS解析

---

## 📝 部署检查清单

部署完成后,检查以下内容:

- [ ] 网站可以正常访问
- [ ] 所有页面样式正常
- [ ] 录音功能正常(需要HTTPS)
- [ ] 示例音频可以播放(需要先准备音频文件)
- [ ] 表单可以填写
- [ ] 移动端显示正常
- [ ] 所有链接都有效

---

## 🎯 快速开始

**最简单的方式(1分钟):**

1. 访问 https://app.netlify.com/drop
2. 拖拽 `~/soundbox-story` 文件夹
3. 获得网址

**完成!** 🎉

---

## 💡 提示

- 所有这些平台都是**完全免费**的
- 都支持**自定义域名**(免费)
- 都提供**HTTPS**证书(自动配置)
- 都支持**自动部署**(推送到GitHub时自动更新)

---

需要帮助?查看:
- [QUICKSTART.md](QUICKSTART.md) - 快速开始指南
- [README.md](README.md) - 详细文档
- [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - 项目总结
