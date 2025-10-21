import { describe, it, expect, beforeAll } from 'vitest';
import OpenAI from 'openai';
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

describe('Credentials Expiration & Functionality Tests', () => {
  describe('OpenAI API Key - Validity & Expiration', () => {
    let openai: OpenAI;

    beforeAll(() => {
      openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    });

    it('should have a valid OpenAI API key that is not expired', async () => {
      expect(process.env.OPENAI_API_KEY).toBeDefined();

      try {
        // Make a minimal API call to verify the key works
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini', // Use cheaper model for testing
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'Say "OK" if you receive this.' }
          ],
          max_tokens: 5,
        });

        expect(response.choices).toBeDefined();
        expect(response.choices.length).toBeGreaterThan(0);
      } catch (error: any) {
        if (error.status === 401) {
          throw new Error('❌ CRITICAL: OpenAI API key is INVALID or EXPIRED! Update OPENAI_API_KEY in .env');
        } else if (error.status === 429) {
          throw new Error('⚠️ OpenAI API rate limit exceeded. Key is valid but quota exhausted.');
        } else {
          throw error;
        }
      }
    }, 30000); // 30 second timeout

    it('should be able to generate a simple completion (not expired)', async () => {
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Test' }],
          max_tokens: 5,
        });

        expect(response.id).toBeDefined();
        expect(response.model).toBeDefined();
      } catch (error: any) {
        if (error.status === 401) {
          throw new Error('❌ OpenAI API key expired or invalid');
        }
        throw error;
      }
    }, 30000);
  });

  describe('S3/DigitalOcean Spaces - Credentials Validity', () => {
    let s3Client: S3Client;

    beforeAll(() => {
      s3Client = new S3Client({
        region: process.env.AWS_REGION,
        endpoint: process.env.AWS_ENDPOINT,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
        forcePathStyle: true,
      });
    });

    it('should have valid S3 credentials that are not expired', async () => {
      try {
        const command = new ListBucketsCommand({});
        const response = await s3Client.send(command);

        expect(response.Buckets).toBeDefined();
        expect(Array.isArray(response.Buckets)).toBe(true);
      } catch (error: any) {
        if (error.name === 'InvalidAccessKeyId') {
          throw new Error('❌ CRITICAL: S3 Access Key ID is INVALID! Check AWS_ACCESS_KEY_ID in .env');
        } else if (error.name === 'SignatureDoesNotMatch') {
          throw new Error('❌ CRITICAL: S3 Secret Access Key is INVALID! Check AWS_SECRET_ACCESS_KEY in .env');
        } else if (error.$metadata?.httpStatusCode === 403) {
          throw new Error('❌ CRITICAL: S3 credentials are expired or lack permissions!');
        }
        throw error;
      }
    }, 30000);

    it('should be able to access the target bucket', async () => {
      try {
        const command = new ListBucketsCommand({});
        const response = await s3Client.send(command);

        const targetBucket = process.env.S3_BUCKET_NAME;
        const bucketExists = response.Buckets?.some(bucket => bucket.Name === targetBucket);

        expect(bucketExists).toBe(true);
      } catch (error: any) {
        throw new Error(`❌ Cannot access S3 bucket: ${error.message}`);
      }
    }, 30000);

    it('should have AWS_ENDPOINT configured (not using AWS S3)', async () => {
      expect(process.env.AWS_ENDPOINT).toBeDefined();
      expect(process.env.AWS_ENDPOINT).toMatch(/digitaloceanspaces\.com/);
    });
  });

  describe('Database Connection - Validity', () => {
    it('should be able to connect to the database', async () => {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: false, // Development setting
      });

      try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');

        expect(result.rows).toBeDefined();
        expect(result.rows.length).toBeGreaterThan(0);

        client.release();
      } catch (error: any) {
        throw new Error(`❌ CRITICAL: Database connection failed! ${error.message}`);
      } finally {
        await pool.end();
      }
    }, 10000);

    it('should have the correct database schema (recipes table exists)', async () => {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: false,
      });

      try {
        const client = await pool.connect();
        const result = await client.query(`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'recipes'
        `);

        expect(result.rows.length).toBeGreaterThan(0);

        client.release();
      } catch (error: any) {
        throw new Error(`❌ Database schema check failed: ${error.message}`);
      } finally {
        await pool.end();
      }
    }, 10000);
  });

  describe('Critical Configuration Checks', () => {
    it('should NOT have MinIO credentials in production', () => {
      expect(process.env.AWS_ACCESS_KEY_ID).not.toBe('minioadmin');
      expect(process.env.AWS_SECRET_ACCESS_KEY).not.toBe('minioadmin');
    });

    it('should have sufficiently long secrets for security', () => {
      expect(process.env.JWT_SECRET!.length).toBeGreaterThanOrEqual(32);
      expect(process.env.SESSION_SECRET!.length).toBeGreaterThanOrEqual(20);
    });

    it('should have all critical environment variables set', () => {
      const required = [
        'DATABASE_URL',
        'OPENAI_API_KEY',
        'JWT_SECRET',
        'SESSION_SECRET',
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'AWS_ENDPOINT',
        'S3_BUCKET_NAME',
      ];

      const missing = required.filter(key => !process.env[key]);

      if (missing.length > 0) {
        throw new Error(`❌ CRITICAL: Missing environment variables: ${missing.join(', ')}`);
      }

      expect(missing).toEqual([]);
    });
  });

  describe('Expiration Warnings', () => {
    it('should log when last verification was done', () => {
      const lastVerified = new Date().toISOString();
      console.log(`✅ Environment variables verified on: ${lastVerified}`);
      console.log(`📋 Next verification recommended: ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()}`);
      expect(true).toBe(true); // Always passes, just for logging
    });

    it('should warn about API key rotation best practices', () => {
      console.log('⚠️ SECURITY REMINDER:');
      console.log('   - OpenAI API keys should be rotated every 90 days');
      console.log('   - DigitalOcean Spaces keys should be rotated every 180 days');
      console.log('   - JWT_SECRET should be rotated if compromised');
      console.log('   - Run this test weekly to catch expiration early');
      expect(true).toBe(true);
    });
  });
});
