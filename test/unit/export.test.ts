/**
 * Unit Tests for Admin Export Routes
 *
 * Tests the export functionality for meal plans including NDJSON streaming,
 * pagination, filtering, and proper admin authentication.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { exportRouter } from '../../server/routes/export';
import { requireAuth, requireRole } from '../../server/middleware/auth';
import { db } from '../../server/db';

// Mock the middleware
vi.mock('../../server/middleware/auth', () => ({
  requireAuth: vi.fn((req, res, next) => {
    req.user = { id: 'admin-user-id', role: 'admin' };
    next();
  }),
  requireRole: vi.fn(() => (req, res, next) => next()),
}));

// Mock the database
vi.mock('../../server/db', () => {
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
  };
  return { db: mockDb };
});

// Mock the schema
vi.mock('../../shared/schema', () => ({
  trainerMealPlans: {
    id: 'id',
    trainerId: 'trainer_id',
    createdAt: 'created_at',
    mealPlanData: 'meal_plan_data',
    isTemplate: 'is_template',
  },
  users: {
    id: 'id',
    email: 'email',
  },
}));

// Mock validation schemas
vi.mock('../../server/validation/schemas', () => ({
  adminExportMealPlansSchema: {
    parse: vi.fn((data) => ({
      page: 1,
      limit: 100,
      trainerId: undefined,
      from: undefined,
      to: undefined,
      includeTemplates: true,
      ...data,
    })),
  },
}));

describe('Admin Export Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/export', requireAuth, requireRole('admin'), exportRouter);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/export/meal-plans', () => {
    it('should export meal plans in JSON format by default', async () => {
      const mockPlans = [
        {
          id: 'plan-1',
          planName: 'Test Plan 1',
          fitnessGoal: 'weight_loss',
          days: 7,
          mealsPerDay: 3,
          generatedBy: 'trainer-1',
          createdAt: new Date('2024-01-01'),
          trainerId: 'trainer-1',
          source: 'ai',
          meals: [
            {
              day: 1,
              mealNumber: 1,
              mealType: 'breakfast',
              recipe: { id: 'recipe-1' },
              manual: false,
            },
          ],
        },
      ];

      const mockTotalCount = [{ count: 1 }];

      (db.select as any).mockResolvedValueOnce(mockPlans);
      (db.select as any).mockResolvedValueOnce(mockTotalCount);

      const response = await request(app)
        .get('/api/export/meal-plans')
        .expect(200);

      expect(response.body).toMatchObject({
        items: [
          {
            id: 'plan-1',
            planName: 'Test Plan 1',
            fitnessGoal: 'weight_loss',
            days: 7,
            mealsPerDay: 3,
            generatedBy: 'trainer-1',
            trainerId: 'trainer-1',
            source: 'ai',
            meals: [
              {
                day: 1,
                mealNumber: 1,
                mealType: 'breakfast',
                recipeId: 'recipe-1',
                manual: false,
              },
            ],
          },
        ],
        page: 1,
        pageSize: 100,
        total: 1,
        totalPages: 1,
        hasMore: false,
      });

      expect(response.headers.etag).toBeDefined();
      expect(response.headers['last-modified']).toBeDefined();
    });

    it('should handle pagination parameters correctly', async () => {
      (db.select as any).mockResolvedValue([]);

      await request(app)
        .get('/api/export/meal-plans')
        .query({ page: 2, limit: 50 })
        .expect(200);

      expect(mockDb.limit).toHaveBeenCalledWith(50);
      expect(mockDb.offset).toHaveBeenCalledWith(50); // (page - 1) * limit
    });

    it('should apply filters correctly', async () => {
      (db.select as any).mockResolvedValue([]);

      await request(app)
        .get('/api/export/meal-plans')
        .query({
          trainerId: 'trainer-123',
          from: '2024-01-01T00:00:00Z',
          to: '2024-12-31T23:59:59Z',
          includeTemplates: 'false',
        })
        .expect(200);

      // Should have called where() to apply filters
      expect(mockDb.where).toHaveBeenCalled();
    });

    it('should stream NDJSON when requested', async () => {
      const mockPlans = [
        {
          id: 'plan-1',
          planName: 'Test Plan 1',
          fitnessGoal: 'weight_loss',
          days: 7,
          mealsPerDay: 3,
          generatedBy: 'trainer-1',
          createdAt: new Date('2024-01-01'),
          trainerId: 'trainer-1',
          source: 'ai',
          meals: [],
        },
        {
          id: 'plan-2',
          planName: 'Test Plan 2',
          fitnessGoal: 'muscle_gain',
          days: 5,
          mealsPerDay: 4,
          generatedBy: 'trainer-2',
          createdAt: new Date('2024-01-02'),
          trainerId: 'trainer-2',
          source: 'manual',
          meals: [],
        },
      ];

      // Mock the streaming behavior - return data then empty array
      (db.select as any)
        .mockResolvedValueOnce(mockPlans)
        .mockResolvedValueOnce([]); // End of stream

      const response = await request(app)
        .get('/api/export/meal-plans')
        .set('Accept', 'application/x-ndjson')
        .expect(200);

      expect(response.headers['content-type']).toBe('application/x-ndjson');
      expect(response.headers['transfer-encoding']).toBe('chunked');

      // Check that the response contains NDJSON format
      const lines = response.text.trim().split('\n');
      expect(lines).toHaveLength(2);

      const plan1 = JSON.parse(lines[0]);
      const plan2 = JSON.parse(lines[1]);

      expect(plan1.id).toBe('plan-1');
      expect(plan1.planName).toBe('Test Plan 1');
      expect(plan1.source).toBe('ai');

      expect(plan2.id).toBe('plan-2');
      expect(plan2.planName).toBe('Test Plan 2');
      expect(plan2.source).toBe('manual');
    });

    it('should handle format=ndjson query parameter', async () => {
      const mockPlans = [
        {
          id: 'plan-1',
          planName: 'Test Plan 1',
          fitnessGoal: 'weight_loss',
          days: 7,
          mealsPerDay: 3,
          generatedBy: 'trainer-1',
          createdAt: new Date('2024-01-01'),
          trainerId: 'trainer-1',
          source: 'ai',
          meals: [],
        },
      ];

      (db.select as any)
        .mockResolvedValueOnce(mockPlans)
        .mockResolvedValueOnce([]); // End of stream

      const response = await request(app)
        .get('/api/export/meal-plans')
        .query({ format: 'ndjson' })
        .expect(200);

      expect(response.headers['content-type']).toBe('application/x-ndjson');
    });

    it('should enforce rate limiting', async () => {
      // Make multiple requests rapidly
      const promises = Array.from({ length: 12 }, () =>
        request(app).get('/api/export/meal-plans')
      );

      const responses = await Promise.all(promises);

      // Some requests should be rate limited (429 status)
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      const successfulResponses = responses.filter(r => r.status === 200);
      expect(successfulResponses.length).toBeLessThanOrEqual(10); // Rate limit is 10/min
    });

    it('should handle validation errors', async () => {
      const { adminExportMealPlansSchema } = await import('../../server/validation/schemas');
      (adminExportMealPlansSchema.parse as any).mockImplementation(() => {
        throw new Error('validation failed');
      });

      const response = await request(app)
        .get('/api/export/meal-plans')
        .query({ page: 'invalid' })
        .expect(400);

      expect(response.body.error).toBe('Invalid query parameters');
    });

    it('should handle database errors gracefully', async () => {
      (db.select as any).mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/export/meal-plans')
        .expect(500);

      expect(response.body.error).toBe('Export failed');
      expect(response.body.details).toBe('Database connection failed');
    });

    it('should generate proper ETag for caching', async () => {
      (db.select as any).mockResolvedValue([]);

      const response1 = await request(app)
        .get('/api/export/meal-plans')
        .query({ page: 1, limit: 50 })
        .expect(200);

      const response2 = await request(app)
        .get('/api/export/meal-plans')
        .query({ page: 1, limit: 50 })
        .expect(200);

      // Same query should generate same ETag
      expect(response1.headers.etag).toBe(response2.headers.etag);

      const response3 = await request(app)
        .get('/api/export/meal-plans')
        .query({ page: 2, limit: 50 })
        .expect(200);

      // Different query should generate different ETag
      expect(response1.headers.etag).not.toBe(response3.headers.etag);
    });

    it('should include proper metadata in response', async () => {
      (db.select as any).mockResolvedValueOnce([]);
      (db.select as any).mockResolvedValueOnce([{ count: 0 }]);

      const response = await request(app)
        .get('/api/export/meal-plans')
        .query({ trainerId: 'trainer-123', includeTemplates: 'false' })
        .expect(200);

      expect(response.body.exportedAt).toBeDefined();
      expect(response.body.filters).toMatchObject({
        trainerId: 'trainer-123',
        includeTemplates: false,
      });
    });

    it('should handle large datasets with streaming', async () => {
      // Simulate large dataset with multiple batches
      const largeBatch = Array.from({ length: 100 }, (_, i) => ({
        id: `plan-${i}`,
        planName: `Plan ${i}`,
        fitnessGoal: 'weight_loss',
        days: 7,
        mealsPerDay: 3,
        generatedBy: 'trainer-1',
        createdAt: new Date('2024-01-01'),
        trainerId: 'trainer-1',
        source: 'ai',
        meals: [],
      }));

      const smallBatch = Array.from({ length: 50 }, (_, i) => ({
        id: `plan-${i + 100}`,
        planName: `Plan ${i + 100}`,
        fitnessGoal: 'muscle_gain',
        days: 5,
        mealsPerDay: 4,
        generatedBy: 'trainer-2',
        createdAt: new Date('2024-01-02'),
        trainerId: 'trainer-2',
        source: 'manual',
        meals: [],
      }));

      (db.select as any)
        .mockResolvedValueOnce(largeBatch) // First batch (full)
        .mockResolvedValueOnce(smallBatch) // Second batch (partial)
        .mockResolvedValueOnce([]); // End of stream

      const response = await request(app)
        .get('/api/export/meal-plans')
        .set('Accept', 'application/x-ndjson')
        .expect(200);

      const lines = response.text.trim().split('\n');
      expect(lines).toHaveLength(150); // 100 + 50 records

      // Verify first and last records
      const firstRecord = JSON.parse(lines[0]);
      const lastRecord = JSON.parse(lines[149]);

      expect(firstRecord.id).toBe('plan-0');
      expect(lastRecord.id).toBe('plan-149');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require admin role', async () => {
      // Mock middleware to simulate non-admin user
      (requireRole as any).mockImplementationOnce(() => (req, res, next) => {
        res.status(403).json({ error: 'Forbidden' });
      });

      await request(app)
        .get('/api/export/meal-plans')
        .expect(403);
    });

    it('should require authentication', async () => {
      // Mock middleware to simulate unauthenticated user
      (requireAuth as any).mockImplementationOnce((req, res, next) => {
        res.status(401).json({ error: 'Unauthorized' });
      });

      await request(app)
        .get('/api/export/meal-plans')
        .expect(401);
    });
  });
});