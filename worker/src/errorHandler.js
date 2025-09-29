// 错误处理中间件，统一处理错误响应

/**
 * 错误类型枚举
 */
export const ErrorType = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};

/**
 * 自定义错误类
 */
export class AppError extends Error {
  /**
   * 创建应用错误
   * @param {string} message - 错误消息
   * @param {string} type - 错误类型
   * @param {number} status - HTTP状态码
   */
  constructor(message, type = ErrorType.INTERNAL_ERROR, status = 500) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.status = status;
  }
}

/**
 * 验证错误
 */
export class ValidationError extends AppError {
  /**
   * 创建验证错误
   * @param {string} message - 错误消息
   */
  constructor(message) {
    super(message, ErrorType.VALIDATION_ERROR, 400);
    this.name = 'ValidationError';
  }
}

/**
 * 认证错误
 */
export class AuthenticationError extends AppError {
  /**
   * 创建认证错误
   * @param {string} message - 错误消息
   */
  constructor(message = '认证失败') {
    super(message, ErrorType.AUTHENTICATION_ERROR, 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * 授权错误
 */
export class AuthorizationError extends AppError {
  /**
   * 创建授权错误
   * @param {string} message - 错误消息
   */
  constructor(message = '权限不足') {
    super(message, ErrorType.AUTHORIZATION_ERROR, 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * 资源未找到错误
 */
export class NotFoundError extends AppError {
  /**
   * 创建资源未找到错误
   * @param {string} message - 错误消息
   */
  constructor(message = '资源未找到') {
    super(message, ErrorType.NOT_FOUND_ERROR, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * 错误处理中间件
 * @param {Function} handler - 处理函数
 * @returns {Function} 包装后的处理函数
 */
export function withErrorHandling(handler) {
  return async (request, env, ...args) => {
    try {
      return await handler(request, env, ...args);
    } catch (error) {
      console.error('Request failed:', error);
      
      if (error instanceof AppError) {
        return createErrorResponse(error.message, error.status);
      }
      
      // 处理其他类型的错误
      return createErrorResponse(
        error.message || '服务器内部错误',
        error.status || 500
      );
    }
  };
}

/**
 * 创建错误响应
 * @param {string} message - 错误消息
 * @param {number} status - HTTP状态码
 * @param {Object} headers - 额外的响应头
 * @returns {Response} 错误响应
 */
export function createErrorResponse(message, status = 400, headers = {}) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

/**
 * 创建JSON响应
 * @param {Object} data - 响应数据
 * @param {number} status - HTTP状态码
 * @param {Object} headers - 额外的响应头
 * @returns {Response} JSON响应
 */
export function createJSONResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

/**
 * 异步错误处理包装器
 * @param {Function} fn - 异步函数
 * @returns {Function} 包装后的函数
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}