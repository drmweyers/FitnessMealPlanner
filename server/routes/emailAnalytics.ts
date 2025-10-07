import express from 'express';
import { requireAdmin } from '../middleware/auth';
import { emailAnalyticsService } from '../services/emailAnalyticsService';
import { z } from 'zod';

const emailAnalyticsRouter = express.Router();

/**
 * GET /api/email-analytics/overview
 * Get comprehensive email analytics overview (admin only)
 */
emailAnalyticsRouter.get('/overview', requireAdmin, async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const analytics = await emailAnalyticsService.getEmailAnalytics(startDate, endDate);

    res.json({
      success: true,
      analytics,
      message: 'Email analytics retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting email analytics:', error);
    res.status(500).json({ error: 'Failed to get email analytics' });
  }
});

/**
 * GET /api/email-analytics/preferences
 * Get email preferences statistics (admin only)
 */
emailAnalyticsRouter.get('/preferences', requireAdmin, async (req, res) => {
  try {
    const stats = await emailAnalyticsService.getEmailPreferencesStats();

    res.json({
      success: true,
      stats,
      message: 'Email preferences statistics retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting email preferences stats:', error);
    res.status(500).json({ error: 'Failed to get email preferences statistics' });
  }
});

/**
 * GET /api/email-analytics/deliverability
 * Get email deliverability statistics (admin only)
 */
emailAnalyticsRouter.get('/deliverability', requireAdmin, async (req, res) => {
  try {
    const deliverabilityStats = await emailAnalyticsService.getEmailDeliverabilityStats();

    res.json({
      success: true,
      deliverabilityStats,
      message: 'Email deliverability statistics retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting email deliverability stats:', error);
    res.status(500).json({ error: 'Failed to get email deliverability statistics' });
  }
});

/**
 * GET /api/email-analytics/activity
 * Get recent email activity (admin only)
 */
emailAnalyticsRouter.get('/activity', requireAdmin, async (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 7;
    
    if (days < 1 || days > 365) {
      return res.status(400).json({ error: 'Days must be between 1 and 365' });
    }

    const activity = await emailAnalyticsService.getRecentEmailActivity(days);

    res.json({
      success: true,
      activity,
      period: `Last ${days} days`,
      message: 'Recent email activity retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting recent email activity:', error);
    res.status(500).json({ error: 'Failed to get recent email activity' });
  }
});

/**
 * GET /api/email-analytics/dashboard
 * Get consolidated dashboard data for email analytics (admin only)
 */
emailAnalyticsRouter.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    // Get all analytics data in parallel
    const [
      emailAnalytics,
      preferencesStats,
      deliverabilityStats,
      recentActivity
    ] = await Promise.all([
      emailAnalyticsService.getEmailAnalytics(),
      emailAnalyticsService.getEmailPreferencesStats(),
      emailAnalyticsService.getEmailDeliverabilityStats(),
      emailAnalyticsService.getRecentEmailActivity(7)
    ]);

    // Calculate key metrics
    const keyMetrics = {
      totalEmailsSent: emailAnalytics.totalSent,
      successRate: emailAnalytics.successRate,
      activeSubscribers: preferencesStats.preferencesBreakdown
        .find(p => p.preference === 'Weekly Progress Summaries')?.enabled || 0,
      averageBounceRate: deliverabilityStats.length > 0 
        ? deliverabilityStats.reduce((sum, stat) => sum + stat.bounceRate, 0) / deliverabilityStats.length 
        : 0
    };

    const dashboard = {
      keyMetrics,
      emailAnalytics,
      preferencesStats,
      deliverabilityStats,
      recentActivity: recentActivity.slice(0, 7), // Last 7 days
      lastUpdated: new Date().toISOString()
    };

    res.json({
      success: true,
      dashboard,
      message: 'Email analytics dashboard data retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting email analytics dashboard:', error);
    res.status(500).json({ error: 'Failed to get email analytics dashboard' });
  }
});

export { emailAnalyticsRouter };