/**
 * BMAD Recipe Service - Phase 4
 * Integrates all BMAD agents for advanced bulk recipe generation
 * Uses multi-agent workflow for nutrition validation, image generation, and S3 storage
 */

import { RecipeConceptAgent } from './agents/RecipeConceptAgent';
import { NutritionalValidatorAgent } from './agents/NutritionalValidatorAgent';
import { DatabaseOrchestratorAgent } from './agents/DatabaseOrchestratorAgent';
import { ImageGenerationAgent } from './agents/ImageGenerationAgent';
import { ImageStorageAgent } from './agents/ImageStorageAgent';
import { ProgressMonitorAgent } from './agents/ProgressMonitorAgent';
import { generateRecipeBatch, type GeneratedRecipe } from './openai';
import type { GenerationOptions, ChunkedGenerationResult, ProgressState } from './agents/types';
import { nanoid } from 'nanoid';
import { storage } from '../storage';
import { sseManager } from './utils/SSEManager';

interface BMADGenerationOptions extends GenerationOptions {
  enableImageGeneration?: boolean;
  enableS3Upload?: boolean;
  enableNutritionValidation?: boolean;
  progressCallback?: (progress: ProgressState) => void;
  batchId?: string; // Optional: Allow passing batch ID from API
}

interface BMADGenerationResult extends ChunkedGenerationResult {
  imagesGenerated: number;
  imagesUploaded: number;
  nutritionValidationStats: {
    validated: number;
    autoFixed: number;
    failed: number;
  };
}

export class BMADRecipeService {
  private conceptAgent: RecipeConceptAgent;
  private validatorAgent: NutritionalValidatorAgent;
  private databaseAgent: DatabaseOrchestratorAgent;
  private imageAgent: ImageGenerationAgent;
  private storageAgent: ImageStorageAgent;
  private progressAgent: ProgressMonitorAgent;

  constructor() {
    this.conceptAgent = new RecipeConceptAgent();
    this.validatorAgent = new NutritionalValidatorAgent();
    this.databaseAgent = new DatabaseOrchestratorAgent();
    this.imageAgent = new ImageGenerationAgent();
    this.storageAgent = new ImageStorageAgent();
    this.progressAgent = new ProgressMonitorAgent();
  }

