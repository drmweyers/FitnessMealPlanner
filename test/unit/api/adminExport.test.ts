import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import adminRouter from '../../../server/routes/adminRoutes';
import { requireAdmin } from '../../../server/middleware/auth';

// Mock the storage module - fix hoisting issue
vi.mock('../../../server/storage', () => ({
  storage: {
    searchRecipes: vi.fn(),
  },
}));

// Mock the database - fix hoisting issue  
vi.mock('../../../server/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        groupBy: vi.fn(() => []),
      })),
    })),
  },
}));

// Mock the schema
vi.mock('@shared/schema', () => ({
  users: { 
    id: 'id', 
    email: 'email', 
    username: 'username', 
    role: 'role',
    firstName: 'firstName',
    lastName: 'lastName',
    phoneNumber: 'phoneNumber',
    profileImageUrl: 'profileImageUrl',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  },
  personalizedMealPlans: 'personalizedMealPlans',
}));

// Mock drizzle ORM
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  sql: vi.fn(),
}));

// Mock auth middleware
vi.mock('../../../server/middleware/auth', () => ({
  requireAdmin: vi.fn((req, res, next) => {
    // Mock admin user
    req.user = { id: 'admin-id', role: 'admin', email: 'admin@test.com' };
    next();
  }),
  requireTrainerOrAdmin: vi.fn((req, res, next) => {
    // Mock trainer/admin user
    req.user = { id: 'trainer-id', role: 'trainer', email: 'trainer@test.com' };
    next();
  }),
  requireAuth: vi.fn((req, res, next) => {
    // Mock authenticated user
    req.user = { id: 'user-id', role: 'customer', email: 'user@test.com' };
    next();
  }),
}));

