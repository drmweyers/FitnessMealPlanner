/**
 * Integration Tests for Meal Plan Event System
 *
 * Tests the meal plan event handling system that drives automatic grocery list generation.
 * This test suite validates the core business logic and event processing without UI dependencies.
 *
 * Test Coverage:
 * - onMealPlanAssigned event processing
 * - Grocery list creation logic
 * - Ingredient extraction and aggregation
 * - Error handling when generation fails
 * - Feature flag behavior
 * - Database transaction integrity
 * - Event metadata handling
 *
 * @author Integration Testing Specialist Agent
 * @since 1.0.0
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import {
  MealPlanEventType,
  type MealPlanEvent,
  type GroceryListGenerationResult,
  onMealPlanAssigned,
  onMealPlanCreated,
  onMealPlanUpdated,
  onMealPlanDeleted,
  handleMealPlanEvent,
  createMealPlanEvent,
  getGroceryListsForMealPlan
} from '../../server/utils/mealPlanEvents';
import {
  getFeatureConfig,
  updateFeatureConfig,
  resetFeatureConfig,
  type FeatureConfig
} from '../../server/config/features';

// Mock database
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
};

vi.mock('../../server/db', () => ({
  db: mockDb,
}));

// Mock schema
vi.mock('@shared/schema', () => ({
  groceryLists: {
    id: 'id',
    customerId: 'customerId',
    mealPlanId: 'mealPlanId',
    name: 'name',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
  groceryListItems: {
    id: 'id',
    groceryListId: 'groceryListId',
    name: 'name',
    category: 'category',
    quantity: 'quantity',
    unit: 'unit',
    isChecked: 'isChecked',
    priority: 'priority',
    notes: 'notes',
  },
}));

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value, type: 'eq' })),
  and: vi.fn((...conditions) => ({ conditions, type: 'and' })),
}));

// Mock ingredient aggregator
const mockIngredientAggregator = {
  extractIngredientsFromMealPlan: vi.fn(),
  aggregateIngredients: vi.fn(),
  generateGroceryListItems: vi.fn(),
};

vi.mock('../../server/utils/ingredientAggregator', () => mockIngredientAggregator);

// Test data
const testMealPlanData = {
  planName: 'Test Meal Plan',
  days: [
    {
      day: 1,
      meals: [
        {
          type: 'breakfast',
          recipe: {
            id: 'recipe-1',
            name: 'Scrambled Eggs',
            ingredients: [
              { name: 'eggs', amount: '3', unit: 'pcs' },
              { name: 'butter', amount: '1', unit: 'tbsp' },
              { name: 'milk', amount: '2', unit: 'tbsp' },
            ],
          },
        },
        {
          type: 'lunch',
          recipe: {
            id: 'recipe-2',
            name: 'Chicken Salad',
            ingredients: [
              { name: 'chicken breast', amount: '200', unit: 'g' },
              { name: 'lettuce', amount: '2', unit: 'cups' },
              { name: 'olive oil', amount: '1', unit: 'tbsp' },
            ],
          },
        },
      ],
    },
    {
      day: 2,
      meals: [
        {
          type: 'dinner',
          recipe: {
            id: 'recipe-3',
            name: 'Grilled Chicken',
            ingredients: [
              { name: 'chicken breast', amount: '250', unit: 'g' },
              { name: 'olive oil', amount: '2', unit: 'tbsp' },
              { name: 'garlic', amount: '2', unit: 'cloves' },
            ],
          },
        },
      ],
    },
  ],
};

const mockRawIngredients = [
  { name: 'eggs', amount: 3, unit: 'pcs', recipe: 'Scrambled Eggs' },
  { name: 'butter', amount: 1, unit: 'tbsp', recipe: 'Scrambled Eggs' },
  { name: 'milk', amount: 2, unit: 'tbsp', recipe: 'Scrambled Eggs' },
  { name: 'chicken breast', amount: 200, unit: 'g', recipe: 'Chicken Salad' },
  { name: 'lettuce', amount: 2, unit: 'cups', recipe: 'Chicken Salad' },
  { name: 'olive oil', amount: 1, unit: 'tbsp', recipe: 'Chicken Salad' },
  { name: 'chicken breast', amount: 250, unit: 'g', recipe: 'Grilled Chicken' },
  { name: 'olive oil', amount: 2, unit: 'tbsp', recipe: 'Grilled Chicken' },
  { name: 'garlic', amount: 2, unit: 'cloves', recipe: 'Grilled Chicken' },
];

const mockAggregatedIngredients = [
  { name: 'eggs', amount: 3, unit: 'pcs', recipes: ['Scrambled Eggs'] },
  { name: 'butter', amount: 1, unit: 'tbsp', recipes: ['Scrambled Eggs'] },
  { name: 'milk', amount: 2, unit: 'tbsp', recipes: ['Scrambled Eggs'] },
  { name: 'chicken breast', amount: 450, unit: 'g', recipes: ['Chicken Salad', 'Grilled Chicken'] },
  { name: 'lettuce', amount: 2, unit: 'cups', recipes: ['Chicken Salad'] },
  { name: 'olive oil', amount: 3, unit: 'tbsp', recipes: ['Chicken Salad', 'Grilled Chicken'] },
  { name: 'garlic', amount: 2, unit: 'cloves', recipes: ['Grilled Chicken'] },
];

const mockGroceryListItems = [
  {
    groceryListId: 'list-123',
    name: 'eggs',
    category: 'dairy',
    quantity: 3,
    unit: 'pcs',
    isChecked: false,
    priority: 'medium',
    notes: 'Used in: Scrambled Eggs',
  },
  {
    groceryListId: 'list-123',
    name: 'chicken breast',
    category: 'meat',
    quantity: 450,
    unit: 'g',
    isChecked: false,
    priority: 'high',
    notes: 'Used in: Chicken Salad, Grilled Chicken',
  },
  {
    groceryListId: 'list-123',
    name: 'olive oil',
    category: 'pantry',
    quantity: 3,
    unit: 'tbsp',
    isChecked: false,
    priority: 'medium',
    notes: 'Used in: Chicken Salad, Grilled Chicken',
  },
];

const mockGroceryList = {
  id: 'list-123',
  customerId: 'customer-123',
  mealPlanId: 'plan-123',
  name: 'Grocery List - Test Meal Plan - 2 Days',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Meal Plan Events Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFeatureConfig();

    // Setup default mock implementations
    mockIngredientAggregator.extractIngredientsFromMealPlan.mockReturnValue(mockRawIngredients);
    mockIngredientAggregator.aggregateIngredients.mockReturnValue(mockAggregatedIngredients);
    mockIngredientAggregator.generateGroceryListItems.mockReturnValue(mockGroceryListItems);

    // Default database responses
    mockDb.returning.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
    resetFeatureConfig();
  });

  describe('onMealPlanAssigned Event Handler', () => {
    it('should successfully create grocery list when meal plan is assigned', async () => {
      // Setup: Feature enabled, no existing list
      updateFeatureConfig({ AUTO_GENERATE_GROCERY_LISTS: true });
      mockDb.returning
        .mockResolvedValueOnce([]) // No existing list
        .mockResolvedValueOnce([mockGroceryList]) // Created list
        .mockResolvedValueOnce(mockGroceryListItems.map((item, index) => ({ ...item, id: `item-${index}` }))); // Created items

      const event: MealPlanEvent = {
        eventType: MealPlanEventType.ASSIGNED,
        mealPlanId: 'plan-123',
        customerId: 'customer-123',
        mealPlanData: testMealPlanData,
        metadata: {
          assignedBy: 'trainer-456',
          planName: 'Test Meal Plan',
        },
      };

      const result = await onMealPlanAssigned(event);

      expect(result.success).toBe(true);
      expect(result.action).toBe('created');
      expect(result.groceryList).toBeDefined();
      expect(result.itemCount).toBe(3);
      expect(result.originalIngredientCount).toBe(9);

      // Verify ingredient processing was called
      expect(mockIngredientAggregator.extractIngredientsFromMealPlan).toHaveBeenCalledWith(testMealPlanData);
      expect(mockIngredientAggregator.aggregateIngredients).toHaveBeenCalledWith(mockRawIngredients);
      expect(mockIngredientAggregator.generateGroceryListItems).toHaveBeenCalledWith(
        mockAggregatedIngredients,
        'list-123'
      );

      // Verify database operations
      expect(mockDb.insert).toHaveBeenCalledTimes(2); // List + items
    });

    it('should update existing grocery list when one already exists', async () => {
      // Setup: Feature enabled with updates, existing list exists
      updateFeatureConfig({
        AUTO_GENERATE_GROCERY_LISTS: true,
        UPDATE_EXISTING_LISTS: true,
      });

      const existingList = { id: 'existing-list-123' };
      mockDb.returning
        .mockResolvedValueOnce([existingList]) // Existing list found
        .mockResolvedValueOnce([{ ...mockGroceryList, id: 'existing-list-123' }]) // Updated list
        .mockResolvedValueOnce(mockGroceryListItems.map((item, index) => ({ ...item, id: `item-${index}` }))); // Created items

      const event: MealPlanEvent = createMealPlanEvent(
        MealPlanEventType.ASSIGNED,
        'plan-123',
        'customer-123',
        testMealPlanData,
        { planName: 'Test Meal Plan' }
      );

      const result = await onMealPlanAssigned(event);

      expect(result.success).toBe(true);
      expect(result.action).toBe('updated');
      expect(result.groceryList).toBeDefined();

      // Verify update operations
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.delete).toHaveBeenCalled(); // Delete old items
      expect(mockDb.insert).toHaveBeenCalledWith(expect.anything()); // Insert new items
    });

    it('should skip creation when feature is disabled', async () => {
      updateFeatureConfig({ AUTO_GENERATE_GROCERY_LISTS: false });

      const event: MealPlanEvent = createMealPlanEvent(
        MealPlanEventType.ASSIGNED,
        'plan-123',
        'customer-123',
        testMealPlanData
      );

      const result = await onMealPlanAssigned(event);

      expect(result.success).toBe(true);
      expect(result.action).toBe('skipped');
      expect(result.reason).toBe('Auto-generation is disabled');

      // Verify no database operations
      expect(mockDb.insert).not.toHaveBeenCalled();
      expect(mockIngredientAggregator.extractIngredientsFromMealPlan).not.toHaveBeenCalled();
    });

    it('should skip update when existing list found and updates disabled', async () => {
      updateFeatureConfig({
        AUTO_GENERATE_GROCERY_LISTS: true,
        UPDATE_EXISTING_LISTS: false,
      });

      const existingList = { id: 'existing-list-123' };
      mockDb.returning.mockResolvedValueOnce([existingList]);

      const event: MealPlanEvent = createMealPlanEvent(
        MealPlanEventType.ASSIGNED,
        'plan-123',
        'customer-123',
        testMealPlanData
      );

      const result = await onMealPlanAssigned(event);

      expect(result.success).toBe(true);
      expect(result.action).toBe('skipped');
      expect(result.reason).toBe('Grocery list already exists and updates are disabled');

      expect(mockDb.update).not.toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should handle meal plan with no ingredients', async () => {
      updateFeatureConfig({ AUTO_GENERATE_GROCERY_LISTS: true });

      // Mock empty ingredient extraction
      mockIngredientAggregator.extractIngredientsFromMealPlan.mockReturnValue([]);

      const emptyMealPlan = {
        planName: 'Empty Plan',
        days: [],
      };

      const event: MealPlanEvent = createMealPlanEvent(
        MealPlanEventType.ASSIGNED,
        'plan-123',
        'customer-123',
        emptyMealPlan
      );

      const result = await onMealPlanAssigned(event);

      expect(result.success).toBe(true);
      expect(result.action).toBe('skipped');
      expect(result.reason).toBe('No ingredients found in meal plan');

      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      updateFeatureConfig({ AUTO_GENERATE_GROCERY_LISTS: true });
      mockDb.returning.mockRejectedValue(new Error('Database connection failed'));

      const event: MealPlanEvent = createMealPlanEvent(
        MealPlanEventType.ASSIGNED,
        'plan-123',
        'customer-123',
        testMealPlanData
      );

      const result = await onMealPlanAssigned(event);

      expect(result.success).toBe(false);
      expect(result.action).toBe('error');
      expect(result.error).toBe('Database connection failed');
    });

    it('should round up quantities as specified', async () => {
      updateFeatureConfig({ AUTO_GENERATE_GROCERY_LISTS: true });

      // Mock items with decimal quantities
      const decimalItems = [
        { ...mockGroceryListItems[0], quantity: 2.3 },
        { ...mockGroceryListItems[1], quantity: 1.7 },
        { ...mockGroceryListItems[2], quantity: 4.1 },
      ];

      mockIngredientAggregator.generateGroceryListItems.mockReturnValue(decimalItems);

      mockDb.returning
        .mockResolvedValueOnce([]) // No existing list
        .mockResolvedValueOnce([mockGroceryList]) // Created list
        .mockResolvedValueOnce(decimalItems.map((item, index) => ({ ...item, id: `item-${index}`, quantity: Math.ceil(item.quantity) })));

      const event: MealPlanEvent = createMealPlanEvent(
        MealPlanEventType.ASSIGNED,
        'plan-123',
        'customer-123',
        testMealPlanData
      );

      const result = await onMealPlanAssigned(event);

      expect(result.success).toBe(true);
      expect(result.groceryList?.items).toBeDefined();

      // Verify quantities were rounded up
      const insertedItems = mockDb.values.mock.calls[1][0]; // Second insert call (items)
      expect(insertedItems[0].quantity).toBe(3); // 2.3 -> 3
      expect(insertedItems[1].quantity).toBe(2); // 1.7 -> 2
      expect(insertedItems[2].quantity).toBe(5); // 4.1 -> 5
    });
  });

  describe('onMealPlanCreated Event Handler', () => {
    it('should create grocery list when meal plan is created', async () => {
      updateFeatureConfig({ AUTO_GENERATE_GROCERY_LISTS: true });

      mockDb.returning
        .mockResolvedValueOnce([]) // No existing list
        .mockResolvedValueOnce([mockGroceryList]) // Created list
        .mockResolvedValueOnce(mockGroceryListItems.map((item, index) => ({ ...item, id: `item-${index}` })));

      const event: MealPlanEvent = createMealPlanEvent(
        MealPlanEventType.CREATED,
        'plan-123',
        'customer-123',
        testMealPlanData
      );

      const result = await onMealPlanCreated(event);

      expect(result.success).toBe(true);
      expect(result.action).toBe('created');
      expect(result.groceryList).toBeDefined();
    });
  });

  describe('onMealPlanUpdated Event Handler', () => {
    it('should update grocery list when meal plan is updated', async () => {
      updateFeatureConfig({
        AUTO_GENERATE_GROCERY_LISTS: true,
        UPDATE_EXISTING_LISTS: true,
      });

      const existingList = { id: 'existing-list-123' };
      mockDb.returning
        .mockResolvedValueOnce([existingList])
        .mockResolvedValueOnce([{ ...mockGroceryList, id: 'existing-list-123' }])
        .mockResolvedValueOnce(mockGroceryListItems.map((item, index) => ({ ...item, id: `item-${index}` })));

      const event: MealPlanEvent = createMealPlanEvent(
        MealPlanEventType.UPDATED,
        'plan-123',
        'customer-123',
        testMealPlanData
      );

      const result = await onMealPlanUpdated(event);

      expect(result.success).toBe(true);
      expect(result.action).toBe('updated');
    });

    it('should skip update when UPDATE_EXISTING_LISTS is disabled', async () => {
      updateFeatureConfig({
        AUTO_GENERATE_GROCERY_LISTS: true,
        UPDATE_EXISTING_LISTS: false,
      });

      const event: MealPlanEvent = createMealPlanEvent(
        MealPlanEventType.UPDATED,
        'plan-123',
        'customer-123',
        testMealPlanData
      );

      const result = await onMealPlanUpdated(event);

      expect(result.success).toBe(true);
      expect(result.action).toBe('skipped');
      expect(result.reason).toBe('Update existing lists is disabled');
    });
  });

  describe('onMealPlanDeleted Event Handler', () => {
    it('should delete grocery list when meal plan is deleted', async () => {
      updateFeatureConfig({ DELETE_ORPHANED_LISTS: true });

      const deletedLists = [mockGroceryList];
      mockDb.returning.mockResolvedValueOnce(deletedLists);

      const event: MealPlanEvent = createMealPlanEvent(
        MealPlanEventType.DELETED,
        'plan-123',
        'customer-123',
        {}
      );

      const result = await onMealPlanDeleted(event);

      expect(result.success).toBe(true);
      expect(result.action).toBe('updated');
      expect(result.itemCount).toBe(1);

      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should skip deletion when DELETE_ORPHANED_LISTS is disabled', async () => {
      updateFeatureConfig({ DELETE_ORPHANED_LISTS: false });

      const event: MealPlanEvent = createMealPlanEvent(
        MealPlanEventType.DELETED,
        'plan-123',
        'customer-123',
        {}
      );

      const result = await onMealPlanDeleted(event);

      expect(result.success).toBe(true);
      expect(result.action).toBe('skipped');
      expect(result.reason).toBe('Delete orphaned lists is disabled');

      expect(mockDb.delete).not.toHaveBeenCalled();
    });

    it('should handle error during deletion', async () => {
      updateFeatureConfig({ DELETE_ORPHANED_LISTS: true });
      mockDb.returning.mockRejectedValue(new Error('Delete failed'));

      const event: MealPlanEvent = createMealPlanEvent(
        MealPlanEventType.DELETED,
        'plan-123',
        'customer-123',
        {}
      );

      const result = await onMealPlanDeleted(event);

      expect(result.success).toBe(false);
      expect(result.action).toBe('error');
      expect(result.error).toBe('Delete failed');
    });
  });

  describe('Main Event Dispatcher', () => {
    it('should route events to correct handlers', async () => {
      updateFeatureConfig({ AUTO_GENERATE_GROCERY_LISTS: true });

      mockDb.returning
        .mockResolvedValue([]) // For assigned event
        .mockResolvedValue([mockGroceryList])
        .mockResolvedValue(mockGroceryListItems);

      const assignedEvent = createMealPlanEvent(
        MealPlanEventType.ASSIGNED,
        'plan-123',
        'customer-123',
        testMealPlanData
      );

      const result = await handleMealPlanEvent(assignedEvent);

      expect(result.success).toBe(true);
      expect(result.action).toBe('created');
    });

    it('should handle unknown event types', async () => {
      const invalidEvent = {
        ...createMealPlanEvent(MealPlanEventType.ASSIGNED, 'plan-123', 'customer-123', {}),
        eventType: 'UNKNOWN_EVENT' as any,
      };

      const result = await handleMealPlanEvent(invalidEvent);

      expect(result.success).toBe(false);
      expect(result.action).toBe('error');
      expect(result.error).toContain('Unknown event type');
    });

    it('should handle errors in event processing', async () => {
      const event = createMealPlanEvent(
        MealPlanEventType.ASSIGNED,
        'plan-123',
        'customer-123',
        testMealPlanData
      );

      // Mock implementation to throw error
      mockIngredientAggregator.extractIngredientsFromMealPlan.mockImplementation(() => {
        throw new Error('Processing failed');
      });

      const result = await handleMealPlanEvent(event);

      expect(result.success).toBe(false);
      expect(result.action).toBe('error');
      expect(result.error).toBe('Processing failed');
    });
  });

  describe('Utility Functions', () => {
    it('should create meal plan event with correct structure', () => {
      const event = createMealPlanEvent(
        MealPlanEventType.ASSIGNED,
        'plan-123',
        'customer-123',
        testMealPlanData,
        { assignedBy: 'trainer-456' }
      );

      expect(event).toEqual({
        eventType: MealPlanEventType.ASSIGNED,
        mealPlanId: 'plan-123',
        customerId: 'customer-123',
        mealPlanData: testMealPlanData,
        metadata: { assignedBy: 'trainer-456' },
      });
    });

    it('should get grocery lists for meal plan', async () => {
      const expectedLists = [mockGroceryList];
      mockDb.returning.mockResolvedValueOnce(expectedLists);

      const result = await getGroceryListsForMealPlan('plan-123', 'customer-123');

      expect(result).toEqual(expectedLists);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });

    it('should handle errors when getting grocery lists', async () => {
      mockDb.returning.mockRejectedValue(new Error('Query failed'));

      const result = await getGroceryListsForMealPlan('plan-123', 'customer-123');

      expect(result).toEqual([]);
    });
  });

  describe('Feature Flag Behavior', () => {
    it('should respect all feature flags', async () => {
      // Test with all features disabled
      updateFeatureConfig({
        AUTO_GENERATE_GROCERY_LISTS: false,
        UPDATE_EXISTING_LISTS: false,
        DELETE_ORPHANED_LISTS: false,
      });

      const assignEvent = createMealPlanEvent(
        MealPlanEventType.ASSIGNED,
        'plan-123',
        'customer-123',
        testMealPlanData
      );

      const updateEvent = createMealPlanEvent(
        MealPlanEventType.UPDATED,
        'plan-123',
        'customer-123',
        testMealPlanData
      );

      const deleteEvent = createMealPlanEvent(
        MealPlanEventType.DELETED,
        'plan-123',
        'customer-123',
        {}
      );

      const [assignResult, updateResult, deleteResult] = await Promise.all([
        onMealPlanAssigned(assignEvent),
        onMealPlanUpdated(updateEvent),
        onMealPlanDeleted(deleteEvent),
      ]);

      expect(assignResult.action).toBe('skipped');
      expect(updateResult.action).toBe('skipped');
      expect(deleteResult.action).toBe('skipped');
    });

    it('should work with all features enabled', async () => {
      updateFeatureConfig({
        AUTO_GENERATE_GROCERY_LISTS: true,
        UPDATE_EXISTING_LISTS: true,
        DELETE_ORPHANED_LISTS: true,
      });

      // Mock successful operations
      mockDb.returning
        .mockResolvedValueOnce([]) // No existing list for assign
        .mockResolvedValueOnce([mockGroceryList]) // Created list
        .mockResolvedValueOnce(mockGroceryListItems) // Created items
        .mockResolvedValueOnce([mockGroceryList]) // Existing list for update
        .mockResolvedValueOnce([mockGroceryList]) // Updated list
        .mockResolvedValueOnce(mockGroceryListItems) // Updated items
        .mockResolvedValueOnce([mockGroceryList]); // Deleted list

      const assignEvent = createMealPlanEvent(
        MealPlanEventType.ASSIGNED,
        'plan-123',
        'customer-123',
        testMealPlanData
      );

      const updateEvent = createMealPlanEvent(
        MealPlanEventType.UPDATED,
        'plan-456',
        'customer-123',
        testMealPlanData
      );

      const deleteEvent = createMealPlanEvent(
        MealPlanEventType.DELETED,
        'plan-789',
        'customer-123',
        {}
      );

      const [assignResult, updateResult, deleteResult] = await Promise.all([
        onMealPlanAssigned(assignEvent),
        onMealPlanUpdated(updateEvent),
        onMealPlanDeleted(deleteEvent),
      ]);

      expect(assignResult.success).toBe(true);
      expect(assignResult.action).toBe('created');

      expect(updateResult.success).toBe(true);
      expect(updateResult.action).toBe('updated');

      expect(deleteResult.success).toBe(true);
      expect(deleteResult.action).toBe('updated');
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle malformed meal plan data', async () => {
      updateFeatureConfig({ AUTO_GENERATE_GROCERY_LISTS: true });

      const malformedData = {
        planName: null,
        days: 'not an array',
      };

      // Mock extraction to handle malformed data gracefully
      mockIngredientAggregator.extractIngredientsFromMealPlan.mockReturnValue([]);

      const event = createMealPlanEvent(
        MealPlanEventType.ASSIGNED,
        'plan-123',
        'customer-123',
        malformedData
      );

      const result = await onMealPlanAssigned(event);

      expect(result.success).toBe(true);
      expect(result.action).toBe('skipped');
      expect(result.reason).toBe('No ingredients found in meal plan');
    });

    it('should handle very large meal plans', async () => {
      updateFeatureConfig({ AUTO_GENERATE_GROCERY_LISTS: true });

      // Create a meal plan with many days and recipes
      const largeMealPlan = {
        planName: 'Large Plan',
        days: Array.from({ length: 30 }, (_, dayIndex) => ({
          day: dayIndex + 1,
          meals: Array.from({ length: 4 }, (_, mealIndex) => ({
            type: `meal-${mealIndex}`,
            recipe: {
              id: `recipe-${dayIndex}-${mealIndex}`,
              name: `Recipe ${dayIndex}-${mealIndex}`,
              ingredients: Array.from({ length: 8 }, (_, ingIndex) => ({
                name: `ingredient-${dayIndex}-${mealIndex}-${ingIndex}`,
                amount: '1',
                unit: 'unit',
              })),
            },
          })),
        })),
      };

      // Mock large ingredient extraction
      const largeIngredientList = Array.from({ length: 960 }, (_, index) => ({
        name: `ingredient-${index}`,
        amount: 1,
        unit: 'unit',
        recipe: `recipe-${Math.floor(index / 8)}`,
      }));

      const aggregatedLarge = Array.from({ length: 200 }, (_, index) => ({
        name: `ingredient-${index}`,
        amount: Math.floor(index / 10) + 1,
        unit: 'unit',
        recipes: [`recipe-${index}`],
      }));

      const groceryItemsLarge = aggregatedLarge.map((ing, index) => ({
        groceryListId: 'list-123',
        name: ing.name,
        category: 'misc',
        quantity: ing.amount,
        unit: ing.unit,
        isChecked: false,
        priority: 'medium',
        notes: `Used in: ${ing.recipes.join(', ')}`,
      }));

      mockIngredientAggregator.extractIngredientsFromMealPlan.mockReturnValue(largeIngredientList);
      mockIngredientAggregator.aggregateIngredients.mockReturnValue(aggregatedLarge);
      mockIngredientAggregator.generateGroceryListItems.mockReturnValue(groceryItemsLarge);

      mockDb.returning
        .mockResolvedValueOnce([]) // No existing list
        .mockResolvedValueOnce([mockGroceryList]) // Created list
        .mockResolvedValueOnce(groceryItemsLarge.map((item, index) => ({ ...item, id: `item-${index}` })));

      const event = createMealPlanEvent(
        MealPlanEventType.ASSIGNED,
        'plan-large',
        'customer-123',
        largeMealPlan
      );

      const result = await onMealPlanAssigned(event);

      expect(result.success).toBe(true);
      expect(result.action).toBe('created');
      expect(result.itemCount).toBe(200);
      expect(result.originalIngredientCount).toBe(960);
    });

    it('should handle concurrent event processing', async () => {
      updateFeatureConfig({ AUTO_GENERATE_GROCERY_LISTS: true });

      // Mock database to simulate concurrent access
      let callCount = 0;
      mockDb.returning.mockImplementation(() => {
        callCount++;
        if (callCount === 1 || callCount === 3) {
          return Promise.resolve([]); // No existing lists
        } else {
          return Promise.resolve([mockGroceryList]);
        }
      });

      const event1 = createMealPlanEvent(
        MealPlanEventType.ASSIGNED,
        'plan-1',
        'customer-123',
        testMealPlanData
      );

      const event2 = createMealPlanEvent(
        MealPlanEventType.ASSIGNED,
        'plan-2',
        'customer-123',
        testMealPlanData
      );

      // Process events concurrently
      const [result1, result2] = await Promise.all([
        onMealPlanAssigned(event1),
        onMealPlanAssigned(event2),
      ]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      // Both should complete without conflicts
    });
  });
});