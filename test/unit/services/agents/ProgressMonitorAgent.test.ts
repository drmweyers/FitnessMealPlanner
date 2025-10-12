/**
 * Unit tests for ProgressMonitorAgent
 * Tests progress tracking, time estimation, and state management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProgressMonitorAgent } from '../../../../server/services/agents/ProgressMonitorAgent';
import { ChunkStrategy } from '../../../../server/services/agents/types';

describe('ProgressMonitorAgent', () => {
  let agent: ProgressMonitorAgent;

  beforeEach(() => {
    agent = new ProgressMonitorAgent();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await agent.initialize();
      expect(agent.getStatus()).toBe('idle');
      expect(agent.getType()).toBe('monitor');
    });

    it('should have no active batches initially', () => {
      const batches = agent.getActiveBatches();
      expect(batches).toEqual([]);
    });
  });

  describe('Progress Initialization', () => {
    it('should initialize progress state correctly', async () => {
      const strategy: ChunkStrategy = {
        totalRecipes: 10,
        chunkSize: 5,
        chunks: 2,
        estimatedTime: 50000,
        batchId: 'batch-123'
      };

      const state = await agent.initializeProgress(strategy);

      expect(state).toMatchObject({
        batchId: 'batch-123',
        phase: 'planning',
        currentChunk: 0,
        totalChunks: 2,
        recipesCompleted: 0,
        totalRecipes: 10,
        imagesGenerated: 0,
        errors: [],
        estimatedTimeRemaining: 50000
      });
    });

    it('should set monitor agent to working on init', async () => {
      const strategy: ChunkStrategy = {
        totalRecipes: 5,
        chunkSize: 5,
        chunks: 1,
        estimatedTime: 25000,
        batchId: 'batch-456'
      };

      const state = await agent.initializeProgress(strategy);

      expect(state.agentStatus.monitor).toBe('working');
      expect(state.agentStatus.concept).toBe('idle');
    });

    it('should store start time', async () => {
      const strategy: ChunkStrategy = {
        totalRecipes: 5,
        chunkSize: 5,
        chunks: 1,
        estimatedTime: 25000,
        batchId: 'batch-789'
      };

      const before = new Date();
      const state = await agent.initializeProgress(strategy);
      const after = new Date();

      expect(state.startTime.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(state.startTime.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Progress Updates', () => {
    beforeEach(async () => {
      const strategy: ChunkStrategy = {
        totalRecipes: 15,
        chunkSize: 5,
        chunks: 3,
        estimatedTime: 75000,
        batchId: 'test-batch'
      };
      await agent.initializeProgress(strategy);
    });

    it('should update chunk progress', async () => {
      const state = await agent.updateChunkProgress('test-batch', 1, 5);

      expect(state.currentChunk).toBe(1);
      expect(state.recipesCompleted).toBe(5);
    });

    it('should accumulate recipes completed', async () => {
      await agent.updateChunkProgress('test-batch', 0, 5);
      const state = await agent.updateChunkProgress('test-batch', 1, 5);

      expect(state.recipesCompleted).toBe(10);
    });

    it('should update phase', async () => {
      const state = await agent.updatePhase('test-batch', 'generating');

      expect(state.phase).toBe('generating');
    });

    it('should update agent status', async () => {
      const state = await agent.updateAgentStatus('test-batch', 'concept', 'complete');

      expect(state.agentStatus.concept).toBe('complete');
    });

    it('should record errors', async () => {
      const state = await agent.recordError('test-batch', 'Test error occurred');

      expect(state.errors).toContain('Test error occurred');
      expect(state.phase).toBe('error');
    });

    it('should accumulate multiple errors', async () => {
      await agent.recordError('test-batch', 'Error 1');
      const state = await agent.recordError('test-batch', 'Error 2');

      expect(state.errors).toHaveLength(2);
      expect(state.errors).toContain('Error 1');
      expect(state.errors).toContain('Error 2');
    });
  });

  describe('Time Estimation', () => {
    it('should calculate time remaining based on progress', async () => {
      const strategy: ChunkStrategy = {
        totalRecipes: 10,
        chunkSize: 5,
        chunks: 2,
        estimatedTime: 50000,
        batchId: 'time-test'
      };

      await agent.initializeProgress(strategy);
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay

      const state = await agent.updateChunkProgress('time-test', 1, 5);

      expect(state.estimatedTimeRemaining).toBeLessThan(50000);
      expect(state.estimatedTimeRemaining).toBeGreaterThan(0);
    });

    it('should return 0 time remaining when complete', async () => {
      const strategy: ChunkStrategy = {
        totalRecipes: 5,
        chunkSize: 5,
        chunks: 1,
        estimatedTime: 25000,
        batchId: 'complete-test'
      };

      await agent.initializeProgress(strategy);
      await agent.updateChunkProgress('complete-test', 1, 5);
      const state = await agent.markComplete('complete-test');

      expect(state.estimatedTimeRemaining).toBe(0);
    });

    it('should use estimated time when no progress yet', async () => {
      const strategy: ChunkStrategy = {
        totalRecipes: 10,
        chunkSize: 5,
        chunks: 2,
        estimatedTime: 50000,
        batchId: 'no-progress'
      };

      const state = await agent.initializeProgress(strategy);

      expect(state.estimatedTimeRemaining).toBe(50000);
    });
  });

  describe('Batch Completion', () => {
    it('should mark batch as complete', async () => {
      const strategy: ChunkStrategy = {
        totalRecipes: 5,
        chunkSize: 5,
        chunks: 1,
        estimatedTime: 25000,
        batchId: 'mark-complete'
      };

      await agent.initializeProgress(strategy);
      const state = await agent.markComplete('mark-complete');

      expect(state.phase).toBe('complete');
      expect(state.agentStatus.concept).toBe('complete');
      expect(state.agentStatus.validator).toBe('complete');
      expect(state.agentStatus.artist).toBe('complete');
      expect(state.agentStatus.coordinator).toBe('complete');
      expect(state.agentStatus.monitor).toBe('complete');
    });
  });

  describe('Active Batches', () => {
    it('should return active batches', async () => {
      const strategy1: ChunkStrategy = {
        totalRecipes: 5,
        chunkSize: 5,
        chunks: 1,
        estimatedTime: 25000,
        batchId: 'active-1'
      };

      const strategy2: ChunkStrategy = {
        totalRecipes: 10,
        chunkSize: 5,
        chunks: 2,
        estimatedTime: 50000,
        batchId: 'active-2'
      };

      await agent.initializeProgress(strategy1);
      await agent.initializeProgress(strategy2);

      const active = agent.getActiveBatches();
      expect(active).toHaveLength(2);
      expect(active).toContain('active-1');
      expect(active).toContain('active-2');
    });

    it('should not include completed batches in active list', async () => {
      const strategy: ChunkStrategy = {
        totalRecipes: 5,
        chunkSize: 5,
        chunks: 1,
        estimatedTime: 25000,
        batchId: 'to-complete'
      };

      await agent.initializeProgress(strategy);
      await agent.markComplete('to-complete');

      const active = agent.getActiveBatches();
      expect(active).not.toContain('to-complete');
    });

    it('should not include errored batches in active list', async () => {
      const strategy: ChunkStrategy = {
        totalRecipes: 5,
        chunkSize: 5,
        chunks: 1,
        estimatedTime: 25000,
        batchId: 'to-error'
      };

      await agent.initializeProgress(strategy);
      await agent.recordError('to-error', 'Fatal error');

      const active = agent.getActiveBatches();
      expect(active).not.toContain('to-error');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup old completed batches', async () => {
      const strategy: ChunkStrategy = {
        totalRecipes: 5,
        chunkSize: 5,
        chunks: 1,
        estimatedTime: 25000,
        batchId: 'old-batch'
      };

      await agent.initializeProgress(strategy);
      await agent.markComplete('old-batch');

      // Wait 10ms to ensure batch age > 0ms
      await new Promise(resolve => setTimeout(resolve, 10));

      // Cleanup batches older than 0ms (should cleanup immediately)
      const cleaned = await agent.cleanupOldBatches(0);

      expect(cleaned).toBe(1);
      expect(agent.getProgress('old-batch')).toBeUndefined();
    });

    it('should not cleanup recent batches', async () => {
      const strategy: ChunkStrategy = {
        totalRecipes: 5,
        chunkSize: 5,
        chunks: 1,
        estimatedTime: 25000,
        batchId: 'recent-batch'
      };

      await agent.initializeProgress(strategy);
      await agent.markComplete('recent-batch');

      // Cleanup batches older than 1 hour
      const cleaned = await agent.cleanupOldBatches(3600000);

      expect(cleaned).toBe(0);
      expect(agent.getProgress('recent-batch')).toBeDefined();
    });

    it('should not cleanup active batches', async () => {
      const strategy: ChunkStrategy = {
        totalRecipes: 10,
        chunkSize: 5,
        chunks: 2,
        estimatedTime: 50000,
        batchId: 'active-batch'
      };

      await agent.initializeProgress(strategy);

      const cleaned = await agent.cleanupOldBatches(0);

      expect(cleaned).toBe(0);
      expect(agent.getProgress('active-batch')).toBeDefined();
    });
  });

  describe('Summary Statistics', () => {
    it('should calculate summary stats correctly', async () => {
      // Active batch
      const strategy1: ChunkStrategy = {
        totalRecipes: 10,
        chunkSize: 5,
        chunks: 2,
        estimatedTime: 50000,
        batchId: 'stats-active'
      };

      // Completed batch
      const strategy2: ChunkStrategy = {
        totalRecipes: 5,
        chunkSize: 5,
        chunks: 1,
        estimatedTime: 25000,
        batchId: 'stats-complete'
      };

      // Errored batch
      const strategy3: ChunkStrategy = {
        totalRecipes: 3,
        chunkSize: 5,
        chunks: 1,
        estimatedTime: 15000,
        batchId: 'stats-error'
      };

      await agent.initializeProgress(strategy1);
      await agent.initializeProgress(strategy2);
      await agent.updateChunkProgress('stats-complete', 1, 5);
      await agent.markComplete('stats-complete');
      await agent.initializeProgress(strategy3);
      await agent.recordError('stats-error', 'Test error');

      const stats = agent.getSummaryStats();

      expect(stats.activeBatches).toBe(1);
      expect(stats.completedBatches).toBe(1);
      expect(stats.erroredBatches).toBe(1);
      expect(stats.totalRecipesGenerated).toBe(5);
    });
  });

  describe('Progress Formatting', () => {
    it('should format progress correctly', async () => {
      const strategy: ChunkStrategy = {
        totalRecipes: 10,
        chunkSize: 5,
        chunks: 2,
        estimatedTime: 50000,
        batchId: 'format-test'
      };

      await agent.initializeProgress(strategy);
      await agent.updateChunkProgress('format-test', 1, 5);

      const formatted = agent.formatProgress('format-test');

      expect(formatted).toContain('50%'); // 5/10 recipes
      expect(formatted).toContain('5/10 recipes');
      expect(formatted).toContain('Chunk 1/2');
      expect(formatted).toMatch(/Phase: (planning|generating|validating|saving|imaging)/);
    });

    it('should show complete when done', async () => {
      const strategy: ChunkStrategy = {
        totalRecipes: 5,
        chunkSize: 5,
        chunks: 1,
        estimatedTime: 25000,
        batchId: 'format-complete'
      };

      await agent.initializeProgress(strategy);
      await agent.updateChunkProgress('format-complete', 1, 5);
      await agent.markComplete('format-complete');

      const formatted = agent.formatProgress('format-complete');

      expect(formatted).toContain('100%');
      expect(formatted).toContain('ETA: Complete');
    });

    it('should return not found message for invalid batch', () => {
      const formatted = agent.formatProgress('non-existent');
      expect(formatted).toBe('Progress not found');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for non-existent batch update', async () => {
      await expect(
        agent.updateChunkProgress('non-existent', 1, 5)
      ).rejects.toThrow('No progress state found');
    });

    it('should throw error for non-existent batch completion', async () => {
      await expect(
        agent.markComplete('non-existent')
      ).rejects.toThrow('No progress state found');
    });
  });

  describe('Metrics Tracking', () => {
    it('should track operations', async () => {
      const strategy: ChunkStrategy = {
        totalRecipes: 5,
        chunkSize: 5,
        chunks: 1,
        estimatedTime: 25000,
        batchId: 'metrics-test'
      };

      await agent.process({ batchId: 'metrics-test', phase: 'planning' }, 'correlation-1');

      const metrics = agent.getMetrics();
      expect(metrics.operationCount).toBeGreaterThan(0);
    });
  });
});
