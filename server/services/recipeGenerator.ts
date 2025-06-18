import { storage } from "../storage";
import { generateRecipeBatch, type GeneratedRecipe } from "./openai";
import type { InsertRecipe } from "@shared/schema";

export class RecipeGeneratorService {
  async generateAndStoreRecipes(count: number = 50): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let success = 0;
    let failed = 0;

    try {
      console.log(`Starting recipe generation for ${count} recipes...`);
      
      // Generate recipes in batches to avoid overwhelming the API
      const batchSize = 10;
      const batches = Math.ceil(count / batchSize);
      
      for (let batch = 0; batch < batches; batch++) {
        const batchCount = Math.min(batchSize, count - (batch * batchSize));
        console.log(`Processing batch ${batch + 1}/${batches} (${batchCount} recipes)`);
        
        try {
          const generatedRecipes = await generateRecipeBatch(batchCount, {
            mealTypes: ['breakfast', 'lunch', 'dinner', 'snack'],
            dietaryRestrictions: ['vegetarian', 'vegan', 'keto', 'paleo', 'gluten-free'],
          });

          // Store each recipe in the database
          for (const generatedRecipe of generatedRecipes) {
            try {
              const recipeData: InsertRecipe = {
                name: generatedRecipe.name,
                description: generatedRecipe.description,
                mealTypes: generatedRecipe.mealTypes,
                dietaryTags: generatedRecipe.dietaryTags,
                mainIngredientTags: generatedRecipe.mainIngredientTags,
                ingredientsJson: generatedRecipe.ingredients,
                instructionsText: generatedRecipe.instructions,
                prepTimeMinutes: generatedRecipe.prepTimeMinutes,
                cookTimeMinutes: generatedRecipe.cookTimeMinutes,
                servings: generatedRecipe.servings,
                caloriesKcal: generatedRecipe.estimatedNutrition.calories,
                proteinGrams: generatedRecipe.estimatedNutrition.protein.toString(),
                carbsGrams: generatedRecipe.estimatedNutrition.carbs.toString(),
                fatGrams: generatedRecipe.estimatedNutrition.fat.toString(),
                imageUrl: this.getPlaceholderImageUrl(generatedRecipe.mealTypes[0]),
                sourceReference: 'AI Generated',
                isApproved: false,
              };

              await storage.createRecipe(recipeData);
              success++;
              console.log(`Stored recipe: ${generatedRecipe.name}`);
            } catch (error) {
              const errorMsg = `Failed to store recipe "${generatedRecipe.name}": ${error}`;
              console.error(errorMsg);
              errors.push(errorMsg);
              failed++;
            }
          }
        } catch (error) {
          const errorMsg = `Failed to generate batch ${batch + 1}: ${error}`;
          console.error(errorMsg);
          errors.push(errorMsg);
          failed += batchCount;
        }

        // Longer delay between batches
        if (batch < batches - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      console.log(`Recipe generation completed. Success: ${success}, Failed: ${failed}`);
      
      return { success, failed, errors };
    } catch (error) {
      const errorMsg = `Recipe generation service failed: ${error}`;
      console.error(errorMsg);
      errors.push(errorMsg);
      return { success, failed, errors };
    }
  }

  private getPlaceholderImageUrl(mealType: string): string {
    // Return placeholder images based on meal type
    const placeholders = {
      breakfast: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250',
      lunch: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250',
      dinner: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250',
      snack: 'https://images.unsplash.com/photo-1610970881699-44a5587cabec?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250',
    };
    
    return placeholders[mealType as keyof typeof placeholders] || placeholders.dinner;
  }
}

export const recipeGenerator = new RecipeGeneratorService();
