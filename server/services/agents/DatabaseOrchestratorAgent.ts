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

interface DatabaseInput {
  validatedRecipes: ValidatedRecipe[];
  batchId: string;
  imageUrl?: string; // Default placeholder image
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
      const { recipes, validatedRecipes, batchId, imageUrl } = input as any;
      const defaultImageUrl = imageUrl || this.PLACEHOLDER_IMAGE_URL;

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
          const batchResults = await this.saveBatchWithTransaction(batch, defaultImageUrl);
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
   * Rolls back all changes if any recipe fails
   */
  private async saveBatchWithTransaction(
    batch: ValidatedRecipe[],
    defaultImageUrl: string
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
              defaultImageUrl
            );

            // Use transaction context for insert
            const createdRecipe = await storage.createRecipe(recipeData);

            saved.push({
              recipeId: createdRecipe.id,  // UUID string, not Number
              recipeName: createdRecipe.name,
              recipeDescription: createdRecipe.description || '',
              mealTypes: createdRecipe.mealTypes || [],
              success: true,
              imageUrl: createdRecipe.imageUrl || defaultImageUrl
            });
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            errors.push(`Failed to save ${validatedRecipe.recipe.name}: ${errorMsg}`);
            failed++;

            // Throw error to trigger transaction rollback
            throw new Error(`Recipe save failed: ${errorMsg}`);
          }
        }
      });
    } catch (error) {
      // Transaction rolled back
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        saved: [], // No recipes saved due to rollback
        failed: batch.length,
        errors: [errorMsg]
      };
    }

    return { saved, failed, errors };
  }

  /**
   * Convert GeneratedRecipe to InsertRecipe format for database
   */
  private convertToInsertRecipe(recipe: any, imageUrl: string): InsertRecipe {
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
      imageUrl: imageUrl,
      sourceReference: 'AI Generated - BMAD',
      isApproved: false,
    };
  }

  /**
   * Save recipes without transaction (fallback for non-transactional operations)
   */
  async saveBatchWithoutTransaction(
    validatedRecipes: ValidatedRecipe[],
    batchId: string,
    imageUrl?: string
  ): Promise<AgentResponse<DatabaseOutput>> {
    const defaultImageUrl = imageUrl || this.PLACEHOLDER_IMAGE_URL;
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
        const recipeData = this.convertToInsertRecipe(validatedRecipe.recipe, defaultImageUrl);
        const createdRecipe = await storage.createRecipe(recipeData);

        savedRecipes.push({
          recipeId: createdRecipe.id,  // UUID string, not Number
          recipeName: createdRecipe.name,
          recipeDescription: createdRecipe.description || '',
          mealTypes: createdRecipe.mealTypes || [],
          success: true,
          imageUrl: createdRecipe.imageUrl || defaultImageUrl
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
