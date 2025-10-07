/**
 * BMAD Multi-Agent Recipe Generation System
 * BMAD Coordinator
 *
 * This coordinator orchestrates all agents in the BMAD system:
 * - Manages agent lifecycle
 * - Routes messages between agents
 * - Handles error recovery
 * - Coordinates batch ID management
 */

import { RecipeConceptAgent } from './RecipeConceptAgent';
import { ProgressMonitorAgent } from './ProgressMonitorAgent';
import {
  AgentResponse,
  GenerationOptions,
  ChunkedGenerationResult,
  ProgressState,
  ChunkStrategy,
  RecipeConcept
} from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * BMAD Coordinator - Orchestrates all agents for bulk recipe generation
 */
export class BMADCoordinator {
  private conceptAgent: RecipeConceptAgent;
  private progressMonitor: ProgressMonitorAgent;
  private activeBatches: Set<string> = new Set();

  constructor() {
    this.conceptAgent = new RecipeConceptAgent();
    this.progressMonitor = new ProgressMonitorAgent();
  }

  /**
   * Initialize all agents
   */
  async initialize(): Promise<void> {
    await this.conceptAgent.initialize();
    await this.progressMonitor.initialize();
    console.log('[BMADCoordinator] All agents initialized');
  }

  /**
   * Generate bulk recipes using multi-agent workflow
   * This is the main entry point for Phase 1
   */
  async generateBulkRecipes(
    options: GenerationOptions
  ): Promise<ChunkedGenerationResult> {
    const correlationId = uuidv4();
    const batchId = uuidv4();

    console.log(`[BMADCoordinator] Starting bulk generation: ${options.count} recipes (batch: ${batchId})`);

    try {
      // Phase 1: Concept Planning
      const { strategy, concepts } = await this.planGeneration(options, batchId, correlationId);

      // Initialize progress tracking
      await this.progressMonitor.initializeProgress(strategy);
      this.activeBatches.add(batchId);

      // For Phase 1, we return the strategy and concepts
      // Future phases will handle validation, image generation, and database persistence
      const result: ChunkedGenerationResult = {
        batchId: strategy.batchId,
        strategy,
        savedRecipes: [], // Phase 2+ will populate this
        progressState: this.progressMonitor.getProgress(batchId)!,
        totalTime: Date.now() - new Date(this.progressMonitor.getProgress(batchId)!.startTime).getTime(),
        success: true,
        errors: []
      };

      // Mark as complete
      await this.progressMonitor.markComplete(batchId);

      console.log(`[BMADCoordinator] Phase 1 complete for batch ${batchId}`);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[BMADCoordinator] Batch ${batchId} failed:`, errorMessage);

      await this.progressMonitor.recordError(batchId, errorMessage);

      return {
        batchId,
        strategy: {
          totalRecipes: options.count,
          chunkSize: 5,
          chunks: Math.ceil(options.count / 5),
          estimatedTime: options.count * 5000,
          batchId
        },
        savedRecipes: [],
        progressState: this.progressMonitor.getProgress(batchId)!,
        totalTime: 0,
        success: false,
        errors: [errorMessage]
      };
    } finally {
      this.activeBatches.delete(batchId);
    }
  }

  /**
   * Phase 1: Plan generation using Recipe Concept Agent
   */
  private async planGeneration(
    options: GenerationOptions,
    batchId: string,
    correlationId: string
  ): Promise<{ strategy: ChunkStrategy; concepts: RecipeConcept[] }> {
    // Update progress
    await this.progressMonitor.updatePhase(batchId, 'planning');
    await this.progressMonitor.updateAgentStatus(batchId, 'concept', 'working');

    // Generate concepts
    const response = await this.conceptAgent.process(
      { options, batchId },
      correlationId
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Concept generation failed');
    }

    // Update progress
    await this.progressMonitor.updateAgentStatus(batchId, 'concept', 'complete');

    return response.data as any;
  }

  /**
   * Get progress for a specific batch
   */
  getProgress(batchId: string): ProgressState | undefined {
    return this.progressMonitor.getProgress(batchId);
  }

  /**
   * Get all active batches
   */
  getActiveBatches(): string[] {
    return Array.from(this.activeBatches);
  }

  /**
   * Cancel a batch
   */
  async cancelBatch(batchId: string): Promise<boolean> {
    if (!this.activeBatches.has(batchId)) {
      return false;
    }

    await this.progressMonitor.recordError(batchId, 'Batch cancelled by user');
    this.activeBatches.delete(batchId);

    console.log(`[BMADCoordinator] Batch ${batchId} cancelled`);
    return true;
  }

  /**
   * Get coordinator statistics
   */
  getStatistics(): {
    activeBatches: number;
    totalBatches: number;
    agentMetrics: {
      concept: any;
      monitor: any;
    };
  } {
    return {
      activeBatches: this.activeBatches.size,
      totalBatches: this.progressMonitor.getSummaryStats().completedBatches +
                    this.progressMonitor.getSummaryStats().erroredBatches +
                    this.activeBatches.size,
      agentMetrics: {
        concept: this.conceptAgent.getMetrics(),
        monitor: this.progressMonitor.getMetrics()
      }
    };
  }

  /**
   * Cleanup old completed batches
   */
  async cleanup(retentionMs: number = 3600000): Promise<number> {
    return this.progressMonitor.cleanupOldBatches(retentionMs);
  }

  /**
   * Shutdown all agents
   */
  async shutdown(): Promise<void> {
    await this.conceptAgent.shutdown();
    await this.progressMonitor.shutdown();
    this.activeBatches.clear();
    console.log('[BMADCoordinator] All agents shut down');
  }
}
