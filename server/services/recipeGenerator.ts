import { storage } from "../storage";
import { generateRecipeBatch, generateImageForRecipe, type GeneratedRecipe } from "./openai";
import type { InsertRecipe } from "@shared/schema";
import { OpenAIRateLimiter } from "./utils/RateLimiter";
import { RecipeCache } from "./utils/RecipeCache";
import { RecipeGenerationMetrics } from "./utils/Metrics";
import { uploadImageToS3 } from "./utils/S3Uploader";
import { progressTracker } from "./progressTracker";

interface GenerationOptions {
  count: number;
  mealTypes?: string[];
  dietaryRestrictions?: string[];
  targetCalories?: number;
  mainIngredient?: string;
  fitnessGoal?: string;
  naturalLanguagePrompt?: string;
  maxPrepTime?: number;
  maxCalories?: number;
  minProtein?: number;
  maxProtein?: number;
  minCarbs?: number;
  maxCarbs?: number;
  minFat?: number;
  maxFat?: number;
  jobId?: string; // Optional job ID for progress tracking
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

export class RecipeGeneratorService {
  private rateLimiter = new OpenAIRateLimiter();
  private cache = new RecipeCache();
  private metrics = new RecipeGenerationMetrics();

  async generateAndStoreRecipes(options: GenerationOptions): Promise<GenerationResult> {
    const startTime = Date.now();
    const jobId = options.jobId;
    
    try {
      // Update progress to generating step
      if (jobId) {
        progressTracker.updateProgress(jobId, { currentStep: 'generating' });
      }

      const generatedRecipes = await this.rateLimiter.execute(() =>
        generateRecipeBatch(options.count, {
          mealTypes: options.mealTypes,
          dietaryRestrictions: options.dietaryRestrictions,
          targetCalories: options.targetCalories,
          mainIngredient: options.mainIngredient,
          fitnessGoal: options.fitnessGoal,
          naturalLanguagePrompt: options.naturalLanguagePrompt,
          maxPrepTime: options.maxPrepTime,
          maxCalories: options.maxCalories,
          minProtein: options.minProtein,
          maxProtein: options.maxProtein,
          minCarbs: options.minCarbs,
          maxCarbs: options.maxCarbs,
          minFat: options.minFat,
          maxFat: options.maxFat,
        })
      );
      
      if (!generatedRecipes || generatedRecipes.length === 0) {
        if (jobId) {
          progressTracker.markJobFailed(jobId, "No recipes were generated in the batch.");
        }
        throw new Error("No recipes were generated in the batch.");
      }

      // Update progress to validation/processing step
      if (jobId) {
        progressTracker.updateProgress(jobId, { currentStep: 'validating' });
      }

      // Process recipes one by one with progress tracking
      const finalResult: GenerationResult = { success: 0, failed: 0, errors: [] };
      
      for (let i = 0; i < generatedRecipes.length; i++) {
        const recipe = generatedRecipes[i];
        
        try {
          // Update step progress
          if (jobId) {
            progressTracker.recordStepProgress(jobId, i + 1, 'Processing Recipe', i + 1, generatedRecipes.length);
          }
          
          const result = await this.processSingleRecipe(recipe, jobId);
          
          if (result.success) {
            finalResult.success++;
            if (jobId) {
              progressTracker.recordSuccess(jobId, recipe.name);
            }
          } else {
            finalResult.failed++;
            finalResult.errors.push(result.error || 'Unknown processing error');
            if (jobId) {
              progressTracker.recordFailure(jobId, result.error || 'Unknown processing error', recipe.name);
            }
          }
        } catch (error) {
          finalResult.failed++;
          const errorMsg = `Failed to process recipe "${recipe.name}": ${error}`;
          finalResult.errors.push(errorMsg);
          if (jobId) {
            progressTracker.recordFailure(jobId, errorMsg, recipe.name);
          }
        }
      }

      const totalDuration = Date.now() - startTime;
      finalResult.metrics = {
        totalDuration,
        averageTimePerRecipe: totalDuration / options.count,
      };
      this.metrics.recordGeneration(totalDuration, finalResult.success === options.count);

      // Mark job as complete
      if (jobId) {
        progressTracker.updateProgress(jobId, { currentStep: 'complete' });
      }

      return finalResult;

    } catch (error) {
      const errorMsg = `Recipe generation service failed: ${error}`;
      console.error(errorMsg);
      
      if (jobId) {
        progressTracker.markJobFailed(jobId, errorMsg);
      }
      
      this.metrics.recordGeneration(
        Date.now() - startTime,
        false,
        error instanceof Error ? error.name : 'UnknownError'
      );
      return { success: 0, failed: options.count, errors: [errorMsg] };
    }
  }

