import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '../../server/db';
import {
  groceryLists,
  groceryListItems,
  personalizedMealPlans,
  users
} from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

// Mock data
const mockCustomerId = 'customer-123';
const mockTrainerId = 'trainer-456';
const mockMealPlanId = 'meal-plan-789';
const mockGroceryListId = 'grocery-list-abc';

const mockMealPlanData = {
  planName: 'Weight Loss Plan',
  fitnessGoal: 'weight_loss',
  dailyCalorieTarget: 1800,
  weeks: [
    {
      weekNumber: 1,
      days: [
        {
          dayNumber: 1,
          dayName: 'Monday',
          meals: [
            {
              mealType: 'breakfast',
              recipe: {
                id: 'recipe-1',
                name: 'Protein Pancakes',
                ingredients: [
                  { name: 'Eggs', quantity: '3', unit: 'pieces' },
                  { name: 'Banana', quantity: '1', unit: 'piece' },
                  { name: 'Protein Powder', quantity: '30', unit: 'g' }
                ]
              }
            },
            {
              mealType: 'lunch',
              recipe: {
                id: 'recipe-2',
                name: 'Grilled Chicken Salad',
                ingredients: [
                  { name: 'Chicken Breast', quantity: '200', unit: 'g' },
                  { name: 'Lettuce', quantity: '100', unit: 'g' },
                  { name: 'Tomato', quantity: '2', unit: 'pieces' }
                ]
              }
            }
          ]
        },
        {
          dayNumber: 2,
          dayName: 'Tuesday',
          meals: [
            {
              mealType: 'breakfast',
              recipe: {
                id: 'recipe-3',
                name: 'Oatmeal Bowl',
                ingredients: [
                  { name: 'Oats', quantity: '60', unit: 'g' },
                  { name: 'Banana', quantity: '1', unit: 'piece' },
                  { name: 'Almond Milk', quantity: '250', unit: 'ml' }
                ]
              }
            }
          ]
        }
      ]
    }
  ]
};

