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
   * Send customer invitation email
   */
  async sendInvitationEmail(data: InvitationEmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY not configured. Email sending disabled.');
        return { success: false, error: 'Email service not configured' };
      }

      // Format expiration date
      const expirationDate = data.expiresAt.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const { data: emailData, error } = await resend.emails.send({
        from: process.env.FROM_EMAIL || 'EvoFitMeals <onboarding@resend.dev>',
        to: [data.customerEmail],
        subject: `You're invited to join ${data.trainerName}'s meal planning program`,
        html: this.createInvitationEmailTemplate(data, expirationDate),
        text: this.createInvitationEmailText(data, expirationDate),
      });

      if (error) {
        console.error('Failed to send invitation email:', error);
        return { success: false, error: error.message };
      }

      console.log('Invitation email sent successfully:', emailData?.id);
      return { success: true, messageId: emailData?.id };

    } catch (error) {
      console.error('Error sending invitation email:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
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

      const { data, error } = await resend.emails.send({
        from: process.env.FROM_EMAIL || 'EvoFitMeals <onboarding@resend.dev>',
        to: [to],
        subject: 'EvoFitMeals Email Test',
        html: `
          <h2>Email Service Test</h2>
          <p>This is a test email from EvoFitMeals.</p>
          <p>If you received this, the email service is working correctly!</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
        `,
        text: `Email Service Test\n\nThis is a test email from EvoFitMeals.\nIf you received this, the email service is working correctly!\n\nTimestamp: ${new Date().toISOString()}`,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, messageId: data?.id };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

// Export singleton instance
export const emailService = EmailService.getInstance();