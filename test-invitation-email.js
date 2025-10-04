// Test script specifically for member invitation emails
const API_URL = 'https://finhome-api.samuel-1e5.workers.dev';

async function registerAndLogin() {
  console.log('🔧 Setting up test account for invitation testing...');
  
  const testTenant = {
    tenantName: 'Invitation Test Family',
    subdomain: 'invitetest' + Date.now(),
    email: 'admin' + Date.now() + '@example.com',
    name: 'Admin User',
    password: 'testpass123'
  };

  try {
    // Register new tenant
    const registerResponse = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testTenant)
    });

    const registerResult = await registerResponse.json();
    
    if (!registerResult.success) {
      console.error('❌ Registration failed:', registerResult.error);
      return null;
    }

    console.log('✅ Test tenant registered:', testTenant.subdomain);
    console.log('🔑 Access token obtained');
    
    return {
      accessToken: registerResult.data.accessToken,
      tenant: registerResult.data.tenant,
      user: registerResult.data.user
    };

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    return null;
  }
}

async function testMemberInvitation(authData) {
  console.log('\n🧪 Testing member invitation email...');
  
  const invitationData = {
    name: 'Invited Family Member',
    email: 'samuel@lgger.com', // Your email to actually receive the invitation
    role: 'member'
  };

  try {
    const response = await fetch(`${API_URL}/api/tenant-members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.accessToken}`
      },
      body: JSON.stringify(invitationData)
    });

    const result = await response.json();
    
    console.log('📧 Invitation Response:', {
      success: result.success,
      status: response.status,
      inviteeEmail: invitationData.email,
      timestamp: new Date().toISOString()
    });

    if (result.success) {
      console.log('✅ Member invitation sent successfully!');
      console.log('📋 Invitation details:', {
        inviterName: authData.user.name,
        tenantName: authData.tenant.name,
        inviteeName: invitationData.name,
        role: invitationData.role
      });
      console.log('📧 Check your email for the invitation!');
    } else {
      console.error('❌ Invitation failed:', result.error);
    }

    return result.success;

  } catch (error) {
    console.error('❌ Invitation test failed:', error.message);
    return false;
  }
}

async function runInvitationTest() {
  console.log('🚀 Starting Member Invitation Email Test\n');
  
  // Step 1: Create test tenant and login
  const authData = await registerAndLogin();
  if (!authData) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }

  // Step 2: Test member invitation
  const invitationSent = await testMemberInvitation(authData);
  
  console.log('\n🎉 Test completed!');
  if (invitationSent) {
    console.log('✅ Member invitation email should be delivered');
    console.log('💡 Check your email inbox (and spam folder)');
  } else {
    console.log('❌ Member invitation failed - check logs for details');
  }
}

runInvitationTest();