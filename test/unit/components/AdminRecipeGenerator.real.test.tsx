/**
 * AdminRecipeGenerator - Real Component Unit Tests
 *
 * This test file tests the ACTUAL AdminRecipeGenerator component
 * (unlike AdminRecipeGenerator.comprehensive.test.tsx which tests a mock)
 *
 * Tests include:
 * - Real TanStack Query mutations
 * - Real React Hook Form integration
 * - Real toast notifications
 * - Real cache invalidation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { userEvent } from '@testing-library/user-event';
import AdminRecipeGenerator from '../../../client/src/components/AdminRecipeGenerator';
import { Toaster } from '../../../client/src/components/ui/toaster';

// Mock fetch globally
global.fetch = vi.fn();

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0
    },
    mutations: { retry: false }
  },
  logger: {
    log: console.log,
    warn: console.warn,
    error: () => {}, // Suppress error logs in tests
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        {component}
        <Toaster />
      </QueryClientProvider>
    ),
    queryClient
  };
};

describe('AdminRecipeGenerator - Real Component Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should render all main sections', () => {
      renderWithProviders(<AdminRecipeGenerator />);

      expect(screen.getByText(/AI Recipe Generator/i)).toBeInTheDocument();
      expect(screen.getByText(/AI-Powered Natural Language Generator/i)).toBeInTheDocument();
      expect(screen.getByText(/Quick Bulk Generation/i)).toBeInTheDocument();
    });

    it('should render natural language textarea', () => {
      renderWithProviders(<AdminRecipeGenerator />);

      const textarea = screen.getByPlaceholderText(/Example: Generate 15 high-protein/i);
      expect(textarea).toBeInTheDocument();
    });

    it('should render form fields with correct defaults', () => {
      renderWithProviders(<AdminRecipeGenerator />);

      const countInput = screen.getByLabelText(/Number of Recipes/i);
      expect(countInput).toHaveValue(10);
    });

    it('should render all bulk generation buttons', () => {
      renderWithProviders(<AdminRecipeGenerator />);

      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
      expect(screen.getByText('30')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
    });

    it('should render collapse/expand button', () => {
      renderWithProviders(<AdminRecipeGenerator />);

      // Look for the collapse button (ChevronUp icon button)
      const collapseButton = screen.getAllByRole('button').find(button =>
        button.className.includes('ghost') && button.className.includes('h-8 w-8')
      );
      expect(collapseButton).toBeInTheDocument();
    });
  });

  describe('Natural Language Interface', () => {
    it('should update textarea when user types', async () => {
      renderWithProviders(<AdminRecipeGenerator />);

      const textarea = screen.getByPlaceholderText(/Example: Generate 15 high-protein/i);
      await user.type(textarea, 'Generate keto breakfast recipes');

      expect(textarea).toHaveValue('Generate keto breakfast recipes');
    });

    it('should disable Parse button when textarea is empty', () => {
      renderWithProviders(<AdminRecipeGenerator />);

      const parseButton = screen.getByText('Parse with AI');
      expect(parseButton).toBeDisabled();
    });

    it('should enable Parse button when textarea has content', async () => {
      renderWithProviders(<AdminRecipeGenerator />);

      const textarea = screen.getByPlaceholderText(/Example: Generate 15 high-protein/i);
      await user.type(textarea, 'Generate some recipes');

      const parseButton = screen.getByText('Parse with AI');
      expect(parseButton).not.toBeDisabled();
    });

    it('should show loading state when parsing with AI', async () => {
      renderWithProviders(<AdminRecipeGenerator />);

      const textarea = screen.getByPlaceholderText(/Example: Generate 15 high-protein/i);
      await user.type(textarea, 'Generate keto recipes');

      const parseButton = screen.getByText('Parse with AI');
      await user.click(parseButton);

      // Check for loading text
      await waitFor(() => {
        expect(screen.getByText(/Parsing with AI/i)).toBeInTheDocument();
      });
    });

    it('should populate form fields after AI parsing completes', async () => {
      renderWithProviders(<AdminRecipeGenerator />);

      const textarea = screen.getByPlaceholderText(/Example: Generate 15 high-protein/i);
      await user.type(textarea, 'Generate 15 keto breakfast recipes');

      const parseButton = screen.getByText('Parse with AI');
      await user.click(parseButton);

      // Wait for parsing to complete (2 second timeout in component)
      await waitFor(() => {
        const countInput = screen.getByLabelText(/Number of Recipes/i);
        expect(countInput).toHaveValue(15);
      }, { timeout: 3000 });
    });

    it('should disable Generate Directly button when textarea is empty', () => {
      renderWithProviders(<AdminRecipeGenerator />);

      const generateButton = screen.getByText('Generate Directly');
      expect(generateButton).toBeDisabled();
    });

    it('should enable Generate Directly button when textarea has content', async () => {
      renderWithProviders(<AdminRecipeGenerator />);

      const textarea = screen.getByPlaceholderText(/Example: Generate 15 high-protein/i);
      await user.type(textarea, 'Generate recipes');

      const generateButton = screen.getByText('Generate Directly');
      expect(generateButton).not.toBeDisabled();
    });
  });

  describe('Manual Form Configuration', () => {
    it('should update recipe count via input', async () => {
      renderWithProviders(<AdminRecipeGenerator />);

      const countInput = screen.getByLabelText(/Number of Recipes/i);
      await user.clear(countInput);
      await user.type(countInput, '25');

      expect(countInput).toHaveValue(25);
    });

    it('should update focus ingredient input', async () => {
      renderWithProviders(<AdminRecipeGenerator />);

      const focusInput = screen.getByPlaceholderText(/e.g., chicken, salmon, quinoa/i);
      await user.type(focusInput, 'chicken breast');

      expect(focusInput).toHaveValue('chicken breast');
    });

    it('should select difficulty level', async () => {
      renderWithProviders(<AdminRecipeGenerator />);

      const difficultySelect = screen.getByRole('combobox', { name: /Difficulty Level/i });
      await user.click(difficultySelect);

      await waitFor(() => {
        const beginnerOption = screen.getByText('Beginner');
        expect(beginnerOption).toBeInTheDocument();
      });
    });

    it('should select meal type', async () => {
      renderWithProviders(<AdminRecipeGenerator />);

      const mealTypeSelect = screen.getByRole('combobox', { name: /Meal Type/i });
      await user.click(mealTypeSelect);

      await waitFor(() => {
        const breakfastOption = screen.getByText('Breakfast');
        expect(breakfastOption).toBeInTheDocument();
      });
    });

    it('should update protein range inputs', async () => {
      renderWithProviders(<AdminRecipeGenerator />);

      const proteinMinInput = screen.getByLabelText(/Min/i, { selector: 'input[type="number"]' });
      await user.clear(proteinMinInput);
      await user.type(proteinMinInput, '25');

      expect(proteinMinInput).toHaveValue(25);
    });

    it('should handle macro nutrient inputs for all macros', async () => {
      renderWithProviders(<AdminRecipeGenerator />);

      // Get all number inputs (will include count, macros, etc.)
      const numberInputs = screen.getAllByRole('spinbutton');

      // Find protein min/max (they should be among the number inputs)
      const proteinInputs = numberInputs.filter(input =>
        input.getAttribute('placeholder') === '0' || input.getAttribute('placeholder') === '∞'
      );

      expect(proteinInputs.length).toBeGreaterThan(0);
    });
  });

  describe('Custom Recipe Generation', () => {
    it('should submit form and start generation', async () => {
      const mockResponse = {
        message: 'Generation started for 10 recipes',
        count: 10,
        started: true,
        success: 0,
        failed: 0,
        errors: [],
        metrics: {
          totalDuration: 30000,
          averageTimePerRecipe: 3000
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      renderWithProviders(<AdminRecipeGenerator />);

      const generateButton = screen.getByText('Generate Custom Recipes');
      await user.click(generateButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/admin/generate-recipes',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: expect.stringContaining('"count":10')
          })
        );
      });
    });

    it('should show loading state during generation', async () => {
      (global.fetch as any).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ message: 'Started', count: 10, started: true, success: 0, failed: 0, errors: [] })
        }), 100))
      );

      renderWithProviders(<AdminRecipeGenerator />);

      const generateButton = screen.getByText('Generate Custom Recipes');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/Starting Generation/i)).toBeInTheDocument();
      });
    });

    it('should show progress steps during generation', async () => {
      const mockResponse = {
        message: 'Generation started',
        count: 10,
        started: true,
        success: 10,
        failed: 0,
        errors: []
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      renderWithProviders(<AdminRecipeGenerator />);

      const generateButton = screen.getByText('Generate Custom Recipes');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/Generation In Progress/i)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Check for status steps
      await waitFor(() => {
        expect(screen.getByText(/Initializing AI models/i)).toBeInTheDocument();
        expect(screen.getByText(/Generating recipe concepts/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should show generation complete status', async () => {
      const mockResponse = {
        message: 'Generation started',
        count: 10,
        started: true,
        success: 10,
        failed: 0,
        errors: [],
        metrics: {
          totalDuration: 30000,
          averageTimePerRecipe: 3000
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      renderWithProviders(<AdminRecipeGenerator />);

      const generateButton = screen.getByText('Generate Custom Recipes');
      await user.click(generateButton);

      // Wait for 30 seconds timeout in component
      await waitFor(() => {
        expect(screen.getByText(/Generation Complete/i)).toBeInTheDocument();
      }, { timeout: 32000 });
    });

    it('should handle generation errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'API rate limit exceeded' })
      });

      renderWithProviders(<AdminRecipeGenerator />);

      const generateButton = screen.getByText('Generate Custom Recipes');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/API rate limit exceeded/i)).toBeInTheDocument();
      });
    });

    it('should disable form during generation', async () => {
      const mockResponse = {
        message: 'Generation started',
        count: 10,
        started: true,
        success: 0,
        failed: 0,
        errors: []
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      renderWithProviders(<AdminRecipeGenerator />);

      const generateButton = screen.getByText('Generate Custom Recipes');
      await user.click(generateButton);

      await waitFor(() => {
        expect(generateButton).toBeDisabled();
      });
    });
  });

  describe('Bulk Generation', () => {
    it('should trigger bulk generation for 10 recipes', async () => {
      const mockResponse = {
        message: 'Bulk generation started for 10 recipes',
        count: 10,
        started: true,
        success: 0,
        failed: 0,
        errors: []
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      renderWithProviders(<AdminRecipeGenerator />);

      // Find the "10" button specifically within the bulk generation section
      const bulk10Button = screen.getAllByText('10')[0]; // First instance is the bulk button
      await user.click(bulk10Button);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/admin/generate',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ count: 10 })
          })
        );
      });
    });

    for (const count of [10, 20, 30, 50]) {
      it(`should trigger bulk generation for ${count} recipes`, async () => {
        const mockResponse = {
          message: `Bulk generation started for ${count} recipes`,
          count,
          started: true,
          success: 0,
          failed: 0,
          errors: []
        };

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse
        });

        renderWithProviders(<AdminRecipeGenerator />);

        const bulkButton = screen.getAllByText(count.toString())[0];
        await user.click(bulkButton);

        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith(
            '/api/admin/generate',
            expect.objectContaining({
              body: JSON.stringify({ count })
            })
          );
        });
      });
    }

    it('should disable bulk buttons during generation', async () => {
      (global.fetch as any).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ message: 'Started', count: 10, started: true, success: 0, failed: 0, errors: [] })
        }), 100))
      );

      renderWithProviders(<AdminRecipeGenerator />);

      const bulk10Button = screen.getAllByText('10')[0];
      await user.click(bulk10Button);

      await waitFor(() => {
        const bulk20Button = screen.getAllByText('20')[0];
        expect(bulk20Button).toBeDisabled();
      });
    });
  });

  describe('Collapse/Expand Functionality', () => {
    it('should collapse content when collapse button clicked', async () => {
      renderWithProviders(<AdminRecipeGenerator />);

      // Form should be visible initially
      const countInput = screen.getByLabelText(/Number of Recipes/i);
      expect(countInput).toBeInTheDocument();

      // Find and click collapse button
      const collapseButton = screen.getAllByRole('button').find(button =>
        button.className.includes('ghost') && button.className.includes('h-8 w-8')
      );
      await user.click(collapseButton!);

      // Wait for collapse animation
      await waitFor(() => {
        expect(screen.queryByLabelText(/Number of Recipes/i)).not.toBeInTheDocument();
      });
    });

    it('should expand content when expand button clicked', async () => {
      renderWithProviders(<AdminRecipeGenerator />);

      // Collapse first
      const collapseButton = screen.getAllByRole('button').find(button =>
        button.className.includes('ghost') && button.className.includes('h-8 w-8')
      );
      await user.click(collapseButton!);

      await waitFor(() => {
        expect(screen.queryByLabelText(/Number of Recipes/i)).not.toBeInTheDocument();
      });

      // Then expand
      await user.click(collapseButton!);

      await waitFor(() => {
        expect(screen.getByLabelText(/Number of Recipes/i)).toBeInTheDocument();
      });
    });

    it('should hide Quick Bulk Generation when collapsed', async () => {
      renderWithProviders(<AdminRecipeGenerator />);

      expect(screen.getByText(/Quick Bulk Generation/i)).toBeInTheDocument();

      const collapseButton = screen.getAllByRole('button').find(button =>
        button.className.includes('ghost') && button.className.includes('h-8 w-8')
      );
      await user.click(collapseButton!);

      await waitFor(() => {
        expect(screen.queryByText(/Quick Bulk Generation/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate queries after successful generation', async () => {
      const mockResponse = {
        message: 'Generation complete',
        count: 10,
        started: true,
        success: 10,
        failed: 0,
        errors: [],
        metrics: { totalDuration: 30000, averageTimePerRecipe: 3000 }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const { queryClient } = renderWithProviders(<AdminRecipeGenerator />);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const generateButton = screen.getByText('Generate Custom Recipes');
      await user.click(generateButton);

      // Wait for 30s timeout to complete
      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['/api/recipes'] });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['/api/admin/stats'] });
      }, { timeout: 32000 });
    });

    it('should refresh stats when Refresh Stats button clicked', async () => {
      const mockResponse = {
        message: 'Generation complete',
        count: 10,
        started: true,
        success: 10,
        failed: 0,
        errors: []
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const { queryClient } = renderWithProviders(<AdminRecipeGenerator />);
      const refetchSpy = vi.spyOn(queryClient, 'refetchQueries');

      const generateButton = screen.getByText('Generate Custom Recipes');
      await user.click(generateButton);

      // Wait for generation to complete
      await waitFor(() => {
        expect(screen.getByText(/Generation Complete/i)).toBeInTheDocument();
      }, { timeout: 32000 });

      // Click Refresh Stats button
      const refreshStatsButton = screen.getByText('Refresh Stats');
      await user.click(refreshStatsButton);

      expect(refetchSpy).toHaveBeenCalled();
    });

    it('should refresh pending recipes when Refresh Pending button clicked', async () => {
      const mockResponse = {
        message: 'Generation complete',
        count: 10,
        started: true,
        success: 10,
        failed: 0,
        errors: []
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const { queryClient } = renderWithProviders(<AdminRecipeGenerator />);
      const refetchSpy = vi.spyOn(queryClient, 'refetchQueries');

      const generateButton = screen.getByText('Generate Custom Recipes');
      await user.click(generateButton);

      // Wait for generation to complete
      await waitFor(() => {
        expect(screen.getByText(/Generation Complete/i)).toBeInTheDocument();
      }, { timeout: 32000 });

      // Click Refresh Pending Recipe List button
      const refreshPendingButton = screen.getByText('Refresh Pending Recipe List');
      await user.click(refreshPendingButton);

      expect(refetchSpy).toHaveBeenCalled();
    });
  });

  describe('Toast Notifications', () => {
    it('should show success toast on generation start', async () => {
      const mockResponse = {
        message: 'Generation started for 10 recipes',
        count: 10,
        started: true,
        success: 0,
        failed: 0,
        errors: []
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      renderWithProviders(<AdminRecipeGenerator />);

      const generateButton = screen.getByText('Generate Custom Recipes');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/Recipe Generation Started/i)).toBeInTheDocument();
      });
    });

    it('should show completion toast after generation finishes', async () => {
      const mockResponse = {
        message: 'Generation started',
        count: 10,
        started: true,
        success: 10,
        failed: 0,
        errors: [],
        metrics: { totalDuration: 30000, averageTimePerRecipe: 3000 }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      renderWithProviders(<AdminRecipeGenerator />);

      const generateButton = screen.getByText('Generate Custom Recipes');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/Successfully generated 10 recipes/i)).toBeInTheDocument();
      }, { timeout: 32000 });
    });

    it('should show error toast on generation failure', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Generation failed: API error' })
      });

      renderWithProviders(<AdminRecipeGenerator />);

      const generateButton = screen.getByText('Generate Custom Recipes');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/Generation Failed/i)).toBeInTheDocument();
      });
    });

    it('should show toast for AI parsing success', async () => {
      renderWithProviders(<AdminRecipeGenerator />);

      const textarea = screen.getByPlaceholderText(/Example: Generate 15 high-protein/i);
      await user.type(textarea, 'Generate keto recipes');

      const parseButton = screen.getByText('Parse with AI');
      await user.click(parseButton);

      await waitFor(() => {
        expect(screen.getByText(/AI Parsing Complete/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should show toast when refreshing stats', async () => {
      const mockResponse = {
        message: 'Generation complete',
        count: 10,
        started: true,
        success: 10,
        failed: 0,
        errors: []
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      renderWithProviders(<AdminRecipeGenerator />);

      const generateButton = screen.getByText('Generate Custom Recipes');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/Generation Complete/i)).toBeInTheDocument();
      }, { timeout: 32000 });

      const refreshStatsButton = screen.getByText('Refresh Stats');
      await user.click(refreshStatsButton);

      await waitFor(() => {
        expect(screen.getByText(/Recipes Refreshed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      renderWithProviders(<AdminRecipeGenerator />);

      const generateButton = screen.getByText('Generate Custom Recipes');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });
    });

    it('should show error for failed recipes', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockResponse = {
        message: 'Generation complete with errors',
        count: 10,
        started: true,
        success: 8,
        failed: 2,
        errors: ['Recipe 1 failed', 'Recipe 2 failed'],
        metrics: { totalDuration: 30000, averageTimePerRecipe: 3000 }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      renderWithProviders(<AdminRecipeGenerator />);

      const generateButton = screen.getByText('Generate Custom Recipes');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/Some Recipes Failed/i)).toBeInTheDocument();
      }, { timeout: 32000 });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Recipe generation errors:',
        expect.arrayContaining(['Recipe 1 failed', 'Recipe 2 failed'])
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Direct Natural Language Generation', () => {
    it('should validate input before direct generation', async () => {
      renderWithProviders(<AdminRecipeGenerator />);

      const generateDirectlyButton = screen.getByText('Generate Directly');

      // Try to click when disabled
      expect(generateDirectlyButton).toBeDisabled();
    });

    it('should make correct API call for direct generation', async () => {
      const mockResponse = {
        batchId: 'test-batch-123',
        parsedParameters: { count: 15 },
        generationOptions: {}
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      renderWithProviders(<AdminRecipeGenerator />);

      const textarea = screen.getByPlaceholderText(/Example: Generate 15 high-protein/i);
      await user.type(textarea, 'Generate 15 keto breakfast recipes');

      const generateDirectlyButton = screen.getByText('Generate Directly');
      await user.click(generateDirectlyButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/admin/generate-from-prompt',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ prompt: 'Generate 15 keto breakfast recipes' })
          })
        );
      });
    });

    it('should show appropriate toast on direct generation success', async () => {
      const mockResponse = {
        batchId: 'test-batch-123',
        parsedParameters: { count: 15 },
        generationOptions: {}
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      renderWithProviders(<AdminRecipeGenerator />);

      const textarea = screen.getByPlaceholderText(/Example: Generate 15 high-protein/i);
      await user.type(textarea, 'Generate recipes');

      const generateDirectlyButton = screen.getByText('Generate Directly');
      await user.click(generateDirectlyButton);

      await waitFor(() => {
        expect(screen.getByText(/Natural Language Generation Started/i)).toBeInTheDocument();
      });
    });
  });
});
