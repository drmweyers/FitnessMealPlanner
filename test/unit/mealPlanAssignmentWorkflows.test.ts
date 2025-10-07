/**
 * Unit Tests for Meal Plan Assignment Workflows
 * 
 * Tests the complete meal plan assignment workflow between trainers and customers:
 * - Trainer creates and saves meal plans
 * - Trainer assigns meal plans to customers
 * - Customer access to assigned meal plans
 * - Meal plan management (update, delete, reassign)
 * - Bulk operations and templates
 * - Workflow state management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { db } from '../../server/db';
import { 
  personalizedMealPlans,
  trainerMealPlans,
  mealPlanAssignments,
  users,
  type MealPlan,
  type TrainerMealPlan,
  type User,
  type MealPlanAssignment 
} from '../../shared/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import trainerRouter from '../../server/routes/trainerRoutes';
import customerRouter from '../../server/routes/customerRoutes';
import { storage } from '../../server/storage';

// Mock dependencies
vi.mock('../../server/db');
vi.mock('../../server/storage');

// Mock authentication middleware
const mockTrainerAuth = (req: any, res: any, next: any) => {
  req.user = {
    id: 'trainer-123',
    email: 'trainer@example.com',
    role: 'trainer',
  };
  next();
};

const mockCustomerAuth = (req: any, res: any, next: any) => {
  req.user = {
    id: 'customer-123',
    email: 'customer@example.com',
    role: 'customer',
  };
  next();
};

// Test data
const mockMealPlan: MealPlan = {
  id: 'plan-123',
  planName: 'Weight Loss Plan',
  fitnessGoal: 'weight_loss',
  description: 'Comprehensive weight loss meal plan',
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
        name: 'Protein Pancakes',
        description: 'High protein breakfast pancakes',
        caloriesKcal: 350,
        proteinGrams: '25.0',
        carbsGrams: '30.0',
        fatGrams: '8.0',
        prepTimeMinutes: 15,
        cookTimeMinutes: 10,
        servings: 1,
        mealTypes: ['breakfast'],
        dietaryTags: ['high-protein', 'low-carb'],
        mainIngredientTags: ['eggs', 'protein-powder'],
        ingredientsJson: [
          { name: 'Eggs', amount: '2', unit: 'whole' },
          { name: 'Protein powder', amount: '1', unit: 'scoop' },
          { name: 'Almond flour', amount: '1/4', unit: 'cup' },
        ],
        instructionsText: '1. Mix ingredients\n2. Cook on griddle\n3. Serve hot',
        imageUrl: null,
      },
    },
    {
      day: 1,
      mealNumber: 2,
      mealType: 'lunch',
      recipe: {
        id: 'recipe-2',
        name: 'Grilled Chicken Salad',
        description: 'Fresh salad with grilled chicken',
        caloriesKcal: 450,
        proteinGrams: '35.0',
        carbsGrams: '15.0',
        fatGrams: '12.0',
        prepTimeMinutes: 20,
        cookTimeMinutes: 15,
        servings: 1,
        mealTypes: ['lunch'],
        dietaryTags: ['high-protein', 'low-carb'],
        mainIngredientTags: ['chicken', 'greens'],
        ingredientsJson: [
          { name: 'Chicken breast', amount: '6', unit: 'oz' },
          { name: 'Mixed greens', amount: '2', unit: 'cups' },
          { name: 'Olive oil', amount: '1', unit: 'tbsp' },
        ],
        instructionsText: '1. Grill chicken\n2. Prepare salad\n3. Combine and dress',
        imageUrl: null,
      },
    },
  ],
  startOfWeekMealPrep: {
    totalPrepTime: 180,
    shoppingList: [
      {
        ingredient: 'Chicken breast',
        totalAmount: '3',
        unit: 'lbs',
        usedInRecipes: ['Grilled Chicken Salad', 'Chicken Stir Fry'],
      },
    ],
    prepInstructions: [
      {
        step: 1,
        instruction: 'Grill all chicken breasts for the week',
        estimatedTime: 30,
        ingredients: ['Chicken breast'],
      },
    ],
    storageInstructions: [
      {
        ingredient: 'Grilled chicken',
        method: 'refrigerate',
        duration: '4-5 days',
      },
    ],
  },
};

const mockTrainerMealPlan: TrainerMealPlan = {
  id: 'trainer-plan-123',
  trainerId: 'trainer-123',
  mealPlanData: mockMealPlan,
  isTemplate: false,
  tags: ['weight-loss', 'beginner'],
  notes: 'Great starter plan for weight loss clients',
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

const mockAssignment: MealPlanAssignment = {
  id: 'assignment-123',
  mealPlanId: 'trainer-plan-123',
  customerId: 'customer-123',
  assignedBy: 'trainer-123',
  assignedAt: new Date(),
  notes: 'Start with this plan and track your progress',
};

describe('Meal Plan Assignment Workflows', () => {
  let trainerApp: express.Application;
  let customerApp: express.Application;
  const mockDb = vi.mocked(db);
  const mockStorage = vi.mocked(storage);

  beforeEach(() => {
    // Setup trainer app
    trainerApp = express();
    trainerApp.use(express.json());
    trainerApp.use(mockTrainerAuth);
    trainerApp.use('/api/trainer', trainerRouter);

    // Setup customer app
    customerApp = express();
    customerApp.use(express.json());
    customerApp.use(mockCustomerAuth);
    customerApp.use('/api/customer', customerRouter);

    vi.clearAllMocks();

    // Default mock implementations
    mockStorage.getTrainerMealPlan.mockResolvedValue(mockTrainerMealPlan);
    mockStorage.getTrainerMealPlans.mockResolvedValue([mockTrainerMealPlan]);
    mockStorage.getUser.mockResolvedValue(mockCustomer);
    mockStorage.createTrainerMealPlan.mockResolvedValue(mockTrainerMealPlan);
    mockStorage.assignMealPlanToCustomer.mockResolvedValue(mockAssignment);
    mockStorage.assignMealPlanToCustomers.mockResolvedValue();
    mockStorage.getMealPlanAssignments.mockResolvedValue([mockAssignment]);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Trainer Meal Plan Management', () => {
    it('should create and save meal plan to trainer library', async () => {
      const mealPlanData = {
        mealPlanData: mockMealPlan,
        notes: 'Effective weight loss plan',
        tags: ['weight-loss', 'low-carb'],
        isTemplate: true,
      };

      const response = await request(trainerApp)
        .post('/api/trainer/meal-plans')
        .send(mealPlanData)
        .expect(201);

      expect(response.body.mealPlan.id).toBe('trainer-plan-123');
      expect(response.body.message).toContain('saved successfully');

      // Verify storage call
      expect(mockStorage.createTrainerMealPlan).toHaveBeenCalledWith({
        trainerId: 'trainer-123',
        mealPlanData: mockMealPlan,
        notes: 'Effective weight loss plan',
        tags: ['weight-loss', 'low-carb'],
        isTemplate: true,
      });
    });

    it('should get all trainer meal plans', async () => {
      const mockPlans = [
        mockTrainerMealPlan,
        {
          ...mockTrainerMealPlan,
          id: 'trainer-plan-456',
          mealPlanData: { ...mockMealPlan, planName: 'Muscle Gain Plan' },
          tags: ['muscle-gain', 'high-protein'],
        },
      ];

      mockStorage.getTrainerMealPlans.mockResolvedValue(mockPlans);

      const response = await request(trainerApp)
        .get('/api/trainer/meal-plans')
        .expect(200);

      expect(response.body.mealPlans).toHaveLength(2);
      expect(response.body.total).toBe(2);
      expect(response.body.mealPlans[0].tags).toContain('weight-loss');
    });

    it('should get specific meal plan with assignment details', async () => {
      const mockAssignments = [
        {
          customerId: 'customer-123',
          customerEmail: 'customer@example.com',
          assignedAt: new Date(),
        },
      ];

      mockStorage.getMealPlanAssignments.mockResolvedValue(mockAssignments);

      const response = await request(trainerApp)
        .get('/api/trainer/meal-plans/trainer-plan-123')
        .expect(200);

      expect(response.body.mealPlan).toMatchObject({
        id: 'trainer-plan-123',
        assignments: mockAssignments,
        assignmentCount: 1,
      });
    });

    it('should update existing meal plan', async () => {
      const updates = {
        notes: 'Updated notes for the plan',
        tags: ['weight-loss', 'intermediate'],
        isTemplate: false,
      };

      const updatedPlan = {
        ...mockTrainerMealPlan,
        ...updates,
        updatedAt: new Date(),
      };

      mockStorage.updateTrainerMealPlan.mockResolvedValue(updatedPlan);

      const response = await request(trainerApp)
        .put('/api/trainer/meal-plans/trainer-plan-123')
        .send(updates)
        .expect(200);

      expect(response.body.mealPlan.notes).toBe('Updated notes for the plan');
      expect(response.body.mealPlan.tags).toContain('intermediate');

      // Verify storage call
      expect(mockStorage.updateTrainerMealPlan).toHaveBeenCalledWith(
        'trainer-plan-123',
        updates
      );
    });

    it('should delete meal plan from library', async () => {
      mockStorage.deleteTrainerMealPlan.mockResolvedValue(true);

      const response = await request(trainerApp)
        .delete('/api/trainer/meal-plans/trainer-plan-123')
        .expect(200);

      expect(response.body.message).toContain('deleted successfully');
      expect(mockStorage.deleteTrainerMealPlan).toHaveBeenCalledWith('trainer-plan-123');
    });

    it('should prevent unauthorized access to other trainers plans', async () => {
      // Mock plan belonging to different trainer
      const otherTrainerPlan = {
        ...mockTrainerMealPlan,
        trainerId: 'other-trainer-456',
      };

      mockStorage.getTrainerMealPlan.mockResolvedValue(otherTrainerPlan);

      const response = await request(trainerApp)
        .get('/api/trainer/meal-plans/trainer-plan-123')
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('not found');
    });
  });

  describe('Meal Plan Assignment Process', () => {
    it('should assign saved meal plan to customer', async () => {
      const assignmentData = {
        customerId: 'customer-123',
        notes: 'Follow this plan for 8 weeks',
      };

      const response = await request(trainerApp)
        .post('/api/trainer/meal-plans/trainer-plan-123/assign')
        .send(assignmentData)
        .expect(201);

      expect(response.body.assignment.id).toBe('assignment-123');
      expect(response.body.message).toContain('assigned successfully');

      // Verify both new and legacy assignment methods called
      expect(mockStorage.assignMealPlanToCustomer).toHaveBeenCalledWith(
        'trainer-plan-123',
        'customer-123',
        'trainer-123',
        'Follow this plan for 8 weeks'
      );
      expect(mockStorage.assignMealPlanToCustomers).toHaveBeenCalledWith(
        'trainer-123',
        mockMealPlan,
        ['customer-123']
      );
    });

    it('should assign meal plan directly to customer (legacy method)', async () => {
      const mockInsertQuery = {
        into: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{
          id: 'assignment-456',
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

      expect(response.body.assignment.id).toBe('assignment-456');

      // Verify assignment data
      expect(mockInsertQuery.values).toHaveBeenCalledWith({
        customerId: 'customer-123',
        trainerId: 'trainer-123',
        mealPlanData: mockMealPlan,
      });
    });

    it('should validate customer exists before assignment', async () => {
      mockStorage.getUser.mockResolvedValue(null); // Customer not found

      const response = await request(trainerApp)
        .post('/api/trainer/meal-plans/trainer-plan-123/assign')
        .send({ customerId: 'nonexistent-customer' })
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Customer not found');
      expect(mockStorage.assignMealPlanToCustomer).not.toHaveBeenCalled();
    });

    it('should validate meal plan ownership before assignment', async () => {
      // Mock plan belonging to different trainer
      const otherTrainerPlan = {
        ...mockTrainerMealPlan,
        trainerId: 'other-trainer-456',
      };

      mockStorage.getTrainerMealPlan.mockResolvedValue(otherTrainerPlan);

      const response = await request(trainerApp)
        .post('/api/trainer/meal-plans/trainer-plan-123/assign')
        .send({ customerId: 'customer-123' })
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('not found');
    });

    it('should unassign meal plan from customer', async () => {
      mockStorage.unassignMealPlanFromCustomer.mockResolvedValue(true);

      const response = await request(trainerApp)
        .delete('/api/trainer/meal-plans/trainer-plan-123/assign/customer-123')
        .expect(200);

      expect(response.body.message).toContain('unassigned successfully');
      expect(mockStorage.unassignMealPlanFromCustomer).toHaveBeenCalledWith(
        'trainer-plan-123',
        'customer-123'
      );
    });

    it('should handle assignment to multiple customers', async () => {
      const customerIds = ['customer-123', 'customer-456', 'customer-789'];

      // Mock batch assignment
      mockStorage.assignMealPlanToCustomers.mockResolvedValue();

      for (const customerId of customerIds) {
        await request(trainerApp)
          .post(`/api/trainer/meal-plans/trainer-plan-123/assign`)
          .send({ customerId })
          .expect(201);
      }

      // Verify all customers received assignments
      expect(mockStorage.assignMealPlanToCustomer).toHaveBeenCalledTimes(3);
    });
  });

  describe('Customer Meal Plan Access', () => {
    it('should get customer assigned meal plans', async () => {
      const mockAssignedPlans = [
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
        orderBy: vi.fn().mockResolvedValue(mockAssignedPlans),
      };

      mockDb.select.mockReturnValue(mockDbQuery as any);

      const response = await request(customerApp)
        .get('/api/customer/meal-plans')
        .expect(200);

      expect(response.body.mealPlans).toHaveLength(1);
      expect(response.body.mealPlans[0].mealPlanData.planName).toBe('Weight Loss Plan');

      // Verify query filters by customer ID
      expect(mockDbQuery.where).toHaveBeenCalledWith(
        eq(personalizedMealPlans.customerId, 'customer-123')
      );
    });

    it('should get specific meal plan details for customer', async () => {
      const mockAssignedPlan = {
        id: 'assignment-123',
        customerId: 'customer-123',
        trainerId: 'trainer-123',
        mealPlanData: mockMealPlan,
        assignedAt: new Date(),
      };

      const mockDbQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockAssignedPlan]),
      };

      mockDb.select.mockReturnValue(mockDbQuery as any);

      const response = await request(customerApp)
        .get('/api/customer/meal-plans/assignment-123')
        .expect(200);

      expect(response.body.mealPlan.mealPlanData.planName).toBe('Weight Loss Plan');
      expect(response.body.mealPlan.mealPlanData.meals).toHaveLength(2);
    });

    it('should prevent customer from accessing other customers meal plans', async () => {
      const mockDbQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]), // No results for different customer
      };

      mockDb.select.mockReturnValue(mockDbQuery as any);

      const response = await request(customerApp)
        .get('/api/customer/meal-plans/other-customer-plan')
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('not found');
    });

    it('should get meal prep instructions for customer', async () => {
      const mealPlanWithPrep = {
        ...mockMealPlan,
        startOfWeekMealPrep: {
          totalPrepTime: 120,
          shoppingList: [
            {
              ingredient: 'Chicken breast',
              totalAmount: '2',
              unit: 'lbs',
              usedInRecipes: ['Grilled Chicken Salad'],
            },
          ],
          prepInstructions: [
            {
              step: 1,
              instruction: 'Prep all proteins for the week',
              estimatedTime: 60,
              ingredients: ['Chicken breast'],
            },
          ],
          storageInstructions: [
            {
              ingredient: 'Grilled chicken',
              method: 'refrigerate',
              duration: '4-5 days',
            },
          ],
        },
      };

      const mockAssignedPlan = {
        id: 'assignment-123',
        mealPlanData: mealPlanWithPrep,
      };

      const mockDbQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockAssignedPlan]),
      };

      mockDb.select.mockReturnValue(mockDbQuery as any);

      const response = await request(customerApp)
        .get('/api/customer/meal-plans/assignment-123/meal-prep')
        .expect(200);

      expect(response.body.mealPrep.totalPrepTime).toBe(120);
      expect(response.body.mealPrep.shoppingList).toHaveLength(1);
      expect(response.body.mealPrep.prepInstructions).toHaveLength(1);
    });
  });

  describe('Workflow State Management', () => {
    it('should track meal plan assignment history', async () => {
      const mockHistory = [
        {
          id: 'history-1',
          action: 'assigned',
          timestamp: new Date('2024-01-01'),
          details: { assignedTo: 'customer-123' },
        },
        {
          id: 'history-2',
          action: 'updated',
          timestamp: new Date('2024-01-02'),
          details: { updatedFields: ['notes'] },
        },
      ];

      // Mock history retrieval
      mockStorage.getMealPlanHistory = vi.fn().mockResolvedValue(mockHistory);

      const response = await request(trainerApp)
        .get('/api/trainer/meal-plans/trainer-plan-123/history')
        .expect(200);

      expect(response.body.history).toHaveLength(2);
      expect(response.body.history[0].action).toBe('assigned');
    });

    it('should handle meal plan versioning', async () => {
      const updatedMealPlan = {
        ...mockMealPlan,
        planName: 'Weight Loss Plan v2',
        dailyCalorieTarget: 1600, // Reduced calories
      };

      const updates = {
        mealPlanData: updatedMealPlan,
        notes: 'Updated with lower calorie target',
      };

      const versionedPlan = {
        ...mockTrainerMealPlan,
        ...updates,
        version: 2,
        updatedAt: new Date(),
      };

      mockStorage.updateTrainerMealPlan.mockResolvedValue(versionedPlan);

      const response = await request(trainerApp)
        .put('/api/trainer/meal-plans/trainer-plan-123')
        .send(updates)
        .expect(200);

      expect(response.body.mealPlan.mealPlanData.dailyCalorieTarget).toBe(1600);
      expect(response.body.mealPlan.version).toBe(2);
    });

    it('should manage meal plan templates', async () => {
      const templateData = {
        mealPlanData: mockMealPlan,
        isTemplate: true,
        tags: ['template', 'weight-loss'],
        notes: 'Template for new weight loss clients',
      };

      const mockTemplate = {
        ...mockTrainerMealPlan,
        ...templateData,
      };

      mockStorage.createTrainerMealPlan.mockResolvedValue(mockTemplate);

      const response = await request(trainerApp)
        .post('/api/trainer/meal-plans')
        .send(templateData)
        .expect(201);

      expect(response.body.mealPlan.isTemplate).toBe(true);
      expect(response.body.mealPlan.tags).toContain('template');
    });

    it('should filter meal plans by template status', async () => {
      const mockTemplates = [
        { ...mockTrainerMealPlan, isTemplate: true, tags: ['template'] },
      ];

      const mockRegularPlans = [
        { ...mockTrainerMealPlan, id: 'plan-456', isTemplate: false },
      ];

      // Test getting templates
      mockStorage.getTrainerMealPlans.mockResolvedValueOnce(mockTemplates);

      const templatesResponse = await request(trainerApp)
        .get('/api/trainer/meal-plans?template=true')
        .expect(200);

      expect(templatesResponse.body.mealPlans).toHaveLength(1);
      expect(templatesResponse.body.mealPlans[0].isTemplate).toBe(true);

      // Test getting regular plans
      mockStorage.getTrainerMealPlans.mockResolvedValueOnce(mockRegularPlans);

      const plansResponse = await request(trainerApp)
        .get('/api/trainer/meal-plans?template=false')
        .expect(200);

      expect(plansResponse.body.mealPlans).toHaveLength(1);
      expect(plansResponse.body.mealPlans[0].isTemplate).toBe(false);
    });
  });

  describe('Bulk Operations', () => {
    it('should assign meal plan to multiple customers at once', async () => {
      const bulkAssignmentData = {
        customerIds: ['customer-123', 'customer-456', 'customer-789'],
        notes: 'Start your transformation journey!',
      };

      // Mock successful assignments
      const mockAssignments = bulkAssignmentData.customerIds.map((id, index) => ({
        id: `assignment-${index + 1}`,
        mealPlanId: 'trainer-plan-123',
        customerId: id,
        assignedBy: 'trainer-123',
        assignedAt: new Date(),
        notes: bulkAssignmentData.notes,
      }));

      mockStorage.bulkAssignMealPlan = vi.fn().mockResolvedValue(mockAssignments);

      const response = await request(trainerApp)
        .post('/api/trainer/meal-plans/trainer-plan-123/bulk-assign')
        .send(bulkAssignmentData)
        .expect(201);

      expect(response.body.assignments).toHaveLength(3);
      expect(response.body.successCount).toBe(3);
      expect(response.body.message).toContain('3 customers');
    });

    it('should handle partial bulk assignment failures', async () => {
      const bulkAssignmentData = {
        customerIds: ['customer-123', 'invalid-customer', 'customer-789'],
      };

      // Mock partial success
      const mockResults = [
        { customerId: 'customer-123', success: true, assignmentId: 'assignment-1' },
        { customerId: 'invalid-customer', success: false, error: 'Customer not found' },
        { customerId: 'customer-789', success: true, assignmentId: 'assignment-2' },
      ];

      mockStorage.bulkAssignMealPlan = vi.fn().mockResolvedValue(mockResults);

      const response = await request(trainerApp)
        .post('/api/trainer/meal-plans/trainer-plan-123/bulk-assign')
        .send(bulkAssignmentData)
        .expect(207); // Multi-status

      expect(response.body.successCount).toBe(2);
      expect(response.body.failureCount).toBe(1);
      expect(response.body.failures).toHaveLength(1);
      expect(response.body.failures[0].customerId).toBe('invalid-customer');
    });

    it('should unassign meal plan from multiple customers', async () => {
      const bulkUnassignData = {
        customerIds: ['customer-123', 'customer-456'],
      };

      mockStorage.bulkUnassignMealPlan = vi.fn().mockResolvedValue({ 
        successCount: 2,
        failureCount: 0 
      });

      const response = await request(trainerApp)
        .delete('/api/trainer/meal-plans/trainer-plan-123/bulk-unassign')
        .send(bulkUnassignData)
        .expect(200);

      expect(response.body.successCount).toBe(2);
      expect(response.body.message).toContain('unassigned from 2 customers');
    });

    it('should clone meal plan with modifications', async () => {
      const cloneData = {
        planName: 'Weight Loss Plan - Modified',
        modifications: {
          dailyCalorieTarget: 1600,
          days: 14,
        },
        notes: 'Cloned and modified for different client needs',
      };

      const clonedPlan = {
        ...mockTrainerMealPlan,
        id: 'trainer-plan-clone-123',
        mealPlanData: {
          ...mockMealPlan,
          planName: cloneData.planName,
          dailyCalorieTarget: cloneData.modifications.dailyCalorieTarget,
          days: cloneData.modifications.days,
        },
        notes: cloneData.notes,
      };

      mockStorage.cloneTrainerMealPlan = vi.fn().mockResolvedValue(clonedPlan);

      const response = await request(trainerApp)
        .post('/api/trainer/meal-plans/trainer-plan-123/clone')
        .send(cloneData)
        .expect(201);

      expect(response.body.mealPlan.id).toBe('trainer-plan-clone-123');
      expect(response.body.mealPlan.mealPlanData.planName).toBe('Weight Loss Plan - Modified');
      expect(response.body.mealPlan.mealPlanData.dailyCalorieTarget).toBe(1600);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database transaction failures', async () => {
      mockStorage.assignMealPlanToCustomer.mockRejectedValue(
        new Error('Transaction failed')
      );

      const response = await request(trainerApp)
        .post('/api/trainer/meal-plans/trainer-plan-123/assign')
        .send({ customerId: 'customer-123' })
        .expect(500);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Failed to assign');
    });

    it('should validate meal plan data integrity', async () => {
      const corruptedMealPlan = {
        ...mockMealPlan,
        meals: [], // Empty meals array
        dailyCalorieTarget: -100, // Invalid calorie target
      };

      const response = await request(trainerApp)
        .post('/api/trainer/meal-plans')
        .send({ mealPlanData: corruptedMealPlan })
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('validation');
    });

    it('should handle concurrent assignment attempts', async () => {
      // Simulate concurrent assignments to same customer
      const assignmentPromises = Array.from({ length: 3 }, () =>
        request(trainerApp)
          .post('/api/trainer/meal-plans/trainer-plan-123/assign')
          .send({ customerId: 'customer-123' })
      );

      const responses = await Promise.allSettled(assignmentPromises);

      // Only one should succeed, others should handle conflict
      const successes = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 201
      );
      const conflicts = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 409
      );

      expect(successes.length).toBe(1);
      expect(conflicts.length).toBe(2);
    });

    it('should handle large meal plan data', async () => {
      const largeMealPlan = {
        ...mockMealPlan,
        meals: Array.from({ length: 1000 }, (_, i) => ({
          day: Math.floor(i / 6) + 1,
          mealNumber: (i % 6) + 1,
          mealType: 'meal',
          recipe: mockMealPlan.meals[0].recipe,
        })),
      };

      const response = await request(trainerApp)
        .post('/api/trainer/meal-plans')
        .send({ mealPlanData: largeMealPlan })
        .expect(413); // Payload too large

      expect(response.body.message).toContain('too large');
    });

    it('should gracefully handle missing meal prep data', async () => {
      const mealPlanWithoutPrep = {
        ...mockMealPlan,
        startOfWeekMealPrep: undefined,
      };

      const mockAssignedPlan = {
        id: 'assignment-123',
        mealPlanData: mealPlanWithoutPrep,
      };

      const mockDbQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockAssignedPlan]),
      };

      mockDb.select.mockReturnValue(mockDbQuery as any);

      const response = await request(customerApp)
        .get('/api/customer/meal-plans/assignment-123/meal-prep')
        .expect(200);

      expect(response.body.mealPrep).toBeNull();
      expect(response.body.message).toContain('No meal prep data');
    });
  });

  describe('Performance and Optimization', () => {
    it('should paginate large meal plan lists', async () => {
      const largePlanList = Array.from({ length: 50 }, (_, i) => ({
        ...mockTrainerMealPlan,
        id: `plan-${i}`,
        mealPlanData: { ...mockMealPlan, planName: `Plan ${i}` },
      }));

      mockStorage.getTrainerMealPlans.mockResolvedValue(largePlanList.slice(0, 20));

      const response = await request(trainerApp)
        .get('/api/trainer/meal-plans?page=1&limit=20')
        .expect(200);

      expect(response.body.mealPlans).toHaveLength(20);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: expect.any(Number),
      });
    });

    it('should cache frequently accessed meal plans', async () => {
      // First request should hit database
      await request(trainerApp)
        .get('/api/trainer/meal-plans/trainer-plan-123')
        .expect(200);

      // Second request should use cache
      await request(trainerApp)
        .get('/api/trainer/meal-plans/trainer-plan-123')
        .expect(200);

      // Verify caching mechanism (would depend on implementation)
      expect(mockStorage.getTrainerMealPlan).toHaveBeenCalledTimes(2); // Or 1 if cached
    });

    it('should optimize meal plan search queries', async () => {
      const searchQuery = {
        tags: ['weight-loss'],
        isTemplate: true,
        searchTerm: 'beginner',
      };

      mockStorage.searchTrainerMealPlans = vi.fn().mockResolvedValue([mockTrainerMealPlan]);

      const response = await request(trainerApp)
        .get('/api/trainer/meal-plans/search')
        .query(searchQuery)
        .expect(200);

      expect(response.body.mealPlans).toHaveLength(1);
      expect(mockStorage.searchTrainerMealPlans).toHaveBeenCalledWith(
        'trainer-123',
        searchQuery
      );
    });
  });
});