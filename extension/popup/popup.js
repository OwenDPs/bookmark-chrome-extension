// 导入共享工具函数
import { showNotification, escapeHtml, isValidUrl, getAuthToken, saveAuthToken, removeAuthToken } from '../shared/utils.js';
import { createAPIClient } from '../shared/apiClient.js';
import { createErrorHandler, ValidationError, AuthError } from '../shared/errorHandler.js';

// 加载配置
let config;
console.log('[Config Debug] 开始加载配置...');
console.log('[Config Debug] window.BookmarkExtensionConfig 存在:', typeof window.BookmarkExtensionConfig !== 'undefined');

try {
  // 在扩展环境中，配置通过全局变量提供
  config = window.BookmarkExtensionConfig || {};
  console.log('[Config Debug] 从全局变量加载的配置:', config);
  console.log('[Config Debug] config.API.BASE_URL:', config.API?.BASE_URL);
  console.log('[Config Debug] window对象包含的属性:', Object.keys(window));
} catch (error) {
  console.error('[Config Debug] 加载配置失败:', error);
  // 使用默认配置
  config = {
    API: {
      BASE_URL: 'https://your-worker.your-subdomain.workers.dev'
    }
  };
  console.log('[Config Debug] 使用默认配置:', config);
}

// API配置
const API_BASE_URL = config.API?.BASE_URL || 'https://your-worker.your-subdomain.workers.dev';
console.log('[Config Debug] 实际使用的API_BASE_URL:', API_BASE_URL);
console.log('[Config Debug] 是否使用了默认URL:', API_BASE_URL === 'https://your-worker.your-subdomain.workers.dev');
console.log('[Config Debug] API_BASE_URL 是否有效:', API_BASE_URL && API_BASE_URL !== 'https://your-worker.your-subdomain.workers.dev');

// 创建API客户端
const apiClient = createAPIClient(API_BASE_URL);

// 创建错误处理器
const errorHandler = createErrorHandler(showNotification);

// DOM元素
const authSection = document.getElementById('auth-section');
const bookmarkSection = document.getElementById('bookmark-section');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showLoginLink = document.getElementById('show-login');
const showRegisterLink = document.getElementById('show-register');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');
const addBookmarkBtn = document.getElementById('add-bookmark-btn');
const bookmarksList = document.getElementById('bookmarks-list');

// 编辑模态框元素
const editModal = document.getElementById('edit-modal');
const editTitleInput = document.getElementById('edit-title');
const editUrlInput = document.getElementById('edit-url');
const saveEditBtn = document.getElementById('save-edit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');

// 当前编辑的收藏夹ID
let currentEditingBookmarkId = null;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  // 检查用户是否已登录
  checkUserLoggedIn();
  
  // 检查是否有待添加的收藏夹
  checkPendingBookmark();
  
  // 事件监听器
  showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
  });
  
  showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
  });
  
  loginBtn.addEventListener('click', handleLogin);
  registerBtn.addEventListener('click', handleRegister);
  logoutBtn.addEventListener('click', handleLogout);
  addBookmarkBtn.addEventListener('click', handleAddBookmark);
  saveEditBtn.addEventListener('click', handleSaveEdit);
  cancelEditBtn.addEventListener('click', handleCancelEdit);
});

// 检查是否有待添加的收藏夹
async function checkPendingBookmark() {
  try {
    const result = await chrome.storage.local.get(['pendingBookmark']);
    const pendingBookmark = result.pendingBookmark;
    
    if (pendingBookmark) {
      // 检查用户是否已登录
      const token = await getAuthToken();
      
      if (token) {
        // 用户已登录，直接添加收藏夹
        await addBookmark(pendingBookmark.title, pendingBookmark.url);
        // 清除待添加的收藏夹
        await chrome.storage.local.remove(['pendingBookmark']);
      } else {
        // 用户未登录，显示登录表单并填充标题和URL
        document.getElementById('bookmark-title').value = pendingBookmark.title || '';
        document.getElementById('bookmark-url').value = pendingBookmark.url || '';
      }
    }
  } catch (error) {
    console.error('检查待添加收藏夹失败:', error);
  }
}

// 检查用户是否已登录
async function checkUserLoggedIn() {
  try {
    const token = await getAuthToken();
    if (token) {
      // 验证token是否有效
      try {
        await apiClient.auth.verify();
        showBookmarkSection();
        loadBookmarks();
      } catch (error) {
        // Token无效，清除存储的token
        chrome.storage.local.remove(['auth_token']);
      }
    }
  } catch (error) {
    console.error('检查登录状态失败:', error);
  }
}

