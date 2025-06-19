import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test-key';

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

// Mock window.matchMedia for responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});