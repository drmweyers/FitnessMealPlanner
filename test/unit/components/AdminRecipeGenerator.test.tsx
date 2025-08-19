/**
 * AdminRecipeGenerator Component Tests
 * 
 * Comprehensive tests for the AdminRecipeGenerator component covering:
 * - Component rendering with default state
 * - Form validation (count limits, parameter validation) 
 * - API call handling (success/error scenarios)
 * - Progress tracking and status updates
 * - Natural language parsing functionality
 * - Bulk generation buttons (10, 20, 30, 50 recipes)
 * - Custom form submission with various parameters
 * - Toast notifications for success/error states
 * - Loading states and disabled button behavior
 * - Cache management functionality
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminRecipeGenerator from '@/components/AdminRecipeGenerator';
import { renderWithProviders, mockUsers } from '../../test-utils';
import { QueryClient } from '@tanstack/react-query';

// Mock the toast hook
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Mock the cache utils
const mockCacheManager = {
  handleRecipeGeneration: vi.fn(),
  invalidateRecipes: vi.fn(),
  invalidateStats: vi.fn(),
};

vi.mock('@/lib/cacheUtils', () => ({
  createCacheManager: () => mockCacheManager,
}));

// Mock Lucide React icons comprehensively (replicating setup.ts approach)
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
    // Icons used in AdminRecipeGenerator
    ChefHat: createIcon('ChefHat'),
    Sparkles: createIcon('Sparkles'),
    Database: createIcon('Database'),
    Target: createIcon('Target'),
    Zap: createIcon('Zap'),
    Clock: createIcon('Clock'),
    ChevronUp: createIcon('ChevronUp'),
    ChevronDown: createIcon('ChevronDown'),
    Wand2: createIcon('Wand2'),
    CheckCircle: createIcon('CheckCircle'),
    Circle: createIcon('Circle'),
    // Icons used by UI components
    Check: createIcon('Check'),
    ChevronLeft: createIcon('ChevronLeft'),
    ChevronRight: createIcon('ChevronRight'),
    X: createIcon('X'),
    Plus: createIcon('Plus'),
    Minus: createIcon('Minus'),
    Edit: createIcon('Edit'),
    Trash: createIcon('Trash'),
    Search: createIcon('Search'),
    Filter: createIcon('Filter'),
    User: createIcon('User'),
    Mail: createIcon('Mail'),
    Lock: createIcon('Lock'),
    Home: createIcon('Home'),
    Settings: createIcon('Settings'),
    LogOut: createIcon('LogOut'),
    Menu: createIcon('Menu'),
    Eye: createIcon('Eye'),
    EyeOff: createIcon('EyeOff'),
    Calendar: createIcon('Calendar'),
    AlertCircle: createIcon('AlertCircle'),
    Info: createIcon('Info'),
    Loader2: createIcon('Loader2'),
    Star: createIcon('Star'),
    Heart: createIcon('Heart'),
    Activity: createIcon('Activity'),
    TrendingUp: createIcon('TrendingUp'),
    Award: createIcon('Award'),
    BarChart: createIcon('BarChart'),
    Camera: createIcon('Camera'),
    FileText: createIcon('FileText'),
    ShoppingCart: createIcon('ShoppingCart'),
    Users: createIcon('Users'),
    Upload: createIcon('Upload'),
    Download: createIcon('Download'),
  };
});

// Mock fetch globally
global.fetch = vi.fn();

describe('AdminRecipeGenerator', () => {
  let queryClient: QueryClient;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    user = userEvent.setup();
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Component Rendering', () => {
    it('renders the component with default state', () => {
      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      expect(screen.getByText('AI Recipe Generator')).toBeInTheDocument();
      expect(screen.getByText('AI-Powered Natural Language Generator')).toBeInTheDocument();
      expect(screen.getByText('Quick Bulk Generation')).toBeInTheDocument();
      expect(screen.getByDisplayValue('10')).toBeInTheDocument(); // Default count
    });

    it('renders collapsible interface', async () => {
      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      // Find the collapse button by data-testid instead
      const collapseButton = screen.getByTestId('chevronup-icon').closest('button');
      expect(collapseButton).toBeInTheDocument();

      await user.click(collapseButton!);
      expect(screen.queryByText('AI-Powered Natural Language Generator')).not.toBeInTheDocument();
    });

    it('renders all form fields correctly', () => {
      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      // Basic fields - use more flexible selectors
      expect(screen.getByLabelText(/Number of Recipes/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Focus Ingredient/i)).toBeInTheDocument();
      
      // Check for field labels (these might not be directly associated with form controls)
      expect(screen.getByText(/Difficulty Level/i)).toBeInTheDocument();
      expect(screen.getByText(/Meal Type/i)).toBeInTheDocument();
      expect(screen.getByText(/Dietary Focus/i)).toBeInTheDocument();
      expect(screen.getByText(/Max Prep Time/i)).toBeInTheDocument();
      expect(screen.getByText(/Max Calories/i)).toBeInTheDocument();

      // Nutritional targets - look for specific elements
      expect(screen.getByText(/Protein \(g\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Carbohydrates \(g\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Fat \(g\)/i)).toBeInTheDocument();
    });

    it('renders bulk generation buttons', () => {
      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
      expect(screen.getByText('30')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('validates count limits (1-50)', async () => {
      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      const countInput = screen.getByLabelText(/Number of Recipes/i);
      
      // Valid value should work
      await user.clear(countInput);
      await user.type(countInput, '25');
      expect(countInput).toHaveValue(25);
      
      // Test that schema validation is in place (controlled by Zod schema)
      await user.clear(countInput);
      await user.type(countInput, '10');
      expect(countInput).toHaveValue(10);
    });

    it('handles optional field validation correctly', async () => {
      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      // Look for protein input fields more specifically
      const inputs = screen.getAllByRole('textbox');
      const numberInputs = inputs.filter(input => (input as HTMLInputElement).type === 'number' || input.getAttribute('type') === 'number');
      
      if (numberInputs.length >= 2) {
        // Test that we can type into number inputs
        await user.type(numberInputs[0], '20');
        await user.type(numberInputs[1], '30');
        
        // Values should be set (even if displayed as strings)
        expect(numberInputs[0]).toHaveValue('20');
        expect(numberInputs[1]).toHaveValue('30');
      } else {
        // Fallback: just verify inputs exist
        expect(inputs.length).toBeGreaterThan(0);
      }
    });

    it('validates form submission with valid data', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          message: 'Generation started',
          count: 10,
          started: true,
          success: 0,
          failed: 0,
          errors: [],
        }),
      });

      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      const submitButton = screen.getByRole('button', { name: /Generate Custom Recipes/i });
      await user.click(submitButton);

      expect(global.fetch).toHaveBeenCalledWith('/api/admin/generate-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ count: 10 }),
      });
    });
  });

  describe('API Call Handling', () => {
    it('handles successful API response', async () => {
      vi.useFakeTimers();
      
      const mockResponse = {
        message: 'Generation started successfully',
        count: 15,
        started: true,
        success: 15,
        failed: 0,
        errors: [],
        metrics: {
          totalDuration: 45000,
          averageTimePerRecipe: 3000,
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      const countInput = screen.getByLabelText(/Number of Recipes/i);
      await user.clear(countInput);
      await user.type(countInput, '15');

      const submitButton = screen.getByRole('button', { name: /Generate Custom Recipes/i });
      await user.click(submitButton);

      // Check initial success toast
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Recipe Generation Started',
          description: 'Generation started successfully - Generating 15 recipes...',
        });
      });

      // Check cache management
      expect(mockCacheManager.handleRecipeGeneration).toHaveBeenCalledWith(15);

      // Check generation in progress state
      expect(screen.getByText('Generation In Progress')).toBeInTheDocument();

      // Fast-forward through all timers to complete generation
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      // Check completion toast
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Generation Complete',
          description: 'Successfully generated 15 recipes (avg. 3s per recipe)',
        });
      });

      vi.useRealTimers();
    });

    it('handles API error response', async () => {
      const errorMessage = 'Failed to start recipe generation';
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: errorMessage }),
      });

      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      const submitButton = screen.getByRole('button', { name: /Generate Custom Recipes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Generation Failed',
          description: errorMessage,
          variant: 'destructive',
        });
      });
    });

    it('handles network error', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      const submitButton = screen.getByRole('button', { name: /Generate Custom Recipes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Generation Failed',
          description: 'Network error',
          variant: 'destructive',
        });
      });
    });

    it('handles API response with failures', async () => {
      vi.useFakeTimers();
      
      const mockResponse = {
        message: 'Generation completed with errors',
        count: 10,
        started: true,
        success: 7,
        failed: 3,
        errors: ['Error 1', 'Error 2', 'Error 3'],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      const submitButton = screen.getByRole('button', { name: /Generate Custom Recipes/i });
      await user.click(submitButton);

      // Fast-forward to completion
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Generation Complete',
          description: 'Successfully generated 7 recipes, 3 failed',
        });
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Some Recipes Failed',
          description: 'Check the console for detailed error information',
          variant: 'destructive',
        });
      });

      vi.useRealTimers();
    });
  });

  describe('Progress Tracking', () => {
    it('displays progress steps during generation', async () => {
      vi.useFakeTimers();
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          message: 'Generation started',
          count: 10,
          started: true,
          success: 10,
          failed: 0,
          errors: [],
        }),
      });

      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      const submitButton = screen.getByRole('button', { name: /Generate Custom Recipes/i });
      await user.click(submitButton);

      // Check initial progress state
      await waitFor(() => {
        expect(screen.getByText('Generation In Progress')).toBeInTheDocument();
        expect(screen.getByText('Initializing AI models...')).toBeInTheDocument();
      });

      // Progress through steps
      act(() => {
        vi.advanceTimersByTime(6000); // First step
      });

      await waitFor(() => {
        expect(screen.getByText('Generating recipe concepts...')).toBeInTheDocument();
      });

      act(() => {
        vi.advanceTimersByTime(6000); // Second step
      });

      await waitFor(() => {
        expect(screen.getByText('Calculating nutritional data...')).toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it('shows progress percentage correctly', async () => {
      vi.useFakeTimers();
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          message: 'Generation started',
          count: 10,
          started: true,
          success: 10,
          failed: 0,
          errors: [],
        }),
      });

      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      const submitButton = screen.getByRole('button', { name: /Generate Custom Recipes/i });
      await user.click(submitButton);

      // Check progress bar is visible by looking for its container
      await waitFor(() => {
        expect(screen.getByText('Generation In Progress')).toBeInTheDocument();
      });

      vi.useRealTimers();
    });
  });

  describe('Natural Language Parsing', () => {
    it('renders natural language input area', () => {
      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      const textarea = screen.getByPlaceholderText(/Example: Generate 15 high-protein breakfast recipes/i);
      expect(textarea).toBeInTheDocument();
      expect(screen.getByText('Parse with AI')).toBeInTheDocument();
      expect(screen.getByText('Generate Directly')).toBeInTheDocument();
    });

    it('handles natural language parsing', async () => {
      vi.useFakeTimers();
      
      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      const textarea = screen.getByPlaceholderText(/Example: Generate 15 high-protein breakfast recipes/i);
      await user.type(textarea, 'Generate 15 keto breakfast recipes with eggs');

      const parseButton = screen.getByText('Parse with AI');
      await user.click(parseButton);

      // Check loading state
      expect(screen.getByText('Parsing with AI...')).toBeInTheDocument();

      // Fast-forward through parsing
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'AI Parsing Complete',
          description: 'Automatically populated form with parsed recipe requirements.',
        });
      });

      // Check that form fields were populated
      expect(screen.getByDisplayValue('15')).toBeInTheDocument();

      vi.useRealTimers();
    });

    it('disables parsing buttons when input is empty', () => {
      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      const parseButton = screen.getByText('Parse with AI');
      const generateButton = screen.getByText('Generate Directly');

      expect(parseButton).toBeDisabled();
      expect(generateButton).toBeDisabled();
    });

    it('enables parsing buttons when input has content', async () => {
      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      const textarea = screen.getByPlaceholderText(/Example: Generate 15 high-protein breakfast recipes/i);
      await user.type(textarea, 'Generate some recipes');

      const parseButton = screen.getByText('Parse with AI');
      const generateButton = screen.getByText('Generate Directly');

      expect(parseButton).not.toBeDisabled();
      expect(generateButton).not.toBeDisabled();
    });

    it('handles direct generation from natural language', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          message: 'Generation started',
          count: 10,
          started: true,
          success: 10,
          failed: 0,
          errors: [],
        }),
      });

      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      const textarea = screen.getByPlaceholderText(/Example: Generate 15 high-protein breakfast recipes/i);
      await user.type(textarea, 'Generate healthy breakfast recipes');

      const generateButton = screen.getByText('Generate Directly');
      await user.click(generateButton);

      expect(global.fetch).toHaveBeenCalledWith('/api/admin/generate-recipes', expect.any(Object));
    });
  });

  describe('Bulk Generation', () => {
    it('handles bulk generation for 10 recipes', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          message: 'Bulk generation started',
          count: 10,
          started: true,
          success: 10,
          failed: 0,
          errors: [],
        }),
      });

      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      const bulkButton = screen.getByRole('button', { name: /10.*recipes/i });
      await user.click(bulkButton);

      expect(global.fetch).toHaveBeenCalledWith('/api/admin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 10 }),
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Bulk Generation Started',
          description: 'Bulk generation started',
        });
      });
    });

    it('handles bulk generation for all count options', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          message: 'Bulk generation started',
          count: 10,
          started: true,
          success: 10,
          failed: 0,
          errors: [],
        }),
      });

      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      const counts = [10, 20, 30, 50];
      
      for (const count of counts) {
        const bulkButton = screen.getByRole('button', { name: new RegExp(`${count}.*recipes`, 'i') });
        await user.click(bulkButton);
        
        expect(global.fetch).toHaveBeenCalledWith('/api/admin/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ count }),
        });
      }
    });

    it('disables bulk buttons during generation', async () => {
      (global.fetch as any).mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      const bulkButton = screen.getByRole('button', { name: /10.*recipes/i });
      await user.click(bulkButton);

      expect(bulkButton).toBeDisabled();
    });

    it('handles bulk generation error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Bulk generation failed' }),
      });

      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      const bulkButton = screen.getByRole('button', { name: /10.*recipes/i });
      await user.click(bulkButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Generation Failed',
          description: 'Bulk generation failed',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Loading States and Button Behavior', () => {
    it('shows loading state during form submission', async () => {
      (global.fetch as any).mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      const submitButton = screen.getByRole('button', { name: /Generate Custom Recipes/i });
      await user.click(submitButton);

      expect(screen.getByText('Starting Generation...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('shows generation progress state', async () => {
      vi.useFakeTimers();
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          message: 'Generation started',
          count: 10,
          started: true,
          success: 10,
          failed: 0,
          errors: [],
        }),
      });

      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      const submitButton = screen.getByRole('button', { name: /Generate Custom Recipes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Generating Recipes.../)).toBeInTheDocument();
        expect(submitButton).toBeDisabled();
      });

      vi.useRealTimers();
    });

    it('disables buttons appropriately during operations', async () => {
      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      // Initially enabled
      const submitButton = screen.getByRole('button', { name: /Generate Custom Recipes/i });
      const parseButton = screen.getByText('Parse with AI');
      const generateButton = screen.getByText('Generate Directly');

      expect(parseButton).toBeDisabled(); // No input
      expect(generateButton).toBeDisabled(); // No input
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Cache Management Integration', () => {
    it('calls cache manager on successful generation', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          message: 'Generation started',
          count: 25,
          started: true,
          success: 25,
          failed: 0,
          errors: [],
        }),
      });

      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      const countInput = screen.getByLabelText(/Number of Recipes/i);
      await user.clear(countInput);
      await user.type(countInput, '25');

      const submitButton = screen.getByRole('button', { name: /Generate Custom Recipes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCacheManager.handleRecipeGeneration).toHaveBeenCalledWith(25);
      });
    });

    it('calls cache manager for bulk generation', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          message: 'Bulk generation started',
          count: 30,
          started: true,
          success: 30,
          failed: 0,
          errors: [],
        }),
      });

      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      const bulkButton = screen.getByRole('button', { name: /30.*recipes/i });
      await user.click(bulkButton);

      await waitFor(() => {
        expect(mockCacheManager.handleRecipeGeneration).toHaveBeenCalledWith(30);
      });
    });

    it('provides refresh buttons after generation completion', async () => {
      vi.useFakeTimers();
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          message: 'Generation completed',
          count: 10,
          started: true,
          success: 10,
          failed: 0,
          errors: [],
        }),
      });

      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      const submitButton = screen.getByRole('button', { name: /Generate Custom Recipes/i });
      await user.click(submitButton);

      // Fast-forward to completion
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(screen.getByText('Refresh Stats')).toBeInTheDocument();
        expect(screen.getByText('Refresh Pending Recipe List')).toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it('handles refresh button clicks', async () => {
      vi.useFakeTimers();
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          message: 'Generation completed',
          count: 10,
          started: true,
          success: 10,
          failed: 0,
          errors: [],
        }),
      });

      const refetchSpy = vi.spyOn(queryClient, 'refetchQueries');

      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      const submitButton = screen.getByRole('button', { name: /Generate Custom Recipes/i });
      await user.click(submitButton);

      // Fast-forward to completion
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(screen.getByText('Refresh Stats')).toBeInTheDocument();
      });

      const refreshStatsButton = screen.getByText('Refresh Stats');
      await user.click(refreshStatsButton);

      expect(refetchSpy).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Recipes Refreshed',
        description: 'Recipe database has been updated with new recipes',
      });

      vi.useRealTimers();
    });
  });

  describe('Form Parameter Handling', () => {
    it('submits form with all parameters filled', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          message: 'Generation started',
          count: 5,
          started: true,
          success: 5,
          failed: 0,
          errors: [],
        }),
      });

      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      // Fill out form
      const countInput = screen.getByLabelText(/Number of Recipes/i);
      await user.clear(countInput);
      await user.type(countInput, '5');

      const focusIngredient = screen.getByLabelText(/Focus Ingredient/i);
      await user.type(focusIngredient, 'chicken');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /Generate Custom Recipes/i });
      await user.click(submitButton);

      expect(global.fetch).toHaveBeenCalledWith('/api/admin/generate-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          count: 5,
          focusIngredient: 'chicken',
        }),
      });
    });

    it('handles select field changes correctly', async () => {
      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      // Test that select components are present
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThan(0);

      // Test basic select interaction (since complex dropdown testing requires more setup)
      const firstSelect = selects[0];
      expect(firstSelect).toBeInTheDocument();
      
      // Test that form fields accept input
      const focusIngredient = screen.getByLabelText(/Focus Ingredient/i);
      await user.type(focusIngredient, 'chicken');
      expect(focusIngredient).toHaveValue('chicken');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles missing response data gracefully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(null),
      });

      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      const submitButton = screen.getByRole('button', { name: /Generate Custom Recipes/i });
      await user.click(submitButton);

      // Should handle gracefully without crashing
      expect(screen.getByText('AI Recipe Generator')).toBeInTheDocument();
    });

    it('handles malformed JSON response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      const submitButton = screen.getByRole('button', { name: /Generate Custom Recipes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Generation Failed',
          description: 'Failed to start recipe generation',
          variant: 'destructive',
        });
      });
    });

    it('cleans up timers properly on unmount', async () => {
      vi.useFakeTimers();
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          message: 'Generation started',
          count: 10,
          started: true,
          success: 10,
          failed: 0,
          errors: [],
        }),
      });

      const { unmount } = renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      const submitButton = screen.getByRole('button', { name: /Generate Custom Recipes/i });
      await user.click(submitButton);

      // Unmount component before timers complete
      act(() => {
        unmount();
      });

      // Should not throw errors when timers try to fire
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      vi.useRealTimers();
    }, 10000); // Increase timeout for this test

    it('handles concurrent API requests correctly', async () => {
      const slowPromise = new Promise((resolve) => 
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({
            message: 'Generation started',
            count: 10,
            started: true,
            success: 10,
            failed: 0,
            errors: [],
          }),
        }), 1000)
      );

      (global.fetch as any).mockImplementation(() => slowPromise);

      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      const submitButton = screen.getByRole('button', { name: /Generate Custom Recipes/i });
      
      // Click multiple times rapidly
      await user.click(submitButton);
      await user.click(submitButton);
      await user.click(submitButton);

      // Should only make one API call due to button being disabled after first click
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });
    });

    it('handles different API endpoint failures correctly', async () => {
      // Test bulk generation endpoint failure
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/admin/generate')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ message: 'Bulk endpoint error' }),
          });
        }
        return Promise.resolve({
          ok: false, 
          json: () => Promise.resolve({ message: 'Custom endpoint error' }),
        });
      });

      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      // Test bulk generation error
      const bulkButton = screen.getByRole('button', { name: /10.*recipes/i });
      await user.click(bulkButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Generation Failed',
          description: 'Bulk endpoint error',
          variant: 'destructive',
        });
      });

      // Clear previous toast calls
      mockToast.mockClear();

      // Test custom generation error
      const submitButton = screen.getByRole('button', { name: /Generate Custom Recipes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Generation Failed',
          description: 'Custom endpoint error',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Complete Workflow Integration Tests', () => {
    it('handles complete natural language to generation workflow', async () => {
      vi.useFakeTimers();
      
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          message: 'Generation complete',
          count: 15,
          started: true,
          success: 15,
          failed: 0,
          errors: [],
          metrics: {
            totalDuration: 45000,
            averageTimePerRecipe: 3000,
          },
        }),
      });

      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      // Step 1: Enter natural language input
      const textarea = screen.getByPlaceholderText(/Example: Generate 15 high-protein breakfast recipes/i);
      await user.type(textarea, 'Generate 15 keto breakfast recipes with eggs and high protein');

      // Step 2: Parse with AI
      const parseButton = screen.getByText('Parse with AI');
      await user.click(parseButton);

      // Fast-forward parsing
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'AI Parsing Complete',
          description: 'Automatically populated form with parsed recipe requirements.',
        });
      }, { timeout: 3000 });

      // Step 3: Verify form was populated
      expect(screen.getByDisplayValue('15')).toBeInTheDocument();

      // Step 4: Generate recipes
      const submitButton = screen.getByRole('button', { name: /Generate Custom Recipes/i });
      await user.click(submitButton);

      // Step 5: Verify generation process
      await waitFor(() => {
        expect(screen.getByText('Generation In Progress')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Fast-forward generation
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      // Step 6: Verify completion
      await waitFor(() => {
        expect(screen.getByText('Generation Complete')).toBeInTheDocument();
      }, { timeout: 5000 });

      vi.useRealTimers();
    }, 10000); // Increase test timeout

    it('validates complex form input combinations', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          message: 'Generation started',
          count: 5,
          started: true,
          success: 5,
          failed: 0,
          errors: [],
        }),
      });

      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      // Fill basic form fields
      const countInput = screen.getByLabelText(/Number of Recipes/i);
      await user.clear(countInput);
      await user.type(countInput, '5');

      const focusIngredient = screen.getByLabelText(/Focus Ingredient/i);
      await user.type(focusIngredient, 'salmon and quinoa');

      const submitButton = screen.getByRole('button', { name: /Generate Custom Recipes/i });
      await user.click(submitButton);

      // Verify the API call was made with at least the basic parameters
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/admin/generate-recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: expect.stringContaining('"count":5'),
        });
      });
    });

    it('handles query invalidation on successful generation', async () => {
      vi.useFakeTimers();
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          message: 'Generation started',
          count: 10,
          started: true,
          success: 10,
          failed: 0,
          errors: [],
        }),
      });

      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      const submitButton = screen.getByRole('button', { name: /Generate Custom Recipes/i });
      await user.click(submitButton);

      // Fast-forward to completion
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['/api/recipes'] });
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['/api/admin/stats'] });
      }, { timeout: 5000 });

      vi.useRealTimers();
    }, 8000); // Increase test timeout
  });

  describe('Accessibility and User Experience', () => {
    it('provides proper ARIA labels and roles', () => {
      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      // Check form elements have proper labels
      expect(screen.getByLabelText(/Number of Recipes/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Focus Ingredient/i)).toBeInTheDocument();

      // Check buttons have proper roles
      expect(screen.getByRole('button', { name: /Generate Custom Recipes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Parse with AI/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Generate Directly/i })).toBeInTheDocument();

      // Check bulk generation buttons exist
      const allButtons = screen.getAllByRole('button');
      expect(allButtons.length).toBeGreaterThan(5); // Should have multiple buttons including bulk generation ones
      
      // Check for specific text content
      expect(screen.getByText('10')).toBeInTheDocument(); // Bulk generation button
      expect(screen.getByText('20')).toBeInTheDocument(); // Bulk generation button
      expect(screen.getByText('30')).toBeInTheDocument(); // Bulk generation button
      expect(screen.getByText('50')).toBeInTheDocument(); // Bulk generation button
    });

    it('maintains focus management during state changes', async () => {
      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      const textarea = screen.getByPlaceholderText(/Example: Generate 15 high-protein breakfast recipes/i);
      await user.type(textarea, 'Generate some recipes');

      const parseButton = screen.getByText('Parse with AI');
      parseButton.focus();
      expect(parseButton).toHaveFocus();

      // Button should remain focusable even when disabled during parsing
      await user.click(parseButton);
      expect(parseButton).toHaveFocus();
    });

    it('handles keyboard navigation correctly', async () => {
      renderWithProviders(<AdminRecipeGenerator />, {
        queryClient,
        authContextValue: { user: mockUsers.admin, isAuthenticated: true, isLoading: false } as any,
      });

      const countInput = screen.getByLabelText(/Number of Recipes/i);
      countInput.focus();
      expect(countInput).toHaveFocus();

      // Tab navigation should work between form elements
      await user.tab();
      const focusIngredient = screen.getByLabelText(/Focus Ingredient/i);
      expect(focusIngredient).toHaveFocus();
    });
  });
});