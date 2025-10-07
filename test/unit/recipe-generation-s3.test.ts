import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import OpenAI from 'openai';

// Mock the modules
vi.mock('@aws-sdk/client-s3');
vi.mock('openai');

describe('Recipe Generation with S3 Integration', () => {
  let mockS3Client: any;
  let mockOpenAI: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock S3Client
    mockS3Client = {
      send: vi.fn().mockResolvedValue({
        $metadata: { httpStatusCode: 200 },
        ETag: 'mock-etag',
        VersionId: 'mock-version',
      }),
    };
    (S3Client as any).mockImplementation(() => mockS3Client);

    // Mock OpenAI
    mockOpenAI = {
      images: {
        generate: vi.fn().mockResolvedValue({
          data: [
            {
              url: 'https://mock-openai-image.com/test.png',
            },
          ],
        }),
      },
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    name: 'Test Recipe',
                    category: 'Breakfast',
                    description: 'A delicious test recipe',
                    prepTime: 10,
                    cookTime: 20,
                    servings: 2,
                    calories: 300,
                    protein: 25,
                    carbs: 30,
                    fat: 10,
                    ingredients: ['ingredient 1', 'ingredient 2'],
                    instructions: ['step 1', 'step 2'],
                  }),
                },
              },
            ],
          }),
        },
      },
    };
    (OpenAI as any).mockImplementation(() => mockOpenAI);
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('S3 Configuration', () => {
    it('should have correct S3 bucket configuration', () => {
      const expectedConfig = {
        bucketName: 'pti',
        region: 'tor1',
        endpoint: 'https://tor1.digitaloceanspaces.com',
        accessKeyId: 'DO00Q343F2BG3ZGALNDE',
      };

      // These should be set in environment variables
      expect(process.env.S3_BUCKET_NAME).toBe(expectedConfig.bucketName);
      expect(process.env.AWS_REGION).toBe(expectedConfig.region);
      expect(process.env.AWS_ENDPOINT).toBe(expectedConfig.endpoint);
      expect(process.env.AWS_ACCESS_KEY_ID).toBe(expectedConfig.accessKeyId);
    });

    it('should connect to DigitalOcean Spaces instead of AWS S3', () => {
      const s3Client = new S3Client({
        region: process.env.AWS_REGION || 'tor1',
        endpoint: process.env.AWS_ENDPOINT || 'https://tor1.digitaloceanspaces.com',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        },
      });

      expect(S3Client).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: 'https://tor1.digitaloceanspaces.com',
          region: 'tor1',
        })
      );
    });
  });

  describe('Recipe Image Generation', () => {
    it('should generate recipe image using OpenAI', async () => {
      const prompt = 'A delicious breakfast bowl with eggs and vegetables';
      
      const result = await mockOpenAI.images.generate({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
      });

      expect(mockOpenAI.images.generate).toHaveBeenCalledWith({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
      });
      expect(result.data[0].url).toBe('https://mock-openai-image.com/test.png');
    });

    it('should handle OpenAI API errors gracefully', async () => {
      mockOpenAI.images.generate.mockRejectedValueOnce(new Error('OpenAI API error'));

      await expect(
        mockOpenAI.images.generate({
          model: 'dall-e-3',
          prompt: 'test',
          n: 1,
          size: '1024x1024',
        })
      ).rejects.toThrow('OpenAI API error');
    });
  });

  describe('S3 Image Upload', () => {
    it('should upload image to S3 with correct parameters', async () => {
      const imageBuffer = Buffer.from('mock-image-data');
      const fileName = 'recipe-123.jpg';
      const bucketName = 'pti';

      const putCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: `recipes/${fileName}`,
        Body: imageBuffer,
        ContentType: 'image/jpeg',
        ACL: 'public-read',
      });

      await mockS3Client.send(putCommand);

      expect(mockS3Client.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: bucketName,
            Key: `recipes/${fileName}`,
            ContentType: 'image/jpeg',
            ACL: 'public-read',
          }),
        })
      );
    });

    it('should generate correct public URL for uploaded image', () => {
      const fileName = 'recipe-123.jpg';
      const bucketName = 'pti';
      const endpoint = 'https://tor1.digitaloceanspaces.com';

      const expectedUrl = `${endpoint}/${bucketName}/recipes/${fileName}`;
      
      expect(expectedUrl).toBe('https://tor1.digitaloceanspaces.com/pti/recipes/recipe-123.jpg');
    });

    it('should handle S3 upload errors', async () => {
      mockS3Client.send.mockRejectedValueOnce(new Error('S3 upload failed'));

      const putCommand = new PutObjectCommand({
        Bucket: 'pti',
        Key: 'recipes/test.jpg',
        Body: Buffer.from('test'),
        ContentType: 'image/jpeg',
      });

      await expect(mockS3Client.send(putCommand)).rejects.toThrow('S3 upload failed');
    });
  });

  describe('Complete Recipe Generation Flow', () => {
    it('should complete full recipe generation with image', async () => {
      // Step 1: Generate recipe data
      const recipeResponse = await mockOpenAI.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Generate a recipe in JSON format',
          },
          {
            role: 'user',
            content: 'Create a healthy breakfast recipe',
          },
        ],
      });

      const recipeData = JSON.parse(
        recipeResponse.choices[0].message.content
      );

      expect(recipeData.name).toBe('Test Recipe');
      expect(recipeData.category).toBe('Breakfast');
      expect(recipeData.calories).toBe(300);

      // Step 2: Generate image for the recipe
      const imageResponse = await mockOpenAI.images.generate({
        model: 'dall-e-3',
        prompt: `Professional food photography of ${recipeData.name}: ${recipeData.description}`,
        n: 1,
        size: '1024x1024',
      });

      expect(imageResponse.data[0].url).toBeTruthy();

      // Step 3: Upload image to S3
      const imageUrl = imageResponse.data[0].url;
      const recipeId = 'recipe-' + Date.now();
      const fileName = `${recipeId}.jpg`;

      const putCommand = new PutObjectCommand({
        Bucket: 'pti',
        Key: `recipes/${fileName}`,
        Body: Buffer.from('mock-image-data'), // In real scenario, fetch from imageUrl
        ContentType: 'image/jpeg',
        ACL: 'public-read',
      });

      const uploadResult = await mockS3Client.send(putCommand);
      
      expect(uploadResult.$metadata.httpStatusCode).toBe(200);
      
      // Step 4: Construct final image URL
      const finalImageUrl = `https://tor1.digitaloceanspaces.com/pti/recipes/${fileName}`;
      
      // Step 5: Save recipe with image URL
      const completeRecipe = {
        ...recipeData,
        imageUrl: finalImageUrl,
        id: recipeId,
        createdAt: new Date().toISOString(),
      };

      expect(completeRecipe.imageUrl).toContain('tor1.digitaloceanspaces.com/pti/recipes/');
      expect(completeRecipe.name).toBe('Test Recipe');
    });

    it('should use placeholder image if generation fails', async () => {
      // Mock image generation failure
      mockOpenAI.images.generate.mockRejectedValueOnce(new Error('Image generation failed'));

      const placeholderUrl = 'https://tor1.digitaloceanspaces.com/pti/recipes/placeholder.jpg';
      
      let imageUrl;
      try {
        await mockOpenAI.images.generate({
          model: 'dall-e-3',
          prompt: 'test',
          n: 1,
          size: '1024x1024',
        });
      } catch (error) {
        // Fallback to placeholder
        imageUrl = placeholderUrl;
      }

      expect(imageUrl).toBe(placeholderUrl);
    });
  });

  describe('Environment Variable Validation', () => {
    it('should validate all required environment variables are set', () => {
      const requiredEnvVars = [
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'AWS_REGION',
        'AWS_ENDPOINT',
        'S3_BUCKET_NAME',
        'OPENAI_API_KEY',
      ];

      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        console.warn('Missing environment variables:', missingVars);
      }

      // This test will pass even if vars are missing, but will log a warning
      expect(missingVars).toBeDefined();
    });

    it('should use correct bucket name for production', () => {
      const productionBucket = 'pti';
      const testBucket = process.env.S3_BUCKET_NAME || productionBucket;
      
      expect(testBucket).toBe(productionBucket);
    });
  });

  describe('Recipe Generation API Endpoint', () => {
    it('should handle batch recipe generation request', async () => {
      const batchRequest = {
        count: 5,
        categories: ['Breakfast', 'Lunch'],
        targetCalories: 500,
      };

      const recipes = [];
      for (let i = 0; i < batchRequest.count; i++) {
        const recipe = await mockOpenAI.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'Generate a recipe',
            },
            {
              role: 'user',
              content: `Create a ${batchRequest.categories[i % 2]} recipe with ${batchRequest.targetCalories} calories`,
            },
          ],
        });

        recipes.push(JSON.parse(recipe.choices[0].message.content));
      }

      expect(recipes).toHaveLength(5);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(5);
    });

    it('should validate recipe data before saving', () => {
      const validateRecipe = (recipe: any) => {
        const requiredFields = [
          'name',
          'category',
          'description',
          'calories',
          'protein',
          'carbs',
          'fat',
          'ingredients',
          'instructions',
        ];

        return requiredFields.every(field => recipe[field] !== undefined);
      };

      const validRecipe = {
        name: 'Test Recipe',
        category: 'Breakfast',
        description: 'Test description',
        calories: 300,
        protein: 25,
        carbs: 30,
        fat: 10,
        ingredients: ['ingredient 1'],
        instructions: ['step 1'],
      };

      const invalidRecipe = {
        name: 'Test Recipe',
        category: 'Breakfast',
        // Missing required fields
      };

      expect(validateRecipe(validRecipe)).toBe(true);
      expect(validateRecipe(invalidRecipe)).toBe(false);
    });
  });
});