// API客户端类，统一处理API调用
import { getAuthToken } from './utils.js';

/**
 * API客户端类，用于统一处理与后端的API调用
 */
export class APIClient {
  /**
   * 创建API客户端实例
   * @param {string} baseUrl - API基础URL
   */
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  /**
   * 发送API请求
   * @param {string} endpoint - API端点
   * @param {Object} options - 请求选项
   * @returns {Promise<Object>} 响应数据
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    console.log(`[API Debug] 发送请求到: ${url}`);
    console.log(`[API Debug] 使用的baseUrl: ${this.baseUrl}`);
    console.log(`[API Debug] 请求端点: ${endpoint}`);
    console.log(`[API Debug] 请求方法: ${options.method || 'GET'}`);
    console.log(`[API Debug] 请求选项:`, options);
    console.log(`[API Debug] baseUrl是否为默认值: ${this.baseUrl === 'https://your-worker.your-subdomain.workers.dev'}`);
    
    const token = await getAuthToken();
    console.log(`[API Debug] 认证token: ${token ? '存在' : '不存在'}`);
    
    const defaultHeaders = {
      'Content-Type': 'application/json'
    };
    
    // 如果有token，添加认证头
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }
    
    const config = {
      headers: {
        ...defaultHeaders,
        ...(options.headers || {})
      },
      ...options
    };
    
    try {
      console.log(`[API Debug] 实际请求配置:`, config);
      const response = await fetch(url, config);
      
      console.log(`[API Debug] 响应状态: ${response.status}`);
      console.log(`[API Debug] 响应头:`, response.headers);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[API Debug] 请求失败，错误数据:`, errorData);
        throw new Error(errorData.error || `API请求失败: ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log(`[API Debug] 响应数据:`, responseData);
      return responseData;
    } catch (error) {
      console.error(`[API Debug] 请求异常:`, error);
      throw error;
    }
  }

  /**
   * 发送GET请求
   * @param {string} endpoint - API端点
   * @param {Object} options - 请求选项
   * @returns {Promise<Object>} 响应数据
   */
  async get(endpoint, options = {}) {
    return this.request(endpoint, {
      method: 'GET',
      ...options
    });
  }

  /**
   * 发送POST请求
   * @param {string} endpoint - API端点
   * @param {Object} data - 请求数据
   * @param {Object} options - 请求选项
   * @returns {Promise<Object>} 响应数据
   */
  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options
    });
  }

  /**
   * 发送PUT请求
   * @param {string} endpoint - API端点
   * @param {Object} data - 请求数据
   * @param {Object} options - 请求选项
   * @returns {Promise<Object>} 响应数据
   */
  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options
    });
  }

  /**
   * 发送DELETE请求
   * @param {string} endpoint - API端点
   * @param {Object} options - 请求选项
   * @returns {Promise<Object>} 响应数据
   */
  async delete(endpoint, options = {}) {
    return this.request(endpoint, {
      method: 'DELETE',
      ...options
    });
  }

  /**
   * 用户认证相关API
   */
  auth = {
    /**
     * 用户登录
     * @param {string} email - 邮箱
     * @param {string} password - 密码
     * @returns {Promise<Object>} 登录结果
     */
    login: (email, password) => this.post('/api/auth/login', { email, password }),
    
    /**
     * 用户注册
     * @param {string} email - 邮箱
     * @param {string} password - 密码
     * @returns {Promise<Object>} 注册结果
     */
    register: (email, password) => this.post('/api/auth/register', { email, password }),
    
    /**
     * 验证用户token
     * @returns {Promise<Object>} 验证结果
     */
    verify: () => this.post('/api/user/verify'),
    
    /**
     * 获取用户信息
     * @returns {Promise<Object>} 用户信息
     */
    getUserInfo: () => this.get('/api/user/info')
  };

  /**
   * 书签相关API
   */
  bookmarks = {
    /**
     * 获取书签列表
     * @returns {Promise<Array>} 书签列表
     */
    list: () => this.get('/api/bookmarks'),
    
    /**
     * 添加书签
     * @param {string} title - 书签标题
     * @param {string} url - 书签URL
     * @returns {Promise<Object>} 添加结果
     */
    add: (title, url) => this.post('/api/bookmarks', { title, url }),
    
    /**
     * 获取单个书签
     * @param {string|number} id - 书签ID
     * @returns {Promise<Object>} 书签信息
     */
    get: (id) => this.get(`/api/bookmarks/${id}`),
    
    /**
     * 更新书签
     * @param {string|number} id - 书签ID
     * @param {string} title - 书签标题
     * @param {string} url - 书签URL
     * @returns {Promise<Object>} 更新结果
     */
    update: (id, title, url) => this.put(`/api/bookmarks/${id}`, { title, url }),
    
    /**
     * 删除书签
     * @param {string|number} id - 书签ID
     * @returns {Promise<Object>} 删除结果
     */
    delete: (id) => this.delete(`/api/bookmarks/${id}`)
  };
}

/**
 * 创建默认API客户端实例
 * @param {string} baseUrl - API基础URL
 * @returns {APIClient} API客户端实例
 */
export function createAPIClient(baseUrl) {
  return new APIClient(baseUrl);
}