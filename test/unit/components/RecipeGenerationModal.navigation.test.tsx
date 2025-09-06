/**
 * RecipeGenerationModal Navigation Fix Tests
 * 
 * Tests to verify that navigation uses React Router instead of window.location
 * after fixing the SPA routing issue.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RecipeGenerationModal from '../../../client/src/components/RecipeGenerationModal';

// Mock wouter
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/', mockSetLocation]
}));

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

// Mock RecipeGenerationProgress component
vi.mock('../../../client/src/components/RecipeGenerationProgress', () => ({
  default: ({ onComplete, onError }: any) => (
    <div data-testid="progress-component">
      <button onClick={() => onComplete({ success: 5, failed: 0 })}>Complete</button>
      <button onClick={() => onError('Test error')}>Error</button>
    </div>
  )
}));

describe('RecipeGenerationModal Navigation Fix', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    
    vi.clearAllMocks();
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => 'fake-token'),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderComponent = (isOpen = true) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <RecipeGenerationModal 
          isOpen={isOpen}
          onClose={vi.fn()}
        />
      </QueryClientProvider>
    );
  };

  test('should use React Router navigation instead of window.location for login redirect', async () => {
    // Mock API to throw unauthorized error
    const { apiRequest } = await import('../../../client/src/lib/queryClient');
    (apiRequest as any).mockRejectedValue(new Error('jwt expired'));

    renderComponent();

    // Trigger quick generation to cause auth error
    const quickGenButton = screen.getByText('Generate Random Recipes');
    fireEvent.click(quickGenButton);

    // Verify React Router navigation is used
    await waitFor(() => {
      expect(mockSetLocation).toHaveBeenCalledWith('/login');
    });
  });

  test('should use React Router for authentication check failures', async () => {
    // Mock no token in localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });

    renderComponent();

    // Trigger generation with no auth token
    const quickGenButton = screen.getByText('Generate Random Recipes');
    fireEvent.click(quickGenButton);

    await waitFor(() => {
      expect(mockSetLocation).toHaveBeenCalledWith('/login');
    });
  });

  test('should handle completion without full page reload', async () => {
    // Mock successful API response
    const { apiRequest } = await import('../../../client/src/lib/queryClient');
    (apiRequest as any).mockResolvedValue({
      json: () => Promise.resolve({ jobId: 'test-job-id', message: 'Started' })
    });

    renderComponent();

    // Trigger generation
    const quickGenButton = screen.getByText('Generate Random Recipes');
    fireEvent.click(quickGenButton);

    // Wait for progress component to appear
    await waitFor(() => {
      expect(screen.getByTestId('progress-component')).toBeInTheDocument();
    });

    // Simulate completion
    const completeButton = screen.getByText('Complete');
    fireEvent.click(completeButton);

    // Verify no full page reload occurred (no window.location.reload call)
    // This is implicit - the component should handle completion gracefully
    await waitFor(() => {
      expect(screen.queryByTestId('progress-component')).not.toBeInTheDocument();
    });
  });

  test('should not use window.location.reload for refreshing', async () => {
    // Mock window.location.reload to verify it's not called
    const reloadSpy = vi.spyOn(window.location, 'reload').mockImplementation(() => {});

    const { apiRequest } = await import('../../../client/src/lib/queryClient');
    (apiRequest as any).mockResolvedValue({
      json: () => Promise.resolve({ jobId: 'test-job-id', message: 'Started' })
    });

    renderComponent();

    const quickGenButton = screen.getByText('Generate Random Recipes');
    fireEvent.click(quickGenButton);

    await waitFor(() => {
      expect(screen.getByTestId('progress-component')).toBeInTheDocument();
    });

    const completeButton = screen.getByText('Complete');
    fireEvent.click(completeButton);

    // Verify window.location.reload was not called
    expect(reloadSpy).not.toHaveBeenCalled();
    
    reloadSpy.mockRestore();
  });

  test('should handle context-based generation with proper navigation', async () => {
    const { apiRequest } = await import('../../../client/src/lib/queryClient');
    (apiRequest as any).mockResolvedValue({
      json: () => Promise.resolve({ jobId: 'test-job-id', message: 'Started' })
    });

    renderComponent();

    // Fill in some form data and trigger context generation
    const targetedGenButton = screen.getByText('Generate Targeted Recipes');
    fireEvent.click(targetedGenButton);

    await waitFor(() => {
      expect(screen.getByTestId('progress-component')).toBeInTheDocument();
    });

    // Simulate completion
    const completeButton = screen.getByText('Complete');
    fireEvent.click(completeButton);

    // Component should handle completion without page reload
    expect(mockSetLocation).not.toHaveBeenCalled(); // No redirect on success
  });
});