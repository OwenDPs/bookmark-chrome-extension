// 导入共享工具函数
import { getAuthToken, saveAuthToken, removeAuthToken } from '../shared/utils.js';

// 后台脚本，处理扩展的后台任务

// 扩展安装时的初始化
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Bookmark Manager extension installed');
  
  // 初始化存储
  chrome.storage.local.get(['auth_token'], (result) => {
    if (!result.auth_token) {
      console.log('No auth token found, user needs to login');
    }
  });
  
  // 创建右键菜单
  createContextMenu();
});

// 创建右键菜单
function createContextMenu() {
  chrome.contextMenus.create({
    id: 'add-to-bookmarks',
    title: '添加到收藏夹',
    contexts: ['page', 'link']
  });
}

// 处理右键菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'add-to-bookmarks') {
    // 获取当前页面的URL和标题
    const url = info.linkUrl || tab.url;
    const title = info.linkText || tab.title;
    
    // 保存到临时存储，供弹出窗口使用
    chrome.storage.local.set({
      pendingBookmark: { title, url }
    }, () => {
      console.log('Bookmark saved to pending storage');
    });
  }
});

// 处理来自内容脚本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getAuthToken') {
    getAuthToken().then(token => {
      sendResponse({ token });
    });
    return true; // 保持消息通道开放以进行异步响应
  }
  
  if (request.action === 'setAuthToken') {
    saveAuthToken(request.token);
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === 'removeAuthToken') {
    removeAuthToken();
    sendResponse({ success: true });
    return true;
  }
});

// 监听扩展启动事件
chrome.runtime.onStartup.addListener(() => {
  console.log('Bookmark Manager extension started');
  // 可以在这里添加一些启动时的初始化逻辑
});

// 监听扩展图标点击事件
chrome.action.onClicked.addListener((tab) => {
  // 如果需要，可以在这里添加点击扩展图标时的特殊行为
  // 默认行为是打开popup.html
});

// 处理标签页更新事件
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 可以在这里添加标签页更新时的逻辑
  // 例如，当页面加载完成时自动保存书签等
});

// 处理标签页激活事件
chrome.tabs.onActivated.addListener((activeInfo) => {
  // 可以在这里添加标签页激活时的逻辑
});