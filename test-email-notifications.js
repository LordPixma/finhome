// Test script for email notifications
// Run with: node test-email-notifications.js

const API_URL = 'https://finhome-api.samuel-1e5.workers.dev';

async function testWelcomeEmail() {
  console.log('🧪 Testing welcome email on user registration...');
  
  const testUser = {
    tenantName: 'Verified Domain Test',
    subdomain: 'verified' + Date.now(),
    email: 'samuel@lgger.com', // Use your email to actually receive it
    name: 'Verified Domain User',
    password: 'testpass123'
  };

  try {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser)
    });

    const result = await response.json();
    
    console.log('📧 Registration Response:', {
      success: result.success,
      status: response.status,
      userEmail: testUser.email,
      timestamp: new Date().toISOString()
    });

    if (result.success) {
      console.log('✅ Registration successful! Check your email for welcome message.');
      console.log('📋 Account details:', {
        tenantName: result.data.tenant.name,
        subdomain: result.data.tenant.subdomain,
        loginUrl: result.data.tenant.url
      });
    } else {
      console.error('❌ Registration failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function testMemberInvitation() {
  console.log('🧪 Testing member invitation email...');
  
  // First, you need to log in to get an access token
  console.log('⚠️ This test requires manual setup - you need to:');
  console.log('1. Log in to get an access token');
  console.log('2. Use that token to test member invitation');
  console.log('3. Or test through the frontend interface');
}

// Run the tests
async function runTests() {
  console.log('🚀 Starting Email Notification Tests\n');
  
  await testWelcomeEmail();
  console.log('\n---\n');
  await testMemberInvitation();
  
  console.log('\n🎉 Tests completed!');
  console.log('💡 Check your email inbox (and spam folder) for test emails.');
}

runTests();