/**
 * Unit Tests for Trainer Customer API Functions
 * 
 * Tests the API functions that support the trainer customer detail view:
 * - getTrainerCustomerMeasurements
 * - getTrainerCustomerGoals
 * - getTrainerCustomerMealPlans
 * - assignMealPlanToCustomer
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  getTrainerCustomerMeasurements,
  getTrainerCustomerGoals,
  getTrainerCustomerMealPlans,
  assignMealPlanToCustomer
} from '../../client/src/utils/api';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock response data
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
    notes: 'Latest measurement',
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
    notes: 'Starting measurement',
    createdAt: '2024-01-01T00:00:00Z',
  },
];

const mockGoals = [
  {
    id: 'goal-1',
    customerId: 'customer-123',
    goalType: 'weight_loss',
    goalName: 'Lose 15 pounds',
    targetValue: '170.00',
    currentValue: '170.00',
    status: 'completed',
    progressPercentage: 100,
  },
  {
    id: 'goal-2',
    customerId: 'customer-123',
    goalType: 'body_fat',
    goalName: 'Reduce body fat to 15%',
    targetValue: '15.00',
    currentValue: '17.50',
    status: 'active',
    progressPercentage: 64,
  },
];

const mockMealPlans = [
  {
    id: 'plan-1',
    planName: 'Weight Loss Plan',
    fitnessGoal: 'weight_loss',
    dailyCalorieTarget: 1800,
    days: 7,
    mealsPerDay: 4,
    createdAt: '2024-01-10T00:00:00Z',
  },
  {
    id: 'plan-2',
    planName: 'Maintenance Plan',
    fitnessGoal: 'maintenance',
    dailyCalorieTarget: 2000,
    days: 7,
    mealsPerDay: 3,
    createdAt: '2024-01-05T00:00:00Z',
  },
];

describe('Trainer Customer API Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getTrainerCustomerMeasurements', () => {
    it('fetches customer measurements successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          data: mockMeasurements,
        }),
      });

      const result = await getTrainerCustomerMeasurements('customer-123');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/trainer/customers/customer-123/measurements',
        {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      expect(result).toEqual({
        status: 'success',
        data: mockMeasurements,
      });
    });

    it('handles API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          status: 'error',
          message: 'Internal server error',
        }),
      });

      await expect(getTrainerCustomerMeasurements('customer-123')).rejects.toThrow(
        'Failed to fetch customer measurements'
      );
    });

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(getTrainerCustomerMeasurements('customer-123')).rejects.toThrow(
        'Failed to fetch customer measurements'
      );
    });

    it('validates customer ID parameter', async () => {
      await expect(getTrainerCustomerMeasurements('')).rejects.toThrow(
        'Customer ID is required'
      );

      await expect(getTrainerCustomerMeasurements(null as any)).rejects.toThrow(
        'Customer ID is required'
      );
    });

    it('handles unauthorized access', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          status: 'error',
          message: 'Unauthorized',
        }),
      });

      await expect(getTrainerCustomerMeasurements('customer-123')).rejects.toThrow(
        'Failed to fetch customer measurements'
      );
    });

    it('handles forbidden access (trainer not assigned to customer)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          status: 'error',
          message: 'Not authorized to view this customer',
        }),
      });

      await expect(getTrainerCustomerMeasurements('customer-123')).rejects.toThrow(
        'Failed to fetch customer measurements'
      );
    });
  });

  describe('getTrainerCustomerGoals', () => {
    it('fetches customer goals successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          data: mockGoals,
        }),
      });

      const result = await getTrainerCustomerGoals('customer-123');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/trainer/customers/customer-123/goals',
        {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      expect(result).toEqual({
        status: 'success',
        data: mockGoals,
      });
    });

    it('handles empty goals response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          data: [],
        }),
      });

      const result = await getTrainerCustomerGoals('customer-123');

      expect(result.data).toEqual([]);
    });

    it('validates customer ID parameter', async () => {
      await expect(getTrainerCustomerGoals('')).rejects.toThrow(
        'Customer ID is required'
      );
    });

    it('handles API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          status: 'error',
          message: 'Customer not found',
        }),
      });

      await expect(getTrainerCustomerGoals('customer-123')).rejects.toThrow(
        'Failed to fetch customer goals'
      );
    });
  });

  describe('getTrainerCustomerMealPlans', () => {
    it('fetches customer meal plans successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          data: mockMealPlans,
        }),
      });

      const result = await getTrainerCustomerMealPlans('customer-123');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/trainer/customers/customer-123/meal-plans',
        {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      expect(result).toEqual({
        status: 'success',
        data: mockMealPlans,
      });
    });

    it('handles empty meal plans response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          data: [],
        }),
      });

      const result = await getTrainerCustomerMealPlans('customer-123');

      expect(result.data).toEqual([]);
    });

    it('validates customer ID parameter', async () => {
      await expect(getTrainerCustomerMealPlans('')).rejects.toThrow(
        'Customer ID is required'
      );
    });

    it('sorts meal plans by creation date (most recent first)', async () => {
      const unsortedPlans = [
        { ...mockMealPlans[1], createdAt: '2024-01-05T00:00:00Z' },
        { ...mockMealPlans[0], createdAt: '2024-01-10T00:00:00Z' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          data: unsortedPlans,
        }),
      });

      const result = await getTrainerCustomerMealPlans('customer-123');

      // Should be sorted by creation date, most recent first
      expect(result.data[0].createdAt).toBe('2024-01-10T00:00:00Z');
      expect(result.data[1].createdAt).toBe('2024-01-05T00:00:00Z');
    });
  });

  describe('assignMealPlanToCustomer', () => {
    const mockMealPlan = {
      id: 'plan-new',
      planName: 'Custom Plan',
      fitnessGoal: 'muscle_gain',
      dailyCalorieTarget: 2400,
      days: 7,
      mealsPerDay: 5,
      meals: [
        {
          day: 1,
          mealNumber: 1,
          mealType: 'breakfast',
          recipe: {
            id: 'recipe-1',
            name: 'Protein Pancakes',
            caloriesKcal: 350,
          },
        },
      ],
    };

    it('assigns meal plan to customer successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          data: { id: 'assignment-123' },
        }),
      });

      const result = await assignMealPlanToCustomer('customer-123', mockMealPlan);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/trainer/customers/customer-123/meal-plans',
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ mealPlanData: mockMealPlan }),
        }
      );

      expect(result).toEqual({
        status: 'success',
        data: { id: 'assignment-123' },
      });
    });

    it('validates required parameters', async () => {
      await expect(assignMealPlanToCustomer('', mockMealPlan)).rejects.toThrow(
        'Customer ID is required'
      );

      await expect(assignMealPlanToCustomer('customer-123', null as any)).rejects.toThrow(
        'Meal plan data is required'
      );
    });

    it('validates meal plan structure', async () => {
      const invalidMealPlan = {
        // Missing required fields
        planName: 'Invalid Plan',
      };

      await expect(
        assignMealPlanToCustomer('customer-123', invalidMealPlan as any)
      ).rejects.toThrow('Invalid meal plan data');
    });

    it('handles meal plan assignment conflicts', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          status: 'error',
          message: 'Meal plan already exists for this period',
        }),
      });

      await expect(assignMealPlanToCustomer('customer-123', mockMealPlan)).rejects.toThrow(
        'Failed to assign meal plan'
      );
    });

    it('handles trainer authorization errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          status: 'error',
          message: 'Not authorized to assign meal plans to this customer',
        }),
      });

      await expect(assignMealPlanToCustomer('customer-123', mockMealPlan)).rejects.toThrow(
        'Failed to assign meal plan'
      );
    });

    it('includes customer context in meal plan assignment', async () => {
      const customerContext = {
        customerId: 'customer-123',
        customerEmail: 'test@example.com',
        healthMetrics: mockMeasurements,
        goals: mockGoals.filter(g => g.status === 'active'),
        recentMeasurements: mockMeasurements.slice(0, 3),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          data: { id: 'assignment-123' },
        }),
      });

      await assignMealPlanToCustomer('customer-123', mockMealPlan, customerContext);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/trainer/customers/customer-123/meal-plans',
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mealPlanData: mockMealPlan,
            customerContext,
          }),
        }
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(getTrainerCustomerMeasurements('customer-123')).rejects.toThrow(
        'Failed to fetch customer measurements'
      );
    });

    it('handles timeout errors', async () => {
      mockFetch.mockImplementationOnce(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      await expect(getTrainerCustomerMeasurements('customer-123')).rejects.toThrow(
        'Failed to fetch customer measurements'
      );
    }, 1000);

    it('handles rate limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          status: 'error',
          message: 'Too many requests',
        }),
      });

      await expect(getTrainerCustomerMeasurements('customer-123')).rejects.toThrow(
        'Failed to fetch customer measurements'
      );
    });

    it('handles server maintenance mode', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({
          status: 'error',
          message: 'Service temporarily unavailable',
        }),
      });

      await expect(getTrainerCustomerMeasurements('customer-123')).rejects.toThrow(
        'Failed to fetch customer measurements'
      );
    });
  });

  describe('Data Validation and Transformation', () => {
    it('validates measurement data structure', async () => {
      const invalidMeasurements = [
        {
          // Missing required fields
          id: 'invalid-1',
          customerId: 'customer-123',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          data: invalidMeasurements,
        }),
      });

      // Should still return the data but API function could validate
      const result = await getTrainerCustomerMeasurements('customer-123');
      expect(result.data).toEqual(invalidMeasurements);
    });

    it('handles date formatting in measurements', async () => {
      const measurementsWithDates = [
        {
          ...mockMeasurements[0],
          measurementDate: '2024-01-15',
          createdAt: '2024-01-15T10:30:00Z',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          data: measurementsWithDates,
        }),
      });

      const result = await getTrainerCustomerMeasurements('customer-123');
      
      expect(result.data[0].measurementDate).toBe('2024-01-15');
      expect(result.data[0].createdAt).toBe('2024-01-15T10:30:00Z');
    });

    it('handles numeric values as strings in measurements', async () => {
      const measurementsWithStringNumbers = [
        {
          ...mockMeasurements[0],
          weightLbs: '170.50',
          bodyFatPercentage: '17.5',
          chestCm: '105.0',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          data: measurementsWithStringNumbers,
        }),
      });

      const result = await getTrainerCustomerMeasurements('customer-123');
      
      expect(result.data[0].weightLbs).toBe('170.50');
      expect(result.data[0].bodyFatPercentage).toBe('17.5');
    });

    it('handles goal progress calculations', async () => {
      const goalsWithProgress = [
        {
          ...mockGoals[0],
          startingValue: '185.00',
          currentValue: '170.00',
          targetValue: '165.00',
          progressPercentage: 75, // (185-170)/(185-165) * 100 = 75%
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          data: goalsWithProgress,
        }),
      });

      const result = await getTrainerCustomerGoals('customer-123');
      
      expect(result.data[0].progressPercentage).toBe(75);
    });
  });
});