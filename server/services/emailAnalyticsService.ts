import { db } from '../db';
import { emailSendLog, users, emailPreferences } from '@shared/schema';
import { eq, and, gte, lte, count, desc, sql } from 'drizzle-orm';

export interface EmailAnalytics {
  totalSent: number;
  totalFailed: number;
  successRate: number;
  emailTypes: Array<{ type: string; count: number; successRate: number }>;
  recentActivity: Array<{
    date: string;
    sent: number;
    failed: number;
  }>;
  topRecipients: Array<{ email: string; count: number }>;
}

export interface EmailSendLogEntry {
  userId?: string | null;
  emailType: string;
  subject: string;
  recipientEmail: string;
  status: string;
  messageId?: string | null;
  errorMessage?: string | null;
}

export class EmailAnalyticsService {
  private static instance: EmailAnalyticsService;

  public static getInstance(): EmailAnalyticsService {
    if (!EmailAnalyticsService.instance) {
      EmailAnalyticsService.instance = new EmailAnalyticsService();
    }
    return EmailAnalyticsService.instance;
  }

  /**
   * Log an email send attempt
   */
  async logEmailSent(entry: EmailSendLogEntry): Promise<void> {
    try {
      await db.insert(emailSendLog).values({
        userId: entry.userId,
        emailType: entry.emailType,
        subject: entry.subject,
        recipientEmail: entry.recipientEmail,
        status: entry.status,
        messageId: entry.messageId,
        errorMessage: entry.errorMessage,
        sentAt: new Date()
      });

      console.log(`Email log entry created: ${entry.emailType} to ${entry.recipientEmail} - ${entry.status}`);
    } catch (error) {
      console.error('Error logging email send:', error);
      // Don't throw error to avoid breaking email sending
    }
  }

  /**
   * Get comprehensive email analytics
   */
  async getEmailAnalytics(startDate?: Date, endDate?: Date): Promise<EmailAnalytics> {
    try {
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const end = endDate || new Date();

      // Get total counts
      const totalCounts = await db
        .select({
          status: emailSendLog.status,
          count: count()
        })
        .from(emailSendLog)
        .where(
          and(
            gte(emailSendLog.sentAt, start),
            lte(emailSendLog.sentAt, end)
          )
        )
        .groupBy(emailSendLog.status);

      const totalSent = totalCounts.reduce((sum, item) => sum + Number(item.count), 0);
      const totalFailed = totalCounts
        .filter(item => item.status === 'failed')
        .reduce((sum, item) => sum + Number(item.count), 0);
      const successRate = totalSent > 0 ? ((totalSent - totalFailed) / totalSent) * 100 : 0;

      // Get email types breakdown
      const emailTypesData = await db
        .select({
          emailType: emailSendLog.emailType,
          status: emailSendLog.status,
          count: count()
        })
        .from(emailSendLog)
        .where(
          and(
            gte(emailSendLog.sentAt, start),
            lte(emailSendLog.sentAt, end)
          )
        )
        .groupBy(emailSendLog.emailType, emailSendLog.status);

      // Process email types data
      const emailTypesMap = new Map<string, { total: number; failed: number }>();
      emailTypesData.forEach(item => {
        const current = emailTypesMap.get(item.emailType) || { total: 0, failed: 0 };
        current.total += Number(item.count);
        if (item.status === 'failed') {
          current.failed += Number(item.count);
        }
        emailTypesMap.set(item.emailType, current);
      });

      const emailTypes = Array.from(emailTypesMap.entries()).map(([type, data]) => ({
        type,
        count: data.total,
        successRate: data.total > 0 ? ((data.total - data.failed) / data.total) * 100 : 0
      }));

      // Get recent activity (daily breakdown for last 7 days)
      const recentActivity = await this.getRecentEmailActivity(7);

      // Get top recipients
      const topRecipientsData = await db
        .select({
          recipientEmail: emailSendLog.recipientEmail,
          count: count()
        })
        .from(emailSendLog)
        .where(
          and(
            gte(emailSendLog.sentAt, start),
            lte(emailSendLog.sentAt, end)
          )
        )
        .groupBy(emailSendLog.recipientEmail)
        .orderBy(desc(count()))
        .limit(10);

      const topRecipients = topRecipientsData.map(item => ({
        email: item.recipientEmail,
        count: Number(item.count)
      }));

      return {
        totalSent,
        totalFailed,
        successRate: Math.round(successRate * 100) / 100,
        emailTypes,
        recentActivity,
        topRecipients
      };

    } catch (error) {
      console.error('Error generating email analytics:', error);
      return {
        totalSent: 0,
        totalFailed: 0,
        successRate: 0,
        emailTypes: [],
        recentActivity: [],
        topRecipients: []
      };
    }
  }

  /**
   * Get recent email activity breakdown
   */
  async getRecentEmailActivity(days: number = 7): Promise<Array<{ date: string; sent: number; failed: number }>> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      const activity = await db.execute(sql`
        SELECT 
          DATE(sent_at) as date,
          COUNT(*) as total,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
        FROM email_send_log 
        WHERE sent_at >= ${startDate}
        GROUP BY DATE(sent_at)
        ORDER BY date DESC
      `);

