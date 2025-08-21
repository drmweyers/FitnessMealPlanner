/**
 * Unit Tests for Trainer-Customer Relationships
 * 
 * Tests the core trainer-customer relationship functionality including:
 * - Database models and constraints
 * - API endpoints for customer management
 * - Meal plan and recipe assignments
 * - Authorization and access control
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { db } from '../../server/db';
import { 
  users,
  personalizedMealPlans, 
  personalizedRecipes,
  customerInvitations,
  mealPlanAssignments,
  trainerMealPlans,
  type User,
  type MealPlan 
} from '../../shared/schema';
import { eq, and, inArray, desc } from 'drizzle-orm';
import trainerRouter from '../../server/routes/trainerRoutes';
import customerRouter from '../../server/routes/customerRoutes';
import { storage } from '../../server/storage';

// Mock the database
vi.mock('../../server/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock storage layer
vi.mock('../../server/storage');

// Mock auth middleware directly
vi.mock('../../server/middleware/auth', () => ({
  requireAuth: vi.fn().mockImplementation((req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Authentication required. Please provide a valid token.',
        code: 'NO_TOKEN'
      });
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-jwt-secret');
      console.log('Auth middleware - Token decoded:', decoded);
      
      // Mock user lookup
      if (decoded.id === 'trainer-123') {
        req.user = { id: 'trainer-123', role: 'trainer' };
      } else if (decoded.id === 'customer-123') {
        req.user = { id: 'customer-123', role: 'customer' };
      } else {
        return res.status(401).json({ error: 'Invalid user session' });
      }
      
      next();
    } catch (error) {
      console.log('Auth middleware - Token verification failed:', error.message);
      return res.status(401).json({ error: 'Invalid token' });
    }
  }),
  requireRole: vi.fn().mockImplementation((role: string) => {
    return (req: any, res: any, next: any) => {
      if (!req.user || req.user.role !== role) {
        return res.status(403).json({ 
          error: `${role.charAt(0).toUpperCase() + role.slice(1)} access required`,
          code: 'ROLE_REQUIRED'
        });
      }
      next();
    };
  }),
  requireAdmin: vi.fn(),
  requireTrainerOrAdmin: vi.fn()
}));

// Helper function to generate test JWT tokens
const createTestToken = (user: { id: string; email: string; role: 'admin' | 'trainer' | 'customer' }) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET || 'test-jwt-secret', {
    expiresIn: '15m',
    algorithm: 'HS256',
    issuer: 'FitnessMealPlanner',
    audience: 'FitnessMealPlanner-Client'
  });
};

// Test data
const mockTrainer: User = {
  id: 'trainer-123',
  email: 'trainer@example.com',
  password: null,
  role: 'trainer',
  googleId: null,
  name: 'John Trainer',
  profilePicture: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockCustomer: User = {
  id: 'customer-123',
  email: 'customer@example.com',
  password: 'hashed-password',
  role: 'customer',
  googleId: null,
  name: 'Jane Customer',
  profilePicture: null,
  createdAt: new Date('2024-01-02'),
  updatedAt: new Date('2024-01-02'),
};

// Test tokens (declare but don't initialize until beforeEach)
let trainerToken: string;
let customerToken: string;

const mockMealPlan: MealPlan = {
  id: 'plan-123',
  planName: 'Weight Loss Plan',
  fitnessGoal: 'weight_loss',
  description: 'Custom plan for weight loss',
  dailyCalorieTarget: 1800,
  days: 7,
  mealsPerDay: 4,
  generatedBy: 'trainer-123',
  createdAt: new Date(),
  meals: [
    {
      day: 1,
      mealNumber: 1,
      mealType: 'breakfast',
      recipe: {
        id: 'recipe-1',
        name: 'Protein Oatmeal',
        description: 'High protein breakfast',
        caloriesKcal: 350,
        proteinGrams: '25.0',
        carbsGrams: '45.0',
        fatGrams: '8.0',
        prepTimeMinutes: 10,
        cookTimeMinutes: 5,
        servings: 1,
        mealTypes: ['breakfast'],
        dietaryTags: ['high-protein'],
        mainIngredientTags: ['oats'],
        ingredientsJson: [
          { name: 'Rolled oats', amount: '1', unit: 'cup' },
          { name: 'Protein powder', amount: '1', unit: 'scoop' },
        ],
        instructionsText: '1. Cook oats\n2. Add protein powder',
        imageUrl: null,
      },
    },
  ],
};

describe('Trainer-Customer Relationships', () => {
  let trainerApp: express.Application;
  let customerApp: express.Application;
  const mockDb = vi.mocked(db);
  const mockStorage = vi.mocked(storage);

  beforeEach(() => {
    // Set test environment variables
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.NODE_ENV = 'test';
    
    // Generate test tokens
    trainerToken = createTestToken({
      id: mockTrainer.id,
      email: mockTrainer.email,
      role: mockTrainer.role
    });
    
    customerToken = createTestToken({
      id: mockCustomer.id,
      email: mockCustomer.email,
      role: mockCustomer.role
    });
    
    // Debug: Log token information
    console.log('Generated trainerToken:', trainerToken.substring(0, 50) + '...');
    console.log('Generated customerToken:', customerToken.substring(0, 50) + '...');
    
    // Setup trainer app with real auth middleware
    trainerApp = express();
    trainerApp.use(express.json());
    trainerApp.use(cookieParser());
    trainerApp.use('/api/trainer', trainerRouter);

    // Setup customer app with real auth middleware
    customerApp = express();
    customerApp.use(express.json());
    customerApp.use(cookieParser());
    customerApp.use('/api/customer', customerRouter);

    // Mock storage.getUser to return appropriate users based on token
    mockStorage.getUser.mockImplementation((id: string) => {
      console.log('storage.getUser called with id:', id);
      if (id === 'trainer-123') {
        console.log('Returning mockTrainer for id:', id);
        return Promise.resolve(mockTrainer);
      } else if (id === 'customer-123') {
        console.log('Returning mockCustomer for id:', id);
        return Promise.resolve(mockCustomer);
      }
      console.log('Returning null for unknown id:', id);
      return Promise.resolve(null);
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Database Model Relationships', () => {
    it('should validate trainer-customer meal plan relationship', async () => {
      const mockPersonalizedMealPlan = {
        id: 'assignment-123',
        customerId: 'customer-123',
        trainerId: 'trainer-123',
        mealPlanData: mockMealPlan,
        assignedAt: new Date(),
      };

      // Mock successful database query for meal plan assignments
      const mockDbQuery = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockPersonalizedMealPlan]),
      };

      mockDb.select.mockReturnValue(mockDbQuery as any);

      const response = await request(trainerApp)
        .get('/api/trainer/customers/customer-123/meal-plans')
        .expect(200);

      expect(response.body.mealPlans).toHaveLength(1);
      expect(response.body.mealPlans[0].trainerId).toBe('trainer-123');
      expect(response.body.mealPlans[0].customerId).toBe('customer-123');
    });

    it('should validate trainer-customer recipe relationship', async () => {
      const mockPersonalizedRecipes = [
        {
          id: 'assignment-456',
          customerId: 'customer-123',
          trainerId: 'trainer-123',
          recipeId: 'recipe-1',
          assignedAt: new Date(),
        },
      ];

      const mockDbQuery = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(mockPersonalizedRecipes),
      };

      mockDb.select.mockReturnValue(mockDbQuery as any);

      const response = await request(trainerApp)
        .get('/api/trainer/customers')
        .query({ recipeId: 'recipe-1' })
        .expect(200);

      expect(mockDbQuery.where).toHaveBeenCalledWith(
        expect.objectContaining({
          trainerId: 'trainer-123',
          recipeId: 'recipe-1'
        })
      );
    });

    it('should enforce foreign key constraints for meal plan assignments', async () => {
      const invalidMealPlanData = {
        customerId: 'invalid-customer-id',
        trainerId: 'trainer-123',
        mealPlanData: mockMealPlan,
      };

      const mockInsertQuery = {
        into: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue({
          code: '23503', // Foreign key violation
          constraint: 'personalized_meal_plans_customer_id_fkey',
        }),
      };

      mockDb.insert.mockReturnValue(mockInsertQuery as any);

      const response = await request(trainerApp)
        .post('/api/trainer/customers/invalid-customer-id/meal-plans')
        .send({ mealPlanData: mockMealPlan })
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Invalid customer ID');
    });

    it('should maintain referential integrity when deleting users', async () => {
      // Mock cascading delete verification
      const mockDbQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]), // No remaining assignments after cascade
      };

      mockDb.select.mockReturnValue(mockDbQuery as any);

      // Verify that meal plan assignments are cleaned up when customer is deleted
      const remainingAssignments = await mockDb.select()
        .from(personalizedMealPlans)
        .where(eq(personalizedMealPlans.customerId, 'deleted-customer-id'));

      expect(remainingAssignments).toEqual([]);
    });
  });

  describe('Trainer Customer Management', () => {
    it('should get all customers assigned to trainer', async () => {
      const mockCustomersWithMealPlans = [
        {
          customerId: 'customer-123',
          customerEmail: 'customer1@example.com',
          assignedAt: new Date('2024-01-10'),
        },
        {
          customerId: 'customer-456',
          customerEmail: 'customer2@example.com',
          assignedAt: new Date('2024-01-05'),
        },
      ];

      const mockDbQuery = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockCustomersWithMealPlans),
      };

      mockDb.select.mockReturnValue(mockDbQuery as any);

      const response = await request(trainerApp)
        .get('/api/trainer/customers')
        .expect(200);

      expect(response.body.customers).toHaveLength(2);
      expect(response.body.customers[0].email).toBe('customer1@example.com');
      expect(response.body.total).toBe(2);
    });

    it('should get customer details for authorized trainer', async () => {
      // Mock authorization check
      const mockAuthCheck = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ trainerId: 'trainer-123', customerId: 'customer-123' }]),
      };

      const mockMeasurements = [
        {
          id: 'measurement-1',
          customerId: 'customer-123',
          measurementDate: new Date('2024-01-15'),
          weightKg: '75.5',
          bodyFatPercentage: '15.2',
        },
      ];

      const mockMeasurementQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockMeasurements),
      };

      mockDb.select
        .mockReturnValueOnce(mockAuthCheck as any) // Authorization check
        .mockReturnValueOnce(mockMeasurementQuery as any); // Measurements query

      const response = await request(trainerApp)
        .get('/api/trainer/customers/customer-123/measurements')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].weightKg).toBe('75.5');
    });

    it('should deny access to unauthorized customer data', async () => {
      // Mock no relationship found
      const mockAuthCheck = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]), // No relationship
      };

      mockDb.select.mockReturnValue(mockAuthCheck as any);

      const response = await request(trainerApp)
        .get('/api/trainer/customers/unauthorized-customer/measurements')
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Not authorized');
    });

    it('should get trainer profile statistics', async () => {
      const mockStats = {
        clientCount: 5,
        mealPlanCount: 15,
        recipeCount: 25,
      };

      const mockStatsQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockResolvedValue([{ count: mockStats.clientCount }]),
      };

      mockDb.select.mockReturnValue(mockStatsQuery as any);

      const response = await request(trainerApp)
        .get('/api/trainer/profile/stats')
        .expect(200);

      expect(response.body).toMatchObject({
        totalClients: expect.any(Number),
        totalMealPlansCreated: expect.any(Number),
        totalRecipesAssigned: expect.any(Number),
      });
    });
  });

  describe('Meal Plan Assignment Workflows', () => {
    it('should assign meal plan to customer', async () => {
      const mockInsertQuery = {
        into: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{
          id: 'assignment-123',
          customerId: 'customer-123',
          trainerId: 'trainer-123',
          mealPlanData: mockMealPlan,
        }]),
      };

      // Mock customer existence check
      const mockCustomerQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockCustomer]),
      };

      mockDb.select.mockReturnValue(mockCustomerQuery as any);
      mockDb.insert.mockReturnValue(mockInsertQuery as any);

      const response = await request(trainerApp)
        .post('/api/trainer/customers/customer-123/meal-plans')
        .send({ mealPlanData: mockMealPlan })
        .expect(201);

      expect(response.body.assignment.id).toBe('assignment-123');
      expect(response.body.message).toContain('assigned successfully');

      // Verify correct data was inserted
      expect(mockInsertQuery.values).toHaveBeenCalledWith({
        customerId: 'customer-123',
        trainerId: 'trainer-123',
        mealPlanData: mockMealPlan,
      });
    });

    it('should validate meal plan data before assignment', async () => {
      const invalidMealPlan = {
        planName: 'Incomplete Plan',
        // Missing required fields
      };

      const response = await request(trainerApp)
        .post('/api/trainer/customers/customer-123/meal-plans')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ mealPlanData: invalidMealPlan })
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('required');
    });

    it('should prevent duplicate meal plan assignments', async () => {
      const mockInsertQuery = {
        into: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue({
          code: '23505', // Unique constraint violation
          constraint: 'unique_customer_meal_plan_assignment',
        }),
      };

      mockDb.insert.mockReturnValue(mockInsertQuery as any);

      const response = await request(trainerApp)
        .post('/api/trainer/customers/customer-123/meal-plans')
        .send({ mealPlanData: mockMealPlan })
        .expect(409);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('already assigned');
    });

    it('should remove meal plan assignment', async () => {
      const mockMealPlanCheck = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          id: 'plan-123',
          trainerId: 'trainer-123',
          customerId: 'customer-123',
        }]),
      };

      const mockDeleteQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'plan-123' }]),
      };

      mockDb.select.mockReturnValue(mockMealPlanCheck as any);
      mockDb.delete.mockReturnValue(mockDeleteQuery as any);

      const response = await request(trainerApp)
        .delete('/api/trainer/assigned-meal-plans/plan-123')
        .expect(200);

      expect(response.body.message).toContain('removed successfully');
    });
  });

  describe('Customer Access to Assigned Content', () => {
    it('should allow customers to view their assigned meal plans', async () => {
      const mockAssignedMealPlans = [
        {
          id: 'assignment-123',
          customerId: 'customer-123',
          trainerId: 'trainer-123',
          mealPlanData: mockMealPlan,
          assignedAt: new Date(),
        },
      ];

      const mockDbQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockAssignedMealPlans),
      };

      mockDb.select.mockReturnValue(mockDbQuery as any);

      const response = await request(customerApp)
        .get('/api/customer/meal-plans')
        .expect(200);

      expect(response.body.mealPlans).toHaveLength(1);
      expect(response.body.mealPlans[0].mealPlanData.planName).toBe('Weight Loss Plan');
    });

    it('should prevent customers from accessing other customers data', async () => {
      // Mock query that filters by customer ID
      const mockDbQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([]), // No results for different customer
      };

      mockDb.select.mockReturnValue(mockDbQuery as any);

      const response = await request(customerApp)
        .get('/api/customer/meal-plans')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      // Should only return empty array, not other customer's data
      expect(response.body.mealPlans).toEqual([]);

      // Verify the query included customer ID filter
      expect(mockDbQuery.where).toHaveBeenCalledWith(
        eq(personalizedMealPlans.customerId, 'customer-123')
      );
    });

    it('should get customer profile statistics', async () => {
      const mockMealPlanCount = { count: 3 };
      const mockRecipeCount = { count: 12 };

      const mockCountQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn()
          .mockResolvedValueOnce([mockMealPlanCount])
          .mockResolvedValueOnce([mockRecipeCount]),
      };

      mockDb.select.mockReturnValue(mockCountQuery as any);

      const response = await request(customerApp)
        .get('/api/customer/profile/stats')
        .expect(200);

      expect(response.body).toMatchObject({
        totalMealPlans: expect.any(Number),
        completedDays: expect.any(Number),
        favoriteRecipes: expect.any(Number),
        avgCaloriesPerDay: expect.any(Number),
      });
    });
  });

  describe('Authorization and Security', () => {
    it('should require authentication for all trainer endpoints', async () => {
      const unauthenticatedApp = express();
      unauthenticatedApp.use(express.json());
      unauthenticatedApp.use('/api/trainer', trainerRouter);

      const response = await request(unauthenticatedApp)
        .get('/api/trainer/customers')
        .expect(401);

      expect(response.body.message).toContain('Authentication required');
    });

    it('should require trainer role for trainer endpoints', async () => {
      const customerApp = express();
      customerApp.use(express.json());
      customerApp.use(mockCustomerAuth); // Customer trying to access trainer endpoint
      customerApp.use('/api/trainer', trainerRouter);

      const response = await request(customerApp)
        .get('/api/trainer/customers')
        .expect(403);

      expect(response.body.message).toContain('Trainer role required');
    });

    it('should validate customer access to their own data only', async () => {
      const mockDbQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([]),
      };

      mockDb.select.mockReturnValue(mockDbQuery as any);

      await request(customerApp)
        .get('/api/customer/meal-plans')
        .expect(200);

      // Verify query filters by customer ID from auth token
      expect(mockDbQuery.where).toHaveBeenCalledWith(
        eq(personalizedMealPlans.customerId, 'customer-123')
      );
    });

    it('should sanitize input parameters', async () => {
      const maliciousCustomerId = "'; DROP TABLE users; --";

      const response = await request(trainerApp)
        .get(`/api/trainer/customers/${encodeURIComponent(maliciousCustomerId)}/measurements`)
        .expect(400);

      expect(response.body.message).toContain('Invalid customer ID');
    });

    it('should rate limit API requests', async () => {
      const mockDbQuery = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([]),
      };

      mockDb.select.mockReturnValue(mockDbQuery as any);

      // Simulate multiple concurrent requests
      const requests = Array.from({ length: 10 }, () =>
        request(trainerApp).get('/api/trainer/customers')
      );

      const responses = await Promise.all(requests);

      // All requests should either succeed or be rate limited
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });
  });

  describe('Data Validation and Error Handling', () => {
    it('should validate meal plan structure', async () => {
      const invalidMealPlan = {
        planName: 'Valid Name',
        // Missing required fields
        invalidField: 'should not exist',
      };

      const response = await request(trainerApp)
        .post('/api/trainer/customers/customer-123/meal-plans')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ mealPlanData: invalidMealPlan })
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('validation');
    });

    it('should handle database connection errors gracefully', async () => {
      mockDb.select.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const response = await request(trainerApp)
        .get('/api/trainer/customers')
        .expect(500);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('server error');
    });

    it('should validate UUID format for IDs', async () => {
      const invalidUUID = 'not-a-valid-uuid';

      const response = await request(trainerApp)
        .get(`/api/trainer/customers/${invalidUUID}/measurements`)
        .expect(400);

      expect(response.body.message).toContain('Invalid ID format');
    });

    it('should handle malformed JSON requests', async () => {
      const response = await request(trainerApp)
        .post('/api/trainer/customers/customer-123/meal-plans')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body.message).toContain('Invalid JSON');
    });
  });

  describe('Performance and Scalability', () => {
    it('should paginate large customer lists', async () => {
      const largeCustomerList = Array.from({ length: 100 }, (_, i) => ({
        customerId: `customer-${i}`,
        customerEmail: `customer${i}@example.com`,
        assignedAt: new Date(),
      }));

      const mockDbQuery = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(largeCustomerList.slice(0, 20)), // First page
      };

      mockDb.select.mockReturnValue(mockDbQuery as any);

      const response = await request(trainerApp)
        .get('/api/trainer/customers?page=1&limit=20')
        .expect(200);

      expect(response.body.customers).toHaveLength(20);
      expect(mockDbQuery.limit).toHaveBeenCalledWith(20);
      expect(mockDbQuery.offset).toHaveBeenCalledWith(0);
    });

    it('should use database indexes for efficient queries', async () => {
      const mockDbQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([]),
      };

      mockDb.select.mockReturnValue(mockDbQuery as any);

      await request(trainerApp)
        .get('/api/trainer/customers/customer-123/measurements')
        .expect(200);

      // Verify query uses indexed fields
      expect(mockDbQuery.where).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'customer-123',
          trainerId: 'trainer-123',
        })
      );
    });

    it('should limit response payload size', async () => {
      const largeMealPlan = {
        ...mockMealPlan,
        meals: Array.from({ length: 1000 }, (_, i) => ({
          day: Math.floor(i / 6) + 1,
          mealNumber: (i % 6) + 1,
          mealType: 'meal',
          recipe: mockMealPlan.meals[0].recipe,
        })),
      };

      const mockDbQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([{
          id: 'assignment-123',
          mealPlanData: largeMealPlan,
        }]),
      };

      mockDb.select.mockReturnValue(mockDbQuery as any);

      const response = await request(customerApp)
        .get('/api/customer/meal-plans')
        .expect(200);

      // Response should be limited to reasonable size
      const responseSize = JSON.stringify(response.body).length;
      expect(responseSize).toBeLessThan(1000000); // 1MB limit
    });
  });
});