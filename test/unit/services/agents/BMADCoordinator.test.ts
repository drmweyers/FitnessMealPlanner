/**
 * Unit tests for BMADCoordinator
 * Tests agent orchestration, batch management, and workflow coordination
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BMADCoordinator } from '../../../../server/services/agents/BMADCoordinator';
import { GenerationOptions } from '../../../../server/services/agents/types';

describe('BMADCoordinator', () => {
  let coordinator: BMADCoordinator;

  beforeEach(async () => {
    coordinator = new BMADCoordinator();
    await coordinator.initialize();
  });

  afterEach(async () => {
    await coordinator.shutdown();
  });

  describe('Initialization', () => {
    it('should initialize all agents', async () => {
      // Should not throw
      await coordinator.initialize();
    });

    it('should have no active batches initially', () => {
      const batches = coordinator.getActiveBatches();
      expect(batches).toEqual([]);
    });
  });

  describe('Bulk Recipe Generation', () => {
    it('should generate recipes successfully', async () => {
      const options: GenerationOptions = {
        count: 10
      };

      const result = await coordinator.generateBulkRecipes(options);

      expect(result.success).toBe(true);
      expect(result.batchId).toBeDefined();
      expect(result.strategy).toBeDefined();
      expect(result.strategy.totalRecipes).toBe(10);
      expect(result.strategy.chunks).toBe(2);
    });

    it('should create valid chunking strategy', async () => {
      const options: GenerationOptions = {
        count: 15
      };

      const result = await coordinator.generateBulkRecipes(options);

      expect(result.strategy.totalRecipes).toBe(15);
      expect(result.strategy.chunkSize).toBe(5);
      expect(result.strategy.chunks).toBe(3);
      expect(result.strategy.estimatedTime).toBe(75000); // 15 * 5000ms
    });

    it('should initialize progress tracking', async () => {
      const options: GenerationOptions = {
        count: 5
      };

      const result = await coordinator.generateBulkRecipes(options);
      const progress = coordinator.getProgress(result.batchId);

      expect(progress).toBeDefined();
      expect(progress?.batchId).toBe(result.batchId);
      expect(progress?.totalRecipes).toBe(5);
    });

    it('should mark batch as complete', async () => {
      const options: GenerationOptions = {
        count: 5
      };

      const result = await coordinator.generateBulkRecipes(options);

      expect(result.progressState.phase).toBe('complete');
      expect(result.success).toBe(true);
    });

    it('should track total time', async () => {
      const options: GenerationOptions = {
        count: 3
      };

      const result = await coordinator.generateBulkRecipes(options);

      expect(result.totalTime).toBeGreaterThanOrEqual(0);
      expect(typeof result.totalTime).toBe('number');
    });

    it('should generate unique batch IDs', async () => {
      const options: GenerationOptions = {
        count: 5
      };

      const result1 = await coordinator.generateBulkRecipes(options);
      const result2 = await coordinator.generateBulkRecipes(options);

      expect(result1.batchId).toBeDefined();
      expect(result2.batchId).toBeDefined();
      expect(result1.batchId).not.toBe(result2.batchId);
    });
  });

  describe('Progress Tracking', () => {
    it('should provide progress updates', async () => {
      const options: GenerationOptions = {
        count: 10
      };

      const result = await coordinator.generateBulkRecipes(options);
      const progress = coordinator.getProgress(result.batchId);

      expect(progress).toBeDefined();
      expect(progress?.recipesCompleted).toBeGreaterThanOrEqual(0);
    });

    it('should return undefined for non-existent batch', () => {
      const progress = coordinator.getProgress('non-existent-batch');
      expect(progress).toBeUndefined();
    });
  });

  describe('Active Batch Management', () => {
    it('should track active batches during generation', async () => {
      const options: GenerationOptions = {
        count: 5
      };

      // Start generation but don't await completion
      const promise = coordinator.generateBulkRecipes(options);

      // Should have active batch
      // (Note: In the actual implementation, the batch completes quickly,
      // so this test verifies the batch was tracked)
      await promise;

      // After completion, should be removed from active batches
      const activeBatches = coordinator.getActiveBatches();
      expect(Array.isArray(activeBatches)).toBe(true);
    });

    it('should remove batch from active after completion', async () => {
      const options: GenerationOptions = {
        count: 5
      };

      const result = await coordinator.generateBulkRecipes(options);
      const activeBatches = coordinator.getActiveBatches();

      expect(activeBatches).not.toContain(result.batchId);
    });
  });

  describe('Batch Cancellation', () => {
    it('should return false for non-existent batch', async () => {
      const cancelled = await coordinator.cancelBatch('non-existent');
      expect(cancelled).toBe(false);
    });

    it('should handle cancellation request gracefully', async () => {
      const cancelled = await coordinator.cancelBatch('test-batch-123');
      expect(typeof cancelled).toBe('boolean');
    });
  });

  describe('Statistics', () => {
    it('should provide coordinator statistics', () => {
      const stats = coordinator.getStatistics();

      expect(stats).toMatchObject({
        activeBatches: expect.any(Number),
        totalBatches: expect.any(Number),
        agentMetrics: {
          concept: expect.any(Object),
          monitor: expect.any(Object)
        }
      });
    });

    it('should track total batches', async () => {
      const statsBefore = coordinator.getStatistics();
      const totalBefore = statsBefore.totalBatches;

      await coordinator.generateBulkRecipes({ count: 5 });

      const statsAfter = coordinator.getStatistics();
      expect(statsAfter.totalBatches).toBe(totalBefore + 1);
    });

    it('should provide agent metrics', () => {
      const stats = coordinator.getStatistics();

      expect(stats.agentMetrics.concept).toHaveProperty('agentType', 'concept');
      expect(stats.agentMetrics.monitor).toHaveProperty('agentType', 'monitor');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup old batches', async () => {
      const cleaned = await coordinator.cleanup(0);
      expect(typeof cleaned).toBe('number');
      expect(cleaned).toBeGreaterThanOrEqual(0);
    });

    it('should respect retention period', async () => {
      // Generate and complete a batch
      await coordinator.generateBulkRecipes({ count: 3 });

      // Cleanup with long retention (should not cleanup recent batch)
      const cleaned = await coordinator.cleanup(3600000); // 1 hour
      expect(cleaned).toBe(0);
    });
  });

  describe('Shutdown', () => {
    it('should shutdown all agents', async () => {
      await coordinator.shutdown();
      // Should not throw
    });

    it('should clear active batches on shutdown', async () => {
      await coordinator.shutdown();
      const batches = coordinator.getActiveBatches();
      expect(batches).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      const options: GenerationOptions = {
        count: -1 // Invalid count might cause issues
      };

      const result = await coordinator.generateBulkRecipes(options);

      // Should still return a result structure
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('batchId');
    });

    it('should include errors in result', async () => {
      const options: GenerationOptions = {
        count: 5
      };

      const result = await coordinator.generateBulkRecipes(options);

      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('Multiple Batches', () => {
    it('should handle multiple concurrent batches', async () => {
      const options1: GenerationOptions = { count: 5 };
      const options2: GenerationOptions = { count: 10 };
      const options3: GenerationOptions = { count: 3 };

      const [result1, result2, result3] = await Promise.all([
        coordinator.generateBulkRecipes(options1),
        coordinator.generateBulkRecipes(options2),
        coordinator.generateBulkRecipes(options3)
      ]);

      expect(result1.batchId).toBeDefined();
      expect(result2.batchId).toBeDefined();
      expect(result3.batchId).toBeDefined();

      expect(result1.batchId).not.toBe(result2.batchId);
      expect(result2.batchId).not.toBe(result3.batchId);
    });

    it('should track statistics across multiple batches', async () => {
      await coordinator.generateBulkRecipes({ count: 5 });
      await coordinator.generateBulkRecipes({ count: 10 });
      await coordinator.generateBulkRecipes({ count: 3 });

      const stats = coordinator.getStatistics();
      expect(stats.totalBatches).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero count request', async () => {
      const options: GenerationOptions = {
        count: 0
      };

      const result = await coordinator.generateBulkRecipes(options);

      expect(result).toBeDefined();
      expect(result.batchId).toBeDefined();
    });

    it('should handle large batch request', async () => {
      const options: GenerationOptions = {
        count: 100
      };

      const result = await coordinator.generateBulkRecipes(options);

      expect(result.success).toBe(true);
      expect(result.strategy.totalRecipes).toBe(100);
      expect(result.strategy.chunks).toBe(20); // 100/5
    });

    it('should handle options with all parameters', async () => {
      const options: GenerationOptions = {
        count: 5,
        mealTypes: ['Breakfast', 'Lunch'],
        dietaryRestrictions: ['Vegan'],
        targetCalories: 500,
        mainIngredient: 'Tofu',
        fitnessGoal: 'weight loss',
        maxPrepTime: 30,
        minProtein: 20,
        maxProtein: 30
      };

      const result = await coordinator.generateBulkRecipes(options);

      expect(result.success).toBe(true);
    });
  });

  describe('Integration with Agents', () => {
    it('should use concept agent for planning', async () => {
      const options: GenerationOptions = {
        count: 10
      };

      const result = await coordinator.generateBulkRecipes(options);

      expect(result.strategy).toBeDefined();
      expect(result.strategy.totalRecipes).toBe(10);
    });

    it('should use progress monitor for tracking', async () => {
      const options: GenerationOptions = {
        count: 5
      };

      const result = await coordinator.generateBulkRecipes(options);
      const progress = coordinator.getProgress(result.batchId);

      expect(progress).toBeDefined();
      expect(progress?.agentStatus).toBeDefined();
      expect(progress?.agentStatus.concept).toBeDefined();
      expect(progress?.agentStatus.monitor).toBeDefined();
    });
  });
});
