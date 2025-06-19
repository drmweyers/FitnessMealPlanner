import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { storage } from '../server/storage';
import type { InsertRecipe, Recipe } from '@shared/schema';

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
      expect(typeof stats.avgRating).toBe('number');
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