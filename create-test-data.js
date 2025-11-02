// Simple test to add some sample transactions for testing bulk operations
const API_URL = 'http://127.0.0.1:8787';

async function createSampleTransactions() {
  try {
    console.log('🔄 Creating sample transactions for bulk operations testing...\n');

    // Wait a bit for the server to be ready
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Login as global admin
    console.log('1. Authenticating...');
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Subdomain': 'demo'
      },
      body: JSON.stringify({
        email: 'admin@finhome360.com',
        password: 'Admin123!'
      })
    });

    const loginResult = await loginResponse.json();
    if (!loginResult.success) {
      console.error('❌ Login failed:', loginResult);
      return;
    }

    const token = loginResult.data.accessToken;
    console.log('✅ Login successful');

    // Get accounts and categories first
    const [accountsRes, categoriesRes] = await Promise.all([
      fetch(`${API_URL}/accounts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Subdomain': 'demo'
        }
      }),
      fetch(`${API_URL}/categories`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Subdomain': 'demo'
        }
      })
    ]);

    const accounts = (await accountsRes.json()).data;
    const categories = (await categoriesRes.json()).data;

    if (!accounts?.length || !categories?.length) {
      console.log('⚠️ No accounts or categories found, bulk operations testing will be limited');
      return;
    }

    console.log(`Found ${accounts.length} accounts and ${categories.length} categories`);

    // Create sample transactions
    const sampleTransactions = [
      { description: 'Grocery Shopping', amount: -85.50, type: 'expense' },
      { description: 'Gas Station', amount: -45.00, type: 'expense' },
      { description: 'Salary Deposit', amount: 3000.00, type: 'income' },
      { description: 'Coffee Shop', amount: -12.99, type: 'expense' },
      { description: 'Online Purchase', amount: -129.99, type: 'expense' },
      { description: 'Restaurant', amount: -67.50, type: 'expense' }
    ];

    console.log('\n2. Creating sample transactions...');
    for (const txn of sampleTransactions) {
      try {
        const response = await fetch(`${API_URL}/transactions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Subdomain': 'demo'
          },
          body: JSON.stringify({
            description: txn.description,
            amount: txn.amount,
            date: new Date().toISOString(),
            type: txn.type,
            accountId: accounts[0].id,
            categoryId: categories[0].id
          })
        });

        const result = await response.json();
        if (result.success) {
          console.log(`✅ Created: ${txn.description} (${txn.amount})`);
        } else {
          console.log(`❌ Failed to create: ${txn.description}`);
        }
      } catch (error) {
        console.log(`❌ Error creating ${txn.description}:`, error.message);
      }
    }

    console.log('\n🎉 Sample transactions created! You can now test bulk operations in the UI.');
    console.log('🌐 Open http://localhost:3000 and navigate to transactions to test:');
    console.log('   • Select transactions with checkboxes');
    console.log('   • Use bulk delete and archive buttons');
    console.log('   • Try the "Clear All Transactions" button');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createSampleTransactions();