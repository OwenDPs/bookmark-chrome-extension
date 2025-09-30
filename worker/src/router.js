// 路由器模块，统一处理API路由

import { 
  withErrorHandling, 
  createErrorResponse, 
  createJSONResponse 
} from './errorHandler.js';

/**
 * 路由器类
 */
export class Router {
  /**
   * 创建路由器实例
   */
  constructor() {
    this.routes = {};
    this.middlewares = [];
  }

  /**
   * 添加路由
   * @param {string} path - 路由路径
   * @param {string} method - HTTP方法
   * @param {Function} handler - 处理函数
   * @param {Array} middlewares - 中间件数组
   */
  addRoute(path, method, handler, middlewares = []) {
    const key = `${method.toUpperCase()}:${path}`;
    this.routes[key] = {
      handler,
      middlewares
    };
    console.log(`[Router Debug] 注册路由: ${key}`);
  }

  /**
   * 添加GET路由
   * @param {string} path - 路由路径
   * @param {Function} handler - 处理函数
   * @param {Array} middlewares - 中间件数组
   */
  get(path, handler, middlewares = []) {
    this.addRoute(path, 'GET', handler, middlewares);
  }

  /**
   * 添加POST路由
   * @param {string} path - 路由路径
   * @param {Function} handler - 处理函数
   * @param {Array} middlewares - 中间件数组
   */
  post(path, handler, middlewares = []) {
    this.addRoute(path, 'POST', handler, middlewares);
  }

  /**
   * 添加PUT路由
   * @param {string} path - 路由路径
   * @param {Function} handler - 处理函数
   * @param {Array} middlewares - 中间件数组
   */
  put(path, handler, middlewares = []) {
    this.addRoute(path, 'PUT', handler, middlewares);
  }

  /**
   * 添加DELETE路由
   * @param {string} path - 路由路径
   * @param {Function} handler - 处理函数
   * @param {Array} middlewares - 中间件数组
   */
  delete(path, handler, middlewares = []) {
    this.addRoute(path, 'DELETE', handler, middlewares);
  }

  /**
   * 添加中间件
   * @param {Function} middleware - 中间件函数
   */
  use(middleware) {
    this.middlewares.push(middleware);
  }

  /**
   * 处理请求
   * @param {Request} request - 请求对象
   * @param {Object} env - 环境变量
   * @returns {Promise<Response>} 响应对象
   */
  async handle(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method.toUpperCase();
    const key = `${method}:${path}`;

    console.log(`[Router Debug] ====== 开始处理请求 ======`);
    console.log(`[Router Debug] 当前时间戳:`, new Date().toISOString());
    console.log(`[Router Debug] 收到请求: ${method} ${path}`);
    console.log(`[Router Debug] 完整请求URL: ${request.url}`);
    console.log(`[Router Debug] 查找路由键: ${key}`);
    console.log(`[Router Debug] 已注册的路由:`, Object.keys(this.routes));
    console.log(`[Router Debug] 路由总数: ${Object.keys(this.routes).length}`);
    console.log(`[Router Debug] 请求头:`, Object.fromEntries(request.headers.entries()));
    console.log(`[Router Debug] 请求体内容类型:`, request.headers.get('Content-Type'));
    
    // 记录所有认证相关的路由
    const authRoutes = Object.keys(this.routes).filter(route => route.includes('auth'));
    console.log(`[Router Debug] 认证相关路由:`, authRoutes);
    
    // 查找路由
    const route = this.routes[key];
    if (!route) {
      console.log(`[Router Debug] 精确匹配失败，尝试匹配带参数的路由`);
      console.log(`[Router Debug] 查找路径: ${path}, 方法: ${method}`);
      console.log(`[Router Debug] 请求的完整路径: ${url.pathname + url.search}`);
      console.log(`[Router Debug] URL查询参数:`, Object.fromEntries(url.searchParams.entries()));
      
      // 尝试匹配带参数的路由，如 /api/bookmarks/:id
      const matchedRoute = this.matchRoute(path, method);
      if (!matchedRoute) {
        console.log(`[Router Debug] 路由匹配失败，返回404`);
        console.log(`[Router Debug] 可用的路由键:`, Object.keys(this.routes).join(', '));
        console.log(`[Router Debug] 特别注意 - 检查是否有以下认证路由:`);
        console.log(`[Router Debug] - POST:/api/auth/login: ${!!this.routes['POST:/api/auth/login']}`);
        console.log(`[Router Debug] - POST:/api/auth/register: ${!!this.routes['POST:/api/auth/register']}`);
        console.log(`[Router Debug] - POST:/api/user/verify: ${!!this.routes['POST:/api/user/verify']}`);
        console.log(`[Router Debug] - GET:/api/user/info: ${!!this.routes['GET:/api/user/info']}`);
        
        // 检查路径末尾是否有斜杠
        if (path.endsWith('/')) {
          const pathWithoutSlash = path.slice(0, -1);
          console.log(`[Router Debug] 路径末尾有斜杠，尝试无斜杠版本: ${pathWithoutSlash}`);
          const routeWithoutSlash = this.routes[`${method}:${pathWithoutSlash}`];
          if (routeWithoutSlash) {
            console.log(`[Router Debug] 找到无斜杠版本的路由，建议客户端使用: ${pathWithoutSlash}`);
          }
        }
        
        return createErrorResponse('未找到路由', 404);
      }
      
      console.log(`[Router Debug] 找到匹配的路由:`, matchedRoute);
      // 提取路由参数
      const params = this.extractParams(path, matchedRoute.path);
      request.params = params;
      console.log(`[Router Debug] 提取的路由参数:`, params);
      
      // 应用中间件和处理函数
      return this.applyMiddlewaresAndHandler(
        request,
        env,
        matchedRoute.handler,
        matchedRoute.middlewares
      );
    }
    
    console.log(`[Router Debug] 精确匹配成功，找到路由:`, route);
    // 应用中间件和处理函数
    return this.applyMiddlewaresAndHandler(
      request,
      env,
      route.handler,
      route.middlewares
    );
  }

