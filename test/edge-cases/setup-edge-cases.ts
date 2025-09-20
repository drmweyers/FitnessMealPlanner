/**
 * Edge Case Test Setup
 *
 * Minimal setup for edge case testing without browser dependencies
 */

import { vi } from 'vitest';

// Mock global process.env for testing
vi.mock('process', () => ({
  env: {
    NODE_ENV: 'test',
    JWT_SECRET: 'test-secret',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
    AWS_ACCESS_KEY_ID: 'test-key',
    AWS_SECRET_ACCESS_KEY: 'test-secret',
    AWS_BUCKET_NAME: 'test-bucket'
  }
}));

// Mock console methods for cleaner test output
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn()
};

// Mock setTimeout/setInterval for deterministic testing
vi.useFakeTimers();

// Mock fetch for network requests
global.fetch = vi.fn();

// Mock file system operations
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
  stat: vi.fn()
}));

// Mock bcrypt for password testing
vi.mock('bcrypt', () => ({
  hash: vi.fn().mockResolvedValue('hashedpassword'),
  compare: vi.fn().mockResolvedValue(true),
  genSalt: vi.fn().mockResolvedValue('salt')
}));

// Mock JWT for token testing
vi.mock('jsonwebtoken', () => ({
  sign: vi.fn().mockReturnValue('mocked-jwt-token'),
  verify: vi.fn().mockReturnValue({ id: 1, email: 'test@example.com' }),
  decode: vi.fn()
}));

// Mock multer for file upload testing
vi.mock('multer', () => ({
  default: vi.fn(() => ({
    single: vi.fn(),
    array: vi.fn(),
    fields: vi.fn()
  }))
}));

// Mock S3 operations
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({
    send: vi.fn()
  })),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn()
}));

// Mock database operations
vi.mock('../../server/db/index.ts', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}));

// Global test constants
global.TEST_CONSTANTS = {
  VALID_JWT_TOKEN: 'valid-jwt-token',
  INVALID_JWT_TOKEN: 'invalid-jwt-token',
  EXPIRED_JWT_TOKEN: 'expired-jwt-token',
  TEST_USER_ID: 1,
  TEST_EMAIL: 'test@example.com',
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif']
};

// Custom matchers for edge case testing
expect.extend({
  toBeValidHttpStatus(received: number) {
    const validStatuses = [200, 201, 204, 400, 401, 403, 404, 409, 413, 422, 429, 500, 502, 503];
    const pass = validStatuses.includes(received);

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid HTTP status`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid HTTP status (one of: ${validStatuses.join(', ')})`,
        pass: false,
      };
    }
  },

  toBeSecureString(received: string) {
    const hasNoSqlInjection = !received.includes("'") && !received.includes('"') && !received.includes(';');
    const hasNoXss = !received.includes('<script>') && !received.includes('javascript:');
    const pass = hasNoSqlInjection && hasNoXss;

    if (pass) {
      return {
        message: () => `expected ${received} not to be secure`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be secure (no SQL injection or XSS patterns)`,
        pass: false,
      };
    }
  },

  toHaveValidationError(received: any) {
    const pass = received.status === 400 && (received.body.error || received.body.errors);

    if (pass) {
      return {
        message: () => `expected response not to have validation error`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected response to have validation error (status 400 with error message)`,
        pass: false,
      };
    }
  }
});

// Cleanup function for after each test
afterEach(() => {
  vi.clearAllMocks();
  vi.clearAllTimers();
});

// Global error handler for uncaught promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('Edge case test setup complete');