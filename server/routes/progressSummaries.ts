import express from 'express';
import { requireAuth, requireTrainerOrAdmin, requireAdmin } from '../middleware/auth';
import { progressSummaryService } from '../services/progressSummaryService';
import { schedulerService } from '../services/schedulerService';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const progressSummariesRouter = express.Router();

/**
 * POST /api/progress-summaries/generate/:customerId
 * Generate a progress summary for a specific customer (trainers only)
 */
progressSummariesRouter.post('/generate/:customerId', requireTrainerOrAdmin, async (req, res) => {
  try {
    const { customerId } = req.params;
    const userId = req.user!.id;

    // Validate customerId is a valid UUID
    if (!z.string().uuid().safeParse(customerId).success) {
      return res.status(400).json({ error: 'Invalid customer ID format' });
    }

    // Check if customer exists
    const [customer] = await db
      .select()
      .from(users)
      .where(eq(users.id, customerId))
      .limit(1);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Parse date range from request body or use default (last week)
    const today = new Date();
    const defaultWeekStart = new Date(today);
    defaultWeekStart.setDate(today.getDate() - today.getDay() - 6); // Previous Monday
    defaultWeekStart.setHours(0, 0, 0, 0);

    const defaultWeekEnd = new Date(defaultWeekStart);
    defaultWeekEnd.setDate(defaultWeekStart.getDate() + 6);
    defaultWeekEnd.setHours(23, 59, 59, 999);

    const weekStartDate = req.body.weekStartDate ? new Date(req.body.weekStartDate) : defaultWeekStart;
    const weekEndDate = req.body.weekEndDate ? new Date(req.body.weekEndDate) : defaultWeekEnd;

    // Generate progress summary
    const progressData = await progressSummaryService.generateWeeklyProgressSummary(
      customerId,
      weekStartDate,
      weekEndDate
    );

    if (!progressData) {
      return res.status(404).json({ 
        error: 'Unable to generate progress summary for this customer',
        details: 'Customer may not have sufficient data or trainer relationship'
      });
    }

    res.json({
      success: true,
      data: progressData,
      message: 'Progress summary generated successfully'
    });

  } catch (error) {
    console.error('Error generating progress summary:', error);
    res.status(500).json({ error: 'Failed to generate progress summary' });
  }
});

/**
 * POST /api/progress-summaries/send/:customerId
 * Generate and send a progress summary email for a specific customer
 */
progressSummariesRouter.post('/send/:customerId', requireTrainerOrAdmin, async (req, res) => {
  try {
    const { customerId } = req.params;
    const userId = req.user!.id;

    // Validate customerId is a valid UUID
    if (!z.string().uuid().safeParse(customerId).success) {
      return res.status(400).json({ error: 'Invalid customer ID format' });
    }

    // Parse date range from request body or use default (last week)
    const today = new Date();
    const defaultWeekStart = new Date(today);
    defaultWeekStart.setDate(today.getDate() - today.getDay() - 6); // Previous Monday
    defaultWeekStart.setHours(0, 0, 0, 0);

    const defaultWeekEnd = new Date(defaultWeekStart);
    defaultWeekEnd.setDate(defaultWeekStart.getDate() + 6);
    defaultWeekEnd.setHours(23, 59, 59, 999);

    const weekStartDate = req.body.weekStartDate ? new Date(req.body.weekStartDate) : defaultWeekStart;
    const weekEndDate = req.body.weekEndDate ? new Date(req.body.weekEndDate) : defaultWeekEnd;

    // Generate progress summary
    const progressData = await progressSummaryService.generateWeeklyProgressSummary(
      customerId,
      weekStartDate,
      weekEndDate
    );

    if (!progressData) {
      return res.status(404).json({ 
        error: 'Unable to generate progress summary for this customer',
        details: 'Customer may not have sufficient data or trainer relationship'
      });
    }

    // Send email
    const { emailService } = await import('../services/emailService');
    const emailResult = await emailService.sendProgressSummaryEmail(progressData);

    if (!emailResult.success) {
      return res.status(500).json({
        error: 'Progress summary generated but failed to send email',
        details: emailResult.error,
        data: progressData
      });
    }

    res.json({
      success: true,
      message: 'Progress summary sent successfully',
      emailId: emailResult.messageId,
      data: progressData
    });

  } catch (error) {
    console.error('Error sending progress summary:', error);
    res.status(500).json({ error: 'Failed to send progress summary' });
  }
});

/**
 * POST /api/progress-summaries/send-all
 * Send weekly progress summaries for all customers (admin only)
 */
