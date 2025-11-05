/**
 * TrueLayer Debug Test Script
 * Tests TrueLayer configuration and connection status
 */

const API_URL = 'https://finhome.samuel-1e5.workers.dev';

async function testTrueLayerConfig() {
  console.log('🔍 Testing TrueLayer Configuration...\n');
  
  try {
    const response = await fetch(`${API_URL}/api/banking/debug`);
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ TrueLayer Config Status:');
      console.log(`   Client ID: ${data.data.config.hasClientId ? '✅ Present' : '❌ Missing'}`);
      console.log(`   Client Secret: ${data.data.config.hasClientSecret ? '✅ Present' : '❌ Missing'}`);
      console.log(`   Redirect URI: ${data.data.config.hasRedirectUri ? '✅ Present' : '❌ Missing'}`);
      console.log(`   Redirect URI Value: ${data.data.config.redirectUri}`);
      console.log(`   TrueLayer Service: ${data.data.trueLayer.initialized ? '✅ Initialized' : '❌ Failed'}`);
      
      if (data.data.trueLayer.error) {
        console.log(`   TrueLayer Error: ❌ ${data.data.trueLayer.error}`);
      }
    } else {
      console.log('❌ Failed to get config:', data.error.message);
    }
  } catch (error) {
    console.log('❌ Error testing config:', error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
}

async function testConnectionStatus(accessToken) {
  console.log('🔍 Testing Connection Status...\n');
  
  try {
    const response = await fetch(`${API_URL}/api/banking/debug/connections`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ Found ${data.data.totalConnections} total connections (${data.data.activeConnections} active)\n`);
      
      data.data.connections.forEach((connection, index) => {
        console.log(`Connection ${index + 1}: ${connection.institutionName}`);
        console.log(`   Status: ${connection.status}`);
        console.log(`   Created: ${new Date(connection.createdAt).toLocaleDateString()}`);
        console.log(`   Last Sync: ${connection.lastSyncAt ? new Date(connection.lastSyncAt).toLocaleString() : 'Never'}`);
        console.log(`   Token Valid: ${connection.tokenStatus.valid ? '✅' : '❌'}`);
        
        if (connection.tokenStatus.expired !== null) {
          console.log(`   Token Expired: ${connection.tokenStatus.expired ? '❌ Yes' : '✅ No'}`);
        }
        
        if (connection.tokenStatus.error) {
          console.log(`   Token Error: ❌ ${connection.tokenStatus.error}`);
        }
        
        console.log(`   Bank Accounts: ${connection.accounts.length}`);
        connection.accounts.forEach((account, accIndex) => {
          console.log(`     Account ${accIndex + 1}: ${account.accountType} (${account.currency})`);
        });
        
        if (connection.lastError) {
          console.log(`   Last Error: ❌ ${connection.lastError}`);
        }
        
        console.log('');
      });
    } else {
      console.log('❌ Failed to get connections:', data.error.message);
    }
  } catch (error) {
    console.log('❌ Error testing connections:', error.message);
  }
}

async function testManualSync(accessToken) {
  console.log('🔍 Testing Manual Sync...\n');
  
  try {
    const response = await fetch(`${API_URL}/api/banking/sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Manual sync initiated successfully');
      console.log(`   Message: ${data.data.message}`);
    } else {
      console.log('❌ Manual sync failed:', data.error.message);
    }
  } catch (error) {
    console.log('❌ Error testing manual sync:', error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
}

async function main() {
  console.log('🚀 TrueLayer Debug Test Started\n');
  console.log('='.repeat(50) + '\n');
  
  // Test 1: Check TrueLayer configuration (no auth required)
  await testTrueLayerConfig();
  
  // For authenticated tests, you'll need to provide an access token
  console.log('📝 For connection and sync tests, you need an access token.');
  console.log('   1. Login to your app');
  console.log('   2. Open browser dev tools');
  console.log('   3. Check localStorage for "accessToken"');
  console.log('   4. Run: node test-truelayer-debug.js <your-access-token>\n');
  
  const accessToken = process.argv[2];
  
  if (accessToken) {
    console.log('🔐 Access token provided, running authenticated tests...\n');
    await testConnectionStatus(accessToken);
    await testManualSync(accessToken);
  }
  
  console.log('✅ Debug test completed!');
}

main().catch(console.error);