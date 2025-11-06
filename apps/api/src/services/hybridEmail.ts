/**
 * Hybrid Email Service - Tries Resend first, falls back to MailChannels
 * 
 * This provides better reliability by using multiple email providers.
 * Resend is tried first (more reliable), then MailChannels as backup.
 */

import { createEmailService } from './email';
import { createResendEmailService } from './resendEmail';

export interface HybridEmailData {
  inviterName: string;
  tenantName: string;
  memberName: string;
  memberEmail: string;
  temporaryPassword: string;
  role: string;
  loginUrl: string;
}

export interface WelcomeEmailData {
  userName: string;
  userEmail: string;
  tenantName: string;
  subdomain: string;
  loginUrl: string;
}

export class HybridEmailService {
  private readonly resendApiKey?: string;
  private readonly fromEmail: string;
  private readonly appUrl: string;

  constructor(
    fromEmail: string = 'noreply@finhome360.com', // Now using verified domain
    appUrl: string = 'https://app.finhome360.com',
    resendApiKey?: string
  ) {
    this.resendApiKey = resendApiKey;
    this.fromEmail = fromEmail;
    this.appUrl = appUrl;
  }

  /**
   * Send welcome email with automatic fallback
   */
  async sendWelcomeEmail(email: string, data: WelcomeEmailData): Promise<boolean> {
    console.log('🚀 Starting hybrid email delivery for welcome email:', {
      recipientEmail: email,
      hasResendKey: !!this.resendApiKey,
      timestamp: new Date().toISOString(),
    });

    // Try Resend first if API key is available
    if (this.resendApiKey && this.resendApiKey !== 'SET_THIS_TO_YOUR_RESEND_API_KEY') {
      console.log('📤 Attempting welcome email delivery via Resend (primary)...');
      try {
        const resendService = createResendEmailService(this.resendApiKey, this.fromEmail);
        const success = await resendService.sendWelcomeEmail(email, data);
        
        if (success) {
          console.log('✅ Welcome email sent successfully via Resend');
          return true;
        } else {
          console.log('⚠️ Resend failed, falling back to MailChannels...');
        }
      } catch (error) {
        console.error('❌ Resend service error, falling back to MailChannels:', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      console.log('⚠️ No Resend API key configured, using MailChannels directly');
    }

    // Fallback to MailChannels
    console.log('📤 Attempting welcome email delivery via MailChannels (fallback)...');
    try {
      const mailChannelsService = createEmailService(this.fromEmail, this.appUrl);
      const success = await mailChannelsService.sendWelcomeEmail(email, data);
      
      if (success) {
        console.log('✅ Welcome email sent successfully via MailChannels');
        return true;
      } else {
        console.log('❌ MailChannels also failed');
      }
    } catch (error) {
      console.error('❌ MailChannels service error:', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    console.error('❌ All email providers failed for welcome email:', email);
    return false;
  }

  /**
   * Send member invitation email with automatic fallback
   */
  async sendMemberInvitationEmail(email: string, data: HybridEmailData): Promise<boolean> {
    console.log('🚀 Starting hybrid email delivery for invitation:', {
      recipientEmail: email,
      hasResendKey: !!this.resendApiKey,
      timestamp: new Date().toISOString(),
    });

    // Try Resend first if API key is available
    if (this.resendApiKey && this.resendApiKey !== 'SET_THIS_TO_YOUR_RESEND_API_KEY') {
      console.log('📤 Attempting delivery via Resend (primary)...');
      try {
        const resendService = createResendEmailService(this.resendApiKey, this.fromEmail);
        const success = await resendService.sendMemberInvitationEmail(email, data);
        
        if (success) {
          console.log('✅ Email sent successfully via Resend');
          return true;
        } else {
          console.log('⚠️ Resend failed, falling back to MailChannels...');
        }
      } catch (error) {
        console.error('❌ Resend service error, falling back to MailChannels:', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      console.log('⚠️ No Resend API key configured, using MailChannels directly');
    }

    // Fallback to MailChannels
    console.log('📤 Attempting delivery via MailChannels (fallback)...');
    try {
      const mailChannelsService = createEmailService(this.fromEmail, this.appUrl);
      const success = await mailChannelsService.sendMemberInvitationEmail(email, data);
      
      if (success) {
        console.log('✅ Email sent successfully via MailChannels');
        return true;
      } else {
        console.log('❌ MailChannels also failed');
      }
    } catch (error) {
      console.error('❌ MailChannels service error:', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    console.error('❌ All email providers failed for:', email);
    return false;
  }

  /**
   * Send password reset email with automatic fallback
   */
  async sendPasswordResetEmail(email: string, resetToken: string, userName: string): Promise<boolean> {
    console.log('🚀 Starting hybrid email delivery for password reset:', {
      recipientEmail: email,
      hasResendKey: !!this.resendApiKey,
      timestamp: new Date().toISOString(),
    });

    // For now, use MailChannels for password reset (can be enhanced later)
    console.log('📤 Sending password reset via MailChannels...');
    try {
      const mailChannelsService = createEmailService(this.fromEmail, this.appUrl);
      return await mailChannelsService.sendPasswordResetEmail(email, resetToken, userName);
    } catch (error) {
      console.error('❌ Password reset email failed:', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}

// Export factory function
export const createHybridEmailService = (resendApiKey?: string, fromEmail?: string, appUrl?: string) => {
  // Constructor expects (fromEmail, appUrl, resendApiKey)
  return new HybridEmailService(fromEmail, appUrl, resendApiKey);
};