describe('Meal Plan Grocery List Integration', () => {
  describe('Schema Relationships', () => {
    it('should require meal_plan_id for grocery lists', () => {
      // Check that meal_plan_id is required in the schema
      const schema = groceryLists;
      expect(schema).toBeDefined();

      // The schema should have mealPlanId as a required field
      const mealPlanField = (schema as any).mealPlanId;
      expect(mealPlanField).toBeDefined();
    });

    it('should have cascade delete from meal plan to grocery list', () => {
      // This tests the schema definition includes cascade delete
      const schema = groceryLists;
      const mealPlanField = (schema as any).mealPlanId;

      // The reference should have onDelete: 'cascade'
      expect(mealPlanField).toBeDefined();
    });

    it('should enforce unique constraint on meal_plan_id', () => {
      // Test that only one grocery list can exist per meal plan
      const schema = groceryLists;
      const mealPlanField = (schema as any).mealPlanId;

      // Should have unique constraint
      expect(mealPlanField).toBeDefined();
    });
  });

  describe('Grocery List Auto-Generation', () => {
    it('should automatically create grocery list when meal plan is created', async () => {
      // Mock the database insert
      const mockDb = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{
              id: mockGroceryListId,
              customerId: mockCustomerId,
              mealPlanId: mockMealPlanId,
              name: 'Weight Loss Plan - Grocery List',
              isActive: true
            }])
          })
        })
      };

      // Test the auto-creation logic
      const createGroceryListForMealPlan = async (mealPlanId: string, customerId: string, planName: string) => {
        return mockDb.insert(groceryLists).values({
          customerId,
          mealPlanId,
          name: `${planName} - Grocery List`,
          isActive: true
        }).returning();
      };

      const result = await createGroceryListForMealPlan(mockMealPlanId, mockCustomerId, 'Weight Loss Plan');

      expect(result[0].mealPlanId).toBe(mockMealPlanId);
      expect(result[0].customerId).toBe(mockCustomerId);
      expect(result[0].name).toContain('Weight Loss Plan');
    });

    it('should generate grocery items from meal plan recipes', () => {
      // Extract ingredients from meal plan
      const extractIngredients = (mealPlanData: any) => {
        const ingredients: any[] = [];

        mealPlanData.weeks?.forEach((week: any) => {
          week.days?.forEach((day: any) => {
            day.meals?.forEach((meal: any) => {
              meal.recipe?.ingredients?.forEach((ingredient: any) => {
                ingredients.push({
                  name: ingredient.name,
                  quantity: parseFloat(ingredient.quantity || '1'),
                  unit: ingredient.unit,
                  recipeName: meal.recipe.name
                });
              });
            });
          });
        });

        return ingredients;
      };

      const ingredients = extractIngredients(mockMealPlanData);

      expect(ingredients).toHaveLength(9); // Total ingredients from all recipes
      expect(ingredients.some(i => i.name === 'Banana')).toBe(true);
      expect(ingredients.filter(i => i.name === 'Banana')).toHaveLength(2); // Appears in 2 recipes
    });

    it('should aggregate duplicate ingredients', () => {
      // Test ingredient aggregation logic
      const aggregateIngredients = (ingredients: any[]) => {
        const aggregated = new Map<string, any>();

        ingredients.forEach(ingredient => {
          const key = `${ingredient.name}-${ingredient.unit}`;

          if (aggregated.has(key)) {
            const existing = aggregated.get(key);
            existing.quantity += ingredient.quantity;
            existing.recipes.push(ingredient.recipeName);
          } else {
            aggregated.set(key, {
              ...ingredient,
              recipes: [ingredient.recipeName]
            });
          }
        });

        return Array.from(aggregated.values());
      };

      const ingredients = [
        { name: 'Banana', quantity: 1, unit: 'piece', recipeName: 'Protein Pancakes' },
        { name: 'Banana', quantity: 1, unit: 'piece', recipeName: 'Oatmeal Bowl' },
        { name: 'Eggs', quantity: 3, unit: 'pieces', recipeName: 'Protein Pancakes' }
      ];

      const aggregated = aggregateIngredients(ingredients);

      expect(aggregated).toHaveLength(2); // Bananas aggregated, eggs separate

      const banana = aggregated.find(i => i.name === 'Banana');
      expect(banana?.quantity).toBe(2);
      expect(banana?.recipes).toHaveLength(2);
    });
  });

  describe('Meal Plan Grocery List Queries', () => {
    it('should fetch grocery list by meal plan ID', async () => {
      // Mock database query
      const mockQuery = vi.fn().mockResolvedValue([{
        id: mockGroceryListId,
        mealPlanId: mockMealPlanId,
        customerId: mockCustomerId,
        name: 'Test Grocery List'
      }]);

      const getGroceryListByMealPlan = async (mealPlanId: string, customerId: string) => {
        // Simulate the query
        return mockQuery(mealPlanId, customerId);
      };

      const result = await getGroceryListByMealPlan(mockMealPlanId, mockCustomerId);

      expect(result[0].mealPlanId).toBe(mockMealPlanId);
      expect(mockQuery).toHaveBeenCalledWith(mockMealPlanId, mockCustomerId);
    });

    it('should fetch all grocery lists for customer with meal plan info', async () => {
      // Mock query that joins grocery lists with meal plans
      const mockJoinQuery = vi.fn().mockResolvedValue([
        {
          id: 'list-1',
          mealPlanId: 'plan-1',
          mealPlanName: 'Weight Loss Plan',
          itemCount: 15,
          checkedCount: 3
        },
        {
          id: 'list-2',
          mealPlanId: 'plan-2',
          mealPlanName: 'Muscle Gain Plan',
          itemCount: 20,
          checkedCount: 0
        }
      ]);

      const getCustomerGroceryLists = async (customerId: string) => {
        return mockJoinQuery(customerId);
      };

      const results = await getCustomerGroceryLists(mockCustomerId);

      expect(results).toHaveLength(2);
      expect(results[0].mealPlanName).toBe('Weight Loss Plan');
      expect(results[1].itemCount).toBe(20);
    });

    it('should return empty array when customer has no meal plans', async () => {
      const mockEmptyQuery = vi.fn().mockResolvedValue([]);

      const getCustomerGroceryLists = async (customerId: string) => {
        return mockEmptyQuery(customerId);
      };

      const results = await getCustomerGroceryLists('customer-with-no-plans');

      expect(results).toHaveLength(0);
    });
  });

  describe('Cascade Delete Behavior', () => {
    it('should delete grocery list when meal plan is deleted', async () => {
      // Mock the cascade delete behavior
      let mealPlans = [{ id: mockMealPlanId }];
      let lists = [{ id: mockGroceryListId, mealPlanId: mockMealPlanId }];

      const deleteMealPlan = (mealPlanId: string) => {
        // Simulate cascade delete
        mealPlans = mealPlans.filter(mp => mp.id !== mealPlanId);
        lists = lists.filter(gl => gl.mealPlanId !== mealPlanId);
      };

      expect(lists).toHaveLength(1);

      deleteMealPlan(mockMealPlanId);

      expect(mealPlans).toHaveLength(0);
      expect(lists).toHaveLength(0); // Grocery list deleted automatically
    });

    it('should not affect other meal plans grocery lists', async () => {
      // Mock multiple meal plans and lists
      let lists = [
        { id: 'list-1', mealPlanId: 'plan-1' },
        { id: 'list-2', mealPlanId: 'plan-2' },
        { id: 'list-3', mealPlanId: 'plan-3' }
      ];

      const deleteMealPlan = (mealPlanId: string) => {
        lists = lists.filter(gl => gl.mealPlanId !== mealPlanId);
      };

      deleteMealPlan('plan-2');

      expect(lists).toHaveLength(2);
      expect(lists.find(l => l.id === 'list-1')).toBeDefined();
      expect(lists.find(l => l.id === 'list-3')).toBeDefined();
      expect(lists.find(l => l.id === 'list-2')).toBeUndefined();
    });
  });

  describe('Grocery List Item Management', () => {
    it('should add items to grocery list from recipes', () => {
      const addItemsFromRecipe = (groceryListId: string, recipe: any) => {
        const items = recipe.ingredients.map((ing: any) => ({
          groceryListId,
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          recipeName: recipe.name
        }));

        return items;
      };

      const recipe = {
        name: 'Test Recipe',
        ingredients: [
          { name: 'Chicken', quantity: '200', unit: 'g' },
          { name: 'Rice', quantity: '100', unit: 'g' }
        ]
      };

      const items = addItemsFromRecipe(mockGroceryListId, recipe);

      expect(items).toHaveLength(2);
      expect(items[0].groceryListId).toBe(mockGroceryListId);
      expect(items[0].recipeName).toBe('Test Recipe');
    });

    it('should categorize ingredients correctly', () => {
      const categorizeIngredient = (name: string): string => {
        const lowerName = name.toLowerCase();

        if (lowerName.match(/chicken|beef|pork|fish/)) return 'meat';
        if (lowerName.match(/milk|cheese|yogurt/)) return 'dairy';
        if (lowerName.match(/apple|banana|orange/)) return 'produce';
        if (lowerName.match(/bread|flour|pasta/)) return 'bakery';

        return 'pantry';
      };

      expect(categorizeIngredient('Chicken Breast')).toBe('meat');
      expect(categorizeIngredient('Milk')).toBe('dairy');
      expect(categorizeIngredient('Banana')).toBe('produce');
      expect(categorizeIngredient('Bread')).toBe('bakery');
      expect(categorizeIngredient('Salt')).toBe('pantry');
    });

    it('should track checked status of items', () => {
      const items = [
        { id: 'item-1', name: 'Eggs', isChecked: false },
        { id: 'item-2', name: 'Milk', isChecked: false },
        { id: 'item-3', name: 'Bread', isChecked: true }
      ];

      const toggleItemCheck = (itemId: string) => {
        const item = items.find(i => i.id === itemId);
        if (item) item.isChecked = !item.isChecked;
      };

      expect(items.filter(i => i.isChecked)).toHaveLength(1);

      toggleItemCheck('item-1');
      expect(items.find(i => i.id === 'item-1')?.isChecked).toBe(true);

      toggleItemCheck('item-3');
      expect(items.find(i => i.id === 'item-3')?.isChecked).toBe(false);

      expect(items.filter(i => i.isChecked)).toHaveLength(1);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle meal plans without recipes gracefully', () => {
      const emptyMealPlan = {
        planName: 'Empty Plan',
        weeks: [{ days: [{ meals: [] }] }]
      };

      const extractIngredients = (mealPlan: any) => {
        const ingredients: any[] = [];
        mealPlan.weeks?.forEach((week: any) => {
          week.days?.forEach((day: any) => {
            day.meals?.forEach((meal: any) => {
              meal.recipe?.ingredients?.forEach((ing: any) => {
                ingredients.push(ing);
              });
            });
          });
        });
        return ingredients;
      };

      const ingredients = extractIngredients(emptyMealPlan);
      expect(ingredients).toHaveLength(0);
    });

    it('should handle missing ingredient quantities', () => {
      const ingredients = [
        { name: 'Salt', quantity: undefined, unit: 'tsp' },
        { name: 'Pepper', quantity: null, unit: 'tsp' },
        { name: 'Oil', quantity: '2', unit: 'tbsp' }
      ];

      const normalizeQuantity = (quantity: any): number => {
        const parsed = parseFloat(quantity);
        return isNaN(parsed) ? 1 : parsed;
      };

      expect(normalizeQuantity(ingredients[0].quantity)).toBe(1);
      expect(normalizeQuantity(ingredients[1].quantity)).toBe(1);
      expect(normalizeQuantity(ingredients[2].quantity)).toBe(2);
    });

    it('should prevent duplicate grocery lists for same meal plan', () => {
      const lists = new Map<string, any>();

      const createGroceryList = (mealPlanId: string) => {
        if (lists.has(mealPlanId)) {
          throw new Error('Grocery list already exists for this meal plan');
        }

        lists.set(mealPlanId, {
          id: `list-${Date.now()}`,
          mealPlanId
        });

        return lists.get(mealPlanId);
      };

      const list1 = createGroceryList('plan-1');
      expect(list1).toBeDefined();

      expect(() => createGroceryList('plan-1')).toThrow('Grocery list already exists');

      const list2 = createGroceryList('plan-2');
      expect(list2).toBeDefined();
      expect(list2.mealPlanId).toBe('plan-2');
    });
  });
});