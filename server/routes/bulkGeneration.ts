// @ts-nocheck - Type errors suppressed
/**
 * Bulk Recipe Generation Routes
 * 
 * Handles very large batch recipe generation (100-10,000 recipes)
 * with async processing, progress tracking, and SSE updates
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAdmin } from '../middleware/auth';
import { bmadRecipeService } from '../services/BMADRecipeService';
import { sseManager } from '../services/utils/SSEManager';
import { z } from 'zod';
import { nanoid } from 'nanoid';

const router = Router();

// Store active batches (in production, use Redis or database)
const activeBatches = new Map<string, { 
  startTime: number;
  options: any;
  canStop: boolean;
}>();

// Validation schema
const bulkGenerationSchema = z.object({
  count: z.number().int().min(1).max(10000),
  mealTypes: z.array(z.string()).optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
  fitnessGoal: z.string().optional(),
  mainIngredient: z.string().optional(),
  targetCalories: z.number().optional(),
  maxCalories: z.number().optional(),
  minProtein: z.number().optional(),
  maxProtein: z.number().optional(),
  minCarbs: z.number().optional(),
  maxCarbs: z.number().optional(),
  minFat: z.number().optional(),
  maxFat: z.number().optional(),
  maxPrepTime: z.number().optional(),
  naturalLanguagePrompt: z.string().optional(),
  enableImageGeneration: z.boolean().optional().default(true),
  enableS3Upload: z.boolean().optional().default(true),
  enableNutritionValidation: z.boolean().optional().default(true),
  tierLevels: z.array(z.enum(['starter', 'professional', 'enterprise'])).min(1).optional(),
});

/**
 * POST /api/admin/generate-bulk
 * Start bulk recipe generation
 */
router.post('/', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const validatedData = bulkGenerationSchema.parse(req.body);
    
    // Generate batch ID
    const batchId = `bulk_${nanoid(12)}`;
    
    // Store batch info
    activeBatches.set(batchId, {
      startTime: Date.now(),
      options: validatedData,
      canStop: true,
    });

    console.log(`[Bulk Generation] Starting batch ${batchId} with ${validatedData.count} recipes`);

    // Start generation asynchronously (don't await)
    generateBulkRecipesAsync(batchId, validatedData).catch(error => {
      console.error(`[Bulk Generation] Batch ${batchId} failed:`, error);
      
      // Send error via SSE
      sseManager.broadcastError(batchId, {
        type: 'error',
        message: error.message || 'Generation failed',
        timestamp: new Date().toISOString(),
      });
      
      // Remove from active batches
      activeBatches.delete(batchId);
    });

    // Return immediately with batch ID
    res.status(202).json({
      status: 'accepted',
      message: `Bulk generation started for ${validatedData.count} recipes`,
      batchId,
      estimatedTime: estimateGenerationTime(validatedData.count),
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request data',
        errors: error.errors,
      });
    }
    next(error);
  }
});

/**
 * GET /api/admin/generate-bulk/progress/:batchId
 * SSE endpoint for progress updates
 */
router.get('/progress/:batchId', requireAdmin, (req: Request, res: Response) => {
  const { batchId } = req.params;

  // Generate unique client ID
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Register SSE connection (SSE manager automatically sets headers and sends initial message)
  sseManager.addClient(batchId, clientId, res);

  // Handle client disconnect
  req.on('close', () => {
    sseManager.removeClient(batchId, clientId);
  });
});

/**
 * POST /api/admin/generate-bulk/stop/:batchId
 * Stop an active generation batch
 */
router.post('/stop/:batchId', requireAdmin, async (req: Request, res: Response) => {
  const { batchId } = req.params;

  const batch = activeBatches.get(batchId);
  if (!batch) {
    return res.status(404).json({
      status: 'error',
      message: 'Batch not found or already completed',
    });
  }

  if (!batch.canStop) {
    return res.status(400).json({
      status: 'error',
      message: 'Batch cannot be stopped at this time',
    });
  }

  // Mark batch as stopped (actual stopping logic would go here)
  batch.canStop = false;
  
      // Send stop notification via SSE
      sseManager.broadcastProgress(batchId, {
        type: 'stopped',
        message: 'Generation stopped by user',
        timestamp: new Date().toISOString(),
        phase: 'stopped',
        percentage: 0,
      });

  res.json({
    status: 'success',
    message: 'Generation stop requested',
    batchId,
  });
});

