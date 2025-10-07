/**
 * Fixed Recipe Generation Core Logic Unit Tests
 * 
 * This test suite provides comprehensive coverage with proper mocking
 * to ensure all tests pass reliably.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock all external dependencies at the top level
const mockStorage = {
  createRecipe: vi.fn(),
  getRecipe: vi.fn(),
  searchRecipes: vi.fn()
};

const mockGenerateRecipeBatch = vi.fn();
const mockGenerateImageForRecipe = vi.fn();
const mockUploadImageToS3 = vi.fn();
const mockProgressTracker = {
  updateProgress: vi.fn(),
  markJobFailed: vi.fn(),
  recordStepProgress: vi.fn(),
  recordSuccess: vi.fn(),
  recordFailure: vi.fn()
};

// Mock the modules
vi.mock('../../../server/storage', () => ({
  storage: mockStorage
}));

vi.mock('../../../server/services/openai', () => ({
  generateRecipeBatch: mockGenerateRecipeBatch,
  generateImageForRecipe: mockGenerateImageForRecipe
}));

vi.mock('../../../server/services/utils/S3Uploader', () => ({
  uploadImageToS3: mockUploadImageToS3
}));

vi.mock('../../../server/services/progressTracker', () => ({
  progressTracker: mockProgressTracker
}));

// Import after mocking
import { RecipeGeneratorService } from '../../../server/services/recipeGenerator';

describe('Recipe Generation Core Logic - Fixed Tests', () => {
  let recipeService: RecipeGeneratorService;

  beforeEach(() => {
    recipeService = new RecipeGeneratorService();
    vi.clearAllMocks();
    
    // Set up default successful mocks
    mockGenerateImageForRecipe.mockResolvedValue('https://temp-image-url.com/recipe.jpg');
    mockUploadImageToS3.mockResolvedValue('https://s3.amazonaws.com/bucket/recipe.jpg');
    mockStorage.createRecipe.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('1. Recipe Generation with Different Parameters (5 tests)', () => {
    test('should generate recipes with minimal parameters', async () => {
      const mockRecipes = [{
        name: 'Simple Pancakes',
        description: 'Basic pancake recipe',
        ingredients: [{ name: 'flour', amount: '1 cup', unit: 'cup' }],
        instructions: 'Mix and cook',
        estimatedNutrition: { calories: 300, protein: 8, carbs: 45, fat: 12 },
        mealTypes: ['breakfast'],
        dietaryTags: [],
        mainIngredientTags: ['flour'],
        prepTimeMinutes: 15,
        cookTimeMinutes: 10,
        servings: 4
      }];

      mockGenerateRecipeBatch.mockResolvedValue(mockRecipes);

      const result = await recipeService.generateAndStoreRecipes({ count: 1 });

      expect(result).toEqual({
        success: 1,
        failed: 0,
        errors: [],
        metrics: expect.objectContaining({
          totalDuration: expect.any(Number),
          averageTimePerRecipe: expect.any(Number)
        })
      });
      
      expect(mockGenerateRecipeBatch).toHaveBeenCalledWith(1, expect.any(Object));
      expect(mockStorage.createRecipe).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Simple Pancakes',
        imageUrl: 'https://s3.amazonaws.com/bucket/recipe.jpg'
      }));
    });

    test('should generate recipes with dietary restrictions', async () => {
      const mockRecipes = [{
        name: 'Vegan Salad',
        description: 'Plant-based salad',
        ingredients: [{ name: 'lettuce', amount: '2 cups', unit: 'cups' }],
        instructions: 'Toss ingredients',
        estimatedNutrition: { calories: 150, protein: 5, carbs: 20, fat: 8 },
        mealTypes: ['lunch'],
        dietaryTags: ['vegan', 'gluten-free'],
        mainIngredientTags: ['vegetables'],
        prepTimeMinutes: 10,
        cookTimeMinutes: 0,
        servings: 2
      }];

      mockGenerateRecipeBatch.mockResolvedValue(mockRecipes);

      const result = await recipeService.generateAndStoreRecipes({
        count: 1,
        dietaryRestrictions: ['vegan', 'gluten-free']
      });

      expect(result.success).toBe(1);
      expect(mockGenerateRecipeBatch).toHaveBeenCalledWith(1, expect.objectContaining({
        dietaryRestrictions: ['vegan', 'gluten-free']
      }));
    });

    test('should generate recipes with specific meal types', async () => {
      const mockRecipes = [{
        name: 'Dinner Steak',
        description: 'Grilled steak dinner',
        ingredients: [{ name: 'beef steak', amount: '8 oz', unit: 'oz' }],
        instructions: 'Grill to medium-rare',
        estimatedNutrition: { calories: 500, protein: 45, carbs: 5, fat: 35 },
        mealTypes: ['dinner'],
        dietaryTags: ['high-protein'],
        mainIngredientTags: ['beef'],
        prepTimeMinutes: 5,
        cookTimeMinutes: 15,
        servings: 1
      }];

      mockGenerateRecipeBatch.mockResolvedValue(mockRecipes);

      const result = await recipeService.generateAndStoreRecipes({
        count: 1,
        mealTypes: ['dinner']
      });

      expect(result.success).toBe(1);
      expect(mockGenerateRecipeBatch).toHaveBeenCalledWith(1, expect.objectContaining({
        mealTypes: ['dinner']
      }));
    });

    test('should generate recipes with calorie targets', async () => {
      const mockRecipes = [{
        name: 'Light Lunch',
        description: 'Low calorie lunch option',
        ingredients: [{ name: 'chicken breast', amount: '4 oz', unit: 'oz' }],
        instructions: 'Bake at 350°F',
        estimatedNutrition: { calories: 400, protein: 30, carbs: 10, fat: 15 },
        mealTypes: ['lunch'],
        dietaryTags: ['low-calorie'],
        mainIngredientTags: ['chicken'],
        prepTimeMinutes: 10,
        cookTimeMinutes: 25,
        servings: 1
      }];

      mockGenerateRecipeBatch.mockResolvedValue(mockRecipes);

      const result = await recipeService.generateAndStoreRecipes({
        count: 1,
        targetCalories: 400,
        maxCalories: 450
      });

      expect(result.success).toBe(1);
      expect(mockGenerateRecipeBatch).toHaveBeenCalledWith(1, expect.objectContaining({
        targetCalories: 400,
        maxCalories: 450
      }));
    });

    test('should generate recipes with main ingredient specification', async () => {
      const mockRecipes = [{
        name: 'Salmon Teriyaki',
        description: 'Grilled salmon with teriyaki sauce',
        ingredients: [
          { name: 'salmon fillet', amount: '6 oz', unit: 'oz' },
          { name: 'teriyaki sauce', amount: '2 tbsp', unit: 'tbsp' }
        ],
        instructions: 'Grill salmon and glaze with sauce',
        estimatedNutrition: { calories: 450, protein: 40, carbs: 15, fat: 25 },
        mealTypes: ['dinner'],
        dietaryTags: ['high-protein'],
        mainIngredientTags: ['salmon'],
        prepTimeMinutes: 8,
        cookTimeMinutes: 12,
        servings: 1
      }];

      mockGenerateRecipeBatch.mockResolvedValue(mockRecipes);

      const result = await recipeService.generateAndStoreRecipes({
        count: 1,
        mainIngredient: 'salmon'
      });

      expect(result.success).toBe(1);
      expect(mockGenerateRecipeBatch).toHaveBeenCalledWith(1, expect.objectContaining({
        mainIngredient: 'salmon'
      }));
    });
  });

  describe('2. Recipe Validation (3 tests)', () => {
    test('should reject recipe with missing required fields', async () => {
      const invalidRecipe = {
        name: '', // Invalid - empty name
        description: 'Test',
        ingredients: [],
        instructions: '',
        estimatedNutrition: { calories: 300, protein: 8, carbs: 45, fat: 12 },
        mealTypes: ['breakfast'],
        dietaryTags: [],
        mainIngredientTags: [],
        prepTimeMinutes: 15,
        cookTimeMinutes: 10,
        servings: 4
      };

      mockGenerateRecipeBatch.mockResolvedValue([invalidRecipe]);

      const result = await recipeService.generateAndStoreRecipes({ count: 1 });

      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toContainEqual(expect.stringContaining('Missing required fields'));
    });

    test('should reject recipe with negative nutritional values', async () => {
      const invalidRecipe = {
        name: 'Test Recipe',
        description: 'Test',
        ingredients: [{ name: 'flour', amount: '1 cup', unit: 'cup' }],
        instructions: 'Mix and cook',
        estimatedNutrition: { calories: -100, protein: 8, carbs: 45, fat: 12 }, // Invalid
        mealTypes: ['breakfast'],
        dietaryTags: [],
        mainIngredientTags: [],
        prepTimeMinutes: 15,
        cookTimeMinutes: 10,
        servings: 4
      };

      mockGenerateRecipeBatch.mockResolvedValue([invalidRecipe]);

      const result = await recipeService.generateAndStoreRecipes({ count: 1 });

      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toContainEqual(expect.stringContaining('Invalid nutritional information'));
    });

    test('should reject recipe with invalid ingredients', async () => {
      const invalidRecipe = {
        name: 'Test Recipe',
        description: 'Test',
        ingredients: [{ name: '', amount: '1 cup', unit: 'cup' }], // Invalid - empty name
        instructions: 'Mix and cook',
        estimatedNutrition: { calories: 300, protein: 8, carbs: 45, fat: 12 },
        mealTypes: ['breakfast'],
        dietaryTags: [],
        mainIngredientTags: [],
        prepTimeMinutes: 15,
        cookTimeMinutes: 10,
        servings: 4
      };

      mockGenerateRecipeBatch.mockResolvedValue([invalidRecipe]);

      const result = await recipeService.generateAndStoreRecipes({ count: 1 });

      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toContainEqual(expect.stringContaining('Invalid ingredients'));
    });
  });

  describe('3. Image Generation and Handling (3 tests)', () => {
    test('should successfully generate and store recipe images', async () => {
      const mockRecipe = {
        name: 'Chocolate Cake',
        description: 'Rich chocolate cake',
        ingredients: [{ name: 'flour', amount: '2 cups', unit: 'cups' }],
        instructions: 'Bake at 350°F',
        estimatedNutrition: { calories: 400, protein: 6, carbs: 60, fat: 15 },
        mealTypes: ['dessert'],
        dietaryTags: [],
        mainIngredientTags: ['chocolate'],
        prepTimeMinutes: 20,
        cookTimeMinutes: 40,
        servings: 8
      };

      mockGenerateRecipeBatch.mockResolvedValue([mockRecipe]);
      mockGenerateImageForRecipe.mockResolvedValue('https://temp-openai-url.com/cake.jpg');
      mockUploadImageToS3.mockResolvedValue('https://s3.amazonaws.com/bucket/cake.jpg');

      const result = await recipeService.generateAndStoreRecipes({ count: 1 });

      expect(result.success).toBe(1);
      expect(mockGenerateImageForRecipe).toHaveBeenCalledWith(mockRecipe);
      expect(mockUploadImageToS3).toHaveBeenCalledWith('https://temp-openai-url.com/cake.jpg', 'Chocolate Cake');
      expect(mockStorage.createRecipe).toHaveBeenCalledWith(expect.objectContaining({
        imageUrl: 'https://s3.amazonaws.com/bucket/cake.jpg'
      }));
    });

    test('should handle image generation failure', async () => {
      const mockRecipe = {
        name: 'Simple Salad',
        description: 'Fresh garden salad',
        ingredients: [{ name: 'lettuce', amount: '2 cups', unit: 'cups' }],
        instructions: 'Toss ingredients',
        estimatedNutrition: { calories: 100, protein: 3, carbs: 15, fat: 5 },
        mealTypes: ['lunch'],
        dietaryTags: [],
        mainIngredientTags: ['vegetables'],
        prepTimeMinutes: 5,
        cookTimeMinutes: 0,
        servings: 2
      };

      mockGenerateRecipeBatch.mockResolvedValue([mockRecipe]);
      mockGenerateImageForRecipe.mockResolvedValue(null); // Simulate failure

      const result = await recipeService.generateAndStoreRecipes({ count: 1 });

      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toContainEqual(expect.stringContaining('Image generation failed'));
    });

    test('should handle S3 upload failure', async () => {
      const mockRecipe = {
        name: 'Pasta Dish',
        description: 'Italian pasta',
        ingredients: [{ name: 'pasta', amount: '1 lb', unit: 'lb' }],
        instructions: 'Boil and serve',
        estimatedNutrition: { calories: 350, protein: 12, carbs: 70, fat: 8 },
        mealTypes: ['dinner'],
        dietaryTags: [],
        mainIngredientTags: ['pasta'],
        prepTimeMinutes: 5,
        cookTimeMinutes: 15,
        servings: 4
      };

      mockGenerateRecipeBatch.mockResolvedValue([mockRecipe]);
      mockGenerateImageForRecipe.mockResolvedValue('https://temp-url.com/pasta.jpg');
      mockUploadImageToS3.mockRejectedValue(new Error('S3 upload failed'));

      const result = await recipeService.generateAndStoreRecipes({ count: 1 });

      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toContainEqual(expect.stringContaining('Image generation failed'));
    });
  });

  describe('4. Progress Tracking (2 tests)', () => {
    test('should track progress with job ID', async () => {
      const mockRecipe = {
        name: 'Quick Snack',
        description: 'Fast snack option',
        ingredients: [{ name: 'nuts', amount: '1/4 cup', unit: 'cup' }],
        instructions: 'Eat nuts',
        estimatedNutrition: { calories: 180, protein: 6, carbs: 5, fat: 15 },
        mealTypes: ['snack'],
        dietaryTags: ['keto'],
        mainIngredientTags: ['nuts'],
        prepTimeMinutes: 0,
        cookTimeMinutes: 0,
        servings: 1
      };

      mockGenerateRecipeBatch.mockResolvedValue([mockRecipe]);

      const result = await recipeService.generateAndStoreRecipes({
        count: 1,
        jobId: 'test-job-123'
      });

      expect(result.success).toBe(1);
      expect(mockProgressTracker.updateProgress).toHaveBeenCalledWith('test-job-123', { currentStep: 'generating' });
      expect(mockProgressTracker.updateProgress).toHaveBeenCalledWith('test-job-123', { currentStep: 'complete' });
      expect(mockProgressTracker.recordSuccess).toHaveBeenCalledWith('test-job-123', 'Quick Snack');
    });

    test('should track failures with job ID', async () => {
      mockGenerateRecipeBatch.mockRejectedValue(new Error('OpenAI API failed'));

      const result = await recipeService.generateAndStoreRecipes({
        count: 1,
        jobId: 'test-job-456'
      });

      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(mockProgressTracker.markJobFailed).toHaveBeenCalledWith(
        'test-job-456',
        expect.stringContaining('Recipe generation service failed')
      );
    });
  });

  describe('5. Error Handling (2 tests)', () => {
    test('should handle OpenAI service failures', async () => {
      mockGenerateRecipeBatch.mockRejectedValue(new Error('OpenAI service unavailable'));

      const result = await recipeService.generateAndStoreRecipes({ count: 5 });

      expect(result.success).toBe(0);
      expect(result.failed).toBe(5);
      expect(result.errors).toContainEqual(expect.stringContaining('Recipe generation service failed'));
    });

    test('should handle empty recipe batch from AI', async () => {
      mockGenerateRecipeBatch.mockResolvedValue([]); // Empty array

      const result = await recipeService.generateAndStoreRecipes({ count: 3 });

      expect(result.success).toBe(0);
      expect(result.failed).toBe(3);
      expect(result.errors).toContainEqual(expect.stringContaining('No recipes were generated'));
    });
  });
});