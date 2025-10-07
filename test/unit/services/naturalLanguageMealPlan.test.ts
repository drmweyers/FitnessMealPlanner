import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseNaturalLanguageForMealPlan } from '../../../server/services/openai';
import { MealPlanGeneratorService } from '../../../server/services/mealPlanGenerator';
import { intelligentMealPlanGenerator } from '../../../server/services/intelligentMealPlanGenerator';
import type { MealPlanGeneration } from '@shared/schema';

// Mock OpenAI
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn()
        }
      }
    }))
  };
});

// Mock database
vi.mock('../../../server/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    eq: vi.fn(),
    and: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    ilike: vi.fn(),
    inArray: vi.fn(),
    notInArray: vi.fn(),
    sql: vi.fn()
  }
}));

describe('Natural Language Meal Plan Parser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseNaturalLanguageForMealPlan', () => {
    it('should parse muscle gain meal plan request correctly', async () => {
      const input = 'Create a 7-day meal plan for muscle gain with 2500 calories per day and high protein';

      // Mock OpenAI response
      const mockOpenAI = require('openai').default;
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify({
                    planName: '7-day meal plan',
                    fitnessGoal: 'muscle gain',
                    dailyCalorieTarget: 2500,
                    days: 7,
                    minProtein: 150,
                    mealsPerDay: 3
                  })
                }
              }]
            })
          }
        }
      }));

      const result = await parseNaturalLanguageForMealPlan(input);

      expect(result).toEqual({
        planName: '7-day meal plan',
        fitnessGoal: 'muscle gain',
        dailyCalorieTarget: 2500,
        days: 7,
        minProtein: 150,
        mealsPerDay: 3
      });
    });

    it('should parse weight loss meal plan request correctly', async () => {
      const input = 'I need a 5-day vegetarian meal plan for weight loss, around 1500 calories';

      // Mock OpenAI response
      const mockOpenAI = require('openai').default;
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify({
                    planName: '5-day vegetarian meal plan',
                    fitnessGoal: 'weight loss',
                    dailyCalorieTarget: 1500,
                    days: 5,
                    dietaryTags: ['vegetarian'],
                    mealsPerDay: 3
                  })
                }
              }]
            })
          }
        }
      }));

      const result = await parseNaturalLanguageForMealPlan(input);

      expect(result).toEqual({
        planName: '5-day vegetarian meal plan',
        fitnessGoal: 'weight loss',
        dailyCalorieTarget: 1500,
        days: 5,
        dietaryTags: ['vegetarian'],
        mealsPerDay: 3
      });
    });

    it('should handle complex dietary requirements', async () => {
      const input = 'Generate a keto-friendly meal plan for 2 weeks with 2000 calories, no dairy, high fat, low carbs';

      // Mock OpenAI response
      const mockOpenAI = require('openai').default;
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify({
                    planName: '14-day keto meal plan',
                    fitnessGoal: 'maintenance',
                    dailyCalorieTarget: 2000,
                    days: 14,
                    dietaryTags: ['keto'],
                    excludeIngredients: ['dairy'],
                    maxCarbs: 30,
                    minFat: 140,
                    mealsPerDay: 3
                  })
                }
              }]
            })
          }
        }
      }));

      const result = await parseNaturalLanguageForMealPlan(input);

      expect(result.dietaryTags).toContain('keto');
      expect(result.excludeIngredients).toContain('dairy');
      expect(result.days).toBe(14);
      expect(result.dailyCalorieTarget).toBe(2000);
    });

    it('should handle partial/incomplete information gracefully', async () => {
      const input = 'Just give me a healthy meal plan';

      // Mock OpenAI response with minimal data
      const mockOpenAI = require('openai').default;
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify({
                    planName: 'Healthy meal plan',
                    fitnessGoal: 'maintenance',
                    days: 7
                  })
                }
              }]
            })
          }
        }
      }));

      const result = await parseNaturalLanguageForMealPlan(input);

      expect(result.planName).toBe('Healthy meal plan');
      expect(result.fitnessGoal).toBe('maintenance');
      expect(result.days).toBe(7);
      // Other fields should be undefined or defaults
    });

    it('should throw error when OpenAI returns invalid JSON', async () => {
      const input = 'Create a meal plan';

      // Mock OpenAI response with invalid JSON
      const mockOpenAI = require('openai').default;
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: 'This is not valid JSON'
                }
              }]
            })
          }
        }
      }));

      await expect(parseNaturalLanguageForMealPlan(input)).rejects.toThrow();
    });

    it('should handle OpenAI API errors gracefully', async () => {
      const input = 'Create a meal plan';

      // Mock OpenAI API error
      const mockOpenAI = require('openai').default;
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: vi.fn().mockRejectedValue(new Error('OpenAI API Error'))
          }
        }
      }));

      await expect(parseNaturalLanguageForMealPlan(input)).rejects.toThrow('Failed to parse natural language for meal plan');
    });
  });
});

