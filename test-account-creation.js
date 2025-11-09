// Test account creation on production
const PRODUCTION_URL = 'https://samuel.finhome360.com';

async function testAccountCreation() {
  try {
    // First, login to get a token
    console.log('1. Logging in...');
    const loginResponse = await fetch(`${PRODUCTION_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'admin123',
      }),
    });

    const loginData = await loginResponse.json();
    console.log('Login response:', JSON.stringify(loginData, null, 2));

    if (!loginData.success) {
      throw new Error('Login failed');
    }

    const token = loginData.data.accessToken;

    // Now try to create an account
    console.log('\n2. Creating account...');
    const accountData = {
      name: 'Test Savings Account',
      type: 'savings',
      balance: 1000,
      currency: 'GBP',
    };

    console.log('Account data:', JSON.stringify(accountData, null, 2));

    const createResponse = await fetch(`${PRODUCTION_URL}/api/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(accountData),
    });

    const createData = await createResponse.json();
    console.log('Create response status:', createResponse.status);
    console.log('Create response:', JSON.stringify(createData, null, 2));

    if (!createData.success) {
      console.error('\n❌ Account creation failed!');
      console.error('Error:', createData.error);
    } else {
      console.log('\n✅ Account created successfully!');
    }
  } catch (error) {
    console.error('Test failed:', error.message);
    console.error(error);
  }
}

testAccountCreation();
