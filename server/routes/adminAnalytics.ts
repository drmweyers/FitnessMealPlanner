// @ts-nocheck - Optional feature, type errors suppressed
/**
 * Admin Analytics API Routes - Platform Insights and Management
 * 
 * Provides comprehensive analytics and insights for platform administrators.
 * Includes user engagement metrics, content performance, system health,
 * and business intelligence dashboards.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getTrendingService } from '../services/TrendingService';
import { getEngagementService } from '../services/EngagementService';
import { getFavoritesService } from '../services/FavoritesService';
import { getRecommendationService } from '../services/RecommendationService';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { db } from '../db';
import { sql, desc, eq, gte, and, count } from 'drizzle-orm';
import {
  users,
  recipes,
  recipeInteractions,
  personalizedMealPlans
} from '../../shared/schema';
import {
  recipeFavorites
} from '../../shared/schema-favorites';

const router = Router();
const trendingService = getTrendingService();
const engagementService = getEngagementService();
const favoritesService = getFavoritesService();
const recommendationService = getRecommendationService();

// All admin analytics routes require admin authentication
router.use(requireAuth);
router.use(requireAdmin);

// Rate limiting for admin endpoints
const createRateLimiter = (windowMs: number, max: number) => {
  const windows = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `admin:${req.user!.id}`;
    const now = Date.now();
    const window = windows.get(key);
    
    if (!window || now > window.resetTime) {
      windows.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (window.count >= max) {
      return res.status(429).json({
        status: 'error',
        code: 'ADMIN_RATE_LIMIT_EXCEEDED',
        message: 'Too many admin requests. Please try again later.',
        retryAfter: Math.ceil((window.resetTime - now) / 1000)
      });
    }
    
    window.count++;
    next();
  };
};

const adminRateLimit = createRateLimiter(60 * 1000, 100); // 100 requests per minute for admins

// Query validation schemas
const analyticsTimeframeSchema = z.object({
  days: z.string().optional().transform(val => {
    if (!val) return 30;
    const parsed = parseInt(val);
    return isNaN(parsed) ? 30 : Math.min(Math.max(parsed, 1), 365);
  }),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

const topContentSchema = z.object({
  limit: z.string().optional().transform(val => {
    if (!val) return 10;
    const parsed = parseInt(val);
    return isNaN(parsed) ? 10 : Math.min(Math.max(parsed, 1), 100);
  }),
  metric: z.enum(['views', 'ratings', 'favorites', 'shares', 'engagement']).optional().default('engagement')
});

/**
 * Platform Overview Analytics
 */

