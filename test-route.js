// 简单的路由测试脚本
async function testRegisterRoute() {
  const API_BASE_URL = 'https://bookmark-chrome.xto.workers.dev';

  const testData = {
    email: `test${Date.now()}@example.com`,
    password: 'TestPassword123'
  };

  console.log('开始测试注册路由...');
  console.log('API URL:', `${API_BASE_URL}/api/auth/register`);
  console.log('请求数据:', testData);

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    console.log('响应状态:', response.status);
    console.log('响应头:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const data = await response.json();
      console.log('注册成功:', data);
      return true;
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.error('注册失败:', errorData);
      return false;
    }
  } catch (error) {
    console.error('请求异常:', error);
    return false;
  }
}

// 运行测试
testRegisterRoute().then(success => {
  if (success) {
    console.log('✅ 路由测试通过 - 注册功能正常');
  } else {
    console.log('❌ 路由测试失败 - 注册功能异常');
  }
});