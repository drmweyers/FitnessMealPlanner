/**
 * Integration Test Setup
 * Configures the test environment for integration tests
 */

import { vi } from 'vitest';
import '@testing-library/jest-dom';
import './mocks-resolver';

// Setup polyfills before importing any modules that use them
import { TextEncoder, TextDecoder } from 'util';
Object.assign(global, { TextEncoder, TextDecoder });

// Setup DOM environment
if (typeof window !== 'undefined') {

  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
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

  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })) as any;

  // Mock ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })) as any;

  // Mock scrollTo
  window.scrollTo = vi.fn() as any;

  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn((key: string) => {
      if (key === 'token') return 'mock-jwt-token';
      if (key === 'refreshToken') return 'mock-refresh-token';
      if (key === 'user') return JSON.stringify({ id: '1', email: 'test@example.com', role: 'admin' });
      return null;
    }),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });

  // Mock sessionStorage
  Object.defineProperty(window, 'sessionStorage', {
    value: localStorageMock,
    writable: true,
  });

  // Mock URL methods
  global.URL.createObjectURL = vi.fn(() => 'mock-blob-url');
  global.URL.revokeObjectURL = vi.fn();

  // Mock document methods for PDF export tests
  const mockAnchor = {
    click: vi.fn(),
    href: '',
    download: '',
    style: {},
  };

  document.createElement = vi.fn((tagName: string) => {
    if (tagName === 'a') {
      return mockAnchor as any;
    }
    const element = document.createElementNS('http://www.w3.org/1999/xhtml', tagName);
    return element;
  });

  document.body.appendChild = vi.fn();
  document.body.removeChild = vi.fn();
}

// Mock fetch globally
const mockFetch = vi.fn((url: string, options?: any) => {
  // Default success response
  const defaultResponse = {
    ok: true,
    status: 200,
    json: async () => ({ success: true, data: [] }),
    text: async () => 'OK',
    blob: async () => new Blob(['mock pdf data'], { type: 'application/pdf' }),
    headers: new Headers({ 'content-type': 'application/json' }),
  };

  // Handle different endpoints
  if (url.includes('/api/auth/login')) {
    return Promise.resolve({
      ...defaultResponse,
      json: async () => ({
        token: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token',
        user: { id: '1', email: 'test@example.com', role: 'admin' },
      }),
    });
  }

  if (url.includes('/api/auth/refresh')) {
    return Promise.resolve({
      ...defaultResponse,
      json: async () => ({
        token: 'new-mock-jwt-token',
        user: { id: '1', email: 'test@example.com', role: 'admin' },
      }),
    });
  }

  if (url.includes('/api/stats') || url.includes('/admin/stats')) {
    return Promise.resolve({
      ...defaultResponse,
      json: async () => ({
        totalUsers: 100,
        totalRecipes: 50,
        totalMealPlans: 25,
        activeUsers: 80,
      }),
    });
  }

  if (url.includes('/api/recipes')) {
    return Promise.resolve({
      ...defaultResponse,
      json: async () => ({
        recipes: [
          { id: '1', name: 'Test Recipe 1', approved: true },
          { id: '2', name: 'Test Recipe 2', approved: false },
        ],
        total: 2,
      }),
    });
  }

  if (url.includes('/api/users')) {
    return Promise.resolve({
      ...defaultResponse,
      json: async () => ({
        users: [
          { id: '1', email: 'user1@test.com', role: 'customer' },
          { id: '2', email: 'user2@test.com', role: 'trainer' },
        ],
      }),
    });
  }

  if (url.includes('/api/meal-plans')) {
    return Promise.resolve({
      ...defaultResponse,
      json: async () => ({
        mealPlans: [
          { id: '1', name: 'Test Plan 1', calories: 2000 },
          { id: '2', name: 'Test Plan 2', calories: 1800 },
        ],
      }),
    });
  }

  if (url.includes('/api/pdf')) {
    return Promise.resolve({
      ...defaultResponse,
      blob: async () => new Blob(['mock pdf data'], { type: 'application/pdf' }),
    });
  }

  if (url.includes('/api/customers')) {
    return Promise.resolve({
      ...defaultResponse,
      json: async () => ([
        { id: '1', name: 'Customer 1', email: 'customer1@test.com' },
        { id: '2', name: 'Customer 2', email: 'customer2@test.com' },
      ]),
    });
  }

  if (url.includes('/api/trainer/customers')) {
    return Promise.resolve({
      ...defaultResponse,
      json: async () => ([
        { id: '1', name: 'Trainer Customer 1', email: 'tcustomer1@test.com' },
        { id: '2', name: 'Trainer Customer 2', email: 'tcustomer2@test.com' },
      ]),
    });
  }

  // Default response for unknown endpoints
  return Promise.resolve(defaultResponse);
});

global.fetch = mockFetch;

// Export for use in tests
export { mockFetch };

// Setup test timeouts
beforeEach(() => {
  vi.clearAllMocks();
});

// Cleanup after each test
afterEach(() => {
  vi.clearAllTimers();
  vi.clearAllMocks();
});