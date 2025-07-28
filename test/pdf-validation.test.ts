/**
 * PDF Validation Utilities Tests
 * 
 * Tests for server/utils/pdfValidation.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { validateMealPlanData, sanitizeText, sanitizeHtml, formatIngredientAmount } from '../server/utils/pdfValidation';

describe('PDF Validation Utilities', () => {
  describe('validateMealPlanData', () => {
    const validMealPlan = {
      id: 'test-plan-123',
      planName: 'Test Meal Plan',
      fitnessGoal: 'muscle_building',
      description: 'A test meal plan',
      dailyCalorieTarget: 2500,
      days: 7,
      mealsPerDay: 3,
      meals: [
        {
          day: 1,
          mealNumber: 1,
          mealType: 'breakfast',
          recipe: {
            id: 'recipe-1',
            name: 'Test Recipe',
            description: 'A test recipe',
            caloriesKcal: 400,
            proteinGrams: '30',
            carbsGrams: '45',
            fatGrams: '15',
            prepTimeMinutes: 20,
            servings: 1,
            mealTypes: ['breakfast'],
            dietaryTags: ['high-protein'],
            ingredientsJson: [
              { name: 'Oats', amount: '1', unit: 'cup' }
            ],
            instructionsText: '1. Cook oats. 2. Serve hot.'
          }
        }
      ]
    };

    it('should validate correct meal plan data', () => {
      const result = validateMealPlanData(validMealPlan);
      expect(result).toBeDefined();
      expect(result.planName).toBe('Test Meal Plan');
      expect(result.meals).toHaveLength(1);
    });

    it('should handle meal plan data wrapped in mealPlanData property', () => {
      const wrappedData = { mealPlanData: validMealPlan };
      const result = validateMealPlanData(wrappedData);
      expect(result.planName).toBe('Test Meal Plan');
    });

    it('should handle meal plan with meals in root', () => {
      const dataWithRootMeals = {
        planName: 'Root Meals Plan',
        fitnessGoal: 'weight_loss',
        dailyCalorieTarget: 1800,
        days: 5,
        mealsPerDay: 3,
        meals: validMealPlan.meals
      };
      const result = validateMealPlanData(dataWithRootMeals);
      expect(result.planName).toBe('Root Meals Plan');
      expect(result.meals).toHaveLength(1);
    });

    it('should throw error for missing plan name', () => {
      const invalidData = { ...validMealPlan, planName: '' };
      expect(() => validateMealPlanData(invalidData)).toThrow('Plan name is required');
    });

    it('should throw error for missing fitness goal', () => {
      const invalidData = { ...validMealPlan, fitnessGoal: '' };
      expect(() => validateMealPlanData(invalidData)).toThrow('Fitness goal is required');
    });

    it('should throw error for invalid calorie target', () => {
      const invalidData = { ...validMealPlan, dailyCalorieTarget: 100 };
      expect(() => validateMealPlanData(invalidData)).toThrow();
    });

    it('should throw error for extreme days count', () => {
      const invalidData = { ...validMealPlan, days: 500 };
      expect(() => validateMealPlanData(invalidData)).toThrow();
    });

    it('should throw error for no meals', () => {
      const invalidData = { ...validMealPlan, meals: [] };
      expect(() => validateMealPlanData(invalidData)).toThrow('At least one meal is required');
    });

    it('should throw error for meal day beyond plan duration', () => {
      const invalidData = {
        ...validMealPlan,
        days: 3,
        meals: [{
          ...validMealPlan.meals[0],
          day: 5 // Beyond 3-day plan
        }]
      };
      expect(() => validateMealPlanData(invalidData)).toThrow('Meals found for days beyond plan duration');
    });

    it('should handle extreme calorie counts with warning', () => {
      const extremeCalorieData = {
        ...validMealPlan,
        meals: [{
          ...validMealPlan.meals[0],
          recipe: {
            ...validMealPlan.meals[0].recipe,
            caloriesKcal: 500 // Low calories per day
          }
        }]
      };
      
      // Should validate but log warning
      const result = validateMealPlanData(extremeCalorieData);
      expect(result).toBeDefined();
    });
  });

  describe('sanitizeText', () => {
    it('should return empty string for null/undefined input', () => {
      expect(sanitizeText('')).toBe('');
      expect(sanitizeText(null as any)).toBe('');
      expect(sanitizeText(undefined as any)).toBe('');
    });

    it('should remove special characters', () => {
      const input = 'Test <script>alert("hack")</script> text!';
      const result = sanitizeText(input);
      expect(result).toBe('Test scriptalert("hack")/script text!');
    });

    it('should normalize whitespace', () => {
      const input = 'Text   with    multiple   spaces';
      const result = sanitizeText(input);
      expect(result).toBe('Text with multiple spaces');
    });

    it('should limit text length to 500 characters', () => {
      const longText = 'a'.repeat(600);
      const result = sanitizeText(longText);
      expect(result).toHaveLength(500);
    });

    it('should preserve allowed punctuation', () => {
      const input = 'Recipe: Mix ingredients, cook for 10 minutes. Serve hot!';
      const result = sanitizeText(input);
      expect(result).toBe('Recipe: Mix ingredients, cook for 10 minutes. Serve hot!');
    });
  });

  describe('sanitizeHtml', () => {
    it('should return empty string for null/undefined input', () => {
      expect(sanitizeHtml('')).toBe('');
      expect(sanitizeHtml(null as any)).toBe('');
    });

    it('should remove script tags', () => {
      const input = '<p>Safe content</p><script>alert("hack")</script>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('<script>');
      expect(result).toContain('<p>Safe content</p>');
    });

    it('should remove iframe tags', () => {
      const input = '<p>Content</p><iframe src="evil.com"></iframe>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('<iframe>');
      expect(result).toContain('<p>Content</p>');
    });

    it('should remove javascript: URLs', () => {
      const input = '<a href="javascript:alert(1)">Link</a>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('javascript:');
    });

    it('should remove event handlers', () => {
      const input = '<button onclick="alert(1)">Click me</button>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onclick=');
    });
  });

  describe('formatIngredientAmount', () => {
    it('should return original string for non-numeric amounts', () => {
      expect(formatIngredientAmount('pinch', 'tsp')).toBe('pinch');
      expect(formatIngredientAmount('to taste', 'unit')).toBe('to taste');
    });

    it('should format fractions for volume units', () => {
      expect(formatIngredientAmount('0.5', 'cup')).toBe('1/2');
      expect(formatIngredientAmount('0.25', 'cups')).toBe('1/4');
      expect(formatIngredientAmount('0.333', 'tsp')).toBe('1/3');
      expect(formatIngredientAmount('0.75', 'tbsp')).toBe('3/4');
    });

    it('should format mixed numbers for volume units', () => {
      expect(formatIngredientAmount('1.5', 'cup')).toBe('1 1/2');
      expect(formatIngredientAmount('2.25', 'cups')).toBe('2 1/4');
    });

    it('should format decimals for weight units', () => {
      expect(formatIngredientAmount('1.5', 'kg')).toBe('1.5');
      expect(formatIngredientAmount('2.0', 'g')).toBe('2');
      expect(formatIngredientAmount('0.5', 'oz')).toBe('0.5');
      expect(formatIngredientAmount('3.0', 'lb')).toBe('3');
    });

    it('should handle whole numbers', () => {
      expect(formatIngredientAmount('2', 'cup')).toBe('2');
      expect(formatIngredientAmount('1', 'kg')).toBe('1');
    });

    it('should use default formatting for unknown units', () => {
      expect(formatIngredientAmount('1.5', 'pieces')).toBe('1.50');
      expect(formatIngredientAmount('2.0', 'items')).toBe('2');
    });

    it('should handle edge cases in fraction formatting', () => {
      expect(formatIngredientAmount('0.1', 'cup')).toBe('1/8'); // Closest fraction to 0.1 is 1/8 (0.125)
      expect(formatIngredientAmount('0.9', 'cup')).toBe('0.90'); // No close fraction
    });
  });
});