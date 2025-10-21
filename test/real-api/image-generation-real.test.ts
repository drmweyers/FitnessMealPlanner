/**
 * REAL API IMAGE GENERATION TESTS
 *
 * ⚠️ WARNING: These tests make REAL API calls to:
 * - OpenAI DALL-E 3 ($0.04 per image)
 * - DigitalOcean Spaces S3 (storage costs)
 *
 * Run only when you want to validate actual system behavior.
 *
 * Usage:
 *   npm run test:real-api
 *
 * Expected costs per run: ~$0.20 (5 images × $0.04)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ImageGenerationAgent } from '../../server/services/agents/ImageGenerationAgent';
import { ImageStorageAgent } from '../../server/services/agents/ImageStorageAgent';
import type { ImageGenerationInput } from '../../server/services/agents/ImageGenerationAgent';

describe('Real API Image Generation Tests', () => {
  let imageAgent: ImageGenerationAgent;
  let storageAgent: ImageStorageAgent;

  beforeAll(() => {
    // Verify we have real API keys
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.startsWith('test')) {
      throw new Error('REAL OPENAI_API_KEY required for these tests');
    }
    if (!process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID === 'test-key') {
      throw new Error('REAL AWS credentials required for these tests');
    }

    console.log('✅ Real API credentials detected');
    console.log('💰 Cost estimate for this test run: ~$0.20');

    imageAgent = new ImageGenerationAgent();
    storageAgent = new ImageStorageAgent();
  });

  describe('DALL-E 3 Image Generation', () => {
    it('should generate a real image with DALL-E 3', async () => {
      const recipe: ImageGenerationInput = {
        recipeId: 99999,
        recipeName: 'Test Grilled Chicken Bowl',
        recipeDescription: 'Grilled chicken with quinoa and vegetables',
        mealTypes: ['Lunch'],
        batchId: 'real-api-test-1'
      };

      const result = await imageAgent.generateBatchImages([recipe], 'real-api-test-1');

      // Verify response structure
      expect(result.success).toBe(true);
      expect(result.data.images).toHaveLength(1);

      const imageData = result.data.images[0];
      expect(imageData.recipeId).toBe(99999);
      expect(imageData.imageMetadata.isPlaceholder).toBe(false);
      expect(imageData.imageMetadata.imageUrl).toContain('oaidalleapiprodscus');
      expect(imageData.imageMetadata.dallePrompt).toContain('Grilled Chicken Bowl');

      console.log('✅ DALL-E 3 generated image:', imageData.imageMetadata.imageUrl);
      console.log('📝 Prompt used:', imageData.imageMetadata.dallePrompt);
    }, 90000); // 90 second timeout

    it('should generate unique images for different recipes', async () => {
      const recipes: ImageGenerationInput[] = [
        {
          recipeId: 99998,
          recipeName: 'Salmon Teriyaki Bowl',
          recipeDescription: 'Grilled salmon with teriyaki glaze over rice',
          mealTypes: ['Dinner'],
          batchId: 'real-api-test-2'
        },
        {
          recipeId: 99997,
          recipeName: 'Vegetarian Buddha Bowl',
          recipeDescription: 'Colorful bowl with chickpeas, quinoa, and roasted vegetables',
          mealTypes: ['Lunch'],
          batchId: 'real-api-test-2'
        }
      ];

      const result = await imageAgent.generateBatchImages(recipes, 'real-api-test-2');

      expect(result.success).toBe(true);
      expect(result.data.images).toHaveLength(2);

      const image1 = result.data.images[0];
      const image2 = result.data.images[1];

      // Verify both images generated
      expect(image1.imageMetadata.isPlaceholder).toBe(false);
      expect(image2.imageMetadata.isPlaceholder).toBe(false);

      // Verify unique URLs
      expect(image1.imageMetadata.imageUrl).not.toBe(image2.imageMetadata.imageUrl);

      // Verify unique prompts
      expect(image1.imageMetadata.dallePrompt).not.toBe(image2.imageMetadata.dallePrompt);

      console.log('✅ Image 1:', image1.imageMetadata.imageUrl);
      console.log('✅ Image 2:', image2.imageMetadata.imageUrl);
      console.log('✅ Images are unique!');
    }, 180000); // 3 minute timeout for 2 images
  });

  describe('S3 Upload Integration', () => {
    it('should upload generated image to S3 successfully', async () => {
      const recipe: ImageGenerationInput = {
        recipeId: 99996,
        recipeName: 'Test Shrimp Tacos',
        recipeDescription: 'Spicy shrimp tacos with cabbage slaw',
        mealTypes: ['Dinner'],
        batchId: 'real-api-test-3'
      };

      // Step 1: Generate image with DALL-E 3
      const genResult = await imageAgent.generateBatchImages([recipe], 'real-api-test-3');
      expect(genResult.success).toBe(true);

      const imageMetadata = genResult.data.images[0].imageMetadata;
      const dalleUrl = imageMetadata.imageUrl;

      console.log('📸 DALL-E 3 generated:', dalleUrl);

      // Step 2: Upload to S3
      const uploadInput = [{
        recipeId: 99996,
        imageUrl: dalleUrl,
        recipeName: 'Test Shrimp Tacos'
      }];

      const uploadResult = await storageAgent.uploadBatchImages(uploadInput, 'real-api-test-3');

      expect(uploadResult.success).toBe(true);
      expect(uploadResult.data.images).toHaveLength(1);

      const uploadedImage = uploadResult.data.images[0];
      expect(uploadedImage.finalImageUrl).toContain('digitaloceanspaces.com');
      expect(uploadedImage.finalImageUrl).toContain('.png');

      console.log('✅ Uploaded to S3:', uploadedImage.finalImageUrl);

      // Step 3: Verify image is publicly accessible
      const response = await fetch(uploadedImage.finalImageUrl);
      expect(response.ok).toBe(true);
      expect(response.headers.get('content-type')).toContain('image');

      console.log('✅ Image is publicly accessible!');
    }, 120000); // 2 minute timeout
  });

  describe('End-to-End Image Generation Workflow', () => {
    it('should complete full workflow: DALL-E 3 → S3 → Verify', async () => {
      const recipe: ImageGenerationInput = {
        recipeId: 99995,
        recipeName: 'Complete Workflow Test Pasta',
        recipeDescription: 'Creamy carbonara with bacon and parmesan',
        mealTypes: ['Dinner'],
        batchId: 'real-api-test-4'
      };

      // Step 1: Generate image
      console.log('🔄 Step 1: Generating image with DALL-E 3...');
      const genResult = await imageAgent.generateBatchImages([recipe], 'real-api-test-4');

      expect(genResult.success).toBe(true);
      expect(genResult.data.images[0].imageMetadata.isPlaceholder).toBe(false);

      const dalleUrl = genResult.data.images[0].imageMetadata.imageUrl;
      console.log('✅ Step 1 complete:', dalleUrl.substring(0, 50) + '...');

      // Step 2: Upload to S3
      console.log('🔄 Step 2: Uploading to S3...');
      const uploadResult = await storageAgent.uploadBatchImages([{
        recipeId: 99995,
        imageUrl: dalleUrl,
        recipeName: recipe.recipeName
      }], 'real-api-test-4');

      expect(uploadResult.success).toBe(true);
      const s3Url = uploadResult.data.images[0].finalImageUrl;
      console.log('✅ Step 2 complete:', s3Url);

      // Step 3: Verify accessibility
      console.log('🔄 Step 3: Verifying image accessibility...');
      const imageResponse = await fetch(s3Url);
      expect(imageResponse.ok).toBe(true);

      const imageBuffer = await imageResponse.arrayBuffer();
      expect(imageBuffer.byteLength).toBeGreaterThan(10000); // At least 10KB

      console.log('✅ Step 3 complete: Image is accessible and valid');
      console.log('📊 Image size:', (imageBuffer.byteLength / 1024).toFixed(2), 'KB');

      // Step 4: Verify image metadata
      console.log('🔄 Step 4: Checking metadata...');
      expect(genResult.data.images[0].imageMetadata.dallePrompt).toBeDefined();
      expect(genResult.data.images[0].imageMetadata.dallePrompt).toContain('carbonara');

      console.log('✅ Step 4 complete: Metadata valid');
      console.log('');
      console.log('🎉 END-TO-END TEST SUCCESSFUL!');
      console.log('-----------------------------------');
      console.log('DALL-E URL:', dalleUrl.substring(0, 60) + '...');
      console.log('S3 URL:', s3Url);
      console.log('Image Size:', (imageBuffer.byteLength / 1024).toFixed(2), 'KB');
      console.log('Prompt:', genResult.data.images[0].imageMetadata.dallePrompt);
    }, 180000); // 3 minute timeout
  });

  describe('Image Uniqueness Validation (Real Images)', () => {
    it('should generate visually different images for similar recipes', async () => {
      const recipes: ImageGenerationInput[] = [
        {
          recipeId: 99994,
          recipeName: 'Chicken Bowl A',
          recipeDescription: 'Grilled chicken with rice and broccoli',
          mealTypes: ['Lunch'],
          batchId: 'uniqueness-test'
        },
        {
          recipeId: 99993,
          recipeName: 'Chicken Bowl B',
          recipeDescription: 'Grilled chicken with quinoa and asparagus',
          mealTypes: ['Lunch'],
          batchId: 'uniqueness-test'
        }
      ];

      const result = await imageAgent.generateBatchImages(recipes, 'uniqueness-test');

      expect(result.success).toBe(true);
      expect(result.data.images).toHaveLength(2);

      const image1 = result.data.images[0];
      const image2 = result.data.images[1];

      // Verify both generated successfully
      expect(image1.imageMetadata.isPlaceholder).toBe(false);
      expect(image2.imageMetadata.isPlaceholder).toBe(false);

      // Verify different URLs
      expect(image1.imageMetadata.imageUrl).not.toBe(image2.imageMetadata.imageUrl);

      // Verify different prompts
      expect(image1.imageMetadata.dallePrompt).toContain('broccoli');
      expect(image2.imageMetadata.dallePrompt).toContain('asparagus');

      // Verify similarity hashes are different
      expect(image1.imageMetadata.similarityHash).not.toBe(image2.imageMetadata.similarityHash);

      console.log('✅ Uniqueness verified:');
      console.log('  Recipe 1:', image1.imageMetadata.dallePrompt.substring(0, 60) + '...');
      console.log('  Recipe 2:', image2.imageMetadata.dallePrompt.substring(0, 60) + '...');
      console.log('  Hash 1:', image1.imageMetadata.similarityHash);
      console.log('  Hash 2:', image2.imageMetadata.similarityHash);
    }, 180000); // 3 minute timeout
  });

  describe('Performance Benchmarking', () => {
    it('should generate image within 60 seconds', async () => {
      const recipe: ImageGenerationInput = {
        recipeId: 99992,
        recipeName: 'Performance Test Salad',
        recipeDescription: 'Fresh garden salad with mixed greens',
        mealTypes: ['Lunch'],
        batchId: 'perf-test'
      };

      const startTime = Date.now();
      const result = await imageAgent.generateBatchImages([recipe], 'perf-test');
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(60000); // Should be under 60 seconds

      console.log('⏱️  Generation time:', (duration / 1000).toFixed(2), 'seconds');
      console.log('🎯 Target: <60 seconds');
      console.log(duration < 60000 ? '✅ PASS' : '❌ FAIL');
    }, 90000);
  });
});

/**
 * Test Execution Summary
 *
 * This test suite validates:
 * ✅ DALL-E 3 generates real images
 * ✅ Images upload to S3 successfully
 * ✅ Uploaded images are publicly accessible
 * ✅ Images are unique (different URLs, prompts, hashes)
 * ✅ End-to-end workflow completes successfully
 * ✅ Performance meets targets (<60s per image)
 *
 * Cost Estimate:
 * - 5 individual images × $0.04 = $0.20
 * - 2 batch tests (2 images each) × $0.04 × 4 = $0.16
 * - Total: ~$0.36 per full test run
 *
 * To run:
 *   npm run test:real-api
 *
 * To run specific test:
 *   npm run test:real-api -- -t "should generate a real image"
 */
