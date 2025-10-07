/**
 * BMAD Multi-Agent Recipe Generation System
 * Base Agent Abstract Class
 *
 * This abstract class provides the foundation for all agents in the BMAD system.
 * It handles lifecycle management, error handling, metrics tracking, and message communication.
 */

import {
  AgentType,
  AgentStatus,
  AgentMessage,
  AgentResponse,
  AgentMetrics,
  ErrorRecoveryStrategy,
  MessageType
} from './types';

/**
 * Abstract base class for all BMAD agents
 * All specialized agents must extend this class
 */
export abstract class BaseAgent {
  protected agentType: AgentType;
  protected status: AgentStatus = 'idle';
  protected metrics: AgentMetrics;
  protected errorRecoveryStrategy: ErrorRecoveryStrategy;

  constructor(
    agentType: AgentType,
    errorRecoveryStrategy: ErrorRecoveryStrategy = {
      retryLimit: 2,
      backoffMs: 5000,
      fallbackBehavior: 'queue_manual_review',
      notifyUser: true
    }
  ) {
    this.agentType = agentType;
    this.errorRecoveryStrategy = errorRecoveryStrategy;
    this.metrics = {
      agentType,
      operationCount: 0,
      totalDuration: 0,
      averageDuration: 0,
      successCount: 0,
      errorCount: 0,
      lastOperation: new Date()
    };
  }

  /**
   * Initialize the agent
   * Override this method to add custom initialization logic
   */
  async initialize(): Promise<void> {
    this.status = 'idle';
    console.log(`[${this.agentType}] Agent initialized`);
  }

  /**
   * Start agent operation
   * Handles status management and error recovery
   */
  protected async startOperation(): Promise<void> {
    this.status = 'working';
    this.metrics.operationCount++;
    this.metrics.lastOperation = new Date();
  }

  /**
   * Complete agent operation
   * Updates metrics and status
   */
  protected async completeOperation(duration: number, success: boolean): Promise<void> {
    this.status = success ? 'complete' : 'error';
    this.metrics.totalDuration += duration;
    this.metrics.averageDuration = this.metrics.totalDuration / this.metrics.operationCount;

    if (success) {
      this.metrics.successCount++;
    } else {
      this.metrics.errorCount++;
    }
  }

  /**
   * Send message to another agent
   */
  protected createMessage<T>(
    toAgent: AgentType,
    messageType: MessageType,
    payload: T,
    correlationId: string
  ): AgentMessage<T> {
    return {
      fromAgent: this.agentType,
      toAgent,
      messageType,
      payload,
      timestamp: new Date(),
      correlationId
    };
  }

  /**
   * Handle errors with retry logic
   */
  protected async handleError<T>(
    error: Error,
    operation: () => Promise<T>,
    attempt: number = 0
  ): Promise<AgentResponse<T>> {
    console.error(`[${this.agentType}] Error on attempt ${attempt + 1}:`, error.message);

    // Check if we should retry
    if (attempt < this.errorRecoveryStrategy.retryLimit) {
      // Wait with exponential backoff
      const backoffTime = this.errorRecoveryStrategy.backoffMs * Math.pow(2, attempt);
      await this.sleep(backoffTime);

      try {
        const result = await operation();
        return {
          success: true,
          data: result
        };
      } catch (retryError) {
        return this.handleError(retryError as Error, operation, attempt + 1);
      }
    }

    // Max retries exceeded
    this.status = 'error';
    this.metrics.errorCount++;

    return {
      success: false,
      error: error.message,
      requiresHumanReview: this.errorRecoveryStrategy.fallbackBehavior === 'queue_manual_review'
    };
  }

  /**
   * Execute operation with metrics tracking and error handling
   */
  protected async executeWithMetrics<T>(
    operation: () => Promise<T>
  ): Promise<AgentResponse<T>> {
    const startTime = Date.now();
    await this.startOperation();

    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      await this.completeOperation(duration, true);

      return {
        success: true,
        data: result
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.completeOperation(duration, false);

      return this.handleError(error as Error, operation);
    }
  }

  /**
   * Sleep utility for backoff
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current agent status
   */
  getStatus(): AgentStatus {
    return this.status;
  }

  /**
   * Get agent metrics
   */
  getMetrics(): AgentMetrics {
    return { ...this.metrics };
  }

  /**
   * Get agent type
   */
  getType(): AgentType {
    return this.agentType;
  }

  /**
   * Reset agent to idle state
   */
  async reset(): Promise<void> {
    this.status = 'idle';
    console.log(`[${this.agentType}] Agent reset to idle`);
  }

  /**
   * Shutdown agent
   * Override this method to add custom cleanup logic
   */
  async shutdown(): Promise<void> {
    this.status = 'idle';
    console.log(`[${this.agentType}] Agent shutdown`);
  }

  /**
   * Abstract method: Process agent-specific work
   * Must be implemented by all subclasses
   */
  abstract process<TInput, TOutput>(
    input: TInput,
    correlationId: string
  ): Promise<AgentResponse<TOutput>>;
}
