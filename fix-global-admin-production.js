const API_BASE = 'https://api.finhome360.com';

async function fixGlobalAdminInProduction() {
  try {
    console.log('🔧 Fixing Global Admin in Production Database...\n');

    // Step 1: Hit the temporary fix endpoint
    console.log('Calling /api/global-admin/fix-database-user ...');
    const fixResponse = await fetch(`${API_BASE}/api/global-admin/fix-database-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secretKey: 'fix-global-admin-2025'
      })
    });

    const fixData = await fixResponse.json();
    console.log('Fix status:', fixResponse.status);
    console.log('Fix response:', JSON.stringify(fixData, null, 2));

    if (!fixData.success) {
      console.error('❌ Fix endpoint failed. Aborting.');
      return;
    }

    // Step 2: Log in again to verify token payload
    console.log('\nRe-testing login to verify token payload...');
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
    console.log('Login status:', loginResponse.status);
    console.log('Login response:', JSON.stringify(loginData, null, 2));

    if (!loginData.success) {
      console.error('❌ Login still failing.');
      return;
    }

    console.log('\n✅ Fix script completed.');
  } catch (error) {
    console.error('Error:', error);
  }
}

fixGlobalAdminInProduction();