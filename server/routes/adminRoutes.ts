import { Router } from 'express';
import { requireAdmin, requireTrainerOrAdmin, requireAuth } from '../middleware/auth';
import { storage } from '../storage';
import { z } from 'zod';
import { recipeGenerator } from '../services/recipeGenerator';
import { enhancedRecipeGenerator } from '../services/recipeGeneratorEnhanced';
import { recipeQualityScorer } from '../services/recipeQualityScorer';
import { apiCostTracker } from '../services/apiCostTracker';
import { progressTracker } from '../services/progressTracker';
import { eq, sql } from 'drizzle-orm';
import { personalizedRecipes, personalizedMealPlans, users, type MealPlan } from '@shared/schema';
import { db } from '../db';

const adminRouter = Router();

// Admin-only routes
adminRouter.post('/generate', requireAdmin, async (req, res) => {
  try {
    const { 
      count, 
      mealTypes,
      dietaryRestrictions,
      targetCalories,
      mainIngredient,
      fitnessGoal,
      naturalLanguagePrompt,
      maxPrepTime,
      maxCalories,
      minProtein,
      maxProtein,
      minCarbs,
      maxCarbs,
      minFat,
      maxFat
    } = req.body;
    
    // Validate required count parameter
    if (!count || count < 1 || count > 500) {
      return res.status(400).json({ 
        message: "Count is required and must be between 1 and 500" 
      });
    }
    
    // Create a progress tracking job
    const jobId = progressTracker.createJob({ 
      totalRecipes: count,
      metadata: { 
        naturalLanguagePrompt,
        fitnessGoal,
        mealTypes,
        dietaryRestrictions 
      }
    });
    
    // Prepare generation options with context
    const generationOptions = {
      count,
      mealTypes,
      dietaryRestrictions,
      targetCalories,
      mainIngredient,
      fitnessGoal,
      naturalLanguagePrompt,
      maxPrepTime,
      maxCalories,
      minProtein,
      maxProtein,
      minCarbs,
      maxCarbs,
      minFat,
      maxFat,
      jobId // Pass jobId to track progress
    };
    
    console.log('Recipe generation started with context:', generationOptions);
    
    // Do not await this, let it run in the background
    recipeGenerator.generateAndStoreRecipes(generationOptions);
    
    const contextMessage = naturalLanguagePrompt || fitnessGoal || mealTypes?.length || dietaryRestrictions?.length
      ? ` with context-based targeting`
      : '';
    
    res.status(202).json({ 
      message: `Recipe generation started for ${count} recipes${contextMessage}.`,
      jobId
    });
  } catch (error) {
    console.error("Error starting recipe generation:", error);
    res.status(500).json({ message: "Failed to start recipe generation" });
  }
});

// Admin recipe generation with custom parameters (matches frontend expectations)
adminRouter.post('/generate-recipes', requireAdmin, async (req, res) => {
  try {
    const { 
      count, 
      mealType,
      dietaryTag,
      maxPrepTime,
      maxCalories,
      minCalories,
      minProtein,
      maxProtein,
      minCarbs,
      maxCarbs,
      minFat,
      maxFat,
      focusIngredient,
      difficulty
    } = req.body;
    
    // Validate required count parameter
    if (!count || count < 1 || count > 50) {
      return res.status(400).json({ 
        message: "Count is required and must be between 1 and 50" 
      });
    }
    
    // Create a progress tracking job
    const jobId = progressTracker.createJob({ 
      totalRecipes: count,
      metadata: { 
        mealType,
        dietaryTag,
        focusIngredient,
        difficulty 
      }
    });
    
    // Map frontend parameters to backend format
    const generationOptions = {
      count,
      mealTypes: mealType ? [mealType] : undefined,
      dietaryRestrictions: dietaryTag ? [dietaryTag] : undefined,
      targetCalories: maxCalories || minCalories ? (maxCalories + minCalories) / 2 : undefined,
      mainIngredient: focusIngredient,
      maxPrepTime,
      maxCalories,
      minProtein,
      maxProtein,
      minCarbs,
      maxCarbs,
      minFat,
      maxFat,
      difficulty,
      jobId // Pass jobId to track progress
    };
    
    console.log('Custom recipe generation started with options:', generationOptions);
    
    // Start background generation
    recipeGenerator.generateAndStoreRecipes(generationOptions);
    
    // Return immediate response with generation status
    res.status(202).json({ 
      message: `Recipe generation started`,
      count: count,
      started: true,
      success: 0,
      failed: 0,
      errors: [],
      metrics: {
        totalDuration: 0,
        averageTimePerRecipe: 0
      },
      jobId
    });
  } catch (error) {
    console.error("Error starting recipe generation:", error);
    res.status(500).json({ message: "Failed to start recipe generation" });
  }
});

