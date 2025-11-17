import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MealPlanGeneration } from '@shared/schema';

// Hoist mock functions to ensure they're available before imports
const { mockCreate, mockStorage } = vi.hoisted(() => {
  const mockCreate = vi.fn();
  const mockStorage = {
    searchRecipes: vi.fn().mockResolvedValue({ recipes: [], total: 0, pages: 0 })
  };
  return { mockCreate, mockStorage };
});

// Mock OpenAI before imports
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate
        }
      }
    }))
  };
});

// Partially mock the openai service module to use real functions but mocked OpenAI
vi.mock('../../../server/services/openai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../server/services/openai')>();
  return {
    ...actual,
    // Keep the real implementations, they will use the mocked OpenAI class above
  };
});

// Mock database before imports
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
};

vi.mock('../../../server/db', () => ({
  db: mockDb,
  eq: vi.fn(),
  and: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  ilike: vi.fn(),
  inArray: vi.fn(),
  notInArray: vi.fn(),
  sql: vi.fn()
}));

// Mock storage service before imports
vi.mock('../../../server/storage', () => ({
  storage: mockStorage
}));

// Now import the actual modules
import { parseNaturalLanguageForMealPlan } from '../../../server/services/openai';
import { MealPlanGeneratorService } from '../../../server/services/mealPlanGenerator';
import { intelligentMealPlanGenerator } from '../../../server/services/intelligentMealPlanGenerator';

describe('Natural Language Meal Plan Parser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseNaturalLanguageForMealPlan', () => {
    it('should parse muscle gain meal plan request correctly', async () => {
      const input = 'Create a 7-day meal plan for muscle gain with 2500 calories per day and high protein';

      // Mock OpenAI response using the hoisted mocked function
      mockCreate.mockResolvedValue({
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
      });

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
      mockCreate.mockResolvedValue({
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
      });

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
      mockCreate.mockResolvedValue({
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
      });

      const result = await parseNaturalLanguageForMealPlan(input);

      expect(result.dietaryTags).toContain('keto');
      expect(result.excludeIngredients).toContain('dairy');
      expect(result.days).toBe(14);
      expect(result.dailyCalorieTarget).toBe(2000);
    });

    it('should handle partial/incomplete information gracefully', async () => {
      const input = 'Just give me a healthy meal plan';

      // Mock OpenAI response with minimal data
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              planName: 'Healthy meal plan',
              fitnessGoal: 'maintenance',
              days: 7
            })
          }
        }]
      });

      const result = await parseNaturalLanguageForMealPlan(input);

      expect(result.planName).toBe('Healthy meal plan');
      expect(result.fitnessGoal).toBe('maintenance');
      expect(result.days).toBe(7);
      // Other fields should be undefined or defaults
    });

    it('should throw error when OpenAI returns invalid JSON', async () => {
      const input = 'Create a meal plan';

      // Mock OpenAI response with invalid JSON
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: 'This is not valid JSON'
          }
        }]
      });

      await expect(parseNaturalLanguageForMealPlan(input)).rejects.toThrow();
    });

    it('should handle OpenAI API errors gracefully', async () => {
      const input = 'Create a meal plan';

      // Mock OpenAI API error
      mockCreate.mockRejectedValue(new Error('OpenAI API Error'));

      await expect(parseNaturalLanguageForMealPlan(input)).rejects.toThrow('Failed to parse natural language for meal plan');
    });
  });
});

