import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import adminRouter from '../../../server/routes/adminRoutes';
import { storage } from '../../../server/storage';
import { recipeGenerator } from '../../../server/services/recipeGenerator';
import { enhancedRecipeGenerator } from '../../../server/services/recipeGeneratorEnhanced';
import { recipeQualityScorer } from '../../../server/services/recipeQualityScorer';
import { apiCostTracker } from '../../../server/services/apiCostTracker';
import { progressTracker } from '../../../server/services/progressTracker';
import { parseNaturalLanguageRecipeRequirements } from '../../../server/services/openai';
import { db } from '../../../server/db';

// Mock all dependencies
vi.mock('../../../server/storage');
vi.mock('../../../server/services/recipeGenerator');
vi.mock('../../../server/services/recipeGeneratorEnhanced');
vi.mock('../../../server/services/recipeQualityScorer');
vi.mock('../../../server/services/apiCostTracker');
vi.mock('../../../server/services/progressTracker');
vi.mock('../../../server/services/openai');
vi.mock('../../../server/db');

// Mock authentication middleware
vi.mock('../../../server/middleware/auth', () => ({
  requireAdmin: vi.fn((req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  }),
  requireAuth: vi.fn((req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    next();
  }),
  requireTrainerOrAdmin: vi.fn((req, res, next) => {
    if (!req.user || (req.user.role !== 'trainer' && req.user.role !== 'admin')) {
      return res.status(403).json({ error: 'Trainer or admin access required' });
    }
    next();
  }),
}));

const mockStorage = vi.mocked(storage);
const mockRecipeGenerator = vi.mocked(recipeGenerator);
const mockEnhancedRecipeGenerator = vi.mocked(enhancedRecipeGenerator);
const mockRecipeQualityScorer = vi.mocked(recipeQualityScorer);
const mockApiCostTracker = vi.mocked(apiCostTracker);
const mockProgressTracker = vi.mocked(progressTracker);
const mockParseNaturalLanguage = vi.mocked(parseNaturalLanguageRecipeRequirements);
const mockDb = vi.mocked(db);

