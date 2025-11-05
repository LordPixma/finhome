// Test bank disconnect functionality
const https = require('https');

const API_URL = 'https://finhome.samuel-1e5.workers.dev';

async function testBankDisconnect() {
  console.log('🔧 TESTING BANK DISCONNECT FUNCTIONALITY');
  console.log('=======================================');
  
  // Step 1: Login
  console.log('\n📋 Step 1: Authenticating...');
  const accessToken = await loginAsGlobalAdmin();
  if (!accessToken) return;

  // Step 2: Get bank connections
  console.log('\n📋 Step 2: Getting bank connections...');
  const connections = await getBankConnections(accessToken);
  if (!connections || connections.length === 0) {
    console.log('❌ No bank connections found to test disconnect');
    return;
  }

  // Step 3: Test disconnect API
  const connection = connections[0];
  console.log(`\n📋 Step 3: Testing disconnect for: ${connection.institutionName} (${connection.id})`);
  await testDisconnectAPI(accessToken, connection.id, connection.institutionName);

  console.log('\n🎉 Bank disconnect test completed!');
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
            console.log('✅ Authentication successful');
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

async function getBankConnections(accessToken) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'finhome.samuel-1e5.workers.dev',
      port: 443,
      path: '/api/banking/connections',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    };

    console.log('🔍 Fetching bank connections...');

    const req = https.request(options, (res) => {
      console.log(`📊 Connections Response Status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.success && response.data) {
            console.log(`✅ Found ${response.data.length} bank connections`);
            response.data.forEach((conn, i) => {
              console.log(`  ${i + 1}. ${conn.institutionName} (${conn.status}) - ID: ${conn.id}`);
            });
            resolve(response.data);
          } else {
            console.log('❌ Failed to get connections:', response.error);
            resolve(null);
          }
        } catch (e) {
          console.log('❌ Connections response parse error:', data);
          resolve(null);
        }
      });
    });

    req.on('error', (e) => {
      console.error(`❌ Connections request error: ${e.message}`);
      resolve(null);
    });

    req.end();
  });
}

async function testDisconnectAPI(accessToken, connectionId, institutionName) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'finhome.samuel-1e5.workers.dev',
      port: 443,
      path: `/api/banking/connections/${connectionId}`,
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    };

    console.log(`🔌 Disconnecting ${institutionName}...`);
    console.log(`📍 DELETE ${API_URL}/api/banking/connections/${connectionId}`);

    const req = https.request(options, (res) => {
      console.log(`📊 Disconnect Response Status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('📋 Disconnect Response:', JSON.stringify(response, null, 2));
          
          if (response.success) {
            console.log(`✅ ${institutionName} disconnected successfully`);
            console.log('💡 Message:', response.data.message);
          } else {
            console.log(`❌ Failed to disconnect ${institutionName}:`);
            console.log('   Error Code:', response.error.code);
            console.log('   Error Message:', response.error.message);
          }
        } catch (e) {
          console.log('❌ Disconnect response parse error:', data);
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error(`❌ Disconnect request error: ${e.message}`);
      resolve();
    });

    req.end();
  });
}

// Run the test
testBankDisconnect();