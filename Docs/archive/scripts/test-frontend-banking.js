// Test frontend banking API calls
const https = require('https');

const API_URL = 'https://finhome.samuel-1e5.workers.dev';

// Test banking route - simulating what the frontend would do
function testBankingRoute() {
  const options = {
    hostname: 'finhome.samuel-1e5.workers.dev',
    port: 443,
    path: '/api/banking/connections',
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      // Note: In real frontend, this would include the Authorization header
      // 'Authorization': 'Bearer ' + token
    }
  };

  console.log('Testing banking route:', `${API_URL}/api/banking/connections`);

  const req = https.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('Response body:', data);
      
      try {
        const parsed = JSON.parse(data);
        console.log('Parsed response:', JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log('Could not parse JSON response');
      }
    });
  });

  req.on('error', (e) => {
    console.error(`Request error: ${e.message}`);
  });

  req.end();
}

testBankingRoute();