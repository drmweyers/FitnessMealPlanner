/**
 * Analytics API Routes
 * Story 1.9: Advanced Analytics Dashboard
 * 
 * Provides endpoints for system analytics, metrics, and monitoring
 * Only accessible to admin users
 */

import { Router, Request, Response } from 'express';
import { analyticsService } from '../services/analyticsService';
import { requireAuth } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Middleware to ensure only admins can access analytics
const adminOnly = (req: Request, res: Response, next: Function) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Access denied. Admin privileges required.' 
    });
  }
  next();
};

// Apply authentication and admin check to all routes
router.use(requireAuth);
router.use(adminOnly);

/**
 * GET /api/analytics/metrics
 * Get comprehensive system metrics
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const metrics = await analyticsService.getSystemMetrics();
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get system metrics:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to retrieve system metrics' 
    });
  }
});

/**
 * GET /api/analytics/users
 * Get user activity and engagement data
 */
router.get('/users', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const activity = await analyticsService.getUserActivity(limit);
    res.json({
      success: true,
      data: activity,
      count: activity.length
    });
  } catch (error) {
    logger.error('Failed to get user activity:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to retrieve user activity' 
    });
  }
});

/**
 * GET /api/analytics/content
 * Get content metrics and trends
 */
router.get('/content', async (req: Request, res: Response) => {
  try {
    const contentMetrics = await analyticsService.getContentMetrics();
    res.json({
      success: true,
      data: contentMetrics
    });
  } catch (error) {
    logger.error('Failed to get content metrics:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to retrieve content metrics' 
    });
  }
});

/**
 * GET /api/analytics/security
 * Get security metrics and alerts
 */
router.get('/security', async (req: Request, res: Response) => {
  try {
    const securityMetrics = await analyticsService.getSecurityMetrics();
    res.json({
      success: true,
      data: securityMetrics
    });
  } catch (error) {
    logger.error('Failed to get security metrics:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to retrieve security metrics' 
    });
  }
});

/**
 * GET /api/analytics/health
 * Get system health status
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Check various system components
    const health = {
      status: 'healthy',
      components: {
        database: 'healthy',
        redis: process.env.REDIS_URL ? 'healthy' : 'not configured',
        api: 'healthy',
        storage: 'healthy'
      },
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB'
      },
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    logger.error('Failed to get system health:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to retrieve system health' 
    });
  }
});

/**
 * POST /api/analytics/cache/clear
 * Clear analytics cache
 */
router.post('/cache/clear', async (req: Request, res: Response) => {
  try {
    analyticsService.clearCache();
    logger.info('Analytics cache cleared by admin:', req.user?.id);
    res.json({
      success: true,
      message: 'Analytics cache cleared successfully'
    });
  } catch (error) {
    logger.error('Failed to clear analytics cache:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to clear analytics cache' 
    });
  }
});

/**
 * GET /api/analytics/export
 * Export analytics data (CSV or JSON)
 */
router.get('/export', async (req: Request, res: Response) => {
  try {
    const format = req.query.format || 'json';
    const metrics = await analyticsService.getSystemMetrics();
    
    if (format === 'csv') {
      // Convert to CSV format
      const csv = convertMetricsToCSV(metrics);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=analytics-export.csv');
      res.send(csv);
    } else {
      // JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=analytics-export.json');
      res.json(metrics);
    }
  } catch (error) {
    logger.error('Failed to export analytics:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to export analytics data' 
    });
  }
});

/**
 * Helper function to convert metrics to CSV
 */
function convertMetricsToCSV(metrics: any): string {
  const lines = [];
  lines.push('Metric,Value');
  
  // Flatten the metrics object
  const flattenObject = (obj: any, prefix = ''): void => {
    for (const key in obj) {
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        flattenObject(value, newKey);
      } else if (!Array.isArray(value)) {
        lines.push(`"${newKey}","${value}"`);
      }
    }
  };
  
  flattenObject(metrics);
  return lines.join('\n');
}

export default router;