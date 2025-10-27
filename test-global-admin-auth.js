const API_BASE = 'https://api.finhome360.com';

async function testGlobalAdminAuth() {
  try {
    console.log('🔐 Testing Global Admin Authentication...\n');
    
    // Step 1: Login as global admin
    console.log('Step 1: Logging in as global admin...');
    const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@finhome360.com',
        password: 'Admin123!@#'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('Login Status:', loginResponse.status);
    console.log('Login Response:', JSON.stringify(loginData, null, 2));
    
    if (!loginData.success || !loginData.data?.accessToken) {
      console.error('❌ Login failed');
      return;
    }
    
    const token = loginData.data.accessToken;
    console.log('✅ Login successful, got token');
    console.log('User info:', loginData.data.user);
    
    // Step 2: Test global admin API endpoint
    console.log('\nStep 2: Testing global admin stats endpoint...');
    const statsResponse = await fetch(`${API_BASE}/api/global-admin/stats`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    const statsData = await statsResponse.json();
    console.log('Stats Status:', statsResponse.status);
    console.log('Stats Response:', JSON.stringify(statsData, null, 2));
    
    if (statsData.success) {
      console.log('✅ Global admin API working!');
    } else {
      console.log('❌ Global admin API failed');
    }
    
    // Step 3: Test another endpoint
    console.log('\nStep 3: Testing global admin tenants endpoint...');
    const tenantsResponse = await fetch(`${API_BASE}/api/global-admin/tenants?page=1&limit=5`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    const tenantsData = await tenantsResponse.json();
    console.log('Tenants Status:', tenantsResponse.status);
    console.log('Tenants Response:', JSON.stringify(tenantsData, null, 2));
    
    if (tenantsData.success) {
      console.log('✅ Tenants API working!');
    } else {
      console.log('❌ Tenants API failed');
    }
    
  } catch (error) {
    console.error('Error during test:', error);
  }
}

testGlobalAdminAuth();