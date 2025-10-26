// Test Global Admin Login
const API_BASE = 'http://127.0.0.1:8787';

async function testGlobalAdminLogin() {
  try {
    console.log('Testing global admin login...');
    
    // Try to login with global admin credentials
    const response = await fetch(`${API_BASE}/api/auth/global-admin-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@finhome360.com',
        password: 'Admin123!@#' // The password for the admin
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Global admin login successful!');
      console.log('🔗 Access token received');
      console.log('🌐 You can now access: http://localhost:3000/admin');
      console.log('\nLogin result:', result);
      
      // Test a global admin endpoint
      if (result.data?.accessToken) {
        console.log('\nTesting global admin stats endpoint...');
        const statsResponse = await fetch(`${API_BASE}/api/global-admin/stats`, {
          headers: {
            'Authorization': `Bearer ${result.data.accessToken}`,
          },
        });
        
        const statsResult = await statsResponse.json();
        if (statsResponse.ok) {
          console.log('✅ Global admin stats retrieved successfully!');
          console.log('Platform stats:', statsResult.data);
        } else {
          console.log('❌ Failed to get stats:', statsResult);
        }
      }
    } else {
      console.error('❌ Global admin login failed:', result);
    }
  } catch (error) {
    console.error('❌ Error testing global admin login:', error.message);
  }
}

testGlobalAdminLogin();