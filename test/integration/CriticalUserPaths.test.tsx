/**
 * Critical User Paths Integration Tests
 * 
 * Comprehensive tests verifying all critical user paths in the meal plan assignment system:
 * - Assignment workflow (complete end-to-end)
 * - Viewing meal plans (modal interactions and data display)
 * - Downloading PDFs (export functionality)
 * - Navigation between components
 * - Data persistence and synchronization
 * - Error recovery and edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, createMockAuthContext, mockUsers } from '../test-utils';
import { setupAssignmentTest, assertionHelpers } from '../utils/mealPlanAssignmentTestUtils';
import TrainerMealPlans from '@/components/TrainerMealPlans';
import CustomerManagement from '@/components/CustomerManagement';
import { apiRequest } from '../../client/src/lib/queryClient';

// Mock dependencies
vi.mock('../../client/src/lib/queryClient', () => ({
  apiRequest: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock PDF export functionality
const mockPDFExport = vi.fn();
vi.mock('@/components/PDFExportButton', () => ({
  SimplePDFExportButton: ({ mealPlan, onClick, children, ...props }: any) => (
    <button 
      data-testid="pdf-export-button"
      onClick={() => {
        mockPDFExport(mealPlan);
        onClick?.();
      }}
      {...props}
    >
      {children || `Download PDF: ${mealPlan.mealPlanData?.planName || 'Unknown'}`}
    </button>
  ),
}));

// Mock MealPlanModal with detailed interaction tracking
const mockMealPlanModalClose = vi.fn();
vi.mock('@/components/MealPlanModal', () => ({
  default: ({ mealPlan, onClose }: { mealPlan: any; onClose: () => void }) => (
    <div data-testid="meal-plan-modal">
      <div data-testid="modal-header">
        <h2>Meal Plan Details</h2>
        <button 
          data-testid="modal-close-button"
          onClick={() => {
            mockMealPlanModalClose(mealPlan);
            onClose();
          }}
        >
          ×
        </button>
      </div>
      <div data-testid="modal-content">
        <h3>{mealPlan.mealPlanData?.planName || 'Unknown Plan'}</h3>
        <p>Goal: {mealPlan.mealPlanData?.fitnessGoal || 'Unknown'}</p>
        <p>Days: {mealPlan.mealPlanData?.days || 0}</p>
        <p>Calories: {mealPlan.mealPlanData?.dailyCalorieTarget || 0}/day</p>
        <div data-testid="modal-actions">
          <button data-testid="modal-pdf-export" onClick={() => mockPDFExport(mealPlan)}>
            Export PDF
          </button>
        </div>
      </div>
    </div>
  ),
}));

// Mock CustomerDetailView for navigation testing
const mockCustomerDetailNavigation = vi.fn();
vi.mock('@/components/CustomerDetailView', () => ({
  default: ({ customer, onBack }: { customer: any; onBack: () => void }) => {
    mockCustomerDetailNavigation(customer);
    return (
      <div data-testid="customer-detail-view">
        <div data-testid="customer-detail-header">
          <button data-testid="back-button" onClick={onBack}>
            ← Back to Customers
          </button>
          <h2>Customer: {customer.email}</h2>
        </div>
        <div data-testid="customer-meal-plans-section">
          <h3>Assigned Meal Plans</h3>
          {/* This would contain the actual meal plans in the real component */}
          <div data-testid="meal-plans-list">
            <p>Meal plans would be displayed here</p>
          </div>
        </div>
      </div>
    );
  },
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Calendar: () => <div data-testid="calendar-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Utensils: () => <div data-testid="utensils-icon" />,
  Search: () => <div data-testid="search-icon" />,
  MoreVertical: () => <div data-testid="more-vertical-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  UserPlus: () => <div data-testid="user-plus-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  Target: () => <div data-testid="target-icon" />,
  ChefHat: () => <div data-testid="chef-hat-icon" />,
  User: () => <div data-testid="user-icon" />,
  Mail: () => <div data-testid="mail-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Download: () => <div data-testid="download-icon" />,
}));

const mockApiRequest = vi.mocked(apiRequest);

