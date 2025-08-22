/**
 * Meal Plan Assignment Workflow Integration Tests
 * 
 * Comprehensive end-to-end tests for the meal plan assignment functionality:
 * - Complete assignment workflow from trainer perspective
 * - State synchronization between TrainerMealPlans and CustomerManagement
 * - Cache invalidation effects across components
 * - Real React Query integration with proper cache management
 * - Error handling throughout the assignment process
 * - User experience flow from assignment to verification
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/react-query';
import { renderWithProviders, createMockAuthContext, mockUsers } from '../test-utils';
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

// Mock component dependencies
vi.mock('@/components/MealPlanModal', () => ({
  default: ({ mealPlan, onClose }: { mealPlan: any; onClose: () => void }) => (
    <div data-testid="meal-plan-modal">
      <h2>Meal Plan Details</h2>
      <p>Plan: {mealPlan.mealPlanData?.planName || 'Unknown Plan'}</p>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('@/components/CustomerDetailView', () => ({
  default: ({ customer, onBack }: { customer: any; onBack: () => void }) => (
    <div data-testid="customer-detail-view">
      <h2>Customer Details: {customer.email}</h2>
      <button onClick={onBack}>Back to Customers</button>
    </div>
  ),
}));

vi.mock('@/components/PDFExportButton', () => ({
  SimplePDFExportButton: ({ mealPlan, onClick }: { mealPlan: any; onClick?: () => void }) => (
    <button 
      data-testid="pdf-export-button"
      onClick={onClick}
    >
      Download PDF: {mealPlan.mealPlanData?.planName}
    </button>
  ),
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

describe('Meal Plan Assignment Workflow Integration', () => {
  let queryClient: QueryClient;
  let mockToast: ReturnType<typeof vi.fn>;

  // Test data representing the application state
  const mockTrainerMealPlans = [
    {
      id: 'plan-1',
      trainerId: 'trainer-1',
      mealPlanData: {
        planName: 'Weight Loss Plan',
        fitnessGoal: 'weight_loss',
        days: 7,
        mealsPerDay: 3,
        dailyCalorieTarget: 1800,
        description: 'A comprehensive weight loss meal plan',
      },
      notes: 'Great for beginners',
      tags: ['weight-loss', 'beginner'],
      isTemplate: false,
      assignmentCount: 0, // Initially unassigned
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
    },
    {
      id: 'plan-2',
      trainerId: 'trainer-1',
      mealPlanData: {
        planName: 'Muscle Gain Plan',
        fitnessGoal: 'muscle_gain',
        days: 14,
        mealsPerDay: 4,
        dailyCalorieTarget: 2500,
        description: 'High protein muscle building plan',
      },
      notes: 'For advanced athletes',
      tags: ['muscle-gain', 'advanced'],
      isTemplate: true,
      assignmentCount: 2,
      createdAt: new Date('2024-01-20'),
      updatedAt: new Date('2024-01-20'),
    },
  ];

  const mockCustomers = [
    {
      id: 'customer-1',
      email: 'customer1@test.com',
      role: 'customer' as const,
      firstAssignedAt: '2024-01-15T10:00:00Z',
    },
    {
      id: 'customer-2',
      email: 'customer2@test.com',
      role: 'customer' as const,
      firstAssignedAt: '2024-01-20T15:30:00Z',
    },
  ];

  // Initially empty meal plan assignments
  let mockCustomerMealPlans: any[] = [];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false, gcTime: 0 },
      },
    });

    // Reset meal plan assignments
    mockCustomerMealPlans = [];

    // Setup API mocks that simulate real behavior
    mockApiRequest.mockImplementation((method, url, body) => {
      // GET /api/trainer/meal-plans
      if (method === 'GET' && url === '/api/trainer/meal-plans') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            mealPlans: mockTrainerMealPlans.map(plan => ({
              ...plan,
              // Update assignment count based on current assignments
              assignmentCount: mockCustomerMealPlans.filter(assignment => 
                assignment.mealPlanData.planName === plan.mealPlanData.planName
              ).length
            }))
          }),
        } as Response);
      }

      // GET /api/trainer/customers
      if (method === 'GET' && url === '/api/trainer/customers') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ customers: mockCustomers }),
        } as Response);
      }

      // GET /api/trainer/customers/{id}/meal-plans
      if (method === 'GET' && url.includes('/meal-plans') && url.includes('/customers/')) {
        const customerId = url.split('/customers/')[1].split('/meal-plans')[0];
        const customerAssignments = mockCustomerMealPlans.filter(plan => plan.customerId === customerId);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            mealPlans: customerAssignments,
            total: customerAssignments.length 
          }),
        } as Response);
      }

      // POST /api/trainer/meal-plans/{id}/assign
      if (method === 'POST' && url.includes('/assign')) {
        const planId = url.split('/meal-plans/')[1].split('/assign')[0];
        const plan = mockTrainerMealPlans.find(p => p.id === planId);
        const { customerId } = body as any;

        if (plan && customerId) {
          // Create new assignment
          const newAssignment = {
            id: `assignment-${Date.now()}`,
            customerId,
            trainerId: 'trainer-1',
            mealPlanData: plan.mealPlanData,
            assignedAt: new Date().toISOString(),
          };

          mockCustomerMealPlans.push(newAssignment);

          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ 
              assignment: newAssignment,
              message: 'Meal plan assigned successfully' 
            }),
          } as Response);
        }

        return Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: 'Invalid assignment data' }),
        } as Response);
      }

      // DELETE /api/trainer/meal-plans/{id}
      if (method === 'DELETE' && url.includes('/meal-plans/')) {
        const assignmentId = url.split('/meal-plans/')[1];
        const assignmentIndex = mockCustomerMealPlans.findIndex(plan => plan.id === assignmentId);
        
        if (assignmentIndex > -1) {
          mockCustomerMealPlans.splice(assignmentIndex, 1);
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ message: 'Assignment removed' }),
          } as Response);
        }

        return Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ error: 'Assignment not found' }),
        } as Response);
      }

      // Default response
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);
    });

    mockToast = vi.fn();
    vi.mocked(require('@/hooks/use-toast').useToast).mockReturnValue({
      toast: mockToast,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Assignment Workflow', () => {
    it('completes full meal plan assignment from trainer to customer', async () => {
      const user = userEvent.setup();

      // Render TrainerMealPlans component
      renderWithProviders(
        <TrainerMealPlans />,
        {
          queryClient,
          authContextValue: createMockAuthContext(mockUsers.trainer),
        }
      );

      // Wait for meal plans to load
      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      });

      // Verify initial assignment count
      expect(screen.getByText('Assigned to 0 customers')).toBeInTheDocument();

      // Open assignment modal
      const dropdownButtons = screen.getAllByTestId('more-vertical-icon');
      await user.click(dropdownButtons[0].closest('button')!);
      await user.click(screen.getByText('Assign to Customer'));

      // Wait for modal and customers to load
      await waitFor(() => {
        expect(screen.getByText('Assign Meal Plan to Customer')).toBeInTheDocument();
        expect(screen.getByText('customer1@test.com')).toBeInTheDocument();
      });

      // Select customer
      const customerRow = screen.getByText('customer1@test.com').closest('div');
      await user.click(customerRow!);

      // Verify assign button is enabled
      const assignButton = screen.getByText('Assign (1)');
      expect(assignButton).not.toBeDisabled();

      // Complete assignment
      await user.click(assignButton);

      // Verify success notification
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Meal Plan Assigned',
          description: 'The meal plan has been successfully assigned to the customer.',
        });
      });

      // Verify modal closes
      expect(screen.queryByText('Assign Meal Plan to Customer')).not.toBeInTheDocument();

      // Verify assignment count updates (due to cache invalidation)
      await waitFor(() => {
        expect(screen.getByText('Assigned to 1 customer')).toBeInTheDocument();
      });
    });

    it('reflects assignment in customer management view', async () => {
      const user = userEvent.setup();

      // First, assign a meal plan (simulate existing assignment)
      mockCustomerMealPlans.push({
        id: 'assignment-1',
        customerId: 'customer-1',
        trainerId: 'trainer-1',
        mealPlanData: {
          planName: 'Weight Loss Plan',
          fitnessGoal: 'weight_loss',
          days: 7,
          dailyCalorieTarget: 1800,
        },
        assignedAt: new Date().toISOString(),
      });

      // Render CustomerManagement component
      renderWithProviders(
        <CustomerManagement />,
        {
          queryClient,
          authContextValue: createMockAuthContext(mockUsers.trainer),
        }
      );

      // Wait for customers to load
      await waitFor(() => {
        expect(screen.getByText('customer1@test.com')).toBeInTheDocument();
      });

      // Navigate to customer detail view
      const customerCard = screen.getByText('customer1@test.com').closest('div')?.parentElement;
      if (customerCard) {
        await user.click(customerCard);
      }

      // Verify customer detail view loads
      await waitFor(() => {
        expect(screen.getByTestId('customer-detail-view')).toBeInTheDocument();
        expect(screen.getByText('Customer Details: customer1@test.com')).toBeInTheDocument();
      });

      // Verify meal plan assignment API call was made
      expect(mockApiRequest).toHaveBeenCalledWith('GET', '/api/trainer/customers/customer-1/meal-plans');
    });
  });

  describe('State Synchronization', () => {
    it('synchronizes assignment counts between components', async () => {
      const user = userEvent.setup();

      // Render TrainerMealPlans with shared query client
      const { rerender } = renderWithProviders(
        <TrainerMealPlans />,
        {
          queryClient,
          authContextValue: createMockAuthContext(mockUsers.trainer),
        }
      );

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
        expect(screen.getByText('Assigned to 0 customers')).toBeInTheDocument();
      });

      // Perform assignment
      const dropdownButtons = screen.getAllByTestId('more-vertical-icon');
      await user.click(dropdownButtons[0].closest('button')!);
      await user.click(screen.getByText('Assign to Customer'));

      await waitFor(() => {
        expect(screen.getByText('customer1@test.com')).toBeInTheDocument();
      });

      const customerRow = screen.getByText('customer1@test.com').closest('div');
      await user.click(customerRow!);
      await user.click(screen.getByText('Assign (1)'));

      // Wait for assignment to complete
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Meal Plan Assigned',
          })
        );
      });

      // Verify updated count
      await waitFor(() => {
        expect(screen.getByText('Assigned to 1 customer')).toBeInTheDocument();
      });

      // Switch to CustomerManagement with same query client
      rerender(<CustomerManagement />);

      // Verify customers load and can access meal plans
      await waitFor(() => {
        expect(screen.getByText('customer1@test.com')).toBeInTheDocument();
      });

      // The assignment should be reflected in the customer's meal plans
      // (verified through API calls in the mock)
    });

    it('handles multiple assignments correctly', async () => {
      const user = userEvent.setup();

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
      let dropdownButtons = screen.getAllByTestId('more-vertical-icon');
      await user.click(dropdownButtons[0].closest('button')!);
      await user.click(screen.getByText('Assign to Customer'));

      await waitFor(() => {
        expect(screen.getByText('customer1@test.com')).toBeInTheDocument();
      });

      let customerRow = screen.getByText('customer1@test.com').closest('div');
      await user.click(customerRow!);
      await user.click(screen.getByText('Assign (1)'));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Meal Plan Assigned',
          })
        );
      });

      // Second assignment to different customer
      dropdownButtons = screen.getAllByTestId('more-vertical-icon');
      await user.click(dropdownButtons[0].closest('button')!);
      await user.click(screen.getByText('Assign to Customer'));

      await waitFor(() => {
        expect(screen.getByText('customer2@test.com')).toBeInTheDocument();
      });

      customerRow = screen.getByText('customer2@test.com').closest('div');
      await user.click(customerRow!);
      await user.click(screen.getByText('Assign (1)'));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledTimes(2);
      });

      // Verify final assignment count
      await waitFor(() => {
        expect(screen.getByText('Assigned to 2 customers')).toBeInTheDocument();
      });
    });
  });

  describe('Cache Invalidation Effects', () => {
    it('properly invalidates and refetches data after assignment', async () => {
      const user = userEvent.setup();
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

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

      // Perform assignment
      const dropdownButtons = screen.getAllByTestId('more-vertical-icon');
      await user.click(dropdownButtons[0].closest('button')!);
      await user.click(screen.getByText('Assign to Customer'));

      await waitFor(() => {
        expect(screen.getByText('customer1@test.com')).toBeInTheDocument();
      });

      const customerRow = screen.getByText('customer1@test.com').closest('div');
      await user.click(customerRow!);
      await user.click(screen.getByText('Assign (1)'));

      // Verify cache invalidation occurs
      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['/api/trainer/meal-plans'] });
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['trainerCustomers'] });
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['customerMealPlans', 'customer-1'] });
      });

      // Verify refetch happens
      expect(mockApiRequest).toHaveBeenCalledWith('GET', '/api/trainer/meal-plans');
    });

    it('maintains data consistency across component rerenders', async () => {
      const user = userEvent.setup();

      // Start with assignment already in place
      mockCustomerMealPlans.push({
        id: 'assignment-1',
        customerId: 'customer-1',
        trainerId: 'trainer-1',
        mealPlanData: {
          planName: 'Weight Loss Plan',
          fitnessGoal: 'weight_loss',
          days: 7,
          dailyCalorieTarget: 1800,
        },
        assignedAt: new Date().toISOString(),
      });

      const { rerender } = renderWithProviders(
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

      // Rerender component
      rerender(<TrainerMealPlans />);

      // Data should remain consistent
      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
        expect(screen.getByText('Assigned to 1 customer')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling Throughout Workflow', () => {
    it('handles assignment API failure gracefully', async () => {
      const user = userEvent.setup();

      // Mock assignment failure
      mockApiRequest.mockImplementation((method, url, body) => {
        if (method === 'GET' && url === '/api/trainer/meal-plans') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ mealPlans: mockTrainerMealPlans }),
          } as Response);
        }
        if (method === 'GET' && url === '/api/trainer/customers') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ customers: mockCustomers }),
          } as Response);
        }
        if (method === 'POST' && url.includes('/assign')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ error: 'Server error' }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        } as Response);
      });

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

      // Attempt assignment
      const dropdownButtons = screen.getAllByTestId('more-vertical-icon');
      await user.click(dropdownButtons[0].closest('button')!);
      await user.click(screen.getByText('Assign to Customer'));

      await waitFor(() => {
        expect(screen.getByText('customer1@test.com')).toBeInTheDocument();
      });

      const customerRow = screen.getByText('customer1@test.com').closest('div');
      await user.click(customerRow!);
      await user.click(screen.getByText('Assign (1)'));

      // Verify error handling
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Assignment Failed',
          description: 'Failed to assign meal plan',
          variant: 'destructive',
        });
      });

      // Assignment count should remain unchanged
      expect(screen.getByText('Assigned to 0 customers')).toBeInTheDocument();
    });

    it('handles network errors during customer loading', async () => {
      const user = userEvent.setup();

      // Mock customer loading failure
      mockApiRequest.mockImplementation((method, url) => {
        if (method === 'GET' && url === '/api/trainer/meal-plans') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ mealPlans: mockTrainerMealPlans }),
          } as Response);
        }
        if (method === 'GET' && url === '/api/trainer/customers') {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        } as Response);
      });

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
      const dropdownButtons = screen.getAllByTestId('more-vertical-icon');
      await user.click(dropdownButtons[0].closest('button')!);
      await user.click(screen.getByText('Assign to Customer'));

      // Modal should open but show error state for customers
      await waitFor(() => {
        expect(screen.getByText('Assign Meal Plan to Customer')).toBeInTheDocument();
        // Customer loading should fail silently or show loading state
      });
    });
  });

  describe('User Experience Flow', () => {
    it('provides smooth transition through assignment process', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <TrainerMealPlans />,
        {
          queryClient,
          authContextValue: createMockAuthContext(mockUsers.trainer),
        }
      );

      // Initial state
      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
        expect(screen.getByText('Assigned to 0 customers')).toBeInTheDocument();
      });

      // Step 1: Open assignment modal
      const dropdownButtons = screen.getAllByTestId('more-vertical-icon');
      await user.click(dropdownButtons[0].closest('button')!);
      await user.click(screen.getByText('Assign to Customer'));

      // Step 2: Modal opens with customer list
      await waitFor(() => {
        expect(screen.getByText('Assign Meal Plan to Customer')).toBeInTheDocument();
        expect(screen.getByText(/Select a customer to assign/)).toBeInTheDocument();
      });

      // Step 3: Customers load
      await waitFor(() => {
        expect(screen.getByText('customer1@test.com')).toBeInTheDocument();
        expect(screen.getByText('customer2@test.com')).toBeInTheDocument();
      });

      // Step 4: Assign button is initially disabled
      expect(screen.getByText('Assign (0)')).toBeDisabled();

      // Step 5: Select customer
      const customerRow = screen.getByText('customer1@test.com').closest('div');
      await user.click(customerRow!);

      // Step 6: Assign button becomes enabled
      expect(screen.getByText('Assign (1)')).not.toBeDisabled();

      // Step 7: Complete assignment
      await user.click(screen.getByText('Assign (1)'));

      // Step 8: Success feedback
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Meal Plan Assigned',
          })
        );
      });

      // Step 9: Modal closes automatically
      expect(screen.queryByText('Assign Meal Plan to Customer')).not.toBeInTheDocument();

      // Step 10: UI updates to reflect assignment
      await waitFor(() => {
        expect(screen.getByText('Assigned to 1 customer')).toBeInTheDocument();
      });
    });

    it('handles cancellation flow correctly', async () => {
      const user = userEvent.setup();

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

      // Open assignment modal
      const dropdownButtons = screen.getAllByTestId('more-vertical-icon');
      await user.click(dropdownButtons[0].closest('button')!);
      await user.click(screen.getByText('Assign to Customer'));

      await waitFor(() => {
        expect(screen.getByText('Assign Meal Plan to Customer')).toBeInTheDocument();
        expect(screen.getByText('customer1@test.com')).toBeInTheDocument();
      });

      // Select customer
      const customerRow = screen.getByText('customer1@test.com').closest('div');
      await user.click(customerRow!);
      expect(screen.getByText('Assign (1)')).not.toBeDisabled();

      // Cancel instead of assigning
      await user.click(screen.getByText('Cancel'));

      // Modal should close
      expect(screen.queryByText('Assign Meal Plan to Customer')).not.toBeInTheDocument();

      // No assignment should be made
      expect(screen.getByText('Assigned to 0 customers')).toBeInTheDocument();
      expect(mockApiRequest).not.toHaveBeenCalledWith(
        'POST',
        expect.stringContaining('/assign'),
        expect.anything()
      );
    });
  });

  describe('Real React Query Integration', () => {
    it('properly manages query states and cache', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <TrainerMealPlans />,
        {
          queryClient,
          authContextValue: createMockAuthContext(mockUsers.trainer),
        }
      );

      // Verify initial queries are made
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('GET', '/api/trainer/meal-plans');
      });

      // Check cache state
      const mealPlansData = queryClient.getQueryData(['/api/trainer/meal-plans']);
      expect(mealPlansData).toBeDefined();

      // Open assignment modal (triggers customer query)
      const dropdownButtons = screen.getAllByTestId('more-vertical-icon');
      await user.click(dropdownButtons[0].closest('button')!);
      await user.click(screen.getByText('Assign to Customer'));

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('GET', '/api/trainer/customers');
      });

      // Check customer cache
      const customersData = queryClient.getQueryData(['trainerCustomers']);
      expect(customersData).toBeDefined();

      // Complete assignment and verify cache invalidation behavior
      await waitFor(() => {
        expect(screen.getByText('customer1@test.com')).toBeInTheDocument();
      });

      const customerRow = screen.getByText('customer1@test.com').closest('div');
      await user.click(customerRow!);
      await user.click(screen.getByText('Assign (1)'));

      // After assignment, queries should be invalidated and refetched
      await waitFor(() => {
        // Should have multiple calls due to invalidation and refetch
        const mealPlanCalls = mockApiRequest.mock.calls.filter(
          call => call[0] === 'GET' && call[1] === '/api/trainer/meal-plans'
        );
        expect(mealPlanCalls.length).toBeGreaterThan(1);
      });
    });
  });
});