// Debug disconnect button issue
// Let's check if there are any JavaScript console errors in the frontend

console.log('🔧 DEBUGGING DISCONNECT BUTTON ISSUE');
console.log('====================================');
console.log('');

console.log('📋 DIAGNOSTIC STEPS:');
console.log('====================');
console.log('1. Open browser developer tools (F12)');
console.log('2. Go to: https://app.finhome360.com/dashboard/banking');
console.log('3. Check Console tab for any JavaScript errors');
console.log('4. Check Network tab when clicking disconnect button');
console.log('5. Look for failed API requests or error responses');
console.log('');

console.log('🔍 COMMON ISSUES TO CHECK:');
console.log('==========================');
console.log('❓ API Domain: Is the web app calling the correct API URL?');
console.log('❓ Authentication: Is the JWT token valid and properly sent?');
console.log('❓ Tenant Context: Is the user properly authenticated with tenant?');
console.log('❓ Network: Are there any CORS or network errors?');
console.log('❓ Frontend Error: Are there any JavaScript errors in console?');
console.log('');

console.log('🔧 EXPECTED BEHAVIOR:');
console.log('=====================');
console.log('1. User clicks "Disconnect" button');
console.log('2. Confirmation dialog appears');
console.log('3. User confirms disconnect');
console.log('4. API call: DELETE /api/banking/connections/{connectionId}');
console.log('5. Success message appears');
console.log('6. Connection status changes to "disconnected"');
console.log('7. Page refreshes connection list');
console.log('');

console.log('🚨 LIKELY CAUSES:');
console.log('=================');
console.log('• API URL mismatch (workers.dev vs custom domain)');
console.log('• JWT token expired or invalid');  
console.log('• Network connectivity issue');
console.log('• TrueLayer token revocation failing (non-critical)');
console.log('• Database query error');
console.log('');

console.log('🔄 TESTING STEPS:');
console.log('=================');
console.log('1. Try disconnecting bank in the web app');
console.log('2. Check browser developer tools for errors');
console.log('3. If API call fails, note the error details');
console.log('4. Report back any specific error messages');
console.log('');

console.log('✅ QUICK FIX TO TRY:');
console.log('====================');
console.log('1. Refresh the banking page');
console.log('2. Log out and log back in (refresh JWT token)');
console.log('3. Clear browser cache/cookies');
console.log('4. Try in incognito/private browsing mode');
console.log('');

console.log('If the issue persists, please share:');
console.log('• Any error messages from browser console');
console.log('• Network tab showing the API request/response');
console.log('• Current API URL being used by the web app');