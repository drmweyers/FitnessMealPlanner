import { vi } from 'vitest';
import type { GeneratedRecipe } from '../../../../server/services/openai';

// Mock recipe data
const mockValidRecipe: GeneratedRecipe = {
  name: 'Test Recipe',
  description: 'A test recipe',
  mealTypes: ['Dinner'],
  dietaryTags: ['Vegetarian'],
  mainIngredientTags: ['Tofu'],
  ingredients: [
    { name: 'Tofu', amount: 200, unit: 'g' },
    { name: 'Soy Sauce', amount: 2, unit: 'tbsp' }
  ],
  instructions: 'Cook the tofu with soy sauce.',
  prepTimeMinutes: 15,
  cookTimeMinutes: 20,
  servings: 2,
  estimatedNutrition: {
    calories: 300,
    protein: 25,
    carbs: 10,
    fat: 15
  },
  imageUrl: ''
};

export const generateRecipeBatch = vi.fn().mockImplementation(async (count: number) => {
  const recipes = [];
  for (let i = 0; i < count; i++) {
    recipes.push({
      ...mockValidRecipe,
      name: `Test Recipe ${i + 1}`
    });
  }
  return recipes;
});

export const generateImageForRecipe = vi.fn().mockResolvedValue('https://example.com/image.jpg');

export const parseNaturalLanguageMealPlan = vi.fn().mockResolvedValue({
  dailyCalories: 2000,
  mealsPerDay: 3,
  daysPerWeek: 7,
  dietaryRestrictions: [],
  cuisinePreferences: [],
  fitnessGoals: 'General Health'
});

export const parseNaturalLanguageForMealPlan = parseNaturalLanguageMealPlan;

export const parseNaturalLanguageRecipeRequirements = vi.fn().mockResolvedValue({
  mealTypes: ['Dinner'],
  dietaryRestrictions: [],
  targetCalories: 500,
  mainIngredient: 'Chicken'
});

export const generateMealImage = vi.fn().mockResolvedValue('https://example.com/meal-image.jpg');

export const parseAndValidateJSON = vi.fn().mockImplementation((json: string) => {
  return JSON.parse(json);
});

export const enhancedGenerateRecipeBatch = vi.fn().mockImplementation(async (count: number) => {
  return generateRecipeBatch(count);
});

export interface GeneratedRecipe {
  name: string;
  description: string;
  mealTypes: string[];
  dietaryTags: string[];
  mainIngredientTags: string[];
  ingredients: { name: string; amount: number; unit: string }[];
  instructions: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  estimatedNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  imageUrl: string;
}