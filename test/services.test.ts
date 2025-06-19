import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mealPlanGenerator } from '../server/services/mealPlanGenerator';
import { recipeGenerator } from '../server/services/recipeGenerator';
import type { MealPlanGeneration } from '../shared/schema';

// Mock the storage
vi.mock('../server/storage', () => ({
  storage: {
    searchRecipes: vi.fn(),
    createRecipe: vi.fn(),
  },
}));

// Mock OpenAI service
vi.mock('../server/services/openai', () => ({
  generateRecipeBatch: vi.fn(),
  generateRecipe: vi.fn(),
  generateMealImage: vi.fn().mockResolvedValue('https://example.com/image.jpg'),
}));

describe('MealPlanGenerator Service', () => {
  const mockRecipes = [
    {
      id: '1',
      name: 'Greek Yogurt Bowl',
      mealTypes: ['breakfast'],
      caloriesKcal: 250,
      proteinGrams: '15.0',
      carbsGrams: '20.0',
      fatGrams: '8.0',
      prepTimeMinutes: 5,
      cookTimeMinutes: 0,
      servings: 1,
      isApproved: true,
    },
    {
      id: '2', 
      name: 'Grilled Chicken Salad',
      mealTypes: ['lunch'],
      caloriesKcal: 350,
      proteinGrams: '30.0',
      carbsGrams: '15.0',
      fatGrams: '18.0',
      prepTimeMinutes: 15,
      cookTimeMinutes: 10,
      servings: 1,
      isApproved: true,
    },
    {
      id: '3',
      name: 'Salmon with Vegetables',
      mealTypes: ['dinner'],
      caloriesKcal: 400,
      proteinGrams: '35.0',
      carbsGrams: '20.0',
      fatGrams: '22.0',
      prepTimeMinutes: 10,
      cookTimeMinutes: 20,
      servings: 1,
      isApproved: true,
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate a basic meal plan', async () => {
    const mockStorage = await import('../server/storage');
    vi.mocked(mockStorage.storage.searchRecipes).mockResolvedValue({
      recipes: mockRecipes,
      total: mockRecipes.length,
    });

    const params: MealPlanGeneration = {
      planName: 'Test Plan',
      days: 3,
      mealsPerDay: 3,
      targetCalories: 2000,
      clientName: 'Test Client',
    };

    const result = await mealPlanGenerator.generateMealPlan(params);

    expect(result.mealPlan).toBeDefined();
    expect(result.mealPlan.planName).toBe('Test Plan');
    expect(result.mealPlan.days).toBe(3);
    expect(result.mealPlan.mealsPerDay).toBe(3);
    expect(result.mealPlan.clientName).toBe('Test Client');
    expect(result.mealPlan.meals).toHaveLength(9); // 3 days * 3 meals
    expect(result.nutrition).toBeDefined();
    expect(result.nutrition.total).toBeDefined();
    expect(result.nutrition.averageDaily).toBeDefined();
    expect(result.nutrition.daily).toHaveLength(3);
  });

  it('should respect dietary preferences', async () => {
    const mockStorage = await import('../server/storage');
    const vegetarianRecipes = mockRecipes.map(r => ({
      ...r,
      dietaryTags: ['vegetarian'],
    }));

    vi.mocked(mockStorage.storage.searchRecipes).mockResolvedValue({
      recipes: vegetarianRecipes,
      total: vegetarianRecipes.length,
    });

    const params: MealPlanGeneration = {
      planName: 'Vegetarian Plan',
      days: 2,
      mealsPerDay: 2,
      targetCalories: 1800,
      clientName: 'Veggie Client',
      dietaryPreferences: ['vegetarian'],
    };

    const result = await mealPlanGenerator.generateMealPlan(params);

    expect(result.mealPlan.meals).toHaveLength(4);
    // Should call searchRecipes with vegetarian filter
    expect(mockStorage.storage.searchRecipes).toHaveBeenCalledWith(
      expect.objectContaining({
        dietaryTag: 'vegetarian',
      })
    );
  });

  it('should calculate nutrition correctly', () => {
    const testMealPlan = {
      planName: 'Test',
      days: 2,
      mealsPerDay: 2,
      clientName: 'Test',
      meals: [
        { day: 1, mealNumber: 1, recipe: mockRecipes[0] },
        { day: 1, mealNumber: 2, recipe: mockRecipes[1] },
        { day: 2, mealNumber: 1, recipe: mockRecipes[0] },
        { day: 2, mealNumber: 2, recipe: mockRecipes[2] },
      ],
    };

    const nutrition = mealPlanGenerator.calculateMealPlanNutrition(testMealPlan);

    expect(nutrition.total.calories).toBe(1250); // 250 + 350 + 250 + 400
    expect(nutrition.total.protein).toBe(95); // 15 + 30 + 15 + 35
    expect(nutrition.averageDaily.calories).toBe(625); // 1250 / 2 days
    expect(nutrition.daily).toHaveLength(2);
    expect(nutrition.daily[0].calories).toBe(600); // Day 1: 250 + 350
    expect(nutrition.daily[1].calories).toBe(650); // Day 2: 250 + 400
  });

  it('should handle insufficient recipes gracefully', async () => {
    const mockStorage = await import('../server/storage');
    vi.mocked(mockStorage.storage.searchRecipes).mockResolvedValue({
      recipes: [],
      total: 0,
    });

    const params: MealPlanGeneration = {
      planName: 'Empty Plan',
      days: 7,
      mealsPerDay: 3,
      targetCalories: 2000,
      clientName: 'Test Client',
    };

    const result = await mealPlanGenerator.generateMealPlan(params);

    expect(result.mealPlan.meals).toHaveLength(21); // Should still create structure
    expect(result.message).toContain('limited recipe selection');
  });
});

