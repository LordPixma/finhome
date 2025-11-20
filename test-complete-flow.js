// Test complete admin flow
async function testCompleteFlow() {
  console.log('🧪 Testing Complete Admin Flow\n');
  
  // Step 1: Login
  console.log('1️⃣ Logging in...');
  const loginRes = await fetch('https://api.finhome360.com/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test123@example.com', 
      password: 'TestPass123!'
    })
  });
  
  const login = await loginRes.json();
  if (!login.success) {
    console.log('❌ Login failed:', login.error);
    return;
  }
  
  console.log('✅ Login successful');
  console.log(`   User: ${login.data.user.name}`);
  console.log(`   Global Admin: ${login.data.user.isGlobalAdmin}`);
  
  // Step 2: Fetch Users (what the frontend does)
  console.log('\n2️⃣ Fetching users...');
  const usersRes = await fetch('https://api.finhome360.com/api/admin/users', {
    headers: {
      'Authorization': `Bearer ${login.data.accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  const usersData = await usersRes.json();
  if (!usersData.success) {
    console.log('❌ Users fetch failed:', usersData.error);
    return;
  }
  
  // Step 3: Process Users (what frontend does)
  console.log('✅ Users fetched successfully');
  const users = usersData.data?.users || [];
  console.log(`   Total users available: ${users.length}`);
  
  // Step 4: Calculate Statistics (what frontend displays)
  console.log('\n3️⃣ Calculating statistics...');
  const stats = {
    total: users.length,
    active: users.filter(u => (u.status || 'active') === 'active').length,
    admins: users.filter(u => u.role === 'admin' || u.isGlobalAdmin).length,
    mfaEnabled: users.filter(u => u.mfaEnabled || false).length,
    noMFA: users.filter(u => !(u.mfaEnabled || false)).length
  };
  
  console.log('📊 Statistics:');
  console.log(`   Total Users: ${stats.total}`);
  console.log(`   Active: ${stats.active}`);
  console.log(`   Admins: ${stats.admins}`);
  console.log(`   MFA Enabled: ${stats.mfaEnabled}`);
  console.log(`   No MFA: ${stats.noMFA}`);
  
  // Step 5: Display Sample Users
  console.log('\n4️⃣ Sample users:');
  users.slice(0, 3).forEach((user, index) => {
    console.log(`   ${index + 1}. ${user.name} (${user.email})`);
    console.log(`      Role: ${user.role} | Tenant: ${user.tenantName}`);
    console.log(`      Status: ${user.status || 'active'} | MFA: ${user.mfaEnabled ? 'Yes' : 'No'}`);
  });
  
  console.log('\n🎉 Complete flow test successful!');
  console.log('💡 The admin interface should now display all users correctly.');
}

testCompleteFlow().catch(console.error);