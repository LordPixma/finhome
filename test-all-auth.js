// Test All Production Auth Endpoints
const API_BASE = 'https://api.finhome360.com';

async function testProductionAuthEndpoints() {
  try {
    console.log('Testing production auth endpoints...');
    
    // Test regular login endpoint
    console.log('\n1. Testing regular login endpoint...');
    const regularLoginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'wrongpassword'
      })
    });
    console.log('Regular login status:', regularLoginResponse.status);
    
    // Test global admin login endpoint
    console.log('\n2. Testing global admin login endpoint...');
    const globalAdminResponse = await fetch(`${API_BASE}/api/auth/global-admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@finhome360.com',
        password: 'Admin123!@#'
      })
    });
    console.log('Global admin login status:', globalAdminResponse.status);
    const globalAdminData = await globalAdminResponse.text();
    console.log('Global admin response:', globalAdminData);
    
  } catch (error) {
    console.error('❌ Test Failed:', error.message);
  }
}

testProductionAuthEndpoints();