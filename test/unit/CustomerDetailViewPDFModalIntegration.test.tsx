/**
 * Comprehensive Unit Tests for CustomerDetailView PDF Export and Modal Integration
 * 
 * This test suite focuses specifically on:
 * - PDF download button isolation and event.stopPropagation handling
 * - Modal state management in different scenarios
 * - Integration between SimplePDFExportButton and MealPlanModal components
 * - Event handling edge cases and user interaction patterns
 * - Component prop passing and state synchronization
 * 
 * Tests ensure that:
 * 1. PDF downloads work independently without triggering modals
 * 2. Modal opening/closing doesn't interfere with PDF functionality
 * 3. Both components receive correct data and handle errors properly
 * 4. User can perform multiple operations in sequence without issues
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import CustomerDetailView from '@/components/CustomerDetailView';
import type { CustomerMealPlan } from '@shared/schema';

// Mock the API functions
vi.mock('@/utils/api', () => ({
  getTrainerCustomerMeasurements: vi.fn(),
  getTrainerCustomerGoals: vi.fn(),
  getTrainerCustomerMealPlans: vi.fn(),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Scale: () => <div data-testid="scale-icon">Scale</div>,
  Target: () => <div data-testid="target-icon">Target</div>,
  Plus: () => <div data-testid="plus-icon">Plus</div>,
  ChevronRight: () => <div data-testid="chevron-right-icon">ChevronRight</div>,
  Calendar: () => <div data-testid="calendar-icon">Calendar</div>,
  Clock: () => <div data-testid="clock-icon">Clock</div>,
  Download: () => <div data-testid="download-icon">Download</div>,
  FileText: () => <div data-testid="file-text-icon">FileText</div>,
  X: () => <div data-testid="x-icon">X</div>,
}));

// Enhanced PDF Button Mock with detailed event tracking
const mockPDFExport = vi.fn();
const mockPDFError = vi.fn();
const mockStopPropagation = vi.fn();
vi.mock('@/components/PDFExportButton', () => ({
  SimplePDFExportButton: ({ onClick, mealPlan, className, size, children }: any) => {
    const handleClick = (e: React.MouseEvent) => {
      // Track that stopPropagation is called
      mockStopPropagation();
      e.stopPropagation();
      
      // Call the provided onClick if any
      if (onClick) onClick(e);
      
      // Simulate PDF export logic
      if (mealPlan?.id === 'error-plan') {
        mockPDFError(new Error('PDF export failed'));
      } else {
        mockPDFExport(mealPlan?.id, mealPlan?.mealPlanData?.planName);
      }
    };

    return (
      <button
        data-testid={`pdf-button-${mealPlan?.id || 'unknown'}`}
        className={className}
        onClick={handleClick}
        aria-label={`Export ${mealPlan?.mealPlanData?.planName || 'meal plan'} to PDF`}
      >
        {children || 'Export PDF'}
      </button>
    );
  },
}));

// Enhanced Modal Mock with state tracking
const mockModalOpenAction = vi.fn();
const mockModalCloseAction = vi.fn();
const mockModalProps = vi.fn();

vi.mock('@/components/MealPlanModal', () => ({
  default: ({ mealPlan, onClose }: any) => {
    // Track modal props and actions
    React.useEffect(() => {
      mockModalProps(mealPlan);
      mockModalOpenAction(mealPlan?.id, mealPlan?.mealPlanData?.planName);
    }, [mealPlan]);

    const handleClose = () => {
      mockModalCloseAction(mealPlan?.id);
      onClose();
    };

    return (
      <div data-testid="meal-plan-modal" data-meal-plan-id={mealPlan?.id}>
        <div data-testid="modal-content">
          <h2 data-testid="modal-title">{mealPlan?.mealPlanData?.planName}</h2>
          <div data-testid="modal-details">
            <p>Goal: {mealPlan?.mealPlanData?.fitnessGoal}</p>
            <p>Days: {mealPlan?.mealPlanData?.days}</p>
            <p>Calories: {mealPlan?.mealPlanData?.dailyCalorieTarget}</p>
          </div>
          <button 
            onClick={handleClose} 
            data-testid="modal-close-button"
          >
            Close
          </button>
          <button 
            onClick={handleClose} 
            data-testid="modal-backdrop-close"
          >
            Close via backdrop
          </button>
        </div>
      </div>
    );
  },
}));

// Mock toast notifications
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

const createMockMealPlan = (
  id: string, 
  planName: string, 
  extraProps = {}
): CustomerMealPlan => ({
  id,
  customerId: 'customer-123',
  trainerId: 'trainer-456',
  mealPlanData: {
    planName,
    fitnessGoal: 'weight_loss',
    description: `${planName} for fitness goals`,
    dailyCalorieTarget: 1800,
    days: 7,
    mealsPerDay: 4,
    meals: [
      {
        id: `meal-${id}`,
        day: 1,
        mealType: 'breakfast',
        recipeId: `recipe-${id}`,
        recipe: {
          id: `recipe-${id}`,
          name: `${planName} Recipe`,
          description: 'Test recipe',
          mealTypes: ['breakfast'],
          dietaryTags: ['healthy'],
          mainIngredientTags: ['protein'],
          ingredientsJson: [{ name: 'Test', amount: '1', unit: 'cup' }],
          instructionsText: 'Test instructions',
          prepTimeMinutes: 10,
          cookTimeMinutes: 15,
          servings: 1,
          caloriesKcal: 400,
          proteinGrams: '25.00',
          carbsGrams: '30.00',
          fatGrams: '10.00',
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
    ...extraProps
  },
  assignedAt: '2024-01-01T00:00:00Z',
  planName,
  fitnessGoal: 'weight_loss',
  dailyCalorieTarget: 1800,
  totalDays: 7,
  mealsPerDay: 4,
});

const mockMealPlans = [
  createMockMealPlan('plan-1', 'Standard Plan'),
  createMockMealPlan('plan-2', 'Premium Plan'),
  createMockMealPlan('error-plan', 'Error Plan'), // Special plan to test error handling
  createMockMealPlan('plan-4', 'Advanced Plan'),
];

describe('CustomerDetailView - PDF Export and Modal Integration', () => {
  let queryClient: QueryClient;
  let mockOnBack: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    mockOnBack = vi.fn();
    
    // Reset all mocks
    vi.clearAllMocks();
    mockPDFExport.mockClear();
    mockPDFError.mockClear();
    mockStopPropagation.mockClear();
    mockModalOpenAction.mockClear();
    mockModalCloseAction.mockClear();
    mockModalProps.mockClear();
    mockToast.mockClear();
    
    // Setup default API responses
    const { getTrainerCustomerMealPlans, getTrainerCustomerMeasurements, getTrainerCustomerGoals } = await import('@/utils/api');
    vi.mocked(getTrainerCustomerMealPlans).mockResolvedValue({
      mealPlans: mockMealPlans, 
      total: mockMealPlans.length
    });
    vi.mocked(getTrainerCustomerMeasurements).mockResolvedValue([]);
    vi.mocked(getTrainerCustomerGoals).mockResolvedValue([]);
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <CustomerDetailView customer={mockCustomer} onBack={mockOnBack} />
      </QueryClientProvider>
    );
  };

  describe('PDF Export Independence', () => {
    it('exports PDF without opening modal when PDF button is clicked', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Standard Plan')).toBeInTheDocument();
      });

      // Click PDF button directly
      const pdfButton = screen.getByTestId('pdf-button-plan-1');
      await user.click(pdfButton);

      // Verify PDF export was triggered
      expect(mockPDFExport).toHaveBeenCalledWith('plan-1', 'Standard Plan');
      
      // Verify event propagation was stopped
      expect(mockStopPropagation).toHaveBeenCalled();
      
      // Verify modal was NOT opened
      expect(mockModalOpenAction).not.toHaveBeenCalled();
      expect(screen.queryByTestId('meal-plan-modal')).not.toBeInTheDocument();
    });

    it('handles multiple PDF exports in sequence without interference', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Standard Plan')).toBeInTheDocument();
      });

      // Export multiple PDFs in sequence
      await user.click(screen.getByTestId('pdf-button-plan-1'));
      await user.click(screen.getByTestId('pdf-button-plan-2'));

      // Verify both exports were triggered
      expect(mockPDFExport).toHaveBeenCalledWith('plan-1', 'Standard Plan');
      expect(mockPDFExport).toHaveBeenCalledWith('plan-2', 'Premium Plan');
      expect(mockPDFExport).toHaveBeenCalledTimes(2);
      
      // Verify no modals were opened
      expect(mockModalOpenAction).not.toHaveBeenCalled();
    });

    it('maintains PDF functionality when modal is open', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Standard Plan')).toBeInTheDocument();
      });

      // Open modal first
      await user.click(screen.getByText('Standard Plan'));
      await waitFor(() => {
        expect(screen.getByTestId('meal-plan-modal')).toBeInTheDocument();
      });

      // Export PDF for a different meal plan while modal is open
      mockPDFExport.mockClear();
      await user.click(screen.getByTestId('pdf-button-plan-2'));

      // Verify PDF export still works
      expect(mockPDFExport).toHaveBeenCalledWith('plan-2', 'Premium Plan');
      
      // Verify original modal is still open
      expect(screen.getByTestId('meal-plan-modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-title')).toHaveTextContent('Standard Plan');
    });

    it('handles PDF export errors gracefully without affecting modal state', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Error Plan')).toBeInTheDocument();
      });

      // Try to export the error plan
      await user.click(screen.getByTestId('pdf-button-error-plan'));

      // Verify error was handled
      expect(mockPDFError).toHaveBeenCalledWith(expect.any(Error));
      
      // Verify no modal was opened due to error
      expect(mockModalOpenAction).not.toHaveBeenCalled();
      
      // Verify other functionality still works
      await user.click(screen.getByText('Standard Plan'));
      await waitFor(() => {
        expect(screen.getByTestId('meal-plan-modal')).toBeInTheDocument();
      });
    });
  });

  describe('Modal State Management', () => {
    it('opens modal with correct meal plan data when plan is clicked', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Premium Plan')).toBeInTheDocument();
      });

      // Click on meal plan to open modal
      await user.click(screen.getByText('Premium Plan'));

      // Verify modal opened with correct data
      await waitFor(() => {
        expect(mockModalOpenAction).toHaveBeenCalledWith('plan-2', 'Premium Plan');
        expect(screen.getByTestId('meal-plan-modal')).toBeInTheDocument();
        expect(screen.getByTestId('modal-title')).toHaveTextContent('Premium Plan');
        expect(screen.getByTestId('modal-details')).toHaveTextContent('Goal: weight_loss');
      });
    });

    it('closes modal correctly and allows reopening', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Standard Plan')).toBeInTheDocument();
      });

      // Open modal
      await user.click(screen.getByText('Standard Plan'));
      await waitFor(() => {
        expect(screen.getByTestId('meal-plan-modal')).toBeInTheDocument();
      });

      // Close modal
      await user.click(screen.getByTestId('modal-close-button'));
      
      await waitFor(() => {
        expect(mockModalCloseAction).toHaveBeenCalledWith('plan-1');
        expect(screen.queryByTestId('meal-plan-modal')).not.toBeInTheDocument();
      });

      // Reopen modal for same plan
      mockModalOpenAction.mockClear();
      await user.click(screen.getByText('Standard Plan'));
      
      await waitFor(() => {
        expect(mockModalOpenAction).toHaveBeenCalledWith('plan-1', 'Standard Plan');
        expect(screen.getByTestId('meal-plan-modal')).toBeInTheDocument();
      });
    });

    it('switches between different meal plan modals correctly', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Standard Plan')).toBeInTheDocument();
      });

      // Open first modal
      await user.click(screen.getByText('Standard Plan'));
      await waitFor(() => {
        expect(screen.getByTestId('modal-title')).toHaveTextContent('Standard Plan');
      });

      // Switch to different meal plan (should close first and open second)
      await user.click(screen.getByText('Premium Plan'));
      
      await waitFor(() => {
        expect(screen.getByTestId('modal-title')).toHaveTextContent('Premium Plan');
      });

      // Verify the modal data was updated
      expect(screen.getByTestId('modal-details')).toHaveTextContent('Goal: weight_loss');
    });

    it('handles modal backdrop clicks correctly', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Standard Plan')).toBeInTheDocument();
      });

      // Open modal
      await user.click(screen.getByText('Standard Plan'));
      await waitFor(() => {
        expect(screen.getByTestId('meal-plan-modal')).toBeInTheDocument();
      });

      // Close via backdrop
      await user.click(screen.getByTestId('modal-backdrop-close'));
      
      await waitFor(() => {
        expect(mockModalCloseAction).toHaveBeenCalled();
        expect(screen.queryByTestId('meal-plan-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Component Props and Data Passing', () => {
    it('passes correct props to SimplePDFExportButton', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Standard Plan')).toBeInTheDocument();
      });

      // Verify PDF buttons are rendered with correct attributes
      const pdfButton = screen.getByTestId('pdf-button-plan-1');
      expect(pdfButton).toHaveAttribute('aria-label', 'Export Standard Plan to PDF');
      expect(pdfButton).toHaveClass('text-blue-600', 'hover:text-blue-700');
    });

    it('passes complete meal plan data to MealPlanModal', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Premium Plan')).toBeInTheDocument();
      });

      // Open modal
      await user.click(screen.getByText('Premium Plan'));

      // Verify modal received complete data
      await waitFor(() => {
        expect(mockModalProps).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'plan-2',
            mealPlanData: expect.objectContaining({
              planName: 'Premium Plan',
              fitnessGoal: 'weight_loss',
              dailyCalorieTarget: 1800,
              days: 7
            })
          })
        );
      });
    });

    it('maintains component state consistency during interactions', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Standard Plan')).toBeInTheDocument();
      });

      // Perform mixed interactions
      await user.click(screen.getByTestId('pdf-button-plan-1')); // PDF export
      await user.click(screen.getByText('Premium Plan'));        // Open modal
      await user.click(screen.getByTestId('pdf-button-plan-4')); // Another PDF export
      
      // Verify all actions were tracked correctly
      expect(mockPDFExport).toHaveBeenCalledWith('plan-1', 'Standard Plan');
      expect(mockPDFExport).toHaveBeenCalledWith('plan-4', 'Advanced Plan');
      expect(mockModalOpenAction).toHaveBeenCalledWith('plan-2', 'Premium Plan');
      
      // Verify modal is still open with correct data
      expect(screen.getByTestId('meal-plan-modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-title')).toHaveTextContent('Premium Plan');
    });
  });

  describe('Event Handling Edge Cases', () => {
    it('prevents event bubbling from PDF buttons in both overview and full tabs', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Standard Plan')).toBeInTheDocument();
      });

      // Test in overview tab (recent section)
      await user.click(screen.getByTestId('pdf-button-plan-1'));
      expect(mockStopPropagation).toHaveBeenCalled();
      
      mockStopPropagation.mockClear();

      // Switch to meal plans tab
      const mealPlansTab = screen.getByRole('tab', { name: /meal plans/i });
      await user.click(mealPlansTab);

      // Test in full meal plans tab
      await user.click(screen.getByTestId('pdf-button-plan-2'));
      expect(mockStopPropagation).toHaveBeenCalled();
    });

    it('handles simultaneous PDF export and modal operations', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Standard Plan')).toBeInTheDocument();
      });

      // Open modal
      await user.click(screen.getByText('Standard Plan'));
      
      // Quickly try PDF export while modal is opening
      await user.click(screen.getByTestId('pdf-button-plan-2'));

      // Both operations should complete successfully
      expect(mockModalOpenAction).toHaveBeenCalledWith('plan-1', 'Standard Plan');
      expect(mockPDFExport).toHaveBeenCalledWith('plan-2', 'Premium Plan');
    });

    it('maintains focus and accessibility during interactions', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Standard Plan')).toBeInTheDocument();
      });

      // PDF buttons should be focusable
      const pdfButton = screen.getByTestId('pdf-button-plan-1');
      pdfButton.focus();
      expect(document.activeElement).toBe(pdfButton);

      // After clicking, focus should remain manageable
      fireEvent.click(pdfButton);
      expect(mockPDFExport).toHaveBeenCalledWith('plan-1', 'Standard Plan');
    });

    it('handles rapid successive clicks correctly', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Standard Plan')).toBeInTheDocument();
      });

      // Rapidly click PDF button multiple times
      const pdfButton = screen.getByTestId('pdf-button-plan-1');
      await user.click(pdfButton);
      await user.click(pdfButton);
      await user.click(pdfButton);

      // Should register multiple PDF export attempts
      expect(mockPDFExport).toHaveBeenCalledTimes(3);
      expect(mockStopPropagation).toHaveBeenCalledTimes(3);
      
      // But no modal should open
      expect(mockModalOpenAction).not.toHaveBeenCalled();
    });
  });

  describe('Tab Navigation and Context Switching', () => {
    it('maintains component behavior when switching between tabs', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Standard Plan')).toBeInTheDocument();
      });

      // Open modal in overview tab
      await user.click(screen.getByText('Standard Plan'));
      await waitFor(() => {
        expect(screen.getByTestId('meal-plan-modal')).toBeInTheDocument();
      });

      // Switch to meal plans tab
      const mealPlansTab = screen.getByRole('tab', { name: /meal plans/i });
      await user.click(mealPlansTab);

      // Modal should still be visible
      expect(screen.getByTestId('meal-plan-modal')).toBeInTheDocument();

      // PDF export should still work in the new tab
      mockPDFExport.mockClear();
      await user.click(screen.getByTestId('pdf-button-plan-2'));
      expect(mockPDFExport).toHaveBeenCalledWith('plan-2', 'Premium Plan');
    });

    it('handles tab switching with multiple meal plan interactions', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Standard Plan')).toBeInTheDocument();
      });

      // PDF export in overview tab
      await user.click(screen.getByTestId('pdf-button-plan-1'));
      
      // Switch to meal plans tab
      const mealPlansTab = screen.getByRole('tab', { name: /meal plans/i });
      await user.click(mealPlansTab);

      // Open modal in meal plans tab
      await user.click(screen.getByText('Advanced Plan'));

      // Verify all operations worked correctly
      expect(mockPDFExport).toHaveBeenCalledWith('plan-1', 'Standard Plan');
      expect(mockModalOpenAction).toHaveBeenCalledWith('plan-4', 'Advanced Plan');
      expect(screen.getByTestId('meal-plan-modal')).toBeInTheDocument();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('recovers gracefully from PDF export errors', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Error Plan')).toBeInTheDocument();
      });

      // Try to export error plan
      await user.click(screen.getByTestId('pdf-button-error-plan'));
      expect(mockPDFError).toHaveBeenCalled();

      // Normal functionality should still work
      await user.click(screen.getByText('Standard Plan'));
      await waitFor(() => {
        expect(screen.getByTestId('meal-plan-modal')).toBeInTheDocument();
      });

      // And successful PDF export should work
      mockPDFExport.mockClear();
      await user.click(screen.getByTestId('pdf-button-plan-1'));
      expect(mockPDFExport).toHaveBeenCalledWith('plan-1', 'Standard Plan');
    });

    it('handles missing meal plan data gracefully', async () => {
      // Mock API to return meal plan with missing data
      const { getTrainerCustomerMealPlans } = await import('@/utils/api');
      vi.mocked(getTrainerCustomerMealPlans).mockResolvedValue({
        mealPlans: [
          { id: 'incomplete-plan', mealPlanData: null }
        ], 
        total: 1
      });

      renderComponent();

      await waitFor(() => {
        // Component should render without crashing
        expect(screen.getByText(/meal plans/i)).toBeInTheDocument();
      });

      // Should handle incomplete data without errors
      const pdfButton = screen.queryByTestId('pdf-button-incomplete-plan');
      if (pdfButton) {
        fireEvent.click(pdfButton);
        // Should not crash the application
      }
    });
  });
});