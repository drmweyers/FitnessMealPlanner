/**
 * ImageStorageAgent - BMAD Phase 4
 * Uploads generated recipe images to S3 for permanent storage
 * Integrates with ImageGenerationAgent to persist DALL-E URLs
 */

import { BaseAgent } from './BaseAgent';
import { AgentResponse } from './types';
import { uploadImageToS3 } from '../utils/S3Uploader';

interface ImageUploadInput {
  recipeId: number;
  recipeName: string;
  temporaryImageUrl: string;
  batchId: string;
}

interface ImageUploadOutput {
  recipeId: number;
  recipeName: string;
  permanentImageUrl: string;
  wasUploaded: boolean;
  uploadDurationMs?: number;
  batchId: string;
}

interface BatchUploadInput {
  images: ImageUploadInput[];
  batchId: string;
}

interface BatchUploadOutput {
  uploads: ImageUploadOutput[];
  batchId: string;
  totalUploaded: number;
  totalFailed: number;
  errors: string[];
}

export class ImageStorageAgent extends BaseAgent {
  private readonly UPLOAD_TIMEOUT_MS = 30000; // 30 seconds per image
  private readonly MAX_CONCURRENT_UPLOADS = 5; // Limit concurrent uploads

  constructor() {
    super('storage', {
      retryLimit: 2,
      backoffMs: 1000,
      fallbackBehavior: 'preserve-original',
      notifyUser: true
    });
  }

  async process<BatchUploadInput, BatchUploadOutput>(
    input: BatchUploadInput,
    correlationId: string
  ): Promise<AgentResponse<BatchUploadOutput>> {
    return this.executeWithMetrics(async () => {
      const { images, batchId } = input as any;

      const uploads: ImageUploadOutput[] = [];
      const errors: string[] = [];
      let totalUploaded = 0;
      let totalFailed = 0;

      // Process uploads in chunks to avoid overwhelming S3
      const chunks = this.chunkArray(images, this.MAX_CONCURRENT_UPLOADS);

      for (const chunk of chunks) {
        const chunkResults = await Promise.allSettled(
          chunk.map(image => this.uploadSingleImage(image))
        );

        chunkResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            uploads.push(result.value);
            if (result.value.wasUploaded) {
              totalUploaded++;
            } else {
              totalFailed++;
            }
          } else {
            const image = chunk[index];
            const errorMsg = result.reason instanceof Error
              ? result.reason.message
              : String(result.reason);
            errors.push(`Failed to upload ${image.recipeName}: ${errorMsg}`);
            totalFailed++;

            // Add failed upload with original URL
            uploads.push({
              recipeId: image.recipeId,
              recipeName: image.recipeName,
              permanentImageUrl: image.temporaryImageUrl,
              wasUploaded: false,
              batchId: image.batchId
            });
          }
        });
      }

      return {
        uploads,
        batchId,
        totalUploaded,
        totalFailed,
        errors
      } as BatchUploadOutput;
    });
  }

  /**
   * Upload a single image to S3 with timeout and error handling
   */
  private async uploadSingleImage(
    image: ImageUploadInput
  ): Promise<ImageUploadOutput> {
    const startTime = Date.now();

    try {
      // Upload to S3 with timeout
      const permanentUrl = await this.withTimeout(
        uploadImageToS3(image.temporaryImageUrl, image.recipeName),
        this.UPLOAD_TIMEOUT_MS
      );

      const duration = Date.now() - startTime;

      return {
        recipeId: image.recipeId,
        recipeName: image.recipeName,
        permanentImageUrl: permanentUrl,
        wasUploaded: true,
        uploadDurationMs: duration,
        batchId: image.batchId
      };
    } catch (error) {
      console.error(`S3 upload failed for ${image.recipeName}:`, error);

      // Fallback to temporary URL (better than nothing)
      return {
        recipeId: image.recipeId,
        recipeName: image.recipeName,
        permanentImageUrl: image.temporaryImageUrl,
        wasUploaded: false,
        batchId: image.batchId
      };
    }
  }

  /**
   * Timeout wrapper for S3 uploads
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Upload timeout after ${timeoutMs}ms`)),
          timeoutMs
        )
      )
    ]);
  }

  /**
   * Split array into chunks for controlled concurrent processing
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Upload images for a batch of recipes
   */
  async uploadBatchImages(
    images: ImageUploadInput[],
    batchId: string
  ): Promise<AgentResponse<BatchUploadOutput>> {
    return this.process({ images, batchId }, batchId);
  }

  /**
   * Get upload statistics
   */
  getUploadStats(): {
    totalUploaded: number;
    averageUploadTime: number;
    successRate: number;
  } {
    const metrics = this.getMetrics();
    return {
      totalUploaded: metrics.successCount,
      averageUploadTime: metrics.averageOperationDuration,
      successRate: metrics.successCount / (metrics.successCount + metrics.errorCount) || 0
    };
  }
}
