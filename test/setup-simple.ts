import { vi } from 'vitest';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test-key';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/fitmeal_test';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long-for-security';
process.env.SESSION_SECRET = 'test-session-secret-that-is-at-least-32-characters-long-for-security';
process.env.S3_BUCKET_NAME = 'test-bucket';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = 'test-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock OpenAI completely to avoid browser environment issues
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: '{"recipes": []}' } }]
          })
        }
      },
      images: {
        generate: vi.fn().mockResolvedValue({
          data: [{ url: 'https://example.com/test-image.jpg' }]
        })
      }
    }))
  };
});