/**
 * BMAD Multi-Agent Recipe Generation System
 * Progress Monitor Agent (Reporter)
 *
 * This agent is responsible for:
 * - Real-time state tracking across all agents
 * - Time estimation and ETA calculations
 * - Error aggregation and reporting
 * - Progress broadcasting (WebSocket/polling support)
 */

import { BaseAgent } from './BaseAgent';
import {
  AgentResponse,
  ProgressState,
  AgentStatus,
  ChunkStrategy
} from './types';

interface ProgressUpdate {
  batchId: string;
  phase?: 'planning' | 'generating' | 'validating' | 'saving' | 'imaging' | 'complete' | 'error';
  currentChunk?: number;
  recipesCompleted?: number;
  imagesGenerated?: number;
  error?: string;
  agentStatusUpdate?: {
    agentType: 'concept' | 'validator' | 'artist' | 'coordinator' | 'monitor';
    status: AgentStatus;
  };
}

/**
 * Progress Monitor Agent - Real-time state tracking and reporting
 */
export class ProgressMonitorAgent extends BaseAgent {
  private progressStates: Map<string, ProgressState> = new Map();
  private readonly TIME_PER_RECIPE_MS = 5000; // 5 seconds per recipe

  constructor() {
    super('monitor', {
      retryLimit: 0, // Monitor never fails, always reports
      backoffMs: 0,
      fallbackBehavior: 'skip',
      notifyUser: false
    });
  }

  /**
   * Process progress update
   */
  async process<ProgressUpdate, ProgressState>(
    input: ProgressUpdate,
    correlationId: string
  ): Promise<AgentResponse<ProgressState>> {
    return this.executeWithMetrics(async () => {
      const update = input as any;
      const state = await this.updateProgress(update);
      return state as ProgressState;
    });
  }

  /**
   * Initialize progress tracking for a new batch
   */
  async initializeProgress(strategy: ChunkStrategy): Promise<ProgressState> {
    const initialState: ProgressState = {
      batchId: strategy.batchId,
      phase: 'planning',
      currentChunk: 0,
      totalChunks: strategy.chunks,
      recipesCompleted: 0,
      totalRecipes: strategy.totalRecipes,
      imagesGenerated: 0,
      errors: [],
      estimatedTimeRemaining: strategy.estimatedTime,
      startTime: new Date(),
      agentStatus: {
        concept: 'idle',
        validator: 'idle',
        artist: 'idle',
        coordinator: 'idle',
        monitor: 'working'
      }
    };

    this.progressStates.set(strategy.batchId, initialState);
    console.log(`[ProgressMonitorAgent] Initialized tracking for batch ${strategy.batchId}`);

    return initialState;
  }

  /**
   * Update progress based on agent activities
   */
  private async updateProgress(update: ProgressUpdate): Promise<ProgressState> {
    const { batchId } = update;
    const currentState = this.progressStates.get(batchId);

    if (!currentState) {
      throw new Error(`No progress state found for batch ${batchId}`);
    }

    // Update phase if provided
    if (update.phase) {
      currentState.phase = update.phase;
    }

    // Update chunk progress
    if (update.currentChunk !== undefined) {
      currentState.currentChunk = update.currentChunk;
    }

    // Update recipes completed
    if (update.recipesCompleted !== undefined) {
      currentState.recipesCompleted = update.recipesCompleted;
    }

    // Update images generated
    if (update.imagesGenerated !== undefined) {
      currentState.imagesGenerated = update.imagesGenerated;
    }

    // Update agent status
    if (update.agentStatusUpdate) {
      const { agentType, status } = update.agentStatusUpdate;
      currentState.agentStatus[agentType] = status;
    }

    // Add error if provided
    if (update.error) {
      currentState.errors.push(update.error);
    }

    // Recalculate estimated time remaining
    currentState.estimatedTimeRemaining = this.calculateTimeRemaining(currentState);

    // Save updated state
    this.progressStates.set(batchId, currentState);

    return currentState;
  }

  /**
   * Calculate estimated time remaining based on current progress
   */
  private calculateTimeRemaining(state: ProgressState): number {
    const recipesRemaining = state.totalRecipes - state.recipesCompleted;

    if (recipesRemaining === 0) {
      return 0;
    }

    // Calculate actual time per recipe based on elapsed time
    const elapsedTime = Date.now() - state.startTime.getTime();
    const recipesCompleted = state.recipesCompleted;

    if (recipesCompleted > 0) {
      const actualTimePerRecipe = elapsedTime / recipesCompleted;
      return Math.round(actualTimePerRecipe * recipesRemaining);
    }

    // Fall back to estimated time
    return recipesRemaining * this.TIME_PER_RECIPE_MS;
  }

