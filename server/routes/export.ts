/**
 * Admin Export Routes
 *
 * Provides NDJSON and JSON export functionality for admin users.
 * Supports pagination, filtering, and streaming for large datasets.
 */

import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { db } from '../db';
import { trainerMealPlans, users } from '@shared/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { adminExportMealPlansSchema } from '../validation/schemas';
import crypto from 'crypto';

const exportRouter = express.Router();

// Rate limiting for export endpoints
const exportRateLimit = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const userLimit = exportRateLimit.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    exportRateLimit.set(userId, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (userLimit.count >= maxRequests) {
    return false;
  }

  userLimit.count++;
  return true;
}

/**
 * GET /api/export/meal-plans
 * Export meal plans in NDJSON or JSON format
 */
exportRouter.get('/meal-plans', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const userId = req.user!.id;

    // Rate limiting
    if (!checkRateLimit(userId)) {
      return res.status(429).json({
        error: 'Too many export requests',
        retryAfter: 60
      });
    }

    // Validate query parameters
    const queryParams = adminExportMealPlansSchema.parse(req.query);
    const { page, limit, trainerId, from, to, includeTemplates } = queryParams;

    console.log('[Admin Export] Export request:', {
      userId,
      page,
      limit,
      trainerId,
      from,
      to,
      includeTemplates,
      acceptHeader: req.headers.accept
    });

    // Build query conditions
    const conditions = [];

    if (trainerId) {
      conditions.push(eq(trainerMealPlans.trainerId, trainerId));
    }

    if (from) {
      conditions.push(gte(trainerMealPlans.createdAt, new Date(from)));
    }

    if (to) {
      conditions.push(lte(trainerMealPlans.createdAt, new Date(to)));
    }

    if (!includeTemplates) {
      conditions.push(eq(trainerMealPlans.isTemplate, false));
    }

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    // Check if client wants NDJSON
    const wantsNDJSON = req.headers.accept?.includes('application/x-ndjson') ||
                       req.query.format === 'ndjson';

    if (wantsNDJSON) {
      // Stream NDJSON response
      console.log('[Admin Export] Starting NDJSON stream');

      res.setHeader('Content-Type', 'application/x-ndjson');
      res.setHeader('Transfer-Encoding', 'chunked');

      // Generate ETag based on query parameters
      const etag = crypto.createHash('md5')
        .update(JSON.stringify(queryParams))
        .digest('hex');
      res.setHeader('ETag', `"${etag}"`);

      // Set Last-Modified to current time (could be optimized to use actual last update)
      res.setHeader('Last-Modified', new Date().toUTCString());

      let offset = (page - 1) * limit;
      let hasMore = true;
      let exportedCount = 0;

      while (hasMore) {
        const batch = await db.select({
          id: trainerMealPlans.id,
          planName: sql<string>`${trainerMealPlans.mealPlanData}->>'planName'`,
          fitnessGoal: sql<string>`${trainerMealPlans.mealPlanData}->>'fitnessGoal'`,
          days: sql<number>`(${trainerMealPlans.mealPlanData}->>'days')::int`,
          mealsPerDay: sql<number>`(${trainerMealPlans.mealPlanData}->>'mealsPerDay')::int`,
          generatedBy: sql<string>`${trainerMealPlans.mealPlanData}->>'generatedBy'`,
          createdAt: trainerMealPlans.createdAt,
          trainerId: trainerMealPlans.trainerId,
          source: sql<string>`CASE WHEN ${trainerMealPlans.mealPlanData}->>'source' IS NULL THEN 'ai' ELSE ${trainerMealPlans.mealPlanData}->>'source' END`,
          meals: sql<any[]>`${trainerMealPlans.mealPlanData}->'meals'`,
        })
        .from(trainerMealPlans)
        .where(whereCondition)
        .orderBy(desc(trainerMealPlans.createdAt))
        .limit(limit)
        .offset(offset);

        if (batch.length === 0) {
          hasMore = false;
          break;
        }

        // Stream each record as NDJSON
        for (const record of batch) {
          const compactRecord = {
            id: record.id,
            planName: record.planName,
            fitnessGoal: record.fitnessGoal,
            days: record.days,
            mealsPerDay: record.mealsPerDay,
            generatedBy: record.generatedBy,
            createdAt: record.createdAt,
            trainerId: record.trainerId,
            source: record.source,
            meals: record.meals?.map((meal: any) => ({
              day: meal.day,
              mealNumber: meal.mealNumber,
              mealType: meal.mealType,
              recipeId: meal.recipe?.id,
              manual: meal.manual || false
            })) || []
          };

          res.write(JSON.stringify(compactRecord) + '\n');
          exportedCount++;
        }

        offset += limit;
        hasMore = batch.length === limit;
      }

      console.log('[Admin Export] NDJSON stream completed:', { exportedCount });
      res.end();

    } else {
      // Regular JSON response with pagination
      const offset = (page - 1) * limit;

      const [plans, totalCountResult] = await Promise.all([
        db.select({
          id: trainerMealPlans.id,
          planName: sql<string>`${trainerMealPlans.mealPlanData}->>'planName'`,
          fitnessGoal: sql<string>`${trainerMealPlans.mealPlanData}->>'fitnessGoal'`,
          days: sql<number>`(${trainerMealPlans.mealPlanData}->>'days')::int`,
          mealsPerDay: sql<number>`(${trainerMealPlans.mealPlanData}->>'mealsPerDay')::int`,
          generatedBy: sql<string>`${trainerMealPlans.mealPlanData}->>'generatedBy'`,
          createdAt: trainerMealPlans.createdAt,
          trainerId: trainerMealPlans.trainerId,
          source: sql<string>`CASE WHEN ${trainerMealPlans.mealPlanData}->>'source' IS NULL THEN 'ai' ELSE ${trainerMealPlans.mealPlanData}->>'source' END`,
          meals: sql<any[]>`${trainerMealPlans.mealPlanData}->'meals'`,
        })
        .from(trainerMealPlans)
        .where(whereCondition)
        .orderBy(desc(trainerMealPlans.createdAt))
        .limit(limit)
        .offset(offset),

        db.select({
          count: sql<number>`count(*)::int`,
        })
        .from(trainerMealPlans)
        .where(whereCondition)
      ]);

      const total = totalCountResult[0]?.count || 0;
      const pageSize = limit;
      const totalPages = Math.ceil(total / pageSize);

      // Generate ETag and Last-Modified headers
      const etag = crypto.createHash('md5')
        .update(JSON.stringify({ query: queryParams, total, page }))
        .digest('hex');
      res.setHeader('ETag', `"${etag}"`);
      res.setHeader('Last-Modified', new Date().toUTCString());

      // Transform data to compact format
      const items = plans.map(plan => ({
        id: plan.id,
        planName: plan.planName,
        fitnessGoal: plan.fitnessGoal,
        days: plan.days,
        mealsPerDay: plan.mealsPerDay,
        generatedBy: plan.generatedBy,
        createdAt: plan.createdAt,
        trainerId: plan.trainerId,
        source: plan.source,
        meals: plan.meals?.map((meal: any) => ({
          day: meal.day,
          mealNumber: meal.mealNumber,
          mealType: meal.mealType,
          recipeId: meal.recipe?.id,
          manual: meal.manual || false
        })) || []
      }));

      console.log('[Admin Export] JSON export completed:', {
        exported: items.length,
        total,
        page,
        totalPages
      });

      res.json({
        items,
        page,
        pageSize,
        total,
        totalPages,
        hasMore: page < totalPages,
        exportedAt: new Date().toISOString(),
        filters: {
          trainerId,
          from,
          to,
          includeTemplates
        }
      });
    }

  } catch (error) {
    console.error('[Admin Export] Export failed:', error);

    if (error instanceof Error && error.message.includes('validation')) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: error.message
      });
    }

    res.status(500).json({
      error: 'Export failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { exportRouter };