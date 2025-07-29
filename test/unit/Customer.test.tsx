import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Customer from '../../client/src/pages/Customer';
import { AuthContext } from '../../client/src/contexts/AuthContext';

// Mock the auth context
const mockAuthContext = {
  user: { id: '1', email: 'test@customer.com', role: 'customer' as const },
  isLoading: false,
  isAuthenticated: true,
  error: undefined,
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn()
};

// Mock API request
vi.mock('../../client/src/lib/queryClient', () => ({
  apiRequest: vi.fn()
}));

// Mock components that might have issues
vi.mock('../../client/src/components/MealPlanCard', () => ({
  default: ({ mealPlan, onClick }: any) => (
    <div data-testid="meal-plan-card" onClick={onClick}>
      {mealPlan.planName}
    </div>
  )
}));

vi.mock('../../client/src/components/MealPlanModal', () => ({
  default: ({ mealPlan, onClose }: any) => 
    mealPlan ? (
      <div data-testid="meal-plan-modal">
        <button onClick={onClose}>Close</button>
        {mealPlan.planName}
      </div>
    ) : null
}));

describe('Customer Component Unit Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const renderCustomer = (authOverrides = {}) => {
    const authValue = { ...mockAuthContext, ...authOverrides };
    
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <Customer />
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  };

  it('should show loading state when user is not authenticated', () => {
    console.log('🧪 Testing loading state...');
    
    renderCustomer({ isAuthenticated: false, user: null });
    
    expect(screen.getByText('Loading your meal plans...')).toBeInTheDocument();
    console.log('✅ Loading state renders correctly');
  });

  it('should show loading state when user data is missing', () => {
    console.log('🧪 Testing missing user data...');
    
    renderCustomer({ user: null });
    
    expect(screen.getByText('Loading your meal plans...')).toBeInTheDocument();
    console.log('✅ Missing user data handled correctly');
  });

  it('should render main content when authenticated', async () => {
    console.log('🧪 Testing authenticated render...');
    
    const { apiRequest } = await import('../../client/src/lib/queryClient');
    (apiRequest as any).mockResolvedValue({
      json: () => Promise.resolve({
        mealPlans: [],
        total: 0,
        summary: {
          totalPlans: 0,
          activePlans: 0,
          totalCalorieTargets: 0,
          avgCaloriesPerDay: 0
        }
      })
    });

    renderCustomer();

    await waitFor(() => {
      expect(screen.getByText('My Nutrition Journey')).toBeInTheDocument();
    });
    
    console.log('✅ Authenticated content renders correctly');
  });

  it('should handle API errors gracefully', async () => {
    console.log('🧪 Testing API error handling...');
    
    const { apiRequest } = await import('../../client/src/lib/queryClient');
    (apiRequest as any).mockRejectedValue(new Error('API Error'));

    renderCustomer();

    await waitFor(() => {
      expect(screen.getByText('My Nutrition Journey')).toBeInTheDocument();
    });

    // Should still render the page even with API errors
    expect(screen.getByText('Your meal plan journey awaits!')).toBeInTheDocument();
    console.log('✅ API errors handled gracefully');
  });

  it('should render meal plans when data is available', async () => {
    console.log('🧪 Testing meal plans rendering...');
    
    const mockMealPlans = [
      {
        id: '1',
        planName: 'Test Meal Plan',
        fitnessGoal: 'weight_loss',
        dailyCalorieTarget: 1500,
        totalDays: 7,
        mealsPerDay: 3,
        assignedAt: '2025-01-01',
        isActive: true,
        meals: []
      }
    ];

    const { apiRequest } = await import('../../client/src/lib/queryClient');
    (apiRequest as any).mockResolvedValue({
      json: () => Promise.resolve({
        mealPlans: mockMealPlans,
        total: 1,
        summary: {
          totalPlans: 1,
          activePlans: 1,
          totalCalorieTargets: 1500,
          avgCaloriesPerDay: 1500
        }
      })
    });

    renderCustomer();

    await waitFor(() => {
      expect(screen.getByTestId('meal-plan-card')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Test Meal Plan')).toBeInTheDocument();
    console.log('✅ Meal plans render correctly with data');
  });

  it('should validate component imports', () => {
    console.log('🧪 Testing component imports...');
    
    // This test just ensures the component can be imported without errors
    expect(Customer).toBeDefined();
    expect(typeof Customer).toBe('function');
    console.log('✅ Customer component imports successfully');
  });
});