// Enhanced recipe generation with retry logic and quality scoring
adminRouter.post('/generate-enhanced', requireAdmin, async (req, res) => {
  try {
    const { prompt, calories, protein, carbs, fat, mealType, dietaryRestrictions, model } = req.body;
    
    console.log('[Enhanced Generation] Starting with params:', req.body);
    
    // Generate recipe with retry logic and fallback
    const recipe = await enhancedRecipeGenerator.generateWithFallback({
      prompt,
      calories,
      protein,
      carbs,
      fat,
      mealType,
      dietaryRestrictions,
      model
    });
    
    // Score the recipe quality
    const qualityScore = recipeQualityScorer.scoreRecipe(recipe);
    
    // Track API cost (mock usage for now - will be replaced with actual usage from OpenAI response)
    const estimatedTokens = 1300; // Average tokens for recipe generation
    const modelUsed = model || 'gpt-3.5-turbo-1106';
    const cost = await apiCostTracker.trackUsage(
      modelUsed,
      { promptTokens: 500, completionTokens: 800, totalTokens: estimatedTokens },
      req.user?.id,
      recipe.id
    );
    
    // Add metadata to recipe before storing
    const enhancedRecipe = {
      ...recipe,
      quality_score: qualityScore,
      api_cost: cost,
      model_used: modelUsed,
      generation_attempts: 1 // Will be updated by retry logic
    };
    
    // Store the enhanced recipe
    await storage.createRecipe(enhancedRecipe);
    
    res.json({
      status: 'success',
      data: enhancedRecipe,
      metadata: {
        qualityScore: qualityScore.overall,
        cost: `$${cost.toFixed(4)}`,
        suggestions: qualityScore.metadata.suggestions,
        warnings: qualityScore.metadata.warnings,
        strengths: qualityScore.metadata.strengths
      }
    });
  } catch (error) {
    console.error('[Enhanced Generation] Failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate enhanced recipe',
      error: error.message
    });
  }
});

// API usage statistics endpoint
adminRouter.get('/api-usage', requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();
    
    const [usageStats, budgetStatus, topConsumers, costByModel] = await Promise.all([
      apiCostTracker.getUsageStats(start, end),
      apiCostTracker.getMonthlyBudgetStatus(),
      apiCostTracker.getTopConsumers(),
      apiCostTracker.getCostByModel(start)
    ]);
    
    res.json({
      usageStats,
      budgetStatus,
      topConsumers,
      costByModel
    });
  } catch (error) {
    console.error('[API Usage] Failed to get stats:', error);
    res.status(500).json({ error: 'Failed to fetch API usage statistics' });
  }
});