/**
 * GET /api/admin/generate-bulk/recipe-count
 * Query actual DB recipe count matching criteria — ground truth for executor
 */
router.get('/recipe-count', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { tierLevel, mainIngredient, createdAfter } = req.query;

    const { db } = await import('../db');
    const { recipes } = await import('../../shared/schema');
    const { count, and, eq, gte, sql } = await import('drizzle-orm');

    const conditions: any[] = [];

    if (tierLevel && typeof tierLevel === 'string') {
      conditions.push(eq(recipes.tierLevel, tierLevel as any));
    }

    if (createdAfter && typeof createdAfter === 'string') {
      conditions.push(gte(recipes.creationTimestamp, new Date(createdAfter)));
    }

    if (mainIngredient && typeof mainIngredient === 'string') {
      conditions.push(
        sql`${recipes.mainIngredientTags}::jsonb @> ${JSON.stringify([mainIngredient])}::jsonb`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [result] = await db
      .select({ count: count() })
      .from(recipes)
      .where(whereClause);

    res.json({
      count: result?.count || 0,
      filters: { tierLevel, mainIngredient, createdAfter },
    });
  } catch (error) {
    console.error('[recipe-count] Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to query recipe count' });
  }
});

/**
 * GET /api/admin/generate-bulk/status/:batchId
 * Get status of a generation batch
 *
 * Lookup chain:
 * 1. activeBatches Map (currently running)
 * 2. bmadRecipeService.getProgress() (BMAD ProgressMonitorAgent)
 * 3. progressTracker (legacy recipeGenerator system)
 * 4. 404 not found
 */
router.get('/status/:batchId', requireAdmin, async (req: Request, res: Response) => {
  const { batchId } = req.params;

  // 1. Check activeBatches (currently running)
  const batch = activeBatches.get(batchId);

  // 2. Check BMAD ProgressMonitorAgent (primary progress source)
  let bmadProgress = null;
  try {
    bmadProgress = await bmadRecipeService.getProgress(batchId);
  } catch (error) {
    // BMAD service may not have this batch
  }

  if (batch) {
    return res.json({
      status: bmadProgress?.phase === 'complete' ? 'complete'
            : bmadProgress?.phase === 'error' ? 'failed'
            : 'active',
      batchId,
      startTime: batch.startTime,
      duration: Date.now() - batch.startTime,
      options: batch.options,
      progress: bmadProgress || null,
    });
  }

  // Batch not in activeBatches — may have completed and been cleaned up
  if (bmadProgress) {
    return res.json({
      status: bmadProgress.phase === 'complete' ? 'complete'
            : bmadProgress.phase === 'error' ? 'failed'
            : 'active',
      batchId,
      progress: bmadProgress,
    });
  }

  // 3. Fall back to legacy progressTracker
  try {
    const { progressTracker } = await import('../services/progressTracker');
    const progress = progressTracker.getProgress(batchId);

    if (progress) {
      return res.json({
        status: progress.currentStep === 'complete' ? 'complete' : 'active',
        batchId,
        progress,
      });
    }
  } catch (error) {
    // progressTracker might not have it
  }

  // 4. Not found anywhere
  return res.status(404).json({
    status: 'error',
    message: 'Batch not found',
  });
});

/**
 * Async function to generate bulk recipes
 */
