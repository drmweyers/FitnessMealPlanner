import { storage } from "../storage";
import { generateRecipeBatch, generateImageForRecipe, type GeneratedRecipe } from "./openai";
import type { InsertRecipe } from "@shared/schema";
import { OpenAIRateLimiter } from "./utils/RateLimiter";
import { RecipeCache } from "./utils/RecipeCache";
import { RecipeGenerationMetrics } from "./utils/Metrics";
import { uploadImageToS3 } from "./utils/S3Uploader";
import { RecipeValidator, type NutritionalConstraints } from "./RecipeValidator";
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
  jobId?: string; // For progress tracking with SSE
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

// Placeholder image URL for recipes without generated images
const PLACEHOLDER_IMAGE_URL = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop';

// Timeout configuration - INCREASED for reliable DALL-E 3 generation
const IMAGE_GENERATION_TIMEOUT_MS = 90000; // 90 seconds (DALL-E 3 can take 30-60s)
const IMAGE_UPLOAD_TIMEOUT_MS = 30000; // 30 seconds (S3 upload with retries)

export class RecipeGeneratorService {
  private rateLimiter = new OpenAIRateLimiter();
  private cache = new RecipeCache();
  private metrics = new RecipeGenerationMetrics();
  private currentConstraints?: NutritionalConstraints;

