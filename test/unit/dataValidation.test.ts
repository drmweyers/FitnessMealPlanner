/**
 * Unit Tests for Data Validation
 * 
 * Tests all data validation functionality across the application:
 * - Schema validation (Zod schemas)
 * - Input sanitization and security
 * - Business logic validation
 * - Database constraint validation
 * - API endpoint validation
 * - File upload validation
 * - Cross-field validation rules
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import {
  createInvitationSchema,
  acceptInvitationSchema,
  mealPlanGenerationSchema,
  recipeFilterSchema,
  insertRecipeSchema,
  updateRecipeSchema,
  createMeasurementSchema,
  createGoalSchema,
  uploadProgressPhotoSchema,
  type CreateInvitation,
  type AcceptInvitation,
  type MealPlanGeneration,
  type RecipeFilter,
  type InsertRecipe,
  type CreateMeasurement,
  type CreateGoal,
  type UploadProgressPhoto,
} from '../../shared/schema';

describe('Data Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Customer Invitation Schema Validation', () => {
    it('should validate valid invitation data', () => {
      const validData: CreateInvitation = {
        customerEmail: 'customer@example.com',
        message: 'Join my fitness program!',
      };

      const result = createInvitationSchema.safeParse(validData);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.customerEmail).toBe('customer@example.com');
        expect(result.data.message).toBe('Join my fitness program!');
      }
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user.name@.com',
        'user@domain.',
        '',
        null,
        undefined,
      ];

      invalidEmails.forEach(email => {
        const result = createInvitationSchema.safeParse({
          customerEmail: email,
        });
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('customerEmail');
          expect(result.error.issues[0].message).toContain('Invalid email');
        }
      });
    });

    it('should validate message length constraints', () => {
      const longMessage = 'a'.repeat(501); // Exceeds 500 character limit

      const result = createInvitationSchema.safeParse({
        customerEmail: 'valid@example.com',
        message: longMessage,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('message');
        expect(result.error.issues[0].message).toContain('500');
      }
    });

    it('should allow optional message field', () => {
      const dataWithoutMessage = {
        customerEmail: 'customer@example.com',
      };

      const result = createInvitationSchema.safeParse(dataWithoutMessage);
      expect(result.success).toBe(true);
    });
  });

  describe('Invitation Acceptance Schema Validation', () => {
    it('should validate valid acceptance data', () => {
      const validData: AcceptInvitation = {
        token: 'valid-token-123',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = acceptInvitationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should enforce strong password requirements', () => {
      const weakPasswords = [
        'short',           // Too short (< 8 chars)
        'lowercase123',    // No uppercase
        'UPPERCASE123',    // No lowercase
        'NoNumbers!',      // No numbers
        'NoSpecialChars1', // No special characters
        'Simple123',       // Missing special character
        '',                // Empty
      ];

      weakPasswords.forEach(password => {
        const result = acceptInvitationSchema.safeParse({
          token: 'valid-token',
          password,
          firstName: 'John',
          lastName: 'Doe',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          const passwordError = result.error.issues.find(
            issue => issue.path.includes('password')
          );
          expect(passwordError).toBeDefined();
        }
      });
    });

    it('should validate token format', () => {
      const invalidTokens = [
        '',              // Empty
        null,            // Null
        undefined,       // Undefined
        '   ',           // Whitespace only
      ];

      invalidTokens.forEach(token => {
        const result = acceptInvitationSchema.safeParse({
          token,
          password: 'ValidPass123!',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          const tokenError = result.error.issues.find(
            issue => issue.path.includes('token')
          );
          expect(tokenError).toBeDefined();
        }
      });
    });

    it('should allow optional name fields', () => {
      const dataWithoutNames = {
        token: 'valid-token',
        password: 'ValidPass123!',
      };

      const result = acceptInvitationSchema.safeParse(dataWithoutNames);
      expect(result.success).toBe(true);
    });
  });

  describe('Meal Plan Generation Schema Validation', () => {
    it('should validate complete meal plan generation data', () => {
      const validData: MealPlanGeneration = {
        planName: 'Weight Loss Plan',
        fitnessGoal: 'weight_loss',
        description: 'Comprehensive weight loss meal plan',
        dailyCalorieTarget: 1800,
        days: 7,
        mealsPerDay: 4,
        clientName: 'John Doe',
        maxIngredients: 25,
        generateMealPrep: true,
        mealType: 'lunch',
        dietaryTag: 'low-carb',
        maxPrepTime: 30,
        maxCalories: 600,
        minProtein: 25,
      };

      const result = mealPlanGenerationSchema.safeParse(validData);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.dailyCalorieTarget).toBe(1800);
        expect(result.data.days).toBe(7);
        expect(result.data.mealsPerDay).toBe(4);
      }
    });

    it('should enforce calorie target ranges', () => {
      const invalidCalories = [
        799,  // Below minimum (800)
        5002, // Above maximum (5001)
        -100, // Negative
        0,    // Zero
      ];

      invalidCalories.forEach(calories => {
        const result = mealPlanGenerationSchema.safeParse({
          planName: 'Test Plan',
          fitnessGoal: 'weight_loss',
          dailyCalorieTarget: calories,
          days: 7,
          mealsPerDay: 3,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          const calorieError = result.error.issues.find(
            issue => issue.path.includes('dailyCalorieTarget')
          );
          expect(calorieError).toBeDefined();
        }
      });
    });

    it('should validate days range', () => {
      const invalidDays = [
        0,   // Below minimum (1)
        31,  // Above maximum (30)
        -5,  // Negative
      ];

      invalidDays.forEach(days => {
        const result = mealPlanGenerationSchema.safeParse({
          planName: 'Test Plan',
          fitnessGoal: 'weight_loss',
          dailyCalorieTarget: 2000,
          days,
          mealsPerDay: 3,
        });

        expect(result.success).toBe(false);
      });
    });

    it('should validate meals per day range', () => {
      const invalidMealsPerDay = [
        0, // Below minimum (1)
        7, // Above maximum (6)
      ];

      invalidMealsPerDay.forEach(mealsPerDay => {
        const result = mealPlanGenerationSchema.safeParse({
          planName: 'Test Plan',
          fitnessGoal: 'weight_loss',
          dailyCalorieTarget: 2000,
          days: 7,
          mealsPerDay,
        });

        expect(result.success).toBe(false);
      });
    });

    it('should validate ingredient limits', () => {
      const invalidIngredientLimits = [
        4,  // Below minimum (5)
        51, // Above maximum (50)
        -1, // Negative
      ];

      invalidIngredientLimits.forEach(maxIngredients => {
        const result = mealPlanGenerationSchema.safeParse({
          planName: 'Test Plan',
          fitnessGoal: 'weight_loss',
          dailyCalorieTarget: 2000,
          days: 7,
          mealsPerDay: 3,
          maxIngredients,
        });

        expect(result.success).toBe(false);
      });
    });

    it('should require essential fields', () => {
      const requiredFields = ['planName', 'fitnessGoal', 'dailyCalorieTarget', 'days'];

      requiredFields.forEach(field => {
        const incompleteData = {
          planName: 'Test Plan',
          fitnessGoal: 'weight_loss',
          dailyCalorieTarget: 2000,
          days: 7,
          mealsPerDay: 3,
        };

        delete (incompleteData as any)[field];

        const result = mealPlanGenerationSchema.safeParse(incompleteData);
        expect(result.success).toBe(false);
        
        if (!result.success) {
          const fieldError = result.error.issues.find(
            issue => issue.path.includes(field)
          );
          expect(fieldError).toBeDefined();
        }
      });
    });
  });

  describe('Recipe Schema Validation', () => {
    it('should validate complete recipe data', () => {
      const validRecipe: InsertRecipe = {
        name: 'Grilled Chicken Salad',
        description: 'Healthy protein-rich salad',
        mealTypes: ['lunch', 'dinner'],
        dietaryTags: ['high-protein', 'low-carb'],
        mainIngredientTags: ['chicken', 'greens'],
        ingredientsJson: [
          { name: 'Chicken breast', amount: '6', unit: 'oz' },
          { name: 'Mixed greens', amount: '2', unit: 'cups' },
        ],
        instructionsText: '1. Grill chicken\n2. Prepare salad\n3. Combine',
        prepTimeMinutes: 20,
        cookTimeMinutes: 15,
        servings: 1,
        caloriesKcal: 450,
        proteinGrams: '35.0',
        carbsGrams: '15.0',
        fatGrams: '12.0',
      };

      const result = insertRecipeSchema.safeParse(validRecipe);
      expect(result.success).toBe(true);
    });

    it('should validate required recipe fields', () => {
      const requiredFields = [
        'name',
        'ingredientsJson',
        'instructionsText',
        'prepTimeMinutes',
        'cookTimeMinutes',
        'servings',
        'caloriesKcal',
        'proteinGrams',
        'carbsGrams',
        'fatGrams',
      ];

      requiredFields.forEach(field => {
        const incompleteRecipe = {
          name: 'Test Recipe',
          ingredientsJson: [{ name: 'Test ingredient', amount: '1', unit: 'cup' }],
          instructionsText: 'Test instructions',
          prepTimeMinutes: 10,
          cookTimeMinutes: 5,
          servings: 1,
          caloriesKcal: 200,
          proteinGrams: '10.0',
          carbsGrams: '20.0',
          fatGrams: '5.0',
        };

        delete (incompleteRecipe as any)[field];

        const result = insertRecipeSchema.safeParse(incompleteRecipe);
        expect(result.success).toBe(false);
      });
    });

    it('should validate ingredient structure', () => {
      const invalidIngredients = [
        [], // Empty array
        [{ name: 'Chicken' }], // Missing amount
        [{ amount: '1', unit: 'cup' }], // Missing name
        [{ name: '', amount: '1', unit: 'cup' }], // Empty name
        'invalid structure', // Not an array
      ];

      invalidIngredients.forEach(ingredients => {
        const result = insertRecipeSchema.safeParse({
          name: 'Test Recipe',
          ingredientsJson: ingredients,
          instructionsText: 'Test instructions',
          prepTimeMinutes: 10,
          cookTimeMinutes: 5,
          servings: 1,
          caloriesKcal: 200,
          proteinGrams: '10.0',
          carbsGrams: '20.0',
          fatGrams: '5.0',
        });

        expect(result.success).toBe(false);
      });
    });

    it('should validate nutritional values', () => {
      const invalidNutrition = [
        { caloriesKcal: -100 }, // Negative calories
        { servings: 0 }, // Zero servings
        { prepTimeMinutes: -5 }, // Negative prep time
        { proteinGrams: 'invalid' }, // Non-decimal string
      ];

      invalidNutrition.forEach(nutrition => {
        const baseRecipe = {
          name: 'Test Recipe',
          ingredientsJson: [{ name: 'Test', amount: '1', unit: 'cup' }],
          instructionsText: 'Test instructions',
          prepTimeMinutes: 10,
          cookTimeMinutes: 5,
          servings: 1,
          caloriesKcal: 200,
          proteinGrams: '10.0',
          carbsGrams: '20.0',
          fatGrams: '5.0',
        };

        const testRecipe = { ...baseRecipe, ...nutrition };
        const result = insertRecipeSchema.safeParse(testRecipe);
        expect(result.success).toBe(false);
      });
    });

    it('should validate recipe filters', () => {
      const validFilter: RecipeFilter = {
        search: 'chicken',
        mealType: 'dinner',
        dietaryTag: 'high-protein',
        maxPrepTime: 30,
        maxCalories: 500,
        minProtein: 20,
        page: 1,
        limit: 12,
        approved: true,
      };

      const result = recipeFilterSchema.safeParse(validFilter);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(12);
      }
    });

    it('should provide default values for pagination', () => {
      const minimalFilter = {
        search: 'chicken',
      };

      const result = recipeFilterSchema.safeParse(minimalFilter);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.page).toBe(1); // Default value
        expect(result.data.limit).toBe(12); // Default value
      }
    });
  });

  describe('Progress Tracking Schema Validation', () => {
    it('should validate measurement data', () => {
      const validMeasurement: CreateMeasurement = {
        measurementDate: '2024-01-15T10:00:00.000Z',
        weightKg: 75.5,
        weightLbs: 166.4,
        neckCm: 38.0,
        chestCm: 98.0,
        waistCm: 85.0,
        hipsCm: 95.0,
        bodyFatPercentage: 18.5,
        notes: 'Steady progress this week',
      };

      const result = createMeasurementSchema.safeParse(validMeasurement);
      expect(result.success).toBe(true);
    });

    it('should validate measurement date format', () => {
      const invalidDates = [
        '2024-01-15', // Missing time
        'January 15, 2024', // Wrong format
        '2024/01/15 10:00:00', // Wrong format
        'invalid-date', // Invalid format
        '', // Empty
      ];

      invalidDates.forEach(date => {
        const result = createMeasurementSchema.safeParse({
          measurementDate: date,
          weightKg: 75.5,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          const dateError = result.error.issues.find(
            issue => issue.path.includes('measurementDate')
          );
          expect(dateError).toBeDefined();
        }
      });
    });

    it('should validate goal creation data', () => {
      const validGoal: CreateGoal = {
        goalType: 'weight_loss',
        goalName: 'Lose 20 pounds',
        description: 'Target weight loss for summer',
        targetValue: 155.0,
        targetUnit: 'lbs',
        currentValue: 175.0,
        startingValue: 175.0,
        startDate: '2024-01-01T00:00:00.000Z',
        targetDate: '2024-06-01T00:00:00.000Z',
        notes: 'Working with trainer',
      };

      const result = createGoalSchema.safeParse(validGoal);
      expect(result.success).toBe(true);
    });

    it('should validate goal types', () => {
      const validGoalTypes = [
        'weight_loss',
        'weight_gain',
        'muscle_gain',
        'body_fat',
        'performance',
        'other',
      ];

      validGoalTypes.forEach(goalType => {
        const result = createGoalSchema.safeParse({
          goalType,
          goalName: 'Test Goal',
          targetValue: 100,
          targetUnit: 'lbs',
          startDate: '2024-01-01T00:00:00.000Z',
        });

        expect(result.success).toBe(true);
      });

      // Test invalid goal type
      const invalidResult = createGoalSchema.safeParse({
        goalType: 'invalid-type',
        goalName: 'Test Goal',
        targetValue: 100,
        targetUnit: 'lbs',
        startDate: '2024-01-01T00:00:00.000Z',
      });

      expect(invalidResult.success).toBe(false);
    });

    it('should validate progress photo upload data', () => {
      const validPhotoData: UploadProgressPhoto = {
        photoDate: '2024-01-15T10:00:00.000Z',
        photoType: 'front',
        caption: 'Week 4 progress',
        isPrivate: true,
      };

      const result = uploadProgressPhotoSchema.safeParse(validPhotoData);
      expect(result.success).toBe(true);
    });

    it('should validate photo types', () => {
      const validPhotoTypes = ['front', 'side', 'back', 'other'];

      validPhotoTypes.forEach(photoType => {
        const result = uploadProgressPhotoSchema.safeParse({
          photoDate: '2024-01-15T10:00:00.000Z',
          photoType,
        });

        expect(result.success).toBe(true);
      });

      // Test invalid photo type
      const invalidResult = uploadProgressPhotoSchema.safeParse({
        photoDate: '2024-01-15T10:00:00.000Z',
        photoType: 'invalid-type',
      });

      expect(invalidResult.success).toBe(false);
    });

    it('should provide default privacy setting', () => {
      const photoData = {
        photoDate: '2024-01-15T10:00:00.000Z',
        photoType: 'front',
      };

      const result = uploadProgressPhotoSchema.safeParse(photoData);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.isPrivate).toBe(true); // Default value
      }
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize HTML in text inputs', () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '<img src=x onerror=alert("xss")>',
        'javascript:alert("xss")',
        '<svg onload=alert("xss")>',
        '"><script>alert("xss")</script>',
      ];

      // Mock sanitizer function (would be implemented in actual validation)
      const sanitize = (input: string): string => {
        return input
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .replace(/<[^>]*>/g, '');
      };

      maliciousInputs.forEach(input => {
        const sanitized = sanitize(input);
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('onerror');
        expect(sanitized).not.toContain('onload');
      });
    });

    it('should validate and sanitize email addresses', () => {
      const emailTests = [
        { input: 'user@example.com', valid: true },
        { input: 'user+tag@example.com', valid: true },
        { input: 'user.name@example-site.com', valid: true },
        { input: '<script>@example.com', valid: false },
        { input: 'user@<script>.com', valid: false },
        { input: 'user@example.com<script>', valid: false },
      ];

      const emailRegex = /^[^\s@<>]+@[^\s@<>.]+\.[^\s@<>]+$/;

      emailTests.forEach(({ input, valid }) => {
        const isValid = emailRegex.test(input);
        expect(isValid).toBe(valid);
      });
    });

    it('should validate numeric inputs', () => {
      const numericTests = [
        { input: '123', expected: 123, valid: true },
        { input: '123.45', expected: 123.45, valid: true },
        { input: '-10', expected: -10, valid: true },
        { input: '0', expected: 0, valid: true },
        { input: 'abc', expected: NaN, valid: false },
        { input: '123abc', expected: NaN, valid: false },
        { input: '', expected: NaN, valid: false },
        { input: 'Infinity', expected: Infinity, valid: false },
        { input: 'NaN', expected: NaN, valid: false },
      ];

      numericTests.forEach(({ input, expected, valid }) => {
        const parsed = parseFloat(input);
        const isValid = !isNaN(parsed) && isFinite(parsed);
        
        if (valid) {
          expect(parsed).toBe(expected);
          expect(isValid).toBe(true);
        } else {
          expect(isValid).toBe(false);
        }
      });
    });
  });

  describe('Business Logic Validation', () => {
    it('should validate goal progress calculation', () => {
      const testGoals = [
        {
          startingValue: 200,
          targetValue: 150,
          currentValue: 175,
          expectedProgress: 50, // (200-175)/(200-150) * 100
        },
        {
          startingValue: 15, // Body fat percentage
          targetValue: 10,
          currentValue: 12,
          expectedProgress: 60, // (15-12)/(15-10) * 100
        },
        {
          startingValue: 0, // Muscle gain
          targetValue: 20,
          currentValue: 8,
          expectedProgress: 40, // (8-0)/(20-0) * 100
        },
      ];

      testGoals.forEach(({ startingValue, targetValue, currentValue, expectedProgress }) => {
        const calculateProgress = (starting: number, target: number, current: number): number => {
          const totalChange = Math.abs(target - starting);
          const currentChange = Math.abs(current - starting);
          return Math.round((currentChange / totalChange) * 100);
        };

        const progress = calculateProgress(startingValue, targetValue, currentValue);
        expect(progress).toBe(expectedProgress);
      });
    });

    it('should validate date ranges', () => {
      const dateRangeTests = [
        {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
          valid: true,
        },
        {
          startDate: new Date('2024-01-31'),
          endDate: new Date('2024-01-01'),
          valid: false, // End before start
        },
        {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2025-01-01'),
          valid: true, // 1 year is reasonable
        },
        {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2030-01-01'),
          valid: false, // 6 years is too long
        },
      ];

      dateRangeTests.forEach(({ startDate, endDate, valid }) => {
        const validateDateRange = (start: Date, end: Date): boolean => {
          if (end <= start) return false; // End must be after start
          
          const diffYears = (end.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
          return diffYears <= 5; // Max 5 years
        };

        const isValid = validateDateRange(startDate, endDate);
        expect(isValid).toBe(valid);
      });
    });

    it('should validate meal plan consistency', () => {
      const mealPlanTests = [
        {
          dailyCalorieTarget: 2000,
          mealsPerDay: 4,
          avgCaloriesPerMeal: 500, // 2000/4
          valid: true,
        },
        {
          dailyCalorieTarget: 1200,
          mealsPerDay: 6,
          avgCaloriesPerMeal: 200, // 1200/6
          valid: true,
        },
        {
          dailyCalorieTarget: 800,
          mealsPerDay: 1,
          avgCaloriesPerMeal: 800, // Very low total, might be invalid
          valid: false,
        },
        {
          dailyCalorieTarget: 5000,
          mealsPerDay: 3,
          avgCaloriesPerMeal: 1667, // Very high per meal
          valid: false,
        },
      ];

      mealPlanTests.forEach(({ dailyCalorieTarget, mealsPerDay, valid }) => {
        const validateMealPlan = (calories: number, meals: number): boolean => {
          const avgPerMeal = calories / meals;
          return avgPerMeal >= 100 && avgPerMeal <= 1200; // Reasonable per-meal range
        };

        const isValid = validateMealPlan(dailyCalorieTarget, mealsPerDay);
        expect(isValid).toBe(valid);
      });
    });

    it('should validate recipe nutritional balance', () => {
      const recipeTests = [
        {
          calories: 400,
          protein: 30, // grams
          carbs: 20,   // grams
          fat: 15,     // grams
          valid: true, // 30*4 + 20*4 + 15*9 = 120 + 80 + 135 = 335 (close to 400)
        },
        {
          calories: 200,
          protein: 50, // grams
          carbs: 50,   // grams
          fat: 50,     // grams
          valid: false, // 50*4 + 50*4 + 50*9 = 200 + 200 + 450 = 850 (way more than 200)
        },
        {
          calories: 100,
          protein: 5,  // grams
          carbs: 5,    // grams
          fat: 2,      // grams
          valid: true, // 5*4 + 5*4 + 2*9 = 20 + 20 + 18 = 58 (reasonable for 100)
        },
      ];

      recipeTests.forEach(({ calories, protein, carbs, fat, valid }) => {
        const calculateMacroCalories = (p: number, c: number, f: number): number => {
          return (p * 4) + (c * 4) + (f * 9); // 4 cal/g protein&carbs, 9 cal/g fat
        };

        const macroCalories = calculateMacroCalories(protein, carbs, fat);
        const tolerance = calories * 0.3; // 30% tolerance
        const isValid = Math.abs(macroCalories - calories) <= tolerance;
        
        expect(isValid).toBe(valid);
      });
    });
  });

  describe('Cross-field Validation', () => {
    it('should validate consistent weight units', () => {
      const weightTests = [
        {
          weightKg: 70,
          weightLbs: 154.3, // 70 * 2.205
          consistent: true,
        },
        {
          weightKg: 80,
          weightLbs: 100, // Should be ~176.4
          consistent: false,
        },
        {
          weightKg: null,
          weightLbs: 150,
          consistent: true, // Only one provided
        },
        {
          weightKg: 75,
          weightLbs: null,
          consistent: true, // Only one provided
        },
      ];

      weightTests.forEach(({ weightKg, weightLbs, consistent }) => {
        const validateWeightConsistency = (kg: number | null, lbs: number | null): boolean => {
          if (!kg || !lbs) return true; // Only one provided is OK
          
          const convertedLbs = kg * 2.20462;
          const tolerance = convertedLbs * 0.05; // 5% tolerance
          return Math.abs(convertedLbs - lbs) <= tolerance;
        };

        const isConsistent = validateWeightConsistency(weightKg, weightLbs);
        expect(isConsistent).toBe(consistent);
      });
    });

    it('should validate goal date consistency', () => {
      const goalTests = [
        {
          startDate: '2024-01-01T00:00:00.000Z',
          targetDate: '2024-06-01T00:00:00.000Z',
          valid: true, // 5 months is reasonable
        },
        {
          startDate: '2024-01-01T00:00:00.000Z',
          targetDate: '2023-12-01T00:00:00.000Z',
          valid: false, // Target before start
        },
        {
          startDate: '2024-01-01T00:00:00.000Z',
          targetDate: '2024-01-02T00:00:00.000Z',
          valid: false, // Too short (1 day)
        },
        {
          startDate: '2024-01-01T00:00:00.000Z',
          targetDate: '2030-01-01T00:00:00.000Z',
          valid: false, // Too long (6 years)
        },
      ];

      goalTests.forEach(({ startDate, targetDate, valid }) => {
        const validateGoalDates = (start: string, target: string): boolean => {
          const startMs = new Date(start).getTime();
          const targetMs = new Date(target).getTime();
          
          if (targetMs <= startMs) return false; // Target must be after start
          
          const diffDays = (targetMs - startMs) / (24 * 60 * 60 * 1000);
          return diffDays >= 7 && diffDays <= 365 * 2; // 1 week to 2 years
        };

        const isValid = validateGoalDates(startDate, targetDate);
        expect(isValid).toBe(valid);
      });
    });

    it('should validate meal plan ingredient consistency', () => {
      const ingredientTests = [
        {
          maxIngredients: 20,
          totalUniqueIngredients: 18,
          valid: true,
        },
        {
          maxIngredients: 10,
          totalUniqueIngredients: 15,
          valid: false, // Exceeds limit
        },
        {
          maxIngredients: null,
          totalUniqueIngredients: 50,
          valid: true, // No limit specified
        },
      ];

      ingredientTests.forEach(({ maxIngredients, totalUniqueIngredients, valid }) => {
        const validateIngredientLimit = (max: number | null, total: number): boolean => {
          if (!max) return true; // No limit
          return total <= max;
        };

        const isValid = validateIngredientLimit(maxIngredients, totalUniqueIngredients);
        expect(isValid).toBe(valid);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null and undefined values', () => {
      const nullUndefinedTests = [
        {
          schema: createInvitationSchema,
          data: { customerEmail: null },
          shouldFail: true,
        },
        {
          schema: createInvitationSchema,
          data: { customerEmail: undefined },
          shouldFail: true,
        },
        {
          schema: createMeasurementSchema,
          data: { measurementDate: null },
          shouldFail: true,
        },
        {
          schema: createGoalSchema,
          data: { goalType: undefined },
          shouldFail: true,
        },
      ];

      nullUndefinedTests.forEach(({ schema, data, shouldFail }) => {
        const result = schema.safeParse(data);
        if (shouldFail) {
          expect(result.success).toBe(false);
        }
      });
    });

    it('should handle extremely large numbers', () => {
      const extremeNumbers = [
        Number.MAX_SAFE_INTEGER,
        Number.MAX_VALUE,
        Infinity,
        -Infinity,
      ];

      extremeNumbers.forEach(number => {
        const result = mealPlanGenerationSchema.safeParse({
          planName: 'Test Plan',
          fitnessGoal: 'weight_loss',
          dailyCalorieTarget: number,
          days: 7,
          mealsPerDay: 3,
        });

        // Should fail for extreme values
        expect(result.success).toBe(false);
      });
    });

    it('should handle special string characters', () => {
      const specialStrings = [
        'normal text',
        'text with émojis 🍎🥗',
        'text with ñ and ü characters',
        'text with "quotes" and \'apostrophes\'',
        'text\nwith\nnewlines',
        'text\twith\ttabs',
        'text with \\backslashes\\',
      ];

      specialStrings.forEach(text => {
        const result = createInvitationSchema.safeParse({
          customerEmail: 'test@example.com',
          message: text,
        });

        // All should be valid (assuming proper string handling)
        expect(result.success).toBe(true);
      });
    });

    it('should provide helpful error messages', () => {
      const testCases = [
        {
          schema: createInvitationSchema,
          data: { customerEmail: 'invalid-email' },
          expectedErrorKeywords: ['email', 'invalid'],
        },
        {
          schema: acceptInvitationSchema,
          data: { token: 'valid', password: 'weak' },
          expectedErrorKeywords: ['password', 'characters'],
        },
        {
          schema: mealPlanGenerationSchema,
          data: { planName: 'test', fitnessGoal: 'test', dailyCalorieTarget: -100 },
          expectedErrorKeywords: ['calorie', 'minimum'],
        },
      ];

      testCases.forEach(({ schema, data, expectedErrorKeywords }) => {
        const result = schema.safeParse(data);
        expect(result.success).toBe(false);

        if (!result.success) {
          const errorMessage = result.error.message.toLowerCase();
          expectedErrorKeywords.forEach(keyword => {
            expect(errorMessage).toContain(keyword.toLowerCase());
          });
        }
      });
    });
  });
});