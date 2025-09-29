// Cloudflare Worker for Bookmark Manager Chrome Extension

// 导入路由器和控制器
import { createRouter } from './router.js';
import { AuthController, BookmarkController } from './controllers.js';
import { withAuth } from './middleware.js';
import { createErrorResponse } from './errorHandler.js';
import { SecurityMiddleware, createRateLimitTable } from './security.js';
import { PerformanceMiddleware, PerformanceUtils } from './performance.js';

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
    
    // 初始化速率限制表
    await createRateLimitTable(env);
    
    // 处理OPTIONS请求（CORS预检）
    if (method === 'OPTIONS') {
      return handleOptionsRequest(request, env);
    }
    
    try {
      // 使用路由器处理请求
      const response = await router.handle(request, env);
      
      // 添加CORS头
      return addCORSHeaders(response, request, env);
    } catch (error) {
      console.error('请求处理失败:', error);
      
      // 添加CORS头到错误响应
      const corsHeaders = setCORSHeaders(request, env);
      return createErrorResponse('服务器内部错误', 500, corsHeaders);
    }
  }
};