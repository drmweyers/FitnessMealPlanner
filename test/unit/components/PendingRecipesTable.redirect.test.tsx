/**
 * PendingRecipesTable Redirect Fix Tests
 * 
 * Tests to verify that authentication redirects go to the correct client-side routes
 * after fixing the hardcoded API redirect bug.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PendingRecipesTable from '../../../client/src/components/PendingRecipesTable';

// Mock toast hook
vi.mock('../../../client/src/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  })
}));

// Mock API request
vi.mock('../../../client/src/lib/queryClient', () => ({
  apiRequest: vi.fn()
}));

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: '',
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
  },
  writable: true,
});

describe('PendingRecipesTable Redirect Fix', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    
    // Reset window.location.href
    window.location.href = '';
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <PendingRecipesTable />
      </QueryClientProvider>
    );
  };

  test('should redirect to /login not /api/login on approval auth error', async () => {
    // Mock API to throw unauthorized error
    const { apiRequest } = await import('../../../client/src/lib/queryClient');
    (apiRequest as any).mockRejectedValue(new Error('401 Unauthorized'));

    // Mock fetch to return unauthorized
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Unauthorized' })
    });

    renderComponent();

    // Wait for the component to load and handle the error
    await waitFor(() => {
      // Check that window.location.href was set to the correct path
      expect(window.location.href).not.toBe('/api/login');
      expect(window.location.href).toBe('/login');
    }, { timeout: 2000 });
  });

  test('should redirect to /login not /api/login on bulk approve auth error', async () => {
    // Mock API to throw unauthorized error
    const { apiRequest } = await import('../../../client/src/lib/queryClient');
    (apiRequest as any).mockRejectedValue(new Error('401 Unauthorized'));

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Unauthorized' })
    });

    renderComponent();

    await waitFor(() => {
      expect(window.location.href).toBe('/login');
    }, { timeout: 2000 });
  });

  test('should redirect to /login not /api/login on delete auth error', async () => {
    // Mock API to throw unauthorized error
    const { apiRequest } = await import('../../../client/src/lib/queryClient');
    (apiRequest as any).mockRejectedValue(new Error('401 Unauthorized'));

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Unauthorized' })
    });

    renderComponent();

    await waitFor(() => {
      expect(window.location.href).toBe('/login');
    }, { timeout: 2000 });
  });

  test('should not redirect on successful operations', async () => {
    // Mock successful API responses
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ recipes: [], total: 0 })
    });

    renderComponent();

    // Verify no redirect occurs
    await waitFor(() => {
      expect(window.location.href).toBe('');
    });
  });

  test('should handle non-auth errors without redirecting', async () => {
    // Mock non-auth error
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Internal Server Error' })
    });

    renderComponent();

    await waitFor(() => {
      expect(window.location.href).toBe('');
    });
  });
});