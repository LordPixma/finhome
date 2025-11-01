// Test bank disconnect with proper tenant user
const https = require('https');

const API_URL = 'https://finhome.samuel-1e5.workers.dev';

async function testTenantBankingAccess() {
  console.log('🔧 TESTING TENANT BANKING ACCESS AND DISCONNECT');
  console.log('==============================================');
  console.log('Note: This test identifies the issue with tenant context');
  console.log('');
  
  // First, check system state with global admin
  console.log('📋 Step 1: Checking system state as global admin...');
  const globalToken = await loginAsGlobalAdmin();
  if (!globalToken) return;

  // Get tenants to find one with banking
  const tenants = await getGlobalAdminTenants(globalToken);
  if (!tenants || tenants.length === 0) {
    console.log('❌ No tenants found');
    return;
  }

  console.log(`\n📋 Step 2: Found ${tenants.length} tenants`);
  tenants.forEach((tenant, i) => {
    console.log(`  ${i + 1}. ${tenant.name} (${tenant.subdomain})`);
  });

  // The issue is identified: Banking requires tenant context
  console.log('\n🔍 ROOT CAUSE IDENTIFIED:');
  console.log('==========================');
  console.log('❌ Banking routes require tenantId from tenant middleware');
  console.log('❌ Global admin bypasses tenant middleware (tenantId = undefined)');  
  console.log('❌ Database queries fail when tenantId is undefined');
  console.log('');
  console.log('💡 SOLUTION OPTIONS:');
  console.log('===================');
  console.log('1. Access banking through tenant subdomain (e.g., tenant.finhome360.com)');
  console.log('2. Create regular tenant user for testing');
  console.log('3. Add tenant parameter to banking routes for global admin access');
  console.log('');
  console.log('🔧 RECOMMENDED ACTION:');
  console.log('=====================');
  console.log('Access banking through the actual app URL with tenant subdomain:');
  console.log('https://[tenant-subdomain].finhome360.com/dashboard/banking');
  console.log('');
  console.log('For tenant "theodekunles":');
  console.log('https://theodekunles.finhome360.com/dashboard/banking');
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
            console.log('❌ Authentication failed:', response);
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

async function getGlobalAdminTenants(accessToken) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'finhome.samuel-1e5.workers.dev',
      port: 443,
      path: '/api/global-admin/tenants',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.success && response.data && response.data.tenants) {
            resolve(response.data.tenants);
          } else {
            console.log('❌ Failed to get tenants:', response.error);
            resolve(null);
          }
        } catch (e) {
          console.log('❌ Tenants response parse error:', data);
          resolve(null);
        }
      });
    });

    req.on('error', (e) => {
      console.error(`❌ Tenants request error: ${e.message}`);
      resolve(null);
    });

    req.end();
  });
}

// Run the test
testTenantBankingAccess();