/**
 * BMADRecipeGenerator Comprehensive Unit Tests
 *
 * Tests for the updated BMADRecipeGenerator component covering:
 * - New form fields (Focus Ingredient, Difficulty Level, Recipe Preferences)
 * - Updated field labels (Maximum Number of Ingredients)
 * - Form validation for new fields
 * - Default values
 * - Field interactions
 * - Form submission with new fields
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import BMADRecipeGenerator from '@/components/BMADRecipeGenerator';
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock EventSource for SSE
class MockEventSource {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  addEventListener = vi.fn();
  readyState = 1;
  url = '';

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  close() {
    this.readyState = 2;
  }

  static instances: MockEventSource[] = [];

  static resetInstances() {
    MockEventSource.instances = [];
  }
}

global.EventSource = MockEventSource as any;

// Mock toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Wrapper component with providers
const Wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('BMADRecipeGenerator - New Fields', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    mockFetch.mockClear();
    mockToast.mockClear();
    MockEventSource.resetInstances();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Focus Ingredient Field', () => {
    it('should render Focus Ingredient field with correct label', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      // Show advanced form
      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      await waitFor(() => {
        expect(screen.getByLabelText(/Focus Ingredient \(Optional\)/i)).toBeInTheDocument();
      });
    });

    it('should have correct placeholder text for Focus Ingredient', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      await waitFor(() => {
        const focusInput = screen.getByPlaceholderText(/e.g., chicken, salmon, tofu/i);
        expect(focusInput).toBeInTheDocument();
      });
    });

    it('should accept text input in Focus Ingredient field', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      await waitFor(async () => {
        const focusInput = screen.getByLabelText(/Focus Ingredient \(Optional\)/i);
        await user.type(focusInput, 'chicken breast');
        expect(focusInput).toHaveValue('chicken breast');
      });
    });

    it('should display correct description for Focus Ingredient', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      await waitFor(() => {
        expect(screen.getByText(/Main ingredient to feature in recipes/i)).toBeInTheDocument();
      });
    });

    it('should allow empty Focus Ingredient (optional field)', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      await waitFor(() => {
        const focusInput = screen.getByLabelText(/Focus Ingredient \(Optional\)/i);
        expect(focusInput).toHaveValue('');
      });
    });
  });

  describe('Difficulty Level Field', () => {
    it('should render Difficulty Level field with correct label', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      await waitFor(() => {
        expect(screen.getByText(/Difficulty Level \(Optional\)/i)).toBeInTheDocument();
      });
    });

    it('should render difficulty level dropdown with all options', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      await waitFor(() => {
        // Find the difficulty level trigger button
        const difficultyTrigger = screen.getByRole('combobox', { name: /difficulty level/i });
        expect(difficultyTrigger).toBeInTheDocument();
      });
    });

    it('should have default placeholder "Any Difficulty"', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      await waitFor(() => {
        expect(screen.getByText(/Any Difficulty/i)).toBeInTheDocument();
      });
    });

    it('should allow selecting Easy difficulty', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      await waitFor(async () => {
        const difficultyTrigger = screen.getByRole('combobox', { name: /difficulty level/i });
        await user.click(difficultyTrigger);

        const easyOption = screen.getByRole('option', { name: /^Easy$/i });
        await user.click(easyOption);

        expect(screen.getByText(/^Easy$/i)).toBeInTheDocument();
      });
    });

    it('should allow selecting Medium difficulty', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      await waitFor(async () => {
        const difficultyTrigger = screen.getByRole('combobox', { name: /difficulty level/i });
        await user.click(difficultyTrigger);

        const mediumOption = screen.getByRole('option', { name: /^Medium$/i });
        await user.click(mediumOption);

        expect(screen.getByText(/^Medium$/i)).toBeInTheDocument();
      });
    });

    it('should allow selecting Hard difficulty', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      await waitFor(async () => {
        const difficultyTrigger = screen.getByRole('combobox', { name: /difficulty level/i });
        await user.click(difficultyTrigger);

        const hardOption = screen.getByRole('option', { name: /^Hard$/i });
        await user.click(hardOption);

        expect(screen.getByText(/^Hard$/i)).toBeInTheDocument();
      });
    });

    it('should display correct description for Difficulty Level', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      await waitFor(() => {
        expect(screen.getByText(/Recipe complexity and cooking skill required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Recipe Preferences Field', () => {
    it('should render Recipe Preferences field with correct label', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      await waitFor(() => {
        expect(screen.getByText(/Recipe Preferences \(Optional\)/i)).toBeInTheDocument();
      });
    });

    it('should have correct placeholder for Recipe Preferences', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      await waitFor(() => {
        const preferencesInput = screen.getByPlaceholderText(/e.g., quick meals, family-friendly/i);
        expect(preferencesInput).toBeInTheDocument();
      });
    });

    it('should accept multi-line text in Recipe Preferences', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      await waitFor(async () => {
        const preferencesInput = screen.getByPlaceholderText(/e.g., quick meals, family-friendly/i);
        const testText = 'Quick meals\nFamily-friendly\nBudget-conscious';

        await user.type(preferencesInput, testText);
        expect(preferencesInput).toHaveValue(testText);
      });
    });

    it('should render as textarea element', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      await waitFor(() => {
        const preferencesInput = screen.getByPlaceholderText(/e.g., quick meals, family-friendly/i);
        expect(preferencesInput.tagName).toBe('TEXTAREA');
      });
    });

    it('should display correct description for Recipe Preferences', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      await waitFor(() => {
        expect(screen.getByText(/Additional preferences or requirements for recipe generation/i)).toBeInTheDocument();
      });
    });

    it('should allow empty Recipe Preferences (optional field)', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      await waitFor(() => {
        const preferencesInput = screen.getByPlaceholderText(/e.g., quick meals, family-friendly/i);
        expect(preferencesInput).toHaveValue('');
      });
    });
  });

  describe('Maximum Number of Ingredients Field', () => {
    it('should render with updated label "Maximum Number of Ingredients"', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      await waitFor(() => {
        expect(screen.getByText(/Maximum Number of Ingredients \(Optional\)/i)).toBeInTheDocument();
      });
    });

    it('should NOT display old label "Max Ingredients"', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      await waitFor(() => {
        // The old label should not exist (excluding the word "Ingredients" alone)
        expect(screen.queryByText(/^Max Ingredients$/i)).not.toBeInTheDocument();
      });
    });

    it('should accept numeric input', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      await waitFor(async () => {
        const maxIngredientsInput = screen.getByLabelText(/Maximum Number of Ingredients/i);
        await user.type(maxIngredientsInput, '15');
        expect(maxIngredientsInput).toHaveValue(15);
      });
    });

    it('should have correct description', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      await waitFor(() => {
        expect(screen.getByText(/Limit total ingredient variety to simplify shopping/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('should validate Focus Ingredient as optional', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      await waitFor(async () => {
        const submitButton = screen.getByRole('button', { name: /Start Bulk Generation/i });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            batchId: 'test123',
            count: 10,
            started: true,
          }),
        });

        await user.click(submitButton);

        // Should submit without Focus Ingredient (optional)
        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalled();
        });
      });
    });

    it('should validate Difficulty Level as optional', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      await waitFor(async () => {
        const submitButton = screen.getByRole('button', { name: /Start Bulk Generation/i });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            batchId: 'test123',
            count: 10,
            started: true,
          }),
        });

        await user.click(submitButton);

        // Should submit without Difficulty Level (optional)
        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalled();
        });
      });
    });

    it('should validate Recipe Preferences as optional', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      await waitFor(async () => {
        const submitButton = screen.getByRole('button', { name: /Start Bulk Generation/i });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            batchId: 'test123',
            count: 10,
            started: true,
          }),
        });

        await user.click(submitButton);

        // Should submit without Recipe Preferences (optional)
        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalled();
        });
      });
    });
  });

  describe('Default Values', () => {
    it('should have empty default value for Focus Ingredient', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      await waitFor(() => {
        const focusInput = screen.getByLabelText(/Focus Ingredient \(Optional\)/i);
        expect(focusInput).toHaveValue('');
      });
    });

    it('should have undefined default value for Difficulty Level', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      await waitFor(() => {
        // Should show placeholder "Any Difficulty" indicating no selection
        expect(screen.getByText(/Any Difficulty/i)).toBeInTheDocument();
      });
    });

    it('should have empty default value for Recipe Preferences', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      await waitFor(() => {
        const preferencesInput = screen.getByPlaceholderText(/e.g., quick meals, family-friendly/i);
        expect(preferencesInput).toHaveValue('');
      });
    });

    it('should maintain other default values (count, features)', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      await waitFor(() => {
        const countInput = screen.getByLabelText(/Number of Recipes/i);
        expect(countInput).toHaveValue(10);

        const imageGenCheckbox = screen.getByLabelText(/Generate Images \(DALL-E 3\)/i);
        expect(imageGenCheckbox).toBeChecked();

        const s3Checkbox = screen.getByLabelText(/Upload to S3 Storage/i);
        expect(s3Checkbox).toBeChecked();

        const nutritionCheckbox = screen.getByLabelText(/Nutrition Validation/i);
        expect(nutritionCheckbox).toBeChecked();
      });
    });
  });

  describe('Field Interactions', () => {
    it('should allow clearing Focus Ingredient after typing', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      await waitFor(async () => {
        const focusInput = screen.getByLabelText(/Focus Ingredient \(Optional\)/i);
        await user.type(focusInput, 'salmon');
        expect(focusInput).toHaveValue('salmon');

        await user.clear(focusInput);
        expect(focusInput).toHaveValue('');
      });
    });

    it('should allow changing Difficulty Level multiple times', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      await waitFor(async () => {
        const difficultyTrigger = screen.getByRole('combobox', { name: /difficulty level/i });

        // Select Easy
        await user.click(difficultyTrigger);
        await user.click(screen.getByRole('option', { name: /^Easy$/i }));
        expect(screen.getByText(/^Easy$/i)).toBeInTheDocument();

        // Change to Hard
        await user.click(difficultyTrigger);
        await user.click(screen.getByRole('option', { name: /^Hard$/i }));
        expect(screen.getByText(/^Hard$/i)).toBeInTheDocument();
      });
    });

    it('should allow editing Recipe Preferences multiple times', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      await waitFor(async () => {
        const preferencesInput = screen.getByPlaceholderText(/e.g., quick meals, family-friendly/i);

        await user.type(preferencesInput, 'Quick meals');
        expect(preferencesInput).toHaveValue('Quick meals');

        await user.clear(preferencesInput);
        await user.type(preferencesInput, 'Family-friendly, budget-conscious');
        expect(preferencesInput).toHaveValue('Family-friendly, budget-conscious');
      });
    });

    it('should disable all new fields when generation is in progress', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          batchId: 'test123',
          count: 10,
          started: true,
        }),
      });

      await waitFor(async () => {
        const submitButton = screen.getByRole('button', { name: /Start Bulk Generation/i });
        await user.click(submitButton);

        await waitFor(() => {
          expect(screen.getByLabelText(/Focus Ingredient \(Optional\)/i)).toBeDisabled();
          expect(screen.getByRole('combobox', { name: /difficulty level/i })).toBeDisabled();
          expect(screen.getByPlaceholderText(/e.g., quick meals, family-friendly/i)).toBeDisabled();
        });
      });
    });
  });

  describe('Form Submission with New Fields', () => {
    it('should include Focus Ingredient in API request body', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          batchId: 'test123',
          count: 10,
          started: true,
        }),
      });

      await waitFor(async () => {
        const focusInput = screen.getByLabelText(/Focus Ingredient \(Optional\)/i);
        await user.type(focusInput, 'chicken');

        const submitButton = screen.getByRole('button', { name: /Start Bulk Generation/i });
        await user.click(submitButton);

        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalled();
          const fetchCall = mockFetch.mock.calls[0];
          const requestBody = JSON.parse(fetchCall[1].body);
          expect(requestBody.focusIngredient).toBe('chicken');
        });
      });
    });

    it('should include Difficulty Level in API request body', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          batchId: 'test123',
          count: 10,
          started: true,
        }),
      });

      await waitFor(async () => {
        const difficultyTrigger = screen.getByRole('combobox', { name: /difficulty level/i });
        await user.click(difficultyTrigger);
        await user.click(screen.getByRole('option', { name: /^Easy$/i }));

        const submitButton = screen.getByRole('button', { name: /Start Bulk Generation/i });
        await user.click(submitButton);

        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalled();
          const fetchCall = mockFetch.mock.calls[0];
          const requestBody = JSON.parse(fetchCall[1].body);
          expect(requestBody.difficultyLevel).toBe('easy');
        });
      });
    });

    it('should include Recipe Preferences in API request body', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          batchId: 'test123',
          count: 10,
          started: true,
        }),
      });

      await waitFor(async () => {
        const preferencesInput = screen.getByPlaceholderText(/e.g., quick meals, family-friendly/i);
        await user.type(preferencesInput, 'Quick meals, family-friendly');

        const submitButton = screen.getByRole('button', { name: /Start Bulk Generation/i });
        await user.click(submitButton);

        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalled();
          const fetchCall = mockFetch.mock.calls[0];
          const requestBody = JSON.parse(fetchCall[1].body);
          expect(requestBody.recipePreferences).toBe('Quick meals, family-friendly');
        });
      });
    });

    it('should include all new fields in API request when all are filled', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          batchId: 'test123',
          count: 10,
          started: true,
        }),
      });

      await waitFor(async () => {
        const focusInput = screen.getByLabelText(/Focus Ingredient \(Optional\)/i);
        await user.type(focusInput, 'salmon');

        const difficultyTrigger = screen.getByRole('combobox', { name: /difficulty level/i });
        await user.click(difficultyTrigger);
        await user.click(screen.getByRole('option', { name: /^Medium$/i }));

        const preferencesInput = screen.getByPlaceholderText(/e.g., quick meals, family-friendly/i);
        await user.type(preferencesInput, 'Quick preparation, healthy fats');

        const maxIngredientsInput = screen.getByLabelText(/Maximum Number of Ingredients/i);
        await user.type(maxIngredientsInput, '20');

        const submitButton = screen.getByRole('button', { name: /Start Bulk Generation/i });
        await user.click(submitButton);

        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalled();
          const fetchCall = mockFetch.mock.calls[0];
          const requestBody = JSON.parse(fetchCall[1].body);

          expect(requestBody.focusIngredient).toBe('salmon');
          expect(requestBody.difficultyLevel).toBe('medium');
          expect(requestBody.recipePreferences).toBe('Quick preparation, healthy fats');
          expect(requestBody.maxIngredients).toBe(20);
        });
      });
    });

    it('should omit optional fields if left empty', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          batchId: 'test123',
          count: 10,
          started: true,
        }),
      });

      await waitFor(async () => {
        // Leave all new optional fields empty
        const submitButton = screen.getByRole('button', { name: /Start Bulk Generation/i });
        await user.click(submitButton);

        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalled();
          const fetchCall = mockFetch.mock.calls[0];
          const requestBody = JSON.parse(fetchCall[1].body);

          // Optional fields should be undefined or not included
          expect(requestBody.focusIngredient).toBeUndefined();
          expect(requestBody.difficultyLevel).toBeUndefined();
          expect(requestBody.recipePreferences).toBeUndefined();
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in Focus Ingredient', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      await waitFor(async () => {
        const focusInput = screen.getByLabelText(/Focus Ingredient \(Optional\)/i);
        await user.type(focusInput, 'chicken & vegetables');
        expect(focusInput).toHaveValue('chicken & vegetables');
      });
    });

    it('should handle long text in Recipe Preferences', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      await waitFor(async () => {
        const preferencesInput = screen.getByPlaceholderText(/e.g., quick meals, family-friendly/i);
        const longText = 'This is a very long preference text that includes multiple requirements like quick preparation, family-friendly portions, budget-conscious ingredients, healthy cooking methods, and various dietary considerations.';

        await user.type(preferencesInput, longText);
        expect(preferencesInput).toHaveValue(longText);
      });
    });

    it('should handle rapid difficulty level changes', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Form/i));

      await waitFor(async () => {
        const difficultyTrigger = screen.getByRole('combobox', { name: /difficulty level/i });

        // Rapidly change selections
        await user.click(difficultyTrigger);
        await user.click(screen.getByRole('option', { name: /^Easy$/i }));

        await user.click(difficultyTrigger);
        await user.click(screen.getByRole('option', { name: /^Hard$/i }));

        await user.click(difficultyTrigger);
        await user.click(screen.getByRole('option', { name: /^Medium$/i }));

        // Final selection should be Medium
        expect(screen.getByText(/^Medium$/i)).toBeInTheDocument();
      });
    });
  });
});
