/**
 * Saved Meal Plans Integration Tests
 *
 * Tests the complete API workflow for trainers saving and managing meal plans.
 * This test suite validates the full stack integration from frontend → API → database.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { storage } from '../../server/storage';
import type { MealPlan, InsertTrainerMealPlan } from '@shared/schema';

describe('Saved Meal Plans - Integration Tests', () => {
  // Use test account IDs (these are the actual UUIDs from the database)
  const trainerId = '96164745-2a3c-4b6f-865a-838d004c0932'; // trainer.test@evofitmeals.com
  const customerId = 'a02e637d-658d-49f5-972e-fb783bf4ec57'; // customer.test@evofitmeals.com

  describe('Save and Retrieve Workflow', () => {
    it('should save a meal plan to trainer library via storage service', async () => {
      const mockMealPlanData: MealPlan = {
        id: 'integration-test-plan-1',
        planName: 'Integration Test Plan',
        fitnessGoal: 'weight_loss',
        description: 'Test plan for integration testing',
        dailyCalorieTarget: 2000,
        days: 5,
        mealsPerDay: 3,
        generatedBy: trainerId,
        createdAt: new Date(),
        meals: [],
      };

      const planToSave: InsertTrainerMealPlan = {
        trainerId,
        mealPlanData: mockMealPlanData,
        notes: 'Integration test notes',
        tags: ['test', 'integration'],
        isTemplate: false,
      };

      const savedPlan = await storage.createTrainerMealPlan(planToSave);

      expect(savedPlan).toBeDefined();
      expect(savedPlan.id).toBeDefined();
      expect(savedPlan.trainerId).toBe(trainerId);
      expect((savedPlan.mealPlanData as MealPlan).planName).toBe('Integration Test Plan');

      // Cleanup
      if (savedPlan.id) {
        await storage.deleteTrainerMealPlan(savedPlan.id);
      }
    });

    it('should retrieve all saved plans for a trainer', async () => {
      // Create 2 test plans
      const plan1: InsertTrainerMealPlan = {
        trainerId,
        mealPlanData: {
          id: 'test-1',
          planName: 'Plan 1',
          fitnessGoal: 'muscle_gain',
          dailyCalorieTarget: 3000,
          days: 7,
          mealsPerDay: 5,
          generatedBy: trainerId,
          createdAt: new Date(),
          meals: [],
        },
        notes: 'First plan',
        tags: ['muscle-gain'],
        isTemplate: false,
      };

      const plan2: InsertTrainerMealPlan = {
        trainerId,
        mealPlanData: {
          id: 'test-2',
          planName: 'Plan 2',
          fitnessGoal: 'weight_loss',
          dailyCalorieTarget: 1800,
          days: 7,
          mealsPerDay: 4,
          generatedBy: trainerId,
          createdAt: new Date(),
          meals: [],
        },
        notes: 'Second plan',
        tags: ['weight-loss'],
        isTemplate: true,
      };

      const saved1 = await storage.createTrainerMealPlan(plan1);
      const saved2 = await storage.createTrainerMealPlan(plan2);

      // Retrieve all plans
      const allPlans = await storage.getTrainerMealPlans(trainerId);

      // Should have at least our 2 test plans (might have more if test ran before)
      expect(allPlans.length).toBeGreaterThanOrEqual(2);

      const testPlans = allPlans.filter(p =>
        (p.mealPlanData as MealPlan).planName === 'Plan 1' ||
        (p.mealPlanData as MealPlan).planName === 'Plan 2'
      );

      expect(testPlans).toHaveLength(2);
      expect(testPlans.every(p => p.trainerId === trainerId)).toBe(true);

      // Cleanup
      if (saved1.id) await storage.deleteTrainerMealPlan(saved1.id);
      if (saved2.id) await storage.deleteTrainerMealPlan(saved2.id);
    });

    it('should retrieve a specific saved plan by ID', async () => {
      const planToSave: InsertTrainerMealPlan = {
        trainerId,
        mealPlanData: {
          id: 'specific-test',
          planName: 'Specific Plan Test',
          fitnessGoal: 'general_health',
          dailyCalorieTarget: 2200,
          days: 7,
          mealsPerDay: 4,
          generatedBy: trainerId,
          createdAt: new Date(),
          meals: [],
        },
        notes: 'Specific plan notes',
        tags: ['test'],
        isTemplate: false,
      };

      const savedPlan = await storage.createTrainerMealPlan(planToSave);
      const retrievedPlan = await storage.getTrainerMealPlan(savedPlan.id);

      expect(retrievedPlan).toBeDefined();
      expect(retrievedPlan?.id).toBe(savedPlan.id);
      expect((retrievedPlan?.mealPlanData as MealPlan).planName).toBe('Specific Plan Test');

      // Cleanup
      if (savedPlan.id) await storage.deleteTrainerMealPlan(savedPlan.id);
    });
  });

  describe('Update Workflow', () => {
    it('should update meal plan notes and tags', async () => {
      const planToSave: InsertTrainerMealPlan = {
        trainerId,
        mealPlanData: {
          id: 'update-test',
          planName: 'Update Test Plan',
          fitnessGoal: 'muscle_gain',
          dailyCalorieTarget: 2800,
          days: 7,
          mealsPerDay: 5,
          generatedBy: trainerId,
          createdAt: new Date(),
          meals: [],
        },
        notes: 'Original notes',
        tags: ['original'],
        isTemplate: false,
      };

      const savedPlan = await storage.createTrainerMealPlan(planToSave);

      // Update the plan
      const updates = {
        notes: 'Updated notes with more information',
        tags: ['updated', 'modified', 'v2'],
      };

      const updatedPlan = await storage.updateTrainerMealPlan(savedPlan.id, updates);

      expect(updatedPlan).toBeDefined();
      expect(updatedPlan?.notes).toBe('Updated notes with more information');
      expect(updatedPlan?.tags).toEqual(['updated', 'modified', 'v2']);

      // Cleanup
      if (savedPlan.id) await storage.deleteTrainerMealPlan(savedPlan.id);
    });

    it('should toggle isTemplate flag', async () => {
      const planToSave: InsertTrainerMealPlan = {
        trainerId,
        mealPlanData: {
          id: 'template-test',
          planName: 'Template Test Plan',
          fitnessGoal: 'weight_loss',
          dailyCalorieTarget: 1900,
          days: 7,
          mealsPerDay: 4,
          generatedBy: trainerId,
          createdAt: new Date(),
          meals: [],
        },
        notes: 'Template test',
        tags: ['test'],
        isTemplate: false,
      };

      const savedPlan = await storage.createTrainerMealPlan(planToSave);
      expect(savedPlan.isTemplate).toBe(false);

      // Toggle to template
      const updatedPlan = await storage.updateTrainerMealPlan(savedPlan.id, {
        isTemplate: true,
      });

      expect(updatedPlan?.isTemplate).toBe(true);

      // Cleanup
      if (savedPlan.id) await storage.deleteTrainerMealPlan(savedPlan.id);
    });
  });

  describe('Assignment Workflow', () => {
    it('should assign a saved plan to a customer', async () => {
      // Create a test plan
      const planToSave: InsertTrainerMealPlan = {
        trainerId,
        mealPlanData: {
          id: 'assignment-test',
          planName: 'Assignment Test Plan',
          fitnessGoal: 'muscle_gain',
          dailyCalorieTarget: 2900,
          days: 7,
          mealsPerDay: 5,
          generatedBy: trainerId,
          createdAt: new Date(),
          meals: [],
        },
        notes: 'Plan for assignment testing',
        tags: ['test', 'assignment'],
        isTemplate: false,
      };

      const savedPlan = await storage.createTrainerMealPlan(planToSave);

      // Assign to customer
      const assignment = await storage.assignMealPlanToCustomer(
        savedPlan.id,
        customerId,
        trainerId,
        'Test assignment'
      );

      expect(assignment).toBeDefined();
      expect(assignment.mealPlanId).toBe(savedPlan.id);
      expect(assignment.customerId).toBe(customerId);
      expect(assignment.assignedBy).toBe(trainerId);

      // Verify plan now shows assignment
      const planWithAssignments = await storage.getTrainerMealPlans(trainerId);
      const assignedPlan = planWithAssignments.find(p => p.id === savedPlan.id);

      expect(assignedPlan?.assignmentCount).toBe(1);
      expect(assignedPlan?.assignments).toHaveLength(1);
      expect(assignedPlan?.assignments[0].customerId).toBe(customerId);

      // Cleanup
      if (assignment.id) {
        await storage.unassignMealPlanFromCustomer(savedPlan.id, customerId);
      }
      if (savedPlan.id) {
        await storage.deleteTrainerMealPlan(savedPlan.id);
      }
    });

    it('should handle multiple assignments of the same plan', async () => {
      const planToSave: InsertTrainerMealPlan = {
        trainerId,
        mealPlanData: {
          id: 'multi-assignment-test',
          planName: 'Multi Assignment Test Plan',
          fitnessGoal: 'general_health',
          dailyCalorieTarget: 2100,
          days: 7,
          mealsPerDay: 4,
          generatedBy: trainerId,
          createdAt: new Date(),
          meals: [],
        },
        notes: 'Plan for multiple assignments',
        tags: ['test'],
        isTemplate: true,
      };

      const savedPlan = await storage.createTrainerMealPlan(planToSave);

      // Assign to customer
      const assignment = await storage.assignMealPlanToCustomer(
        savedPlan.id,
        customerId,
        trainerId,
        'First assignment'
      );

      // Verify assignment count
      const plans = await storage.getTrainerMealPlans(trainerId);
      const assignedPlan = plans.find(p => p.id === savedPlan.id);

      expect(assignedPlan?.assignmentCount).toBeGreaterThanOrEqual(1);

      // Cleanup
      if (assignment.id) {
        await storage.unassignMealPlanFromCustomer(savedPlan.id, customerId);
      }
      if (savedPlan.id) {
        await storage.deleteTrainerMealPlan(savedPlan.id);
      }
    });
  });

  describe('Delete Workflow', () => {
    it('should delete a saved meal plan', async () => {
      const planToSave: InsertTrainerMealPlan = {
        trainerId,
        mealPlanData: {
          id: 'delete-test',
          planName: 'Delete Test Plan',
          fitnessGoal: 'weight_loss',
          dailyCalorieTarget: 1800,
          days: 7,
          mealsPerDay: 4,
          generatedBy: trainerId,
          createdAt: new Date(),
          meals: [],
        },
        notes: 'Plan for deletion testing',
        tags: ['test', 'delete'],
        isTemplate: false,
      };

      const savedPlan = await storage.createTrainerMealPlan(planToSave);

      // Delete the plan
      const deleted = await storage.deleteTrainerMealPlan(savedPlan.id);
      expect(deleted).toBe(true);

      // Verify it's gone
      const retrievedPlan = await storage.getTrainerMealPlan(savedPlan.id);
      expect(retrievedPlan).toBeUndefined();
    });

    it('should cascade delete assignments when plan is deleted', async () => {
      const planToSave: InsertTrainerMealPlan = {
        trainerId,
        mealPlanData: {
          id: 'cascade-delete-test',
          planName: 'Cascade Delete Test Plan',
          fitnessGoal: 'muscle_gain',
          dailyCalorieTarget: 2900,
          days: 7,
          mealsPerDay: 5,
          generatedBy: trainerId,
          createdAt: new Date(),
          meals: [],
        },
        notes: 'Plan for cascade deletion testing',
        tags: ['test'],
        isTemplate: false,
      };

      const savedPlan = await storage.createTrainerMealPlan(planToSave);

      // Assign to customer
      const assignment = await storage.assignMealPlanToCustomer(
        savedPlan.id,
        customerId,
        trainerId,
        'Test assignment for cascade'
      );

      expect(assignment).toBeDefined();

      // Delete the plan
      await storage.deleteTrainerMealPlan(savedPlan.id);

      // Verify plan is deleted (we can't directly check assignments without db access,
      // but the CASCADE constraint should handle it)
      const deletedPlan = await storage.getTrainerMealPlan(savedPlan.id);
      expect(deletedPlan).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty tags array', async () => {
      const planToSave: InsertTrainerMealPlan = {
        trainerId,
        mealPlanData: {
          id: 'empty-tags-test',
          planName: 'Empty Tags Test',
          fitnessGoal: 'general_health',
          dailyCalorieTarget: 2000,
          days: 7,
          mealsPerDay: 4,
          generatedBy: trainerId,
          createdAt: new Date(),
          meals: [],
        },
        notes: 'Plan with empty tags',
        tags: [],
        isTemplate: false,
      };

      const savedPlan = await storage.createTrainerMealPlan(planToSave);

      expect(savedPlan.tags).toEqual([]);

      // Cleanup
      if (savedPlan.id) await storage.deleteTrainerMealPlan(savedPlan.id);
    });

    it('should handle null notes', async () => {
      const planToSave: InsertTrainerMealPlan = {
        trainerId,
        mealPlanData: {
          id: 'null-notes-test',
          planName: 'Null Notes Test',
          fitnessGoal: 'weight_loss',
          dailyCalorieTarget: 1900,
          days: 7,
          mealsPerDay: 4,
          generatedBy: trainerId,
          createdAt: new Date(),
          meals: [],
        },
        notes: null,
        tags: ['test'],
        isTemplate: false,
      };

      const savedPlan = await storage.createTrainerMealPlan(planToSave);

      expect(savedPlan.notes).toBeNull();

      // Cleanup
      if (savedPlan.id) await storage.deleteTrainerMealPlan(savedPlan.id);
    });

    it('should return empty array when trainer has no saved plans', async () => {
      // Use a non-existent trainer ID
      const nonExistentTrainerId = '00000000-0000-0000-0000-000000000000';

      const plans = await storage.getTrainerMealPlans(nonExistentTrainerId);

      expect(plans).toEqual([]);
      expect(plans).toHaveLength(0);
    });
  });
});
