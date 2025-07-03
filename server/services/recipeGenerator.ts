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

  private async processSingleRecipe(recipe: GeneratedRecipe): Promise<{ success: boolean; error?: string }> {
    const validation = await this.validateRecipe(recipe);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    const imageUrl = await this.getOrGenerateImage(recipe);
    if (!imageUrl) {
      return { success: false, error: `Image generation failed for recipe: ${recipe.name}` };
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