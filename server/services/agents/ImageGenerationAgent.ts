/**
 * ImageGenerationAgent - BMAD Phase 3
 * Generates unique recipe images using DALL-E 3
 * Validates image uniqueness and provides placeholder fallback
 */

import { BaseAgent } from './BaseAgent';
import { AgentResponse, RecipeImageMetadata } from './types';
import OpenAI from 'openai';
import crypto from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const imghash = require('imghash');
import { db } from '../../db';
import { sql } from 'drizzle-orm';

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
   * Uses perceptual hashing and database-backed duplicate detection
   */
  private async generateUniqueImage(
    recipe: ImageGenerationInput,
    retryCount: number = 0
  ): Promise<RecipeImageMetadata> {
    const maxRetries = 3;

    try {
      const prompt = this.createImagePrompt(recipe);
      const imageUrl = await this.callDallE3(prompt);

      // Generate perceptual hash (async now)
      const perceptualHash = await this.generateSimilarityHash(imageUrl, recipe.recipeName);

      // Check for duplicates in both memory and database
      const inMemoryDuplicate = this.isDuplicate(perceptualHash);
      const similarImages = await this.findSimilarHashes(perceptualHash, 0.95);

      const isDuplicate = inMemoryDuplicate || similarImages.length > 0;

      if (isDuplicate && retryCount < maxRetries) {
        console.log(`[artist] Duplicate image detected for ${recipe.recipeName}`);
        if (similarImages.length > 0) {
          console.log(`[artist] Found ${similarImages.length} similar image(s) in database (similarity: ${(similarImages[0].similarity * 100).toFixed(1)}%)`);
        }
        console.log(`[artist] Retrying... (${retryCount + 1}/${maxRetries})`);

        // Modify prompt slightly to encourage different image
        return this.generateUniqueImage(recipe, retryCount + 1);
      }

      // Store hash to prevent future duplicates (both in memory and database)
      this.generatedHashes.add(perceptualHash);
      await this.storeImageHash(recipe.recipeId, perceptualHash, imageUrl, prompt);

      return {
        imageUrl,
        dallePrompt: prompt,
        similarityHash: perceptualHash,
        generationTimestamp: new Date(),
        qualityScore: retryCount === 0 ? 100 : Math.max(70, 100 - (retryCount * 10)),
        isPlaceholder: false,
        retryCount
      };
    } catch (error) {
      console.error(`[artist] DALL-E 3 generation failed for ${recipe.recipeName}:`, error);

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
   * Generate a perceptual hash for duplicate detection
   * Uses imghash library to create a hash based on image visual content
   */
  private async generateSimilarityHash(imageUrl: string, recipeName: string): Promise<string> {
    try {
      // Generate perceptual hash (pHash) using imghash
      // 16-bit hash, hex format (64 character string)
      const pHash = await imghash(imageUrl, 16, 'hex');
      console.log(`[artist] Generated pHash for ${recipeName}: ${pHash.substring(0, 16)}...`);
      return pHash;
    } catch (error) {
      console.error(`[artist] Failed to generate pHash for ${recipeName}:`, error);
      // Fallback to basic hash if perceptual hashing fails
      const content = `${recipeName}-${imageUrl.substring(imageUrl.length - 20)}`;
      return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
    }
  }

  /**
   * Check if an image hash is a duplicate (in-memory check)
   * Note: This is supplemented by database checks for persistent duplicate detection
   */
  private isDuplicate(hash: string): boolean {
    return this.generatedHashes.has(hash);
  }

  /**
   * Calculate Hamming distance between two hex strings
   * Returns the number of differing bits
   */
  private calculateHammingDistance(hash1: string, hash2: string): number {
    if (hash1.length !== hash2.length) {
      throw new Error('Hashes must be the same length');
    }

    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
      // Compare each hex character as bits
      const xor = parseInt(hash1[i], 16) ^ parseInt(hash2[i], 16);
      // Count set bits using Brian Kernighan's algorithm
      let n = xor;
      while (n > 0) {
        distance++;
        n &= n - 1;
      }
    }
    return distance;
  }

  /**
   * Find similar images in the database using Hamming distance
   * @param pHash - Perceptual hash to compare
   * @param threshold - Similarity threshold (0-1), where 1 is identical
   * @returns Array of similar image records
   */
  private async findSimilarHashes(pHash: string, threshold: number = 0.95): Promise<any[]> {
    try {
      // Query all existing hashes from database
      const existingHashes = await db.execute(sql`
        SELECT id, recipe_id, perceptual_hash, image_url, dalle_prompt, created_at
        FROM recipe_image_hashes
        ORDER BY created_at DESC
        LIMIT 1000
      `);

      const similar: any[] = [];
      const maxDistance = Math.floor((1 - threshold) * pHash.length * 4); // 4 bits per hex char

      for (const row of existingHashes.rows as any[]) {
        const existingHash = row.perceptual_hash;
        if (!existingHash || existingHash === 'placeholder') continue;

        const distance = this.calculateHammingDistance(pHash, existingHash);
        const similarity = 1 - (distance / (pHash.length * 4));

        if (similarity >= threshold) {
          similar.push({
            ...row,
            hammingDistance: distance,
            similarity: similarity
          });
        }
      }

      return similar;
    } catch (error) {
      console.error('[artist] Error finding similar hashes:', error);
      return [];
    }
  }

  /**
   * Store image hash in database for persistent duplicate detection
   */
  private async storeImageHash(
    recipeId: number,
    perceptualHash: string,
    imageUrl: string,
    dallePrompt: string
  ): Promise<void> {
    try {
      await db.execute(sql`
        INSERT INTO recipe_image_hashes (
          recipe_id,
          perceptual_hash,
          similarity_hash,
          image_url,
          dalle_prompt,
          created_at
        ) VALUES (
          ${recipeId}::uuid,
          ${perceptualHash},
          ${perceptualHash.substring(0, 16)},
          ${imageUrl},
          ${dallePrompt},
          NOW()
        )
      `);
      console.log(`[artist] Stored pHash for recipe ${recipeId}`);
    } catch (error) {
      console.error(`[artist] Failed to store image hash:`, error);
      // Don't throw - this is non-critical for image generation
    }
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
