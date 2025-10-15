import { storage } from "../storage";
import { generateRecipeBatch, generateImageForRecipe, type GeneratedRecipe } from "./openai";
import type { InsertRecipe } from "@shared/schema";
import { OpenAIRateLimiter } from "./utils/RateLimiter";
import { RecipeCache } from "./utils/RecipeCache";
import { RecipeGenerationMetrics } from "./utils/Metrics";
import { uploadImageToS3 } from "./utils/S3Uploader";

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

// Timeout configuration
const IMAGE_GENERATION_TIMEOUT_MS = 30000; // 30 seconds
const IMAGE_UPLOAD_TIMEOUT_MS = 15000; // 15 seconds

export class RecipeGeneratorService {
  private rateLimiter = new OpenAIRateLimiter();
  private cache = new RecipeCache();
  private metrics = new RecipeGenerationMetrics();

  async generateAndStoreRecipes(options: GenerationOptions): Promise<GenerationResult> {
    const startTime = Date.now();
    try {
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
        throw new Error("No recipes were generated in the batch.");
      }

      const results = await Promise.allSettled(
        generatedRecipes.map(recipe => this.processSingleRecipe(recipe))
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

  private async withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
    try {
      return await Promise.race([promise, this.timeoutAfter(ms)]);
    } catch {
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
  private async processSingleRecipe(recipe: GeneratedRecipe): Promise<{ success: boolean; error?: string; recipeId?: number }> {
    const validation = await this.validateRecipe(recipe);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    // ✅ Use placeholder image immediately - DON'T WAIT for image generation
    // This allows recipe to be saved quickly (< 5 seconds)
    const imageUrl = PLACEHOLDER_IMAGE_URL;

    // ✅ Save recipe to database FIRST
    const result = await this.storeRecipe({ ...recipe, imageUrl });

    // ✅ Generate actual image in BACKGROUND (fire and forget)
    if (result.success && result.recipeId) {
      this.generateImageInBackground(result.recipeId, recipe).catch(error => {
        console.error(`Background image generation failed for ${recipe.name}:`, error);
        // Don't fail the recipe - it's already saved with placeholder
      });
    }

    return result;
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

    try {
      return await this.cache.getOrSet(cacheKey, async () => {
        // Generate temp URL with timeout
        const tempUrl = await this.withTimeout(
          generateImageForRecipe(recipe),
          IMAGE_GENERATION_TIMEOUT_MS,
          null
        );

        if (!tempUrl) {
          console.log(`⚠️  Image generation timeout/failed for "${recipe.name}"`);
          return PLACEHOLDER_IMAGE_URL;
        }

        // Upload to S3 with timeout
        const permanentUrl = await this.withTimeout(
          uploadImageToS3(tempUrl, recipe.name),
          IMAGE_UPLOAD_TIMEOUT_MS,
          PLACEHOLDER_IMAGE_URL
        );

        return permanentUrl || PLACEHOLDER_IMAGE_URL;
      });
    } catch (error) {
      console.error(`Failed to generate/upload image for "${recipe.name}":`, error);
      return PLACEHOLDER_IMAGE_URL;
    }
  }

  private async generateImageInBackground(recipeId: number, recipe: GeneratedRecipe): Promise<void> {
    try {
      console.log(`⏳ Generating image in background for "${recipe.name}" (ID: ${recipeId})...`);

      // Generate image with timeout
      const imageUrl = await this.withTimeout(
        this.getOrGenerateImage(recipe),
        IMAGE_GENERATION_TIMEOUT_MS + IMAGE_UPLOAD_TIMEOUT_MS,
        PLACEHOLDER_IMAGE_URL
      );

      // Only update if we got a real image (not placeholder)
      if (imageUrl && imageUrl !== PLACEHOLDER_IMAGE_URL) {
        await storage.updateRecipe(String(recipeId), { imageUrl });
        console.log(`✅ Background image generated for "${recipe.name}"`);
      } else {
        console.log(`ℹ️  Using placeholder image for "${recipe.name}"`);
      }
    } catch (error) {
      console.error(`❌ Background image generation error for "${recipe.name}":`, error);
      // Don't throw - recipe is already saved
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