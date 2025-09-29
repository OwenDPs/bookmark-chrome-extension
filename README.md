# Bookmark Chrome Extension

一个基于Cloudflare Worker和D1数据库的Chrome收藏夹扩展插件，支持邮件注册和云端同步。

## 功能特性

- 🔐 **用户认证**: 通过邮件注册和登录，使用JWT令牌进行安全认证
- 📌 **收藏夹管理**: 添加、查看、编辑和删除收藏夹
- ☁️ **云端同步**: 收藏夹数据存储在Cloudflare D1数据库中，实现多设备同步
- 🔄 **数据导入/导出**: 支持收藏夹数据的导入和导出功能
- 🖱️ **右键菜单**: 通过右键菜单快速添加当前页面到收藏夹
- 📱 **响应式界面**: 简洁美观的用户界面，适配不同屏幕尺寸

## 技术栈

- **前端**: HTML5, CSS3, JavaScript (Chrome Extension API)
- **后端**: Cloudflare Workers (边缘计算)
- **数据库**: Cloudflare D1 (SQLite兼容)
- **认证**: JWT (JSON Web Tokens)
- **密码加密**: bcrypt

## 项目结构

```
bookmark-chrome-extension/
├── extension/          # Chrome扩展源代码
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
├── worker/            # Cloudflare Worker源代码
│   ├── src/           # 源代码
│   │   └── index.js
│   ├── migrations/    # D1数据库迁移文件
│   │   └── 001_init.sql
│   ├── package.json
│   └── wrangler.toml
└── docs/              # 文档
    ├── README.md      # 详细文档
    └── DEPLOYMENT.md  # 部署指南
```

## 快速开始

### 前置条件

- Node.js 和 npm
- Chrome 浏览器
- Cloudflare 账户
- Wrangler CLI

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd bookmark-chrome-extension
   ```

2. **设置 Cloudflare Worker**
   ```bash
   cd worker
   npm install
   wrangler login
   wrangler d1 create BOOKMARK_DB
   ```

3. **配置环境**
   - 编辑 `wrangler.toml` 文件，更新数据库 ID
   - 设置环境变量：
     ```bash
     wrangler secret put JWT_SECRET
     wrangler secret put CORS_ORIGIN
     ```

4. **运行数据库迁移**
   ```bash
   npm run migrate
   ```

5. **部署 Worker**
   ```bash
   npm run deploy
   ```

6. **配置 Chrome 扩展**
   - 打开 Chrome 浏览器，访问 `chrome://extensions/`
   - 启用"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择 `extension` 文件夹
   - 记下扩展 ID

7. **更新 API URL**
   - 编辑 `extension/popup/popup.js` 和 `extension/options/options.js`
   - 将 `API_BASE_URL` 和 `DEFAULT_API_URL` 更新为您的 Worker URL

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

请参考 `docs/` 目录中的文档获取详细的开发和部署指南：

- [详细文档](docs/README.md) - 项目架构和开发指南
- [部署指南](docs/DEPLOYMENT.md) - 部署到生产环境的步骤

## 贡献指南

我们欢迎社区贡献！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。