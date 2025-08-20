import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { progressTracker } from '../../../server/services/progressTracker';

// Mock authentication middleware
const mockRequireAdmin = vi.fn((req, res, next) => {
  req.user = { id: '1', role: 'admin', email: 'admin@test.com' };
  next();
});

const mockRequireAuth = vi.fn((req, res, next) => {
  req.user = { id: '1', role: 'admin', email: 'admin@test.com' };
  next();
});

// Mock middleware
vi.mock('../../../server/middleware/auth', () => ({
  requireAdmin: mockRequireAdmin,
  requireAuth: mockRequireAuth,
  requireTrainerOrAdmin: mockRequireAuth,
}));

// Mock storage
vi.mock('../../../server/storage', () => ({
  storage: {
    getAdminStats: vi.fn().mockResolvedValue({
      totalRecipes: 100,
      approvedRecipes: 80,
      pendingRecipes: 20,
      totalUsers: 50,
    }),
  },
}));

// Mock recipe generator
vi.mock('../../../server/services/recipeGenerator', () => ({
  recipeGenerator: {
    generateRecipes: vi.fn(),
  },
}));

// Mock database
vi.mock('../../../server/db', () => ({
  db: {
    query: vi.fn().mockResolvedValue({ rows: [] }),
  },
}));

