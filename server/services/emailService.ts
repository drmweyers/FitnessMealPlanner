import { Resend } from 'resend';
import { emailAnalyticsService } from './emailAnalyticsService';

// Initialize Resend (with fallback for testing)
const resend = new Resend(process.env.RESEND_API_KEY || 'test-key');

export interface InvitationEmailData {
  customerEmail: string;
  trainerName: string;
  trainerEmail: string;
  invitationLink: string;
  expiresAt: Date;
}

export interface ProgressSummaryEmailData {
  customerEmail: string;
  customerName: string;
  trainerName: string;
  trainerEmail: string;
  weekStartDate: Date;
  weekEndDate: Date;
  progressData: {
    measurementChanges?: {
      weightChange?: { previous: number; current: number; unit: string };
      bodyFatChange?: { previous: number; current: number };
      measurements?: Array<{ name: string; change: number; unit: string }>;
    };
    goalsProgress?: Array<{
      goalName: string;
      progressPercentage: number;
      targetValue: number;
      currentValue: number;
      unit: string;
      status: string;
    }>;
    mealPlanCompliance?: {
      assignedMealPlans: number;
      completedMealPlans: number;
      favoriteRecipes: string[];
    };
    engagementStats?: {
      recipesViewed: number;
      favoritesAdded: number;
      ratingsGiven: number;
    };
  };
  nextSteps?: string[];
  motivationalMessage?: string;
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
      
      // Log successful send
      await emailAnalyticsService.logEmailSent({
        emailType: 'invitation',
        subject: `You're invited to join ${data.trainerName}'s meal planning program`,
        recipientEmail: data.customerEmail,
        status: 'sent',
        messageId: emailData?.id
      });
      
