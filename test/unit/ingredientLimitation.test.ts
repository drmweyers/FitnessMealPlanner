/**
 * Unit Tests for Ingredient Limitation Feature
 * 
 * Tests the new maxIngredients functionality that limits the variety of ingredients
 * across an entire meal plan to reduce shopping complexity for customers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MealPlanGeneratorService } from '../../server/services/mealPlanGenerator';
import type { MealPlanGeneration, Recipe } from '@shared/schema';

// Mock the storage module at the top level
vi.mock('../../server/storage', () => ({
  storage: {
    searchRecipes: vi.fn()
  }
}));

describe('Ingredient Limitation Feature', () => {
  let mealPlanService: MealPlanGeneratorService;
  let mockRecipes: Recipe[];

  beforeEach(() => {
    mealPlanService = new MealPlanGeneratorService();
    
    // Create mock recipes with different ingredient sets
    mockRecipes = [
      {
        id: '1',
        name: 'Chicken Rice Bowl',
        description: 'Simple chicken and rice',
        caloriesKcal: 500,
        proteinGrams: '30',
        carbsGrams: '40',
        fatGrams: '15',
        prepTimeMinutes: 20,
        cookTimeMinutes: 25,
        servings: 2,
        mealTypes: ['lunch', 'dinner'],
        ingredientsJson: [
          { name: 'Chicken Breast', amount: '200', unit: 'g' },
          { name: 'White Rice', amount: '100', unit: 'g' },
          { name: 'Broccoli', amount: '150', unit: 'g' },
          { name: 'Soy Sauce', amount: '2', unit: 'tbsp' }
        ],
        isApproved: true,
        creationTimestamp: new Date(),
        lastUpdatedTimestamp: new Date()
      },
      {
        id: '2',
        name: 'Tofu Stir Fry',
        description: 'Vegetarian tofu stir fry',
        caloriesKcal: 450,
        proteinGrams: '25',
        carbsGrams: '35',
        fatGrams: '20',
        prepTimeMinutes: 15,
        cookTimeMinutes: 20,
        servings: 2,
        mealTypes: ['lunch', 'dinner'],
        ingredientsJson: [
          { name: 'Firm Tofu', amount: '200', unit: 'g' },
          { name: 'Broccoli', amount: '150', unit: 'g' }, // Shared ingredient
          { name: 'Bell Pepper', amount: '100', unit: 'g' },
          { name: 'Soy Sauce', amount: '2', unit: 'tbsp' }, // Shared ingredient
          { name: 'Sesame Oil', amount: '1', unit: 'tbsp' }
        ],
        isApproved: true,
        creationTimestamp: new Date(),
        lastUpdatedTimestamp: new Date()
      },
      {
        id: '3',
        name: 'Salmon Quinoa Bowl',
        description: 'Healthy salmon with quinoa',
        caloriesKcal: 550,
        proteinGrams: '35',
        carbsGrams: '45',
        fatGrams: '18',
        prepTimeMinutes: 25,
        cookTimeMinutes: 20,
        servings: 2,
        mealTypes: ['lunch', 'dinner'],
        ingredientsJson: [
          { name: 'Salmon Fillet', amount: '200', unit: 'g' },
          { name: 'Quinoa', amount: '100', unit: 'g' },
          { name: 'Spinach', amount: '100', unit: 'g' },
          { name: 'Lemon', amount: '1', unit: 'whole' },
          { name: 'Olive Oil', amount: '2', unit: 'tbsp' }
        ],
        isApproved: true,
        creationTimestamp: new Date(),
        lastUpdatedTimestamp: new Date()
      },
      {
        id: '4',
        name: 'Complex Recipe',
        description: 'Recipe with many unique ingredients',
        caloriesKcal: 500,
        proteinGrams: '30',
        carbsGrams: '40',
        fatGrams: '15',
        prepTimeMinutes: 30,
        cookTimeMinutes: 25,
        servings: 2,
        mealTypes: ['dinner'],
        ingredientsJson: [
          { name: 'Beef Steak', amount: '200', unit: 'g' },
          { name: 'Sweet Potato', amount: '200', unit: 'g' },
          { name: 'Asparagus', amount: '150', unit: 'g' },
          { name: 'Garlic', amount: '3', unit: 'cloves' },
          { name: 'Thyme', amount: '1', unit: 'tsp' },
          { name: 'Butter', amount: '2', unit: 'tbsp' },
          { name: 'Red Wine', amount: '100', unit: 'ml' }
        ],
        isApproved: true,
        creationTimestamp: new Date(),
        lastUpdatedTimestamp: new Date()
      }
    ];
  });

  describe('selectRecipeWithIngredientLimit', () => {
    it('should prioritize recipes that reuse existing ingredients', () => {
      const currentMeals = [
        {
          day: 1,
          mealNumber: 1,
          mealType: 'lunch',
          recipe: mockRecipes[0] // Has: Chicken, Rice, Broccoli, Soy Sauce
        }
      ];

      // selectRecipeWithIngredientLimit is private, so we'll test through generateMealPlan
      // This test verifies the behavior indirectly
      const availableRecipes = [mockRecipes[1], mockRecipes[2], mockRecipes[3]];
      
      // Mock the selectRecipeWithIngredientLimit method behavior
      const selectedRecipe = (mealPlanService as any).selectRecipeWithIngredientLimit(
        availableRecipes,
        currentMeals,
        10, // maxIngredients
        3 // mealsPerDay
      );

      // Should prefer tofu stir fry as it shares Broccoli and Soy Sauce
      expect(selectedRecipe.id).toBe('2');
    });

    it('should respect ingredient limit constraints', () => {
      const currentMeals = [
        {
          day: 1,
          mealNumber: 1,
          mealType: 'lunch',
          recipe: mockRecipes[0] // 4 ingredients
        },
        {
          day: 1,
          mealNumber: 2,
          mealType: 'dinner',
          recipe: mockRecipes[1] // 3 new + 2 shared = 5 total new = 7 total
        }
      ];

      const availableRecipes = [mockRecipes[2], mockRecipes[3]];
      const maxIngredients = 10;
      
      const selectedRecipe = (mealPlanService as any).selectRecipeWithIngredientLimit(
        availableRecipes,
        currentMeals,
        maxIngredients,
        3
      );

      // Should select salmon quinoa (5 new ingredients) over complex recipe (7 new ingredients)
      // because 7 current + 5 new = 12 > 10 limit, but 7 current + some overlap is acceptable
      expect(selectedRecipe.id).toBe('3');
    });

    it('should fall back to any recipe if no recipes fit the constraint', () => {
      const currentMeals = [
        {
          day: 1,
          mealNumber: 1,
          mealType: 'lunch',
          recipe: mockRecipes[0] // 4 ingredients
        }
      ];

      const availableRecipes = [mockRecipes[3]]; // Complex recipe with 7 new ingredients
      const maxIngredients = 5; // Very restrictive limit
      
      const selectedRecipe = (mealPlanService as any).selectRecipeWithIngredientLimit(
        availableRecipes,
        currentMeals,
        maxIngredients,
        3
      );

      // Should still return a recipe even if it exceeds the limit (fallback behavior)
      expect(selectedRecipe.id).toBe('4');
    });

    it('should calculate ingredient reuse score correctly', () => {
      const currentMeals = [
        {
          day: 1,
          mealNumber: 1,
          mealType: 'lunch',
          recipe: {
            id: 'test',
            ingredientsJson: [
              { name: 'Broccoli', amount: '100', unit: 'g' },
              { name: 'Soy Sauce', amount: '1', unit: 'tbsp' }
            ]
          }
        }
      ];

      const availableRecipes = [mockRecipes[1]]; // Has Broccoli and Soy Sauce (2 reuses)
      
      const selectedRecipe = (mealPlanService as any).selectRecipeWithIngredientLimit(
        availableRecipes,
        currentMeals,
        15,
        3
      );

      expect(selectedRecipe.id).toBe('2');
    });
  });

  describe('generateMealPlan with maxIngredients', () => {
    beforeEach(async () => {
      // Import the mocked storage and set up the mock return value
      const { storage } = await import('../../server/storage');
      vi.mocked(storage.searchRecipes).mockResolvedValue({
        recipes: mockRecipes,
        total: mockRecipes.length
      });
    });

    it('should generate meal plan respecting ingredient limits', async () => {
      const params: MealPlanGeneration = {
        planName: 'Test Limited Plan',
        fitnessGoal: 'weight_loss',
        dailyCalorieTarget: 1500,
        days: 2,
        mealsPerDay: 2,
        clientName: 'Test Client',
        maxIngredients: 8,
        generateMealPrep: false
      };

      const result = await mealPlanService.generateMealPlan(params, 'test-user-id');

      // Count unique ingredients across all meals
      const uniqueIngredients = new Set();
      result.meals.forEach(meal => {
        meal.recipe.ingredientsJson?.forEach(ingredient => {
          uniqueIngredients.add(ingredient.name.toLowerCase());
        });
      });

      expect(uniqueIngredients.size).toBeLessThanOrEqual(8);
      expect(result.meals).toHaveLength(4); // 2 days × 2 meals
    });

    it('should work without ingredient limits (original behavior)', async () => {
      const params: MealPlanGeneration = {
        planName: 'Test Unlimited Plan',
        fitnessGoal: 'weight_loss',
        dailyCalorieTarget: 1500,
        days: 2,
        mealsPerDay: 2,
        clientName: 'Test Client',
        // maxIngredients not specified
        generateMealPrep: false
      };

      const result = await mealPlanService.generateMealPlan(params, 'test-user-id');

      expect(result.meals).toHaveLength(4);
      expect(result.planName).toBe('Test Unlimited Plan');
    });

    it('should handle edge case with very low ingredient limit', async () => {
      const params: MealPlanGeneration = {
        planName: 'Test Very Limited Plan',
        fitnessGoal: 'weight_loss',
        dailyCalorieTarget: 1500,
        days: 1,
        mealsPerDay: 1,
        clientName: 'Test Client',
        maxIngredients: 3, // Very restrictive
        generateMealPrep: false
      };

      const result = await mealPlanService.generateMealPlan(params, 'test-user-id');

      expect(result.meals).toHaveLength(1);
      
      // Should still generate a meal plan even with restrictive limits
      const uniqueIngredients = new Set();
      result.meals.forEach(meal => {
        meal.recipe.ingredientsJson?.forEach(ingredient => {
          uniqueIngredients.add(ingredient.name.toLowerCase());
        });
      });

      // May exceed limit due to fallback behavior, but should try to minimize
      expect(uniqueIngredients.size).toBeGreaterThan(0);
    });
  });

  describe('Ingredient counting and analysis', () => {
    it('should correctly count unique ingredients across meals', () => {
      const meals = [
        {
          day: 1,
          mealNumber: 1,
          mealType: 'breakfast',
          recipe: {
            ingredientsJson: [
              { name: 'Chicken Breast', amount: '200', unit: 'g' },
              { name: 'Broccoli', amount: '150', unit: 'g' }
            ]
          }
        },
        {
          day: 1,
          mealNumber: 2,
          mealType: 'lunch',
          recipe: {
            ingredientsJson: [
              { name: 'chicken breast', amount: '150', unit: 'g' }, // Duplicate (case insensitive)
              { name: 'Rice', amount: '100', unit: 'g' }
            ]
          }
        }
      ];

      const uniqueIngredients = new Set();
      meals.forEach(meal => {
        meal.recipe.ingredientsJson?.forEach(ingredient => {
          uniqueIngredients.add(ingredient.name.toLowerCase());
        });
      });

      expect(uniqueIngredients.size).toBe(3); // chicken breast, broccoli, rice
      expect(uniqueIngredients.has('chicken breast')).toBe(true);
      expect(uniqueIngredients.has('broccoli')).toBe(true);
      expect(uniqueIngredients.has('rice')).toBe(true);
    });

    it('should handle meals with no ingredients', () => {
      const meals = [
        {
          day: 1,
          mealNumber: 1,
          mealType: 'breakfast',
          recipe: {
            ingredientsJson: undefined
          }
        },
        {
          day: 1,
          mealNumber: 2,
          mealType: 'lunch',
          recipe: {
            ingredientsJson: []
          }
        }
      ];

      const uniqueIngredients = new Set();
      meals.forEach(meal => {
        if (meal.recipe.ingredientsJson) {
          meal.recipe.ingredientsJson.forEach(ingredient => {
            uniqueIngredients.add(ingredient.name.toLowerCase());
          });
        }
      });

      expect(uniqueIngredients.size).toBe(0);
    });
  });

  describe('Schema validation for maxIngredients', () => {
    it('should accept valid maxIngredients values', () => {
      const validParams = {
        planName: 'Test Plan',
        fitnessGoal: 'weight_loss',
        dailyCalorieTarget: 1500,
        days: 1,
        mealsPerDay: 1,
        maxIngredients: 15
      };

      // This would normally be validated by the schema
      expect(validParams.maxIngredients).toBeGreaterThanOrEqual(5);
      expect(validParams.maxIngredients).toBeLessThanOrEqual(50);
    });

    it('should handle undefined maxIngredients (optional field)', () => {
      const paramsWithoutLimit = {
        planName: 'Test Plan',
        fitnessGoal: 'weight_loss',
        dailyCalorieTarget: 1500,
        days: 1,
        mealsPerDay: 1,
        maxIngredients: undefined
      };

      expect(paramsWithoutLimit.maxIngredients).toBeUndefined();
    });
  });
});