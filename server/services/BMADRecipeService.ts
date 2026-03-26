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
import { bmadImageMonitor } from './monitoring/BMADImageGenerationMonitor';

interface BMADGenerationOptions extends GenerationOptions {
  enableImageGeneration?: boolean;
  enableS3Upload?: boolean;
  enableNutritionValidation?: boolean;
  progressCallback?: (progress: ProgressState) => void;
  batchId?: string; // Optional: Allow passing batch ID from API
  tierLevel?: 'starter' | 'professional' | 'enterprise'; // Tier level for generated recipes
  tierLevels?: string[]; // Full array of selected tiers (for reference)
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
      console.log('[BMAD] Input options being passed to concept agent:', {
        count: options.count,
        mealTypes: options.mealTypes,
        dietaryRestrictions: options.dietaryRestrictions,
        targetCalories: options.targetCalories,
        focusIngredient: options.focusIngredient,
        difficultyLevel: options.difficultyLevel,
        recipePreferences: options.recipePreferences,
        maxIngredients: options.maxIngredients,
        fitnessGoal: options.fitnessGoal,
        naturalLanguagePrompt: options.naturalLanguagePrompt,
        maxPrepTime: options.maxPrepTime,
        maxCalories: options.maxCalories,
        minProtein: options.minProtein,
        maxProtein: options.maxProtein,
        minCarbs: options.minCarbs,
        maxCarbs: options.maxCarbs,
        minFat: options.minFat,
        maxFat: options.maxFat
      });
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
      const nutritionStats = { validated: 0, autoFixed: 0, failed: 0 };
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

            // Extract constraints from options for validation
            const constraints = {
              maxCalories: options.maxCalories,
              minProtein: options.minProtein,
              maxProtein: options.maxProtein,
              minCarbs: options.minCarbs,
              maxCarbs: options.maxCarbs,
              minFat: options.minFat,
              maxFat: options.maxFat,
              maxPrepTime: options.maxPrepTime,
            };

            const validationResponse = await this.validatorAgent.process({
              recipes: generatedRecipes,
              concepts: concepts,
              batchId,
              constraints
            }, batchId);

