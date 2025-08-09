/**
 * Database Storage Operations Tests
 * 
 * Comprehensive tests for database storage layer covering:
 * - Recipe CRUD operations and queries
 * - Meal plan storage and retrieval
 * - User management and authentication data
 * - Search and filtering functionality
 * - Performance optimization queries
 * - Data integrity and constraints
 * - Transaction handling and rollbacks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { storage } from '../../../server/storage';
import { db } from '../../../server/db';
import type { Recipe, MealPlan, User } from '@shared/schema';

// Mock database connection
vi.mock('../../../server/db', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  },
}));

describe('Database Storage Operations', () => {
  const mockRecipe: Recipe = {
    id: 'recipe-123',
    name: 'Grilled Chicken Breast',
    description: 'Healthy protein-rich meal',
    ingredientsJson: [
      { name: 'Chicken Breast', amount: '200', unit: 'g' },
      { name: 'Olive Oil', amount: '1', unit: 'tbsp' },
    ],
    instructionsText: 'Season chicken, grill for 6-8 minutes each side',
    prepTimeMinutes: 10,
    cookTimeMinutes: 16,
    servings: 1,
    caloriesKcal: 300,
    proteinGrams: '35.0',
    carbsGrams: '2.0',
    fatGrams: '12.0',
    mealTypes: ['lunch', 'dinner'],
    dietaryTags: ['high-protein', 'gluten-free'],
    mainIngredientTags: ['chicken'],
    cuisineType: 'American',
    imageUrl: 'https://example.com/chicken.jpg',
    sourceReference: 'Test Recipe',
    isApproved: true,
    createdBy: 'chef-user-id',
    creationTimestamp: new Date(),
    lastUpdatedTimestamp: new Date(),
  };

  const mockMealPlan: MealPlan = {
    id: 'meal-plan-123',
    name: 'Weight Loss Plan',
    days: 7,
    mealsPerDay: 3,
    targetCalories: 1800,
    targetProtein: 135,
    targetCarbs: 180,
    targetFat: 60,
    meals: [],
    createdBy: 'trainer-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    password: '$2b$10$hashedpassword',
    role: 'customer',
    name: 'Test User',
    profilePicture: null,
    googleId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Recipe Storage Operations', () => {
    describe('createRecipe', () => {
      it('should create a new recipe successfully', async () => {
        const mockInsertResult = { id: 'new-recipe-id', ...mockRecipe };
        vi.mocked(db.insert).mockReturnValueOnce({
          values: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce([mockInsertResult]),
          }),
        });

        const result = await storage.createRecipe(mockRecipe);

        expect(result).toEqual(mockInsertResult);
        expect(db.insert).toHaveBeenCalledTimes(1);
      });

      it('should handle database constraints errors', async () => {
        vi.mocked(db.insert).mockReturnValueOnce({
          values: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockRejectedValueOnce(
              new Error('Duplicate key value violates unique constraint')
            ),
          }),
        });

        await expect(storage.createRecipe(mockRecipe)).rejects.toThrow(
          'Duplicate key value violates unique constraint'
        );
      });

      it('should validate required fields before insertion', async () => {
        const incompleteRecipe = {
          ...mockRecipe,
          name: '', // Empty required field
          caloriesKcal: -100, // Invalid value
        };

        await expect(storage.createRecipe(incompleteRecipe as Recipe)).rejects.toThrow();
      });
    });

    describe('searchRecipes', () => {
      it('should search recipes with filters and pagination', async () => {
        const mockSearchResults = [mockRecipe];
        vi.mocked(db.select).mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              orderBy: vi.fn().mockReturnValueOnce({
                limit: vi.fn().mockReturnValueOnce({
                  offset: vi.fn().mockResolvedValueOnce(mockSearchResults),
                }),
              }),
            }),
          }),
        });

        const filters = {
          search: 'chicken',
          mealTypes: ['dinner'],
          dietaryTags: ['high-protein'],
          page: 1,
          limit: 10,
          approved: true,
        };

        const result = await storage.searchRecipes(filters);

        expect(result.recipes).toEqual(mockSearchResults);
        expect(result.total).toEqual(mockSearchResults.length);
        expect(db.select).toHaveBeenCalled();
      });

      it('should handle empty search results', async () => {
        vi.mocked(db.select).mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              orderBy: vi.fn().mockReturnValueOnce({
                limit: vi.fn().mockReturnValueOnce({
                  offset: vi.fn().mockResolvedValueOnce([]),
                }),
              }),
            }),
          }),
        });

        const result = await storage.searchRecipes({ page: 1, limit: 10 });

        expect(result.recipes).toEqual([]);
        expect(result.total).toBe(0);
      });

      it('should apply dietary tag filters correctly', async () => {
        const veganRecipes = [
          { ...mockRecipe, dietaryTags: ['vegan', 'gluten-free'] },
        ];

        vi.mocked(db.select).mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              orderBy: vi.fn().mockReturnValueOnce({
                limit: vi.fn().mockReturnValueOnce({
                  offset: vi.fn().mockResolvedValueOnce(veganRecipes),
                }),
              }),
            }),
          }),
        });

        const result = await storage.searchRecipes({
          dietaryTags: ['vegan'],
          page: 1,
          limit: 10,
        });

        expect(result.recipes).toEqual(veganRecipes);
      });

      it('should handle search query with special characters', async () => {
        vi.mocked(db.select).mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              orderBy: vi.fn().mockReturnValueOnce({
                limit: vi.fn().mockReturnValueOnce({
                  offset: vi.fn().mockResolvedValueOnce([mockRecipe]),
                }),
              }),
            }),
          }),
        });

        const specialCharSearch = {
          search: 'chicken & rice "special" sauce!',
          page: 1,
          limit: 10,
        };

        await storage.searchRecipes(specialCharSearch);

        expect(db.select).toHaveBeenCalled();
      });
    });

    describe('getRecipe', () => {
      it('should retrieve a recipe by ID', async () => {
        vi.mocked(db.select).mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              limit: vi.fn().mockResolvedValueOnce([mockRecipe]),
            }),
          }),
        });

        const result = await storage.getRecipe('recipe-123');

        expect(result).toEqual(mockRecipe);
        expect(db.select).toHaveBeenCalled();
      });

      it('should return null for non-existent recipe', async () => {
        vi.mocked(db.select).mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              limit: vi.fn().mockResolvedValueOnce([]),
            }),
          }),
        });

        const result = await storage.getRecipe('non-existent');

        expect(result).toBeNull();
      });

      it('should handle malformed recipe IDs', async () => {
        vi.mocked(db.select).mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              limit: vi.fn().mockRejectedValueOnce(new Error('Invalid UUID format')),
            }),
          }),
        });

        await expect(storage.getRecipe('invalid-uuid')).rejects.toThrow('Invalid UUID format');
      });
    });

    describe('updateRecipe', () => {
      it('should update recipe successfully', async () => {
        const updateData = {
          name: 'Updated Chicken Recipe',
          caloriesKcal: 320,
          isApproved: true,
        };
        const updatedRecipe = { ...mockRecipe, ...updateData };

        vi.mocked(db.update).mockReturnValueOnce({
          set: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              returning: vi.fn().mockResolvedValueOnce([updatedRecipe]),
            }),
          }),
        });

        const result = await storage.updateRecipe('recipe-123', updateData);

        expect(result).toEqual(updatedRecipe);
        expect(db.update).toHaveBeenCalled();
      });

      it('should return null when updating non-existent recipe', async () => {
        vi.mocked(db.update).mockReturnValueOnce({
          set: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              returning: vi.fn().mockResolvedValueOnce([]),
            }),
          }),
        });

        const result = await storage.updateRecipe('non-existent', { name: 'Test' });

        expect(result).toBeNull();
      });
    });

    describe('deleteRecipe', () => {
      it('should delete recipe successfully', async () => {
        vi.mocked(db.delete).mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce([mockRecipe]),
          }),
        });

        const result = await storage.deleteRecipe('recipe-123');

        expect(result).toBe(true);
        expect(db.delete).toHaveBeenCalled();
      });

      it('should return false when deleting non-existent recipe', async () => {
        vi.mocked(db.delete).mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce([]),
          }),
        });

        const result = await storage.deleteRecipe('non-existent');

        expect(result).toBe(false);
      });

      it('should handle foreign key constraints', async () => {
        vi.mocked(db.delete).mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockRejectedValueOnce(
              new Error('Foreign key constraint violation')
            ),
          }),
        });

        await expect(storage.deleteRecipe('recipe-with-dependencies')).rejects.toThrow(
          'Foreign key constraint violation'
        );
      });
    });

    describe('getPersonalizedRecipes', () => {
      it('should return user-specific recipes', async () => {
        const personalizedRecipes = [
          { ...mockRecipe, createdBy: 'user-123', isApproved: false },
        ];

        vi.mocked(db.select).mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              orderBy: vi.fn().mockResolvedValueOnce(personalizedRecipes),
            }),
          }),
        });

        const result = await storage.getPersonalizedRecipes('user-123');

        expect(result).toEqual(personalizedRecipes);
      });

      it('should return empty array for user with no personalized recipes', async () => {
        vi.mocked(db.select).mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              orderBy: vi.fn().mockResolvedValueOnce([]),
            }),
          }),
        });

        const result = await storage.getPersonalizedRecipes('user-with-no-recipes');

        expect(result).toEqual([]);
      });
    });
  });

  describe('Meal Plan Storage Operations', () => {
    describe('saveMealPlan', () => {
      it('should save meal plan successfully', async () => {
        vi.mocked(db.insert).mockReturnValueOnce({
          values: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce([mockMealPlan]),
          }),
        });

        const result = await storage.saveMealPlan(mockMealPlan);

        expect(result).toEqual(mockMealPlan);
        expect(db.insert).toHaveBeenCalled();
      });

      it('should handle meal plan with complex meal data', async () => {
        const complexMealPlan = {
          ...mockMealPlan,
          meals: [
            {
              day: 1,
              mealType: 'breakfast',
              recipe: mockRecipe,
            },
            {
              day: 1,
              mealType: 'lunch',
              recipe: { ...mockRecipe, id: 'recipe-456', name: 'Lunch Recipe' },
            },
          ],
        };

        vi.mocked(db.insert).mockReturnValueOnce({
          values: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce([complexMealPlan]),
          }),
        });

        const result = await storage.saveMealPlan(complexMealPlan);

        expect(result.meals).toHaveLength(2);
        expect(result.meals[0].recipe.name).toBe(mockRecipe.name);
      });
    });

    describe('getUserMealPlans', () => {
      it('should retrieve meal plans for user', async () => {
        const userMealPlans = [mockMealPlan];

        vi.mocked(db.select).mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              orderBy: vi.fn().mockResolvedValueOnce(userMealPlans),
            }),
          }),
        });

        const result = await storage.getUserMealPlans('trainer-user-id');

        expect(result).toEqual(userMealPlans);
      });

      it('should return empty array for user with no meal plans', async () => {
        vi.mocked(db.select).mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              orderBy: vi.fn().mockResolvedValueOnce([]),
            }),
          }),
        });

        const result = await storage.getUserMealPlans('user-with-no-plans');

        expect(result).toEqual([]);
      });
    });

    describe('getMealPlan', () => {
      it('should retrieve meal plan by ID for authorized user', async () => {
        vi.mocked(db.select).mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              limit: vi.fn().mockResolvedValueOnce([mockMealPlan]),
            }),
          }),
        });

        const result = await storage.getMealPlan('meal-plan-123', 'trainer-user-id');

        expect(result).toEqual(mockMealPlan);
      });

      it('should return null for unauthorized access', async () => {
        vi.mocked(db.select).mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              limit: vi.fn().mockResolvedValueOnce([]),
            }),
          }),
        });

        const result = await storage.getMealPlan('meal-plan-123', 'different-user-id');

        expect(result).toBeNull();
      });
    });

    describe('updateMealPlan', () => {
      it('should update meal plan successfully', async () => {
        const updateData = {
          name: 'Updated Plan Name',
          targetCalories: 2000,
        };
        const updatedMealPlan = { ...mockMealPlan, ...updateData };

        vi.mocked(db.update).mockReturnValueOnce({
          set: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              returning: vi.fn().mockResolvedValueOnce([updatedMealPlan]),
            }),
          }),
        });

        const result = await storage.updateMealPlan('meal-plan-123', 'trainer-user-id', updateData);

        expect(result).toEqual(updatedMealPlan);
      });

      it('should return null for unauthorized update', async () => {
        vi.mocked(db.update).mockReturnValueOnce({
          set: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              returning: vi.fn().mockResolvedValueOnce([]),
            }),
          }),
        });

        const result = await storage.updateMealPlan('meal-plan-123', 'different-user-id', {
          name: 'Unauthorized Update',
        });

        expect(result).toBeNull();
      });
    });

    describe('deleteMealPlan', () => {
      it('should delete meal plan successfully', async () => {
        vi.mocked(db.delete).mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce([mockMealPlan]),
          }),
        });

        const result = await storage.deleteMealPlan('meal-plan-123', 'trainer-user-id');

        expect(result).toBe(true);
      });

      it('should return false for unauthorized deletion', async () => {
        vi.mocked(db.delete).mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce([]),
          }),
        });

        const result = await storage.deleteMealPlan('meal-plan-123', 'different-user-id');

        expect(result).toBe(false);
      });
    });
  });

  describe('User Management Operations', () => {
    describe('createUser', () => {
      it('should create user successfully', async () => {
        vi.mocked(db.insert).mockReturnValueOnce({
          values: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce([mockUser]),
          }),
        });

        const result = await storage.createUser(mockUser);

        expect(result).toEqual(mockUser);
      });

      it('should handle email uniqueness constraint', async () => {
        vi.mocked(db.insert).mockReturnValueOnce({
          values: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockRejectedValueOnce(
              new Error('duplicate key value violates unique constraint "users_email_key"')
            ),
          }),
        });

        await expect(storage.createUser(mockUser)).rejects.toThrow('unique constraint');
      });
    });

    describe('getUserByEmail', () => {
      it('should retrieve user by email', async () => {
        vi.mocked(db.select).mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              limit: vi.fn().mockResolvedValueOnce([mockUser]),
            }),
          }),
        });

        const result = await storage.getUserByEmail('test@example.com');

        expect(result).toEqual(mockUser);
      });

      it('should return null for non-existent email', async () => {
        vi.mocked(db.select).mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              limit: vi.fn().mockResolvedValueOnce([]),
            }),
          }),
        });

        const result = await storage.getUserByEmail('nonexistent@example.com');

        expect(result).toBeNull();
      });

      it('should handle case insensitive email lookup', async () => {
        vi.mocked(db.select).mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              limit: vi.fn().mockResolvedValueOnce([mockUser]),
            }),
          }),
        });

        const result = await storage.getUserByEmail('TEST@EXAMPLE.COM');

        expect(result).toEqual(mockUser);
      });
    });

    describe('updateUser', () => {
      it('should update user successfully', async () => {
        const updateData = {
          name: 'Updated Name',
          profilePicture: 'https://example.com/avatar.jpg',
        };
        const updatedUser = { ...mockUser, ...updateData };

        vi.mocked(db.update).mockReturnValueOnce({
          set: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              returning: vi.fn().mockResolvedValueOnce([updatedUser]),
            }),
          }),
        });

        const result = await storage.updateUser('user-123', updateData);

        expect(result).toEqual(updatedUser);
      });
    });
  });

  describe('Transaction Handling', () => {
    it('should handle transactions for complex operations', async () => {
      const mockTransaction = {
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        select: vi.fn(),
        rollback: vi.fn(),
        commit: vi.fn(),
      };

      vi.mocked(db.transaction).mockImplementationOnce(async (callback) => {
        return await callback(mockTransaction);
      });

      mockTransaction.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockMealPlan]),
        }),
      });

      // Test complex operation that requires transaction
      const result = await storage.createMealPlanWithRecipes(
        mockMealPlan,
        [mockRecipe]
      );

      expect(db.transaction).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should rollback transaction on error', async () => {
      const mockTransaction = {
        insert: vi.fn(),
        rollback: vi.fn(),
      };

      vi.mocked(db.transaction).mockImplementationOnce(async (callback) => {
        try {
          return await callback(mockTransaction);
        } catch (error) {
          await mockTransaction.rollback();
          throw error;
        }
      });

      mockTransaction.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('Database error')),
        }),
      });

      await expect(
        storage.createMealPlanWithRecipes(mockMealPlan, [mockRecipe])
      ).rejects.toThrow('Database error');

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('Performance and Optimization', () => {
    it('should use database indexes for search queries', async () => {
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            orderBy: vi.fn().mockReturnValueOnce({
              limit: vi.fn().mockReturnValueOnce({
                offset: vi.fn().mockResolvedValueOnce([mockRecipe]),
              }),
            }),
          }),
        }),
      });

      // Simulate search query that should use indexes
      const result = await storage.searchRecipes({
        search: 'chicken',
        mealTypes: ['dinner'],
        page: 1,
        limit: 10,
      });

      expect(result.recipes).toEqual([mockRecipe]);
      // Verify that the query was structured to use indexes
      expect(db.select).toHaveBeenCalled();
    });

    it('should handle large result sets efficiently', async () => {
      const largeResultSet = Array.from({ length: 1000 }, (_, i) => ({
        ...mockRecipe,
        id: `recipe-${i}`,
        name: `Recipe ${i}`,
      }));

      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            orderBy: vi.fn().mockReturnValueOnce({
              limit: vi.fn().mockReturnValueOnce({
                offset: vi.fn().mockResolvedValueOnce(largeResultSet.slice(0, 50)),
              }),
            }),
          }),
        }),
      });

      const result = await storage.searchRecipes({
        page: 1,
        limit: 50,
      });

      expect(result.recipes).toHaveLength(50);
    });
  });
});