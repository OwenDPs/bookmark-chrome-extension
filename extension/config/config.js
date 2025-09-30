// 扩展配置文件
const CONFIG = {
  // API配置
  API: {
    // 默认API URL，将在部署时替换为实际的Worker URL
    BASE_URL: 'https://bookmark-chrome.xto.workers.dev/',
    
    // API端点
    ENDPOINTS: {
      AUTH: {
        REGISTER: '/api/auth/register',
        LOGIN: '/api/auth/login',
        VERIFY: '/api/user/verify'
      },
      USER: {
        INFO: '/api/user/info'
      },
      BOOKMARKS: {
        LIST: '/api/bookmarks',
        ADD: '/api/bookmarks',
        GET: '/api/bookmarks/:id',
        UPDATE: '/api/bookmarks/:id',
        DELETE: '/api/bookmarks/:id'
      }
    },
    
    // 请求超时时间（毫秒）
    TIMEOUT: 10000
  },
  
  // 扩展配置
  EXTENSION: {
    // 扩展名称
    NAME: 'Bookmark Manager',
    
    // 扩展版本
    VERSION: '1.0.0',
    
    // 默认设置
    DEFAULT_SETTINGS: {
      // 是否显示浮动按钮
      floatingButtonEnabled: true,
      
      // 收藏夹列表每页显示的数量
      bookmarksPerPage: 20,
      
      // 是否启用通知
      notificationsEnabled: true
    }
  },
  
  // 调试配置
  DEBUG: {
    // 是否启用调试模式
    ENABLED: false,
    
    // 是否在控制台输出详细日志
    VERBOSE_LOGGING: false
  }
};

// 导出配置
console.log('[Config Debug] 开始导出配置...');
console.log('[Config Debug] CONFIG.API.BASE_URL:', CONFIG.API.BASE_URL);

if (typeof module !== 'undefined' && module.exports) {
  console.log('[Config Debug] 使用 CommonJS 导出配置');
  module.exports = CONFIG;
} else if (typeof window !== 'undefined') {
  console.log('[Config Debug] 使用 window 对象导出配置');
  window.BookmarkExtensionConfig = CONFIG;
  console.log('[Config Debug] 配置已设置到 window.BookmarkExtensionConfig');
}

// 确保在非模块环境中也能访问配置
if (typeof globalThis !== 'undefined') {
  console.log('[Config Debug] 使用 globalThis 对象导出配置');
  globalThis.BookmarkExtensionConfig = CONFIG;
  console.log('[Config Debug] 配置已设置到 globalThis.BookmarkExtensionConfig');
}

console.log('[Config Debug] 配置导出完成');