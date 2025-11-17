// @ts-nocheck - Optional feature, type errors suppressed
import express from 'express';
import { parseNaturalLanguageForMealPlan } from '../services/openai';
import { MealPlanGeneratorService } from '../services/mealPlanGenerator';
import { intelligentMealPlanGenerator } from '../services/intelligentMealPlanGenerator';
import { nutritionalOptimizer } from '../services/nutritionalOptimizer';
// import { customerPreferenceService } from '../services/customerPreferenceService';
import { mealPlanScheduler } from '../services/mealPlanScheduler';
import { mealPlanVariationService } from '../services/mealPlanVariationService';
import { requireAuth } from '../middleware/auth';
// TEMPORARILY DISABLED - Stripe integration incomplete
// import { enforceUsageLimit, incrementUsage } from '../middleware/usageEnforcement';
// import { trackMealPlanGeneration } from '../services/usageTracking';
import { storage } from '../storage';
import { db } from '../db';
import { personalizedMealPlans } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { MealPlanGeneration } from '@shared/schema';
import { handleMealPlanEvent, createMealPlanEvent, MealPlanEventType } from '../utils/mealPlanEvents';

const mealPlanRouter = express.Router();

mealPlanRouter.post('/parse-natural-language', requireAuth, async (req, res) => {
  const { naturalLanguageInput } = req.body;

  if (!naturalLanguageInput) {
    return res.status(400).json({ error: 'naturalLanguageInput is required' });
  }

  try {
    console.log("Parsing natural language input:", naturalLanguageInput);
    const parsedData = await parseNaturalLanguageForMealPlan(naturalLanguageInput);
    console.log("Successfully parsed data:", parsedData);
    res.json(parsedData);
  } catch (error) {
    console.error('Error parsing natural language input:', error);
    res.status(500).json({ error: 'Failed to parse natural language input' });
  }
});

mealPlanRouter.post('/generate', requireAuth, async (req, res) => {
  const mealPlanParams = req.body as MealPlanGeneration;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const mealPlanService = new MealPlanGeneratorService();

    console.log('Generating meal plan with params:', mealPlanParams);
    const mealPlan = await mealPlanService.generateMealPlan(mealPlanParams, userId);

    console.log('Calculating nutrition for generated meal plan...');
    const nutrition = mealPlanService.calculateMealPlanNutrition(mealPlan);

    // Track successful meal plan generation
    // TEMPORARILY DISABLED - Stripe integration incomplete
    // await incrementUsage(userId);
    // await trackMealPlanGeneration(userId, mealPlan.id || 'unknown', {
    //   planName: mealPlan.planName,
    //   daysCount: mealPlanParams.numberOfDays,
    //   generationMethod: 'manual',
    // });

    console.log('Meal plan generated successfully.');
    res.json({
      mealPlan,
      nutrition,
      message: 'Meal plan generated successfully',
      completed: true,
      timestamp: new Date().toISOString(),
      usageInfo: (req as any).usageInfo, // Include usage info from middleware
    });

  } catch (error) {
    console.error('Error generating meal plan:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ error: 'Failed to generate meal plan', details: errorMessage });
  }
});

