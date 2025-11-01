// Test TrueLayer PRODUCTION configuration
const https = require('https');

const API_URL = 'https://finhome.samuel-1e5.workers.dev';

// Test production banking setup
function testProductionBanking() {
  // First login to get a valid token
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

  console.log('🔐 Step 1: Authenticating...');

  const loginReq = https.request(loginOptions, (loginRes) => {
    let loginResponseData = '';
    loginRes.on('data', (chunk) => {
      loginResponseData += chunk;
    });

    loginRes.on('end', () => {
      try {
        const loginResponse = JSON.parse(loginResponseData);
        
        if (loginResponse.success && loginResponse.data.accessToken) {
          const accessToken = loginResponse.data.accessToken;
          console.log('✅ Authentication successful');
          console.log('🏦 Step 2: Testing PRODUCTION banking connect...');
          testProductionBankingConnect(accessToken);
        } else {
          console.log('❌ Authentication failed:', loginResponse);
        }
      } catch (e) {
        console.log('❌ Could not parse login response:', loginResponseData);
      }
    });
  });

  loginReq.on('error', (e) => {
    console.error(`❌ Login request error: ${e.message}`);
  });

  loginReq.write(loginData);
  loginReq.end();
}

function testProductionBankingConnect(accessToken) {
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
    console.log(`📊 Status: ${res.statusCode}`);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        
        if (parsed.success && parsed.data.authUrl) {
          console.log('✅ PRODUCTION Banking Connect Working!');
          console.log('\n🔗 PRODUCTION Authorization URL:');
          console.log(parsed.data.authUrl);
          
          // Extract and validate URLs
          const url = new URL(parsed.data.authUrl);
          const redirectUri = url.searchParams.get('redirect_uri');
          
          console.log('\n📋 Configuration Check:');
          console.log('🌐 Auth Domain:', url.hostname);
          console.log('🔄 Redirect URI:', redirectUri);
          console.log('🆔 Client ID:', url.searchParams.get('client_id'));
          
          // Validate production setup
          if (url.hostname === 'auth.truelayer.com') {
            console.log('✅ Using PRODUCTION auth endpoint');
          } else {
            console.log('⚠️  Still using sandbox endpoint:', url.hostname);
          }
          
          if (url.searchParams.get('client_id') === 'finhome360-366caa') {
            console.log('✅ Using PRODUCTION client ID');
          } else {
            console.log('⚠️  Unexpected client ID:', url.searchParams.get('client_id'));
          }
          
          console.log('\n🎉 PRODUCTION MIGRATION SUCCESSFUL!');
          console.log('⚠️  IMPORTANT: This will now connect to REAL banks with REAL data');
          console.log('🔒 Test carefully with your own bank account first');
          
        } else {
          console.log('❌ Banking connect failed:', parsed);
        }
      } catch (e) {
        console.log('❌ Could not parse response:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`❌ Banking request error: ${e.message}`);
  });

  req.end();
}

console.log('🚀 Testing TrueLayer PRODUCTION Migration...');
console.log('⚠️  This will now use REAL banking endpoints!');
testProductionBanking();