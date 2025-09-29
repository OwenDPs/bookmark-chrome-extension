# Bookmark Manager Chrome Extension - 部署指南

本指南将帮助您部署 Bookmark Manager Chrome 扩展及其后端服务。

## 目录

1. [Cloudflare Worker 部署](#cloudflare-worker-部署)
2. [D1 数据库设置](#d1-数据库设置)
3. [Chrome 扩展配置](#chrome-扩展配置)
4. [生产环境部署](#生产环境部署)
5. [故障排除](#故障排除)

## Cloudflare Worker 部署

### 前置条件

- 安装 [Node.js](https://nodejs.org/) (版本 16 或更高)
- 安装 [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- 拥有 Cloudflare 账户

### 安装步骤

1. **安装 Wrangler CLI**
   ```bash
   npm install -g wrangler
   ```

2. **登录 Cloudflare 账户**
   ```bash
   wrangler login
   ```

3. **克隆项目并进入目录**
   ```bash
   git clone <repository-url>
   cd bookmark-chrome-extension/worker
   ```

4. **安装依赖**
   ```bash
   npm install
   ```

5. **配置 wrangler.toml**
   - 编辑 `wrangler.toml` 文件
   - 更新 `name` 为您的 Worker 名称
   - 设置环境变量和数据库绑定

6. **创建 D1 数据库** (详见下一节)

7. **部署 Worker**
   ```bash
   npm run deploy
   ```

8. **记录 Worker URL**
   - 部署成功后，记下 Worker 的 URL，用于配置 Chrome 扩展

## D1 数据库设置

### 创建数据库

1. **创建生产数据库**
   ```bash
   wrangler d1 create BOOKMARK_DB
   ```

2. **记录数据库 ID**
   - 命令输出会显示数据库 ID，将其复制到 `wrangler.toml` 文件中

3. **创建开发数据库** (可选)
   ```bash
   wrangler d1 create BOOKMARK_DB_DEV
   ```

### 运行数据库迁移

1. **更新迁移文件**
   - 检查 `migrations/001_init.sql` 文件中的 SQL 语句
   - 根据需要修改表结构

2. **运行生产环境迁移**
   ```bash
   npm run migrate:prod
   ```

3. **运行开发环境迁移** (可选)
   ```bash
   npm run migrate
   ```

### 设置环境变量

1. **设置 JWT 密钥**
   ```bash
   wrangler secret put JWT_SECRET
   # 输入一个强密码作为 JWT 密钥
   ```

2. **设置 CORS 来源**
   ```bash
   wrangler secret put CORS_ORIGIN
   # 输入 Chrome 扩展 ID，格式为：chrome-extension://your-extension-id
   ```

## Chrome 扩展配置

### 获取扩展 ID

1. **加载未打包的扩展**
   - 打开 Chrome 浏览器，访问 `chrome://extensions/`
   - 启用"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择 `extension` 文件夹

2. **记录扩展 ID**
   - 扩展加载后，记下显示的扩展 ID

### 配置 API URL

1. **更新 popup.js**
   - 编辑 `extension/popup/popup.js`
   - 修改 `API_BASE_URL` 常量为您的 Worker URL

2. **更新 options.js**
   - 编辑 `extension/options/options.js`
   - 修改 `DEFAULT_API_URL` 常量为您的 Worker URL

### 测试扩展

1. **测试用户注册**
   - 点击扩展图标打开弹出窗口
   - 使用有效的邮箱地址和密码注册账户

2. **测试收藏夹功能**
   - 登录后，尝试添加、查看和删除收藏夹

3. **测试选项页面**
   - 右键点击扩展图标，选择"选项"
   - 测试导出和导入功能

## 生产环境部署

### 准备生产环境

1. **创建生产数据库**
   ```bash
   wrangler d1 create BOOKMARK_DB_PROD
   ```

2. **更新 wrangler.toml**
   - 在 `[env.production]` 部分添加生产环境配置
   - 设置生产环境的数据库 ID

3. **运行生产环境迁移**
   ```bash
   npm run migrate:prod
   ```

4. **设置生产环境变量**
   ```bash
   wrangler secret put JWT_SECRET --env production
   wrangler secret put CORS_ORIGIN --env production
   ```

### 部署生产 Worker

1. **部署到生产环境**
   ```bash
   npm run deploy --env production
   ```

2. **记录生产 Worker URL**
   - 部署成功后，记下生产环境的 Worker URL

### 打包 Chrome 扩展

1. **准备扩展文件**
   - 确保 `extension` 文件夹包含所有必要文件
   - 更新 `manifest.json` 中的版本号

2. **打包扩展**
   - 在 `chrome://extensions/` 页面
   - 点击"打包扩展程序"
   - 选择 `extension` 文件夹
   - 生成 `.crx` 文件和私钥文件 (`.pem`)

3. **保存打包文件**
   - 保存生成的 `.crx` 和 `.pem` 文件
   - `.pem` 文件用于后续更新扩展

### 发布到 Chrome 网上应用店

1. **注册开发者账户**
   - 访问 [Chrome 网上应用店开发者控制台](https://chrome.google.com/webstore/developer/dashboard)
   - 支付一次性注册费 (目前为 $5)

2. **创建新项目**
   - 点击"添加新项目"
   - 上传之前打包的 `.crx` 文件

3. **填写应用信息**
   - 应用名称: "Bookmark Manager"
   - 应用描述: "一个基于Cloudflare Worker和D1数据库的Chrome收藏夹扩展插件，支持邮件注册和云端同步。"
   - 分类: 选择合适的分类（如"生产力工具"）
   - 语言: 选择支持的语言

4. **上传截图和图标**
   - 准备扩展的截图（至少1张，最多5张）
   - 上传128x128像素的图标
   - 上传其他要求的图片资源

5. **设置隐私政策和权限**
   - 提供隐私政策URL
   - 说明扩展所需的权限及其用途

6. **提交审核**
   - 检查所有信息是否完整
   - 同意开发者协议
   - 提交审核

7. **等待审核结果**
   - 审核通常需要几天时间
   - 如果被拒绝，根据反馈修改并重新提交

## 故障排除

### 常见问题

1. **Worker 部署失败**
   - 检查 wrangler.toml 配置是否正确
   - 确保已正确登录 Cloudflare 账户
   - 查看错误日志并修复问题

2. **数据库连接失败**
   - 确认数据库 ID 是否正确
   - 检查数据库迁移是否成功运行
   - 验证环境变量是否正确设置

3. **扩展无法连接到 API**
   - 检查 API URL 是否正确
   - 确认 CORS 设置是否允许扩展来源
   - 查看浏览器控制台中的错误信息

4. **用户认证失败**
   - 检查 JWT 密钥是否正确设置
   - 确认密码哈希函数是否正常工作
   - 验证令牌生成和验证逻辑

### 调试技巧

1. **本地调试 Worker**
   ```bash
   npm run dev
   ```
   - 使用本地开发服务器测试 API
   - 修改代码后自动重启

2. **查看 Worker 日志**
   ```bash
   wrangler tail
   ```
   - 实时查看 Worker 的日志输出
   - 有助于诊断运行时问题

3. **Chrome 扩展调试**
   - 在扩展页面右键选择"检查"
   - 使用开发者工具调试扩展代码
   - 查看网络请求和控制台输出

### 获取帮助

如果遇到问题，可以：
1. 查看项目文档和代码注释
2. 搜索已有的 Issue 或创建新的 Issue
3. 查阅 Cloudflare Workers 和 Chrome 扩展官方文档
4. 联系项目维护者获取支持