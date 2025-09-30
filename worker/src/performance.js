// 性能优化模块，提供性能相关的功能

/**
 * 性能工具类
 */
export class PerformanceUtils {
  /**
   * 缓存管理器
   */
  static Cache = class {
    constructor() {
      this.cache = new Map();
      this.ttl = new Map();
    }

    /**
     * 设置缓存
     * @param {string} key - 缓存键
     * @param {any} value - 缓存值
     * @param {number} ttl - 过期时间（毫秒）
     */
    set(key, value, ttl = 60000) {
      this.cache.set(key, value);
      this.ttl.set(key, Date.now() + ttl);
    }

    /**
     * 获取缓存
     * @param {string} key - 缓存键
     * @returns {any|null} 缓存值或null
     */
    get(key) {
      const expiry = this.ttl.get(key);
      if (!expiry || Date.now() > expiry) {
        this.cache.delete(key);
        this.ttl.delete(key);
        return null;
      }
      return this.cache.get(key);
    }

    /**
     * 删除缓存
     * @param {string} key - 缓存键
     */
    delete(key) {
      this.cache.delete(key);
      this.ttl.delete(key);
    }

    /**
     * 清空缓存
     */
    clear() {
      this.cache.clear();
      this.ttl.clear();
    }
  };

  /**
   * 创建缓存实例
   * @returns {PerformanceUtils.Cache} 缓存实例
   */
  static createCache() {
    return new this.Cache();
  }

  /**
   * 数据库查询优化器
   */
  static QueryOptimizer = class {
    /**
     * 优化查询，添加索引提示
     * @param {string} query - SQL查询
     * @returns {string} 优化后的查询
     */
    static optimize(query) {
      // 简单的查询优化，可以进一步扩展
      return query;
    }

    /**
     * 创建分页查询
     * @param {string} baseQuery - 基础查询
     * @param {number} page - 页码
     * @param {number} pageSize - 每页大小
     * @returns {Object} 分页查询和计数查询
     */
    static paginate(baseQuery, page = 1, pageSize = 20) {
      const offset = (page - 1) * pageSize;
      const limit = pageSize;

      const paginatedQuery = `${baseQuery} LIMIT ${limit} OFFSET ${offset}`;
      const countQuery = `SELECT COUNT(*) as total FROM (${baseQuery})`;

      return {
        paginatedQuery,
        countQuery,
        offset,
        limit
      };
    }
  };

  /**
   * 响应压缩器
   */
  static ResponseCompressor = class {
    /**
     * 压缩响应数据
     * @param {Object} data - 响应数据
     * @returns {string} 压缩后的JSON字符串
     */
    static compress(data) {
      // 简单的JSON压缩，可以进一步扩展
      return JSON.stringify(data);
    }

    /**
     * 检查是否应该压缩响应
     * @param {Request} request - 请求对象
     * @returns {boolean} 是否应该压缩
     */
    static shouldCompress(request) {
      const acceptEncoding = request.headers.get('Accept-Encoding') || '';
      return acceptEncoding.includes('gzip');
    }
  };

  /**
   * 性能监控器
   */
  static PerformanceMonitor = class {
    constructor() {
      this.metrics = {
        requests: 0,
        responseTimes: [],
        errors: 0,
        cacheHits: 0,
        cacheMisses: 0
      };
    }

    /**
     * 记录请求
     */
    recordRequest() {
      this.metrics.requests++;
    }

    /**
     * 记录响应时间
     * @param {number} responseTime - 响应时间（毫秒）
     */
    recordResponseTime(responseTime) {
      this.metrics.responseTimes.push(responseTime);
      
      // 只保留最近100次的响应时间
      if (this.metrics.responseTimes.length > 100) {
        this.metrics.responseTimes.shift();
      }
    }

    /**
     * 记录错误
     */
    recordError() {
      this.metrics.errors++;
    }

    /**
     * 记录缓存命中
     */
    recordCacheHit() {
      this.metrics.cacheHits++;
    }

    /**
     * 记录缓存未命中
     */
    recordCacheMiss() {
      this.metrics.cacheMisses++;
    }

    /**
     * 获取性能指标
     * @returns {Object} 性能指标
     */
    getMetrics() {
      const avgResponseTime = this.metrics.responseTimes.length > 0
        ? this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length
        : 0;

      const cacheHitRate = this.metrics.cacheHits + this.metrics.cacheMisses > 0
        ? this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)
        : 0;

      const errorRate = this.metrics.requests > 0
        ? this.metrics.errors / this.metrics.requests
        : 0;

      return {
        ...this.metrics,
        avgResponseTime,
        cacheHitRate,
        errorRate
      };
    }

    /**
     * 重置指标
     */
    reset() {
      this.metrics = {
        requests: 0,
        responseTimes: [],
        errors: 0,
        cacheHits: 0,
        cacheMisses: 0
      };
    }
  };

  /**
   * 创建性能监控器实例
   * @returns {PerformanceUtils.PerformanceMonitor} 性能监控器实例
   */
  static createPerformanceMonitor() {
    return new this.PerformanceMonitor();
  }
}

/**
 * 性能中间件
 */
