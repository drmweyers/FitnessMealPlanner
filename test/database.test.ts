import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { storage } from '../server/storage';
import type { InsertRecipe, Recipe } from '../shared/schema';

describe('Database Operations', () => {
  let testRecipeId: string;
  
  const mockRecipe: InsertRecipe = {
    name: 'Test Recipe',
    description: 'A test recipe for unit testing',
    mealTypes: ['breakfast'],
    dietaryTags: ['vegetarian'],
    mainIngredientTags: ['eggs'],
    ingredientsJson: [
      { name: 'Eggs', amount: '2', unit: 'pieces' },
      { name: 'Salt', amount: '1', unit: 'pinch' }
    ],
    instructionsText: '1. Crack eggs\n2. Add salt\n3. Cook',
    prepTimeMinutes: 5,
    cookTimeMinutes: 10,
    servings: 2,
    caloriesKcal: 200,
    proteinGrams: '15.50',
    carbsGrams: '2.00',
    fatGrams: '12.00',
    imageUrl: 'https://example.com/test-image.jpg',
    sourceReference: 'Test Source',
    isApproved: false
  };

  describe('Recipe CRUD Operations', () => {
    it('should create a new recipe', async () => {
      const recipe = await storage.createRecipe(mockRecipe);
      
      expect(recipe).toBeDefined();
      expect(recipe.id).toBeDefined();
      expect(recipe.name).toBe(mockRecipe.name);
      expect(recipe.description).toBe(mockRecipe.description);
      expect(recipe.mealTypes).toEqual(mockRecipe.mealTypes);
      expect(recipe.dietaryTags).toEqual(mockRecipe.dietaryTags);
      expect(recipe.ingredientsJson).toEqual(mockRecipe.ingredientsJson);
      expect(recipe.caloriesKcal).toBe(mockRecipe.caloriesKcal);
      expect(recipe.isApproved).toBe(false);
      
      testRecipeId = recipe.id;
    });

    it('should retrieve a recipe by ID', async () => {
      const recipe = await storage.getRecipe(testRecipeId);
      
      expect(recipe).toBeDefined();
      expect(recipe!.id).toBe(testRecipeId);
      expect(recipe!.name).toBe(mockRecipe.name);
    });

    it('should update a recipe', async () => {
      const updates = {
        name: 'Updated Test Recipe',
        description: 'Updated description',
        caloriesKcal: 250
      };
      
      const updatedRecipe = await storage.updateRecipe(testRecipeId, updates);
      
      expect(updatedRecipe).toBeDefined();
      expect(updatedRecipe!.name).toBe(updates.name);
      expect(updatedRecipe!.description).toBe(updates.description);
      expect(updatedRecipe!.caloriesKcal).toBe(updates.caloriesKcal);
      expect(updatedRecipe!.lastUpdatedTimestamp).toBeDefined();
    });

    it('should approve a recipe', async () => {
      const approvedRecipe = await storage.approveRecipe(testRecipeId);
      
      expect(approvedRecipe).toBeDefined();
      expect(approvedRecipe!.isApproved).toBe(true);
    });

    it('should search recipes with filters', async () => {
      const filters = {
        search: 'Updated Test',
        approved: true,
        page: 1,
        limit: 10
      };
      
      const result = await storage.searchRecipes(filters);
      
      expect(result).toBeDefined();
      expect(result.recipes).toBeDefined();
      expect(result.total).toBeDefined();
      expect(Array.isArray(result.recipes)).toBe(true);
      expect(typeof result.total).toBe('number');
      
      // Should find our updated recipe
      const foundRecipe = result.recipes.find(r => r.id === testRecipeId);
      expect(foundRecipe).toBeDefined();
      expect(foundRecipe!.name).toContain('Updated Test');
    });

    it('should filter recipes by meal type', async () => {
      const filters = {
        mealType: 'breakfast',
        approved: true,
        page: 1,
        limit: 10
      };
      
      const result = await storage.searchRecipes(filters);
      
      expect(result.recipes).toBeDefined();
      if (result.recipes.length > 0) {
        result.recipes.forEach(recipe => {
          expect(recipe.mealTypes).toContain('breakfast');
        });
      }
    });

    it('should filter recipes by calorie range', async () => {
      const filters = {
        minCalories: 200,
        maxCalories: 300,
        approved: true,
        page: 1,
        limit: 10
      };
      
      const result = await storage.searchRecipes(filters);
      
      expect(result.recipes).toBeDefined();
      result.recipes.forEach(recipe => {
        expect(recipe.caloriesKcal).toBeGreaterThanOrEqual(200);
        expect(recipe.caloriesKcal).toBeLessThanOrEqual(300);
      });
    });

    it('should get recipe statistics', async () => {
      const stats = await storage.getRecipeStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.total).toBe('number');
      expect(typeof stats.approved).toBe('number');
      expect(typeof stats.pending).toBe('number');
      expect(stats.total).toBeGreaterThanOrEqual(stats.approved + stats.pending);
    });

    it('should delete a recipe', async () => {
      const deleted = await storage.deleteRecipe(testRecipeId);
      
      expect(deleted).toBe(true);
      
      // Verify recipe is deleted
      const recipe = await storage.getRecipe(testRecipeId);
      expect(recipe).toBeUndefined();
    });

    it('should return undefined for non-existent recipe', async () => {
      const recipe = await storage.getRecipe('non-existent-id');
      expect(recipe).toBeUndefined();
    });

    it('should return false when deleting non-existent recipe', async () => {
      const deleted = await storage.deleteRecipe('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('User Operations', () => {
    const mockUser = {
      id: 'test-user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      profileImageUrl: 'https://example.com/avatar.jpg'
    };

    it('should create/upsert a user', async () => {
      const user = await storage.upsertUser(mockUser);
      
      expect(user).toBeDefined();
      expect(user.id).toBe(mockUser.id);
      expect(user.email).toBe(mockUser.email);
      expect(user.firstName).toBe(mockUser.firstName);
      expect(user.lastName).toBe(mockUser.lastName);
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    it('should retrieve a user by ID', async () => {
      const user = await storage.getUser(mockUser.id);
      
      expect(user).toBeDefined();
      expect(user!.id).toBe(mockUser.id);
      expect(user!.email).toBe(mockUser.email);
    });

    it('should update existing user on upsert', async () => {
      const updatedUser = {
        ...mockUser,
        firstName: 'Updated',
        lastName: 'Name'
      };
      
      const user = await storage.upsertUser(updatedUser);
      
      expect(user.firstName).toBe('Updated');
      expect(user.lastName).toBe('Name');
      expect(user.updatedAt).toBeDefined();
    });

    it('should return undefined for non-existent user', async () => {
      const user = await storage.getUser('non-existent-user');
      expect(user).toBeUndefined();
    });
  });

  describe('Trainer Meal Plan Operations', () => {
    let testTrainerId: string;
    let testMealPlanId: string;
    let testCustomerId: string;

    const mockTrainer = {
      id: 'trainer-test-123',
      email: 'trainer@test.com',
      firstName: 'Test',
      lastName: 'Trainer',
      role: 'trainer',
      profileImageUrl: 'https://example.com/trainer.jpg'
    };

    const mockCustomer = {
      id: 'customer-test-456',
      email: 'customer@test.com',
      firstName: 'Test',
      lastName: 'Customer',
      role: 'customer',
      profileImageUrl: 'https://example.com/customer.jpg'
    };

    const mockMealPlanData = {
      planName: 'Test Trainer Meal Plan',
      days: 7,
      mealsPerDay: 3,
      dailyCalorieTarget: 2000,
      fitnessGoal: 'weight_loss',
      description: 'A test meal plan for trainer functionality',
      clientName: 'Test Client',
      meals: []
    };

    beforeEach(async () => {
      // Create test trainer and customer
      const trainer = await storage.createUser(mockTrainer);
      const customer = await storage.createUser(mockCustomer);
      testTrainerId = trainer.id;
      testCustomerId = customer.id;
    });

    it('should save a meal plan to trainer library', async () => {
      const mealPlanData = {
        trainerId: testTrainerId,
        mealPlanData: mockMealPlanData,
        isTemplate: false,
        tags: ['weight-loss', 'test'],
        notes: 'Test meal plan notes'
      };

      const savedPlan = await storage.createTrainerMealPlan(mealPlanData);

      expect(savedPlan).toBeDefined();
      expect(savedPlan.id).toBeDefined();
      expect(savedPlan.trainerId).toBe(testTrainerId);
      expect(savedPlan.mealPlanData).toEqual(mockMealPlanData);
      expect(savedPlan.isTemplate).toBe(false);
      expect(savedPlan.tags).toEqual(['weight-loss', 'test']);
      expect(savedPlan.notes).toBe('Test meal plan notes');
      expect(savedPlan.createdAt).toBeDefined();
      expect(savedPlan.updatedAt).toBeDefined();

      testMealPlanId = savedPlan.id;
    });

    it('should retrieve trainer meal plans', async () => {
      const mealPlans = await storage.getTrainerMealPlans(testTrainerId);

      expect(Array.isArray(mealPlans)).toBe(true);
      expect(mealPlans.length).toBeGreaterThan(0);
      
      const foundPlan = mealPlans.find(p => p.id === testMealPlanId);
      expect(foundPlan).toBeDefined();
      expect(foundPlan!.trainerId).toBe(testTrainerId);
    });

    it('should retrieve a specific trainer meal plan', async () => {
      const mealPlan = await storage.getTrainerMealPlan(testMealPlanId);

      expect(mealPlan).toBeDefined();
      expect(mealPlan!.id).toBe(testMealPlanId);
      expect(mealPlan!.trainerId).toBe(testTrainerId);
      expect(mealPlan!.mealPlanData.planName).toBe(mockMealPlanData.planName);
    });

    it('should update trainer meal plan', async () => {
      const updateData = {
        notes: 'Updated notes',
        tags: ['updated', 'weight-loss'],
        isTemplate: true
      };

      const updatedPlan = await storage.updateTrainerMealPlan(testMealPlanId, updateData);

      expect(updatedPlan).toBeDefined();
      expect(updatedPlan!.notes).toBe('Updated notes');
      expect(updatedPlan!.tags).toEqual(['updated', 'weight-loss']);
      expect(updatedPlan!.isTemplate).toBe(true);
      expect(updatedPlan!.updatedAt).toBeDefined();
    });

    it('should assign meal plan to customer', async () => {
      const assignment = await storage.assignMealPlanToCustomer(testMealPlanId, testCustomerId, testTrainerId);

      expect(assignment).toBeDefined();
      expect(assignment.mealPlanId).toBe(testMealPlanId);
      expect(assignment.customerId).toBe(testCustomerId);
      expect(assignment.assignedAt).toBeDefined();
    });

    it('should get meal plan assignments', async () => {
      const assignments = await storage.getMealPlanAssignments(testMealPlanId);

      expect(Array.isArray(assignments)).toBe(true);
      expect(assignments.length).toBeGreaterThan(0);
      
      const assignment = assignments[0];
      expect(assignment.mealPlanId).toBe(testMealPlanId);
      expect(assignment.customerId).toBe(testCustomerId);
    });

    it('should get trainer customers', async () => {
      const customers = await storage.getTrainerCustomers(testTrainerId);

      expect(Array.isArray(customers)).toBe(true);
      expect(customers.length).toBeGreaterThan(0);
      
      const customer = customers.find(c => c.id === testCustomerId);
      expect(customer).toBeDefined();
      expect(customer!.email).toBe(mockCustomer.email);
      expect(customer!.firstAssignedAt).toBeDefined();
    });

    it('should get customer meal plans for trainer', async () => {
      const customerPlans = await storage.getCustomerMealPlans(testTrainerId, testCustomerId);

      expect(Array.isArray(customerPlans)).toBe(true);
      expect(customerPlans.length).toBeGreaterThan(0);
      
      const plan = customerPlans[0];
      expect(plan.customerId).toBe(testCustomerId);
    });

    it('should remove meal plan assignment', async () => {
      // Get the assignment ID
      const assignments = await storage.getMealPlanAssignments(testMealPlanId);
      const assignmentId = assignments[0].id;

      const removed = await storage.removeMealPlanAssignment(testTrainerId, assignmentId);

      expect(removed).toBe(true);

      // Verify assignment is removed
      const updatedAssignments = await storage.getMealPlanAssignments(testMealPlanId);
      expect(updatedAssignments.length).toBe(0);
    });

    it('should delete trainer meal plan', async () => {
      const deleted = await storage.deleteTrainerMealPlan(testMealPlanId);

      expect(deleted).toBe(true);

      // Verify meal plan is deleted
      const mealPlan = await storage.getTrainerMealPlan(testMealPlanId);
      expect(mealPlan).toBeUndefined();
    });

    it('should filter meal plans by template status', async () => {
      // Create a template plan
      const templateData = {
        trainerId: testTrainerId,
        mealPlanData: { ...mockMealPlanData, planName: 'Template Plan' },
        isTemplate: true,
        tags: ['template'],
        notes: 'Template plan'
      };

      const templatePlan = await storage.saveTrainerMealPlan(templateData);

      // Get only template plans
      const templatePlans = await storage.getTrainerMealPlans(testTrainerId, { isTemplate: true });

      expect(templatePlans.length).toBeGreaterThan(0);
      expect(templatePlans.every(p => p.isTemplate)).toBe(true);

      // Clean up
      await storage.deleteTrainerMealPlan(templatePlan.id);
    });

    it('should handle meal plans with no assignments', async () => {
      const mealPlanData = {
        trainerId: testTrainerId,
        mealPlanData: { ...mockMealPlanData, planName: 'Unassigned Plan' },
        isTemplate: false,
        tags: ['unassigned'],
        notes: 'No assignments'
      };

      const savedPlan = await storage.createTrainerMealPlan(mealPlanData);
      const assignments = await storage.getMealPlanAssignments(savedPlan.id);

      expect(assignments).toEqual([]);

      // Clean up
      await storage.deleteTrainerMealPlan(savedPlan.id);
    });

    it('should return null for non-existent trainer meal plan', async () => {
      const mealPlan = await storage.getTrainerMealPlan('non-existent-id');
      expect(mealPlan).toBeUndefined();
    });

    it('should return false when deleting non-existent trainer meal plan', async () => {
      const deleted = await storage.deleteTrainerMealPlan('non-existent-id');
      expect(deleted).toBe(false);
    });

    it('should return false when removing non-existent assignment', async () => {
      const removed = await storage.removeMealPlanAssignment(testTrainerId, 'non-existent-assignment');
      expect(removed).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty search results', async () => {
      const filters = {
        search: 'definitely-does-not-exist-recipe-name-12345',
        page: 1,
        limit: 10
      };
      
      const result = await storage.searchRecipes(filters);
      
      expect(result.recipes).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should handle pagination beyond available results', async () => {
      const filters = {
        page: 9999,
        limit: 10
      };
      
      const result = await storage.searchRecipes(filters);
      
      expect(result.recipes).toEqual([]);
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('should handle recipe updates with partial data', async () => {
      // Create a recipe first
      const recipe = await storage.createRecipe(mockRecipe);
      
      // Update with only name
      const updated = await storage.updateRecipe(recipe.id, { name: 'Partially Updated' });
      
      expect(updated).toBeDefined();
      expect(updated!.name).toBe('Partially Updated');
      expect(updated!.description).toBe(mockRecipe.description); // Should remain unchanged
      
      // Clean up
      await storage.deleteRecipe(recipe.id);
    });
  });
});