// 认证中间件，统一处理认证验证逻辑
import { TokenService } from './tokenService.js';
import {
  withErrorHandling,
  createErrorResponse,
  createJSONResponse,
  AuthenticationError
} from './errorHandler.js';

/**
 * 认证中间件，用于验证请求的认证令牌
 * @param {Function} handler - 处理函数
 * @returns {Function} 包装后的处理函数
 */
export function withAuth(handler) {
  return withErrorHandling(async (request, env) => {
    const token = TokenService.extractTokenFromRequest(request);
    if (!token) {
      throw new AuthenticationError('缺少认证令牌');
    }
    
    const decoded = await TokenService.verifyToken(token, env.JWT_SECRET);
    if (!decoded) {
      throw new AuthenticationError('无效的认证令牌');
    }
    
    // 将解码后的用户信息添加到请求上下文中
    request.user = decoded;
    
    return handler(request, env);
  });
}


/**
 * 验证请求体数据
 * @param {Object} data - 请求数据
 * @param {Array} requiredFields - 必需字段列表
 * @returns {Object} 验证结果
 */
export function validateRequestBody(data, requiredFields) {
  const errors = [];
  
  for (const field of requiredFields) {
    if (!data[field]) {
      errors.push(`${field}不能为空`);
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
 * 验证URL格式
 * @param {string} url - URL字符串
 * @returns {boolean} 是否为有效URL
 */
export function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 验证邮箱格式
 * @param {string} email - 邮箱字符串
 * @returns {boolean} 是否为有效邮箱
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 验证密码长度
 * @param {string} password - 密码字符串
 * @param {number} minLength - 最小长度
 * @returns {boolean} 是否符合长度要求
 */
export function isValidPassword(password, minLength = 6) {
  return password.length >= minLength;
}