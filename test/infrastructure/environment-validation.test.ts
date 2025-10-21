import { describe, it, expect, beforeAll } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

describe('Environment Variables - Existence & Format Validation', () => {
  describe('Critical Environment Variables', () => {
    it('should have DATABASE_URL defined', () => {
      expect(process.env.DATABASE_URL).toBeDefined();
      expect(process.env.DATABASE_URL).toMatch(/^postgresql:\/\//);
    });

    it('should have OPENAI_API_KEY defined', () => {
      expect(process.env.OPENAI_API_KEY).toBeDefined();
      expect(process.env.OPENAI_API_KEY).toMatch(/^sk-/);
      expect(process.env.OPENAI_API_KEY!.length).toBeGreaterThan(20);
    });

    it('should have JWT_SECRET defined and sufficiently long', () => {
      expect(process.env.JWT_SECRET).toBeDefined();
      expect(process.env.JWT_SECRET!.length).toBeGreaterThanOrEqual(32);
    });

    it('should have SESSION_SECRET defined', () => {
      expect(process.env.SESSION_SECRET).toBeDefined();
      expect(process.env.SESSION_SECRET!.length).toBeGreaterThanOrEqual(20);
    });
  });

  describe('S3/DigitalOcean Spaces Configuration', () => {
    it('should have AWS_ACCESS_KEY_ID defined', () => {
      expect(process.env.AWS_ACCESS_KEY_ID).toBeDefined();
      expect(process.env.AWS_ACCESS_KEY_ID).not.toBe('minioadmin');
    });

    it('should have AWS_SECRET_ACCESS_KEY defined', () => {
      expect(process.env.AWS_SECRET_ACCESS_KEY).toBeDefined();
      expect(process.env.AWS_SECRET_ACCESS_KEY).not.toBe('minioadmin');
    });

    it('should have AWS_ENDPOINT defined for DigitalOcean Spaces', () => {
      expect(process.env.AWS_ENDPOINT).toBeDefined();
      expect(process.env.AWS_ENDPOINT).toMatch(/digitaloceanspaces\.com/);
    });

    it('should have S3_BUCKET_NAME defined', () => {
      expect(process.env.S3_BUCKET_NAME).toBeDefined();
      expect(process.env.S3_BUCKET_NAME).toBe('pti');
    });

    it('should have AWS_REGION defined', () => {
      expect(process.env.AWS_REGION).toBeDefined();
    });

    it('should NOT have MinIO credentials', () => {
      expect(process.env.AWS_ACCESS_KEY_ID).not.toBe('minioadmin');
      expect(process.env.AWS_SECRET_ACCESS_KEY).not.toBe('minioadmin');
    });
  });

  describe('Redis Configuration', () => {
    it('should have REDIS_URL defined', () => {
      expect(process.env.REDIS_URL).toBeDefined();
    });

    it('should have REDIS_HOST defined', () => {
      expect(process.env.REDIS_HOST).toBeDefined();
    });

    it('should have REDIS_PORT defined', () => {
      expect(process.env.REDIS_PORT).toBeDefined();
      const port = parseInt(process.env.REDIS_PORT!);
      expect(port).toBeGreaterThan(0);
      expect(port).toBeLessThan(65536);
    });
  });

  describe('Feature Flags', () => {
    it('should have CACHE_ENABLED defined', () => {
      expect(process.env.CACHE_ENABLED).toBeDefined();
    });

    it('should have RATE_LIMIT_ENABLED defined', () => {
      expect(process.env.RATE_LIMIT_ENABLED).toBeDefined();
    });
  });

  describe('Configuration Integrity', () => {
    it('should have all critical environment variables present', () => {
      const criticalVars = [
        'DATABASE_URL',
        'OPENAI_API_KEY',
        'JWT_SECRET',
        'SESSION_SECRET',
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'AWS_ENDPOINT',
        'S3_BUCKET_NAME',
        'AWS_REGION'
      ];

      const missing = criticalVars.filter(varName => !process.env[varName]);

      expect(missing).toEqual([]);
    });

    it('should not have default/placeholder values', () => {
      const placeholderChecks = [
        { name: 'SESSION_SECRET', shouldNotBe: 'your-secret-here' },
        { name: 'JWT_SECRET', shouldNotBe: 'your-jwt-secret' },
        { name: 'AWS_ACCESS_KEY_ID', shouldNotBe: 'your-access-key' },
        { name: 'AWS_SECRET_ACCESS_KEY', shouldNotBe: 'your-secret-key' },
      ];

      placeholderChecks.forEach(({ name, shouldNotBe }) => {
        expect(process.env[name]).not.toBe(shouldNotBe);
      });
    });
  });
});
