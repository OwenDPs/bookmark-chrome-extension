// 共享工具函数库

/**
 * 显示通知
 * @param {string} message - 通知消息
 * @param {string} type - 通知类型 (info, success, error)
 */
export function showNotification(message, type = 'info') {
  // 移除现有通知
  const existingNotification = document.querySelector('.notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  // 创建新通知
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // 显示通知
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // 3秒后隐藏通知
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

/**
 * HTML转义，防止XSS攻击
 * @param {string} text - 需要转义的文本
 * @returns {string} 转义后的文本
 */
export function escapeHtml(text) {
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
 * 验证URL格式
 * @param {string} url - 需要验证的URL
 * @returns {boolean} 是否为有效的URL
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
 * 获取认证token
 * @returns {Promise<string|null>} 认证token或null
 */
export function getAuthToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['auth_token'], (result) => {
      resolve(result.auth_token || null);
    });
  });
}

/**
 * 保存认证token
 * @param {string} token - 认证token
 */
export function saveAuthToken(token) {
  chrome.storage.local.set({ auth_token: token });
}

/**
 * 移除认证token
 */
export function removeAuthToken() {
  chrome.storage.local.remove(['auth_token']);
}