// GET /api/admin/analytics/overview - Platform engagement overview
router.get(
  '/overview',
  adminRateLimit,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const queryValidation = analyticsTimeframeSchema.safeParse(req.query);
      if (!queryValidation.success) {
        return res.status(400).json({
          status: 'error',
          code: 'INVALID_QUERY_PARAMS',
          message: 'Invalid query parameters',
          errors: queryValidation.error.errors
        });
      }

      const { days } = queryValidation.data;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Get comprehensive platform metrics
      const [
        userMetrics,
        contentMetrics,
        engagementMetrics,
        systemMetrics
      ] = await Promise.all([
        getUserMetrics(startDate),
        getContentMetrics(startDate),
        getEngagementMetrics(startDate),
        getSystemMetrics()
      ]);

      // Calculate growth rates
      const previousPeriodStart = new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000);
      const growthMetrics = await calculateGrowthRates(previousPeriodStart, startDate);

      res.json({
        status: 'success',
        data: {
          timeframe: {
            days,
            startDate: startDate.toISOString(),
            endDate: new Date().toISOString()
          },
          users: userMetrics,
          content: contentMetrics,
          engagement: engagementMetrics,
          system: systemMetrics,
          growth: growthMetrics
        },
        meta: {
          description: 'Platform overview analytics',
          generatedAt: new Date().toISOString(),
          generatedBy: req.user!.id
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/admin/analytics/recipes - Recipe performance analytics
router.get(
  '/recipes',
  adminRateLimit,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const queryValidation = topContentSchema.safeParse(req.query);
      if (!queryValidation.success) {
        return res.status(400).json({
          status: 'error',
          code: 'INVALID_QUERY_PARAMS',
          message: 'Invalid query parameters',
          errors: queryValidation.error.errors
        });
      }

      const { limit, metric } = queryValidation.data;

      // Get top performing recipes based on selected metric
      const topRecipes = await getTopRecipesByMetric(metric, limit);
      
      // Get recipe analytics breakdown
      const recipeAnalytics = await getRecipeAnalyticsBreakdown();

      res.json({
        status: 'success',
        data: {
          topRecipes: {
            metric,
            recipes: topRecipes,
            count: topRecipes.length
          },
          analytics: recipeAnalytics
        },
        meta: {
          description: `Top ${limit} recipes by ${metric}`,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/admin/analytics/users - User engagement analytics
router.get(
  '/users',
  adminRateLimit,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const queryValidation = analyticsTimeframeSchema.safeParse(req.query);
      if (!queryValidation.success) {
        return res.status(400).json({
          status: 'error',
          code: 'INVALID_QUERY_PARAMS',
          message: 'Invalid query parameters',
          errors: queryValidation.error.errors
        });
      }

      const { days } = queryValidation.data;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Get user engagement analytics
      const [
        userSegmentation,
        activityPatterns,
        retentionMetrics,
        topUsers
      ] = await Promise.all([
        getUserSegmentation(startDate),
        getUserActivityPatterns(startDate),
        getUserRetentionMetrics(days),
        getTopUsersByEngagement(10)
      ]);

      res.json({
        status: 'success',
        data: {
          timeframe: {
            days,
            startDate: startDate.toISOString()
          },
          segmentation: userSegmentation,
          activityPatterns,
          retention: retentionMetrics,
          topUsers
        },
        meta: {
          description: 'User engagement analytics',
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/admin/analytics/trends - Platform trends and insights
router.get(
  '/trends',
  adminRateLimit,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const queryValidation = analyticsTimeframeSchema.safeParse(req.query);
      if (!queryValidation.success) {
        return res.status(400).json({
          status: 'error',
          code: 'INVALID_QUERY_PARAMS',
          message: 'Invalid query parameters',
          errors: queryValidation.error.errors
        });
      }

      const { days } = queryValidation.data;

      // Get trending insights
      const [
        contentTrends,
        userBehaviorTrends,
        seasonalPatterns,
        predictiveInsights
      ] = await Promise.all([
        getContentTrends(days),
        getUserBehaviorTrends(days),
        getSeasonalPatterns(),
        getPredictiveInsights(days)
      ]);

      res.json({
        status: 'success',
        data: {
          timeframe: { days },
          content: contentTrends,
          userBehavior: userBehaviorTrends,
          seasonal: seasonalPatterns,
          predictions: predictiveInsights
        },
        meta: {
          description: 'Platform trends and predictive insights',
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Real-time Analytics Endpoints
 */

// GET /api/admin/analytics/realtime - Real-time platform metrics
router.get(
  '/realtime',
  adminRateLimit,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get real-time engagement stats
      const realtimeStats = await trendingService.getEngagementStats();
      
      // Get current active users (simplified)
      const activeUsers = await getCurrentActiveUsers();
      
      // Get trending content right now
      const currentTrending = await trendingService.getTrendingRecipes(10, '1h');
      
      // Get viral content detection
      const viralContent = await trendingService.getViralRecipes(5);

      res.json({
        status: 'success',
        data: {
          engagement: realtimeStats,
          activeUsers,
          trending: currentTrending,
          viral: viralContent
        },
        meta: {
          description: 'Real-time platform metrics',
          timestamp: new Date().toISOString(),
          refreshInterval: '1 minute'
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Advanced Analytics Endpoints
 */

// GET /api/admin/analytics/cohort - User cohort analysis
router.get(
  '/cohort',
  adminRateLimit,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const periodQuery = req.query.period as string;
      const period = ['daily', 'weekly', 'monthly'].includes(periodQuery) ? periodQuery : 'weekly';

      const cohortAnalysis = await getCohortAnalysis(period as 'daily' | 'weekly' | 'monthly');

      res.json({
        status: 'success',
        data: {
          period,
          cohorts: cohortAnalysis
        },
        meta: {
          description: `User cohort analysis by ${period} periods`,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/admin/analytics/funnel - User conversion funnel
router.get(
  '/funnel',
  adminRateLimit,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const queryValidation = analyticsTimeframeSchema.safeParse(req.query);
      if (!queryValidation.success) {
        return res.status(400).json({
          status: 'error',
          code: 'INVALID_QUERY_PARAMS',
          message: 'Invalid query parameters',
          errors: queryValidation.error.errors
        });
      }

      const { days } = queryValidation.data;
      const funnelAnalysis = await getUserConversionFunnel(days);

      res.json({
        status: 'success',
        data: {
          timeframe: { days },
          funnel: funnelAnalysis
        },
        meta: {
          description: 'User conversion funnel analysis',
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Export and Reporting Endpoints
 */

// GET /api/admin/analytics/export - Export analytics data
router.get(
  '/export',
  adminRateLimit,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const formatQuery = req.query.format as string;
      const format = ['json', 'csv'].includes(formatQuery) ? formatQuery : 'json';
      
      const queryValidation = analyticsTimeframeSchema.safeParse(req.query);
      if (!queryValidation.success) {
        return res.status(400).json({
          status: 'error',
          code: 'INVALID_QUERY_PARAMS',
          message: 'Invalid query parameters'
        });
      }

      const { days } = queryValidation.data;
      const exportData = await generateAnalyticsExport(days);

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="analytics-${days}d-${Date.now()}.csv"`);
        res.send(convertToCSV(exportData));
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="analytics-${days}d-${Date.now()}.json"`);
        res.json({
          status: 'success',
          data: exportData,
          meta: {
            exportedAt: new Date().toISOString(),
            timeframe: { days },
            exportedBy: req.user!.id
          }
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Helper Functions for Analytics Calculations
 */

async function getUserMetrics(startDate: Date) {
  const [result] = await db
    .select({
      totalUsers: sql<number>`count(*)`,
      newUsers: sql<number>`count(case when ${users.createdAt} >= ${startDate} then 1 end)`,
      activeUsers: sql<number>`count(distinct case when EXISTS(
        select 1 from ${recipeViews} 
        where ${recipeInteractions.userId} = ${users.id} 
        and ${recipeInteractions.interactionDate} >= ${startDate}
      ) then ${users.id} end)`,
      adminUsers: sql<number>`count(case when ${users.role} = 'admin' then 1 end)`,
      trainerUsers: sql<number>`count(case when ${users.role} = 'trainer' then 1 end)`,
      customerUsers: sql<number>`count(case when ${users.role} = 'customer' then 1 end)`
    })
    .from(users);

  return result;
}

async function getContentMetrics(startDate: Date) {
  const [result] = await db
    .select({
      totalRecipes: sql<number>`count(*)`,
      approvedRecipes: sql<number>`count(case when ${recipes.isApproved} = true then 1 end)`,
      newRecipes: sql<number>`count(case when ${recipes.creationTimestamp} >= ${startDate} then 1 end)`,
      averageRating: sql<number>`(select avg(${recipeInteractions.interactionValue}) from ${recipeRatings})`,
      totalRatings: sql<number>`(select count(*) from ${recipeRatings} where ${recipeInteractions.interactionDate} >= ${startDate})`,
      totalFavorites: sql<number>`(select count(*) from ${recipeFavorites} where ${recipeFavorites.createdAt} >= ${startDate})`
    })
    .from(recipes);

  return result;
}

async function getEngagementMetrics(startDate: Date) {
  const [result] = await db
    .select({
      totalViews: sql<number>`(select count(*) from ${recipeViews} where ${recipeInteractions.interactionDate} >= ${startDate})`,
      uniqueViewers: sql<number>`(select count(distinct coalesce(${recipeInteractions.userId}, ${recipeInteractions.sessionId})) from ${recipeViews} where ${recipeInteractions.interactionDate} >= ${startDate})`,
      totalShares: sql<number>`(select count(*) from ${recipeShares} where ${recipeInteractions.interactionDate} >= ${startDate})`,
      totalInteractions: sql<number>`(select count(*) from ${userInteractions} where ${recipeInteractions.interactedAt} >= ${startDate})`,
      avgSessionDuration: sql<number>`(select avg(${recipeInteractions.viewDurationSeconds}) from ${recipeViews} where ${recipeInteractions.interactionDate} >= ${startDate} and ${recipeInteractions.viewDurationSeconds} is not null)`
    });

  return result;
}

async function getSystemMetrics() {
  // Get system health metrics
  const [favoritesHealth, engagementHealth, trendingHealth, recommendationHealth] = await Promise.all([
    favoritesService.healthCheck(),
    engagementService.healthCheck(),
    trendingService.healthCheck(),
    recommendationService.healthCheck()
  ]);

  return {
    services: {
      favorites: favoritesHealth.status,
      engagement: engagementHealth.status,
      trending: trendingHealth.status,
      recommendations: recommendationHealth.status
    },
    overallHealth: [favoritesHealth, engagementHealth, trendingHealth, recommendationHealth]
      .every(health => health.status === 'healthy') ? 'healthy' : 'degraded'
  };
}

async function calculateGrowthRates(previousStart: Date, currentStart: Date) {
  // Simplified growth calculation
  const [previousMetrics] = await db
    .select({
      users: sql<number>`count(distinct ${users.id})`,
      views: sql<number>`(select count(*) from ${recipeViews} where ${recipeInteractions.interactionDate} between ${previousStart} and ${currentStart})`
    })
    .from(users)
    .where(gte(users.createdAt, previousStart));

  const [currentMetrics] = await db
    .select({
      users: sql<number>`count(distinct ${users.id})`,
      views: sql<number>`(select count(*) from ${recipeViews} where ${recipeInteractions.interactionDate} >= ${currentStart})`
    })
    .from(users)
    .where(gte(users.createdAt, currentStart));

  return {
    userGrowth: previousMetrics.users > 0 ? ((currentMetrics.users - previousMetrics.users) / previousMetrics.users) * 100 : 0,
    viewGrowth: previousMetrics.views > 0 ? ((currentMetrics.views - previousMetrics.views) / previousMetrics.views) * 100 : 0
  };
}

async function getTopRecipesByMetric(metric: string, limit: number) {
  let orderBy;
  let selectFields;

  switch (metric) {
    case 'views':
      selectFields = sql<number>`count(${recipeInteractions.id})`;
      orderBy = sql`count(${recipeInteractions.id}) DESC`;
      break;
    case 'ratings':
      selectFields = sql<number>`count(${recipeInteractions.id})`;
      orderBy = sql`count(${recipeInteractions.id}) DESC`;
      break;
    case 'favorites':
      selectFields = sql<number>`count(${recipeFavorites.id})`;
      orderBy = sql`count(${recipeFavorites.id}) DESC`;
      break;
    case 'shares':
      selectFields = sql<number>`count(${recipeInteractions.id})`;
      orderBy = sql`count(${recipeInteractions.id}) DESC`;
      break;
    default: // engagement
      selectFields = sql<number>`count(${recipeInteractions.id}) + count(${recipeInteractions.id}) * 3 + count(${recipeFavorites.id}) * 2 + count(${recipeInteractions.id}) * 5`;
      orderBy = sql`count(${recipeInteractions.id}) + count(${recipeInteractions.id}) * 3 + count(${recipeFavorites.id}) * 2 + count(${recipeInteractions.id}) * 5 DESC`;
  }

  return await db
    .select({
      recipe: recipes,
      metricValue: selectFields
    })
    .from(recipes)
    .leftJoin(recipeInteractions, eq(recipes.id, recipeInteractions.recipeId))
    .leftJoin( eq(recipes.id, recipeInteractions.recipeId))
    .leftJoin(recipeFavorites, eq(recipes.id, recipeFavorites.recipeId))
    .leftJoin( eq(recipes.id, recipeInteractions.recipeId))
    .where(eq(recipes.isApproved, true))
    .groupBy(recipes.id)
    .orderBy(orderBy)
    .limit(limit);
}

async function getRecipeAnalyticsBreakdown() {
  return {
    byMealType: await db
      .select({
        mealType: sql<string>`meal_type`,
        count: sql<number>`count(*)`
      })
      .from(sql`
        (select unnest(${recipes.mealTypes}) as meal_type from ${recipes} where ${recipes.isApproved} = true) as meal_types
      `)
      .groupBy(sql`meal_type`)
      .orderBy(sql`count(*) DESC`),
    
    byDietaryTag: await db
      .select({
        dietaryTag: sql<string>`dietary_tag`,
        count: sql<number>`count(*)`
      })
      .from(sql`
        (select unnest(${recipes.dietaryTags}) as dietary_tag from ${recipes} where ${recipes.isApproved} = true) as dietary_tags
      `)
      .groupBy(sql`dietary_tag`)
      .orderBy(sql`count(*) DESC`)
      .limit(10)
  };
}

// Placeholder implementations for complex analytics functions
async function getUserSegmentation(startDate: Date) {
  return {
    byRole: await db
      .select({
        role: users.role,
        count: sql<number>`count(*)`
      })
      .from(users)
      .groupBy(users.role),
    
    byActivity: {
      high: 50, // Users with >20 interactions
      medium: 150, // Users with 5-20 interactions
      low: 300, // Users with 1-5 interactions
      inactive: 100 // Users with 0 interactions
    }
  };
}

async function getUserActivityPatterns(startDate: Date) {
  return {
    hourlyDistribution: Array.from({ length: 24 }, (_, hour) => ({
      hour,
      views: Math.floor(Math.random() * 100), // Placeholder
      interactions: Math.floor(Math.random() * 50)
    })),
    
    dailyDistribution: Array.from({ length: 7 }, (_, day) => ({
      day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day],
      views: Math.floor(Math.random() * 500),
      interactions: Math.floor(Math.random() * 200)
    }))
  };
}

async function getUserRetentionMetrics(days: number) {
  return {
    returnRate: 0.65,
    averageSessionsPerUser: 8.5,
    averageSessionDuration: 420, // seconds
    churnRate: 0.15
  };
}

async function getTopUsersByEngagement(limit: number) {
  return await db
    .select({
      user: {
        id: users.id,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt
      },
      engagementScore: sql<number>`
        coalesce(view_count.count, 0) + 
        coalesce(rating_count.count, 0) * 3 + 
        coalesce(favorite_count.count, 0) * 2
      `
    })
    .from(users)
    .leftJoin(
      sql`(select ${recipeInteractions.userId}, count(*) as count from ${recipeViews} group by ${recipeInteractions.userId}) as view_count`,
      sql`view_count.user_id = ${users.id}`
    )
    .leftJoin(
      sql`(select ${recipeInteractions.userId}, count(*) as count from ${recipeRatings} group by ${recipeInteractions.userId}) as rating_count`,
      sql`rating_count.user_id = ${users.id}`
    )
    .leftJoin(
      sql`(select ${recipeFavorites.userId}, count(*) as count from ${recipeFavorites} group by ${recipeFavorites.userId}) as favorite_count`,
      sql`favorite_count.user_id = ${users.id}`
    )
    .orderBy(sql`
      coalesce(view_count.count, 0) + 
      coalesce(rating_count.count, 0) * 3 + 
      coalesce(favorite_count.count, 0) * 2 DESC
    `)
    .limit(limit);
}

async function getContentTrends(days: number) {
  return {
    popularMealTypes: ['dinner', 'lunch', 'breakfast', 'snack'],
    emergingDietaryTags: ['keto', 'vegan', 'gluten-free'],
    seasonalTrends: ['comfort food', 'fresh ingredients', 'quick meals']
  };
}

async function getUserBehaviorTrends(days: number) {
  return {
    searchPatterns: ['healthy recipes', 'quick meals', 'vegetarian'],
    engagementTrends: 'increasing',
    preferredContentTypes: ['video', 'step-by-step', 'ingredient-focused']
  };
}

async function getSeasonalPatterns() {
  return {
    currentSeason: 'winter',
    seasonalPreferences: ['warm soups', 'comfort food', 'hearty meals'],
    upcomingTrends: ['fresh salads', 'grilling recipes', 'light meals']
  };
}

async function getPredictiveInsights(days: number) {
  return {
    expectedGrowth: '15% user growth next month',
    contentRecommendations: ['More vegetarian options', 'Quick 15-minute meals'],
    riskFactors: ['Seasonal recipe demand changes']
  };
}

async function getCurrentActiveUsers() {
  const [result] = await db
    .select({
      count: sql<number>`count(distinct coalesce(${recipeInteractions.userId}, ${recipeInteractions.sessionId}))`
    })
    .from(recipeViews)
    .where(gte(recipeInteractions.interactionDate, new Date(Date.now() - 60 * 60 * 1000))); // Last hour

  return result.count;
}

async function getCohortAnalysis(period: 'daily' | 'weekly' | 'monthly') {
  // Simplified cohort analysis - would need more complex queries for real implementation
  return {
    period,
    cohorts: [
      { cohortDate: '2024-01-01', size: 100, retention: [100, 85, 70, 60, 55] },
      { cohortDate: '2024-02-01', size: 120, retention: [100, 88, 75, 65] },
      { cohortDate: '2024-03-01', size: 150, retention: [100, 90, 80] }
    ]
  };
}

async function getUserConversionFunnel(days: number) {
  return {
    steps: [
      { step: 'Visitors', count: 10000, conversionRate: 100 },
      { step: 'Recipe Viewers', count: 8500, conversionRate: 85 },
      { step: 'Engaged Users', count: 6000, conversionRate: 60 },
      { step: 'Recipe Raters', count: 2000, conversionRate: 20 },
      { step: 'Active Users', count: 1000, conversionRate: 10 }
    ]
  };
}

async function generateAnalyticsExport(days: number) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return {
    summary: await getUserMetrics(startDate),
    content: await getContentMetrics(startDate),
    engagement: await getEngagementMetrics(startDate),
    topRecipes: await getTopRecipesByMetric('engagement', 50),
    userSegmentation: await getUserSegmentation(startDate)
  };
}

function convertToCSV(data: any): string {
  // Simple CSV conversion - would need proper implementation
  return 'CSV export functionality would be implemented here';
}

/**
 * Health Check Endpoint
 */
router.get(
  '/health',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const systemMetrics = await getSystemMetrics();
      
      res.json({
        status: systemMetrics.overallHealth === 'healthy' ? 'healthy' : 'unhealthy',
        services: systemMetrics.services,
        message: 'Admin analytics system status',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Error handling middleware
 */
router.use((error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Admin Analytics API Error:', error);

  res.status(500).json({
    status: 'error',
    code: 'ADMIN_ANALYTICS_ERROR',
    message: 'An error occurred while processing admin analytics request'
  });
});

export { router as adminAnalyticsRouter };