      return (activity.rows as any[]).map(row => ({
        date: row.date,
        sent: Number(row.total),
        failed: Number(row.failed)
      }));

    } catch (error) {
      console.error('Error getting recent email activity:', error);
      return [];
    }
  }

  /**
   * Get email preferences statistics
   */
  async getEmailPreferencesStats(): Promise<{
    totalUsers: number;
    preferencesBreakdown: Array<{ preference: string; enabled: number; disabled: number }>;
    frequencyBreakdown: Array<{ frequency: string; count: number }>;
  }> {
    try {
      // Get total users
      const totalUsersResult = await db
        .select({ count: count() })
        .from(users);
      
      const totalUsers = Number(totalUsersResult[0]?.count || 0);

      // Get preferences breakdown
      const preferencesData = await db.execute(sql`
        SELECT 
          COUNT(CASE WHEN weekly_progress_summaries = true THEN 1 END) as weekly_progress_enabled,
          COUNT(CASE WHEN weekly_progress_summaries = false THEN 1 END) as weekly_progress_disabled,
          COUNT(CASE WHEN meal_plan_updates = true THEN 1 END) as meal_plan_enabled,
          COUNT(CASE WHEN meal_plan_updates = false THEN 1 END) as meal_plan_disabled,
          COUNT(CASE WHEN recipe_recommendations = true THEN 1 END) as recipe_recommendations_enabled,
          COUNT(CASE WHEN recipe_recommendations = false THEN 1 END) as recipe_recommendations_disabled,
          COUNT(CASE WHEN system_notifications = true THEN 1 END) as system_notifications_enabled,
          COUNT(CASE WHEN system_notifications = false THEN 1 END) as system_notifications_disabled,
          COUNT(CASE WHEN marketing_emails = true THEN 1 END) as marketing_emails_enabled,
          COUNT(CASE WHEN marketing_emails = false THEN 1 END) as marketing_emails_disabled
        FROM email_preferences
      `);

      const prefData = preferencesData.rows[0] as any;
      const preferencesBreakdown = [
        {
          preference: 'Weekly Progress Summaries',
          enabled: Number(prefData.weekly_progress_enabled || 0),
          disabled: Number(prefData.weekly_progress_disabled || 0)
        },
        {
          preference: 'Meal Plan Updates',
          enabled: Number(prefData.meal_plan_enabled || 0),
          disabled: Number(prefData.meal_plan_disabled || 0)
        },
        {
          preference: 'Recipe Recommendations',
          enabled: Number(prefData.recipe_recommendations_enabled || 0),
          disabled: Number(prefData.recipe_recommendations_disabled || 0)
        },
        {
          preference: 'System Notifications',
          enabled: Number(prefData.system_notifications_enabled || 0),
          disabled: Number(prefData.system_notifications_disabled || 0)
        },
        {
          preference: 'Marketing Emails',
          enabled: Number(prefData.marketing_emails_enabled || 0),
          disabled: Number(prefData.marketing_emails_disabled || 0)
        }
      ];

      // Get frequency breakdown
      const frequencyData = await db
        .select({
          frequency: emailPreferences.frequency,
          count: count()
        })
        .from(emailPreferences)
        .groupBy(emailPreferences.frequency);

      const frequencyBreakdown = frequencyData.map(item => ({
        frequency: item.frequency,
        count: Number(item.count)
      }));

      return {
        totalUsers,
        preferencesBreakdown,
        frequencyBreakdown
      };

    } catch (error) {
      console.error('Error getting email preferences stats:', error);
      return {
        totalUsers: 0,
        preferencesBreakdown: [],
        frequencyBreakdown: []
      };
    }
  }

  /**
   * Get bounce/complaint rates by email type
   */
  async getEmailDeliverabilityStats(): Promise<Array<{ emailType: string; bounceRate: number; complaintRate: number }>> {
    try {
      const deliverabilityData = await db.execute(sql`
        SELECT 
          email_type,
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'bounced' THEN 1 END) as bounced,
          COUNT(CASE WHEN status = 'complaint' THEN 1 END) as complaints
        FROM email_send_log 
        WHERE sent_at >= NOW() - INTERVAL '30 days'
        GROUP BY email_type
        HAVING COUNT(*) > 0
      `);

      return (deliverabilityData.rows as any[]).map(row => ({
        emailType: row.email_type,
        bounceRate: Number(row.total) > 0 ? (Number(row.bounced) / Number(row.total)) * 100 : 0,
        complaintRate: Number(row.total) > 0 ? (Number(row.complaints) / Number(row.total)) * 100 : 0
      }));

    } catch (error) {
      console.error('Error getting email deliverability stats:', error);
      return [];
    }
  }
}

// Export singleton instance
export const emailAnalyticsService = EmailAnalyticsService.getInstance();