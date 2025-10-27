const API_BASE = 'https://api.finhome360.com';

async function fixGlobalAdminInProduction() {
  try {
    console.log('🔧 Fixing Global Admin in Production Database...\n');
    
    // We'll need to use the Cloudflare D1 HTTP API directly
    // For now, let's check if we can hit a debug endpoint we can create
    
    console.log('Method 1: Try creating a debug endpoint in the API to fix the database');
    console.log('We need to add a temporary endpoint to fix the global admin user');
    
    // Create a test request to see current user status
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@finhome360.com',
        password: 'Admin123!@#'
      })
    });
    
    const data = await response.json();
    console.log('Current login response:', JSON.stringify(data, null, 2));
    
    // The issue is that the user doesn't have isGlobalAdmin flag
    console.log('\n🎯 Issue identified:');
    console.log('- User exists but isGlobalAdmin flag is not being included in JWT');
    console.log('- Either the database field is not set to 1, or the auth code is not using it');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixGlobalAdminInProduction();