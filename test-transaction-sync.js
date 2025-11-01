// Test complete transaction sync system
const https = require('https');

const API_URL = 'https://finhome.samuel-1e5.workers.dev';

async function testTransactionSync() {
  console.log('🔄 TESTING COMPLETE TRANSACTION SYNC SYSTEM');
  console.log('===========================================');
  
  // Step 1: Login
  console.log('\n📋 Step 1: Authenticating...');
  const accessToken = await loginAsGlobalAdmin();
  if (!accessToken) return;

  // Step 2: Test manual sync trigger
  console.log('\n📋 Step 2: Testing manual transaction sync...');
  await testManualSync(accessToken);

  // Step 3: Check transactions endpoint
  console.log('\n📋 Step 3: Checking transactions endpoint...');
  await checkTransactions(accessToken);

  console.log('\n🎉 Transaction sync system test completed!');
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

function testManualSync(accessToken) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'finhome.samuel-1e5.workers.dev',
      port: 443,
      path: '/api/banking/sync',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    };

    console.log('🔄 Triggering manual transaction sync...');

    const req = https.request(options, (res) => {
      console.log(`📊 Sync Response Status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.success) {
            console.log('✅ Manual sync triggered successfully');
            console.log('💡 Message:', response.data.message);
          } else {
            console.log('❌ Manual sync failed:', response.error);
          }
        } catch (e) {
          console.log('❌ Sync response parse error:', data);
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error(`❌ Sync request error: ${e.message}`);
      resolve();
    });

    req.end();
  });
}

function checkTransactions(accessToken) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'finhome.samuel-1e5.workers.dev',
      port: 443,
      path: '/api/transactions',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    };

    console.log('📋 Checking transactions...');

    const req = https.request(options, (res) => {
      console.log(`📊 Transactions Response Status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.success && response.data) {
            console.log('✅ Transactions endpoint working');
            console.log(`📊 Found ${response.data.length} transactions`);
            
            // Show recent transactions
            const recentTransactions = response.data
              .filter(t => t.providerTransactionId) // Only bank transactions
              .slice(0, 3);
              
            if (recentTransactions.length > 0) {
              console.log('\n💰 Recent Bank Transactions:');
              recentTransactions.forEach(t => {
                console.log(`  - ${t.description}: $${t.amount} (${t.type})`);
              });
            } else {
              console.log('ℹ️  No bank transactions found yet (sync may still be processing)');
            }
          } else {
            console.log('❌ Transactions check failed:', response.error);
          }
        } catch (e) {
          console.log('❌ Transactions response parse error:', data);
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error(`❌ Transactions request error: ${e.message}`);
      resolve();
    });

    req.end();
  });
}

// Run the test
testTransactionSync();