            if (validationResponse.success && validationResponse.data) {
              const validationData = validationResponse.data as {
                totalValidated: number;
                totalAutoFixed: number;
                totalFailed: number;
                validatedRecipes: any[];
                validationErrors?: string[];
              };
              nutritionStats.validated += validationData.totalValidated;
              nutritionStats.autoFixed += validationData.totalAutoFixed;
              nutritionStats.failed += validationData.totalFailed;
              
              // 🎯 UX FIX: Capture validation errors and communicate to user
              if (validationData.totalFailed > 0) {
                const validationError = `⚠️ ${validationData.totalFailed} recipe(s) failed validation constraints:\n` +
                  `- Min Protein: ${constraints.minProtein || 'none'}g\n` +
                  `- Max Protein: ${constraints.maxProtein || 'none'}g\n` +
                  `- Max Calories: ${constraints.maxCalories || 'none'}\n` +
                  `- Suggestion: Adjust your nutritional constraints to more realistic values.`;
                
                allErrors.push(validationError);
                console.warn(`[BMAD] ${validationError}`);
                
                // Broadcast validation warning to frontend
                sseManager.broadcastProgress(batchId, {
                  phase: 'validating',
                  warning: validationError,
                  recipesCompleted: allSavedRecipes.length,
                  totalRecipes: strategy.totalRecipes
                } as any);
              }
              
              // Use validated recipes for database save
              if (validationData.validatedRecipes && validationData.validatedRecipes.length > 0) {
                validatedRecipes = validationData.validatedRecipes;
                console.log(`[BMAD] Using ${validatedRecipes.length} validated recipes for database save`);
              } else if (validationData.totalFailed > 0) {
                // 🎯 UX FIX: If all recipes failed validation, add clear error message
                const constraintSummary = [
                  constraints.minProtein && `minProtein: ${constraints.minProtein}g`,
                  constraints.maxProtein && `maxProtein: ${constraints.maxProtein}g`,
                  constraints.maxCalories && `maxCalories: ${constraints.maxCalories}`,
                  constraints.minCarbs && `minCarbs: ${constraints.minCarbs}g`,
                  constraints.maxCarbs && `maxCarbs: ${constraints.maxCarbs}g`,
                ].filter(Boolean).join(', ');
                
                allErrors.push(
                  `❌ All recipes rejected by validation. Your constraints may be too restrictive: ${constraintSummary}`
                );
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
            batchId,
            tierLevel: options.tierLevel || 'starter' // Pass tier level to database agent
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

          // Update progress after DB save so status polling reflects saved count before imaging
          await this.progressAgent.updateProgress(batchId, {
            recipesCompleted: allSavedRecipes.length,
          });

          // Step 4: Image Generation (if enabled)
          if (options.enableImageGeneration !== false) {
            await this.progressAgent.updateProgress(batchId, { phase: 'imaging', recipesCompleted: allSavedRecipes.length });

            // Broadcast imaging phase via SSE
            const imagingProgress = this.progressAgent.getProgress(batchId);
            if (imagingProgress) {
              sseManager.broadcastProgress(batchId, imagingProgress);
            }

            console.log(`[BMAD] Preparing ${savedRecipes.length} recipes for image generation...`);
            console.log('[BMAD] Sample recipe for image generation:', {
              recipeId: savedRecipes[0]?.recipeId,
              recipeName: savedRecipes[0]?.recipeName,
              hasDescription: !!savedRecipes[0]?.recipeDescription,
              hasMealTypes: !!savedRecipes[0]?.mealTypes
            });

            // Get full recipe data to pass more details to image generation
            const recipesForImageGen = await Promise.all(
              savedRecipes.map(async (r: any) => {
                // Fetch full recipe data to get ingredients and mainIngredientTags
                const fullRecipe = await storage.getRecipe(r.id || r.recipeId);
                // Convert ingredientsJson to ingredients array format
                const ingredients = fullRecipe?.ingredientsJson 
                  ? fullRecipe.ingredientsJson.map((ing: any) => ({
                      name: ing.name || ing.ingredient || '',
                      amount: ing.amount || 0,
                      unit: ing.unit || ''
                    }))
                  : [];
                return {
                  recipeId: r.id || r.recipeId, // Use UUID (r.id) if available, otherwise fallback to recipeId
                  recipeName: r.recipeName,
                  recipeDescription: r.recipeDescription || fullRecipe?.description || '',
                  mealTypes: r.mealTypes || fullRecipe?.mealTypes || [],
                  mainIngredientTags: fullRecipe?.mainIngredientTags || [],
                  ingredients: ingredients,
                  batchId
                };
              })
            );

            const imageResponse = await this.imageAgent.generateBatchImages(
              recipesForImageGen,
              batchId
            );

            console.log('[BMAD] Image generation response:', {
              success: imageResponse.success,
              totalGenerated: imageResponse.data?.totalGenerated,
              totalFailed: imageResponse.data?.totalFailed,
              placeholderCount: imageResponse.data?.placeholderCount,
              errors: imageResponse.data?.errors
            });

            if (imageResponse.success && imageResponse.data) {
              imagesGenerated += imageResponse.data.totalGenerated;

              // Step 5: Delete recipes that don't have images (skipped due to image generation failure)
              // Find recipes that were saved but don't have corresponding images
              const recipesWithImages = new Set(
                imageResponse.data.images.map(img => String(img.recipeId))
              );
              const recipesToDelete: any[] = [];
              
              for (const savedRecipe of savedRecipes) {
                const recipeId = String(savedRecipe.id || savedRecipe.recipeId);
                if (!recipesWithImages.has(recipeId)) {
                  recipesToDelete.push(savedRecipe);
                }
              }

              // Delete recipes without images
              if (recipesToDelete.length > 0) {
                console.log(`[BMAD] Deleting ${recipesToDelete.length} recipes without images...`);
                for (const recipeToDelete of recipesToDelete) {
                  try {
                    const recipeId = recipeToDelete.id || recipeToDelete.recipeId;
                    await storage.deleteRecipe(recipeId);
                    console.log(`[BMAD] Deleted recipe ${recipeId} (${recipeToDelete.recipeName}) - no image generated`);
                    // Remove from allSavedRecipes
                    const index = allSavedRecipes.findIndex(r => (r.id || r.recipeId) === recipeId);
                    if (index >= 0) {
                      allSavedRecipes.splice(index, 1);
                    }
                  } catch (error) {
                    console.error(`[BMAD] Failed to delete recipe ${recipeToDelete.recipeName}:`, error);
                    allErrors.push(`Failed to delete recipe ${recipeToDelete.recipeName} without image`);
                  }
                }
              }

              // Log if no images were generated
              if (imageResponse.data.totalGenerated === 0) {
                console.warn('[BMAD] WARNING: Zero images generated! All recipes in this chunk will be deleted.');
                console.warn('[BMAD] Errors:', imageResponse.data.errors);
                allErrors.push(...imageResponse.data.errors);
              }

              // Step 6: Update recipes with generated image URLs (even if S3 upload is disabled)
              // This ensures recipes have images even if S3 upload fails or is disabled
              if (imageResponse.data.images.length > 0) {
                console.log(`[BMAD] Updating ${imageResponse.data.images.length} recipes with generated image URLs...`);
                
                // Create mapping from recipeId to UUID for all saved recipes
                const recipeIdToUuid = new Map<string | number, string>();
                for (const recipe of savedRecipes) {
                  const recipeId = recipe.id || recipe.recipeId;
                  // Handle both numeric and UUID recipeIds from image generation
                  const imageRecipeId = recipe.id || recipe.recipeId;
                  recipeIdToUuid.set(String(imageRecipeId), String(recipeId));
                  // Also map numeric ID if recipeId was converted
                  if (typeof recipe.recipeId === 'number') {
                    recipeIdToUuid.set(recipe.recipeId, String(recipeId));
                  }
                }

                // Update recipes with temporary DALL-E URLs (will be replaced with S3 URLs if upload succeeds)
                let tempUrlUpdateCount = 0;
                for (const image of imageResponse.data.images) {
                  if (!image.imageMetadata.isPlaceholder && image.imageMetadata.imageUrl) {
                    const recipeUuid = recipeIdToUuid.get(String(image.recipeId)) || recipeIdToUuid.get(image.recipeId);
                    if (recipeUuid) {
                      try {
                        await storage.updateRecipe(recipeUuid, {
                          imageUrl: image.imageMetadata.imageUrl
                        });
                        tempUrlUpdateCount++;
                        console.log(`[BMAD] Updated recipe ${recipeUuid} with temporary image URL: ${image.imageMetadata.imageUrl.substring(0, 50)}...`);
                      } catch (error) {
                        console.error(`[BMAD] Failed to update recipe ${recipeUuid} with image URL:`, error);
                        allErrors.push(`Failed to update recipe ${image.recipeName} with image URL`);
                      }
                    } else {
                      console.warn(`[BMAD] No UUID mapping found for recipeId ${image.recipeId} (recipe: ${image.recipeName})`);
                    }
                  }
                }
                console.log(`[BMAD] Updated ${tempUrlUpdateCount} recipes with temporary image URLs`);
              }

              // Step 7: S3 Upload (if enabled) - this will replace temporary URLs with permanent ones
              if (options.enableS3Upload !== false && imageResponse.data.images.length > 0) {
                console.log(`[BMAD] Starting S3 upload for ${imageResponse.data.images.length} images...`);

                const uploadResponse = await this.storageAgent.uploadBatchImages(
                  imageResponse.data.images.map(img => ({
                    recipeId: img.recipeId,
                    recipeName: img.recipeName,
                    temporaryImageUrl: img.imageMetadata.imageUrl,
                    batchId
                  })),
                  batchId
                );

                console.log('[BMAD] S3 upload response:', {
                  success: uploadResponse.success,
                  totalUploaded: uploadResponse.data?.totalUploaded,
                  totalFailed: uploadResponse.data?.totalFailed,
                  errors: uploadResponse.data?.errors
                });

                if (uploadResponse.success && uploadResponse.data) {
                  imagesUploaded += uploadResponse.data.totalUploaded;

                  // Create mapping from recipeId to UUID (handle both string and number IDs)
                  const recipeIdToUuid = new Map<string | number, string>();
                  for (const recipe of savedRecipes) {
                    const recipeId = recipe.id || recipe.recipeId;
                    // Map both the UUID and any numeric ID that might be used
                    recipeIdToUuid.set(String(recipeId), String(recipeId));
                    if (typeof recipe.recipeId === 'number') {
                      recipeIdToUuid.set(recipe.recipeId, String(recipeId));
                    }
                    // Also map from image generation recipeId format
                    const imageRecipeId = recipe.id || recipe.recipeId;
                    recipeIdToUuid.set(String(imageRecipeId), String(recipeId));
                  }

                  // Step 7: Update database with permanent S3 URLs (replaces temporary URLs)
                  console.log(`[BMAD] Updating ${uploadResponse.data.uploads.length} recipes with permanent S3 URLs...`);
                  let updatedCount = 0;
                  for (const upload of uploadResponse.data.uploads) {
                    // Only update with S3 URL if upload succeeded - do not keep temporary URL on failure
                    if (upload.wasUploaded && upload.permanentImageUrl) {
                      // Find the UUID for this recipeId (handle both string and number)
                      const recipeUuid = recipeIdToUuid.get(String(upload.recipeId)) || 
                                        recipeIdToUuid.get(upload.recipeId) ||
                                        recipeIdToUuid.get(Number(upload.recipeId));
                      
                      if (recipeUuid) {
                        try {
                          console.log(`[BMAD] Updating recipe ${upload.recipeId} (UUID: ${recipeUuid}) with S3 URL: ${upload.permanentImageUrl.substring(0, 50)}...`);
                          await storage.updateRecipe(recipeUuid, {
                            imageUrl: upload.permanentImageUrl
                          });
                          updatedCount++;
                        } catch (error) {
                          console.error(`[BMAD] Failed to update recipe ${recipeUuid} with S3 URL:`, error);
                          allErrors.push(`Failed to update recipe ${upload.recipeName} with S3 URL`);
                        }
                      } else {
                        console.error(`[BMAD] No UUID found for recipeId ${upload.recipeId} (recipe: ${upload.recipeName})`);
                        console.error(`[BMAD] Available mappings:`, Array.from(recipeIdToUuid.entries()));
                      }
                    } else {
                      console.log(`[BMAD] S3 upload failed for ${upload.recipeName}, not using temporary URL`);
                      // Remove temporary URL from recipe if S3 upload failed
                      const recipeUuid = recipeIdToUuid.get(String(upload.recipeId)) || 
                                        recipeIdToUuid.get(upload.recipeId) ||
                                        recipeIdToUuid.get(Number(upload.recipeId));
                      if (recipeUuid) {
                        try {
                          await storage.updateRecipe(recipeUuid, {
                            imageUrl: null
                          });
                          console.log(`[BMAD] Removed temporary image URL from recipe ${upload.recipeName} due to S3 upload failure`);
                        } catch (error) {
                          console.error(`[BMAD] Failed to remove temporary URL from recipe ${recipeUuid}:`, error);
                        }
                      }
                    }
                  }
                  console.log(`[BMAD] Updated ${updatedCount} recipes with S3 URLs`);
                } else {
                  console.error('[BMAD] S3 upload failed:', uploadResponse.error);
                  allErrors.push(`S3 upload failed: ${uploadResponse.error}`);
                  
                  // Delete recipes without permanent images since S3 upload failed
                  // Recipes require images, so delete them if S3 upload fails
                  console.log('[BMAD] Deleting recipes without permanent images due to S3 upload failure...');
                  const recipeIdToUuid = new Map<string | number, string>();
                  for (const recipe of savedRecipes) {
                    const recipeId = recipe.id || recipe.recipeId;
                    recipeIdToUuid.set(String(recipeId), String(recipeId));
                    if (typeof recipe.recipeId === 'number') {
                      recipeIdToUuid.set(recipe.recipeId, String(recipeId));
                    }
                  }
                  
                  // Delete all recipes that were supposed to get S3 images
                  for (const image of imageResponse.data.images) {
                    if (!image.imageMetadata.isPlaceholder && image.imageMetadata.imageUrl) {
                      const recipeUuid = recipeIdToUuid.get(String(image.recipeId)) || recipeIdToUuid.get(image.recipeId);
                      if (recipeUuid) {
                        try {
                          await storage.deleteRecipe(recipeUuid);
                          console.log(`[BMAD] Deleted recipe ${recipeUuid} (${image.recipeName}) - S3 upload failed, recipe requires images`);
                          // Remove from allSavedRecipes
                          const index = allSavedRecipes.findIndex(r => (r.id || r.recipeId) === recipeUuid);
                          if (index >= 0) {
                            allSavedRecipes.splice(index, 1);
                          }
                        } catch (error) {
                          console.error(`[BMAD] Failed to delete recipe ${recipeUuid}:`, error);
                          allErrors.push(`Failed to delete recipe ${image.recipeName} after S3 upload failure`);
                        }
                      }
                    }
                  }
                }
              } else if (options.enableS3Upload === false) {
                console.log('[BMAD] S3 upload disabled, recipes already updated with temporary DALL-E URLs');
              } else {
                console.warn('[BMAD] Skipping S3 upload: no images to upload');
              }
            } else {
              console.error('[BMAD] Image generation failed:', imageResponse.error);
              allErrors.push(`Image generation failed: ${imageResponse.error}`);
              
              // Delete all saved recipes in this chunk since no images were generated
              console.log(`[BMAD] Deleting all ${savedRecipes.length} recipes in chunk ${chunkIndex + 1} - no images generated`);
              for (const recipeToDelete of savedRecipes) {
                try {
                  const recipeId = recipeToDelete.id || recipeToDelete.recipeId;
                  await storage.deleteRecipe(recipeId);
                  console.log(`[BMAD] Deleted recipe ${recipeId} (${recipeToDelete.recipeName || recipeToDelete.recipeId}) - image generation failed`);
                  // Remove from allSavedRecipes
                  const index = allSavedRecipes.findIndex(r => (r.id || r.recipeId) === recipeId);
                  if (index >= 0) {
                    allSavedRecipes.splice(index, 1);
                  }
                } catch (error) {
                  console.error(`[BMAD] Failed to delete recipe ${recipeToDelete.recipeName || recipeToDelete.recipeId}:`, error);
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

          // Broadcast chunk error via SSE so UI can display it
          sseManager.broadcastError(batchId, {
            error: `Recipe generation failed: ${errorMsg}`,
            phase: 'error',
            batchId,
            chunkIndex: chunkIndex + 1
          });

          // Stop processing remaining chunks if critical error (like quota exceeded)
          if (errorMsg.includes('quota') || errorMsg.includes('429')) {
            console.error('[BMAD] Quota exceeded, stopping batch generation');
            break;
          }
        }
      }

      // Phase 3: Finalize
      const hasErrors = allErrors.length > 0;
      const hasRecipes = allSavedRecipes.length > 0;

      // Set appropriate completion phase
      if (hasRecipes && !hasErrors) {
        await this.progressAgent.updateProgress(batchId, { phase: 'complete' });
      } else if (hasRecipes && hasErrors) {
        await this.progressAgent.updateProgress(batchId, {
          phase: 'complete',
          recipesCompleted: allSavedRecipes.length,
        });
      } else {
        // No recipes generated
        await this.progressAgent.updateProgress(batchId, { phase: 'error' });
      }

      const finalProgress = this.progressAgent.getProgress(batchId);

      // Broadcast completion via SSE with error info
      if (finalProgress) {
        if (hasErrors && !hasRecipes) {
          // Generation completely failed
          sseManager.broadcastError(batchId, {
            error: allErrors.join('; '),
            phase: 'failed',
            batchId
          });
        } else {
          sseManager.broadcastProgress(batchId, finalProgress);
        }
      }

      const totalTime = Date.now() - startTime;

      const result: BMADGenerationResult = {
        batchId,
        strategy,
        savedRecipes: allSavedRecipes.map(r => ({
          recipeId: r.recipeId,
          recipeName: r.recipeName || r.recipe?.name || 'Unknown',
          success: r.success !== false,
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

      // Monitor image generation health
      const monitoringResult = bmadImageMonitor.monitorGenerationResult({
        batchId,
        savedRecipes: allSavedRecipes,
        imagesGenerated,
        imagesUploaded,
        nutritionValidationStats: nutritionStats
      });

      // Log monitoring results
      if (monitoringResult.alert) {
        console.error(`[BMAD] ${monitoringResult.alert.severity.toUpperCase()}: ${monitoringResult.alert.message}`);
      }

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
