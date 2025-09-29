// 导入共享工具函数
import { showNotification, escapeHtml, getAuthToken, removeAuthToken } from '../shared/utils.js';
import { createAPIClient } from '../shared/apiClient.js';
import { createErrorHandler } from '../shared/errorHandler.js';

// 选项页面的JavaScript代码

// 加载配置
let config;
try {
  // 在扩展环境中，配置通过全局变量提供
  config = window.BookmarkExtensionConfig || {};
} catch (error) {
  console.error('加载配置失败:', error);
  // 使用默认配置
  config = {
    API: {
      BASE_URL: 'https://your-worker.your-subdomain.workers.dev'
    }
  };
}

// DOM元素
const userInfo = document.getElementById('user-info');
const apiUrlInput = document.getElementById('api-url');
const saveApiBtn = document.getElementById('save-api-btn');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFileInput = document.getElementById('import-file');
const floatingButtonToggle = document.getElementById('floating-button-toggle');

// 默认API URL
const DEFAULT_API_URL = config.API?.BASE_URL || 'https://your-worker.your-subdomain.workers.dev';

// 创建API客户端
let apiClient = createAPIClient(DEFAULT_API_URL);

// 创建错误处理器
const errorHandler = createErrorHandler(showNotification);

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  // 加载保存的API URL
  loadApiUrl();
  
  // 加载用户信息
  loadUserInfo();
  
  // 加载浮动按钮设置
  loadFloatingButtonSetting();
  
  // 事件监听器
  saveApiBtn.addEventListener('click', saveApiUrl);
  exportBtn.addEventListener('click', exportBookmarks);
  importBtn.addEventListener('click', () => importFileInput.click());
  importFileInput.addEventListener('change', importBookmarks);
  floatingButtonToggle.addEventListener('change', toggleFloatingButton);
});

// 加载保存的API URL
async function loadApiUrl() {
  try {
    const result = await chrome.storage.sync.get(['api_url']);
    const apiUrl = result.api_url || DEFAULT_API_URL;
    apiUrlInput.value = apiUrl;
  } catch (error) {
    console.error('加载API URL失败:', error);
    showNotification('加载API URL失败', 'error');
  }
}

// 加载浮动按钮设置
async function loadFloatingButtonSetting() {
  try {
    const result = await chrome.storage.sync.get(['floatingButtonEnabled']);
    const enabled = result.floatingButtonEnabled !== false; // 默认启用
    floatingButtonToggle.checked = enabled;
  } catch (error) {
    console.error('加载浮动按钮设置失败:', error);
    showNotification('加载浮动按钮设置失败', 'error');
  }
}

// 切换浮动按钮设置
async function toggleFloatingButton() {
  const enabled = floatingButtonToggle.checked;
  
  try {
    await chrome.storage.sync.set({ floatingButtonEnabled: enabled });
    showNotification(`浮动按钮已${enabled ? '启用' : '禁用'}`, 'success');
    
    // 通知所有标签页更新浮动按钮状态
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, { action: 'toggleFloatingButton' });
      } catch (error) {
        // 忽略无法发送消息的标签页
      }
    }
  } catch (error) {
    console.error('保存浮动按钮设置失败:', error);
    showNotification('保存浮动按钮设置失败', 'error');
  }
}

// 保存API URL
async function saveApiUrl() {
  const apiUrl = apiUrlInput.value.trim();
  
  // 表单验证
  const validation = errorHandler.validate(
    { apiUrl },
    {
      apiUrl: {
        required: true,
        type: 'url',
        label: 'API URL'
      }
    }
  );
  
  if (!validation.valid) {
    showNotification(validation.errors.join(', '), 'error');
    return;
  }
  
  try {
    await chrome.storage.sync.set({ api_url: apiUrl });
    // 更新API客户端
    apiClient = createAPIClient(apiUrl);
    showNotification('API URL保存成功', 'success');
  } catch (error) {
    errorHandler.handleError(error);
  }
}

