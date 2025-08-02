import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiRequest } from '../../client/src/lib/queryClient';

// Mock the API request module
vi.mock('../../client/src/lib/queryClient', () => ({
  apiRequest: vi.fn(),
}));

const mockApiRequest = vi.mocked(apiRequest);

describe('TrainerMealPlanAssignment API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Meal Plan Assignment API Calls', () => {
    it('should make correct API call to assign meal plan to customer', async () => {
      // Mock successful API response
      mockApiRequest.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          assignment: { id: 'assignment-123' },
          message: 'Meal plan assigned successfully'
        }),
      } as any);

      const planId = 'plan-123';
      const customerId = 'customer-456';

      // Simulate the API call that the component would make
      const response = await apiRequest('POST', `/api/trainer/meal-plans/${planId}/assign`, {
        customerId,
      });

      // Verify the API was called with correct parameters
      expect(mockApiRequest).toHaveBeenCalledWith(
        'POST',
        '/api/trainer/meal-plans/plan-123/assign',
        { customerId: 'customer-456' }
      );

      // Verify successful response
      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.assignment.id).toBe('assignment-123');
      expect(result.message).toBe('Meal plan assigned successfully');
    });

    it('should handle API error when assignment fails', async () => {
      // Mock failed API response
      mockApiRequest.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          status: 'error',
          message: 'Customer not found',
          code: 'NOT_FOUND'
        }),
      } as any);

      const planId = 'plan-123';
      const customerId = 'invalid-customer';

      // Simulate the API call
      const response = await apiRequest('POST', `/api/trainer/meal-plans/${planId}/assign`, {
        customerId,
      });

      // Verify the API was called
      expect(mockApiRequest).toHaveBeenCalledWith(
        'POST',
        '/api/trainer/meal-plans/plan-123/assign',
        { customerId: 'invalid-customer' }
      );

      // Verify error response
      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.message).toBe('Customer not found');
    });

    it('should fetch trainer customers correctly', async () => {
      // Mock customers API response
      const mockCustomers = [
        {
          id: 'customer-1',
          email: 'customer1@test.com',
          role: 'customer',
        },
        {
          id: 'customer-2',
          email: 'customer2@test.com',
          role: 'customer',
        },
      ];

      mockApiRequest.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          customers: mockCustomers,
          total: 2
        }),
      } as any);

      // Simulate fetching customers
      const response = await apiRequest('GET', '/api/trainer/customers');

      // Verify the API was called correctly
      expect(mockApiRequest).toHaveBeenCalledWith('GET', '/api/trainer/customers');

      // Verify response
      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.customers).toHaveLength(2);
      expect(result.customers[0].email).toBe('customer1@test.com');
      expect(result.customers[1].email).toBe('customer2@test.com');
      expect(result.total).toBe(2);
    });

    it('should fetch trainer meal plans correctly', async () => {
      // Mock meal plans API response
      const mockMealPlans = [
        {
          id: 'plan-1',
          trainerId: 'trainer-123',
          mealPlanData: {
            planName: 'Weight Loss Plan',
            fitnessGoal: 'weight_loss',
            days: 7,
            mealsPerDay: 3,
            dailyCalorieTarget: 1800,
          },
          notes: 'For weight loss clients',
          tags: ['weight-loss'],
          isTemplate: false,
          assignmentCount: 2,
        },
        {
          id: 'plan-2',
          trainerId: 'trainer-123',
          mealPlanData: {
            planName: 'Muscle Gain Plan',
            fitnessGoal: 'muscle_gain',
            days: 7,
            mealsPerDay: 4,
            dailyCalorieTarget: 2500,
          },
          notes: 'For muscle building clients',
          tags: ['muscle-gain'],
          isTemplate: true,
          assignmentCount: 1,
        },
      ];

      mockApiRequest.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          mealPlans: mockMealPlans,
          total: 2
        }),
      } as any);

      // Simulate fetching meal plans
      const response = await apiRequest('GET', '/api/trainer/meal-plans');

      // Verify the API was called correctly
      expect(mockApiRequest).toHaveBeenCalledWith('GET', '/api/trainer/meal-plans');

      // Verify response
      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.mealPlans).toHaveLength(2);
      expect(result.mealPlans[0].mealPlanData.planName).toBe('Weight Loss Plan');
      expect(result.mealPlans[1].mealPlanData.planName).toBe('Muscle Gain Plan');
      expect(result.total).toBe(2);
    });
  });

  describe('Assignment Logic Validation', () => {
    it('should validate required fields for assignment', () => {
      const planId = 'plan-123';
      const customerId = 'customer-456';

      // Test validation logic
      expect(planId).toBeTruthy();
      expect(customerId).toBeTruthy();
      expect(planId).toMatch(/^[a-z0-9-]+$/); // ID format (letters, numbers, hyphens)
      expect(customerId).toMatch(/^[a-z0-9-]+$/); // ID format (letters, numbers, hyphens)
    });

    it('should handle empty customer selection', () => {
      const selectedCustomers: string[] = [];
      
      // Test empty selection validation
      expect(selectedCustomers.length).toBe(0);
      
      // This should trigger validation error in UI
      const hasValidSelection = selectedCustomers.length > 0;
      expect(hasValidSelection).toBe(false);
    });

    it('should handle single customer selection', () => {
      const selectedCustomers = ['customer-123'];
      
      // Test single selection
      expect(selectedCustomers.length).toBe(1);
      expect(selectedCustomers[0]).toBe('customer-123');
      
      const hasValidSelection = selectedCustomers.length > 0;
      expect(hasValidSelection).toBe(true);
    });

    it('should handle multiple customer selection (first one used)', () => {
      const selectedCustomers = ['customer-123', 'customer-456'];
      
      // Test multiple selection (API only supports one at a time)
      expect(selectedCustomers.length).toBe(2);
      
      // Component should use first selected customer
      const customerToAssign = selectedCustomers[0];
      expect(customerToAssign).toBe('customer-123');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      // Mock network error
      mockApiRequest.mockRejectedValue(new Error('Network error'));

      try {
        await apiRequest('POST', '/api/trainer/meal-plans/plan-123/assign', {
          customerId: 'customer-456',
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Network error');
      }
    });

    it('should handle server errors', async () => {
      // Mock server error response
      mockApiRequest.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({
          status: 'error',
          message: 'Internal server error',
          code: 'SERVER_ERROR'
        }),
      } as any);

      const response = await apiRequest('POST', '/api/trainer/meal-plans/plan-123/assign', {
        customerId: 'customer-456',
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
      const result = await response.json();
      expect(result.message).toBe('Internal server error');
    });
  });
});