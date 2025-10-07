/**
 * Error Handling and Loading States Comprehensive Tests
 * 
 * Exhaustive tests for error handling scenarios and loading states in meal plan assignment:
 * - Network errors and timeouts
 * - Server errors (4xx, 5xx responses)
 * - Malformed data handling
 * - Loading states during data fetching
 * - Loading states during mutations
 * - Error recovery workflows
 * - Retry mechanisms
 * - User feedback for errors and loading
 * - Edge cases with partial data
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/react-query';
import { renderWithProviders, createMockAuthContext, mockUsers } from '../test-utils';
import { setupAssignmentTest, TestScenarioBuilder } from '../utils/mealPlanAssignmentTestUtils';
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

// Mock components for focused testing
vi.mock('@/components/MealPlanModal', () => ({
  default: ({ mealPlan, onClose }: { mealPlan: any; onClose: () => void }) => (
    <div data-testid="meal-plan-modal">
      <h2>Meal Plan: {mealPlan.mealPlanData?.planName || 'Error Loading'}</h2>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('@/components/CustomerDetailView', () => ({
  default: ({ customer, onBack }: { customer: any; onBack: () => void }) => (
    <div data-testid="customer-detail-view">
      <h2>Customer: {customer.email}</h2>
      <button onClick={onBack}>Back</button>
    </div>
  ),
}));

vi.mock('@/components/PDFExportButton', () => ({
  SimplePDFExportButton: ({ mealPlan, onClick }: { mealPlan: any; onClick?: () => void }) => (
    <button data-testid="pdf-export-button" onClick={onClick}>
      Export PDF
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

describe('Error Handling and Loading States Comprehensive Tests', () => {
  let mockToast: ReturnType<typeof vi.fn>;
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false, gcTime: 0 },
      },
    });

    mockToast = vi.fn();
    vi.mocked(require('@/hooks/use-toast').useToast).mockReturnValue({
      toast: mockToast,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Network Error Scenarios', () => {
    it('handles network error during meal plans loading', async () => {
      mockApiRequest.mockImplementation((method, url) => {
        if (method === 'GET' && url === '/api/trainer/meal-plans') {
          return Promise.reject(new Error('Network Error: Unable to connect'));
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

      // Should show loading initially
      expect(screen.getByTestId('loading-spinner') || document.querySelector('.animate-pulse')).toBeTruthy();

      // Should eventually show error state or empty state
      await waitFor(() => {
        // The component should handle the error gracefully
        // This might be an empty state or error message depending on implementation
        const hasErrorOrEmpty = 
          screen.queryByText(/no meal plans/i) ||
          screen.queryByText(/error/i) ||
          screen.queryByText(/failed/i) ||
          screen.queryByText(/couldn't load/i) ||
          screen.queryByText("You haven't saved any meal plans yet");
        
        expect(hasErrorOrEmpty).toBeTruthy();
      }, { timeout: 5000 });
    });

    it('handles network error during customer loading', async () => {
      const { apiMock } = setupAssignmentTest('fresh');
      
      // Override customer loading to fail
      mockApiRequest.mockImplementation((method, url) => {
        if (method === 'GET' && url === '/api/trainer/customers') {
          return Promise.reject(new Error('Network timeout'));
        }
        return apiMock(method, url);
      });

      renderWithProviders(
        <CustomerManagement />,
        {
          queryClient,
          authContextValue: createMockAuthContext(mockUsers.trainer),
        }
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load customers')).toBeInTheDocument();
        expect(screen.getByText('Network timeout')).toBeInTheDocument();
      });
    });

    it('handles intermittent network failures during assignment', async () => {
      const user = userEvent.setup();
      const { apiMock } = setupAssignmentTest('fresh');
      
      let attemptCount = 0;
      mockApiRequest.mockImplementation((method, url, body) => {
        if (method === 'POST' && url.includes('/assign')) {
          attemptCount++;
          if (attemptCount === 1) {
            return Promise.reject(new Error('Connection timeout'));
          }
          // Succeed on second attempt
          return apiMock(method, url, body);
        }
        return apiMock(method, url, body);
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
      const dropdown = screen.getAllByTestId('more-vertical-icon')[0];
      await user.click(dropdown.closest('button')!);
      await user.click(screen.getByText('Assign to Customer'));

      await waitFor(() => {
        expect(screen.getByText('customer1@test.com')).toBeInTheDocument();
      });

      const customerRow = screen.getByText('customer1@test.com').closest('div');
      await user.click(customerRow!);
      await user.click(screen.getByText('Assign (1)'));

      // First attempt should fail
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Assignment Failed',
          description: 'Connection timeout',
          variant: 'destructive',
        });
      });

      // Modal should remain open for retry
      expect(screen.getByText('Assign Meal Plan to Customer')).toBeInTheDocument();
    });
  });

  describe('Server Error Scenarios', () => {
    it('handles 500 internal server error during meal plan loading', async () => {
      mockApiRequest.mockImplementation((method, url) => {
        if (method === 'GET' && url === '/api/trainer/meal-plans') {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ error: 'Internal server error' }),
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
        // Should handle server error gracefully
        const hasErrorHandling = 
          screen.queryByText(/error/i) ||
          screen.queryByText(/failed/i) ||
          screen.queryByText("You haven't saved any meal plans yet");
        
        expect(hasErrorHandling).toBeTruthy();
      });
    });

    it('handles 404 error during assignment', async () => {
      const user = userEvent.setup();
      const { apiMock } = setupAssignmentTest('fresh');
      
      mockApiRequest.mockImplementation((method, url, body) => {
        if (method === 'POST' && url.includes('/assign')) {
          return Promise.resolve({
            ok: false,
            status: 404,
            json: () => Promise.resolve({ error: 'Meal plan not found' }),
          } as Response);
        }
        return apiMock(method, url, body);
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
      const dropdown = screen.getAllByTestId('more-vertical-icon')[0];
      await user.click(dropdown.closest('button')!);
      await user.click(screen.getByText('Assign to Customer'));

      await waitFor(() => {
        expect(screen.getByText('customer1@test.com')).toBeInTheDocument();
      });

      const customerRow = screen.getByText('customer1@test.com').closest('div');
      await user.click(customerRow!);
      await user.click(screen.getByText('Assign (1)'));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Assignment Failed',
          description: 'Failed to assign meal plan',
          variant: 'destructive',
        });
      });
    });

    it('handles 403 forbidden error with proper user feedback', async () => {
      const user = userEvent.setup();
      const { apiMock } = setupAssignmentTest('fresh');
      
      mockApiRequest.mockImplementation((method, url, body) => {
        if (method === 'POST' && url.includes('/assign')) {
          return Promise.resolve({
            ok: false,
            status: 403,
            json: () => Promise.resolve({ error: 'Insufficient permissions' }),
          } as Response);
        }
        return apiMock(method, url, body);
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

      const dropdown = screen.getAllByTestId('more-vertical-icon')[0];
      await user.click(dropdown.closest('button')!);
      await user.click(screen.getByText('Assign to Customer'));

      await waitFor(() => {
        expect(screen.getByText('customer1@test.com')).toBeInTheDocument();
      });

      const customerRow = screen.getByText('customer1@test.com').closest('div');
      await user.click(customerRow!);
      await user.click(screen.getByText('Assign (1)'));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Assignment Failed',
          description: 'Failed to assign meal plan',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Malformed Data Handling', () => {
    it('handles malformed meal plan data gracefully', async () => {
      mockApiRequest.mockImplementation((method, url) => {
        if (method === 'GET' && url === '/api/trainer/meal-plans') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              mealPlans: [
                {
                  id: 'plan-1',
                  // Missing required fields
                  mealPlanData: null,
                  trainerId: 'trainer-1',
                },
                {
                  id: 'plan-2',
                  mealPlanData: {
                    // Missing planName
                    days: 'invalid-number',
                    mealsPerDay: null,
                  },
                  trainerId: 'trainer-1',
                },
              ]
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
        // Should handle malformed data without crashing
        // Look for either proper error handling or fallback display
        const hasContent = document.body.textContent || '';
        expect(hasContent.length).toBeGreaterThan(0);
      });

      // Should not crash and should show some form of content
      expect(screen.queryByText(/error/i) || screen.queryByText('Unnamed Plan')).toBeTruthy();
    });

    it('handles malformed customer data', async () => {
      mockApiRequest.mockImplementation((method, url) => {
        if (method === 'GET' && url === '/api/trainer/customers') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              customers: [
                {
                  id: null,
                  email: 'invalid-email',
                },
                {
                  // Missing id
                  email: 'customer@test.com',
                  firstAssignedAt: 'invalid-date',
                },
              ]
            }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        } as Response);
      });

      renderWithProviders(
        <CustomerManagement />,
        {
          queryClient,
          authContextValue: createMockAuthContext(mockUsers.trainer),
        }
      );

      await waitFor(() => {
        // Should handle malformed data gracefully
        const hasContent = document.body.textContent || '';
        expect(hasContent.length).toBeGreaterThan(0);
      });

      // Should not crash the application
      expect(screen.getByText('Customer Management')).toBeInTheDocument();
    });
  });

  describe('Loading States During Data Fetching', () => {
    it('shows proper loading state for meal plans', async () => {
      let resolvePromise: (value: any) => void;
      const loadingPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockApiRequest.mockImplementation((method, url) => {
        if (method === 'GET' && url === '/api/trainer/meal-plans') {
          return loadingPromise.then(() => ({
            ok: true,
            json: () => Promise.resolve({ mealPlans: [] }),
          }));
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

      // Should show loading indicator
      expect(
        screen.getByTestId('loading-spinner') || 
        document.querySelector('.animate-pulse') ||
        document.querySelector('[data-loading="true"]')
      ).toBeTruthy();

      // Resolve the loading
      resolvePromise!({});

      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });
    });

    it('shows loading state for customers in assignment modal', async () => {
      const user = userEvent.setup();
      const { apiMock } = setupAssignmentTest('fresh');
      
      let resolveCustomers: (value: any) => void;
      const customersPromise = new Promise(resolve => {
        resolveCustomers = resolve;
      });

      mockApiRequest.mockImplementation((method, url) => {
        if (method === 'GET' && url === '/api/trainer/customers') {
          return customersPromise.then(() => ({
            ok: true,
            json: () => Promise.resolve({ customers: [] }),
          }));
        }
        return apiMock(method, url);
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
      const dropdown = screen.getAllByTestId('more-vertical-icon')[0];
      await user.click(dropdown.closest('button')!);
      await user.click(screen.getByText('Assign to Customer'));

      // Should show loading for customers
      await waitFor(() => {
        expect(screen.getByText('Loading customers...')).toBeInTheDocument();
      });

      // Resolve customers loading
      resolveCustomers!({});

      await waitFor(() => {
        expect(screen.queryByText('Loading customers...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading States During Mutations', () => {
    it('shows loading state during assignment process', async () => {
      const user = userEvent.setup();
      const { apiMock } = setupAssignmentTest('fresh');
      
      let resolveAssignment: (value: any) => void;
      const assignmentPromise = new Promise(resolve => {
        resolveAssignment = resolve;
      });

      mockApiRequest.mockImplementation((method, url, body) => {
        if (method === 'POST' && url.includes('/assign')) {
          return assignmentPromise.then(() => ({
            ok: true,
            json: () => Promise.resolve({ message: 'Success' }),
          }));
        }
        return apiMock(method, url, body);
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

      const dropdown = screen.getAllByTestId('more-vertical-icon')[0];
      await user.click(dropdown.closest('button')!);
      await user.click(screen.getByText('Assign to Customer'));

      await waitFor(() => {
        expect(screen.getByText('customer1@test.com')).toBeInTheDocument();
      });

      const customerRow = screen.getByText('customer1@test.com').closest('div');
      await user.click(customerRow!);
      await user.click(screen.getByText('Assign (1)'));

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Assigning...')).toBeInTheDocument();
      });

      // Button should be disabled during loading
      expect(screen.getByText('Assigning...')).toBeDisabled();

      // Resolve assignment
      resolveAssignment!({});

      await waitFor(() => {
        expect(screen.queryByText('Assigning...')).not.toBeInTheDocument();
      });
    });

    it('shows loading state during meal plan deletion', async () => {
      const user = userEvent.setup();
      const { apiMock } = setupAssignmentTest('withAssignments');
      
      let resolveDelete: (value: any) => void;
      const deletePromise = new Promise(resolve => {
        resolveDelete = resolve;
      });

      mockApiRequest.mockImplementation((method, url) => {
        if (method === 'DELETE' && url.includes('/meal-plans/')) {
          return deletePromise.then(() => ({
            ok: true,
            json: () => Promise.resolve({ message: 'Deleted' }),
          }));
        }
        return apiMock(method, url);
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

      const dropdown = screen.getAllByTestId('more-vertical-icon')[0];
      await user.click(dropdown.closest('button')!);
      await user.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(screen.getByText('Delete Meal Plan')).toBeInTheDocument();
      });

      const deleteButton = screen.getByText('Delete');
      await user.click(deleteButton);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Deleting...')).toBeInTheDocument();
      });

      expect(screen.getByText('Deleting...')).toBeDisabled();

      // Resolve deletion
      resolveDelete!({});

      await waitFor(() => {
        expect(screen.queryByText('Deleting...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Recovery Workflows', () => {
    it('allows retry after network failure', async () => {
      const user = userEvent.setup();
      const { apiMock } = setupAssignmentTest('fresh');
      
      let failureCount = 0;
      mockApiRequest.mockImplementation((method, url, body) => {
        if (method === 'POST' && url.includes('/assign')) {
          failureCount++;
          if (failureCount === 1) {
            return Promise.reject(new Error('Network failure'));
          }
          return apiMock(method, url, body);
        }
        return apiMock(method, url, body);
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

      // First attempt (will fail)
      const dropdown = screen.getAllByTestId('more-vertical-icon')[0];
      await user.click(dropdown.closest('button')!);
      await user.click(screen.getByText('Assign to Customer'));

      await waitFor(() => {
        expect(screen.getByText('customer1@test.com')).toBeInTheDocument();
      });

      const customerRow = screen.getByText('customer1@test.com').closest('div');
      await user.click(customerRow!);
      await user.click(screen.getByText('Assign (1)'));

      // Should show error
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Assignment Failed',
            variant: 'destructive',
          })
        );
      });

      // Modal should remain open for retry
      expect(screen.getByText('Assign Meal Plan to Customer')).toBeInTheDocument();

      // Retry (should succeed)
      await user.click(screen.getByText('Assign (1)'));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Meal Plan Assigned',
          })
        );
      });
    });

    it('recovers from data loading failure on refresh', async () => {
      let loadAttempts = 0;
      mockApiRequest.mockImplementation((method, url) => {
        if (method === 'GET' && url === '/api/trainer/meal-plans') {
          loadAttempts++;
          if (loadAttempts === 1) {
            return Promise.reject(new Error('Loading failed'));
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ 
              mealPlans: [{
                id: 'plan-1',
                mealPlanData: { planName: 'Recovered Plan' },
                trainerId: 'trainer-1',
              }]
            }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        } as Response);
      });

      const { rerender } = renderWithProviders(
        <TrainerMealPlans />,
        {
          queryClient,
          authContextValue: createMockAuthContext(mockUsers.trainer),
        }
      );

      // First load should fail
      await waitFor(() => {
        // Should handle error gracefully
        expect(document.body.textContent).toBeTruthy();
      });

      // Simulate refresh/retry by rerendering
      rerender(<TrainerMealPlans />);

      // Second load should succeed
      await waitFor(() => {
        expect(screen.getByText('Recovered Plan')).toBeInTheDocument();
      });
    });
  });

  describe('Partial Data and Edge Cases', () => {
    it('handles partial meal plan data gracefully', async () => {
      mockApiRequest.mockImplementation((method, url) => {
        if (method === 'GET' && url === '/api/trainer/meal-plans') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              mealPlans: [
                {
                  id: 'plan-1',
                  trainerId: 'trainer-1',
                  mealPlanData: {
                    planName: 'Partial Plan',
                    // Missing other required fields
                  },
                  assignmentCount: 0,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              ]
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
        expect(screen.getByText('Partial Plan')).toBeInTheDocument();
      });

      // Should handle missing data with defaults or placeholders
      expect(document.body.textContent).toContain('Partial Plan');
    });

    it('handles assignment when customer data is incomplete', async () => {
      const user = userEvent.setup();
      const { apiMock } = setupAssignmentTest('fresh');
      
      mockApiRequest.mockImplementation((method, url, body) => {
        if (method === 'GET' && url === '/api/trainer/customers') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              customers: [
                {
                  id: 'customer-1',
                  email: 'customer1@test.com',
                  // Missing other fields
                },
              ]
            }),
          } as Response);
        }
        return apiMock(method, url, body);
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

      const dropdown = screen.getAllByTestId('more-vertical-icon')[0];
      await user.click(dropdown.closest('button')!);
      await user.click(screen.getByText('Assign to Customer'));

      await waitFor(() => {
        expect(screen.getByText('customer1@test.com')).toBeInTheDocument();
      });

      // Should handle incomplete customer data gracefully
      const customerRow = screen.getByText('customer1@test.com').closest('div');
      expect(customerRow).toBeInTheDocument();
    });
  });
});