  /**
   * Generate recipes using BMAD multi-agent workflow
   */
  async generateRecipes(options: BMADGenerationOptions): Promise<BMADGenerationResult> {
    // Use provided batchId or generate a new one
    const batchId = options.batchId || `bmad_${nanoid(10)}`;
    const startTime = Date.now();

    try {
      // Initialize all agents
      await Promise.all([
        this.conceptAgent.initialize(),
        this.validatorAgent.initialize(),
        this.databaseAgent.initialize(),
        this.imageAgent.initialize(),
        this.storageAgent.initialize(),
        this.progressAgent.initialize()
      ]);

      // Phase 1: Strategy & Concept Generation
      console.log(`[BMAD] Phase 1: Generating strategy for ${options.count} recipes...`);
      const conceptResponse = await this.conceptAgent.process({
        options: { ...options, count: options.count },
        batchId
      }, batchId);

      if (!conceptResponse.success || !conceptResponse.data) {
        throw new Error(`Strategy generation failed: ${conceptResponse.error}`);
      }

      const conceptData = conceptResponse.data as { strategy: any; concepts: any[] };
      const strategy = conceptData.strategy;

      // Initialize progress tracking
      await this.progressAgent.initializeProgress({
        batchId,
        totalRecipes: strategy.totalRecipes,
        chunks: strategy.chunks,
        chunkSize: strategy.chunkSize,
        estimatedTime: strategy.estimatedTime
      });

      // Phase 2: Generate recipes chunk by chunk
      console.log(`[BMAD] Phase 2: Generating ${strategy.totalRecipes} recipes in ${strategy.chunks} chunks...`);

      const allSavedRecipes: any[] = [];
      let nutritionStats = { validated: 0, autoFixed: 0, failed: 0 };
      let imagesGenerated = 0;
      let imagesUploaded = 0;
      const allErrors: string[] = [];

      for (let chunkIndex = 0; chunkIndex < strategy.chunks; chunkIndex++) {
        const chunkSize = Math.min(strategy.chunkSize, strategy.totalRecipes - (chunkIndex * strategy.chunkSize));

        console.log(`[BMAD] Processing chunk ${chunkIndex + 1}/${strategy.chunks} (${chunkSize} recipes)...`);

        // Update progress: generating
        await this.progressAgent.updateProgress(batchId, {
          phase: 'generating',
          currentChunk: chunkIndex + 1,
          recipesCompleted: allSavedRecipes.length
        });

        // Broadcast progress via SSE
        const progress = this.progressAgent.getProgress(batchId);
        if (progress) {
          sseManager.broadcastProgress(batchId, progress);

          if (options.progressCallback) {
            options.progressCallback(progress);
          }
        }

        try {
          // Step 1: Generate recipes via OpenAI
          const generatedRecipes = await generateRecipeBatch(chunkSize, options);

          if (!generatedRecipes || generatedRecipes.length === 0) {
            allErrors.push(`Chunk ${chunkIndex + 1}: No recipes generated`);
            continue;
          }

          // Step 2: Nutritional Validation (if enabled)
          let validatedRecipes = generatedRecipes;
          if (options.enableNutritionValidation !== false) {
            await this.progressAgent.updateProgress(batchId, { phase: 'validating' });

            // Broadcast validation phase via SSE
            const validationProgress = this.progressAgent.getProgress(batchId);
            if (validationProgress) {
              sseManager.broadcastProgress(batchId, validationProgress);
            }

            // Prepare concepts for validation
            const concepts = generatedRecipes.map(r => ({
              name: r.name,
              description: r.description,
              mealTypes: r.mealTypes,
              dietaryTags: r.dietaryTags,
              mainIngredientTags: r.mainIngredientTags,
              estimatedDifficulty: 'medium' as const,
              targetNutrition: {
                calories: options.targetCalories || r.estimatedNutrition.calories,
                protein: r.estimatedNutrition.protein,
                carbs: r.estimatedNutrition.carbs,
                fat: r.estimatedNutrition.fat
              }
            }));

            const validationResponse = await this.validatorAgent.process({
              recipes: generatedRecipes,
              concepts: concepts,
              batchId
            }, batchId);

            if (validationResponse.success && validationResponse.data) {
              const validationData = validationResponse.data as {
                totalValidated: number;
                totalAutoFixed: number;
                totalFailed: number;
                validatedRecipes: any[];
              };
              nutritionStats.validated += validationData.totalValidated;
              nutritionStats.autoFixed += validationData.totalAutoFixed;
              nutritionStats.failed += validationData.totalFailed;
              // Use validated recipes for database save
              if (validationData.validatedRecipes && validationData.validatedRecipes.length > 0) {
                validatedRecipes = validationData.validatedRecipes;
                console.log(`[BMAD] Using ${validatedRecipes.length} validated recipes for database save`);
              }
            }
          }

          console.log(`[BMAD] About to save ${validatedRecipes.length} recipes to database...`);

          // Step 3: Save to database
          await this.progressAgent.updateProgress(batchId, { phase: 'saving' });

          // Broadcast saving phase via SSE
          const savingProgress = this.progressAgent.getProgress(batchId);
          if (savingProgress) {
            sseManager.broadcastProgress(batchId, savingProgress);
          }

          console.log('[BMAD] Calling database agent...');
          const saveResponse = await this.databaseAgent.process({
            validatedRecipes: validatedRecipes,
            batchId
          }, batchId);

          console.log('[BMAD] Database response:', {
            success: saveResponse.success,
            hasData: !!saveResponse.data,
            error: saveResponse.error
          });

          if (!saveResponse.success || !saveResponse.data) {
            allErrors.push(`Chunk ${chunkIndex + 1}: Database save failed - ${saveResponse.error}`);
            continue;
          }

          const saveData = saveResponse.data as { savedRecipes: any[] };
          const savedRecipes = saveData.savedRecipes;
          console.log(`[BMAD] Saved ${savedRecipes.length} recipes to database`);
          console.log('[BMAD] Sample savedRecipe:', savedRecipes[0] ? {
            recipeId: savedRecipes[0].recipeId,
            recipeName: savedRecipes[0].recipeName,
            hasId: !!savedRecipes[0].id
          } : 'none');
          allSavedRecipes.push(...savedRecipes);

          // Step 4: Image Generation (if enabled)
          if (options.enableImageGeneration !== false) {
            await this.progressAgent.updateProgress(batchId, { phase: 'imaging' });

            // Broadcast imaging phase via SSE
            const imagingProgress = this.progressAgent.getProgress(batchId);
            if (imagingProgress) {
              sseManager.broadcastProgress(batchId, imagingProgress);
            }

            const imageResponse = await this.imageAgent.generateBatchImages(
              savedRecipes.map((r: any) => ({
                recipeId: r.recipeId,
                recipeName: r.recipeName,
                recipeDescription: r.recipeDescription || '',
                mealTypes: r.mealTypes || [],
                batchId
              })),
              batchId
            );

            if (imageResponse.success && imageResponse.data) {
              imagesGenerated += imageResponse.data.totalGenerated;

              // Step 5: S3 Upload (if enabled)
              if (options.enableS3Upload !== false) {
                const uploadResponse = await this.storageAgent.uploadBatchImages(
                  imageResponse.data.images.map(img => ({
                    recipeId: img.recipeId,
                    recipeName: img.recipeName,
                    temporaryImageUrl: img.imageMetadata.imageUrl,
                    batchId
                  })),
                  batchId
                );

                if (uploadResponse.success && uploadResponse.data) {
                  imagesUploaded += uploadResponse.data.totalUploaded;

                  // Step 6: Update database with permanent URLs
                  for (const upload of uploadResponse.data.uploads) {
                    if (upload.wasUploaded) {
                      await storage.updateRecipe(String(upload.recipeId), {
                        imageUrl: upload.permanentImageUrl
                      });
                    }
                  }
                }
              }
            }
          }

          // Update progress
          await this.progressAgent.updateProgress(batchId, {
            recipesCompleted: allSavedRecipes.length,
            imagesGenerated: imagesGenerated
          });

          if (options.progressCallback) {
            const progress = this.progressAgent.getProgress(batchId);
            if (progress) {
              options.progressCallback(progress);
            }
          }

        } catch (chunkError) {
          const errorMsg = chunkError instanceof Error ? chunkError.message : String(chunkError);
          allErrors.push(`Chunk ${chunkIndex + 1}: ${errorMsg}`);
          console.error(`[BMAD] Chunk ${chunkIndex + 1} failed:`, chunkError);
        }
      }

      // Phase 3: Finalize
      await this.progressAgent.updateProgress(batchId, { phase: 'complete' });

      const finalProgress = this.progressAgent.getProgress(batchId);

      // Broadcast completion via SSE
      if (finalProgress) {
        sseManager.broadcastProgress(batchId, finalProgress);
      }

      const totalTime = Date.now() - startTime;

      const result: BMADGenerationResult = {
        batchId,
        strategy,
        savedRecipes: allSavedRecipes.map(r => ({
          recipeId: r.recipeId,
          success: r.success,
          error: r.error,
          recipe: r as any,
          imageMetadata: undefined
        })),
        progressState: finalProgress || {} as ProgressState,
        totalTime,
        success: allSavedRecipes.length > 0,
        errors: allErrors,
        imagesGenerated,
        imagesUploaded,
        nutritionValidationStats: nutritionStats
      };

      console.log(`[BMAD] Complete! Generated ${allSavedRecipes.length}/${options.count} recipes in ${totalTime}ms`);
      console.log(`[BMAD] Images: ${imagesGenerated} generated, ${imagesUploaded} uploaded to S3`);
      console.log(`[BMAD] Nutrition: ${nutritionStats.validated} validated, ${nutritionStats.autoFixed} auto-fixed`);

      // Broadcast final completion via SSE
      sseManager.broadcastCompletion(batchId, result);

      return result;

    } catch (error) {
      console.error('[BMAD] Fatal error:', error);

      // Broadcast error via SSE
      sseManager.broadcastError(batchId, {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        phase: 'error',
        batchId
      });

      throw error;
    } finally {
      // Shutdown agents
      await Promise.all([
        this.conceptAgent.shutdown(),
        this.validatorAgent.shutdown(),
        this.databaseAgent.shutdown(),
        this.imageAgent.shutdown(),
        this.storageAgent.shutdown(),
        this.progressAgent.shutdown()
      ]);
    }
  }

  /**
   * Get progress for a batch
   */
  async getProgress(batchId: string): Promise<ProgressState | null> {
    const progress = this.progressAgent.getProgress(batchId);
    return progress || null;
  }

  /**
   * Get metrics for all agents
   */
  getMetrics() {
    return {
      concept: this.conceptAgent.getMetrics(),
      validator: this.validatorAgent.getMetrics(),
      database: this.databaseAgent.getMetrics(),
      imageGeneration: this.imageAgent.getMetrics(),
      imageStorage: this.storageAgent.getMetrics(),
      progress: this.progressAgent.getMetrics()
    };
  }
}

// Export singleton instance
export const bmadRecipeService = new BMADRecipeService();
