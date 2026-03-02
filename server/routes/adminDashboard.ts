// @ts-nocheck - Type errors suppressed
/**
 * Admin Dashboard Routes
 * 
 * Comprehensive admin dashboard endpoints for:
 * - User management and information
 * - Usage statistics
 * - System overview
 * - Access logs and activity tracking
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAdmin } from '../middleware/auth';
import { adminDashboardService } from '../services/adminDashboardService';
import { getAccessLogs } from '../middleware/accessLogging';
import { db } from '../db';
import { eq, sql, count } from 'drizzle-orm';
import { users, recipeInteractions } from '@shared/schema';

const router = Router();

// All routes require admin authentication
router.use(requireAdmin);

/**
 * GET /api/admin/dashboard/overview
 * Get comprehensive system overview
 */
router.get('/overview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const overview = await adminDashboardService.getSystemOverview();
    
    res.json({
      status: 'success',
      data: overview,
      meta: {
        generatedAt: new Date().toISOString(),
        generatedBy: req.user?.id,
      },
    });
  } catch (error) {
    console.error('[Admin Dashboard] Error getting overview:', error);
    next(error);
  }
});

/**
 * GET /api/admin/dashboard/users
 * Get all users with comprehensive information
 */
router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const querySchema = z.object({
      role: z.enum(['admin', 'trainer', 'customer']).optional(),
      search: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(1000).optional().default(100),
      offset: z.coerce.number().int().min(0).optional().default(0),
      sortBy: z.enum(['createdAt', 'email', 'role']).optional().default('createdAt'),
      sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    });

    const query = querySchema.parse(req.query);
    const result = await adminDashboardService.getAllUsers(query);

    res.json({
      status: 'success',
      data: {
        users: result.users,
        pagination: {
          total: result.total,
          limit: query.limit,
          offset: query.offset,
          hasMore: query.offset + query.limit < result.total,
        },
      },
      meta: {
        generatedAt: new Date().toISOString(),
        generatedBy: req.user?.id,
      },
    });
  } catch (error) {
    console.error('[Admin Dashboard] Error getting users:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_QUERY_PARAMS',
        message: 'Invalid query parameters',
        errors: error.errors,
      });
    }
    next(error);
  }
});

/**
 * GET /api/admin/dashboard/users/:id
 * Get detailed information about a specific user
 */
router.get('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const userDetails = await adminDashboardService.getUserDetails(id);
    
    if (!userDetails) {
      return res.status(404).json({
        status: 'error',
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    res.json({
      status: 'success',
      data: userDetails,
      meta: {
        generatedAt: new Date().toISOString(),
        generatedBy: req.user?.id,
      },
    });
  } catch (error) {
    console.error('[Admin Dashboard] Error getting user details:', error);
    next(error);
  }
});

/**
 * GET /api/admin/dashboard/usage-stats
 * Get comprehensive usage statistics
 */
router.get('/usage-stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const querySchema = z.object({
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
    });

    const query = querySchema.parse(req.query);
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    const stats = await adminDashboardService.getUsageStats(startDate, endDate);

    res.json({
      status: 'success',
      data: stats,
      meta: {
        period: {
          start: startDate?.toISOString() || 'last 30 days',
          end: endDate?.toISOString() || 'now',
        },
        generatedAt: new Date().toISOString(),
        generatedBy: req.user?.id,
      },
    });
  } catch (error) {
    console.error('[Admin Dashboard] Error getting usage stats:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_QUERY_PARAMS',
        message: 'Invalid query parameters',
        errors: error.errors,
      });
    }
    next(error);
  }
});

/**
 * GET /api/admin/dashboard/access-logs
 * Get access logs for monitoring user activities
 */
router.get('/access-logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const querySchema = z.object({
      userId: z.string().uuid().optional(),
      endpoint: z.string().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      limit: z.coerce.number().int().min(1).max(1000).optional().default(100),
    });

    const query = querySchema.parse(req.query);
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    const logs = await getAccessLogs({
      userId: query.userId,
      endpoint: query.endpoint,
      startDate,
      endDate,
      limit: query.limit,
    });

    res.json({
      status: 'success',
      data: {
        logs,
        count: logs.length,
      },
      meta: {
        filters: {
          userId: query.userId,
          endpoint: query.endpoint,
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
        },
        generatedAt: new Date().toISOString(),
        generatedBy: req.user?.id,
      },
    });
  } catch (error) {
    console.error('[Admin Dashboard] Error getting access logs:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_QUERY_PARAMS',
        message: 'Invalid query parameters',
        errors: error.errors,
      });
    }
    next(error);
  }
});

/**
 * GET /api/admin/dashboard/user-activity/:userId
 * Get detailed activity for a specific user
 */
