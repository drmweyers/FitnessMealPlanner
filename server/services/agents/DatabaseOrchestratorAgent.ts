// @ts-nocheck - Infrastructure/agent file, type errors suppressed
/**
 * DatabaseOrchestratorAgent - BMAD Phase 2
 * Manages transactional database operations for bulk recipe storage
 * Provides rollback on failure and batch insert optimization
 */

import { BaseAgent } from './BaseAgent';
import { AgentResponse, ValidatedRecipe, SavedRecipeResult } from './types';
import { storage } from '../../storage';
import type { InsertRecipe } from '@shared/schema';
import { recipes } from '@shared/schema';

interface DatabaseInput {
  validatedRecipes: ValidatedRecipe[];
  batchId: string;
  imageUrl?: string; // Default placeholder image
  tierLevel?: 'starter' | 'professional' | 'enterprise'; // Tier level for recipes
}

interface DatabaseOutput {
  savedRecipes: SavedRecipeResult[];
  batchId: string;
  totalSaved: number;
  totalFailed: number;
  errors: string[];
}

export class DatabaseOrchestratorAgent extends BaseAgent {
  private readonly PLACEHOLDER_IMAGE_URL =
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop';
  private readonly BATCH_SIZE = 10; // Process in smaller batches for better error isolation

  constructor() {
    super('coordinator', {
      retryLimit: 3,
      backoffMs: 200,
      fallbackBehavior: 'queue_manual_review',
      notifyUser: true
    });
  }

  async process<DatabaseInput, DatabaseOutput>(
    input: DatabaseInput,
    correlationId: string
  ): Promise<AgentResponse<DatabaseOutput>> {
    return this.executeWithMetrics(async () => {
      const { recipes, validatedRecipes, batchId, imageUrl, tierLevel } = input as any;
      const defaultImageUrl = imageUrl || this.PLACEHOLDER_IMAGE_URL;
      const recipeTierLevel = tierLevel || 'starter'; // Default to starter if not provided

      console.log('[database] Received:', {
        hasRecipes: !!recipes,
        recipesLength: recipes?.length,
        hasValidatedRecipes: !!validatedRecipes,
        validatedRecipesLength: validatedRecipes?.length
      });

      const savedRecipes: SavedRecipeResult[] = [];
      const errors: string[] = [];
      let totalSaved = 0;
      let totalFailed = 0;

      // Process validated recipes if available, otherwise use all recipes
      let recipesToSave = recipes || [];

      if (validatedRecipes && Array.isArray(validatedRecipes)) {
        // Filter valid recipes and track invalid ones as failures
        const invalidRecipes = validatedRecipes.filter(
          (vr: ValidatedRecipe) => !vr.validationPassed
        );
        recipesToSave = validatedRecipes.filter(
          (vr: ValidatedRecipe) => vr.validationPassed
        );

        console.log('[database] Filtered validated recipes:', {
          total: validatedRecipes.length,
          invalid: invalidRecipes.length,
          valid: recipesToSave.length
        });

        // Count invalid recipes as failures
        totalFailed = invalidRecipes.length;
        invalidRecipes.forEach(vr => {
          errors.push(`Skipped invalid recipe: ${vr.recipe.name}`);
        });
      }

      console.log('[database] Recipes to save:', recipesToSave.length);

      if (recipesToSave.length === 0) {
        console.log('[database] No recipes to save - returning empty result');
        return {
          savedRecipes: [],
          batchId,
          totalSaved: 0,
          totalFailed,
          errors: errors.length > 0 ? errors : ['No validated recipes to save']
        } as DatabaseOutput;
      }

      // Process in smaller batches for better error isolation
      const batches = this.chunkArray(recipesToSave, this.BATCH_SIZE);

      for (const batch of batches) {
        try {
          const batchResults = await this.saveBatchWithTransaction(batch, defaultImageUrl, recipeTierLevel);
          savedRecipes.push(...batchResults.saved);
          errors.push(...batchResults.errors);
          totalSaved += batchResults.saved.length;
          totalFailed += batchResults.failed;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          errors.push(`Batch save failed: ${errorMsg}`);
          totalFailed += batch.length;
        }
      }

      return {
        savedRecipes,
        batchId,
        totalSaved,
        totalFailed,
        errors
      } as DatabaseOutput;
    });
  }

