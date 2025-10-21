import { describe, it, expect, beforeAll } from 'vitest';
import { s3Config, validateS3Config } from '../../server/services/utils/S3Config';

/**
 * Docker Integration Tests for Image Generation
 *
 * These tests validate that the Docker environment is properly configured
 * for reliable image generation with DALL-E 3 and S3 uploads.
 *
 * Test Coverage:
 * 1. Environment variable loading from Docker
 * 2. S3 configuration validation
 * 3. Network connectivity prerequisites
 * 4. Configuration object accessibility
 */

describe('Docker Image Generation Integration Tests', () => {
  describe('Environment Variable Loading', () => {
    it('should load OPENAI_API_KEY from environment', () => {
      expect(process.env.OPENAI_API_KEY).toBeDefined();
      expect(process.env.OPENAI_API_KEY).toMatch(/^sk-/);
    });

    it('should load AWS_ACCESS_KEY_ID from environment', () => {
      expect(process.env.AWS_ACCESS_KEY_ID).toBeDefined();
      expect(process.env.AWS_ACCESS_KEY_ID).toBe('DO00Q343F2BG3ZGALNDE');
    });

    it('should load AWS_SECRET_ACCESS_KEY from environment', () => {
      expect(process.env.AWS_SECRET_ACCESS_KEY).toBeDefined();
      expect(process.env.AWS_SECRET_ACCESS_KEY).toBeDefined();
    });

    it('should load S3_BUCKET_NAME from environment', () => {
      expect(process.env.S3_BUCKET_NAME).toBeDefined();
      expect(process.env.S3_BUCKET_NAME).toBe('pti');
    });

    it('should load AWS_REGION from environment', () => {
      expect(process.env.AWS_REGION).toBeDefined();
      expect(process.env.AWS_REGION).toBe('tor1');
    });

    it('should load AWS_ENDPOINT from environment', () => {
      expect(process.env.AWS_ENDPOINT).toBeDefined();
      expect(process.env.AWS_ENDPOINT).toContain('digitaloceanspaces.com');
    });
  });

  describe('S3Config Lazy Validation', () => {
    it('should not throw error when importing S3Config module', () => {
      // This test validates that S3Config no longer validates at import time
      // If it throws here, the race condition still exists
      expect(() => {
        const config = s3Config;
      }).not.toThrow();
    });

    it('should provide accessKeyId via getter', () => {
      expect(() => {
        const key = s3Config.accessKeyId;
        expect(key).toBe('DO00Q343F2BG3ZGALNDE');
      }).not.toThrow();
    });

    it('should provide secretAccessKey via getter', () => {
      expect(() => {
        const secret = s3Config.secretAccessKey;
        expect(secret).toBeDefined();
        expect(secret.length).toBeGreaterThan(20);
      }).not.toThrow();
    });

    it('should provide region via getter', () => {
      expect(() => {
        const region = s3Config.region;
        expect(region).toBe('tor1');
      }).not.toThrow();
    });

    it('should provide bucketName via getter', () => {
      expect(() => {
        const bucket = s3Config.bucketName;
        expect(bucket).toBe('pti');
      }).not.toThrow();
    });

    it('should provide endpoint via getter', () => {
      const endpoint = s3Config.endpoint;
      expect(endpoint).toContain('tor1.digitaloceanspaces.com');
    });

    it('should provide isPublicBucket via getter', () => {
      const isPublic = s3Config.isPublicBucket;
      expect(typeof isPublic).toBe('boolean');
    });

    it('should validate all S3 config without throwing', () => {
      expect(() => {
        validateS3Config();
      }).not.toThrow();
    });
  });

  describe('Configuration Object Structure', () => {
    it('should create S3 config object successfully', () => {
      const config = {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
        region: s3Config.region,
        endpoint: s3Config.endpoint
      };

      expect(config.accessKeyId).toBeDefined();
      expect(config.secretAccessKey).toBeDefined();
      expect(config.region).toBe('tor1');
      expect(config.endpoint).toContain('digitaloceanspaces.com');
    });

    it('should handle bucket configuration', () => {
      const bucketConfig = {
        bucketName: s3Config.bucketName,
        isPublic: s3Config.isPublicBucket
      };

      expect(bucketConfig.bucketName).toBe('pti');
      expect(typeof bucketConfig.isPublic).toBe('boolean');
    });
  });

  describe('Docker Environment Validation', () => {
    it('should have NODE_ENV set', () => {
      expect(process.env.NODE_ENV).toBeDefined();
      expect(['development', 'production', 'test']).toContain(process.env.NODE_ENV);
    });

    it('should have DATABASE_URL configured', () => {
      expect(process.env.DATABASE_URL).toBeDefined();
      expect(process.env.DATABASE_URL).toContain('postgresql://');
    });

    it('should be running in expected environment', () => {
      // In Docker, we expect certain environment characteristics
      const isDocker = process.env.NODE_ENV === 'development' ||
                      process.env.NODE_ENV === 'production';
      expect(isDocker).toBe(true);
    });
  });

  describe('Error Handling for Missing Variables', () => {
    it('should throw descriptive error when accessing undefined config property', () => {
      // Temporarily remove env var
      const originalValue = process.env.AWS_ACCESS_KEY_ID;
      delete process.env.AWS_ACCESS_KEY_ID;

      expect(() => {
        const key = s3Config.accessKeyId;
      }).toThrow('AWS_ACCESS_KEY_ID environment variable is not set');

      // Restore
      process.env.AWS_ACCESS_KEY_ID = originalValue;
    });
  });
});

/**
 * Network Connectivity Tests (Optional - requires actual network access)
 *
 * These tests can be enabled to validate network connectivity from Docker
 * to external services (OpenAI, S3).
 *
 * NOTE: Disabled by default to avoid hitting rate limits in CI/CD
 */
describe.skip('Docker Network Connectivity Tests', () => {
  it('should be able to reach OpenAI API endpoint', async () => {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'User-Agent': 'FitnessMealPlanner-HealthCheck'
      }
    });

    // 200 = success, 401 = auth issue but network works
    expect([200, 401]).toContain(response.status);
  }, 10000);

  it('should be able to reach S3 endpoint', async () => {
    const endpoint = process.env.AWS_ENDPOINT || 'https://tor1.digitaloceanspaces.com';

    const response = await fetch(endpoint, {
      method: 'HEAD'
    });

    // Any response means network connectivity works
    expect(response).toBeDefined();
  }, 10000);
});
