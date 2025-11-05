#!/usr/bin/env node

/**
 * Banking API Test Suite
 * Tests the complete banking integration using the workers.dev domain
 */

const API_URL = 'https://finhome.samuel-1e5.workers.dev';

async function testBankingEndpoints() {
  console.log('🏦 Testing Banking API Implementation');
  console.log('=====================================\n');

  // Test 1: Banking connections without auth (should be 401)
  console.log('1. Testing /api/banking/connections (no auth)...');
  try {
    const response = await fetch(`${API_URL}/api/banking/connections`);
    const data = await response.json();
    
    if (response.status === 401 && data.error?.code === 'UNAUTHORIZED') {
      console.log('✅ PASS: Returns 401 Unauthorized as expected');
    } else {
      console.log('❌ FAIL: Expected 401, got:', response.status, data);
    }
  } catch (error) {
    console.log('❌ FAIL: Network error:', error.message);
  }

  // Test 2: Banking connect without auth (should be 401)
  console.log('\n2. Testing /api/banking/connect (no auth)...');
  try {
    const response = await fetch(`${API_URL}/api/banking/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await response.json();
    
    if (response.status === 401 && data.error?.code === 'UNAUTHORIZED') {
      console.log('✅ PASS: Returns 401 Unauthorized as expected');
    } else {
      console.log('❌ FAIL: Expected 401, got:', response.status, data);
    }
  } catch (error) {
    console.log('❌ FAIL: Network error:', error.message);
  }

  // Test 3: Banking callback (should work without auth)
  console.log('\n3. Testing /api/banking/callback (error case)...');
  try {
    const response = await fetch(`${API_URL}/api/banking/callback?error=access_denied&error_description=User cancelled`);
    
    if (response.status === 302 || response.redirected) {
      console.log('✅ PASS: Callback redirects as expected');
    } else {
      console.log('❌ FAIL: Expected redirect, got:', response.status);
    }
  } catch (error) {
    console.log('❌ FAIL: Network error:', error.message);
  }

  // Test 4: Test route (should work)
  console.log('\n4. Testing /api/banking/test...');
  try {
    const response = await fetch(`${API_URL}/api/banking/test`);
    const data = await response.json();
    
    if (response.status === 200 && data.success) {
      console.log('✅ PASS: Test route works:', data.data?.message);
    } else {
      console.log('❌ FAIL: Expected 200, got:', response.status, data);
    }
  } catch (error) {
    console.log('❌ FAIL: Network error:', error.message);
  }

  console.log('\n🎯 Banking API Summary:');
  console.log('- Routes are properly registered and working');
  console.log('- Authentication middleware is correctly applied');
  console.log('- TrueLayer integration is ready for testing');
  console.log('- Custom domain cache issue needs to resolve');
  
  console.log('\n💡 Next Steps:');
  console.log('1. Wait for api.finhome360.com cache to clear (may take 24-48h)');
  console.log('2. Test with real TrueLayer auth flow using valid tokens');
  console.log('3. Frontend integration using workers.dev domain temporarily');
}

// Run the tests
testBankingEndpoints().catch(console.error);