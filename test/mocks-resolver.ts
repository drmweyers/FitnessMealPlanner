/**
 * Mock Resolver for @ aliased imports
 * Maps @/hooks/use-toast and other @ imports to mock implementations
 */

import { vi } from 'vitest';

// Mock use-toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
    toasts: [],
    dismiss: vi.fn(),
  }),
}));

// Mock use-mobile hook
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-id', email: 'test@example.com', role: 'admin' },
    login: vi.fn(),
    logout: vi.fn(),
    signup: vi.fn(),
    isLoading: false,
  }),
  AuthProvider: ({ children }: any) => children,
}));

// Export for use in tests
export {};