/**
 * Test MailChannels domain verification
 * This helps identify what's causing the 401 Unauthorized error
 */

export async function testMailChannelsVerification() {
  console.log('🔍 Testing MailChannels domain verification...');
  
  // Test 1: Simple test email to check basic connectivity
  const testPayload = {
    personalizations: [
      {
        to: [{ email: 'test@example.com' }], // Use a test email that won't actually receive
      },
    ],
    from: {
      email: 'noreply@finhome360.com',
      name: 'Finhome360 Test',
    },
    subject: 'MailChannels Domain Verification Test',
    content: [
      {
        type: 'text/plain',
        value: 'This is a test to verify MailChannels domain configuration.',
      },
    ],
  };

  try {
    console.log('📤 Testing MailChannels API with domain verification...');
    
    const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    console.log('📧 MailChannels test response:', {
      status: response.status,
      statusText: response.statusText,
    });

    const responseText = await response.text();
    console.log('📧 Response body:', responseText);

    if (!response.ok) {
      console.error('❌ MailChannels test failed:', {
        status: response.status,
        body: responseText,
      });
      
      // Analyze the error
      if (response.status === 401) {
        console.log('🔍 401 Analysis:');
        console.log('- Domain verification may be required');
        console.log('- Check if _mailchannels DNS record is correct');
        console.log('- Verify Cloudflare Account ID matches');
        console.log('- Domain might need explicit verification with MailChannels');
      }
      
      return false;
    }

    console.log('✅ MailChannels test successful!');
    return true;
  } catch (error) {
    console.error('❌ MailChannels test exception:', error);
    return false;
  }
}

// Export for use in worker
export { testMailChannelsVerification as default };