      return { success: true, messageId: emailData?.id };

    } catch (error) {
      console.error('Error sending invitation email:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Log failed send
      await emailAnalyticsService.logEmailSent({
        emailType: 'invitation',
        subject: `You're invited to join ${data.trainerName}'s meal planning program`,
        recipientEmail: data.customerEmail,
        status: 'failed',
        errorMessage
      });
      
      return { 
        success: false, 
        error: `Email service error: ${errorMessage}` 
      };
    }
  }

  /**
   * Send weekly progress summary email
   */
  async sendProgressSummaryEmail(data: ProgressSummaryEmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
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
      console.log(`Sending progress summary email from: ${fromEmail} to: ${data.customerEmail}`);

      // Format week dates
      const weekStart = data.weekStartDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      const weekEnd = data.weekEndDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const { data: emailData, error } = await resend.emails.send({
        from: fromEmail,
        to: [data.customerEmail],
        subject: `Your Weekly Progress Summary - ${weekStart} to ${weekEnd}`,
        html: this.createProgressSummaryEmailTemplate(data, weekStart, weekEnd),
        text: this.createProgressSummaryEmailText(data, weekStart, weekEnd),
      });

      if (error) {
        console.error('Failed to send progress summary email:', error);
        
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

      console.log(`Progress summary email sent successfully to ${data.customerEmail}, messageId: ${emailData?.id}`);
      
      // Log successful send
      await emailAnalyticsService.logEmailSent({
        emailType: 'progress_summary',
        subject: `Your Weekly Progress Summary - ${weekStart} to ${weekEnd}`,
        recipientEmail: data.customerEmail,
        status: 'sent',
        messageId: emailData?.id
      });
      
      return { success: true, messageId: emailData?.id };

    } catch (error) {
      console.error('Error sending progress summary email:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Log failed send
      await emailAnalyticsService.logEmailSent({
        emailType: 'progress_summary',
        subject: `Your Weekly Progress Summary - ${data.weekStartDate.toLocaleDateString()} to ${data.weekEndDate.toLocaleDateString()}`,
        recipientEmail: data.customerEmail,
        status: 'failed',
        errorMessage
      });
      
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

  /**
   * Create HTML email template for progress summary
   */
  private createProgressSummaryEmailTemplate(data: ProgressSummaryEmailData, weekStart: string, weekEnd: string): string {
    const { progressData } = data;
    
    // Generate weight change section
    const weightChangeHtml = progressData.measurementChanges?.weightChange ? `
      <div class="stat-item">
        <h4>💪 Weight Progress</h4>
        <div class="stat-value ${progressData.measurementChanges.weightChange.current < progressData.measurementChanges.weightChange.previous ? 'positive' : 'neutral'}">
          ${progressData.measurementChanges.weightChange.previous} ${progressData.measurementChanges.weightChange.unit} 
          → ${progressData.measurementChanges.weightChange.current} ${progressData.measurementChanges.weightChange.unit}
          <span class="change">(${progressData.measurementChanges.weightChange.current - progressData.measurementChanges.weightChange.previous > 0 ? '+' : ''}${(progressData.measurementChanges.weightChange.current - progressData.measurementChanges.weightChange.previous).toFixed(1)} ${progressData.measurementChanges.weightChange.unit})</span>
        </div>
      </div>` : '';

    // Generate goals progress section
    const goalsHtml = progressData.goalsProgress?.length ? `
      <h3>🎯 Goals Progress</h3>
      <div class="goals-grid">
        ${progressData.goalsProgress.map(goal => `
          <div class="goal-item">
            <div class="goal-header">
              <h4>${goal.goalName}</h4>
              <span class="progress-percent">${goal.progressPercentage}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${goal.progressPercentage}%"></div>
            </div>
            <div class="goal-details">
              ${goal.currentValue} / ${goal.targetValue} ${goal.unit}
              <span class="status ${goal.status}">${goal.status}</span>
            </div>
          </div>
        `).join('')}
      </div>` : '';

    // Generate engagement stats
    const engagementHtml = progressData.engagementStats ? `
      <h3>📊 Weekly Activity</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-number">${progressData.engagementStats.recipesViewed}</div>
          <div class="stat-label">Recipes Viewed</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">${progressData.engagementStats.favoritesAdded}</div>
          <div class="stat-label">New Favorites</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">${progressData.engagementStats.ratingsGiven}</div>
          <div class="stat-label">Recipe Ratings</div>
        </div>
      </div>` : '';

    // Generate next steps
    const nextStepsHtml = data.nextSteps?.length ? `
      <h3>🚀 Next Steps</h3>
      <ul class="next-steps">
        ${data.nextSteps.map(step => `<li>${step}</li>`).join('')}
      </ul>` : '';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weekly Progress Summary - EvoFitMeals</title>
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
            margin-bottom: 10px;
        }
        .week-range {
            font-size: 16px;
            color: #6b7280;
            margin-bottom: 20px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .stat-item {
            text-align: center;
            padding: 20px;
            background: #f3f4f6;
            border-radius: 8px;
        }
        .stat-number {
            font-size: 24px;
            font-weight: bold;
            color: #3b82f6;
        }
        .stat-label {
            font-size: 14px;
            color: #6b7280;
            margin-top: 5px;
        }
        .goals-grid {
            margin: 20px 0;
        }
        .goal-item {
            margin-bottom: 20px;
            padding: 15px;
            background: #f9fafb;
            border-radius: 8px;
        }
        .goal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .progress-percent {
            font-weight: bold;
            color: #3b82f6;
        }
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e5e7eb;
            border-radius: 4px;
            margin-bottom: 10px;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #3b82f6, #10b981);
            border-radius: 4px;
            transition: width 0.3s ease;
        }
        .goal-details {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
            color: #6b7280;
        }
        .status {
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
        }
        .status.active { background: #dbeafe; color: #1d4ed8; }
        .status.achieved { background: #d1fae5; color: #065f46; }
        .status.paused { background: #fef3c7; color: #92400e; }
        .next-steps {
            background: #f0f9ff;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #3b82f6;
        }
        .next-steps li {
            margin-bottom: 8px;
        }
        .motivational {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            border-radius: 12px;
            text-align: center;
            margin: 30px 0;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
        }
        .positive { color: #10b981; }
        .neutral { color: #6b7280; }
        .change { font-size: 14px; font-weight: normal; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🏋️ EvoFitMeals</div>
            <h1 class="title">Weekly Progress Summary</h1>
            <div class="week-range">${weekStart} - ${weekEnd}</div>
        </div>

        <p>Hi ${data.customerName}!</p>
        
        <p>Here's your personalized weekly progress summary from your trainer <strong>${data.trainerName}</strong>. You're doing great - keep up the excellent work! 💪</p>

        ${weightChangeHtml}
        ${goalsHtml}
        ${engagementHtml}

        ${data.motivationalMessage ? `
        <div class="motivational">
            <h3 style="margin-top: 0;">✨ Motivation Corner</h3>
            <p style="margin-bottom: 0;">${data.motivationalMessage}</p>
        </div>` : ''}

        ${nextStepsHtml}

        <div class="footer">
            <p>This summary was prepared by your trainer <strong>${data.trainerName}</strong> (${data.trainerEmail})</p>
            <p>Questions? Reply to this email to reach your trainer directly!</p>
            <p>&copy; 2025 EvoFitMeals. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Create plain text version of progress summary email
   */
  private createProgressSummaryEmailText(data: ProgressSummaryEmailData, weekStart: string, weekEnd: string): string {
    const { progressData } = data;
    
    let textContent = `
EvoFitMeals - Weekly Progress Summary
${weekStart} - ${weekEnd}

Hi ${data.customerName}!

Here's your personalized weekly progress summary from your trainer ${data.trainerName}. You're doing great - keep up the excellent work!

`;

    // Add weight progress if available
    if (progressData.measurementChanges?.weightChange) {
      const change = progressData.measurementChanges.weightChange.current - progressData.measurementChanges.weightChange.previous;
      textContent += `
WEIGHT PROGRESS:
${progressData.measurementChanges.weightChange.previous} ${progressData.measurementChanges.weightChange.unit} → ${progressData.measurementChanges.weightChange.current} ${progressData.measurementChanges.weightChange.unit} (${change > 0 ? '+' : ''}${change.toFixed(1)} ${progressData.measurementChanges.weightChange.unit})

`;
    }

    // Add goals progress
    if (progressData.goalsProgress?.length) {
      textContent += `GOALS PROGRESS:\n`;
      progressData.goalsProgress.forEach(goal => {
        textContent += `• ${goal.goalName}: ${goal.progressPercentage}% (${goal.currentValue}/${goal.targetValue} ${goal.unit}) - ${goal.status}\n`;
      });
      textContent += '\n';
    }

    // Add engagement stats
    if (progressData.engagementStats) {
      textContent += `WEEKLY ACTIVITY:
• Recipes Viewed: ${progressData.engagementStats.recipesViewed}
• New Favorites: ${progressData.engagementStats.favoritesAdded}
• Recipe Ratings: ${progressData.engagementStats.ratingsGiven}

`;
    }

    // Add motivational message
    if (data.motivationalMessage) {
      textContent += `MOTIVATION CORNER:
${data.motivationalMessage}

`;
    }

    // Add next steps
    if (data.nextSteps?.length) {
      textContent += `NEXT STEPS:\n`;
      data.nextSteps.forEach(step => {
        textContent += `• ${step}\n`;
      });
      textContent += '\n';
    }

    textContent += `---
This summary was prepared by your trainer ${data.trainerName} (${data.trainerEmail})
Questions? Reply to this email to reach your trainer directly!

© 2025 EvoFitMeals. All rights reserved.`;

    return textContent;
  }
}

// Export singleton instance
export const emailService = EmailService.getInstance();