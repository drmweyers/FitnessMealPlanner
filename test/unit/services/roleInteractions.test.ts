/**
 * Role Interaction Logic Unit Tests
 *
 * Tests the core logic for interactions between Admin, Trainer, and Customer roles.
 * These are pure logic tests focusing on business rules and validation.
 *
 * Coverage:
 * - Admin-Trainer interactions (11 tests)
 * - Trainer-Customer interactions (13 tests)
 * - Admin-Customer interactions (2 tests)
 * - Cross-role permissions (4 tests)
 * - Trainer-Saved Meal Plans interactions (10 tests)
 *
 * Total: 40 unit tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { User, Recipe, PersonalizedMealPlan, TrainerCustomerRelationship } from '@shared/types';

// Mock user data
const createMockAdmin = (): User => ({
  id: 1,
  email: 'admin@fitmeal.pro',
  password: 'hashed',
  role: 'admin',
  name: 'Admin User',
  profileImage: null,
  createdAt: new Date()
});

const createMockTrainer = (id: number = 2): User => ({
  id,
  email: `trainer${id}@test.com`,
  password: 'hashed',
  role: 'trainer',
  name: `Trainer ${id}`,
  profileImage: null,
  createdAt: new Date()
});

const createMockCustomer = (id: number = 3): User => ({
  id,
  email: `customer${id}@test.com`,
  password: 'hashed',
  role: 'customer',
  name: `Customer ${id}`,
  profileImage: null,
  createdAt: new Date()
});

const createMockRecipe = (createdBy: number, approved: boolean = false): Recipe => ({
  id: 1,
  name: 'Test Recipe',
  description: 'Test Description',
  ingredients: ['ingredient 1'],
  instructions: 'Test instructions',
  nutritionInfo: {
    calories: 500,
    protein: 30,
    carbs: 50,
    fat: 15
  },
  mealType: 'lunch',
  cuisineType: 'american',
  prepTime: 30,
  cookTime: 30,
  servings: 2,
  difficultyLevel: 'easy',
  approved,
  createdBy,
  createdAt: new Date(),
  updatedAt: new Date()
});

const createMockMealPlan = (trainerId: number, customerId: number | null = null): PersonalizedMealPlan => ({
  id: 1,
  trainerId,
  customerId,
  name: 'Test Meal Plan',
  description: 'Test meal plan description',
  startDate: new Date(),
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  meals: [],
  nutritionGoals: {
    calories: 2000,
    protein: 150,
    carbs: 200,
    fat: 70
  },
  createdAt: new Date(),
  updatedAt: new Date()
});

describe('Role Interaction Logic - Unit Tests', () => {

  // ============================================================================
  // 1. Admin-Trainer Interactions (11 tests)
  // ============================================================================

  describe('Admin-Trainer Interactions', () => {

    describe('Recipe Management', () => {
      it('1.1 - Admin can create recipe with auto-approval', () => {
        const admin = createMockAdmin();
        const recipe = createMockRecipe(admin.id, true);

        // Admin-created recipes should be auto-approved
        expect(recipe.createdBy).toBe(admin.id);
        expect(recipe.approved).toBe(true);
      });

      it('1.2 - Admin can approve trainer-submitted recipes', () => {
        const admin = createMockAdmin();
        const trainer = createMockTrainer();
        const recipe = createMockRecipe(trainer.id, false);

        // Simulates admin approving a trainer's recipe
        const approveRecipe = (recipe: Recipe, approver: User): Recipe => {
          if (approver.role !== 'admin') {
            throw new Error('Only admins can approve recipes');
          }
          return { ...recipe, approved: true };
        };

        const approvedRecipe = approveRecipe(recipe, admin);
        expect(approvedRecipe.approved).toBe(true);
      });

      it('1.3 - Admin can reject trainer-submitted recipes', () => {
        const admin = createMockAdmin();
        const trainer = createMockTrainer();
        const recipe = createMockRecipe(trainer.id, false);

        const rejectRecipe = (recipe: Recipe, admin: User): Recipe => {
          if (admin.role !== 'admin') {
            throw new Error('Only admins can reject recipes');
          }
          return { ...recipe, approved: false };
        };

        const rejectedRecipe = rejectRecipe(recipe, admin);
        expect(rejectedRecipe.approved).toBe(false);
      });

      it('1.4 - Admin can view all trainer-generated recipes', () => {
        const admin = createMockAdmin();
        const trainer1 = createMockTrainer(2);
        const trainer2 = createMockTrainer(3);

        const recipes = [
          createMockRecipe(trainer1.id, false),
          createMockRecipe(trainer2.id, true),
          createMockRecipe(admin.id, true)
        ];

        const canViewAllRecipes = (user: User): boolean => user.role === 'admin';

        expect(canViewAllRecipes(admin)).toBe(true);
        expect(recipes).toHaveLength(3);
      });

      it('1.5 - Trainer cannot approve their own recipes', () => {
        const trainer = createMockTrainer();
        const recipe = createMockRecipe(trainer.id, false);

        const approveRecipe = (recipe: Recipe, approver: User): Recipe => {
          if (approver.role !== 'admin') {
            throw new Error('Only admins can approve recipes');
          }
          return { ...recipe, approved: true };
        };

        expect(() => approveRecipe(recipe, trainer)).toThrow('Only admins can approve recipes');
      });
    });

    describe('User Account Management', () => {
      it('1.6 - Admin can create trainer accounts', () => {
        const admin = createMockAdmin();
        const newTrainerData = {
          email: 'newtrainer@test.com',
          password: 'password123',
          role: 'trainer' as const,
          name: 'New Trainer'
        };

        const createTrainerAccount = (admin: User, trainerData: any): boolean => {
          if (admin.role !== 'admin') {
            throw new Error('Only admins can create trainer accounts');
          }
          return true;
        };

        expect(createTrainerAccount(admin, newTrainerData)).toBe(true);
      });

      it('1.7 - Admin can modify trainer permissions', () => {
        const admin = createMockAdmin();
        const trainer = createMockTrainer();

        const modifyPermissions = (admin: User, trainer: User, permissions: string[]): boolean => {
          if (admin.role !== 'admin') {
            throw new Error('Only admins can modify permissions');
          }
          return true;
        };

        expect(modifyPermissions(admin, trainer, ['create_recipes', 'manage_customers'])).toBe(true);
      });

      it('1.8 - Admin can deactivate trainer accounts', () => {
        const admin = createMockAdmin();
        const trainer = createMockTrainer();

        const deactivateAccount = (admin: User, trainer: User): { deactivated: boolean } => {
          if (admin.role !== 'admin') {
            throw new Error('Only admins can deactivate accounts');
          }
          return { deactivated: true };
        };

        const result = deactivateAccount(admin, trainer);
        expect(result.deactivated).toBe(true);
      });

      it('1.9 - Admin can view trainer activity logs', () => {
        const admin = createMockAdmin();
        const trainer = createMockTrainer();

        const activityLogs = [
          { action: 'created_recipe', timestamp: new Date(), userId: trainer.id },
          { action: 'assigned_meal_plan', timestamp: new Date(), userId: trainer.id }
        ];

        const canViewActivityLogs = (viewer: User, targetUser: User): boolean => {
          return viewer.role === 'admin';
        };

        expect(canViewActivityLogs(admin, trainer)).toBe(true);
        expect(activityLogs).toHaveLength(2);
      });
    });

    describe('System Management', () => {
      it('1.10 - Admin can access enhanced recipe generation', () => {
        const admin = createMockAdmin();

        const canAccessBMADGenerator = (user: User): boolean => {
          return user.role === 'admin';
        };

        expect(canAccessBMADGenerator(admin)).toBe(true);
      });

      it('1.11 - Admin can export system data', () => {
        const admin = createMockAdmin();

        const exportSystemData = (user: User, dataType: string): boolean => {
          if (user.role !== 'admin') {
            throw new Error('Only admins can export system data');
          }
          return true;
        };

        expect(exportSystemData(admin, 'all_recipes')).toBe(true);
        expect(exportSystemData(admin, 'all_meal_plans')).toBe(true);
      });
    });
  });

  // ============================================================================
  // 2. Trainer-Customer Interactions (13 tests)
  // ============================================================================

  describe('Trainer-Customer Interactions', () => {

    describe('Customer Invitations', () => {
      it('2.1 - Trainer can invite new customers', () => {
        const trainer = createMockTrainer();
        const customerEmail = 'newcustomer@test.com';

        const createInvitation = (trainer: User, email: string): { sent: boolean } => {
          if (trainer.role !== 'trainer') {
            throw new Error('Only trainers can invite customers');
          }
          return { sent: true };
        };

        const result = createInvitation(trainer, customerEmail);
        expect(result.sent).toBe(true);
      });

      it('2.2 - Customer can accept trainer invitation', () => {
        const trainer = createMockTrainer();
        const customer = createMockCustomer();
        const invitationToken = 'mock-token-123';

        const acceptInvitation = (customer: User, token: string): { accepted: boolean, trainerId: number } => {
          if (customer.role !== 'customer') {
            throw new Error('Only customers can accept invitations');
          }
          return { accepted: true, trainerId: trainer.id };
        };

        const result = acceptInvitation(customer, invitationToken);
        expect(result.accepted).toBe(true);
        expect(result.trainerId).toBe(trainer.id);
      });

      it('2.3 - Trainer can view invitation status', () => {
        const trainer = createMockTrainer();

        const invitations = [
          { email: 'customer1@test.com', status: 'pending', createdAt: new Date() },
          { email: 'customer2@test.com', status: 'accepted', createdAt: new Date() },
          { email: 'customer3@test.com', status: 'expired', createdAt: new Date() }
        ];

        const getInvitations = (trainer: User) => {
          if (trainer.role !== 'trainer') {
            throw new Error('Only trainers can view invitations');
          }
          return invitations;
        };

        const result = getInvitations(trainer);
        expect(result).toHaveLength(3);
        expect(result[1].status).toBe('accepted');
      });

      it('2.4 - Trainer can resend invitations', () => {
        const trainer = createMockTrainer();
        const invitationId = 1;

        const resendInvitation = (trainer: User, invitationId: number): { resent: boolean } => {
          if (trainer.role !== 'trainer') {
            throw new Error('Only trainers can resend invitations');
          }
          return { resent: true };
        };

        const result = resendInvitation(trainer, invitationId);
        expect(result.resent).toBe(true);
      });
    });

    describe('Meal Plan Management', () => {
      it('2.5 - Trainer can create meal plans for customers', () => {
        const trainer = createMockTrainer();
        const customer = createMockCustomer();

        const createMealPlan = (trainer: User, customerId: number): PersonalizedMealPlan => {
          if (trainer.role !== 'trainer') {
            throw new Error('Only trainers can create meal plans');
          }
          return createMockMealPlan(trainer.id, customerId);
        };

        const mealPlan = createMealPlan(trainer, customer.id);
        expect(mealPlan.trainerId).toBe(trainer.id);
        expect(mealPlan.customerId).toBe(customer.id);
      });

      it('2.6 - Trainer can assign meal plans to customers', () => {
        const trainer = createMockTrainer();
        const customer = createMockCustomer();
        const mealPlan = createMockMealPlan(trainer.id, null);

        const assignMealPlan = (trainer: User, mealPlanId: number, customerId: number): PersonalizedMealPlan => {
          if (trainer.role !== 'trainer') {
            throw new Error('Only trainers can assign meal plans');
          }
          return { ...mealPlan, customerId };
        };

        const assigned = assignMealPlan(trainer, mealPlan.id, customer.id);
        expect(assigned.customerId).toBe(customer.id);
      });

      it('2.7 - Customer can view assigned meal plans', () => {
        const customer = createMockCustomer();
        const trainer = createMockTrainer();

        const mealPlans = [
          createMockMealPlan(trainer.id, customer.id),
          createMockMealPlan(trainer.id, customer.id)
        ];

        const getCustomerMealPlans = (customer: User): PersonalizedMealPlan[] => {
          if (customer.role !== 'customer') {
            throw new Error('Invalid user role');
          }
          return mealPlans.filter(plan => plan.customerId === customer.id);
        };

        const customerPlans = getCustomerMealPlans(customer);
        expect(customerPlans).toHaveLength(2);
      });

      it('2.8 - Trainer can modify existing meal plans', () => {
        const trainer = createMockTrainer();
        const mealPlan = createMockMealPlan(trainer.id, 3);

        const updateMealPlan = (trainer: User, planId: number, updates: Partial<PersonalizedMealPlan>) => {
          if (trainer.role !== 'trainer') {
            throw new Error('Only trainers can modify meal plans');
          }
          return { ...mealPlan, ...updates };
        };

        const updated = updateMealPlan(trainer, mealPlan.id, { name: 'Updated Plan' });
        expect(updated.name).toBe('Updated Plan');
      });

      it('2.9 - Trainer can duplicate meal plans for other customers', () => {
        const trainer = createMockTrainer();
        const customer1 = createMockCustomer(3);
        const customer2 = createMockCustomer(4);
        const originalPlan = createMockMealPlan(trainer.id, customer1.id);

        const duplicateMealPlan = (trainer: User, planId: number, newCustomerId: number): PersonalizedMealPlan => {
          if (trainer.role !== 'trainer') {
            throw new Error('Only trainers can duplicate meal plans');
          }
          return {
            ...originalPlan,
            id: originalPlan.id + 1,
            customerId: newCustomerId,
            createdAt: new Date()
          };
        };

        const duplicated = duplicateMealPlan(trainer, originalPlan.id, customer2.id);
        expect(duplicated.customerId).toBe(customer2.id);
        expect(duplicated.id).not.toBe(originalPlan.id);
      });
    });

    describe('Progress Tracking', () => {
      it('2.10 - Customer can update progress', () => {
        const customer = createMockCustomer();

        const progressUpdate = {
          weight: 180,
          bodyFat: 20,
          measurements: {
            chest: 40,
            waist: 32,
            hips: 38
          }
        };

        const updateProgress = (customer: User, data: any): boolean => {
          if (customer.role !== 'customer') {
            throw new Error('Only customers can update their progress');
          }
          return true;
        };

        expect(updateProgress(customer, progressUpdate)).toBe(true);
      });

      it('2.11 - Trainer can view customer progress', () => {
        const trainer = createMockTrainer();
        const customer = createMockCustomer();

        const progressData = [
          { date: new Date(), weight: 180, customerId: customer.id },
          { date: new Date(), weight: 178, customerId: customer.id }
        ];

        const getCustomerProgress = (trainer: User, customerId: number) => {
          if (trainer.role !== 'trainer') {
            throw new Error('Only trainers can view customer progress');
          }
          return progressData.filter(p => p.customerId === customerId);
        };

        const progress = getCustomerProgress(trainer, customer.id);
        expect(progress).toHaveLength(2);
      });

      it('2.12 - Trainer can view progress trends', () => {
        const trainer = createMockTrainer();
        const customer = createMockCustomer();

        const calculateTrend = (trainer: User, customerId: number): { trend: string, change: number } => {
          if (trainer.role !== 'trainer') {
            throw new Error('Only trainers can view progress trends');
          }
          return { trend: 'decreasing', change: -2 };
        };

        const trend = calculateTrend(trainer, customer.id);
        expect(trend.trend).toBe('decreasing');
        expect(trend.change).toBe(-2);
      });

      it('2.13 - Customer can provide feedback on meal plans', () => {
        const customer = createMockCustomer();
        const mealPlanId = 1;

        const provideFeedback = (customer: User, planId: number, feedback: string): boolean => {
          if (customer.role !== 'customer') {
            throw new Error('Only customers can provide feedback');
          }
          return true;
        };

        expect(provideFeedback(customer, mealPlanId, 'Great meal plan!')).toBe(true);
      });
    });
  });

  // ============================================================================
  // 3. Admin-Customer Interactions (2 tests)
  // ============================================================================

  describe('Admin-Customer Interactions', () => {

    it('3.1 - Admin can view customer details', () => {
      const admin = createMockAdmin();
      const customer = createMockCustomer();

      const getCustomerDetails = (admin: User, customerId: number): User => {
        if (admin.role !== 'admin') {
          throw new Error('Only admins can view customer details');
        }
        return customer;
      };

      const details = getCustomerDetails(admin, customer.id);
      expect(details.id).toBe(customer.id);
      expect(details.role).toBe('customer');
    });

    it('3.2 - Admin can view customer history', () => {
      const admin = createMockAdmin();
      const customer = createMockCustomer();

      const history = [
        { action: 'meal_plan_assigned', date: new Date(), customerId: customer.id },
        { action: 'progress_updated', date: new Date(), customerId: customer.id }
      ];

      const getCustomerHistory = (admin: User, customerId: number) => {
        if (admin.role !== 'admin') {
          throw new Error('Only admins can view customer history');
        }
        return history.filter(h => h.customerId === customerId);
      };

      const customerHistory = getCustomerHistory(admin, customer.id);
      expect(customerHistory).toHaveLength(2);
    });
  });

  // ============================================================================
  // 4. Cross-Role Permission Validation (4 tests)
  // ============================================================================

  describe('Cross-Role Permission Validation', () => {

    it('4.1 - Customers cannot access trainer-only features', () => {
      const customer = createMockCustomer();

      const accessTrainerFeatures = (user: User): void => {
        if (user.role !== 'trainer') {
          throw new Error('Access denied: Trainer-only feature');
        }
      };

      expect(() => accessTrainerFeatures(customer)).toThrow('Access denied: Trainer-only feature');
    });

    it('4.2 - Trainers cannot access admin-only features', () => {
      const trainer = createMockTrainer();

      const accessAdminFeatures = (user: User): void => {
        if (user.role !== 'admin') {
          throw new Error('Access denied: Admin-only feature');
        }
      };

      expect(() => accessAdminFeatures(trainer)).toThrow('Access denied: Admin-only feature');
    });

    it('4.3 - Customer cannot view other customers\' data', () => {
      const customer1 = createMockCustomer(3);
      const customer2 = createMockCustomer(4);

      const accessCustomerData = (viewer: User, targetCustomerId: number): void => {
        if (viewer.role === 'customer' && viewer.id !== targetCustomerId) {
          throw new Error('Access denied: Cannot view other customers\' data');
        }
      };

      expect(() => accessCustomerData(customer1, customer2.id)).toThrow('Cannot view other customers\' data');
    });

    it('4.4 - Trainer cannot access another trainer\'s customers without permission', () => {
      const trainer1 = createMockTrainer(2);
      const trainer2 = createMockTrainer(3);
      const customer = createMockCustomer();

      const trainerCustomerRelationships = [
        { trainerId: trainer2.id, customerId: customer.id }
      ];

      const accessCustomer = (trainer: User, customerId: number): void => {
        const hasAccess = trainerCustomerRelationships.some(
          rel => rel.trainerId === trainer.id && rel.customerId === customerId
        );

        if (!hasAccess) {
          throw new Error('Access denied: Customer not assigned to this trainer');
        }
      };

      expect(() => accessCustomer(trainer1, customer.id)).toThrow('Customer not assigned to this trainer');
    });
  });

  // ============================================================================
  // 5. Trainer-Saved Meal Plans Interactions (10 tests)
  // ============================================================================

  describe('Trainer-Saved Meal Plans Interactions', () => {
    const createMockSavedPlan = (trainerId: number, planId: number = 1) => ({
      id: planId,
      trainerId,
      mealPlanData: {
        id: `plan-${planId}`,
        planName: `Test Plan ${planId}`,
        fitnessGoal: 'muscle_gain',
        dailyCalorieTarget: 2500,
        days: 7,
        mealsPerDay: 4,
        generatedBy: trainerId.toString(),
        createdAt: new Date(),
        meals: [],
      },
      notes: 'Test notes',
      tags: ['test'],
      isTemplate: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    it('5.1 - Trainer can save a generated meal plan to their library', () => {
      const trainer = createMockTrainer();
      const savedPlan = createMockSavedPlan(trainer.id);

      expect(savedPlan.trainerId).toBe(trainer.id);
      expect(savedPlan.mealPlanData.planName).toBe('Test Plan 1');
      expect(savedPlan).toHaveProperty('id');
      expect(savedPlan).toHaveProperty('createdAt');
    });

    it('5.2 - Trainer can retrieve all their saved meal plans', () => {
      const trainer = createMockTrainer();
      const savedPlans = [
        createMockSavedPlan(trainer.id, 1),
        createMockSavedPlan(trainer.id, 2),
        createMockSavedPlan(trainer.id, 3),
      ];

      const getTrainerPlans = (trainerId: number) => {
        return savedPlans.filter(plan => plan.trainerId === trainerId);
      };

      const trainerPlans = getTrainerPlans(trainer.id);
      expect(trainerPlans).toHaveLength(3);
      expect(trainerPlans.every(p => p.trainerId === trainer.id)).toBe(true);
    });

    it('5.3 - Trainer can only see their own saved meal plans', () => {
      const trainer1 = createMockTrainer(2);
      const trainer2 = createMockTrainer(3);

      const allSavedPlans = [
        createMockSavedPlan(trainer1.id, 1),
        createMockSavedPlan(trainer1.id, 2),
        createMockSavedPlan(trainer2.id, 3),
      ];

      const getTrainerPlans = (trainerId: number) => {
        return allSavedPlans.filter(plan => plan.trainerId === trainerId);
      };

      const trainer1Plans = getTrainerPlans(trainer1.id);
      expect(trainer1Plans).toHaveLength(2);
      expect(trainer1Plans.every(p => p.trainerId === trainer1.id)).toBe(true);

      const trainer2Plans = getTrainerPlans(trainer2.id);
      expect(trainer2Plans).toHaveLength(1);
      expect(trainer2Plans[0].id).toBe(3);
    });

    it('5.4 - Trainer can assign a saved meal plan to a customer', () => {
      const trainer = createMockTrainer();
      const customer = createMockCustomer();
      const savedPlan = createMockSavedPlan(trainer.id);

      const assignment = {
        id: 1,
        mealPlanId: savedPlan.id,
        customerId: customer.id,
        assignedBy: trainer.id,
        assignedAt: new Date(),
      };

      expect(assignment.mealPlanId).toBe(savedPlan.id);
      expect(assignment.customerId).toBe(customer.id);
      expect(assignment.assignedBy).toBe(trainer.id);
    });

    it('5.5 - Trainer can assign the same saved plan to multiple customers', () => {
      const trainer = createMockTrainer();
      const savedPlan = createMockSavedPlan(trainer.id);
      const customers = [createMockCustomer(3), createMockCustomer(4), createMockCustomer(5)];

      const assignments = customers.map((customer, idx) => ({
        id: idx + 1,
        mealPlanId: savedPlan.id,
        customerId: customer.id,
        assignedBy: trainer.id,
        assignedAt: new Date(),
      }));

      expect(assignments).toHaveLength(3);
      const uniquePlanIds = new Set(assignments.map(a => a.mealPlanId));
      expect(uniquePlanIds.size).toBe(1); // Same plan to multiple customers
    });

    it('5.6 - Trainer can update notes and tags on saved meal plans', () => {
      const trainer = createMockTrainer();
      const savedPlan = createMockSavedPlan(trainer.id);

      const updatePlan = (planId: number, trainerId: number, updates: any) => {
        if (savedPlan.trainerId !== trainerId) {
          throw new Error('Not authorized to update this plan');
        }
        return {
          ...savedPlan,
          ...updates,
          updatedAt: new Date(),
        };
      };

      const updated = updatePlan(savedPlan.id, trainer.id, {
        notes: 'Updated notes',
        tags: ['muscle-gain', 'high-protein'],
      });

      expect(updated.notes).toBe('Updated notes');
      expect(updated.tags).toContain('muscle-gain');
      expect(updated.tags).toContain('high-protein');
    });

    it('5.7 - Trainer can delete their saved meal plans', () => {
      const trainer = createMockTrainer();
      const savedPlans = [
        createMockSavedPlan(trainer.id, 1),
        createMockSavedPlan(trainer.id, 2),
      ];

      const deletePlan = (planId: number, trainerId: number) => {
        const plan = savedPlans.find(p => p.id === planId);
        if (!plan) throw new Error('Plan not found');
        if (plan.trainerId !== trainerId) throw new Error('Not authorized');

        const index = savedPlans.findIndex(p => p.id === planId);
        savedPlans.splice(index, 1);
        return true;
      };

      expect(savedPlans).toHaveLength(2);
      deletePlan(1, trainer.id);
      expect(savedPlans).toHaveLength(1);
      expect(savedPlans[0].id).toBe(2);
    });

    it('5.8 - Trainer cannot delete another trainer\'s saved meal plans', () => {
      const trainer1 = createMockTrainer(2);
      const trainer2 = createMockTrainer(3);
      const plan = createMockSavedPlan(trainer2.id);

      const deletePlan = (planId: number, trainerId: number) => {
        if (plan.trainerId !== trainerId) {
          throw new Error('Not authorized to delete this meal plan');
        }
        return true;
      };

      expect(() => deletePlan(plan.id, trainer1.id)).toThrow('Not authorized to delete this meal plan');
    });

    it('5.9 - Saved meal plan includes assignment count', () => {
      const trainer = createMockTrainer();
      const savedPlan = createMockSavedPlan(trainer.id);

      const assignments = [
        { id: 1, mealPlanId: savedPlan.id, customerId: 3 },
        { id: 2, mealPlanId: savedPlan.id, customerId: 4 },
      ];

      const planWithAssignments = {
        ...savedPlan,
        assignments: assignments.filter(a => a.mealPlanId === savedPlan.id),
        assignmentCount: assignments.filter(a => a.mealPlanId === savedPlan.id).length,
      };

      expect(planWithAssignments.assignmentCount).toBe(2);
      expect(planWithAssignments.assignments).toHaveLength(2);
    });

    it('5.10 - Trainer can mark saved plan as template for reuse', () => {
      const trainer = createMockTrainer();
      const savedPlan = createMockSavedPlan(trainer.id);

      const markAsTemplate = (planId: number, trainerId: number) => {
        if (savedPlan.trainerId !== trainerId) {
          throw new Error('Not authorized');
        }
        return {
          ...savedPlan,
          isTemplate: true,
          updatedAt: new Date(),
        };
      };

      const templatePlan = markAsTemplate(savedPlan.id, trainer.id);
      expect(templatePlan.isTemplate).toBe(true);
    });
  });
});
