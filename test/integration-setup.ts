import '@testing-library/jest-dom';
import { vi, beforeAll, afterAll } from 'vitest';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test-key';
// Only set DATABASE_URL if not already configured (e.g., in Docker)
// Docker uses postgres:5432, host machine uses localhost:5433
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/fitmeal';
}
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-that-is-long-enough-to-meet-minimum-requirements';
process.env.SESSION_SECRET = 'test-session-secret-for-testing-that-is-long-enough-to-meet-minimum-requirements';
process.env.S3_BUCKET_NAME = 'test-bucket';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = 'test-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';

// Mock OpenAI to avoid making real API calls during integration tests
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

// Mock the OpenAI service functions
vi.mock('../../server/services/openai', () => ({
  generateRecipes: vi.fn().mockResolvedValue([]),
  generateImageForRecipe: vi.fn().mockResolvedValue('https://example.com/test-image.jpg'),
  generateMealPlan: vi.fn().mockResolvedValue({ meals: [] })
}));

// DO NOT mock the storage service - we want to test real database operations
// DO NOT mock the database - we want to test real database connections

// Mock file system operations for tests that need them
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    writeFileSync: vi.fn(),
    readFileSync: vi.fn().mockReturnValue('{}'),
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
  };
});

// Mock path operations
vi.mock('path', async () => {
  const actual = await vi.importActual('path');
  return {
    ...actual,
    join: vi.fn((...args) => args.join('/')),
    resolve: vi.fn((...args) => '/' + args.join('/')),
  };
});

// Add error log suppression for tests to reduce noise
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: An update to') ||
       args[0].includes('Failed to fetch') ||
       args[0].includes('Error generating') ||
       args[0].includes('ZodError'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});