// Routes accessible by both trainers and admins
adminRouter.get('/customers', requireTrainerOrAdmin, async (req, res) => {
  try {
    const { recipeId, mealPlanId } = req.query;
    const customers = await storage.getCustomers(
      recipeId as string | undefined,
      mealPlanId as string | undefined
    );
    res.json(customers);
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Assign recipe to customers
const assignRecipeSchema = z.object({
  recipeId: z.string().uuid(),
  customerIds: z.array(z.string().uuid()),
});

adminRouter.post('/assign-recipe', requireTrainerOrAdmin, async (req, res) => {
  try {
    const { recipeId, customerIds } = assignRecipeSchema.parse(req.body);
    const trainerId = req.user!.id;
    
    // Get current assignments to determine what changed
    const currentAssignments = await db
      .select()
      .from(personalizedRecipes)
      .where(eq(personalizedRecipes.recipeId, recipeId));
    
    const currentlyAssignedIds = new Set(currentAssignments.map(a => a.customerId));
    const toAdd = customerIds.filter(id => !currentlyAssignedIds.has(id));
    const toRemove = Array.from(currentlyAssignedIds).filter(id => !customerIds.includes(id));
    
    await storage.assignRecipeToCustomers(trainerId, recipeId, customerIds);
    
    // Create a descriptive message about what changed
    const changes = [];
    if (toAdd.length > 0) {
      changes.push(`assigned to ${toAdd.length} customer(s)`);
    }
    if (toRemove.length > 0) {
      changes.push(`unassigned from ${toRemove.length} customer(s)`);
    }
    
    res.json({ 
      message: changes.length > 0 
        ? `Recipe ${changes.join(' and ')} successfully`
        : 'No changes were made to recipe assignments',
      added: toAdd.length,
      removed: toRemove.length,
    });
  } catch (error) {
    console.error('Failed to assign recipe:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request data', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to assign recipe' });
    }
  }
});

// Assign meal plan to customers
const assignMealPlanSchema = z.object({
  mealPlanData: z.object({
    id: z.string(),
    planName: z.string(),
    fitnessGoal: z.string(),
    description: z.string().optional(),
    dailyCalorieTarget: z.number(),
    clientName: z.string().optional(),
    days: z.number(),
    mealsPerDay: z.number(),
    generatedBy: z.string(),
    createdAt: z.coerce.date(), // Convert string to date automatically
    meals: z.array(z.object({
      day: z.number(),
      mealNumber: z.number(),
      mealType: z.string(),
      recipe: z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        caloriesKcal: z.number(),
        proteinGrams: z.string(),
        carbsGrams: z.string(),
        fatGrams: z.string(),
        prepTimeMinutes: z.number(),
        cookTimeMinutes: z.number().optional(),
        servings: z.number(),
        mealTypes: z.array(z.string()),
        dietaryTags: z.array(z.string()).optional(),
        mainIngredientTags: z.array(z.string()).optional(),
        ingredientsJson: z.array(z.object({
          name: z.string(),
          amount: z.string(),
          unit: z.string().optional(),
        })).optional(),
        instructionsText: z.string().optional(),
        imageUrl: z.string().optional(),
      }),
    })),
  }),
  customerIds: z.array(z.string().uuid()),
});

adminRouter.post('/assign-meal-plan', requireTrainerOrAdmin, async (req, res) => {
  try {
    const { mealPlanData, customerIds } = assignMealPlanSchema.parse(req.body);
    const trainerId = req.user!.id;
    
    await storage.assignMealPlanToCustomers(trainerId, mealPlanData, customerIds);
    
    res.json({ 
      message: customerIds.length > 0 
        ? `Meal plan assigned to ${customerIds.length} customer(s) successfully`
        : 'Meal plan unassigned from all customers',
      added: customerIds.length,
      removed: 0, // Simplified for now
    });
  } catch (error) {
    console.error('Failed to assign meal plan:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request data', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to assign meal plan' });
    }
  }
});

const recipeFilterSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  approved: z.preprocess((val) => {
    if (val === 'true') return true;
    if (val === 'false') return false;
    return undefined;
  }, z.boolean().optional()),
  search: z.string().optional(),
});

