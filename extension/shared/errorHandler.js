// 前端错误处理工具，统一处理API错误和UI错误

/**
 * 错误类型枚举
 */
export const ErrorType = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  API_ERROR: 'API_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

/**
 * 错误严重级别
 */
export const ErrorSeverity = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error'
};

/**
 * 自定义错误类
 */
export class AppError extends Error {
  /**
   * 创建应用错误
   * @param {string} message - 错误消息
   * @param {string} type - 错误类型
   * @param {string} severity - 错误严重级别
   */
  constructor(message, type = ErrorType.UNKNOWN_ERROR, severity = ErrorSeverity.ERROR) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.severity = severity;
  }
}

/**
 * 网络错误
 */
export class NetworkError extends AppError {
  /**
   * 创建网络错误
   * @param {string} message - 错误消息
   */
  constructor(message = '网络连接失败') {
    super(message, ErrorType.NETWORK_ERROR, ErrorSeverity.ERROR);
    this.name = 'NetworkError';
  }
}

/**
 * API错误
 */
export class ApiError extends AppError {
  /**
   * 创建API错误
   * @param {string} message - 错误消息
   * @param {number} status - HTTP状态码
   */
  constructor(message, status = 500) {
    super(message, ErrorType.API_ERROR, ErrorSeverity.ERROR);
    this.name = 'ApiError';
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
    super(message, ErrorType.VALIDATION_ERROR, ErrorSeverity.WARNING);
    this.name = 'ValidationError';
  }
}

/**
 * 认证错误
 */
export class AuthError extends AppError {
  /**
   * 创建认证错误
   * @param {string} message - 错误消息
   */
  constructor(message = '认证失败') {
    super(message, ErrorType.AUTH_ERROR, ErrorSeverity.WARNING);
    this.name = 'AuthError';
  }
}

/**
 * 错误处理器类
 */
export class ErrorHandler {
  /**
   * 创建错误处理器
   * @param {Function} showNotification - 显示通知的函数
   */
  constructor(showNotification) {
    this.showNotification = showNotification;
  }

  /**
   * 处理错误
   * @param {Error} error - 错误对象
   */
  handleError(error) {
    console.error('Error occurred:', error);

    if (error instanceof AppError) {
      this.showNotification(error.message, error.severity);
      return;
    }

    // 处理其他类型的错误
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      this.showNotification('网络连接失败，请检查网络设置', ErrorSeverity.ERROR);
      return;
    }

    // 默认错误处理
    this.showNotification('发生未知错误，请稍后重试', ErrorSeverity.ERROR);
  }

  /**
   * 处理API错误
   * @param {Object} error - API错误对象
   * @returns {ApiError} 标准化的API错误
   */
  handleApiError(error) {
    if (!error) {
      return new ApiError('未知错误');
    }

    // 如果已经是ApiError，直接返回
    if (error instanceof ApiError) {
      return error;
    }

    // 从响应中提取错误信息
    if (error.message) {
      return new ApiError(error.message, error.status || 500);
    }

    return new ApiError('API请求失败');
  }

  /**
   * 包装API调用，提供统一的错误处理
   * @param {Promise} apiCall - API调用Promise
   * @param {string} errorMessage - 默认错误消息
   * @returns {Promise} API调用结果
   */
  async handleApiCall(apiCall, errorMessage = '操作失败') {
    try {
      return await apiCall();
    } catch (error) {
      const apiError = this.handleApiError(error);
      this.handleError(apiError);
      throw apiError;
    }
  }

  /**
   * 验证表单数据
   * @param {Object} data - 表单数据
   * @param {Object} rules - 验证规则
   * @returns {Object} 验证结果
   */
  validate(data, rules) {
    const errors = [];

    for (const [field, rule] of Object.entries(rules)) {
      const value = data[field];
      
      // 必填验证
      if (rule.required && (!value || value.trim() === '')) {
        errors.push(`${rule.label || field}不能为空`);
        continue;
      }
      
      // 如果字段为空且不是必填，跳过其他验证
      if (!value || value.trim() === '') {
        continue;
      }
      
      // 类型验证
      if (rule.type) {
        switch (rule.type) {
          case 'email':
            if (!this.isValidEmail(value)) {
              errors.push(`${rule.label || field}格式不正确`);
            }
            break;
          case 'url':
            if (!this.isValidUrl(value)) {
              errors.push(`${rule.label || field}格式不正确`);
            }
            break;
          case 'password':
            if (value.length < (rule.minLength || 6)) {
              errors.push(`${rule.label || field}长度不能少于${rule.minLength || 6}位`);
            }
            break;
        }
      }
      
      // 自定义验证
      if (rule.validator && typeof rule.validator === 'function') {
        const result = rule.validator(value);
        if (result !== true) {
          errors.push(result || `${rule.label || field}验证失败`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证邮箱格式
   * @param {string} email - 邮箱地址
   * @returns {boolean} 是否有效
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 验证URL格式
   * @param {string} url - URL地址
   * @returns {boolean} 是否有效
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * 创建默认错误处理器
 * @param {Function} showNotification - 显示通知的函数
 * @returns {ErrorHandler} 错误处理器实例
 */
export function createErrorHandler(showNotification) {
  return new ErrorHandler(showNotification);
}