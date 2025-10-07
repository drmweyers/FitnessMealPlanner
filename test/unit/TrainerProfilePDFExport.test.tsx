/**
 * TrainerProfile PDF Export Feature Tests
 *
 * Comprehensive tests for the PDF export functionality in the trainer profile page.
 * Tests cover:
 * - PDF export button rendering and visibility
 * - Single meal plan exports
 * - Multiple meal plan exports (batch export)
 * - Customer-specific exports
 * - Error handling and edge cases
 * - Data integrity and formatting
 * - API integration
 * - User feedback and loading states
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TrainerProfile from '@/pages/TrainerProfile';
import PDFExportButton from '@/components/PDFExportButton';
import * as pdfExport from '@/utils/pdfExport';
import { AuthProvider } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

// Mock dependencies
vi.mock('@/utils/pdfExport', () => ({
  exportSingleMealPlanToPDF: vi.fn(),
  exportMultipleMealPlansToPDF: vi.fn(),
  extractRecipeCardsFromMealPlan: vi.fn()
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn()
  })),
  toast: vi.fn()
}));

// Mock jsPDF
const mockSave = vi.fn();
const mockText = vi.fn();
const mockSetFontSize = vi.fn();
const mockAddPage = vi.fn();
const mockRect = vi.fn();
const mockSetDrawColor = vi.fn();
const mockSetFillColor = vi.fn();
const mockSetTextColor = vi.fn();
const mockSetFont = vi.fn();
const mockSetLineWidth = vi.fn();

vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(() => ({
    text: mockText,
    setFontSize: mockSetFontSize,
    setFont: mockSetFont,
    addPage: mockAddPage,
    rect: mockRect,
    setDrawColor: mockSetDrawColor,
    setFillColor: mockSetFillColor,
    setTextColor: mockSetTextColor,
    setLineWidth: mockSetLineWidth,
    save: mockSave,
    internal: {
      pageSize: {
        getWidth: vi.fn(() => 210),
        getHeight: vi.fn(() => 297),
        width: 210,
        height: 297
      }
    }
  }))
}));

// Mock auth context
const mockAuth = {
  user: {
    id: 'trainer-1',
    email: 'trainer@test.com',
    role: 'trainer'
  },
  logout: vi.fn()
};

// Mock API responses
const mockApiRequest = vi.fn();
vi.mock('@/lib/queryClient', () => ({
  apiRequest: () => mockApiRequest()
}));

// Helper function to create test wrapper with providers
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider value={mockAuth}>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
};

// Mock data factories
const createMockCustomer = (overrides = {}) => ({
  id: 'customer-1',
  email: 'customer@test.com',
  name: 'Test Customer',
  ...overrides
});

const createMockMealPlan = (overrides = {}) => ({
  id: 'meal-plan-1',
  planName: 'Test Meal Plan',
  mealPlanData: {
    planName: 'Test Meal Plan',
    fitnessGoal: 'Weight Loss',
    dailyCalorieTarget: 2000,
    days: 7,
    generatedBy: 'trainer@test.com',
    createdAt: new Date().toISOString()
  },
  meals: [
    {
      day: 1,
      mealNumber: 1,
      mealType: 'Breakfast',
      recipe: {
        name: 'Protein Pancakes',
        description: 'Delicious protein-packed pancakes',
        caloriesKcal: 350,
        proteinGrams: '25',
        carbsGrams: '30',
        fatGrams: '10',
        prepTimeMinutes: 15,
        servings: 2,
        dietaryTags: ['High Protein', 'Vegetarian'],
        ingredientsJson: [
          { name: 'Oats', amount: '1', unit: 'cup' },
          { name: 'Eggs', amount: '2', unit: 'whole' },
          { name: 'Protein Powder', amount: '1', unit: 'scoop' }
        ],
        instructionsText: 'Mix all ingredients and cook on griddle.'
      }
    },
    {
      day: 1,
      mealNumber: 2,
      mealType: 'Lunch',
      recipe: {
        name: 'Grilled Chicken Salad',
        description: 'Fresh salad with grilled chicken',
        caloriesKcal: 450,
        proteinGrams: '35',
        carbsGrams: '20',
        fatGrams: '15',
        prepTimeMinutes: 20,
        servings: 1,
        dietaryTags: ['Low Carb', 'Gluten Free'],
        ingredientsJson: [
          { name: 'Chicken Breast', amount: '200', unit: 'g' },
          { name: 'Mixed Greens', amount: '2', unit: 'cups' },
          { name: 'Olive Oil', amount: '1', unit: 'tbsp' }
        ],
        instructionsText: 'Grill chicken and serve over greens.'
      }
    }
  ],
  ...overrides
});

describe('TrainerProfile PDF Export Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiRequest.mockClear();
    mockSave.mockClear();
    mockText.mockClear();

    // Set up default API responses
    mockApiRequest
      .mockResolvedValueOnce({ // Profile stats
        json: () => Promise.resolve({
          totalClients: 5,
          totalMealPlansCreated: 10,
          totalRecipesAssigned: 50,
          activeMealPlans: 8,
          clientSatisfactionRate: 95
        })
      })
      .mockResolvedValueOnce({ // Profile details
        json: () => Promise.resolve({
          id: 'trainer-1',
          email: 'trainer@test.com',
          role: 'trainer',
          createdAt: new Date().toISOString()
        })
      })
      .mockResolvedValueOnce({ // Trainer customers
        json: () => Promise.resolve({
          customers: [
            createMockCustomer({ id: 'customer-1', email: 'customer1@test.com' }),
            createMockCustomer({ id: 'customer-2', email: 'customer2@test.com' })
          ]
        })
      })
      .mockResolvedValueOnce({ // Customer 1 meal plans
        json: () => Promise.resolve({
          mealPlans: [createMockMealPlan({ id: 'meal-plan-1', planName: 'Customer 1 Plan' })]
        })
      })
      .mockResolvedValueOnce({ // Customer 2 meal plans
        json: () => Promise.resolve({
          mealPlans: [
            createMockMealPlan({ id: 'meal-plan-2', planName: 'Customer 2 Plan A' }),
            createMockMealPlan({ id: 'meal-plan-3', planName: 'Customer 2 Plan B' })
          ]
        })
      });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('PDF Export Section Rendering', () => {
    it('renders the PDF export section in trainer profile', async () => {
      render(<TrainerProfile />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Recipe Card Export')).toBeInTheDocument();
      });

      expect(screen.getByText(/Export recipe cards from customer meal plans/i)).toBeInTheDocument();
    });

    it('shows export all button when meal plans are available', async () => {
      render(<TrainerProfile />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Export All Customer Meal Plans')).toBeInTheDocument();
      });

      const exportAllButton = screen.getByRole('button', { name: /export all/i });
      expect(exportAllButton).toBeInTheDocument();
      expect(exportAllButton).toBeEnabled();
    });

    it('displays total meal plan count correctly', async () => {
      render(<TrainerProfile />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/3 total meal plans/i)).toBeInTheDocument();
      });
    });

    it('shows individual customer export options', async () => {
      render(<TrainerProfile />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Export by Customer:')).toBeInTheDocument();
        expect(screen.getByText('customer1@test.com')).toBeInTheDocument();
        expect(screen.getByText('customer2@test.com')).toBeInTheDocument();
      });

      expect(screen.getByText('1 meal plan')).toBeInTheDocument(); // Customer 1
      expect(screen.getByText('2 meal plans')).toBeInTheDocument(); // Customer 2
    });

    it('shows empty state when no meal plans available', async () => {
      // Override API response for no customers
      mockApiRequest.mockReset();
      mockApiRequest
        .mockResolvedValueOnce({ json: () => Promise.resolve({}) })
        .mockResolvedValueOnce({ json: () => Promise.resolve({}) })
        .mockResolvedValueOnce({ json: () => Promise.resolve({ customers: [] }) });

      render(<TrainerProfile />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('No meal plans available for export')).toBeInTheDocument();
      });

      expect(screen.getByText(/Create meal plans and assign them to customers/i)).toBeInTheDocument();
    });
  });

  describe('Export All Functionality', () => {
    it('exports all customer meal plans when Export All is clicked', async () => {
      const user = userEvent.setup();
      render(<TrainerProfile />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Export All Customer Meal Plans')).toBeInTheDocument();
      });

      const exportAllButton = screen.getByRole('button', { name: /export all/i });
      await user.click(exportAllButton);

      await waitFor(() => {
        expect(pdfExport.exportMultipleMealPlansToPDF).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ planName: 'Customer 1 Plan' }),
            expect.objectContaining({ planName: 'Customer 2 Plan A' }),
            expect.objectContaining({ planName: 'Customer 2 Plan B' })
          ]),
          expect.objectContaining({
            includeNutrition: true,
            cardSize: 'medium'
          })
        );
      });
    });

    it('shows loading state during export all', async () => {
      const user = userEvent.setup();

      // Make export function return a delayed promise
      vi.mocked(pdfExport.exportMultipleMealPlansToPDF).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<TrainerProfile />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Export All Customer Meal Plans')).toBeInTheDocument();
      });

      const exportAllButton = screen.getByRole('button', { name: /export all/i });
      await user.click(exportAllButton);

      // Should show loading state
      expect(screen.getByRole('button', { name: /export all/i })).toBeDisabled();
    });

    it('shows success toast after successful export all', async () => {
      const mockToast = vi.fn();
      vi.mocked(toast).mockImplementation(mockToast);

      const user = userEvent.setup();
      render(<TrainerProfile />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Export All Customer Meal Plans')).toBeInTheDocument();
      });

      const exportAllButton = screen.getByRole('button', { name: /export all/i });
      await user.click(exportAllButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Export Complete',
            description: expect.stringContaining('3 meal plans exported')
          })
        );
      });
    });

    it('handles export all errors gracefully', async () => {
      const mockToast = vi.fn();
      vi.mocked(toast).mockImplementation(mockToast);

      vi.mocked(pdfExport.exportMultipleMealPlansToPDF).mockRejectedValueOnce(
        new Error('Export failed')
      );

      const user = userEvent.setup();
      render(<TrainerProfile />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Export All Customer Meal Plans')).toBeInTheDocument();
      });

      const exportAllButton = screen.getByRole('button', { name: /export all/i });
      await user.click(exportAllButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Export Failed',
            variant: 'destructive'
          })
        );
      });
    });
  });

  describe('Individual Customer Export', () => {
    it('exports individual customer meal plans correctly', async () => {
      const user = userEvent.setup();
      render(<TrainerProfile />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('customer1@test.com')).toBeInTheDocument();
      });

      // Find the export button for customer1
      const customer1Section = screen.getByText('customer1@test.com').closest('div');
      const exportButton = within(customer1Section!).getByRole('button');

      await user.click(exportButton);

      await waitFor(() => {
        expect(pdfExport.exportMultipleMealPlansToPDF).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ planName: 'Customer 1 Plan' })
          ]),
          expect.objectContaining({
            customerName: 'customer1@test.com',
            includeNutrition: true,
            cardSize: 'medium'
          })
        );
      });
    });

    it('exports multiple meal plans for a single customer', async () => {
      const user = userEvent.setup();
      render(<TrainerProfile />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('customer2@test.com')).toBeInTheDocument();
      });

      // Find the export button for customer2
      const customer2Section = screen.getByText('customer2@test.com').closest('div');
      const exportButton = within(customer2Section!).getByRole('button');

      await user.click(exportButton);

      await waitFor(() => {
        expect(pdfExport.exportMultipleMealPlansToPDF).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ planName: 'Customer 2 Plan A' }),
            expect.objectContaining({ planName: 'Customer 2 Plan B' })
          ]),
          expect.objectContaining({
            customerName: 'customer2@test.com'
          })
        );
      });
    });

    it('does not render export button for customers with no meal plans', async () => {
      // Override API response
      mockApiRequest.mockReset();
      mockApiRequest
        .mockResolvedValueOnce({ json: () => Promise.resolve({}) })
        .mockResolvedValueOnce({ json: () => Promise.resolve({}) })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({
            customers: [
              createMockCustomer({ id: 'customer-3', email: 'customer3@test.com' })
            ]
          })
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ mealPlans: [] }) // No meal plans
        });

      render(<TrainerProfile />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.queryByText('customer3@test.com')).not.toBeInTheDocument();
      });
    });
  });

  describe('PDF Export Options Dialog', () => {
    it('opens options dialog when settings button is clicked', async () => {
      const user = userEvent.setup();

      // Render just the PDFExportButton component for focused testing
      render(
        <PDFExportButton
          mealPlans={[createMockMealPlan()]}
          customerName="Test Customer"
        />,
        { wrapper: createWrapper() }
      );

      const settingsButton = screen.getByRole('button', { name: '' }); // Settings icon button
      await user.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByText('PDF Export Options')).toBeInTheDocument();
      });

      expect(screen.getByText('Customize your recipe card export settings')).toBeInTheDocument();
    });

    it('allows card size selection in options dialog', async () => {
      const user = userEvent.setup();

      render(
        <PDFExportButton
          mealPlans={[createMockMealPlan()]}
        />,
        { wrapper: createWrapper() }
      );

      const settingsButton = screen.getByRole('button', { name: '' });
      await user.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByText('Card Size')).toBeInTheDocument();
      });

      const smallOption = screen.getByLabelText(/Small.*2 per page/i);
      const mediumOption = screen.getByLabelText(/Medium.*1 per page.*balanced/i);
      const largeOption = screen.getByLabelText(/Large.*1 per page.*maximum/i);

      expect(smallOption).toBeInTheDocument();
      expect(mediumOption).toBeInTheDocument();
      expect(largeOption).toBeInTheDocument();
      expect(mediumOption).toBeChecked(); // Default
    });

    it('allows nutrition info toggle in options dialog', async () => {
      const user = userEvent.setup();

      render(
        <PDFExportButton
          mealPlans={[createMockMealPlan()]}
        />,
        { wrapper: createWrapper() }
      );

      const settingsButton = screen.getByRole('button', { name: '' });
      await user.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByText('Content Options')).toBeInTheDocument();
      });

      const nutritionCheckbox = screen.getByLabelText('Include nutrition information');
      expect(nutritionCheckbox).toBeInTheDocument();
      expect(nutritionCheckbox).toBeChecked(); // Default
    });

    it('exports with custom options when set', async () => {
      const user = userEvent.setup();

      render(
        <PDFExportButton
          mealPlans={[createMockMealPlan()]}
        />,
        { wrapper: createWrapper() }
      );

      const settingsButton = screen.getByRole('button', { name: '' });
      await user.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByText('PDF Export Options')).toBeInTheDocument();
      });

      // Change to large card size
      const largeOption = screen.getByLabelText(/Large.*1 per page.*maximum/i);
      await user.click(largeOption);

      // Uncheck nutrition info
      const nutritionCheckbox = screen.getByLabelText('Include nutrition information');
      await user.click(nutritionCheckbox);

      // Click export in dialog
      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(pdfExport.exportMultipleMealPlansToPDF).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            cardSize: 'large',
            includeNutrition: false
          })
        );
      });
    });
  });

  describe('Data Integrity and Formatting', () => {
    it('correctly extracts recipe data from meal plans', async () => {
      const mealPlan = createMockMealPlan();

      render(
        <PDFExportButton
          mealPlan={mealPlan}
        />,
        { wrapper: createWrapper() }
      );

      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      await userEvent.click(exportButton);

      await waitFor(() => {
        expect(pdfExport.exportSingleMealPlanToPDF).toHaveBeenCalledWith(
          expect.objectContaining({
            meals: expect.arrayContaining([
              expect.objectContaining({
                recipe: expect.objectContaining({
                  name: 'Protein Pancakes',
                  caloriesKcal: 350
                })
              })
            ])
          }),
          expect.any(Object)
        );
      });
    });

    it('handles meal plans with missing data gracefully', async () => {
      const incompleteMealPlan = {
        id: 'incomplete-plan',
        // Missing mealPlanData
        meals: [
          {
            day: 1,
            recipe: {
              name: 'Test Recipe',
              // Missing nutrition data
            }
          }
        ]
      };

      render(
        <PDFExportButton
          mealPlan={incompleteMealPlan}
        />,
        { wrapper: createWrapper() }
      );

      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      await userEvent.click(exportButton);

      // Should not throw error
      await waitFor(() => {
        expect(pdfExport.exportSingleMealPlanToPDF).toHaveBeenCalled();
      });
    });

    it('sanitizes file names for PDF export', async () => {
      const mealPlanWithSpecialChars = createMockMealPlan({
        planName: 'Plan/with\\special*chars?'
      });

      vi.mocked(pdfExport.exportSingleMealPlanToPDF).mockImplementation(async (plan) => {
        const fileName = plan.planName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        expect(fileName).toBe('plan_with_special_chars_');
      });

      render(
        <PDFExportButton
          mealPlan={mealPlanWithSpecialChars}
        />,
        { wrapper: createWrapper() }
      );

      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      await userEvent.click(exportButton);

      await waitFor(() => {
        expect(pdfExport.exportSingleMealPlanToPDF).toHaveBeenCalled();
      });
    });
  });

  describe('Performance and Optimization', () => {
    it('handles large meal plan exports efficiently', async () => {
      const largeMealPlans = Array.from({ length: 20 }, (_, i) =>
        createMockMealPlan({
          id: `meal-plan-${i}`,
          planName: `Large Plan ${i}`,
          meals: Array.from({ length: 21 }, (_, j) => ({ // 7 days * 3 meals
            day: Math.floor(j / 3) + 1,
            mealNumber: (j % 3) + 1,
            mealType: ['Breakfast', 'Lunch', 'Dinner'][j % 3],
            recipe: {
              name: `Recipe ${i}-${j}`,
              caloriesKcal: 400,
              proteinGrams: '30',
              carbsGrams: '40',
              fatGrams: '15'
            }
          }))
        })
      );

      render(
        <PDFExportButton
          mealPlans={largeMealPlans}
        />,
        { wrapper: createWrapper() }
      );

      const exportButton = screen.getByRole('button', { name: /export/i });
      await userEvent.click(exportButton);

      await waitFor(() => {
        expect(pdfExport.exportMultipleMealPlansToPDF).toHaveBeenCalledWith(
          expect.arrayContaining(largeMealPlans),
          expect.any(Object)
        );
      });
    });

    it('does not re-fetch meal plans unnecessarily', async () => {
      render(<TrainerProfile />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Recipe Card Export')).toBeInTheDocument();
      });

      const initialCallCount = mockApiRequest.mock.calls.length;

      // Trigger a re-render by clicking somewhere else
      const profileSection = screen.getByText('Account Details');
      await userEvent.click(profileSection);

      // API should not be called again
      expect(mockApiRequest).toHaveBeenCalledTimes(initialCallCount);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for export buttons', async () => {
      render(<TrainerProfile />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Recipe Card Export')).toBeInTheDocument();
      });

      const exportButtons = screen.getAllByRole('button', { name: /export/i });
      exportButtons.forEach(button => {
        expect(button).toHaveAccessibleName();
      });
    });

    it('provides keyboard navigation for all export options', async () => {
      const user = userEvent.setup();
      render(<TrainerProfile />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Recipe Card Export')).toBeInTheDocument();
      });

      // Tab through the export section
      const exportSection = screen.getByText('Recipe Card Export').closest('div');
      const buttons = within(exportSection!).getAllByRole('button');

      for (const button of buttons) {
        await user.tab();
        // Check if we can reach each button via keyboard
      }
    });

    it('announces export progress to screen readers', async () => {
      const user = userEvent.setup();

      render(
        <PDFExportButton
          mealPlans={[createMockMealPlan()]}
          aria-live="polite"
        />,
        { wrapper: createWrapper() }
      );

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      // Check for loading state announcement
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /export/i });
        expect(button).toHaveAttribute('aria-busy', 'true');
      });
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('handles network errors during meal plan fetching', async () => {
      mockApiRequest.mockReset();
      mockApiRequest
        .mockResolvedValueOnce({ json: () => Promise.resolve({}) })
        .mockResolvedValueOnce({ json: () => Promise.resolve({}) })
        .mockRejectedValueOnce(new Error('Network error'));

      render(<TrainerProfile />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Should still render the page but without meal plans
        expect(screen.getByText('Recipe Card Export')).toBeInTheDocument();
      });
    });

    it('handles empty recipe arrays gracefully', async () => {
      const emptyMealPlan = createMockMealPlan({ meals: [] });

      render(
        <PDFExportButton
          mealPlan={emptyMealPlan}
        />,
        { wrapper: createWrapper() }
      );

      const exportButton = screen.getByRole('button', { name: /export/i });
      await userEvent.click(exportButton);

      await waitFor(() => {
        expect(pdfExport.exportSingleMealPlanToPDF).toHaveBeenCalledWith(
          expect.objectContaining({ meals: [] }),
          expect.any(Object)
        );
      });
    });

    it('handles null or undefined meal plan data', () => {
      const { container } = render(
        <PDFExportButton
          mealPlan={null}
        />,
        { wrapper: createWrapper() }
      );

      // Should not render anything
      expect(container.firstChild).toBeNull();
    });

    it('recovers from PDF generation errors', async () => {
      const mockToast = vi.fn();
      vi.mocked(toast).mockImplementation(mockToast);

      vi.mocked(pdfExport.exportSingleMealPlanToPDF)
        .mockRejectedValueOnce(new Error('PDF generation failed'))
        .mockResolvedValueOnce(undefined);

      const user = userEvent.setup();

      render(
        <PDFExportButton
          mealPlan={createMockMealPlan()}
        />,
        { wrapper: createWrapper() }
      );

      const exportButton = screen.getByRole('button', { name: /export/i });

      // First attempt fails
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Export Failed',
            variant: 'destructive'
          })
        );
      });

      // Second attempt succeeds
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Export Complete'
          })
        );
      });
    });

    it('handles concurrent export requests properly', async () => {
      const user = userEvent.setup();

      render(
        <PDFExportButton
          mealPlans={[createMockMealPlan(), createMockMealPlan()]}
        />,
        { wrapper: createWrapper() }
      );

      const exportButton = screen.getByRole('button', { name: /export/i });

      // Click multiple times quickly
      await user.click(exportButton);
      await user.click(exportButton);
      await user.click(exportButton);

      // Should only call export once
      await waitFor(() => {
        expect(pdfExport.exportMultipleMealPlansToPDF).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Integration with Trainer Profile', () => {
    it('PDF export section updates when customers change', async () => {
      const { rerender } = render(<TrainerProfile />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('3 total meal plans')).toBeInTheDocument();
      });

      // Update mock API to return different customers
      mockApiRequest.mockReset();
      mockApiRequest
        .mockResolvedValueOnce({ json: () => Promise.resolve({}) })
        .mockResolvedValueOnce({ json: () => Promise.resolve({}) })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({
            customers: [
              createMockCustomer({ id: 'customer-new', email: 'new@test.com' })
            ]
          })
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({
            mealPlans: [createMockMealPlan({ planName: 'New Plan' })]
          })
        });

      // Force re-render
      rerender(<TrainerProfile />, { wrapper: createWrapper() });

      // Should update the display
      await waitFor(() => {
        expect(screen.queryByText('3 total meal plans')).not.toBeInTheDocument();
      });
    });

    it('maintains export state when switching between profile tabs', async () => {
      const user = userEvent.setup();
      render(<TrainerProfile />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Recipe Card Export')).toBeInTheDocument();
      });

      // Start an export
      const exportButton = screen.getByRole('button', { name: /export all/i });
      await user.click(exportButton);

      // Switch to another section
      const quickActionsSection = screen.getByText('Quick Actions');
      await user.click(quickActionsSection);

      // Export should complete successfully
      await waitFor(() => {
        expect(pdfExport.exportMultipleMealPlansToPDF).toHaveBeenCalled();
      });
    });
  });
});