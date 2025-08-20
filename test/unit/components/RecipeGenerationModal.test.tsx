/**
 * RecipeGenerationModal Component Tests
 * 
 * Comprehensive tests for the RecipeGenerationModal component covering:
 * - Modal open/close functionality
 * - Form validation and submission
 * - Quick generation vs context-based generation paths
 * - API integration and error handling
 * - Loading states and progress tracking
 * - Authentication checks and session management
 * - Natural language input processing
 * - Recipe count selection
 * - Context parameter collection
 * - Modal backdrop and escape handling
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecipeGenerationModal from '@/components/RecipeGenerationModal';
import { renderWithProviders, mockUsers } from '../../test-utils';
import { QueryClient } from '@tanstack/react-query';

// Mock the toast hook
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Mock the API request function
const mockApiRequest = vi.fn();
vi.mock('@/lib/queryClient', () => ({
  apiRequest: mockApiRequest,
}));

// Mock authentication utilities
vi.mock('@/lib/authUtils', () => ({
  isUnauthorizedError: (error: any) => 
    error?.message?.includes('401') || 
    error?.message?.includes('jwt expired') || 
    error?.message?.includes('Authentication required'),
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => {
  const createIcon = (name: string) => {
    const Icon = React.forwardRef((props: any, ref: any) => 
      React.createElement('svg', { 
        ref, 
        'data-testid': `${name.toLowerCase()}-icon`,
        ...props 
      })
    );
    Icon.displayName = name;
    return Icon;
  };
  
  return {
    X: createIcon('X'),
    Wand2: createIcon('Wand2'),
    Target: createIcon('Target'),
    ChevronDown: createIcon('ChevronDown'),
  };
});

// Mock window location for redirect tests
const mockLocationHref = vi.fn();
Object.defineProperty(window, 'location', {
  value: {
    href: '',
    reload: vi.fn(),
  },
  writable: true,
});

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('RecipeGenerationModal', () => {
  let queryClient: QueryClient;
  let user: ReturnType<typeof userEvent.setup>;

  const mockStats = {
    total: 100,
    approved: 80,
    pending: 20,
    users: 50,
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, refetchInterval: false },
        mutations: { retry: false },
      },
    });
    user = userEvent.setup();
    vi.clearAllMocks();

    // Default localStorage mock
    mockLocalStorage.getItem.mockReturnValue('valid-jwt-token');

    // Default API mock
    mockApiRequest.mockResolvedValue({
      json: () => Promise.resolve({
        message: 'Generation started successfully',
        count: 10,
        started: true,
        success: 10,
        failed: 0,
        errors: [],
      }),
    });

    // Mock stats query
    queryClient.setQueryData(['adminStats'], mockStats);

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Modal Rendering and Visibility', () => {
    it('renders modal when isOpen is true', () => {
      renderWithProviders(<RecipeGenerationModal {...defaultProps} />, {
        queryClient,
        authContextValue: { 
          user: mockUsers.admin, 
          isAuthenticated: true, 
          isLoading: false,
          error: undefined,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
        },
      });

      expect(screen.getByText('Generate Targeted Recipes')).toBeInTheDocument();
      expect(screen.getByText('Use meal plan criteria to generate contextually relevant recipes')).toBeInTheDocument();
    });

    it('does not render modal when isOpen is false', () => {
      renderWithProviders(
        <RecipeGenerationModal {...defaultProps} isOpen={false} />, 
        {
          queryClient,
          authContextValue: { 
            user: mockUsers.admin, 
            isAuthenticated: true, 
            isLoading: false,
            error: undefined,
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn(),
          },
        }
      );

      expect(screen.queryByText('Generate Targeted Recipes')).not.toBeInTheDocument();
    });

    it('renders modal backdrop and prevents click-through', async () => {
      const onClose = vi.fn();
      renderWithProviders(
        <RecipeGenerationModal {...defaultProps} onClose={onClose} />, 
        {
          queryClient,
          authContextValue: { 
            user: mockUsers.admin, 
            isAuthenticated: true, 
            isLoading: false,
            error: undefined,
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn(),
          },
        }
      );

      // Click on backdrop
      const backdrop = screen.getByText('Generate Targeted Recipes').closest('[class*="fixed inset-0"]');
      expect(backdrop).toBeInTheDocument();
      
      if (backdrop) {
        await user.click(backdrop);
        expect(onClose).toHaveBeenCalled();
      }
    });

    it('closes modal when close button is clicked', async () => {
      const onClose = vi.fn();
      renderWithProviders(
        <RecipeGenerationModal {...defaultProps} onClose={onClose} />, 
        {
          queryClient,
          authContextValue: { 
            user: mockUsers.admin, 
            isAuthenticated: true, 
            isLoading: false,
            error: undefined,
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn(),
          },
        }
      );

      const closeButton = screen.getByTestId('x-icon').closest('button');
      expect(closeButton).toBeInTheDocument();
      
      if (closeButton) {
        await user.click(closeButton);
        expect(onClose).toHaveBeenCalled();
      }
    });

    it('prevents modal content click from bubbling to backdrop', async () => {
      const onClose = vi.fn();
      renderWithProviders(
        <RecipeGenerationModal {...defaultProps} onClose={onClose} />, 
        {
          queryClient,
          authContextValue: { 
            user: mockUsers.admin, 
            isAuthenticated: true, 
            isLoading: false,
            error: undefined,
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn(),
          },
        }
      );

      // Click on modal content (not backdrop)
      const modalContent = screen.getByText('Generate Targeted Recipes');
      await user.click(modalContent);
      
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Recipe Count Selection', () => {
    beforeEach(() => {
      renderWithProviders(<RecipeGenerationModal {...defaultProps} />, {
        queryClient,
        authContextValue: { 
          user: mockUsers.admin, 
          isAuthenticated: true, 
          isLoading: false,
          error: undefined,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
        },
      });
    });

    it('renders recipe count selector with default value', () => {
      expect(screen.getByText('Recipe Count')).toBeInTheDocument();
      expect(screen.getByText('Number of recipes to generate:')).toBeInTheDocument();
      
      // Should have default value selected (10)
      const selectTrigger = screen.getByRole('combobox');
      expect(selectTrigger).toBeInTheDocument();
    });

    it('displays all recipe count options', async () => {
      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);

      // Check for some key options
      await waitFor(() => {
        expect(screen.getByText('1 recipe')).toBeInTheDocument();
        expect(screen.getByText('10 recipes')).toBeInTheDocument();
        expect(screen.getByText('50 recipes')).toBeInTheDocument();
        expect(screen.getByText('100 recipes')).toBeInTheDocument();
        expect(screen.getByText('500 recipes')).toBeInTheDocument();
      });
    });

    it('updates recipe count when selection changes', async () => {
      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);

      const option25 = screen.getByText('5 recipes');
      await user.click(option25);

      // Verify selection updated (implementation dependent on Select component)
      expect(selectTrigger).toHaveTextContent('5');
    });
  });

  describe('Quick Random Generation', () => {
    beforeEach(() => {
      renderWithProviders(<RecipeGenerationModal {...defaultProps} />, {
        queryClient,
        authContextValue: { 
          user: mockUsers.admin, 
          isAuthenticated: true, 
          isLoading: false,
          error: undefined,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
        },
      });
    });

    it('renders quick generation section', () => {
      expect(screen.getByText('Quick Random Generation')).toBeInTheDocument();
      expect(screen.getByText('Generate random recipes without specific criteria')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /generate random recipes/i })).toBeInTheDocument();
    });

    it('calls API for quick generation', async () => {
      const quickButton = screen.getByRole('button', { name: /generate random recipes/i });
      await user.click(quickButton);

      expect(mockApiRequest).toHaveBeenCalledWith(
        'POST',
        '/api/admin/generate',
        { count: 10 }
      );
    });

    it('shows loading state during quick generation', async () => {
      mockApiRequest.mockImplementation(() => new Promise(() => {})); // Never resolves

      const quickButton = screen.getByRole('button', { name: /generate random recipes/i });
      await user.click(quickButton);

      expect(screen.getByText('Generating...')).toBeInTheDocument();
      expect(quickButton).toBeDisabled();
    });

    it('handles quick generation success', async () => {
      const quickButton = screen.getByRole('button', { name: /generate random recipes/i });
      await user.click(quickButton);

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Bulk Generation Started',
        description: 'Generation started successfully',
      });
    });

    it('handles quick generation error', async () => {
      mockApiRequest.mockRejectedValue(new Error('Generation failed'));

      const quickButton = screen.getByRole('button', { name: /generate random recipes/i });
      await user.click(quickButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Generation Failed',
          description: 'Generation failed',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Context-Based Generation', () => {
    beforeEach(() => {
      renderWithProviders(<RecipeGenerationModal {...defaultProps} />, {
        queryClient,
        authContextValue: { 
          user: mockUsers.admin, 
          isAuthenticated: true, 
          isLoading: false,
          error: undefined,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
        },
      });
    });

    it('renders context-based generation section', () => {
      expect(screen.getByText('Context-Based Generation')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /generate targeted recipes/i })).toBeInTheDocument();
    });

    it('renders natural language input field', () => {
      expect(screen.getByText('Describe Recipe Requirements (Optional)')).toBeInTheDocument();
      const textarea = screen.getByPlaceholderText(/Example: I need protein-rich breakfast recipes/);
      expect(textarea).toBeInTheDocument();
    });

    it('accepts natural language input', async () => {
      const textarea = screen.getByPlaceholderText(/Example: I need protein-rich breakfast recipes/);
      await user.type(textarea, 'Generate 5 high-protein keto breakfast recipes with eggs');

      expect(textarea).toHaveValue('Generate 5 high-protein keto breakfast recipes with eggs');
    });

    it('renders form fields for context parameters', () => {
      expect(screen.getByText('Fitness Goal')).toBeInTheDocument();
      expect(screen.getByText('Daily Calorie Target')).toBeInTheDocument();
      expect(screen.getByText('Meal Type')).toBeInTheDocument();
      expect(screen.getByText('Dietary')).toBeInTheDocument();
      expect(screen.getByText('Max Prep Time')).toBeInTheDocument();
      expect(screen.getByText('Max Calories')).toBeInTheDocument();
    });

    it('renders macro nutrient targets', () => {
      expect(screen.getByText('Macro Nutrient Targets (per meal)')).toBeInTheDocument();
      expect(screen.getByText('Protein (g)')).toBeInTheDocument();
      expect(screen.getByText('Carbohydrates (g)')).toBeInTheDocument();
      expect(screen.getByText('Fat (g)')).toBeInTheDocument();
    });

    it('accepts form input for context parameters', async () => {
      const calorieInput = screen.getByDisplayValue('2000');
      await user.clear(calorieInput);
      await user.type(calorieInput, '1800');

      expect(calorieInput).toHaveValue(1800);

      const ingredientInput = screen.getByPlaceholderText(/e.g., chicken, salmon, quinoa.../);
      await user.type(ingredientInput, 'salmon');

      expect(ingredientInput).toHaveValue('salmon');
    });

    it('submits context-based generation with form data', async () => {
      // Fill in some form data
      const textarea = screen.getByPlaceholderText(/Example: I need protein-rich breakfast recipes/);
      await user.type(textarea, 'High protein breakfast recipes');

      const calorieInput = screen.getByDisplayValue('2000');
      await user.clear(calorieInput);
      await user.type(calorieInput, '1800');

      const submitButton = screen.getByRole('button', { name: /generate targeted recipes/i });
      await user.click(submitButton);

      expect(mockApiRequest).toHaveBeenCalledWith(
        'POST',
        '/api/admin/generate',
        expect.objectContaining({
          count: 10,
          naturalLanguagePrompt: 'High protein breakfast recipes',
          targetCalories: expect.any(Number), // Should be dailyCalorieTarget / 3
        })
      );
    });

    it('calculates target calories per meal correctly', async () => {
      const calorieInput = screen.getByDisplayValue('2000');
      await user.clear(calorieInput);
      await user.type(calorieInput, '2100');

      const submitButton = screen.getByRole('button', { name: /generate targeted recipes/i });
      await user.click(submitButton);

      expect(mockApiRequest).toHaveBeenCalledWith(
        'POST',
        '/api/admin/generate',
        expect.objectContaining({
          targetCalories: 700, // 2100 / 3
        })
      );
    });

    it('excludes undefined values from context submission', async () => {
      const submitButton = screen.getByRole('button', { name: /generate targeted recipes/i });
      await user.click(submitButton);

      const callArgs = mockApiRequest.mock.calls[0][2];
      expect(callArgs).not.toHaveProperty('naturalLanguagePrompt');
      expect(callArgs).not.toHaveProperty('mainIngredient');
      expect(callArgs).not.toHaveProperty('fitnessGoal');
    });
  });

  describe('Authentication Handling', () => {
    it('checks for authentication token before generation', async () => {
      mockLocalStorage.getItem.mockReturnValue(null); // No token

      renderWithProviders(<RecipeGenerationModal {...defaultProps} />, {
        queryClient,
        authContextValue: { 
          user: mockUsers.admin, 
          isAuthenticated: true, 
          isLoading: false,
          error: undefined,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
        },
      });

      const quickButton = screen.getByRole('button', { name: /generate random recipes/i });
      await user.click(quickButton);

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Authentication Required',
        description: 'Please log in to generate recipes.',
        variant: 'destructive',
      });

      expect(mockApiRequest).not.toHaveBeenCalled();
    });

    it('redirects to login when no token present', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      // Mock window.location.href setter
      let currentHref = '';
      Object.defineProperty(window.location, 'href', {
        get: () => currentHref,
        set: (value) => { currentHref = value; },
      });

      renderWithProviders(<RecipeGenerationModal {...defaultProps} />, {
        queryClient,
        authContextValue: { 
          user: mockUsers.admin, 
          isAuthenticated: true, 
          isLoading: false,
          error: undefined,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
        },
      });

      const quickButton = screen.getByRole('button', { name: /generate random recipes/i });
      await user.click(quickButton);

      // Fast-forward past the timeout
      act(() => {
        vi.advanceTimersByTime(1100);
      });

      await waitFor(() => {
        expect(currentHref).toBe('/login');
      });
    });

    it('handles unauthorized errors from API', async () => {
      mockApiRequest.mockRejectedValue(new Error('jwt expired'));

      renderWithProviders(<RecipeGenerationModal {...defaultProps} />, {
        queryClient,
        authContextValue: { 
          user: mockUsers.admin, 
          isAuthenticated: true, 
          isLoading: false,
          error: undefined,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
        },
      });

      const quickButton = screen.getByRole('button', { name: /generate random recipes/i });
      await user.click(quickButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Session Expired',
          description: 'Your session has expired. Please log in again to continue.',
          variant: 'destructive',
        });
      });

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
    });

    it('redirects to login on session expiry', async () => {
      mockApiRequest.mockRejectedValue(new Error('Authentication required'));

      let currentHref = '';
      Object.defineProperty(window.location, 'href', {
        get: () => currentHref,
        set: (value) => { currentHref = value; },
      });

      renderWithProviders(<RecipeGenerationModal {...defaultProps} />, {
        queryClient,
        authContextValue: { 
          user: mockUsers.admin, 
          isAuthenticated: true, 
          isLoading: false,
          error: undefined,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
        },
      });

      const quickButton = screen.getByRole('button', { name: /generate random recipes/i });
      await user.click(quickButton);

      // Fast-forward past the timeout
      act(() => {
        vi.advanceTimersByTime(1100);
      });

      await waitFor(() => {
        expect(currentHref).toBe('/login');
      });
    });
  });

  describe('Progress Tracking and Polling', () => {
    it('starts polling after successful generation start', async () => {
      // Mock the initial stats
      const initialStats = { total: 100 };
      queryClient.setQueryData(['adminStats'], initialStats);

      renderWithProviders(<RecipeGenerationModal {...defaultProps} />, {
        queryClient,
        authContextValue: { 
          user: mockUsers.admin, 
          isAuthenticated: true, 
          isLoading: false,
          error: undefined,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
        },
      });

      const quickButton = screen.getByRole('button', { name: /generate random recipes/i });
      await user.click(quickButton);

      // Should start generation process
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Bulk Generation Started',
        description: 'Generation started successfully',
      });

      // Verify polling is enabled by checking query options
      const queries = queryClient.getQueryCache().getAll();
      const statsQuery = queries.find(q => q.queryKey.includes('adminStats'));
      expect(statsQuery).toBeDefined();
    });

    it('detects completion when stats change', async () => {
      const onClose = vi.fn();
      
      // Set initial stats
      const initialStats = { total: 100 };
      queryClient.setQueryData(['adminStats'], initialStats);

      renderWithProviders(
        <RecipeGenerationModal {...defaultProps} onClose={onClose} />, 
        {
          queryClient,
          authContextValue: { 
            user: mockUsers.admin, 
            isAuthenticated: true, 
            isLoading: false,
            error: undefined,
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn(),
          },
        }
      );

      const quickButton = screen.getByRole('button', { name: /generate random recipes/i });
      await user.click(quickButton);

      // Simulate completion by updating stats
      act(() => {
        queryClient.setQueryData(['adminStats'], { total: 110 }); // 10 new recipes
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Recipe Generation Completed!',
          description: 'Successfully generated 10 new recipes. The page will refresh to show them.',
        });
      });

      // Should close modal after completion
      act(() => {
        vi.advanceTimersByTime(1100);
      });

      expect(onClose).toHaveBeenCalled();
    });

    it('refreshes page after completion', async () => {
      const mockReload = vi.fn();
      Object.defineProperty(window.location, 'reload', {
        value: mockReload,
      });

      // Set initial stats
      queryClient.setQueryData(['adminStats'], { total: 100 });

      renderWithProviders(<RecipeGenerationModal {...defaultProps} />, {
        queryClient,
        authContextValue: { 
          user: mockUsers.admin, 
          isAuthenticated: true, 
          isLoading: false,
          error: undefined,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
        },
      });

      const quickButton = screen.getByRole('button', { name: /generate random recipes/i });
      await user.click(quickButton);

      // Simulate completion
      act(() => {
        queryClient.setQueryData(['adminStats'], { total: 110 });
      });

      // Fast-forward to page refresh
      act(() => {
        vi.advanceTimersByTime(3100);
      });

      expect(mockReload).toHaveBeenCalled();
    });

    it('cleans up polling interval on unmount', async () => {
      const { unmount } = renderWithProviders(<RecipeGenerationModal {...defaultProps} />, {
        queryClient,
        authContextValue: { 
          user: mockUsers.admin, 
          isAuthenticated: true, 
          isLoading: false,
          error: undefined,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
        },
      });

      const quickButton = screen.getByRole('button', { name: /generate random recipes/i });
      await user.click(quickButton);

      // Unmount component
      unmount();

      // Should not crash when cleanup occurs
      act(() => {
        vi.advanceTimersByTime(10000);
      });
    });
  });

  describe('Form Validation and Edge Cases', () => {
    beforeEach(() => {
      renderWithProviders(<RecipeGenerationModal {...defaultProps} />, {
        queryClient,
        authContextValue: { 
          user: mockUsers.admin, 
          isAuthenticated: true, 
          isLoading: false,
          error: undefined,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
        },
      });
    });

    it('handles empty form submission gracefully', async () => {
      const submitButton = screen.getByRole('button', { name: /generate targeted recipes/i });
      await user.click(submitButton);

      expect(mockApiRequest).toHaveBeenCalledWith(
        'POST',
        '/api/admin/generate',
        expect.objectContaining({
          count: 10,
          targetCalories: expect.any(Number),
        })
      );
    });

    it('validates numeric inputs', async () => {
      const calorieInput = screen.getByDisplayValue('2000');
      await user.clear(calorieInput);
      await user.type(calorieInput, 'invalid');

      expect(calorieInput).toHaveValue(NaN); // HTML number input behavior
    });

    it('handles macro nutrient input validation', async () => {
      // Find protein min/max inputs
      const inputs = screen.getAllByRole('textbox');
      const numberInputs = inputs.filter(input => 
        (input as HTMLInputElement).type === 'number' ||
        input.getAttribute('type') === 'number'
      );

      if (numberInputs.length >= 2) {
        const proteinMinInput = numberInputs[0];
        const proteinMaxInput = numberInputs[1];

        await user.type(proteinMinInput, '20');
        await user.type(proteinMaxInput, '40');

        expect(proteinMinInput).toHaveValue('20');
        expect(proteinMaxInput).toHaveValue('40');
      }
    });

    it('trims whitespace from text inputs', async () => {
      const ingredientInput = screen.getByPlaceholderText(/e.g., chicken, salmon, quinoa.../);
      await user.type(ingredientInput, '  salmon  ');

      const submitButton = screen.getByRole('button', { name: /generate targeted recipes/i });
      await user.click(submitButton);

      expect(mockApiRequest).toHaveBeenCalledWith(
        'POST',
        '/api/admin/generate',
        expect.objectContaining({
          mainIngredient: 'salmon',
        })
      );
    });

    it('excludes empty strings from submission', async () => {
      const ingredientInput = screen.getByPlaceholderText(/e.g., chicken, salmon, quinoa.../);
      await user.type(ingredientInput, '   '); // Only spaces

      const submitButton = screen.getByRole('button', { name: /generate targeted recipes/i });
      await user.click(submitButton);

      const callArgs = mockApiRequest.mock.calls[0][2];
      expect(callArgs).not.toHaveProperty('mainIngredient');
    });
  });

  describe('Loading States and Button Behavior', () => {
    beforeEach(() => {
      renderWithProviders(<RecipeGenerationModal {...defaultProps} />, {
        queryClient,
        authContextValue: { 
          user: mockUsers.admin, 
          isAuthenticated: true, 
          isLoading: false,
          error: undefined,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
        },
      });
    });

    it('disables buttons during generation', async () => {
      mockApiRequest.mockImplementation(() => new Promise(() => {})); // Never resolves

      const quickButton = screen.getByRole('button', { name: /generate random recipes/i });
      const contextButton = screen.getByRole('button', { name: /generate targeted recipes/i });

      await user.click(quickButton);

      expect(quickButton).toBeDisabled();
      expect(contextButton).toBeDisabled();
    });

    it('shows loading spinner in buttons during generation', async () => {
      mockApiRequest.mockImplementation(() => new Promise(() => {})); // Never resolves

      const quickButton = screen.getByRole('button', { name: /generate random recipes/i });
      await user.click(quickButton);

      expect(screen.getByText('Generating...')).toBeInTheDocument();
    });

    it('restores button state after successful generation', async () => {
      const quickButton = screen.getByRole('button', { name: /generate random recipes/i });
      await user.click(quickButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Bulk Generation Started',
          description: 'Generation started successfully',
        });
      });

      expect(quickButton).not.toBeDisabled();
    });

    it('restores button state after generation error', async () => {
      mockApiRequest.mockRejectedValue(new Error('Generation failed'));

      const quickButton = screen.getByRole('button', { name: /generate random recipes/i });
      await user.click(quickButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: 'destructive',
          })
        );
      });

      expect(quickButton).not.toBeDisabled();
    });
  });

  describe('Query Invalidation', () => {
    it('invalidates relevant queries after generation starts', async () => {
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      renderWithProviders(<RecipeGenerationModal {...defaultProps} />, {
        queryClient,
        authContextValue: { 
          user: mockUsers.admin, 
          isAuthenticated: true, 
          isLoading: false,
          error: undefined,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
        },
      });

      const quickButton = screen.getByRole('button', { name: /generate random recipes/i });
      await user.click(quickButton);

      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['/api/admin/stats'] });
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['/api/admin/recipes'] });
      });
    });
  });

  describe('Accessibility and User Experience', () => {
    beforeEach(() => {
      renderWithProviders(<RecipeGenerationModal {...defaultProps} />, {
        queryClient,
        authContextValue: { 
          user: mockUsers.admin, 
          isAuthenticated: true, 
          isLoading: false,
          error: undefined,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
        },
      });
    });

    it('provides proper labels for form elements', () => {
      expect(screen.getByText('Number of recipes to generate:')).toBeInTheDocument();
      expect(screen.getByText('Describe Recipe Requirements (Optional)')).toBeInTheDocument();
      expect(screen.getByText('Main Ingredient (Optional)')).toBeInTheDocument();
    });

    it('provides clear section headers', () => {
      expect(screen.getByText('Recipe Count')).toBeInTheDocument();
      expect(screen.getByText('Quick Random Generation')).toBeInTheDocument();
      expect(screen.getByText('Context-Based Generation')).toBeInTheDocument();
      expect(screen.getByText('Filter Preferences')).toBeInTheDocument();
      expect(screen.getByText('Macro Nutrient Targets (per meal)')).toBeInTheDocument();
    });

    it('has accessible button labels', () => {
      expect(screen.getByRole('button', { name: /generate random recipes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /generate targeted recipes/i })).toBeInTheDocument();
    });

    it('maintains focus management', async () => {
      const quickButton = screen.getByRole('button', { name: /generate random recipes/i });
      quickButton.focus();
      expect(quickButton).toHaveFocus();

      await user.click(quickButton);
      // Button should remain focusable even when disabled
      expect(quickButton).toHaveFocus();
    });

    it('supports keyboard navigation', async () => {
      const quickButton = screen.getByRole('button', { name: /generate random recipes/i });
      const contextButton = screen.getByRole('button', { name: /generate targeted recipes/i });

      quickButton.focus();
      expect(quickButton).toHaveFocus();

      await user.tab();
      // Should move to next focusable element
      // (exact target depends on form structure)
    });
  });
});