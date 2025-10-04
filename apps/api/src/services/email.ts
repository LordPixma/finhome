/**
 * Email Service using MailChannels (free for Cloudflare Workers)
 * 
 * MailChannels is integrated directly with Cloudflare Workers and doesn't
 * require API keys for basic transactional emails.
 * 
 * Alternative: Can easily swap to Resend, SendGrid, or AWS SES
 */

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
}

export interface BillReminderEmailData {
  userName: string;
  billName: string;
  amount: number;
  currency: string;
  dueDate: string;
  daysUntilDue: number;
  loginUrl: string;
}

export interface MemberInvitationEmailData {
  inviterName: string;
  tenantName: string;
  memberName: string;
  memberEmail: string;
  temporaryPassword: string;
  role: string;
  loginUrl: string;
}

export class EmailService {
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly appUrl: string;

  constructor(fromEmail: string = 'noreply@finhome360.com', appUrl: string = 'https://app.finhome360.com') {
    this.fromEmail = fromEmail;
    this.fromName = 'Finhome360';
    this.appUrl = appUrl;
  }

  /**
   * Send email using MailChannels (free for Cloudflare Workers)
   */
  private async sendWithMailChannels(options: EmailOptions): Promise<boolean> {
    try {
      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      
      const payload = {
        personalizations: [
          {
            to: recipients.map(email => ({ email })),
          },
        ],
        from: {
          email: options.from || this.fromEmail,
          name: this.fromName,
        },
        subject: options.subject,
        content: [
          ...(options.text ? [{ type: 'text/plain', value: options.text }] : []),
          ...(options.html ? [{ type: 'text/html', value: options.html }] : []),
        ],
        ...(options.replyTo && { reply_to: { email: options.replyTo } }),
      };

      console.log('📧 Attempting to send email:', {
        to: recipients,
        subject: options.subject,
        from: options.from || this.fromEmail,
        timestamp: new Date().toISOString(),
      });

      const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('📧 MailChannels response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers),
        timestamp: new Date().toISOString(),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('❌ MailChannels error details:', {
          status: response.status,
          statusText: response.statusText,
          body: error,
          recipients,
          subject: options.subject,
          timestamp: new Date().toISOString(),
        });
        return false;
      }

      const responseBody = await response.text();
      console.log('✅ Email sent successfully:', {
        recipients: recipients.join(', '),
        subject: options.subject,
        response: responseBody,
        timestamp: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      console.error('❌ Failed to send email - Exception:', {
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
   * Send a generic email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!options.text && !options.html) {
      throw new Error('Email must have either text or html content');
    }
    return this.sendWithMailChannels(options);
  }

  /**
   * Send bill reminder notification email
   */
  async sendBillReminderEmail(email: string, data: BillReminderEmailData): Promise<boolean> {
    const subject = data.daysUntilDue > 0
      ? `Reminder: ${data.billName} due in ${data.daysUntilDue} ${data.daysUntilDue === 1 ? 'day' : 'days'}`
      : `URGENT: ${data.billName} is overdue!`;

    const html = this.generateBillReminderHTML(data);
    const text = this.generateBillReminderText(data);

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  /**
   * Send member invitation email
   */
  async sendMemberInvitationEmail(email: string, data: MemberInvitationEmailData): Promise<boolean> {
    const subject = `You've been invited to join ${data.tenantName} on Finhome360`;

    const html = this.generateMemberInvitationHTML(data);
    const text = this.generateMemberInvitationText(data);

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, resetToken: string, userName: string): Promise<boolean> {
    const resetUrl = `${this.appUrl}/reset-password?token=${resetToken}`;
    const subject = 'Reset your Finhome360 password';

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
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset</h1>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              <p>We received a request to reset your password for your Finhome360 account.</p>
              <p>Click the button below to reset your password:</p>
              <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </p>
              <p>This link will expire in 1 hour for security reasons.</p>
              <p>If you didn't request this, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <p>© 2025 Finhome360. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Hi ${userName},

We received a request to reset your password for your Finhome360 account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request this, you can safely ignore this email.

© 2025 Finhome360. All rights reserved.
    `;

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  /**
   * Generate HTML for bill reminder email
   */
  private generateBillReminderHTML(data: BillReminderEmailData): string {
    const isOverdue = data.daysUntilDue < 0;
    const statusColor = isOverdue ? '#ef4444' : data.daysUntilDue <= 3 ? '#f59e0b' : '#10b981';
    const statusEmoji = isOverdue ? '⚠️' : '⏰';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .bill-card { background: white; border-left: 4px solid ${statusColor}; padding: 20px; margin: 20px 0; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .bill-name { font-size: 24px; font-weight: bold; margin: 0 0 10px 0; }
            .amount { font-size: 32px; font-weight: bold; color: ${statusColor}; margin: 10px 0; }
            .status { background: ${statusColor}; color: white; padding: 5px 15px; border-radius: 20px; display: inline-block; font-weight: bold; margin: 10px 0; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${statusEmoji} Bill Reminder</h1>
            </div>
            <div class="content">
              <p>Hi ${data.userName},</p>
              <p>${isOverdue ? 'Your bill is now <strong>overdue</strong>!' : `This is a reminder that you have a bill due ${data.daysUntilDue === 0 ? 'today' : `in ${data.daysUntilDue} ${data.daysUntilDue === 1 ? 'day' : 'days'}`}.`}</p>
              
              <div class="bill-card">
                <div class="bill-name">${data.billName}</div>
                <div class="status">${isOverdue ? 'OVERDUE' : data.daysUntilDue <= 3 ? 'DUE SOON' : 'UPCOMING'}</div>
                <div class="amount">${data.currency}${data.amount.toFixed(2)}</div>
                <p><strong>Due Date:</strong> ${data.dueDate}</p>
              </div>

              <p style="text-align: center;">
                <a href="${data.loginUrl}" class="button">View in Finhome360</a>
              </p>

              <p>Don't forget to mark it as paid once you've taken care of it!</p>
            </div>
            <div class="footer">
              <p>© 2025 Finhome360. All rights reserved.</p>
              <p><a href="${data.loginUrl}/dashboard/settings">Manage notification preferences</a></p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate plain text for bill reminder email
   */
  private generateBillReminderText(data: BillReminderEmailData): string {
    const isOverdue = data.daysUntilDue < 0;
    
    return `
Hi ${data.userName},

${isOverdue ? 'Your bill is now OVERDUE!' : `This is a reminder that you have a bill due ${data.daysUntilDue === 0 ? 'today' : `in ${data.daysUntilDue} ${data.daysUntilDue === 1 ? 'day' : 'days'}`}.`}

Bill Details:
- Name: ${data.billName}
- Amount: ${data.currency}${data.amount.toFixed(2)}
- Due Date: ${data.dueDate}
- Status: ${isOverdue ? 'OVERDUE' : data.daysUntilDue <= 3 ? 'DUE SOON' : 'UPCOMING'}

View in Finhome360: ${data.loginUrl}

Don't forget to mark it as paid once you've taken care of it!

© 2025 Finhome360. All rights reserved.
Manage notification preferences: ${data.loginUrl}/dashboard/settings
    `;
  }

  /**
   * Generate HTML for member invitation email
   */
  private generateMemberInvitationHTML(data: MemberInvitationEmailData): string {
    return `
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
  }

  /**
   * Generate plain text for member invitation email
   */
  private generateMemberInvitationText(data: MemberInvitationEmailData): string {
    return `
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
  }
}

// Export singleton instance
export const createEmailService = (fromEmail?: string, appUrl?: string) => {
  return new EmailService(fromEmail, appUrl);
};
