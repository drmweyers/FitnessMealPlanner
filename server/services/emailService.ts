import { Resend } from 'resend';

// Initialize Resend (with fallback for testing)
const resend = new Resend(process.env.RESEND_API_KEY || 'test-key');

export interface InvitationEmailData {
  customerEmail: string;
  trainerName: string;
  trainerEmail: string;
  invitationLink: string;
  expiresAt: Date;
}

export class EmailService {
  private static instance: EmailService;

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Get the appropriate FROM email address based on environment and configuration
   */
  private getFromEmailAddress(): string {
    // In development or when domain is not verified, use resend.dev for testing
    const customFromEmail = process.env.FROM_EMAIL;
    
    // For development, prefer the resend.dev address as it's always available
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      return customFromEmail || 'EvoFitMeals <onboarding@resend.dev>';
    }
    
    // For production, try to use verified domain or fall back to resend.dev
    const accountOwnerEmail = process.env.ACCOUNT_OWNER_EMAIL || 'evofitmeals@bcinnovationlabs.com';
    
    // If we have a custom FROM_EMAIL and it's not the default resend.dev, use it
    if (customFromEmail && !customFromEmail.includes('onboarding@resend.dev')) {
      return customFromEmail;
    }
    
    // For production without verified domain, fall back to resend.dev
    return 'EvoFitMeals <onboarding@resend.dev>';
  }

  /**
   * Check if email address can receive emails in current environment
   * In Resend testing mode, only account owner email can receive emails
   */
  private canReceiveEmail(emailAddress: string): boolean {
    const accountOwnerEmail = process.env.ACCOUNT_OWNER_EMAIL || 'evofitmeals@bcinnovationlabs.com';
    
    // In development, we can only send to account owner's email or common test domains
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      return emailAddress === accountOwnerEmail || 
             emailAddress.includes('@gmail.com') ||
             emailAddress.includes('@hotmail.com') ||
             emailAddress.includes('@outlook.com') ||
             emailAddress.includes('@yahoo.com');
    }
    
    // In production, assume all emails can be delivered (proper domain verification should be in place)
    return true;
  }

  /**
   * Send customer invitation email
   */
  async sendInvitationEmail(data: InvitationEmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY not configured. Email sending disabled.');
        return { success: false, error: 'Email service not configured - missing API key' };
      }

      // Check if this email can receive emails in current environment
      if (!this.canReceiveEmail(data.customerEmail)) {
        const accountOwnerEmail = process.env.ACCOUNT_OWNER_EMAIL || 'evofitmeals@bcinnovationlabs.com';
        return { 
          success: false, 
          error: `Email delivery restricted in testing mode. Can only send to: ${accountOwnerEmail} or common email providers (Gmail, Outlook, Yahoo).` 
        };
      }

      // Get appropriate FROM email address
      const fromEmail = this.getFromEmailAddress();
      console.log(`Sending invitation email from: ${fromEmail} to: ${data.customerEmail}`);

      // Format expiration date
      const expirationDate = data.expiresAt.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const { data: emailData, error } = await resend.emails.send({
        from: fromEmail,
        to: [data.customerEmail],
        subject: `You're invited to join ${data.trainerName}'s meal planning program`,
        html: this.createInvitationEmailTemplate(data, expirationDate),
        text: this.createInvitationEmailText(data, expirationDate),
      });

      if (error) {
        console.error('Failed to send invitation email:', error);
        
        // Provide more specific error messages based on error type
        let errorMessage = error.message || 'Unknown email service error';
        
        if (error.message?.includes('domain is not verified')) {
          errorMessage = `Email domain verification required. The domain for ${data.customerEmail} is not verified in Resend.`;
        } else if (error.message?.includes('You can only send testing emails')) {
          errorMessage = `Email delivery restricted to verified addresses. Cannot send to ${data.customerEmail} in testing mode.`;
        } else if (error.message?.includes('rate limit')) {
          errorMessage = 'Email rate limit exceeded. Please try again later.';
        }
        
        return { success: false, error: errorMessage };
      }

      console.log(`Invitation email sent successfully to ${data.customerEmail}, messageId: ${emailData?.id}`);
      return { success: true, messageId: emailData?.id };

    } catch (error) {
      console.error('Error sending invitation email:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { 
        success: false, 
        error: `Email service error: ${errorMessage}` 
      };
    }
  }

  /**
   * Create HTML email template for invitation
   */
  private createInvitationEmailTemplate(data: InvitationEmailData, expirationDate: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>You're Invited to EvoFitMeals</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #3b82f6;
            margin-bottom: 10px;
        }
        .title {
            font-size: 24px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 20px;
        }
        .content {
            margin-bottom: 30px;
        }
        .trainer-info {
            background: #f3f4f6;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .cta-button {
            display: inline-block;
            background: #3b82f6;
            color: white;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
            text-align: center;
        }
        .cta-button:hover {
            background: #2563eb;
        }
        .expiry-notice {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
        }
        .link-fallback {
            word-break: break-all;
            color: #3b82f6;
            font-size: 14px;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🏋️ EvoFitMeals</div>
            <h1 class="title">You're Invited!</h1>
        </div>

        <div class="content">
            <p>Hi there!</p>
            
            <p>Great news! <strong>${data.trainerName}</strong> has invited you to join their personalized meal planning program on EvoFitMeals.</p>

            <div class="trainer-info">
                <h3>Your Trainer</h3>
                <p><strong>Name:</strong> ${data.trainerName}</p>
                <p><strong>Email:</strong> ${data.trainerEmail}</p>
            </div>

            <p>With EvoFitMeals, you'll get:</p>
            <ul>
                <li>🍽️ Personalized meal plans tailored to your fitness goals</li>
                <li>📊 Nutritional tracking and insights</li>
                <li>📱 Easy-to-follow recipes and shopping lists</li>
                <li>👨‍⚕️ Direct guidance from your personal trainer</li>
            </ul>

            <div style="text-align: center;">
                <a href="${data.invitationLink}" class="cta-button">Accept Invitation & Sign Up</a>
            </div>

            <div class="expiry-notice">
                <strong>⏰ Important:</strong> This invitation expires on <strong>${expirationDate}</strong>. 
                Please sign up before then to secure your spot!
            </div>

            <p>If the button above doesn't work, copy and paste this link into your browser:</p>
            <div class="link-fallback">${data.invitationLink}</div>
        </div>

        <div class="footer">
            <p>This invitation was sent by ${data.trainerName} (${data.trainerEmail})</p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
            <p>&copy; 2025 EvoFitMeals. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Create plain text version of invitation email
   */
  private createInvitationEmailText(data: InvitationEmailData, expirationDate: string): string {
    return `
You're Invited to EvoFitMeals!

Hi there!

Great news! ${data.trainerName} has invited you to join their personalized meal planning program on EvoFitMeals.

Your Trainer:
- Name: ${data.trainerName}
- Email: ${data.trainerEmail}

With EvoFitMeals, you'll get:
• Personalized meal plans tailored to your fitness goals
• Nutritional tracking and insights  
• Easy-to-follow recipes and shopping lists
• Direct guidance from your personal trainer

To accept this invitation and sign up, visit:
${data.invitationLink}

IMPORTANT: This invitation expires on ${expirationDate}. Please sign up before then to secure your spot!

---
This invitation was sent by ${data.trainerName} (${data.trainerEmail})
If you didn't expect this invitation, you can safely ignore this email.

© 2025 EvoFitMeals. All rights reserved.
`;
  }

  /**
   * Send test email (for development/testing)
   */
  async sendTestEmail(to: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!process.env.RESEND_API_KEY) {
        return { success: false, error: 'RESEND_API_KEY not configured' };
      }

      // Check if this email can receive emails in current environment
      if (!this.canReceiveEmail(to)) {
        const accountOwnerEmail = process.env.ACCOUNT_OWNER_EMAIL || 'evofitmeals@bcinnovationlabs.com';
        return { 
          success: false, 
          error: `Email delivery restricted in testing mode. Can only send to: ${accountOwnerEmail} or common email providers (Gmail, Outlook, Yahoo).` 
        };
      }

      const fromEmail = this.getFromEmailAddress();
      console.log(`Sending test email from: ${fromEmail} to: ${to}`);

      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: [to],
        subject: 'EvoFitMeals Email Test',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #3b82f6;">🏋️ EvoFitMeals Email Service Test</h2>
            <p>This is a test email from EvoFitMeals.</p>
            <p><strong>✅ Success!</strong> If you received this, the email service is working correctly!</p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Test Details:</strong></p>
              <ul>
                <li>From: ${fromEmail}</li>
                <li>To: ${to}</li>
                <li>Timestamp: ${new Date().toISOString()}</li>
                <li>Environment: ${process.env.NODE_ENV || 'development'}</li>
              </ul>
            </div>
            <p style="font-size: 14px; color: #666;">This is an automated test email from the EvoFitMeals system.</p>
          </div>
        `,
        text: `EvoFitMeals Email Service Test

This is a test email from EvoFitMeals.
✅ Success! If you received this, the email service is working correctly!

Test Details:
- From: ${fromEmail}
- To: ${to}
- Timestamp: ${new Date().toISOString()}
- Environment: ${process.env.NODE_ENV || 'development'}

This is an automated test email from the EvoFitMeals system.`,
      });

      if (error) {
        console.error('Failed to send test email:', error);
        
        // Provide more specific error messages
        let errorMessage = error.message || 'Unknown email service error';
        
        if (error.message?.includes('domain is not verified')) {
          errorMessage = `Email domain verification required. The domain for ${to} is not verified in Resend.`;
        } else if (error.message?.includes('You can only send testing emails')) {
          errorMessage = `Email delivery restricted to verified addresses. Cannot send to ${to} in testing mode.`;
        }
        
        return { success: false, error: errorMessage };
      }

      console.log(`Test email sent successfully to ${to}, messageId: ${data?.id}`);
      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error('Error sending test email:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

// Export singleton instance
export const emailService = EmailService.getInstance();