// Minimal Production Global Admin Test
const API_BASE = 'https://api.finhome360.com';

async function testMinimal() {
  try {
    // Test the health endpoint first
    console.log('Testing API base...');
    const healthResponse = await fetch(API_BASE);
    console.log('Health status:', healthResponse.status);
    
    // Test specifically the auth base path
    console.log('Testing auth path...');
    const authResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test', password: 'test' })
    });
    console.log('Auth base status:', authResponse.status);
    
    // Now test the problematic endpoint
    console.log('Testing global admin path...');
    const response = await fetch(`${API_BASE}/api/auth/global-admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@finhome360.com',
        password: 'Admin123!@#'
      })
    });
    
    console.log('Final status:', response.status);
    if (response.status === 404) {
      console.log('Route not found - checking response headers...');
      console.log('Headers:', [...response.headers.entries()]);
    }
    
    const text = await response.text();
    console.log('Response:', text);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testMinimal();