const API_BASE = 'https://api.finhome360.com';

async function fixGlobalAdminViaGlobalAdminRoute() {
  try {
    console.log('🔧 Fixing Global Admin via /api/global-admin/fix-database-user...\n');
    
    const response = await fetch(`${API_BASE}/api/global-admin/fix-database-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secretKey: 'fix-global-admin-2025'
      })
    });
    
    const data = await response.json();
    console.log('Fix Status:', response.status);
    console.log('Fix Response:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('✅ Global admin user fixed successfully!');
      
      // Now test login again
      console.log('\n🔐 Testing login with fixed user...');
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
      
      if (loginData.success) {
        const token = loginData.data.accessToken;
        
        // Decode the new JWT to see if it has isGlobalAdmin
        const parts = token.split('.');
        const payload = JSON.parse(atob(parts[1]));
        console.log('\n🔍 JWT Payload:', JSON.stringify(payload, null, 2));
        
        if (payload.isGlobalAdmin) {
          console.log('✅ JWT now includes isGlobalAdmin flag!');
          
          // Test global admin API
          console.log('\n📊 Testing global admin stats API...');
          
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
            console.log('🎉 Global admin API is now working perfectly!');
          }
        } else {
          console.log('❌ JWT still missing isGlobalAdmin flag');
        }
      }
    } else {
      console.log('❌ Failed to fix global admin user');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixGlobalAdminViaGlobalAdminRoute();