import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RecipeGenerationProgress from '../../../client/src/components/RecipeGenerationProgress';
import * as queryClientModule from '../../../client/src/lib/queryClient';

// Mock the apiRequest function
const mockApiRequest = vi.fn();
vi.mock('../../../client/src/lib/queryClient', async () => {
  const actual = await vi.importActual('../../../client/src/lib/queryClient');
  return {
    ...actual,
    apiRequest: mockApiRequest,
  };
});

// Mock React Query with manual control
const mockUseQuery = vi.fn();
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: mockUseQuery,
  };
});

// Helper to create test wrapper
function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('RecipeGenerationProgress Component', () => {
  let mockOnComplete: ReturnType<typeof vi.fn>;
  let mockOnError: ReturnType<typeof vi.fn>;
  
  const defaultProps = {
    jobId: 'test-job-123',
    totalRecipes: 10,
    onComplete: mockOnComplete,
    onError: mockOnError,
  };

  beforeEach(() => {
    mockOnComplete = vi.fn();
    mockOnError = vi.fn();
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial Loading State', () => {
    it('should show loading state when no progress data', () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        error: null,
        isError: false,
        isLoading: true,
      });

      render(
        <RecipeGenerationProgress {...defaultProps} />,
        { wrapper: createTestWrapper() }
      );

      expect(screen.getByText('Connecting to progress tracker...')).toBeInTheDocument();
      expect(screen.getByText('Setting up progress tracking for 10 recipes...')).toBeInTheDocument();
      expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
    });

    it('should show progress bar at 0% during loading', () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        error: null,
        isError: false,
        isLoading: true,
      });

      render(
        <RecipeGenerationProgress {...defaultProps} />,
        { wrapper: createTestWrapper() }
      );

      const progressBar = screen.getByTestId('progress');
      expect(progressBar).toHaveAttribute('data-value', '0');
    });
  });

  describe('Progress Display', () => {
    const mockProgressData = {
      jobId: 'test-job-123',
      totalRecipes: 10,
      completed: 3,
      failed: 1,
      currentStep: 'generating' as const,
      percentage: 40,
      startTime: Date.now() - 30000, // 30 seconds ago
      estimatedCompletion: Date.now() + 60000, // 1 minute from now
      errors: ['Minor validation error'],
      currentRecipeName: 'Chicken Salad',
      stepProgress: {
        stepIndex: 1,
        stepName: 'AI Generation',
        itemsProcessed: 2,
        totalItems: 5,
      },
    };

    beforeEach(() => {
      mockUseQuery.mockReturnValue({
        data: mockProgressData,
        error: null,
        isError: false,
        isLoading: false,
      });
    });

    it('should render progress bar with correct percentage', () => {
      render(
        <RecipeGenerationProgress {...defaultProps} />,
        { wrapper: createTestWrapper() }
      );

      const progressBar = screen.getByTestId('progress');
      expect(progressBar).toHaveAttribute('data-value', '40');
      expect(screen.getByText('40.0%')).toBeInTheDocument();
    });

    it('should display current step information', () => {
      render(
        <RecipeGenerationProgress {...defaultProps} />,
        { wrapper: createTestWrapper() }
      );

      expect(screen.getByText('Generating recipes with AI...')).toBeInTheDocument();
      expect(screen.getByTestId('zap-icon')).toBeInTheDocument();
    });

    it('should show current recipe name when available', () => {
      render(
        <RecipeGenerationProgress {...defaultProps} />,
        { wrapper: createTestWrapper() }
      );

      expect(screen.getByText('Current:')).toBeInTheDocument();
      expect(screen.getByText('Chicken Salad')).toBeInTheDocument();
    });

    it('should display overall progress counts', () => {
      render(
        <RecipeGenerationProgress {...defaultProps} />,
        { wrapper: createTestWrapper() }
      );

      expect(screen.getByText('Overall Progress (4/10)')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // Completed count
      expect(screen.getByText('1')).toBeInTheDocument(); // Failed count
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });

    it('should show step progress when available', () => {
      render(
        <RecipeGenerationProgress {...defaultProps} />,
        { wrapper: createTestWrapper() }
      );

      expect(screen.getByText('AI Generation')).toBeInTheDocument();
      expect(screen.getByText('2/5')).toBeInTheDocument();
    });

    it('should calculate and display ETA', () => {
      render(
        <RecipeGenerationProgress {...defaultProps} />,
        { wrapper: createTestWrapper() }
      );

      expect(screen.getByText('1m 0s')).toBeInTheDocument();
      expect(screen.getByText('ETA')).toBeInTheDocument();
    });

    it('should calculate and display elapsed time', () => {
      render(
        <RecipeGenerationProgress {...defaultProps} />,
        { wrapper: createTestWrapper() }
      );

      expect(screen.getByText('30s')).toBeInTheDocument();
      expect(screen.getByText('Elapsed')).toBeInTheDocument();
    });

    it('should show errors when present', () => {
      render(
        <RecipeGenerationProgress {...defaultProps} />,
        { wrapper: createTestWrapper() }
      );

      expect(screen.getByText('1 Error')).toBeInTheDocument();
      expect(screen.getByText('Minor validation error')).toBeInTheDocument();
    });

    it('should show multiple errors with correct count', () => {
      const multiErrorData = {
        ...mockProgressData,
        errors: ['Error 1', 'Error 2', 'Error 3'],
      };

      mockUseQuery.mockReturnValue({
        data: multiErrorData,
        error: null,
        isError: false,
        isLoading: false,
      });

      render(
        <RecipeGenerationProgress {...defaultProps} />,
        { wrapper: createTestWrapper() }
      );

      expect(screen.getByText('3 Errors')).toBeInTheDocument();
      expect(screen.getByText('Error 1')).toBeInTheDocument();
      expect(screen.getByText('Error 2')).toBeInTheDocument();
      expect(screen.getByText('Error 3')).toBeInTheDocument();
    });

    it('should truncate error list when too many errors', () => {
      const manyErrorsData = {
        ...mockProgressData,
        errors: ['Error 1', 'Error 2', 'Error 3', 'Error 4', 'Error 5'],
      };

      mockUseQuery.mockReturnValue({
        data: manyErrorsData,
        error: null,
        isError: false,
        isLoading: false,
      });

      render(
        <RecipeGenerationProgress {...defaultProps} />,
        { wrapper: createTestWrapper() }
      );

      expect(screen.getByText('5 Errors')).toBeInTheDocument();
      expect(screen.getByText('Error 1')).toBeInTheDocument();
      expect(screen.getByText('Error 2')).toBeInTheDocument();
      expect(screen.getByText('Error 3')).toBeInTheDocument();
      expect(screen.getByText('... and 2 more errors')).toBeInTheDocument();
      expect(screen.queryByText('Error 4')).not.toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('should enable polling when job is not completed', () => {
      mockUseQuery.mockReturnValue({
        data: {
          jobId: 'test-job-123',
          totalRecipes: 10,
          completed: 5,
          failed: 0,
          currentStep: 'generating',
          percentage: 50,
          startTime: Date.now() - 30000,
          errors: [],
        },
        error: null,
        isError: false,
        isLoading: false,
      });

      render(
        <RecipeGenerationProgress {...defaultProps} />,
        { wrapper: createTestWrapper() }
      );

      // Check that useQuery was called with correct configuration
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['generation-progress', 'test-job-123'],
          refetchInterval: expect.any(Function),
          enabled: true,
        })
      );
    });

    it('should stop polling when job is completed', async () => {
      const completedData = {
        jobId: 'test-job-123',
        totalRecipes: 10,
        completed: 10,
        failed: 0,
        currentStep: 'complete' as const,
        percentage: 100,
        startTime: Date.now() - 60000,
        errors: [],
      };

      mockUseQuery.mockReturnValue({
        data: completedData,
        error: null,
        isError: false,
        isLoading: false,
      });

      render(
        <RecipeGenerationProgress {...defaultProps} onComplete={mockOnComplete} />,
        { wrapper: createTestWrapper() }
      );

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith({
          success: 10,
          failed: 0,
          errors: [],
          metrics: {
            totalDuration: expect.any(Number),
            averageTimePerRecipe: expect.any(Number),
          },
        });
      });
    });

    it('should update display when progress changes', () => {
      const initialData = {
        jobId: 'test-job-123',
        totalRecipes: 10,
        completed: 3,
        failed: 0,
        currentStep: 'generating' as const,
        percentage: 30,
        startTime: Date.now() - 30000,
        errors: [],
      };

      const { rerender } = render(
        <RecipeGenerationProgress {...defaultProps} />,
        { wrapper: createTestWrapper() }
      );

      mockUseQuery.mockReturnValue({
        data: initialData,
        error: null,
        isError: false,
        isLoading: false,
      });

      rerender(<RecipeGenerationProgress {...defaultProps} />);

      expect(screen.getByText('30.0%')).toBeInTheDocument();
      expect(screen.getByText('Overall Progress (3/10)')).toBeInTheDocument();

      // Simulate progress update
      const updatedData = {
        ...initialData,
        completed: 5,
        percentage: 50,
      };

      mockUseQuery.mockReturnValue({
        data: updatedData,
        error: null,
        isError: false,
        isLoading: false,
      });

      rerender(<RecipeGenerationProgress {...defaultProps} />);

      expect(screen.getByText('50.0%')).toBeInTheDocument();
      expect(screen.getByText('Overall Progress (5/10)')).toBeInTheDocument();
    });
  });

  describe('Completion Scenarios', () => {
    it('should call onComplete when job reaches complete state', async () => {
      const completedData = {
        jobId: 'test-job-123',
        totalRecipes: 10,
        completed: 8,
        failed: 2,
        currentStep: 'complete' as const,
        percentage: 100,
        startTime: Date.now() - 120000, // 2 minutes ago
        errors: ['Failed to generate Recipe 3', 'Failed to generate Recipe 7'],
      };

      mockUseQuery.mockReturnValue({
        data: completedData,
        error: null,
        isError: false,
        isLoading: false,
      });

      render(
        <RecipeGenerationProgress {...defaultProps} onComplete={mockOnComplete} />,
        { wrapper: createTestWrapper() }
      );

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith({
          success: 8,
          failed: 2,
          errors: ['Failed to generate Recipe 3', 'Failed to generate Recipe 7'],
          metrics: {
            totalDuration: expect.any(Number),
            averageTimePerRecipe: expect.any(Number),
          },
        });
      });
    });

    it('should call onError when job reaches failed state', async () => {
      const failedData = {
        jobId: 'test-job-123',
        totalRecipes: 10,
        completed: 2,
        failed: 8,
        currentStep: 'failed' as const,
        percentage: 100,
        startTime: Date.now() - 90000,
        errors: ['OpenAI API rate limit exceeded', 'Database connection timeout'],
      };

      mockUseQuery.mockReturnValue({
        data: failedData,
        error: null,
        isError: false,
        isLoading: false,
      });

      render(
        <RecipeGenerationProgress {...defaultProps} onError={mockOnError} />,
        { wrapper: createTestWrapper() }
      );

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          'OpenAI API rate limit exceeded, Database connection timeout'
        );
      });
    });

    it('should show completion badge with checkmark', () => {
      const completedData = {
        jobId: 'test-job-123',
        totalRecipes: 5,
        completed: 5,
        failed: 0,
        currentStep: 'complete' as const,
        percentage: 100,
        startTime: Date.now() - 60000,
        errors: [],
      };

      mockUseQuery.mockReturnValue({
        data: completedData,
        error: null,
        isError: false,
        isLoading: false,
      });

      render(
        <RecipeGenerationProgress {...defaultProps} />,
        { wrapper: createTestWrapper() }
      );

      expect(screen.getByText('✓ Generation complete!')).toBeInTheDocument();
    });

    it('should show failure badge with X mark', () => {
      const failedData = {
        jobId: 'test-job-123',
        totalRecipes: 10,
        completed: 0,
        failed: 10,
        currentStep: 'failed' as const,
        percentage: 100,
        startTime: Date.now() - 60000,
        errors: ['Critical system failure'],
      };

      mockUseQuery.mockReturnValue({
        data: failedData,
        error: null,
        isError: false,
        isLoading: false,
      });

      render(
        <RecipeGenerationProgress {...defaultProps} />,
        { wrapper: createTestWrapper() }
      );

      expect(screen.getByText('✗ Generation failed')).toBeInTheDocument();
    });

    it('should only call onComplete once for completed job', async () => {
      const completedData = {
        jobId: 'test-job-123',
        totalRecipes: 5,
        completed: 5,
        failed: 0,
        currentStep: 'complete' as const,
        percentage: 100,
        startTime: Date.now() - 60000,
        errors: [],
      };

      mockUseQuery.mockReturnValue({
        data: completedData,
        error: null,
        isError: false,
        isLoading: false,
      });

      const { rerender } = render(
        <RecipeGenerationProgress {...defaultProps} onComplete={mockOnComplete} />,
        { wrapper: createTestWrapper() }
      );

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledTimes(1);
      });

      // Rerender with same data - should not call onComplete again
      rerender(<RecipeGenerationProgress {...defaultProps} onComplete={mockOnComplete} />);

      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should call onError when query fails', async () => {
      const queryError = new Error('Network connection failed');
      
      mockUseQuery.mockReturnValue({
        data: undefined,
        error: queryError,
        isError: true,
        isLoading: false,
      });

      render(
        <RecipeGenerationProgress {...defaultProps} onError={mockOnError} />,
        { wrapper: createTestWrapper() }
      );

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          'Failed to track progress: Network connection failed'
        );
      });
    });

    it('should handle API timeout errors gracefully', async () => {
      const timeoutError = new Error('Request timeout');
      
      mockUseQuery.mockReturnValue({
        data: undefined,
        error: timeoutError,
        isError: true,
        isLoading: false,
      });

      render(
        <RecipeGenerationProgress {...defaultProps} onError={mockOnError} />,
        { wrapper: createTestWrapper() }
      );

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          'Failed to track progress: Request timeout'
        );
      });
    });

    it('should handle malformed progress data', () => {
      const malformedData = {
        jobId: 'test-job-123',
        // Missing required fields
        percentage: 'invalid',
      };

      mockUseQuery.mockReturnValue({
        data: malformedData,
        error: null,
        isError: false,
        isLoading: false,
      });

      expect(() => {
        render(
          <RecipeGenerationProgress {...defaultProps} />,
          { wrapper: createTestWrapper() }
        );
      }).not.toThrow();
    });
  });

  describe('Visual States', () => {
    it('should show correct icon for each step', () => {
      const stepData = {
        jobId: 'test-job-123',
        totalRecipes: 10,
        completed: 5,
        failed: 0,
        currentStep: 'validating' as const,
        percentage: 50,
        startTime: Date.now() - 30000,
        errors: [],
      };

      mockUseQuery.mockReturnValue({
        data: stepData,
        error: null,
        isError: false,
        isLoading: false,
      });

      render(
        <RecipeGenerationProgress {...defaultProps} />,
        { wrapper: createTestWrapper() }
      );

      expect(screen.getByTestId('checkcircle-icon')).toBeInTheDocument();
      expect(screen.getByText('Validating recipe data...')).toBeInTheDocument();
    });

    it('should animate icons for active steps', () => {
      const activeData = {
        jobId: 'test-job-123',
        totalRecipes: 10,
        completed: 3,
        failed: 0,
        currentStep: 'generating' as const,
        percentage: 30,
        startTime: Date.now() - 30000,
        errors: [],
      };

      mockUseQuery.mockReturnValue({
        data: activeData,
        error: null,
        isError: false,
        isLoading: false,
      });

      render(
        <RecipeGenerationProgress {...defaultProps} />,
        { wrapper: createTestWrapper() }
      );

      const icon = screen.getByTestId('zap-icon');
      expect(icon).toHaveClass('animate-pulse');
      expect(icon).toHaveClass('text-blue-500');
    });

    it('should use different colors for different states', () => {
      const completedData = {
        jobId: 'test-job-123',
        totalRecipes: 10,
        completed: 10,
        failed: 0,
        currentStep: 'complete' as const,
        percentage: 100,
        startTime: Date.now() - 60000,
        errors: [],
      };

      mockUseQuery.mockReturnValue({
        data: completedData,
        error: null,
        isError: false,
        isLoading: false,
      });

      render(
        <RecipeGenerationProgress {...defaultProps} />,
        { wrapper: createTestWrapper() }
      );

      const icon = screen.getByTestId('checkcircle-icon');
      expect(icon).toHaveClass('text-green-500');
    });
  });

  describe('Time Calculations', () => {
    it('should format elapsed time correctly for seconds only', () => {
      const recentData = {
        jobId: 'test-job-123',
        totalRecipes: 10,
        completed: 2,
        failed: 0,
        currentStep: 'generating' as const,
        percentage: 20,
        startTime: Date.now() - 15000, // 15 seconds ago
        errors: [],
      };

      mockUseQuery.mockReturnValue({
        data: recentData,
        error: null,
        isError: false,
        isLoading: false,
      });

      render(
        <RecipeGenerationProgress {...defaultProps} />,
        { wrapper: createTestWrapper() }
      );

      expect(screen.getByText('15s')).toBeInTheDocument();
    });

    it('should format ETA correctly for minutes and seconds', () => {
      const dataWithETA = {
        jobId: 'test-job-123',
        totalRecipes: 10,
        completed: 3,
        failed: 0,
        currentStep: 'generating' as const,
        percentage: 30,
        startTime: Date.now() - 30000,
        estimatedCompletion: Date.now() + 150000, // 2 minutes 30 seconds
        errors: [],
      };

      mockUseQuery.mockReturnValue({
        data: dataWithETA,
        error: null,
        isError: false,
        isLoading: false,
      });

      render(
        <RecipeGenerationProgress {...defaultProps} />,
        { wrapper: createTestWrapper() }
      );

      expect(screen.getByText('2m 30s')).toBeInTheDocument();
    });

    it('should show placeholder when ETA is not available', () => {
      const dataWithoutETA = {
        jobId: 'test-job-123',
        totalRecipes: 10,
        completed: 0,
        failed: 0,
        currentStep: 'starting' as const,
        percentage: 0,
        startTime: Date.now() - 5000,
        errors: [],
      };

      mockUseQuery.mockReturnValue({
        data: dataWithoutETA,
        error: null,
        isError: false,
        isLoading: false,
      });

      render(
        <RecipeGenerationProgress {...defaultProps} />,
        { wrapper: createTestWrapper() }
      );

      expect(screen.getByText('--')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const progressData = {
        jobId: 'test-job-123',
        totalRecipes: 10,
        completed: 5,
        failed: 0,
        currentStep: 'generating' as const,
        percentage: 50,
        startTime: Date.now() - 30000,
        errors: [],
      };

      mockUseQuery.mockReturnValue({
        data: progressData,
        error: null,
        isError: false,
        isLoading: false,
      });

      render(
        <RecipeGenerationProgress {...defaultProps} />,
        { wrapper: createTestWrapper() }
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should provide meaningful text for screen readers', () => {
      const progressData = {
        jobId: 'test-job-123',
        totalRecipes: 10,
        completed: 7,
        failed: 1,
        currentStep: 'storing' as const,
        percentage: 80,
        startTime: Date.now() - 60000,
        errors: ['Minor error'],
      };

      mockUseQuery.mockReturnValue({
        data: progressData,
        error: null,
        isError: false,
        isLoading: false,
      });

      render(
        <RecipeGenerationProgress {...defaultProps} />,
        { wrapper: createTestWrapper() }
      );

      expect(screen.getByText('Overall Progress (8/10)')).toBeInTheDocument();
      expect(screen.getByText('Saving to database...')).toBeInTheDocument();
    });
  });
});