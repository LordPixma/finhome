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