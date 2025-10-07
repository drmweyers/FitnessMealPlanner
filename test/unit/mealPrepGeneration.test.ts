/**
 * Unit Tests for Meal Prep Generation Feature
 * 
 * Tests the new startOfWeekMealPrep functionality that generates comprehensive
 * meal preparation instructions including shopping lists, prep steps, and storage guidelines.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MealPlanGeneratorService } from '../../server/services/mealPlanGenerator';
import type { MealPlan, MealPlanGeneration } from '@shared/schema';

// Mock the storage module at the top level
vi.mock('../../server/storage', () => ({
  storage: {
    searchRecipes: vi.fn()
  }
}));

describe('Meal Prep Generation Feature', () => {
  let mealPlanService: MealPlanGeneratorService;
  let mockMealPlan: MealPlan;

  beforeEach(() => {
    mealPlanService = new MealPlanGeneratorService();
    
    mockMealPlan = {
      id: 'test-plan-1',
      planName: 'Test Meal Plan',
      fitnessGoal: 'weight_loss',
      description: 'Test plan for meal prep',
      dailyCalorieTarget: 1800,
      clientName: 'Test Client',
      days: 3,
      mealsPerDay: 3,
      generatedBy: 'test-user',
      createdAt: new Date(),
      meals: [
        {
          day: 1,
          mealNumber: 1,
          mealType: 'breakfast',
          recipe: {
            id: '1',
            name: 'Oatmeal with Berries',
            description: 'Healthy breakfast',
            caloriesKcal: 350,
            proteinGrams: '12',
            carbsGrams: '60',
            fatGrams: '8',
            prepTimeMinutes: 5,
            cookTimeMinutes: 10,
            servings: 1,
            mealTypes: ['breakfast'],
            ingredientsJson: [
              { name: 'Rolled Oats', amount: '50', unit: 'g' },
              { name: 'Blueberries', amount: '100', unit: 'g' },
              { name: 'Almond Milk', amount: '250', unit: 'ml' },
              { name: 'Honey', amount: '1', unit: 'tbsp' }
            ]
          }
        },
        {
          day: 1,
          mealNumber: 2,
          mealType: 'lunch',
          recipe: {
            id: '2',
            name: 'Chicken Salad',
            description: 'Protein-rich lunch',
            caloriesKcal: 450,
            proteinGrams: '35',
            carbsGrams: '20',
            fatGrams: '25',
            prepTimeMinutes: 15,
            cookTimeMinutes: 0,
            servings: 1,
            mealTypes: ['lunch'],
            ingredientsJson: [
              { name: 'Chicken Breast', amount: '150', unit: 'g' },
              { name: 'Mixed Greens', amount: '100', unit: 'g' },
              { name: 'Cherry Tomatoes', amount: '100', unit: 'g' },
              { name: 'Olive Oil', amount: '2', unit: 'tbsp' },
              { name: 'Lemon', amount: '0.5', unit: 'whole' }
            ]
          }
        },
        {
          day: 2,
          mealNumber: 1,
          mealType: 'breakfast',
          recipe: {
            id: '3',
            name: 'Berry Smoothie',
            description: 'Quick breakfast smoothie',
            caloriesKcal: 300,
            proteinGrams: '20',
            carbsGrams: '40',
            fatGrams: '5',
            prepTimeMinutes: 5,
            cookTimeMinutes: 0,
            servings: 1,
            mealTypes: ['breakfast'],
            ingredientsJson: [
              { name: 'Blueberries', amount: '150', unit: 'g' }, // Shared ingredient
              { name: 'Protein Powder', amount: '30', unit: 'g' },
              { name: 'Almond Milk', amount: '300', unit: 'ml' }, // Shared ingredient
              { name: 'Banana', amount: '1', unit: 'whole' }
            ]
          }
        }
      ]
    };
  });

  describe('generateMealPrepInstructions', () => {
    it('should generate comprehensive meal prep instructions', () => {
      const mealPrep = (mealPlanService as any).generateMealPrepInstructions(mockMealPlan);

      expect(mealPrep).toBeDefined();
      expect(mealPrep.totalPrepTime).toBeGreaterThan(0);
      expect(mealPrep.shoppingList).toBeInstanceOf(Array);
      expect(mealPrep.prepInstructions).toBeInstanceOf(Array);
      expect(mealPrep.storageInstructions).toBeInstanceOf(Array);
    });

    it('should consolidate ingredients correctly', () => {
      const mealPrep = (mealPlanService as any).generateMealPrepInstructions(mockMealPlan);

      // Find consolidated ingredients
      const blueberries = mealPrep.shoppingList.find(item => 
        item.ingredient.toLowerCase().includes('blueberries')
      );
      const almondMilk = mealPrep.shoppingList.find(item => 
        item.ingredient.toLowerCase().includes('almond milk')
      );

      expect(blueberries).toBeDefined();
      expect(almondMilk).toBeDefined();
      
      // Should consolidate amounts: 100g + 150g = 250g
      expect(parseFloat(blueberries.totalAmount)).toBe(250);
      // Should consolidate amounts: 250ml + 300ml = 550ml
      expect(parseFloat(almondMilk.totalAmount)).toBe(550);
    });

    it('should track which recipes use each ingredient', () => {
      const mealPrep = (mealPlanService as any).generateMealPrepInstructions(mockMealPlan);

      const blueberries = mealPrep.shoppingList.find(item => 
        item.ingredient.toLowerCase().includes('blueberries')
      );

      expect(blueberries.usedInRecipes).toContain('Oatmeal with Berries');
      expect(blueberries.usedInRecipes).toContain('Berry Smoothie');
      expect(blueberries.usedInRecipes).toHaveLength(2);
    });

    it('should generate appropriate prep steps', () => {
      const mealPrep = (mealPlanService as any).generateMealPrepInstructions(mockMealPlan);

      expect(mealPrep.prepInstructions.length).toBeGreaterThan(0);
      
      // Should have steps for different ingredient categories
      const hasVegetablePrep = mealPrep.prepInstructions.some(step => 
        step.instruction.toLowerCase().includes('vegetables')
      );
      const hasProteinPrep = mealPrep.prepInstructions.some(step => 
        step.instruction.toLowerCase().includes('protein')
      );

      expect(hasVegetablePrep || hasProteinPrep).toBe(true);

      // Each step should have required fields
      mealPrep.prepInstructions.forEach(step => {
        expect(step.step).toBeGreaterThan(0);
        expect(step.instruction).toBeTruthy();
        expect(step.estimatedTime).toBeGreaterThan(0);
        expect(step.ingredients).toBeInstanceOf(Array);
      });
    });

    it('should generate storage instructions for all ingredients', () => {
      const mealPrep = (mealPlanService as any).generateMealPrepInstructions(mockMealPlan);

      expect(mealPrep.storageInstructions.length).toBe(mealPrep.shoppingList.length);

      mealPrep.storageInstructions.forEach(storage => {
        expect(storage.ingredient).toBeTruthy();
        expect(storage.method).toBeTruthy();
        expect(storage.duration).toBeTruthy();
      });
    });

    it('should calculate total prep time correctly', () => {
      const mealPrep = (mealPlanService as any).generateMealPrepInstructions(mockMealPlan);

      const calculatedTotal = mealPrep.prepInstructions.reduce(
        (total, step) => total + step.estimatedTime, 
        0
      );

      expect(mealPrep.totalPrepTime).toBe(calculatedTotal);
    });
  });

  describe('generatePrepSteps', () => {
    it('should categorize ingredients and generate appropriate steps', () => {
      const mockShoppingList = [
        { ingredient: 'Chicken Breast', totalAmount: '300', unit: 'g', usedInRecipes: ['Chicken Salad'] },
        { ingredient: 'Broccoli', totalAmount: '200', unit: 'g', usedInRecipes: ['Stir Fry'] },
        { ingredient: 'Rice', totalAmount: '150', unit: 'g', usedInRecipes: ['Rice Bowl'] },
        { ingredient: 'Cheese', totalAmount: '100', unit: 'g', usedInRecipes: ['Omelet'] }
      ];

      const prepSteps = (mealPlanService as any).generatePrepSteps(mockShoppingList);

      expect(prepSteps.length).toBeGreaterThan(0);
      
      // Should have a final storage step
      const finalStep = prepSteps[prepSteps.length - 1];
      expect(finalStep.instruction.toLowerCase()).toContain('storage');
      
      // Each step should have sequential numbering
      prepSteps.forEach((step, index) => {
        expect(step.step).toBe(index + 1);
      });
    });

    it('should handle empty ingredient list', () => {
      const prepSteps = (mealPlanService as any).generatePrepSteps([]);

      // Should still have the final storage step
      expect(prepSteps.length).toBe(1);
      expect(prepSteps[0].instruction.toLowerCase()).toContain('storage');
    });
  });

  describe('generateStorageInstructions', () => {
    it('should provide appropriate storage for different ingredient types', () => {
      const mockShoppingList = [
        { ingredient: 'Chicken Breast', totalAmount: '300', unit: 'g', usedInRecipes: [] },
        { ingredient: 'Broccoli', totalAmount: '200', unit: 'g', usedInRecipes: [] },
        { ingredient: 'Rice', totalAmount: '150', unit: 'g', usedInRecipes: [] },
        { ingredient: 'Milk', totalAmount: '500', unit: 'ml', usedInRecipes: [] },
        { ingredient: 'Unknown Item', totalAmount: '100', unit: 'g', usedInRecipes: [] }
      ];

      const storageInstructions = (mealPlanService as any).generateStorageInstructions(mockShoppingList);

      expect(storageInstructions).toHaveLength(mockShoppingList.length);

      const chickenInstruction = storageInstructions.find(s => s.ingredient === 'Chicken Breast');
      const broccoliInstruction = storageInstructions.find(s => s.ingredient === 'Broccoli');
      const riceInstruction = storageInstructions.find(s => s.ingredient === 'Rice');
      const milkInstruction = storageInstructions.find(s => s.ingredient === 'Milk');
      const unknownInstruction = storageInstructions.find(s => s.ingredient === 'Unknown Item');

      // Protein storage
      expect(chickenInstruction.method.toLowerCase()).toContain('refrigerate');
      expect(chickenInstruction.duration).toContain('days');

      // Vegetable storage
      expect(broccoliInstruction.method.toLowerCase()).toContain('refrigerate');
      expect(broccoliInstruction.duration).toContain('days');

      // Grain storage
      expect(riceInstruction.method.toLowerCase()).toContain('refrigerate');
      expect(riceInstruction.duration).toContain('days');

      // Dairy storage
      expect(milkInstruction.method.toLowerCase()).toContain('refrigerate');
      
      // Unknown ingredient fallback
      expect(unknownInstruction.method).toContain('pantry');
    });
  });

  describe('Ingredient categorization helpers', () => {
    it('should correctly identify vegetables', () => {
      const service = mealPlanService as any;
      
      expect(service.isVegetable('broccoli')).toBe(true);
      expect(service.isVegetable('tomato paste')).toBe(true);
      expect(service.isVegetable('bell pepper')).toBe(true);
      expect(service.isVegetable('chicken')).toBe(false);
      expect(service.isVegetable('rice')).toBe(false);
    });

    it('should correctly identify proteins', () => {
      const service = mealPlanService as any;
      
      expect(service.isProtein('chicken breast')).toBe(true);
      expect(service.isProtein('tofu')).toBe(true);
      expect(service.isProtein('black beans')).toBe(true);
      expect(service.isProtein('broccoli')).toBe(false);
      expect(service.isProtein('rice')).toBe(false);
    });

    it('should correctly identify grains', () => {
      const service = mealPlanService as any;
      
      expect(service.isGrain('brown rice')).toBe(true);
      expect(service.isGrain('quinoa')).toBe(true);
      expect(service.isGrain('whole grain bread')).toBe(true);
      expect(service.isGrain('chicken')).toBe(false);
      expect(service.isGrain('broccoli')).toBe(false);
    });

    it('should correctly identify dairy', () => {
      const service = mealPlanService as any;
      
      expect(service.isDairy('almond milk')).toBe(true);
      expect(service.isDairy('cheddar cheese')).toBe(true);
      expect(service.isDairy('greek yogurt')).toBe(true);
      expect(service.isDairy('chicken')).toBe(false);
      expect(service.isDairy('broccoli')).toBe(false);
    });

    it('should handle edge cases in categorization', () => {
      const service = mealPlanService as any;
      
      // Test empty strings
      expect(service.isVegetable('')).toBe(false);
      expect(service.isProtein('')).toBe(false);
      expect(service.isGrain('')).toBe(false);
      expect(service.isDairy('')).toBe(false);
      
      // Test partial matches
      expect(service.isVegetable('fresh broccoli florets')).toBe(true);
      expect(service.isProtein('organic chicken breast')).toBe(true);
    });
  });

  describe('capitalizeFirst helper', () => {
    it('should capitalize first letter correctly', () => {
      const service = mealPlanService as any;
      
      expect(service.capitalizeFirst('chicken breast')).toBe('Chicken breast');
      expect(service.capitalizeFirst('RICE')).toBe('RICE');
      expect(service.capitalizeFirst('a')).toBe('A');
      expect(service.capitalizeFirst('')).toBe('');
    });
  });

  describe('Integration with generateMealPlan', () => {
    beforeEach(async () => {
      // Import the mocked storage and set up the mock return value
      const { storage } = await import('../../server/storage');
      vi.mocked(storage.searchRecipes).mockResolvedValue({
        recipes: [
          {
            id: '1',
            name: 'Test Recipe',
            description: 'Test',
            caloriesKcal: 500,
            proteinGrams: '30',
            carbsGrams: '40',
            fatGrams: '15',
            prepTimeMinutes: 20,
            cookTimeMinutes: 25,
            servings: 2,
            mealTypes: ['lunch'],
            ingredientsJson: [
              { name: 'Chicken Breast', amount: '200', unit: 'g' },
              { name: 'Broccoli', amount: '150', unit: 'g' }
            ],
            isApproved: true,
            creationTimestamp: new Date(),
            lastUpdatedTimestamp: new Date()
          }
        ],
        total: 1
      });
    });

    it('should generate meal prep when generateMealPrep is true', async () => {
      const params: MealPlanGeneration = {
        planName: 'Test Plan with Meal Prep',
        fitnessGoal: 'weight_loss',
        dailyCalorieTarget: 1500,
        days: 1,
        mealsPerDay: 1,
        clientName: 'Test Client',
        generateMealPrep: true
      };

      const result = await mealPlanService.generateMealPlan(params, 'test-user-id');

      expect(result.startOfWeekMealPrep).toBeDefined();
      expect(result.startOfWeekMealPrep.shoppingList).toBeInstanceOf(Array);
      expect(result.startOfWeekMealPrep.prepInstructions).toBeInstanceOf(Array);
      expect(result.startOfWeekMealPrep.storageInstructions).toBeInstanceOf(Array);
      expect(result.startOfWeekMealPrep.totalPrepTime).toBeGreaterThan(0);
    });

    it('should not generate meal prep when generateMealPrep is false', async () => {
      const params: MealPlanGeneration = {
        planName: 'Test Plan without Meal Prep',
        fitnessGoal: 'weight_loss',
        dailyCalorieTarget: 1500,
        days: 1,
        mealsPerDay: 1,
        clientName: 'Test Client',
        generateMealPrep: false
      };

      const result = await mealPlanService.generateMealPlan(params, 'test-user-id');

      expect(result.startOfWeekMealPrep).toBeUndefined();
    });

    it('should generate meal prep by default when generateMealPrep is undefined', async () => {
      const params: MealPlanGeneration = {
        planName: 'Test Plan Default Meal Prep',
        fitnessGoal: 'weight_loss',
        dailyCalorieTarget: 1500,
        days: 1,
        mealsPerDay: 1,
        clientName: 'Test Client'
        // generateMealPrep not specified, should default to true
      };

      const result = await mealPlanService.generateMealPlan(params, 'test-user-id');

      expect(result.startOfWeekMealPrep).toBeDefined();
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle meal plan with no meals', () => {
      const emptyMealPlan = {
        ...mockMealPlan,
        meals: []
      };

      const mealPrep = (mealPlanService as any).generateMealPrepInstructions(emptyMealPlan);

      expect(mealPrep.shoppingList).toHaveLength(0);
      expect(mealPrep.storageInstructions).toHaveLength(0);
      expect(mealPrep.totalPrepTime).toBeGreaterThan(0); // Should still have final cleanup step
    });

    it('should handle recipes with missing or empty ingredients', () => {
      const mealPlanWithEmptyRecipes = {
        ...mockMealPlan,
        meals: [
          {
            day: 1,
            mealNumber: 1,
            mealType: 'breakfast',
            recipe: {
              id: '1',
              name: 'Empty Recipe',
              description: 'Recipe with no ingredients',
              caloriesKcal: 300,
              proteinGrams: '10',
              carbsGrams: '30',
              fatGrams: '5',
              prepTimeMinutes: 5,
              cookTimeMinutes: 0,
              servings: 1,
              mealTypes: ['breakfast'],
              ingredientsJson: []
            }
          }
        ]
      };

      const mealPrep = (mealPlanService as any).generateMealPrepInstructions(mealPlanWithEmptyRecipes);

      expect(mealPrep.shoppingList).toHaveLength(0);
      expect(mealPrep.storageInstructions).toHaveLength(0);
      expect(mealPrep.prepInstructions.length).toBeGreaterThan(0); // Should still have final step
    });

    it('should handle ingredients with zero or invalid amounts', () => {
      const mealPlanWithInvalidAmounts = {
        ...mockMealPlan,
        meals: [
          {
            day: 1,
            mealNumber: 1,
            mealType: 'breakfast',
            recipe: {
              id: '1',
              name: 'Invalid Amounts Recipe',
              description: 'Recipe with invalid amounts',
              caloriesKcal: 300,
              proteinGrams: '10',
              carbsGrams: '30',
              fatGrams: '5',
              prepTimeMinutes: 5,
              cookTimeMinutes: 0,
              servings: 1,
              mealTypes: ['breakfast'],
              ingredientsJson: [
                { name: 'Test Ingredient 1', amount: '0', unit: 'g' },
                { name: 'Test Ingredient 2', amount: '', unit: 'g' },
                { name: 'Test Ingredient 3', amount: 'invalid', unit: 'g' }
              ]
            }
          }
        ]
      };

      const mealPrep = (mealPlanService as any).generateMealPrepInstructions(mealPlanWithInvalidAmounts);

      expect(mealPrep.shoppingList.length).toBe(3);
      
      // Should handle invalid amounts gracefully
      mealPrep.shoppingList.forEach(item => {
        expect(item.totalAmount).toBeTruthy(); // Should have some default value
      });
    });
  });
});