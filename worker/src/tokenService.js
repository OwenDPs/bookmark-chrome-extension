// Token服务，统一处理token相关逻辑
import { hmacSha256 } from './auth.js';

/**
 * Token服务类，统一处理token的生成、验证和管理
 */
export class TokenService {
  /**
   * 生成JWT令牌
   * @param {number} userId - 用户ID
   * @param {string} email - 用户邮箱
   * @param {string} secret - JWT密钥
   * @param {number} expiresIn - 过期时间（秒），默认7天
   * @returns {Promise<string>} JWT令牌
   */
  static async generateToken(userId, email, secret, expiresIn = 7 * 24 * 60 * 60) {
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };
    
    const payload = {
      id: userId,
      email: email,
      exp: Math.floor(Date.now() / 1000) + expiresIn
    };
    
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(payload));
    
    const signature = await hmacSha256(`${encodedHeader}.${encodedPayload}`, secret);
    
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * 验证JWT令牌
   * @param {string} token - JWT令牌
   * @param {string} secret - JWT密钥
   * @returns {Promise<Object|null>} 解码后的payload或null
   */
  static async verifyToken(token, secret) {
    try {
      if (!token) {
        return null;
      }
      
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }
      
      const [encodedHeader, encodedPayload, signature] = parts;
      
      // 验证签名
      const expectedSignature = await hmacSha256(`${encodedHeader}.${encodedPayload}`, secret);
      if (signature !== expectedSignature) {
        return null;
      }
      
      // 解析payload
      const payload = JSON.parse(atob(encodedPayload));
      
      // 检查过期时间
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }
      
      return payload;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  /**
   * 从请求中提取token
   * @param {Request} request - 请求对象
   * @returns {string|null} token或null
   */
  static extractTokenFromRequest(request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * 验证请求中的token并获取用户信息
   * @param {Request} request - 请求对象
   * @param {Object} env - 环境变量
   * @returns {Promise<Object>} 验证结果
   */
  static async verifyRequestAndGetUser(request, env) {
    try {
      const token = this.extractTokenFromRequest(request);
      if (!token) {
        return { valid: false, error: '缺少认证令牌', status: 401 };
      }
      
      const decoded = await this.verifyToken(token, env.JWT_SECRET);
      if (!decoded) {
        return { valid: false, error: '无效的认证令牌', status: 401 };
      }
      
      // 查找用户
      const user = await env.BOOKMARK_DB.prepare(
        'SELECT id, email, created_at FROM users WHERE id = ?'
      ).bind(decoded.id).first();
      
      if (!user) {
        return { valid: false, error: '用户不存在', status: 404 };
      }
      
      return { valid: true, user };
    } catch (error) {
      console.error('Token verification failed:', error);
      return { valid: false, error: 'Token verification failed', status: 500 };
    }
  }
}