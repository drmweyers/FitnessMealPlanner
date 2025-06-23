import { storage } from "../storage";
import { generateRecipeBatch, type GeneratedRecipe } from "./openai";
import type { InsertRecipe } from "@shared/schema";
import { OpenAIRateLimiter } from "./utils/RateLimiter";
import { RecipeCache } from "./utils/RecipeCache";
import { RecipeGenerationMetrics } from "./utils/Metrics";

interface GenerationOptions {
  count: number;
  mealTypes?: string[];
  dietaryRestrictions?: string[];
  targetCalories?: number;
  mainIngredient?: string;
}

interface GenerationResult {
  success: number;
  failed: number;
  errors: string[];
  metrics?: {
    totalDuration: number;
    averageTimePerRecipe: number;
  };
}

interface BatchResult {
  success: number;
  failed: number;
  errors: string[];
}

export class RecipeGeneratorService {
  private rateLimiter = new OpenAIRateLimiter();
  private cache = new RecipeCache();
  private metrics = new RecipeGenerationMetrics();

  async generateAndStoreRecipes(options: GenerationOptions): Promise<GenerationResult> {
    const startTime = Date.now();
    const batchSize = 5; // Smaller batches for parallel processing
    const batches = Math.ceil(options.count / batchSize);
    
    try {
      console.log(`Starting recipe generation: ${options.count} recipes in ${batches} batches`);
      
      // Process batches in parallel with Promise.allSettled
      const batchPromises = Array.from({ length: batches }, (_, batchIndex) => {
        const batchCount = Math.min(batchSize, options.count - (batchIndex * batchSize));
        return this.processBatch(batchCount, batchIndex, options);
      });

      const results = await Promise.allSettled(batchPromises);
      
      // Aggregate results
      const finalResult = results.reduce<GenerationResult>(
        (acc, result) => {
          if (result.status === 'fulfilled') {
            acc.success += result.value.success;
            acc.failed += result.value.failed;
            acc.errors.push(...result.value.errors);
          } else {
            acc.failed += batchSize;
            acc.errors.push(`Batch failed: ${result.reason}`);
          }
          return acc;
        },
        { success: 0, failed: 0, errors: [] }
      );

      // Add metrics
      const totalDuration = Date.now() - startTime;
      finalResult.metrics = {
        totalDuration,
        averageTimePerRecipe: totalDuration / options.count
      };

      // Record metrics
      this.metrics.recordGeneration(
        totalDuration,
        finalResult.success === options.count
      );

      return finalResult;
    } catch (error) {
      const errorMsg = `Recipe generation service failed: ${error}`;
      console.error(errorMsg);
      
      // Record failure in metrics
      this.metrics.recordGeneration(
        Date.now() - startTime,
        false,
        error.name || 'UnknownError'
      );

      return {
        success: 0,
        failed: options.count,
        errors: [errorMsg]
      };
    }
  }

