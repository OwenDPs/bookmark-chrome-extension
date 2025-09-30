// 控制器模块，处理业务逻辑

import {
  withErrorHandling,
  createJSONResponse,
  ValidationError,
  NotFoundError
} from './errorHandler.js';
import { generateToken, hashPassword, verifyPassword } from './auth.js';
import { TokenService } from './tokenService.js';
import { SecurityUtils } from './security.js';
import { PerformanceUtils, optimizedQuery, paginatedQuery } from './performance.js';

// 创建缓存实例
const cache = PerformanceUtils.createCache();

/**
 * 认证控制器
 */
export const AuthController = {
  /**
   * 用户注册
   * @param {Request} request - 请求对象
   * @param {Object} env - 环境变量
   * @returns {Promise<Response>} 响应对象
   */
  register: withErrorHandling(async (request, env) => {
    console.log(`[AuthController Debug] ====== 开始处理注册请求 ======`);
    console.log(`[AuthController Debug] 请求方法: ${request.method}`);
    console.log(`[AuthController Debug] 请求URL: ${request.url}`);
    console.log(`[AuthController Debug] 请求头:`, Object.fromEntries(request.headers.entries()));
    
    const { email, password } = await parseRequestBody(request);
    console.log(`[AuthController Debug] 解析的请求体:`, { email, password: '***' });
    console.log(`[AuthController Debug] 环境变量:`, {
      hasDb: !!env.BOOKMARK_DB,
      hasJwtSecret: !!env.JWT_SECRET
    });
    
    // 验证请求体
    const validation = validateRequestBody({ email, password }, ['email', 'password']);
    if (!validation.valid) {
      console.log(`[AuthController Debug] 请求体验证失败:`, validation.errors);
      throw new ValidationError(validation.errors.join(', '));
    }
    
    // 验证邮箱格式
    if (!isValidEmail(email)) {
      console.log(`[AuthController Debug] 邮箱格式验证失败: ${email}`);
      throw new ValidationError('Invalid email format');
    }

    // 检查是否为临时邮箱
    if (SecurityUtils.isTemporaryEmail(email)) {
      console.log(`[AuthController Debug] 临时邮箱验证失败: ${email}`);
      throw new ValidationError('Temporary email addresses are not supported');
    }
    
    // 验证密码强度
    const passwordStrength = SecurityUtils.validatePasswordStrength(password);
    if (!passwordStrength.valid) {
      console.log(`[AuthController Debug] 密码强度验证失败:`, passwordStrength.errors);
      throw new ValidationError(passwordStrength.errors.join(', '));
    }
    
    // 检查是否为常见密码
    if (SecurityUtils.isCommonPassword(password)) {
      console.log(`[AuthController Debug] 常见密码验证失败`);
      throw new ValidationError('Password is too common, please use a more complex password');
    }
    
    console.log(`[AuthController Debug] 基本验证通过，检查数据库连接...`);
    
    // 检查用户是否已存在
    const existingUser = await env.BOOKMARK_DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first();
    
    if (existingUser) {
      console.log(`[AuthController Debug] 用户已存在: ${email}`);
      throw new ValidationError('Email address is already registered');
    }
    
    console.log(`[AuthController Debug] 用户不存在，开始创建用户...`);
    
    // 哈希密码
    const passwordHash = await hashPassword(password);
    console.log(`[AuthController Debug] 密码哈希完成`);
    
    // 创建用户
    const result = await env.BOOKMARK_DB.prepare(
      'INSERT INTO users (email, password_hash) VALUES (?, ?) RETURNING id, email, created_at'
    ).bind(email, passwordHash).first();
    
    console.log(`[AuthController Debug] 用户创建成功:`, { id: result.id, email: result.email });
    
    // 生成JWT令牌
    const token = await TokenService.generateToken(result.id, result.email, env.JWT_SECRET);
    console.log(`[AuthController Debug] JWT令牌生成成功`);
    
    console.log(`[AuthController Debug] 注册流程完成，返回成功响应`);
    return createJSONResponse({
      message: 'Registration successful',
      token,
      user: {
        id: result.id,
        email: result.email,
        created_at: result.created_at
      }
    }, 201);
  }),

  /**
   * 用户登录
   * @param {Request} request - 请求对象
   * @param {Object} env - 环境变量
   * @returns {Promise<Response>} 响应对象
   */
  login: withErrorHandling(async (request, env) => {
    const { email, password } = await parseRequestBody(request);
    
    // 验证请求体
    const validation = validateRequestBody({ email, password }, ['email', 'password']);
    if (!validation.valid) {
      throw new ValidationError(validation.errors.join(', '));
    }
    
    // 查找用户
    const user = await env.BOOKMARK_DB.prepare(
      'SELECT id, email, password_hash FROM users WHERE email = ?'
    ).bind(email).first();
    
    if (!user) {
      throw new ValidationError('Invalid email or password');
    }

    // 验证密码
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      throw new ValidationError('Invalid email or password');
    }
    
    // 生成JWT令牌
    const token = await TokenService.generateToken(user.id, user.email, env.JWT_SECRET);
    
    return createJSONResponse({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email
      }
    });
  }),

  /**
   * 验证用户
   * @param {Request} request - 请求对象
   * @param {Object} env - 环境变量
   * @returns {Promise<Response>} 响应对象
   */
  verify: withErrorHandling(async (request, env) => {
    const { id, email, created_at } = request.user;
    
    return createJSONResponse({
      id,
      email,
      created_at
    });
  }),

  /**
   * 获取用户信息
   * @param {Request} request - 请求对象
   * @param {Object} env - 环境变量
   * @returns {Promise<Response>} 响应对象
   */
  getUserInfo: withErrorHandling(async (request, env) => {
    const { id, email, created_at } = request.user;
    
    return createJSONResponse({
      id,
      email,
      created_at
    });
  })
};

