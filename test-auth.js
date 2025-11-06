const https = require('https');

// Test authentication with a valid user
async function testAuth() {
  console.log('Testing production API authentication...');
  
  try {
    // First test login with a real user
    const loginData = JSON.stringify({
      email: 'samuel.odekunle@gmail.com',
      password: 'samuel123'
    });

    const loginOptions = {
      hostname: 'api.finhome360.com',
      port: 443,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    };

    console.log('1. Testing login...');
    const loginResult = await makeRequest(loginOptions, loginData);
    console.log('Login response:', JSON.stringify(loginResult, null, 2));

    if (loginResult.success && loginResult.data && loginResult.data.accessToken) {
      const token = loginResult.data.accessToken;
      console.log('\n2. Testing authenticated endpoint with token...');
      
      // Test an authenticated endpoint
      const authOptions = {
        hostname: 'api.finhome360.com',
        port: 443,
        path: '/api/profile',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      const profileResult = await makeRequest(authOptions);
      console.log('Profile response:', JSON.stringify(profileResult, null, 2));

      if (profileResult.success) {
        console.log('\n✅ Authentication working correctly!');
        console.log('JWT authentication fix has resolved the 405 errors.');
      } else {
        console.log('\n❌ Authentication failed');
        console.log('Error:', profileResult.error);
      }
    } else {
      console.log('\n❌ Login failed');
      console.log('Error:', loginResult.error);
    }

  } catch (error) {
    console.error('Test error:', error);
  }
}

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve(result);
        } catch (e) {
          resolve({ error: 'Invalid JSON response', body });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

testAuth();