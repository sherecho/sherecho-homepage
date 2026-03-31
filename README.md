# 🏠 sherecho's Homepage

> Sherecho 的个人主页，部署于 GitHub Pages。

---

## 📖 项目简介

这是 sherecho 的个人主页项目，使用纯 HTML / CSS / JavaScript 构建，无需任何框架或构建工具。页面包含：

- **首页** — 个人介绍、技能展示、项目亮点
- **博客** — 技术文章与思考分享
- **关于** — 更详细的个人背景

项目特点：

- ✅ 纯静态，零依赖
- ✅ 响应式设计，移动端友好
- ✅ 支持暗色 / 亮色主题切换
- ✅ 滚动渐入动画、卡片微交互
- ✅ 博客支持标签筛选与前端搜索
- ✅ 直接部署到 GitHub Pages

---

## 🚀 本地预览

### 方式一：VS Code Live Server（推荐）

1. 安装 VS Code 扩展 [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
2. 用 VS Code 打开项目目录
3. 右键 `index.html` → **Open with Live Server**

### 方式二：Python HTTP Server

```bash
cd ~/Desktop/sherecho-homepage
python3 -m http.server 8080
```

然后打开浏览器访问 `http://localhost:8080`

### 方式三：Node.js

```bash
npx serve .
```

---

## 🌐 部署到 GitHub Pages

### 1. 创建 GitHub 仓库

在 GitHub 上创建一个新仓库，建议命名为 `sherecho.github.io`（使用自定义域名时名称不限）。

### 2. 推送代码

```bash
cd ~/Desktop/sherecho-homepage
git remote add origin https://github.com/sherecho/sherecho.github.io.git
git branch -M main
git push -u origin main
```

### 3. 启用 GitHub Pages

1. 进入仓库 → **Settings** → **Pages**
2. Source 选择 `main` 分支，目录选择 `/ (root)`
3. 点击 Save
4. 等待几分钟，访问 `https://sherecho.github.io` 即可看到页面

### 4. 自定义域名（可选）

1. 在域名服务商处添加 CNAME 记录，指向 `sherecho.github.io`
2. 在仓库根目录的 `CNAME` 文件中写入你的域名（如 `sherecho.com`）
3. 在 GitHub Pages 设置中填入自定义域名
4. 勾选 **Enforce HTTPS**

---

## 📁 目录结构

```
sherecho-homepage/
├── index.html              # 首页
├── about/
│   └── index.html          # 关于页面
├── blog/
│   └── index.html          # 博客列表页
├── posts/                  # 博客文章目录
│   └── example-post.html   # 示例文章
├── assets/
│   ├── css/
│   │   └── style.css       # 主样式表
│   ├── js/
│   │   ├── main.js         # 主交互脚本
│   │   └── blog.js         # 博客功能脚本
│   └── img/                # 图片资源
├── .nojekyll               # 禁用 Jekyll 处理
├── CNAME                   # 自定义域名配置（留空待填）
└── README.md               # 本文件
```

---

## ✏️ 自定义说明

### 修改个人信息

编辑 `index.html` 和 `about/index.html` 中的文本内容即可。

### 修改主题色

编辑 `assets/css/style.css` 中的 CSS 变量（Custom Properties）：

```css
:root {
  --color-primary: #your-color;
  --color-accent: #your-accent;
  /* ... */
}
```

### 添加博客文章

1. 在 `posts/` 目录下创建新的 `.html` 文件
2. 在 `blog/index.html` 中添加对应的卡片链接
3. 为卡片添加 `data-tags` 属性以支持标签筛选

### 添加滚动动画

为任意 HTML 元素添加 `data-reveal` 属性：

```html
<div data-reveal>这个元素会在进入视口时淡入</div>
<div data-reveal data-reveal-delay="200">这个会延迟 200ms 淡入</div>
```

确保 CSS 中定义了对应样式：

```css
[data-reveal] {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
[data-reveal].revealed {
  opacity: 1;
  transform: translateY(0);
}
```

---

## 📄 License

MIT