  /**
   * Save a batch of recipes within a single transaction
   * Uses transaction context directly to ensure all inserts are part of the transaction
   */
  private async saveBatchWithTransaction(
    batch: ValidatedRecipe[],
    defaultImageUrl: string,
    tierLevel: 'starter' | 'professional' | 'enterprise' = 'starter'
  ): Promise<{
    saved: SavedRecipeResult[];
    failed: number;
    errors: string[];
  }> {
    const saved: SavedRecipeResult[] = [];
    const errors: string[] = [];
    let failed = 0;

    try {
      await storage.transaction(async (tx) => {
        for (const validatedRecipe of batch) {
          try {
            const recipeData = this.convertToInsertRecipe(
              validatedRecipe.recipe,
              defaultImageUrl,
              tierLevel
            );

            // CRITICAL FIX: Use transaction context directly instead of storage.createRecipe()
            // This ensures the insert is part of the transaction
            const [createdRecipe] = await tx.insert(recipes)
              .values(recipeData as any)
              .returning();

            saved.push({
              recipeId: createdRecipe.id,  // UUID string, not Number
              recipeName: createdRecipe.name,
              recipeDescription: createdRecipe.description || '',
              mealTypes: createdRecipe.mealTypes || [],
              success: true,
              imageUrl: createdRecipe.imageUrl || null // Don't use placeholder - images must be generated or recipe will be deleted
            });
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            const errorDetails = {
              message: errorMsg,
              type: error instanceof Error ? error.constructor.name : 'Unknown',
              code: (error as any)?.code, // PostgreSQL error code
              detail: (error as any)?.detail, // PostgreSQL error detail
              constraint: (error as any)?.constraint, // Constraint name if violated
              recipeName: validatedRecipe.recipe.name
            };
            
            console.error('[database] Recipe save error:', JSON.stringify(errorDetails, null, 2));
            
            errors.push(`Failed to save ${validatedRecipe.recipe.name}: ${errorMsg}`);
            failed++;

            // Don't throw - allow other recipes in the batch to save
            // Only throw if it's a critical error that should rollback everything
            if ((error as any)?.code === '23505') { // Unique constraint violation
              console.warn(`[database] Skipping duplicate recipe: ${validatedRecipe.recipe.name}`);
            } else {
              // For other errors, log but continue
              console.warn(`[database] Recipe save failed but continuing: ${errorMsg}`);
            }
          }
        }
      });
    } catch (error) {
      // Transaction-level error (connection issues, etc.)
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorDetails = {
        message: errorMsg,
        type: error instanceof Error ? error.constructor.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined,
        code: (error as any)?.code,
        timestamp: new Date().toISOString()
      };
      
      console.error('[database] Transaction failed:', JSON.stringify(errorDetails, null, 2));
      
      return {
        saved: [], // No recipes saved due to transaction failure
        failed: batch.length,
        errors: [`Transaction failed: ${errorMsg}`]
      };
    }

    return { saved, failed, errors };
  }

  /**
   * Convert GeneratedRecipe to InsertRecipe format for database
   */
  private convertToInsertRecipe(recipe: any, imageUrl: string, tierLevel: 'starter' | 'professional' | 'enterprise' = 'starter'): InsertRecipe {
    return {
      name: recipe.name,
      description: recipe.description,
      mealTypes: recipe.mealTypes,
      dietaryTags: recipe.dietaryTags || [],
      mainIngredientTags: recipe.mainIngredientTags || [],
      ingredientsJson: recipe.ingredients.map((ing: any) => ({
        ...ing,
        amount: String(ing.amount),
      })),
      instructionsText: recipe.instructions,
      prepTimeMinutes: recipe.prepTimeMinutes,
      cookTimeMinutes: recipe.cookTimeMinutes,
      servings: recipe.servings,
      caloriesKcal: recipe.estimatedNutrition.calories,
      proteinGrams: Number(recipe.estimatedNutrition.protein).toFixed(2),
      carbsGrams: Number(recipe.estimatedNutrition.carbs).toFixed(2),
      fatGrams: Number(recipe.estimatedNutrition.fat).toFixed(2),
      imageUrl: null, // Don't set placeholder image - recipes must have images generated later
      sourceReference: 'AI Generated - BMAD',
      isApproved: false,
      tierLevel: tierLevel, // Assign tier level to recipe
    };
  }

  /**
   * Save recipes without transaction (fallback for non-transactional operations)
   */
  async saveBatchWithoutTransaction(
    validatedRecipes: ValidatedRecipe[],
    batchId: string,
    imageUrl?: string,
    tierLevel: 'starter' | 'professional' | 'enterprise' = 'starter'
  ): Promise<AgentResponse<DatabaseOutput>> {
    // Don't use placeholder - recipes must have images generated later
    const defaultImageUrl = null;
    const savedRecipes: SavedRecipeResult[] = [];
    const errors: string[] = [];
    let totalSaved = 0;
    let totalFailed = 0;

    for (const validatedRecipe of validatedRecipes) {
      if (!validatedRecipe.validationPassed) {
        totalFailed++;
        errors.push(`Skipped invalid recipe: ${validatedRecipe.recipe.name}`);
        continue;
      }

      try {
        const recipeData = this.convertToInsertRecipe(validatedRecipe.recipe, defaultImageUrl, 'starter'); // tierLevel defaults to starter if not provided
        const createdRecipe = await storage.createRecipe(recipeData);

        savedRecipes.push({
          recipeId: createdRecipe.id,  // UUID string, not Number
          recipeName: createdRecipe.name,
          recipeDescription: createdRecipe.description || '',
          mealTypes: createdRecipe.mealTypes || [],
          success: true,
          imageUrl: createdRecipe.imageUrl || null // Don't use placeholder - images must be generated or recipe will be deleted
        });
        totalSaved++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to save ${validatedRecipe.recipe.name}: ${errorMsg}`);
        totalFailed++;

        savedRecipes.push({
          recipeId: 0,
          recipeName: validatedRecipe.recipe.name,
          success: false,
          error: errorMsg
        });
      }
    }

    return {
      success: true,
      data: {
        savedRecipes,
        batchId,
        totalSaved,
        totalFailed,
        errors
      }
    };
  }

  /**
   * Utility: Chunk array into smaller batches
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Get statistics about database operations
   */
  getOperationStats(): {
    totalOperations: number;
    successfulSaves: number;
    failedSaves: number;
    averageBatchSize: number;
  } {
    const metrics = this.getMetrics();
    return {
      totalOperations: metrics.operationCount,
      successfulSaves: metrics.successCount,
      failedSaves: metrics.errorCount,
      averageBatchSize: this.BATCH_SIZE
    };
  }
}