describe('RecipeGenerator Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate and store recipes', async () => {
    const mockOpenAI = await import('../server/services/openai');
    const mockStorage = await import('../server/storage');

    const mockGeneratedRecipes = [
      {
        name: 'AI Generated Recipe',
        description: 'A test recipe',
        mealTypes: ['breakfast'],
        dietaryTags: ['healthy'],
        mainIngredientTags: ['oats'],
        ingredients: [{ name: 'Oats', amount: '1', unit: 'cup' }],
        instructions: 'Mix and serve',
        prepTimeMinutes: 5,
        cookTimeMinutes: 0,
        servings: 1,
        estimatedNutrition: {
          calories: 200,
          protein: 8,
          carbs: 35,
          fat: 4,
        },
      },
    ];

    vi.mocked(mockOpenAI.generateRecipeBatch).mockResolvedValue(mockGeneratedRecipes);
    vi.mocked(mockStorage.storage.createRecipe).mockResolvedValue({
      id: 'new-recipe-id',
      ...mockGeneratedRecipes[0],
      ingredientsJson: mockGeneratedRecipes[0].ingredients,
      instructionsText: mockGeneratedRecipes[0].instructions,
      caloriesKcal: mockGeneratedRecipes[0].estimatedNutrition.calories,
      proteinGrams: mockGeneratedRecipes[0].estimatedNutrition.protein.toString(),
      carbsGrams: mockGeneratedRecipes[0].estimatedNutrition.carbs.toString(),
      fatGrams: mockGeneratedRecipes[0].estimatedNutrition.fat.toString(),
      isApproved: false,
      imageUrl: expect.any(String),
      creationTimestamp: expect.any(Date),
      lastUpdatedTimestamp: expect.any(Date),
    });

    const result = await recipeGenerator.generateAndStoreRecipes(1);

    expect(result.message).toContain('Generated 1 recipes');
    expect(result.count).toBe(1);
    expect(mockOpenAI.generateRecipeBatch).toHaveBeenCalledWith(1, expect.any(Object));
    expect(mockStorage.storage.createRecipe).toHaveBeenCalledTimes(1);
  });

  it('should handle generation errors gracefully', async () => {
    const mockOpenAI = await import('../server/services/openai');
    
    vi.mocked(mockOpenAI.generateRecipeBatch).mockRejectedValue(new Error('OpenAI API Error'));

    const result = await recipeGenerator.generateAndStoreRecipes(5);

    expect(result.message).toContain('Error generating recipes');
    expect(result.count).toBe(0);
    expect(result.started).toBe(false);
  });

  it('should provide placeholder images for different meal types', () => {
    const generator = recipeGenerator as any;
    
    expect(generator.getPlaceholderImageUrl('breakfast')).toContain('breakfast');
    expect(generator.getPlaceholderImageUrl('lunch')).toContain('lunch');
    expect(generator.getPlaceholderImageUrl('dinner')).toContain('dinner');
    expect(generator.getPlaceholderImageUrl('snack')).toContain('snack');
    expect(generator.getPlaceholderImageUrl('unknown')).toContain('meal');
  });
});