progressSummariesRouter.post('/send-all', requireAdmin, async (req, res) => {
  try {
    console.log('Starting batch progress summary sending...');
    
    const result = await progressSummaryService.sendWeeklyProgressSummariesForAllCustomers();

    res.json({
      success: true,
      message: `Batch progress summary completed`,
      summary: {
        sent: result.sent,
        errors: result.errors,
        total: result.sent + result.errors
      },
      details: result.results
    });

  } catch (error) {
    console.error('Error sending batch progress summaries:', error);
    res.status(500).json({ 
      error: 'Failed to send batch progress summaries',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/progress-summaries/preview/:customerId
 * Preview a progress summary for a customer without sending email
 */
progressSummariesRouter.get('/preview/:customerId', requireTrainerOrAdmin, async (req, res) => {
  try {
    const { customerId } = req.params;
    
    // Validate customerId is a valid UUID
    if (!z.string().uuid().safeParse(customerId).success) {
      return res.status(400).json({ error: 'Invalid customer ID format' });
    }

    // Parse date range from query parameters or use default (last week)
    const today = new Date();
    const defaultWeekStart = new Date(today);
    defaultWeekStart.setDate(today.getDate() - today.getDay() - 6); // Previous Monday
    defaultWeekStart.setHours(0, 0, 0, 0);

    const defaultWeekEnd = new Date(defaultWeekStart);
    defaultWeekEnd.setDate(defaultWeekStart.getDate() + 6);
    defaultWeekEnd.setHours(23, 59, 59, 999);

    const weekStartDate = req.query.weekStartDate ? new Date(req.query.weekStartDate as string) : defaultWeekStart;
    const weekEndDate = req.query.weekEndDate ? new Date(req.query.weekEndDate as string) : defaultWeekEnd;

    // Generate progress summary
    const progressData = await progressSummaryService.generateWeeklyProgressSummary(
      customerId,
      weekStartDate,
      weekEndDate
    );

    if (!progressData) {
      return res.status(404).json({ 
        error: 'Unable to generate progress summary for this customer',
        details: 'Customer may not have sufficient data or trainer relationship'
      });
    }

    res.json({
      success: true,
      data: progressData,
      preview: true,
      message: 'Progress summary preview generated successfully'
    });

  } catch (error) {
    console.error('Error generating progress summary preview:', error);
    res.status(500).json({ error: 'Failed to generate progress summary preview' });
  }
});

/**
 * GET /api/progress-summaries/status
 * Get status information about progress summary system (admin only)
 */
progressSummariesRouter.get('/status', requireAdmin, async (req, res) => {
  try {
    // Count customers with trainers
    const customersWithTrainers = await db.execute(`
      SELECT COUNT(DISTINCT customer_id) as count 
      FROM personalized_meal_plans
    `);

    // Check email service configuration
    const emailConfigured = !!(process.env.RESEND_API_KEY && process.env.FROM_EMAIL);

    res.json({
      success: true,
      status: {
        emailServiceConfigured: emailConfigured,
        customersWithTrainers: customersWithTrainers.rows[0]?.count || 0,
        lastWeekRange: {
          start: (() => {
            const today = new Date();
            const lastMonday = new Date(today);
            lastMonday.setDate(today.getDate() - today.getDay() - 6);
            lastMonday.setHours(0, 0, 0, 0);
            return lastMonday.toISOString();
          })(),
          end: (() => {
            const today = new Date();
            const lastMonday = new Date(today);
            lastMonday.setDate(today.getDate() - today.getDay() - 6);
            const lastSunday = new Date(lastMonday);
            lastSunday.setDate(lastMonday.getDate() + 6);
            lastSunday.setHours(23, 59, 59, 999);
            return lastSunday.toISOString();
          })()
        }
      },
      message: 'Progress summary system status retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting progress summary status:', error);
    res.status(500).json({ error: 'Failed to get progress summary status' });
  }
});

/**
 * GET /api/progress-summaries/scheduler/status
 * Get scheduler status and job information (admin only)
 */
progressSummariesRouter.get('/scheduler/status', requireAdmin, async (req, res) => {
  try {
    const jobsStatus = schedulerService.getJobsStatus();
    
    res.json({
      success: true,
      scheduler: {
        enabled: process.env.ENABLE_SCHEDULER === 'true' || process.env.NODE_ENV === 'production',
        timezone: process.env.TIMEZONE || 'America/New_York',
        jobs: jobsStatus
      },
      message: 'Scheduler status retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting scheduler status:', error);
    res.status(500).json({ error: 'Failed to get scheduler status' });
  }
});

/**
 * POST /api/progress-summaries/scheduler/trigger/:jobName
 * Manually trigger a scheduled job (admin only)
 */
progressSummariesRouter.post('/scheduler/trigger/:jobName', requireAdmin, async (req, res) => {
  try {
    const { jobName } = req.params;
    
    const result = await schedulerService.triggerJob(jobName);
    
    if (result.success) {
      res.json({
        success: true,
        result: result.result,
        message: `Job '${jobName}' triggered successfully`
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: `Failed to trigger job '${jobName}'`
      });
    }

  } catch (error) {
    console.error('Error triggering job:', error);
    res.status(500).json({ error: 'Failed to trigger job' });
  }
});

export { progressSummariesRouter };