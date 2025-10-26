// Test Production Global Admin Login
const API_BASE = 'https://api.finhome360.com';

async function testProductionAPI() {
  try {
    console.log('Testing production API health check...');
    const response = await fetch(`${API_BASE}/`);
    const data = await response.text();
    console.log('✅ Production API Health Check:', data);
    
    console.log('\nTesting production global admin login...');
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
    
    console.log('Production Login Response Status:', loginResponse.status);
    const loginData = await loginResponse.text();
    console.log('Production Login Response:', loginData);
    
  } catch (error) {
    console.error('❌ Production API Test Failed:', error.message);
  }
}

testProductionAPI();