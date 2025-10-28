const API_BASE = 'https://api.finhome360.com';

async function testDebugEndpoint() {
  try {
    // Test the root API first
    console.log('Testing API root...');
    const rootResponse = await fetch(`${API_BASE}/`);
    const rootData = await rootResponse.json();
    console.log('Root:', rootData);
    
    // Test auth endpoint structure
    console.log('\nTesting auth login (known working)...');
    const loginTest = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test', password: 'test' })
    });
    console.log('Login test status:', loginTest.status);
    
    // Test our debug endpoint
    console.log('\nTesting debug endpoint...');
    const debugResponse = await fetch(`${API_BASE}/api/auth/debug/fix-global-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secretKey: 'test' })
    });
    
    console.log('Debug endpoint status:', debugResponse.status);
    const debugData = await debugResponse.json();
    console.log('Debug response:', debugData);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testDebugEndpoint();