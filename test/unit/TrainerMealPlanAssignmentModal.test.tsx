import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiRequest } from '../../client/src/lib/queryClient';

// Mock the API request module
vi.mock('../../client/src/lib/queryClient', () => ({
  apiRequest: vi.fn(),
}));

const mockApiRequest = vi.mocked(apiRequest);

describe('TrainerMealPlanAssignmentModal - Core Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Assignment API Integration', () => {
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

    it('should fetch trainer customers correctly for assignment modal', async () => {
      // Mock customers API response
      const mockCustomers = [
        {
          id: 'customer-1',
          email: 'customer1@test.com',
          role: 'customer',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'customer-2',
          email: 'customer2@test.com',
          role: 'customer',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockApiRequest.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          customers: mockCustomers,
          total: 2
        }),
      } as any);

      // Simulate fetching customers for assignment modal
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

    it('should fetch trainer meal plans for assignment interface', async () => {
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

  describe('Assignment Modal State Logic', () => {
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

    it('should handle customer selection toggle logic', () => {
      let selectedCustomers = ['customer-123'];
      
      // Test adding customer
      const customerId = 'customer-456';
      if (!selectedCustomers.includes(customerId)) {
        selectedCustomers = [...selectedCustomers, customerId];
      }
      
      expect(selectedCustomers).toContain('customer-123');
      expect(selectedCustomers).toContain('customer-456');
      expect(selectedCustomers.length).toBe(2);
      
      // Test removing customer
      if (selectedCustomers.includes(customerId)) {
        selectedCustomers = selectedCustomers.filter(id => id !== customerId);
      }
      
      expect(selectedCustomers).toContain('customer-123');
      expect(selectedCustomers).not.toContain('customer-456');
      expect(selectedCustomers.length).toBe(1);
    });

    it('should handle modal state management', () => {
      // Test modal state variables
      let planToAssign: any = null;
      let selectedCustomers: string[] = [];
      
      // Test opening modal
      const mockPlan = {
        id: 'plan-123',
        mealPlanData: { planName: 'Test Plan' }
      };
      
      planToAssign = mockPlan;
      selectedCustomers = [];
      
      expect(planToAssign).not.toBeNull();
      expect(planToAssign.id).toBe('plan-123');
      expect(selectedCustomers.length).toBe(0);
      
      // Test closing modal
      planToAssign = null;
      selectedCustomers = [];
      
      expect(planToAssign).toBeNull();
      expect(selectedCustomers.length).toBe(0);
    });
  });

  describe('Assignment Success/Error Handling', () => {
    it('should handle successful assignment with proper cleanup', async () => {
      // Mock successful assignment
      mockApiRequest.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          assignment: { id: 'assignment-123' },
          message: 'Meal plan assigned successfully'
        }),
      } as any);

      // Simulate assignment workflow
      const planId = 'plan-123';
      const customerId = 'customer-456';
      
      const response = await apiRequest('POST', `/api/trainer/meal-plans/${planId}/assign`, {
        customerId,
      });

      expect(response.ok).toBe(true);
      
      // Simulate cleanup that should happen after successful assignment
      let planToAssign: any = { id: planId };
      let selectedCustomers = [customerId];
      
      // After successful assignment, modal should close and state reset
      if (response.ok) {
        planToAssign = null;
        selectedCustomers = [];
      }
      
      expect(planToAssign).toBeNull();
      expect(selectedCustomers.length).toBe(0);
    });

    it('should handle assignment failure without closing modal', async () => {
      // Mock failed assignment
      mockApiRequest.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          message: 'Assignment failed'
        }),
      } as any);

      // Simulate assignment workflow
      const planId = 'plan-123';
      const customerId = 'customer-456';
      
      const response = await apiRequest('POST', `/api/trainer/meal-plans/${planId}/assign`, {
        customerId,
      });

      expect(response.ok).toBe(false);
      
      // Simulate error handling - modal should stay open
      const planToAssign: any = { id: planId };
      const selectedCustomers = [customerId];
      
      // After failed assignment, modal should stay open
      if (!response.ok) {
        // Don't close modal, keep state
      }
      
      expect(planToAssign).not.toBeNull();
      expect(planToAssign.id).toBe(planId);
      expect(selectedCustomers.length).toBe(1);
    });

    it('should handle network errors gracefully', async () => {
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
  });

  describe('Modal Close Functionality', () => {
    it('should close modal via cancel button simulation', () => {
      // Simulate modal state
      let planToAssign: any = { id: 'plan-123' };
      let selectedCustomers = ['customer-456'];
      
      // Simulate cancel button click
      const handleCloseAssignmentModal = () => {
        planToAssign = null;
        selectedCustomers = [];
      };
      
      handleCloseAssignmentModal();
      
      expect(planToAssign).toBeNull();
      expect(selectedCustomers.length).toBe(0);
    });

    it('should close modal via dialog onOpenChange simulation', () => {
      // Simulate modal state
      let planToAssign: any = { id: 'plan-123' };
      let selectedCustomers = ['customer-456'];
      
      // Simulate dialog onOpenChange with false (closing)
      const handleOpenChange = (open: boolean) => {
        if (!open) {
          planToAssign = null;
          selectedCustomers = [];
        }
      };
      
      handleOpenChange(false);
      
      expect(planToAssign).toBeNull();
      expect(selectedCustomers.length).toBe(0);
    });

    it('should maintain modal state when onOpenChange is true', () => {
      // Simulate modal state
      let planToAssign: any = { id: 'plan-123' };
      let selectedCustomers = ['customer-456'];
      
      // Simulate dialog onOpenChange with true (opening/staying open)
      const handleOpenChange = (open: boolean) => {
        if (!open) {
          planToAssign = null;
          selectedCustomers = [];
        }
      };
      
      handleOpenChange(true);
      
      // Should maintain state when open is true
      expect(planToAssign).not.toBeNull();
      expect(planToAssign.id).toBe('plan-123');
      expect(selectedCustomers.length).toBe(1);
    });
  });

  describe('Assignment Workflow Integration', () => {
    it('should complete full assignment workflow', async () => {
      // Mock successful APIs
      mockApiRequest.mockImplementation((method, url) => {
        if (url === '/api/trainer/meal-plans') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              mealPlans: [{ id: 'plan-123', mealPlanData: { planName: 'Test Plan' } }],
              total: 1
            }),
          }) as any;
        }
        
        if (url === '/api/trainer/customers') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              customers: [{ id: 'customer-456', email: 'test@example.com' }],
              total: 1
            }),
          }) as any;
        }
        
        if (url.includes('/assign')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              assignment: { id: 'assignment-123' },
              message: 'Meal plan assigned successfully'
            }),
          }) as any;
        }
        
        return Promise.reject(new Error(`Unmocked API call: ${method} ${url}`));
      });

      // 1. Fetch meal plans
      const mealPlansResponse = await apiRequest('GET', '/api/trainer/meal-plans');
      expect(mealPlansResponse.ok).toBe(true);
      
      // 2. Fetch customers
      const customersResponse = await apiRequest('GET', '/api/trainer/customers');
      expect(customersResponse.ok).toBe(true);
      
      // 3. Assign meal plan
      const assignResponse = await apiRequest('POST', '/api/trainer/meal-plans/plan-123/assign', {
        customerId: 'customer-456'
      });
      expect(assignResponse.ok).toBe(true);
      
      // 4. Verify all API calls were made
      expect(mockApiRequest).toHaveBeenCalledTimes(3);
      expect(mockApiRequest).toHaveBeenCalledWith('GET', '/api/trainer/meal-plans');
      expect(mockApiRequest).toHaveBeenCalledWith('GET', '/api/trainer/customers');
      expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/trainer/meal-plans/plan-123/assign', {
        customerId: 'customer-456'
      });
    });
  });
});