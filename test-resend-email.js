/**
 * Test Resend Email Functionality
 */

const RESEND_API_KEY = "re_joNCiaUb_4q5et1qJxxfpNbXPhUbq2pFL";

async function testResendEmail() {
  console.log('🧪 Testing Resend Email Service...');
  
  const payload = {
    from: 'Finhome360 <noreply@finhome360.com>',
    to: ['test@example.com'], // Change this to your email for testing
    subject: 'Test Email from Finhome360',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Finhome360 Email Test</h2>
        <p>This is a test email to verify the Resend integration is working correctly.</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3>Email Service Status</h3>
          <ul>
            <li>✅ Resend API integration</li>
            <li>✅ HTML email formatting</li>
            <li>✅ From domain verification</li>
          </ul>
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          If you received this email, the Resend integration is working properly!
        </p>
      </div>
    `,
    text: `Finhome360 Email Test
    
This is a test email to verify the Resend integration is working correctly.
Timestamp: ${new Date().toISOString()}

Email Service Status:
- Resend API integration ✅
- HTML email formatting ✅  
- From domain verification ✅

If you received this email, the Resend integration is working properly!
    `
  };

  try {
    console.log('📧 Sending test email via Resend API...');
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    console.log('📊 Resend API Response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      result: result,
    });

    if (response.ok) {
      console.log('✅ Email sent successfully!');
      console.log('📧 Email ID:', result.id);
      return true;
    } else {
      console.error('❌ Email failed to send');
      console.error('Error details:', result);
      return false;
    }

  } catch (error) {
    console.error('❌ Exception during email send:', {
      error: error.message,
      stack: error.stack,
    });
    return false;
  }
}

// Test welcome email template
async function testWelcomeEmailTemplate() {
  console.log('🧪 Testing Welcome Email Template...');
  
  const welcomePayload = {
    from: 'Finhome360 <noreply@finhome360.com>',
    to: ['test@example.com'], // Change this to your email for testing
    subject: '🎉 Welcome to Finhome360!',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Welcome to Finhome360! 🎉</h1>
          <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Your family's financial journey starts here</p>
        </div>
        
        <div style="padding: 40px 20px;">
          <p style="font-size: 16px; line-height: 1.6; color: #374151; margin-bottom: 24px;">
            Hi <strong>Test User</strong>,
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #374151; margin-bottom: 24px;">
            Congratulations on creating your Finhome360 account for <strong>Test Family</strong>! 
            You're now ready to take control of your family's finances with our powerful budgeting platform.
          </p>
          
          <div style="background: #f9fafb; border-left: 4px solid #10b981; padding: 24px; margin: 24px 0; border-radius: 6px;">
            <h3 style="margin: 0 0 16px 0; color: #059669; font-size: 18px;">🚀 Quick Start Guide</h3>
            <ul style="margin: 0; padding-left: 20px; color: #374151;">
              <li style="margin-bottom: 8px;"><strong>Add your accounts</strong> - Connect your bank accounts and credit cards</li>
              <li style="margin-bottom: 8px;"><strong>Set up categories</strong> - Organize your spending with custom categories</li>
              <li style="margin-bottom: 8px;"><strong>Create budgets</strong> - Set monthly budgets and track your progress</li>
              <li style="margin-bottom: 8px;"><strong>Invite family</strong> - Add family members to collaborate on finances</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="https://test.finhome360.com" 
               style="background: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
              🏠 Access Your Dashboard
            </a>
          </div>
          
          <div style="background: #eff6ff; padding: 24px; border-radius: 8px; margin: 24px 0;">
            <h4 style="margin: 0 0 12px 0; color: #1e40af;">🔐 Security & Privacy</h4>
            <p style="margin: 0; color: #1e40af; font-size: 14px;">
              Your financial data is encrypted and secure. We never share your information with third parties, 
              and you maintain full control over your data at all times.
            </p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; color: #374151; margin: 24px 0;">
            Need help getting started? Our support team is here to help you make the most of Finhome360.
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #374151;">
            Welcome aboard! 🎊<br>
            <strong>The Finhome360 Team</strong>
          </p>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 12px; color: #6b7280;">
            This email was sent to test@example.com from Finhome360.<br>
            If you have questions, reply to this email or visit our support center.
          </p>
        </div>
      </div>
    `,
  };

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(welcomePayload),
    });

    const result = await response.json();

    console.log('📊 Welcome Email Response:', {
      status: response.status,
      ok: response.ok,
      result: result,
    });

    return response.ok;

  } catch (error) {
    console.error('❌ Welcome email test failed:', error);
    return false;
  }
}

// Run tests
async function runEmailTests() {
  console.log('🚀 Starting Resend Email Tests...\n');
  
  const basicTest = await testResendEmail();
  console.log('\n' + '='.repeat(50) + '\n');
  
  const welcomeTest = await testWelcomeEmailTemplate();
  
  console.log('\n📊 Test Results Summary:');
  console.log(`Basic Email Test: ${basicTest ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Welcome Email Test: ${welcomeTest ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (basicTest && welcomeTest) {
    console.log('\n🎉 All email tests passed! Resend integration is working correctly.');
  } else {
    console.log('\n⚠️ Some email tests failed. Check the configuration and API key.');
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testResendEmail, testWelcomeEmailTemplate, runEmailTests };
}

// Run if called directly
if (require.main === module) {
  runEmailTests();
}