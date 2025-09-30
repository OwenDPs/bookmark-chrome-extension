// 安全模块，提供安全相关的功能

/**
 * 安全工具类
 */
export class SecurityUtils {
  /**
   * 验证和清理URL，防止XSS攻击
   * @param {string} url - 需要验证的URL
   * @returns {string|null} 清理后的URL或null
   */
  static sanitizeUrl(url) {
    try {
      // 验证URL格式
      const urlObj = new URL(url);
      
      // 检查协议是否安全
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return null;
      }
      
      // 清理URL
      urlObj.username = '';
      urlObj.password = '';
      
      return urlObj.toString();
    } catch (error) {
      return null;
    }
  }

  /**
   * 验证和清理文本，防止XSS攻击
   * @param {string} text - 需要验证的文本
   * @returns {string} 清理后的文本
   */
  static sanitizeText(text) {
    if (typeof text !== 'string') {
      return '';
    }
    
    // HTML转义
    const map = {
      '&': '&',
      '<': '<',
      '>': '>',
      '"': '"',
      "'": '&#039;'
    };
    
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * 验证密码强度
   * @param {string} password - 密码
   * @returns {Object} 验证结果
   */
  static validatePasswordStrength(password) {
    const result = {
      valid: true,
      score: 0,
      errors: []
    };
    
    if (password.length < 8) {
      result.valid = false;
      result.errors.push('密码长度不能少于8位');
    } else {
      result.score += 1;
    }
    
    if (!/[a-z]/.test(password)) {
      result.valid = false;
      result.errors.push('密码必须包含小写字母');
    } else {
      result.score += 1;
    }
    
    if (!/[A-Z]/.test(password)) {
      result.valid = false;
      result.errors.push('密码必须包含大写字母');
    } else {
      result.score += 1;
    }
    
    if (!/[0-9]/.test(password)) {
      result.valid = false;
      result.errors.push('密码必须包含数字');
    } else {
      result.score += 1;
    }
    
    if (!/[^a-zA-Z0-9]/.test(password)) {
      result.errors.push('建议密码包含特殊字符');
    } else {
      result.score += 1;
    }
    
    return result;
  }

  /**
   * 检查是否为常见密码
   * @param {string} password - 密码
   * @returns {boolean} 是否为常见密码
   */
  static isCommonPassword(password) {
    const commonPasswords = [
      'password', '123456', '12345678', '123456789', '12345',
      'qwerty', 'abc123', 'password1', 'admin', 'welcome'
    ];
    
    return commonPasswords.includes(password.toLowerCase());
  }

  /**
   * 生成随机令牌
   * @param {number} length - 令牌长度
   * @returns {string} 随机令牌
   */
  static generateRandomToken(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  /**
   * 验证邮箱域名是否为临时邮箱
   * @param {string} email - 邮箱地址
   * @returns {boolean} 是否为临时邮箱
   */
  static isTemporaryEmail(email) {
    try {
      const domain = email.split('@')[1].toLowerCase();
      
      const temporaryDomains = [
        '10minutemail.com', 'guerrillamail.com', 'mailinator.com',
        'tempmail.org', 'throwawaymail.com', 'yopmail.com'
      ];
      
      return temporaryDomains.includes(domain);
    } catch (error) {
      return false;
    }
  }

  /**
   * 限制请求频率
   * @param {Object} env - 环境变量
   * @param {string} key - 限制键
   * @param {number} limit - 限制次数
   * @param {number} windowMs - 时间窗口（毫秒）
   * @returns {Promise<boolean>} 是否允许请求
   */
  static async rateLimit(env, key, limit = 100, windowMs = 60000) {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // 清理过期的记录
    await env.BOOKMARK_DB.prepare(
      'DELETE FROM rate_limits WHERE timestamp < ?'
    ).bind(windowStart).run();
    
    // 获取当前时间窗口内的请求数
    const result = await env.BOOKMARK_DB.prepare(
      'SELECT COUNT(*) as count FROM rate_limits WHERE key = ?'
    ).bind(key).first();
    
    const count = result ? result.count : 0;
    
    if (count >= limit) {
      return false;
    }
    
    // 记录当前请求
    await env.BOOKMARK_DB.prepare(
      'INSERT INTO rate_limits (key, timestamp) VALUES (?, ?)'
    ).bind(key, now).run();
    
    return true;
  }
}

/**
 * 安全中间件
 */
export const SecurityMiddleware = {
  /**
   * 添加安全响应头
   * @param {Function} handler - 处理函数
   * @returns {Function} 包装后的处理函数
   */
  addSecurityHeaders(handler) {
    return async (request, env) => {
      const response = await handler(request, env);
      
      // 添加安全响应头
      const headers = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Content-Security-Policy': "default-src 'self'",
        ...response.headers
      };
      
      return new Response(response.body, {
        status: response.status,
        headers
      });
    };
  },

  /**
   * 请求频率限制中间件
   * @param {number} limit - 限制次数
   * @param {number} windowMs - 时间窗口（毫秒）
   * @returns {Function} 中间件函数
   */
  rateLimit(limit = 100, windowMs = 60000) {
    return async (request, env, next) => {
      // 获取客户端IP
      const ip = request.headers.get('CF-Connecting-IP') || 
                 request.headers.get('X-Forwarded-For') || 
                 'unknown';
      
      // 生成限制键
      const key = `rate_limit:${ip}`;
      
      // 检查是否超过限制
      const allowed = await SecurityUtils.rateLimit(env, key, limit, windowMs);
      
      if (!allowed) {
        return new Response('请求过于频繁，请稍后再试', {
          status: 429,
          headers: {
            'Content-Type': 'text/plain',
            'Retry-After': Math.ceil(windowMs / 1000).toString()
          }
        });
      }
      
      return next(request, env);
    };
  },

  /**
   * CSRF保护中间件
   * @param {Function} handler - 处理函数
   * @returns {Function} 包装后的处理函数
   */
  csrfProtection(handler) {
    return async (request, env) => {
      // 对于GET、HEAD、OPTIONS请求，不需要CSRF保护
      const method = request.method.toUpperCase();
      if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        return handler(request, env);
      }
      
      // 检查CSRF令牌
      const csrfToken = request.headers.get('X-CSRF-Token');
      const cookieToken = this.getCookieValue(request, 'csrf_token');
      
      if (!csrfToken || csrfToken !== cookieToken) {
        return new Response('无效的CSRF令牌', { status: 403 });
      }
      
      return handler(request, env);
    };
  },

  /**
   * 从请求中获取Cookie值
   * @param {Request} request - 请求对象
   * @param {string} name - Cookie名称
   * @returns {string|null} Cookie值
   */
  getCookieValue(request, name) {
    const cookieHeader = request.headers.get('Cookie');
    if (!cookieHeader) {
      return null;
    }
    
    const cookies = cookieHeader.split(';');
    for (const cookie of cookies) {
      const [cookieName, cookieValue] = cookie.trim().split('=');
      if (cookieName === name) {
        return decodeURIComponent(cookieValue);
      }
    }
    
    return null;
  }
};

/**
 * 创建速率限制表
 * @param {Object} env - 环境变量
 * @returns {Promise<void>}
 */
export async function createRateLimitTable(env) {
  try {
    console.log('[SecurityUtils] 开始创建速率限制表...');

    // 先检查表是否已存在
    const existingTable = await env.BOOKMARK_DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='rate_limits'"
    ).first();

    if (!existingTable) {
      console.log('[SecurityUtils] 表不存在，正在创建...');

      // 使用prepare和run而不是exec，避免模板字符串问题
      await env.BOOKMARK_DB.prepare(`
        CREATE TABLE rate_limits (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT NOT NULL,
          timestamp INTEGER NOT NULL
        )
      `).run();

      await env.BOOKMARK_DB.prepare(`
        CREATE INDEX IF NOT EXISTS idx_rate_limits_key_timestamp ON rate_limits(key, timestamp)
      `).run();

      console.log('[SecurityUtils] 速率限制表创建成功');
    } else {
      console.log('[SecurityUtils] 速率限制表已存在，跳过创建');
    }
  } catch (error) {
    console.error('[SecurityUtils] 创建速率限制表失败:', error);
    throw error;
  }
}