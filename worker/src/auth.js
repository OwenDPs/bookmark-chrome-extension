// 认证相关功能模块
import { TokenService } from './tokenService.js';

// 工具函数：生成JWT令牌
export async function generateToken(userId, email, JWT_SECRET) {
  return await TokenService.generateToken(userId, email, JWT_SECRET);
}

// 工具函数：验证JWT令牌
export async function verifyToken(token, JWT_SECRET) {
  return await TokenService.verifyToken(token, JWT_SECRET);
}

// 工具函数：HMAC-SHA256
export async function hmacSha256(message, secret) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  
  // 转换为十六进制字符串
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// 工具函数：哈希密码
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  
  // 使用PBKDF2进行密码哈希
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const importedKey = await crypto.subtle.importKey(
    'raw',
    data,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    importedKey,
    256
  );
  
  // 将salt和哈希值合并
  const combined = new Uint8Array(salt.length + derivedBits.byteLength / 8);
  combined.set(salt);
  combined.set(new Uint8Array(derivedBits), salt.length);
  
  // 转换为Base64字符串
  return btoa(String.fromCharCode.apply(null, combined));
}

// 工具函数：验证密码
export async function verifyPassword(password, hash) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    
    // 从存储的哈希中提取salt
    const combined = new Uint8Array(
      atob(hash)
        .split('')
        .map(c => c.charCodeAt(0))
    );
    
    const salt = combined.slice(0, 16);
    const storedHash = combined.slice(16);
    
    // 使用相同的salt和参数计算哈希
    const importedKey = await crypto.subtle.importKey(
      'raw',
      data,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      importedKey,
      256
    );
    
    const computedHash = new Uint8Array(derivedBits);
    
    // 比较哈希值
    if (storedHash.length !== computedHash.length) {
      return false;
    }
    
    for (let i = 0; i < storedHash.length; i++) {
      if (storedHash[i] !== computedHash[i]) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

// 验证用户并获取用户信息
export async function verifyUserAndGetInfo(request, env) {
  return await TokenService.verifyRequestAndGetUser(request, env);
}