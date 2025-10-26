// Simple API test
const API_BASE = 'http://127.0.0.1:8787';

async function testAPI() {
  try {
    console.log('Testing API health check...');
    const response = await fetch(`${API_BASE}/`);
    const data = await response.text();
    console.log('✅ API Health Check:', data);
    
    console.log('\nTesting global admin login...');
    const loginResponse = await fetch(`${API_BASE}/api/auth/global-admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@finhome360.com',
        password: 'Admin123!@#'
      })
    });
    
    console.log('Login Response Status:', loginResponse.status);
    const loginData = await loginResponse.text();
    console.log('Login Response:', loginData);
    
  } catch (error) {
    console.error('❌ API Test Failed:', error.message);
  }
}

testAPI();