/**
 * 书签控制器
 */
export const BookmarkController = {
  /**
   * 获取书签列表
   * @param {Request} request - 请求对象
   * @param {Object} env - 环境变量
   * @returns {Promise<Response>} 响应对象
   */
  list: withErrorHandling(async (request, env) => {
    const { id: userId } = request.user;
    
    // 从URL中获取分页参数
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
    
    // 限制每页大小
    const limitedPageSize = Math.min(Math.max(pageSize, 1), 100);
    
    // 使用分页查询
    const result = await paginatedQuery(
      env,
      'SELECT id, title, url, created_at, updated_at FROM bookmarks WHERE user_id = ?',
      page,
      limitedPageSize,
      [userId]
    );
    
    return createJSONResponse(result);
  }),

  /**
   * 添加书签
   * @param {Request} request - 请求对象
   * @param {Object} env - 环境变量
   * @returns {Promise<Response>} 响应对象
   */
  add: withErrorHandling(async (request, env) => {
    const { id: userId } = request.user;
    const { title, url } = await parseRequestBody(request);
    
    // 验证请求体
    const validation = validateRequestBody({ title, url }, ['title', 'url']);
    if (!validation.valid) {
      throw new ValidationError(validation.errors.join(', '));
    }
    
    // 验证和清理URL
    const sanitizedUrl = SecurityUtils.sanitizeUrl(url);
    if (!sanitizedUrl) {
      throw new ValidationError('URL格式不正确');
    }
    
    // 清理标题，防止XSS攻击
    const sanitizedTitle = SecurityUtils.sanitizeText(title);
    
    // 添加收藏夹
    const result = await env.BOOKMARK_DB.prepare(
      'INSERT INTO bookmarks (user_id, title, url) VALUES (?, ?, ?) RETURNING id, title, url, created_at'
    ).bind(userId, sanitizedTitle, sanitizedUrl).first();
    
    return createJSONResponse({
      id: result.id,
      title: result.title,
      url: result.url,
      created_at: result.created_at
    }, 201);
  }),

  /**
   * 获取单个书签
   * @param {Request} request - 请求对象
   * @param {Object} env - 环境变量
   * @returns {Promise<Response>} 响应对象
   */
  get: withErrorHandling(async (request, env) => {
    const { id: userId } = request.user;
    const bookmarkId = request.params.id;
    
    // 检查收藏夹是否存在且属于当前用户
    const bookmark = await env.BOOKMARK_DB.prepare(
      'SELECT id, title, url, created_at, updated_at FROM bookmarks WHERE id = ? AND user_id = ?'
    ).bind(bookmarkId, userId).first();
    
    if (!bookmark) {
      throw new NotFoundError('收藏夹不存在或无权限');
    }
    
    return createJSONResponse(bookmark);
  }),

  /**
   * 更新书签
   * @param {Request} request - 请求对象
   * @param {Object} env - 环境变量
   * @returns {Promise<Response>} 响应对象
   */
  update: withErrorHandling(async (request, env) => {
    const { id: userId } = request.user;
    const { title, url } = await parseRequestBody(request);
    const bookmarkId = request.params.id;
    
    // 验证请求体
    const validation = validateRequestBody({ title, url }, ['title', 'url']);
    if (!validation.valid) {
      throw new ValidationError(validation.errors.join(', '));
    }
    
    // 验证和清理URL
    const sanitizedUrl = SecurityUtils.sanitizeUrl(url);
    if (!sanitizedUrl) {
      throw new ValidationError('URL格式不正确');
    }
    
    // 清理标题，防止XSS攻击
    const sanitizedTitle = SecurityUtils.sanitizeText(title);
    
    // 检查收藏夹是否存在且属于当前用户
    const bookmark = await env.BOOKMARK_DB.prepare(
      'SELECT id FROM bookmarks WHERE id = ? AND user_id = ?'
    ).bind(bookmarkId, userId).first();
    
    if (!bookmark) {
      throw new NotFoundError('收藏夹不存在或无权限');
    }
    
    // 更新收藏夹
    const result = await env.BOOKMARK_DB.prepare(
      'UPDATE bookmarks SET title = ?, url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? RETURNING id, title, url, updated_at'
    ).bind(sanitizedTitle, sanitizedUrl, bookmarkId, userId).first();
    
    return createJSONResponse({
      id: result.id,
      title: result.title,
      url: result.url,
      updated_at: result.updated_at
    });
  }),

  /**
   * 删除书签
   * @param {Request} request - 请求对象
   * @param {Object} env - 环境变量
   * @returns {Promise<Response>} 响应对象
   */
  delete: withErrorHandling(async (request, env) => {
    const { id: userId } = request.user;
    const bookmarkId = request.params.id;
    
    // 检查收藏夹是否存在且属于当前用户
    const bookmark = await env.BOOKMARK_DB.prepare(
      'SELECT id FROM bookmarks WHERE id = ? AND user_id = ?'
    ).bind(bookmarkId, userId).first();
    
    if (!bookmark) {
      throw new NotFoundError('收藏夹不存在或无权限');
    }
    
    // 删除收藏夹
    await env.BOOKMARK_DB.prepare(
      'DELETE FROM bookmarks WHERE id = ? AND user_id = ?'
    ).bind(bookmarkId, userId).run();
    
    return createJSONResponse({ message: 'Bookmark deleted successfully' });
  })
};

