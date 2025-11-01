// Test with tenant user instead of global admin
const https = require('https');

const API_URL = 'https://finhome.samuel-1e5.workers.dev';

async function testWithTenantUser() {
  console.log('🔄 TESTING TRANSACTION SYNC WITH TENANT USER');
  console.log('============================================');
  
  // Step 1: Login as tenant user (not global admin)
  console.log('\n📋 Step 1: Creating/logging in as tenant user...');
  
  // First check if there are any existing tenants
  await checkTenantsAndUsers();
}

async function checkTenantsAndUsers() {
  // Login as global admin first to check system state
  const globalToken = await loginAsGlobalAdmin();
  if (!globalToken) return;

  console.log('\n🔍 Checking system state...');
  
  // Check tenants
  const tenantsOptions = {
    hostname: 'finhome.samuel-1e5.workers.dev',
    port: 443,
    path: '/api/global-admin/tenants',
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${globalToken}`
    }
  };

  return new Promise((resolve) => {
    const req = https.request(tenantsOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.success && response.data && response.data.tenants) {
            console.log(`✅ Found ${response.data.tenants.length} tenants`);
            
            if (response.data.tenants.length > 0) {
              const tenant = response.data.tenants[0];
              console.log(`📋 Using tenant: ${tenant.name} (${tenant.subdomain})`);
              checkTenantBankConnections(tenant.subdomain);
            } else {
              console.log('⚠️  No tenants found. Create a tenant first to test banking sync.');
            }
          } else {
            console.log('❌ Failed to get tenants:', response.error);
          }
        } catch (e) {
          console.log('❌ Tenants response parse error:', data);
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error(`❌ Tenants request error: ${e.message}`);
      resolve();
    });

    req.end();
  });
}

async function checkTenantBankConnections(subdomain) {
  console.log(`\n🏦 Checking bank connections for tenant: ${subdomain}`);
  
  // Make request to tenant subdomain
  const options = {
    hostname: 'finhome.samuel-1e5.workers.dev',
    port: 443,
    path: '/api/banking/connections',
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-Tenant-Subdomain': subdomain // Pass tenant info in header for testing
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      console.log(`📊 Banking connections status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('Banking connections response:', JSON.stringify(response, null, 2));
        } catch (e) {
          console.log('Response data:', data);
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error(`❌ Banking connections error: ${e.message}`);
      resolve();
    });

    req.end();
  });
}

async function loginAsGlobalAdmin() {
  const loginData = JSON.stringify({
    email: 'admin@finhome360.com',
    password: 'Admin123!@#'
  });

  return new Promise((resolve) => {
    const loginOptions = {
      hostname: 'finhome.samuel-1e5.workers.dev',
      port: 443,
      path: '/api/auth/global-admin/login',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    };

    const req = https.request(loginOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.success && response.data.accessToken) {
            console.log('✅ Global admin authentication successful');
            resolve(response.data.accessToken);
          } else {
            console.log('❌ Global admin authentication failed:', response);
            resolve(null);
          }
        } catch (e) {
          console.log('❌ Auth response parse error:', e.message);
          resolve(null);
        }
      });
    });

    req.on('error', (e) => {
      console.error(`❌ Auth request error: ${e.message}`);
      resolve(null);
    });

    req.write(loginData);
    req.end();
  });
}

testWithTenantUser();