  async generateAndStoreRecipes(options: GenerationOptions): Promise<GenerationResult> {
    const startTime = Date.now();
    const { jobId } = options;

    // Store nutritional constraints for validation
    this.currentConstraints = {
      maxCalories: options.maxCalories,
      minCalories: undefined, // Not in current options, but available in validator
      maxProtein: options.maxProtein,
      minProtein: options.minProtein,
      maxCarbs: options.maxCarbs,
      minCarbs: options.minCarbs,
      maxFat: options.maxFat,
      minFat: options.minFat,
      maxPrepTime: options.maxPrepTime,
    };

    try {
      // Update progress: starting
      if (jobId) {
        progressTracker.markStepComplete(jobId, 'starting');
      }

      // Update progress: generating
      if (jobId) {
        progressTracker.markStepComplete(jobId, 'generating');
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
          progressTracker.markJobFailed(jobId, "No recipes were generated");
        }
        throw new Error("No recipes were generated in the batch.");
      }

      // Update progress: validating
      if (jobId) {
        progressTracker.markStepComplete(jobId, 'validating');
      }

      const results = await Promise.allSettled(
        generatedRecipes.map((recipe, index) =>
          this.processSingleRecipe(recipe, jobId, index + 1, options.count)
        )
      );
      
      const finalResult = results.reduce<GenerationResult>(
        (acc, result) => {
          if (result.status === 'fulfilled' && result.value.success) {
            acc.success++;
          } else {
            acc.failed++;
            const reason = result.status === 'rejected' 
              ? result.reason 
              : (result.value as { error: string }).error;
            acc.errors.push(String(reason));
          }
          return acc;
        },
        { success: 0, failed: 0, errors: [] }
      );

      const totalDuration = Date.now() - startTime;
      finalResult.metrics = {
        totalDuration,
        averageTimePerRecipe: totalDuration / options.count,
      };
      this.metrics.recordGeneration(totalDuration, finalResult.success === options.count);

      return finalResult;

    } catch (error) {
      const errorMsg = `Recipe generation service failed: ${error}`;
      console.error(errorMsg);

      // Mark job as failed in progress tracker
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

  /**
   * ==========================================
   * Timeout utility methods
   * ==========================================
   */
  private async timeoutAfter(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    });
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number, fallback: T | null): Promise<T | null> {
    try {
      return await Promise.race([promise, this.timeoutAfter(ms)]);
    } catch (error) {
      if (fallback === null) {
        throw error; // Re-throw for retry logic
      }
      return fallback;
    }
  }

  /**
   * ==========================================
   * 🔒 CRITICAL FIX: Non-blocking Recipe Processing
   * Last updated: October 6, 2025
   * Issue: Recipe generation was hanging at 80% due to blocking image generation
   * Solution: Save recipes with placeholder images, generate actual images in background
   * ==========================================
   */
  private async processSingleRecipe(
    recipe: GeneratedRecipe,
    jobId?: string,
    currentIndex?: number,
    totalRecipes?: number
  ): Promise<{ success: boolean; error?: string; recipeId?: number }> {
    try {
      const validation = await this.validateRecipe(recipe);
      if (!validation.success) {
        // Record failure in progress tracker
        if (jobId) {
          progressTracker.recordFailure(jobId, validation.error || 'Validation failed', recipe.name);
        }
        return { success: false, error: validation.error };
      }

      // Update progress: storing
      if (jobId && currentIndex === 1) {
        progressTracker.markStepComplete(jobId, 'storing');
      }

      // ✅ Use placeholder image immediately - DON'T WAIT for image generation
      // This allows recipe to be saved quickly (< 5 seconds)
      const imageUrl = PLACEHOLDER_IMAGE_URL;

      // ✅ Save recipe to database FIRST
      const result = await this.storeRecipe({ ...recipe, imageUrl });

      if (result.success) {
        // Record success in progress tracker
        if (jobId) {
          progressTracker.recordSuccess(jobId, recipe.name);
        }

        // ✅ Generate actual image in BACKGROUND (fire and forget)
        if (result.recipeId) {
          this.generateImageInBackground(result.recipeId, recipe).catch(error => {
            console.error(`Background image generation failed for ${recipe.name}:`, error);
            // Don't fail the recipe - it's already saved with placeholder
          });
        }
      } else {
        // Record failure in progress tracker
        if (jobId) {
          progressTracker.recordFailure(jobId, result.error || 'Failed to store recipe', recipe.name);
        }
      }

      return result;
    } catch (error) {
      const errorMsg = `Failed to process recipe "${recipe.name}": ${error}`;
      if (jobId) {
        progressTracker.recordFailure(jobId, errorMsg, recipe.name);
      }
      return { success: false, error: errorMsg };
    }
  }

  private async validateRecipe(recipe: GeneratedRecipe): Promise<{ success: boolean; error?: string }> {
    try {
      // Step 1: Basic structural validation
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

      // Step 2: Nutritional constraint validation (if constraints are set)
      if (this.currentConstraints && Object.keys(this.currentConstraints).some(k => this.currentConstraints![k as keyof NutritionalConstraints] !== undefined)) {
        const validator = new RecipeValidator(this.currentConstraints);

        // Convert GeneratedRecipe to Recipe format for validator
        const recipeForValidation = {
          id: recipe.name, // Use name as temporary ID
          name: recipe.name,
          calories: nutrition.calories,
          protein: nutrition.protein,
          carbs: nutrition.carbs,
          fat: nutrition.fat,
          prepTime: recipe.prepTimeMinutes,
        };

        const validationResult = validator.validate(recipeForValidation);

        if (!validationResult.isValid) {
          const violationsMsg = validationResult.violations.join('; ');
          console.log(`⚠️  Recipe "${recipe.name}" failed nutritional validation: ${violationsMsg}`);
          return { success: false, error: `Nutritional constraints violated: ${violationsMsg}` };
        }
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: `Validation error: ${error}` };
    }
  }

  private async storeRecipe(
    recipe: GeneratedRecipe
  ): Promise<{ success: boolean; error?: string; recipeId?: number }> {
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

      const createdRecipe = await storage.createRecipe(recipeData);
      return { success: true, recipeId: Number(createdRecipe.id) };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: `Failed to store recipe "${recipe.name}": ${message}` };
    }
  }

  private async getOrGenerateImage(recipe: GeneratedRecipe): Promise<string> {
    const cacheKey = `image_s3_${recipe.name.replace(/\s/g, '_')}`;

    return await this.cache.getOrSet(cacheKey, async () => {
      console.log(`🎨 Starting DALL-E 3 image generation for "${recipe.name}"...`);

      // Generate temp URL from OpenAI DALL-E 3
      const tempUrl = await generateImageForRecipe(recipe);
      console.log(`✅ DALL-E 3 image generated for "${recipe.name}": ${tempUrl.substring(0, 50)}...`);

      if (!tempUrl) {
        throw new Error('No image URL returned from DALL-E 3');
      }

      // Upload to S3
      console.log(`☁️  Uploading image to S3 for "${recipe.name}"...`);
      const permanentUrl = await uploadImageToS3(tempUrl, recipe.name);
      console.log(`✅ Image uploaded to S3 for "${recipe.name}": ${permanentUrl.substring(0, 50)}...`);

      if (!permanentUrl) {
        throw new Error('S3 upload failed - no URL returned');
      }

      return permanentUrl;
    });
  }

  private async generateImageInBackground(recipeId: number, recipe: GeneratedRecipe): Promise<void> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`⏳ Generating image for "${recipe.name}" (ID: ${recipeId}) - Attempt ${attempt}/${maxRetries}...`);

        // Generate image with extended timeout
        const imageUrl = await this.withTimeout(
          this.getOrGenerateImage(recipe),
          IMAGE_GENERATION_TIMEOUT_MS + IMAGE_UPLOAD_TIMEOUT_MS,
          null // Don't use fallback - we want to catch timeout
        );

        // Only update if we got a real image (not placeholder or null)
        if (imageUrl && imageUrl !== PLACEHOLDER_IMAGE_URL) {
          await storage.updateRecipe(String(recipeId), { imageUrl });
          console.log(`✅ Background image generated successfully for "${recipe.name}" on attempt ${attempt}`);
          return; // Success - exit retry loop
        } else if (imageUrl === PLACEHOLDER_IMAGE_URL) {
          console.log(`⚠️  Placeholder returned for "${recipe.name}" - will retry (${attempt}/${maxRetries})`);
          throw new Error('Placeholder image returned instead of generated image');
        } else {
          console.log(`⚠️  No image URL returned for "${recipe.name}" - will retry (${attempt}/${maxRetries})`);
          throw new Error('No image URL returned from generation');
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`❌ Attempt ${attempt}/${maxRetries} failed for "${recipe.name}":`, lastError.message);

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // 1s, 2s, 4s (max 10s)
          console.log(`⏸️  Waiting ${backoffMs}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }
    }

    // All retries failed
    console.error(`❌ All ${maxRetries} attempts failed for "${recipe.name}". Final error:`, lastError?.message);
    console.error(`⚠️  Recipe ${recipeId} will keep placeholder image.`);
  }

  getMetrics() {
    return this.metrics.getMetrics();
  }

  resetMetrics() {
    this.metrics.reset();
  }
}

export const recipeGenerator = new RecipeGeneratorService();