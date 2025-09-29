// 导入共享工具函数
import { showNotification } from '../shared/utils.js';

// 内容脚本，用于在网页上添加功能

// 创建一个浮动按钮，用于快速添加当前页面到收藏夹
function createFloatingButton() {
  const button = document.createElement('div');
  button.id = 'bookmark-extension-floating-btn';
  button.innerHTML = '❤️';
  button.style.position = 'fixed';
  button.style.bottom = '20px';
  button.style.right = '20px';
  button.style.width = '50px';
  button.style.height = '50px';
  button.style.borderRadius = '50%';
  button.style.backgroundColor = '#4285f4';
  button.style.color = 'white';
  button.style.fontSize = '24px';
  button.style.display = 'flex';
  button.style.alignItems = 'center';
  button.style.justifyContent = 'center';
  button.style.cursor = 'pointer';
  button.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
  button.style.zIndex = '9999';
  button.style.transition = 'all 0.3s ease';
  
  // 添加悬停效果
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.1)';
    button.style.backgroundColor = '#3367d6';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
    button.style.backgroundColor = '#4285f4';
  });
  
  // 添加点击事件
  button.addEventListener('click', () => {
    // 获取当前页面信息
    const title = document.title;
    const url = window.location.href;
    
    // 保存到临时存储，供弹出窗口使用
    chrome.storage.local.set({
      pendingBookmark: { title, url }
    }, () => {
      // 显示通知
      showNotification('页面信息已保存，请打开扩展添加到收藏夹');
    });
  });
  
  document.body.appendChild(button);
}

// showNotification 函数已从共享工具库导入

// 检查是否应该显示浮动按钮
function checkShouldShowButton() {
  chrome.storage.sync.get(['floatingButtonEnabled'], (result) => {
    // 默认启用浮动按钮
    const enabled = result.floatingButtonEnabled !== false;
    
    if (enabled) {
      // 排除一些不需要浮动按钮的页面
      const excludedUrls = [
        'chrome://',
        'chrome-extension://',
        'moz-extension://',
        'edge://',
        'about:'
      ];
      
      const shouldExclude = excludedUrls.some(url => window.location.href.startsWith(url));
      
      if (!shouldExclude) {
        createFloatingButton();
      }
    }
  });
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  checkShouldShowButton();
});

// 监听来自扩展的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageInfo') {
    sendResponse({
      title: document.title,
      url: window.location.href
    });
    return true;
  }
  
  if (request.action === 'toggleFloatingButton') {
    const button = document.getElementById('bookmark-extension-floating-btn');
    if (button) {
      button.remove();
    } else {
      createFloatingButton();
    }
    sendResponse({ success: true });
    return true;
  }
});