router.get('/user-activity/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;

    // Get user info
    const userDetails = await adminDashboardService.getUserDetails(userId);
    if (!userDetails) {
      return res.status(404).json({
        status: 'error',
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    // Get access logs for this user
    const logs = await getAccessLogs({
      userId,
      limit: 100,
    });

    // Get interaction statistics
    const [interactionStats] = await db
      .select({
        total: count(),
        views: sql<number>`count(case when ${recipeInteractions.interactionType} = 'view' then 1 end)`,
        favorites: sql<number>`count(case when ${recipeInteractions.interactionType} = 'favorite' then 1 end)`,
        ratings: sql<number>`count(case when ${recipeInteractions.interactionType} = 'rate' then 1 end)`,
      })
      .from(recipeInteractions)
      .where(eq(recipeInteractions.userId, userId));

    res.json({
      status: 'success',
      data: {
        user: userDetails,
        activity: {
          accessLogs: logs,
          interactions: {
            total: interactionStats?.total || 0,
            views: interactionStats?.views || 0,
            favorites: interactionStats?.favorites || 0,
            ratings: interactionStats?.ratings || 0,
          },
        },
      },
      meta: {
        generatedAt: new Date().toISOString(),
        generatedBy: req.user?.id,
      },
    });
  } catch (error) {
    console.error('[Admin Dashboard] Error getting user activity:', error);
    next(error);
  }
});

/**
 * PATCH /api/admin/dashboard/users/:id/role
 * Update user role (admin only)
 */
router.patch('/users/:id/role', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const bodySchema = z.object({
      role: z.enum(['admin', 'trainer', 'customer']),
    });

    const { role } = bodySchema.parse(req.body);

    // Prevent changing your own role
    if (id === req.user?.id) {
      return res.status(400).json({
        status: 'error',
        code: 'CANNOT_CHANGE_OWN_ROLE',
        message: 'You cannot change your own role',
      });
    }

    await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id));

    const updatedUser = await adminDashboardService.getUserDetails(id);

    res.json({
      status: 'success',
      data: updatedUser,
      message: `User role updated to ${role}`,
      meta: {
        updatedAt: new Date().toISOString(),
        updatedBy: req.user?.id,
      },
    });
  } catch (error) {
    console.error('[Admin Dashboard] Error updating user role:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_REQUEST_BODY',
        message: 'Invalid request body',
        errors: error.errors,
      });
    }
    next(error);
  }
});

/**
 * DELETE /api/admin/dashboard/users/:id
 * Delete a user (admin only)
 */
router.delete('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    if (id === req.user?.id) {
      return res.status(400).json({
        status: 'error',
        code: 'CANNOT_DELETE_SELF',
        message: 'You cannot delete your own account',
      });
    }

    // Check if user exists
    const user = await adminDashboardService.getUserDetails(id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    // Delete user (cascade will handle related records)
    await db.delete(users).where(eq(users.id, id));

    res.json({
      status: 'success',
      message: `User ${user.email} has been deleted`,
      meta: {
        deletedAt: new Date().toISOString(),
        deletedBy: req.user?.id,
        deletedUser: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('[Admin Dashboard] Error deleting user:', error);
    next(error);
  }
});

/**
 * GET /api/admin/dashboard/time-series
 * Get time series data for charts (REAL data)
 */
router.get('/time-series', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const querySchema = z.object({
      days: z.coerce.number().int().min(1).max(365).optional().default(30),
    });

    const { days } = querySchema.parse(req.query);
    const timeSeriesData = await adminDashboardService.getTimeSeriesData(days);

    res.json({
      status: 'success',
      data: timeSeriesData,
      meta: {
        days,
        generatedAt: new Date().toISOString(),
        generatedBy: req.user?.id,
      },
    });
  } catch (error) {
    console.error('[Admin Dashboard] Error getting time series:', error);
    next(error);
  }
});

/**
 * GET /api/admin/dashboard/stats/summary
 * Get quick stats summary for dashboard widgets
 */
router.get('/stats/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [overview, usageStats] = await Promise.all([
      adminDashboardService.getSystemOverview(),
      adminDashboardService.getUsageStats(),
    ]);

    res.json({
      status: 'success',
      data: {
        quickStats: {
          totalUsers: overview.users.total,
          newUsersToday: overview.users.newToday,
          totalRecipes: overview.content.totalRecipes,
          pendingRecipes: overview.content.pendingRecipes,
          activeSubscriptions: overview.subscriptions.active,
          monthlyRevenue: overview.subscriptions.revenue.monthly,
        },
        users: {
          byRole: overview.users.byRole,
          active: usageStats.activeUsers,
        },
        content: {
          recipes: {
            total: overview.content.totalRecipes,
            approved: overview.content.approvedRecipes,
            pending: overview.content.pendingRecipes,
          },
          mealPlans: overview.content.totalMealPlans,
        },
        engagement: {
          totalInteractions: overview.engagement.totalInteractions,
          activeUsersToday: overview.engagement.activeUsersToday,
        },
      },
      meta: {
        generatedAt: new Date().toISOString(),
        generatedBy: req.user?.id,
      },
    });
  } catch (error) {
    console.error('[Admin Dashboard] Error getting stats summary:', error);
    next(error);
  }
});

/**
 * Error handling middleware
 */
router.use((error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Admin Dashboard] Error:', error);

  res.status(error.status || 500).json({
    status: 'error',
    code: error.code || 'INTERNAL_SERVER_ERROR',
    message: error.message || 'An error occurred while processing the request',
  });
});

export { router as adminDashboardRouter };