async function generateBulkRecipesAsync(batchId: string, options: any) {
  try {
    console.log(`[Bulk Generation] Batch ${batchId}: Starting generation of ${options.count} recipes`);

    // Determine tier level from selected tiers
    // Using PROGRESSIVE ACCESS model: Assign to LOWEST selected tier so all selected tiers can access it
    // - Professional + Enterprise → assign to Professional (Professional and Enterprise both see it via progressive access)
    // - Starter + Professional + Enterprise → assign to Starter (all three tiers see it)
    // - Enterprise only → assign to Enterprise (only Enterprise sees it)
    // 
    // Progressive access filtering:
    // - Starter trainers see recipes with tier_level <= 'starter' (only starter)
    // - Professional trainers see recipes with tier_level <= 'professional' (starter + professional)
    // - Enterprise trainers see recipes with tier_level <= 'enterprise' (all)
    const tierPriority: Record<string, number> = {
      starter: 1,
      professional: 2,
      enterprise: 3,
    };
    const selectedTierLevels = options.tierLevels || [];
    let tierLevel = 'starter'; // Default to starter
    
    if (selectedTierLevels.length > 0) {
      // Sort by priority (lowest first) and take the first (lowest) tier
      // This ensures all selected tiers can access the recipe through progressive access
      const sortedTiers = [...selectedTierLevels].sort((a: string, b: string) => tierPriority[a] - tierPriority[b]);
      tierLevel = sortedTiers[0]; // Lowest tier
      
      console.log(`[Bulk Generation] Selected tiers: ${selectedTierLevels.join(', ')} → Assigning to: ${tierLevel} (accessible by: ${selectedTierLevels.join(', ')})`);
    }

    // Convert options to BMAD format
    const bmadOptions = {
      count: options.count,
      mealTypes: options.mealTypes,
      dietaryRestrictions: options.dietaryRestrictions,
      fitnessGoal: options.fitnessGoal,
      mainIngredient: options.mainIngredient,
      focusIngredient: options.mainIngredient, // BMAD uses focusIngredient
      targetCalories: options.targetCalories,
      maxCalories: options.maxCalories,
      minProtein: options.minProtein,
      maxProtein: options.maxProtein,
      minCarbs: options.minCarbs,
      maxCarbs: options.maxCarbs,
      minFat: options.minFat,
      maxFat: options.maxFat,
      maxPrepTime: options.maxPrepTime,
      naturalLanguagePrompt: options.naturalLanguagePrompt,
      enableImageGeneration: options.enableImageGeneration !== false,
      enableS3Upload: options.enableS3Upload !== false,
      enableNutritionValidation: options.enableNutritionValidation !== false,
      tierLevel, // Pass the determined tier level
      tierLevels: selectedTierLevels, // Also pass the full array for reference
      batchId, // Pass batch ID for progress tracking
      progressCallback: (progress: any) => {
        // Broadcast progress via SSE
        sseManager.broadcastProgress(batchId, {
          type: 'progress',
          ...progress,
          timestamp: new Date().toISOString(),
        });
      },
    };

    // Use BMAD service for generation
    const result = await bmadRecipeService.generateRecipes(bmadOptions);

    console.log(`[Bulk Generation] Batch ${batchId}: Completed - ${result.savedRecipes.length} recipes`);

    // Calculate statistics
    const stats = {
      totalRecipes: options.count,
      successful: result.savedRecipes.length,
      failed: result.errors.length,
      imagesGenerated: result.imagesGenerated || 0,
      imagesUploaded: result.imagesUploaded || 0,
      totalTime: result.totalTime || 0,
      averageTimePerRecipe: result.savedRecipes.length > 0 
        ? (result.totalTime || 0) / result.savedRecipes.length 
        : 0,
    };

    // Send completion message via SSE (use broadcastCompletion for completion events)
    sseManager.broadcastCompletion(batchId, {
      type: 'complete',
      ...stats,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });

    // Remove from active batches
    activeBatches.delete(batchId);

  } catch (error) {
    console.error(`[Bulk Generation] Batch ${batchId} error:`, error);
    
    // Send error via SSE
    sseManager.broadcastError(batchId, {
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });

    // Remove from active batches
    activeBatches.delete(batchId);
    
    throw error;
  }
}

/**
 * Estimate generation time based on batch size
 */
function estimateGenerationTime(count: number): number {
  // Rough estimates:
  // - 5 seconds per recipe (generation + validation)
  // - 15 seconds per image (DALL-E 3 generation + S3 upload)
  // - Chunking overhead: ~2 seconds per chunk
  const recipesPerChunk = 5;
  const chunks = Math.ceil(count / recipesPerChunk);
  const recipeTime = count * 5;
  const imageTime = count * 15;
  const chunkOverhead = chunks * 2;
  
  // Add 20% buffer
  return Math.ceil((recipeTime + imageTime + chunkOverhead) * 1.2);
}

export default router;

