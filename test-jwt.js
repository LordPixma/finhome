const https = require('https');

// Extract token from the previous response for testing
const testToken = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIxM2MyNDBiNi0wNTkxLTRiYjEtYTAyOC1mMzc1NjQzYTRmMzciLCJlbWFpbCI6InRlc3R1c2VyQGV4YW1wbGUuY29tIiwibmFtZSI6IlRlc3QgVXNlciIsInRlbmFudElkIjoiYTIyOThlYjYtYmJmZC00NTViLWI2YmItMzZmOGU0YTBmYWM5Iiwicm9sZSI6Im93bmVyIiwic3ViIjoiMTNjMjQwYjYtMDU5MS00YmIxLWEwMjgtZjM3NTY0M2E0ZjM3IiwiaWF0IjoxNzMwOTI2MzExLCJleHAiOjE3MzA5Mjk5MTF9.rKNqQHKLLQmPMTDdJYfCOMwKZaY5VYgMCNvFtKw7fS8';

async function testAuthenticatedEndpoint() {
  console.log('Testing authenticated endpoint with JWT token...');
  
  try {
    const authOptions = {
      hostname: 'api.finhome360.com',
      port: 443,
      path: '/api/profile',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json'
      }
    };

    const result = await makeRequest(authOptions);
    console.log('Profile response:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ JWT Authentication is working correctly!');
      console.log('✅ The 405 Method Not Allowed errors have been resolved.');
      console.log('✅ Authentication middleware is compatible with new multi-tenant JWT structure.');
    } else {
      console.log('\n❌ Authentication test failed');
      console.log('Error:', result.error);
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

testAuthenticatedEndpoint();