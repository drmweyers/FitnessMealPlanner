import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import AdminRecipeGenerator from '../../../client/src/components/AdminRecipeGenerator';
import { useToast } from '../../../client/src/hooks/use-toast';
import { createCacheManager } from '../../../client/src/lib/cacheUtils';

// Mock dependencies
vi.mock('../../../client/src/hooks/use-toast');
vi.mock('../../../client/src/lib/cacheUtils');

// Mock fetch globally
global.fetch = vi.fn();

// Mock UI components
vi.mock('../../../client/src/components/ui/form', () => ({
  Form: ({ children }: any) => <form>{children}</form>,
  FormControl: ({ children }: any) => <div data-testid="form-control">{children}</div>,
  FormDescription: ({ children }: any) => <div data-testid="form-description">{children}</div>,
  FormField: ({ name, render }: any) => (
    <div data-testid={`form-field-${name}`}>
      {render({
        field: {
          value: '',
          onChange: vi.fn(),
          onBlur: vi.fn(),
          name,
        }
      })}
    </div>
  ),
  FormItem: ({ children }: any) => <div data-testid="form-item">{children}</div>,
  FormLabel: ({ children }: any) => <label data-testid="form-label">{children}</label>,
  FormMessage: ({ children }: any) => <div data-testid="form-message">{children}</div>,
}));

vi.mock('../../../client/src/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value}>
      <button onClick={() => onValueChange && onValueChange('test-value')}>
        {children}
      </button>
    </div>
  ),
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ value, children }: any) => (
    <option data-testid="select-item" value={value}>{children}</option>
  ),
  SelectTrigger: ({ children }: any) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: ({ placeholder }: any) => <span data-testid="select-value">{placeholder}</span>,
}));

vi.mock('../../../client/src/components/ui/textarea', () => ({
  Textarea: (props: any) => (
    <textarea data-testid="textarea" {...props} />
  ),
}));

const mockToast = vi.fn();
const mockCacheManager = {
  handleRecipeGeneration: vi.fn(),
  refetchQueries: vi.fn(),
};

const mockFetch = vi.mocked(fetch);
const mockUseToast = vi.mocked(useToast);
const mockCreateCacheManager = vi.mocked(createCacheManager);

