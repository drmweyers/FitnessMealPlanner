/**
 * PDF Test Setup
 * 
 * Common setup and utilities for PDF tests
 */

import { vi } from 'vitest';

// Mock file system operations
export const mockFs = {
  readFileSync: vi.fn().mockReturnValue('mock file content'),
  writeFileSync: vi.fn(),
  existsSync: vi.fn().mockReturnValue(true)
};

// Mock path utilities
export const mockPath = {
  join: vi.fn((...args) => args.join('/')),
  dirname: vi.fn((path) => path.split('/').slice(0, -1).join('/')),
  resolve: vi.fn((...args) => args.join('/'))
};

// Sample test data
export const sampleMealPlan = {
  id: 'test-meal-plan-123',
  planName: 'Test Meal Plan',
  fitnessGoal: 'muscle_building',
  description: 'A test meal plan for unit testing',
  dailyCalorieTarget: 2500,
  days: 7,
  mealsPerDay: 3,
  meals: [
    {
      day: 1,
      mealNumber: 1,
      mealType: 'breakfast',
      recipe: {
        id: 'test-recipe-1',
        name: 'Test Breakfast Recipe',
        description: 'A nutritious breakfast for testing',
        caloriesKcal: 450,
        proteinGrams: '30',
        carbsGrams: '45',
        fatGrams: '15',
        prepTimeMinutes: 15,
        servings: 1,
        mealTypes: ['breakfast'],
        dietaryTags: ['high-protein', 'vegetarian'],
        ingredientsJson: [
          { name: 'Oats', amount: '1', unit: 'cup' },
          { name: 'Protein powder', amount: '1', unit: 'scoop' },
          { name: 'Banana', amount: '1', unit: 'medium' },
          { name: 'Almond milk', amount: '1', unit: 'cup' }
        ],
        instructionsText: '1. Heat milk. 2. Add oats. 3. Cook for 5 minutes. 4. Add protein powder. 5. Top with banana.'
      }
    },
    {
      day: 1,
      mealNumber: 2,
      mealType: 'lunch',
      recipe: {
        id: 'test-recipe-2',
        name: 'Test Lunch Recipe',
        description: 'A balanced lunch meal',
        caloriesKcal: 550,
        proteinGrams: '40',
        carbsGrams: '50',
        fatGrams: '20',
        prepTimeMinutes: 25,
        servings: 1,
        mealTypes: ['lunch', 'dinner'],
        dietaryTags: ['high-protein', 'gluten-free'],
        ingredientsJson: [
          { name: 'Chicken breast', amount: '6', unit: 'oz' },
          { name: 'Quinoa', amount: '1', unit: 'cup' },
          { name: 'Broccoli', amount: '2', unit: 'cups' },
          { name: 'Olive oil', amount: '1', unit: 'tbsp' }
        ],
        instructionsText: '1. Grill chicken. 2. Cook quinoa. 3. Steam broccoli. 4. Combine with olive oil.'
      }
    }
  ]
};

export const sampleExportOptions = {
  includeShoppingList: true,
  includeMacroSummary: true,
  includeRecipePhotos: false,
  orientation: 'portrait' as const,
  pageSize: 'A4' as const
};

export const sampleUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  role: 'trainer' as const
};

// Helper function to create mock Express request
export function createMockRequest(overrides: any = {}) {
  return {
    body: {},
    user: sampleUser,
    params: {},
    ...overrides
  };
}

// Helper function to create mock Express response
export function createMockResponse() {
  const mockResponse = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    headersSent: false
  };

  return mockResponse;
}

// Helper function to assert PDF buffer is valid
export function assertValidPdfBuffer(buffer: Buffer) {
  expect(buffer).toBeInstanceOf(Buffer);
  expect(buffer.length).toBeGreaterThan(0);
  
  // Check PDF magic bytes
  const pdfHeader = buffer.toString('ascii', 0, 4);
  expect(pdfHeader).toBe('%PDF');
}

// Helper function to create nutrition totals for testing
export function createNutritionTotals(overrides: any = {}) {
  return {
    totalCalories: 2000,
    totalProtein: 150,
    totalCarbs: 200,
    totalFat: 67,
    avgCaloriesPerDay: 2000,
    avgProteinPerDay: 150,
    avgCarbsPerDay: 200,
    avgFatPerDay: 67,
    ...overrides
  };
}

// Helper function to generate test meal plan with specified number of meals
export function generateTestMealPlan(days: number = 7, mealsPerDay: number = 3) {
  const meals = [];
  
  for (let day = 1; day <= days; day++) {
    for (let mealNum = 1; mealNum <= mealsPerDay; mealNum++) {
      const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
      const mealType = mealTypes[Math.min(mealNum - 1, mealTypes.length - 1)];
      
      meals.push({
        day,
        mealNumber: mealNum,
        mealType,
        recipe: {
          id: `test-recipe-${day}-${mealNum}`,
          name: `Day ${day} ${mealType.charAt(0).toUpperCase() + mealType.slice(1)}`,
          description: `A nutritious ${mealType} for day ${day}`,
          caloriesKcal: 300 + (mealNum * 50),
          proteinGrams: `${20 + (mealNum * 5)}`,
          carbsGrams: `${30 + (mealNum * 5)}`,
          fatGrams: `${10 + (mealNum * 2)}`,
          prepTimeMinutes: 15 + (mealNum * 5),
          servings: 1,
          mealTypes: [mealType],
          dietaryTags: ['balanced'],
          ingredientsJson: [
            { name: 'Main ingredient', amount: '1', unit: 'portion' },
            { name: 'Side ingredient', amount: '1', unit: 'cup' }
          ],
          instructionsText: `Instructions for ${mealType} on day ${day}.`
        }
      });
    }
  }
  
  return {
    ...sampleMealPlan,
    days,
    mealsPerDay,
    meals
  };
}

// Setup common mocks for all PDF tests
export function setupPdfTestMocks() {
  // Mock console methods to reduce test noise
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  
  return {
    mockFs,
    mockPath
  };
}