adminRouter.get('/recipes', requireAdmin, async (req, res) => {
  try {
    const query = recipeFilterSchema.parse(req.query);

    const { recipes, total } = await storage.searchRecipes({
      page: query.page,
      limit: query.limit,
      approved: query.approved,
      search: query.search,
    });
    
    res.json({ recipes, total });

  } catch (error) {
    console.error('Failed to fetch recipes for admin:', error);
    res.status(400).json({ error: 'Invalid filter parameters' });
  }
});

adminRouter.get('/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await storage.getRecipeStats();
    res.json(stats);
  } catch (error) {
    console.error('Failed to fetch admin stats:', error);
    res.status(500).json({ error: 'Could not fetch stats' });
  }
});

// Progress tracking endpoint
adminRouter.get('/generation-progress/:jobId', requireAdmin, async (req, res) => {
  try {
    const { jobId } = req.params;
    
    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required' });
    }
    
    const progress = progressTracker.getProgress(jobId);
    
    if (!progress) {
      return res.status(404).json({ error: 'Job not found or has expired' });
    }
    
    res.json(progress);
  } catch (error) {
    console.error('Failed to fetch generation progress:', error);
    res.status(500).json({ error: 'Failed to fetch generation progress' });
  }
});

// Get all active jobs
adminRouter.get('/generation-jobs', requireAdmin, async (req, res) => {
  try {
    const jobs = progressTracker.getAllJobs();
    res.json(jobs);
  } catch (error) {
    console.error('Failed to fetch active generation jobs:', error);
    res.status(500).json({ error: 'Failed to fetch active jobs' });
  }
});

adminRouter.patch('/recipes/:id/approve', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const recipe = await storage.updateRecipe(id, { isApproved: true });
    res.json(recipe);
  } catch (error) {
    console.error(`Failed to approve recipe ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to approve recipe' });
  }
});

// Add unapprove endpoint
adminRouter.patch('/recipes/:id/unapprove', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const recipe = await storage.updateRecipe(id, { isApproved: false });
    res.json(recipe);
  } catch (error) {
    console.error(`Failed to unapprove recipe ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to unapprove recipe' });
  }
});

// Add bulk unapprove endpoint
adminRouter.post('/recipes/bulk-unapprove', requireAdmin, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid request: "ids" must be a non-empty array.' });
    }
    
    // Update all recipes to unapproved state
    await Promise.all(ids.map(id => storage.updateRecipe(id, { isApproved: false })));
    
    res.json({ message: `Successfully unapproved ${ids.length} recipes.` });
  } catch (error) {
    console.error('Failed to bulk unapprove recipes:', error);
    res.status(500).json({ error: 'Failed to bulk unapprove recipes' });
  }
});

// Add bulk approve endpoint
const bulkApproveSchema = z.object({
  recipeIds: z.array(z.string().uuid()),
});

adminRouter.post('/recipes/bulk-approve', requireAdmin, async (req, res) => {
  try {
    const { recipeIds } = bulkApproveSchema.parse(req.body);
    
    if (!recipeIds.length) {
      return res.status(400).json({ error: 'No recipe IDs provided' });
    }

    // Update all recipes in parallel
    const updatePromises = recipeIds.map(id => 
      storage.updateRecipe(id, { isApproved: true })
    );

    const results = await Promise.allSettled(updatePromises);

    // Count successes and failures
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    // If all failed, return 500
    if (failed === recipeIds.length) {
      return res.status(500).json({ 
        error: 'Failed to approve any recipes',
        details: {
          total: recipeIds.length,
          succeeded: 0,
          failed
        }
      });
    }

    // Return partial success if some succeeded
    res.status(succeeded === recipeIds.length ? 200 : 207).json({
      message: succeeded === recipeIds.length 
        ? 'All recipes approved successfully'
        : `Approved ${succeeded} recipes, ${failed} failed`,
      details: {
        total: recipeIds.length,
        succeeded,
        failed
      }
    });

  } catch (error) {
    console.error('Failed to bulk approve recipes:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: 'Invalid request data', 
        details: error.errors 
      });
    } else {
      res.status(500).json({ error: 'Failed to approve recipes' });
    }
  }
});