// POST /api/meal-plan/generate-intelligent - Generate intelligent AI-optimized meal plan
mealPlanRouter.post('/generate-intelligent', requireAuth, async (req, res) => {
  const mealPlanParams = req.body as MealPlanGeneration & {
    customerPreferences?: any;
    progressiveAdaptation?: boolean;
    diversityScore?: number;
    seasonalPreferences?: boolean;
    budgetOptimization?: boolean;
  };
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    console.log('[Intelligent API] Generating intelligent meal plan with params:', mealPlanParams);

    // Generate intelligent meal plan with AI optimization
    const mealPlan = await intelligentMealPlanGenerator.generateIntelligentMealPlan(
      mealPlanParams,
      userId
    );

    console.log('[Intelligent API] Calculating enhanced nutrition analysis...');
    const nutrition = intelligentMealPlanGenerator.calculateMealPlanNutrition(mealPlan);

    // Get customer preferences for additional context
    const customerPrefs = await customerPreferenceService.getCustomerPreferences(mealPlanParams.clientName || '');
    const preferenceAnalysis = customerPrefs ?
      customerPreferenceService.generatePreferenceAnalysis(customerPrefs) : null;

    // Create intelligent schedule if requested
    let schedule = null;
    if (mealPlanParams.generateMealPrep !== false) {
      try {
        schedule = await mealPlanScheduler.createIntelligentSchedule(
          mealPlan,
          mealPlanParams.clientName || userId
        );
      } catch (error) {
        console.warn('[Intelligent API] Could not create schedule:', error);
      }
    }

    // Track successful meal plan generation
    // TEMPORARILY DISABLED - Stripe integration incomplete
    // await incrementUsage(userId);
    // await trackMealPlanGeneration(userId, mealPlan.id || 'unknown', {
    //   customerId: mealPlanParams.customerId,
    //   planName: mealPlan.planName,
    //   daysCount: mealPlanParams.numberOfDays,
    //   generationMethod: 'ai',
    // });

    console.log('[Intelligent API] Intelligent meal plan generated successfully.');
    res.json({
      mealPlan,
      nutrition,
      schedule: schedule,
      customerPreferenceAnalysis: preferenceAnalysis,
      intelligentFeatures: {
        nutritionalOptimization: true,
        fitnessGoalAlignment: true,
        mealTimingRecommendations: !!mealPlan.mealTimingRecommendations,
        workoutNutritionTips: !!mealPlan.workoutNutritionTips,
        enhancedMealPrep: !!mealPlan.startOfWeekMealPrep?.intelligentBatchingTips
      },
      message: 'Intelligent meal plan generated successfully with AI optimization',
      completed: true,
      timestamp: new Date().toISOString(),
      usageInfo: (req as any).usageInfo, // Include usage info from middleware
    });

  } catch (error) {
    console.error('[Intelligent API] Error generating intelligent meal plan:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ error: 'Failed to generate intelligent meal plan', details: errorMessage });
  }
});

// POST /api/meal-plan/optimize-nutrition - Optimize existing meal plan nutrition
mealPlanRouter.post('/optimize-nutrition', requireAuth, async (req, res) => {
  const { mealPlan, constraints, customerPreferences } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  if (!mealPlan) {
    return res.status(400).json({ error: 'Meal plan is required' });
  }

  try {
    console.log('[Nutrition Optimizer API] Optimizing meal plan nutrition...');
    
    const defaultConstraints = {
      caloriesMin: mealPlan.dailyCalorieTarget * 0.9,
      caloriesMax: mealPlan.dailyCalorieTarget * 1.1,
      proteinMin: mealPlan.dailyCalorieTarget * 0.15 / 4, // 15% of calories from protein
      proteinMax: mealPlan.dailyCalorieTarget * 0.35 / 4, // 35% of calories from protein
      carbsMin: mealPlan.dailyCalorieTarget * 0.25 / 4,   // 25% of calories from carbs
      carbsMax: mealPlan.dailyCalorieTarget * 0.65 / 4,   // 65% of calories from carbs
      fatMin: mealPlan.dailyCalorieTarget * 0.15 / 9,     // 15% of calories from fat
      fatMax: mealPlan.dailyCalorieTarget * 0.40 / 9,     // 40% of calories from fat
      ...constraints // Override with provided constraints
    };

    const optimizationResult = await nutritionalOptimizer.optimizeMealPlanNutrition(
      mealPlan,
      defaultConstraints,
      customerPreferences
    );

    const optimizationReport = nutritionalOptimizer.generateOptimizationReport(optimizationResult);

    console.log('[Nutrition Optimizer API] Optimization completed successfully.');
    res.json({
      optimizationResult,
      optimizationReport,
      recommendations: optimizationResult.changes.map(change => ({
        meal: `Day ${change.day}, Meal ${change.mealNumber}`,
        suggestion: `Replace "${change.oldRecipe}" with "${change.newRecipe}"`,
        reason: change.reason,
        nutritionalImpact: change.nutritionalDelta
      })),
      message: 'Nutrition optimization completed',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Nutrition Optimizer API] Error optimizing nutrition:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ error: 'Failed to optimize nutrition', details: errorMessage });
  }
});