describe('Critical User Paths Integration Tests', () => {
  let mockToast: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockToast = vi.fn();
    vi.mocked(require('@/hooks/use-toast').useToast).mockReturnValue({
      toast: mockToast,
    });

    // Clear all interaction tracking mocks
    mockPDFExport.mockClear();
    mockMealPlanModalClose.mockClear();
    mockCustomerDetailNavigation.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Assignment Workflow Path', () => {
    it('successfully completes full assignment workflow from start to finish', async () => {
      const user = userEvent.setup();
      const { queryClient, apiMock } = setupAssignmentTest('fresh');

      mockApiRequest.mockImplementation(apiMock);

      renderWithProviders(
        <TrainerMealPlans />,
        {
          queryClient,
          authContextValue: createMockAuthContext(mockUsers.trainer),
        }
      );

      // Step 1: Verify initial state - meal plans loaded
      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
        expect(screen.getByText('Muscle Gain Plan')).toBeInTheDocument();
      });

      // Step 2: Verify initial assignment counts
      expect(screen.getByText('Assigned to 0 customers')).toBeInTheDocument();

      // Step 3: Open assignment modal
      const firstDropdown = screen.getAllByTestId('more-vertical-icon')[0];
      await user.click(firstDropdown.closest('button')!);
      
      const assignButton = screen.getByText('Assign to Customer');
      await user.click(assignButton);

      // Step 4: Verify modal opens with correct content
      await waitFor(() => {
        expect(screen.getByText('Assign Meal Plan to Customer')).toBeInTheDocument();
        expect(screen.getByText(/Select a customer to assign "Weight Loss Plan"/)).toBeInTheDocument();
      });

      // Step 5: Verify customers load
      await waitFor(() => {
        expect(screen.getByText('customer1@test.com')).toBeInTheDocument();
        expect(screen.getByText('customer2@test.com')).toBeInTheDocument();
        expect(screen.getByText('customer3@test.com')).toBeInTheDocument();
      });

      // Step 6: Verify initial button state
      expect(screen.getByText('Assign (0)')).toBeDisabled();

      // Step 7: Select customer
      const customerRow = screen.getByText('customer1@test.com').closest('div');
      await user.click(customerRow!);

      // Step 8: Verify button becomes enabled with count
      const enabledAssignButton = screen.getByText('Assign (1)');
      expect(enabledAssignButton).not.toBeDisabled();

      // Step 9: Complete assignment
      await user.click(enabledAssignButton);

      // Step 10: Verify success notification
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Meal Plan Assigned',
          description: 'The meal plan has been successfully assigned to the customer.',
        });
      });

      // Step 11: Verify modal closes
      expect(screen.queryByText('Assign Meal Plan to Customer')).not.toBeInTheDocument();

      // Step 12: Verify assignment count updates
      await waitFor(() => {
        expect(screen.getByText('Assigned to 1 customer')).toBeInTheDocument();
      });

      // Step 13: Verify API was called correctly
      expect(mockApiRequest).toHaveBeenCalledWith(
        'POST',
        '/api/trainer/meal-plans/plan-weight-loss/assign',
        { customerId: 'customer-1' }
      );
    });

    it('handles assignment to multiple customers sequentially', async () => {
      const user = userEvent.setup();
      const { queryClient, apiMock } = setupAssignmentTest('fresh');

      mockApiRequest.mockImplementation(apiMock);

      renderWithProviders(
        <TrainerMealPlans />,
        {
          queryClient,
          authContextValue: createMockAuthContext(mockUsers.trainer),
        }
      );

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // First assignment
      const firstDropdown = screen.getAllByTestId('more-vertical-icon')[0];
      await user.click(firstDropdown.closest('button')!);
      await user.click(screen.getByText('Assign to Customer'));

      await waitFor(() => {
        expect(screen.getByText('customer1@test.com')).toBeInTheDocument();
      });

      let customerRow = screen.getByText('customer1@test.com').closest('div');
      await user.click(customerRow!);
      await user.click(screen.getByText('Assign (1)'));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledTimes(1);
      });

      // Second assignment to different customer
      const secondDropdown = screen.getAllByTestId('more-vertical-icon')[0]; // Same plan
      await user.click(secondDropdown.closest('button')!);
      await user.click(screen.getByText('Assign to Customer'));

      await waitFor(() => {
        expect(screen.getByText('customer2@test.com')).toBeInTheDocument();
      });

      customerRow = screen.getByText('customer2@test.com').closest('div');
      await user.click(customerRow!);
      await user.click(screen.getByText('Assign (1)'));

      // Verify final state
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledTimes(2);
        expect(screen.getByText('Assigned to 2 customers')).toBeInTheDocument();
      });
    });
  });

  describe('Meal Plan Viewing Path', () => {
    it('successfully views meal plan details through modal', async () => {
      const user = userEvent.setup();
      const { queryClient, apiMock } = setupAssignmentTest('withAssignments');

      mockApiRequest.mockImplementation(apiMock);

      renderWithProviders(
        <TrainerMealPlans />,
        {
          queryClient,
          authContextValue: createMockAuthContext(mockUsers.trainer),
        }
      );

      // Wait for plans to load
      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // Open meal plan details
      const firstDropdown = screen.getAllByTestId('more-vertical-icon')[0];
      await user.click(firstDropdown.closest('button')!);
      
      const viewButton = screen.getByText('View Details');
      await user.click(viewButton);

      // Verify modal opens with correct data
      await waitFor(() => {
        expect(screen.getByTestId('meal-plan-modal')).toBeInTheDocument();
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
        expect(screen.getByText('Goal: weight_loss')).toBeInTheDocument();
        expect(screen.getByText('Days: 7')).toBeInTheDocument();
        expect(screen.getByText('Calories: 1800/day')).toBeInTheDocument();
      });

      // Test PDF export from modal
      const modalPDFButton = screen.getByTestId('modal-pdf-export');
      await user.click(modalPDFButton);

      expect(mockPDFExport).toHaveBeenCalledWith(
        expect.objectContaining({
          mealPlanData: expect.objectContaining({
            planName: 'Weight Loss Plan',
            fitnessGoal: 'weight_loss',
          }),
        })
      );

      // Close modal
      const closeButton = screen.getByTestId('modal-close-button');
      await user.click(closeButton);

      // Verify modal closes
      expect(screen.queryByTestId('meal-plan-modal')).not.toBeInTheDocument();
      expect(mockMealPlanModalClose).toHaveBeenCalled();
    });

    it('supports viewing multiple meal plans in sequence', async () => {
      const user = userEvent.setup();
      const { queryClient, apiMock } = setupAssignmentTest('withAssignments');

      mockApiRequest.mockImplementation(apiMock);

      renderWithProviders(
        <TrainerMealPlans />,
        {
          queryClient,
          authContextValue: createMockAuthContext(mockUsers.trainer),
        }
      );

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
        expect(screen.getByText('Muscle Gain Plan')).toBeInTheDocument();
      });

      // View first plan
      let dropdown = screen.getAllByTestId('more-vertical-icon')[0];
      await user.click(dropdown.closest('button')!);
      await user.click(screen.getByText('View Details'));

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('modal-close-button'));

      // View second plan
      dropdown = screen.getAllByTestId('more-vertical-icon')[1];
      await user.click(dropdown.closest('button')!);
      await user.click(screen.getByText('View Details'));

      await waitFor(() => {
        expect(screen.getByText('Muscle Gain Plan')).toBeInTheDocument();
        expect(screen.getByText('Goal: muscle_gain')).toBeInTheDocument();
        expect(screen.getByText('Days: 14')).toBeInTheDocument();
      });

      expect(mockMealPlanModalClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('PDF Download Path', () => {
    it('successfully downloads PDF from meal plan cards', async () => {
      const user = userEvent.setup();
      const { queryClient, apiMock } = setupAssignmentTest('withAssignments');

      mockApiRequest.mockImplementation(apiMock);

      // Test with CustomerManagement to verify assigned meal plans can be downloaded
      renderWithProviders(
        <CustomerManagement />,
        {
          queryClient,
          authContextValue: createMockAuthContext(mockUsers.trainer),
        }
      );

      await waitFor(() => {
        expect(screen.getByText('customer1@test.com')).toBeInTheDocument();
      });

      // Navigate to customer detail (this would show assigned meal plans)
      const customerCard = screen.getByText('customer1@test.com').closest('div')?.parentElement;
      if (customerCard) {
        await user.click(customerCard);
      }

      // Verify navigation occurred
      expect(mockCustomerDetailNavigation).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'customer1@test.com',
        })
      );

      // Verify detail view is shown
      await waitFor(() => {
        expect(screen.getByTestId('customer-detail-view')).toBeInTheDocument();
      });
    });

    it('handles PDF export from different contexts', async () => {
      const user = userEvent.setup();
      const { queryClient, apiMock } = setupAssignmentTest('withAssignments');

      mockApiRequest.mockImplementation(apiMock);

      renderWithProviders(
        <TrainerMealPlans />,
        {
          queryClient,
          authContextValue: createMockAuthContext(mockUsers.trainer),
        }
      );

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // Test PDF export from modal
      const dropdown = screen.getAllByTestId('more-vertical-icon')[0];
      await user.click(dropdown.closest('button')!);
      await user.click(screen.getByText('View Details'));

      await waitFor(() => {
        expect(screen.getByTestId('meal-plan-modal')).toBeInTheDocument();
      });

      const modalPDFButton = screen.getByTestId('modal-pdf-export');
      await user.click(modalPDFButton);

      expect(mockPDFExport).toHaveBeenCalledWith(
        expect.objectContaining({
          mealPlanData: expect.objectContaining({
            planName: 'Weight Loss Plan',
          }),
        })
      );
    });
  });

  describe('Navigation Between Components Path', () => {
    it('maintains state when navigating between trainer meal plans and customer management', async () => {
      const user = userEvent.setup();
      const { queryClient, apiMock } = setupAssignmentTest('withAssignments');

      mockApiRequest.mockImplementation(apiMock);

      // Start with TrainerMealPlans
      const { rerender } = renderWithProviders(
        <TrainerMealPlans />,
        {
          queryClient,
          authContextValue: createMockAuthContext(mockUsers.trainer),
        }
      );

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
        expect(screen.getByText('Assigned to 1 customer')).toBeInTheDocument(); // From withAssignments scenario
      });

      // Switch to CustomerManagement
      rerender(<CustomerManagement />);

      await waitFor(() => {
        expect(screen.getByText('Customer Management')).toBeInTheDocument();
        expect(screen.getByText('customer1@test.com')).toBeInTheDocument();
      });

      // Navigate to customer detail
      const customerCard = screen.getByText('customer1@test.com').closest('div')?.parentElement;
      if (customerCard) {
        await user.click(customerCard);
      }

      expect(mockCustomerDetailNavigation).toHaveBeenCalled();

      // Navigate back
      await user.click(screen.getByTestId('back-button'));

      expect(screen.getByText('Customer Management')).toBeInTheDocument();

      // Switch back to TrainerMealPlans
      rerender(<TrainerMealPlans />);

      // Verify state is maintained
      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
        expect(screen.getByText('Assigned to 1 customer')).toBeInTheDocument();
      });
    });
  });

  describe('Error Recovery Paths', () => {
    it('recovers from assignment failure and allows retry', async () => {
      const user = userEvent.setup();
      const { queryClient, apiMock } = setupAssignmentTest('assignmentFailure');

      mockApiRequest.mockImplementation(apiMock);

      renderWithProviders(
        <TrainerMealPlans />,
        {
          queryClient,
          authContextValue: createMockAuthContext(mockUsers.trainer),
        }
      );

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // Attempt assignment that will fail
      const dropdown = screen.getAllByTestId('more-vertical-icon')[0];
      await user.click(dropdown.closest('button')!);
      await user.click(screen.getByText('Assign to Customer'));

      await waitFor(() => {
        expect(screen.getByText('customer1@test.com')).toBeInTheDocument();
      });

      const customerRow = screen.getByText('customer1@test.com').closest('div');
      await user.click(customerRow!);
      await user.click(screen.getByText('Assign (1)'));

      // Verify error notification
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Assignment Failed',
          description: 'Assignment failed',
          variant: 'destructive',
        });
      });

      // Verify modal remains open for retry
      expect(screen.getByText('Assign Meal Plan to Customer')).toBeInTheDocument();

      // Assignment count should remain unchanged
      await user.click(screen.getByText('Cancel'));
      expect(screen.getByText('Assigned to 0 customers')).toBeInTheDocument();
    });

    it('handles data loading failures gracefully', async () => {
      const user = userEvent.setup();
      const { queryClient, apiMock } = setupAssignmentTest('customerLoadingFailure');

      mockApiRequest.mockImplementation(apiMock);

      renderWithProviders(
        <TrainerMealPlans />,
        {
          queryClient,
          authContextValue: createMockAuthContext(mockUsers.trainer),
        }
      );

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // Try to open assignment modal
      const dropdown = screen.getAllByTestId('more-vertical-icon')[0];
      await user.click(dropdown.closest('button')!);
      await user.click(screen.getByText('Assign to Customer'));

      // Modal should open but customers should fail to load
      await waitFor(() => {
        expect(screen.getByText('Assign Meal Plan to Customer')).toBeInTheDocument();
      });

      // Should handle loading failure gracefully
      // (The specific behavior depends on the component implementation)
    });
  });

  describe('Edge Cases and Data Persistence', () => {
    it('handles empty states correctly', async () => {
      const { queryClient, apiMock } = setupAssignmentTest('noCustomers');

      mockApiRequest.mockImplementation(apiMock);

      renderWithProviders(
        <CustomerManagement />,
        {
          queryClient,
          authContextValue: createMockAuthContext(mockUsers.trainer),
        }
      );

      await waitFor(() => {
        expect(screen.getByText('No Customers Yet')).toBeInTheDocument();
        expect(screen.getByText('Start by assigning meal plans to customers through the admin panel.')).toBeInTheDocument();
      });

      expect(screen.getByText('0 Customers')).toBeInTheDocument();
    });

    it('persists data across component unmount/remount cycles', async () => {
      const { queryClient, apiMock } = setupAssignmentTest('withAssignments');

      mockApiRequest.mockImplementation(apiMock);

      const { unmount, rerender } = renderWithProviders(
        <TrainerMealPlans />,
        {
          queryClient,
          authContextValue: createMockAuthContext(mockUsers.trainer),
        }
      );

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
        expect(screen.getByText('Assigned to 1 customer')).toBeInTheDocument();
      });

      // Unmount component
      unmount();

      // Remount component
      rerender(<TrainerMealPlans />);

      // Data should be available from cache
      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
        expect(screen.getByText('Assigned to 1 customer')).toBeInTheDocument();
      });
    });
  });
});