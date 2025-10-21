/**
 * Enhanced Manual Meal Plan Service Tests
 *
 * Tests for structured format parsing with ingredient extraction
 */

import { describe, test, expect } from 'vitest';
import { ManualMealPlanService } from '../../../server/services/manualMealPlanService';

describe('ManualMealPlanService - Enhanced Parser', () => {
  const service = new ManualMealPlanService();

  describe('Format Detection', () => {
    test('detects simple format with category prefix', () => {
      const text = 'Breakfast: Oatmeal with berries\nLunch: Chicken salad';
      const meals = service.parseMealEntries(text);

      expect(meals).toHaveLength(2);
      expect(meals[0].mealName).toBe('Oatmeal with berries');
      expect(meals[0].category).toBe('breakfast');
    });

    test('detects structured format with Meal headers', () => {
      const text = `
        Meal 1
        -175g of Jasmine Rice
        -150g of Lean ground beef
      `;
      const meals = service.parseMealEntries(text);

      expect(meals).toHaveLength(1);
      expect(meals[0].ingredients).toBeDefined();
      expect(meals[0].ingredients).toHaveLength(2);
    });

    test('detects structured format with measurements', () => {
      const text = `
        Meal 1
        -4 eggs
        -2 pieces of bread
      `;
      const meals = service.parseMealEntries(text);

      expect(meals).toHaveLength(1);
      expect(meals[0].ingredients).toHaveLength(2);
    });

    test('handles simple format without headers', () => {
      const text = 'Oatmeal\nChicken salad\nSteak and rice';
      const meals = service.parseMealEntries(text);

      expect(meals).toHaveLength(3);
      expect(meals[0].mealName).toBe('Oatmeal');
    });
  });

  describe('Structured Format Parsing', () => {
    test('parses meal with gram measurements', () => {
      const text = `
        Meal 1
        -175g of Jasmine Rice
        -150g of Lean ground beef
        -100g of cooked broccoli
      `;
      const meals = service.parseMealEntries(text);

      expect(meals).toHaveLength(1);
      expect(meals[0].ingredients).toEqual([
        { amount: '175', unit: 'g', ingredient: 'Jasmine Rice' },
        { amount: '150', unit: 'g', ingredient: 'Lean ground beef' },
        { amount: '100', unit: 'g', ingredient: 'cooked broccoli' }
      ]);
    });

    test('parses meal with unit counts', () => {
      const text = `
        Meal 1
        -4 eggs
        -2 pieces of sourdough bread
        -1 banana (100g)
      `;
      const meals = service.parseMealEntries(text);

      expect(meals[0].ingredients).toEqual([
        { amount: '4', unit: 'unit', ingredient: 'eggs' },
        { amount: '2', unit: 'pieces', ingredient: 'sourdough bread' },
        { amount: '1', unit: 'unit', ingredient: 'banana (100g)' }
      ]);
    });

    test('parses meal with ml measurements', () => {
      const text = `
        Meal 1
        -250ml of coconut water
        -15ml of honey
      `;
      const meals = service.parseMealEntries(text);

      expect(meals[0].ingredients[0]).toEqual({
        amount: '250',
        unit: 'ml',
        ingredient: 'coconut water'
      });
      expect(meals[0].ingredients[1]).toEqual({
        amount: '15',
        unit: 'ml',
        ingredient: 'honey'
      });
    });

    test('handles "of" keyword in ingredients', () => {
      const text = `
        Meal 1
        -175g of Jasmine Rice
        -150g Lean ground beef
      `;
      const meals = service.parseMealEntries(text);

      // Both should work with or without "of"
      expect(meals[0].ingredients[0].ingredient).toBe('Jasmine Rice');
      expect(meals[0].ingredients[1].ingredient).toBe('Lean ground beef');
    });

    test('parses multiple meals', () => {
      const text = `
        Meal 1
        -175g of rice
        -100g chicken

        Meal 2
        -4 eggs
        -2 bread

        Meal 3
        -100g turkey
        -150g sweet potato
      `;
      const meals = service.parseMealEntries(text);

      expect(meals).toHaveLength(3);
      expect(meals[0].ingredients).toHaveLength(2);
      expect(meals[1].ingredients).toHaveLength(2);
      expect(meals[2].ingredients).toHaveLength(2);
    });

    test('parses user example format exactly', () => {
      const text = `
Meal 1

-175g of Jasmine Rice
-150g of Lean ground beef
-100g of cooked broccoli

Meal 2

-4 eggs
-2 pieces of sourdough bread
-1 banana (100g)
-50g of strawberries
-10g of butter
-15ml of honey

Meal 3

-100g turkey breast
-150g of sweet potato
-100g of asparagus
-250ml of coconut water
      `;
      const meals = service.parseMealEntries(text);

      expect(meals).toHaveLength(3);

      // Meal 1
      expect(meals[0].ingredients).toHaveLength(3);
      expect(meals[0].mealName).toContain('Jasmine Rice');

      // Meal 2
      expect(meals[1].ingredients).toHaveLength(6);
      expect(meals[1].mealName).toContain('Eggs'); // Capitalized

      // Meal 3
      expect(meals[2].ingredients).toHaveLength(4);
      expect(meals[2].mealName).toContain('Turkey breast'); // Capitalized
    });
  });

  describe('Meal Name Generation', () => {
    test('generates name from single ingredient', () => {
      const text = `
        Meal 1
        -100g Oatmeal
      `;
      const meals = service.parseMealEntries(text);

      expect(meals[0].mealName).toBe('Oatmeal');
    });

    test('generates name from two ingredients', () => {
      const text = `
        Meal 1
        -100g rice
        -100g chicken
      `;
      const meals = service.parseMealEntries(text);

      expect(meals[0].mealName).toBe('Rice and Chicken');
    });

    test('generates name from three ingredients', () => {
      const text = `
        Meal 1
        -175g of rice
        -100g of chicken
        -50g of broccoli
      `;
      const meals = service.parseMealEntries(text);

      expect(meals[0].mealName).toBe('Rice, Chicken, and Broccoli');
    });

    test('capitalizes ingredient names', () => {
      const text = `
        Meal 1
        -100g jasmine rice
        -100g lean ground beef
      `;
      const meals = service.parseMealEntries(text);

      expect(meals[0].mealName).toBe('Jasmine rice and Lean ground beef');
    });

    test('limits to first 3 ingredients for long lists', () => {
      const text = `
        Meal 1
        -4 eggs
        -2 pieces bread
        -1 banana
        -50g strawberries
        -10g butter
        -15ml honey
      `;
      const meals = service.parseMealEntries(text);

      // Should only include first 3
      expect(meals[0].mealName).toBe('Eggs, Bread, and Banana');
    });
  });

  describe('Category Detection from Ingredients', () => {
    test('detects breakfast from eggs', () => {
      const text = `
        Meal 1
        -4 eggs
        -2 pieces of toast
      `;
      const meals = service.parseMealEntries(text);

      expect(meals[0].category).toBe('breakfast');
    });

    test('detects dinner from rice and meat', () => {
      const text = `
        Meal 1
        -175g of rice
        -150g of steak
      `;
      const meals = service.parseMealEntries(text);

      expect(meals[0].category).toBe('dinner');
    });

    test('detects lunch from sandwich ingredients', () => {
      const text = `
        Meal 1
        -2 slices bread
        -100g turkey
        -1 sandwich
      `;
      const meals = service.parseMealEntries(text);

      // With sandwich keyword, should detect as lunch
      expect(meals[0].category).toBe('lunch');
    });

    test('detects snack from yogurt', () => {
      const text = `
        Meal 1
        -Greek yogurt
        -almonds
      `;
      const meals = service.parseMealEntries(text);

      expect(meals[0].category).toBe('snack');
    });
  });

  describe('Edge Cases', () => {
    test('handles empty text', () => {
      const meals = service.parseMealEntries('');
      expect(meals).toEqual([]);
    });

    test('handles whitespace-only text', () => {
      const meals = service.parseMealEntries('   \n\n   ');
      expect(meals).toEqual([]);
    });

    test('handles malformed measurements', () => {
      const text = `Meal 1\n-some rice\n-a bit of chicken`;
      const meals = service.parseMealEntries(text);

      // Should parse as structured format due to Meal X header and bullet points
      expect(meals).toHaveLength(1);
      expect(meals[0].ingredients).toHaveLength(2);
      expect(meals[0].ingredients[0]).toEqual({
        amount: '1',
        unit: 'serving',
        ingredient: 'some rice'
      });
    });

    test('handles mixed bullet point styles', () => {
      const text = `
        Meal 1
        -175g rice
        •100g chicken
      `;
      const meals = service.parseMealEntries(text);

      expect(meals[0].ingredients).toHaveLength(2);
    });

    test('handles decimal measurements', () => {
      const text = `
        Meal 1
        -175.5g of rice
        -0.5 cup of oil
      `;
      const meals = service.parseMealEntries(text);

      expect(meals[0].ingredients[0].amount).toBe('175.5');
      expect(meals[0].ingredients[1].amount).toBe('0.5');
    });

    test('ignores non-ingredient lines in meal blocks', () => {
      const text = `
        Meal 1
        This is a note
        -175g rice
        Another note
        -100g chicken
      `;
      const meals = service.parseMealEntries(text);

      // Should only parse lines starting with - or •
      expect(meals[0].ingredients).toHaveLength(2);
    });

    test('handles meal blocks without ingredients', () => {
      const text = `
        Meal 1

        Meal 2
        -100g chicken
      `;
      const meals = service.parseMealEntries(text);

      // Should skip empty meal blocks
      expect(meals).toHaveLength(1);
      expect(meals[0].ingredients[0].ingredient).toBe('chicken');
    });
  });

  describe('Backward Compatibility', () => {
    test('still supports simple format', () => {
      const text = 'Breakfast: Oatmeal\nLunch: Chicken wrap\nDinner: Steak';
      const meals = service.parseMealEntries(text);

      expect(meals).toHaveLength(3);
      expect(meals[0].category).toBe('breakfast');
      expect(meals[1].category).toBe('lunch');
      expect(meals[2].category).toBe('dinner');
    });

    test('still supports plain meal names', () => {
      const text = 'Oatmeal\nChicken wrap\nSteak with vegetables';
      const meals = service.parseMealEntries(text);

      expect(meals).toHaveLength(3);
      expect(meals[0].mealName).toBe('Oatmeal');
    });

    test('does not break existing functionality', () => {
      const text = 'Scrambled eggs\nGrilled chicken salad\nBaked salmon';
      const meals = service.parseMealEntries(text);

      expect(meals).toHaveLength(3);
      expect(meals[0].category).toBe('breakfast');
      expect(meals[1].category).toBe('lunch');
      expect(meals[2].category).toBe('dinner');
    });
  });

  describe('Integration Tests', () => {
    test('can create meal plan from parsed structured meals', async () => {
      const text = `
        Meal 1
        -175g of rice
        -100g of chicken
      `;
      const meals = service.parseMealEntries(text);

      const mealPlan = await service.createManualMealPlan(
        meals,
        'trainer-123',
        'Test Plan'
      );

      expect(mealPlan.planName).toBe('Test Plan');
      expect(mealPlan.meals).toHaveLength(1);
      expect(mealPlan.meals[0].imageUrl).toBeDefined();
    });

    test('assigns random images to structured meals', async () => {
      const text = `
        Meal 1
        -eggs

        Meal 2
        -chicken wrap
      `;
      const meals = service.parseMealEntries(text);

      const mealPlan = await service.createManualMealPlan(
        meals,
        'trainer-123',
        'Test Plan'
      );

      expect(mealPlan.meals[0].imageUrl).toBeTruthy();
      expect(mealPlan.meals[1].imageUrl).toBeTruthy();
      // Images should be from appropriate categories
      expect(typeof mealPlan.meals[0].imageUrl).toBe('string');
    });
  });
});
