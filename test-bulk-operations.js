const API_URL = 'http://127.0.0.1:8787';

// First, let's get a valid token by authenticating as a global admin
async function testBulkOperations() {
  try {
    console.log('🔑 Testing bulk operations...\n');

    // Login as global admin
    console.log('1. Authenticating as global admin...');
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
    console.log('Login result:', loginResult);

    if (!loginResult.success) {
      console.error('❌ Login failed');
      return;
    }

    const token = loginResult.data.accessToken;
    console.log('✅ Login successful\n');

    // Get current transactions
    console.log('2. Getting current transactions...');
    const transactionsResponse = await fetch(`${API_URL}/transactions`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Subdomain': 'demo'
      }
    });

    const transactionsResult = await transactionsResponse.json();
    console.log('Transactions:', transactionsResult);

    if (!transactionsResult.success) {
      console.log('⚠️ No transactions found or error occurred');
      return;
    }

    const transactions = transactionsResult.data;
    console.log(`✅ Found ${transactions.length} transactions\n`);

    if (transactions.length === 0) {
      console.log('🤷 No transactions to test bulk operations with');
      return;
    }

    // Test bulk archive with first 2 transactions
    const firstTwoIds = transactions.slice(0, 2).map(t => t.id);
    if (firstTwoIds.length > 0) {
      console.log('3. Testing bulk archive...');
      const archiveResponse = await fetch(`${API_URL}/transactions/bulk/archive`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Subdomain': 'demo'
        },
        body: JSON.stringify({
          transactionIds: firstTwoIds
        })
      });

      const archiveResult = await archiveResponse.json();
      console.log('Archive result:', archiveResult);
      
      if (archiveResult.success) {
        console.log(`✅ Successfully archived ${archiveResult.data.archivedCount} transactions\n`);
      } else {
        console.log('❌ Archive failed\n');
      }
    }

    // Test bulk delete with next 2 transactions
    const nextTwoIds = transactions.slice(2, 4).map(t => t.id);
    if (nextTwoIds.length > 0) {
      console.log('4. Testing bulk delete...');
      const deleteResponse = await fetch(`${API_URL}/transactions/bulk`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Subdomain': 'demo'
        },
        body: JSON.stringify({
          transactionIds: nextTwoIds
        })
      });

      const deleteResult = await deleteResponse.json();
      console.log('Delete result:', deleteResult);
      
      if (deleteResult.success) {
        console.log(`✅ Successfully deleted ${deleteResult.data.deletedCount} transactions\n`);
      } else {
        console.log('❌ Delete failed\n');
      }
    }

    // Test clear all (with confirmation)
    console.log('5. Testing clear all transactions (with confirmation)...');
    const clearResponse = await fetch(`${API_URL}/transactions/clear`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Subdomain': 'demo'
      },
      body: JSON.stringify({
        confirm: 'DELETE_ALL_TRANSACTIONS'
      })
    });

    const clearResult = await clearResponse.json();
    console.log('Clear all result:', clearResult);
    
    if (clearResult.success) {
      console.log(`✅ Successfully cleared ${clearResult.data.deletedCount} transactions\n`);
    } else {
      console.log('❌ Clear all failed\n');
    }

    console.log('🎉 Bulk operations test completed!');

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testBulkOperations();