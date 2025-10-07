import { recipeGenerator } from './recipeGenerator';
import type { Recipe } from '../../shared/schema';

interface RecipeGenerationParams {
  prompt?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  mealType?: string;
  dietaryRestrictions?: string[];
  model?: string;
}

export class EnhancedRecipeGenerator {
  private maxRetries = 3;
  private retryDelay = 1000; // Start with 1 second
  private timeout = 30000; // 30 second timeout
  
  /**
   * Generate recipe with automatic retry on failure
   */
  async generateWithRetry(params: RecipeGenerationParams): Promise<Recipe> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`[Recipe Generation] Attempt ${attempt}/${this.maxRetries}`);
        
        // Add timeout wrapper
        const recipe = await Promise.race([
          this.generateRecipe(params),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Generation timeout')), this.timeout)
          )
        ]);
        
        console.log(`[Recipe Generation] Success on attempt ${attempt}`);
        return recipe;
        
      } catch (error) {
        lastError = error as Error;
        console.error(`[Recipe Generation] Attempt ${attempt} failed:`, error);
        
        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          throw error;
        }
        
        // Wait before retry with exponential backoff
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          console.log(`[Recipe Generation] Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`Recipe generation failed after ${this.maxRetries} attempts: ${lastError!.message}`);
  }
  
  /**
   * Determine if an error should trigger a retry
   */
  private isRetryableError(error: any): boolean {
    // Retry on network errors or rate limits
    const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'];
    const retryableMessages = ['rate_limit', 'timeout', '429', '503', '502', 'network'];
    
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code || '';
    
    return retryableCodes.includes(errorCode) ||
           retryableMessages.some(msg => errorMessage.includes(msg));
  }
  
  /**
   * Generate with fallback to simpler model if needed
   */
  async generateWithFallback(params: RecipeGenerationParams): Promise<Recipe> {
    try {
      // Try with GPT-4 first (if not specified)
      const primaryParams = { ...params };
      if (!primaryParams.model) {
        primaryParams.model = 'gpt-4';
      }
      
      return await this.generateWithRetry(primaryParams);
    } catch (error) {
      console.warn('[Recipe Generation] Primary model failed, falling back to GPT-3.5-turbo');
      
      // Fallback to GPT-3.5-turbo for cost savings
      return await this.generateWithRetry({ 
        ...params, 
        model: 'gpt-3.5-turbo-1106' 
      });
    }
  }
  
  /**
   * Generate a recipe using the existing recipe generator
   * This wraps the existing functionality
   */
  private async generateRecipe(params: RecipeGenerationParams): Promise<Recipe> {
    // Build the prompt for the existing generator
    let prompt = params.prompt || 'Generate a healthy recipe';
    
    if (params.calories) {
      prompt += ` with approximately ${params.calories} calories`;
    }
    if (params.protein) {
      prompt += `, ${params.protein}g protein`;
    }
    if (params.carbs) {
      prompt += `, ${params.carbs}g carbs`;
    }
    if (params.fat) {
      prompt += `, ${params.fat}g fat`;
    }
    if (params.mealType) {
      prompt += ` for ${params.mealType}`;
    }
    if (params.dietaryRestrictions?.length) {
      prompt += `. Dietary restrictions: ${params.dietaryRestrictions.join(', ')}`;
    }
    
    // Use the existing recipe generator
    const recipe = await recipeGenerator.generateRecipe(prompt);
    
    if (!recipe) {
      throw new Error('Failed to generate recipe');
    }
    
    return recipe;
  }
  
  /**
   * Generate multiple recipes in batch with progress tracking
   */
  async generateBatch(
    count: number, 
    params: RecipeGenerationParams,
    onProgress?: (current: number, total: number) => void
  ): Promise<Recipe[]> {
    const recipes: Recipe[] = [];
    const errors: Error[] = [];
    
    for (let i = 0; i < count; i++) {
      try {
        console.log(`[Batch Generation] Generating recipe ${i + 1}/${count}`);
        
        // Add variety to prompts
        const batchParams = this.varyParams(params, i);
        const recipe = await this.generateWithFallback(batchParams);
        
        recipes.push(recipe);
        
        if (onProgress) {
          onProgress(i + 1, count);
        }
        
        // Add delay between requests to avoid rate limits
        if (i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`[Batch Generation] Failed to generate recipe ${i + 1}:`, error);
        errors.push(error as Error);
      }
    }
    
    if (recipes.length === 0) {
      throw new Error(`Batch generation failed completely: ${errors[0]?.message}`);
    }
    
    console.log(`[Batch Generation] Generated ${recipes.length}/${count} recipes`);
    return recipes;
  }
  
  /**
   * Add variety to batch generation parameters
   */
  private varyParams(baseParams: RecipeGenerationParams, index: number): RecipeGenerationParams {
    const variations = [
      'quick and easy',
      'gourmet style',
      'family-friendly',
      'meal prep friendly',
      'budget-conscious',
      'restaurant-quality',
      'traditional',
      'fusion',
      'seasonal',
      'comfort food'
    ];
    
    const varied = { ...baseParams };
    
    // Add a variation modifier to the prompt
    const variation = variations[index % variations.length];
    if (varied.prompt) {
      varied.prompt = `${variation} ${varied.prompt}`;
    } else {
      varied.prompt = `Generate a ${variation} healthy recipe`;
    }
    
    // Slightly vary nutritional targets (±10%)
    if (varied.calories) {
      const variance = Math.floor(varied.calories * 0.1);
      varied.calories += Math.floor(Math.random() * variance * 2 - variance);
    }
    
    return varied;
  }
}

// Export singleton instance for backward compatibility
export const enhancedRecipeGenerator = new EnhancedRecipeGenerator();