describe('Integration Tests', () => {
  it('should handle complete meal plan generation workflow', async () => {
    const mockStorage = await import('../server/storage');
    
    // Mock realistic recipe data
    const realRecipes = [
      {
        id: 'breakfast-1',
        name: 'Protein Pancakes',
        mealTypes: ['breakfast'],
        caloriesKcal: 320,
        proteinGrams: '25.0',
        carbsGrams: '28.0',
        fatGrams: '12.0',
        prepTimeMinutes: 10,
        cookTimeMinutes: 8,
        servings: 2,
        isApproved: true,
        dietaryTags: ['high-protein'],
      },
      {
        id: 'lunch-1',
        name: 'Quinoa Buddha Bowl',
        mealTypes: ['lunch'],
        caloriesKcal: 450,
        proteinGrams: '18.0',
        carbsGrams: '65.0',
        fatGrams: '15.0',
        prepTimeMinutes: 20,
        cookTimeMinutes: 15,
        servings: 1,
        isApproved: true,
        dietaryTags: ['vegetarian', 'high-fiber'],
      },
      {
        id: 'dinner-1',
        name: 'Baked Cod with Sweet Potato',
        mealTypes: ['dinner'],
        caloriesKcal: 380,
        proteinGrams: '32.0',
        carbsGrams: '35.0',
        fatGrams: '8.0',
        prepTimeMinutes: 15,
        cookTimeMinutes: 25,
        servings: 1,
        isApproved: true,
        dietaryTags: ['low-fat', 'omega-3'],
      },
    ];

    vi.mocked(mockStorage.storage.searchRecipes).mockImplementation(async (filters) => {
      let filteredRecipes = realRecipes;
      
      if (filters.mealType) {
        filteredRecipes = realRecipes.filter(r => r.mealTypes.includes(filters.mealType!));
      }
      
      return {
        recipes: filteredRecipes,
        total: filteredRecipes.length,
      };
    });

    const params: MealPlanGeneration = {
      planName: 'Weekly Fitness Plan',
      days: 7,
      mealsPerDay: 3,
      targetCalories: 2200,
      clientName: 'Fitness Enthusiast',
      dietaryPreferences: ['high-protein'],
      activityLevel: 'moderate',
      goals: ['muscle-gain'],
    };

    const result = await mealPlanGenerator.generateMealPlan(params);

    // Verify meal plan structure
    expect(result.mealPlan.planName).toBe('Weekly Fitness Plan');
    expect(result.mealPlan.meals).toHaveLength(21); // 7 days * 3 meals
    
    // Verify nutrition calculation
    expect(result.nutrition.total).toBeDefined();
    expect(result.nutrition.averageDaily).toBeDefined();
    expect(result.nutrition.daily).toHaveLength(7);
    
    // Verify each day has 3 meals
    for (let day = 1; day <= 7; day++) {
      const dayMeals = result.mealPlan.meals.filter(m => m.day === day);
      expect(dayMeals).toHaveLength(3);
      
      // Verify meal numbers are correct
      expect(dayMeals.some(m => m.mealNumber === 1)).toBe(true); // Breakfast
      expect(dayMeals.some(m => m.mealNumber === 2)).toBe(true); // Lunch
      expect(dayMeals.some(m => m.mealNumber === 3)).toBe(true); // Dinner
    }
    
    // Verify storage was called appropriately
    expect(mockStorage.storage.searchRecipes).toHaveBeenCalledTimes(21); // Once per meal
  });
});