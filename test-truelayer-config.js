// Test TrueLayer redirect URI configuration
const https = require('https');

const API_URL = 'https://finhome.samuel-1e5.workers.dev';

// First login to get a valid token, then test banking
function loginAndTestBanking() {
  // Test login first
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

  console.log('Step 1: Logging in to get auth token...');

  const loginReq = https.request(loginOptions, (loginRes) => {
    console.log(`Login Status: ${loginRes.statusCode}`);

    let loginResponseData = '';
    loginRes.on('data', (chunk) => {
      loginResponseData += chunk;
    });

    loginRes.on('end', () => {
      try {
        const loginResponse = JSON.parse(loginResponseData);
        console.log('Login response:', JSON.stringify(loginResponse, null, 2));
        
        if (loginResponse.success && loginResponse.data.accessToken) {
          const accessToken = loginResponse.data.accessToken;
          console.log('\nStep 2: Testing banking connect with valid token...');
          testBankingConnectWithToken(accessToken);
        } else {
          console.log('Login failed:', loginResponse);
        }
      } catch (e) {
        console.log('Could not parse login response:', loginResponseData);
      }
    });
  });

  loginReq.on('error', (e) => {
    console.error(`Login request error: ${e.message}`);
  });

  loginReq.write(loginData);
  loginReq.end();
}

function testBankingConnectWithToken(accessToken) {
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
    console.log(`Banking Connect Status: ${res.statusCode}`);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('Banking Connect Response:', data);
      
      try {
        const parsed = JSON.parse(data);
        console.log('Parsed response:', JSON.stringify(parsed, null, 2));
        
        if (parsed.data && parsed.data.authUrl) {
          console.log('\n=== AUTHORIZATION URL ===');
          console.log(parsed.data.authUrl);
          
          // Extract redirect_uri parameter
          const url = new URL(parsed.data.authUrl);
          const redirectUri = url.searchParams.get('redirect_uri');
          console.log('\n=== REDIRECT URI ===');
          console.log(redirectUri);
          
          console.log('\n=== IMPORTANT ===');
          console.log('Make sure this redirect URI is configured in your TrueLayer console:');
          console.log(redirectUri);
        }
      } catch (e) {
        console.log('Could not parse JSON response');
      }
    });
  });

  req.on('error', (e) => {
    console.error(`Banking request error: ${e.message}`);
  });

  req.end();
}

loginAndTestBanking();