describe('Admin Export API', () => {
  let app: express.Application;
  let mockStorage: any;
  let mockDb: any;
  
  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/admin', adminRouter);
    
    // Get the mocked modules
    const { storage } = await import('../../../server/storage');
    const { db } = await import('../../../server/db');
    mockStorage = storage;
    mockDb = db;
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/admin/export', () => {
    it('should export recipes successfully', async () => {
      const mockRecipes = [
        { id: '1', name: 'Test Recipe', caloriesKcal: 200 },
        { id: '2', name: 'Another Recipe', caloriesKcal: 300 },
      ];

      mockStorage.searchRecipes.mockResolvedValue({
        recipes: mockRecipes,
        total: mockRecipes.length,
      });

      const response = await request(app)
        .get('/api/admin/export?type=recipes')
        .expect(200);

      expect(response.body).toMatchObject({
        recipes: mockRecipes,
        recipesCount: 2,
        exportDate: expect.any(String),
        exportType: 'recipes',
        version: '1.0',
      });

      expect(mockStorage.searchRecipes).toHaveBeenCalledWith({
        page: 1,
        limit: 100000,
      });
    });

    it('should export users successfully', async () => {
      const mockUsers = [
        { id: '1', email: 'user1@test.com', role: 'customer' },
        { id: '2', email: 'user2@test.com', role: 'trainer' },
      ];

      // Mock the database query chain
      vi.mocked(mockDb.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce(mockUsers)
      });

      const response = await request(app)
        .get('/api/admin/export?type=users')
        .expect(200);

      expect(response.body).toMatchObject({
        users: mockUsers,
        usersCount: 2,
        exportDate: expect.any(String),
        exportType: 'users',
        version: '1.0',
      });
    });

    it('should export meal plans successfully', async () => {
      const mockMealPlans = [
        { id: '1', planName: 'Test Plan', fitnessGoal: 'weight_loss' },
        { id: '2', planName: 'Another Plan', fitnessGoal: 'muscle_gain' },
      ];

      // Mock the database query chain
      vi.mocked(mockDb.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          groupBy: vi.fn().mockReturnValueOnce(mockMealPlans)
        })
      });

      const response = await request(app)
        .get('/api/admin/export?type=mealPlans')
        .expect(200);

      expect(response.body).toMatchObject({
        mealPlans: mockMealPlans,
        mealPlansCount: 2,
        exportDate: expect.any(String),
        exportType: 'mealPlans',
        version: '1.0',
      });
    });

    it('should export all data successfully', async () => {
      const mockRecipes = [{ id: '1', name: 'Test Recipe' }];
      const mockUsers = [{ id: '1', email: 'user@test.com' }];
      const mockMealPlans = [{ id: '1', planName: 'Test Plan' }];

      mockStorage.searchRecipes.mockResolvedValue({
        recipes: mockRecipes,
        total: mockRecipes.length,
      });

      // Mock multiple db.select calls for users and meal plans
      vi.mocked(mockDb.select)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce(mockUsers)
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce({
            groupBy: vi.fn().mockReturnValueOnce(mockMealPlans)
          })
        });

      const response = await request(app)
        .get('/api/admin/export?type=all')
        .expect(200);

      expect(response.body).toMatchObject({
        recipes: mockRecipes,
        recipesCount: 1,
        users: mockUsers,
        usersCount: 1,
        mealPlans: mockMealPlans,
        mealPlansCount: 1,
        exportDate: expect.any(String),
        exportType: 'all',
        version: '1.0',
      });
    });

    it('should return 400 for invalid export type', async () => {
      const response = await request(app)
        .get('/api/admin/export?type=invalid')
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Invalid export type. Must be: recipes, users, mealPlans, or all',
      });
    });

    it('should return 400 for missing export type', async () => {
      const response = await request(app)
        .get('/api/admin/export')
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Invalid export type. Must be: recipes, users, mealPlans, or all',
      });
    });

    it('should handle storage errors gracefully', async () => {
      mockStorage.searchRecipes.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/admin/export?type=recipes')
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Failed to export data',
        message: 'Database error',
      });
    });

    it('should handle database connection errors', async () => {
      vi.mocked(mockDb.select).mockImplementation(() => {
        throw new Error('Connection failed');
      });

      const response = await request(app)
        .get('/api/admin/export?type=users')
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Failed to export data',
        message: 'Connection failed',
      });
    });

    it('should include proper metadata in export', async () => {
      mockStorage.searchRecipes.mockResolvedValue({
        recipes: [],
        total: 0,
      });

      const response = await request(app)
        .get('/api/admin/export?type=recipes')
        .expect(200);

      const exportDate = new Date(response.body.exportDate);
      const now = new Date();
      const timeDiff = Math.abs(now.getTime() - exportDate.getTime());

      // Export date should be within last 5 seconds
      expect(timeDiff).toBeLessThan(5000);
      expect(response.body.exportType).toBe('recipes');
      expect(response.body.version).toBe('1.0');
    });

    it('should handle empty datasets gracefully', async () => {
      mockStorage.searchRecipes.mockResolvedValue({
        recipes: [],
        total: 0,
      });

      const response = await request(app)
        .get('/api/admin/export?type=recipes')
        .expect(200);

      expect(response.body).toMatchObject({
        recipes: [],
        recipesCount: 0,
        exportDate: expect.any(String),
        exportType: 'recipes',
        version: '1.0',
      });
    });

    it('should handle large datasets efficiently', async () => {
      const largeRecipeSet = Array.from({ length: 10000 }, (_, i) => ({
        id: `recipe-${i}`,
        name: `Recipe ${i}`,
        caloriesKcal: 200 + i,
      }));

      mockStorage.searchRecipes.mockResolvedValue({
        recipes: largeRecipeSet,
        total: largeRecipeSet.length,
      });

      const startTime = Date.now();
      const response = await request(app)
        .get('/api/admin/export?type=recipes')
        .expect(200);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body.recipesCount).toBe(10000);
      // Should handle large datasets in reasonable time (< 5 seconds)
      expect(responseTime).toBeLessThan(5000);
    });
  });

  describe('Authentication', () => {
    it('should require admin authentication', async () => {
      // Mock auth middleware to reject
      vi.mocked(requireAdmin).mockImplementationOnce((req, res, next) => {
        res.status(403).json({ error: 'Admin access required' });
      });

      await request(app)
        .get('/api/admin/export?type=recipes')
        .expect(403);
    });

    it('should accept valid admin authentication', async () => {
      mockStorage.searchRecipes.mockResolvedValue({
        recipes: [],
        total: 0,
      });

      // requireAdmin is already mocked to pass in beforeEach
      await request(app)
        .get('/api/admin/export?type=recipes')
        .expect(200);
    });
  });

  describe('Performance', () => {
    it('should use efficient database queries', async () => {
      mockStorage.searchRecipes.mockResolvedValue({
        recipes: [],
        total: 0,
      });

      await request(app)
        .get('/api/admin/export?type=recipes')
        .expect(200);

      // Should use high limit for single query instead of pagination
      expect(mockStorage.searchRecipes).toHaveBeenCalledWith({
        page: 1,
        limit: 100000,
      });
    });
  });
});