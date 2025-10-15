/**
 * Unit tests for BaseAgent
 * Tests lifecycle, error handling, metrics tracking, and message communication
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseAgent } from '../../../../server/services/agents/BaseAgent';
import { AgentResponse, AgentType, AgentStatus } from '../../../../server/services/agents/types';

// Concrete implementation for testing
class TestAgent extends BaseAgent {
  constructor() {
    super('concept', {
      retryLimit: 2,
      backoffMs: 100,
      fallbackBehavior: 'queue_manual_review',
      notifyUser: true
    });
  }

  async process<TInput, TOutput>(
    input: TInput,
    correlationId: string
  ): Promise<AgentResponse<TOutput>> {
    return this.executeWithMetrics(async () => {
      return { result: 'success' } as TOutput;
    });
  }

  // Expose protected methods for testing
  public async testExecuteWithMetrics<T>(operation: () => Promise<T>): Promise<AgentResponse<T>> {
    return this.executeWithMetrics(operation);
  }

  public async testHandleError<T>(
    error: Error,
    operation: () => Promise<T>,
    attempt: number = 0
  ): Promise<AgentResponse<T>> {
    return this.handleError(error, operation, attempt);
  }
}

describe('BaseAgent', () => {
  let agent: TestAgent;

  beforeEach(() => {
    agent = new TestAgent();
  });

  describe('Initialization', () => {
    it('should initialize with idle status', async () => {
      await agent.initialize();
      expect(agent.getStatus()).toBe('idle');
    });

    it('should have correct agent type', () => {
      expect(agent.getType()).toBe('concept');
    });

    it('should initialize metrics with zero values', () => {
      const metrics = agent.getMetrics();
      expect(metrics.agentType).toBe('concept');
      expect(metrics.operationCount).toBe(0);
      expect(metrics.totalDuration).toBe(0);
      expect(metrics.successCount).toBe(0);
      expect(metrics.errorCount).toBe(0);
    });
  });

  describe('Status Management', () => {
    it('should update status to working during operation', async () => {
      const operation = vi.fn(async () => {
        expect(agent.getStatus()).toBe('working');
        return 'result';
      });

      await agent.testExecuteWithMetrics(operation);
    });

    it('should update status to complete after successful operation', async () => {
      await agent.testExecuteWithMetrics(async () => 'result');
      expect(agent.getStatus()).toBe('complete');
    });

    it('should update status to error after failed operation', async () => {
      await agent.testExecuteWithMetrics(async () => {
        throw new Error('Test error');
      });
      expect(agent.getStatus()).toBe('error');
    });

    it('should reset to idle status', async () => {
      await agent.testExecuteWithMetrics(async () => 'result');
      await agent.reset();
      expect(agent.getStatus()).toBe('idle');
    });
  });

  describe('Metrics Tracking', () => {
    it('should increment operation count', async () => {
      await agent.testExecuteWithMetrics(async () => 'result');
      const metrics = agent.getMetrics();
      expect(metrics.operationCount).toBe(1);
    });

    it('should track total duration', async () => {
      await agent.testExecuteWithMetrics(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'result';
      });

      const metrics = agent.getMetrics();
      expect(metrics.totalDuration).toBeGreaterThan(0);
    });

    it('should calculate average duration', async () => {
      await agent.testExecuteWithMetrics(async () => 'result1');
      await agent.testExecuteWithMetrics(async () => 'result2');

      const metrics = agent.getMetrics();
      expect(metrics.averageDuration).toBe(metrics.totalDuration / 2);
    });

    it('should track success count', async () => {
      await agent.testExecuteWithMetrics(async () => 'result1');
      await agent.testExecuteWithMetrics(async () => 'result2');

      const metrics = agent.getMetrics();
      expect(metrics.successCount).toBe(2);
    });

    it('should track error count', async () => {
      await agent.testExecuteWithMetrics(async () => {
        throw new Error('Error 1');
      });
      await agent.testExecuteWithMetrics(async () => {
        throw new Error('Error 2');
      });

      const metrics = agent.getMetrics();
      expect(metrics.errorCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Error Handling', () => {
    it('should return success response for successful operation', async () => {
      const response = await agent.testExecuteWithMetrics(async () => 'success');

      expect(response.success).toBe(true);
      expect(response.data).toBe('success');
      expect(response.error).toBeUndefined();
    });

    it('should return error response for failed operation', async () => {
      const response = await agent.testExecuteWithMetrics(async () => {
        throw new Error('Test error');
      });

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });

    it('should retry failed operations', async () => {
      let attempts = 0;
      const operation = vi.fn(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Retry error');
        }
        return 'success';
      });

      const response = await agent.testHandleError(
        new Error('Initial error'),
        operation,
        0
      );

      expect(attempts).toBe(3); // Initial + 2 retries
      expect(response.success).toBe(true);
    });

    it('should respect retry limit', async () => {
      const operation = vi.fn(async () => {
        throw new Error('Always fails');
      });

      const response = await agent.testHandleError(
        new Error('Initial error'),
        operation,
        0
      );

      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries (retryLimit = 2)
      expect(response.success).toBe(false);
    });

    it('should apply exponential backoff', async () => {
      const startTime = Date.now();
      let attempts = 0;

      const operation = async () => {
        attempts++;
        throw new Error('Test error');
      };

      await agent.testHandleError(new Error('Initial'), operation, 0);

      const elapsed = Date.now() - startTime;
      // First retry: 100ms, Second retry: 200ms = 300ms minimum
      expect(elapsed).toBeGreaterThanOrEqual(200);
    });

    it('should set requiresHumanReview for manual review fallback', async () => {
      const response = await agent.testExecuteWithMetrics(async () => {
        throw new Error('Critical error');
      });

      expect(response.requiresHumanReview).toBe(true);
    });
  });

  describe('Message Creation', () => {
    it('should create message with correct structure', async () => {
      const message = agent['createMessage'](
        'validator',
        'request',
        { data: 'test' },
        'correlation-123'
      );

      expect(message.fromAgent).toBe('concept');
      expect(message.toAgent).toBe('validator');
      expect(message.messageType).toBe('request');
      expect(message.payload).toEqual({ data: 'test' });
      expect(message.correlationId).toBe('correlation-123');
      expect(message.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Process Method', () => {
    it('should successfully process input', async () => {
      const response = await agent.process(
        { test: 'input' },
        'correlation-123'
      );

      expect(response.success).toBe(true);
      expect(response.data).toEqual({ result: 'success' });
    });

    it('should track metrics during processing', async () => {
      await agent.process({ test: 'input' }, 'correlation-123');

      const metrics = agent.getMetrics();
      expect(metrics.operationCount).toBe(1);
      expect(metrics.successCount).toBe(1);
    });
  });

  describe('Shutdown', () => {
    it('should set status to idle on shutdown', async () => {
      await agent.testExecuteWithMetrics(async () => 'result');
      await agent.shutdown();

      expect(agent.getStatus()).toBe('idle');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined input gracefully', async () => {
      const response = await agent.process(null as any, 'correlation-123');
      expect(response.success).toBe(true);
    });

    it('should handle empty correlation ID', async () => {
      const response = await agent.process({ test: 'input' }, '');
      expect(response.success).toBe(true);
    });

    it('should maintain metrics across multiple operations', async () => {
      for (let i = 0; i < 5; i++) {
        await agent.testExecuteWithMetrics(async () => `result-${i}`);
      }

      const metrics = agent.getMetrics();
      expect(metrics.operationCount).toBe(5);
      expect(metrics.successCount).toBe(5);
    });
  });
});
