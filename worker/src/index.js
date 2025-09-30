// Cloudflare Worker for Bookmark Manager Chrome Extension

// 导入路由器和控制器
import { createRouter } from './router.js';
import { AuthController, BookmarkController } from './controllers.js';
import { withAuth } from './middleware.js';
import { createErrorResponse } from './errorHandler.js';
import { SecurityMiddleware, createRateLimitTable } from './security.js';
import { PerformanceMiddleware, PerformanceUtils } from './performance.js';
import { DatabaseUtils, createRateLimitTable as createRateLimitTableDB } from './database.js';

// 创建路由器实例
const router = createRouter();

// 创建性能监控器
const performanceMonitor = PerformanceUtils.createPerformanceMonitor();

// 创建缓存实例
const cache = PerformanceUtils.createCache();

// 工具函数：获取CORS配置
function getCORSConfig(env) {
  return env.CORS_ORIGIN || '*';
}

// 工具函数：设置CORS头
function setCORSHeaders(request, env) {
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
    'Access-Control-Max-Age': '86400',
  };
  
  // 如果请求有Origin头，则使用它，否则使用配置的CORS_ORIGIN
  const requestOrigin = request.headers.get('Origin');
  if (requestOrigin) {
    headers['Access-Control-Allow-Origin'] = requestOrigin;
  } else {
    headers['Access-Control-Allow-Origin'] = getCORSConfig(env);
  }
  
  return headers;
}

// 工具函数：处理OPTIONS请求（CORS预检）
function handleOptionsRequest(request, env) {
  const headers = setCORSHeaders(request, env);
  return new Response(null, { headers, status: 204 });
}

// 工具函数：添加CORS头到响应
function addCORSHeaders(response, request, env) {
  const corsHeaders = setCORSHeaders(request, env);
  const headers = { ...response.headers, ...corsHeaders };
  
  return new Response(response.body, {
    status: response.status,
    headers
  });
}

// 注册全局中间件
router.use(PerformanceMiddleware.responseTimeMonitor(performanceMonitor));
router.use(SecurityMiddleware.addSecurityHeaders);
router.use(SecurityMiddleware.rateLimit(100, 60000)); // 每分钟100次请求
router.use(PerformanceMiddleware.connectionPool());

// 注册路由
// 认证相关路由
router.post('/api/auth/register', AuthController.register);
router.post('/api/auth/login', AuthController.login);
router.post('/api/user/verify', AuthController.verify);
router.get('/api/user/info', withAuth(AuthController.getUserInfo));

// 收藏夹相关路由
router.get('/api/bookmarks', withAuth(BookmarkController.list));
router.post('/api/bookmarks', withAuth(BookmarkController.add));
router.get('/api/bookmarks/:id', withAuth(BookmarkController.get));
router.put('/api/bookmarks/:id', withAuth(BookmarkController.update));
router.delete('/api/bookmarks/:id', withAuth(BookmarkController.delete));

// 性能监控路由
router.get('/api/metrics', withAuth(async (request, env) => {
  const metrics = performanceMonitor.getMetrics();
  return new Response(JSON.stringify(metrics), {
    headers: { 'Content-Type': 'application/json' }
  });
}));

// 主请求处理函数
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    
    console.log(`[Worker Debug] ====== Worker 开始处理请求 ======`);
    console.log(`[Worker Debug] 当前时间戳:`, new Date().toISOString());
    console.log(`[Worker Debug] 收到请求: ${method} ${url.href}`);
    console.log(`[Worker Debug] 请求路径: ${path}`);
    console.log(`[Worker Debug] 请求头:`, Object.fromEntries(request.headers.entries()));
    console.log(`[Worker Debug] 环境变量:`, {
      hasDb: !!env.BOOKMARK_DB,
      hasJwtSecret: !!env.JWT_SECRET,
      corsOrigin: env.CORS_ORIGIN
    });
    console.log(`[Worker Debug] 请求来源:`, request.headers.get('Origin'));
    console.log(`[Worker Debug] 请求的Content-Type:`, request.headers.get('Content-Type'));
    console.log(`[Worker Debug] 请求的Authorization:`, request.headers.get('Authorization') ? '存在' : '不存在');
    
    // 初始化数据库
    try {
      console.log(`[Worker Debug] 检查并初始化数据库...`);
      await DatabaseUtils.ensureDatabaseInitialized(env);
      console.log(`[Worker Debug] 数据库初始化完成`);
    } catch (error) {
      console.error(`[Worker Debug] 数据库初始化失败:`, error);
      // 数据库初始化失败时，返回错误响应
      const corsHeaders = setCORSHeaders(request, env);
      return createErrorResponse('Database initialization failed', 500, corsHeaders);
    }

    // 初始化速率限制表（备用方案）
    try {
      console.log(`[Worker Debug] 初始化速率限制表...`);
      await createRateLimitTableDB(env);
      console.log(`[Worker Debug] 速率限制表初始化成功`);
    } catch (error) {
      console.error(`[Worker Debug] 速率限制表初始化失败:`, error);
    }
    
    // 处理OPTIONS请求（CORS预检）
    if (method === 'OPTIONS') {
      console.log(`[Worker Debug] 处理OPTIONS请求`);
      return handleOptionsRequest(request, env);
    }
    
    try {
      console.log(`[Worker Debug] 开始路由处理`);
      console.log(`[Worker Debug] 路由器对象:`, router);
      console.log(`[Worker Debug] 路由器路由数量:`, Object.keys(router.routes).length);
      console.log(`[Worker Debug] 所有注册的路由:`, Object.keys(router.routes));
      console.log(`[Worker Debug] 认证相关路由检查:`);
      console.log(`[Worker Debug] - POST:/api/auth/login: ${!!router.routes['POST:/api/auth/login']}`);
      console.log(`[Worker Debug] - POST:/api/auth/register: ${!!router.routes['POST:/api/auth/register']}`);
      console.log(`[Worker Debug] - POST:/api/user/verify: ${!!router.routes['POST:/api/user/verify']}`);
      console.log(`[Worker Debug] - GET:/api/user/info: ${!!router.routes['GET:/api/user/info']}`);
      
      // 使用路由器处理请求
      const response = await router.handle(request, env);
      
      console.log(`[Worker Debug] 路由处理成功，响应状态: ${response.status}`);
      console.log(`[Worker Debug] 响应头:`, Object.fromEntries(response.headers.entries()));
      // 添加CORS头
      return addCORSHeaders(response, request, env);
    } catch (error) {
      console.error(`[Worker Debug] 请求处理失败:`, error);
      console.error(`[Worker Debug] 错误类型:`, error.constructor.name);
      console.error(`[Worker Debug] 错误消息:`, error.message);
      console.error(`[Worker Debug] 错误堆栈:`, error.stack);
      
      // 添加CORS头到错误响应
      const corsHeaders = setCORSHeaders(request, env);
      return createErrorResponse('服务器内部错误', 500, corsHeaders);
    }
  }
};