/**
 * 工具函数：解析请求体
 * @param {Request} request - 请求对象
 * @returns {Promise<Object>} 请求体数据
 */
async function parseRequestBody(request) {
  if (request.method === 'GET') {
    return null;
  }
  
  const contentType = request.headers.get('Content-Type');
  
  if (contentType && contentType.includes('application/json')) {
    return await request.json();
  }
  
  return null;
}

/**
 * 工具函数：验证请求体数据
 * @param {Object} data - 请求数据
 * @param {Array} requiredFields - 必需字段列表
 * @returns {Object} 验证结果
 */
function validateRequestBody(data, requiredFields) {
  const errors = [];

  for (const field of requiredFields) {
    if (!data[field]) {
      errors.push(`${field} is required`);
    }
  }
  
  if (errors.length > 0) {
    return {
      valid: false,
      errors
    };
  }
  
  return { valid: true };
}

/**
 * 工具函数：验证URL格式
 * @param {string} url - URL字符串
 * @returns {boolean} 是否为有效URL
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 工具函数：验证邮箱格式
 * @param {string} email - 邮箱字符串
 * @returns {boolean} 是否为有效邮箱
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 工具函数：验证密码长度
 * @param {string} password - 密码字符串
 * @param {number} minLength - 最小长度
 * @returns {boolean} 是否符合长度要求
 */
function isValidPassword(password, minLength = 6) {
  return password.length >= minLength;
}