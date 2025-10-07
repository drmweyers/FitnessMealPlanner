/**
 * Comprehensive Unit Tests for CustomerDetailView Meal Plans Click Functionality
 * 
 * Tests the recently fixed meal plan click interactions including:
 * - Recent meal plans section (Overview tab) - clickable with modal opening
 * - Full meal plans tab - clickable cards with modal opening  
 * - PDF download button isolation (event.stopPropagation handling)
 * - Hover effects and visual feedback
 * - Modal state management and integration
 * - Event propagation handling for PDF vs modal clicks
 * - Loading states and empty states
 * 
 * This test suite focuses specifically on the click functionality that was recently
 * implemented to make meal plan items clickable while keeping PDF downloads separate.
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import CustomerDetailView from '@/components/CustomerDetailView';
import type { CustomerMealPlan } from '@shared/schema';
import { renderWithProviders, mockUsers } from '../test-utils';

// Mock the API functions
vi.mock('@/utils/api', () => ({
  getTrainerCustomerMeasurements: vi.fn(),
  getTrainerCustomerGoals: vi.fn(),
  getTrainerCustomerMealPlans: vi.fn(),
}));

// Mock lucide-react icons (all icons used in CustomerDetailView)
vi.mock('lucide-react', () => ({
  User: () => <div data-testid="user-icon">User</div>,
  Target: () => <div data-testid="target-icon">Target</div>,
  Calendar: () => <div data-testid="calendar-icon">Calendar</div>,
  ChefHat: () => <div data-testid="chef-hat-icon">ChefHat</div>,
  TrendingUp: () => <div data-testid="trending-up-icon">TrendingUp</div>,
  Scale: () => <div data-testid="scale-icon">Scale</div>,
  Heart: () => <div data-testid="heart-icon">Heart</div>,
  Activity: () => <div data-testid="activity-icon">Activity</div>,
  Camera: () => <div data-testid="camera-icon">Camera</div>,
  Plus: () => <div data-testid="plus-icon">Plus</div>,
  ArrowLeft: () => <div data-testid="arrow-left-icon">ArrowLeft</div>,
  FileText: () => <div data-testid="file-text-icon">FileText</div>,
  Zap: () => <div data-testid="zap-icon">Zap</div>,
  // Additional icons that might be used in components
  ChevronRight: () => <div data-testid="chevron-right-icon">ChevronRight</div>,
  Clock: () => <div data-testid="clock-icon">Clock</div>,
  Download: () => <div data-testid="download-icon">Download</div>,
  X: () => <div data-testid="x-icon">X</div>,
}));

// Mock the SimplePDFExportButton component to track interactions
const mockPDFClick = vi.fn();
const mockPDFStopPropagation = vi.fn();
vi.mock('@/components/PDFExportButton', () => ({
  SimplePDFExportButton: ({ onClick, mealPlan, className, size, children }: any) => (
    <button
      data-testid={`pdf-button-${mealPlan?.id || 'unknown'}`}
      className={className}
      onClick={(e) => {
        mockPDFStopPropagation();
        e.stopPropagation(); // Verify this is called to prevent modal opening
        if (onClick) onClick(e);
        mockPDFClick(mealPlan?.id);
      }}
    >
      {children || 'PDF'}
    </button>
  ),
}));

// Mock the MealPlanModal component to track modal interactions
const mockModalOpen = vi.fn();
const mockModalClose = vi.fn();
vi.mock('@/components/MealPlanModal', () => ({
  default: ({ mealPlan, onClose }: any) => {
    React.useEffect(() => {
      mockModalOpen(mealPlan?.id);
    }, [mealPlan?.id]);

    return (
      <div data-testid="meal-plan-modal">
        <div data-testid="modal-meal-plan-id">{mealPlan?.id}</div>
        <div data-testid="modal-meal-plan-name">{mealPlan?.mealPlanData?.planName}</div>
        <button 
          onClick={() => {
            mockModalClose();
            onClose();
          }} 
          data-testid="modal-close-button"
        >
          Close Modal
        </button>
      </div>
    );
  },
}));

// Mock the MealPlanGenerator component (used when creating new plans)
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

// Test data - realistic meal plan structures
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
        id: `meal-${id}-1`,
        day: 1,
        mealType: 'breakfast',
        recipeId: `recipe-${id}-1`,
        recipe: {
          id: `recipe-${id}-1`,
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
  createMockMealPlan('plan-5', 'Bulking Plan'), // 5th plan to test "more" functionality
];

describe('CustomerDetailView - Meal Plans Click Functionality', () => {
  let mockOnBack: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockOnBack = vi.fn();
    
    // Reset all mocks
    vi.clearAllMocks();
    mockPDFClick.mockClear();
    mockPDFStopPropagation.mockClear();
    mockModalOpen.mockClear();
    mockModalClose.mockClear();
    mockToast.mockClear();
    
    // Setup API mocks with realistic responses
    const { getTrainerCustomerMealPlans, getTrainerCustomerMeasurements, getTrainerCustomerGoals } = await import('@/utils/api');
    vi.mocked(getTrainerCustomerMealPlans).mockResolvedValue({
      mealPlans: mockMealPlans, 
      total: mockMealPlans.length
    });
    vi.mocked(getTrainerCustomerMeasurements).mockResolvedValue([]);
    vi.mocked(getTrainerCustomerGoals).mockResolvedValue([]);
  });

  const renderComponent = (customer = mockCustomer) => {
    return renderWithProviders(
      <CustomerDetailView customer={customer} onBack={mockOnBack} />,
      { 
        authContextValue: {
          user: mockUsers.trainer,
          isLoading: false,
          isAuthenticated: true,
          login: vi.fn(),
          logout: vi.fn(),
          updateProfile: vi.fn(),
        }
      }
    );
  };

  describe('Recent Meal Plans Section (Overview Tab)', () => {
    it('renders recent meal plans with proper click handlers', async () => {
      renderComponent();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // Check that meal plan items are rendered with correct structure
      expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      expect(screen.getByText('Muscle Building Plan')).toBeInTheDocument();
      expect(screen.getByText('Maintenance Plan')).toBeInTheDocument();
      
      // Should only show first 3 in recent section (overview tab)
      expect(screen.queryByText('Cutting Plan')).not.toBeInTheDocument();
      expect(screen.queryByText('Bulking Plan')).not.toBeInTheDocument();
    });

    it('applies correct CSS classes for hover effects and clickability', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // Find the clickable container for the meal plan
      const mealPlanContainer = screen.getByText('Weight Loss Plan')
        .closest('div[class*="cursor-pointer"]');
      
      expect(mealPlanContainer).toBeInTheDocument();
      expect(mealPlanContainer).toHaveClass('cursor-pointer');
      expect(mealPlanContainer).toHaveClass('hover:bg-gray-100');
      expect(mealPlanContainer).toHaveClass('transition-colors');
    });

    it('opens modal when meal plan title is clicked', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // Click on the meal plan title
      await user.click(screen.getByText('Weight Loss Plan'));

      // Verify modal opens with correct data
      await waitFor(() => {
        expect(mockModalOpen).toHaveBeenCalledWith('plan-1');
        expect(screen.getByTestId('meal-plan-modal')).toBeInTheDocument();
        expect(screen.getByTestId('modal-meal-plan-id')).toHaveTextContent('plan-1');
        expect(screen.getByTestId('modal-meal-plan-name')).toHaveTextContent('Weight Loss Plan');
      });
    });

    it('opens modal when meal plan container is clicked (not just title)', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // Click on the container (should work even if not clicking exact title)
      const container = screen.getByText('Weight Loss Plan')
        .closest('div[class*="cursor-pointer"]');
      await user.click(container!);

      // Verify modal opens
      await waitFor(() => {
        expect(mockModalOpen).toHaveBeenCalledWith('plan-1');
        expect(screen.getByTestId('meal-plan-modal')).toBeInTheDocument();
      });
    });

    it('does NOT open modal when PDF button is clicked - event propagation test', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // Click specifically on the PDF button
      const pdfButton = screen.getByTestId('pdf-button-plan-1');
      await user.click(pdfButton);

      // Verify event.stopPropagation was called
      expect(mockPDFStopPropagation).toHaveBeenCalled();
      
      // Verify PDF function was called
      expect(mockPDFClick).toHaveBeenCalledWith('plan-1');
      
      // Verify modal did NOT open
      await waitFor(() => {
        expect(mockModalOpen).not.toHaveBeenCalled();
        expect(screen.queryByTestId('meal-plan-modal')).not.toBeInTheDocument();
      });
    });

    it('handles rapid clicks correctly without multiple modals', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // Rapidly click the same meal plan multiple times
      const mealPlanTitle = screen.getByText('Weight Loss Plan');
      await user.dblClick(mealPlanTitle);

      // Should only open one modal instance
      await waitFor(() => {
        const modals = screen.queryAllByTestId('meal-plan-modal');
        expect(modals).toHaveLength(1);
        expect(mockModalOpen).toHaveBeenCalledTimes(1);
      });
    });

    it('shows "And X more meal plans..." when there are more than 3 plans', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // Should show message about additional plans (we have 5 total, showing 3)
      expect(screen.getByText('And 2 more meal plans...')).toBeInTheDocument();
    });

    it('can click different meal plans to open different modals', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // Click first meal plan
      await user.click(screen.getByText('Weight Loss Plan'));
      await waitFor(() => {
        expect(mockModalOpen).toHaveBeenCalledWith('plan-1');
        expect(screen.getByTestId('modal-meal-plan-id')).toHaveTextContent('plan-1');
      });

      // Close modal
      await user.click(screen.getByTestId('modal-close-button'));
      await waitFor(() => {
        expect(mockModalClose).toHaveBeenCalled();
        expect(screen.queryByTestId('meal-plan-modal')).not.toBeInTheDocument();
      });

      // Click second meal plan
      mockModalOpen.mockClear();
      await user.click(screen.getByText('Muscle Building Plan'));
      await waitFor(() => {
        expect(mockModalOpen).toHaveBeenCalledWith('plan-2');
        expect(screen.getByTestId('modal-meal-plan-id')).toHaveTextContent('plan-2');
      });
    });
  });

  describe('Full Meal Plans Tab - Card Click Functionality', () => {
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
      expect(screen.getByText('Bulking Plan')).toBeInTheDocument();
    });

    it('applies proper CSS classes for card hover effects', async () => {
      // Find meal plan card containers
      const mealPlanCard = screen.getByText('Weight Loss Plan')
        .closest('div[class*="hover:shadow-md"]');
      
      expect(mealPlanCard).toBeInTheDocument();
      expect(mealPlanCard).toHaveClass('hover:shadow-md');
      expect(mealPlanCard).toHaveClass('transition-shadow');
      expect(mealPlanCard).toHaveClass('cursor-pointer');
    });

    it('opens modal when meal plan card is clicked', async () => {
      const user = userEvent.setup();

      // Click on the meal plan card
      await user.click(screen.getByText('Muscle Building Plan'));

      // Modal should open with correct data
      await waitFor(() => {
        expect(mockModalOpen).toHaveBeenCalledWith('plan-2');
        expect(screen.getByTestId('meal-plan-modal')).toBeInTheDocument();
        expect(screen.getByTestId('modal-meal-plan-id')).toHaveTextContent('plan-2');
        expect(screen.getByTestId('modal-meal-plan-name')).toHaveTextContent('Muscle Building Plan');
      });
    });

    it('does NOT open modal when PDF button in card is clicked', async () => {
      const user = userEvent.setup();

      // Click on the PDF button for the second meal plan
      const pdfButton = screen.getByTestId('pdf-button-plan-2');
      await user.click(pdfButton);

      // Verify PDF was called but modal did not open
      expect(mockPDFStopPropagation).toHaveBeenCalled();
      expect(mockPDFClick).toHaveBeenCalledWith('plan-2');
      
      await waitFor(() => {
        expect(mockModalOpen).not.toHaveBeenCalled();
        expect(screen.queryByTestId('meal-plan-modal')).not.toBeInTheDocument();
      });
    });

    it('displays meal plan details correctly in cards', async () => {
      // Check that meal plan details are displayed
      expect(screen.getByText('weight_loss')).toBeInTheDocument();
      expect(screen.getByText('7 days')).toBeInTheDocument();
      expect(screen.getByText('1800')).toBeInTheDocument();
    });

    it('can open modal for any meal plan card in the list', async () => {
      const user = userEvent.setup();

      // Test clicking on the 4th meal plan (only visible in full tab)
      await user.click(screen.getByText('Cutting Plan'));

      await waitFor(() => {
        expect(mockModalOpen).toHaveBeenCalledWith('plan-4');
        expect(screen.getByTestId('modal-meal-plan-id')).toHaveTextContent('plan-4');
        expect(screen.getByTestId('modal-meal-plan-name')).toHaveTextContent('Cutting Plan');
      });
    });
  });

  describe('Modal State Management and User Interactions', () => {
    it('opens modal with correct meal plan data for any clicked plan', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // Test opening modal for first plan
      await user.click(screen.getByText('Weight Loss Plan'));
      
      await waitFor(() => {
        expect(screen.getByTestId('modal-meal-plan-id')).toHaveTextContent('plan-1');
        expect(screen.getByTestId('modal-meal-plan-name')).toHaveTextContent('Weight Loss Plan');
      });
    });

    it('closes modal properly when close button is clicked', async () => {
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
        expect(mockModalClose).toHaveBeenCalled();
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
        expect(mockModalOpen).toHaveBeenCalledWith('plan-1');
      });

      // Close modal
      await user.click(screen.getByTestId('modal-close-button'));
      await waitFor(() => {
        expect(screen.queryByTestId('meal-plan-modal')).not.toBeInTheDocument();
      });

      // Clear mock and open second meal plan
      mockModalOpen.mockClear();
      await user.click(screen.getByText('Muscle Building Plan'));
      await waitFor(() => {
        expect(mockModalOpen).toHaveBeenCalledWith('plan-2');
        expect(screen.getByTestId('modal-meal-plan-name')).toHaveTextContent('Muscle Building Plan');
      });
    });

    it('handles state correctly when switching between tabs with modal open', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // Open modal from overview tab
      await user.click(screen.getByText('Weight Loss Plan'));
      await waitFor(() => {
        expect(screen.getByTestId('meal-plan-modal')).toBeInTheDocument();
      });

      // Switch to meal plans tab while modal is open
      const mealPlansTab = screen.getByRole('tab', { name: /meal plans/i });
      await user.click(mealPlansTab);

      // Modal should still be visible
      expect(screen.getByTestId('meal-plan-modal')).toBeInTheDocument();
      
      // Close modal
      await user.click(screen.getByTestId('modal-close-button'));
      await waitFor(() => {
        expect(screen.queryByTestId('meal-plan-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Event Propagation and Click Handling Edge Cases', () => {
    it('handles event propagation correctly for PDF buttons in recent section', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // Use fireEvent to test direct event handling
      const pdfButton = screen.getByTestId('pdf-button-plan-1');
      fireEvent.click(pdfButton);

      // Verify stopPropagation was called and PDF action triggered
      expect(mockPDFStopPropagation).toHaveBeenCalled();
      expect(mockPDFClick).toHaveBeenCalledWith('plan-1');
      expect(mockModalOpen).not.toHaveBeenCalled();
    });

    it('handles click events on different parts of meal plan items', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // Click on assignment date text (should still open modal)
      const assignmentText = screen.getByText(/Assigned/);
      await user.click(assignmentText);

      await waitFor(() => {
        expect(mockModalOpen).toHaveBeenCalledWith('plan-1');
      });
    });

    it('prevents double-click issues and ensures single modal instance', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // Rapidly click multiple times
      const mealPlanTitle = screen.getByText('Weight Loss Plan');
      await user.tripleClick(mealPlanTitle);

      // Should only have one modal and one modal open call
      await waitFor(() => {
        const modals = screen.queryAllByTestId('meal-plan-modal');
        expect(modals).toHaveLength(1);
        expect(mockModalOpen).toHaveBeenCalledTimes(1);
      });
    });

    it('maintains hover effects after interactions', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      const mealPlanItem = screen.getByText('Weight Loss Plan')
        .closest('div[class*="hover:bg-gray-100"]');

      // Verify hover classes persist after mouse interactions
      fireEvent.mouseEnter(mealPlanItem!);
      fireEvent.mouseLeave(mealPlanItem!);
      fireEvent.click(mealPlanItem!);
      
      expect(mealPlanItem).toHaveClass('hover:bg-gray-100', 'transition-colors');
    });
  });

  describe('Empty States and Loading Behavior', () => {
    it('handles empty meal plans state correctly', async () => {
      // Mock empty response
      const { getTrainerCustomerMealPlans } = await import('@/utils/api');
      vi.mocked(getTrainerCustomerMealPlans).mockResolvedValue({
        mealPlans: [], 
        total: 0
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/no meal plans assigned yet/i)).toBeInTheDocument();
      });

      // Should not have any clickable meal plan items
      expect(screen.queryByTestId('pdf-button-plan-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('meal-plan-modal')).not.toBeInTheDocument();
    });

    it('shows loading states with proper skeleton components', async () => {
      // Mock delayed response
      const { getTrainerCustomerMealPlans } = await import('@/utils/api');
      vi.mocked(getTrainerCustomerMealPlans).mockImplementation(() =>
        new Promise(resolve => 
          setTimeout(() => resolve({
            mealPlans: mockMealPlans, 
            total: mockMealPlans.length
          }), 100)
        )
      );

      renderComponent();

      // Should show loading skeleton
      const skeletons = screen.getAllByRole('generic').filter(el => 
        el.className.includes('animate-pulse')
      );
      expect(skeletons.length).toBeGreaterThan(0);

      // Wait for actual data to load
      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Integration with PDF Export and Modal Components', () => {
    it('passes correct props to SimplePDFExportButton components', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // Check that PDF buttons are rendered with correct test IDs
      expect(screen.getByTestId('pdf-button-plan-1')).toBeInTheDocument();
      expect(screen.getByTestId('pdf-button-plan-2')).toBeInTheDocument();
      expect(screen.getByTestId('pdf-button-plan-3')).toBeInTheDocument();
      
      // PDF buttons should have appropriate styling classes
      const pdfButton = screen.getByTestId('pdf-button-plan-1');
      expect(pdfButton).toHaveClass('text-blue-600', 'hover:text-blue-700');
    });

    it('passes correct meal plan data to MealPlanModal when opened', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // Open modal for a specific meal plan
      await user.click(screen.getByText('Muscle Building Plan'));

      await waitFor(() => {
        expect(screen.getByTestId('meal-plan-modal')).toBeInTheDocument();
        expect(screen.getByTestId('modal-meal-plan-id')).toHaveTextContent('plan-2');
        expect(screen.getByTestId('modal-meal-plan-name')).toHaveTextContent('Muscle Building Plan');
      });
    });

    it('handles PDF export clicks independently of modal state', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // Open modal first
      await user.click(screen.getByText('Weight Loss Plan'));
      await waitFor(() => {
        expect(screen.getByTestId('meal-plan-modal')).toBeInTheDocument();
      });

      // Click PDF button for a different meal plan
      mockPDFClick.mockClear();
      const pdfButton = screen.getByTestId('pdf-button-plan-2');
      await user.click(pdfButton);

      // PDF should work independently
      expect(mockPDFClick).toHaveBeenCalledWith('plan-2');
      
      // Original modal should still be open
      expect(screen.getByTestId('meal-plan-modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-meal-plan-id')).toHaveTextContent('plan-1');
    });
  });

  describe('Accessibility and User Experience', () => {
    it('provides proper accessibility attributes for clickable elements', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // Clickable containers should have cursor-pointer for visual feedback
      const clickableContainer = screen.getByText('Weight Loss Plan')
        .closest('div[class*="cursor-pointer"]');
      expect(clickableContainer).toHaveClass('cursor-pointer');
    });

    it('provides clear visual feedback for interactive elements', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // Elements should have transition classes for smooth interactions
      const hoverableElement = screen.getByText('Weight Loss Plan')
        .closest('div[class*="transition-colors"]');
      expect(hoverableElement).toHaveClass('transition-colors');
    });

    it('handles keyboard navigation appropriately', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // Tab navigation should work for PDF buttons
      const pdfButton = screen.getByTestId('pdf-button-plan-1');
      pdfButton.focus();
      
      // Enter key should trigger PDF export
      await user.keyboard('{Enter}');
      expect(mockPDFClick).toHaveBeenCalledWith('plan-1');
    });
  });
});