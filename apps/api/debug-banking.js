// Simple test to debug banking endpoint accessibility
const API_URL = 'https://api.finhome360.com';

// Test the banking endpoints with proper authentication
async function testBankingEndpoints() {
  try {
    // Test the health endpoint first
    console.log('Testing health endpoint...');
    const healthResponse = await fetch(`${API_URL}/`);
    const healthData = await healthResponse.json();
    console.log('Health check:', healthData);

    // Test auth endpoint for comparison (should work)
    console.log('\nTesting auth endpoint for comparison...');
    const authResponse = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: 'test' })
    });
    const authData = await authResponse.json();
    console.log('Auth response:', authResponse.status, authData);

    // Test banking connections without auth (should get 401, not 404)
    console.log('\nTesting banking connections without auth...');
    const noAuthResponse = await fetch(`${API_URL}/api/banking/connections`);
    const noAuthData = await noAuthResponse.json();
    console.log('No auth response:', noAuthResponse.status, noAuthData);

    // Test banking connect endpoint
    console.log('\nTesting banking connect endpoint...');
    const connectResponse = await fetch(`${API_URL}/api/banking/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const connectData = await connectResponse.json();
    console.log('Connect response:', connectResponse.status, connectData);

    // Test with tenant parameter
    console.log('\nTesting banking connections with tenant parameter...');
    const tenantResponse = await fetch(`${API_URL}/api/banking/connections?tenant=theodekunles`);
    const tenantData = await tenantResponse.json();
    console.log('Tenant param response:', tenantResponse.status, tenantData);

  } catch (error) {
    console.error('Error testing endpoints:', error);
  }
}

testBankingEndpoints();