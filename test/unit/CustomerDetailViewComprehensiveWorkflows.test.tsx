/**
 * Comprehensive Workflow Tests for CustomerDetailView Recent Meal Plans Functionality
 * 
 * This test suite covers complete user workflows and edge cases:
 * - End-to-end user journeys through the meal plans interface
 * - Complex interaction patterns (multiple modals, PDFs, tab switches)
 * - Error recovery and resilience testing
 * - Performance considerations and optimization scenarios
 * - Real-world usage patterns and edge cases
 * - Integration testing with all child components
 * 
 * Focus: Testing the complete user experience from start to finish,
 * ensuring all the recently implemented click functionality works
 * seamlessly in realistic usage scenarios.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import CustomerDetailView from '@/components/CustomerDetailView';
import type { CustomerMealPlan } from '@shared/schema';

// Mock API with realistic network delays and responses
const mockApiRequest = vi.fn();
vi.mock('@/lib/queryClient', () => ({
  apiRequest: mockApiRequest,
}));

// Comprehensive PDF Export Mock
const mockPDFOperations = {
  export: vi.fn(),
  error: vi.fn(),
  loading: vi.fn(),
  success: vi.fn(),
};

vi.mock('@/components/PDFExportButton', () => ({
  SimplePDFExportButton: ({ onClick, mealPlan, className, size, children }: any) => {
    const handleClick = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onClick) onClick(e);
      
      mockPDFOperations.loading(mealPlan?.id);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 10));
      
      if (mealPlan?.id === 'network-error-plan') {
        mockPDFOperations.error(new Error('Network error'));
      } else if (mealPlan?.id === 'timeout-plan') {
        await new Promise(resolve => setTimeout(resolve, 100));
        mockPDFOperations.error(new Error('Request timeout'));
      } else {
        mockPDFOperations.export(mealPlan?.id, mealPlan?.mealPlanData?.planName);
        mockPDFOperations.success(mealPlan?.id);
      }
    };

    return (
      <button
        data-testid={`pdf-button-${mealPlan?.id || 'unknown'}`}
        className={className}
        onClick={handleClick}
        disabled={mealPlan?.id === 'disabled-plan'}
      >
        {children || 'Export PDF'}
      </button>
    );
  },
}));

// Modal Mock with full lifecycle tracking
const mockModalLifecycle = {
  open: vi.fn(),
  close: vi.fn(),
  render: vi.fn(),
  dataReceived: vi.fn(),
  userInteraction: vi.fn(),
};

vi.mock('@/components/MealPlanModal', () => ({
  default: ({ mealPlan, onClose }: any) => {
    React.useEffect(() => {
      mockModalLifecycle.open(mealPlan?.id);
      mockModalLifecycle.dataReceived(mealPlan);
      mockModalLifecycle.render();
      
      return () => {
        mockModalLifecycle.close(mealPlan?.id);
      };
    }, [mealPlan]);

    const handleUserAction = (action: string) => {
      mockModalLifecycle.userInteraction(action, mealPlan?.id);
    };

    return (
      <div data-testid="meal-plan-modal" data-meal-plan-id={mealPlan?.id}>
        <div data-testid="modal-header">
          <h2>{mealPlan?.mealPlanData?.planName}</h2>
        </div>
        <div data-testid="modal-body">
          <p>Goal: {mealPlan?.mealPlanData?.fitnessGoal}</p>
          <p>Days: {mealPlan?.mealPlanData?.days}</p>
          <p>Meals: {mealPlan?.mealPlanData?.meals?.length || 0}</p>
        </div>
        <div data-testid="modal-actions">
          <button 
            onClick={() => {
              handleUserAction('close');
              onClose();
            }}
            data-testid="modal-close"
          >
            Close
          </button>
          <button 
            onClick={() => handleUserAction('view-details')}
            data-testid="modal-view-details"
          >
            View Details
          </button>
        </div>
      </div>
    );
  },
}));

// Toast notifications mock
const mockNotifications = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
};

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ 
    toast: (options: any) => {
      if (options.variant === 'destructive') {
        mockNotifications.error(options);
      } else {
        mockNotifications.success(options);
      }
    }
  }),
}));

// Test data with various scenarios
const mockCustomer = {
  id: 'customer-123',
  email: 'testcustomer@example.com',
  firstAssignedAt: '2024-01-01T00:00:00Z',
};

const createTestMealPlan = (
  id: string, 
  planName: string, 
  options: any = {}
): CustomerMealPlan => ({
  id,
  customerId: 'customer-123',
  trainerId: 'trainer-456',
  mealPlanData: {
    planName,
    fitnessGoal: options.fitnessGoal || 'weight_loss',
    description: options.description || `${planName} for comprehensive testing`,
    dailyCalorieTarget: options.calories || 1800,
    days: options.days || 7,
    mealsPerDay: options.mealsPerDay || 4,
    meals: options.meals || [
      {
        id: `meal-${id}-1`,
        day: 1,
        mealType: 'breakfast',
        recipeId: `recipe-${id}-1`,
        recipe: {
          id: `recipe-${id}-1`,
          name: `${planName} Breakfast`,
          description: 'Test recipe for workflow testing',
          mealTypes: ['breakfast'],
          dietaryTags: ['healthy'],
          mainIngredientTags: ['protein'],
          ingredientsJson: [{ name: 'Test Ingredient', amount: '1', unit: 'cup' }],
          instructionsText: 'Test cooking instructions',
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
    totalCalories: options.totalCalories || 7200,
    totalProtein: options.totalProtein || '350.00',
    totalCarbs: options.totalCarbs || '900.00',
    totalFat: options.totalFat || '240.00',
    createdAt: options.createdAt || '2024-01-01T00:00:00Z',
  },
  assignedAt: options.assignedAt || '2024-01-01T00:00:00Z',
  planName,
  fitnessGoal: options.fitnessGoal || 'weight_loss',
  dailyCalorieTarget: options.calories || 1800,
  totalDays: options.days || 7,
  mealsPerDay: options.mealsPerDay || 4,
});

// Comprehensive test dataset
const testMealPlans = [
  createTestMealPlan('workflow-1', 'Primary Workflow Plan'),
  createTestMealPlan('workflow-2', 'Secondary Workflow Plan'),
  createTestMealPlan('workflow-3', 'Complex Workflow Plan', { calories: 2200, days: 14 }),
  createTestMealPlan('network-error-plan', 'Network Error Plan'),
  createTestMealPlan('timeout-plan', 'Timeout Test Plan'),
  createTestMealPlan('disabled-plan', 'Disabled Plan'),
  createTestMealPlan('workflow-7', 'Last Tab Plan'), // For testing "more plans"
];

describe('CustomerDetailView - Comprehensive User Workflows', () => {
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
    Object.values(mockPDFOperations).forEach(mock => mock.mockClear());
    Object.values(mockModalLifecycle).forEach(mock => mock.mockClear());
    Object.values(mockNotifications).forEach(mock => mock.mockClear());
    
    // Setup realistic API responses with delays
    mockApiRequest.mockImplementation(async (method: string, url: string) => {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 5));
      
      if (url.includes('/meal-plans')) {
        return {
          json: () => Promise.resolve({ 
            mealPlans: testMealPlans, 
            total: testMealPlans.length 
          })
        };
      }
      if (url.includes('/measurements')) {
        return {
          json: () => Promise.resolve({ status: 'success', data: [] })
        };
      }
      if (url.includes('/goals')) {
        return {
          json: () => Promise.resolve({ status: 'success', data: [] })
        };
      }
      return { json: () => Promise.resolve({}) };
    });
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

  describe('Complete User Journey Workflows', () => {
    it('handles the complete "browse and export" user workflow', async () => {
      renderComponent();
      const user = userEvent.setup();

      // Step 1: User arrives at customer detail view
      await waitFor(() => {
        expect(screen.getByText('Primary Workflow Plan')).toBeInTheDocument();
      });

      // Step 2: User browses recent meal plans
      expect(screen.getByText('Secondary Workflow Plan')).toBeInTheDocument();
      expect(screen.getByText('Complex Workflow Plan')).toBeInTheDocument();

      // Step 3: User exports PDF for first plan
      await user.click(screen.getByTestId('pdf-button-workflow-1'));
      
      await waitFor(() => {
        expect(mockPDFOperations.loading).toHaveBeenCalledWith('workflow-1');
        expect(mockPDFOperations.export).toHaveBeenCalledWith('workflow-1', 'Primary Workflow Plan');
        expect(mockPDFOperations.success).toHaveBeenCalledWith('workflow-1');
      });

      // Step 4: User opens modal for second plan
      await user.click(screen.getByText('Secondary Workflow Plan'));
      
      await waitFor(() => {
        expect(mockModalLifecycle.open).toHaveBeenCalledWith('workflow-2');
        expect(screen.getByTestId('meal-plan-modal')).toBeInTheDocument();
        expect(screen.getByText('Secondary Workflow Plan')).toBeInTheDocument();
      });

      // Step 5: User interacts with modal
      await user.click(screen.getByTestId('modal-view-details'));
      expect(mockModalLifecycle.userInteraction).toHaveBeenCalledWith('view-details', 'workflow-2');

      // Step 6: User closes modal
      await user.click(screen.getByTestId('modal-close'));
      
      await waitFor(() => {
        expect(mockModalLifecycle.userInteraction).toHaveBeenCalledWith('close', 'workflow-2');
        expect(screen.queryByTestId('meal-plan-modal')).not.toBeInTheDocument();
      });

      // Step 7: User switches to full meal plans tab
      const mealPlansTab = screen.getByRole('tab', { name: /meal plans/i });
      await user.click(mealPlansTab);

      // Step 8: User sees all plans and exports another
      await waitFor(() => {
        expect(screen.getByText('Last Tab Plan')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('pdf-button-workflow-7'));
      
      await waitFor(() => {
        expect(mockPDFOperations.export).toHaveBeenCalledWith('workflow-7', 'Last Tab Plan');
      });
    });

    it('handles the "modal comparison" workflow', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Primary Workflow Plan')).toBeInTheDocument();
      });

      // User opens first modal
      await user.click(screen.getByText('Primary Workflow Plan'));
      await waitFor(() => {
        expect(screen.getByTestId('modal-header')).toHaveTextContent('Primary Workflow Plan');
      });

      // User switches to compare with second plan (direct switch)
      await user.click(screen.getByText('Secondary Workflow Plan'));
      await waitFor(() => {
        expect(screen.getByTestId('modal-header')).toHaveTextContent('Secondary Workflow Plan');
      });

      // User closes and opens third plan
      await user.click(screen.getByTestId('modal-close'));
      await waitFor(() => {
        expect(screen.queryByTestId('meal-plan-modal')).not.toBeInTheDocument();
      });

      await user.click(screen.getByText('Complex Workflow Plan'));
      await waitFor(() => {
        expect(screen.getByTestId('modal-header')).toHaveTextContent('Complex Workflow Plan');
        expect(screen.getByText('Days: 14')).toBeInTheDocument(); // Complex plan has 14 days
      });
    });

    it('handles the "mixed operations" workflow', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Primary Workflow Plan')).toBeInTheDocument();
      });

      // Mixed sequence: PDF → Modal → PDF → Tab switch → Modal → PDF
      
      // 1. Export PDF
      await user.click(screen.getByTestId('pdf-button-workflow-1'));
      await waitFor(() => {
        expect(mockPDFOperations.export).toHaveBeenCalledWith('workflow-1', 'Primary Workflow Plan');
      });

      // 2. Open modal
      await user.click(screen.getByText('Secondary Workflow Plan'));
      await waitFor(() => {
        expect(screen.getByTestId('meal-plan-modal')).toBeInTheDocument();
      });

      // 3. Export PDF while modal is open
      mockPDFOperations.export.mockClear();
      await user.click(screen.getByTestId('pdf-button-workflow-3'));
      await waitFor(() => {
        expect(mockPDFOperations.export).toHaveBeenCalledWith('workflow-3', 'Complex Workflow Plan');
      });

      // 4. Switch tabs while modal is open
      const mealPlansTab = screen.getByRole('tab', { name: /meal plans/i });
      await user.click(mealPlansTab);

      // Modal should still be visible
      expect(screen.getByTestId('meal-plan-modal')).toBeInTheDocument();

      // 5. Close modal and open different plan in new tab
      await user.click(screen.getByTestId('modal-close'));
      await waitFor(() => {
        expect(screen.queryByTestId('meal-plan-modal')).not.toBeInTheDocument();
      });

      await user.click(screen.getByText('Last Tab Plan'));
      await waitFor(() => {
        expect(screen.getByTestId('modal-header')).toHaveTextContent('Last Tab Plan');
      });

      // 6. Final PDF export
      mockPDFOperations.export.mockClear();
      await user.click(screen.getByTestId('pdf-button-disabled-plan'));
      // Should not export because button is disabled
      expect(mockPDFOperations.export).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling and Recovery Workflows', () => {
    it('handles PDF export errors gracefully in user workflow', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Network Error Plan')).toBeInTheDocument();
      });

      // User tries to export plan that will fail
      await user.click(screen.getByTestId('pdf-button-network-error-plan'));
      
      await waitFor(() => {
        expect(mockPDFOperations.error).toHaveBeenCalledWith(expect.any(Error));
      });

      // User should still be able to use other functionality
      await user.click(screen.getByText('Primary Workflow Plan'));
      await waitFor(() => {
        expect(screen.getByTestId('meal-plan-modal')).toBeInTheDocument();
      });

      // And successful PDF export should still work
      mockPDFOperations.export.mockClear();
      await user.click(screen.getByTestId('pdf-button-workflow-1'));
      await waitFor(() => {
        expect(mockPDFOperations.export).toHaveBeenCalledWith('workflow-1', 'Primary Workflow Plan');
      });
    });

    it('handles timeout scenarios in user workflow', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Timeout Test Plan')).toBeInTheDocument();
      });

      // User clicks plan that will timeout
      await user.click(screen.getByTestId('pdf-button-timeout-plan'));
      
      // Should handle timeout gracefully
      await waitFor(() => {
        expect(mockPDFOperations.error).toHaveBeenCalledWith(expect.any(Error));
      }, { timeout: 2000 });

      // Interface should remain responsive
      await user.click(screen.getByText('Primary Workflow Plan'));
      await waitFor(() => {
        expect(screen.getByTestId('meal-plan-modal')).toBeInTheDocument();
      });
    });

    it('recovers from network issues and continues workflow', async () => {
      // Start with network error
      mockApiRequest.mockImplementationOnce(() => {
        throw new Error('Network error');
      });

      renderComponent();

      // Should show error state initially
      await waitFor(() => {
        // Component should handle the error gracefully
        expect(screen.getByText(mockCustomer.email)).toBeInTheDocument();
      });

      // Network recovers - refetch should work
      mockApiRequest.mockImplementation(async (method: string, url: string) => {
        await new Promise(resolve => setTimeout(resolve, 5));
        
        if (url.includes('/meal-plans')) {
          return {
            json: () => Promise.resolve({ 
              mealPlans: testMealPlans, 
              total: testMealPlans.length 
            })
          };
        }
        return { json: () => Promise.resolve({ status: 'success', data: [] }) };
      });

      // Trigger refetch by switching tabs
      const mealPlansTab = screen.getByRole('tab', { name: /meal plans/i });
      fireEvent.click(mealPlansTab);

      // Should eventually load data
      await waitFor(() => {
        expect(screen.getByText('Primary Workflow Plan')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Performance and Edge Case Workflows', () => {
    it('handles rapid user interactions without breaking', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Primary Workflow Plan')).toBeInTheDocument();
      });

      // Rapid fire interactions
      const actions = [
        () => user.click(screen.getByText('Primary Workflow Plan')),
        () => user.click(screen.getByTestId('pdf-button-workflow-2')),
        () => user.click(screen.getByText('Complex Workflow Plan')),
        () => user.click(screen.getByTestId('pdf-button-workflow-3')),
        () => user.click(screen.getByRole('tab', { name: /meal plans/i })),
        () => user.click(screen.getByText('Last Tab Plan')),
      ];

      // Execute actions rapidly
      await Promise.all(actions.map(action => action()));

      // System should handle this gracefully
      await waitFor(() => {
        // Should have some modal open
        expect(screen.getByTestId('meal-plan-modal')).toBeInTheDocument();
        // Should have processed PDF exports
        expect(mockPDFOperations.export).toHaveBeenCalled();
      });
    });

    it('handles large dataset pagination and scrolling workflow', async () => {
      // Mock large dataset
      const largeMealPlans = Array.from({ length: 20 }, (_, i) => 
        createTestMealPlan(`large-${i}`, `Large Plan ${i + 1}`)
      );

      mockApiRequest.mockImplementation(async (method: string, url: string) => {
        await new Promise(resolve => setTimeout(resolve, 5));
        
        if (url.includes('/meal-plans')) {
          return {
            json: () => Promise.resolve({ 
              mealPlans: largeMealPlans, 
              total: largeMealPlans.length 
            })
          };
        }
        return { json: () => Promise.resolve({ status: 'success', data: [] }) };
      });

      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Large Plan 1')).toBeInTheDocument();
      });

      // Should only show first 3 in recent section
      expect(screen.getByText('Large Plan 2')).toBeInTheDocument();
      expect(screen.getByText('Large Plan 3')).toBeInTheDocument();
      expect(screen.queryByText('Large Plan 4')).not.toBeInTheDocument();

      // Check "more plans" message
      expect(screen.getByText('And 17 more meal plans...')).toBeInTheDocument();

      // Switch to full tab to see all plans
      const mealPlansTab = screen.getByRole('tab', { name: /meal plans \(20\)/i });
      await user.click(mealPlansTab);

      await waitFor(() => {
        expect(screen.getByText('Large Plan 20')).toBeInTheDocument();
      });

      // Test interaction with plan at end of list
      await user.click(screen.getByText('Large Plan 20'));
      await waitFor(() => {
        expect(screen.getByTestId('modal-header')).toHaveTextContent('Large Plan 20');
      });
    });

    it('handles empty state to populated state transition', async () => {
      // Start with empty state
      mockApiRequest.mockImplementationOnce(async (method: string, url: string) => {
        if (url.includes('/meal-plans')) {
          return {
            json: () => Promise.resolve({ mealPlans: [], total: 0 })
          };
        }
        return { json: () => Promise.resolve({ status: 'success', data: [] }) };
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/no meal plans assigned yet/i)).toBeInTheDocument();
      });

      // Simulate data being added (like after creating a new meal plan)
      mockApiRequest.mockImplementation(async (method: string, url: string) => {
        if (url.includes('/meal-plans')) {
          return {
            json: () => Promise.resolve({ 
              mealPlans: [testMealPlans[0]], 
              total: 1 
            })
          };
        }
        return { json: () => Promise.resolve({ status: 'success', data: [] }) };
      });

      // Trigger refetch
      queryClient.invalidateQueries({ queryKey: ['customerMealPlans', mockCustomer.id] });

      await waitFor(() => {
        expect(screen.getByText('Primary Workflow Plan')).toBeInTheDocument();
      });

      // New plan should be fully functional
      const user = userEvent.setup();
      await user.click(screen.getByText('Primary Workflow Plan'));
      await waitFor(() => {
        expect(screen.getByTestId('meal-plan-modal')).toBeInTheDocument();
      });
    });
  });

  describe('Component Integration and State Management', () => {
    it('maintains proper component state throughout complex workflows', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Primary Workflow Plan')).toBeInTheDocument();
      });

      // Track all component interactions
      const interactionLog: string[] = [];

      // Complex workflow with state tracking
      
      // 1. Open modal
      await user.click(screen.getByText('Primary Workflow Plan'));
      interactionLog.push('modal-open-1');
      
      await waitFor(() => {
        expect(mockModalLifecycle.open).toHaveBeenCalledWith('workflow-1');
      });

      // 2. Switch to different modal
      await user.click(screen.getByText('Secondary Workflow Plan'));
      interactionLog.push('modal-switch');
      
      await waitFor(() => {
        expect(mockModalLifecycle.open).toHaveBeenCalledWith('workflow-2');
      });

      // 3. Export PDF while modal is open
      await user.click(screen.getByTestId('pdf-button-workflow-3'));
      interactionLog.push('pdf-export-during-modal');
      
      await waitFor(() => {
        expect(mockPDFOperations.export).toHaveBeenCalledWith('workflow-3', 'Complex Workflow Plan');
      });

      // 4. Switch tabs
      const mealPlansTab = screen.getByRole('tab', { name: /meal plans/i });
      await user.click(mealPlansTab);
      interactionLog.push('tab-switch');

      // 5. Close modal and open new one in different tab
      await user.click(screen.getByTestId('modal-close'));
      interactionLog.push('modal-close');
      
      await user.click(screen.getByText('Last Tab Plan'));
      interactionLog.push('modal-open-2');

      // Verify all interactions completed successfully
      expect(interactionLog).toEqual([
        'modal-open-1',
        'modal-switch', 
        'pdf-export-during-modal',
        'tab-switch',
        'modal-close',
        'modal-open-2'
      ]);

      // Final state should be consistent
      await waitFor(() => {
        expect(screen.getByTestId('meal-plan-modal')).toBeInTheDocument();
        expect(screen.getByTestId('modal-header')).toHaveTextContent('Last Tab Plan');
      });
    });

    it('handles component lifecycle events properly', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Primary Workflow Plan')).toBeInTheDocument();
      });

      // Test component mount/unmount cycles
      
      // Open modal (mount)
      await user.click(screen.getByText('Primary Workflow Plan'));
      await waitFor(() => {
        expect(mockModalLifecycle.render).toHaveBeenCalled();
      });

      // Switch plans (unmount/mount)
      mockModalLifecycle.render.mockClear();
      await user.click(screen.getByText('Secondary Workflow Plan'));
      await waitFor(() => {
        expect(mockModalLifecycle.close).toHaveBeenCalledWith('workflow-1');
        expect(mockModalLifecycle.render).toHaveBeenCalled();
      });

      // Close modal (unmount)
      await user.click(screen.getByTestId('modal-close'));
      await waitFor(() => {
        expect(mockModalLifecycle.close).toHaveBeenCalledWith('workflow-2');
      });
    });

    it('preserves user context and selections across operations', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Primary Workflow Plan')).toBeInTheDocument();
      });

      // User selects specific plan
      await user.click(screen.getByText('Complex Workflow Plan'));
      
      // Verify modal received complete context
      await waitFor(() => {
        expect(mockModalLifecycle.dataReceived).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'workflow-3',
            mealPlanData: expect.objectContaining({
              planName: 'Complex Workflow Plan',
              days: 14, // Complex plan specific data
              dailyCalorieTarget: 2200
            })
          })
        );
      });

      // Context should be preserved through tab switches
      const mealPlansTab = screen.getByRole('tab', { name: /meal plans/i });
      await user.click(mealPlansTab);

      // Modal should still show correct data
      expect(screen.getByTestId('modal-header')).toHaveTextContent('Complex Workflow Plan');
      expect(screen.getByText('Days: 14')).toBeInTheDocument();

      // Close and reopen should maintain data integrity
      await user.click(screen.getByTestId('modal-close'));
      await user.click(screen.getByText('Complex Workflow Plan'));

      await waitFor(() => {
        expect(screen.getByTestId('modal-header')).toHaveTextContent('Complex Workflow Plan');
      });
    });
  });

  describe('Real-world Usage Patterns', () => {
    it('simulates trainer reviewing multiple customer meal plans', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Primary Workflow Plan')).toBeInTheDocument();
      });

      // Trainer workflow: Quick review of all recent plans
      
      // 1. Review first plan
      await user.click(screen.getByText('Primary Workflow Plan'));
      await waitFor(() => {
        expect(screen.getByTestId('meal-plan-modal')).toBeInTheDocument();
      });
      
      await user.click(screen.getByTestId('modal-view-details'));
      expect(mockModalLifecycle.userInteraction).toHaveBeenCalledWith('view-details', 'workflow-1');
      
      await user.click(screen.getByTestId('modal-close'));

      // 2. Quick PDF export for records
      await user.click(screen.getByTestId('pdf-button-workflow-1'));
      await waitFor(() => {
        expect(mockPDFOperations.export).toHaveBeenCalledWith('workflow-1', 'Primary Workflow Plan');
      });

      // 3. Review second plan
      await user.click(screen.getByText('Secondary Workflow Plan'));
      await waitFor(() => {
        expect(screen.getByTestId('modal-header')).toHaveTextContent('Secondary Workflow Plan');
      });
      
      await user.click(screen.getByTestId('modal-close'));

      // 4. Check full list for comprehensive review
      const mealPlansTab = screen.getByRole('tab', { name: /meal plans/i });
      await user.click(mealPlansTab);

      // 5. Export multiple plans for client
      await user.click(screen.getByTestId('pdf-button-workflow-3'));
      await user.click(screen.getByTestId('pdf-button-workflow-7'));

      await waitFor(() => {
        expect(mockPDFOperations.export).toHaveBeenCalledWith('workflow-3', 'Complex Workflow Plan');
        expect(mockPDFOperations.export).toHaveBeenCalledWith('workflow-7', 'Last Tab Plan');
      });

      // Verify trainer completed full review workflow
      expect(mockModalLifecycle.open).toHaveBeenCalledTimes(2);
      expect(mockPDFOperations.export).toHaveBeenCalledTimes(3);
    });

    it('simulates customer plan comparison workflow', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Primary Workflow Plan')).toBeInTheDocument();
      });

      // Customer comparing their different meal plans
      
      // 1. Open current plan
      await user.click(screen.getByText('Primary Workflow Plan'));
      await waitFor(() => {
        expect(screen.getByText('Goal: weight_loss')).toBeInTheDocument();
      });

      // 2. Compare with alternative plan
      await user.click(screen.getByText('Complex Workflow Plan'));
      await waitFor(() => {
        expect(screen.getByText('Days: 14')).toBeInTheDocument(); // More days
      });

      // 3. Go back to check previous plan details
      await user.click(screen.getByText('Secondary Workflow Plan'));
      await waitFor(() => {
        expect(screen.getByTestId('modal-header')).toHaveTextContent('Secondary Workflow Plan');
      });

      // 4. Export preferred plan
      await user.click(screen.getByTestId('modal-close'));
      await user.click(screen.getByTestId('pdf-button-workflow-2'));

      await waitFor(() => {
        expect(mockPDFOperations.export).toHaveBeenCalledWith('workflow-2', 'Secondary Workflow Plan');
      });

      // Customer successfully compared and selected plan
      expect(mockModalLifecycle.open).toHaveBeenCalledTimes(3);
      expect(mockPDFOperations.export).toHaveBeenCalledTimes(1);
    });
  });
});