// getAuthToken 和 saveAuthToken 函数已从共享工具库导入

// 处理用户登录
async function handleLogin() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  // 表单验证
  const validation = errorHandler.validate(
    { email, password },
    {
      email: { required: true, type: 'email', label: '邮箱' },
      password: { required: true, type: 'password', label: '密码' }
    }
  );
  
  if (!validation.valid) {
    showNotification(validation.errors.join(', '), 'error');
    return;
  }
  
  try {
    console.log('[Login Debug] ====== 开始登录流程 ======');
    console.log('[Login Debug] 输入的邮箱:', email);
    console.log('[Login Debug] API_BASE_URL:', API_BASE_URL);
    console.log('[Login Debug] apiClient对象:', apiClient);
    
    const data = await errorHandler.handleApiCall(
      () => apiClient.auth.login(email, password),
      '登录失败'
    );
    
    console.log('[Login Debug] 登录成功，返回数据:', data);
    saveAuthToken(data.token);
    showBookmarkSection();
    loadBookmarks();
    showNotification('登录成功', 'success');
  } catch (error) {
    console.log('[Login Debug] 登录失败，详细错误:', error);
    console.log('[Login Debug] 错误类型:', error.constructor.name);
    console.log('[Login Debug] 错误消息:', error.message);
    console.log('[Login Debug] 错误堆栈:', error.stack);
    // 错误已经在handleApiCall中处理
  }
}

// 处理用户注册
async function handleRegister() {
  console.log('[Register Debug] 开始处理注册请求');
  
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const confirmPassword = document.getElementById('reg-confirm-password').value;
  
  console.log('[Register Debug] 表单数据:', { email, password: '***', confirmPassword: '***' });
  console.log('[Register Debug] API_BASE_URL:', API_BASE_URL);
  console.log('[Register Debug] apiClient对象:', apiClient);
  
  // 表单验证
  const validation = errorHandler.validate(
    { email, password, confirmPassword },
    {
      email: { required: true, type: 'email', label: '邮箱' },
      password: { required: true, type: 'password', label: '密码' },
      confirmPassword: {
        required: true,
        label: '确认密码',
        validator: (value) => value === password ? true : '两次输入的密码不一致'
      }
    }
  );
  
  if (!validation.valid) {
    console.log('[Register Debug] 表单验证失败:', validation.errors);
    showNotification(validation.errors.join(', '), 'error');
    return;
  }
  
  console.log('[Register Debug] 表单验证通过，准备发送API请求');
  
  try {
    console.log('[Register Debug] 调用 apiClient.auth.register');
    const data = await errorHandler.handleApiCall(
      () => apiClient.auth.register(email, password),
      '注册失败'
    );
    console.log('[Register Debug] 注册成功，返回数据:', data);
    saveAuthToken(data.token);
    showBookmarkSection();
    showNotification('注册成功', 'success');
  } catch (error) {
    console.log('[Register Debug] 注册失败，错误信息:', error);
    // 错误已经在handleApiCall中处理
  }
}

// 处理用户登出
function handleLogout() {
  removeAuthToken();
  showAuthSection();
  showNotification('已退出登录', 'success');
}

// 显示认证部分
function showAuthSection() {
  authSection.classList.remove('hidden');
  bookmarkSection.classList.add('hidden');
}

// 显示收藏夹部分
function showBookmarkSection() {
  authSection.classList.add('hidden');
  bookmarkSection.classList.remove('hidden');
}

// 加载收藏夹列表
async function loadBookmarks() {
  try {
    const token = await getAuthToken();
    if (!token) {
      showAuthSection();
      return;
    }
    
    const bookmarks = await apiClient.bookmarks.list();
    renderBookmarks(bookmarks);
  } catch (error) {
    console.error('加载收藏夹失败:', error);
    showNotification(error.message || '加载收藏夹失败', 'error');
  }
}

// 渲染收藏夹列表
function renderBookmarks(bookmarks) {
  bookmarksList.innerHTML = '';
  
  if (bookmarks.length === 0) {
    bookmarksList.innerHTML = '<p style="text-align: center; padding: 20px; color: #666;">暂无收藏夹</p>';
    return;
  }
  
  bookmarks.forEach(bookmark => {
    const bookmarkItem = document.createElement('div');
    bookmarkItem.className = 'bookmark-item';
    
    bookmarkItem.innerHTML = `
      <div class="bookmark-info">
        <div class="bookmark-title">${escapeHtml(bookmark.title)}</div>
        <div class="bookmark-url">${escapeHtml(bookmark.url)}</div>
      </div>
      <div class="bookmark-actions">
        <button class="edit-btn" data-id="${bookmark.id}">编辑</button>
        <button class="delete-btn" data-id="${bookmark.id}">删除</button>
      </div>
    `;
    
    bookmarksList.appendChild(bookmarkItem);
  });
  
  // 添加编辑和删除按钮的事件监听器
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', handleEditBookmark);
  });
  
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', handleDeleteBookmark);
  });
}

