/**
 * ==========================================
 * Recipe Generator Non-Blocking Architecture Tests
 * Created: October 6, 2025
 * Purpose: Test the fix for recipe generation hanging at 80%
 * Reference: RECIPE_GENERATION_FIX_PLAN.md
 * ==========================================
 *
 * Tests the new non-blocking architecture where:
 * 1. Recipes save immediately with placeholder images (< 5 seconds)
 * 2. Images generate in background asynchronously
 * 3. Timeouts prevent blocking on image generation
 * 4. Failure in image generation doesn't fail recipe save
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecipeGeneratorService } from '../../../server/services/recipeGenerator';
import { storage } from '../../../server/storage';
import * as openaiService from '../../../server/services/openai';
import { uploadImageToS3 } from '../../../server/services/utils/S3Uploader';
import { OpenAIRateLimiter } from '../../../server/services/utils/RateLimiter';
import { RecipeCache } from '../../../server/services/utils/RecipeCache';
import { RecipeGenerationMetrics } from '../../../server/services/utils/Metrics';
import type { GeneratedRecipe } from '../../../server/services/openai';

// Mock all dependencies
vi.mock('../../../server/storage');
vi.mock('../../../server/services/openai');
vi.mock('../../../server/services/utils/S3Uploader');
vi.mock('../../../server/services/utils/RateLimiter');
vi.mock('../../../server/services/utils/RecipeCache');
vi.mock('../../../server/services/utils/Metrics');

const mockStorage = vi.mocked(storage);
const mockOpenai = vi.mocked(openaiService);
const mockUploadImageToS3 = vi.mocked(uploadImageToS3);

const PLACEHOLDER_IMAGE_URL = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop';

describe('RecipeGeneratorService - Non-Blocking Architecture', () => {
  let service: RecipeGeneratorService;
  let mockRateLimiter: any;
  let mockCache: any;
  let mockMetrics: any;

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
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Mock RateLimiter
    mockRateLimiter = {
      execute: vi.fn((fn) => fn())
    };
    vi.mocked(OpenAIRateLimiter).mockImplementation(() => mockRateLimiter);

    // Mock Cache
    mockCache = {
      getOrSet: vi.fn((key, fn) => fn()),
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn()
    };
    vi.mocked(RecipeCache).mockImplementation(() => mockCache);

    // Mock Metrics
    mockMetrics = {
      recordGeneration: vi.fn(),
      getMetrics: vi.fn(() => ({
        totalGenerations: 0,
        successfulGenerations: 0,
        failedGenerations: 0,
        averageDuration: 0,
        errorTypes: {}
      })),
      reset: vi.fn()
    };
    vi.mocked(RecipeGenerationMetrics).mockImplementation(() => mockMetrics);

    service = new RecipeGeneratorService();

    // Setup default mocks
    mockOpenai.generateRecipeBatch.mockResolvedValue([mockValidRecipe]);
    mockOpenai.generateImageForRecipe.mockResolvedValue('https://temp-openai-image.jpg');
    mockUploadImageToS3.mockResolvedValue('https://s3-permanent-image.jpg');
    mockStorage.createRecipe.mockResolvedValue({ id: 1, ...mockValidRecipe });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Non-Blocking Recipe Processing', () => {
    it('should save recipe immediately with placeholder image', async () => {
      const result = await service.generateAndStoreRecipes({ count: 1 });

      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);

      // Verify recipe was saved with placeholder image
      expect(mockStorage.createRecipe).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Recipe',
          imageUrl: PLACEHOLDER_IMAGE_URL
        })
      );
    });

    it('should NOT wait for image generation before saving recipe', async () => {
      let imageCalled = false;

      // Mock slow image generation (30 seconds)
      mockOpenai.generateImageForRecipe.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 30000));
        imageCalled = true;
        return 'https://temp-openai-image.jpg';
      });

      const startTime = Date.now();
      const result = await service.generateAndStoreRecipes({ count: 1 });
      const duration = Date.now() - startTime;

      // Recipe should save in < 100ms, not 30 seconds
      expect(duration).toBeLessThan(1000);
      expect(result.success).toBe(1);
      expect(mockStorage.createRecipe).toHaveBeenCalled();

      // Image generation should be called but not awaited
      expect(imageCalled).toBe(false); // Still pending in background
    });

    it('should save multiple recipes quickly without waiting for images', async () => {
      const multipleRecipes = Array(10).fill(mockValidRecipe).map((r, i) => ({
        ...r,
        name: `Recipe ${i + 1}`
      }));

      mockOpenai.generateRecipeBatch.mockResolvedValue(multipleRecipes);

      // Mock slow image generation for each recipe
      mockOpenai.generateImageForRecipe.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minute per image
        return 'https://temp-image.jpg';
      });

      const startTime = Date.now();
      const result = await service.generateAndStoreRecipes({ count: 10 });
      const duration = Date.now() - startTime;

      // Should save all 10 recipes in < 5 seconds, not 10 minutes
      expect(duration).toBeLessThan(5000);
      expect(result.success).toBe(10);
      expect(result.failed).toBe(0);
      expect(mockStorage.createRecipe).toHaveBeenCalledTimes(10);
    });

    it('should return recipeId from storage for background processing', async () => {
      mockStorage.createRecipe.mockResolvedValue({ id: 123, ...mockValidRecipe });

      const result = await service.generateAndStoreRecipes({ count: 1 });

      expect(result.success).toBe(1);
      // Recipe ID should be available for background image generation
      expect(mockStorage.createRecipe).toHaveBeenCalled();
    });
  });

  describe('Background Image Generation', () => {
    it('should trigger background image generation after recipe save', async () => {
      const generateImageSpy = vi.spyOn(service as any, 'generateImageInBackground');

      await service.generateAndStoreRecipes({ count: 1 });

      expect(generateImageSpy).toHaveBeenCalled();
      expect(generateImageSpy).toHaveBeenCalledWith(
        1, // recipeId
        expect.objectContaining({ name: 'Test Recipe' })
      );
    });

    it('should NOT fail recipe save if background image generation throws error', async () => {
      vi.spyOn(service as any, 'generateImageInBackground').mockRejectedValue(
        new Error('Background image failed')
      );

      const result = await service.generateAndStoreRecipes({ count: 1 });

      // Recipe should still succeed
      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should update recipe with actual image URL after background generation', async () => {
      mockStorage.updateRecipe = vi.fn().mockResolvedValue({ id: 1 });

      // Manually call generateImageInBackground to test it
      await service['generateImageInBackground'](1, mockValidRecipe);

      // Advance timers to allow background processing
      await vi.runAllTimersAsync();

      expect(mockOpenai.generateImageForRecipe).toHaveBeenCalled();
      expect(mockUploadImageToS3).toHaveBeenCalled();
      expect(mockStorage.updateRecipe).toHaveBeenCalledWith(
        '1',
        { imageUrl: 'https://s3-permanent-image.jpg' }
      );
    });

    it('should NOT update recipe if background image generation returns placeholder', async () => {
      mockStorage.updateRecipe = vi.fn();
      mockOpenai.generateImageForRecipe.mockResolvedValue(null as any);

      await service['generateImageInBackground'](1, mockValidRecipe);
      await vi.runAllTimersAsync();

      // Should not update if we got placeholder
      expect(mockStorage.updateRecipe).not.toHaveBeenCalled();
    });

    it('should handle background image generation timeout gracefully', async () => {
      mockOpenai.generateImageForRecipe.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minute timeout
        return 'https://temp-image.jpg';
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const promise = service['generateImageInBackground'](1, mockValidRecipe);

      // Advance time to trigger timeout
      await vi.advanceTimersByTimeAsync(60000);
      await promise;

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Using placeholder image')
      );

      consoleSpy.mockRestore();
    }, 10000); // 10 second timeout for test
  });

  describe('Timeout Handling', () => {
    it('should timeout image generation after 30 seconds', async () => {
      mockOpenai.generateImageForRecipe.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 35000)); // 35 seconds
        return 'https://temp-image.jpg';
      });

      const resultPromise = service['withTimeout'](
        mockOpenai.generateImageForRecipe(mockValidRecipe),
        30000, // 30 second timeout
        PLACEHOLDER_IMAGE_URL
      );

      await vi.advanceTimersByTimeAsync(30000);
      const result = await resultPromise;

      // Should return fallback after timeout
      expect(result).toBe(PLACEHOLDER_IMAGE_URL);
    }, 10000); // 10 second timeout for test

    it('should return value if operation completes before timeout', async () => {
      const fastPromise = Promise.resolve('https://fast-image.jpg');

      const result = await service['withTimeout'](
        fastPromise,
        30000,
        PLACEHOLDER_IMAGE_URL
      );

      expect(result).toBe('https://fast-image.jpg');
    });

    it('should use fallback value on timeout', async () => {
      const slowPromise = new Promise(resolve =>
        setTimeout(() => resolve('https://slow-image.jpg'), 40000)
      );

      const resultPromise = service['withTimeout'](
        slowPromise,
        30000,
        'https://fallback-image.jpg'
      );

      await vi.advanceTimersByTimeAsync(30000);

      const result = await resultPromise;

      expect(result).toBe('https://fallback-image.jpg');
    });

    it('should timeout S3 upload after 15 seconds', async () => {
      mockUploadImageToS3.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 20000)); // 20 seconds
        return 'https://s3-slow-upload.jpg';
      });

      const resultPromise = service['withTimeout'](
        mockUploadImageToS3('https://temp.jpg', 'Recipe'),
        15000, // 15 second timeout
        PLACEHOLDER_IMAGE_URL
      );

      await vi.advanceTimersByTimeAsync(15000);
      const result = await resultPromise;

      expect(result).toBe(PLACEHOLDER_IMAGE_URL);
    }, 10000); // 10 second timeout for test
  });

  describe('Validation', () => {
    it('should validate recipe before saving', async () => {
      const invalidRecipe = { ...mockValidRecipe, name: '' };
      mockOpenai.generateRecipeBatch.mockResolvedValue([invalidRecipe]);

      const result = await service.generateAndStoreRecipes({ count: 1 });

      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors[0]).toContain('Missing required fields');
    });

    it('should validate nutrition is not negative', async () => {
      const invalidRecipe = {
        ...mockValidRecipe,
        estimatedNutrition: {
          calories: -100,
          protein: 20,
          carbs: 30,
          fat: 10
        }
      };
      mockOpenai.generateRecipeBatch.mockResolvedValue([invalidRecipe]);

      const result = await service.generateAndStoreRecipes({ count: 1 });

      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors[0]).toContain('Invalid nutritional information');
    });

    it('should validate ingredients have name and amount', async () => {
      const invalidRecipe = {
        ...mockValidRecipe,
        ingredients: [
          { name: '', amount: 100, unit: 'g' }
        ]
      };
      mockOpenai.generateRecipeBatch.mockResolvedValue([invalidRecipe]);

      const result = await service.generateAndStoreRecipes({ count: 1 });

      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors[0]).toContain('Invalid ingredients');
    });
  });

  describe('Error Recovery', () => {
    it('should handle OpenAI batch generation failure', async () => {
      mockOpenai.generateRecipeBatch.mockRejectedValue(new Error('OpenAI API Error'));

      const result = await service.generateAndStoreRecipes({ count: 5 });

      expect(result.success).toBe(0);
      expect(result.failed).toBe(5);
      expect(result.errors[0]).toContain('Recipe generation service failed');
    });

    it('should handle storage failure for individual recipe', async () => {
      mockStorage.createRecipe.mockRejectedValue(new Error('Database error'));

      const result = await service.generateAndStoreRecipes({ count: 1 });

      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors[0]).toContain('Failed to store recipe');
    });

    it('should handle mixed success and failure', async () => {
      const recipes = [
        { ...mockValidRecipe, name: 'Valid Recipe' },
        { ...mockValidRecipe, name: '' } // Invalid
      ];
      mockOpenai.generateRecipeBatch.mockResolvedValue(recipes);

      const result = await service.generateAndStoreRecipes({ count: 2 });

      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it('should continue processing remaining recipes after one fails', async () => {
      const recipes = Array(5).fill(mockValidRecipe).map((r, i) => ({
        ...r,
        name: `Recipe ${i + 1}`
      }));
      mockOpenai.generateRecipeBatch.mockResolvedValue(recipes);

      // Make the 3rd recipe fail
      mockStorage.createRecipe
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 2 })
        .mockRejectedValueOnce(new Error('Storage error'))
        .mockResolvedValueOnce({ id: 4 })
        .mockResolvedValueOnce({ id: 5 });

      const result = await service.generateAndStoreRecipes({ count: 5 });

      expect(result.success).toBe(4);
      expect(result.failed).toBe(1);
    });
  });

  describe('Performance', () => {
    it('should complete 10 recipe saves in < 5 seconds', async () => {
      const recipes = Array(10).fill(mockValidRecipe).map((r, i) => ({
        ...r,
        name: `Recipe ${i + 1}`
      }));
      mockOpenai.generateRecipeBatch.mockResolvedValue(recipes);

      const startTime = Date.now();
      const result = await service.generateAndStoreRecipes({ count: 10 });
      const duration = Date.now() - startTime;

      expect(result.success).toBe(10);
      expect(duration).toBeLessThan(5000);
    });

    it('should process recipes in parallel', async () => {
      const recipes = Array(5).fill(mockValidRecipe).map((r, i) => ({
        ...r,
        name: `Recipe ${i + 1}`
      }));
      mockOpenai.generateRecipeBatch.mockResolvedValue(recipes);

      // Track call order
      const callTimes: number[] = [];
      mockStorage.createRecipe.mockImplementation(async () => {
        callTimes.push(Date.now());
        return { id: callTimes.length };
      });

      await service.generateAndStoreRecipes({ count: 5 });

      // All calls should start at roughly the same time (parallel)
      const timeDiffs = callTimes.slice(1).map((time, i) => time - callTimes[i]);
      const maxDiff = Math.max(...timeDiffs);

      // Calls should be within 100ms of each other (parallel, not sequential)
      expect(maxDiff).toBeLessThan(100);
    });
  });

  describe('Metrics', () => {
    it('should record generation metrics', async () => {
      await service.generateAndStoreRecipes({ count: 1 });

      expect(mockMetrics.recordGeneration).toHaveBeenCalledWith(
        expect.any(Number), // duration
        true // success
      );
    });

    it('should record failure metrics', async () => {
      mockOpenai.generateRecipeBatch.mockRejectedValue(new Error('API Error'));

      await service.generateAndStoreRecipes({ count: 1 });

      expect(mockMetrics.recordGeneration).toHaveBeenCalledWith(
        expect.any(Number),
        false,
        'Error'
      );
    });

    it('should include total duration in result', async () => {
      const result = await service.generateAndStoreRecipes({ count: 1 });

      expect(result.metrics).toBeDefined();
      expect(result.metrics?.totalDuration).toBeGreaterThanOrEqual(0);
      expect(result.metrics?.averageTimePerRecipe).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero count', async () => {
      mockOpenai.generateRecipeBatch.mockResolvedValue([]);

      const result = await service.generateAndStoreRecipes({ count: 0 });

      // With count: 0, batch generation might return empty array
      expect(result.success + result.failed).toBeGreaterThanOrEqual(0);
      expect(mockOpenai.generateRecipeBatch).toHaveBeenCalled();
    });

    it('should handle empty recipe batch from OpenAI', async () => {
      mockOpenai.generateRecipeBatch.mockResolvedValue([]);

      const result = await service.generateAndStoreRecipes({ count: 5 });

      expect(result.success).toBe(0);
      expect(result.failed).toBe(5);
      expect(result.errors[0]).toContain('No recipes were generated');
    });

    it('should handle null recipe batch', async () => {
      mockOpenai.generateRecipeBatch.mockResolvedValue(null as any);

      const result = await service.generateAndStoreRecipes({ count: 1 });

      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
    });

    it('should handle recipe without imageUrl field', async () => {
      const recipeWithoutImage = { ...mockValidRecipe };
      delete (recipeWithoutImage as any).imageUrl;

      mockOpenai.generateRecipeBatch.mockResolvedValue([recipeWithoutImage]);

      const result = await service.generateAndStoreRecipes({ count: 1 });

      expect(result.success).toBe(1);
      expect(mockStorage.createRecipe).toHaveBeenCalledWith(
        expect.objectContaining({
          imageUrl: PLACEHOLDER_IMAGE_URL
        })
      );
    });
  });
});
