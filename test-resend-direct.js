// Debug script to test Resend API directly
const RESEND_API_KEY = 're_joNCiaUb_4q5et1qJxxfpNbXPhUbq2pFL';

async function testResendAPI() {
  console.log('🧪 Testing Resend API directly...');
  
  try {
    const payload = {
      from: 'Finhome360 <noreply@finhome360.com>', // Using your verified domain
      to: ['samuel@lgger.com'], // Your test email
      subject: 'Test Email from Verified Finhome360 Domain',
      html: '<h1>✅ Test Email</h1><p>This confirms finhome360.com domain is verified and working!</p>',
      text: '✅ Test Email - This confirms finhome360.com domain is verified and working!'
    };

    console.log('📧 Payload:', {
      from: payload.from,
      to: payload.to,
      subject: payload.subject
    });

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('📡 Response Status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error Response:', errorText);
      
      // Check for common errors
      if (response.status === 401) {
        console.error('🔑 Authentication Error - Check API key');
      } else if (response.status === 422) {
        console.error('📝 Validation Error - Check email format/domains');
      }
    } else {
      const result = await response.json();
      console.log('✅ Success! Email sent:', result);
    }

  } catch (error) {
    console.error('❌ Network Error:', error.message);
  }
}

testResendAPI();