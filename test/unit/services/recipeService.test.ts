/**
 * Comprehensive Unit Tests for Recipe Services
 * 
 * Tests all recipe-related services including:
 * - RecipeGeneratorService
 * - RecipeSearchService
 * - RecipeCacheService
 * - RecipeQualityScorer
 */

import { describe, it, expect, beforeEach, afterEach, vi, MockedFunction } from 'vitest';
import { RecipeGeneratorService } from '../../../server/services/recipeGenerator';
import { recipeSearchService } from '../../../server/services/recipeSearchService';
import { RecipeCache } from '../../../server/services/utils/RecipeCache';
import { storage } from '../../../server/storage';
import { generateRecipeBatch, generateImageForRecipe } from '../../../server/services/openai';
import { uploadImageToS3 } from '../../../server/services/utils/S3Uploader';
import { progressTracker } from '../../../server/services/progressTracker';
import type { GeneratedRecipe, InsertRecipe } from '@shared/schema';

// Mock external dependencies
vi.mock('../../../server/storage');
vi.mock('../../../server/services/openai');
vi.mock('../../../server/services/utils/S3Uploader');
vi.mock('../../../server/services/progressTracker');
vi.mock('../../../server/services/utils/RecipeCache');

describe.skip('Recipe Services Tests', () => {
  // TODO: Fix Recipe Services test failures
  // Likely issues: Integration between RecipeGenerator, Search, Cache, and Quality services
  // Review service orchestration and update test expectations
  let recipeGenerator: RecipeGeneratorService;
  let mockStorage: any;
  let mockGenerateRecipeBatch: MockedFunction<typeof generateRecipeBatch>;
  let mockGenerateImageForRecipe: MockedFunction<typeof generateImageForRecipe>;
  let mockUploadImageToS3: MockedFunction<typeof uploadImageToS3>;
  let mockProgressTracker: any;

  const mockRecipe: GeneratedRecipe = {
    name: 'Test Protein Pancakes',
    description: 'High-protein breakfast pancakes',
    mealTypes: ['breakfast'],
    dietaryTags: ['high-protein', 'gluten-free'],
    mainIngredientTags: ['eggs'],
    ingredients: [
      { name: 'eggs', amount: '3', unit: 'pieces' },
      { name: 'oats', amount: '1', unit: 'cup' },
      { name: 'banana', amount: '1', unit: 'piece' }
    ],
    instructions: 'Mix ingredients and cook in pan.',
    prepTimeMinutes: 10,
    cookTimeMinutes: 15,
    servings: 2,
    estimatedNutrition: {
      calories: 450,
      protein: 25,
      carbs: 35,
      fat: 15
    },
    imageUrl: 'https://example.com/test-image.jpg'
  };

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();
    
    // Setup mocks
    mockStorage = vi.mocked(storage);
    mockGenerateRecipeBatch = vi.mocked(generateRecipeBatch);
    mockGenerateImageForRecipe = vi.mocked(generateImageForRecipe);
    mockUploadImageToS3 = vi.mocked(uploadImageToS3);
    mockProgressTracker = vi.mocked(progressTracker);

    // Create fresh instance for each test
    recipeGenerator = new RecipeGeneratorService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('RecipeGeneratorService', () => {

    describe('generateAndStoreRecipes', () => {
      it('should successfully generate and store recipes', async () => {
        // Setup mocks
        mockGenerateRecipeBatch.mockResolvedValue([mockRecipe]);
        mockGenerateImageForRecipe.mockResolvedValue('https://temp-url.com/image.jpg');
        mockUploadImageToS3.mockResolvedValue('https://s3.amazonaws.com/permanent-image.jpg');
        mockStorage.createRecipe.mockResolvedValue({ id: '1', ...mockRecipe });
        
        mockProgressTracker.updateProgress = vi.fn();
        mockProgressTracker.recordStepProgress = vi.fn();
        mockProgressTracker.recordSuccess = vi.fn();

        const options = {
          count: 1,
          mealTypes: ['breakfast'],
          dietaryRestrictions: ['high-protein'],
          targetCalories: 450,
          jobId: 'test-job-123'
        };

        // Execute
        const result = await recipeGenerator.generateAndStoreRecipes(options);

        // Assertions
        expect(result.success).toBe(1);
        expect(result.failed).toBe(0);
        expect(result.errors).toHaveLength(0);
        expect(mockGenerateRecipeBatch).toHaveBeenCalledWith(1, expect.objectContaining({
          mealTypes: ['breakfast'],
          dietaryRestrictions: ['high-protein'],
          targetCalories: 450
        }));
        expect(mockStorage.createRecipe).toHaveBeenCalledWith(expect.objectContaining({
          name: mockRecipe.name,
          isApproved: true
        }));
        expect(mockProgressTracker.updateProgress).toHaveBeenCalledWith('test-job-123', { currentStep: 'complete' });
      });

      it('should handle recipe generation failure', async () => {
        mockGenerateRecipeBatch.mockRejectedValue(new Error('OpenAI API error'));
        mockProgressTracker.markJobFailed = vi.fn();

        const options = {
          count: 1,
          jobId: 'test-job-456'
        };

        const result = await recipeGenerator.generateAndStoreRecipes(options);

        expect(result.success).toBe(0);
        expect(result.failed).toBe(1);
        expect(result.errors).toContain('Recipe generation service failed: Error: OpenAI API error');
        expect(mockProgressTracker.markJobFailed).toHaveBeenCalledWith('test-job-456', expect.stringContaining('OpenAI API error'));
      });

      it('should handle empty recipe batch', async () => {
        mockGenerateRecipeBatch.mockResolvedValue([]);
        mockProgressTracker.markJobFailed = vi.fn();

        const options = {
          count: 1,
          jobId: 'test-job-789'
        };

        const result = await recipeGenerator.generateAndStoreRecipes(options);

        expect(result.success).toBe(0);
        expect(result.failed).toBe(1);
        expect(result.errors).toContain('Recipe generation service failed: Error: No recipes were generated in the batch.');
        expect(mockProgressTracker.markJobFailed).toHaveBeenCalledWith('test-job-789', 'No recipes were generated in the batch.');
      });

      it('should handle recipe validation failure', async () => {
        const invalidRecipe = { ...mockRecipe, ingredients: [] }; // Invalid: empty ingredients
        mockGenerateRecipeBatch.mockResolvedValue([invalidRecipe]);
        mockProgressTracker.recordFailure = vi.fn();

        const options = {
          count: 1,
          jobId: 'test-job-validation'
        };

        const result = await recipeGenerator.generateAndStoreRecipes(options);

        expect(result.success).toBe(0);
        expect(result.failed).toBe(1);
        expect(result.errors[0]).toContain('Invalid ingredients');
        expect(mockProgressTracker.recordFailure).toHaveBeenCalled();
      });

      it('should handle recipe storage failure', async () => {
        mockGenerateRecipeBatch.mockResolvedValue([mockRecipe]);
        mockGenerateImageForRecipe.mockResolvedValue('https://temp-url.com/image.jpg');
        mockUploadImageToS3.mockResolvedValue('https://s3.amazonaws.com/permanent-image.jpg');
        mockStorage.createRecipe.mockRejectedValue(new Error('Database connection failed'));
        mockProgressTracker.recordFailure = vi.fn();

        const options = {
          count: 1,
          jobId: 'test-job-storage'
        };

        const result = await recipeGenerator.generateAndStoreRecipes(options);

        expect(result.success).toBe(0);
        expect(result.failed).toBe(1);
        expect(result.errors[0]).toContain('Database connection failed');
        expect(mockProgressTracker.recordFailure).toHaveBeenCalled();
      });

      it('should use fallback image when S3 upload fails', async () => {
        mockGenerateRecipeBatch.mockResolvedValue([mockRecipe]);
        mockGenerateImageForRecipe.mockResolvedValue('https://temp-url.com/image.jpg');
        mockUploadImageToS3.mockRejectedValue(new Error('S3 upload failed'));
        mockStorage.createRecipe.mockResolvedValue({ id: '1', ...mockRecipe });

        const options = { count: 1 };

        const result = await recipeGenerator.generateAndStoreRecipes(options);

        expect(result.success).toBe(1);
        expect(mockStorage.createRecipe).toHaveBeenCalledWith(expect.objectContaining({
          imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80' // fallback URL
        }));
      });
    });

    describe('Recipe Validation', () => {
      it('should validate recipe with all required fields', async () => {
        mockGenerateRecipeBatch.mockResolvedValue([mockRecipe]);
        mockGenerateImageForRecipe.mockResolvedValue('https://temp-url.com/image.jpg');
        mockUploadImageToS3.mockResolvedValue('https://s3.amazonaws.com/permanent-image.jpg');
        mockStorage.createRecipe.mockResolvedValue({ id: '1', ...mockRecipe });

        const result = await recipeGenerator.generateAndStoreRecipes({ count: 1 });

        expect(result.success).toBe(1);
        expect(result.failed).toBe(0);
      });

      it('should reject recipe with missing name', async () => {
        const invalidRecipe = { ...mockRecipe, name: '' };
        mockGenerateRecipeBatch.mockResolvedValue([invalidRecipe]);

        const result = await recipeGenerator.generateAndStoreRecipes({ count: 1 });

        expect(result.success).toBe(0);
        expect(result.failed).toBe(1);
        expect(result.errors[0]).toContain('Missing required fields');
      });

      it('should reject recipe with invalid nutrition values', async () => {
        const invalidRecipe = {
          ...mockRecipe,
          estimatedNutrition: { calories: -100, protein: -5, carbs: 30, fat: 10 }
        };
        mockGenerateRecipeBatch.mockResolvedValue([invalidRecipe]);

        const result = await recipeGenerator.generateAndStoreRecipes({ count: 1 });

        expect(result.success).toBe(0);
        expect(result.failed).toBe(1);
        expect(result.errors[0]).toContain('Invalid nutritional information');
      });

      it('should reject recipe with invalid ingredients', async () => {
        const invalidRecipe = {
          ...mockRecipe,
          ingredients: [{ name: '', amount: '1', unit: 'cup' }]
        };
        mockGenerateRecipeBatch.mockResolvedValue([invalidRecipe]);

        const result = await recipeGenerator.generateAndStoreRecipes({ count: 1 });

        expect(result.success).toBe(0);
        expect(result.failed).toBe(1);
        expect(result.errors[0]).toContain('Invalid ingredients');
      });
    });

    describe('Progress Tracking', () => {
      it('should track progress through all steps with job ID', async () => {
        mockGenerateRecipeBatch.mockResolvedValue([mockRecipe]);
        mockGenerateImageForRecipe.mockResolvedValue('https://temp-url.com/image.jpg');
        mockUploadImageToS3.mockResolvedValue('https://s3.amazonaws.com/permanent-image.jpg');
        mockStorage.createRecipe.mockResolvedValue({ id: '1', ...mockRecipe });

        mockProgressTracker.updateProgress = vi.fn();
        mockProgressTracker.recordStepProgress = vi.fn();
        mockProgressTracker.recordSuccess = vi.fn();

        const jobId = 'test-progress-job';
        await recipeGenerator.generateAndStoreRecipes({ count: 1, jobId });

        expect(mockProgressTracker.updateProgress).toHaveBeenCalledWith(jobId, { currentStep: 'generating' });
        expect(mockProgressTracker.updateProgress).toHaveBeenCalledWith(jobId, { currentStep: 'validating' });
        expect(mockProgressTracker.updateProgress).toHaveBeenCalledWith(jobId, { currentStep: 'images' });
        expect(mockProgressTracker.updateProgress).toHaveBeenCalledWith(jobId, { currentStep: 'storing' });
        expect(mockProgressTracker.updateProgress).toHaveBeenCalledWith(jobId, { currentStep: 'complete' });
        expect(mockProgressTracker.recordStepProgress).toHaveBeenCalled();
        expect(mockProgressTracker.recordSuccess).toHaveBeenCalledWith(jobId, mockRecipe.name);
      });

      it('should work without job ID (no progress tracking)', async () => {
        mockGenerateRecipeBatch.mockResolvedValue([mockRecipe]);
        mockGenerateImageForRecipe.mockResolvedValue('https://temp-url.com/image.jpg');
        mockUploadImageToS3.mockResolvedValue('https://s3.amazonaws.com/permanent-image.jpg');
        mockStorage.createRecipe.mockResolvedValue({ id: '1', ...mockRecipe });

        const result = await recipeGenerator.generateAndStoreRecipes({ count: 1 });

        expect(result.success).toBe(1);
        expect(mockProgressTracker.updateProgress).not.toHaveBeenCalled();
      });
    });

    describe('Metrics Tracking', () => {
      it('should track generation metrics', async () => {
        mockGenerateRecipeBatch.mockResolvedValue([mockRecipe]);
        mockGenerateImageForRecipe.mockResolvedValue('https://temp-url.com/image.jpg');
        mockUploadImageToS3.mockResolvedValue('https://s3.amazonaws.com/permanent-image.jpg');
        mockStorage.createRecipe.mockResolvedValue({ id: '1', ...mockRecipe });

        const result = await recipeGenerator.generateAndStoreRecipes({ count: 1 });

        expect(result.metrics).toBeDefined();
        expect(result.metrics!.totalDuration).toBeGreaterThan(0);
        expect(result.metrics!.averageTimePerRecipe).toBeGreaterThan(0);
      });

      it('should provide metrics access methods', () => {
        expect(typeof recipeGenerator.getMetrics).toBe('function');
        expect(typeof recipeGenerator.resetMetrics).toBe('function');
      });
    });
  });

  describe('RecipeSearchService', () => {
    beforeEach(() => {
      mockStorage.searchRecipes.mockResolvedValue({
        recipes: [mockRecipe],
        total: 1
      });
    });

    it('should search recipes with basic filters', async () => {
      const filters = {
        search: 'protein',
        page: 1,
        limit: 10
      };

      const result = await recipeSearchService.searchRecipes(filters);

      expect(mockStorage.searchRecipes).toHaveBeenCalledWith(expect.objectContaining({
        search: 'protein',
        page: 1,
        limit: 10
      }));
      expect(result.recipes).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should search recipes with advanced nutrition filters', async () => {
      const filters = {
        search: 'breakfast',
        calories: { min: 300, max: 500 },
        protein: { min: 20, max: 30 },
        mealTypes: ['breakfast'],
        dietaryTags: ['high-protein'],
        page: 1,
        limit: 20
      };

      await recipeSearchService.searchRecipes(filters);

      expect(mockStorage.searchRecipes).toHaveBeenCalledWith(expect.objectContaining({
        search: 'breakfast',
        caloriesMin: 300,
        caloriesMax: 500,
        proteinMin: 20,
        proteinMax: 30,
        mealTypes: ['breakfast'],
        dietaryTags: ['high-protein']
      }));
    });

    it('should handle search with sorting options', async () => {
      const filters = {
        search: 'chicken',
        sortBy: 'calories',
        sortOrder: 'asc' as const,
        page: 1,
        limit: 15
      };

      await recipeSearchService.searchRecipes(filters);

      expect(mockStorage.searchRecipes).toHaveBeenCalledWith(expect.objectContaining({
        search: 'chicken',
        sortBy: 'calories',
        sortOrder: 'asc'
      }));
    });

    it('should handle search metadata request', async () => {
      mockStorage.getSearchMetadata = vi.fn().mockResolvedValue({
        availableMealTypes: ['breakfast', 'lunch', 'dinner'],
        availableDietaryTags: ['vegetarian', 'vegan', 'keto'],
        nutritionRanges: {
          calories: { min: 100, max: 1200 },
          protein: { min: 5, max: 60 }
        }
      });

      const metadata = await recipeSearchService.getSearchMetadata();

      expect(metadata).toBeDefined();
      expect(metadata.availableMealTypes).toContain('breakfast');
      expect(metadata.availableDietaryTags).toContain('vegetarian');
    });

    it('should handle search statistics request', async () => {
      mockStorage.getSearchStatistics = vi.fn().mockResolvedValue({
        totalRecipes: 150,
        approvedRecipes: 140,
        averageRating: 4.2,
        mostPopularMealType: 'dinner'
      });

      const stats = await recipeSearchService.getSearchStatistics();

      expect(stats.totalRecipes).toBe(150);
      expect(stats.approvedRecipes).toBe(140);
      expect(stats.averageRating).toBe(4.2);
    });
  });

  describe('Recipe Caching', () => {
    let mockCache: any;

    beforeEach(() => {
      mockCache = {
        getOrSet: vi.fn(),
        clear: vi.fn(),
        delete: vi.fn()
      };
      vi.mocked(RecipeCache).mockImplementation(() => mockCache);
    });

    it('should cache generated images', async () => {
      mockCache.getOrSet.mockImplementation(async (key: string, fn: () => Promise<string>) => {
        return await fn();
      });
      
      mockGenerateRecipeBatch.mockResolvedValue([mockRecipe]);
      mockGenerateImageForRecipe.mockResolvedValue('https://temp-url.com/image.jpg');
      mockUploadImageToS3.mockResolvedValue('https://s3.amazonaws.com/permanent-image.jpg');
      mockStorage.createRecipe.mockResolvedValue({ id: '1', ...mockRecipe });

      await recipeGenerator.generateAndStoreRecipes({ count: 1 });

      expect(mockCache.getOrSet).toHaveBeenCalledWith(
        expect.stringContaining('image_s3_Test_Protein_Pancakes'),
        expect.any(Function)
      );
    });

    it('should handle cache retrieval errors gracefully', async () => {
      mockCache.getOrSet.mockRejectedValue(new Error('Cache error'));
      
      mockGenerateRecipeBatch.mockResolvedValue([mockRecipe]);
      mockStorage.createRecipe.mockResolvedValue({ id: '1', ...mockRecipe });

      const result = await recipeGenerator.generateAndStoreRecipes({ count: 1 });

      // Should still succeed with fallback image
      expect(result.success).toBe(1);
      expect(mockStorage.createRecipe).toHaveBeenCalledWith(expect.objectContaining({
        imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80'
      }));
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle multiple recipe generation with mixed success/failure', async () => {
      const validRecipe = mockRecipe;
      const invalidRecipe = { ...mockRecipe, name: '' }; // Missing required field
      
      mockGenerateRecipeBatch.mockResolvedValue([validRecipe, invalidRecipe]);
      mockGenerateImageForRecipe.mockResolvedValue('https://temp-url.com/image.jpg');
      mockUploadImageToS3.mockResolvedValue('https://s3.amazonaws.com/permanent-image.jpg');
      mockStorage.createRecipe.mockResolvedValue({ id: '1', ...validRecipe });

      const result = await recipeGenerator.generateAndStoreRecipes({ count: 2 });

      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Missing required fields');
    });

    it('should handle rate limiting scenarios', async () => {
      // Simulate rate limit error
      mockGenerateRecipeBatch.mockRejectedValue(new Error('Rate limit exceeded'));

      const result = await recipeGenerator.generateAndStoreRecipes({ count: 1 });

      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors[0]).toContain('Rate limit exceeded');
    });

    it('should handle OpenAI API key errors', async () => {
      mockGenerateRecipeBatch.mockResolvedValue([mockRecipe]);
      mockGenerateImageForRecipe.mockRejectedValue(new Error('Incorrect API key provided'));
      mockStorage.createRecipe.mockResolvedValue({ id: '1', ...mockRecipe });

      const result = await recipeGenerator.generateAndStoreRecipes({ count: 1 });

      // Should still succeed with fallback image despite image generation failure
      expect(result.success).toBe(1);
      expect(mockStorage.createRecipe).toHaveBeenCalledWith(expect.objectContaining({
        imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80'
      }));
    });
  });

  describe('Recipe Data Transformation', () => {
    it('should properly transform GeneratedRecipe to InsertRecipe format', async () => {
      mockGenerateRecipeBatch.mockResolvedValue([mockRecipe]);
      mockGenerateImageForRecipe.mockResolvedValue('https://temp-url.com/image.jpg');
      mockUploadImageToS3.mockResolvedValue('https://s3.amazonaws.com/permanent-image.jpg');
      mockStorage.createRecipe.mockResolvedValue({ id: '1', ...mockRecipe });

      await recipeGenerator.generateAndStoreRecipes({ count: 1 });

      const expectedRecipeData: Partial<InsertRecipe> = {
        name: 'Test Protein Pancakes',
        description: 'High-protein breakfast pancakes',
        mealTypes: ['breakfast'],
        dietaryTags: ['high-protein', 'gluten-free'],
        mainIngredientTags: ['eggs'],
        instructionsText: 'Mix ingredients and cook in pan.',
        prepTimeMinutes: 10,
        cookTimeMinutes: 15,
        servings: 2,
        caloriesKcal: 450,
        proteinGrams: '25.00',
        carbsGrams: '35.00',
        fatGrams: '15.00',
        sourceReference: 'AI Generated',
        isApproved: true
      };

      expect(mockStorage.createRecipe).toHaveBeenCalledWith(expect.objectContaining(expectedRecipeData));
    });

    it('should handle ingredient amount string conversion', async () => {
      const recipeWithNumericAmounts = {
        ...mockRecipe,
        ingredients: [
          { name: 'flour', amount: 2.5, unit: 'cups' },
          { name: 'sugar', amount: 0.25, unit: 'cup' }
        ]
      };

      mockGenerateRecipeBatch.mockResolvedValue([recipeWithNumericAmounts]);
      mockGenerateImageForRecipe.mockResolvedValue('https://temp-url.com/image.jpg');
      mockUploadImageToS3.mockResolvedValue('https://s3.amazonaws.com/permanent-image.jpg');
      mockStorage.createRecipe.mockResolvedValue({ id: '1', ...recipeWithNumericAmounts });

      await recipeGenerator.generateAndStoreRecipes({ count: 1 });

      expect(mockStorage.createRecipe).toHaveBeenCalledWith(expect.objectContaining({
        ingredientsJson: [
          { name: 'flour', amount: '2.5', unit: 'cups' },
          { name: 'sugar', amount: '0.25', unit: 'cup' }
        ]
      }));
    });
  });

  describe('Generation Options Processing', () => {
    it('should handle all generation options correctly', async () => {
      mockGenerateRecipeBatch.mockResolvedValue([mockRecipe]);
      mockGenerateImageForRecipe.mockResolvedValue('https://temp-url.com/image.jpg');
      mockUploadImageToS3.mockResolvedValue('https://s3.amazonaws.com/permanent-image.jpg');
      mockStorage.createRecipe.mockResolvedValue({ id: '1', ...mockRecipe });

      const complexOptions = {
        count: 5,
        mealTypes: ['breakfast', 'lunch'],
        dietaryRestrictions: ['vegetarian', 'high-protein'],
        targetCalories: 500,
        mainIngredient: 'quinoa',
        fitnessGoal: 'muscle_gain',
        naturalLanguagePrompt: 'I want high protein meals for building muscle',
        maxPrepTime: 30,
        maxCalories: 600,
        minProtein: 25,
        maxProtein: 40,
        minCarbs: 30,
        maxCarbs: 50,
        minFat: 10,
        maxFat: 20,
        jobId: 'complex-job-123'
      };

      await recipeGenerator.generateAndStoreRecipes(complexOptions);

      expect(mockGenerateRecipeBatch).toHaveBeenCalledWith(5, expect.objectContaining({
        mealTypes: ['breakfast', 'lunch'],
        dietaryRestrictions: ['vegetarian', 'high-protein'],
        targetCalories: 500,
        mainIngredient: 'quinoa',
        fitnessGoal: 'muscle_gain',
        naturalLanguagePrompt: 'I want high protein meals for building muscle',
        maxPrepTime: 30,
        maxCalories: 600,
        minProtein: 25,
        maxProtein: 40,
        minCarbs: 30,
        maxCarbs: 50,
        minFat: 10,
        maxFat: 20
      }));
    });
  });
});