export const PerformanceMiddleware = {
  /**
    * 响应时间监控中间件
    * @param {PerformanceUtils.PerformanceMonitor} monitor - 性能监控器
    * @returns {Function} 中间件函数
    */
   responseTimeMonitor(monitor) {
     return async (request, env, next) => {
       monitor.recordRequest();

       const startTime = Date.now();

       try {
         const response = await next(request, env);

         // 确保响应对象有效
         if (!response) {
           console.warn('[Performance Debug] 响应对象为空，返回默认响应');
           const defaultResponse = new Response('服务器内部错误', { status: 500 });
           const responseTime = Date.now() - startTime;
           monitor.recordResponseTime(responseTime);
           monitor.recordError();
           return defaultResponse;
         }

         // 检查响应对象是否有headers属性，如果没有则创建一个
         if (!response.headers || typeof response.headers.set !== 'function') {
           console.warn('[Performance Debug] 响应对象缺少headers属性，创建新的响应对象');
           const responseBody = response.body || '服务器内部错误';
           const responseStatus = response.status || 200;
           const newResponse = new Response(responseBody, {
             status: responseStatus,
             headers: {
               'Content-Type': 'application/json',
               'X-Response-Time': (Date.now() - startTime).toString()
             }
           });

           const responseTime = Date.now() - startTime;
           monitor.recordResponseTime(responseTime);
           return newResponse;
         }

         const responseTime = Date.now() - startTime;
         monitor.recordResponseTime(responseTime);

         // 添加响应时间头
         response.headers.set('X-Response-Time', responseTime.toString());

         return response;
       } catch (error) {
         const responseTime = Date.now() - startTime;
         monitor.recordResponseTime(responseTime);
         monitor.recordError();

         throw error;
       }
     };
   },

  /**
   * 缓存中间件
   * @param {PerformanceUtils.Cache} cache - 缓存实例
   * @param {PerformanceUtils.PerformanceMonitor} monitor - 性能监控器
   * @param {number} ttl - 缓存过期时间（毫秒）
   * @returns {Function} 中间件函数
   */
  cache(cache, monitor, ttl = 60000) {
    return async (request, env, next) => {
      // 只缓存GET请求
      if (request.method.toUpperCase() !== 'GET') {
        return next(request, env);
      }
      
      // 生成缓存键
      const cacheKey = `cache:${request.url}`;
      
      // 尝试从缓存获取
      const cachedResponse = cache.get(cacheKey);
      if (cachedResponse) {
        monitor.recordCacheHit();
        
        // 添加缓存命中头
        const response = new Response(cachedResponse.body, cachedResponse);
        response.headers.set('X-Cache', 'HIT');
        
        return response;
      }
      
      monitor.recordCacheMiss();
      
      // 执行请求
      const response = await next(request, env);
      
      // 克隆响应以便缓存
      const clonedResponse = response.clone();
      const responseData = {
        body: await clonedResponse.text(),
        status: clonedResponse.status,
        headers: Object.fromEntries(clonedResponse.headers.entries())
      };
      
      // 缓存响应
      cache.set(cacheKey, responseData, ttl);
      
      // 添加缓存未命中头
      response.headers.set('X-Cache', 'MISS');
      
      return response;
    };
  },

  /**
   * 数据库连接池中间件
   * @returns {Function} 中间件函数
   */
  connectionPool() {
    // 简单的连接池实现，可以进一步扩展
    return async (request, env, next) => {
      // 检查数据库连接
      try {
        await env.BOOKMARK_DB.prepare('SELECT 1').first();
      } catch (error) {
        console.error('Database connection failed:', error);
        return new Response('Database connection failed', { status: 503 });
      }
      
      return next(request, env);
    };
  }
};

/**
 * 创建性能优化的数据库查询
 * @param {Object} env - 环境变量
 * @param {string} query - SQL查询
 * @param {Array} params - 查询参数
 * @param {PerformanceUtils.Cache} cache - 缓存实例
 * @param {string} cacheKey - 缓存键
 * @returns {Promise<Object>} 查询结果
 */
export async function optimizedQuery(env, query, params = [], cache = null, cacheKey = null) {
  // 尝试从缓存获取
  if (cache && cacheKey) {
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }
  }

  // 优化查询
  const optimizedQuery = PerformanceUtils.QueryOptimizer.optimize(query);
  
  // 执行查询
  const result = await env.BOOKMARK_DB.prepare(optimizedQuery).bind(...params).all();
  
  // 缓存结果
  if (cache && cacheKey) {
    cache.set(cacheKey, result);
  }
  
  return result;
}

/**
 * 创建分页查询
 * @param {Object} env - 环境变量
 * @param {string} baseQuery - 基础查询
 * @param {number} page - 页码
 * @param {number} pageSize - 每页大小
 * @param {Array} params - 查询参数
 * @returns {Promise<Object>} 分页结果
 */
export async function paginatedQuery(env, baseQuery, page = 1, pageSize = 20, params = []) {
  const { paginatedQuery, countQuery } = PerformanceUtils.QueryOptimizer.paginate(
    baseQuery, page, pageSize
  );
  
  // 执行分页查询
  const data = await env.BOOKMARK_DB.prepare(paginatedQuery).bind(...params).all();
  
  // 执行计数查询
  const countResult = await env.BOOKMARK_DB.prepare(countQuery).bind(...params).first();
  const total = countResult.total;
  
  return {
    data: data.results,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      hasNext: page * pageSize < total,
      hasPrev: page > 1
    }
  };
}