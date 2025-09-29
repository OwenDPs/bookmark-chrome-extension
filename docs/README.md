# Bookmark Manager Chrome Extension - 文档

## 项目概述

Bookmark Manager 是一个基于 Cloudflare Worker 和 D1 数据库的 Chrome 收藏夹扩展插件。它允许用户通过邮件注册账户，并在云端存储和管理他们的收藏夹。

## 技术架构

### 前端 (Chrome 扩展)
- **Manifest V3**: 使用最新的 Chrome 扩展 API
- **Popup 界面**: 用户交互的主要入口点
- **Options 页面**: 用户设置和数据管理
- **Background Script**: 处理后台任务和扩展生命周期

### 后端 (Cloudflare Worker)
- **API 服务**: 提供 RESTful API 接口
- **JWT 认证**: 基于令牌的用户认证
- **D1 数据库**: Cloudflare 的 SQLite 兼容数据库

## 项目结构

```
bookmark-chrome-extension/
├── extension/          # Chrome 扩展源代码
│   ├── popup/         # 弹出窗口界面
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   ├── options/       # 选项页面
│   │   ├── options.html
│   │   ├── options.css
│   │   └── options.js
│   ├── background/    # 后台脚本
│   │   └── background.js
│   ├── assets/        # 静态资源
│   │   └── icon-placeholder.svg
│   └── manifest.json  # 扩展配置文件
├── worker/            # Cloudflare Worker 源代码
│   ├── src/           # 源代码
│   │   └── index.js
│   ├── migrations/    # D1 数据库迁移文件
│   │   └── 001_init.sql
│   ├── package.json
│   └── wrangler.toml
└── docs/              # 文档
    └── README.md
```

## 功能特性

### 用户认证
- 邮件注册和登录
- JWT 令牌认证
- 自动登录状态保持

### 收藏夹管理
- 添加、查看、编辑和删除收藏夹
- 收藏夹数据云端同步
- 数据导入/导出功能

### 扩展功能
- 右键菜单快速添加收藏夹
- 响应式用户界面
- 通知系统

## API 接口

### 认证接口
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/user/verify` - 验证令牌
- `GET /api/user/info` - 获取用户信息

### 收藏夹接口
- `GET /api/bookmarks` - 获取收藏夹列表
- `POST /api/bookmarks` - 添加收藏夹
- `PUT /api/bookmarks/:id` - 更新收藏夹
- `DELETE /api/bookmarks/:id` - 删除收藏夹

## 开发指南

### 前置条件
- Node.js 和 npm
- Chrome 浏览器
- Cloudflare 账户
- Wrangler CLI (Cloudflare Workers 命令行工具)

### 安装 Wrangler CLI
```bash
npm install -g wrangler
```

### 登录 Cloudflare
```bash
wrangler login
```

### 设置 Cloudflare Worker

1. 创建 D1 数据库
```bash
wrangler d1 create BOOKMARK_DB
```

2. 更新 `wrangler.toml` 文件中的数据库 ID

3. 运行数据库迁移
```bash
npm run migrate
```

4. 部署 Worker
```bash
npm run deploy
```

### 配置 Chrome 扩展

1. 打开 Chrome 浏览器，进入 `chrome://extensions/`
2. 启用"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `extension` 文件夹
5. 更新 `popup.js` 和 `options.js` 中的 API URL 为你的 Worker URL

### 本地开发

1. 启动本地 Worker 开发服务器
```bash
npm run dev
```

2. 在 Chrome 扩展中更新 API URL 为本地开发服务器地址

## 部署指南

### 生产环境部署

1. 创建生产环境 D1 数据库
```bash
wrangler d1 create BOOKMARK_DB_PROD
```

2. 更新 `wrangler.toml` 文件中的生产环境配置

3. 运行生产环境数据库迁移
```bash
npm run migrate:prod
```

4. 设置环境变量
```bash
wrangler secret put JWT_SECRET
wrangler secret put CORS_ORIGIN
```

5. 部署到生产环境
```bash
npm run deploy
```

### Chrome 扩展发布

1. 打包扩展
   - 在 `chrome://extensions/` 页面点击"打包扩展程序"
   - 选择 `extension` 文件夹
   - 生成 `.crx` 文件和私钥

2. 上传到 Chrome 网上应用店
   - 访问 [Chrome 开发者控制台](https://chrome.google.com/webstore/developer/dashboard)
   - 上传 `.crx` 文件
   - 填写应用信息和截图
   - 提交审核

## 常见问题

### Q: 如何重置数据库？
A: 可以通过运行迁移脚本来重置数据库结构，但会丢失所有数据。

### Q: 如何修改 JWT 密钥？
A: 使用 `wrangler secret put JWT_SECRET` 命令更新环境变量。

### Q: 如何扩展 API 功能？
A: 在 `worker/src/index.js` 中添加新的路由和处理函数。

### Q: 如何修改扩展 UI？
A: 编辑 `extension/popup/` 和 `extension/options/` 目录中的 HTML、CSS 和 JavaScript 文件。

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](../LICENSE) 文件。