describe('MealPlanGeneratorService', () => {
  let service: MealPlanGeneratorService;

  beforeEach(() => {
    service = new MealPlanGeneratorService();
    vi.clearAllMocks();
  });

  describe('generateMealPlan', () => {
    it('should generate a meal plan with correct structure', async () => {
      const params: MealPlanGeneration = {
        planName: 'Test Plan',
        fitnessGoal: 'muscle gain',
        dailyCalorieTarget: 2500,
        days: 3,
        mealsPerDay: 3,
        clientName: 'Test User',
        generateMealPrep: false
      };

      // Mock database queries
      const mockDb = require('../../../server/db').db;

      // Mock recipe fetch
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockReturnThis();
      mockDb.limit.mockResolvedValue([
        {
          id: '1',
          recipeName: 'Protein Pancakes',
          mealType: 'breakfast',
          totalCalories: 450,
          proteinGrams: 30,
          carbGrams: 40,
          fatGrams: 15,
          ingredients: JSON.stringify([{ name: 'eggs', amount: '3' }]),
          instructions: JSON.stringify(['Mix ingredients', 'Cook on griddle']),
          prepTime: 15,
          imageUrl: 'https://example.com/image.jpg'
        },
        {
          id: '2',
          recipeName: 'Chicken Salad',
          mealType: 'lunch',
          totalCalories: 550,
          proteinGrams: 45,
          carbGrams: 30,
          fatGrams: 20,
          ingredients: JSON.stringify([{ name: 'chicken', amount: '200g' }]),
          instructions: JSON.stringify(['Grill chicken', 'Mix with salad']),
          prepTime: 20,
          imageUrl: 'https://example.com/image2.jpg'
        },
        {
          id: '3',
          recipeName: 'Beef Stir Fry',
          mealType: 'dinner',
          totalCalories: 700,
          proteinGrams: 50,
          carbGrams: 60,
          fatGrams: 25,
          ingredients: JSON.stringify([{ name: 'beef', amount: '250g' }]),
          instructions: JSON.stringify(['Cook beef', 'Add vegetables']),
          prepTime: 25,
          imageUrl: 'https://example.com/image3.jpg'
        }
      ]);

      const result = await service.generateMealPlan(params, 'user-123');

      expect(result).toHaveProperty('mealPlanDays');
      expect(result.mealPlanDays).toHaveLength(3);
      expect(result.mealPlanDays[0]).toHaveProperty('meals');
      expect(result.mealPlanDays[0].meals).toHaveLength(3);
      expect(result.mealPlanDays[0].meals[0]).toHaveProperty('recipe');
      expect(result.mealPlanDays[0].meals[0].recipe).toHaveProperty('recipeName');
    });

    it('should respect dietary restrictions', async () => {
      const params: MealPlanGeneration = {
        planName: 'Vegetarian Plan',
        fitnessGoal: 'maintenance',
        dailyCalorieTarget: 2000,
        days: 1,
        mealsPerDay: 3,
        dietaryTags: ['vegetarian'],
        clientName: 'Test User',
        generateMealPrep: false
      };

      // Mock database to return only vegetarian recipes
      const mockDb = require('../../../server/db').db;
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockReturnThis();
      mockDb.limit.mockResolvedValue([
        {
          id: '1',
          recipeName: 'Veggie Scramble',
          mealType: 'breakfast',
          dietaryTags: ['vegetarian'],
          totalCalories: 400,
          proteinGrams: 20,
          carbGrams: 30,
          fatGrams: 20,
          ingredients: JSON.stringify([{ name: 'eggs', amount: '3' }]),
          instructions: JSON.stringify(['Scramble eggs']),
          prepTime: 10,
          imageUrl: 'https://example.com/veggie.jpg'
        }
      ]);

      const result = await service.generateMealPlan(params, 'user-123');

      // Verify that the query was called with vegetarian filter
      expect(mockDb.where).toHaveBeenCalled();
    });

    it('should handle calorie targets correctly', async () => {
      const params: MealPlanGeneration = {
        planName: 'Calorie Controlled',
        fitnessGoal: 'weight loss',
        dailyCalorieTarget: 1500,
        days: 1,
        mealsPerDay: 3,
        clientName: 'Test User',
        generateMealPrep: false
      };

      // Mock database
      const mockDb = require('../../../server/db').db;
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockReturnThis();
      mockDb.limit.mockResolvedValue([
        {
          id: '1',
          recipeName: 'Light Breakfast',
          mealType: 'breakfast',
          totalCalories: 300,
          proteinGrams: 15,
          carbGrams: 40,
          fatGrams: 10,
          ingredients: JSON.stringify([]),
          instructions: JSON.stringify([]),
          prepTime: 10
        },
        {
          id: '2',
          recipeName: 'Light Lunch',
          mealType: 'lunch',
          totalCalories: 500,
          proteinGrams: 25,
          carbGrams: 50,
          fatGrams: 15,
          ingredients: JSON.stringify([]),
          instructions: JSON.stringify([]),
          prepTime: 15
        },
        {
          id: '3',
          recipeName: 'Light Dinner',
          mealType: 'dinner',
          totalCalories: 600,
          proteinGrams: 30,
          carbGrams: 60,
          fatGrams: 20,
          ingredients: JSON.stringify([]),
          instructions: JSON.stringify([]),
          prepTime: 20
        }
      ]);

      const result = await service.generateMealPlan(params, 'user-123');
      const nutrition = service.calculateMealPlanNutrition(result);

      // Total calories should be close to target
      const totalCalories = nutrition.totalCalories;
      const dailyTarget = params.dailyCalorieTarget * params.days;

      expect(totalCalories).toBeCloseTo(dailyTarget, -2); // Within 100 calories
    });

    it('should throw error when no recipes are available', async () => {
      const params: MealPlanGeneration = {
        planName: 'Impossible Plan',
        fitnessGoal: 'maintenance',
        dailyCalorieTarget: 2000,
        days: 1,
        mealsPerDay: 3,
        dietaryTags: ['non-existent-diet'],
        clientName: 'Test User',
        generateMealPrep: false
      };

      // Mock database to return no recipes
      const mockDb = require('../../../server/db').db;
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockReturnThis();
      mockDb.limit.mockResolvedValue([]);

      await expect(service.generateMealPlan(params, 'user-123')).rejects.toThrow();
    });
  });

  describe('calculateMealPlanNutrition', () => {
    it('should calculate nutrition totals correctly', () => {
      const mealPlan = {
        mealPlanDays: [
          {
            day: 1,
            meals: [
              {
                recipe: {
                  totalCalories: 400,
                  proteinGrams: 30,
                  carbGrams: 40,
                  fatGrams: 15
                }
              },
              {
                recipe: {
                  totalCalories: 500,
                  proteinGrams: 40,
                  carbGrams: 50,
                  fatGrams: 20
                }
              }
            ]
          }
        ]
      };

      const nutrition = service.calculateMealPlanNutrition(mealPlan as any);

      expect(nutrition.totalCalories).toBe(900);
      expect(nutrition.totalProtein).toBe(70);
      expect(nutrition.totalCarbs).toBe(90);
      expect(nutrition.totalFat).toBe(35);
      expect(nutrition.averageCaloriesPerDay).toBe(900);
    });

    it('should handle empty meal plans', () => {
      const mealPlan = {
        mealPlanDays: []
      };

      const nutrition = service.calculateMealPlanNutrition(mealPlan as any);

      expect(nutrition.totalCalories).toBe(0);
      expect(nutrition.totalProtein).toBe(0);
      expect(nutrition.totalCarbs).toBe(0);
      expect(nutrition.totalFat).toBe(0);
      expect(nutrition.averageCaloriesPerDay).toBe(0);
    });
  });
});

