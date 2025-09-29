// 扩展配置文件
const CONFIG = {
  // API配置
  API: {
    // 默认API URL，将在部署时替换为实际的Worker URL
    BASE_URL: 'https://your-worker.your-subdomain.workers.dev',
    
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
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else if (typeof window !== 'undefined') {
  window.BookmarkExtensionConfig = CONFIG;
}