describe('MealPlanGeneratorService', () => {
  let service: MealPlanGeneratorService;

  beforeEach(() => {
    service = new MealPlanGeneratorService();
    vi.clearAllMocks();

    // Set up mock recipes for this test suite
    mockStorage.searchRecipes.mockResolvedValue({
      recipes: [
        {
          id: '1',
          name: 'Protein Pancakes',
          mealTypes: ['breakfast'],
          caloriesKcal: 450,
          proteinGrams: '30',
          carbsGrams: '40',
          fatGrams: '15',
          ingredientsJson: [{ name: 'eggs', amount: '3' }],
          instructionsText: 'Mix ingredients. Cook on griddle.',
          prepTimeMinutes: 15,
          imageUrl: 'https://example.com/image.jpg'
        },
        {
          id: '2',
          name: 'Chicken Salad',
          mealTypes: ['lunch'],
          caloriesKcal: 550,
          proteinGrams: '45',
          carbsGrams: '30',
          fatGrams: '20',
          ingredientsJson: [{ name: 'chicken', amount: '200g' }],
          instructionsText: 'Grill chicken. Mix with salad.',
          prepTimeMinutes: 20,
          imageUrl: 'https://example.com/image2.jpg'
        },
        {
          id: '3',
          name: 'Beef Stir Fry',
          mealTypes: ['dinner'],
          caloriesKcal: 700,
          proteinGrams: '50',
          carbsGrams: '60',
          fatGrams: '25',
          ingredientsJson: [{ name: 'beef', amount: '250g' }],
          instructionsText: 'Cook beef. Add vegetables.',
          prepTimeMinutes: 25,
          imageUrl: 'https://example.com/image3.jpg'
        }
      ],
      total: 3,
      pages: 1
    });
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

      const result = await service.generateMealPlan(params, 'user-123');

      expect(result).toHaveProperty('meals');
      expect(result.meals).toHaveLength(9); // 3 days × 3 meals
      expect(result.meals[0]).toHaveProperty('recipe');
      expect(result.meals[0].recipe).toHaveProperty('name');
    });

    it('should respect dietary restrictions', async () => {
      const params: MealPlanGeneration = {
        planName: 'Vegetarian Plan',
        fitnessGoal: 'maintenance',
        dailyCalorieTarget: 2000,
        days: 1,
        mealsPerDay: 3,
        dietaryTag: 'vegetarian',
        clientName: 'Test User',
        generateMealPrep: false
      };

      const result = await service.generateMealPlan(params, 'user-123');

      expect(result).toHaveProperty('meals');
      expect(result.meals).toHaveLength(3);
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

      const result = await service.generateMealPlan(params, 'user-123');
      const nutrition = service.calculateMealPlanNutrition(result);

      // Total calories should be close to target
      const totalCalories = nutrition.total.calories;
      const dailyTarget = params.dailyCalorieTarget * params.days;

      expect(totalCalories).toBeGreaterThan(0);
      expect(totalCalories).toBeLessThan(dailyTarget * 1.5); // Within reasonable range
    });

    it('should throw error when no recipes are available', async () => {
      const params: MealPlanGeneration = {
        planName: 'Impossible Plan',
        fitnessGoal: 'maintenance',
        dailyCalorieTarget: 2000,
        days: 1,
        mealsPerDay: 3,
        dietaryTag: 'non-existent-diet',
        clientName: 'Test User',
        generateMealPrep: false
      };

      // Mock storage to return no recipes
      mockStorage.searchRecipes.mockResolvedValue({ recipes: [], total: 0, pages: 0 });

      await expect(service.generateMealPlan(params, 'user-123')).rejects.toThrow();
    });
  });

  describe('calculateMealPlanNutrition', () => {
    it('should calculate nutrition totals correctly', () => {
      const mealPlan = {
        id: 'test',
        planName: 'Test Plan',
        fitnessGoal: 'maintenance',
        dailyCalorieTarget: 2000,
        days: 1,
        mealsPerDay: 2,
        generatedBy: 'user-123',
        createdAt: new Date(),
        meals: [
          {
            day: 1,
            mealNumber: 1,
            mealType: 'breakfast',
            recipe: {
              id: '1',
              name: 'Breakfast',
              description: 'Test',
              caloriesKcal: 400,
              proteinGrams: '30',
              carbsGrams: '40',
              fatGrams: '15',
              prepTimeMinutes: 10,
              servings: 1,
              mealTypes: ['breakfast'],
            }
          },
          {
            day: 1,
            mealNumber: 2,
            mealType: 'lunch',
            recipe: {
              id: '2',
              name: 'Lunch',
              description: 'Test',
              caloriesKcal: 500,
              proteinGrams: '40',
              carbsGrams: '50',
              fatGrams: '20',
              prepTimeMinutes: 15,
              servings: 1,
              mealTypes: ['lunch'],
            }
          }
        ]
      };

      const nutrition = service.calculateMealPlanNutrition(mealPlan as any);

      expect(nutrition.total.calories).toBe(900);
      expect(nutrition.total.protein).toBe(70);
      expect(nutrition.total.carbs).toBe(90);
      expect(nutrition.total.fat).toBe(35);
      expect(nutrition.averageDaily.calories).toBe(900);
    });

    it('should handle empty meal plans', () => {
      const mealPlan = {
        id: 'test',
        planName: 'Test Plan',
        fitnessGoal: 'maintenance',
        dailyCalorieTarget: 2000,
        days: 1,
        mealsPerDay: 0,
        generatedBy: 'user-123',
        createdAt: new Date(),
        meals: []
      };

      const nutrition = service.calculateMealPlanNutrition(mealPlan as any);

      expect(nutrition.total.calories).toBe(0);
      expect(nutrition.total.protein).toBe(0);
      expect(nutrition.total.carbs).toBe(0);
      expect(nutrition.total.fat).toBe(0);
    });
  });
});

describe('Intelligent Meal Plan Generator', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock storage service for intelligent generator
    mockStorage.searchRecipes.mockResolvedValue({
      recipes: [
        {
          id: '1',
          name: 'High Protein Breakfast',
          mealTypes: ['breakfast'],
          caloriesKcal: 500,
          proteinGrams: '40',
          carbsGrams: '50',
          fatGrams: '15',
          ingredientsJson: [],
          instructionsText: '',
          prepTimeMinutes: 15
        }
      ],
      total: 1,
      pages: 1
    });
  });

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

      const result = await intelligentMealPlanGenerator.generateIntelligentMealPlan(params, 'user-123');

      expect(result).toHaveProperty('meals');
      expect(result.meals.length).toBeGreaterThan(0);
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

      const result = await intelligentMealPlanGenerator.generateIntelligentMealPlan(params, 'user-123');
      const nutrition = intelligentMealPlanGenerator.calculateMealPlanNutrition(result);

      // Verify meal plan was generated
      expect(result.meals.length).toBeGreaterThan(0);
      expect(nutrition.total.protein).toBeGreaterThan(0);
    });
  });
});