// 加载用户信息
async function loadUserInfo() {
  try {
    // 获取认证token
    const result = await chrome.storage.local.get(['auth_token']);
    const token = result.auth_token;
    
    if (!token) {
      userInfo.innerHTML = '<p>您尚未登录，请先登录扩展。</p>';
      return;
    }
    
    // 获取API URL
    const apiResult = await chrome.storage.sync.get(['api_url']);
    const apiUrl = apiResult.api_url || DEFAULT_API_URL;
    
    // 更新API客户端
    apiClient = createAPIClient(apiUrl);
    
    // 验证token并获取用户信息
    try {
      const user = await apiClient.auth.getUserInfo();
      renderUserInfo(user);
    } catch (error) {
      // Token无效，清除存储的token
      await chrome.storage.local.remove(['auth_token']);
      userInfo.innerHTML = '<p>登录已过期，请重新登录扩展。</p>';
    }
  } catch (error) {
    console.error('加载用户信息失败:', error);
    userInfo.innerHTML = '<p>加载用户信息失败，请检查网络连接。</p>';
  }
}

// 渲染用户信息
function renderUserInfo(user) {
  const email = user.email;
  const createdAt = new Date(user.created_at).toLocaleString();
  const avatar = email.charAt(0).toUpperCase();
  
  userInfo.innerHTML = `
    <div class="user-details">
      <div class="user-avatar">${avatar}</div>
      <div class="user-info-text">
        <div class="user-email">${escapeHtml(email)}</div>
        <div class="user-created">注册时间: ${createdAt}</div>
      </div>
    </div>
    <button id="logout-btn" class="danger">退出登录</button>
  `;
  
  // 添加退出登录按钮的事件监听器
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
}

// 处理退出登录
async function handleLogout() {
  try {
    await removeAuthToken();
    showNotification('已退出登录', 'success');
    userInfo.innerHTML = '<p>您已退出登录。</p>';
  } catch (error) {
    console.error('退出登录失败:', error);
    showNotification('退出登录失败', 'error');
  }
}

// 导出收藏夹
async function exportBookmarks() {
  try {
    // 获取认证token
    const result = await chrome.storage.local.get(['auth_token']);
    const token = result.auth_token;
    
    if (!token) {
      showNotification('您尚未登录', 'error');
      return;
    }
    
    // 获取API URL
    const apiResult = await chrome.storage.sync.get(['api_url']);
    const apiUrl = apiResult.api_url || DEFAULT_API_URL;
    
    // 更新API客户端
    apiClient = createAPIClient(apiUrl);
    
    // 获取收藏夹数据
    const bookmarks = await errorHandler.handleApiCall(
      () => apiClient.bookmarks.list(),
      '获取收藏夹列表失败'
    );
    
    // 创建JSON文件并下载
    const dataStr = JSON.stringify(bookmarks, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `bookmarks-export-${new Date().toISOString().slice(0, 10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showNotification('收藏夹导出成功', 'success');
  } catch (error) {
    // 错误已经在handleApiCall中处理
  }
}

// 导入收藏夹
async function importBookmarks(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    const reader = new FileReader();
    reader.onload = async function(e) {
      try {
        const bookmarks = JSON.parse(e.target.result);
        
        if (!Array.isArray(bookmarks)) {
          showNotification('无效的收藏夹文件格式', 'error');
          return;
        }
        
        // 获取认证token
        const result = await chrome.storage.local.get(['auth_token']);
        const token = result.auth_token;
        
        if (!token) {
          showNotification('您尚未登录', 'error');
          return;
        }
        
        // 获取API URL
        const apiResult = await chrome.storage.sync.get(['api_url']);
        const apiUrl = apiResult.api_url || DEFAULT_API_URL;
        
        // 更新API客户端
        apiClient = createAPIClient(apiUrl);
        
        // 导入收藏夹
        let successCount = 0;
        let failCount = 0;
        
        for (const bookmark of bookmarks) {
          if (!bookmark.title || !bookmark.url) {
            failCount++;
            continue;
          }
          
          try {
            await errorHandler.handleApiCall(
              () => apiClient.bookmarks.add(bookmark.title, bookmark.url),
              '导入收藏夹项失败'
            );
            successCount++;
          } catch (error) {
            failCount++;
          }
        }
        
        showNotification(`导入完成: 成功 ${successCount} 个, 失败 ${failCount} 个`,
                        failCount === 0 ? 'success' : 'error');
        
        // 重置文件输入
        event.target.value = '';
      } catch (error) {
        console.error('解析收藏夹文件失败:', error);
        showNotification('解析收藏夹文件失败', 'error');
      }
    };
    
    reader.readAsText(file);
  } catch (error) {
    console.error('读取收藏夹文件失败:', error);
    showNotification('读取收藏夹文件失败', 'error');
  }
}

// showNotification 和 escapeHtml 函数已从共享工具库导入