  /**
   * 匹配带参数的路由
   * @param {string} path - 请求路径
   * @param {string} method - HTTP方法
   * @returns {Object|null} 匹配的路由信息
   */
  matchRoute(path, method) {
    for (const [key, route] of Object.entries(this.routes)) {
      const [routeMethod, routePath] = key.split(':');
      
      if (routeMethod !== method) {
        continue;
      }
      
      // 将路由路径转换为正则表达式
      const regexPattern = routePath
        .replace(/:[^/]+/g, '([^/]+)')  // 将 :param 替换为捕获组
        .replace(/\//g, '\\/');         // 转义斜杠
      
      const regex = new RegExp(`^${regexPattern}$`);
      
      if (regex.test(path)) {
        return {
          path: routePath,
          handler: route.handler,
          middlewares: route.middlewares
        };
      }
    }
    
    return null;
  }

  /**
   * 提取路由参数
   * @param {string} path - 请求路径
   * @param {string} routePath - 路由定义路径
   * @returns {Object} 路由参数对象
   */
  extractParams(path, routePath) {
    const params = {};
    const pathParts = path.split('/');
    const routeParts = routePath.split('/');
    
    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) {
        const paramName = routeParts[i].substring(1);
        params[paramName] = pathParts[i];
      }
    }
    
    return params;
  }

  /**
   * 应用中间件和处理函数
   * @param {Request} request - 请求对象
   * @param {Object} env - 环境变量
   * @param {Function} handler - 处理函数
   * @param {Array} routeMiddlewares - 路由中间件数组
   * @returns {Promise<Response>} 响应对象
   */
  async applyMiddlewaresAndHandler(request, env, handler, routeMiddlewares = []) {
    // 组合全局中间件和路由中间件
    const allMiddlewares = [...this.middlewares, ...routeMiddlewares];
    
    // 包装处理函数，添加错误处理
    const wrappedHandler = withErrorHandling(handler);
    
    // 如果没有中间件，直接调用处理函数
    if (allMiddlewares.length === 0) {
      return wrappedHandler(request, env);
    }
    
    // 应用中间件链
    let currentHandler = wrappedHandler;
    
    // 从后往前组合中间件
    for (let i = allMiddlewares.length - 1; i >= 0; i--) {
      const middleware = allMiddlewares[i];
      const nextHandler = currentHandler;
      
      currentHandler = async (req, ctx) => {
        // 中间件可以修改请求或上下文
        return middleware(req, ctx, nextHandler);
      };
    }
    
    return currentHandler(request, env);
  }
}

/**
 * 创建路由器实例
 * @returns {Router} 路由器实例
 */
export function createRouter() {
  return new Router();
}