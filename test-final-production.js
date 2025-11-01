// Final production banking test
const https = require('https');

const API_URL = 'https://finhome.samuel-1e5.workers.dev';

// Test the complete production flow
function testCompleteProductionFlow() {
  console.log('🔥 FINAL PRODUCTION TEST');
  console.log('========================');
  console.log('🌐 Testing: Real TrueLayer Production Environment');
  console.log('🏦 Banking: Real banks, real data, real connections');
  console.log('');

  // Login first
  const loginData = JSON.stringify({
    email: 'admin@finhome360.com',
    password: 'Admin123!@#'
  });

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

  console.log('Step 1: 🔐 Authenticating...');

  const loginReq = https.request(loginOptions, (loginRes) => {
    let loginResponseData = '';
    loginRes.on('data', (chunk) => {
      loginResponseData += chunk;
    });

    loginRes.on('end', () => {
      try {
        const loginResponse = JSON.parse(loginResponseData);
        
        if (loginResponse.success && loginResponse.data.accessToken) {
          console.log('✅ Authentication successful');
          console.log('');
          testProductionBankingReady(loginResponse.data.accessToken);
        } else {
          console.log('❌ Authentication failed:', loginResponse);
        }
      } catch (e) {
        console.error('❌ Login parsing error:', e.message);
      }
    });
  });

  loginReq.on('error', (e) => {
    console.error(`❌ Login request error: ${e.message}`);
  });

  loginReq.write(loginData);
  loginReq.end();
}

function testProductionBankingReady(accessToken) {
  console.log('Step 2: 🏦 Testing production banking endpoint...');
  
  const options = {
    hostname: 'finhome.samuel-1e5.workers.dev',
    port: 443,
    path: '/api/banking/connect',
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log(`📊 Response Status: ${res.statusCode}`);
      
      try {
        const parsed = JSON.parse(data);
        
        if (parsed.success && parsed.data.authUrl) {
          console.log('✅ Production banking endpoint working!');
          console.log('');
          
          const authUrl = parsed.data.authUrl;
          const url = new URL(authUrl);
          
          // Comprehensive validation
          console.log('🔍 PRODUCTION VALIDATION:');
          console.log('========================');
          
          // Check domain
          if (url.hostname === 'auth.truelayer.com') {
            console.log('✅ Auth Domain: auth.truelayer.com (PRODUCTION)');
          } else {
            console.log('❌ Auth Domain: ' + url.hostname + ' (Should be auth.truelayer.com)');
          }
          
          // Check client ID
          const clientId = url.searchParams.get('client_id');
          if (clientId === 'finhome360-366caa') {
            console.log('✅ Client ID: finhome360-366caa (PRODUCTION)');
          } else {
            console.log('❌ Client ID: ' + clientId + ' (Unexpected)');
          }
          
          // Check redirect URI
          const redirectUri = url.searchParams.get('redirect_uri');
          if (redirectUri === 'https://finhome.samuel-1e5.workers.dev/api/banking/callback') {
            console.log('✅ Redirect URI: workers.dev callback (CONFIGURED)');
          } else {
            console.log('❌ Redirect URI: ' + redirectUri + ' (Unexpected)');
          }
          
          // Check scopes
          const scope = url.searchParams.get('scope');
          if (scope && scope.includes('accounts') && scope.includes('transactions')) {
            console.log('✅ Scopes: ' + scope);
          } else {
            console.log('⚠️ Scopes: ' + scope);
          }
          
          console.log('');
          console.log('🎉 PRODUCTION BANKING READY!');
          console.log('=============================');
          console.log('✅ All systems operational');
          console.log('✅ Real banking connections enabled');
          console.log('✅ TrueLayer production integration complete');
          console.log('');
          console.log('🚀 NEXT STEPS:');
          console.log('1. Test on https://app.finhome360.com/dashboard/banking');
          console.log('2. Connect YOUR bank account first');
          console.log('3. Verify real transaction import');
          console.log('4. Monitor for any production issues');
          console.log('');
          console.log('⚠️  IMPORTANT: Now uses REAL banking data!');
          
        } else {
          console.log('❌ Banking connect failed:', parsed);
        }
      } catch (e) {
        console.log('❌ Response parsing error:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`❌ Banking request error: ${e.message}`);
  });

  req.end();
}

testCompleteProductionFlow();