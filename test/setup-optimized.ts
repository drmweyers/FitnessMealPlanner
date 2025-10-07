import '@testing-library/jest-dom';
import { vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { cleanup, configure } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';

/**
 * Optimized Test Setup for FitnessMealPlanner
 * 
 * This setup addresses:
 * - Component ref warnings
 * - Performance issues
 * - Mock consistency  
 * - Test isolation
 */

// Configure Testing Library for better performance
configure({
  testIdAttribute: 'data-testid',
  computedStyleSupportsPseudoElements: false, // Disable for performance
  asyncUtilTimeout: 5000, // Reduce timeout for async utils
});

// Suppress known warnings that don't affect functionality
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  // Filter out specific warnings that are known and don't affect test validity
  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    
    // Suppress React forwardRef warnings from Radix UI components
    if (message.includes('Function components cannot be given refs') ||
        message.includes('forwardRef') ||
        message.includes('Unknown event handler property')) {
      return;
    }
    
    originalError.call(console, ...args);
  };
  
  console.warn = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    
    // Suppress non-critical warnings
    if (message.includes('Received NaN for the `value` attribute') ||
        message.includes('defaultProps') ||
        message.includes('deprecated')) {
      return;
    }
    
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  // Restore original console methods
  console.error = originalError;
  console.warn = originalWarn;
});

// Mock DOM APIs that might not be available in jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  value: vi.fn(),
  writable: true
});

// Mock HTMLElement methods
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  value: vi.fn(),
  writable: true
});

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock Next.js router if needed
vi.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: vi.fn(),
      pop: vi.fn(),
      reload: vi.fn(),
      back: vi.fn(),
      prefetch: vi.fn().mockResolvedValue(undefined),
      beforePopState: vi.fn(),
      events: {
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn(),
      },
    };
  },
}));

// Global mocks for commonly used modules
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

vi.mock('@/lib/cacheUtils', () => ({
  createCacheManager: () => ({
    handleRecipeGeneration: vi.fn(),
    invalidateRecipes: vi.fn(),
    invalidateStats: vi.fn(),
    clearCache: vi.fn(),
    getCacheKey: vi.fn(),
  }),
}));

// Mock Lucide React icons efficiently
vi.mock('lucide-react', () => {
  const createMockIcon = (name: string) => {
    const MockIcon = (props: any) => {
      return `<svg data-testid="${name.toLowerCase()}-icon" {...props} />`;
    };
    MockIcon.displayName = name;
    return MockIcon;
  };

  const icons = [
    'ChefHat', 'Plus', 'Minus', 'Settings', 'User', 'LogOut', 'Menu', 'X',
    'Search', 'Filter', 'Download', 'Upload', 'Edit', 'Trash', 'Save',
    'Calendar', 'Clock', 'Star', 'Heart', 'Share', 'Copy', 'Check',
    'AlertTriangle', 'Info', 'HelpCircle', 'ArrowLeft', 'ArrowRight',
    'ChevronDown', 'ChevronUp', 'MoreHorizontal', 'Eye', 'EyeOff'
  ];

  const mockIcons: { [key: string]: any } = {};
  icons.forEach(icon => {
    mockIcons[icon] = createMockIcon(icon);
  });

  return mockIcons;
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Global test utilities
export const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
});

export const mockApiResponse = (data: any, status = 200) => {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response);
};

export const mockApiError = (message: string, status = 400) => {
  return Promise.reject(new Error(message));
};