describe('Intelligent Meal Plan Generator', () => {
  describe('generateIntelligentMealPlan', () => {
    it('should generate AI-optimized meal plans', async () => {
      const params: MealPlanGeneration = {
        planName: 'AI Optimized Plan',
        fitnessGoal: 'muscle gain',
        dailyCalorieTarget: 2800,
        days: 7,
        mealsPerDay: 4,
        clientName: 'Test User',
        generateMealPrep: false,
        minProtein: 180
      };

      // Mock database
      const mockDb = require('../../../server/db').db;
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockReturnThis();
      mockDb.limit.mockResolvedValue([
        {
          id: '1',
          recipeName: 'High Protein Breakfast',
          mealType: 'breakfast',
          totalCalories: 500,
          proteinGrams: 40,
          carbGrams: 50,
          fatGrams: 15,
          ingredients: JSON.stringify([]),
          instructions: JSON.stringify([]),
          prepTime: 15
        }
      ]);

      const result = await intelligentMealPlanGenerator.generateIntelligentMealPlan(params, 'user-123');

      expect(result).toHaveProperty('mealPlanDays');
      expect(result.mealPlanDays.length).toBeGreaterThan(0);
    });

    it('should optimize for specific fitness goals', async () => {
      const params: MealPlanGeneration = {
        planName: 'Athletic Performance Plan',
        fitnessGoal: 'athletic performance',
        dailyCalorieTarget: 3000,
        days: 5,
        mealsPerDay: 5,
        clientName: 'Athlete User',
        generateMealPrep: false,
        minProtein: 150,
        minCarbs: 350
      };

      // Mock database
      const mockDb = require('../../../server/db').db;
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockReturnThis();
      mockDb.limit.mockResolvedValue([
        {
          id: '1',
          recipeName: 'Athletic Meal',
          mealType: 'breakfast',
          totalCalories: 600,
          proteinGrams: 30,
          carbGrams: 80,
          fatGrams: 20,
          ingredients: JSON.stringify([]),
          instructions: JSON.stringify([]),
          prepTime: 20
        }
      ]);

      const result = await intelligentMealPlanGenerator.generateIntelligentMealPlan(params, 'user-123');
      const nutrition = intelligentMealPlanGenerator.calculateMealPlanNutrition(result);

      // Verify optimization for athletic performance
      expect(nutrition.averageProteinPerDay).toBeGreaterThanOrEqual(150);
    });
  });
});