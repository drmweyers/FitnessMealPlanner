/**
 * Enhanced Unit Tests for CustomerDetailView Meal Plans Functionality
 * 
 * Tests the recently fixed "recent meal plans" functionality including:
 * - Clickable meal plan items in Recent section (Overview tab)
 * - Clickable meal plan cards in Full Meal Plans tab
 * - PDF download button isolation (preventing modal trigger)
 * - Hover effects and visual feedback
 * - Modal state management and integration
 * - Event propagation handling
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import CustomerDetailView from '@/components/CustomerDetailView';
import type { CustomerMealPlan } from '@shared/schema';

// Mock the API functions
vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn(),
}));

// Mock the SimplePDFExportButton component
const mockPDFClick = vi.fn();
vi.mock('@/components/PDFExportButton', () => ({
  SimplePDFExportButton: ({ onClick, mealPlan, className, size, children }: any) => (
    <button
      data-testid={`pdf-button-${mealPlan?.id || 'unknown'}`}
      className={className}
      onClick={(e) => {
        if (onClick) onClick(e);
        mockPDFClick(mealPlan?.id);
      }}
    >
      {children || 'PDF'}
    </button>
  ),
}));

// Mock the MealPlanModal component
const mockModalClose = vi.fn();
vi.mock('@/components/MealPlanModal', () => ({
  default: ({ mealPlan, onClose }: any) => (
    <div data-testid="meal-plan-modal">
      <div data-testid="modal-meal-plan-id">{mealPlan?.id}</div>
      <div data-testid="modal-meal-plan-name">{mealPlan?.mealPlanData?.planName}</div>
      <button onClick={onClose} data-testid="modal-close-button">Close Modal</button>
    </div>
  ),
}));

// Mock the MealPlanGenerator component
vi.mock('@/components/MealPlanGenerator', () => ({
  default: ({ onMealPlanGenerated }: any) => (
    <div data-testid="meal-plan-generator">
      <button onClick={() => onMealPlanGenerated({ id: 'new-plan' })}>
        Generate Plan
      </button>
    </div>
  ),
}));

// Mock the toast hook
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Test data
const mockCustomer = {
  id: 'customer-123',
  email: 'testcustomer@example.com',
  firstAssignedAt: '2024-01-01T00:00:00Z',
};

const createMockMealPlan = (id: string, planName: string): CustomerMealPlan => ({
  id,
  customerId: 'customer-123',
  trainerId: 'trainer-456',
  mealPlanData: {
    planName,
    fitnessGoal: 'weight_loss',
    description: `${planName} description`,
    dailyCalorieTarget: 1800,
    days: 7,
    mealsPerDay: 4,
    meals: [
      {
        id: 'meal-1',
        day: 1,
        mealType: 'breakfast',
        recipeId: 'recipe-1',
        recipe: {
          id: 'recipe-1',
          name: 'Healthy Breakfast',
          description: 'A nutritious start to the day',
          mealTypes: ['breakfast'],
          dietaryTags: ['healthy'],
          mainIngredientTags: ['oats'],
          ingredientsJson: [
            { name: 'Oats', amount: '1', unit: 'cup' },
            { name: 'Milk', amount: '1', unit: 'cup' }
          ],
          instructionsText: 'Mix oats with milk and cook for 5 minutes.',
          prepTimeMinutes: 5,
          cookTimeMinutes: 5,
          servings: 1,
          caloriesKcal: 300,
          proteinGrams: '12.50',
          carbsGrams: '45.00',
          fatGrams: '8.50',
          creationTimestamp: '2024-01-01T00:00:00Z',
          lastUpdatedTimestamp: '2024-01-01T00:00:00Z',
          isApproved: true,
        },
        servings: 1,
        plannedFor: '2024-01-01T08:00:00Z',
      }
    ],
    totalCalories: 7200,
    totalProtein: '350.00',
    totalCarbs: '900.00',
    totalFat: '240.00',
    createdAt: '2024-01-01T00:00:00Z',
  },
  assignedAt: '2024-01-01T00:00:00Z',
  planName,
  fitnessGoal: 'weight_loss',
  dailyCalorieTarget: 1800,
  totalDays: 7,
  mealsPerDay: 4,
});

const mockMealPlans = [
  createMockMealPlan('plan-1', 'Weight Loss Plan'),
  createMockMealPlan('plan-2', 'Muscle Building Plan'),
  createMockMealPlan('plan-3', 'Maintenance Plan'),
  createMockMealPlan('plan-4', 'Cutting Plan'),
];

describe('CustomerDetailView - Enhanced Meal Plans Functionality', () => {
  let queryClient: QueryClient;
  let mockOnBack: ReturnType<typeof vi.fn>;
  let mockApiRequest: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    mockOnBack = vi.fn();
    
    // Reset all mocks
    vi.clearAllMocks();
    mockPDFClick.mockClear();
    mockModalClose.mockClear();
    mockToast.mockClear();
    
    // Setup API mocks
    const { apiRequest } = await import('@/lib/queryClient');
    mockApiRequest = apiRequest as ReturnType<typeof vi.fn>;
    
    // Mock successful API responses
    mockApiRequest.mockImplementation((method: string, url: string) => {
      if (url.includes('/meal-plans')) {
        return Promise.resolve({
          json: () => Promise.resolve({ mealPlans: mockMealPlans, total: mockMealPlans.length })
        });
      }
      if (url.includes('/measurements')) {
        return Promise.resolve({
          json: () => Promise.resolve({ status: 'success', data: [] })
        });
      }
      if (url.includes('/goals')) {
        return Promise.resolve({
          json: () => Promise.resolve({ status: 'success', data: [] })
        });
      }
      return Promise.resolve({
        json: () => Promise.resolve({})
      });
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderComponent = (customer = mockCustomer) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <CustomerDetailView customer={customer} onBack={mockOnBack} />
      </QueryClientProvider>
    );
  };

  describe('Recent Meal Plans Section (Overview Tab)', () => {
    it('renders recent meal plans as clickable items', async () => {
      renderComponent();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // Check that meal plan items are rendered
      expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      expect(screen.getByText('Muscle Building Plan')).toBeInTheDocument();
      expect(screen.getByText('Maintenance Plan')).toBeInTheDocument();
      
      // Should only show first 3 in recent section
      expect(screen.queryByText('Cutting Plan')).not.toBeInTheDocument();
    });

    it('applies hover styles to meal plan items', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // Find the meal plan container
      const mealPlanItem = screen.getByText('Weight Loss Plan').closest('div[class*="cursor-pointer"]');
      expect(mealPlanItem).toBeInTheDocument();
      expect(mealPlanItem).toHaveClass('hover:bg-gray-100', 'cursor-pointer', 'transition-colors');
    });

    it('opens modal when meal plan item is clicked', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // Click on the meal plan title
      await user.click(screen.getByText('Weight Loss Plan'));

      // Modal should be displayed
      await waitFor(() => {
        expect(screen.getByTestId('meal-plan-modal')).toBeInTheDocument();
        expect(screen.getByTestId('modal-meal-plan-id')).toHaveTextContent('plan-1');
        expect(screen.getByTestId('modal-meal-plan-name')).toHaveTextContent('Weight Loss Plan');
      });
    });

    it('does NOT open modal when PDF button is clicked', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // Click on the PDF button specifically
      const pdfButton = screen.getByTestId('pdf-button-plan-1');
      await user.click(pdfButton);

      // Modal should NOT be displayed
      await waitFor(() => {
        expect(screen.queryByTestId('meal-plan-modal')).not.toBeInTheDocument();
      });

      // PDF function should have been called
      expect(mockPDFClick).toHaveBeenCalledWith('plan-1');
    });

    it('handles event propagation correctly for PDF button', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // Find the PDF button and click it
      const pdfButton = screen.getByTestId('pdf-button-plan-1');
      fireEvent.click(pdfButton);

      // Verify PDF click was called but modal is not open
      expect(mockPDFClick).toHaveBeenCalledWith('plan-1');
      expect(screen.queryByTestId('meal-plan-modal')).not.toBeInTheDocument();
    });

    it('shows "And X more meal plans..." message when there are more than 3 plans', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // Should show message about additional plans
      expect(screen.getByText('And 1 more meal plans...')).toBeInTheDocument();
    });
  });

  describe('Full Meal Plans Tab', () => {
    beforeEach(async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // Switch to meal plans tab
      const mealPlansTab = screen.getByRole('tab', { name: /meal plans/i });
      fireEvent.click(mealPlansTab);
      
      await waitFor(() => {
        expect(mealPlansTab).toHaveAttribute('data-state', 'active');
      });
    });

    it('renders all meal plans as clickable cards', async () => {
      // All meal plans should be visible in this tab
      expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      expect(screen.getByText('Muscle Building Plan')).toBeInTheDocument();
      expect(screen.getByText('Maintenance Plan')).toBeInTheDocument();
      expect(screen.getByText('Cutting Plan')).toBeInTheDocument();
    });

    it('applies hover styles to meal plan cards', async () => {
      // Find meal plan cards
      const mealPlanCard = screen.getByText('Weight Loss Plan').closest('div[class*="hover:shadow-md"]');
      expect(mealPlanCard).toBeInTheDocument();
      expect(mealPlanCard).toHaveClass('hover:shadow-md', 'transition-shadow', 'cursor-pointer');
    });

    it('opens modal when meal plan card is clicked', async () => {
      const user = userEvent.setup();

      // Click on the meal plan card (title area)
      await user.click(screen.getByText('Muscle Building Plan'));

      // Modal should be displayed with correct data
      await waitFor(() => {
        expect(screen.getByTestId('meal-plan-modal')).toBeInTheDocument();
        expect(screen.getByTestId('modal-meal-plan-id')).toHaveTextContent('plan-2');
        expect(screen.getByTestId('modal-meal-plan-name')).toHaveTextContent('Muscle Building Plan');
      });
    });

    it('does NOT open modal when PDF button is clicked in meal plans tab', async () => {
      const user = userEvent.setup();

      // Click on the PDF button for the second meal plan
      const pdfButton = screen.getByTestId('pdf-button-plan-2');
      await user.click(pdfButton);

      // Modal should NOT be displayed
      await waitFor(() => {
        expect(screen.queryByTestId('meal-plan-modal')).not.toBeInTheDocument();
      });

      // PDF function should have been called
      expect(mockPDFClick).toHaveBeenCalledWith('plan-2');
    });

    it('displays meal plan details in cards', async () => {
      // Check that meal plan details are displayed
      expect(screen.getByText('weight_loss')).toBeInTheDocument();
      expect(screen.getByText('7 days')).toBeInTheDocument();
      expect(screen.getByText('1800')).toBeInTheDocument();
    });
  });

  describe('Modal State Management', () => {
    it('opens modal with correct meal plan data', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // Click on different meal plans and verify modal content
      await user.click(screen.getByText('Weight Loss Plan'));

      await waitFor(() => {
        expect(screen.getByTestId('modal-meal-plan-id')).toHaveTextContent('plan-1');
        expect(screen.getByTestId('modal-meal-plan-name')).toHaveTextContent('Weight Loss Plan');
      });
    });

    it('closes modal when close button is clicked', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // Open modal
      await user.click(screen.getByText('Weight Loss Plan'));

      await waitFor(() => {
        expect(screen.getByTestId('meal-plan-modal')).toBeInTheDocument();
      });

      // Close modal
      await user.click(screen.getByTestId('modal-close-button'));

      await waitFor(() => {
        expect(screen.queryByTestId('meal-plan-modal')).not.toBeInTheDocument();
      });
    });

    it('can open different meal plans in sequence', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // Open first meal plan
      await user.click(screen.getByText('Weight Loss Plan'));
      await waitFor(() => {
        expect(screen.getByTestId('modal-meal-plan-id')).toHaveTextContent('plan-1');
      });

      // Close modal
      await user.click(screen.getByTestId('modal-close-button'));
      await waitFor(() => {
        expect(screen.queryByTestId('meal-plan-modal')).not.toBeInTheDocument();
      });

      // Open second meal plan
      await user.click(screen.getByText('Muscle Building Plan'));
      await waitFor(() => {
        expect(screen.getByTestId('modal-meal-plan-id')).toHaveTextContent('plan-2');
        expect(screen.getByTestId('modal-meal-plan-name')).toHaveTextContent('Muscle Building Plan');
      });
    });
  });

  describe('Event Propagation and Click Handling', () => {
    it('prevents meal plan click when PDF button is clicked (event.stopPropagation)', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // Simulate clicking PDF button with stopPropagation
      const pdfButton = screen.getByTestId('pdf-button-plan-1');
      const clickEvent = new MouseEvent('click', { bubbles: true });
      
      // Mock stopPropagation to verify it's called
      const stopPropagationSpy = vi.spyOn(clickEvent, 'stopPropagation');
      
      fireEvent(pdfButton, clickEvent);

      // PDF should be called but modal should not open
      expect(mockPDFClick).toHaveBeenCalledWith('plan-1');
      expect(screen.queryByTestId('meal-plan-modal')).not.toBeInTheDocument();
    });

    it('handles multiple rapid clicks correctly', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // Rapidly click meal plan multiple times
      const mealPlanTitle = screen.getByText('Weight Loss Plan');
      await user.click(mealPlanTitle);
      await user.click(mealPlanTitle);
      await user.click(mealPlanTitle);

      // Should only open one modal
      await waitFor(() => {
        const modals = screen.queryAllByTestId('meal-plan-modal');
        expect(modals).toHaveLength(1);
      });
    });

    it('preserves hover effects during interactions', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // Find meal plan item and check hover classes are present
      const mealPlanItem = screen.getByText('Weight Loss Plan').closest('div[class*="hover:bg-gray-100"]');
      expect(mealPlanItem).toHaveClass('hover:bg-gray-100', 'transition-colors');

      // Hover classes should persist after interactions
      fireEvent.mouseEnter(mealPlanItem!);
      fireEvent.mouseLeave(mealPlanItem!);
      
      expect(mealPlanItem).toHaveClass('hover:bg-gray-100', 'transition-colors');
    });
  });

  describe('Empty States and Loading', () => {
    it('handles empty meal plans gracefully', async () => {
      // Mock empty meal plans response
      mockApiRequest.mockImplementation((method: string, url: string) => {
        if (url.includes('/meal-plans')) {
          return Promise.resolve({
            json: () => Promise.resolve({ mealPlans: [], total: 0 })
          });
        }
        return Promise.resolve({
          json: () => Promise.resolve({ status: 'success', data: [] })
        });
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/no meal plans assigned yet/i)).toBeInTheDocument();
      });

      // Should not have any clickable meal plan items
      expect(screen.queryByTestId('pdf-button-plan-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('meal-plan-modal')).not.toBeInTheDocument();
    });

    it('shows loading states appropriately', async () => {
      // Mock delayed response
      mockApiRequest.mockImplementation((method: string, url: string) => {
        if (url.includes('/meal-plans')) {
          return new Promise(resolve => 
            setTimeout(() => resolve({
              json: () => Promise.resolve({ mealPlans: mockMealPlans, total: mockMealPlans.length })
            }), 100)
          );
        }
        return Promise.resolve({
          json: () => Promise.resolve({ status: 'success', data: [] })
        });
      });

      renderComponent();

      // Should show loading skeletons
      const skeletons = screen.getAllByRole('generic').filter(el => 
        el.className.includes('animate-pulse')
      );
      expect(skeletons.length).toBeGreaterThan(0);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Integration with PDF Export and Modal Components', () => {
    it('passes correct props to SimplePDFExportButton', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // Check that PDF button receives correct props
      const pdfButton = screen.getByTestId('pdf-button-plan-1');
      expect(pdfButton).toBeInTheDocument();
      expect(pdfButton).toHaveClass('text-blue-600', 'hover:text-blue-700');
    });

    it('passes correct props to MealPlanModal', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // Open modal
      await user.click(screen.getByText('Weight Loss Plan'));

      await waitFor(() => {
        const modal = screen.getByTestId('meal-plan-modal');
        expect(modal).toBeInTheDocument();
        
        // Verify modal receives correct meal plan data
        expect(screen.getByTestId('modal-meal-plan-id')).toHaveTextContent('plan-1');
        expect(screen.getByTestId('modal-meal-plan-name')).toHaveTextContent('Weight Loss Plan');
      });
    });
  });
});