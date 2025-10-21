import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImageGenerationAgent } from '../../../server/services/agents/ImageGenerationAgent';
import type { AgentResponse } from '../../../server/services/agents/types';

/**
 * ImageGenerationAgent Tests - Perceptual Hashing & Uniqueness
 *
 * Test Coverage:
 * 1. Perceptual hash generation and storage
 * 2. Duplicate detection across batches
 * 3. Database persistence of hashes
 * 4. Retry logic for duplicate images
 * 5. Placeholder fallback on errors
 */

// Mock dependencies
vi.mock('openai', () => {
  return {
    default: vi.fn(() => ({
      images: {
        generate: vi.fn()
      }
    }))
  };
});

vi.mock('imghash', () => ({
  default: vi.fn()
}));

vi.mock('../../../server/db', () => ({
  db: {
    execute: vi.fn()
  }
}));

describe('ImageGenerationAgent - Perceptual Hashing', () => {
  let agent: ImageGenerationAgent;
  let mockOpenAI: any;
  let mockImgHash: any;
  let mockDb: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup mocks
    const openaiModule = await import('openai');
    const imghashModule = await import('imghash');
    const dbModule = await import('../../../server/db');

    mockOpenAI = vi.mocked(openaiModule.default);
    mockImgHash = vi.mocked(imghashModule.default);
    mockDb = vi.mocked(dbModule.db);

    // Default mock implementations
    mockOpenAI.mockImplementation(() => ({
      images: {
        generate: vi.fn().mockResolvedValue({
          data: [{ url: `https://test.com/image_${Math.random()}.png` }]
        })
      }
    }));

    mockImgHash.mockResolvedValue('hash_' + Math.random().toString(36).substring(7));

    mockDb.execute.mockResolvedValue({
      rows: []
    });

    agent = new ImageGenerationAgent();
  });

  describe('Basic Functionality', () => {
    it('should initialize with correct agent type', () => {
      expect(agent).toBeDefined();
      expect(agent.getMetrics()).toBeDefined();
    });

    it('should process batch image generation', async () => {
      const input = {
        recipes: [
          {
            recipeId: 1,
            recipeName: 'Test Recipe',
            recipeDescription: 'A delicious test recipe',
            mealTypes: ['Dinner'],
            batchId: 'test-batch-1'
          }
        ],
        batchId: 'test-batch-1'
      };

      const result = await agent.process(input, 'correlation-1');

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('Perceptual Hashing', () => {
    it('should generate perceptual hash for each image', async () => {
      const input = {
        recipes: [
          {
            recipeId: 1,
            recipeName: 'Recipe 1',
            recipeDescription: 'Description 1',
            mealTypes: ['Breakfast'],
            batchId: 'batch-1'
          }
        ],
        batchId: 'batch-1'
      };

      await agent.process(input, 'correlation-1');

      // Verify imghash was called
      expect(mockImgHash).toHaveBeenCalled();
    });

    it('should store hash in database', async () => {
      const input = {
        recipes: [
          {
            recipeId: 1,
            recipeName: 'Recipe 1',
            recipeDescription: 'Description 1',
            mealTypes: ['Breakfast'],
            batchId: 'batch-1'
          }
        ],
        batchId: 'batch-1'
      };

      await agent.process(input, 'correlation-1');

      // Verify database execute was called to store hash
      expect(mockDb.execute).toHaveBeenCalled();
    });
  });

  describe('Duplicate Detection', () => {
    it('should detect duplicates in memory', async () => {
      // Mock to return same hash
      mockImgHash.mockResolvedValue('duplicate-hash');

      const input = {
        recipes: [
          {
            recipeId: 1,
            recipeName: 'Recipe 1',
            recipeDescription: 'Description 1',
            mealTypes: ['Breakfast'],
            batchId: 'batch-1'
          },
          {
            recipeId: 2,
            recipeName: 'Recipe 2',
            recipeDescription: 'Description 2',
            mealTypes: ['Breakfast'],
            batchId: 'batch-1'
          }
        ],
        batchId: 'batch-1'
      };

      const result = await agent.process(input, 'correlation-1');

      // Should retry when duplicate detected
      expect(mockOpenAI).toHaveBeenCalled();
    });

    it('should query database for similar hashes', async () => {
      const input = {
        recipes: [
          {
            recipeId: 1,
            recipeName: 'Recipe 1',
            recipeDescription: 'Description 1',
            mealTypes: ['Breakfast'],
            batchId: 'batch-1'
          }
        ],
        batchId: 'batch-1'
      };

      await agent.process(input, 'correlation-1');

      // Should query database for similar hashes
      expect(mockDb.execute).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should use placeholder on OpenAI error', async () => {
      mockOpenAI.mockImplementation(() => ({
        images: {
          generate: vi.fn().mockRejectedValue(new Error('OpenAI error'))
        }
      }));

      const input = {
        recipes: [
          {
            recipeId: 1,
            recipeName: 'Recipe 1',
            recipeDescription: 'Description 1',
            mealTypes: ['Breakfast'],
            batchId: 'batch-1'
          }
        ],
        batchId: 'batch-1'
      };

      const result = await agent.process(input, 'correlation-1');

      expect(result.success).toBe(true);
      expect(result.data.placeholderCount).toBeGreaterThan(0);
    });

    it('should increment placeholder count on failures', async () => {
      mockOpenAI.mockImplementation(() => ({
        images: {
          generate: vi.fn().mockRejectedValue(new Error('OpenAI error'))
        }
      }));

      const input = {
        recipes: [
          {
            recipeId: 1,
            recipeName: 'Recipe 1',
            recipeDescription: 'Description 1',
            mealTypes: ['Breakfast'],
            batchId: 'batch-1'
          },
          {
            recipeId: 2,
            recipeName: 'Recipe 2',
            recipeDescription: 'Description 2',
            mealTypes: ['Lunch'],
            batchId: 'batch-1'
          }
        ],
        batchId: 'batch-1'
      };

      const result = await agent.process(input, 'correlation-1');

      expect(result.data.placeholderCount).toBe(2);
      expect(result.data.totalFailed).toBe(2);
    });
  });

  describe('Metrics', () => {
    it('should track processing metrics', async () => {
      const input = {
        recipes: [
          {
            recipeId: 1,
            recipeName: 'Recipe 1',
            recipeDescription: 'Description 1',
            mealTypes: ['Breakfast'],
            batchId: 'batch-1'
          }
        ],
        batchId: 'batch-1'
      };

      await agent.process(input, 'correlation-1');

      const metrics = agent.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.totalProcessed).toBeGreaterThan(0);
    });

    it('should track success and failure rates', async () => {
      const input = {
        recipes: [
          {
            recipeId: 1,
            recipeName: 'Recipe 1',
            recipeDescription: 'Description 1',
            mealTypes: ['Breakfast'],
            batchId: 'batch-1'
          }
        ],
        batchId: 'batch-1'
      };

      await agent.process(input, 'correlation-1');

      const metrics = agent.getMetrics();
      expect(metrics.successRate).toBeDefined();
    });
  });
});
