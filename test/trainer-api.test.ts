import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../server/index';
import { storage } from '../server/storage';
import jwt from 'jsonwebtoken';

// Mock storage
vi.mock('../server/storage', () => ({
  storage: {
    getTrainerMealPlans: vi.fn(),
    getTrainerMealPlan: vi.fn(),
    createTrainerMealPlan: vi.fn(),
    updateTrainerMealPlan: vi.fn(),
    deleteTrainerMealPlan: vi.fn(),
    assignMealPlanToCustomer: vi.fn(),
    getMealPlanAssignments: vi.fn(),
    removeMealPlanAssignment: vi.fn(),
    getTrainerCustomers: vi.fn(),
    getCustomerMealPlans: vi.fn(),
    getUser: vi.fn(),
  },
}));

// Mock JWT
vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
    sign: vi.fn(),
  },
}));

describe('Trainer Meal Plan API Endpoints', () => {
  const mockTrainer = {
    id: 'trainer-123',
    email: 'trainer@test.com',
    role: 'trainer',
    firstName: 'John',
    lastName: 'Trainer',
  };

  const mockCustomer = {
    id: 'customer-456',
    email: 'customer@test.com',
    role: 'customer',
    firstName: 'Jane',
    lastName: 'Customer',
  };

  const mockMealPlan = {
    planName: 'Test Meal Plan',
    days: 7,
    mealsPerDay: 3,
    dailyCalorieTarget: 2000,
    fitnessGoal: 'weight_loss',
    description: 'A test meal plan',
    clientName: 'Test Client',
    meals: [],
  };

  const mockSavedMealPlan = {
    id: 'plan-123',
    trainerId: 'trainer-123',
    mealPlanData: mockMealPlan,
    isTemplate: false,
    tags: ['weight-loss'],
    notes: 'Test notes',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockToken = 'valid-jwt-token';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock JWT verification
    vi.mocked(jwt.verify).mockReturnValue({
      userId: mockTrainer.id,
      email: mockTrainer.email,
      role: mockTrainer.role,
    } as any);

    // Mock user lookup
    vi.mocked(storage.getUser).mockResolvedValue(mockTrainer as any);
  });

  describe('GET /api/trainer/meal-plans', () => {
    it('should get all meal plans for authenticated trainer', async () => {
      const mockPlans = [mockSavedMealPlan];
      vi.mocked(storage.getTrainerMealPlans).mockResolvedValue(mockPlans as any);

      const response = await request(app)
        .get('/api/trainer/meal-plans')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body).toEqual({
        mealPlans: mockPlans,
        total: mockPlans.length,
      });
      expect(storage.getTrainerMealPlans).toHaveBeenCalledWith(mockTrainer.id);
    });

    it('should return 401 for unauthenticated requests', async () => {
      await request(app)
        .get('/api/trainer/meal-plans')
        .expect(401);
    });

    it('should return 403 for non-trainer users', async () => {
      vi.mocked(storage.getUser).mockResolvedValue({ ...mockTrainer, role: 'customer' } as any);

      await request(app)
        .get('/api/trainer/meal-plans')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(403);
    });

    it('should handle database errors', async () => {
      vi.mocked(storage.getTrainerMealPlans).mockRejectedValue(new Error('Database error'));

      await request(app)
        .get('/api/trainer/meal-plans')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(500);
    });
  });

  describe('GET /api/trainer/meal-plans/:id', () => {
    it('should get specific meal plan by ID', async () => {
      vi.mocked(storage.getTrainerMealPlan).mockResolvedValue(mockSavedMealPlan as any);

      const response = await request(app)
        .get(`/api/trainer/meal-plans/${mockSavedMealPlan.id}`)
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body).toEqual(mockSavedMealPlan);
      expect(storage.getTrainerMealPlan).toHaveBeenCalledWith(mockSavedMealPlan.id);
    });

    it('should return 404 for non-existent meal plan', async () => {
      vi.mocked(storage.getTrainerMealPlan).mockResolvedValue(null);

      await request(app)
        .get('/api/trainer/meal-plans/non-existent-id')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(404);
    });

    it('should return 403 if meal plan belongs to another trainer', async () => {
      const otherTrainerPlan = { ...mockSavedMealPlan, trainerId: 'other-trainer' };
      vi.mocked(storage.getTrainerMealPlan).mockResolvedValue(otherTrainerPlan as any);

      await request(app)
        .get(`/api/trainer/meal-plans/${mockSavedMealPlan.id}`)
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(403);
    });
  });

  describe('POST /api/trainer/meal-plans', () => {
    const newMealPlanData = {
      mealPlanData: mockMealPlan,
      isTemplate: false,
      tags: ['new-plan'],
      notes: 'New plan notes',
    };

    it('should create new meal plan', async () => {
      vi.mocked(storage.createTrainerMealPlan).mockResolvedValue(mockSavedMealPlan as any);

      const response = await request(app)
        .post('/api/trainer/meal-plans')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(newMealPlanData)
        .expect(201);

      expect(response.body).toEqual(mockSavedMealPlan);
      expect(storage.createTrainerMealPlan).toHaveBeenCalledWith({
        ...newMealPlanData,
        trainerId: mockTrainer.id,
      });
    });

    it('should validate required fields', async () => {
      await request(app)
        .post('/api/trainer/meal-plans')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({}) // Missing required fields
        .expect(400);
    });

    it('should handle creation errors', async () => {
      vi.mocked(storage.createTrainerMealPlan).mockRejectedValue(new Error('Creation failed'));

      await request(app)
        .post('/api/trainer/meal-plans')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(newMealPlanData)
        .expect(500);
    });
  });

  describe('PUT /api/trainer/meal-plans/:id', () => {
    const updateData = {
      notes: 'Updated notes',
      tags: ['updated'],
      isTemplate: true,
    };

    it('should update meal plan', async () => {
      const updatedPlan = { ...mockSavedMealPlan, ...updateData };
      vi.mocked(storage.getTrainerMealPlan).mockResolvedValue(mockSavedMealPlan as any);
      vi.mocked(storage.updateTrainerMealPlan).mockResolvedValue(updatedPlan as any);

      const response = await request(app)
        .put(`/api/trainer/meal-plans/${mockSavedMealPlan.id}`)
        .set('Authorization', `Bearer ${mockToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual(updatedPlan);
      expect(storage.updateTrainerMealPlan).toHaveBeenCalledWith(mockSavedMealPlan.id, updateData);
    });

    it('should return 404 for non-existent meal plan', async () => {
      vi.mocked(storage.getTrainerMealPlan).mockResolvedValue(null);

      await request(app)
        .put('/api/trainer/meal-plans/non-existent-id')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(updateData)
        .expect(404);
    });

    it('should return 403 if meal plan belongs to another trainer', async () => {
      const otherTrainerPlan = { ...mockSavedMealPlan, trainerId: 'other-trainer' };
      vi.mocked(storage.getTrainerMealPlan).mockResolvedValue(otherTrainerPlan as any);

      await request(app)
        .put(`/api/trainer/meal-plans/${mockSavedMealPlan.id}`)
        .set('Authorization', `Bearer ${mockToken}`)
        .send(updateData)
        .expect(403);
    });
  });

  describe('DELETE /api/trainer/meal-plans/:id', () => {
    it('should delete meal plan', async () => {
      vi.mocked(storage.getTrainerMealPlan).mockResolvedValue(mockSavedMealPlan as any);
      vi.mocked(storage.deleteTrainerMealPlan).mockResolvedValue(true);

      await request(app)
        .delete(`/api/trainer/meal-plans/${mockSavedMealPlan.id}`)
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(storage.deleteTrainerMealPlan).toHaveBeenCalledWith(mockSavedMealPlan.id);
    });

    it('should return 404 for non-existent meal plan', async () => {
      vi.mocked(storage.getTrainerMealPlan).mockResolvedValue(null);

      await request(app)
        .delete('/api/trainer/meal-plans/non-existent-id')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(404);
    });

    it('should return 403 if meal plan belongs to another trainer', async () => {
      const otherTrainerPlan = { ...mockSavedMealPlan, trainerId: 'other-trainer' };
      vi.mocked(storage.getTrainerMealPlan).mockResolvedValue(otherTrainerPlan as any);

      await request(app)
        .delete(`/api/trainer/meal-plans/${mockSavedMealPlan.id}`)
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(403);
    });

    it('should handle deletion failures', async () => {
      vi.mocked(storage.getTrainerMealPlan).mockResolvedValue(mockSavedMealPlan as any);
      vi.mocked(storage.deleteTrainerMealPlan).mockResolvedValue(false);

      await request(app)
        .delete(`/api/trainer/meal-plans/${mockSavedMealPlan.id}`)
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(500);
    });
  });

  describe('POST /api/trainer/meal-plans/:id/assign', () => {
    const assignmentData = {
      customerId: mockCustomer.id,
    };

    it('should assign meal plan to customer', async () => {
      const assignment = {
        id: 'assignment-123',
        mealPlanId: mockSavedMealPlan.id,
        customerId: mockCustomer.id,
        assignedAt: new Date(),
      };

      vi.mocked(storage.getTrainerMealPlan).mockResolvedValue(mockSavedMealPlan as any);
      vi.mocked(storage.assignMealPlanToCustomer).mockResolvedValue(assignment as any);

      const response = await request(app)
        .post(`/api/trainer/meal-plans/${mockSavedMealPlan.id}/assign`)
        .set('Authorization', `Bearer ${mockToken}`)
        .send(assignmentData)
        .expect(201);

      expect(response.body).toEqual(assignment);
      expect(storage.assignMealPlanToCustomer).toHaveBeenCalledWith(
        mockSavedMealPlan.id,
        mockCustomer.id,
        mockTrainer.id
      );
    });

    it('should validate customer ID', async () => {
      await request(app)
        .post(`/api/trainer/meal-plans/${mockSavedMealPlan.id}/assign`)
        .set('Authorization', `Bearer ${mockToken}`)
        .send({}) // Missing customerId
        .expect(400);
    });

    it('should return 404 for non-existent meal plan', async () => {
      vi.mocked(storage.getTrainerMealPlan).mockResolvedValue(null);

      await request(app)
        .post('/api/trainer/meal-plans/non-existent-id/assign')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(assignmentData)
        .expect(404);
    });
  });

  describe('GET /api/trainer/customers', () => {
    it('should get trainer customers', async () => {
      const customers = [
        {
          id: mockCustomer.id,
          email: mockCustomer.email,
          firstAssignedAt: '2024-01-15T10:00:00Z',
        },
      ];

      vi.mocked(storage.getTrainerCustomers).mockResolvedValue(customers as any);

      const response = await request(app)
        .get('/api/trainer/customers')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body).toEqual({ customers });
      expect(storage.getTrainerCustomers).toHaveBeenCalledWith(mockTrainer.id);
    });

    it('should handle empty customer list', async () => {
      vi.mocked(storage.getTrainerCustomers).mockResolvedValue([]);

      const response = await request(app)
        .get('/api/trainer/customers')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body).toEqual({ customers: [] });
    });
  });

  describe('GET /api/trainer/customers/:customerId/meal-plans', () => {
    it('should get customer meal plans', async () => {
      const customerMealPlans = [
        {
          id: 'customer-plan-1',
          mealPlanId: mockSavedMealPlan.id,
          assignedAt: '2024-01-15T10:00:00Z',
        },
      ];

      vi.mocked(storage.getCustomerMealPlans).mockResolvedValue(customerMealPlans as any);

      const response = await request(app)
        .get(`/api/trainer/customers/${mockCustomer.id}/meal-plans`)
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body).toEqual({ mealPlans: customerMealPlans });
      expect(storage.getCustomerMealPlans).toHaveBeenCalledWith(
        mockTrainer.id,
        mockCustomer.id
      );
    });
  });

  describe('DELETE /api/trainer/assignments/:assignmentId', () => {
    it('should remove meal plan assignment', async () => {
      vi.mocked(storage.removeMealPlanAssignment).mockResolvedValue(true);

      await request(app)
        .delete('/api/trainer/assignments/assignment-123')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(storage.removeMealPlanAssignment).toHaveBeenCalledWith(
        mockTrainer.id,
        'assignment-123'
      );
    });

    it('should return 404 for non-existent assignment', async () => {
      vi.mocked(storage.removeMealPlanAssignment).mockResolvedValue(false);

      await request(app)
        .delete('/api/trainer/assignments/non-existent-id')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(404);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should reject requests without Authorization header', async () => {
      await request(app)
        .get('/api/trainer/meal-plans')
        .expect(401);
    });

    it('should reject requests with invalid token', async () => {
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await request(app)
        .get('/api/trainer/meal-plans')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject requests from non-trainer users', async () => {
      vi.mocked(storage.getUser).mockResolvedValue({ ...mockTrainer, role: 'customer' } as any);

      await request(app)
        .get('/api/trainer/meal-plans')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(403);
    });

    it('should reject requests if user not found', async () => {
      vi.mocked(storage.getUser).mockResolvedValue(null);

      await request(app)
        .get('/api/trainer/meal-plans')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(401);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON requests', async () => {
      await request(app)
        .post('/api/trainer/meal-plans')
        .set('Authorization', `Bearer ${mockToken}`)
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });

    it('should handle database connection errors', async () => {
      vi.mocked(storage.getTrainerMealPlans).mockRejectedValue(new Error('Connection lost'));

      await request(app)
        .get('/api/trainer/meal-plans')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(500);
    });

    it('should handle unexpected errors gracefully', async () => {
      vi.mocked(storage.getTrainerMealPlans).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await request(app)
        .get('/api/trainer/meal-plans')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(500);
    });
  });

  describe('Input Validation', () => {
    it('should validate meal plan data structure', async () => {
      const invalidMealPlanData = {
        mealPlanData: {
          // Missing required fields
        },
        tags: ['test'],
      };

      await request(app)
        .post('/api/trainer/meal-plans')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(invalidMealPlanData)
        .expect(400);
    });

    it('should validate update data', async () => {
      vi.mocked(storage.getTrainerMealPlan).mockResolvedValue(mockSavedMealPlan as any);

      const invalidUpdateData = {
        tags: 'not-an-array', // Should be array
      };

      await request(app)
        .put(`/api/trainer/meal-plans/${mockSavedMealPlan.id}`)
        .set('Authorization', `Bearer ${mockToken}`)
        .send(invalidUpdateData)
        .expect(400);
    });

    it('should validate assignment data', async () => {
      vi.mocked(storage.getTrainerMealPlan).mockResolvedValue(mockSavedMealPlan as any);

      const invalidAssignmentData = {
        customerId: '', // Empty string
      };

      await request(app)
        .post(`/api/trainer/meal-plans/${mockSavedMealPlan.id}/assign`)
        .set('Authorization', `Bearer ${mockToken}`)
        .send(invalidAssignmentData)
        .expect(400);
    });
  });
});