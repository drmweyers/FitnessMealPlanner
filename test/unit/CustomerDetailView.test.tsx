/**
 * Unit Tests for CustomerDetailView Component
 * 
 * Tests the trainer customer detail view feature including:
 * - Component rendering with customer data
 * - Tab navigation (Overview, Meal Plans, Health Metrics, Goals)
 * - Customer context passing for meal plan creation
 * - Data fetching and error handling
 * - Meal plan generator integration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import CustomerDetailView from '@/components/CustomerDetailView';
import type { Customer } from '@/types';

// Mock the API functions
vi.mock('@/utils/api', () => ({
  getTrainerCustomerMeasurements: vi.fn(),
  getTrainerCustomerGoals: vi.fn(),
  getTrainerCustomerMealPlans: vi.fn(),
}));

// Mock the MealPlanGenerator component
vi.mock('@/components/MealPlanGenerator', () => ({
  default: ({ customerContext, onMealPlanGenerated, onBack }: any) => (
    <div data-testid="meal-plan-generator">
      <div data-testid="customer-context">{JSON.stringify(customerContext)}</div>
      <button onClick={() => onMealPlanGenerated({ id: 'test-plan' })}>
        Generate Plan
      </button>
      <button onClick={onBack}>Back</button>
    </div>
  ),
}));

// Mock sessionStorage
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

// Test data
const mockCustomer: Customer = {
  id: 'customer-123',
  email: 'testcustomer@example.com',
  role: 'customer',
  firstName: 'John',
  lastName: 'Doe',
  phoneNumber: '+1234567890',
  dateOfBirth: '1990-01-01',
  gender: 'male',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockMeasurements = [
  {
    id: 'measurement-1',
    customerId: 'customer-123',
    measurementDate: '2024-01-15T00:00:00Z',
    weightLbs: '170.00',
    bodyFatPercentage: '17.5',
    chestCm: '105.0',
    waistCm: '82.0',
    hipsCm: '95.0',
    notes: 'Reached first weight goal!',
    createdAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'measurement-2',
    customerId: 'customer-123',
    measurementDate: '2024-01-01T00:00:00Z',
    weightLbs: '185.00',
    bodyFatPercentage: '22.0',
    chestCm: '102.0',
    waistCm: '89.0',
    hipsCm: '98.0',
    notes: 'Starting measurements',
    createdAt: '2024-01-01T00:00:00Z',
  },
];

const mockGoals = [
  {
    id: 'goal-1',
    customerId: 'customer-123',
    goalType: 'weight_loss',
    goalName: 'Lose 15 pounds',
    description: 'Target weight loss for improved health',
    targetValue: '170.00',
    targetUnit: 'lbs',
    currentValue: '170.00',
    startingValue: '185.00',
    startDate: '2024-01-01T00:00:00Z',
    targetDate: '2024-03-01T00:00:00Z',
    status: 'completed',
    progressPercentage: 100,
    notes: 'Sustainable weight loss approach',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'goal-2',
    customerId: 'customer-123',
    goalType: 'body_fat',
    goalName: 'Reduce body fat to 15%',
    description: 'Achieve lean physique',
    targetValue: '15.00',
    targetUnit: '%',
    currentValue: '17.50',
    startingValue: '22.00',
    startDate: '2024-01-01T00:00:00Z',
    targetDate: '2024-06-01T00:00:00Z',
    status: 'active',
    progressPercentage: 64,
    notes: 'Combine strength training with cardio',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
];

const mockMealPlans = [
  {
    id: 'plan-1',
    planName: 'Weight Loss Plan',
    fitnessGoal: 'weight_loss',
    description: 'Balanced meal plan for weight loss',
    dailyCalorieTarget: 1800,
    days: 7,
    mealsPerDay: 4,
    createdAt: '2024-01-10T00:00:00Z',
    meals: [],
  },
];

describe('CustomerDetailView Component', () => {
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
    
    // Reset mocks
    vi.clearAllMocks();
    
    // Setup API mocks
    const { getTrainerCustomerMeasurements, getTrainerCustomerGoals, getTrainerCustomerMealPlans } = 
      await import('@/utils/api');
    
    getTrainerCustomerMeasurements.mockResolvedValue({ data: mockMeasurements });
    getTrainerCustomerGoals.mockResolvedValue({ data: mockGoals });
    getTrainerCustomerMealPlans.mockResolvedValue({ data: mockMealPlans });
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

  describe('Component Rendering', () => {
    it('renders customer information correctly', async () => {
      renderComponent();

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('testcustomer@example.com')).toBeInTheDocument();
      expect(screen.getByText('+1234567890')).toBeInTheDocument();
    });

    it('renders all navigation tabs', () => {
      renderComponent();

      expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /meal plans/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /health metrics/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /goals/i })).toBeInTheDocument();
    });

    it('renders back button', () => {
      renderComponent();

      const backButton = screen.getByRole('button', { name: /back to customers/i });
      expect(backButton).toBeInTheDocument();
    });

    it('calls onBack when back button is clicked', () => {
      renderComponent();

      const backButton = screen.getByRole('button', { name: /back to customers/i });
      fireEvent.click(backButton);

      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Tab Navigation', () => {
    it('shows overview tab by default', () => {
      renderComponent();

      const overviewTab = screen.getByRole('tab', { name: /overview/i });
      expect(overviewTab).toHaveAttribute('data-state', 'active');
    });

    it('switches to meal plans tab when clicked', async () => {
      renderComponent();

      const mealPlansTab = screen.getByRole('tab', { name: /meal plans/i });
      fireEvent.click(mealPlansTab);

      await waitFor(() => {
        expect(mealPlansTab).toHaveAttribute('data-state', 'active');
      });
    });

    it('switches to health metrics tab when clicked', async () => {
      renderComponent();

      const healthMetricsTab = screen.getByRole('tab', { name: /health metrics/i });
      fireEvent.click(healthMetricsTab);

      await waitFor(() => {
        expect(healthMetricsTab).toHaveAttribute('data-state', 'active');
      });
    });

    it('switches to goals tab when clicked', async () => {
      renderComponent();

      const goalsTab = screen.getByRole('tab', { name: /goals/i });
      fireEvent.click(goalsTab);

      await waitFor(() => {
        expect(goalsTab).toHaveAttribute('data-state', 'active');
      });
    });
  });

  describe('Health Metrics Tab', () => {
    it('displays customer measurements', async () => {
      renderComponent();

      // Switch to health metrics tab
      const healthMetricsTab = screen.getByRole('tab', { name: /health metrics/i });
      fireEvent.click(healthMetricsTab);

      await waitFor(() => {
        expect(screen.getByText('170.00 lbs')).toBeInTheDocument();
        expect(screen.getByText('17.5%')).toBeInTheDocument();
        expect(screen.getByText('Reached first weight goal!')).toBeInTheDocument();
      });
    });

    it('shows progress comparison between measurements', async () => {
      renderComponent();

      const healthMetricsTab = screen.getByRole('tab', { name: /health metrics/i });
      fireEvent.click(healthMetricsTab);

      await waitFor(() => {
        // Should show both measurements
        expect(screen.getByText('170.00 lbs')).toBeInTheDocument();
        expect(screen.getByText('185.00 lbs')).toBeInTheDocument();
      });
    });

    it('handles empty measurements gracefully', async () => {
      const { getTrainerCustomerMeasurements } = await import('@/utils/api');
      getTrainerCustomerMeasurements.mockResolvedValue({ data: [] });

      renderComponent();

      const healthMetricsTab = screen.getByRole('tab', { name: /health metrics/i });
      fireEvent.click(healthMetricsTab);

      await waitFor(() => {
        expect(screen.getByText(/no measurements recorded yet/i)).toBeInTheDocument();
      });
    });
  });

  describe('Goals Tab', () => {
    it('displays customer goals', async () => {
      renderComponent();

      const goalsTab = screen.getByRole('tab', { name: /goals/i });
      fireEvent.click(goalsTab);

      await waitFor(() => {
        expect(screen.getByText('Lose 15 pounds')).toBeInTheDocument();
        expect(screen.getByText('Reduce body fat to 15%')).toBeInTheDocument();
        expect(screen.getByText('170.00/170.00 lbs')).toBeInTheDocument();
        expect(screen.getByText('17.50/15.00 %')).toBeInTheDocument();
      });
    });

    it('shows goal progress indicators', async () => {
      renderComponent();

      const goalsTab = screen.getByRole('tab', { name: /goals/i });
      fireEvent.click(goalsTab);

      await waitFor(() => {
        expect(screen.getByText('Completed')).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();
      });
    });

    it('handles empty goals gracefully', async () => {
      const { getTrainerCustomerGoals } = await import('@/utils/api');
      getTrainerCustomerGoals.mockResolvedValue({ data: [] });

      renderComponent();

      const goalsTab = screen.getByRole('tab', { name: /goals/i });
      fireEvent.click(goalsTab);

      await waitFor(() => {
        expect(screen.getByText(/no goals set yet/i)).toBeInTheDocument();
      });
    });
  });

  describe('Meal Plans Tab', () => {
    it('displays existing meal plans', async () => {
      renderComponent();

      const mealPlansTab = screen.getByRole('tab', { name: /meal plans/i });
      fireEvent.click(mealPlansTab);

      await waitFor(() => {
        expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
        expect(screen.getByText('1800 calories/day')).toBeInTheDocument();
        expect(screen.getByText('7 days, 4 meals/day')).toBeInTheDocument();
      });
    });

    it('shows create new meal plan button', async () => {
      renderComponent();

      const mealPlansTab = screen.getByRole('tab', { name: /meal plans/i });
      fireEvent.click(mealPlansTab);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create new meal plan/i })).toBeInTheDocument();
      });
    });

    it('handles empty meal plans gracefully', async () => {
      const { getTrainerCustomerMealPlans } = await import('@/utils/api');
      getTrainerCustomerMealPlans.mockResolvedValue({ data: [] });

      renderComponent();

      const mealPlansTab = screen.getByRole('tab', { name: /meal plans/i });
      fireEvent.click(mealPlansTab);

      await waitFor(() => {
        expect(screen.getByText(/no meal plans created yet/i)).toBeInTheDocument();
      });
    });
  });

  describe('Customer Context Passing', () => {
    it('creates customer context when creating meal plan', async () => {
      renderComponent();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Switch to meal plans tab
      const mealPlansTab = screen.getByRole('tab', { name: /meal plans/i });
      fireEvent.click(mealPlansTab);

      // Click create new meal plan
      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /create new meal plan/i });
        fireEvent.click(createButton);
      });

      // Check that customer context is passed to MealPlanGenerator
      await waitFor(() => {
        const mealPlanGenerator = screen.getByTestId('meal-plan-generator');
        expect(mealPlanGenerator).toBeInTheDocument();

        const customerContext = screen.getByTestId('customer-context');
        const contextData = JSON.parse(customerContext.textContent || '{}');

        expect(contextData.customerId).toBe('customer-123');
        expect(contextData.customerEmail).toBe('testcustomer@example.com');
        expect(contextData.healthMetrics).toHaveLength(2);
        expect(contextData.goals).toHaveLength(1); // Only active goals
        expect(contextData.recentMeasurements).toHaveLength(2);
      });
    });

    it('stores customer context in sessionStorage', async () => {
      renderComponent();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Switch to meal plans tab and create meal plan
      const mealPlansTab = screen.getByRole('tab', { name: /meal plans/i });
      fireEvent.click(mealPlansTab);

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /create new meal plan/i });
        fireEvent.click(createButton);
      });

      // Check sessionStorage was called
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'customerContext',
        expect.stringContaining('"customerId":"customer-123"')
      );
    });

    it('returns to customer detail view after meal plan creation', async () => {
      renderComponent();

      // Navigate to meal plan generator
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const mealPlansTab = screen.getByRole('tab', { name: /meal plans/i });
      fireEvent.click(mealPlansTab);

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /create new meal plan/i });
        fireEvent.click(createButton);
      });

      // Simulate meal plan generation
      await waitFor(() => {
        const generateButton = screen.getByRole('button', { name: /generate plan/i });
        fireEvent.click(generateButton);
      });

      // Should return to customer detail view
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.queryByTestId('meal-plan-generator')).not.toBeInTheDocument();
      });
    });

    it('returns to customer detail view when back button is clicked in meal plan generator', async () => {
      renderComponent();

      // Navigate to meal plan generator
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const mealPlansTab = screen.getByRole('tab', { name: /meal plans/i });
      fireEvent.click(mealPlansTab);

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /create new meal plan/i });
        fireEvent.click(createButton);
      });

      // Click back button in meal plan generator
      await waitFor(() => {
        const backButton = screen.getByRole('button', { name: /back/i });
        fireEvent.click(backButton);
      });

      // Should return to customer detail view
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.queryByTestId('meal-plan-generator')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      const { getTrainerCustomerMeasurements } = await import('@/utils/api');
      getTrainerCustomerMeasurements.mockRejectedValue(new Error('API Error'));

      renderComponent();

      const healthMetricsTab = screen.getByRole('tab', { name: /health metrics/i });
      fireEvent.click(healthMetricsTab);

      await waitFor(() => {
        expect(screen.getByText(/error loading measurements/i)).toBeInTheDocument();
      });
    });

    it('shows loading states while fetching data', async () => {
      // Mock a delayed response
      const { getTrainerCustomerMeasurements } = await import('@/utils/api');
      getTrainerCustomerMeasurements.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: mockMeasurements }), 100))
      );

      renderComponent();

      const healthMetricsTab = screen.getByRole('tab', { name: /health metrics/i });
      fireEvent.click(healthMetricsTab);

      // Should show loading state
      expect(screen.getByText(/loading measurements/i)).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('170.00 lbs')).toBeInTheDocument();
      });
    });
  });

  describe('Data Filtering', () => {
    it('only passes active goals to customer context', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const mealPlansTab = screen.getByRole('tab', { name: /meal plans/i });
      fireEvent.click(mealPlansTab);

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /create new meal plan/i });
        fireEvent.click(createButton);
      });

      await waitFor(() => {
        const customerContext = screen.getByTestId('customer-context');
        const contextData = JSON.parse(customerContext.textContent || '{}');

        // Should only include active goals (goal-2), not completed ones (goal-1)
        expect(contextData.goals).toHaveLength(1);
        expect(contextData.goals[0].goalName).toBe('Reduce body fat to 15%');
        expect(contextData.goals[0].status).toBe('active');
      });
    });

    it('limits recent measurements to 3 most recent', async () => {
      // Add more measurements to test the limit
      const manyMeasurements = [
        ...mockMeasurements,
        {
          id: 'measurement-3',
          customerId: 'customer-123',
          measurementDate: '2023-12-15T00:00:00Z',
          weightLbs: '190.00',
          bodyFatPercentage: '25.0',
          chestCm: '100.0',
          waistCm: '92.0',
          hipsCm: '100.0',
          notes: 'Older measurement',
          createdAt: '2023-12-15T00:00:00Z',
        },
        {
          id: 'measurement-4',
          customerId: 'customer-123',
          measurementDate: '2023-12-01T00:00:00Z',
          weightLbs: '195.00',
          bodyFatPercentage: '27.0',
          chestCm: '98.0',
          waistCm: '95.0',
          hipsCm: '102.0',
          notes: 'Much older measurement',
          createdAt: '2023-12-01T00:00:00Z',
        },
      ];

      const { getTrainerCustomerMeasurements } = await import('@/utils/api');
      getTrainerCustomerMeasurements.mockResolvedValue({ data: manyMeasurements });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const mealPlansTab = screen.getByRole('tab', { name: /meal plans/i });
      fireEvent.click(mealPlansTab);

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /create new meal plan/i });
        fireEvent.click(createButton);
      });

      await waitFor(() => {
        const customerContext = screen.getByTestId('customer-context');
        const contextData = JSON.parse(customerContext.textContent || '{}');

        // Should limit to 3 most recent measurements
        expect(contextData.recentMeasurements).toHaveLength(3);
        // Should be the 3 most recent ones (not the oldest)
        expect(contextData.recentMeasurements[0].weightLbs).toBe('170.00');
        expect(contextData.recentMeasurements[1].weightLbs).toBe('185.00');
        expect(contextData.recentMeasurements[2].weightLbs).toBe('190.00');
      });
    });
  });
});