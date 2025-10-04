// Test MailChannels email directly
async function testMailChannels() {
  const payload = {
    personalizations: [
      {
        to: [{ email: 'test@example.com' }],
      },
    ],
    from: {
      email: 'noreply@finhome360.com',
      name: 'Finhome360',
    },
    subject: 'Test Email from Finhome360',
    content: [
      {
        type: 'text/plain',
        value: 'This is a test email to verify MailChannels configuration.',
      },
      {
        type: 'text/html',
        value: '<p>This is a test email to verify MailChannels configuration.</p>',
      },
    ],
  };

  try {
    const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));

    const responseText = await response.text();
    console.log('Response body:', responseText);

    if (!response.ok) {
      console.error('MailChannels error - Status:', response.status);
      console.error('MailChannels error - Body:', responseText);
      return false;
    }

    console.log('Email sent successfully!');
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

// Run the test
testMailChannels().then(success => {
  console.log('Test result:', success ? 'SUCCESS' : 'FAILED');
});