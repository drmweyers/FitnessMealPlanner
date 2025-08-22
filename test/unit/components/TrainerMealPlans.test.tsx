/**
 * TrainerMealPlans Component Comprehensive Tests
 * 
 * Tests the meal plan assignment functionality that was recently fixed, including:
 * - Meal plan assignment workflow and modal interactions
 * - Customer selection and assignment process
 * - Query key usage and cache invalidation
 * - React Query hooks and API call handling
 * - Assignment button states and form validation
 * - Error handling and success notifications
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/react-query';
import TrainerMealPlans from '@/components/TrainerMealPlans';
import { renderWithProviders, createMockAuthContext, mockUsers } from '../../test-utils';
import { apiRequest } from '../../../client/src/lib/queryClient';
import type { TrainerMealPlanWithAssignments, CustomerMealPlan } from '@shared/schema';

// Mock dependencies
vi.mock('../../../client/src/lib/queryClient', () => ({
  apiRequest: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock MealPlanModal component
vi.mock('@/components/MealPlanModal', () => ({
  default: ({ mealPlan, onClose }: { mealPlan: CustomerMealPlan; onClose: () => void }) => (
    <div data-testid="meal-plan-modal">
      <h2>Meal Plan Modal</h2>
      <p>Plan: {mealPlan.mealPlanData?.planName || 'Unknown Plan'}</p>
      <button onClick={onClose}>Close Modal</button>
    </div>
  ),
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Calendar: () => <div data-testid="calendar-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Utensils: () => <div data-testid="utensils-icon" />,
  Search: () => <div data-testid="search-icon" />,
  MoreVertical: () => <div data-testid="more-vertical-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  UserPlus: () => <div data-testid="user-plus-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
}));

const mockApiRequest = vi.mocked(apiRequest);

describe('TrainerMealPlans', () => {
  let queryClient: QueryClient;
  let mockToast: ReturnType<typeof vi.fn>;

  // Mock data
  const mockTrainerMealPlans: TrainerMealPlanWithAssignments[] = [
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
      assignmentCount: 2,
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
      assignmentCount: 1,
      createdAt: new Date('2024-01-20'),
      updatedAt: new Date('2024-01-20'),
    },
  ];

  const mockCustomers = [
    {
      id: 'customer-1',
      email: 'customer1@test.com',
      role: 'customer' as const,
    },
    {
      id: 'customer-2',
      email: 'customer2@test.com',
      role: 'customer' as const,
    },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Mock successful API responses by default
    mockApiRequest.mockImplementation((method, url) => {
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

  describe('Component Rendering', () => {
    it('renders meal plans list correctly', async () => {
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

      expect(screen.getByText('7 days, 3 meals/day')).toBeInTheDocument();
      expect(screen.getByText('14 days, 4 meals/day')).toBeInTheDocument();
      expect(screen.getByText('1800 cal/day')).toBeInTheDocument();
      expect(screen.getByText('2500 cal/day')).toBeInTheDocument();
    });

    it('displays assignment counts correctly', async () => {
      renderWithProviders(
        <TrainerMealPlans />,
        {
          queryClient,
          authContextValue: createMockAuthContext(mockUsers.trainer),
        }
      );

      await waitFor(() => {
        expect(screen.getByText('Assigned to 2 customers')).toBeInTheDocument();
        expect(screen.getByText('Assigned to 1 customer')).toBeInTheDocument();
      });
    });

    it('shows template badge for template plans', async () => {
      renderWithProviders(
        <TrainerMealPlans />,
        {
          queryClient,
          authContextValue: createMockAuthContext(mockUsers.trainer),
        }
      );

      await waitFor(() => {
        expect(screen.getByText('Template')).toBeInTheDocument();
      });
    });

    it('displays loading state initially', () => {
      renderWithProviders(
        <TrainerMealPlans />,
        {
          queryClient,
          authContextValue: createMockAuthContext(mockUsers.trainer),
        }
      );

      expect(screen.getByTestId('loading-spinner') || screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('filters meal plans by name', async () => {
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

      const searchInput = screen.getByPlaceholderText(/search meal plans/i);
      await user.type(searchInput, 'weight');

      expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      expect(screen.queryByText('Muscle Gain Plan')).not.toBeInTheDocument();
    });

    it('filters meal plans by fitness goal', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <TrainerMealPlans />,
        {
          queryClient,
          authContextValue: createMockAuthContext(mockUsers.trainer),
        }
      );

      await waitFor(() => {
        expect(screen.getByText('Muscle Gain Plan')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search meal plans/i);
      await user.type(searchInput, 'muscle_gain');

      expect(screen.getByText('Muscle Gain Plan')).toBeInTheDocument();
      expect(screen.queryByText('Weight Loss Plan')).not.toBeInTheDocument();
    });

    it('filters meal plans by tags', async () => {
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

      const searchInput = screen.getByPlaceholderText(/search meal plans/i);
      await user.type(searchInput, 'beginner');

      expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      expect(screen.queryByText('Muscle Gain Plan')).not.toBeInTheDocument();
    });
  });

  describe('Meal Plan Assignment Modal', () => {
    it('opens assignment modal when clicking assign button', async () => {
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

      // Click the dropdown menu button
      const dropdownButtons = screen.getAllByTestId('more-vertical-icon');
      await user.click(dropdownButtons[0].closest('button')!);

      // Click the assign button
      const assignButton = screen.getByText('Assign to Customer');
      await user.click(assignButton);

      // Check modal is open
      expect(screen.getByText('Assign Meal Plan to Customer')).toBeInTheDocument();
      expect(screen.getByText(/Select a customer to assign/)).toBeInTheDocument();
    });

    it('displays customers in assignment modal', async () => {
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

      // Wait for customers to load
      await waitFor(() => {
        expect(screen.getByText('customer1@test.com')).toBeInTheDocument();
        expect(screen.getByText('customer2@test.com')).toBeInTheDocument();
      });
    });

    it('allows customer selection via checkbox', async () => {
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
        expect(screen.getByText('customer1@test.com')).toBeInTheDocument();
      });

      // Select a customer
      const customerRow = screen.getByText('customer1@test.com').closest('div');
      await user.click(customerRow!);

      // Verify assign button is enabled with count
      expect(screen.getByText('Assign (1)')).toBeInTheDocument();
      expect(screen.getByText('Assign (1)')).not.toBeDisabled();
    });

    it('shows loading state for customers', async () => {
      const user = userEvent.setup();
      
      // Mock delayed customer loading
      mockApiRequest.mockImplementation((method, url) => {
        if (method === 'GET' && url === '/api/trainer/meal-plans') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ mealPlans: mockTrainerMealPlans }),
          } as Response);
        }
        if (method === 'GET' && url === '/api/trainer/customers') {
          return new Promise(resolve => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: () => Promise.resolve({ customers: mockCustomers }),
              } as Response);
            }, 100);
          });
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

      // Open assignment modal
      const dropdownButtons = screen.getAllByTestId('more-vertical-icon');
      await user.click(dropdownButtons[0].closest('button')!);
      await user.click(screen.getByText('Assign to Customer'));

      // Check loading state
      expect(screen.getByText('Loading customers...')).toBeInTheDocument();
    });

    it('shows empty state when no customers exist', async () => {
      const user = userEvent.setup();
      
      // Mock empty customers response
      mockApiRequest.mockImplementation((method, url) => {
        if (method === 'GET' && url === '/api/trainer/meal-plans') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ mealPlans: mockTrainerMealPlans }),
          } as Response);
        }
        if (method === 'GET' && url === '/api/trainer/customers') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ customers: [] }),
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

      // Open assignment modal
      const dropdownButtons = screen.getAllByTestId('more-vertical-icon');
      await user.click(dropdownButtons[0].closest('button')!);
      await user.click(screen.getByText('Assign to Customer'));

      await waitFor(() => {
        expect(screen.getByText('No customers found')).toBeInTheDocument();
        expect(screen.getByText('Customers will appear here once they accept invitations.')).toBeInTheDocument();
      });
    });
  });

  describe('Meal Plan Assignment Process', () => {
    it('successfully assigns meal plan to customer', async () => {
      const user = userEvent.setup();
      
      // Mock successful assignment
      mockApiRequest.mockImplementation((method, url) => {
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
        if (method === 'POST' && url === '/api/trainer/meal-plans/plan-1/assign') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ 
              assignment: { id: 'assignment-123' },
              message: 'Meal plan assigned successfully' 
            }),
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

      // Open assignment modal
      const dropdownButtons = screen.getAllByTestId('more-vertical-icon');
      await user.click(dropdownButtons[0].closest('button')!);
      await user.click(screen.getByText('Assign to Customer'));

      await waitFor(() => {
        expect(screen.getByText('customer1@test.com')).toBeInTheDocument();
      });

      // Select customer and assign
      const customerRow = screen.getByText('customer1@test.com').closest('div');
      await user.click(customerRow!);
      
      const assignButton = screen.getByText('Assign (1)');
      await user.click(assignButton);

      // Verify API call
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          'POST',
          '/api/trainer/meal-plans/plan-1/assign',
          { customerId: 'customer-1' }
        );
      });

      // Verify success toast
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Meal Plan Assigned',
        description: 'The meal plan has been successfully assigned to the customer.',
      });
    });

    it('handles assignment failure', async () => {
      const user = userEvent.setup();
      
      // Mock failed assignment
      mockApiRequest.mockImplementation((method, url) => {
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
        if (method === 'POST' && url === '/api/trainer/meal-plans/plan-1/assign') {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({}),
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

      // Open assignment modal and assign
      const dropdownButtons = screen.getAllByTestId('more-vertical-icon');
      await user.click(dropdownButtons[0].closest('button')!);
      await user.click(screen.getByText('Assign to Customer'));

      await waitFor(() => {
        expect(screen.getByText('customer1@test.com')).toBeInTheDocument();
      });

      const customerRow = screen.getByText('customer1@test.com').closest('div');
      await user.click(customerRow!);
      
      const assignButton = screen.getByText('Assign (1)');
      await user.click(assignButton);

      // Verify error toast
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Assignment Failed',
          description: 'Failed to assign meal plan',
          variant: 'destructive',
        });
      });
    });

    it('shows validation error when no customer selected', async () => {
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
        expect(screen.getByText('customer1@test.com')).toBeInTheDocument();
      });

      // Try to assign without selecting customer
      const assignButton = screen.getByText('Assign (0)');
      expect(assignButton).toBeDisabled();
    });
  });

  describe('Query Cache Management', () => {
    it('uses correct query keys for meal plans', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      renderWithProviders(
        <TrainerMealPlans />,
        {
          queryClient,
          authContextValue: createMockAuthContext(mockUsers.trainer),
        }
      );

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('GET', '/api/trainer/meal-plans');
      });

      // Verify meal plans query key is used
      const mealPlansCache = queryClient.getQueryData(['/api/trainer/meal-plans']);
      expect(mealPlansCache).toBeDefined();
    });

    it('uses correct query key for customers', async () => {
      const user = userEvent.setup();
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
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

      // Open assignment modal to trigger customers query
      const dropdownButtons = screen.getAllByTestId('more-vertical-icon');
      await user.click(dropdownButtons[0].closest('button')!);
      await user.click(screen.getByText('Assign to Customer'));

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('GET', '/api/trainer/customers');
      });

      // Verify customers query key is used
      const customersCache = queryClient.getQueryData(['trainerCustomers']);
      expect(customersCache).toBeDefined();
    });

    it('invalidates correct cache keys after successful assignment', async () => {
      const user = userEvent.setup();
      const invalidateQueriesSpy = vi.spyOn(QueryClient.prototype, 'invalidateQueries');

      // Mock successful assignment
      mockApiRequest.mockImplementation((method, url) => {
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
        if (method === 'POST' && url === '/api/trainer/meal-plans/plan-1/assign') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ 
              assignment: { id: 'assignment-123' },
              message: 'Meal plan assigned successfully' 
            }),
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

      // Perform assignment
      const dropdownButtons = screen.getAllByTestId('more-vertical-icon');
      await user.click(dropdownButtons[0].closest('button')!);
      await user.click(screen.getByText('Assign to Customer'));

      await waitFor(() => {
        expect(screen.getByText('customer1@test.com')).toBeInTheDocument();
      });

      const customerRow = screen.getByText('customer1@test.com').closest('div');
      await user.click(customerRow!);
      
      const assignButton = screen.getByText('Assign (1)');
      await user.click(assignButton);

      // Verify cache invalidation calls
      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['/api/trainer/meal-plans'] });
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['trainerCustomers'] });
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['customerMealPlans', 'customer-1'] });
      });
    });
  });

  describe('Meal Plan Modal Integration', () => {
    it('opens meal plan modal when clicking view details', async () => {
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

      // Click the dropdown menu button
      const dropdownButtons = screen.getAllByTestId('more-vertical-icon');
      await user.click(dropdownButtons[0].closest('button')!);

      // Click view details
      const viewButton = screen.getByText('View Details');
      await user.click(viewButton);

      // Check modal is open
      expect(screen.getByTestId('meal-plan-modal')).toBeInTheDocument();
      expect(screen.getByText('Plan: Weight Loss Plan')).toBeInTheDocument();
    });

    it('closes meal plan modal correctly', async () => {
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

      // Open modal
      const dropdownButtons = screen.getAllByTestId('more-vertical-icon');
      await user.click(dropdownButtons[0].closest('button')!);
      await user.click(screen.getByText('View Details'));

      expect(screen.getByTestId('meal-plan-modal')).toBeInTheDocument();

      // Close modal
      await user.click(screen.getByText('Close Modal'));

      expect(screen.queryByTestId('meal-plan-modal')).not.toBeInTheDocument();
    });
  });

  describe('Delete Functionality', () => {
    it('opens delete confirmation dialog', async () => {
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

      // Click the dropdown menu button
      const dropdownButtons = screen.getAllByTestId('more-vertical-icon');
      await user.click(dropdownButtons[0].closest('button')!);

      // Click delete
      const deleteButton = screen.getByText('Delete');
      await user.click(deleteButton);

      // Check delete dialog is open
      expect(screen.getByText('Delete Meal Plan')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete this meal plan/)).toBeInTheDocument();
    });

    it('cancels delete operation', async () => {
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

      // Open delete dialog
      const dropdownButtons = screen.getAllByTestId('more-vertical-icon');
      await user.click(dropdownButtons[0].closest('button')!);
      await user.click(screen.getByText('Delete'));

      // Cancel delete
      await user.click(screen.getByText('Cancel'));

      // Dialog should be closed
      expect(screen.queryByText('Delete Meal Plan')).not.toBeInTheDocument();
    });
  });

  describe('Modal State Management', () => {
    it('closes assignment modal when clicking cancel', async () => {
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

      expect(screen.getByText('Assign Meal Plan to Customer')).toBeInTheDocument();

      // Click cancel
      await user.click(screen.getByText('Cancel'));

      // Modal should be closed
      expect(screen.queryByText('Assign Meal Plan to Customer')).not.toBeInTheDocument();
    });

    it('resets selected customers when modal closes', async () => {
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

      // Open assignment modal and select customer
      const dropdownButtons = screen.getAllByTestId('more-vertical-icon');
      await user.click(dropdownButtons[0].closest('button')!);
      await user.click(screen.getByText('Assign to Customer'));

      await waitFor(() => {
        expect(screen.getByText('customer1@test.com')).toBeInTheDocument();
      });

      const customerRow = screen.getByText('customer1@test.com').closest('div');
      await user.click(customerRow!);
      
      expect(screen.getByText('Assign (1)')).toBeInTheDocument();

      // Close modal
      await user.click(screen.getByText('Cancel'));

      // Reopen modal
      await user.click(dropdownButtons[0].closest('button')!);
      await user.click(screen.getByText('Assign to Customer'));

      await waitFor(() => {
        expect(screen.getByText('Assign (0)')).toBeInTheDocument();
      });
    });
  });
});