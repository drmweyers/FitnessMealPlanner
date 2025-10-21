/**
 * Unit Tests for Unified Meal Plan Generator
 * Tests the merged AI Natural Language and Manual Meal Plan functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MealPlanGenerator from '@/components/MealPlanGenerator';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import '@testing-library/jest-dom';

// Mock the API request function
vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn(),
}));

import { apiRequest } from '@/lib/queryClient';
const mockApiRequest = vi.mocked(apiRequest);

// Mock useToast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Helper function to detect manual meal plan format
function detectManualMealPlanFormat(input: string): boolean {
  const lines = input.trim().split('\n');
  let hasMealHeaders = false;
  let hasIngredientLines = false;

  for (const line of lines) {
    // Check for meal headers
    if (/^(Meal\s+\d+|Day\s+\d+|Breakfast|Lunch|Dinner|Snack)/i.test(line.trim())) {
      hasMealHeaders = true;
    }
    // Check for ingredient lines (starting with -, *, or bullet point)
    if (/^[-*•]\s*.+/i.test(line.trim())) {
      hasIngredientLines = true;
    }
  }

  // If we have both meal headers and ingredient lines, it's likely a manual format
  // Or if we have multiple lines starting with dashes/bullets
  const bulletLines = lines.filter(line => /^[-*•]\s*.+/i.test(line.trim())).length;
  return (hasMealHeaders && hasIngredientLines) || bulletLines >= 3;
}

describe('MealPlanGenerator - Unified Interface', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MealPlanGenerator />
        </AuthProvider>
      </QueryClientProvider>
    );
  };

  describe('UI Rendering', () => {
    it('should render unified AI-Powered Natural Language Generator', () => {
      renderComponent();

      expect(screen.getByText(/AI-Powered Natural Language Generator/i)).toBeInTheDocument();
      expect(screen.getByText(/Describe your meal plan requirements in plain English or paste an existing meal plan/i)).toBeInTheDocument();
    });

    it('should show combined placeholder text with both options', () => {
      renderComponent();

      const textarea = screen.getByPlaceholderText(/Option 1 - Natural Language Description/i);
      expect(textarea).toBeInTheDocument();
      expect(textarea.placeholder).toContain('Option 2 - Your Own Meal Plan');
      expect(textarea.placeholder).toContain('Meal 1');
      expect(textarea.placeholder).toContain('-175g of Jasmine Rice');
    });

    it('should display Generate AI images checkbox', () => {
      renderComponent();

      const checkbox = screen.getByLabelText(/Generate AI images for meals/i);
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).not.toBeChecked();
    });

    it('should have Parse with AI, Generate Plan Directly, and Clear buttons', () => {
      renderComponent();

      expect(screen.getByRole('button', { name: /Parse with AI/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Generate Plan Directly/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Clear/i })).toBeInTheDocument();
    });

    it('should NOT render separate Manual Meal Plan Parser card', () => {
      renderComponent();

      expect(screen.queryByText(/Manual Meal Plan Parser/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Paste your existing meal plan text/i)).not.toBeInTheDocument();
    });
  });

  describe('Input Detection', () => {
    it('should detect natural language description format', () => {
      const input = "I need a 5-day weight loss meal plan for Sarah with 1600 calories per day, 3 meals daily, focusing on lean proteins and vegetables, avoiding gluten";

      expect(detectManualMealPlanFormat(input)).toBe(false);
    });

    it('should detect manual meal plan format with meal headers', () => {
      const input = `Meal 1
-175g of Jasmine Rice
-150g of Lean ground beef
-100g of cooked broccoli
Meal 2
-4 eggs
-2 slices of whole wheat bread
-1 tbsp olive oil`;

      expect(detectManualMealPlanFormat(input)).toBe(true);
    });

    it('should detect manual meal plan format with day headers', () => {
      const input = `Day 1
Meal 1: Breakfast
-200g oatmeal
-50g blueberries
-1 tbsp honey
Meal 2: Lunch
-150g chicken breast
-200g sweet potato`;

      expect(detectManualMealPlanFormat(input)).toBe(true);
    });

    it('should detect manual meal plan format with bullet points only', () => {
      const input = `- 200g chicken breast
- 150g rice
- 100g vegetables
- 30g protein powder
- 1 banana`;

      expect(detectManualMealPlanFormat(input)).toBe(true);
    });
  });

  describe('Natural Language Parsing', () => {
    it('should call natural language API for descriptive input', async () => {
      mockApiRequest.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          planName: 'Sarah\'s Weight Loss Plan',
          fitnessGoal: 'weight_loss',
          days: 5,
          mealsPerDay: 3,
          dailyCalorieTarget: 1600,
        }),
      });

      renderComponent();

      const textarea = screen.getByPlaceholderText(/Option 1 - Natural Language Description/i);
      await userEvent.type(textarea, 'I need a 5-day weight loss meal plan for Sarah with 1600 calories');

      const parseButton = screen.getByRole('button', { name: /Parse with AI/i });
      fireEvent.click(parseButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          'POST',
          '/api/meal-plan/parse-natural-language',
          expect.objectContaining({
            naturalLanguageInput: expect.stringContaining('5-day weight loss meal plan'),
          })
        );
      });
    });

    it('should disable Parse button when input is empty', () => {
      renderComponent();

      const parseButton = screen.getByRole('button', { name: /Parse with AI/i });
      expect(parseButton).toBeDisabled();
    });

    it('should enable Parse button when input is provided', async () => {
      renderComponent();

      const textarea = screen.getByPlaceholderText(/Option 1 - Natural Language Description/i);
      await userEvent.type(textarea, 'Test input');

      const parseButton = screen.getByRole('button', { name: /Parse with AI/i });
      expect(parseButton).toBeEnabled();
    });
  });

  describe('Manual Meal Plan Parsing', () => {
    it('should call manual parsing API for meal plan format input', async () => {
      mockApiRequest.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          mealPlan: {
            planName: 'Manual Meal Plan',
            meals: [
              {
                name: 'Meal 1',
                manual: true,
                manualIngredients: [
                  { name: 'Jasmine Rice', quantitySI: 175, unitSI: 'g' },
                  { name: 'Lean ground beef', quantitySI: 150, unitSI: 'g' },
                  { name: 'cooked broccoli', quantitySI: 100, unitSI: 'g' },
                ],
              },
            ],
          },
          nutrition: {
            total: { calories: 1800, protein: 120, carbs: 200, fat: 50 },
            averageDaily: { calories: 1800, protein: 120, carbs: 200, fat: 50 },
            daily: [],
          },
        }),
      });

      renderComponent();

      const manualPlan = `Meal 1
-175g of Jasmine Rice
-150g of Lean ground beef
-100g of cooked broccoli`;

      const textarea = screen.getByPlaceholderText(/Option 1 - Natural Language Description/i);
      await userEvent.type(textarea, manualPlan);

      const parseButton = screen.getByRole('button', { name: /Parse with AI/i });
      fireEvent.click(parseButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          'POST',
          '/api/meal-plan/parse-manual',
          expect.objectContaining({
            pastedText: expect.stringContaining('Meal 1'),
            generateImages: false,
          })
        );
      });
    });

    it('should include generateImages flag when checkbox is checked', async () => {
      mockApiRequest.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          mealPlan: { meals: [] },
          nutrition: {
            total: { calories: 0, protein: 0, carbs: 0, fat: 0 },
            averageDaily: { calories: 0, protein: 0, carbs: 0, fat: 0 },
            daily: [],
          },
        }),
      });

      renderComponent();

      const checkbox = screen.getByLabelText(/Generate AI images for meals/i);
      await userEvent.click(checkbox);

      const manualPlan = `Meal 1
-175g of Jasmine Rice
-150g of Lean ground beef`;

      const textarea = screen.getByPlaceholderText(/Option 1 - Natural Language Description/i);
      await userEvent.type(textarea, manualPlan);

      const parseButton = screen.getByRole('button', { name: /Parse with AI/i });
      fireEvent.click(parseButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          'POST',
          '/api/meal-plan/parse-manual',
          expect.objectContaining({
            generateImages: true,
          })
        );
      });
    });
  });

  describe('Clear Functionality', () => {
    it('should clear input when Clear button is clicked', async () => {
      renderComponent();

      const textarea = screen.getByPlaceholderText(/Option 1 - Natural Language Description/i) as HTMLTextAreaElement;
      await userEvent.type(textarea, 'Test content to clear');

      expect(textarea.value).toBe('Test content to clear');

      const clearButton = screen.getByRole('button', { name: /Clear/i });
      fireEvent.click(clearButton);

      expect(textarea.value).toBe('');
    });

    it('should disable Clear button when input is empty', () => {
      renderComponent();

      const clearButton = screen.getByRole('button', { name: /Clear/i });
      expect(clearButton).toBeDisabled();
    });

    it('should enable Clear button when input has content', async () => {
      renderComponent();

      const textarea = screen.getByPlaceholderText(/Option 1 - Natural Language Description/i);
      await userEvent.type(textarea, 'Some content');

      const clearButton = screen.getByRole('button', { name: /Clear/i });
      expect(clearButton).toBeEnabled();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockApiRequest.mockRejectedValueOnce(new Error('API Error'));

      renderComponent();

      const textarea = screen.getByPlaceholderText(/Option 1 - Natural Language Description/i);
      await userEvent.type(textarea, 'Test input');

      const parseButton = screen.getByRole('button', { name: /Parse with AI/i });
      fireEvent.click(parseButton);

      // The error should be handled without crashing
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalled();
      });
    });

    it('should handle manual parsing errors', async () => {
      mockApiRequest.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          message: 'No valid meals found in the input',
        }),
      });

      renderComponent();

      const manualPlan = `Invalid format text`;
      const textarea = screen.getByPlaceholderText(/Option 1 - Natural Language Description/i);
      await userEvent.type(textarea, manualPlan);

      const parseButton = screen.getByRole('button', { name: /Parse with AI/i });
      fireEvent.click(parseButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalled();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state when parsing', async () => {
      // Create a promise that we can control
      let resolvePromise: any;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockApiRequest.mockReturnValueOnce({
        ok: true,
        json: () => promise,
      });

      renderComponent();

      const textarea = screen.getByPlaceholderText(/Option 1 - Natural Language Description/i);
      await userEvent.type(textarea, 'Test input');

      const parseButton = screen.getByRole('button', { name: /Parse with AI/i });
      fireEvent.click(parseButton);

      // Check for loading state
      await waitFor(() => {
        expect(screen.getByText(/Parsing with AI.../i)).toBeInTheDocument();
      });

      // Resolve the promise
      resolvePromise({
        planName: 'Test Plan',
        fitnessGoal: 'general_health',
        days: 7,
        mealsPerDay: 3,
      });
    });
  });
});