  private async processSingleRecipe(recipe: GeneratedRecipe, jobId?: string): Promise<{ success: boolean; error?: string }> {
    // Validation step
    if (jobId) {
      progressTracker.updateProgress(jobId, { currentStep: 'validating' });
    }
    
    const validation = await this.validateRecipe(recipe);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    // Image generation step
    if (jobId) {
      progressTracker.updateProgress(jobId, { currentStep: 'images' });
    }
    
    const imageUrl = await this.getOrGenerateImage(recipe);
    if (!imageUrl) {
      return { success: false, error: `Image generation failed for recipe: ${recipe.name}` };
    }
    
    // Storage step
    if (jobId) {
      progressTracker.updateProgress(jobId, { currentStep: 'storing' });
    }
    
    return this.storeRecipe({ ...recipe, imageUrl });
  }

  private async validateRecipe(recipe: GeneratedRecipe): Promise<{ success: boolean; error?: string }> {
    try {
      if (!recipe.name || !recipe.ingredients || !recipe.instructions) {
        return { success: false, error: 'Missing required fields' };
      }
      const nutrition = recipe.estimatedNutrition;
      if (!nutrition || 
          nutrition.calories < 0 || 
          nutrition.protein < 0 || 
          nutrition.carbs < 0 || 
          nutrition.fat < 0) {
        return { success: false, error: 'Invalid nutritional information' };
      }
      if (!recipe.ingredients.every(ing => ing.name && ing.amount)) {
        return { success: false, error: 'Invalid ingredients' };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: `Validation error: ${error}` };
    }
  }

  private async storeRecipe(
    recipe: GeneratedRecipe
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const recipeData: InsertRecipe = {
        name: recipe.name,
        description: recipe.description,
        mealTypes: recipe.mealTypes,
        dietaryTags: recipe.dietaryTags,
        mainIngredientTags: recipe.mainIngredientTags,
        ingredientsJson: recipe.ingredients.map((ing) => ({
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
        imageUrl: recipe.imageUrl,
        sourceReference: 'AI Generated',
        isApproved: false,
      };

      await storage.createRecipe(recipeData);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: `Failed to store recipe "${recipe.name}": ${message}` };
    }
  }

  private async getOrGenerateImage(recipe: GeneratedRecipe): Promise<string | null> {
    const cacheKey = `image_s3_${recipe.name.replace(/\s/g, '_')}`;
    
    try {
      return await this.cache.getOrSet(cacheKey, async () => {
        const tempUrl = await generateImageForRecipe(recipe);
        if (!tempUrl) {
          throw new Error("Did not receive a temporary URL from OpenAI.");
        }
        
        const permanentUrl = await uploadImageToS3(tempUrl, recipe.name);
        return permanentUrl;
      });
    } catch (error) {
      console.error(`Failed to generate and store image for "${recipe.name}":`, error);
      return null;
    }
  }

  getMetrics() {
    return this.metrics.getMetrics();
  }

  resetMetrics() {
    this.metrics.reset();
  }
}

export const recipeGenerator = new RecipeGeneratorService();