describe('Admin Progress Routes', () => {
  let app: express.Application;
  let mockProgressTracker: any;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Create a mock progress tracker for isolation
    mockProgressTracker = {
      createJob: vi.fn(),
      getProgress: vi.fn(),
      getAllJobs: vi.fn(),
      updateProgress: vi.fn(),
      recordSuccess: vi.fn(),
      recordFailure: vi.fn(),
    };

    // Mock the imported progress tracker methods
    (progressTracker.createJob as any) = mockProgressTracker.createJob;
    (progressTracker.getProgress as any) = mockProgressTracker.getProgress;
    (progressTracker.getAllJobs as any) = mockProgressTracker.getAllJobs;

    // Import and setup routes after mocks are established
    const adminRoutes = require('../../../server/routes/adminRoutes').default;
    app.use('/api/admin', adminRoutes);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/admin/generate', () => {
    it('should create progress tracking job and return job ID', async () => {
      const testJobId = 'job_123456789_abc123def';
      mockProgressTracker.createJob.mockReturnValue(testJobId);

      const response = await request(app)
        .post('/api/admin/generate')
        .send({
          count: 10,
          mealTypes: ['lunch', 'dinner'],
          dietaryRestrictions: ['vegetarian'],
          fitnessGoal: 'muscle_gain',
          naturalLanguagePrompt: 'High protein meals for bodybuilding',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Recipe generation started',
        jobId: testJobId,
        totalRecipes: 10,
      });

      expect(mockProgressTracker.createJob).toHaveBeenCalledWith({
        totalRecipes: 10,
        metadata: {
          naturalLanguagePrompt: 'High protein meals for bodybuilding',
          fitnessGoal: 'muscle_gain',
          mealTypes: ['lunch', 'dinner'],
          dietaryRestrictions: ['vegetarian'],
        },
      });
    });

    it('should validate count parameter', async () => {
      const response = await request(app)
        .post('/api/admin/generate')
        .send({
          mealTypes: ['lunch'],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Count is required');
    });

    it('should validate count range', async () => {
      const response = await request(app)
        .post('/api/admin/generate')
        .send({
          count: 600, // Above max limit
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('must be between 1 and 500');
    });

    it('should handle minimum count', async () => {
      const testJobId = 'job_minimal';
      mockProgressTracker.createJob.mockReturnValue(testJobId);

      const response = await request(app)
        .post('/api/admin/generate')
        .send({
          count: 1,
        });

      expect(response.status).toBe(200);
      expect(mockProgressTracker.createJob).toHaveBeenCalledWith({
        totalRecipes: 1,
        metadata: {
          naturalLanguagePrompt: undefined,
          fitnessGoal: undefined,
          mealTypes: undefined,
          dietaryRestrictions: undefined,
        },
      });
    });

    it('should handle maximum count', async () => {
      const testJobId = 'job_maximum';
      mockProgressTracker.createJob.mockReturnValue(testJobId);

      const response = await request(app)
        .post('/api/admin/generate')
        .send({
          count: 500,
        });

      expect(response.status).toBe(200);
      expect(mockProgressTracker.createJob).toHaveBeenCalledWith({
        totalRecipes: 500,
        metadata: expect.any(Object),
      });
    });

    it('should require admin authentication', async () => {
      expect(mockRequireAdmin).toHaveBeenCalled();
    });

    it('should handle optional parameters', async () => {
      const testJobId = 'job_optional_params';
      mockProgressTracker.createJob.mockReturnValue(testJobId);

      const response = await request(app)
        .post('/api/admin/generate')
        .send({
          count: 5,
          targetCalories: 2000,
          mainIngredient: 'chicken',
          maxPrepTime: 30,
          minProtein: 25,
          maxProtein: 40,
          minCarbs: 20,
          maxCarbs: 50,
          minFat: 10,
          maxFat: 25,
        });

      expect(response.status).toBe(200);
      expect(mockProgressTracker.createJob).toHaveBeenCalledWith({
        totalRecipes: 5,
        metadata: expect.any(Object),
      });
    });
  });

  describe('GET /api/admin/generation-progress/:jobId', () => {
    it('should return progress for valid job ID', async () => {
      const testJobId = 'job_123456789_abc123def';
      const mockProgress = {
        jobId: testJobId,
        totalRecipes: 10,
        completed: 3,
        failed: 1,
        currentStep: 'generating',
        percentage: 40,
        startTime: Date.now() - 30000,
        estimatedCompletion: Date.now() + 60000,
        errors: ['Minor validation error'],
        currentRecipeName: 'Chicken Salad',
        stepProgress: {
          stepIndex: 1,
          stepName: 'AI Generation',
          itemsProcessed: 2,
          totalItems: 5,
        },
      };

      mockProgressTracker.getProgress.mockReturnValue(mockProgress);

      const response = await request(app)
        .get(`/api/admin/generation-progress/${testJobId}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockProgress);
      expect(mockProgressTracker.getProgress).toHaveBeenCalledWith(testJobId);
    });

    it('should return 404 for non-existent job ID', async () => {
      const testJobId = 'non-existent-job';
      mockProgressTracker.getProgress.mockReturnValue(undefined);

      const response = await request(app)
        .get(`/api/admin/generation-progress/${testJobId}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Job not found');
    });

    it('should handle empty job ID', async () => {
      const response = await request(app)
        .get('/api/admin/generation-progress/');

      expect(response.status).toBe(404);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/admin/generation-progress/test-job');

      expect(mockRequireAuth).toHaveBeenCalled();
    });

    it('should return progress for completed job', async () => {
      const testJobId = 'completed-job';
      const mockProgress = {
        jobId: testJobId,
        totalRecipes: 5,
        completed: 5,
        failed: 0,
        currentStep: 'complete',
        percentage: 100,
        startTime: Date.now() - 120000,
        errors: [],
      };

      mockProgressTracker.getProgress.mockReturnValue(mockProgress);

      const response = await request(app)
        .get(`/api/admin/generation-progress/${testJobId}`);

      expect(response.status).toBe(200);
      expect(response.body.currentStep).toBe('complete');
      expect(response.body.percentage).toBe(100);
    });

    it('should return progress for failed job', async () => {
      const testJobId = 'failed-job';
      const mockProgress = {
        jobId: testJobId,
        totalRecipes: 10,
        completed: 2,
        failed: 8,
        currentStep: 'failed',
        percentage: 100,
        startTime: Date.now() - 60000,
        errors: ['OpenAI API error', 'Database connection failed'],
      };

      mockProgressTracker.getProgress.mockReturnValue(mockProgress);

      const response = await request(app)
        .get(`/api/admin/generation-progress/${testJobId}`);

      expect(response.status).toBe(200);
      expect(response.body.currentStep).toBe('failed');
      expect(response.body.errors).toHaveLength(2);
    });
  });

  describe('GET /api/admin/generation-jobs', () => {
    it('should return list of all active jobs', async () => {
      const mockJobs = [
        {
          jobId: 'job_1',
          totalRecipes: 10,
          completed: 5,
          failed: 0,
          currentStep: 'generating',
          percentage: 50,
          startTime: Date.now() - 60000,
          errors: [],
        },
        {
          jobId: 'job_2',
          totalRecipes: 5,
          completed: 5,
          failed: 0,
          currentStep: 'complete',
          percentage: 100,
          startTime: Date.now() - 120000,
          errors: [],
        },
        {
          jobId: 'job_3',
          totalRecipes: 8,
          completed: 2,
          failed: 3,
          currentStep: 'failed',
          percentage: 62.5,
          startTime: Date.now() - 90000,
          errors: ['Multiple generation failures'],
        },
      ];

      mockProgressTracker.getAllJobs.mockReturnValue(mockJobs);

      const response = await request(app)
        .get('/api/admin/generation-jobs');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        jobs: mockJobs,
        total: 3,
      });
      expect(mockProgressTracker.getAllJobs).toHaveBeenCalled();
    });

    it('should return empty list when no jobs exist', async () => {
      mockProgressTracker.getAllJobs.mockReturnValue([]);

      const response = await request(app)
        .get('/api/admin/generation-jobs');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        jobs: [],
        total: 0,
      });
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/admin/generation-jobs');

      expect(mockRequireAuth).toHaveBeenCalled();
    });

    it('should handle large number of jobs', async () => {
      const mockJobs = Array.from({ length: 100 }, (_, i) => ({
        jobId: `job_${i}`,
        totalRecipes: 10,
        completed: i % 11,
        failed: 0,
        currentStep: i % 11 === 10 ? 'complete' : 'generating',
        percentage: (i % 11) * 10,
        startTime: Date.now() - (i * 1000),
        errors: [],
      }));

      mockProgressTracker.getAllJobs.mockReturnValue(mockJobs);

      const response = await request(app)
        .get('/api/admin/generation-jobs');

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(100);
      expect(response.body.jobs).toHaveLength(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle tracker errors gracefully', async () => {
      mockProgressTracker.createJob.mockImplementation(() => {
        throw new Error('Progress tracker failed');
      });

      const response = await request(app)
        .post('/api/admin/generate')
        .send({ count: 10 });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message');
    });

    it('should handle getProgress errors', async () => {
      mockProgressTracker.getProgress.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const response = await request(app)
        .get('/api/admin/generation-progress/test-job');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message');
    });

    it('should handle getAllJobs errors', async () => {
      mockProgressTracker.getAllJobs.mockImplementation(() => {
        throw new Error('Memory access error');
      });

      const response = await request(app)
        .get('/api/admin/generation-jobs');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message');
    });

    it('should handle malformed request bodies', async () => {
      const response = await request(app)
        .post('/api/admin/generate')
        .send({
          count: 'not-a-number',
        });

      expect(response.status).toBe(400);
    });

    it('should handle missing content-type header', async () => {
      const response = await request(app)
        .post('/api/admin/generate')
        .set('Content-Type', 'text/plain')
        .send('invalid json');

      expect(response.status).toBe(400);
    });
  });

  describe('Authentication Edge Cases', () => {
    beforeEach(() => {
      // Reset auth mocks for these tests
      vi.clearAllMocks();
    });

    it('should reject non-admin users for generation endpoint', async () => {
      mockRequireAdmin.mockImplementation((req, res) => {
        res.status(403).json({ message: 'Admin access required' });
      });

      const response = await request(app)
        .post('/api/admin/generate')
        .send({ count: 10 });

      expect(response.status).toBe(403);
    });

    it('should reject unauthenticated users for progress endpoints', async () => {
      mockRequireAuth.mockImplementation((req, res) => {
        res.status(401).json({ message: 'Authentication required' });
      });

      const response = await request(app)
        .get('/api/admin/generation-progress/test-job');

      expect(response.status).toBe(401);
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent progress requests', async () => {
      const testJobId = 'concurrent-job';
      const mockProgress = {
        jobId: testJobId,
        totalRecipes: 100,
        completed: 50,
        failed: 0,
        currentStep: 'generating',
        percentage: 50,
        startTime: Date.now() - 60000,
        errors: [],
      };

      mockProgressTracker.getProgress.mockReturnValue(mockProgress);

      // Make 10 concurrent requests
      const promises = Array.from({ length: 10 }, () =>
        request(app).get(`/api/admin/generation-progress/${testJobId}`)
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.jobId).toBe(testJobId);
      });

      expect(mockProgressTracker.getProgress).toHaveBeenCalledTimes(10);
    });

    it('should handle large job lists efficiently', async () => {
      const largeJobList = Array.from({ length: 1000 }, (_, i) => ({
        jobId: `job_${i}`,
        totalRecipes: 10,
        completed: 5,
        failed: 0,
        currentStep: 'generating',
        percentage: 50,
        startTime: Date.now() - 60000,
        errors: [],
      }));

      mockProgressTracker.getAllJobs.mockReturnValue(largeJobList);

      const startTime = Date.now();
      const response = await request(app)
        .get('/api/admin/generation-jobs');
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});