// 处理添加收藏夹
async function handleAddBookmark() {
  const title = document.getElementById('bookmark-title').value;
  const url = document.getElementById('bookmark-url').value;
  
  // 表单验证
  const validation = errorHandler.validate(
    { title, url },
    {
      title: { required: true, label: '标题' },
      url: { required: true, type: 'url', label: 'URL' }
    }
  );
  
  if (!validation.valid) {
    showNotification(validation.errors.join(', '), 'error');
    return;
  }
  
  const success = await addBookmark(title, url);
  
  if (success) {
    // 清空输入框
    document.getElementById('bookmark-title').value = '';
    document.getElementById('bookmark-url').value = '';
  }
}

// 添加收藏夹的通用函数
async function addBookmark(title, url) {
  const token = await getAuthToken();
  if (!token) {
    showAuthSection();
    return false;
  }
  
  try {
    await errorHandler.handleApiCall(
      () => apiClient.bookmarks.add(title, url),
      '添加收藏夹失败'
    );
    loadBookmarks();
    showNotification('收藏夹添加成功', 'success');
    return true;
  } catch (error) {
    // 错误已经在handleApiCall中处理
    return false;
  }
}

// 处理编辑收藏夹
async function handleEditBookmark(e) {
  const bookmarkId = e.target.getAttribute('data-id');
  
  const token = await getAuthToken();
  if (!token) {
    showAuthSection();
    return;
  }
  
  try {
    const bookmark = await errorHandler.handleApiCall(
      () => apiClient.bookmarks.get(bookmarkId),
      '获取收藏夹详情失败'
    );
    
    // 填充编辑表单
    editTitleInput.value = bookmark.title;
    editUrlInput.value = bookmark.url;
    
    // 保存当前编辑的收藏夹ID
    currentEditingBookmarkId = bookmarkId;
    
    // 显示编辑模态框
    editModal.classList.remove('hidden');
  } catch (error) {
    // 错误已经在handleApiCall中处理
  }
}

// 处理保存编辑
async function handleSaveEdit() {
  const title = editTitleInput.value.trim();
  const url = editUrlInput.value.trim();
  
  // 表单验证
  const validation = errorHandler.validate(
    { title, url },
    {
      title: { required: true, label: '标题' },
      url: { required: true, type: 'url', label: 'URL' }
    }
  );
  
  if (!validation.valid) {
    showNotification(validation.errors.join(', '), 'error');
    return;
  }
  
  const token = await getAuthToken();
  if (!token) {
    showAuthSection();
    return;
  }
  
  try {
    await errorHandler.handleApiCall(
      () => apiClient.bookmarks.update(currentEditingBookmarkId, title, url),
      '更新收藏夹失败'
    );
    
    // 关闭编辑模态框
    editModal.classList.add('hidden');
    
    // 重新加载收藏夹列表
    loadBookmarks();
    
    showNotification('收藏夹更新成功', 'success');
  } catch (error) {
    // 错误已经在handleApiCall中处理
  }
}

// 处理取消编辑
function handleCancelEdit() {
  // 关闭编辑模态框
  editModal.classList.add('hidden');
  
  // 清空表单
  editTitleInput.value = '';
  editUrlInput.value = '';
  
  // 重置当前编辑的收藏夹ID
  currentEditingBookmarkId = null;
}

// 处理删除收藏夹
async function handleDeleteBookmark(e) {
  const bookmarkId = e.target.getAttribute('data-id');
  
  if (!confirm('确定要删除这个收藏夹吗？')) {
    return;
  }
  
  const token = await getAuthToken();
  if (!token) {
    showAuthSection();
    return;
  }
  
  try {
    await errorHandler.handleApiCall(
      () => apiClient.bookmarks.delete(bookmarkId),
      '删除收藏夹失败'
    );
    loadBookmarks();
    showNotification('收藏夹删除成功', 'success');
  } catch (error) {
    // 错误已经在handleApiCall中处理
  }
}

// showNotification 和 escapeHtml 函数已从共享工具库导入