/**
 * TrueLayer Analysis Script
 * Analyzes potential TrueLayer issues based on common patterns
 */

const API_URL = 'https://finhome.samuel-1e5.workers.dev';

console.log('🔍 TrueLayer Issue Analysis\n');
console.log('Based on the codebase review, here are the most likely issues:\n');

console.log('1. TOKEN EXPIRATION (Most Common)');
console.log('   - TrueLayer access tokens expire after 1 hour');
console.log('   - Refresh tokens can become invalid');
console.log('   - Solution: Reconnect bank accounts\n');

console.log('2. TRUELAYER API ENDPOINTS');
console.log('   - Using: https://api.truelayer.com/data/v1/');
console.log('   - Auth: https://auth.truelayer.com');
console.log('   - These endpoints might have changed\n');

console.log('3. CONFIGURATION CHECK');
console.log('   From wrangler.toml:');
console.log('   - Client ID: finhome360-366caa');
console.log('   - Redirect URI: https://finhome.samuel-1e5.workers.dev/api/banking/callback');
console.log('   - Using workers.dev domain due to custom domain issues\n');

console.log('4. BANKING INTEGRATION FLOW:');
console.log('   ✅ User connects bank → TrueLayer OAuth');
console.log('   ✅ Callback creates connection + bank accounts');
console.log('   ✅ Auto-sync triggered after connection');
console.log('   ❓ Manual sync via sync buttons');
console.log('   ❓ Scheduled sync every 4 hours\n');

console.log('5. SYNC SERVICE DETAILS:');
console.log('   - Fetches last 90 days of transactions');
console.log('   - Skips existing transactions (based on providerTransactionId)');  
console.log('   - Auto-categorizes imported transactions');
console.log('   - Updates account balances\n');

console.log('6. POTENTIAL ISSUES:');
console.log('   🔴 Token expired/revoked');
console.log('   🔴 TrueLayer service down');
console.log('   🔴 Bank provider blocking requests');
console.log('   🔴 Rate limiting from TrueLayer');
console.log('   🔴 Consent expired (90 day limit)');
console.log('   🔴 Configuration mismatch\n');

console.log('7. DEBUGGING STEPS:');
console.log('   1. Check if you have any bank connections in the dashboard');
console.log('   2. Try connecting a new bank account');
console.log('   3. Check browser dev tools for errors during connection');
console.log('   4. Try the manual sync button');
console.log('   5. Check if transactions exist but are not showing\n');

console.log('8. QUICK TESTS:');
console.log('   Test basic API: https://finhome.samuel-1e5.workers.dev/api/banking/test');

// Test the basic endpoint
async function testBasicEndpoint() {
  try {
    const response = await fetch(`${API_URL}/api/banking/test`);
    const data = await response.json();
    
    if (data.success) {
      console.log('   ✅ Banking API routes are working');
    } else {
      console.log('   ❌ Banking API routes failing');
    }
  } catch (error) {
    console.log('   ❌ Cannot reach banking API');
  }
}

testBasicEndpoint().then(() => {
  console.log('\n9. NEXT STEPS:');
  console.log('   - If no bank connections exist: Try connecting a bank');
  console.log('   - If connections exist but no transactions: Check token validity');
  console.log('   - If recent connections: May need to wait for sync');
  console.log('   - Check TrueLayer dashboard for any service issues');
  console.log('\n📝 Once debug endpoint is working, run:');
  console.log('   node test-truelayer-debug.js <access-token>');
});