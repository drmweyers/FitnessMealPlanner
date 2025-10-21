/**
 * Unit Tests for Manual Meal Plan Parser
 *
 * Tests the parsing of free-text meal plans into structured meal plan data.
 * Validates ingredient parsing, unit conversion, and meal organization.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { parseManualMealPlan, convertToMealPlan } from '../../server/services/manualMealPlanParser';
import type { ManualMealPlanInput } from '../../shared/schema';

describe('Manual Meal Plan Parser', () => {
  let sampleInput: ManualMealPlanInput;

  beforeEach(() => {
    sampleInput = {
      planName: 'Test Meal Plan',
      fitnessGoal: 'muscle_gain',
      days: 1,
      mealsPerDay: 3,
      pastedText: '',
      generateImages: false,
    };
  });

  describe('parseManualMealPlan', () => {
    it('should parse the provided three-meal example correctly', () => {
      const exampleText = `Meal 1
-175g of Jasmine Rice
-150g of Lean ground beef
-100g of cooked broccoli
Meal 2
-4 eggs
-2 slices of whole wheat bread
-1 tbsp olive oil
Meal 3
-200ml of milk
-1 banana
-30g of protein powder`;

      const input = { ...sampleInput, pastedText: exampleText };
      const result = parseManualMealPlan(input);

      expect(result.meals).toHaveLength(3);
      expect(result.parseWarnings).toHaveLength(0);

      // Check Meal 1
      const meal1 = result.meals[0];
      expect(meal1.day).toBe(1);
      expect(meal1.mealNumber).toBe(1);
      expect(meal1.mealType).toBe('unspecified');
      expect(meal1.ingredients).toHaveLength(3);

      expect(meal1.ingredients[0].name).toBe('Jasmine Rice');
      expect(meal1.ingredients[0].displayQuantity).toBe('175 g');
      expect(meal1.ingredients[0].quantitySI).toBe(175);
      expect(meal1.ingredients[0].unitSI).toBe('g');

      expect(meal1.ingredients[1].name).toBe('Lean ground beef');
      expect(meal1.ingredients[1].displayQuantity).toBe('150 g');
      expect(meal1.ingredients[1].quantitySI).toBe(150);
      expect(meal1.ingredients[1].unitSI).toBe('g');

      expect(meal1.ingredients[2].name).toBe('cooked broccoli');
      expect(meal1.ingredients[2].displayQuantity).toBe('100 g');
      expect(meal1.ingredients[2].quantitySI).toBe(100);
      expect(meal1.ingredients[2].unitSI).toBe('g');

      // Check Meal 2
      const meal2 = result.meals[1];
      expect(meal2.day).toBe(1);
      expect(meal2.mealNumber).toBe(2);
      expect(meal2.ingredients).toHaveLength(3);

      expect(meal2.ingredients[0].name).toBe('eggs');
      expect(meal2.ingredients[0].displayQuantity).toBe('4');
      expect(meal2.ingredients[0].quantitySI).toBeUndefined(); // Count units don't convert

      expect(meal2.ingredients[1].name).toBe('whole wheat bread');
      expect(meal2.ingredients[1].displayQuantity).toBe('2 slices');
      expect(meal2.ingredients[1].quantitySI).toBeUndefined(); // Slices don't convert

      expect(meal2.ingredients[2].name).toBe('olive oil');
      expect(meal2.ingredients[2].displayQuantity).toBe('1 tbsp');
      expect(meal2.ingredients[2].quantitySI).toBe(15); // 1 tbsp = 15ml
      expect(meal2.ingredients[2].unitSI).toBe('ml');

      // Check Meal 3
      const meal3 = result.meals[2];
      expect(meal3.day).toBe(1);
      expect(meal3.mealNumber).toBe(3);
      expect(meal3.ingredients).toHaveLength(3);

      expect(meal3.ingredients[0].name).toBe('milk');
      expect(meal3.ingredients[0].displayQuantity).toBe('200 ml');
      expect(meal3.ingredients[0].quantitySI).toBe(200);
      expect(meal3.ingredients[0].unitSI).toBe('ml');

      expect(meal3.ingredients[1].name).toBe('banana');
      expect(meal3.ingredients[1].displayQuantity).toBe('1');
      expect(meal3.ingredients[1].quantitySI).toBeUndefined(); // Count units

      expect(meal3.ingredients[2].name).toBe('protein powder');
      expect(meal3.ingredients[2].displayQuantity).toBe('30 g');
      expect(meal3.ingredients[2].quantitySI).toBe(30);
      expect(meal3.ingredients[2].unitSI).toBe('g');
    });

    it('should handle various unit formats correctly', () => {
      const testText = `Meal 1
-1 cup rice
-2 cups water
-1 tsp salt
-1 tbsp oil
-250 ml milk
-1 kg chicken`;

      const input = { ...sampleInput, pastedText: testText };
      const result = parseManualMealPlan(input);

      const ingredients = result.meals[0].ingredients;

      // Cup conversions
      expect(ingredients[0].quantitySI).toBe(240); // 1 cup = 240ml
      expect(ingredients[0].unitSI).toBe('ml');
      expect(ingredients[1].quantitySI).toBe(480); // 2 cups = 480ml

      // Teaspoon conversion
      expect(ingredients[2].quantitySI).toBe(5); // 1 tsp = 5ml
      expect(ingredients[2].unitSI).toBe('ml');

      // Tablespoon conversion
      expect(ingredients[3].quantitySI).toBe(15); // 1 tbsp = 15ml
      expect(ingredients[3].unitSI).toBe('ml');

      // Direct ml
      expect(ingredients[4].quantitySI).toBe(250);
      expect(ingredients[4].unitSI).toBe('ml');

      // Kilogram conversion
      expect(ingredients[5].quantitySI).toBe(1000); // 1 kg = 1000g
      expect(ingredients[5].unitSI).toBe('g');
    });

    it('should handle ingredients without quantities', () => {
      const testText = `Meal 1
-Salt to taste
-Fresh herbs
-2 eggs`;

      const input = { ...sampleInput, pastedText: testText };
      const result = parseManualMealPlan(input);

      const ingredients = result.meals[0].ingredients;
      expect(ingredients).toHaveLength(3);

      expect(ingredients[0].name).toBe('Salt to taste');
      expect(ingredients[0].quantitySI).toBeUndefined();
      expect(ingredients[0].displayQuantity).toBeUndefined();

      expect(ingredients[1].name).toBe('Fresh herbs');
      expect(ingredients[1].quantitySI).toBeUndefined();

      expect(ingredients[2].name).toBe('eggs');
      expect(ingredients[2].displayQuantity).toBe('2');
    });

    it('should handle multi-day meal plans', () => {
      const testText = `Day 1
Meal 1
-200g chicken
Meal 2
-150g rice
Day 2
Meal 1
-180g fish
Meal 2
-100g pasta`;

      const input = { ...sampleInput, pastedText: testText, days: 2 };
      const result = parseManualMealPlan(input);

      expect(result.meals).toHaveLength(4);

      // Day 1 meals
      expect(result.meals[0].day).toBe(1);
      expect(result.meals[0].mealNumber).toBe(1);
      expect(result.meals[0].ingredients[0].name).toBe('chicken');

      expect(result.meals[1].day).toBe(1);
      expect(result.meals[1].mealNumber).toBe(2);
      expect(result.meals[1].ingredients[0].name).toBe('rice');

      // Day 2 meals
      expect(result.meals[2].day).toBe(2);
      expect(result.meals[2].mealNumber).toBe(1);
      expect(result.meals[2].ingredients[0].name).toBe('fish');

      expect(result.meals[3].day).toBe(2);
      expect(result.meals[3].mealNumber).toBe(2);
      expect(result.meals[3].ingredients[0].name).toBe('pasta');
    });

    it('should handle different meal type specifications', () => {
      const testText = `Meal 1: Breakfast
-2 eggs
-1 slice toast
Meal 2 - Lunch
-150g chicken
-100g rice
Meal 3: Dinner
-200g salmon
-80g vegetables`;

      const input = { ...sampleInput, pastedText: testText };
      const result = parseManualMealPlan(input);

      expect(result.meals[0].mealType).toBe('breakfast');
      expect(result.meals[1].mealType).toBe('lunch');
      expect(result.meals[2].mealType).toBe('dinner');
    });

    it('should handle edge cases and provide warnings', () => {
      const testText = `Meal 1
-Invalid line with no dash
-175xyz of something weird
-Normal 100g chicken

Meal 2
-200g beef`;

      const input = { ...sampleInput, pastedText: testText };
      const result = parseManualMealPlan(input);

      expect(result.meals).toHaveLength(2);
      expect(result.parseWarnings.length).toBeGreaterThan(0);

      // Should still parse valid ingredients
      const meal1 = result.meals[0];
      expect(meal1.ingredients).toHaveLength(1); // Only the valid "Normal 100g chicken"
      expect(meal1.ingredients[0].name).toBe('Normal chicken');
    });

    it('should throw error when no valid meals found', () => {
      const input = { ...sampleInput, pastedText: 'Invalid text with no meals' };

      expect(() => parseManualMealPlan(input)).toThrow('No valid meals found');
    });
  });

  describe('convertToMealPlan', () => {
    it('should convert parsed meals to meal plan structure', () => {
      const exampleText = `Meal 1
-175g of Jasmine Rice
Meal 2
-4 eggs`;

      const input = { ...sampleInput, pastedText: exampleText };
      const parseResult = parseManualMealPlan(input);
      const imageUrls = { 'day1-meal1': 'http://example.com/image1.jpg' };

      const mealPlan = convertToMealPlan(input, parseResult.meals, imageUrls);

      expect(mealPlan.id).toContain('manual-');
      expect(mealPlan.planName).toBe('Test Meal Plan');
      expect(mealPlan.fitnessGoal).toBe('muscle_gain');
      expect(mealPlan.source).toBe('manual');
      expect(mealPlan.days).toBe(1);
      expect(mealPlan.mealsPerDay).toBe(3);

      expect(mealPlan.meals).toHaveLength(2);
      expect(mealPlan.meals[0].manual).toBe(true);
      expect(mealPlan.meals[0].manualIngredients).toHaveLength(1);
      expect(mealPlan.meals[0].recipe).toBeUndefined();
      expect(mealPlan.meals[0].imageUrl).toBe('http://example.com/image1.jpg');

      expect(mealPlan.meals[1].manual).toBe(true);
      expect(mealPlan.meals[1].imageUrl).toBeUndefined();
    });

    it('should handle empty image URLs', () => {
      const exampleText = `Meal 1
-175g rice`;

      const input = { ...sampleInput, pastedText: exampleText };
      const parseResult = parseManualMealPlan(input);

      const mealPlan = convertToMealPlan(input, parseResult.meals);

      expect(mealPlan.meals[0].imageUrl).toBeUndefined();
    });
  });

  describe('Unit Conversion Edge Cases', () => {
    it('should handle fluid ounces correctly', () => {
      const testText = `Meal 1
-8 fl oz orange juice
-2 fluid ounces water`;

      const input = { ...sampleInput, pastedText: testText };
      const result = parseManualMealPlan(input);

      const ingredients = result.meals[0].ingredients;
      expect(ingredients[0].quantitySI).toBeCloseTo(236.56, 1); // 8 fl oz ≈ 236.56ml
      expect(ingredients[1].quantitySI).toBeCloseTo(59.14, 1); // 2 fl oz ≈ 59.14ml
    });

    it('should handle ounces (weight) correctly', () => {
      const testText = `Meal 1
-4 oz chicken
-2 ounces cheese`;

      const input = { ...sampleInput, pastedText: testText };
      const result = parseManualMealPlan(input);

      const ingredients = result.meals[0].ingredients;
      expect(ingredients[0].quantitySI).toBeCloseTo(113.4, 1); // 4 oz ≈ 113.4g
      expect(ingredients[1].quantitySI).toBeCloseTo(56.7, 1); // 2 oz ≈ 56.7g
    });

    it('should handle pounds correctly', () => {
      const testText = `Meal 1
-1 lb ground beef
-0.5 pounds chicken`;

      const input = { ...sampleInput, pastedText: testText };
      const result = parseManualMealPlan(input);

      const ingredients = result.meals[0].ingredients;
      expect(ingredients[0].quantitySI).toBeCloseTo(453.59, 1); // 1 lb ≈ 453.59g
      expect(ingredients[1].quantitySI).toBeCloseTo(226.8, 1); // 0.5 lb ≈ 226.8g
    });

    it('should handle liters correctly', () => {
      const testText = `Meal 1
-1 l water
-0.5 liters milk`;

      const input = { ...sampleInput, pastedText: testText };
      const result = parseManualMealPlan(input);

      const ingredients = result.meals[0].ingredients;
      expect(ingredients[0].quantitySI).toBe(1000); // 1 l = 1000ml
      expect(ingredients[1].quantitySI).toBe(500); // 0.5 l = 500ml
    });
  });

  describe('Parsing Robustness', () => {
    it('should handle extra whitespace and mixed line endings', () => {
      const testText = `  Meal 1  \r\n  -  175g  rice  \n\n   -  100g   chicken   \r\n\r\nMeal 2\r\n-200ml  milk   `;

      const input = { ...sampleInput, pastedText: testText };
      const result = parseManualMealPlan(input);

      expect(result.meals).toHaveLength(2);
      expect(result.meals[0].ingredients).toHaveLength(2);
      expect(result.meals[0].ingredients[0].name).toBe('rice');
      expect(result.meals[0].ingredients[1].name).toBe('chicken');
      expect(result.meals[1].ingredients[0].name).toBe('milk');
    });

    it('should handle different bullet point styles', () => {
      const testText = `Meal 1
• 175g rice
* 100g chicken
- 50g vegetables`;

      const input = { ...sampleInput, pastedText: testText };
      const result = parseManualMealPlan(input);

      expect(result.meals[0].ingredients).toHaveLength(3);
      expect(result.meals[0].ingredients[0].name).toBe('rice');
      expect(result.meals[0].ingredients[1].name).toBe('chicken');
      expect(result.meals[0].ingredients[2].name).toBe('vegetables');
    });

    it('should handle decimal quantities', () => {
      const testText = `Meal 1
-1.5 cups rice
-0.5 tbsp oil
-2.25 g salt`;

      const input = { ...sampleInput, pastedText: testText };
      const result = parseManualMealPlan(input);

      const ingredients = result.meals[0].ingredients;
      expect(ingredients[0].quantitySI).toBe(360); // 1.5 cups = 360ml
      expect(ingredients[1].quantitySI).toBe(7.5); // 0.5 tbsp = 7.5ml
      expect(ingredients[2].quantitySI).toBe(2.25); // 2.25g
    });
  });
});