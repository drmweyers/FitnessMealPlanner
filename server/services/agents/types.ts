/**
 * BMAD Multi-Agent Recipe Generation System
 * Shared Types and Interfaces
 *
 * This file defines the core types used across all agents in the system.
 */

/**
 * Agent types in the BMAD system
 */
export type AgentType =
  | 'concept'      // Recipe Concept Agent (Planner)
  | 'validator'    // Nutritional Validator Agent
  | 'artist'       // Image Generation Agent
  | 'coordinator'  // Database Orchestrator Agent
  | 'monitor'      // Progress Monitor Agent
  | 'storage';     // Image Storage Agent (S3 Upload)

/**
 * Agent status states
 */
export type AgentStatus =
  | 'idle'         // Agent is ready but not working
  | 'working'      // Agent is currently processing
  | 'complete'     // Agent has finished successfully
  | 'error'        // Agent encountered an error
  | 'waiting';     // Agent is waiting for another agent

/**
 * Message types for inter-agent communication
 */
export type MessageType =
  | 'request'      // Request work from another agent
  | 'response'     // Respond with work results
  | 'status'       // Status update
  | 'error';       // Error notification

/**
 * Agent communication message
 */
export interface AgentMessage<T = any> {
  fromAgent: AgentType;
  toAgent: AgentType;
  messageType: MessageType;
  payload: T;
  timestamp: Date;
  correlationId: string; // For tracking multi-step operations
}

/**
 * Agent response
 */
export interface AgentResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  nextAgent?: AgentType;
  requiresHumanReview?: boolean;
}

/**
 * Generation strategy determined by Recipe Concept Agent
 */
export interface ChunkStrategy {
  totalRecipes: number;
  chunkSize: number; // Default: 5
  chunks: number;
  estimatedTime: number; // in milliseconds
  batchId: string;
}

/**
 * Recipe concept from Concept Agent
 */
export interface RecipeConcept {
  name: string;
  description: string;
  mealTypes: string[];
  dietaryTags: string[];
  mainIngredientTags: string[];
  estimatedDifficulty: 'easy' | 'medium' | 'hard';
  targetNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

/**
 * Validated recipe from Nutritional Validator Agent
 */
export interface ValidatedRecipe {
  concept: RecipeConcept;
  ingredients: { name: string; amount: number; unit: string }[];
  instructions: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  validationScore: number; // 0-100
  validationNotes: string[];
}

/**
 * Image metadata from Image Generation Agent
 */
export interface RecipeImageMetadata {
  imageUrl: string;
  dallePrompt: string;
  similarityHash: string;
  generationTimestamp: Date;
  qualityScore: number; // 0-100
  isPlaceholder: boolean;
  retryCount: number;
}

/**
 * Saved recipe result from Database Orchestrator Agent
 */
export interface SavedRecipeResult {
  recipeId: number;
  success: boolean;
  error?: string;
  recipe: ValidatedRecipe;
  imageMetadata?: RecipeImageMetadata;
}

/**
 * Progress state tracked by Progress Monitor Agent
 */
export interface ProgressState {
  batchId: string;
  phase: 'planning' | 'generating' | 'validating' | 'saving' | 'imaging' | 'complete' | 'error';
  currentChunk: number;
  totalChunks: number;
  recipesCompleted: number;
  totalRecipes: number;
  imagesGenerated: number;
  errors: string[];
  estimatedTimeRemaining: number; // milliseconds
  startTime: Date;
  agentStatus: {
    concept: AgentStatus;
    validator: AgentStatus;
    artist: AgentStatus;
    coordinator: AgentStatus;
    monitor: AgentStatus;
    storage: AgentStatus;
  };
}

/**
 * Error recovery strategy
 */
export interface ErrorRecoveryStrategy {
  retryLimit: number;
  backoffMs: number;
  fallbackBehavior: 'placeholder' | 'skip' | 'queue_manual_review' | 'preserve-original';
  notifyUser: boolean;
}

/**
 * Generation options (from user input)
 */
export interface GenerationOptions {
  count: number;
  mealTypes?: string[];
  dietaryRestrictions?: string[];
  targetCalories?: number;
  mainIngredient?: string;
  fitnessGoal?: string;
  naturalLanguagePrompt?: string;
  maxPrepTime?: number;
  maxCalories?: number;
  minProtein?: number;
  maxProtein?: number;
  minCarbs?: number;
  maxCarbs?: number;
  minFat?: number;
  maxFat?: number;
}

/**
 * Chunked generation result (final output)
 */
export interface ChunkedGenerationResult {
  batchId: string;
  strategy: ChunkStrategy;
  savedRecipes: SavedRecipeResult[];
  progressState: ProgressState;
  totalTime: number;
  success: boolean;
  errors: string[];
}

/**
 * Agent performance metrics
 */
export interface AgentMetrics {
  agentType: AgentType;
  operationCount: number;
  totalDuration: number;
  averageDuration: number;
  successCount: number;
  errorCount: number;
  lastOperation: Date;
}