  private async processBatch(
    batchCount: number,
    batchIndex: number,
    options: GenerationOptions
  ): Promise<BatchResult> {
    const retryAttempts = 3;
    let attempt = 0;
    
    while (attempt < retryAttempts) {
      try {
        // Use rate limiter for API calls
        const recipes = await this.rateLimiter.execute(() =>
          generateRecipeBatch(batchCount, {
            mealTypes: options.mealTypes,
            dietaryRestrictions: options.dietaryRestrictions,
          })
        );

        // Validate recipes
        const validRecipes = await Promise.all(
          recipes.map(recipe => this.validateRecipe(recipe))
        );

        // Filter out invalid recipes
        const validatedRecipes = recipes.filter((_, index) => validRecipes[index].success);

        if (validatedRecipes.length === 0) {
          throw new Error('No valid recipes generated in batch');
        }

        // Store recipes in transaction
        return await storage.transaction(async (trx) => {
          const results = await Promise.all(
            validatedRecipes.map(recipe => this.storeRecipe(recipe, trx))
          );

          return results.reduce<BatchResult>(
            (acc, result) => {
              if (result.success) {
                acc.success++;
              } else {
                acc.failed++;
                acc.errors.push(result.error);
              }
              return acc;
            },
            { success: 0, failed: 0, errors: [] }
          );
        });

      } catch (error) {
        attempt++;
        console.error(`Batch ${batchIndex} attempt ${attempt} failed:`, error);
        
        if (attempt === retryAttempts) {
          return {
            success: 0,
            failed: batchCount,
            errors: [`Batch ${batchIndex} failed after ${retryAttempts} attempts: ${error}`]
          };
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, attempt - 1)));
      }
    }

    // This should never be reached due to the return in the catch block
    return { success: 0, failed: batchCount, errors: ['Unexpected error in batch processing'] };
  }

  private async validateRecipe(recipe: GeneratedRecipe): Promise<{ success: boolean; error?: string }> {
    try {
      // Basic validation
      if (!recipe.name || !recipe.ingredients || !recipe.instructions) {
        return { success: false, error: 'Missing required fields' };
      }

      // Validate nutritional information
      const nutrition = recipe.estimatedNutrition;
      if (!nutrition || 
          nutrition.calories < 0 || 
          nutrition.protein < 0 || 
          nutrition.carbs < 0 || 
          nutrition.fat < 0) {
        return { success: false, error: 'Invalid nutritional information' };
      }

      // Validate ingredients
      if (!recipe.ingredients.every(ing => ing.name && ing.amount)) {
        return { success: false, error: 'Invalid ingredients' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: `Validation error: ${error}` };
    }
  }

  private async storeRecipe(
    recipe: GeneratedRecipe,
    trx?: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const recipeData: InsertRecipe = {
        name: recipe.name,
        description: recipe.description,
        mealTypes: recipe.mealTypes,
        dietaryTags: recipe.dietaryTags,
        mainIngredientTags: recipe.mainIngredientTags,
        ingredientsJson: recipe.ingredients,
        instructionsText: recipe.instructions,
        prepTimeMinutes: recipe.prepTimeMinutes,
        cookTimeMinutes: recipe.cookTimeMinutes,
        servings: recipe.servings,
        caloriesKcal: recipe.estimatedNutrition.calories,
        proteinGrams: Number(recipe.estimatedNutrition.protein).toFixed(2),
        carbsGrams: Number(recipe.estimatedNutrition.carbs).toFixed(2),
        fatGrams: Number(recipe.estimatedNutrition.fat).toFixed(2),
        imageUrl: await this.getOrGenerateImage(recipe),
        sourceReference: 'AI Generated',
        isApproved: false,
      };

      await storage.createRecipe(recipeData, trx);
      return { success: true };
    } catch (error) {
      return { success: false, error: `Failed to store recipe "${recipe.name}": ${error}` };
    }
  }

  private async getOrGenerateImage(recipe: GeneratedRecipe): Promise<string> {
    const cacheKey = `image_${recipe.name}_${recipe.mealTypes[0]}`;
    
    return this.cache.getOrSet(cacheKey, async () => {
      // For now, return placeholder. In future, implement AI image generation
      return this.getPlaceholderImageUrl(recipe.mealTypes[0]);
    });
  }

  private getPlaceholderImageUrl(mealType: string): string {
    const placeholders = {
      breakfast: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250',
      lunch: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250',
      dinner: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250',
      snack: 'https://images.unsplash.com/photo-1610970881699-44a5587cabec?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250',
    };
    
    return placeholders[mealType as keyof typeof placeholders] || placeholders.dinner;
  }

  // Expose metrics for monitoring
  getMetrics() {
    return this.metrics.getMetrics();
  }

  resetMetrics() {
    this.metrics.reset();
  }
}

export const recipeGenerator = new RecipeGeneratorService();
