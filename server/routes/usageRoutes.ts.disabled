/**
 * Usage API Routes
 *
 * Endpoints for usage tracking and statistics:
 * - GET /api/usage/stats - Get current user's usage statistics
 * - GET /api/usage/history - Get usage event history
 * - GET /api/usage/analytics - Admin-only usage analytics
 */

import express, { Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { getUserUsageStats } from '../middleware/usageEnforcement';
import {
  getUserUsageSummary,
  getUsageAnalytics,
} from '../services/usageTracking';

const router = express.Router();

/**
 * GET /api/usage/stats
 * Get current user's usage statistics
 */
router.get('/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (!user || !user.id) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const stats = await getUserUsageStats(user.id);

    if (!stats) {
      res.status(404).json({
        status: 'error',
        message: 'Usage statistics not found',
      });
      return;
    }

    res.json(stats);
  } catch (error) {
    console.error('Error fetching usage stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch usage statistics',
    });
  }
});

/**
 * GET /api/usage/history
 * Get current user's usage event history
 */
router.get('/history', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const days = parseInt(req.query.days as string) || 30;

    if (!user || !user.id) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const summary = await getUserUsageSummary(user.id, days);

    if (!summary) {
      res.status(404).json({
        status: 'error',
        message: 'Usage history not found',
      });
      return;
    }

    res.json(summary);
  } catch (error) {
    console.error('Error fetching usage history:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch usage history',
    });
  }
});

/**
 * GET /api/usage/analytics
 * Admin-only: Get usage analytics for all users
 */
router.get('/analytics', requireAdmin, async (req: Request, res: Response) => {
  try {
    const startDateParam = req.query.startDate as string;
    const endDateParam = req.query.endDate as string;

    // Default to last 30 days if not specified
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const analytics = await getUsageAnalytics(startDate, endDate);

    if (!analytics) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to generate analytics',
      });
      return;
    }

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching usage analytics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch usage analytics',
    });
  }
});

export default router;
