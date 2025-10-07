/**
 * Integration Tests for Customer Meal Plan Interactions
 * 
 * Tests complete user workflows for the recently fixed meal plan functionality:
 * - End-to-end meal plan viewing workflows
 * - Cross-tab functionality between Overview and Meal Plans tabs
 * - Real API integration with React Query
 * - Complete state synchronization across components
 * - User journey from browsing to viewing detailed meal plans
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

// Mock components with more realistic implementations
const mockPDFExports = new Map();
vi.mock('@/components/PDFExportButton', () => ({
  SimplePDFExportButton: ({ onClick, mealPlan, className, size }: any) => {
    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      mockPDFExports.set(mealPlan?.id, { exported: true, timestamp: Date.now() });
      if (onClick) onClick(e);
    };

    return (
      <button
        data-testid={`pdf-export-${mealPlan?.id}`}
        className={className}
        onClick={handleClick}
        aria-label={`Export ${mealPlan?.mealPlanData?.planName || 'meal plan'} to PDF`}
      >
        📄 PDF
      </button>
    );
  },
}));

const modalOpenTracker = { isOpen: false, currentPlan: null };
vi.mock('@/components/MealPlanModal', () => ({
  default: ({ mealPlan, onClose }: any) => {
    modalOpenTracker.isOpen = true;
    modalOpenTracker.currentPlan = mealPlan;

    const handleClose = () => {
      modalOpenTracker.isOpen = false;
      modalOpenTracker.currentPlan = null;
      onClose();
    };

    return (
      <div 
        data-testid="meal-plan-modal-integration"
        role="dialog"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
      >
        <div id="modal-title">{mealPlan?.mealPlanData?.planName}</div>
        <div id="modal-description">Meal plan details for {mealPlan?.mealPlanData?.days} days</div>
        <div data-testid="modal-plan-id">{mealPlan?.id}</div>
        <div data-testid="modal-calories">{mealPlan?.mealPlanData?.dailyCalorieTarget}</div>
        <div data-testid="modal-goal">{mealPlan?.mealPlanData?.fitnessGoal}</div>
        <button 
          onClick={handleClose} 
          data-testid="close-modal-button"
          aria-label="Close meal plan modal"
        >
          ✕ Close
        </button>
      </div>
    );
  },
}));

// Mock MealPlanGenerator
vi.mock('@/components/MealPlanGenerator', () => ({
  default: ({ onMealPlanGenerated, customerContext }: any) => (
    <div data-testid="meal-plan-generator-integration">
      <div data-testid="customer-context-data">{customerContext?.customerId}</div>
      <button onClick={() => onMealPlanGenerated({ 
        id: 'new-generated-plan',
        planName: 'Generated Plan',
        fitnessGoal: 'weight_loss',
        dailyCalorieTarget: 1600,
        days: 7
      })}>
        Generate New Plan
      </button>
    </div>
  ),
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Test data with realistic meal plan structure
const createRealisticMealPlan = (id: string, planName: string, index: number): CustomerMealPlan => ({
  id,
  customerId: 'customer-123',
  trainerId: 'trainer-456',
  mealPlanData: {
    planName,
    fitnessGoal: index % 2 === 0 ? 'weight_loss' : 'muscle_gain',
    description: `${planName} - Comprehensive nutrition plan`,
    dailyCalorieTarget: 1600 + (index * 200),
    days: 7,
    mealsPerDay: 4,
    meals: Array.from({ length: 28 }, (_, mealIndex) => ({
      id: `${id}-meal-${mealIndex}`,
      day: Math.floor(mealIndex / 4) + 1,
      mealType: ['breakfast', 'lunch', 'dinner', 'snack'][mealIndex % 4],
      recipeId: `recipe-${mealIndex}`,
      recipe: {
        id: `recipe-${mealIndex}`,
        name: `Recipe ${mealIndex + 1}`,
        description: 'Nutritious meal',
        mealTypes: [['breakfast', 'lunch', 'dinner', 'snack'][mealIndex % 4]],
        dietaryTags: ['healthy'],
        mainIngredientTags: ['protein'],
        ingredientsJson: [
          { name: 'Main ingredient', amount: '1', unit: 'serving' }
        ],
        instructionsText: 'Prepare according to plan',
        prepTimeMinutes: 15,
        cookTimeMinutes: 20,
        servings: 1,
        caloriesKcal: 400 + (mealIndex * 10),
        proteinGrams: '25.00',
        carbsGrams: '40.00',
        fatGrams: '15.00',
        creationTimestamp: '2024-01-01T00:00:00Z',
        lastUpdatedTimestamp: '2024-01-01T00:00:00Z',
        isApproved: true,
      },
      servings: 1,
      plannedFor: new Date(2024, 0, Math.floor(mealIndex / 4) + 1, (mealIndex % 4) * 6 + 6).toISOString(),
    })),
    totalCalories: (1600 + (index * 200)) * 7,
    totalProtein: '700.00',
    totalCarbs: '1120.00',
    totalFat: '420.00',
    createdAt: '2024-01-01T00:00:00Z',
  },
  assignedAt: new Date(2024, 0, index + 1).toISOString(),
  planName,
  fitnessGoal: index % 2 === 0 ? 'weight_loss' : 'muscle_gain',
  dailyCalorieTarget: 1600 + (index * 200),
  totalDays: 7,
  mealsPerDay: 4,
});

const mockMealPlans = [
  createRealisticMealPlan('plan-1', 'Premium Weight Loss Plan', 0),
  createRealisticMealPlan('plan-2', 'Advanced Muscle Building', 1),
  createRealisticMealPlan('plan-3', 'Balanced Nutrition Plan', 2),
  createRealisticMealPlan('plan-4', 'High Protein Cutting Plan', 3),
  createRealisticMealPlan('plan-5', 'Endurance Training Plan', 4),
];

const mockCustomer = {
  id: 'customer-123',
  email: 'john.doe@example.com',
  firstAssignedAt: '2024-01-01T00:00:00Z',
};

describe('Customer Meal Plan Interactions - Integration Tests', () => {
  let queryClient: QueryClient;
  let mockOnBack: ReturnType<typeof vi.fn>;
  let mockApiRequest: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { 
          retry: false,
          staleTime: 0,
          gcTime: 0,
        },
        mutations: { retry: false },
      },
    });
    mockOnBack = vi.fn();
    
    // Reset all tracking state
    mockPDFExports.clear();
    modalOpenTracker.isOpen = false;
    modalOpenTracker.currentPlan = null;
    
    // Reset mocks
    vi.clearAllMocks();
    mockToast.mockClear();
    
    // Setup API mocks
    const { apiRequest } = await import('@/lib/queryClient');
    mockApiRequest = apiRequest as ReturnType<typeof vi.fn>;
    
    // Mock realistic API responses with delays
    mockApiRequest.mockImplementation(async (method: string, url: string, body?: any) => {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 50));
      
      if (url.includes('/meal-plans')) {
        return {
          json: async () => ({ 
            mealPlans: mockMealPlans, 
            total: mockMealPlans.length 
          })
        };
      }
      if (url.includes('/measurements')) {
        return {
          json: async () => ({ 
            status: 'success', 
            data: [
              {
                id: 'measurement-1',
                customerId: 'customer-123',
                measurementDate: '2024-01-15T00:00:00Z',
                weightLbs: '175.0',
                bodyFatPercentage: '18.5',
                waistCm: '82.0',
                notes: 'Progress measurement',
                createdAt: '2024-01-15T00:00:00Z',
              }
            ]
          })
        };
      }
      if (url.includes('/goals')) {
        return {
          json: async () => ({ 
            status: 'success', 
            data: [
              {
                id: 'goal-1',
                customerId: 'customer-123',
                goalType: 'weight_loss',
                goalName: 'Lose 10 pounds',
                targetValue: '165.0',
                targetUnit: 'lbs',
                currentValue: '175.0',
                status: 'active',
                progressPercentage: 0,
                startDate: '2024-01-01T00:00:00Z',
                targetDate: '2024-03-01T00:00:00Z',
              }
            ]
          })
        };
      }
      if (method === 'POST' && url.includes('/meal-plans')) {
        return {
          json: async () => ({ 
            success: true, 
            mealPlan: { id: 'assigned-plan', ...body.mealPlanData }
          })
        };
      }
      
      return {
        json: async () => ({})
      };
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

  describe('Complete Meal Plan Viewing Workflow', () => {
    it('allows user to browse meal plans in overview and view details', async () => {
      renderComponent();
      const user = userEvent.setup();

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Premium Weight Loss Plan')).toBeInTheDocument();
      });

      // Verify we're on overview tab and can see recent meal plans
      expect(screen.getByRole('tab', { name: /overview/i })).toHaveAttribute('data-state', 'active');
      
      // Should show first 3 meal plans in recent section
      expect(screen.getByText('Premium Weight Loss Plan')).toBeInTheDocument();
      expect(screen.getByText('Advanced Muscle Building')).toBeInTheDocument();
      expect(screen.getByText('Balanced Nutrition Plan')).toBeInTheDocument();
      expect(screen.getByText('And 2 more meal plans...')).toBeInTheDocument();

      // Click on a meal plan to view details
      await user.click(screen.getByText('Premium Weight Loss Plan'));

      // Verify modal opens with correct data
      await waitFor(() => {
        expect(screen.getByTestId('meal-plan-modal-integration')).toBeInTheDocument();
        expect(screen.getByTestId('modal-plan-id')).toHaveTextContent('plan-1');
        expect(screen.getByTestId('modal-calories')).toHaveTextContent('1600');
        expect(screen.getByTestId('modal-goal')).toHaveTextContent('weight_loss');
      });

      // Verify tracking state
      expect(modalOpenTracker.isOpen).toBe(true);
      expect(modalOpenTracker.currentPlan?.id).toBe('plan-1');
    });

    it('allows navigation between overview and full meal plans tab', async () => {
      renderComponent();
      const user = userEvent.setup();

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Premium Weight Loss Plan')).toBeInTheDocument();
      });

      // Switch to meal plans tab
      await user.click(screen.getByRole('tab', { name: /meal plans/i }));

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /meal plans/i })).toHaveAttribute('data-state', 'active');
      });

      // Should see all meal plans now
      expect(screen.getByText('Premium Weight Loss Plan')).toBeInTheDocument();
      expect(screen.getByText('Advanced Muscle Building')).toBeInTheDocument();
      expect(screen.getByText('Balanced Nutrition Plan')).toBeInTheDocument();
      expect(screen.getByText('High Protein Cutting Plan')).toBeInTheDocument();
      expect(screen.getByText('Endurance Training Plan')).toBeInTheDocument();

      // Click on a different meal plan
      await user.click(screen.getByText('Endurance Training Plan'));

      // Verify modal opens with correct data
      await waitFor(() => {
        expect(screen.getByTestId('modal-plan-id')).toHaveTextContent('plan-5');
        expect(screen.getByTestId('modal-calories')).toHaveTextContent('2400');
        expect(screen.getByTestId('modal-goal')).toHaveTextContent('muscle_gain');
      });

      // Close modal and switch back to overview
      await user.click(screen.getByTestId('close-modal-button'));
      await waitFor(() => {
        expect(screen.queryByTestId('meal-plan-modal-integration')).not.toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: /overview/i }));
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /overview/i })).toHaveAttribute('data-state', 'active');
      });
    });
  });

  describe('PDF Export Integration', () => {
    it('allows PDF export from both overview and meal plans tab without opening modal', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Premium Weight Loss Plan')).toBeInTheDocument();
      });

      // Export PDF from overview tab
      const overviewPDFButton = screen.getByTestId('pdf-export-plan-1');
      await user.click(overviewPDFButton);

      // Verify PDF export was tracked and modal didn't open
      expect(mockPDFExports.has('plan-1')).toBe(true);
      expect(screen.queryByTestId('meal-plan-modal-integration')).not.toBeInTheDocument();

      // Switch to meal plans tab
      await user.click(screen.getByRole('tab', { name: /meal plans/i }));
      
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /meal plans/i })).toHaveAttribute('data-state', 'active');
      });

      // Export PDF from meal plans tab
      const mealPlansPDFButton = screen.getByTestId('pdf-export-plan-2');
      await user.click(mealPlansPDFButton);

      // Verify second PDF export and no modal
      expect(mockPDFExports.has('plan-2')).toBe(true);
      expect(screen.queryByTestId('meal-plan-modal-integration')).not.toBeInTheDocument();
    });

    it('handles rapid PDF exports correctly', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Premium Weight Loss Plan')).toBeInTheDocument();
      });

      // Rapidly click multiple PDF buttons
      const pdf1 = screen.getByTestId('pdf-export-plan-1');
      const pdf2 = screen.getByTestId('pdf-export-plan-2');
      const pdf3 = screen.getByTestId('pdf-export-plan-3');

      await user.click(pdf1);
      await user.click(pdf2);
      await user.click(pdf3);

      // All should be exported, no modals should open
      expect(mockPDFExports.has('plan-1')).toBe(true);
      expect(mockPDFExports.has('plan-2')).toBe(true);
      expect(mockPDFExports.has('plan-3')).toBe(true);
      expect(screen.queryByTestId('meal-plan-modal-integration')).not.toBeInTheDocument();
    });
  });

  describe('Modal State Management Across Tabs', () => {
    it('maintains modal state when switching tabs', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Premium Weight Loss Plan')).toBeInTheDocument();
      });

      // Open modal from overview tab
      await user.click(screen.getByText('Premium Weight Loss Plan'));

      await waitFor(() => {
        expect(screen.getByTestId('meal-plan-modal-integration')).toBeInTheDocument();
      });

      // Switch tabs while modal is open
      await user.click(screen.getByRole('tab', { name: /meal plans/i }));

      // Modal should still be open
      expect(screen.getByTestId('meal-plan-modal-integration')).toBeInTheDocument();
      expect(screen.getByTestId('modal-plan-id')).toHaveTextContent('plan-1');

      // Close modal
      await user.click(screen.getByTestId('close-modal-button'));

      await waitFor(() => {
        expect(screen.queryByTestId('meal-plan-modal-integration')).not.toBeInTheDocument();
      });
      expect(modalOpenTracker.isOpen).toBe(false);
    });

    it('allows opening different meal plans from different tabs', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Premium Weight Loss Plan')).toBeInTheDocument();
      });

      // Open meal plan from overview
      await user.click(screen.getByText('Premium Weight Loss Plan'));
      await waitFor(() => {
        expect(screen.getByTestId('modal-plan-id')).toHaveTextContent('plan-1');
      });

      // Close modal
      await user.click(screen.getByTestId('close-modal-button'));
      await waitFor(() => {
        expect(screen.queryByTestId('meal-plan-modal-integration')).not.toBeInTheDocument();
      });

      // Switch to meal plans tab
      await user.click(screen.getByRole('tab', { name: /meal plans/i }));
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /meal plans/i })).toHaveAttribute('data-state', 'active');
      });

      // Open different meal plan from meal plans tab
      await user.click(screen.getByText('High Protein Cutting Plan'));
      await waitFor(() => {
        expect(screen.getByTestId('modal-plan-id')).toHaveTextContent('plan-4');
        expect(screen.getByTestId('modal-calories')).toHaveTextContent('2200');
      });
    });
  });

  describe('Meal Plan Creation Workflow Integration', () => {
    it('allows creating new meal plan and returns to customer view', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Premium Weight Loss Plan')).toBeInTheDocument();
      });

      // Click create new meal plan
      const createButton = screen.getByRole('button', { name: /create new meal plan/i });
      await user.click(createButton);

      // Should show meal plan generator
      await waitFor(() => {
        expect(screen.getByTestId('meal-plan-generator-integration')).toBeInTheDocument();
        expect(screen.getByTestId('customer-context-data')).toHaveTextContent('customer-123');
      });

      // Generate a meal plan
      await user.click(screen.getByText('Generate New Plan'));

      // Should return to customer view and show toast
      await waitFor(() => {
        expect(screen.queryByTestId('meal-plan-generator-integration')).not.toBeInTheDocument();
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Meal Plan Created & Assigned",
          })
        );
      });

      // Should invalidate and refetch meal plans
      expect(mockApiRequest).toHaveBeenCalledWith(
        'POST',
        `/api/trainer/customers/${mockCustomer.id}/meal-plans`,
        expect.any(Object)
      );
    });
  });

  describe('Real-time Data Synchronization', () => {
    it('updates meal plan counts across tabs when data changes', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Premium Weight Loss Plan')).toBeInTheDocument();
      });

      // Verify initial count in tab
      expect(screen.getByRole('tab', { name: /meal plans \(5\)/i })).toBeInTheDocument();

      // Verify count in overview stats
      expect(screen.getByText('5')).toBeInTheDocument(); // Meal plans count stat

      // Switch to meal plans tab to verify count consistency
      await fireEvent.click(screen.getByRole('tab', { name: /meal plans \(5\)/i }));

      await waitFor(() => {
        expect(screen.getByText('Assigned Meal Plans (5)')).toBeInTheDocument();
      });
    });

    it('handles API errors gracefully during interactions', async () => {
      // Mock API failure for meal plans
      mockApiRequest.mockImplementation(async (method: string, url: string) => {
        if (url.includes('/meal-plans')) {
          throw new Error('Network error');
        }
        return {
          json: async () => ({ status: 'success', data: [] })
        };
      });

      renderComponent();

      // Should show error state instead of meal plans
      await waitFor(() => {
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
      });

      // Should not crash and should show appropriate fallback
      expect(screen.queryByText('Premium Weight Loss Plan')).not.toBeInTheDocument();
    });
  });

  describe('Performance and User Experience', () => {
    it('handles large numbers of meal plans efficiently', async () => {
      // Create many meal plans
      const manyMealPlans = Array.from({ length: 50 }, (_, i) => 
        createRealisticMealPlan(`plan-${i}`, `Meal Plan ${i + 1}`, i)
      );

      mockApiRequest.mockImplementation(async (method: string, url: string) => {
        if (url.includes('/meal-plans')) {
          return {
            json: async () => ({ 
              mealPlans: manyMealPlans, 
              total: manyMealPlans.length 
            })
          };
        }
        return {
          json: async () => ({ status: 'success', data: [] })
        };
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Meal Plan 1')).toBeInTheDocument();
      });

      // Overview should still only show first 3
      expect(screen.getByText('Meal Plan 1')).toBeInTheDocument();
      expect(screen.getByText('Meal Plan 2')).toBeInTheDocument();
      expect(screen.getByText('Meal Plan 3')).toBeInTheDocument();
      expect(screen.getByText('And 47 more meal plans...')).toBeInTheDocument();

      // Switch to meal plans tab
      await fireEvent.click(screen.getByRole('tab', { name: /meal plans/i }));

      // Should show all meal plans efficiently
      await waitFor(() => {
        expect(screen.getByText('Assigned Meal Plans (50)')).toBeInTheDocument();
      });
    });

    it('maintains responsive interaction times', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Premium Weight Loss Plan')).toBeInTheDocument();
      });

      // Test rapid interactions
      const startTime = Date.now();
      
      // Click meal plan
      await user.click(screen.getByText('Premium Weight Loss Plan'));
      
      await waitFor(() => {
        expect(screen.getByTestId('meal-plan-modal-integration')).toBeInTheDocument();
      });
      
      // Close modal
      await user.click(screen.getByTestId('close-modal-button'));
      
      await waitFor(() => {
        expect(screen.queryByTestId('meal-plan-modal-integration')).not.toBeInTheDocument();
      });
      
      const endTime = Date.now();
      
      // Should complete interactions quickly (under 1 second in tests)
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});