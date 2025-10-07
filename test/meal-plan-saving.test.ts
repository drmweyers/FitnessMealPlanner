import { describe, it, expect, vi, beforeEach } from 'vitest';
import { storage } from '../server/storage';
import type { TrainerMealPlan, InsertTrainerMealPlan, MealPlan } from '../shared/schema';

// Mock database
vi.mock('../server/db', () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    eq: vi.fn(),
    and: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  },
}));

describe('Meal Plan Saving Functionality', () => {
  const mockTrainerId = 'trainer-123';
  const mockCustomerId = 'customer-456';
  
  const mockMealPlan: MealPlan = {
    planName: 'Test Meal Plan',
    days: 7,
    mealsPerDay: 3,
    dailyCalorieTarget: 2000,
    fitnessGoal: 'weight_loss',
    description: 'A test meal plan for weight loss',
    clientName: 'John Doe',
    meals: [
      {
        day: 1,
        mealNumber: 1,
        recipe: {
          id: 'recipe-1',
          name: 'Oatmeal Bowl',
          mealTypes: ['breakfast'],
          caloriesKcal: 350,
          proteinGrams: '12.0',
          carbsGrams: '60.0',
          fatGrams: '8.0',
          prepTimeMinutes: 10,
          cookTimeMinutes: 5,
          servings: 1,
          isApproved: true,
          ingredientsJson: [],
          instructionsText: 'Mix and serve',
          creationTimestamp: new Date(),
          lastUpdatedTimestamp: new Date(),
        },
      },
      {
        day: 1,
        mealNumber: 2,
        recipe: {
          id: 'recipe-2',
          name: 'Grilled Chicken Salad',
          mealTypes: ['lunch'],
          caloriesKcal: 400,
          proteinGrams: '35.0',
          carbsGrams: '15.0',
          fatGrams: '18.0',
          prepTimeMinutes: 15,
          cookTimeMinutes: 12,
          servings: 1,
          isApproved: true,
          ingredientsJson: [],
          instructionsText: 'Grill and mix',
          creationTimestamp: new Date(),
          lastUpdatedTimestamp: new Date(),
        },
      },
    ],
  };

  const mockSavedMealPlan: TrainerMealPlan = {
    id: 'saved-plan-1',
    trainerId: mockTrainerId,
    mealPlanData: mockMealPlan,
    isTemplate: false,
    tags: ['weight-loss', 'beginner'],
    notes: 'Great for beginners',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Saving Meal Plans', () => {
    it('should save a meal plan to trainer library', async () => {
      const mockDb = await import('../server/db');
      vi.mocked(mockDb.db.returning).mockResolvedValue([mockSavedMealPlan]);

      const insertData: InsertTrainerMealPlan = {
        trainerId: mockTrainerId,
        mealPlanData: mockMealPlan,
        isTemplate: false,
        tags: ['weight-loss', 'beginner'],
        notes: 'Great for beginners',
      };

      const result = await storage.createTrainerMealPlan(insertData);

      expect(result).toEqual(mockSavedMealPlan);
      expect(mockDb.db.insert).toHaveBeenCalled();
      expect(mockDb.db.values).toHaveBeenCalledWith(expect.objectContaining({
        trainerId: mockTrainerId,
        mealPlanData: mockMealPlan,
        isTemplate: false,
        tags: ['weight-loss', 'beginner'],
        notes: 'Great for beginners',
      }));
    });

    it('should save a meal plan as a template', async () => {
      const mockDb = await import('../server/db');
      const templatePlan = { ...mockSavedMealPlan, isTemplate: true };
      vi.mocked(mockDb.db.returning).mockResolvedValue([templatePlan]);

      const insertData: InsertTrainerMealPlan = {
        trainerId: mockTrainerId,
        mealPlanData: mockMealPlan,
        isTemplate: true,
        tags: ['template', 'weight-loss'],
        notes: 'Reusable template',
      };

      const result = await storage.createTrainerMealPlan(insertData);

      expect(result.isTemplate).toBe(true);
      expect(mockDb.db.values).toHaveBeenCalledWith(expect.objectContaining({
        isTemplate: true,
      }));
    });

    it('should save meal plan with custom tags', async () => {
      const mockDb = await import('../server/db');
      vi.mocked(mockDb.db.returning).mockResolvedValue([mockSavedMealPlan]);

      const customTags = ['custom', 'high-protein', 'advanced'];
      const insertData: InsertTrainerMealPlan = {
        trainerId: mockTrainerId,
        mealPlanData: mockMealPlan,
        tags: customTags,
      };

      await storage.createTrainerMealPlan(insertData);

      expect(mockDb.db.values).toHaveBeenCalledWith(expect.objectContaining({
        tags: customTags,
      }));
    });

    it('should handle saving meal plan without optional fields', async () => {
      const mockDb = await import('../server/db');
      const minimalPlan = { ...mockSavedMealPlan, tags: [], notes: null };
      vi.mocked(mockDb.db.returning).mockResolvedValue([minimalPlan]);

      const insertData: InsertTrainerMealPlan = {
        trainerId: mockTrainerId,
        mealPlanData: mockMealPlan,
      };

      const result = await storage.createTrainerMealPlan(insertData);

      expect(result).toEqual(minimalPlan);
      expect(mockDb.db.values).toHaveBeenCalledWith(expect.objectContaining({
        trainerId: mockTrainerId,
        mealPlanData: mockMealPlan,
      }));
    });
  });

  describe('Retrieving Saved Meal Plans', () => {
    it('should get all meal plans for a trainer', async () => {
      const mockDb = await import('../server/db');
      const mockPlans = [mockSavedMealPlan, { ...mockSavedMealPlan, id: 'saved-plan-2' }];
      vi.mocked(mockDb.db.select).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockPlans),
      } as any);

      const result = await storage.getTrainerMealPlans(mockTrainerId);

      expect(result).toEqual(mockPlans);
      expect(mockDb.db.select).toHaveBeenCalled();
      expect(mockDb.db.where).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should get a specific meal plan by ID', async () => {
      const mockDb = await import('../server/db');
      vi.mocked(mockDb.db.select).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([mockSavedMealPlan]),
      } as any);

      const result = await storage.getTrainerMealPlan(mockSavedMealPlan.id);

      expect(result).toEqual(mockSavedMealPlan);
      expect(mockDb.db.where).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should return null for non-existent meal plan', async () => {
      const mockDb = await import('../server/db');
      vi.mocked(mockDb.db.select).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      } as any);

      const result = await storage.getTrainerMealPlan('non-existent-id');

      expect(result).toBeUndefined();
    });

    it('should filter meal plans by template status', async () => {
      const mockDb = await import('../server/db');
      const templatePlans = [{ ...mockSavedMealPlan, isTemplate: true }];
      vi.mocked(mockDb.db.select).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(templatePlans),
      } as any);

      const result = await storage.getTrainerMealPlans(mockTrainerId, { isTemplate: true });

      expect(result).toEqual(templatePlans);
      expect(mockDb.db.where).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('Updating Saved Meal Plans', () => {
    it('should update meal plan details', async () => {
      const mockDb = await import('../server/db');
      const updatedPlan = {
        ...mockSavedMealPlan,
        notes: 'Updated notes',
        tags: ['updated', 'weight-loss'],
        updatedAt: new Date(),
      };
      vi.mocked(mockDb.db.update).mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([updatedPlan]),
      } as any);

      const updateData = {
        notes: 'Updated notes',
        tags: ['updated', 'weight-loss'],
      };

      const result = await storage.updateTrainerMealPlan(mockSavedMealPlan.id, updateData);

      expect(result).toEqual(updatedPlan);
      expect(mockDb.db.update).toHaveBeenCalled();
      expect(mockDb.db.set).toHaveBeenCalledWith(expect.objectContaining(updateData));
    });

    it('should update meal plan to template status', async () => {
      const mockDb = await import('../server/db');
      const templatePlan = { ...mockSavedMealPlan, isTemplate: true };
      vi.mocked(mockDb.db.update).mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([templatePlan]),
      } as any);

      const result = await storage.updateTrainerMealPlan(mockSavedMealPlan.id, { isTemplate: true });

      expect(result.isTemplate).toBe(true);
      expect(mockDb.db.set).toHaveBeenCalledWith(expect.objectContaining({ isTemplate: true }));
    });
  });

  describe('Deleting Saved Meal Plans', () => {
    it('should delete a meal plan by ID', async () => {
      const mockDb = await import('../server/db');
      vi.mocked(mockDb.db.delete).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockSavedMealPlan]),
      } as any);

      const result = await storage.deleteTrainerMealPlan(mockSavedMealPlan.id);

      expect(result).toBe(true);
      expect(mockDb.db.delete).toHaveBeenCalled();
      expect(mockDb.db.where).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should return false when deleting non-existent meal plan', async () => {
      const mockDb = await import('../server/db');
      vi.mocked(mockDb.db.delete).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      } as any);

      const result = await storage.deleteTrainerMealPlan('non-existent-id');

      expect(result).toBe(false);
    });
  });

  describe('Assignment Operations', () => {
    it('should assign meal plan to customer', async () => {
      const mockDb = await import('../server/db');
      const assignment = {
        id: 'assignment-1',
        mealPlanId: mockSavedMealPlan.id,
        customerId: mockCustomerId,
        assignedBy: mockTrainerId,
        assignedAt: new Date(),
      };
      vi.mocked(mockDb.db.insert).mockReturnValue({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([assignment]),
      } as any);

      const result = await storage.assignMealPlanToCustomer(mockSavedMealPlan.id, mockCustomerId, mockTrainerId);

      expect(result).toEqual(assignment);
      expect(mockDb.db.insert).toHaveBeenCalled();
      expect(mockDb.db.values).toHaveBeenCalledWith(expect.objectContaining({
        mealPlanId: mockSavedMealPlan.id,
        customerId: mockCustomerId,
        assignedBy: mockTrainerId,
      }));
    });

    it('should get meal plan assignments', async () => {
      const mockDb = await import('../server/db');
      const assignments = [
        {
          id: 'assignment-1',
          mealPlanId: mockSavedMealPlan.id,
          customerId: mockCustomerId,
          assignedAt: new Date(),
        },
      ];
      vi.mocked(mockDb.db.select).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(assignments),
      } as any);

      const result = await storage.getMealPlanAssignments(mockSavedMealPlan.id);

      expect(result).toEqual(assignments);
      expect(mockDb.db.where).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should remove meal plan assignment', async () => {
      const mockDb = await import('../server/db');
      vi.mocked(mockDb.db.delete).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'assignment-1' }]),
      } as any);

      const result = await storage.removeMealPlanAssignment(mockTrainerId, 'assignment-1');

      expect(result).toBe(true);
      expect(mockDb.db.delete).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors when saving meal plan', async () => {
      const mockDb = await import('../server/db');
      vi.mocked(mockDb.db.returning).mockRejectedValue(new Error('Database error'));

      const insertData: InsertTrainerMealPlan = {
        trainerId: mockTrainerId,
        mealPlanData: mockMealPlan,
      };

      await expect(storage.createTrainerMealPlan(insertData)).rejects.toThrow('Database error');
    });

    it('should handle database errors when retrieving meal plans', async () => {
      const mockDb = await import('../server/db');
      vi.mocked(mockDb.db.select).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockRejectedValue(new Error('Connection error')),
      } as any);

      await expect(storage.getTrainerMealPlans(mockTrainerId)).rejects.toThrow('Connection error');
    });

    it('should handle malformed meal plan data gracefully', async () => {
      const mockDb = await import('../server/db');
      vi.mocked(mockDb.db.returning).mockResolvedValue([mockSavedMealPlan]);

      const invalidMealPlan = { ...mockMealPlan, meals: null } as any;
      const insertData: InsertTrainerMealPlan = {
        trainerId: mockTrainerId,
        mealPlanData: invalidMealPlan,
      };

      // Should still save, but with null meals
      const result = await storage.createTrainerMealPlan(insertData);
      expect(result).toEqual(mockSavedMealPlan);
    });
  });

  describe('Data Validation', () => {
    it('should validate required fields when saving', async () => {
      const mockDb = await import('../server/db');
      
      // Missing trainerId should be handled by database constraints
      const invalidData = {
        mealPlanData: mockMealPlan,
      } as any;

      vi.mocked(mockDb.db.returning).mockRejectedValue(new Error('NOT NULL constraint failed'));

      await expect(storage.createTrainerMealPlan(invalidData)).rejects.toThrow('NOT NULL constraint failed');
    });

    it('should handle empty tags array', async () => {
      const mockDb = await import('../server/db');
      const planWithEmptyTags = { ...mockSavedMealPlan, tags: [] };
      vi.mocked(mockDb.db.returning).mockResolvedValue([planWithEmptyTags]);

      const insertData: InsertTrainerMealPlan = {
        trainerId: mockTrainerId,
        mealPlanData: mockMealPlan,
        tags: [],
      };

      const result = await storage.createTrainerMealPlan(insertData);
      expect(result.tags).toEqual([]);
    });

    it('should handle null notes field', async () => {
      const mockDb = await import('../server/db');
      const planWithNullNotes = { ...mockSavedMealPlan, notes: null };
      vi.mocked(mockDb.db.returning).mockResolvedValue([planWithNullNotes]);

      const insertData: InsertTrainerMealPlan = {
        trainerId: mockTrainerId,
        mealPlanData: mockMealPlan,
        notes: null,
      };

      const result = await storage.createTrainerMealPlan(insertData);
      expect(result.notes).toBeNull();
    });
  });
});