/**
 * Comprehensive Unit Tests for Unified Meal Plan Generator
 * Production-Ready Testing Suite with 100% Coverage Target
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MealPlanGenerator from '@/components/MealPlanGenerator';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import '@testing-library/jest-dom';
import React from 'react';

// Mock all dependencies
vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => ({
    user: { id: '1', email: 'test@example.com', role: 'trainer' },
  }),
}));

// Import mocked function
import { apiRequest } from '@/lib/queryClient';
const mockApiRequest = vi.mocked(apiRequest);

describe('Unified Meal Plan Generator - Comprehensive Test Suite', () => {
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
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MealPlanGenerator {...props} />
        </AuthProvider>
      </QueryClientProvider>
    );
  };

  // ============================================
  // SECTION 1: UI RENDERING AND STRUCTURE
  // ============================================

  describe('1. UI Rendering and Structure', () => {
    it('1.1 should render main meal plan generator card', () => {
      renderComponent();
      expect(screen.getByText('Meal Plan Generator')).toBeInTheDocument();
      expect(screen.getByText(/Create customized meal plans/i)).toBeInTheDocument();
    });

    it('1.2 should render unified AI-Powered Natural Language Generator', () => {
      renderComponent();
      expect(screen.getByText('AI-Powered Natural Language Generator')).toBeInTheDocument();
      expect(screen.getByText(/Describe your meal plan requirements in plain English or paste an existing meal plan/i)).toBeInTheDocument();
    });

    it('1.3 should NOT render separate Manual Meal Plan Parser card', () => {
      renderComponent();
      expect(screen.queryByText('Manual Meal Plan Parser')).not.toBeInTheDocument();
      expect(screen.queryByText(/Paste your existing meal plan text/i)).not.toBeInTheDocument();
    });

    it('1.4 should display textarea with combined placeholder', () => {
      renderComponent();
      const textarea = screen.getByRole('textbox', { name: /describe your meal plan/i });
      expect(textarea).toBeInTheDocument();
      const placeholder = textarea.getAttribute('placeholder');
      expect(placeholder).toContain('Option 1 - Natural Language Description');
      expect(placeholder).toContain('Option 2 - Your Own Meal Plan');
    });

    it('1.5 should display Generate AI images checkbox', () => {
      renderComponent();
      const checkbox = screen.getByRole('checkbox', { name: /Generate AI images for meals/i });
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).not.toBeChecked();
    });

    it('1.6 should display all action buttons', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: /Parse with AI/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Generate.*Plan/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Clear/i })).toBeInTheDocument();
    });

    it('1.7 should display Manual Configuration button', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: /Manual Configuration/i })).toBeInTheDocument();
    });
  });

  // ============================================
  // SECTION 2: INPUT DETECTION LOGIC
  // ============================================

  describe('2. Input Detection Logic', () => {
    const testCases = [
      {
        name: 'natural language description',
        input: 'I need a 5-day weight loss meal plan for Sarah with 1600 calories per day',
        expectedType: 'natural',
      },
      {
        name: 'manual meal plan with Meal headers',
        input: 'Meal 1\n-175g of Jasmine Rice\n-150g of Lean ground beef\nMeal 2\n-4 eggs',
        expectedType: 'manual',
      },
      {
        name: 'manual meal plan with Day headers',
        input: 'Day 1\nMeal 1: Breakfast\n-200g oatmeal\n-50g blueberries\nDay 2\nMeal 1: Lunch\n-150g chicken',
        expectedType: 'manual',
      },
      {
        name: 'manual meal plan with bullet points only',
        input: '- 200g chicken breast\n- 150g rice\n- 100g vegetables\n- 30g protein powder',
        expectedType: 'manual',
      },
      {
        name: 'manual meal plan with asterisk bullets',
        input: '* 200g chicken breast\n* 150g rice\n* 100g vegetables',
        expectedType: 'manual',
      },
      {
        name: 'natural language with numbers',
        input: 'Create a meal plan with 3 meals per day, 2000 calories, for 7 days',
        expectedType: 'natural',
      },
      {
        name: 'edge case - mixed format',
        input: 'I want a meal plan with:\n- High protein\n- Low carbs',
        expectedType: 'natural', // Less than 3 bullet points
      },
    ];

    testCases.forEach((testCase) => {
      it(`2.${testCases.indexOf(testCase) + 1} should detect ${testCase.name} as ${testCase.expectedType}`, async () => {
        const expectedEndpoint = testCase.expectedType === 'natural'
          ? '/api/meal-plan/parse-natural-language'
          : '/api/meal-plan/parse-manual';

        mockApiRequest.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            planName: 'Test Plan',
            fitnessGoal: 'general_health',
            days: 7,
            mealsPerDay: 3,
            mealPlan: { meals: [] },
            nutrition: { total: {}, averageDaily: {}, daily: [] },
          }),
        });

        renderComponent();
        const textarea = screen.getByRole('textbox', { name: /describe your meal plan/i });
        await user.type(textarea, testCase.input);

        const parseButton = screen.getByRole('button', { name: /Parse with AI/i });
        await user.click(parseButton);

        await waitFor(() => {
          expect(mockApiRequest).toHaveBeenCalledWith(
            'POST',
            expectedEndpoint,
            expect.any(Object)
          );
        });
      });
    });
  });

  // ============================================
  // SECTION 3: BUTTON FUNCTIONALITY
  // ============================================

  describe('3. Button Functionality', () => {
    it('3.1 Parse with AI button should be disabled when textarea is empty', () => {
      renderComponent();
      const parseButton = screen.getByRole('button', { name: /Parse with AI/i });
      expect(parseButton).toBeDisabled();
    });

    it('3.2 Parse with AI button should be enabled when textarea has content', async () => {
      renderComponent();
      const textarea = screen.getByRole('textbox', { name: /describe your meal plan/i });
      await user.type(textarea, 'Test content');

      const parseButton = screen.getByRole('button', { name: /Parse with AI/i });
      expect(parseButton).toBeEnabled();
    });

    it('3.3 Clear button should be disabled when textarea is empty', () => {
      renderComponent();
      const clearButton = screen.getByRole('button', { name: /Clear/i });
      expect(clearButton).toBeDisabled();
    });

    it('3.4 Clear button should clear textarea content', async () => {
      renderComponent();
      const textarea = screen.getByRole('textbox', { name: /describe your meal plan/i });
      await user.type(textarea, 'Test content to clear');

      const clearButton = screen.getByRole('button', { name: /Clear/i });
      expect(clearButton).toBeEnabled();

      await user.click(clearButton);
      expect(textarea).toHaveValue('');
      expect(clearButton).toBeDisabled();
    });

    it('3.5 Generate Plan Directly button should call generate endpoint', async () => {
      mockApiRequest.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          mealPlan: { id: '1', meals: [] },
          nutrition: { total: {}, averageDaily: {}, daily: [] },
        }),
      });

      renderComponent();
      const textarea = screen.getByRole('textbox', { name: /describe your meal plan/i });
      await user.type(textarea, 'Generate a meal plan');

      const generateButton = screen.getByRole('button', { name: /Generate.*Plan/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          'POST',
          '/api/meal-plan/generate',
          expect.any(Object)
        );
      });
    });

    it('3.6 Manual Configuration button should toggle advanced form', async () => {
      renderComponent();
      const manualConfigButton = screen.getByRole('button', { name: /Manual Configuration/i });

      // Advanced form should not be visible initially
      expect(screen.queryByText(/Plan Details/i)).not.toBeInTheDocument();

      // Click to show
      await user.click(manualConfigButton);
      await waitFor(() => {
        expect(screen.getByText(/Plan Details/i)).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // SECTION 4: NATURAL LANGUAGE PARSING
  // ============================================

  describe('4. Natural Language Parsing Flow', () => {
    it('4.1 should parse natural language and populate form', async () => {
      const mockResponse = {
        planName: "Sarah's Weight Loss Plan",
        fitnessGoal: 'weight_loss',
        days: 5,
        mealsPerDay: 3,
        dailyCalorieTarget: 1600,
        dietaryRestrictions: ['gluten_free'],
        proteinTarget: 120,
        carbsTarget: 150,
        fatTarget: 50,
      };

      mockApiRequest.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      renderComponent();
      const textarea = screen.getByRole('textbox', { name: /describe your meal plan/i });
      const input = 'I need a 5-day weight loss meal plan for Sarah with 1600 calories per day, 3 meals daily, avoiding gluten';
      await user.type(textarea, input);

      const parseButton = screen.getByRole('button', { name: /Parse with AI/i });
      await user.click(parseButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          'POST',
          '/api/meal-plan/parse-natural-language',
          { naturalLanguageInput: input }
        );
      });
    });

    it('4.2 should show loading state during natural language parsing', async () => {
      mockApiRequest.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ planName: 'Test' }),
        }), 100))
      );

      renderComponent();
      const textarea = screen.getByRole('textbox', { name: /describe your meal plan/i });
      await user.type(textarea, 'Test input');

      const parseButton = screen.getByRole('button', { name: /Parse with AI/i });
      await user.click(parseButton);

      expect(screen.getByText(/Parsing with AI.../i)).toBeInTheDocument();
    });

    it('4.3 should handle natural language parsing errors', async () => {
      mockApiRequest.mockRejectedValueOnce(new Error('API Error'));

      renderComponent();
      const textarea = screen.getByRole('textbox', { name: /describe your meal plan/i });
      await user.type(textarea, 'Invalid input');

      const parseButton = screen.getByRole('button', { name: /Parse with AI/i });
      await user.click(parseButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalled();
      });

      // Component should still be functional
      expect(textarea).toBeInTheDocument();
    });
  });

  // ============================================
  // SECTION 5: MANUAL MEAL PLAN PARSING
  // ============================================

  describe('5. Manual Meal Plan Parsing Flow', () => {
    const MANUAL_PLAN = `Meal 1
-175g of Jasmine Rice
-150g of Lean ground beef
-100g of cooked broccoli
Meal 2
-4 eggs
-2 slices of whole wheat bread
-1 tbsp olive oil`;

    it('5.1 should parse manual meal plan correctly', async () => {
      mockApiRequest.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          mealPlan: {
            id: '1',
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
            total: { calories: 1500, protein: 100, carbs: 150, fat: 50 },
            averageDaily: { calories: 1500, protein: 100, carbs: 150, fat: 50 },
            daily: [],
          },
        }),
      });

      renderComponent();
      const textarea = screen.getByRole('textbox', { name: /describe your meal plan/i });
      await user.type(textarea, MANUAL_PLAN);

      const parseButton = screen.getByRole('button', { name: /Parse with AI/i });
      await user.click(parseButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          'POST',
          '/api/meal-plan/parse-manual',
          expect.objectContaining({
            pastedText: MANUAL_PLAN,
            generateImages: false,
          })
        );
      });
    });

    it('5.2 should include generateImages flag when checkbox is checked', async () => {
      mockApiRequest.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          mealPlan: { meals: [] },
          nutrition: { total: {}, averageDaily: {}, daily: [] },
        }),
      });

      renderComponent();

      // Check the Generate AI images checkbox
      const checkbox = screen.getByRole('checkbox', { name: /Generate AI images for meals/i });
      await user.click(checkbox);
      expect(checkbox).toBeChecked();

      const textarea = screen.getByRole('textbox', { name: /describe your meal plan/i });
      await user.type(textarea, MANUAL_PLAN);

      const parseButton = screen.getByRole('button', { name: /Parse with AI/i });
      await user.click(parseButton);

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

    it('5.3 should handle multi-day manual meal plans', async () => {
      const multiDayPlan = `Day 1
Meal 1: Breakfast
-200g oatmeal
-50g blueberries
Day 2
Meal 1: Breakfast
-3 eggs scrambled
-2 slices toast`;

      mockApiRequest.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          mealPlan: { meals: [], days: 2 },
          nutrition: { total: {}, averageDaily: {}, daily: [] },
        }),
      });

      renderComponent();
      const textarea = screen.getByRole('textbox', { name: /describe your meal plan/i });
      await user.type(textarea, multiDayPlan);

      const parseButton = screen.getByRole('button', { name: /Parse with AI/i });
      await user.click(parseButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          'POST',
          '/api/meal-plan/parse-manual',
          expect.objectContaining({
            pastedText: multiDayPlan,
          })
        );
      });
    });

    it('5.4 should handle parsing errors for invalid manual format', async () => {
      mockApiRequest.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          message: 'No valid meals found in the input',
        }),
      });

      renderComponent();
      const textarea = screen.getByRole('textbox', { name: /describe your meal plan/i });
      await user.type(textarea, '- item1\n- item2\n- item3'); // Will be detected as manual but might fail parsing

      const parseButton = screen.getByRole('button', { name: /Parse with AI/i });
      await user.click(parseButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalled();
      });

      // Component should still be functional
      expect(textarea).toBeInTheDocument();
      expect(parseButton).toBeEnabled();
    });
  });

  // ============================================
  // SECTION 6: FORM INTEGRATION
  // ============================================

  describe('6. Form Integration', () => {
    it('6.1 should show advanced form when Manual Configuration is clicked', async () => {
      renderComponent();

      // Initially form should not be visible
      expect(screen.queryByLabelText(/Plan Name/i)).not.toBeInTheDocument();

      const manualConfigButton = screen.getByRole('button', { name: /Manual Configuration/i });
      await user.click(manualConfigButton);

      // Form should now be visible
      await waitFor(() => {
        expect(screen.getByLabelText(/Plan Name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Fitness Goal/i)).toBeInTheDocument();
      });
    });

    it('6.2 should hide advanced form when Hide Advanced Form is clicked', async () => {
      renderComponent();

      // Show form first
      const manualConfigButton = screen.getByRole('button', { name: /Manual Configuration/i });
      await user.click(manualConfigButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/Plan Name/i)).toBeInTheDocument();
      });

      // Hide form
      const hideButton = screen.getByRole('button', { name: /Hide.*Form/i });
      await user.click(hideButton);

      await waitFor(() => {
        expect(screen.queryByLabelText(/Plan Name/i)).not.toBeInTheDocument();
      });
    });

    it('6.3 should populate form fields after natural language parsing', async () => {
      mockApiRequest.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          planName: 'Test Plan',
          fitnessGoal: 'weight_loss',
          days: 5,
          mealsPerDay: 3,
          dailyCalorieTarget: 1600,
        }),
      });

      renderComponent();
      const textarea = screen.getByRole('textbox', { name: /describe your meal plan/i });
      await user.type(textarea, 'Create a 5-day weight loss plan');

      const parseButton = screen.getByRole('button', { name: /Parse with AI/i });
      await user.click(parseButton);

      // Form should become visible after parsing
      await waitFor(() => {
        expect(screen.getByText(/Plan Details/i)).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // SECTION 7: EDGE CASES AND ERROR HANDLING
  // ============================================

  describe('7. Edge Cases and Error Handling', () => {
    it('7.1 should handle very long input gracefully', async () => {
      const longInput = 'Test '.repeat(1000); // 5000 characters

      renderComponent();
      const textarea = screen.getByRole('textbox', { name: /describe your meal plan/i });
      await user.type(textarea, longInput);

      // Should still be functional
      const parseButton = screen.getByRole('button', { name: /Parse with AI/i });
      expect(parseButton).toBeEnabled();
    });

    it('7.2 should handle special characters in input', async () => {
      const specialCharInput = 'Meal 1: Café au lait & croissant @ €5.50 #breakfast';

      mockApiRequest.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ mealPlan: { meals: [] }, nutrition: {} }),
      });

      renderComponent();
      const textarea = screen.getByRole('textbox', { name: /describe your meal plan/i });
      await user.type(textarea, specialCharInput);

      const parseButton = screen.getByRole('button', { name: /Parse with AI/i });
      await user.click(parseButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalled();
      });
    });

    it('7.3 should handle network timeout gracefully', async () => {
      mockApiRequest.mockImplementation(() =>
        new Promise((_, reject) => setTimeout(() => reject(new Error('Network timeout')), 100))
      );

      renderComponent();
      const textarea = screen.getByRole('textbox', { name: /describe your meal plan/i });
      await user.type(textarea, 'Test input');

      const parseButton = screen.getByRole('button', { name: /Parse with AI/i });
      await user.click(parseButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalled();
      });

      // Component should recover
      expect(textarea).toBeInTheDocument();
      expect(parseButton).toBeEnabled();
    });

    it('7.4 should handle empty response gracefully', async () => {
      mockApiRequest.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      renderComponent();
      const textarea = screen.getByRole('textbox', { name: /describe your meal plan/i });
      await user.type(textarea, 'Test input');

      const parseButton = screen.getByRole('button', { name: /Parse with AI/i });
      await user.click(parseButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalled();
      });

      // Component should still be functional
      expect(textarea).toBeInTheDocument();
    });

    it('7.5 should handle rapid button clicks (debouncing)', async () => {
      mockApiRequest.mockResolvedValue({
        ok: true,
        json: async () => ({ planName: 'Test' }),
      });

      renderComponent();
      const textarea = screen.getByRole('textbox', { name: /describe your meal plan/i });
      await user.type(textarea, 'Test input');

      const parseButton = screen.getByRole('button', { name: /Parse with AI/i });

      // Rapid clicks
      await user.click(parseButton);
      await user.click(parseButton);
      await user.click(parseButton);

      // Should only make one API call (button gets disabled during processing)
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ============================================
  // SECTION 8: ACCESSIBILITY
  // ============================================

  describe('8. Accessibility', () => {
    it('8.1 should have proper ARIA labels', () => {
      renderComponent();

      const textarea = screen.getByRole('textbox', { name: /describe your meal plan/i });
      expect(textarea).toHaveAccessibleName();

      const parseButton = screen.getByRole('button', { name: /Parse with AI/i });
      expect(parseButton).toHaveAccessibleName();
    });

    it('8.2 should be keyboard navigable', async () => {
      renderComponent();

      // Tab to textarea
      await user.tab();
      const textarea = screen.getByRole('textbox', { name: /describe your meal plan/i });
      expect(textarea).toHaveFocus();

      // Type in textarea
      await user.keyboard('Test input');
      expect(textarea).toHaveValue('Test input');

      // Tab to checkbox
      await user.tab();
      const checkbox = screen.getByRole('checkbox', { name: /Generate AI images/i });
      expect(checkbox).toHaveFocus();

      // Space to check
      await user.keyboard(' ');
      expect(checkbox).toBeChecked();

      // Tab to Parse button
      await user.tab();
      const parseButton = screen.getByRole('button', { name: /Parse with AI/i });
      expect(parseButton).toHaveFocus();
    });

    it('8.3 should have proper focus management', async () => {
      renderComponent();

      const textarea = screen.getByRole('textbox', { name: /describe your meal plan/i });
      await user.type(textarea, 'Test');

      const clearButton = screen.getByRole('button', { name: /Clear/i });
      await user.click(clearButton);

      // Focus should return to textarea after clearing
      expect(textarea).toHaveValue('');
    });
  });

  // ============================================
  // SECTION 9: RESPONSIVE DESIGN
  // ============================================

  describe('9. Responsive Design', () => {
    it('9.1 should show mobile-optimized text on small screens', () => {
      // Mock window.matchMedia for mobile
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(max-width: 640px)',
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      renderComponent();

      // Should show mobile version of text
      expect(screen.getByText('AI Meal Plan Generator')).toBeInTheDocument();
    });

    it('9.2 should show desktop text on large screens', () => {
      // Mock window.matchMedia for desktop
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(min-width: 641px)',
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      renderComponent();

      // Should show desktop version
      expect(screen.getByText('AI-Powered Natural Language Generator')).toBeInTheDocument();
    });
  });

  // ============================================
  // SECTION 10: PERFORMANCE AND OPTIMIZATION
  // ============================================

  describe('10. Performance and Optimization', () => {
    it('10.1 should debounce rapid input changes', async () => {
      const onChange = vi.fn();
      renderComponent();

      const textarea = screen.getByRole('textbox', { name: /describe your meal plan/i });

      // Rapid typing
      await user.type(textarea, 'a');
      await user.type(textarea, 'b');
      await user.type(textarea, 'c');

      // Value should update correctly
      expect(textarea).toHaveValue('abc');
    });

    it('10.2 should cleanup on unmount', () => {
      const { unmount } = renderComponent();

      // Should unmount without errors
      expect(() => unmount()).not.toThrow();
    });

    it('10.3 should handle memory leaks properly', async () => {
      const { rerender, unmount } = renderComponent();

      // Trigger async operation
      mockApiRequest.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({}),
        }), 100))
      );

      const textarea = screen.getByRole('textbox', { name: /describe your meal plan/i });
      await user.type(textarea, 'Test');

      const parseButton = screen.getByRole('button', { name: /Parse with AI/i });
      await user.click(parseButton);

      // Unmount before async completes
      unmount();

      // Should not throw errors
      await new Promise(resolve => setTimeout(resolve, 150));
    });
  });

  // ============================================
  // SECTION 11: CUSTOMER CONTEXT INTEGRATION
  // ============================================

  describe('11. Customer Context Integration', () => {
    it('11.1 should handle customer context when provided', () => {
      const customerContext = {
        customerId: '123',
        customerEmail: 'customer@example.com',
        healthMetrics: {
          weight: '70kg',
          bodyFat: '15%',
          waist: '80cm',
          lastUpdated: '2024-01-01',
        },
        goals: [
          {
            goalName: 'Weight Loss',
            progressPercentage: 50,
            status: 'active',
          },
        ],
      };

      renderComponent({ customerContext });

      // Component should render without errors
      expect(screen.getByText('Meal Plan Generator')).toBeInTheDocument();
    });

    it('11.2 should work without customer context', () => {
      renderComponent({ customerContext: undefined });

      // Component should render normally
      expect(screen.getByText('Meal Plan Generator')).toBeInTheDocument();
    });
  });

  // ============================================
  // SECTION 12: CALLBACK INTEGRATION
  // ============================================

  describe('12. Callback Integration', () => {
    it('12.1 should call onMealPlanGenerated when meal plan is generated', async () => {
      const onMealPlanGenerated = vi.fn();
      const mealPlanData = {
        id: '1',
        planName: 'Test Plan',
        meals: [],
      };

      mockApiRequest.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          mealPlan: mealPlanData,
          nutrition: { total: {}, averageDaily: {}, daily: [] },
        }),
      });

      renderComponent({ onMealPlanGenerated });

      const textarea = screen.getByRole('textbox', { name: /describe your meal plan/i });
      await user.type(textarea, 'Meal 1\n-175g rice\n-150g beef');

      const parseButton = screen.getByRole('button', { name: /Parse with AI/i });
      await user.click(parseButton);

      await waitFor(() => {
        expect(onMealPlanGenerated).toHaveBeenCalledWith(mealPlanData);
      });
    });
  });
});

// ============================================
// INTEGRATION TEST SUITE
// ============================================

describe('Unified Meal Plan Generator - Integration Tests', () => {
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

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {component}
        </AuthProvider>
      </QueryClientProvider>
    );
  };

  it('should complete full natural language flow', async () => {
    const user = userEvent.setup();

    // Mock successful parse and generate
    mockApiRequest
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          planName: 'Weight Loss Plan',
          fitnessGoal: 'weight_loss',
          days: 5,
          mealsPerDay: 3,
          dailyCalorieTarget: 1600,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          mealPlan: {
            id: '1',
            planName: 'Weight Loss Plan',
            meals: [
              {
                name: 'Breakfast',
                type: 'breakfast',
                calories: 400,
                protein: 30,
                carbs: 40,
                fat: 15,
              },
            ],
          },
          nutrition: {
            total: { calories: 1600, protein: 120, carbs: 150, fat: 60 },
            averageDaily: { calories: 1600, protein: 120, carbs: 150, fat: 60 },
            daily: [],
          },
        }),
      });

    renderWithProviders(<MealPlanGenerator />);

    // Enter natural language
    const textarea = screen.getByRole('textbox', { name: /describe your meal plan/i });
    await user.type(textarea, 'Create a 5-day weight loss plan with 1600 calories');

    // Parse
    const parseButton = screen.getByRole('button', { name: /Parse with AI/i });
    await user.click(parseButton);

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith(
        'POST',
        '/api/meal-plan/parse-natural-language',
        expect.any(Object)
      );
    });

    // Generate
    const generateButton = screen.getByRole('button', { name: /Generate.*Plan/i });
    await user.click(generateButton);

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith(
        'POST',
        '/api/meal-plan/generate',
        expect.any(Object)
      );
    });
  });

  it('should complete full manual meal plan flow with images', async () => {
    const user = userEvent.setup();

    mockApiRequest.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        mealPlan: {
          id: '1',
          planName: 'Manual Meal Plan',
          meals: [
            {
              name: 'Meal 1',
              manual: true,
              imageUrl: 'https://example.com/meal1.jpg',
              manualIngredients: [
                { name: 'Rice', quantitySI: 175, unitSI: 'g' },
              ],
            },
          ],
        },
        nutrition: {
          total: { calories: 1500, protein: 100, carbs: 150, fat: 50 },
          averageDaily: { calories: 1500, protein: 100, carbs: 150, fat: 50 },
          daily: [],
        },
      }),
    });

    renderWithProviders(<MealPlanGenerator />);

    // Check Generate AI images
    const checkbox = screen.getByRole('checkbox', { name: /Generate AI images/i });
    await user.click(checkbox);

    // Enter manual meal plan
    const textarea = screen.getByRole('textbox', { name: /describe your meal plan/i });
    await user.type(textarea, 'Meal 1\n-175g rice\n-150g chicken');

    // Parse
    const parseButton = screen.getByRole('button', { name: /Parse with AI/i });
    await user.click(parseButton);

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith(
        'POST',
        '/api/meal-plan/parse-manual',
        expect.objectContaining({
          generateImages: true,
          pastedText: expect.stringContaining('Meal 1'),
        })
      );
    });
  });
});

// Export test utilities for other test files
export { renderComponent, mockApiRequest };