describe('Admin Routes - Comprehensive Tests', () => {
  let app: express.Application;

  const mockAdmin = {
    id: 'admin-id-123',
    email: 'admin@fitnessmealplanner.com',
    role: 'admin',
    name: 'Admin User'
  };

  const mockTrainer = {
    id: 'trainer-id-456',
    email: 'trainer@fitnessmealplanner.com',
    role: 'trainer',
    name: 'Trainer User'
  };

  const mockCustomer = {
    id: 'customer-id-789',
    email: 'customer@fitnessmealplanner.com',
    role: 'customer',
    name: 'Customer User'
  };

  const mockRecipe = {
    id: 'recipe-uuid-123',
    name: 'Comprehensive Test Recipe',
    description: 'A detailed test recipe for comprehensive testing',
    mealTypes: ['Dinner', 'Lunch'],
    dietaryTags: ['Vegetarian', 'High-Protein'],
    mainIngredientTags: ['Tofu', 'Quinoa'],
    ingredientsJson: [
      { name: 'Organic Tofu', amount: '200', unit: 'g' },
      { name: 'Quinoa', amount: '150', unit: 'g' },
      { name: 'Mixed Vegetables', amount: '100', unit: 'g' }
    ],
    instructionsText: 'Detailed cooking instructions for the test recipe.',
    prepTimeMinutes: 25,
    cookTimeMinutes: 35,
    servings: 4,
    caloriesKcal: 450,
    proteinGrams: '32.50',
    carbsGrams: '45.00',
    fatGrams: '18.75',
    imageUrl: 'https://s3.example.com/recipes/test-recipe.jpg',
    sourceReference: 'AI Generated',
    isApproved: true,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T12:00:00Z')
  };

  const mockMealPlanData = {
    id: 'meal-plan-uuid-456',
    planName: 'Comprehensive Test Meal Plan',
    fitnessGoal: 'muscle gain',
    description: 'A comprehensive test meal plan for building muscle',
    dailyCalorieTarget: 2500,
    clientName: 'Test Client',
    days: 7,
    mealsPerDay: 4,
    generatedBy: 'admin-id-123',
    createdAt: new Date('2024-01-15T08:00:00Z'),
    meals: [
      {
        day: 1,
        mealNumber: 1,
        mealType: 'Breakfast',
        recipe: {
          id: 'breakfast-recipe-id',
          name: 'High-Protein Breakfast Bowl',
          description: 'Nutritious breakfast for muscle building',
          caloriesKcal: 550,
          proteinGrams: '35.00',
          carbsGrams: '40.00',
          fatGrams: '22.00',
          prepTimeMinutes: 15,
          cookTimeMinutes: 10,
          servings: 1,
          mealTypes: ['Breakfast'],
          dietaryTags: ['High-Protein'],
          mainIngredientTags: ['Eggs', 'Oats'],
          ingredientsJson: [
            { name: 'Eggs', amount: '3', unit: 'large' },
            { name: 'Rolled Oats', amount: '80', unit: 'g' }
          ],
          instructionsText: 'Scramble eggs and serve with oatmeal.',
          imageUrl: 'https://s3.example.com/breakfast.jpg'
        }
      }
    ]
  };

  const createApp = (user = mockAdmin) => {
    const testApp = express();
    testApp.use(express.json({ limit: '10mb' }));
    testApp.use((req, res, next) => {
      req.user = user;
      next();
    });
    testApp.use('/api/admin', adminRouter);
    return testApp;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();

    // Setup default mock responses
    mockProgressTracker.createJob.mockReturnValue('job-uuid-123');
    mockProgressTracker.getProgress.mockReturnValue({
      jobId: 'job-uuid-123',
      totalRecipes: 5,
      completedRecipes: 3,
      currentStep: 'generating',
      status: 'in_progress',
      startTime: new Date(),
      endTime: null,
      errors: [],
      successes: ['Recipe 1', 'Recipe 2', 'Recipe 3']
    });
    mockProgressTracker.getAllJobs.mockReturnValue([
      { jobId: 'job-1', status: 'completed', totalRecipes: 5, completedRecipes: 5 },
      { jobId: 'job-2', status: 'in_progress', totalRecipes: 10, completedRecipes: 7 }
    ]);

    mockRecipeGenerator.generateAndStoreRecipes.mockResolvedValue({
      success: 5,
      failed: 0,
      errors: [],
      metrics: { totalDuration: 45000, averageTimePerRecipe: 9000 }
    });

    mockStorage.getCustomers.mockResolvedValue([mockCustomer]);
    mockStorage.assignRecipeToCustomers.mockResolvedValue(undefined);
    mockStorage.assignMealPlanToCustomers.mockResolvedValue(undefined);
    mockStorage.searchRecipes.mockResolvedValue({
      recipes: [mockRecipe],
      total: 1
    });
    mockStorage.getRecipeStats.mockResolvedValue({
      total: 150,
      approved: 120,
      pending: 30
    });
    mockStorage.updateRecipe.mockResolvedValue(mockRecipe);
    mockStorage.deleteRecipe.mockResolvedValue(undefined);
    mockStorage.bulkDeleteRecipes.mockResolvedValue(undefined);
    mockStorage.getRecipe.mockResolvedValue(mockRecipe);
    mockStorage.createRecipe.mockResolvedValue(mockRecipe);

    // Enhanced recipe generator mocks
    mockEnhancedRecipeGenerator.generateWithFallback.mockResolvedValue({
      id: 'enhanced-recipe-id',
      name: 'Enhanced AI Recipe',
      description: 'A recipe generated with enhanced AI capabilities',
      mealTypes: ['Lunch'],
      dietaryTags: ['High Protein'],
      mainIngredientTags: ['Chicken'],
      ingredientsJson: [{ name: 'Chicken Breast', amount: '250', unit: 'g' }],
      instructionsText: 'Cook chicken thoroughly',
      prepTimeMinutes: 20,
      cookTimeMinutes: 25,
      servings: 1,
      caloriesKcal: 400,
      proteinGrams: '45.00',
      carbsGrams: '5.00',
      fatGrams: '18.00',
      imageUrl: 'https://s3.example.com/enhanced.jpg',
      sourceReference: 'AI Generated Enhanced',
      isApproved: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    mockRecipeQualityScorer.scoreRecipe.mockReturnValue({
      overall: 8.7,
      nutrition: 9.2,
      clarity: 8.5,
      feasibility: 8.4,
      metadata: {
        suggestions: ['Add more detailed cooking times', 'Include nutritional benefits'],
        warnings: ['Check sodium content'],
        strengths: ['Excellent protein content', 'Clear instructions', 'Balanced macros']
      }
    });

    mockApiCostTracker.trackUsage.mockResolvedValue(0.0456);
    mockApiCostTracker.getUsageStats.mockResolvedValue({
      totalCost: 234.56,
      totalRequests: 2340,
      averageCostPerRequest: 0.1002
    });
    mockApiCostTracker.getMonthlyBudgetStatus.mockResolvedValue({
      budget: 2000,
      spent: 234.56,
      remaining: 1765.44,
      percentUsed: 11.73
    });
    mockApiCostTracker.getTopConsumers.mockResolvedValue([
      { userId: 'user-1', cost: 89.12 },
      { userId: 'user-2', cost: 67.43 },
      { userId: 'user-3', cost: 45.67 }
    ]);
    mockApiCostTracker.getCostByModel.mockResolvedValue([
      { model: 'gpt-4', cost: 156.78 },
      { model: 'gpt-3.5-turbo', cost: 77.78 }
    ]);

    mockParseNaturalLanguage.mockResolvedValue({
      mealTypes: ['breakfast'],
      dietaryTags: ['vegetarian', 'gluten-free'],
      mainIngredientTags: ['oats', 'berries'],
      maxPrepTime: 20,
      targetCalories: 350,
      description: 'Quick healthy breakfast'
    });

    // Database mocks
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
        groupBy: vi.fn().mockResolvedValue([
          { role: 'admin', count: 2 },
          { role: 'trainer', count: 15 },
          { role: 'customer', count: 145 }
        ]),
      })
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/admin/generate - Enhanced Recipe Generation', () => {
    it('should start recipe generation with comprehensive parameters', async () => {
      const requestBody = {
        count: 10,
        mealTypes: ['Breakfast', 'Lunch', 'Dinner'],
        dietaryRestrictions: ['Vegetarian', 'Gluten-Free'],
        targetCalories: 500,
        mainIngredient: 'Quinoa',
        fitnessGoal: 'muscle gain',
        naturalLanguagePrompt: 'High protein vegetarian meals for building muscle',
        maxPrepTime: 45,
        maxCalories: 600,
        minProtein: 25,
        maxProtein: 40,
        minCarbs: 30,
        maxCarbs: 80,
        minFat: 15,
        maxFat: 25
      };

      const response = await request(app)
        .post('/api/admin/generate')
        .send(requestBody);

      expect(response.status).toBe(202);
      expect(response.body.message).toContain('Recipe generation started for 10 recipes');
      expect(response.body.message).toContain('with context-based targeting');
      expect(response.body.jobId).toBe('job-uuid-123');

      expect(mockProgressTracker.createJob).toHaveBeenCalledWith({
        totalRecipes: 10,
        metadata: {
          naturalLanguagePrompt: 'High protein vegetarian meals for building muscle',
          fitnessGoal: 'muscle gain',
          mealTypes: ['Breakfast', 'Lunch', 'Dinner'],
          dietaryRestrictions: ['Vegetarian', 'Gluten-Free']
        }
      });

      expect(mockRecipeGenerator.generateAndStoreRecipes).toHaveBeenCalledWith({
        ...requestBody,
        jobId: 'job-uuid-123'
      });
    });

    it('should handle edge case with maximum allowed count', async () => {
      const response = await request(app)
        .post('/api/admin/generate')
        .send({ count: 500 });

      expect(response.status).toBe(202);
      expect(response.body.message).toContain('500 recipes');
    });

    it('should reject count exceeding maximum limit', async () => {
      const response = await request(app)
        .post('/api/admin/generate')
        .send({ count: 501 });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Count is required and must be between 1 and 500');
    });

    it('should handle minimum valid count', async () => {
      const response = await request(app)
        .post('/api/admin/generate')
        .send({ count: 1 });

      expect(response.status).toBe(202);
      expect(response.body.message).toContain('1 recipes');
    });

    it('should handle null and undefined parameters gracefully', async () => {
      const response = await request(app)
        .post('/api/admin/generate')
        .send({
          count: 5,
          mealTypes: null,
          dietaryRestrictions: undefined,
          targetCalories: null,
          naturalLanguagePrompt: ''
        });

      expect(response.status).toBe(202);
      expect(mockRecipeGenerator.generateAndStoreRecipes).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 5,
          mealTypes: null,
          dietaryRestrictions: undefined,
          targetCalories: null,
          naturalLanguagePrompt: '',
          jobId: 'job-uuid-123'
        })
      );
    });

    it('should handle service errors during generation setup', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockProgressTracker.createJob.mockImplementation(() => {
        throw new Error('Progress tracking service unavailable');
      });

      const response = await request(app)
        .post('/api/admin/generate')
        .send({ count: 3 });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Failed to start recipe generation');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error starting recipe generation:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should log generation context for debugging', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await request(app)
        .post('/api/admin/generate')
        .send({
          count: 2,
          fitnessGoal: 'weight loss',
          naturalLanguagePrompt: 'Low carb meals'
        });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Recipe generation started with context:',
        expect.objectContaining({
          count: 2,
          fitnessGoal: 'weight loss',
          naturalLanguagePrompt: 'Low carb meals'
        })
      );

      consoleSpy.mockRestore();
    });

    it('should start generation asynchronously without waiting', async () => {
      let generationStarted = false;
      let generationCompleted = false;

      mockRecipeGenerator.generateAndStoreRecipes.mockImplementation(async () => {
        generationStarted = true;
        await new Promise(resolve => setTimeout(resolve, 500));
        generationCompleted = true;
        return { success: 3, failed: 0, errors: [], metrics: { totalDuration: 500, averageTimePerRecipe: 167 } };
      });

      const start = Date.now();
      const response = await request(app)
        .post('/api/admin/generate')
        .send({ count: 3 });
      const duration = Date.now() - start;

      expect(response.status).toBe(202);
      expect(duration).toBeLessThan(100); // Should return quickly
      expect(generationStarted).toBe(true);
      expect(generationCompleted).toBe(false); // Should not wait for completion
    });
  });

  describe('POST /api/admin/generate-enhanced - Enhanced AI Generation', () => {
    it('should generate enhanced recipe with quality scoring', async () => {
      const requestBody = {
        prompt: 'Create a high-protein, low-carb dinner recipe with salmon',
        calories: 450,
        protein: 40,
        carbs: 15,
        fat: 25,
        mealType: 'Dinner',
        dietaryRestrictions: ['Keto'],
        model: 'gpt-4'
      };

      const response = await request(app)
        .post('/api/admin/generate-enhanced')
        .send(requestBody);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toBeDefined();
      expect(response.body.metadata).toEqual({
        qualityScore: 8.7,
        cost: '$0.0456',
        suggestions: ['Add more detailed cooking times', 'Include nutritional benefits'],
        warnings: ['Check sodium content'],
        strengths: ['Excellent protein content', 'Clear instructions', 'Balanced macros']
      });

      expect(mockEnhancedRecipeGenerator.generateWithFallback).toHaveBeenCalledWith(requestBody);
      expect(mockRecipeQualityScorer.scoreRecipe).toHaveBeenCalled();
      expect(mockApiCostTracker.trackUsage).toHaveBeenCalledWith(
        'gpt-4',
        { promptTokens: 500, completionTokens: 800, totalTokens: 1300 },
        'admin-id-123',
        'enhanced-recipe-id'
      );
    });

    it('should use default model when not specified', async () => {
      await request(app)
        .post('/api/admin/generate-enhanced')
        .send({ prompt: 'Simple recipe' });

      expect(mockApiCostTracker.trackUsage).toHaveBeenCalledWith(
        'gpt-3.5-turbo-1106',
        expect.any(Object),
        'admin-id-123',
        'enhanced-recipe-id'
      );
    });

    it('should handle enhanced generation failures', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockEnhancedRecipeGenerator.generateWithFallback.mockRejectedValue(
        new Error('Enhanced generation failed due to API limit')
      );

      const response = await request(app)
        .post('/api/admin/generate-enhanced')
        .send({ prompt: 'Test recipe' });

      expect(response.status).toBe(500);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Failed to generate enhanced recipe');
      expect(response.body.error).toBe('Enhanced generation failed due to API limit');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Enhanced Generation] Failed:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should store enhanced recipe with metadata', async () => {
      await request(app)
        .post('/api/admin/generate-enhanced')
        .send({ prompt: 'Test recipe', model: 'gpt-4' });

      expect(mockStorage.createRecipe).toHaveBeenCalledWith(
        expect.objectContaining({
          quality_score: 8.7,
          api_cost: 0.0456,
          model_used: 'gpt-4',
          generation_attempts: 1
        })
      );
    });

    it('should handle quality scoring errors gracefully', async () => {
      mockRecipeQualityScorer.scoreRecipe.mockImplementation(() => {
        throw new Error('Quality scoring service unavailable');
      });

      const response = await request(app)
        .post('/api/admin/generate-enhanced')
        .send({ prompt: 'Test recipe' });

      expect(response.status).toBe(500);
    });

    it('should log enhanced generation process', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await request(app)
        .post('/api/admin/generate-enhanced')
        .send({
          prompt: 'Keto-friendly breakfast',
          calories: 400,
          model: 'gpt-4'
        });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Enhanced Generation] Starting with params:',
        expect.objectContaining({
          prompt: 'Keto-friendly breakfast',
          calories: 400,
          model: 'gpt-4'
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('GET /api/admin/api-usage - API Cost Tracking', () => {
    it('should return comprehensive API usage statistics', async () => {
      const response = await request(app)
        .get('/api/admin/api-usage');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        usageStats: {
          totalCost: 234.56,
          totalRequests: 2340,
          averageCostPerRequest: 0.1002
        },
        budgetStatus: {
          budget: 2000,
          spent: 234.56,
          remaining: 1765.44,
          percentUsed: 11.73
        },
        topConsumers: [
          { userId: 'user-1', cost: 89.12 },
          { userId: 'user-2', cost: 67.43 },
          { userId: 'user-3', cost: 45.67 }
        ],
        costByModel: [
          { model: 'gpt-4', cost: 156.78 },
          { model: 'gpt-3.5-turbo', cost: 77.78 }
        ]
      });
    });

    it('should handle custom date range parameters', async () => {
      const startDate = '2024-01-01T00:00:00Z';
      const endDate = '2024-01-31T23:59:59Z';

      await request(app)
        .get('/api/admin/api-usage')
        .query({ startDate, endDate });

      expect(mockApiCostTracker.getUsageStats).toHaveBeenCalledWith(
        new Date(startDate),
        new Date(endDate)
      );
      expect(mockApiCostTracker.getCostByModel).toHaveBeenCalledWith(
        new Date(startDate)
      );
    });

    it('should use default 30-day range when dates not provided', async () => {
      await request(app)
        .get('/api/admin/api-usage');

      expect(mockApiCostTracker.getUsageStats).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date)
      );

      const calls = mockApiCostTracker.getUsageStats.mock.calls[0];
      const startDate = calls[0];
      const endDate = calls[1];
      const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

      expect(Math.abs(daysDiff - 30)).toBeLessThan(1); // Approximately 30 days
    });

    it('should handle API usage service errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockApiCostTracker.getUsageStats.mockRejectedValue(new Error('Usage service unavailable'));

      const response = await request(app)
        .get('/api/admin/api-usage');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch API usage statistics');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[API Usage] Failed to get stats:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle invalid date parameters gracefully', async () => {
      await request(app)
        .get('/api/admin/api-usage')
        .query({ startDate: 'invalid-date', endDate: '2024-01-31' });

      // Should still make the call with parsed dates (invalid dates become Invalid Date objects)
      expect(mockApiCostTracker.getUsageStats).toHaveBeenCalled();
    });
  });

  describe('GET /api/admin/customers - Customer Management', () => {
    it('should return all customers without filters', async () => {
      const response = await request(app)
        .get('/api/admin/customers');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([mockCustomer]);
      expect(mockStorage.getCustomers).toHaveBeenCalledWith(undefined, undefined);
    });

    it('should filter customers by recipe ID', async () => {
      const recipeId = 'recipe-filter-123';

      await request(app)
        .get('/api/admin/customers')
        .query({ recipeId });

      expect(mockStorage.getCustomers).toHaveBeenCalledWith(recipeId, undefined);
    });

    it('should filter customers by meal plan ID', async () => {
      const mealPlanId = 'meal-plan-filter-456';

      await request(app)
        .get('/api/admin/customers')
        .query({ mealPlanId });

      expect(mockStorage.getCustomers).toHaveBeenCalledWith(undefined, mealPlanId);
    });

    it('should filter customers by both recipe and meal plan ID', async () => {
      const recipeId = 'recipe-123';
      const mealPlanId = 'meal-plan-456';

      await request(app)
        .get('/api/admin/customers')
        .query({ recipeId, mealPlanId });

      expect(mockStorage.getCustomers).toHaveBeenCalledWith(recipeId, mealPlanId);
    });

    it('should handle storage service errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockStorage.getCustomers.mockRejectedValue(new Error('Database connection timeout'));

      const response = await request(app)
        .get('/api/admin/customers');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch customers');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to fetch customers:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should work with trainer authentication', async () => {
      app = createApp(mockTrainer);

      const response = await request(app)
        .get('/api/admin/customers');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([mockCustomer]);
    });

    it('should reject customer role access', async () => {
      app = createApp(mockCustomer);

      const response = await request(app)
        .get('/api/admin/customers');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Trainer or admin access required');
    });
  });

  describe('POST /api/admin/assign-recipe - Recipe Assignment', () => {
    beforeEach(() => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { customerId: 'customer-1', recipeId: 'recipe-uuid-123' },
            { customerId: 'customer-2', recipeId: 'recipe-uuid-123' }
          ])
        })
      } as any);
    });

    it('should assign recipe to new customers successfully', async () => {
      const requestBody = {
        recipeId: 'recipe-uuid-123',
        customerIds: ['customer-1', 'customer-2', 'customer-3']
      };

      const response = await request(app)
        .post('/api/admin/assign-recipe')
        .send(requestBody);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('assigned to 1 customer(s)');
      expect(response.body.added).toBe(1);
      expect(response.body.removed).toBe(0);

      expect(mockStorage.assignRecipeToCustomers).toHaveBeenCalledWith(
        'admin-id-123',
        'recipe-uuid-123',
        ['customer-1', 'customer-2', 'customer-3']
      );
    });

    it('should handle unassigning customers from recipe', async () => {
      const requestBody = {
        recipeId: 'recipe-uuid-123',
        customerIds: ['customer-1'] // Removing customer-2
      };

      const response = await request(app)
        .post('/api/admin/assign-recipe')
        .send(requestBody);

      expect(response.body.message).toContain('unassigned from 1 customer(s)');
      expect(response.body.added).toBe(0);
      expect(response.body.removed).toBe(1);
    });

    it('should handle both assignment and unassignment in single request', async () => {
      const requestBody = {
        recipeId: 'recipe-uuid-123',
        customerIds: ['customer-1', 'customer-3', 'customer-4'] // Remove customer-2, add customer-3 and customer-4
      };

      const response = await request(app)
        .post('/api/admin/assign-recipe')
        .send(requestBody);

      expect(response.body.message).toContain('assigned to 2 customer(s) and unassigned from 1 customer(s)');
      expect(response.body.added).toBe(2);
      expect(response.body.removed).toBe(1);
    });

    it('should handle no changes scenario', async () => {
      const requestBody = {
        recipeId: 'recipe-uuid-123',
        customerIds: ['customer-1', 'customer-2'] // Same as current assignments
      };

      const response = await request(app)
        .post('/api/admin/assign-recipe')
        .send(requestBody);

      expect(response.body.message).toBe('No changes were made to recipe assignments');
      expect(response.body.added).toBe(0);
      expect(response.body.removed).toBe(0);
    });

    it('should validate recipe ID format', async () => {
      const response = await request(app)
        .post('/api/admin/assign-recipe')
        .send({
          recipeId: 'invalid-uuid-format',
          customerIds: ['customer-1']
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.details).toBeDefined();
    });

    it('should validate customer IDs format', async () => {
      const response = await request(app)
        .post('/api/admin/assign-recipe')
        .send({
          recipeId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          customerIds: ['invalid-uuid', 'another-invalid-uuid']
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request data');
    });

    it('should handle assignment service errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockStorage.assignRecipeToCustomers.mockRejectedValue(new Error('Database constraint violation'));

      const response = await request(app)
        .post('/api/admin/assign-recipe')
        .send({
          recipeId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          customerIds: ['a47ac10b-58cc-4372-a567-0e02b2c3d479']
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to assign recipe');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to assign recipe:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should work with trainer role authentication', async () => {
      app = createApp(mockTrainer);

      const response = await request(app)
        .post('/api/admin/assign-recipe')
        .send({
          recipeId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          customerIds: ['a47ac10b-58cc-4372-a567-0e02b2c3d479']
        });

      expect(response.status).toBe(200);
      expect(mockStorage.assignRecipeToCustomers).toHaveBeenCalledWith(
        'trainer-id-456',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        ['a47ac10b-58cc-4372-a567-0e02b2c3d479']
      );
    });
  });

  describe('POST /api/admin/assign-meal-plan - Meal Plan Assignment', () => {
    it('should assign meal plan to customers successfully', async () => {
      const requestBody = {
        mealPlanData: mockMealPlanData,
        customerIds: ['customer-1', 'customer-2', 'customer-3']
      };

      const response = await request(app)
        .post('/api/admin/assign-meal-plan')
        .send(requestBody);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Meal plan assigned to 3 customer(s) successfully');
      expect(response.body.added).toBe(3);
      expect(response.body.removed).toBe(0);

      expect(mockStorage.assignMealPlanToCustomers).toHaveBeenCalledWith(
        'admin-id-123',
        mockMealPlanData,
        ['customer-1', 'customer-2', 'customer-3']
      );
    });

    it('should handle empty customer list (unassign from all)', async () => {
      const requestBody = {
        mealPlanData: mockMealPlanData,
        customerIds: []
      };

      const response = await request(app)
        .post('/api/admin/assign-meal-plan')
        .send(requestBody);

      expect(response.body.message).toBe('Meal plan unassigned from all customers');
      expect(response.body.added).toBe(0);
    });

    it('should validate meal plan data structure comprehensively', async () => {
      const invalidMealPlan = {
        ...mockMealPlanData,
        planName: '', // Invalid empty name
        days: -1, // Invalid negative days
        mealsPerDay: 0 // Invalid zero meals per day
      };

      const response = await request(app)
        .post('/api/admin/assign-meal-plan')
        .send({
          mealPlanData: invalidMealPlan,
          customerIds: ['customer-1']
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.details).toBeDefined();
    });

    it('should validate meal structure within meal plan', async () => {
      const invalidMealPlan = {
        ...mockMealPlanData,
        meals: [
          {
            day: 1,
            mealNumber: 1,
            mealType: 'Breakfast',
            recipe: {
              id: 'invalid-recipe-id', // Invalid UUID
              name: '',
              description: 'Test',
              caloriesKcal: -100, // Invalid negative calories
              proteinGrams: 'invalid', // Should be string representation of number
              prepTimeMinutes: -5 // Invalid negative time
            }
          }
        ]
      };

      const response = await request(app)
        .post('/api/admin/assign-meal-plan')
        .send({
          mealPlanData: invalidMealPlan,
          customerIds: ['customer-1']
        });

      expect(response.status).toBe(400);
    });

    it('should handle complex meal plan with multiple days and meals', async () => {
      const complexMealPlan = {
        ...mockMealPlanData,
        days: 7,
        mealsPerDay: 4,
        meals: Array.from({ length: 28 }, (_, i) => ({
          day: Math.floor(i / 4) + 1,
          mealNumber: (i % 4) + 1,
          mealType: ['Breakfast', 'Lunch', 'Dinner', 'Snack'][i % 4],
          recipe: {
            ...mockMealPlanData.meals[0].recipe,
            id: `recipe-${i}`,
            name: `Recipe ${i + 1}`
          }
        }))
      };

      const response = await request(app)
        .post('/api/admin/assign-meal-plan')
        .send({
          mealPlanData: complexMealPlan,
          customerIds: ['customer-1']
        });

      expect(response.status).toBe(200);
    });

    it('should handle assignment service errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockStorage.assignMealPlanToCustomers.mockRejectedValue(new Error('Meal plan storage failed'));

      const response = await request(app)
        .post('/api/admin/assign-meal-plan')
        .send({
          mealPlanData: mockMealPlanData,
          customerIds: ['customer-1']
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to assign meal plan');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to assign meal plan:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should validate customer ID format in meal plan assignment', async () => {
      const response = await request(app)
        .post('/api/admin/assign-meal-plan')
        .send({
          mealPlanData: mockMealPlanData,
          customerIds: ['invalid-uuid-format']
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('GET /api/admin/recipes - Recipe Management', () => {
    it('should return paginated recipes with default parameters', async () => {
      const response = await request(app)
        .get('/api/admin/recipes');

      expect(response.status).toBe(200);
      expect(response.body.recipes).toEqual([mockRecipe]);
      expect(response.body.total).toBe(1);

      expect(mockStorage.searchRecipes).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        approved: undefined,
        search: undefined
      });
    });

    it('should handle all query parameters correctly', async () => {
      await request(app)
        .get('/api/admin/recipes')
        .query({
          page: '3',
          limit: '50',
          approved: 'true',
          search: 'high protein chicken recipes'
        });

      expect(mockStorage.searchRecipes).toHaveBeenCalledWith({
        page: 3,
        limit: 50,
        approved: true,
        search: 'high protein chicken recipes'
      });
    });

    it('should handle boolean conversion for approved parameter', async () => {
      // Test 'false' string
      await request(app)
        .get('/api/admin/recipes')
        .query({ approved: 'false' });

      expect(mockStorage.searchRecipes).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        approved: false,
        search: undefined
      });

      // Test 'true' string
      await request(app)
        .get('/api/admin/recipes')
        .query({ approved: 'true' });

      expect(mockStorage.searchRecipes).toHaveBeenLastCalledWith({
        page: 1,
        limit: 20,
        approved: true,
        search: undefined
      });
    });

    it('should validate page parameter boundaries', async () => {
      // Test page < 1
      const response1 = await request(app)
        .get('/api/admin/recipes')
        .query({ page: '0' });

      expect(response1.status).toBe(400);
      expect(response1.body.error).toBe('Invalid filter parameters');

      // Test negative page
      const response2 = await request(app)
        .get('/api/admin/recipes')
        .query({ page: '-1' });

      expect(response2.status).toBe(400);
    });

    it('should validate limit parameter boundaries', async () => {
      // Test limit > 100
      const response1 = await request(app)
        .get('/api/admin/recipes')
        .query({ limit: '101' });

      expect(response1.status).toBe(400);

      // Test limit < 1
      const response2 = await request(app)
        .get('/api/admin/recipes')
        .query({ limit: '0' });

      expect(response2.status).toBe(400);
    });

    it('should handle search with special characters', async () => {
      const specialSearch = 'café crème brûlée with jalapeño & açaí!';

      await request(app)
        .get('/api/admin/recipes')
        .query({ search: specialSearch });

      expect(mockStorage.searchRecipes).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        approved: undefined,
        search: specialSearch
      });
    });

    it('should handle empty search parameter', async () => {
      await request(app)
        .get('/api/admin/recipes')
        .query({ search: '' });

      expect(mockStorage.searchRecipes).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        approved: undefined,
        search: ''
      });
    });

    it('should handle large search queries', async () => {
      const longSearch = 'a'.repeat(1000);

      await request(app)
        .get('/api/admin/recipes')
        .query({ search: longSearch });

      expect(mockStorage.searchRecipes).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        approved: undefined,
        search: longSearch
      });
    });

    it('should handle storage service errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockStorage.searchRecipes.mockRejectedValue(new Error('Search index corrupted'));

      const response = await request(app)
        .get('/api/admin/recipes');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid filter parameters');

      consoleSpy.mockRestore();
    });
  });

  describe('GET /api/admin/stats - Statistics', () => {
    it('should return comprehensive recipe statistics', async () => {
      const response = await request(app)
        .get('/api/admin/stats');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        total: 150,
        approved: 120,
        pending: 30
      });

      expect(mockStorage.getRecipeStats).toHaveBeenCalled();
    });

    it('should handle stats service errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockStorage.getRecipeStats.mockRejectedValue(new Error('Statistics service unavailable'));

      const response = await request(app)
        .get('/api/admin/stats');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Could not fetch stats');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to fetch admin stats:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle empty statistics gracefully', async () => {
      mockStorage.getRecipeStats.mockResolvedValue({
        total: 0,
        approved: 0,
        pending: 0
      });

      const response = await request(app)
        .get('/api/admin/stats');

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(0);
    });
  });

  describe('GET /api/admin/generation-progress/:jobId - Progress Tracking', () => {
    it('should return detailed progress for valid job ID', async () => {
      const response = await request(app)
        .get('/api/admin/generation-progress/job-uuid-123');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        jobId: 'job-uuid-123',
        totalRecipes: 5,
        completedRecipes: 3,
        currentStep: 'generating',
        status: 'in_progress',
        startTime: expect.any(String),
        endTime: null,
        errors: [],
        successes: ['Recipe 1', 'Recipe 2', 'Recipe 3']
      });

      expect(mockProgressTracker.getProgress).toHaveBeenCalledWith('job-uuid-123');
    });

    it('should handle job not found', async () => {
      mockProgressTracker.getProgress.mockReturnValue(null);

      const response = await request(app)
        .get('/api/admin/generation-progress/non-existent-job');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Job not found or has expired');
    });

    it('should handle progress tracker service errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockProgressTracker.getProgress.mockImplementation(() => {
        throw new Error('Progress tracking service error');
      });

      const response = await request(app)
        .get('/api/admin/generation-progress/job-uuid-123');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch generation progress');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to fetch generation progress:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should validate job ID parameter presence', async () => {
      const response = await request(app)
        .get('/api/admin/generation-progress/');

      expect(response.status).toBe(404); // Express route not matching
    });
  });

  describe('GET /api/admin/generation-jobs - Active Jobs', () => {
    it('should return all active generation jobs', async () => {
      const response = await request(app)
        .get('/api/admin/generation-jobs');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        { jobId: 'job-1', status: 'completed', totalRecipes: 5, completedRecipes: 5 },
        { jobId: 'job-2', status: 'in_progress', totalRecipes: 10, completedRecipes: 7 }
      ]);

      expect(mockProgressTracker.getAllJobs).toHaveBeenCalled();
    });

    it('should handle empty job list', async () => {
      mockProgressTracker.getAllJobs.mockReturnValue([]);

      const response = await request(app)
        .get('/api/admin/generation-jobs');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should handle progress tracker service errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockProgressTracker.getAllJobs.mockImplementation(() => {
        throw new Error('Job tracking service unavailable');
      });

      const response = await request(app)
        .get('/api/admin/generation-jobs');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch active jobs');

      consoleSpy.mockRestore();
    });
  });

  describe('PATCH /api/admin/recipes/:id/approve - Recipe Approval', () => {
    it('should approve recipe successfully', async () => {
      const response = await request(app)
        .patch('/api/admin/recipes/recipe-uuid-123/approve');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockRecipe);

      expect(mockStorage.updateRecipe).toHaveBeenCalledWith('recipe-uuid-123', { isApproved: true });
    });

    it('should handle approval of non-existent recipe', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockStorage.updateRecipe.mockRejectedValue(new Error('Recipe not found'));

      const response = await request(app)
        .patch('/api/admin/recipes/non-existent/approve');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to approve recipe');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to approve recipe non-existent:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle database constraint errors during approval', async () => {
      mockStorage.updateRecipe.mockRejectedValue(new Error('Database constraint violation'));

      const response = await request(app)
        .patch('/api/admin/recipes/recipe-uuid-123/approve');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to approve recipe');
    });
  });

  describe('PATCH /api/admin/recipes/:id/unapprove - Recipe Unapproval', () => {
    it('should unapprove recipe successfully', async () => {
      const response = await request(app)
        .patch('/api/admin/recipes/recipe-uuid-123/unapprove');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockRecipe);

      expect(mockStorage.updateRecipe).toHaveBeenCalledWith('recipe-uuid-123', { isApproved: false });
    });

    it('should handle unapproval errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockStorage.updateRecipe.mockRejectedValue(new Error('Update operation failed'));

      const response = await request(app)
        .patch('/api/admin/recipes/recipe-uuid-123/unapprove');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to unapprove recipe');

      consoleSpy.mockRestore();
    });
  });

  describe('POST /api/admin/recipes/bulk-approve - Bulk Approval', () => {
    it('should bulk approve all recipes successfully', async () => {
      const recipeIds = [
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        'f47ac10b-58cc-4372-a567-0e02b2c3d480',
        'f47ac10b-58cc-4372-a567-0e02b2c3d481'
      ];

      const response = await request(app)
        .post('/api/admin/recipes/bulk-approve')
        .send({ recipeIds });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('All recipes approved successfully');
      expect(response.body.details).toEqual({
        total: 3,
        succeeded: 3,
        failed: 0
      });

      expect(mockStorage.updateRecipe).toHaveBeenCalledTimes(3);
      recipeIds.forEach(id => {
        expect(mockStorage.updateRecipe).toHaveBeenCalledWith(id, { isApproved: true });
      });
    });

    it('should handle partial failures in bulk approval', async () => {
      const recipeIds = [
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        'f47ac10b-58cc-4372-a567-0e02b2c3d480',
        'f47ac10b-58cc-4372-a567-0e02b2c3d481'
      ];

      mockStorage.updateRecipe
        .mockResolvedValueOnce(mockRecipe)
        .mockRejectedValueOnce(new Error('Recipe locked'))
        .mockResolvedValueOnce(mockRecipe);

      const response = await request(app)
        .post('/api/admin/recipes/bulk-approve')
        .send({ recipeIds });

      expect(response.status).toBe(207); // Partial content
      expect(response.body.message).toContain('Approved 2 recipes, 1 failed');
      expect(response.body.details).toEqual({
        total: 3,
        succeeded: 2,
        failed: 1
      });
    });

    it('should handle complete failure in bulk approval', async () => {
      const recipeIds = [
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        'f47ac10b-58cc-4372-a567-0e02b2c3d480'
      ];

      mockStorage.updateRecipe.mockRejectedValue(new Error('Service unavailable'));

      const response = await request(app)
        .post('/api/admin/recipes/bulk-approve')
        .send({ recipeIds });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to approve any recipes');
      expect(response.body.details).toEqual({
        total: 2,
        succeeded: 0,
        failed: 2
      });
    });

    it('should validate recipe IDs format', async () => {
      const response = await request(app)
        .post('/api/admin/recipes/bulk-approve')
        .send({ recipeIds: ['invalid-uuid-format'] });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.details).toBeDefined();
    });

    it('should handle empty recipe IDs array', async () => {
      const response = await request(app)
        .post('/api/admin/recipes/bulk-approve')
        .send({ recipeIds: [] });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No recipe IDs provided');
    });

    it('should handle large batch approval', async () => {
      const largeRecipeIds = Array.from({ length: 100 }, (_, i) =>
        `f47ac10b-58cc-4372-a567-${String(i).padStart(12, '0')}`
      );

      const response = await request(app)
        .post('/api/admin/recipes/bulk-approve')
        .send({ recipeIds: largeRecipeIds });

      expect(response.status).toBe(200);
      expect(response.body.details.total).toBe(100);
      expect(mockStorage.updateRecipe).toHaveBeenCalledTimes(100);
    });
  });

  describe('POST /api/admin/recipes/bulk-unapprove - Bulk Unapproval', () => {
    it('should bulk unapprove recipes successfully', async () => {
      const ids = [
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        'f47ac10b-58cc-4372-a567-0e02b2c3d480'
      ];

      const response = await request(app)
        .post('/api/admin/recipes/bulk-unapprove')
        .send({ ids });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Successfully unapproved 2 recipes.');

      ids.forEach(id => {
        expect(mockStorage.updateRecipe).toHaveBeenCalledWith(id, { isApproved: false });
      });
    });

    it('should validate IDs array presence', async () => {
      const response = await request(app)
        .post('/api/admin/recipes/bulk-unapprove')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request: "ids" must be a non-empty array.');
    });

    it('should validate IDs array not empty', async () => {
      const response = await request(app)
        .post('/api/admin/recipes/bulk-unapprove')
        .send({ ids: [] });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request: "ids" must be a non-empty array.');
    });

    it('should handle unapproval service errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockStorage.updateRecipe.mockRejectedValue(new Error('Bulk unapproval failed'));

      const response = await request(app)
        .post('/api/admin/recipes/bulk-unapprove')
        .send({ ids: ['f47ac10b-58cc-4372-a567-0e02b2c3d479'] });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to bulk unapprove recipes');

      consoleSpy.mockRestore();
    });
  });

  describe('DELETE /api/admin/recipes/:id - Single Recipe Deletion', () => {
    it('should delete recipe successfully', async () => {
      const response = await request(app)
        .delete('/api/admin/recipes/recipe-uuid-123');

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});

      expect(mockStorage.deleteRecipe).toHaveBeenCalledWith('recipe-uuid-123');
    });

    it('should handle deletion of non-existent recipe', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockStorage.deleteRecipe.mockRejectedValue(new Error('Recipe not found'));

      const response = await request(app)
        .delete('/api/admin/recipes/non-existent');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to delete recipe');

      consoleSpy.mockRestore();
    });

    it('should handle database constraint errors during deletion', async () => {
      mockStorage.deleteRecipe.mockRejectedValue(new Error('Foreign key constraint violation'));

      const response = await request(app)
        .delete('/api/admin/recipes/recipe-uuid-123');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to delete recipe');
    });
  });

  describe('DELETE /api/admin/recipes - Bulk Recipe Deletion', () => {
    it('should bulk delete recipes successfully', async () => {
      const ids = [
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        'f47ac10b-58cc-4372-a567-0e02b2c3d480',
        'f47ac10b-58cc-4372-a567-0e02b2c3d481'
      ];

      const response = await request(app)
        .delete('/api/admin/recipes')
        .send({ ids });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Successfully deleted 3 recipes.');

      expect(mockStorage.bulkDeleteRecipes).toHaveBeenCalledWith(ids);
    });

    it('should validate IDs array in bulk deletion', async () => {
      const response = await request(app)
        .delete('/api/admin/recipes')
        .send({ ids: [] });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request: "ids" must be a non-empty array.');
    });

    it('should handle bulk deletion service errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockStorage.bulkDeleteRecipes.mockRejectedValue(new Error('Bulk deletion failed'));

      const response = await request(app)
        .delete('/api/admin/recipes')
        .send({ ids: ['f47ac10b-58cc-4372-a567-0e02b2c3d479'] });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to bulk delete recipes');

      consoleSpy.mockRestore();
    });

    it('should handle large batch deletion', async () => {
      const largeIds = Array.from({ length: 500 }, (_, i) =>
        `f47ac10b-58cc-4372-a567-${String(i).padStart(12, '0')}`
      );

      const response = await request(app)
        .delete('/api/admin/recipes')
        .send({ ids: largeIds });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Successfully deleted 500 recipes.');
    });
  });

  describe('GET /api/admin/recipes/:id - Single Recipe Retrieval', () => {
    it('should return recipe for admin user', async () => {
      const response = await request(app)
        .get('/api/admin/recipes/recipe-uuid-123');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockRecipe);

      expect(mockStorage.getRecipe).toHaveBeenCalledWith('recipe-uuid-123');
    });

    it('should return 404 for non-existent recipe', async () => {
      mockStorage.getRecipe.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/admin/recipes/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Recipe not found');
    });

    it('should show unapproved recipes to admin users', async () => {
      const unapprovedRecipe = { ...mockRecipe, isApproved: false };
      mockStorage.getRecipe.mockResolvedValue(unapprovedRecipe);

      const response = await request(app)
        .get('/api/admin/recipes/recipe-uuid-123');

      expect(response.status).toBe(200);
      expect(response.body.isApproved).toBe(false);
    });

    it('should hide unapproved recipes from non-admin users', async () => {
      app = createApp(mockCustomer);
      const unapprovedRecipe = { ...mockRecipe, isApproved: false };
      mockStorage.getRecipe.mockResolvedValue(unapprovedRecipe);

      const response = await request(app)
        .get('/api/admin/recipes/recipe-uuid-123');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Recipe not found or not approved');
    });

    it('should show approved recipes to non-admin users', async () => {
      app = createApp(mockCustomer);

      const response = await request(app)
        .get('/api/admin/recipes/recipe-uuid-123');

      expect(response.status).toBe(200);
      expect(response.body.isApproved).toBe(true);
    });

    it('should handle service errors during retrieval', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockStorage.getRecipe.mockRejectedValue(new Error('Database connection lost'));

      const response = await request(app)
        .get('/api/admin/recipes/recipe-uuid-123');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch recipe');

      consoleSpy.mockRestore();
    });
  });

  describe('POST /api/admin/parse-natural-language - Natural Language Processing', () => {
    it('should parse complex natural language input successfully', async () => {
      const complexInput = 'I want a quick vegetarian breakfast with oats and berries that takes less than 20 minutes and has around 350 calories for weight loss';

      const response = await request(app)
        .post('/api/admin/parse-natural-language')
        .send({ naturalLanguageInput: complexInput });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        mealTypes: ['breakfast'],
        dietaryTags: ['vegetarian', 'gluten-free'],
        mainIngredientTags: ['oats', 'berries'],
        maxPrepTime: 20,
        targetCalories: 350,
        description: 'Quick healthy breakfast'
      });

      expect(mockParseNaturalLanguage).toHaveBeenCalledWith(complexInput);
    });

    it('should require naturalLanguageInput parameter', async () => {
      const response = await request(app)
        .post('/api/admin/parse-natural-language')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('naturalLanguageInput is required');
    });

    it('should handle empty string input', async () => {
      const response = await request(app)
        .post('/api/admin/parse-natural-language')
        .send({ naturalLanguageInput: '' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('naturalLanguageInput is required');
    });

    it('should handle parsing service errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockParseNaturalLanguage.mockRejectedValue(new Error('Natural language processing failed'));

      const response = await request(app)
        .post('/api/admin/parse-natural-language')
        .send({ naturalLanguageInput: 'complex input that fails' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to parse natural language input');
      expect(response.body.message).toBe('Natural language processing failed');

      consoleSpy.mockRestore();
    });

    it('should log parsing process for debugging', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const input = 'High protein dinner recipe';

      await request(app)
        .post('/api/admin/parse-natural-language')
        .send({ naturalLanguageInput: input });

      expect(consoleSpy).toHaveBeenCalledWith('[Admin] Parsing natural language input:', input);
      expect(consoleSpy).toHaveBeenCalledWith('[Admin] Parsed data:', expect.any(Object));

      consoleSpy.mockRestore();
    });

    it('should handle unicode and special characters in input', async () => {
      const unicodeInput = 'I want a recipe with café, crème brûlée, and jalapeño 🌶️ for dinner';

      const response = await request(app)
        .post('/api/admin/parse-natural-language')
        .send({ naturalLanguageInput: unicodeInput });

      expect(response.status).toBe(200);
      expect(mockParseNaturalLanguage).toHaveBeenCalledWith(unicodeInput);
    });

    it('should handle very long input strings', async () => {
      const longInput = 'I want a recipe '.repeat(100) + 'for dinner';

      const response = await request(app)
        .post('/api/admin/parse-natural-language')
        .send({ naturalLanguageInput: longInput });

      expect(response.status).toBe(200);
      expect(mockParseNaturalLanguage).toHaveBeenCalledWith(longInput);
    });
  });

  describe('Authorization and Authentication', () => {
    it('should require admin role for admin-only endpoints', async () => {
      app = createApp(mockCustomer);

      const response = await request(app)
        .post('/api/admin/generate')
        .send({ count: 1 });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Admin access required');
    });

    it('should allow trainer access to trainer-or-admin endpoints', async () => {
      app = createApp(mockTrainer);

      const response = await request(app)
        .get('/api/admin/customers');

      expect(response.status).toBe(200);
    });

    it('should require authentication for all endpoints', async () => {
      app = createApp(null); // No user

      const response = await request(app)
        .get('/api/admin/recipes');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should reject customer role for trainer-or-admin endpoints', async () => {
      app = createApp(mockCustomer);

      const response = await request(app)
        .post('/api/admin/assign-recipe')
        .send({
          recipeId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          customerIds: ['a47ac10b-58cc-4372-a567-0e02b2c3d479']
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Trainer or admin access required');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/admin/generate')
        .set('Content-Type', 'application/json')
        .send('{ invalid json structure }');

      expect(response.status).toBe(400);
    });

    it('should handle large JSON payloads within limits', async () => {
      const largePayload = {
        count: 1,
        naturalLanguagePrompt: 'a'.repeat(500000) // 500KB string
      };

      const response = await request(app)
        .post('/api/admin/generate')
        .send(largePayload);

      expect(response.status).toBe(202);
    });

    it('should handle concurrent requests to same endpoint', async () => {
      const requests = Array.from({ length: 10 }, () =>
        request(app)
          .get('/api/admin/stats')
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should handle network timeout scenarios', async () => {
      mockStorage.searchRecipes.mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      const response = await request(app)
        .get('/api/admin/recipes');

      expect(response.status).toBe(400);
    });

    it('should handle database connection failures', async () => {
      mockStorage.getRecipeStats.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/admin/stats');

      expect(response.status).toBe(500);
    });

    it('should handle service dependency failures', async () => {
      mockProgressTracker.createJob.mockImplementation(() => {
        throw new Error('Progress service unavailable');
      });

      const response = await request(app)
        .post('/api/admin/generate')
        .send({ count: 1 });

      expect(response.status).toBe(500);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high-volume bulk operations', async () => {
      const largeRecipeIds = Array.from({ length: 1000 }, (_, i) =>
        `f47ac10b-58cc-4372-a567-${String(i).padStart(12, '0')}`
      );

      const response = await request(app)
        .post('/api/admin/recipes/bulk-approve')
        .send({ recipeIds: largeRecipeIds });

      expect(response.status).toBe(200);
      expect(mockStorage.updateRecipe).toHaveBeenCalledTimes(1000);
    });

    it('should handle memory-intensive operations', async () => {
      const complexMealPlan = {
        ...mockMealPlanData,
        days: 30,
        mealsPerDay: 6,
        meals: Array.from({ length: 180 }, (_, i) => ({
          day: Math.floor(i / 6) + 1,
          mealNumber: (i % 6) + 1,
          mealType: ['Breakfast', 'Snack1', 'Lunch', 'Snack2', 'Dinner', 'Snack3'][i % 6],
          recipe: {
            ...mockMealPlanData.meals[0].recipe,
            id: `recipe-${i}`,
            name: `Complex Recipe ${i + 1}`
          }
        }))
      };

      const response = await request(app)
        .post('/api/admin/assign-meal-plan')
        .send({
          mealPlanData: complexMealPlan,
          customerIds: ['customer-1']
        });

      expect(response.status).toBe(200);
    });

    it('should handle rapid successive requests', async () => {
      const rapidRequests = Array.from({ length: 50 }, () =>
        request(app)
          .get('/api/admin/generation-jobs')
      );

      const responses = await Promise.all(rapidRequests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Data Validation Edge Cases', () => {
    it('should handle extreme numeric values', async () => {
      const response = await request(app)
        .post('/api/admin/generate')
        .send({
          count: Number.MAX_SAFE_INTEGER,
          targetCalories: Number.MAX_SAFE_INTEGER,
          maxCalories: Number.MAX_SAFE_INTEGER
        });

      expect(response.status).toBe(400); // Should exceed maximum count limit
    });

    it('should handle null and undefined in complex objects', async () => {
      const mealPlanWithNulls = {
        ...mockMealPlanData,
        description: null,
        clientName: undefined,
        meals: [
          {
            ...mockMealPlanData.meals[0],
            recipe: {
              ...mockMealPlanData.meals[0].recipe,
              description: null,
              ingredientsJson: null
            }
          }
        ]
      };

      const response = await request(app)
        .post('/api/admin/assign-meal-plan')
        .send({
          mealPlanData: mealPlanWithNulls,
          customerIds: ['customer-1']
        });

      expect(response.status).toBe(400); // Should fail validation
    });

    it('should handle special characters in IDs', async () => {
      const response = await request(app)
        .post('/api/admin/assign-recipe')
        .send({
          recipeId: 'recipe-with-特殊字符',
          customerIds: ['customer-with-émojis-🚀']
        });

      expect(response.status).toBe(400); // Should fail UUID validation
    });

    it('should handle empty arrays and objects', async () => {
      const response = await request(app)
        .post('/api/admin/generate')
        .send({
          count: 1,
          mealTypes: [],
          dietaryRestrictions: [],
          naturalLanguagePrompt: ''
        });

      expect(response.status).toBe(202);
    });
  });

  describe('Security and Input Sanitization', () => {
    it('should handle SQL injection attempts in search', async () => {
      const maliciousSearch = "'; DROP TABLE recipes; --";

      const response = await request(app)
        .get('/api/admin/recipes')
        .query({ search: maliciousSearch });

      expect(response.status).toBe(200); // Should not crash, search should be sanitized
      expect(mockStorage.searchRecipes).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        approved: undefined,
        search: maliciousSearch
      });
    });

    it('should handle XSS attempts in natural language input', async () => {
      const xssInput = '<script>alert("xss")</script>I want chicken recipes';

      const response = await request(app)
        .post('/api/admin/parse-natural-language')
        .send({ naturalLanguageInput: xssInput });

      expect(response.status).toBe(200);
      expect(mockParseNaturalLanguage).toHaveBeenCalledWith(xssInput);
    });

    it('should handle extremely long strings', async () => {
      const veryLongString = 'a'.repeat(1000000); // 1MB string

      const response = await request(app)
        .post('/api/admin/generate')
        .send({
          count: 1,
          naturalLanguagePrompt: veryLongString
        });

      expect(response.status).toBe(413); // Payload too large
    });

    it('should validate UUID format strictly', async () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '123-456-789',
        'f47ac10b-58cc-4372-a567-0e02b2c3d47', // Too short
        'f47ac10b-58cc-4372-a567-0e02b2c3d479a', // Too long
        'g47ac10b-58cc-4372-a567-0e02b2c3d479' // Invalid character
      ];

      for (const invalidUUID of invalidUUIDs) {
        const response = await request(app)
          .post('/api/admin/assign-recipe')
          .send({
            recipeId: invalidUUID,
            customerIds: ['f47ac10b-58cc-4372-a567-0e02b2c3d479']
          });

        expect(response.status).toBe(400);
      }
    });
  });
});