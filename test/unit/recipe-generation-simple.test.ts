import { describe, it, expect } from 'vitest';
import { generateRecipeBatch } from '../../server/services/openai';

describe('Recipe Generation - Core Logic', () => {
  it('should generate recipes with AI', async () => {
    const recipes = await generateRecipeBatch(3, {
      mealTypes: ['breakfast'],
      dietaryRestrictions: ['vegetarian'],
      targetCalories: 400,
    });

    expect(recipes).toBeDefined();
    expect(Array.isArray(recipes)).toBe(true);
    expect(recipes.length).toBeGreaterThan(0);

    const recipe = recipes[0];
    expect(recipe).toHaveProperty('name');
    expect(recipe).toHaveProperty('ingredients');
    expect(recipe).toHaveProperty('instructions');
    expect(recipe).toHaveProperty('estimatedNutrition');
    expect(recipe.estimatedNutrition).toHaveProperty('calories');

    console.log(`✅ Generated ${recipes.length} recipes`);
    console.log(`📋 Sample recipe: ${recipe.name}`);
    console.log(`🥗 Ingredients: ${recipe.ingredients.length} items`);
    console.log(`🔥 Calories: ${recipe.estimatedNutrition.calories} kcal`);
  }, 60000); // 60 second timeout for AI
});
