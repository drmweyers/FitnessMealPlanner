import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RecipeGenerationModal from '../../../client/src/components/RecipeGenerationModal';
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

// Mock React Query
const mockUseMutation = vi.fn();
const mockUseQueryClient = vi.fn();
const mockUseQuery = vi.fn();

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useMutation: mockUseMutation,
    useQueryClient: mockUseQueryClient,
    useQuery: mockUseQuery,
  };
});

// Mock the toast hook
const mockToast = vi.fn();
vi.mock('../../../client/src/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock RecipeGenerationProgress component
vi.mock('../../../client/src/components/RecipeGenerationProgress', () => ({
  default: ({ jobId, totalRecipes, onComplete, onError }: any) => (
    <div data-testid="recipe-generation-progress">
      <div data-testid="job-id">{jobId}</div>
      <div data-testid="total-recipes">{totalRecipes}</div>
      <button 
        data-testid="simulate-complete" 
        onClick={() => onComplete({ success: totalRecipes, failed: 0, errors: [] })}
      >
        Complete
      </button>
      <button 
        data-testid="simulate-error" 
        onClick={() => onError('Test error')}
      >
        Error
      </button>
    </div>
  ),
}));

// Mock window.location.reload
delete (window as any).location;
window.location = { ...window.location, reload: vi.fn() };

// Helper to create test wrapper
function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const mockQueryClient = {
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
    getQueryData: vi.fn(),
  };

  mockUseQueryClient.mockReturnValue(mockQueryClient);

  return {
    wrapper: function TestWrapper({ children }: { children: React.ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    },
    queryClient: mockQueryClient,
  };
}

describe('Enhanced RecipeGenerationModal Component', () => {
  let mockOnClose: ReturnType<typeof vi.fn>;
  let mockMutate: ReturnType<typeof vi.fn>;
  let mockMutateAsync: ReturnType<typeof vi.fn>;
  
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    mockOnClose = vi.fn();
    mockMutate = vi.fn();
    mockMutateAsync = vi.fn();
    
    mockUseMutation.mockReturnValue({
      mutate: mockMutate,
      mutateAsync: mockMutateAsync,
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: false,
      data: null,
    });

    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });

    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial Render', () => {
    it('should render when isOpen is true', () => {
      const { wrapper } = createTestWrapper();
      
      render(
        <RecipeGenerationModal {...defaultProps} />,
        { wrapper }
      );

      expect(screen.getByText('AI Recipe Generation')).toBeInTheDocument();
      expect(screen.getByText('Generate Custom Recipes')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      const { wrapper } = createTestWrapper();
      
      render(
        <RecipeGenerationModal {...defaultProps} isOpen={false} />,
        { wrapper }
      );

      expect(screen.queryByText('AI Recipe Generation')).not.toBeInTheDocument();
    });

    it('should render form controls with default values', () => {
      const { wrapper } = createTestWrapper();
      
      render(
        <RecipeGenerationModal {...defaultProps} />,
        { wrapper }
      );

      expect(screen.getByDisplayValue('10')).toBeInTheDocument(); // Recipe count
      expect(screen.getByDisplayValue('2000')).toBeInTheDocument(); // Daily calories
      expect(screen.getByTestId('textarea')).toBeInTheDocument(); // Natural language input
    });

    it('should render all form sections', () => {
      const { wrapper } = createTestWrapper();
      
      render(
        <RecipeGenerationModal {...defaultProps} />,
        { wrapper }
      );

      expect(screen.getByText('Number of Recipes')).toBeInTheDocument();
      expect(screen.getByText('Fitness Goal')).toBeInTheDocument();
      expect(screen.getByText('Meal Type')).toBeInTheDocument();
      expect(screen.getByText('Dietary Preference')).toBeInTheDocument();
      expect(screen.getByText('Natural Language Prompt')).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('should update recipe count when changed', async () => {
      const user = userEvent.setup();
      const { wrapper } = createTestWrapper();
      
      render(
        <RecipeGenerationModal {...defaultProps} />,
        { wrapper }
      );

      const recipeCountInput = screen.getByDisplayValue('10');
      await user.clear(recipeCountInput);
      await user.type(recipeCountInput, '25');

      expect(screen.getByDisplayValue('25')).toBeInTheDocument();
    });

    it('should update natural language input', async () => {
      const user = userEvent.setup();
      const { wrapper } = createTestWrapper();
      
      render(
        <RecipeGenerationModal {...defaultProps} />,
        { wrapper }
      );

      const textArea = screen.getByTestId('textarea');
      await user.type(textArea, 'High protein meals for muscle building');

      expect(textArea).toHaveValue('High protein meals for muscle building');
    });

    it('should update daily calorie target', async () => {
      const user = userEvent.setup();
      const { wrapper } = createTestWrapper();
      
      render(
        <RecipeGenerationModal {...defaultProps} />,
        { wrapper }
      );

      const calorieInput = screen.getByDisplayValue('2000');
      await user.clear(calorieInput);
      await user.type(calorieInput, '2500');

      expect(screen.getByDisplayValue('2500')).toBeInTheDocument();
    });

    it('should handle form submission', async () => {
      const user = userEvent.setup();
      const { wrapper } = createTestWrapper();

      // Mock successful API response
      mockApiRequest.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          message: 'Recipe generation started',
          jobId: 'test-job-123',
          totalRecipes: 15,
        }),
      });

      render(
        <RecipeGenerationModal {...defaultProps} />,
        { wrapper }
      );

      // Fill out form
      const recipeCountInput = screen.getByDisplayValue('10');
      await user.clear(recipeCountInput);
      await user.type(recipeCountInput, '15');

      const textArea = screen.getByTestId('textarea');
      await user.type(textArea, 'Keto-friendly recipes');

      // Submit form
      const generateButton = screen.getByText('Generate Recipes');
      await user.click(generateButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          'POST',
          '/api/admin/generate',
          expect.objectContaining({
            count: 15,
            naturalLanguagePrompt: 'Keto-friendly recipes',
            fitnessGoal: 'all',
            dailyCalorieTarget: 2000,
            mealType: 'all',
            dietaryTag: 'all',
          })
        );
      });
    });

    it('should validate recipe count limits', async () => {
      const user = userEvent.setup();
      const { wrapper } = createTestWrapper();
      
      render(
        <RecipeGenerationModal {...defaultProps} />,
        { wrapper }
      );

      const recipeCountInput = screen.getByDisplayValue('10');
      
      // Test minimum limit
      await user.clear(recipeCountInput);
      await user.type(recipeCountInput, '0');
      expect(screen.getByDisplayValue('1')).toBeInTheDocument(); // Should be clamped to 1

      // Test maximum limit
      await user.clear(recipeCountInput);
      await user.type(recipeCountInput, '600');
      expect(screen.getByDisplayValue('500')).toBeInTheDocument(); // Should be clamped to 500
    });
  });

  describe('Generation Process', () => {
    it('should start generation and show progress component', async () => {
      const user = userEvent.setup();
      const { wrapper } = createTestWrapper();

      mockApiRequest.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          message: 'Recipe generation started',
          jobId: 'test-job-456',
          totalRecipes: 12,
        }),
      });

      render(
        <RecipeGenerationModal {...defaultProps} />,
        { wrapper }
      );

      const generateButton = screen.getByText('Generate Recipes');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByTestId('recipe-generation-progress')).toBeInTheDocument();
        expect(screen.getByTestId('job-id')).toHaveTextContent('test-job-456');
        expect(screen.getByTestId('total-recipes')).toHaveTextContent('12');
      });
    });

    it('should disable form during generation', async () => {
      const user = userEvent.setup();
      const { wrapper } = createTestWrapper();

      mockApiRequest.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          jobId: 'test-job-123',
          totalRecipes: 10,
        }),
      });

      render(
        <RecipeGenerationModal {...defaultProps} />,
        { wrapper }
      );

      const generateButton = screen.getByText('Generate Recipes');
      await user.click(generateButton);

      await waitFor(() => {
        const recipeCountInput = screen.getByDisplayValue('10');
        expect(recipeCountInput).toBeDisabled();
        
        const textArea = screen.getByTestId('textarea');
        expect(textArea).toBeDisabled();
      });
    });

    it('should handle generation completion', async () => {
      const user = userEvent.setup();
      const { wrapper, queryClient } = createTestWrapper();

      mockApiRequest.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          jobId: 'test-job-789',
          totalRecipes: 8,
        }),
      });

      render(
        <RecipeGenerationModal {...defaultProps} onClose={mockOnClose} />,
        { wrapper }
      );

      // Start generation
      const generateButton = screen.getByText('Generate Recipes');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByTestId('recipe-generation-progress')).toBeInTheDocument();
      });

      // Simulate completion
      const completeButton = screen.getByTestId('simulate-complete');
      await user.click(completeButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Recipe Generation Completed!',
          description: expect.stringContaining('Successfully generated 8 recipes'),
        });
      });

      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['/api/admin/stats'],
      });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['/api/admin/recipes'],
      });

      // Should close modal after delay
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(mockOnClose).toHaveBeenCalled();

      // Should reload page after longer delay
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(window.location.reload).toHaveBeenCalled();
    });

    it('should handle generation error', async () => {
      const user = userEvent.setup();
      const { wrapper } = createTestWrapper();

      mockApiRequest.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          jobId: 'test-job-error',
          totalRecipes: 5,
        }),
      });

      render(
        <RecipeGenerationModal {...defaultProps} />,
        { wrapper }
      );

      // Start generation
      const generateButton = screen.getByText('Generate Recipes');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByTestId('recipe-generation-progress')).toBeInTheDocument();
      });

      // Simulate error
      const errorButton = screen.getByTestId('simulate-error');
      await user.click(errorButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Generation Failed',
          description: 'Test error',
          variant: 'destructive',
        });
      });
    });

    it('should handle API errors during submission', async () => {
      const user = userEvent.setup();
      const { wrapper } = createTestWrapper();

      mockApiRequest.mockRejectedValue(new Error('Network error'));

      render(
        <RecipeGenerationModal {...defaultProps} />,
        { wrapper }
      );

      const generateButton = screen.getByText('Generate Recipes');
      await user.click(generateButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Generation Failed',
          description: expect.stringContaining('Network error'),
          variant: 'destructive',
        });
      });
    });

    it('should handle unauthorized errors', async () => {
      const user = userEvent.setup();
      const { wrapper } = createTestWrapper();

      const unauthorizedError = new Error('Unauthorized');
      (unauthorizedError as any).status = 401;
      mockApiRequest.mockRejectedValue(unauthorizedError);

      render(
        <RecipeGenerationModal {...defaultProps} />,
        { wrapper }
      );

      const generateButton = screen.getByText('Generate Recipes');
      await user.click(generateButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Authentication Error',
          description: 'Please log in again to continue.',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Advanced Form Features', () => {
    it('should handle nutritional constraints', async () => {
      const user = userEvent.setup();
      const { wrapper } = createTestWrapper();

      render(
        <RecipeGenerationModal {...defaultProps} />,
        { wrapper }
      );

      // Toggle advanced options
      const advancedToggle = screen.getByText('Advanced Options');
      await user.click(advancedToggle);

      // Check that nutritional constraint fields appear
      expect(screen.getByText('Max Prep Time (minutes)')).toBeInTheDocument();
      expect(screen.getByText('Max Calories')).toBeInTheDocument();
      expect(screen.getByText('Min Protein (g)')).toBeInTheDocument();
      expect(screen.getByText('Max Protein (g)')).toBeInTheDocument();
    });

    it('should include nutritional constraints in submission', async () => {
      const user = userEvent.setup();
      const { wrapper } = createTestWrapper();

      mockApiRequest.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          jobId: 'test-job-nutrients',
          totalRecipes: 5,
        }),
      });

      render(
        <RecipeGenerationModal {...defaultProps} />,
        { wrapper }
      );

      // Open advanced options
      const advancedToggle = screen.getByText('Advanced Options');
      await user.click(advancedToggle);

      // Fill in nutritional constraints
      const maxPrepTime = screen.getByLabelText('Max Prep Time (minutes)');
      await user.type(maxPrepTime, '30');

      const minProtein = screen.getByLabelText('Min Protein (g)');
      await user.type(minProtein, '20');

      // Submit
      const generateButton = screen.getByText('Generate Recipes');
      await user.click(generateButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          'POST',
          '/api/admin/generate',
          expect.objectContaining({
            maxPrepTime: 30,
            minProtein: 20,
          })
        );
      });
    });

    it('should handle select field changes', async () => {
      const user = userEvent.setup();
      const { wrapper } = createTestWrapper();

      render(
        <RecipeGenerationModal {...defaultProps} />,
        { wrapper }
      );

      // Test changing fitness goal
      const fitnessGoalSelect = screen.getByTestId('select-trigger');
      await user.click(fitnessGoalSelect);

      const muscleGainOption = screen.getByText('Muscle Gain');
      await user.click(muscleGainOption);

      // Verify selection
      expect(screen.getByText('Muscle Gain')).toBeInTheDocument();
    });
  });

  describe('Modal Behavior', () => {
    it('should close modal when close button is clicked', async () => {
      const user = userEvent.setup();
      const { wrapper } = createTestWrapper();

      render(
        <RecipeGenerationModal {...defaultProps} onClose={mockOnClose} />,
        { wrapper }
      );

      const closeButton = screen.getByTestId('x-icon');
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close modal during generation', async () => {
      const user = userEvent.setup();
      const { wrapper } = createTestWrapper();

      mockApiRequest.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          jobId: 'test-job-no-close',
          totalRecipes: 10,
        }),
      });

      render(
        <RecipeGenerationModal {...defaultProps} onClose={mockOnClose} />,
        { wrapper }
      );

      // Start generation
      const generateButton = screen.getByText('Generate Recipes');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByTestId('recipe-generation-progress')).toBeInTheDocument();
      });

      // Close button should be disabled during generation
      const closeButton = screen.getByTestId('x-icon');
      expect(closeButton.closest('button')).toBeDisabled();
    });

    it('should reset form when reopened', () => {
      const { wrapper } = createTestWrapper();

      const { rerender } = render(
        <RecipeGenerationModal {...defaultProps} isOpen={false} />,
        { wrapper }
      );

      // Open modal
      rerender(
        <RecipeGenerationModal {...defaultProps} isOpen={true} />
      );

      // Should show default values
      expect(screen.getByDisplayValue('10')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2000')).toBeInTheDocument();
    });
  });

  describe('Integration with Progress Component', () => {
    it('should pass correct props to progress component', async () => {
      const user = userEvent.setup();
      const { wrapper } = createTestWrapper();

      mockApiRequest.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          jobId: 'integration-job-123',
          totalRecipes: 15,
        }),
      });

      render(
        <RecipeGenerationModal {...defaultProps} />,
        { wrapper }
      );

      const recipeCountInput = screen.getByDisplayValue('10');
      await user.clear(recipeCountInput);
      await user.type(recipeCountInput, '15');

      const generateButton = screen.getByText('Generate Recipes');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByTestId('job-id')).toHaveTextContent('integration-job-123');
        expect(screen.getByTestId('total-recipes')).toHaveTextContent('15');
      });
    });

    it('should handle progress component callbacks', async () => {
      const user = userEvent.setup();
      const { wrapper, queryClient } = createTestWrapper();

      mockApiRequest.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          jobId: 'callback-job-456',
          totalRecipes: 5,
        }),
      });

      render(
        <RecipeGenerationModal {...defaultProps} onClose={mockOnClose} />,
        { wrapper }
      );

      // Start generation
      const generateButton = screen.getByText('Generate Recipes');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByTestId('recipe-generation-progress')).toBeInTheDocument();
      });

      // Test completion callback
      const completeButton = screen.getByTestId('simulate-complete');
      await user.click(completeButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Recipe Generation Completed!',
          })
        );
      });

      // Test error callback
      const errorButton = screen.getByTestId('simulate-error');
      await user.click(errorButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Generation Failed',
            variant: 'destructive',
          })
        );
      });
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle rapid form changes', async () => {
      const user = userEvent.setup();
      const { wrapper } = createTestWrapper();

      render(
        <RecipeGenerationModal {...defaultProps} />,
        { wrapper }
      );

      const recipeCountInput = screen.getByDisplayValue('10');

      // Rapidly change values
      for (let i = 0; i < 10; i++) {
        await user.clear(recipeCountInput);
        await user.type(recipeCountInput, String(i + 1));
      }

      expect(screen.getByDisplayValue('10')).toBeInTheDocument();
    });

    it('should handle component unmounting during generation', async () => {
      const user = userEvent.setup();
      const { wrapper } = createTestWrapper();

      mockApiRequest.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          jobId: 'unmount-job-789',
          totalRecipes: 8,
        }),
      });

      const { unmount } = render(
        <RecipeGenerationModal {...defaultProps} />,
        { wrapper }
      );

      // Start generation
      const generateButton = screen.getByText('Generate Recipes');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByTestId('recipe-generation-progress')).toBeInTheDocument();
      });

      // Unmount component - should not throw errors
      expect(() => unmount()).not.toThrow();
    });

    it('should handle malformed API responses', async () => {
      const user = userEvent.setup();
      const { wrapper } = createTestWrapper();

      mockApiRequest.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          // Missing jobId
          totalRecipes: 10,
        }),
      });

      render(
        <RecipeGenerationModal {...defaultProps} />,
        { wrapper }
      );

      const generateButton = screen.getByText('Generate Recipes');
      await user.click(generateButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Generation Failed',
            variant: 'destructive',
          })
        );
      });
    });

    it('should handle empty form submission', async () => {
      const user = userEvent.setup();
      const { wrapper } = createTestWrapper();

      render(
        <RecipeGenerationModal {...defaultProps} />,
        { wrapper }
      );

      // Clear recipe count
      const recipeCountInput = screen.getByDisplayValue('10');
      await user.clear(recipeCountInput);

      const generateButton = screen.getByText('Generate Recipes');
      await user.click(generateButton);

      // Should use default count of 1
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          'POST',
          '/api/admin/generate',
          expect.objectContaining({
            count: 1,
          })
        );
      });
    });
  });
});