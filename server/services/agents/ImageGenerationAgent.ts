/**
 * ImageGenerationAgent - BMAD Phase 3
 * Generates unique recipe images using DALL-E 3
 * Validates image uniqueness and provides placeholder fallback
 */

import { BaseAgent } from './BaseAgent';
import { AgentResponse, RecipeImageMetadata } from './types';
import OpenAI from 'openai';
import crypto from 'crypto';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000, // 1 minute timeout for image generation
  maxRetries: 2
});

interface ImageGenerationInput {
  recipeId: number;
  recipeName: string;
  recipeDescription: string;
  mealTypes: string[];
  batchId: string;
}

interface ImageGenerationOutput {
  recipeId: number;
  recipeName: string;
  imageMetadata: RecipeImageMetadata;
  batchId: string;
}

interface BatchImageInput {
  recipes: ImageGenerationInput[];
  batchId: string;
}

interface BatchImageOutput {
  images: ImageGenerationOutput[];
  batchId: string;
  totalGenerated: number;
  totalFailed: number;
  placeholderCount: number;
  errors: string[];
}

export class ImageGenerationAgent extends BaseAgent {
  private readonly PLACEHOLDER_IMAGE_URL = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop';
  private readonly SIMILARITY_THRESHOLD = 0.85; // 85% similarity = duplicate
  private generatedHashes: Set<string> = new Set();

  constructor() {
    super('artist', {
      retryLimit: 2,
      backoffMs: 500,
      fallbackBehavior: 'placeholder',
      notifyUser: true
    });
  }

  async process<BatchImageInput, BatchImageOutput>(
    input: BatchImageInput,
    correlationId: string
  ): Promise<AgentResponse<BatchImageOutput>> {
    return this.executeWithMetrics(async () => {
      const { recipes, batchId } = input as any;

      const images: ImageGenerationOutput[] = [];
      const errors: string[] = [];
      let totalGenerated = 0;
      let totalFailed = 0;
      let placeholderCount = 0;

      for (const recipe of recipes) {
        try {
          const imageMetadata = await this.generateUniqueImage(recipe);

          images.push({
            recipeId: recipe.recipeId,
            recipeName: recipe.recipeName,
            imageMetadata,
            batchId
          });

          if (imageMetadata.isPlaceholder) {
            placeholderCount++;
          } else {
            totalGenerated++;
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          errors.push(`Failed to generate image for ${recipe.recipeName}: ${errorMsg}`);
          totalFailed++;

          // Use placeholder on failure
          images.push({
            recipeId: recipe.recipeId,
            recipeName: recipe.recipeName,
            imageMetadata: this.createPlaceholderMetadata(recipe.recipeName),
            batchId
          });
          placeholderCount++;
        }
      }

      return {
        images,
        batchId,
        totalGenerated,
        totalFailed,
        placeholderCount,
        errors
      } as BatchImageOutput;
    });
  }

  /**
   * Generate a unique image for a recipe, retrying if duplicates are detected
   */
  private async generateUniqueImage(
    recipe: ImageGenerationInput,
    retryCount: number = 0
  ): Promise<RecipeImageMetadata> {
    const maxRetries = 3;

    try {
      const prompt = this.createImagePrompt(recipe);
      const imageUrl = await this.callDallE3(prompt);
      const similarityHash = this.generateSimilarityHash(imageUrl, recipe.recipeName);

      // Check for duplicates
      if (this.isDuplicate(similarityHash) && retryCount < maxRetries) {
        console.log(`Duplicate image detected for ${recipe.recipeName}, retrying... (${retryCount + 1}/${maxRetries})`);
        return this.generateUniqueImage(recipe, retryCount + 1);
      }

      // Store hash to prevent future duplicates
      this.generatedHashes.add(similarityHash);

      return {
        imageUrl,
        dallePrompt: prompt,
        similarityHash,
        generationTimestamp: new Date(),
        qualityScore: retryCount === 0 ? 100 : Math.max(70, 100 - (retryCount * 10)),
        isPlaceholder: false,
        retryCount
      };
    } catch (error) {
      console.error(`DALL-E 3 generation failed for ${recipe.recipeName}:`, error);

      // Use placeholder on failure
      return this.createPlaceholderMetadata(recipe.recipeName);
    }
  }

  /**
   * Create optimized DALL-E 3 prompt for recipe images
   */
  private createImagePrompt(recipe: ImageGenerationInput): string {
    const mealType = recipe.mealTypes[0]?.toLowerCase() || 'meal';

    return `
      Generate an ultra-realistic, high-resolution photograph of "${recipe.recipeName}", a ${mealType} dish.
      ${recipe.recipeDescription}
      Present it artfully plated on a clean white ceramic plate set atop a rustic wooden table.
      Illuminate the scene with soft, natural side lighting to bring out the textures and vibrant colors of the ingredients.
      Use a shallow depth of field (aperture f/2.8) and a 45° camera angle for a professional, editorial look.
      Add subtle garnishes and minimal props (e.g., fresh herbs, linen napkin) to enhance context without clutter.
      The final image should be bright, mouthwatering, and ready for a premium fitness-focused recipe website.
      Style: photorealistic, food photography, professional.
    `.trim();
  }

  /**
   * Call DALL-E 3 API to generate image
   */
  private async callDallE3(prompt: string): Promise<string> {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'hd'
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No image data received from DALL-E 3');
    }

    const imageUrl = response.data[0].url;
    if (!imageUrl) {
      throw new Error('No image URL in DALL-E 3 response');
    }

    return imageUrl;
  }

  /**
   * Generate a similarity hash for duplicate detection
   * Uses recipe name + timestamp for uniqueness tracking
   */
  private generateSimilarityHash(imageUrl: string, recipeName: string): string {
    // Create hash based on recipe name and URL
    // In production, you would download the image and create a perceptual hash
    const content = `${recipeName}-${imageUrl.substring(imageUrl.length - 20)}`;
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Check if an image hash is a duplicate
   */
  private isDuplicate(hash: string): boolean {
    return this.generatedHashes.has(hash);
  }

  /**
   * Create placeholder metadata when generation fails
   */
  private createPlaceholderMetadata(recipeName: string): RecipeImageMetadata {
    return {
      imageUrl: this.PLACEHOLDER_IMAGE_URL,
      dallePrompt: 'Placeholder (generation failed)',
      similarityHash: 'placeholder',
      generationTimestamp: new Date(),
      qualityScore: 0,
      isPlaceholder: true,
      retryCount: 0
    };
  }

  /**
   * Generate images for a batch of recipes
   */
  async generateBatchImages(
    recipes: ImageGenerationInput[],
    batchId: string
  ): Promise<AgentResponse<BatchImageOutput>> {
    return this.process({ recipes, batchId }, batchId);
  }

  /**
   * Get image generation statistics
   */
  getImageStats(): {
    totalGenerated: number;
    uniqueImages: number;
    averageRetries: number;
  } {
    const metrics = this.getMetrics();
    return {
      totalGenerated: metrics.successCount,
      uniqueImages: this.generatedHashes.size,
      averageRetries: 0 // Would track this with more detailed metrics
    };
  }

  /**
   * Clear generated hashes (for testing or new batch sessions)
   */
  clearHashCache(): void {
    this.generatedHashes.clear();
  }
}
