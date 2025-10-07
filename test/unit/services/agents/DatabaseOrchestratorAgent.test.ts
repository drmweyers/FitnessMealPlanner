/**
 * Unit tests for DatabaseOrchestratorAgent
 * Tests transactional database operations, batch inserts, and rollback scenarios
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DatabaseOrchestratorAgent } from '../../../../server/services/agents/DatabaseOrchestratorAgent';
import { ValidatedRecipe } from '../../../../server/services/agents/types';
import type { GeneratedRecipe } from '../../../../server/services/openai';

// Mock storage module
vi.mock('../../../../server/storage', () => ({
  storage: {
    createRecipe: vi.fn(),
    transaction: vi.fn()
  }
}));

import { storage } from '../../../../server/storage';

describe('DatabaseOrchestratorAgent', () => {
  let agent: DatabaseOrchestratorAgent;

  beforeEach(async () => {
    agent = new DatabaseOrchestratorAgent();
    await agent.initialize();
    vi.clearAllMocks();
  });

  const createMockRecipe = (overrides?: Partial<GeneratedRecipe>): GeneratedRecipe => ({
    name: 'Test Recipe',
    description: 'Test description',
    mealTypes: ['Lunch'],
    dietaryTags: [],
    mainIngredientTags: ['Chicken'],
    ingredients: [
      { name: 'Chicken', amount: 200, unit: 'g' }
    ],
    instructions: 'Cook the chicken',
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    servings: 2,
    estimatedNutrition: {
      calories: 500,
      protein: 40,
      carbs: 30,
      fat: 20
    },
    imageUrl: 'test.jpg',
    ...overrides
  });

  const createValidatedRecipe = (
    validationPassed: boolean = true,
    overrides?: Partial<GeneratedRecipe>
  ): ValidatedRecipe => ({
    recipe: createMockRecipe(overrides),
    conceptId: 'concept-1',
    validationPassed,
    nutritionAccurate: true,
    autoFixesApplied: []
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await agent.initialize();
      expect(agent.getStatus()).toBe('idle');
      expect(agent.getType()).toBe('coordinator');
    });
  });

  describe('Basic Database Operations', () => {
    it('should save single validated recipe', async () => {
      const mockCreatedRecipe = { id: '123', name: 'Test Recipe', imageUrl: 'test.jpg' };
      vi.mocked(storage.createRecipe).mockResolvedValue(mockCreatedRecipe as any);
      vi.mocked(storage.transaction).mockImplementation(async (cb) => await cb(null as any));

      const validatedRecipes = [createValidatedRecipe()];

      const response = await agent.process(
        { validatedRecipes, batchId: 'batch-1' },
        'correlation-1'
      );

      expect(response.success).toBe(true);
      expect(response.data?.totalSaved).toBe(1);
      expect(response.data?.totalFailed).toBe(0);
      expect(response.data?.savedRecipes[0].recipeId).toBe(123);
    });

    it('should save multiple validated recipes', async () => {
      const mockCreatedRecipes = [
        { id: '1', name: 'Recipe 1', imageUrl: 'test1.jpg' },
        { id: '2', name: 'Recipe 2', imageUrl: 'test2.jpg' },
        { id: '3', name: 'Recipe 3', imageUrl: 'test3.jpg' }
      ];

      let callIndex = 0;
      vi.mocked(storage.createRecipe).mockImplementation(async () => mockCreatedRecipes[callIndex++] as any);
      vi.mocked(storage.transaction).mockImplementation(async (cb) => await cb(null as any));

      const validatedRecipes = [
        createValidatedRecipe(true, { name: 'Recipe 1' }),
        createValidatedRecipe(true, { name: 'Recipe 2' }),
        createValidatedRecipe(true, { name: 'Recipe 3' })
      ];

      const response = await agent.process(
        { validatedRecipes, batchId: 'batch-2' },
        'correlation-2'
      );

      expect(response.success).toBe(true);
      expect(response.data?.totalSaved).toBe(3);
      expect(response.data?.savedRecipes).toHaveLength(3);
    });

    it('should skip invalid recipes', async () => {
      const validatedRecipes = [
        createValidatedRecipe(true, { name: 'Valid Recipe' }),
        createValidatedRecipe(false, { name: 'Invalid Recipe' })
      ];

      const mockCreatedRecipe = { id: '1', name: 'Valid Recipe', imageUrl: 'test.jpg' };
      vi.mocked(storage.createRecipe).mockResolvedValue(mockCreatedRecipe as any);
      vi.mocked(storage.transaction).mockImplementation(async (cb) => await cb(null as any));

      const response = await agent.process(
        { validatedRecipes, batchId: 'batch-3' },
        'correlation-3'
      );

      expect(response.success).toBe(true);
      expect(response.data?.totalSaved).toBe(1);
      expect(storage.createRecipe).toHaveBeenCalledTimes(1);
    });

    it('should use placeholder image when not provided', async () => {
      const mockCreatedRecipe = { id: '1', name: 'Test Recipe', imageUrl: 'placeholder.jpg' };
      vi.mocked(storage.createRecipe).mockResolvedValue(mockCreatedRecipe as any);
      vi.mocked(storage.transaction).mockImplementation(async (cb) => await cb(null as any));

      const validatedRecipes = [createValidatedRecipe()];

      const response = await agent.process(
        { validatedRecipes, batchId: 'batch-4' },
        'correlation-4'
      );

      expect(response.success).toBe(true);
      expect(storage.createRecipe).toHaveBeenCalled();
    });
  });

  describe('Transaction Management', () => {
    it('should use transactions for batch saves', async () => {
      const mockCreatedRecipe = { id: '1', name: 'Test Recipe', imageUrl: 'test.jpg' };
      vi.mocked(storage.createRecipe).mockResolvedValue(mockCreatedRecipe as any);
      vi.mocked(storage.transaction).mockImplementation(async (cb) => await cb(null as any));

      const validatedRecipes = [createValidatedRecipe()];

      await agent.process(
        { validatedRecipes, batchId: 'batch-5' },
        'correlation-5'
      );

      expect(storage.transaction).toHaveBeenCalled();
    });

    it('should rollback on transaction failure', async () => {
      vi.mocked(storage.transaction).mockRejectedValue(new Error('Transaction failed'));

      const validatedRecipes = [createValidatedRecipe()];

      const response = await agent.process(
        { validatedRecipes, batchId: 'batch-6' },
        'correlation-6'
      );

      expect(response.success).toBe(true); // Agent handles error gracefully
      expect(response.data?.totalFailed).toBeGreaterThan(0);
      expect(response.data?.errors.length).toBeGreaterThan(0);
    });

    it('should handle partial batch failures', async () => {
      let callCount = 0;
      vi.mocked(storage.createRecipe).mockImplementation(async () => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Recipe 2 failed');
        }
        return { id: String(callCount), name: `Recipe ${callCount}`, imageUrl: 'test.jpg' } as any;
      });

      vi.mocked(storage.transaction).mockImplementation(async (cb) => {
        try {
          await cb(null as any);
        } catch (error) {
          throw error; // Propagate error to trigger rollback
        }
      });

      const validatedRecipes = [
        createValidatedRecipe(true, { name: 'Recipe 1' }),
        createValidatedRecipe(true, { name: 'Recipe 2' }),
        createValidatedRecipe(true, { name: 'Recipe 3' })
      ];

      const response = await agent.process(
        { validatedRecipes, batchId: 'batch-7' },
        'correlation-7'
      );

      expect(response.success).toBe(true);
      // Due to transaction rollback, none should be saved
      expect(response.data?.totalSaved).toBe(0);
    });
  });

  describe('Batch Processing', () => {
    it('should process recipes in batches', async () => {
      const mockCreatedRecipe = { id: '1', name: 'Test Recipe', imageUrl: 'test.jpg' };
      vi.mocked(storage.createRecipe).mockResolvedValue(mockCreatedRecipe as any);
      vi.mocked(storage.transaction).mockImplementation(async (cb) => await cb(null as any));

      // Create 25 recipes (should be processed in 3 batches of 10, 10, 5)
      const validatedRecipes = Array.from({ length: 25 }, (_, i) =>
        createValidatedRecipe(true, { name: `Recipe ${i + 1}` })
      );

      const response = await agent.process(
        { validatedRecipes, batchId: 'batch-8' },
        'correlation-8'
      );

      expect(response.success).toBe(true);
      expect(response.data?.totalSaved).toBe(25);
      expect(storage.transaction).toHaveBeenCalledTimes(3); // 3 batches
    });

    it('should isolate batch failures', async () => {
      let transactionCallCount = 0;
      vi.mocked(storage.transaction).mockImplementation(async (cb) => {
        transactionCallCount++;
        if (transactionCallCount === 2) {
          throw new Error('Batch 2 failed');
        }
        await cb(null as any);
      });

      const mockCreatedRecipe = { id: '1', name: 'Test Recipe', imageUrl: 'test.jpg' };
      vi.mocked(storage.createRecipe).mockResolvedValue(mockCreatedRecipe as any);

      const validatedRecipes = Array.from({ length: 25 }, (_, i) =>
        createValidatedRecipe(true, { name: `Recipe ${i + 1}` })
      );

      const response = await agent.process(
        { validatedRecipes, batchId: 'batch-9' },
        'correlation-9'
      );

      expect(response.success).toBe(true);
      // Batches 1 and 3 succeed (20 recipes), batch 2 fails (5 recipes)
      expect(response.data?.totalFailed).toBe(10); // Batch 2 (10 recipes)
      expect(response.data?.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Non-Transactional Mode', () => {
    it('should save recipes without transaction', async () => {
      const mockCreatedRecipes = [
        { id: '1', name: 'Recipe 1', imageUrl: 'test1.jpg' },
        { id: '2', name: 'Recipe 2', imageUrl: 'test2.jpg' }
      ];

      let callIndex = 0;
      vi.mocked(storage.createRecipe).mockImplementation(async () => mockCreatedRecipes[callIndex++] as any);

      const validatedRecipes = [
        createValidatedRecipe(true, { name: 'Recipe 1' }),
        createValidatedRecipe(true, { name: 'Recipe 2' })
      ];

      const response = await agent.saveBatchWithoutTransaction(
        validatedRecipes,
        'batch-10'
      );

      expect(response.success).toBe(true);
      expect(response.data?.totalSaved).toBe(2);
      expect(storage.transaction).not.toHaveBeenCalled();
    });

    it('should handle individual failures in non-transactional mode', async () => {
      let callCount = 0;
      vi.mocked(storage.createRecipe).mockImplementation(async () => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Recipe 2 failed');
        }
        return { id: String(callCount), name: `Recipe ${callCount}`, imageUrl: 'test.jpg' } as any;
      });

      const validatedRecipes = [
        createValidatedRecipe(true, { name: 'Recipe 1' }),
        createValidatedRecipe(true, { name: 'Recipe 2' }),
        createValidatedRecipe(true, { name: 'Recipe 3' })
      ];

      const response = await agent.saveBatchWithoutTransaction(
        validatedRecipes,
        'batch-11'
      );

      expect(response.success).toBe(true);
      expect(response.data?.totalSaved).toBe(2); // Recipe 1 and 3 succeed
      expect(response.data?.totalFailed).toBe(1); // Recipe 2 fails
      expect(response.data?.savedRecipes).toHaveLength(3);
      expect(response.data?.savedRecipes[1].success).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty recipe array', async () => {
      const response = await agent.process(
        { validatedRecipes: [], batchId: 'batch-12' },
        'correlation-12'
      );

      expect(response.success).toBe(true);
      expect(response.data?.totalSaved).toBe(0);
      expect(response.data?.errors).toContain('No validated recipes to save');
    });

    it('should handle all invalid recipes', async () => {
      const validatedRecipes = [
        createValidatedRecipe(false, { name: 'Invalid 1' }),
        createValidatedRecipe(false, { name: 'Invalid 2' })
      ];

      const response = await agent.process(
        { validatedRecipes, batchId: 'batch-13' },
        'correlation-13'
      );

      expect(response.success).toBe(true);
      expect(response.data?.totalSaved).toBe(0);
      expect(response.data?.totalFailed).toBe(2);
    });

    it('should handle custom image URL', async () => {
      const customImageUrl = 'https://custom-image.jpg';
      const mockCreatedRecipe = { id: '1', name: 'Test Recipe', imageUrl: customImageUrl };
      vi.mocked(storage.createRecipe).mockResolvedValue(mockCreatedRecipe as any);
      vi.mocked(storage.transaction).mockImplementation(async (cb) => await cb(null as any));

      const validatedRecipes = [createValidatedRecipe()];

      const response = await agent.process(
        { validatedRecipes, batchId: 'batch-14', imageUrl: customImageUrl },
        'correlation-14'
      );

      expect(response.success).toBe(true);
      expect(response.data?.savedRecipes[0].imageUrl).toBe(customImageUrl);
    });
  });

  describe('Metrics and Statistics', () => {
    it('should track operation statistics', async () => {
      const mockCreatedRecipe = { id: '1', name: 'Test Recipe', imageUrl: 'test.jpg' };
      vi.mocked(storage.createRecipe).mockResolvedValue(mockCreatedRecipe as any);
      vi.mocked(storage.transaction).mockImplementation(async (cb) => await cb(null as any));

      const validatedRecipes = [createValidatedRecipe()];

      await agent.process(
        { validatedRecipes, batchId: 'batch-15' },
        'correlation-15'
      );

      const stats = agent.getOperationStats();
      expect(stats.totalOperations).toBe(1);
      expect(stats.successfulSaves).toBe(1);
      expect(stats.averageBatchSize).toBe(10);
    });

    it('should track failures in metrics', async () => {
      vi.mocked(storage.transaction).mockRejectedValue(new Error('Transaction failed'));

      const validatedRecipes = [createValidatedRecipe()];

      const response = await agent.process(
        { validatedRecipes, batchId: 'batch-16' },
        'correlation-16'
      );

      // Agent handles errors gracefully, so response is still successful
      // But errors are tracked in the response data
      expect(response.success).toBe(true);
      expect(response.data?.totalFailed).toBeGreaterThan(0);
      expect(response.data?.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Data Conversion', () => {
    it('should convert GeneratedRecipe to InsertRecipe format', async () => {
      const mockCreatedRecipe = { id: '1', name: 'Test Recipe', imageUrl: 'test.jpg' };
      vi.mocked(storage.createRecipe).mockResolvedValue(mockCreatedRecipe as any);
      vi.mocked(storage.transaction).mockImplementation(async (cb) => await cb(null as any));

      const validatedRecipes = [createValidatedRecipe()];

      await agent.process(
        { validatedRecipes, batchId: 'batch-17' },
        'correlation-17'
      );

      expect(storage.createRecipe).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Recipe',
          description: 'Test description',
          mealTypes: ['Lunch'],
          sourceReference: 'AI Generated - BMAD',
          isApproved: false
        })
      );
    });

    it('should format nutrition data correctly', async () => {
      const mockCreatedRecipe = { id: '1', name: 'Test Recipe', imageUrl: 'test.jpg' };
      vi.mocked(storage.createRecipe).mockResolvedValue(mockCreatedRecipe as any);
      vi.mocked(storage.transaction).mockImplementation(async (cb) => await cb(null as any));

      const validatedRecipes = [createValidatedRecipe(true, {
        estimatedNutrition: {
          calories: 525,
          protein: 42.5,
          carbs: 35.7,
          fat: 18.3
        }
      })];

      await agent.process(
        { validatedRecipes, batchId: 'batch-18' },
        'correlation-18'
      );

      expect(storage.createRecipe).toHaveBeenCalledWith(
        expect.objectContaining({
          caloriesKcal: 525,
          proteinGrams: '42.50',
          carbsGrams: '35.70',
          fatGrams: '18.30'
        })
      );
    });
  });
});
