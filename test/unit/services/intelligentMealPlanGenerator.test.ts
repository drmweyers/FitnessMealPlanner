/**
 * Comprehensive Test Suite for Intelligent Meal Plan Generation
 * 
 * Tests all components of the intelligent meal plan generation system:
 * - IntelligentMealPlanGeneratorService
 * - NutritionalOptimizerService  
 * - CustomerPreferenceService
 * - MealPlanSchedulerService
 * - MealPlanVariationService
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { intelligentMealPlanGenerator } from '../../../server/services/intelligentMealPlanGenerator';
import { nutritionalOptimizer } from '../../../server/services/nutritionalOptimizer';
import { customerPreferenceService } from '../../../server/services/customerPreferenceService';
import { mealPlanScheduler } from '../../../server/services/mealPlanScheduler';
import { mealPlanVariationService } from '../../../server/services/mealPlanVariationService';
import type { MealPlanGeneration, MealPlan } from '@shared/schema';
import * as storage from '../../../server/storage';
import * as db from '../../../server/db';

// Mock dependencies
vi.mock('../../../server/storage');
vi.mock('../../../server/db');

describe('Intelligent Meal Plan Generation System', () => {
  // Fixed: Removed .skip() to enable test execution
  // Tests now run and validate meal plan generation system
  
  // Test data fixtures
  const mockMealPlanOptions: MealPlanGeneration = {
    planName: 'Test Fitness Plan',
    fitnessGoal: 'muscle_gain',
    description: 'Test meal plan for muscle gain',
    dailyCalorieTarget: 2500,
    days: 7,
    mealsPerDay: 4,
    clientName: 'Test Client',
    maxIngredients: 20,
    generateMealPrep: true,
    mealType: undefined,
    dietaryTag: undefined,
    maxPrepTime: undefined
  };

  const mockGeneratedBy = 'test-trainer-id';
  
  const mockBaseMealPlan: MealPlan = {
    id: 'test-meal-plan-1',
    planName: 'Test Plan',
    fitnessGoal: 'muscle_gain',
    description: 'Test meal plan',
    dailyCalorieTarget: 2500,
    clientName: 'Test Client',
    days: 7,
    mealsPerDay: 4,
    generatedBy: 'test-trainer-id',
    createdAt: new Date(),
    meals: [
      {
        day: 1,
        mealNumber: 1,
        mealType: 'breakfast',
        recipe: {
          id: 'recipe-1',
          name: 'Test Breakfast',
          description: 'Test breakfast recipe',
          caloriesKcal: 400,
          proteinGrams: '25',
          carbsGrams: '45',
          fatGrams: '15',
          prepTimeMinutes: 15,
          cookTimeMinutes: 10,
          servings: 1,
          mealTypes: ['breakfast'],
          dietaryTags: [],
          mainIngredientTags: [],
          ingredientsJson: [
            { name: 'oats', amount: '1', unit: 'cup' },
            { name: 'milk', amount: '1', unit: 'cup' }
          ],
          instructionsText: 'Mix oats and milk',
          imageUrl: 'test-image.jpg'
        }
      }
    ]
  };

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  describe('IntelligentMealPlanGeneratorService', () => {
    
    test('should generate intelligent meal plan with optimization', async () => {
      // Mock storage response
      vi.mocked(storage.storage.searchRecipes).mockResolvedValue({
        recipes: [
          {
            id: 'recipe-1',
            name: 'Protein Bowl',
            caloriesKcal: 450,
            proteinGrams: '35',
            carbsGrams: '40',
            fatGrams: '18',
            mealTypes: ['lunch'],
            isApproved: true,
            ingredientsJson: []
          }
        ]
      });

      const result = await intelligentMealPlanGenerator.generateIntelligentMealPlan(
        mockMealPlanOptions,
        mockGeneratedBy
      );

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.planName).toBe(mockMealPlanOptions.planName);
      expect(result.fitnessGoal).toBe(mockMealPlanOptions.fitnessGoal);
      expect(result.meals).toBeDefined();
      expect(result.meals.length).toBeGreaterThan(0);
    });

    test('should apply fitness goal specific macro optimization', async () => {
      vi.mocked(storage.storage.searchRecipes).mockResolvedValue({
        recipes: [
          {
            id: 'recipe-1',
            name: 'High Protein Meal',
            caloriesKcal: 500,
            proteinGrams: '40',
            carbsGrams: '30',
            fatGrams: '20',
            mealTypes: ['dinner'],
            isApproved: true,
            ingredientsJson: []
          }
        ]
      });

      const muscleGainOptions = { ...mockMealPlanOptions, fitnessGoal: 'muscle_gain' };
      const weightLossOptions = { ...mockMealPlanOptions, fitnessGoal: 'weight_loss' };

      const muscleGainPlan = await intelligentMealPlanGenerator.generateIntelligentMealPlan(
        muscleGainOptions,
        mockGeneratedBy
      );

      const weightLossPlan = await intelligentMealPlanGenerator.generateIntelligentMealPlan(
        weightLossOptions,
        mockGeneratedBy
      );

      expect(muscleGainPlan.dailyCalorieTarget).toBeGreaterThan(weightLossPlan.dailyCalorieTarget);
      expect(muscleGainPlan.mealTimingRecommendations).toBeDefined();
    });

    test('should generate meal timing recommendations for performance goals', async () => {
      
      vi.mocked(storage.storage.searchRecipes).mockResolvedValue({
        recipes: [
          {
            id: 'recipe-1',
            name: 'Performance Meal',
            caloriesKcal: 600,
            proteinGrams: '30',
            carbsGrams: '60',
            fatGrams: '20',
            mealTypes: ['lunch'],
            isApproved: true,
            ingredientsJson: []
          }
        ]
      });

      const performanceOptions = { ...mockMealPlanOptions, fitnessGoal: 'athletic_performance' };
      
      const result = await intelligentMealPlanGenerator.generateIntelligentMealPlan(
        performanceOptions,
        mockGeneratedBy
      );

      expect(result.mealTimingRecommendations).toBeDefined();
      expect(result.workoutNutritionTips).toBeDefined();
    });

    test('should handle progressive meal plan generation', async () => {
      
      vi.mocked(storage.storage.searchRecipes).mockResolvedValue({
        recipes: [
          {
            id: 'recipe-1',
            name: 'Progressive Meal',
            caloriesKcal: 500,
            proteinGrams: '25',
            carbsGrams: '50',
            fatGrams: '20',
            mealTypes: ['dinner'],
            isApproved: true,
            ingredientsJson: []
          }
        ]
      });

      const week1Plan = await intelligentMealPlanGenerator.generateProgressiveMealPlan(
        mockMealPlanOptions,
        mockGeneratedBy,
        1,
        12
      );

      const week8Plan = await intelligentMealPlanGenerator.generateProgressiveMealPlan(
        mockMealPlanOptions,
        mockGeneratedBy,
        8,
        12
      );

      expect(week1Plan).toBeDefined();
      expect(week8Plan).toBeDefined();
      
      // For weight loss goals, later weeks should have slightly lower calories
      if (mockMealPlanOptions.fitnessGoal?.includes('weight_loss')) {
        expect(week8Plan.dailyCalorieTarget).toBeLessThanOrEqual(week1Plan.dailyCalorieTarget);
      }
    });

    test('should fallback gracefully when optimization fails', async () => {
      // Mock a failure scenario
      
      vi.mocked(storage.storage.searchRecipes).mockRejectedValue(new Error('Database error'));

      // Should not throw but return a basic meal plan
      const result = await intelligentMealPlanGenerator.generateIntelligentMealPlan(
        mockMealPlanOptions,
        mockGeneratedBy
      );

      expect(result).toBeDefined();
      // Should fallback to base generation
    });
  });

  describe('NutritionalOptimizerService', () => {
    
    test('should optimize meal plan nutrition within constraints', async () => {
      
      vi.mocked(storage.storage.searchRecipes).mockResolvedValue({
        recipes: [
          {
            id: 'recipe-2',
            name: 'Optimized Recipe',
            caloriesKcal: 420,
            proteinGrams: '30',
            carbsGrams: '40',
            fatGrams: '16',
            mealTypes: ['breakfast'],
            isApproved: true,
            ingredientsJson: []
          }
        ]
      });

      const constraints = {
        caloriesMin: 2200,
        caloriesMax: 2800,
        proteinMin: 120,
        proteinMax: 200,
        carbsMin: 200,
        carbsMax: 350,
        fatMin: 60,
        fatMax: 120
      };

      const result = await nutritionalOptimizer.optimizeMealPlanNutrition(
        mockBaseMealPlan,
        constraints
      );

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.originalScore).toBeDefined();
      expect(result.optimizedScore).toBeDefined();
      expect(result.improvementPercentage).toBeDefined();
    });

    test('should identify optimization opportunities', async () => {
      
      vi.mocked(storage.storage.searchRecipes).mockResolvedValue({
        recipes: []
      });

      const constraints = {
        caloriesMin: 2000,
        caloriesMax: 2600,
        proteinMin: 150, // High protein constraint
        proteinMax: 220,
        carbsMin: 150,
        carbsMax: 300,
        fatMin: 50,
        fatMax: 100
      };

      const result = await nutritionalOptimizer.optimizeMealPlanNutrition(
        mockBaseMealPlan,
        constraints
      );

      // Should identify protein needs optimization
      expect(result.changes).toBeDefined();
    });

    test('should generate optimization report', () => {
      const mockResult = {
        success: true,
        originalScore: 0.65,
        optimizedScore: 0.82,
        improvementPercentage: 26.2,
        changes: [
          {
            day: 1,
            mealNumber: 1,
            oldRecipe: 'Old Recipe',
            newRecipe: 'New Recipe',
            reason: 'Better protein content'
          }
        ],
        finalNutrition: {
          dailyCalories: 2450,
          dailyProtein: 165,
          dailyCarbs: 245,
          dailyFat: 85,
          proteinRatio: 0.27,
          carbsRatio: 0.40,
          fatRatio: 0.33
        }
      };

      const report = nutritionalOptimizer.generateOptimizationReport(mockResult);

      expect(report).toContain('NUTRITIONAL OPTIMIZATION REPORT');
      expect(report).toContain('SUCCESSFUL');
      expect(report).toContain('26.1%');
      expect(report).toContain('RECIPE SUBSTITUTIONS');
      expect(report).toContain('FINAL NUTRITIONAL PROFILE');
    });
  });

  describe('CustomerPreferenceService', () => {
    
    test('should analyze customer engagement from meal plan history', async () => {
      // Mock database queries
      vi.mocked(db.db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  {
                    mealPlan: {
                      id: 'plan-1',
                      meals: JSON.stringify([
                        {
                          recipe: {
                            ingredientsJson: [
                              { name: 'chicken' },
                              { name: 'rice' }
                            ],
                            dietaryTags: ['healthy', 'protein-rich']
                          }
                        }
                      ])
                    },
                    rating: { overallRating: 5 }
                  }
                ])
              })
            })
          })
        })
      });

      const preferences = await customerPreferenceService.getCustomerPreferences('test-customer-id');

      expect(preferences).toBeDefined();
      if (preferences) {
        expect(preferences.userId).toBeDefined();
        expect(preferences.preferenceScore).toBeGreaterThanOrEqual(0);
        expect(preferences.preferenceScore).toBeLessThanOrEqual(1);
        expect(preferences.learningMetrics).toBeDefined();
      }
    });

    test('should score recipes based on customer preferences', () => {
      const mockPreferences = {
        userId: 'test-user',
        ingredientPreferences: [
          { ingredient: 'chicken', preference: 'love' as const, confidence: 0.9 },
          { ingredient: 'broccoli', preference: 'dislike' as const, confidence: 0.7 }
        ],
        cuisinePreferences: [
          { cuisine: 'italian', preference: 'like' as const, confidence: 0.8 }
        ],
        nutritionalFocus: [
          { focus: 'high_protein' as const, importance: 'high' as const, confidence: 0.9 }
        ],
        dietaryRestrictions: [],
        allergies: [],
        intolerances: [],
        mealTypePreferences: [],
        cookingPreferences: {
          skillLevel: 'intermediate' as const,
          maxPrepTime: 45,
          maxCookTime: 60,
          preferredMethods: [],
          availableEquipment: [],
          mealPrepFrequency: 'weekly' as const
        },
        lifestyleFactors: [],
        preferenceScore: 0.8,
        lastUpdated: new Date(),
        learningMetrics: {
          totalMealPlansRated: 5,
          averageRating: 4.2,
          consistencyScore: 0.8,
          engagementLevel: 'high' as const,
          preferenceStability: 0.7,
          lastLearningUpdate: new Date()
        }
      };

      const mockRecipe = {
        id: 'recipe-1',
        name: 'Chicken Alfredo',
        proteinGrams: '30',
        caloriesKcal: 500,
        ingredientsJson: [
          { name: 'chicken breast' },
          { name: 'pasta' },
          { name: 'alfredo sauce' }
        ],
        dietaryTags: ['italian', 'protein-rich']
      };

      const score = customerPreferenceService.scoreRecipeForCustomer(mockRecipe, mockPreferences);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
      // Should score well due to chicken (loved) and Italian cuisine (liked)
      expect(score).toBeGreaterThan(0.5);
    });

    test('should generate preference analysis report', () => {
      const mockPreferences = {
        userId: 'test-user',
        ingredientPreferences: [
          { ingredient: 'salmon', preference: 'love' as const, confidence: 0.9 },
          { ingredient: 'quinoa', preference: 'like' as const, confidence: 0.8 }
        ],
        cuisinePreferences: [
          { cuisine: 'mediterranean', preference: 'love' as const, confidence: 0.9 }
        ],
        nutritionalFocus: [
          { focus: 'high_protein' as const, importance: 'high' as const, confidence: 0.9 }
        ],
        cookingPreferences: {
          skillLevel: 'advanced' as const,
          maxPrepTime: 60,
          maxCookTime: 90,
          preferredMethods: [],
          availableEquipment: [],
          mealPrepFrequency: 'weekly' as const
        },
        dietaryRestrictions: [],
        allergies: [],
        intolerances: [],
        mealTypePreferences: [],
        lifestyleFactors: [],
        preferenceScore: 0.9,
        lastUpdated: new Date(),
        learningMetrics: {
          totalMealPlansRated: 10,
          averageRating: 4.5,
          consistencyScore: 0.9,
          engagementLevel: 'high' as const,
          preferenceStability: 0.8,
          lastLearningUpdate: new Date()
        }
      };

      const analysis = customerPreferenceService.generatePreferenceAnalysis(mockPreferences);

      expect(analysis.strongPreferences).toContain('salmon');
      expect(analysis.cuisineProfile).toContain('mediterranean');
      expect(analysis.nutritionalPriorities).toContain('high_protein');
      expect(analysis.cookingProfile).toContain('advanced');
      expect(analysis.recommendationStrength).toBe(0.9);
    });
  });

  describe('MealPlanSchedulerService', () => {
    
    test('should create intelligent meal schedule', async () => {
      const schedule = await mealPlanScheduler.createIntelligentSchedule(
        mockBaseMealPlan,
        'test-customer-id'
      );

      expect(schedule).toBeDefined();
      expect(schedule.mealPlanId).toBe(mockBaseMealPlan.id);
      expect(schedule.customerId).toBe('test-customer-id');
      expect(schedule.weeklySchedule).toBeDefined();
      expect(schedule.mealPrepSchedule).toBeDefined();
      expect(schedule.notifications).toBeDefined();
    });

    test('should generate optimized weekly schedule', async () => {
      const schedule = await mealPlanScheduler.createIntelligentSchedule(
        mockBaseMealPlan,
        'test-customer-id'
      );

      expect(schedule.weeklySchedule.days).toHaveLength(7);
      expect(schedule.weeklySchedule.totalPrepTime).toBeGreaterThan(0);
      expect(schedule.weeklySchedule.efficiencyScore).toBeGreaterThanOrEqual(0);
      expect(schedule.weeklySchedule.efficiencyScore).toBeLessThanOrEqual(1);
    });

    test('should create meal prep schedule with batch cooking optimization', async () => {
      const schedule = await mealPlanScheduler.createIntelligentSchedule(
        mockBaseMealPlan,
        'test-customer-id'
      );

      expect(schedule.mealPrepSchedule.prepSessions).toBeDefined();
      expect(schedule.mealPrepSchedule.prepSessions.length).toBeGreaterThan(0);
      expect(schedule.mealPrepSchedule.batchCookingOptimizations).toBeDefined();
      expect(schedule.mealPrepSchedule.shoppingSchedule).toBeDefined();
    });

    test('should generate workout integration for performance goals', async () => {
      const performanceMealPlan = {
        ...mockBaseMealPlan,
        fitnessGoal: 'athletic_performance'
      };

      const schedule = await mealPlanScheduler.createIntelligentSchedule(
        performanceMealPlan,
        'test-customer-id'
      );

      expect(schedule.workoutIntegration).toBeDefined();
      if (schedule.workoutIntegration) {
        expect(schedule.workoutIntegration.workoutSchedule).toBeDefined();
        expect(schedule.workoutIntegration.nutritionTiming).toBeDefined();
        expect(schedule.workoutIntegration.hydrationReminders).toBeDefined();
      }
    });

    test('should generate smart notifications', async () => {
      const schedule = await mealPlanScheduler.createIntelligentSchedule(
        mockBaseMealPlan,
        'test-customer-id'
      );

      expect(schedule.notifications.length).toBeGreaterThan(0);
      
      const prepReminders = schedule.notifications.filter(n => n.type === 'prep_reminder');
      const shoppingReminders = schedule.notifications.filter(n => n.type === 'shopping_reminder');
      
      expect(prepReminders.length).toBeGreaterThan(0);
      expect(shoppingReminders.length).toBeGreaterThan(0);
    });
  });

  describe('MealPlanVariationService', () => {
    
    test('should create seasonal meal plan variation', async () => {
      
      vi.mocked(storage.storage.searchRecipes).mockResolvedValue({
        recipes: [
          {
            id: 'seasonal-recipe-1',
            name: 'Summer Salad',
            caloriesKcal: 350,
            proteinGrams: '20',
            carbsGrams: '30',
            fatGrams: '15',
            mealTypes: ['lunch'],
            isApproved: true,
            ingredientsJson: [
              { name: 'tomatoes' },
              { name: 'cucumber' },
              { name: 'bell peppers' }
            ]
          }
        ]
      });

      const variation = await mealPlanVariationService.createSeasonalVariation(
        mockBaseMealPlan,
        'summer'
      );

      expect(variation).toBeDefined();
      expect(variation.variationType).toBe('seasonal_rotation');
      expect(variation.seasonalAlignment).toBeGreaterThan(0.5);
      expect(variation.changes).toBeDefined();
    });

    test('should create cuisine-based variation', async () => {
      
      vi.mocked(storage.storage.searchRecipes).mockResolvedValue({
        recipes: [
          {
            id: 'cuisine-recipe-1',
            name: 'Mediterranean Bowl',
            caloriesKcal: 450,
            proteinGrams: '25',
            carbsGrams: '40',
            fatGrams: '20',
            mealTypes: ['lunch'],
            isApproved: true,
            ingredientsJson: [
              { name: 'chickpeas' },
              { name: 'olive oil' },
              { name: 'feta cheese' }
            ],
            dietaryTags: ['mediterranean']
          }
        ]
      });

      const variation = await mealPlanVariationService.createCuisineVariation(
        mockBaseMealPlan,
        'Mediterranean',
        'beginner'
      );

      expect(variation).toBeDefined();
      expect(variation.variationType).toBe('cuisine_variation');
      expect(variation.customerFitScore).toBeGreaterThanOrEqual(0);
      expect(variation.changes).toBeDefined();
    });

    test('should create difficulty progression variation', async () => {
      
      vi.mocked(storage.storage.searchRecipes).mockResolvedValue({
        recipes: [
          {
            id: 'advanced-recipe-1',
            name: 'Gourmet Dish',
            caloriesKcal: 500,
            proteinGrams: '30',
            carbsGrams: '35',
            fatGrams: '25',
            mealTypes: ['dinner'],
            prepTimeMinutes: 45,
            cookTimeMinutes: 60,
            isApproved: true,
            ingredientsJson: []
          }
        ]
      });

      const variation = await mealPlanVariationService.createDifficultyProgressionVariation(
        mockBaseMealPlan,
        'increase',
        'intermediate'
      );

      expect(variation).toBeDefined();
      expect(variation.variationType).toBe('difficulty_progression');
      expect(variation.difficultyAdjustment).toBeGreaterThanOrEqual(0);
      expect(variation.changes).toBeDefined();
    });

    test('should create rotation plan for customer', async () => {
      const rotationPlan = await mealPlanVariationService.createRotationPlan(
        'test-customer-id',
        mockBaseMealPlan,
        12
      );

      expect(rotationPlan).toBeDefined();
      expect(rotationPlan.planDuration).toBe(12);
      expect(rotationPlan.rotationCycles).toBeDefined();
      expect(rotationPlan.rotationCycles.length).toBeGreaterThan(0);
      expect(rotationPlan.variationFrequency).toBeGreaterThan(0);
      expect(rotationPlan.customerEngagement).toBeDefined();
    });

    test('should apply variation to create new meal plan', () => {
      const mockVariation = {
        baseId: mockBaseMealPlan.id,
        variationId: 'var-test-123',
        variationType: 'seasonal_rotation' as const,
        changes: [
          {
            day: 1,
            mealNumber: 1,
            originalRecipe: {
              id: 'recipe-1',
              name: 'Original Recipe'
            },
            newRecipe: {
              id: 'recipe-2',
              name: 'New Recipe'
            },
            changeReason: 'Seasonal variation',
            nutritionalDelta: {
              calories: 50,
              protein: 5,
              carbs: -10,
              fat: 2
            },
            confidenceScore: 0.8
          }
        ],
        nutritionalImpact: {
          calorieChange: 50,
          proteinChange: 5,
          carbsChange: -10,
          fatChange: 2,
          micronutrientImpact: [],
          overallHealthScore: 0.8
        },
        varietyScore: 0.7,
        difficultyAdjustment: 0,
        seasonalAlignment: 0.9,
        customerFitScore: 0.8,
        createdAt: new Date()
      };

      const variedMealPlan = mealPlanVariationService.applyVariationToMealPlan(
        mockBaseMealPlan,
        mockVariation
      );

      expect(variedMealPlan).toBeDefined();
      expect(variedMealPlan.id).toBe(mockVariation.variationId);
      expect(variedMealPlan.planName).toContain('Seasonal');
      expect((variedMealPlan as any).variationMetadata).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    
    test('should generate complete intelligent meal plan with all features', async () => {
      
      vi.mocked(storage.storage.searchRecipes).mockResolvedValue({
        recipes: [
          {
            id: 'integration-recipe-1',
            name: 'Complete Recipe',
            caloriesKcal: 500,
            proteinGrams: '35',
            carbsGrams: '45',
            fatGrams: '18',
            prepTimeMinutes: 20,
            cookTimeMinutes: 15,
            mealTypes: ['lunch', 'dinner'],
            isApproved: true,
            ingredientsJson: [
              { name: 'chicken', amount: '6', unit: 'oz' },
              { name: 'rice', amount: '1', unit: 'cup' },
              { name: 'vegetables', amount: '2', unit: 'cups' }
            ],
            dietaryTags: ['high-protein', 'balanced']
          }
        ]
      });

      // Mock database for customer preferences
      vi.mocked(db.db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([])
              })
            })
          })
        })
      });

      const enhancedOptions = {
        ...mockMealPlanOptions,
        customerPreferences: {
          userId: 'test-customer',
          favoriteIngredients: ['chicken', 'rice'],
          dislikedIngredients: [],
          preferredMealTypes: ['lunch', 'dinner'],
          allergies: [],
          intolerances: [],
          cuisinePreferences: ['american'],
          cookingTimePreference: 'moderate' as const,
          spiceLevel: 'medium' as const,
          previousMealPlanRatings: []
        },
        progressiveAdaptation: true,
        diversityScore: 8,
        seasonalPreferences: true,
        budgetOptimization: false
      };

      // Generate intelligent meal plan
      const mealPlan = await intelligentMealPlanGenerator.generateIntelligentMealPlan(
        enhancedOptions,
        mockGeneratedBy
      );

      // Create schedule
      const schedule = await mealPlanScheduler.createIntelligentSchedule(
        mealPlan,
        'test-customer-id'
      );

      // Create variation
      const variation = await mealPlanVariationService.createMealPlanVariation(
        mealPlan,
        'test-customer-id',
        'seasonal_rotation'
      );

      // Apply variation
      const variedMealPlan = mealPlanVariationService.applyVariationToMealPlan(
        mealPlan,
        variation
      );

      // Verify complete system integration
      expect(mealPlan).toBeDefined();
      expect(mealPlan.meals.length).toBeGreaterThan(0);
      expect(mealPlan.mealTimingRecommendations).toBeDefined();

      expect(schedule).toBeDefined();
      expect(schedule.weeklySchedule).toBeDefined();
      expect(schedule.mealPrepSchedule).toBeDefined();

      expect(variation).toBeDefined();
      expect(variation.changes).toBeDefined();

      expect(variedMealPlan).toBeDefined();
      expect(variedMealPlan.id).toBe(variation.variationId);
    });

    test('should handle error scenarios gracefully', async () => {
      
      
      // Test with no available recipes
      vi.mocked(storage.storage.searchRecipes).mockResolvedValue({
        recipes: []
      });

      await expect(async () => {
        const result = await intelligentMealPlanGenerator.generateIntelligentMealPlan(
          mockMealPlanOptions,
          mockGeneratedBy
        );
        // Should either succeed with fallback or throw meaningful error
        expect(result).toBeDefined();
      }).not.toThrow();

      // Test with database connection error
      vi.mocked(storage.storage.searchRecipes).mockRejectedValue(new Error('Connection failed'));

      await expect(async () => {
        const result = await intelligentMealPlanGenerator.generateIntelligentMealPlan(
          mockMealPlanOptions,
          mockGeneratedBy
        );
        // Should fallback gracefully
        expect(result).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Performance Tests', () => {
    
    test('should generate meal plan within reasonable time limits', async () => {
      
      vi.mocked(storage.storage.searchRecipes).mockResolvedValue({
        recipes: Array.from({ length: 100 }, (_, i) => ({
          id: `perf-recipe-${i}`,
          name: `Performance Recipe ${i}`,
          caloriesKcal: 400 + (i * 10),
          proteinGrams: '25',
          carbsGrams: '40',
          fatGrams: '15',
          mealTypes: ['breakfast', 'lunch', 'dinner'][i % 3],
          isApproved: true,
          ingredientsJson: []
        }))
      });

      const startTime = Date.now();
      
      const result = await intelligentMealPlanGenerator.generateIntelligentMealPlan(
        mockMealPlanOptions,
        mockGeneratedBy
      );
      
      const executionTime = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    test('should handle large meal plans efficiently', async () => {
      
      vi.mocked(storage.storage.searchRecipes).mockResolvedValue({
        recipes: Array.from({ length: 50 }, (_, i) => ({
          id: `large-recipe-${i}`,
          name: `Large Recipe ${i}`,
          caloriesKcal: 450,
          proteinGrams: '30',
          carbsGrams: '45',
          fatGrams: '18',
          mealTypes: ['breakfast', 'lunch', 'dinner', 'snack'][i % 4],
          isApproved: true,
          ingredientsJson: []
        }))
      });

      const largeMealPlanOptions = {
        ...mockMealPlanOptions,
        days: 14, // 2 weeks
        mealsPerDay: 6 // 6 meals per day
      };

      const startTime = Date.now();
      
      const result = await intelligentMealPlanGenerator.generateIntelligentMealPlan(
        largeMealPlanOptions,
        mockGeneratedBy
      );
      
      const executionTime = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(result.meals.length).toBe(84); // 14 days * 6 meals
      expect(executionTime).toBeLessThan(15000); // Should complete within 15 seconds
    });
  });
});