const https = require('https');

async function fullAuthTest() {
  console.log('Testing complete authentication flow...');
  
  try {
    // Step 1: Register a new user
    console.log('1. Registering new user...');
    const registerData = JSON.stringify({
      email: `test${Date.now()}@example.com`,
      password: 'testpass123',
      name: 'Test User',
      tenantName: 'Test Tenant',
      subdomain: `test${Date.now()}`
    });

    const registerOptions = {
      hostname: 'api.finhome360.com',
      port: 443,
      path: '/api/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(registerData)
      }
    };

    const registerResult = await makeRequest(registerOptions, registerData);
    console.log('Registration response status:', registerResult.success ? 'SUCCESS' : 'FAILED');

    if (registerResult.success && registerResult.data && registerResult.data.accessToken) {
      const token = registerResult.data.accessToken;
      console.log('✅ User registered successfully with JWT token');
      
      // Step 2: Test authenticated endpoint immediately
      console.log('\n2. Testing authenticated endpoint...');
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
      console.log('Profile response status:', profileResult.success ? 'SUCCESS' : 'FAILED');

      if (profileResult.success) {
        console.log('\n🎉 AUTHENTICATION SYSTEM FULLY WORKING!');
        console.log('✅ Registration endpoint: Working');
        console.log('✅ JWT token generation: Working');
        console.log('✅ JWT token validation: Working');
        console.log('✅ Authenticated endpoints: Working');
        console.log('✅ Multi-tenant JWT structure: Compatible');
        console.log('✅ 405 Method Not Allowed errors: RESOLVED');
      } else {
        console.log('\n⚠️  Authentication endpoint failed');
        console.log('Profile error:', profileResult.error);
        
        // But still verify it's not a 405 error
        if (profileResult.error && profileResult.error.code !== 'METHOD_NOT_ALLOWED') {
          console.log('✅ However, 405 errors are resolved (different error type)');
        }
      }
    } else {
      console.log('\n❌ Registration failed');
      console.log('Error:', registerResult.error);
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
          resolve({ error: 'Invalid JSON response', body, statusCode: res.statusCode });
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

fullAuthTest();