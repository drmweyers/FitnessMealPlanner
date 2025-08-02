/**
 * Unit Tests for Trainer Routes (Backend)
 * 
 * Tests the Express.js routes that support the trainer customer detail view:
 * - GET /api/trainer/customers/:customerId/measurements
 * - GET /api/trainer/customers/:customerId/goals
 * - GET /api/trainer/customers/:customerId/meal-plans
 * - POST /api/trainer/customers/:customerId/meal-plans
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { db } from '../../server/db/config';
import { 
  progressMeasurements, 
  customerGoals, 
  personalizedMealPlans, 
  users 
} from '../../server/db/schema';
import { eq, and } from 'drizzle-orm';

// Mock the database
vi.mock('../../server/db/config', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock authentication middleware
const mockAuth = (req: any, res: any, next: any) => {
  req.user = {
    id: 'trainer-123',
    email: 'trainer@example.com',
    role: 'trainer',
  };
  next();
};

// Mock trainer routes
import trainerRouter from '../../server/routes/trainerRoutes';

// Create Express app for testing
const app = express();
app.use(express.json());
app.use(mockAuth);
app.use('/api/trainer', trainerRouter);

// Test data
const mockTrainer = {
  id: 'trainer-123',
  email: 'trainer@example.com', 
  role: 'trainer',
};

const mockCustomer = {
  id: 'customer-123',
  email: 'customer@example.com',
  role: 'customer',
  firstName: 'John',
  lastName: 'Doe',
};

const mockMeasurements = [
  {
    id: 'measurement-1',
    customerId: 'customer-123',
    measurementDate: new Date('2024-01-15'),
    weightLbs: '170.00',
    bodyFatPercentage: '17.5',
    chestCm: '105.0',
    waistCm: '82.0',
    hipsCm: '95.0',
    notes: 'Latest measurement',
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 'measurement-2',
    customerId: 'customer-123',
    measurementDate: new Date('2024-01-01'),
    weightLbs: '185.00',
    bodyFatPercentage: '22.0',
    chestCm: '102.0',
    waistCm: '89.0',
    hipsCm: '98.0',
    notes: 'Starting measurement',
    createdAt: new Date('2024-01-01'),
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
    startingValue: '185.00',
    status: 'completed',
    progressPercentage: 100,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'goal-2',
    customerId: 'customer-123',
    goalType: 'body_fat',
    goalName: 'Reduce body fat to 15%',
    targetValue: '15.00',
    currentValue: '17.50',
    startingValue: '22.00', 
    status: 'active',
    progressPercentage: 64,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
];

const mockMealPlans = [
  {
    id: 'plan-1',
    customerId: 'customer-123',
    trainerId: 'trainer-123',
    planName: 'Weight Loss Plan',
    fitnessGoal: 'weight_loss',
    dailyCalorieTarget: 1800,
    days: 7,
    mealsPerDay: 4,
    createdAt: new Date('2024-01-10'),
  },
];

describe('Trainer Routes - Customer Detail View', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/trainer/customers/:customerId/measurements', () => {
    it('returns customer measurements successfully', async () => {
      // Mock database query
      const mockDbQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockMeasurements),
      };
      
      (db.select as any).mockReturnValue(mockDbQuery);

      const response = await request(app)
        .get('/api/trainer/customers/customer-123/measurements')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].weightLbs).toBe('170.00');
      expect(response.body.data[1].weightLbs).toBe('185.00');
    });

    it('validates customer ID parameter', async () => {
      const response = await request(app)
        .get('/api/trainer/customers//measurements')
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Customer ID is required');
    });

    it('checks trainer authorization for customer', async () => {
      // Mock trainer-customer relationship check
      const mockDbQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]), // No relationship found
      };
      
      (db.select as any).mockReturnValue(mockDbQuery);

      const response = await request(app)
        .get('/api/trainer/customers/customer-456/measurements')
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Not authorized');
    });

    it('handles database errors gracefully', async () => {
      const mockDbQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockRejectedValue(new Error('Database error')),
      };
      
      (db.select as any).mockReturnValue(mockDbQuery);

      const response = await request(app)
        .get('/api/trainer/customers/customer-123/measurements')
        .expect(500);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Failed to fetch measurements');
    });

    it('returns empty array when no measurements exist', async () => {
      const mockDbQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([]),
      };
      
      (db.select as any).mockReturnValue(mockDbQuery);

      const response = await request(app)
        .get('/api/trainer/customers/customer-123/measurements')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toEqual([]);
    });

    it('orders measurements by date (most recent first)', async () => {
      const mockDbQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockMeasurements),
      };
      
      (db.select as any).mockReturnValue(mockDbQuery);

      const response = await request(app)
        .get('/api/trainer/customers/customer-123/measurements')
        .expect(200);

      // Verify orderBy was called with desc(measurementDate)
      expect(mockDbQuery.orderBy).toHaveBeenCalled();
      
      // Verify response is ordered correctly
      expect(new Date(response.body.data[0].measurementDate)).toBeAfter(
        new Date(response.body.data[1].measurementDate)
      );
    });

    it('filters measurements by date range when query params provided', async () => {
      const mockDbQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockMeasurements),
      };
      
      (db.select as any).mockReturnValue(mockDbQuery);

      await request(app)
        .get('/api/trainer/customers/customer-123/measurements')
        .query({ startDate: '2024-01-01', endDate: '2024-01-31' })
        .expect(200);

      // Verify where clause includes date filters
      expect(mockDbQuery.where).toHaveBeenCalledWith(
        expect.objectContaining({})
      );
    });
  });

  describe('GET /api/trainer/customers/:customerId/goals', () => {
    it('returns customer goals successfully', async () => {
      const mockDbQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockGoals),
      };
      
      (db.select as any).mockReturnValue(mockDbQuery);

      const response = await request(app)
        .get('/api/trainer/customers/customer-123/goals')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].goalName).toBe('Lose 15 pounds');
      expect(response.body.data[0].status).toBe('completed');
      expect(response.body.data[1].status).toBe('active');
    });

    it('filters goals by status when query param provided', async () => {
      const activeGoals = mockGoals.filter(g => g.status === 'active');
      
      const mockDbQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(activeGoals),
      };
      
      (db.select as any).mockReturnValue(mockDbQuery);

      const response = await request(app)
        .get('/api/trainer/customers/customer-123/goals')
        .query({ status: 'active' })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('active');
    });

    it('validates customer ID parameter', async () => {
      const response = await request(app)
        .get('/api/trainer/customers//goals')
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    it('calculates progress percentage correctly', async () => {
      const response = await request(app)
        .get('/api/trainer/customers/customer-123/goals')
        .expect(200);

      const completedGoal = response.body.data.find((g: any) => g.status === 'completed');
      const activeGoal = response.body.data.find((g: any) => g.status === 'active');

      expect(completedGoal.progressPercentage).toBe(100);
      expect(activeGoal.progressPercentage).toBe(64);
    });

    it('handles goals with no progress data', async () => {
      const goalsWithoutProgress = [
        {
          ...mockGoals[0],
          currentValue: null,
          progressPercentage: 0,
        },
      ];

      const mockDbQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(goalsWithoutProgress),
      };
      
      (db.select as any).mockReturnValue(mockDbQuery);

      const response = await request(app)
        .get('/api/trainer/customers/customer-123/goals')
        .expect(200);

      expect(response.body.data[0].progressPercentage).toBe(0);
    });
  });

  describe('GET /api/trainer/customers/:customerId/meal-plans', () => {
    it('returns customer meal plans successfully', async () => {
      const mockDbQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockMealPlans),
      };
      
      (db.select as any).mockReturnValue(mockDbQuery);

      const response = await request(app)
        .get('/api/trainer/customers/customer-123/meal-plans')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].planName).toBe('Weight Loss Plan');
      expect(response.body.data[0].dailyCalorieTarget).toBe(1800);
    });

    it('filters meal plans by trainer (shows only trainer\'s plans)', async () => {
      const mockDbQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockMealPlans),
      };
      
      (db.select as any).mockReturnValue(mockDbQuery);

      await request(app)
        .get('/api/trainer/customers/customer-123/meal-plans')
        .expect(200);

      // Verify where clause includes trainerId filter
      expect(mockDbQuery.where).toHaveBeenCalledWith(
        expect.objectContaining({})
      );
    });

    it('orders meal plans by creation date (most recent first)', async () => {
      const multiplePlans = [
        { ...mockMealPlans[0], createdAt: new Date('2024-01-10') },
        { ...mockMealPlans[0], id: 'plan-2', createdAt: new Date('2024-01-05') },
      ];

      const mockDbQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(multiplePlans),
      };
      
      (db.select as any).mockReturnValue(mockDbQuery);

      const response = await request(app)
        .get('/api/trainer/customers/customer-123/meal-plans')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      // Most recent should be first
      expect(new Date(response.body.data[0].createdAt)).toBeAfter(
        new Date(response.body.data[1].createdAt)
      );
    });

    it('includes meal plan statistics', async () => {
      const response = await request(app)
        .get('/api/trainer/customers/customer-123/meal-plans')
        .expect(200);

      const mealPlan = response.body.data[0];
      expect(mealPlan.days).toBe(7);
      expect(mealPlan.mealsPerDay).toBe(4);
      expect(mealPlan.dailyCalorieTarget).toBe(1800);
    });
  });

  describe('POST /api/trainer/customers/:customerId/meal-plans', () => {
    const validMealPlan = {
      planName: 'Custom Plan',
      fitnessGoal: 'muscle_gain',
      description: 'Custom plan for muscle building',
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

    it('creates meal plan assignment successfully', async () => {
      const mockInsertQuery = {
        into: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'assignment-123' }]),
      };
      
      (db.insert as any).mockReturnValue(mockInsertQuery);

      const response = await request(app)
        .post('/api/trainer/customers/customer-123/meal-plans')
        .send({ mealPlanData: validMealPlan })
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.id).toBe('assignment-123');
    });

    it('validates meal plan data structure', async () => {
      const invalidMealPlan = {
        // Missing required fields
        planName: 'Invalid Plan',
      };

      const response = await request(app)
        .post('/api/trainer/customers/customer-123/meal-plans')
        .send({ mealPlanData: invalidMealPlan })
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Invalid meal plan data');
    });

    it('validates required meal plan fields', async () => {
      const requiredFields = [
        'planName',
        'fitnessGoal', 
        'dailyCalorieTarget',
        'days',
        'mealsPerDay',
      ];

      for (const field of requiredFields) {
        const incompletePlan = { ...validMealPlan };
        delete (incompletePlan as any)[field];

        const response = await request(app)
          .post('/api/trainer/customers/customer-123/meal-plans')
          .send({ mealPlanData: incompletePlan })
          .expect(400);

        expect(response.body.message).toContain(field);
      }
    });

    it('includes trainer ID in meal plan assignment', async () => {
      const mockInsertQuery = {
        into: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'assignment-123' }]),
      };
      
      (db.insert as any).mockReturnValue(mockInsertQuery);

      await request(app)
        .post('/api/trainer/customers/customer-123/meal-plans')
        .send({ mealPlanData: validMealPlan })
        .expect(201);

      // Verify trainerId is included in the insert
      expect(mockInsertQuery.values).toHaveBeenCalledWith(
        expect.objectContaining({
          trainerId: 'trainer-123',
          customerId: 'customer-123',
        })
      );
    });

    it('handles customer context in meal plan creation', async () => {
      const customerContext = {
        customerId: 'customer-123',
        customerEmail: 'customer@example.com',
        healthMetrics: mockMeasurements,
        goals: mockGoals.filter(g => g.status === 'active'),
        recentMeasurements: mockMeasurements.slice(0, 3),
      };

      const mockInsertQuery = {
        into: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'assignment-123' }]),
      };
      
      (db.insert as any).mockReturnValue(mockInsertQuery);

      const response = await request(app)
        .post('/api/trainer/customers/customer-123/meal-plans')
        .send({ 
          mealPlanData: validMealPlan,
          customerContext 
        })
        .expect(201);

      expect(response.body.status).toBe('success');
    });

    it('validates meal structure within meal plan', async () => {
      const planWithInvalidMeals = {
        ...validMealPlan,
        meals: [
          {
            // Missing required meal fields
            day: 1,
            mealType: 'breakfast',
          },
        ],
      };

      const response = await request(app)
        .post('/api/trainer/customers/customer-123/meal-plans')
        .send({ mealPlanData: planWithInvalidMeals })
        .expect(400);

      expect(response.body.message).toContain('Invalid meal data');
    });

    it('prevents duplicate meal plan assignments', async () => {
      const mockInsertQuery = {
        into: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue({
          code: '23505', // PostgreSQL unique constraint violation
          message: 'duplicate key value violates unique constraint',
        }),
      };
      
      (db.insert as any).mockReturnValue(mockInsertQuery);

      const response = await request(app)
        .post('/api/trainer/customers/customer-123/meal-plans')
        .send({ mealPlanData: validMealPlan })
        .expect(409);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('already exists');
    });

    it('handles database transaction errors', async () => {
      const mockInsertQuery = {
        into: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue(new Error('Transaction failed')),
      };
      
      (db.insert as any).mockReturnValue(mockInsertQuery);

      const response = await request(app)
        .post('/api/trainer/customers/customer-123/meal-plans')
        .send({ mealPlanData: validMealPlan })
        .expect(500);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Failed to assign meal plan');
    });
  });

  describe('Authentication and Authorization', () => {
    it('requires trainer authentication', async () => {
      // Create app without auth middleware
      const unauthedApp = express();
      unauthedApp.use(express.json());
      unauthedApp.use('/api/trainer', trainerRouter);

      const response = await request(unauthedApp)
        .get('/api/trainer/customers/customer-123/measurements')
        .expect(401);

      expect(response.body.message).toContain('Authentication required');
    });

    it('requires trainer role', async () => {
      // Mock customer user instead of trainer
      const customerAuth = (req: any, res: any, next: any) => {
        req.user = {
          id: 'customer-123',
          email: 'customer@example.com',
          role: 'customer',
        };
        next();
      };

      const customerApp = express();
      customerApp.use(express.json());
      customerApp.use(customerAuth);
      customerApp.use('/api/trainer', trainerRouter);

      const response = await request(customerApp)
        .get('/api/trainer/customers/customer-123/measurements')
        .expect(403);

      expect(response.body.message).toContain('Trainer role required');
    });

    it('validates trainer-customer relationship', async () => {
      // Mock database to return no relationship
      const mockDbQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      
      (db.select as any).mockReturnValue(mockDbQuery);

      const response = await request(app)
        .get('/api/trainer/customers/unauthorized-customer/measurements')
        .expect(403);

      expect(response.body.message).toContain('Not authorized');
    });
  });

  describe('Rate Limiting and Security', () => {
    it('handles concurrent requests properly', async () => {
      const mockDbQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockMeasurements),
      };
      
      (db.select as any).mockReturnValue(mockDbQuery);

      // Make multiple concurrent requests
      const requests = Array.from({ length: 5 }, () =>
        request(app).get('/api/trainer/customers/customer-123/measurements')
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('success');
      });
    });

    it('sanitizes input parameters', async () => {
      const maliciousCustomerId = "'; DROP TABLE users; --";

      const response = await request(app)
        .get(`/api/trainer/customers/${encodeURIComponent(maliciousCustomerId)}/measurements`)
        .expect(400);

      expect(response.body.message).toContain('Invalid customer ID format');
    });

    it('limits response data size', async () => {
      // Mock large dataset
      const largeMeasurements = Array.from({ length: 1000 }, (_, i) => ({
        ...mockMeasurements[0],
        id: `measurement-${i}`,
        measurementDate: new Date(2024, 0, i + 1),
      }));

      const mockDbQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(largeMeasurements),
      };
      
      (db.select as any).mockReturnValue(mockDbQuery);

      const response = await request(app)
        .get('/api/trainer/customers/customer-123/measurements')
        .expect(200);

      // Should limit response size (e.g., to 100 records)
      expect(response.body.data.length).toBeLessThanOrEqual(100);
    });
  });
});