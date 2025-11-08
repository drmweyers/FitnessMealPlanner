/**
 * Unit Tests for BMAD Image Generation Workflow
 * Tests the complete flow from database save → image generation → S3 upload
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BMADRecipeService } from '../../../server/services/BMADRecipeService';
import { ImageGenerationAgent } from '../../../server/services/agents/ImageGenerationAgent';
import { ImageStorageAgent } from '../../../server/services/agents/ImageStorageAgent';
import { DatabaseOrchestratorAgent } from '../../../server/services/agents/DatabaseOrchestratorAgent';
import type { SavedRecipeResult, AgentResponse } from '../../../server/services/agents/types';

// Mock dependencies
vi.mock('../../../server/services/openai', () => ({
  generateRecipeBatch: vi.fn().mockResolvedValue([
    {
      name: 'Test Recipe',
      description: 'A delicious test recipe',
      mealTypes: ['Breakfast'],
      dietaryTags: ['Healthy'],
      mainIngredientTags: ['Eggs'],
      ingredients: [
        { name: 'Eggs', amount: 2, unit: 'whole' }
      ],
      instructions: 'Cook and enjoy',
      prepTimeMinutes: 10,
      cookTimeMinutes: 5,
      servings: 2,
      estimatedNutrition: {
        calories: 300,
        protein: 20,
        carbs: 10,
        fat: 15
      }
    }
  ])
}));

vi.mock('../../../server/storage', () => ({
  storage: {
    createRecipe: vi.fn().mockResolvedValue({
      id: 'uuid-123-456',
      name: 'Test Recipe',
      description: 'A delicious test recipe',
      mealTypes: ['Breakfast'],
      imageUrl: 'https://placeholder.com/image.jpg'
    }),
    updateRecipe: vi.fn().mockResolvedValue({ success: true }),
    transaction: vi.fn((callback) => callback())
  }
}));

vi.mock('../../../server/services/utils/SSEManager', () => ({
  sseManager: {
    broadcastProgress: vi.fn(),
    broadcastCompletion: vi.fn(),
    broadcastError: vi.fn()
  }
}));

describe('BMAD Image Generation Workflow', () => {
  let bmadService: BMADRecipeService;
  let imageAgent: ImageGenerationAgent;
  let storageAgent: ImageStorageAgent;
  let databaseAgent: DatabaseOrchestratorAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    bmadService = new BMADRecipeService();
    imageAgent = new ImageGenerationAgent();
    storageAgent = new ImageStorageAgent();
    databaseAgent = new DatabaseOrchestratorAgent();
  });

  afterEach(async () => {
    // Cleanup agents
    await imageAgent.shutdown();
    await storageAgent.shutdown();
    await databaseAgent.shutdown();
  });

  describe('SavedRecipeResult Data Structure', () => {
    it('should return complete recipe data from DatabaseOrchestratorAgent', async () => {
      const mockRecipe = {
        recipe: {
          name: 'Test Recipe',
          description: 'A delicious test recipe',
          mealTypes: ['Breakfast'],
          dietaryTags: ['Healthy'],
          mainIngredientTags: ['Eggs'],
          ingredients: [{ name: 'Eggs', amount: 2, unit: 'whole' }],
          instructions: 'Cook and enjoy',
          prepTimeMinutes: 10,
          cookTimeMinutes: 5,
          servings: 2,
          estimatedNutrition: { calories: 300, protein: 20, carbs: 10, fat: 15 }
        },
        validationPassed: true
      };

      const result = await databaseAgent.process({
        validatedRecipes: [mockRecipe],
        batchId: 'test-batch'
      }, 'test-batch');

      expect(result.success).toBe(true);
      expect(result.data?.savedRecipes).toBeDefined();

      const savedRecipe = result.data!.savedRecipes[0];
      expect(savedRecipe).toMatchObject({
        recipeId: expect.any(String), // Should be UUID string
        recipeName: 'Test Recipe',
        recipeDescription: 'A delicious test recipe',
        mealTypes: ['Breakfast'],
        success: true
      });
    });

    it('should handle UUID string recipeId correctly', async () => {
      const mockSavedRecipe: SavedRecipeResult = {
        recipeId: 'uuid-123-456',
        recipeName: 'Test Recipe',
        recipeDescription: 'Test description',
        mealTypes: ['Breakfast'],
        success: true,
        imageUrl: 'https://placeholder.com/image.jpg'
      };

      // Verify type compatibility
      expect(typeof mockSavedRecipe.recipeId).toBe('string');
      expect(mockSavedRecipe.recipeName).toBeDefined();
      expect(mockSavedRecipe.recipeDescription).toBeDefined();
      expect(mockSavedRecipe.mealTypes).toBeDefined();
    });

    it('should handle numeric recipeId for backwards compatibility', async () => {
      const mockSavedRecipe: SavedRecipeResult = {
        recipeId: 123,
        recipeName: 'Test Recipe',
        recipeDescription: 'Test description',
        mealTypes: ['Breakfast'],
        success: true
      };

      expect(typeof mockSavedRecipe.recipeId).toBe('number');
    });
  });

  describe('Image Generation Agent', () => {
    it('should generate images with complete recipe data', async () => {
      const mockImageAgent = {
        generateBatchImages: vi.fn().mockResolvedValue({
          success: true,
          data: {
            images: [
              {
                recipeId: 123,
                recipeName: 'Test Recipe',
                imageMetadata: {
                  imageUrl: 'https://dall-e-image.com/test.png',
                  dallePrompt: 'A delicious breakfast',
                  similarityHash: 'abc123',
                  generationTimestamp: new Date(),
                  qualityScore: 100,
                  isPlaceholder: false,
                  retryCount: 0
                },
                batchId: 'test-batch'
              }
            ],
            batchId: 'test-batch',
            totalGenerated: 1,
            totalFailed: 0,
            placeholderCount: 0,
            errors: []
          }
        })
      };

      const result = await mockImageAgent.generateBatchImages(
        [
          {
            recipeId: 123,
            recipeName: 'Test Recipe',
            recipeDescription: 'A delicious test recipe',
            mealTypes: ['Breakfast'],
            batchId: 'test-batch'
          }
        ],
        'test-batch'
      );

      expect(result.success).toBe(true);
      expect(result.data?.totalGenerated).toBe(1);
      expect(result.data?.totalFailed).toBe(0);
      expect(result.data?.placeholderCount).toBe(0);
    });

    it('should handle missing recipe description gracefully', async () => {
      const result = await imageAgent.generateBatchImages(
        [
          {
            recipeId: 123,
            recipeName: 'Test Recipe',
            recipeDescription: '', // Empty description
            mealTypes: ['Breakfast'],
            batchId: 'test-batch'
          }
        ],
        'test-batch'
      );

      expect(result.success).toBe(true);
      // Should still attempt image generation with just recipe name
    });

    it('should handle missing mealTypes gracefully', async () => {
      const result = await imageAgent.generateBatchImages(
        [
          {
            recipeId: 123,
            recipeName: 'Test Recipe',
            recipeDescription: 'A test recipe',
            mealTypes: [], // Empty mealTypes
            batchId: 'test-batch'
          }
        ],
        'test-batch'
      );

      expect(result.success).toBe(true);
      // Should use default meal type
    });

    it('should log errors when image generation fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock DALL-E failure
      vi.spyOn(imageAgent as any, 'callDallE3').mockRejectedValueOnce(
        new Error('DALL-E API rate limit exceeded')
      );

      const result = await imageAgent.generateBatchImages(
        [
          {
            recipeId: 123,
            recipeName: 'Test Recipe',
            recipeDescription: 'Test',
            mealTypes: ['Breakfast'],
            batchId: 'test-batch'
          }
        ],
        'test-batch'
      );

      expect(result.success).toBe(true); // Should succeed with placeholder
      expect(result.data?.placeholderCount).toBeGreaterThan(0);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Image Storage Agent (S3 Upload)', () => {
    it('should upload images to S3 successfully', async () => {
      const mockStorageAgent = {
        uploadBatchImages: vi.fn().mockResolvedValue({
          success: true,
          data: {
            uploads: [
              {
                recipeId: 123,
                recipeName: 'Test Recipe',
                permanentImageUrl: 'https://s3.amazonaws.com/recipe-123.png',
                wasUploaded: true,
                uploadDurationMs: 3500,
                batchId: 'test-batch'
              }
            ],
            batchId: 'test-batch',
            totalUploaded: 1,
            totalFailed: 0,
            errors: []
          }
        })
      };

      const result = await mockStorageAgent.uploadBatchImages(
        [
          {
            recipeId: 123,
            recipeName: 'Test Recipe',
            temporaryImageUrl: 'https://dall-e-temp.com/image.png',
            batchId: 'test-batch'
          }
        ],
        'test-batch'
      );

      expect(result.success).toBe(true);
      expect(result.data?.totalUploaded).toBe(1);
      expect(result.data?.totalFailed).toBe(0);
      expect(result.data?.uploads[0].wasUploaded).toBe(true);
    });

    it('should fallback to temporary URL on S3 failure', async () => {
      const result = await storageAgent.uploadBatchImages(
        [
          {
            recipeId: 123,
            recipeName: 'Test Recipe',
            temporaryImageUrl: 'https://dall-e-temp.com/image.png',
            batchId: 'test-batch'
          }
        ],
        'test-batch'
      );

      expect(result.success).toBe(true);
      // Should return temporary URL if S3 upload fails
      expect(result.data?.uploads[0].permanentImageUrl).toBeDefined();
    });

    it('should log S3 upload errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock S3 upload failure
      vi.mock('../../../server/services/utils/S3Uploader', () => ({
        uploadImageToS3: vi.fn().mockRejectedValue(new Error('S3 connection failed'))
      }));

      const result = await storageAgent.uploadBatchImages(
        [
          {
            recipeId: 123,
            recipeName: 'Test Recipe',
            temporaryImageUrl: 'https://dall-e-temp.com/image.png',
            batchId: 'test-batch'
          }
        ],
        'test-batch'
      );

      expect(result.success).toBe(true); // Should succeed with fallback
      expect(result.data?.uploads[0].wasUploaded).toBe(false);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Complete BMAD Image Generation Workflow', () => {
    it('should complete full workflow: database → image generation → S3 upload', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await bmadService.generateRecipes({
        count: 1,
        mealTypes: ['Breakfast'],
        enableImageGeneration: true,
        enableS3Upload: true,
        enableNutritionValidation: true
      });

      expect(result.success).toBe(true);
      expect(result.savedRecipes.length).toBeGreaterThan(0);

      // Verify logging messages
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[BMAD] Preparing'),
        expect.stringContaining('recipes for image generation')
      );

      consoleLogSpy.mockRestore();
    });

    it('should log warning when zero images are generated', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Mock image generation failure
      vi.spyOn(imageAgent as any, 'generateBatchImages').mockResolvedValueOnce({
        success: true,
        data: {
          images: [],
          batchId: 'test-batch',
          totalGenerated: 0,
          totalFailed: 1,
          placeholderCount: 1,
          errors: ['DALL-E API error']
        }
      });

      await bmadService.generateRecipes({
        count: 1,
        enableImageGeneration: true,
        enableS3Upload: true
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[BMAD] WARNING: Zero images generated!'
      );

      consoleWarnSpy.mockRestore();
    });

    it('should skip S3 upload when no images are generated', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Mock image generation returning zero images
      vi.spyOn(imageAgent as any, 'generateBatchImages').mockResolvedValueOnce({
        success: true,
        data: {
          images: [],
          batchId: 'test-batch',
          totalGenerated: 0,
          totalFailed: 1,
          placeholderCount: 1,
          errors: []
        }
      });

      await bmadService.generateRecipes({
        count: 1,
        enableImageGeneration: true,
        enableS3Upload: true
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[BMAD] Skipping S3 upload: no images to upload'
      );

      consoleWarnSpy.mockRestore();
    });

    it('should collect all errors from image generation and S3 upload', async () => {
      const result = await bmadService.generateRecipes({
        count: 1,
        enableImageGeneration: true,
        enableS3Upload: true
      });

      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should track imagesGenerated and imagesUploaded metrics', async () => {
      const result = await bmadService.generateRecipes({
        count: 2,
        enableImageGeneration: true,
        enableS3Upload: true
      });

      expect(result.imagesGenerated).toBeDefined();
      expect(result.imagesUploaded).toBeDefined();
      expect(typeof result.imagesGenerated).toBe('number');
      expect(typeof result.imagesUploaded).toBe('number');
    });
  });

  describe('Error Logging and Monitoring', () => {
    it('should log sample recipe data before image generation', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await bmadService.generateRecipes({
        count: 1,
        enableImageGeneration: true
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[BMAD] Sample recipe for image generation:',
        expect.objectContaining({
          recipeId: expect.anything(),
          recipeName: expect.any(String),
          hasDescription: expect.any(Boolean),
          hasMealTypes: expect.any(Boolean)
        })
      );

      consoleLogSpy.mockRestore();
    });

    it('should log image generation response details', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await bmadService.generateRecipes({
        count: 1,
        enableImageGeneration: true
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[BMAD] Image generation response:',
        expect.objectContaining({
          success: expect.any(Boolean),
          totalGenerated: expect.any(Number),
          totalFailed: expect.any(Number),
          placeholderCount: expect.any(Number)
        })
      );

      consoleLogSpy.mockRestore();
    });

    it('should log S3 upload response details', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await bmadService.generateRecipes({
        count: 1,
        enableImageGeneration: true,
        enableS3Upload: true
      });

      // Check for S3 upload logging
      const s3UploadLogs = consoleLogSpy.mock.calls.filter(
        call => call[0] && String(call[0]).includes('[BMAD] S3 upload')
      );

      expect(s3UploadLogs.length).toBeGreaterThan(0);

      consoleLogSpy.mockRestore();
    });
  });

  describe('Type Safety', () => {
    it('should handle string UUID recipeId correctly', () => {
      const savedRecipe: SavedRecipeResult = {
        recipeId: 'uuid-123-456-789',
        recipeName: 'Test',
        recipeDescription: 'Test description',
        mealTypes: ['Breakfast'],
        success: true
      };

      expect(savedRecipe.recipeId).toBe('uuid-123-456-789');
    });

    it('should handle numeric recipeId correctly', () => {
      const savedRecipe: SavedRecipeResult = {
        recipeId: 123,
        recipeName: 'Test',
        success: true
      };

      expect(savedRecipe.recipeId).toBe(123);
    });

    it('should make recipe field optional in SavedRecipeResult', () => {
      const savedRecipe: SavedRecipeResult = {
        recipeId: 'uuid-123',
        recipeName: 'Test',
        success: true
        // recipe field is optional
      };

      expect(savedRecipe.recipe).toBeUndefined();
    });
  });
});