adminRouter.delete('/recipes/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await storage.deleteRecipe(id);
    res.status(204).send();
  } catch (error) {
    console.error(`Failed to delete recipe ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
});

adminRouter.delete('/recipes', requireAdmin, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid request: "ids" must be a non-empty array.' });
    }
    await storage.bulkDeleteRecipes(ids);
    res.json({ message: `Successfully deleted ${ids.length} recipes.` });
  } catch (error) {
    console.error('Failed to bulk delete recipes:', error);
    res.status(500).json({ error: 'Failed to bulk delete recipes' });
  }
});

// GET /api/admin/recipes/:id - Fetch a single recipe by ID (authenticated access)
adminRouter.get('/recipes/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const recipe = await storage.getRecipe(id);
    
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    // Admins can see all recipes, regular users can only see approved recipes
    if (req.user!.role !== 'admin' && !recipe.isApproved) {
      return res.status(404).json({ error: 'Recipe not found or not approved' });
    }
    
    res.json(recipe);
  } catch (error) {
    console.error(`Failed to fetch recipe ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch recipe' });
  }
});

// Admin profile statistics endpoint
adminRouter.get('/profile/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Get basic recipe stats
    const recipeStats = await storage.getRecipeStats();
    
    // Get user counts by role
    const userStats = await db.select({
      role: users.role,
      count: sql<number>`count(*)::int`,
    })
    .from(users)
    .groupBy(users.role);

    const userCounts = userStats.reduce((acc, stat) => {
      acc[stat.role] = stat.count;
      return acc;
    }, {} as Record<string, number>);

    // Get total meal plans count
    const [mealPlansCount] = await db.select({
      count: sql<number>`count(*)::int`,
    }).from(personalizedMealPlans);

    const stats = {
      totalUsers: (userCounts.admin || 0) + (userCounts.trainer || 0) + (userCounts.customer || 0),
      totalRecipes: recipeStats.total,
      pendingRecipes: recipeStats.pending,
      totalMealPlans: mealPlansCount?.count || 0,
      activeTrainers: userCounts.trainer || 0,
      activeCustomers: userCounts.customer || 0,
    };

    res.json(stats);
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to fetch admin statistics',
      code: 'SERVER_ERROR'
    });
  }
});

// Export data as JSON
adminRouter.get('/export', requireAdmin, async (req, res) => {
  try {
    const { type } = req.query;
    
    if (!type || !['recipes', 'users', 'mealPlans', 'all'].includes(type as string)) {
      return res.status(400).json({ error: 'Invalid export type. Must be: recipes, users, mealPlans, or all' });
    }
    
    const exportData: any = {};
    
    // Export recipes
    if (type === 'recipes' || type === 'all') {
      const { recipes } = await storage.searchRecipes({
        page: 1,
        limit: 100000, // Get all recipes
      });
      exportData.recipes = recipes;
      exportData.recipesCount = recipes.length;
    }
    
    // Export users
    if (type === 'users' || type === 'all') {
      const allUsers = await db.select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        profilePicture: users.profilePicture,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      }).from(users);
      
      exportData.users = allUsers;
      exportData.usersCount = allUsers.length;
    }
    
    // Export meal plans
    if (type === 'mealPlans' || type === 'all') {
      const allMealPlans = await db.select().from(personalizedMealPlans);
      exportData.mealPlans = allMealPlans;
      exportData.mealPlansCount = allMealPlans.length;
    }
    
    // Add metadata
    exportData.exportDate = new Date().toISOString();
    exportData.exportType = type;
    exportData.version = '1.0';
    
    res.json(exportData);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ 
      error: 'Failed to export data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default adminRouter; 