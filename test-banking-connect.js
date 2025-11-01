// Test banking authorization URL generation
const https = require('https');

const API_URL = 'https://finhome.samuel-1e5.workers.dev';

// Test banking connect route to see what redirect URL is generated
function testBankingConnect() {
  const options = {
    hostname: 'finhome.samuel-1e5.workers.dev',
    port: 443,
    path: '/api/banking/connect',
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      // Using a test token - in real scenario this would be a valid JWT
      'Authorization': 'Bearer test-token-for-debugging'
    }
  };

  console.log('Testing banking connect route:', `${API_URL}/api/banking/connect`);

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
        
        if (parsed.data && parsed.data.authUrl) {
          console.log('\n=== AUTHORIZATION URL ===');
          console.log(parsed.data.authUrl);
          
          // Extract redirect_uri parameter
          const url = new URL(parsed.data.authUrl);
          const redirectUri = url.searchParams.get('redirect_uri');
          console.log('\n=== REDIRECT URI ===');
          console.log(redirectUri);
        }
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

testBankingConnect();