/**
 * Comprehensive Integration Tests for Recipe Workflow
 * 
 * Tests the complete recipe lifecycle including:
 * - Recipe generation workflow
 * - Recipe approval process
 * - Recipe search and discovery
 * - Recipe assignment to meal plans
 * - Recipe image generation and storage
 * - Progress tracking and notifications
 * - Database consistency
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { db } from '../../server/db';
import { storage } from '../../server/storage';
import { recipeGenerator } from '../../server/services/recipeGenerator';
import { progressTracker } from '../../server/services/progressTracker';
import { recipeSearchService } from '../../server/services/recipeSearchService';
import { recipes, users, mealPlanRecipes } from '@shared/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import type { GeneratedRecipe, InsertRecipe } from '@shared/schema';

// Mock external dependencies while preserving database operations
vi.mock('../../server/services/openai', () => ({
  generateRecipeBatch: vi.fn(),
  generateImageForRecipe: vi.fn()
}));

vi.mock('../../server/services/utils/S3Uploader', () => ({
  uploadImageToS3: vi.fn()
}));

// Import mocked functions
import { generateRecipeBatch, generateImageForRecipe } from '../../server/services/openai';
import { uploadImageToS3 } from '../../server/services/utils/S3Uploader';

describe('Recipe Workflow Integration Tests', () => {
  let testUserId: string;
  let testAdminId: string;
  const cleanupRecipeIds: string[] = [];
  const cleanupUserIds: string[] = [];

  const mockGeneratedRecipe: GeneratedRecipe = {
    name: 'Integration Test Protein Pancakes',
    description: 'High-protein pancakes for integration testing',
    mealTypes: ['breakfast'],
    dietaryTags: ['high-protein', 'gluten-free'],
    mainIngredientTags: ['eggs', 'oats'],
    ingredients: [
      { name: 'eggs', amount: '3', unit: 'pieces' },
      { name: 'oats', amount: '1', unit: 'cup' },
      { name: 'banana', amount: '1', unit: 'piece' },
      { name: 'protein powder', amount: '1', unit: 'scoop' }
    ],
    instructions: 'Mix all dry ingredients. Whisk eggs and add wet ingredients. Cook pancakes in non-stick pan.',
    prepTimeMinutes: 10,
    cookTimeMinutes: 15,
    servings: 2,
    estimatedNutrition: {
      calories: 450,
      protein: 35.5,
      carbs: 28.0,
      fat: 12.5
    },
    imageUrl: 'https://example.com/test-pancakes.jpg'
  };

  beforeAll(async () => {
    // Setup test users
    try {
      const testUsers = await db.insert(users).values([
        {
          email: 'test-customer@integration.com',
          password: 'hashedpassword',
          role: 'customer',
          name: 'Test Customer',
          isActive: true
        },
        {
          email: 'test-admin@integration.com',
          password: 'hashedpassword',
          role: 'admin',
          name: 'Test Admin',
          isActive: true
        }
      ]).returning();

      testUserId = testUsers[0].id;
      testAdminId = testUsers[1].id;
      cleanupUserIds.push(testUserId, testAdminId);
    } catch (error) {
      console.error('Failed to setup test users:', error);
      throw error;
    }

    // Setup mocks with default successful responses
    vi.mocked(generateRecipeBatch).mockResolvedValue([mockGeneratedRecipe]);
    vi.mocked(generateImageForRecipe).mockResolvedValue('https://temp-image-url.com/temp.jpg');
    vi.mocked(uploadImageToS3).mockResolvedValue('https://s3.amazonaws.com/permanent-image.jpg');
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      if (cleanupRecipeIds.length > 0) {
        await db.delete(recipes).where(
          sql`${recipes.id} = ANY(${cleanupRecipeIds})`
        );
      }

      if (cleanupUserIds.length > 0) {
        await db.delete(users).where(
          sql`${users.id} = ANY(${cleanupUserIds})`
        );
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks to default successful responses
    vi.mocked(generateRecipeBatch).mockResolvedValue([mockGeneratedRecipe]);
    vi.mocked(generateImageForRecipe).mockResolvedValue('https://temp-image-url.com/temp.jpg');
    vi.mocked(uploadImageToS3).mockResolvedValue('https://s3.amazonaws.com/permanent-image.jpg');
  });

  describe('Complete Recipe Generation Workflow', () => {
    it('should successfully generate, validate, and store a recipe', async () => {
      const startTime = Date.now();

      // 1. Generate recipe
      const generationOptions = {
        count: 1,
        mealTypes: ['breakfast'],
        dietaryRestrictions: ['high-protein'],
        targetCalories: 450,
        jobId: `integration-test-${Date.now()}`
      };

      const result = await recipeGenerator.generateAndStoreRecipes(generationOptions);

      // 2. Verify generation results
      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.metrics).toBeDefined();
      expect(result.metrics!.totalDuration).toBeGreaterThan(0);

      // 3. Verify recipe was stored in database
      const storedRecipes = await db.select()
        .from(recipes)
        .where(eq(recipes.name, mockGeneratedRecipe.name))
        .orderBy(desc(recipes.createdAt))
        .limit(1);

      expect(storedRecipes).toHaveLength(1);
      
      const storedRecipe = storedRecipes[0];
      cleanupRecipeIds.push(storedRecipe.id);

      // 4. Verify recipe data integrity
      expect(storedRecipe.name).toBe(mockGeneratedRecipe.name);
      expect(storedRecipe.description).toBe(mockGeneratedRecipe.description);
      expect(storedRecipe.mealTypes).toEqual(mockGeneratedRecipe.mealTypes);
      expect(storedRecipe.dietaryTags).toEqual(mockGeneratedRecipe.dietaryTags);
      expect(storedRecipe.caloriesKcal).toBe(mockGeneratedRecipe.estimatedNutrition.calories);
      expect(parseFloat(storedRecipe.proteinGrams)).toBe(mockGeneratedRecipe.estimatedNutrition.protein);
      expect(storedRecipe.isApproved).toBe(true); // Should auto-approve
      expect(storedRecipe.sourceReference).toBe('AI Generated');

      // 5. Verify ingredients structure
      expect(storedRecipe.ingredientsJson).toHaveLength(mockGeneratedRecipe.ingredients.length);
      expect(storedRecipe.ingredientsJson[0]).toEqual({
        name: 'eggs',
        amount: '3',
        unit: 'pieces'
      });

      // 6. Verify service interactions
      expect(generateRecipeBatch).toHaveBeenCalledWith(1, expect.objectContaining({
        mealTypes: ['breakfast'],
        dietaryRestrictions: ['high-protein'],
        targetCalories: 450
      }));
      expect(generateImageForRecipe).toHaveBeenCalledWith(mockGeneratedRecipe);
      expect(uploadImageToS3).toHaveBeenCalledWith(
        'https://temp-image-url.com/temp.jpg',
        mockGeneratedRecipe.name
      );
    });

    it('should handle recipe generation with progress tracking', async () => {
      const jobId = `progress-test-${Date.now()}`;
      
      const generationOptions = {
        count: 2,
        mealTypes: ['lunch', 'dinner'],
        jobId
      };

      // Mock multiple recipes
      const mockRecipe2 = { ...mockGeneratedRecipe, name: 'Integration Test Salad' };
      vi.mocked(generateRecipeBatch).mockResolvedValue([mockGeneratedRecipe, mockRecipe2]);

      // Start generation
      const resultPromise = recipeGenerator.generateAndStoreRecipes(generationOptions);

      // Check progress tracking
      const progressStatus = progressTracker.getJobStatus(jobId);
      expect(progressStatus).toBeDefined();

      // Wait for completion
      const result = await resultPromise;

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);

      // Verify both recipes were stored
      const storedRecipes = await db.select()
        .from(recipes)
        .where(sql`${recipes.name} IN (${mockGeneratedRecipe.name}, ${mockRecipe2.name})`)
        .orderBy(desc(recipes.createdAt));

      expect(storedRecipes).toHaveLength(2);
      cleanupRecipeIds.push(...storedRecipes.map(r => r.id));

      // Verify progress completion
      const finalStatus = progressTracker.getJobStatus(jobId);
      expect(finalStatus?.status).toBe('complete');
    });

    it('should handle recipe generation failures gracefully', async () => {
      // Mock OpenAI failure
      vi.mocked(generateRecipeBatch).mockRejectedValue(new Error('OpenAI API rate limit exceeded'));

      const generationOptions = {
        count: 1,
        mealTypes: ['breakfast'],
        jobId: `failure-test-${Date.now()}`
      };

      const result = await recipeGenerator.generateAndStoreRecipes(generationOptions);

      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('OpenAI API rate limit exceeded');

      // Verify no recipes were stored
      const storedRecipes = await db.select()
        .from(recipes)
        .where(eq(recipes.name, mockGeneratedRecipe.name))
        .orderBy(desc(recipes.createdAt))
        .limit(1);

      expect(storedRecipes).toHaveLength(0);
    });
  });

  describe('Recipe Search and Discovery Workflow', () => {
    let testRecipeId: string;

    beforeEach(async () => {
      // Create a test recipe for search tests
      const testRecipeData: InsertRecipe = {
        name: 'Integration Test Search Recipe',
        description: 'A recipe specifically for search testing',
        mealTypes: ['dinner'],
        dietaryTags: ['vegetarian', 'high-protein'],
        mainIngredientTags: ['quinoa', 'vegetables'],
        ingredientsJson: [
          { name: 'quinoa', amount: '1', unit: 'cup' },
          { name: 'vegetables', amount: '2', unit: 'cups' }
        ],
        instructionsText: 'Cook quinoa, add vegetables',
        prepTimeMinutes: 15,
        cookTimeMinutes: 20,
        servings: 4,
        caloriesKcal: 300,
        proteinGrams: '12.0',
        carbsGrams: '45.0',
        fatGrams: '8.0',
        imageUrl: 'https://example.com/search-test.jpg',
        sourceReference: 'Integration Test',
        isApproved: true
      };

      const insertedRecipe = await storage.createRecipe(testRecipeData);
      testRecipeId = insertedRecipe.id;
      cleanupRecipeIds.push(testRecipeId);
    });

    it('should find recipes through comprehensive search', async () => {
      // Test text search
      const textSearchResults = await recipeSearchService.searchRecipes({
        search: 'Integration Test Search',
        page: 1,
        limit: 10
      });

      expect(textSearchResults.recipes).toHaveLength(1);
      expect(textSearchResults.recipes[0].name).toBe('Integration Test Search Recipe');
      expect(textSearchResults.total).toBe(1);

      // Test meal type filter
      const mealTypeResults = await recipeSearchService.searchRecipes({
        mealTypes: ['dinner'],
        page: 1,
        limit: 10
      });

      expect(mealTypeResults.recipes.length).toBeGreaterThanOrEqual(1);
      expect(mealTypeResults.recipes.some(r => r.id === testRecipeId)).toBe(true);

      // Test dietary tags filter
      const dietaryResults = await recipeSearchService.searchRecipes({
        dietaryTags: ['vegetarian'],
        page: 1,
        limit: 10
      });

      expect(dietaryResults.recipes.length).toBeGreaterThanOrEqual(1);
      expect(dietaryResults.recipes.some(r => r.id === testRecipeId)).toBe(true);

      // Test nutrition range filter
      const nutritionResults = await recipeSearchService.searchRecipes({
        calories: { min: 250, max: 350 },
        protein: { min: 10, max: 15 },
        page: 1,
        limit: 10
      });

      expect(nutritionResults.recipes.length).toBeGreaterThanOrEqual(1);
      expect(nutritionResults.recipes.some(r => r.id === testRecipeId)).toBe(true);

      // Test combined filters
      const combinedResults = await recipeSearchService.searchRecipes({
        search: 'quinoa',
        mealTypes: ['dinner'],
        dietaryTags: ['vegetarian'],
        calories: { min: 200, max: 400 },
        page: 1,
        limit: 10
      });

      expect(combinedResults.recipes.length).toBeGreaterThanOrEqual(1);
      expect(combinedResults.recipes.some(r => r.id === testRecipeId)).toBe(true);
    });

    it('should handle search pagination correctly', async () => {
      // Test first page
      const firstPageResults = await recipeSearchService.searchRecipes({
        mealTypes: ['dinner'],
        page: 1,
        limit: 1
      });

      expect(firstPageResults.recipes).toHaveLength(1);
      expect(firstPageResults.total).toBeGreaterThanOrEqual(1);

      if (firstPageResults.total > 1) {
        // Test second page if there are more results
        const secondPageResults = await recipeSearchService.searchRecipes({
          mealTypes: ['dinner'],
          page: 2,
          limit: 1
        });

        expect(secondPageResults.recipes).toHaveLength(1);
        expect(secondPageResults.recipes[0].id).not.toBe(firstPageResults.recipes[0].id);
      }
    });

    it('should provide search metadata', async () => {
      const metadata = await recipeSearchService.getSearchMetadata();

      expect(metadata).toBeDefined();
      expect(metadata.availableMealTypes).toBeDefined();
      expect(metadata.availableDietaryTags).toBeDefined();
      expect(metadata.nutritionRanges).toBeDefined();

      expect(metadata.availableMealTypes).toContain('dinner');
      expect(metadata.availableDietaryTags).toContain('vegetarian');
      expect(metadata.nutritionRanges.calories).toBeDefined();
      expect(metadata.nutritionRanges.protein).toBeDefined();
    });

    it('should provide search statistics', async () => {
      const statistics = await recipeSearchService.getSearchStatistics();

      expect(statistics).toBeDefined();
      expect(statistics.totalRecipes).toBeGreaterThan(0);
      expect(statistics.approvedRecipes).toBeGreaterThan(0);
      expect(statistics.approvedRecipes).toBeLessThanOrEqual(statistics.totalRecipes);

      if (statistics.averageRating) {
        expect(statistics.averageRating).toBeGreaterThan(0);
        expect(statistics.averageRating).toBeLessThanOrEqual(5);
      }
    });
  });

  describe('Recipe Approval Workflow', () => {
    it('should handle recipe approval state changes', async () => {
      // Create unapproved recipe
      const unapprovedRecipeData: InsertRecipe = {
        name: 'Integration Test Unapproved Recipe',
        description: 'A recipe that starts unapproved',
        mealTypes: ['snack'],
        dietaryTags: ['healthy'],
        mainIngredientTags: ['fruits'],
        ingredientsJson: [
          { name: 'apple', amount: '1', unit: 'piece' }
        ],
        instructionsText: 'Eat the apple',
        prepTimeMinutes: 1,
        cookTimeMinutes: 0,
        servings: 1,
        caloriesKcal: 80,
        proteinGrams: '0.3',
        carbsGrams: '21.0',
        fatGrams: '0.2',
        imageUrl: 'https://example.com/apple.jpg',
        sourceReference: 'Manual Entry',
        isApproved: false
      };

      const insertedRecipe = await storage.createRecipe(unapprovedRecipeData);
      cleanupRecipeIds.push(insertedRecipe.id);

      // Verify recipe is initially unapproved
      expect(insertedRecipe.isApproved).toBe(false);

      // Approve the recipe
      const updatedRecipe = await storage.updateRecipe(insertedRecipe.id, {
        isApproved: true
      });

      expect(updatedRecipe.isApproved).toBe(true);

      // Verify only approved recipes appear in public search
      const publicSearchResults = await storage.searchRecipes({
        search: 'Integration Test Unapproved Recipe',
        approved: true,
        page: 1,
        limit: 10
      });

      expect(publicSearchResults.recipes).toHaveLength(1);
      expect(publicSearchResults.recipes[0].id).toBe(insertedRecipe.id);

      // Verify admin can see all recipes (approved and unapproved)
      const adminSearchResults = await storage.searchRecipes({
        search: 'Integration Test Unapproved Recipe',
        page: 1,
        limit: 10
        // No approved filter - should include all recipes
      });

      expect(adminSearchResults.recipes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Recipe Data Integrity and Validation', () => {
    it('should maintain data consistency across operations', async () => {
      // Generate recipe with complex data
      const complexRecipe = {
        ...mockGeneratedRecipe,
        name: 'Complex Integration Recipe',
        ingredients: [
          { name: 'chicken breast', amount: '200', unit: 'grams' },
          { name: 'olive oil', amount: '2', unit: 'tablespoons' },
          { name: 'garlic', amount: '3', unit: 'cloves' },
          { name: 'herbs', amount: '1', unit: 'teaspoon' }
        ],
        mealTypes: ['lunch', 'dinner'],
        dietaryTags: ['high-protein', 'keto', 'gluten-free'],
        mainIngredientTags: ['chicken', 'herbs'],
        estimatedNutrition: {
          calories: 350,
          protein: 45.2,
          carbs: 2.1,
          fat: 18.7
        }
      };

      vi.mocked(generateRecipeBatch).mockResolvedValue([complexRecipe]);

      const result = await recipeGenerator.generateAndStoreRecipes({
        count: 1,
        mealTypes: ['lunch', 'dinner'],
        dietaryRestrictions: ['high-protein', 'keto']
      });

      expect(result.success).toBe(1);

      // Retrieve and verify stored recipe
      const storedRecipes = await db.select()
        .from(recipes)
        .where(eq(recipes.name, complexRecipe.name))
        .limit(1);

      expect(storedRecipes).toHaveLength(1);
      const storedRecipe = storedRecipes[0];
      cleanupRecipeIds.push(storedRecipe.id);

      // Verify all data fields are correctly stored and typed
      expect(storedRecipe.name).toBe(complexRecipe.name);
      expect(storedRecipe.mealTypes).toEqual(complexRecipe.mealTypes);
      expect(storedRecipe.dietaryTags).toEqual(complexRecipe.dietaryTags);
      expect(storedRecipe.mainIngredientTags).toEqual(complexRecipe.mainIngredientTags);
      expect(storedRecipe.ingredientsJson).toEqual(complexRecipe.ingredients);
      expect(storedRecipe.caloriesKcal).toBe(complexRecipe.estimatedNutrition.calories);
      expect(parseFloat(storedRecipe.proteinGrams)).toBeCloseTo(complexRecipe.estimatedNutrition.protein, 1);
      expect(parseFloat(storedRecipe.carbsGrams)).toBeCloseTo(complexRecipe.estimatedNutrition.carbs, 1);
      expect(parseFloat(storedRecipe.fatGrams)).toBeCloseTo(complexRecipe.estimatedNutrition.fat, 1);

      // Verify database constraints are enforced
      expect(storedRecipe.prepTimeMinutes).toBeGreaterThanOrEqual(0);
      expect(storedRecipe.cookTimeMinutes).toBeGreaterThanOrEqual(0);
      expect(storedRecipe.servings).toBeGreaterThan(0);
      expect(storedRecipe.caloriesKcal).toBeGreaterThan(0);
      expect(parseFloat(storedRecipe.proteinGrams)).toBeGreaterThanOrEqual(0);
      expect(parseFloat(storedRecipe.carbsGrams)).toBeGreaterThanOrEqual(0);
      expect(parseFloat(storedRecipe.fatGrams)).toBeGreaterThanOrEqual(0);
    });

    it('should handle recipe updates and maintain consistency', async () => {
      // Create initial recipe
      const initialRecipeData: InsertRecipe = {
        name: 'Integration Test Update Recipe',
        description: 'Original description',
        mealTypes: ['breakfast'],
        dietaryTags: ['vegetarian'],
        mainIngredientTags: ['oats'],
        ingredientsJson: [
          { name: 'oats', amount: '1', unit: 'cup' }
        ],
        instructionsText: 'Cook oats',
        prepTimeMinutes: 5,
        cookTimeMinutes: 10,
        servings: 1,
        caloriesKcal: 150,
        proteinGrams: '5.0',
        carbsGrams: '30.0',
        fatGrams: '3.0',
        imageUrl: 'https://example.com/oats.jpg',
        sourceReference: 'Manual Entry',
        isApproved: false
      };

      const initialRecipe = await storage.createRecipe(initialRecipeData);
      cleanupRecipeIds.push(initialRecipe.id);

      // Update recipe
      const updatedRecipe = await storage.updateRecipe(initialRecipe.id, {
        description: 'Updated description',
        mealTypes: ['breakfast', 'snack'],
        dietaryTags: ['vegetarian', 'high-fiber'],
        caloriesKcal: 200,
        isApproved: true
      });

      // Verify updates were applied correctly
      expect(updatedRecipe.description).toBe('Updated description');
      expect(updatedRecipe.mealTypes).toEqual(['breakfast', 'snack']);
      expect(updatedRecipe.dietaryTags).toEqual(['vegetarian', 'high-fiber']);
      expect(updatedRecipe.caloriesKcal).toBe(200);
      expect(updatedRecipe.isApproved).toBe(true);

      // Verify unchanged fields remained the same
      expect(updatedRecipe.name).toBe(initialRecipe.name);
      expect(updatedRecipe.ingredientsJson).toEqual(initialRecipe.ingredientsJson);
      expect(updatedRecipe.prepTimeMinutes).toBe(initialRecipe.prepTimeMinutes);
      expect(updatedRecipe.cookTimeMinutes).toBe(initialRecipe.cookTimeMinutes);
      expect(updatedRecipe.servings).toBe(initialRecipe.servings);

      // Verify database consistency
      const retrievedRecipe = await storage.getRecipe(initialRecipe.id);
      expect(retrievedRecipe).toEqual(updatedRecipe);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle partial batch failures correctly', async () => {
      const validRecipe = { ...mockGeneratedRecipe, name: 'Valid Recipe' };
      const invalidRecipe = { ...mockGeneratedRecipe, name: '', ingredients: [] }; // Invalid

      vi.mocked(generateRecipeBatch).mockResolvedValue([validRecipe, invalidRecipe]);

      const result = await recipeGenerator.generateAndStoreRecipes({
        count: 2,
        mealTypes: ['breakfast']
      });

      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);

      // Verify only valid recipe was stored
      const storedRecipes = await db.select()
        .from(recipes)
        .where(eq(recipes.name, validRecipe.name))
        .limit(1);

      expect(storedRecipes).toHaveLength(1);
      cleanupRecipeIds.push(storedRecipes[0].id);
    });

    it('should handle database transaction failures', async () => {
      // Mock a database error during recipe creation
      const originalCreateRecipe = storage.createRecipe;
      const mockCreateRecipe = vi.fn().mockRejectedValue(new Error('Database transaction failed'));
      storage.createRecipe = mockCreateRecipe;

      try {
        const result = await recipeGenerator.generateAndStoreRecipes({
          count: 1,
          mealTypes: ['breakfast']
        });

        expect(result.success).toBe(0);
        expect(result.failed).toBe(1);
        expect(result.errors[0]).toContain('Database transaction failed');

        // Verify no orphaned data was created
        const storedRecipes = await db.select()
          .from(recipes)
          .where(eq(recipes.name, mockGeneratedRecipe.name));

        expect(storedRecipes).toHaveLength(0);
      } finally {
        // Restore original function
        storage.createRecipe = originalCreateRecipe;
      }
    });

    it('should handle image generation failures gracefully', async () => {
      // Mock image generation failure
      vi.mocked(generateImageForRecipe).mockRejectedValue(new Error('Image generation failed'));

      const result = await recipeGenerator.generateAndStoreRecipes({
        count: 1,
        mealTypes: ['breakfast']
      });

      // Should still succeed with fallback image
      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);

      // Verify recipe was stored with fallback image
      const storedRecipes = await db.select()
        .from(recipes)
        .where(eq(recipes.name, mockGeneratedRecipe.name))
        .limit(1);

      expect(storedRecipes).toHaveLength(1);
      cleanupRecipeIds.push(storedRecipes[0].id);

      const storedRecipe = storedRecipes[0];
      expect(storedRecipe.imageUrl).toBe('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent recipe generation', async () => {
      const recipe1 = { ...mockGeneratedRecipe, name: 'Concurrent Recipe 1' };
      const recipe2 = { ...mockGeneratedRecipe, name: 'Concurrent Recipe 2' };
      const recipe3 = { ...mockGeneratedRecipe, name: 'Concurrent Recipe 3' };

      // Mock batch returns different recipes for each call
      vi.mocked(generateRecipeBatch)
        .mockResolvedValueOnce([recipe1])
        .mockResolvedValueOnce([recipe2])
        .mockResolvedValueOnce([recipe3]);

      // Start multiple generation tasks concurrently
      const results = await Promise.all([
        recipeGenerator.generateAndStoreRecipes({
          count: 1,
          mealTypes: ['breakfast'],
          jobId: 'concurrent-1'
        }),
        recipeGenerator.generateAndStoreRecipes({
          count: 1,
          mealTypes: ['lunch'],
          jobId: 'concurrent-2'
        }),
        recipeGenerator.generateAndStoreRecipes({
          count: 1,
          mealTypes: ['dinner'],
          jobId: 'concurrent-3'
        })
      ]);

      // Verify all succeeded
      results.forEach(result => {
        expect(result.success).toBe(1);
        expect(result.failed).toBe(0);
      });

      // Verify all recipes were stored
      const storedRecipes = await db.select()
        .from(recipes)
        .where(sql`${recipes.name} IN (${recipe1.name}, ${recipe2.name}, ${recipe3.name})`)
        .orderBy(desc(recipes.createdAt));

      expect(storedRecipes).toHaveLength(3);
      cleanupRecipeIds.push(...storedRecipes.map(r => r.id));

      // Verify data integrity for each recipe
      storedRecipes.forEach(recipe => {
        expect(recipe.name).toMatch(/^Concurrent Recipe [1-3]$/);
        expect(recipe.isApproved).toBe(true);
        expect(recipe.sourceReference).toBe('AI Generated');
      });
    });

    it('should handle large batch generation efficiently', async () => {
      const batchSize = 5;
      const mockRecipes = Array.from({ length: batchSize }, (_, i) => ({
        ...mockGeneratedRecipe,
        name: `Batch Recipe ${i + 1}`
      }));

      vi.mocked(generateRecipeBatch).mockResolvedValue(mockRecipes);

      const startTime = Date.now();
      const result = await recipeGenerator.generateAndStoreRecipes({
        count: batchSize,
        mealTypes: ['lunch'],
        jobId: 'batch-test'
      });
      const endTime = Date.now();

      expect(result.success).toBe(batchSize);
      expect(result.failed).toBe(0);
      expect(result.metrics?.totalDuration).toBeLessThan(endTime - startTime + 100); // Allow small margin

      // Verify all recipes were stored
      const storedRecipes = await db.select()
        .from(recipes)
        .where(sql`${recipes.name} LIKE 'Batch Recipe %'`)
        .orderBy(recipes.name);

      expect(storedRecipes).toHaveLength(batchSize);
      cleanupRecipeIds.push(...storedRecipes.map(r => r.id));

      // Verify performance metrics
      expect(result.metrics?.averageTimePerRecipe).toBeGreaterThan(0);
      expect(result.metrics?.averageTimePerRecipe).toBeLessThan(10000); // Should be under 10 seconds per recipe
    });
  });
});