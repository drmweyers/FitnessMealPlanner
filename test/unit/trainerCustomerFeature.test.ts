/**
 * Integration Tests for Trainer Customer Detail View Feature
 * 
 * Tests the complete workflow for the trainer customer detail view feature
 * including API integration, data flow, and business logic.
 */

import { describe, it, expect, vi } from 'vitest';
import { 
  getTrainerCustomerMeasurements,
  getTrainerCustomerGoals,
  getTrainerCustomerMealPlans,
  assignMealPlanToCustomer,
  type CustomerContext
} from '@/utils/api';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Trainer Customer Detail View Feature Integration', () => {
  
  describe('Complete Workflow Tests', () => {
    it('should enable trainer to view customer details and create meal plan', async () => {
      const customerId = 'customer-123';
      
      // Mock API responses for getting customer data
      const mockMeasurements = [
        {
          id: 'measurement-1',
          customerId,
          measurementDate: '2024-01-15T00:00:00Z',
          weightLbs: '170.00',
          bodyFatPercentage: '17.5',
          notes: 'Current weight goal achieved',
          createdAt: '2024-01-15T00:00:00Z',
        },
      ];

      const mockGoals = [
        {
          id: 'goal-1',
          customerId,
          goalType: 'weight_loss',
          goalName: 'Lose 15 pounds',
          targetValue: '170.00',
          currentValue: '170.00',
          status: 'completed' as const,
          progressPercentage: 100,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z',
        },
        {
          id: 'goal-2',
          customerId,
          goalType: 'body_fat',
          goalName: 'Reduce body fat to 15%',
          targetValue: '15.00',
          currentValue: '17.50',
          status: 'active' as const,
          progressPercentage: 64,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z',
        },
      ];

      const mockMealPlans = [
        {
          id: 'plan-1',
          planName: 'Previous Weight Loss Plan',
          fitnessGoal: 'weight_loss',
          dailyCalorieTarget: 1800,
          days: 7,
          mealsPerDay: 4,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      // Step 1: Trainer fetches customer measurements
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', data: mockMeasurements }),
      });

      const measurementsResult = await getTrainerCustomerMeasurements(customerId);
      
      expect(measurementsResult.status).toBe('success');
      expect(measurementsResult.data).toHaveLength(1);
      expect(measurementsResult.data[0].weightLbs).toBe('170.00');

      // Step 2: Trainer fetches customer goals
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', data: mockGoals }),
      });

      const goalsResult = await getTrainerCustomerGoals(customerId);
      
      expect(goalsResult.status).toBe('success');
      expect(goalsResult.data).toHaveLength(2);
      
      const activeGoals = goalsResult.data.filter(g => g.status === 'active');
      expect(activeGoals).toHaveLength(1);
      expect(activeGoals[0].goalName).toBe('Reduce body fat to 15%');

      // Step 3: Trainer fetches existing meal plans
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', data: mockMealPlans }),
      });

      const mealPlansResult = await getTrainerCustomerMealPlans(customerId);
      
      expect(mealPlansResult.status).toBe('success');
      expect(mealPlansResult.data).toHaveLength(1);

      // Step 4: Trainer creates customer context for new meal plan
      const customerContext: CustomerContext = {
        customerId,
        customerEmail: 'customer@example.com',
        healthMetrics: measurementsResult.data,
        goals: activeGoals,
        recentMeasurements: measurementsResult.data.slice(0, 3),
      };

      // Verify customer context is properly constructed
      expect(customerContext.customerId).toBe(customerId);
      expect(customerContext.healthMetrics).toHaveLength(1);
      expect(customerContext.goals).toHaveLength(1);
      expect(customerContext.goals[0].status).toBe('active');

      // Step 5: Trainer creates new meal plan based on customer context
      const newMealPlan = {
        planName: 'Maintenance Plan',
        fitnessGoal: 'maintenance',
        description: 'Maintaining current weight while reducing body fat',
        dailyCalorieTarget: 2000,
        days: 7,
        mealsPerDay: 3,
        meals: [
          {
            day: 1,
            mealNumber: 1,
            mealType: 'breakfast',
            recipe: {
              id: 'recipe-1',
              name: 'High Protein Breakfast',
              caloriesKcal: 400,
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', data: { id: 'assignment-123' } }),
      });

      const assignmentResult = await assignMealPlanToCustomer(
        customerId,
        newMealPlan,
        customerContext
      );

      expect(assignmentResult.status).toBe('success');
      expect(assignmentResult.data.id).toBe('assignment-123');

      // Verify the meal plan was created with customer context
      expect(mockFetch).toHaveBeenLastCalledWith(
        '/api/trainer/customers/customer-123/meal-plans',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"customerContext"'),
        })
      );
    });

    it('should handle customer with no historical data gracefully', async () => {
      const customerId = 'new-customer-456';

      // Mock empty responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'success', data: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'success', data: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'success', data: [] }),
        });

      // Fetch all customer data
      const [measurementsResult, goalsResult, mealPlansResult] = await Promise.all([
        getTrainerCustomerMeasurements(customerId),
        getTrainerCustomerGoals(customerId),
        getTrainerCustomerMealPlans(customerId),
      ]);

      // All should succeed but return empty data
      expect(measurementsResult.status).toBe('success');
      expect(measurementsResult.data).toEqual([]);
      
      expect(goalsResult.status).toBe('success');
      expect(goalsResult.data).toEqual([]);
      
      expect(mealPlansResult.status).toBe('success');
      expect(mealPlansResult.data).toEqual([]);

      // Customer context should still be creatable
      const customerContext: CustomerContext = {
        customerId,
        customerEmail: 'newcustomer@example.com',
        healthMetrics: [],
        goals: [],
        recentMeasurements: [],
      };

      expect(customerContext.customerId).toBe(customerId);
      expect(customerContext.healthMetrics).toHaveLength(0);
      expect(customerContext.goals).toHaveLength(0);
    });

    it('should validate trainer authorization for customer access', async () => {
      const unauthorizedCustomerId = 'unauthorized-customer-789';

      // Mock 403 Forbidden response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          status: 'error',
          message: 'Not authorized to view this customer',
        }),
      });

      await expect(getTrainerCustomerMeasurements(unauthorizedCustomerId))
        .rejects.toThrow('Failed to fetch customer measurements');
    });

    it('should handle network errors during data fetching', async () => {
      const customerId = 'customer-network-error';

      // Mock network error
      mockFetch.mockRejectedValueOnce(new Error('Network connection failed'));

      await expect(getTrainerCustomerMeasurements(customerId))
        .rejects.toThrow('Failed to fetch customer measurements');
    });
  });

  describe('Business Logic Tests', () => {
    it('should filter only active goals for customer context', async () => {
      const customerId = 'customer-with-mixed-goals';
      
      const mixedGoals = [
        {
          id: 'goal-completed',
          customerId,
          goalType: 'weight_loss',
          goalName: 'Completed Goal',
          status: 'completed' as const,
          progressPercentage: 100,
        },
        {
          id: 'goal-active',
          customerId,
          goalType: 'body_fat',
          goalName: 'Active Goal',
          status: 'active' as const,
          progressPercentage: 50,
        },
        {
          id: 'goal-paused',
          customerId,
          goalType: 'performance',
          goalName: 'Paused Goal',
          status: 'paused' as const,
          progressPercentage: 25,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', data: mixedGoals }),
      });

      const goalsResult = await getTrainerCustomerGoals(customerId);
      const activeGoals = goalsResult.data.filter(g => g.status === 'active');

      // Only active goals should be used in customer context
      expect(activeGoals).toHaveLength(1);
      expect(activeGoals[0].goalName).toBe('Active Goal');

      const customerContext: CustomerContext = {
        customerId,
        customerEmail: 'customer@example.com',
        healthMetrics: [],
        goals: activeGoals, // Only active goals
        recentMeasurements: [],
      };

      expect(customerContext.goals).toHaveLength(1);
      expect(customerContext.goals[0].status).toBe('active');
    });

    it('should limit recent measurements to most recent entries', async () => {
      const customerId = 'customer-many-measurements';
      
      // Create 10 measurements
      const manyMeasurements = Array.from({ length: 10 }, (_, i) => ({
        id: `measurement-${i}`,
        customerId,
        measurementDate: new Date(2024, 0, i + 1).toISOString(),
        weightLbs: `${180 - i}.00`,
        createdAt: new Date(2024, 0, i + 1).toISOString(),
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', data: manyMeasurements }),
      });

      const measurementsResult = await getTrainerCustomerMeasurements(customerId);
      
      // Customer context should limit to 3 most recent
      const recentMeasurements = measurementsResult.data.slice(0, 3);
      
      expect(recentMeasurements).toHaveLength(3);
      
      const customerContext: CustomerContext = {
        customerId,
        customerEmail: 'customer@example.com',
        healthMetrics: measurementsResult.data,
        goals: [],
        recentMeasurements,
      };

      expect(customerContext.recentMeasurements).toHaveLength(3);
      expect(customerContext.healthMetrics).toHaveLength(10);
    });

    it('should validate meal plan data before assignment', async () => {
      const customerId = 'customer-123';
      
      // Invalid meal plan (missing required fields)
      const invalidMealPlan = {
        planName: 'Invalid Plan',
        // Missing required fields
      };

      await expect(
        assignMealPlanToCustomer(customerId, invalidMealPlan as any)
      ).rejects.toThrow('Invalid meal plan data');
    });

    it('should handle meal plan assignment conflicts', async () => {
      const customerId = 'customer-123';
      
      const validMealPlan = {
        planName: 'Conflicting Plan',
        fitnessGoal: 'weight_loss',
        dailyCalorieTarget: 1800,
        days: 7,
        mealsPerDay: 3,
        meals: [],
      };

      // Mock conflict response (409)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          status: 'error',
          message: 'Meal plan already exists for this period',
        }),
      });

      await expect(
        assignMealPlanToCustomer(customerId, validMealPlan)
      ).rejects.toThrow('Failed to assign meal plan');
    });
  });

  describe('Data Validation Tests', () => {
    it('should validate customer ID parameters', async () => {
      // Test empty customer ID
      await expect(getTrainerCustomerMeasurements('')).rejects.toThrow(
        'Customer ID is required'
      );

      // Test null customer ID
      await expect(getTrainerCustomerMeasurements(null as any)).rejects.toThrow(
        'Customer ID is required'
      );

      // Test undefined customer ID
      await expect(getTrainerCustomerMeasurements(undefined as any)).rejects.toThrow(
        'Customer ID is required'
      );
    });

    it('should handle malformed API responses', async () => {
      const customerId = 'customer-123';

      // Mock response with invalid JSON
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(getTrainerCustomerMeasurements(customerId))
        .rejects.toThrow('Failed to fetch customer measurements');
    });

    it('should validate meal plan structure comprehensively', async () => {
      const customerId = 'customer-123';

      // Test missing planName
      await expect(
        assignMealPlanToCustomer(customerId, {
          fitnessGoal: 'weight_loss',
          dailyCalorieTarget: 1800,
          days: 7,
          mealsPerDay: 3,
        } as any)
      ).rejects.toThrow('Invalid meal plan data: missing planName');

      // Test missing dailyCalorieTarget
      await expect(
        assignMealPlanToCustomer(customerId, {
          planName: 'Test Plan',
          fitnessGoal: 'weight_loss',
          days: 7,
          mealsPerDay: 3,
        } as any)
      ).rejects.toThrow('Invalid meal plan data: missing dailyCalorieTarget');
    });
  });
});