  /**
   * Get current progress state for a batch
   */
  getProgress(batchId: string): ProgressState | undefined {
    return this.progressStates.get(batchId);
  }

  /**
   * Update chunk progress
   */
  async updateChunkProgress(
    batchId: string,
    chunkIndex: number,
    recipesInChunk: number
  ): Promise<ProgressState> {
    const update: ProgressUpdate = {
      batchId,
      currentChunk: chunkIndex,
      recipesCompleted: (this.progressStates.get(batchId)?.recipesCompleted || 0) + recipesInChunk
    };

    return this.updateProgress(update);
  }

  /**
   * Update phase
   */
  async updatePhase(
    batchId: string,
    phase: ProgressState['phase']
  ): Promise<ProgressState> {
    const update: ProgressUpdate = {
      batchId,
      phase
    };

    return this.updateProgress(update);
  }

  /**
   * Update agent status
   */
  async updateAgentStatus(
    batchId: string,
    agentType: 'concept' | 'validator' | 'artist' | 'coordinator' | 'monitor',
    status: AgentStatus
  ): Promise<ProgressState> {
    const update: ProgressUpdate = {
      batchId,
      agentStatusUpdate: { agentType, status }
    };

    return this.updateProgress(update);
  }

  /**
   * Record error
   */
  async recordError(batchId: string, error: string): Promise<ProgressState> {
    const update: ProgressUpdate = {
      batchId,
      error,
      phase: 'error'
    };

    return this.updateProgress(update);
  }

  /**
   * Mark batch as complete
   */
  async markComplete(batchId: string): Promise<ProgressState> {
    const state = this.progressStates.get(batchId);

    if (!state) {
      throw new Error(`No progress state found for batch ${batchId}`);
    }

    state.phase = 'complete';
    state.estimatedTimeRemaining = 0;
    state.agentStatus = {
      concept: 'complete',
      validator: 'complete',
      artist: 'complete',
      coordinator: 'complete',
      monitor: 'complete'
    };

    this.progressStates.set(batchId, state);
    console.log(`[ProgressMonitorAgent] Batch ${batchId} marked as complete`);

    return state;
  }

  /**
   * Get all active batches
   */
  getActiveBatches(): string[] {
    const active: string[] = [];

    for (const [batchId, state] of Array.from(this.progressStates.entries())) {
      if (state.phase !== 'complete' && state.phase !== 'error') {
        active.push(batchId);
      }
    }

    return active;
  }

  /**
   * Clean up completed batches (older than retention period)
   */
  async cleanupOldBatches(retentionMs: number = 3600000): Promise<number> {
    const now = Date.now();
    let cleaned = 0;

    for (const [batchId, state] of Array.from(this.progressStates.entries())) {
      const age = now - state.startTime.getTime();

      if (
        (state.phase === 'complete' || state.phase === 'error') &&
        age > retentionMs
      ) {
        this.progressStates.delete(batchId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[ProgressMonitorAgent] Cleaned up ${cleaned} old batches`);
    }

    return cleaned;
  }

  /**
   * Get summary statistics
   */
  getSummaryStats(): {
    activeBatches: number;
    completedBatches: number;
    erroredBatches: number;
    totalRecipesGenerated: number;
  } {
    let activeBatches = 0;
    let completedBatches = 0;
    let erroredBatches = 0;
    let totalRecipesGenerated = 0;

    for (const state of Array.from(this.progressStates.values())) {
      if (state.phase === 'complete') {
        completedBatches++;
        totalRecipesGenerated += state.recipesCompleted;
      } else if (state.phase === 'error') {
        erroredBatches++;
      } else {
        activeBatches++;
      }
    }

    return {
      activeBatches,
      completedBatches,
      erroredBatches,
      totalRecipesGenerated
    };
  }

  /**
   * Format progress for display
   */
  formatProgress(batchId: string): string {
    const state = this.progressStates.get(batchId);

    if (!state) {
      return 'Progress not found';
    }

    const percentage = Math.round((state.recipesCompleted / state.totalRecipes) * 100);
    const eta = this.formatTimeRemaining(state.estimatedTimeRemaining);
    const chunkProgress = `${state.currentChunk}/${state.totalChunks}`;

    return `[${percentage}%] ${state.recipesCompleted}/${state.totalRecipes} recipes | Chunk ${chunkProgress} | ETA: ${eta} | Phase: ${state.phase}`;
  }

  /**
   * Format time remaining as human-readable string
   */
  private formatTimeRemaining(ms: number): string {
    if (ms === 0) return 'Complete';

    const seconds = Math.floor(ms / 1000);

    if (seconds < 60) {
      return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes}m ${remainingSeconds}s`;
  }
}