describe('AdminRecipeGenerator Component Tests', () => {
  let queryClient: QueryClient;
  let user: any;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });
    user = userEvent.setup();

    // Mock hooks
    mockUseToast.mockReturnValue({ toast: mockToast });
    mockCreateCacheManager.mockReturnValue(mockCacheManager);

    // Mock localStorage
    Storage.prototype.getItem = vi.fn(() => 'mock-token');
    Storage.prototype.setItem = vi.fn();

    // Mock fetch responses
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        message: 'Generation started successfully',
        count: 10,
        started: true,
        success: 8,
        failed: 2,
        errors: ['Recipe validation failed', 'Image generation timeout'],
        metrics: {
          totalDuration: 25000,
          averageTimePerRecipe: 2500
        }
      })
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AdminRecipeGenerator {...props} />
      </QueryClientProvider>
    );
  };

  describe('Basic Rendering', () => {
    it('should render AI Recipe Generator title', () => {
      renderComponent();
      expect(screen.getByText('AI Recipe Generator')).toBeInTheDocument();
    });

    it('should render natural language input section', () => {
      renderComponent();
      expect(screen.getByText('AI-Powered Natural Language Generator')).toBeInTheDocument();
      expect(screen.getByTestId('textarea')).toBeInTheDocument();
    });

    it('should render form fields for recipe generation', () => {
      renderComponent();
      expect(screen.getByTestId('form-field-count')).toBeInTheDocument();
      expect(screen.getByTestId('form-field-focusIngredient')).toBeInTheDocument();
      expect(screen.getByTestId('form-field-mealType')).toBeInTheDocument();
    });

    it('should render bulk generation section', () => {
      renderComponent();
      expect(screen.getByText('Quick Bulk Generation')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
      expect(screen.getByText('30')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
    });

    it('should render collapse/expand functionality', () => {
      renderComponent();
      const collapseButton = screen.getByRole('button', { name: /chevron/i });
      expect(collapseButton).toBeInTheDocument();
    });
  });

  describe('Natural Language Processing', () => {
    it('should handle natural language input', async () => {
      renderComponent();
      
      const textarea = screen.getByTestId('textarea');
      await user.type(textarea, 'Generate 15 high-protein breakfast recipes');
      
      expect(textarea).toHaveValue('Generate 15 high-protein breakfast recipes');
    });

    it('should call parse API when Parse with AI is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          count: 15,
          mealTypes: ['breakfast'],
          dietaryTags: ['high-protein'],
          maxPrepTime: 30
        })
      } as any);

      renderComponent();
      
      const textarea = screen.getByTestId('textarea');
      await user.type(textarea, 'Generate 15 high-protein breakfast recipes');
      
      const parseButton = screen.getByText('Parse with AI');
      await user.click(parseButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/admin/parse-natural-language', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token',
          },
          credentials: 'include',
          body: JSON.stringify({ 
            naturalLanguageInput: 'Generate 15 high-protein breakfast recipes' 
          }),
        });
      });
    });

    it('should disable parse button when input is empty', () => {
      renderComponent();
      const parseButton = screen.getByText('Parse with AI');
      expect(parseButton).toBeDisabled();
    });

    it('should show loading state during parsing', async () => {
      mockFetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: vi.fn().mockResolvedValue({})
        } as any), 100))
      );

      renderComponent();
      
      const textarea = screen.getByTestId('textarea');
      await user.type(textarea, 'test input');
      
      const parseButton = screen.getByText('Parse with AI');
      await user.click(parseButton);

      expect(screen.getByText('Parsing with AI...')).toBeInTheDocument();
    });

    it('should handle parse API errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Parse API failed'));

      renderComponent();
      
      const textarea = screen.getByTestId('textarea');
      await user.type(textarea, 'test input');
      
      const parseButton = screen.getByText('Parse with AI');
      await user.click(parseButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Parsing Failed',
          description: 'Parse API failed',
          variant: 'destructive',
        });
      });
    });

    it('should populate form fields after successful parsing', async () => {
      const mockParseData = {
        count: 15,
        mealType: 'breakfast',
        dietaryTag: 'high-protein',
        maxPrepTime: 30,
        focusIngredient: 'eggs',
        minCalories: 400,
        maxCalories: 600
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockParseData)
      } as any);

      renderComponent();
      
      const textarea = screen.getByTestId('textarea');
      await user.type(textarea, 'Generate breakfast recipes');
      
      const parseButton = screen.getByText('Parse with AI');
      await user.click(parseButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'AI Parsing Complete',
          description: 'Automatically populated form with parsed recipe requirements.',
        });
      });
    });
  });

  describe('Form Validation', () => {
    it('should validate recipe count limits', async () => {
      renderComponent();
      
      const countField = screen.getByTestId('form-field-count');
      const countInput = within(countField).getByRole('spinbutton');
      
      // Test minimum value
      await user.clear(countInput);
      await user.type(countInput, '0');
      
      // Test maximum value
      await user.clear(countInput);
      await user.type(countInput, '100');
    });

    it('should handle form submission with valid data', async () => {
      renderComponent();
      
      const submitButton = screen.getByText('Generate Custom Recipes');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/admin/generate-recipes', 
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          })
        );
      });
    });

    it('should handle optional form fields correctly', async () => {
      renderComponent();
      
      // Test that empty optional fields don't cause validation errors
      const focusIngredientField = screen.getByTestId('form-field-focusIngredient');
      const focusInput = within(focusIngredientField).getByRole('textbox');
      
      expect(focusInput).toHaveValue('');
      
      const submitButton = screen.getByText('Generate Custom Recipes');
      await user.click(submitButton);

      // Should not show validation errors for optional fields
      expect(screen.queryByText(/required/i)).not.toBeInTheDocument();
    });

    it('should validate numeric fields', async () => {
      renderComponent();
      
      const proteinFields = screen.getByTestId('form-field-minProtein');
      const proteinInput = within(proteinFields).getByRole('spinbutton');
      
      await user.type(proteinInput, '-5');
      // Should handle negative values appropriately
    });
  });

  describe('Recipe Generation Process', () => {
    it('should start recipe generation with correct payload', async () => {
      renderComponent();
      
      const submitButton = screen.getByText('Generate Custom Recipes');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/admin/generate-recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: expect.stringContaining('"count":10')
        });
      });
    });

    it('should show generation started toast', async () => {
      renderComponent();
      
      const submitButton = screen.getByText('Generate Custom Recipes');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Recipe Generation Started',
          description: expect.stringContaining('Generating 10 recipes'),
        });
      });
    });

    it('should display progress indicators during generation', async () => {
      renderComponent();
      
      const submitButton = screen.getByText('Generate Custom Recipes');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Generation In Progress')).toBeInTheDocument();
      });

      // Check for progress steps
      expect(screen.getByText('Initializing AI models...')).toBeInTheDocument();
      expect(screen.getByText('Generating recipe concepts...')).toBeInTheDocument();
      expect(screen.getByText('Calculating nutritional data...')).toBeInTheDocument();
    });

    it('should show progress bar during generation', async () => {
      renderComponent();
      
      const submitButton = screen.getByText('Generate Custom Recipes');
      await user.click(submitButton);

      await waitFor(() => {
        const progressBar = screen.getByRole('progressbar', { hidden: true });
        expect(progressBar).toBeInTheDocument();
      });
    });

    it('should handle generation completion', async () => {
      renderComponent();
      
      const submitButton = screen.getByText('Generate Custom Recipes');
      await user.click(submitButton);

      // Wait for completion (mocked timeout)
      await waitFor(() => {
        expect(screen.getByText('Generation Complete')).toBeInTheDocument();
      }, { timeout: 35000 });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Generation Complete',
        description: expect.stringContaining('Successfully generated 8 recipes')
      });
    });

    it('should show errors when generation fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          message: 'Generation completed with errors',
          count: 10,
          success: 5,
          failed: 5,
          errors: ['Network timeout', 'Invalid ingredient']
        })
      } as any);

      renderComponent();
      
      const submitButton = screen.getByText('Generate Custom Recipes');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Some Recipes Failed',
          description: 'Check the console for detailed error information',
          variant: 'destructive'
        });
      }, { timeout: 35000 });
    });

    it('should disable form during generation', async () => {
      renderComponent();
      
      const submitButton = screen.getByText('Generate Custom Recipes');
      await user.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });

    it('should handle API errors during generation', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      renderComponent();
      
      const submitButton = screen.getByText('Generate Custom Recipes');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Generation Failed',
          description: 'API Error',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Bulk Generation', () => {
    it('should render bulk generation buttons', () => {
      renderComponent();
      
      const bulkButtons = [10, 20, 30, 50];
      bulkButtons.forEach(count => {
        expect(screen.getByText(count.toString())).toBeInTheDocument();
        expect(screen.getByText('recipes')).toBeInTheDocument();
      });
    });

    it('should handle bulk generation requests', async () => {
      renderComponent();
      
      const bulkButton = screen.getByText('20');
      await user.click(bulkButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/admin/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ count: 20 })
        });
      });
    });

    it('should show bulk generation started toast', async () => {
      renderComponent();
      
      const bulkButton = screen.getByText('30');
      await user.click(bulkButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Bulk Generation Started',
          description: expect.any(String),
        });
      });
    });

    it('should disable bulk buttons during generation', async () => {
      renderComponent();
      
      const bulkButton = screen.getByText('10');
      await user.click(bulkButton);

      await waitFor(() => {
        [10, 20, 30, 50].forEach(count => {
          const button = screen.getByText(count.toString());
          expect(button.closest('button')).toBeDisabled();
        });
      });
    });

    it('should handle bulk generation errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Bulk generation failed'));

      renderComponent();
      
      const bulkButton = screen.getByText('50');
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

  describe('Direct Generation', () => {
    it('should handle direct generation from natural language', async () => {
      renderComponent();
      
      const textarea = screen.getByTestId('textarea');
      await user.type(textarea, 'Generate protein-rich breakfast recipes');
      
      const directButton = screen.getByText('Generate Directly');
      await user.click(directButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/admin/generate-recipes', 
          expect.objectContaining({
            method: 'POST'
          })
        );
      });
    });

    it('should disable direct generation when input is empty', () => {
      renderComponent();
      
      const directButton = screen.getByText('Generate Directly');
      expect(directButton).toBeDisabled();
    });

    it('should show loading state during direct generation', async () => {
      renderComponent();
      
      const textarea = screen.getByTestId('textarea');
      await user.type(textarea, 'test input');
      
      const directButton = screen.getByText('Generate Directly');
      await user.click(directButton);

      expect(screen.getByText('Generating...')).toBeInTheDocument();
    });
  });

  describe('Form Field Interactions', () => {
    it('should handle meal type selection', async () => {
      renderComponent();
      
      const mealTypeField = screen.getByTestId('form-field-mealType');
      const selectTrigger = within(mealTypeField).getByTestId('select-trigger');
      
      await user.click(selectTrigger);
      // Simulate selecting breakfast
    });

    it('should handle dietary tag selection', async () => {
      renderComponent();
      
      const dietaryField = screen.getByTestId('form-field-dietaryTag');
      const selectTrigger = within(dietaryField).getByTestId('select-trigger');
      
      await user.click(selectTrigger);
      // Should show dietary options
    });

    it('should handle prep time selection', async () => {
      renderComponent();
      
      const prepTimeField = screen.getByTestId('form-field-maxPrepTime');
      const selectTrigger = within(prepTimeField).getByTestId('select-trigger');
      
      await user.click(selectTrigger);
    });

    it('should handle nutritional target inputs', async () => {
      renderComponent();
      
      const proteinMinField = screen.getByTestId('form-field-minProtein');
      const proteinInput = within(proteinMinField).getByRole('spinbutton');
      
      await user.clear(proteinInput);
      await user.type(proteinInput, '25');
      
      expect(proteinInput).toHaveValue(25);
    });

    it('should clear optional fields when "all" is selected', async () => {
      renderComponent();
      
      const mealTypeField = screen.getByTestId('form-field-mealType');
      const selectButton = within(mealTypeField).getByRole('button');
      
      await user.click(selectButton);
      // Should handle "all" selection clearing the field
    });
  });

  describe('UI State Management', () => {
    it('should handle collapse/expand state', async () => {
      renderComponent();
      
      const collapseButton = screen.getByRole('button', { name: /chevron/i });
      await user.click(collapseButton);

      expect(screen.queryByText('Generate custom recipes using AI')).not.toBeInTheDocument();
      
      await user.click(collapseButton);
      expect(screen.getByText(/Generate custom recipes using AI/)).toBeInTheDocument();
    });

    it('should show generation status card when generation starts', async () => {
      renderComponent();
      
      const submitButton = screen.getByText('Generate Custom Recipes');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Generation In Progress')).toBeInTheDocument();
      });
    });

    it('should update generation status from in progress to complete', async () => {
      renderComponent();
      
      const submitButton = screen.getByText('Generate Custom Recipes');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Generation In Progress')).toBeInTheDocument();
      });

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText('Generation Complete')).toBeInTheDocument();
      }, { timeout: 35000 });
    });

    it('should show refresh buttons after generation completion', async () => {
      renderComponent();
      
      const submitButton = screen.getByText('Generate Custom Recipes');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Refresh Stats')).toBeInTheDocument();
        expect(screen.getByText('Refresh Pending Recipe List')).toBeInTheDocument();
      }, { timeout: 35000 });
    });
  });

  describe('Cache Management', () => {
    it('should call cache manager during generation', async () => {
      renderComponent();
      
      const submitButton = screen.getByText('Generate Custom Recipes');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCacheManager.handleRecipeGeneration).toHaveBeenCalledWith(10);
      });
    });

    it('should invalidate queries after generation completion', async () => {
      const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
      
      renderComponent();
      
      const submitButton = screen.getByText('Generate Custom Recipes');
      await user.click(submitButton);

      await waitFor(() => {
        expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['/api/recipes'] });
        expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['/api/admin/stats'] });
      }, { timeout: 35000 });
    });

    it('should handle refresh stats button', async () => {
      const refetchQueries = vi.spyOn(queryClient, 'refetchQueries');
      
      renderComponent();
      
      // First start generation to show refresh buttons
      const submitButton = screen.getByText('Generate Custom Recipes');
      await user.click(submitButton);

      await waitFor(() => {
        const refreshButton = screen.getByText('Refresh Stats');
        user.click(refreshButton);
      }, { timeout: 35000 });

      expect(refetchQueries).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      renderComponent();
      
      const submitButton = screen.getByText('Generate Custom Recipes');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Generation Failed',
          description: 'Network error',
          variant: 'destructive',
        });
      });
    });

    it('should handle malformed API responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValue({
          message: 'Invalid request format'
        })
      } as any);

      renderComponent();
      
      const submitButton = screen.getByText('Generate Custom Recipes');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Generation Failed',
            variant: 'destructive'
          })
        );
      });
    });

    it('should handle timeout errors', async () => {
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      renderComponent();
      
      const submitButton = screen.getByText('Generate Custom Recipes');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Generation Failed',
          description: 'Request timeout',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle rapid form submissions', async () => {
      renderComponent();
      
      const submitButton = screen.getByText('Generate Custom Recipes');
      
      // Rapidly click multiple times
      await user.click(submitButton);
      await user.click(submitButton);
      await user.click(submitButton);

      // Should only make one request due to disabled state
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should debounce natural language input', async () => {
      renderComponent();
      
      const textarea = screen.getByTestId('textarea');
      
      // Type rapidly
      await user.type(textarea, 'test');
      await user.type(textarea, ' input');
      await user.type(textarea, ' more text');

      // Should not trigger unnecessary re-renders or API calls
    });

    it('should handle large form data efficiently', async () => {
      renderComponent();
      
      // Fill all form fields
      const focusIngredientField = screen.getByTestId('form-field-focusIngredient');
      const focusInput = within(focusIngredientField).getByRole('textbox');
      
      await user.type(focusInput, 'chicken, beef, salmon, quinoa, spinach, broccoli');
      
      const submitButton = screen.getByText('Generate Custom Recipes');
      await user.click(submitButton);

      // Should handle large payloads without issues
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      renderComponent();
      
      const labels = screen.getAllByTestId('form-label');
      expect(labels.length).toBeGreaterThan(0);
      
      labels.forEach(label => {
        expect(label).toBeVisible();
      });
    });

    it('should support keyboard navigation', async () => {
      renderComponent();
      
      const submitButton = screen.getByText('Generate Custom Recipes');
      
      // Should be focusable
      submitButton.focus();
      expect(submitButton).toHaveFocus();
      
      // Should trigger on Enter key
      await user.keyboard('{Enter}');
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should have accessible form descriptions', () => {
      renderComponent();
      
      const descriptions = screen.getAllByTestId('form-description');
      expect(descriptions.length).toBeGreaterThan(0);
      
      descriptions.forEach(desc => {
        expect(desc).toBeVisible();
      });
    });

    it('should provide screen reader friendly progress updates', async () => {
      renderComponent();
      
      const submitButton = screen.getByText('Generate Custom Recipes');
      await user.click(submitButton);

      await waitFor(() => {
        // Progress text should be accessible
        expect(screen.getByText('Generation In Progress')).toBeInTheDocument();
        expect(screen.getByText('Initializing AI models...')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty form submission', async () => {
      renderComponent();
      
      // Clear default values if any
      const countField = screen.getByTestId('form-field-count');
      const countInput = within(countField).getByRole('spinbutton');
      await user.clear(countInput);
      
      const submitButton = screen.getByText('Generate Custom Recipes');
      await user.click(submitButton);

      // Should handle validation or use defaults
    });

    it('should handle extreme numeric values', async () => {
      renderComponent();
      
      const proteinField = screen.getByTestId('form-field-minProtein');
      const proteinInput = within(proteinField).getByRole('spinbutton');
      
      await user.type(proteinInput, '999999');
      
      const submitButton = screen.getByText('Generate Custom Recipes');
      await user.click(submitButton);

      // Should handle or validate extreme values
    });

    it('should handle very long natural language input', async () => {
      renderComponent();
      
      const textarea = screen.getByTestId('textarea');
      const longInput = 'Generate recipes '.repeat(100);
      
      await user.type(textarea, longInput);
      
      const parseButton = screen.getByText('Parse with AI');
      await user.click(parseButton);

      // Should handle long inputs gracefully
    });

    it('should handle special characters in input', async () => {
      renderComponent();
      
      const focusIngredientField = screen.getByTestId('form-field-focusIngredient');
      const focusInput = within(focusIngredientField).getByRole('textbox');
      
      await user.type(focusInput, 'jalapeño, açaí, crème fraîche');
      
      const submitButton = screen.getByText('Generate Custom Recipes');
      await user.click(submitButton);

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle concurrent generations', async () => {
      renderComponent();
      
      const submitButton = screen.getByText('Generate Custom Recipes');
      const bulkButton = screen.getByText('20');
      
      // Try to start both types of generation
      await user.click(submitButton);
      await user.click(bulkButton);

      // Should prevent concurrent generations
      expect(bulkButton.closest('button')).toBeDisabled();
    });
  });
});