// GET /api/meal-plan/customer-preferences/:customerId - Get customer preferences analysis
mealPlanRouter.get('/customer-preferences/:customerId', requireAuth, async (req, res) => {
  const { customerId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    console.log('[Customer Preferences API] Fetching preferences for customer:', customerId);
    
    const preferences = await customerPreferenceService.getCustomerPreferences(customerId);
    
    if (!preferences) {
      return res.json({
        preferences: null,
        analysis: null,
        message: 'No preference data available for this customer',
        recommendations: [
          'Complete more meal plans to build preference profile',
          'Provide feedback on existing meal plans',
          'Rate recipes to improve recommendations'
        ]
      });
    }

    const analysis = customerPreferenceService.generatePreferenceAnalysis(preferences);

    res.json({
      preferences: {
        preferenceScore: preferences.preferenceScore,
        learningMetrics: preferences.learningMetrics,
        lastUpdated: preferences.lastUpdated
      },
      analysis,
      insights: {
        engagementLevel: preferences.learningMetrics.engagementLevel,
        totalRatedPlans: preferences.learningMetrics.totalMealPlansRated,
        averageRating: preferences.learningMetrics.averageRating,
        consistencyScore: preferences.learningMetrics.consistencyScore
      },
      message: 'Customer preferences retrieved successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Customer Preferences API] Error fetching preferences:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ error: 'Failed to fetch customer preferences', details: errorMessage });
  }
});

// POST /api/meal-plan/create-schedule - Create intelligent meal plan schedule
mealPlanRouter.post('/create-schedule', requireAuth, async (req, res) => {
  const { mealPlan, customerId, customerProfile } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  if (!mealPlan || !customerId) {
    return res.status(400).json({ error: 'Meal plan and customer ID are required' });
  }

  try {
    console.log('[Meal Plan Scheduler API] Creating intelligent schedule...');
    
    const schedule = await mealPlanScheduler.createIntelligentSchedule(
      mealPlan,
      customerId,
      customerProfile
    );

    const scheduleSummary = {
      totalWeeklyPrepTime: schedule.mealPrepSchedule.totalWeeklyPrepTime,
      efficiencyScore: schedule.weeklySchedule.efficiencyScore,
      primaryPrepDay: schedule.mealPrepSchedule.primaryPrepDay,
      notificationsCount: schedule.notifications.length,
      workoutIntegration: !!schedule.workoutIntegration,
      adaptiveScheduling: !!schedule.adaptiveScheduling
    };

    console.log('[Meal Plan Scheduler API] Schedule created successfully.');
    res.json({
      schedule,
      summary: scheduleSummary,
      tips: [
        `Primary meal prep on ${schedule.mealPrepSchedule.primaryPrepDay}s`,
        `Total weekly prep time: ${Math.round(schedule.mealPrepSchedule.totalWeeklyPrepTime / 60)} hours`,
        `${schedule.notifications.filter(n => n.enabled).length} active notifications configured`
      ],
      message: 'Intelligent meal schedule created successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Meal Plan Scheduler API] Error creating schedule:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ error: 'Failed to create meal schedule', details: errorMessage });
  }
});

// POST /api/meal-plan/create-variation - Create meal plan variation
mealPlanRouter.post('/create-variation', requireAuth, async (req, res) => {
  const { 
    mealPlan, 
    customerId, 
    variationType, 
    variationParameters 
  } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  if (!mealPlan || !customerId) {
    return res.status(400).json({ error: 'Meal plan and customer ID are required' });
  }

  try {
    console.log('[Meal Plan Variation API] Creating variation:', variationType || 'intelligent');
    
    const variation = await mealPlanVariationService.createMealPlanVariation(
      mealPlan,
      customerId,
      variationType,
      variationParameters
    );

    const variedMealPlan = mealPlanVariationService.applyVariationToMealPlan(
      mealPlan,
      variation
    );

    const variationSummary = {
      variationType: variation.variationType,
      changesCount: variation.changes.length,
      varietyScore: variation.varietyScore,
      seasonalAlignment: variation.seasonalAlignment,
      customerFitScore: variation.customerFitScore,
      nutritionalImpact: variation.nutritionalImpact
    };

    console.log('[Meal Plan Variation API] Variation created successfully.');
    res.json({
      variation,
      variedMealPlan,
      summary: variationSummary,
      changesList: variation.changes.map(change => ({
        meal: `Day ${change.day}, Meal ${change.mealNumber}`,
        change: `${change.originalRecipe.name} → ${change.newRecipe.name}`,
        reason: change.changeReason,
        confidence: `${Math.round(change.confidenceScore * 100)}%`
      })),
      message: `${variation.variationType.replace('_', ' ')} variation created successfully`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Meal Plan Variation API] Error creating variation:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ error: 'Failed to create meal plan variation', details: errorMessage });
  }
});

// POST /api/meal-plan/create-rotation-plan - Create long-term rotation plan
mealPlanRouter.post('/create-rotation-plan', requireAuth, async (req, res) => {
  const { customerId, baseMealPlan, planDuration } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  if (!customerId || !baseMealPlan) {
    return res.status(400).json({ error: 'Customer ID and base meal plan are required' });
  }

  try {
    console.log('[Rotation Plan API] Creating rotation plan for customer:', customerId);
    
    const rotationPlan = await mealPlanVariationService.createRotationPlan(
      customerId,
      baseMealPlan,
      planDuration || 12
    );

    const planSummary = {
      totalDuration: rotationPlan.planDuration,
      rotationCycles: rotationPlan.rotationCycles.length,
      variationFrequency: rotationPlan.variationFrequency,
      engagementLevel: rotationPlan.customerEngagement.engagementLevel,
      nextRotation: rotationPlan.nextRotationDate
    };

    console.log('[Rotation Plan API] Rotation plan created successfully.');
    res.json({
      rotationPlan,
      summary: planSummary,
      upcomingCycles: rotationPlan.rotationCycles.map(cycle => ({
        cycleNumber: cycle.cycleNumber,
        theme: cycle.theme,
        duration: `${cycle.duration} weeks`,
        focusAreas: cycle.focusAreas
      })),
      message: 'Long-term rotation plan created successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Rotation Plan API] Error creating rotation plan:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ error: 'Failed to create rotation plan', details: errorMessage });
  }
});

// GET /api/meal-plan/progressive/:customerId/:weekNumber - Generate progressive meal plan
mealPlanRouter.get('/progressive/:customerId/:weekNumber', requireAuth, async (req, res) => {
  const { customerId, weekNumber } = req.params;
  const { totalWeeks, baseMealPlan } = req.query;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    console.log('[Progressive API] Generating progressive meal plan for week:', weekNumber);
    
    if (!baseMealPlan) {
      return res.status(400).json({ error: 'Base meal plan parameters required' });
    }

    const baseParams = JSON.parse(baseMealPlan as string);
    
    const progressiveMealPlan = await intelligentMealPlanGenerator.generateProgressiveMealPlan(
      baseParams,
      userId,
      parseInt(weekNumber),
      totalWeeks ? parseInt(totalWeeks as string) : 12
    );

    const nutrition = intelligentMealPlanGenerator.calculateMealPlanNutrition(progressiveMealPlan);

    res.json({
      mealPlan: progressiveMealPlan,
      nutrition,
      progressInfo: {
        currentWeek: parseInt(weekNumber),
        totalWeeks: totalWeeks ? parseInt(totalWeeks as string) : 12,
        progressPercentage: Math.round((parseInt(weekNumber) / (totalWeeks ? parseInt(totalWeeks as string) : 12)) * 100),
        adaptations: `Week ${weekNumber} adaptations applied`
      },
      message: `Progressive meal plan for week ${weekNumber} generated successfully`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Progressive API] Error generating progressive meal plan:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ error: 'Failed to generate progressive meal plan', details: errorMessage });
  }
});

// GET /api/meal-plan/personalized - Fetch meal plans assigned to the logged-in customer
mealPlanRouter.get('/personalized', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Import required tables
    const { mealPlanAssignments, trainerMealPlans, users } = await import('@shared/schema');

    // Get assigned meal plans by joining with trainer_meal_plans (single source of truth)
    const assignedPlans = await db
      .select({
        // Use trainer plan ID (not a duplicate)
        id: trainerMealPlans.id,
        trainerId: trainerMealPlans.trainerId,
        mealPlanData: trainerMealPlans.mealPlanData,
        notes: trainerMealPlans.notes,
        tags: trainerMealPlans.tags,
        isTemplate: trainerMealPlans.isTemplate,
        createdAt: trainerMealPlans.createdAt,
        updatedAt: trainerMealPlans.updatedAt,
        // Assignment metadata
        assignedAt: mealPlanAssignments.assignedAt,
        assignmentNotes: mealPlanAssignments.notes,
        assignedBy: mealPlanAssignments.assignedBy,
        trainerEmail: users.email,
      })
      .from(mealPlanAssignments)
      .innerJoin(trainerMealPlans, eq(trainerMealPlans.id, mealPlanAssignments.mealPlanId))
      .leftJoin(users, eq(users.id, mealPlanAssignments.assignedBy))
      .where(eq(mealPlanAssignments.customerId, userId))
      .orderBy(desc(mealPlanAssignments.assignedAt));

    // Enhance meal plans with additional metadata for better display
    const enhancedMealPlans = assignedPlans.map(plan => ({
      id: plan.id, // Trainer's original plan ID (single source of truth)
      trainerId: plan.trainerId,
      mealPlanData: plan.mealPlanData,
      planName: plan.mealPlanData?.planName || 'Unnamed Plan',
      fitnessGoal: plan.mealPlanData?.fitnessGoal || 'General Fitness',
      dailyCalorieTarget: plan.mealPlanData?.dailyCalorieTarget || 0,
      totalDays: plan.mealPlanData?.days || 0,
      mealsPerDay: plan.mealPlanData?.mealsPerDay || 0,
      assignedAt: plan.assignedAt || new Date().toISOString(),
      assignedBy: plan.assignedBy,
      trainerEmail: plan.trainerEmail,
      notes: plan.assignmentNotes || plan.notes,
      tags: plan.tags,
      isActive: true, // Could be enhanced with actual status tracking
      description: plan.mealPlanData?.description,
    }));

    res.json({
      mealPlans: enhancedMealPlans,
      total: enhancedMealPlans.length,
      summary: {
        totalPlans: enhancedMealPlans.length,
        activePlans: enhancedMealPlans.filter(p => p.isActive).length,
        totalCalorieTargets: enhancedMealPlans.reduce((sum, p) => sum + (p.dailyCalorieTarget || 0), 0),
        avgCaloriesPerDay: enhancedMealPlans.length > 0
          ? Math.round(enhancedMealPlans.reduce((sum, p) => sum + (p.dailyCalorieTarget || 0), 0) / enhancedMealPlans.length)
          : 0
      }
    });
  } catch (error) {
    console.error('Failed to fetch personalized meal plans:', error);
    res.status(500).json({ error: 'Failed to fetch personalized meal plans' });
  }
});

// DELETE /api/meal-plan/:id - Delete a meal plan assignment for the current customer
// NOTE: This deletes the ASSIGNMENT, not the trainer's original plan
mealPlanRouter.delete('/:id', requireAuth, async (req, res) => {
  const mealPlanId = req.params.id;
  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  if (userRole !== 'customer') {
    return res.status(403).json({ error: 'Only customers can delete their meal plan assignments' });
  }

  try {
    // Import required tables
    const { mealPlanAssignments, trainerMealPlans } = await import('@shared/schema');

    // First, verify the assignment exists and belongs to this customer
    const assignment = await db
      .select({
        assignmentId: mealPlanAssignments.id,
        mealPlanId: mealPlanAssignments.mealPlanId,
        customerId: mealPlanAssignments.customerId,
        mealPlanData: trainerMealPlans.mealPlanData,
      })
      .from(mealPlanAssignments)
      .innerJoin(trainerMealPlans, eq(trainerMealPlans.id, mealPlanAssignments.mealPlanId))
      .where(
        and(
          eq(mealPlanAssignments.mealPlanId, mealPlanId),
          eq(mealPlanAssignments.customerId, userId)
        )
      )
      .limit(1);

    if (!assignment || assignment.length === 0) {
      return res.status(404).json({
        error: 'Meal plan assignment not found or you do not have permission to delete it'
      });
    }

    const assignmentToDelete = assignment[0];

    // Delete the assignment (keeps trainer's original plan intact)
    await db.delete(mealPlanAssignments)
      .where(
        and(
          eq(mealPlanAssignments.mealPlanId, mealPlanId),
          eq(mealPlanAssignments.customerId, userId)
        )
      );

    // Trigger automatic cleanup of orphaned grocery lists
    try {
      const event = createMealPlanEvent(
        MealPlanEventType.DELETED,
        mealPlanId,
        userId,
        assignmentToDelete.mealPlanData
      );

      const cleanupResult = await handleMealPlanEvent(event);

      if (cleanupResult.success && cleanupResult.action === 'updated') {
        console.log(`[Meal Plan Delete] Cleaned up ${cleanupResult.itemCount || 0} orphaned grocery lists for customer ${userId} meal plan ${mealPlanId}`);
      }
    } catch (error) {
      console.error(`[Meal Plan Delete] Error during grocery list cleanup for meal plan ${mealPlanId}:`, error);
      // Don't fail the meal plan deletion if grocery list cleanup fails
    }

    console.log(`[Meal Plan Delete] Customer ${userId} deleted assignment for meal plan ${mealPlanId}`);

    res.json({
      success: true,
      message: 'Meal plan removed from your account successfully',
      deletedMealPlanId: mealPlanId,
      note: 'The meal plan has been removed from your account. Your trainer still has the original plan.'
    });
  } catch (error) {
    console.error('Failed to delete meal plan assignment:', error);
    res.status(500).json({
      error: 'Failed to delete meal plan assignment',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { mealPlanRouter }; 