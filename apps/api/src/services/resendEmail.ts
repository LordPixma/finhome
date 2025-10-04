/**
 * Alternative Email Service using Resend (more reliable than MailChannels)
 * 
 * Resend is easier to configure and doesn't require complex DNS verification.
 * It has a generous free tier: 3,000 emails/month, 100 emails/day.
 */

export interface ResendEmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
}

export class ResendEmailService {
  private readonly apiKey: string;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(
    apiKey: string, 
    fromEmail: string = 'noreply@finhome360.com'
  ) {
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
    this.fromName = 'Finhome360';
  }

  /**
   * Send email using Resend API
   */
  private async sendWithResend(options: ResendEmailOptions): Promise<boolean> {
    try {
      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      
      const payload = {
        from: `${this.fromName} <${options.from || this.fromEmail}>`,
        to: recipients,
        subject: options.subject,
        ...(options.text && { text: options.text }),
        ...(options.html && { html: options.html }),
        ...(options.replyTo && { reply_to: options.replyTo }),
      };

      console.log('📧 Attempting to send email via Resend:', {
        to: recipients,
        subject: options.subject,
        from: payload.from,
        timestamp: new Date().toISOString(),
      });

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      console.log('📧 Resend response:', {
        status: response.status,
        statusText: response.statusText,
        timestamp: new Date().toISOString(),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('❌ Resend error details:', {
          status: response.status,
          statusText: response.statusText,
          body: error,
          recipients,
          subject: options.subject,
          timestamp: new Date().toISOString(),
        });
        return false;
      }

      const responseData = await response.json() as { id?: string };
      console.log('✅ Email sent successfully via Resend:', {
        recipients: recipients.join(', '),
        subject: options.subject,
        emailId: responseData.id || 'unknown',
        timestamp: new Date().toISOString(),
      });
      
      return true;
    } catch (error) {
      console.error('❌ Failed to send email via Resend - Exception:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        recipients: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        timestamp: new Date().toISOString(),
      });
      return false;
    }
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(email: string, data: {
    userName: string;
    userEmail: string;
    tenantName: string;
    subdomain: string;
    loginUrl: string;
  }): Promise<boolean> {
    const subject = `Welcome to Finhome360, ${data.userName}! 🎉`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; }
            .logo { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
            .content { background: white; padding: 40px; }
            .highlight { background: #f8fafc; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 5px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
            .features { list-style: none; padding: 0; }
            .features li { padding: 10px 0; border-bottom: 1px solid #eee; }
            .features li:before { content: "✅ "; margin-right: 10px; }
            .footer { background: #f8fafc; padding: 30px; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">💰 Finhome360</div>
              <h1>Welcome to Your Financial Journey!</h1>
              <p>Hi ${data.userName}, you've successfully created your ${data.tenantName} account</p>
            </div>
            
            <div class="content">
              <h2>🎉 You're All Set!</h2>
              
              <p>Congratulations! You've just taken the first step toward better financial management. Your Finhome360 account is ready and waiting for you.</p>
              
              <div class="highlight">
                <strong>🔗 Your Personal Dashboard:</strong><br>
                <a href="${data.loginUrl}">${data.subdomain}.finhome360.com</a>
              </div>

              <p style="text-align: center;">
                <a href="${data.loginUrl}" class="button">Access Your Dashboard</a>
              </p>

              <h3>🚀 What You Can Do Now:</h3>
              
              <ul class="features">
                <li><strong>Connect Your Accounts:</strong> Link bank accounts, credit cards, and other financial accounts</li>
                <li><strong>Set Up Budgets:</strong> Create monthly budgets for different spending categories</li>
                <li><strong>Track Transactions:</strong> Import bank statements or add transactions manually</li>
                <li><strong>Bill Reminders:</strong> Never miss a payment with automated bill notifications</li>
                <li><strong>Financial Goals:</strong> Set and track progress toward your savings goals</li>
                <li><strong>Invite Family:</strong> Add up to 3 family members to collaborate on budgets</li>
                <li><strong>Analytics:</strong> View spending trends and financial insights</li>
              </ul>

              <h3>💡 Quick Start Tips:</h3>
              <p>
                1. <strong>Add your first account</strong> - Start by adding your main checking or savings account<br>
                2. <strong>Create categories</strong> - Set up spending categories that match your lifestyle<br>
                3. <strong>Import transactions</strong> - Upload a CSV file from your bank to get started quickly<br>
                4. <strong>Set your first budget</strong> - Create a monthly budget for groceries or entertainment
              </p>

              <div class="highlight">
                <strong>🔐 Security First:</strong><br>
                Your financial data is encrypted and secure. We use bank-level security to protect your information.
              </div>

              <p>If you have any questions or need help getting started, don't hesitate to reach out to our support team.</p>
              
              <p>Welcome to the Finhome360 family!</p>
              
              <p>
                Best regards,<br>
                <strong>The Finhome360 Team</strong>
              </p>
            </div>
            
            <div class="footer">
              <p>© 2025 Finhome360. All rights reserved.</p>
              <p>This email was sent to ${data.userEmail} because you created a Finhome360 account.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Welcome to Finhome360! 🎉

Hi ${data.userName},

Congratulations! You've successfully created your ${data.tenantName} account and you're ready to take control of your finances.

Your Personal Dashboard: ${data.loginUrl}

What You Can Do Now:
✅ Connect Your Accounts - Link bank accounts, credit cards, and other financial accounts
✅ Set Up Budgets - Create monthly budgets for different spending categories  
✅ Track Transactions - Import bank statements or add transactions manually
✅ Bill Reminders - Never miss a payment with automated bill notifications
✅ Financial Goals - Set and track progress toward your savings goals
✅ Invite Family - Add up to 3 family members to collaborate on budgets
✅ Analytics - View spending trends and financial insights

Quick Start Tips:
1. Add your first account - Start by adding your main checking or savings account
2. Create categories - Set up spending categories that match your lifestyle
3. Import transactions - Upload a CSV file from your bank to get started quickly
4. Set your first budget - Create a monthly budget for groceries or entertainment

🔐 Security First:
Your financial data is encrypted and secure. We use bank-level security to protect your information.

If you have any questions or need help getting started, don't hesitate to reach out to our support team.

Welcome to the Finhome360 family!

Best regards,
The Finhome360 Team

© 2025 Finhome360. All rights reserved.
This email was sent to ${data.userEmail} because you created a Finhome360 account.
    `;

    return this.sendWithResend({
      to: email,
      subject,
      html,
      text,
    });
  }

  /**
   * Send member invitation email
   */
  async sendMemberInvitationEmail(
    email: string, 
    data: {
      inviterName: string;
      tenantName: string;
      memberName: string;
      memberEmail: string;
      temporaryPassword: string;
      role: string;
      loginUrl: string;
    }
  ): Promise<boolean> {
    const subject = `You've been invited to join ${data.tenantName} on Finhome360`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .credentials-box { background: white; border: 2px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 5px; }
            .credential-row { margin: 10px 0; }
            .credential-label { font-weight: bold; color: #666; }
            .credential-value { font-family: monospace; background: #f0f0f0; padding: 5px 10px; border-radius: 3px; display: inline-block; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to Finhome360!</h1>
            </div>
            <div class="content">
              <p>Hi ${data.memberName},</p>
              <p><strong>${data.inviterName}</strong> has invited you to join <strong>${data.tenantName}</strong> on Finhome360 as a <strong>${data.role}</strong>.</p>
              
              <p>Finhome360 is a family budgeting app that helps you track expenses, manage bills, and achieve your financial goals together.</p>

              <div class="credentials-box">
                <h3>Your Login Credentials</h3>
                <div class="credential-row">
                  <div class="credential-label">Email:</div>
                  <div class="credential-value">${data.memberEmail}</div>
                </div>
                <div class="credential-row">
                  <div class="credential-label">Temporary Password:</div>
                  <div class="credential-value">${data.temporaryPassword}</div>
                </div>
              </div>

              <div class="warning">
                ⚠️ <strong>Important:</strong> Please change your password after your first login for security.
              </div>

              <p style="text-align: center;">
                <a href="${data.loginUrl}" class="button">Log In to Finhome360</a>
              </p>

              <p>If you have any questions, feel free to reach out to ${data.inviterName}.</p>
            </div>
            <div class="footer">
              <p>© 2025 Finhome360. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Hi ${data.memberName},

${data.inviterName} has invited you to join ${data.tenantName} on Finhome360 as a ${data.role}.

Finhome360 is a family budgeting app that helps you track expenses, manage bills, and achieve your financial goals together.

Your Login Credentials:
- Email: ${data.memberEmail}
- Temporary Password: ${data.temporaryPassword}

IMPORTANT: Please change your password after your first login for security.

Log in here: ${data.loginUrl}

If you have any questions, feel free to reach out to ${data.inviterName}.

© 2025 Finhome360. All rights reserved.
    `;

    return this.sendWithResend({
      to: email,
      subject,
      html,
      text,
    });
  }
}

// Export factory function
export const createResendEmailService = (apiKey: string, fromEmail?: string) => {
  return new ResendEmailService(apiKey, fromEmail);
};