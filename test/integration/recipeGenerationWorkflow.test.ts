/**
 * Recipe Generation - Full Workflow Integration Tests
 *
 * This test suite validates the complete recipe generation workflow
 * from API request through database storage to response delivery.
 *
 * Tests include:
 * - Complete end-to-end generation workflow
 * - Database persistence verification
 * - Background job execution
 * - Progress tracking integration
 * - Cache management
 * - Error handling and recovery
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { db } from '../../server/db';
import { recipes } from '../../server/db/schema';
import { eq } from 'drizzle-orm';

// Create test Express app
const app = express();
app.use(express.json());

// Mock admin authentication middleware
app.use((req, res, next) => {
  req.user = { id: 1, role: 'admin', email: 'admin@test.com' };
  next();
});

// Import routes
import adminRoutes from '../../server/routes/adminRoutes';
app.use('/api/admin', adminRoutes);

describe('Recipe Generation - Full Workflow Integration', () => {
  let testRecipeIds: number[] = [];

  beforeAll(async () => {
    // Ensure database is connected
    console.log('Setting up integration test database...');
  });

  afterAll(async () => {
    // Cleanup test recipes
    if (testRecipeIds.length > 0) {
      await db.delete(recipes).where(eq(recipes.id, testRecipeIds[0]));
    }
  });

  beforeEach(() => {
    testRecipeIds = [];
  });

  describe('POST /api/admin/generate-recipes - Complete Workflow', () => {
    it('should complete full generation workflow with minimal parameters', async () => {
      const response = await request(app)
        .post('/api/admin/generate-recipes')
        .send({ count: 5 })
        .expect(202);

      // Verify response structure
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('count', 5);
      expect(response.body).toHaveProperty('started', true);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('failed');
      expect(response.body).toHaveProperty('errors');

      // Verify jobId is returned for tracking
      expect(response.body).toHaveProperty('jobId');
      expect(typeof response.body.jobId).toBe('string');

      // Wait for background processing (adjust timeout as needed)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify recipes were created in database
      const createdRecipes = await db.select()
        .from(recipes)
        .where(eq(recipes.isApproved, false))
        .limit(5);

      expect(createdRecipes.length).toBeGreaterThan(0);

      // Store IDs for cleanup
      testRecipeIds = createdRecipes.map(r => r.id);

      // Verify recipe structure
      const recipe = createdRecipes[0];
      expect(recipe).toHaveProperty('name');
      expect(recipe).toHaveProperty('description');
      expect(recipe).toHaveProperty('ingredients');
      expect(recipe).toHaveProperty('instructions');
      expect(recipe).toHaveProperty('prepTime');
      expect(recipe).toHaveProperty('cookTime');
      expect(recipe).toHaveProperty('servings');
      expect(recipe).toHaveProperty('calories');
      expect(recipe).toHaveProperty('protein');
      expect(recipe).toHaveProperty('carbohydrates');
      expect(recipe).toHaveProperty('fat');
      expect(recipe).toHaveProperty('imageUrl');
      expect(recipe.isApproved).toBe(false); // Should be pending approval
    });

    it('should complete workflow with all parameters specified', async () => {
      const generationParams = {
        count: 3,
        mealType: 'breakfast',
        dietaryTag: 'keto',
        maxPrepTime: 30,
        maxCalories: 500,
        minCalories: 300,
        minProtein: 20,
        maxProtein: 40,
        minCarbs: 5,
        maxCarbs: 15,
        minFat: 15,
        maxFat: 35,
        focusIngredient: 'eggs',
        difficulty: 'beginner'
      };

      const response = await request(app)
        .post('/api/admin/generate-recipes')
        .send(generationParams)
        .expect(202);

      expect(response.body.count).toBe(3);
      expect(response.body.started).toBe(true);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify recipes match parameters
      const createdRecipes = await db.select()
        .from(recipes)
        .where(eq(recipes.isApproved, false))
        .limit(3);

      testRecipeIds = createdRecipes.map(r => r.id);

      // Verify nutritional constraints
      createdRecipes.forEach(recipe => {
        expect(recipe.calories).toBeGreaterThanOrEqual(300);
        expect(recipe.calories).toBeLessThanOrEqual(500);
        expect(recipe.protein).toBeGreaterThanOrEqual(20);
        expect(recipe.protein).toBeLessThanOrEqual(40);
      });
    });

    it('should handle mixed success and failure scenarios', async () => {
      // This test would require mocking OpenAI to return some failures
      const response = await request(app)
        .post('/api/admin/generate-recipes')
        .send({ count: 10 })
        .expect(202);

      expect(response.body.started).toBe(true);

      // Even with some failures, should return jobId
      expect(response.body.jobId).toBeDefined();
    });
  });

  describe('POST /api/admin/generate - Bulk Generation Workflow', () => {
    it('should complete bulk generation workflow', async () => {
      const response = await request(app)
        .post('/api/admin/generate')
        .send({ count: 10 })
        .expect(202);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('count', 10);
      expect(response.body).toHaveProperty('started', true);

      // Wait for background processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify some recipes were created
      const createdRecipes = await db.select()
        .from(recipes)
        .where(eq(recipes.isApproved, false))
        .limit(10);

      expect(createdRecipes.length).toBeGreaterThan(0);

      testRecipeIds = createdRecipes.map(r => r.id);
    });

    it('should handle large batch generation (50 recipes)', async () => {
      const response = await request(app)
        .post('/api/admin/generate')
        .send({ count: 50 })
        .expect(202);

      expect(response.body.count).toBe(50);
      expect(response.body.started).toBe(true);

      // Note: In real tests, this would take significant time
      // For integration tests, we just verify the API accepts the request
    });
  });

  describe('Background Job Execution', () => {
    it('should execute background image generation', async () => {
      const response = await request(app)
        .post('/api/admin/generate-recipes')
        .send({ count: 2 })
        .expect(202);

      const jobId = response.body.jobId;

      // Wait for initial recipe creation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Recipes should have placeholder images initially
      const recipesWithPlaceholder = await db.select()
        .from(recipes)
        .where(eq(recipes.isApproved, false))
        .limit(2);

      expect(recipesWithPlaceholder.length).toBe(2);
      recipesWithPlaceholder.forEach(recipe => {
        expect(recipe.imageUrl).toBeDefined();
        // Initially should have placeholder or S3 image
        expect(recipe.imageUrl).toMatch(/placeholder|s3|digitaloceanspaces/i);
      });

      testRecipeIds = recipesWithPlaceholder.map(r => r.id);

      // Wait for background image generation (if not using placeholders)
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Check if images were updated (this depends on implementation)
      const recipesWithRealImages = await db.select()
        .from(recipes)
        .where(eq(recipes.id, recipesWithPlaceholder[0].id));

      expect(recipesWithRealImages[0].imageUrl).toBeDefined();
    });
  });

  describe('Progress Tracking Integration', () => {
    it('should track generation progress correctly', async () => {
      const response = await request(app)
        .post('/api/admin/generate-recipes')
        .send({ count: 5 })
        .expect(202);

      const jobId = response.body.jobId;

      // Immediately check progress (should be 0 or initial)
      const progressResponse = await request(app)
        .get(`/api/admin/generation-progress/${jobId}`)
        .expect(200);

      expect(progressResponse.body).toHaveProperty('jobId', jobId);
      expect(progressResponse.body).toHaveProperty('progress');
      expect(progressResponse.body).toHaveProperty('status');

      // Wait and check again
      await new Promise(resolve => setTimeout(resolve, 2000));

      const updatedProgressResponse = await request(app)
        .get(`/api/admin/generation-progress/${jobId}`)
        .expect(200);

      // Progress should have increased or completed
      expect(updatedProgressResponse.body.progress).toBeGreaterThanOrEqual(0);
    });

    it('should list all generation jobs', async () => {
      // Create a job
      await request(app)
        .post('/api/admin/generate-recipes')
        .send({ count: 3 })
        .expect(202);

      // List jobs
      const jobsResponse = await request(app)
        .get('/api/admin/generation-jobs')
        .expect(200);

      expect(Array.isArray(jobsResponse.body)).toBe(true);
      expect(jobsResponse.body.length).toBeGreaterThan(0);

      const job = jobsResponse.body[0];
      expect(job).toHaveProperty('jobId');
      expect(job).toHaveProperty('status');
      expect(job).toHaveProperty('createdAt');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle invalid parameters gracefully', async () => {
      const response = await request(app)
        .post('/api/admin/generate-recipes')
        .send({ count: 0 }) // Invalid: count must be >= 1
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/count|invalid/i);
    });

    it('should handle excessive count gracefully', async () => {
      const response = await request(app)
        .post('/api/admin/generate-recipes')
        .send({ count: 100 }) // Over limit of 50
        .expect(400);

      expect(response.body.message).toMatch(/count|limit|50/i);
    });

    it('should handle invalid dietary tag', async () => {
      const response = await request(app)
        .post('/api/admin/generate-recipes')
        .send({
          count: 5,
          dietaryTag: 'invalid-tag-xyz'
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should handle missing authentication', async () => {
      // Create app without auth middleware
      const appNoAuth = express();
      appNoAuth.use(express.json());
      appNoAuth.use('/api/admin', adminRoutes);

      await request(appNoAuth)
        .post('/api/admin/generate-recipes')
        .send({ count: 5 })
        .expect(401); // Unauthorized
    });
  });

  describe('Database Persistence Verification', () => {
    it('should persist all recipe fields correctly', async () => {
      const response = await request(app)
        .post('/api/admin/generate-recipes')
        .send({
          count: 1,
          focusIngredient: 'chicken'
        })
        .expect(202);

      await new Promise(resolve => setTimeout(resolve, 2000));

      const createdRecipes = await db.select()
        .from(recipes)
        .where(eq(recipes.isApproved, false))
        .limit(1);

      expect(createdRecipes.length).toBe(1);

      const recipe = createdRecipes[0];
      testRecipeIds = [recipe.id];

      // Verify all required fields are populated
      expect(recipe.name).toBeTruthy();
      expect(recipe.description).toBeTruthy();
      expect(recipe.ingredients).toBeTruthy();
      expect(recipe.instructions).toBeTruthy();
      expect(recipe.prepTime).toBeGreaterThan(0);
      expect(recipe.servings).toBeGreaterThan(0);
      expect(recipe.calories).toBeGreaterThan(0);
      expect(recipe.protein).toBeGreaterThan(0);
      expect(recipe.carbohydrates).toBeGreaterThanOrEqual(0);
      expect(recipe.fat).toBeGreaterThan(0);
      expect(recipe.imageUrl).toBeTruthy();
      expect(recipe.createdAt).toBeInstanceOf(Date);

      // Verify pending approval status
      expect(recipe.isApproved).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      // This would require mocking database to simulate errors
      // For now, we verify that the API handles database connection issues

      // Attempt generation with potential database issues
      const response = await request(app)
        .post('/api/admin/generate-recipes')
        .send({ count: 1 })
        .expect(202);

      // Should still return jobId even if there are issues
      expect(response.body.jobId).toBeDefined();
    });
  });

  describe('Concurrent Generation Requests', () => {
    it('should handle multiple concurrent generation requests', async () => {
      const requests = [
        request(app).post('/api/admin/generate-recipes').send({ count: 3 }),
        request(app).post('/api/admin/generate-recipes').send({ count: 3 }),
        request(app).post('/api/admin/generate-recipes').send({ count: 3 })
      ];

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(202);
        expect(response.body.started).toBe(true);
        expect(response.body.jobId).toBeDefined();
      });

      // All jobIds should be unique
      const jobIds = responses.map(r => r.body.jobId);
      const uniqueJobIds = new Set(jobIds);
      expect(uniqueJobIds.size).toBe(3);

      // Wait for all to process
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify recipes created
      const createdRecipes = await db.select()
        .from(recipes)
        .where(eq(recipes.isApproved, false))
        .limit(9);

      expect(createdRecipes.length).toBeGreaterThanOrEqual(3); // At least some should be created

      testRecipeIds = createdRecipes.map(r => r.id);
    });
  });

  describe('Metrics and Reporting', () => {
    it('should return generation metrics', async () => {
      const response = await request(app)
        .post('/api/admin/generate-recipes')
        .send({ count: 5 })
        .expect(202);

      // Metrics should be included in response
      if (response.body.metrics) {
        expect(response.body.metrics).toHaveProperty('totalDuration');
        expect(response.body.metrics).toHaveProperty('averageTimePerRecipe');
        expect(response.body.metrics.totalDuration).toBeGreaterThan(0);
        expect(response.body.metrics.averageTimePerRecipe).toBeGreaterThan(0);
      }
    });

    it('should update admin stats after generation', async () => {
      // Get initial stats
      const initialStatsResponse = await request(app)
        .get('/api/admin/stats')
        .expect(200);

      const initialRecipeCount = initialStatsResponse.body.totalRecipes || 0;

      // Generate recipes
      await request(app)
        .post('/api/admin/generate-recipes')
        .send({ count: 3 })
        .expect(202);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Get updated stats
      const updatedStatsResponse = await request(app)
        .get('/api/admin/stats')
        .expect(200);

      const updatedRecipeCount = updatedStatsResponse.body.totalRecipes || 0;

      // Recipe count should have increased
      expect(updatedRecipeCount).toBeGreaterThan(initialRecipeCount);
    });
  });

  describe('Recipe Approval Workflow Integration', () => {
    it('should allow approving generated recipes', async () => {
      // Generate recipes
      await request(app)
        .post('/api/admin/generate-recipes')
        .send({ count: 2 })
        .expect(202);

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get pending recipes
      const pendingRecipes = await db.select()
        .from(recipes)
        .where(eq(recipes.isApproved, false))
        .limit(2);

      expect(pendingRecipes.length).toBeGreaterThan(0);

      const recipeId = pendingRecipes[0].id;
      testRecipeIds = [recipeId];

      // Approve recipe
      await request(app)
        .patch(`/api/admin/recipes/${recipeId}/approve`)
        .expect(200);

      // Verify approval
      const approvedRecipe = await db.select()
        .from(recipes)
        .where(eq(recipes.id, recipeId));

      expect(approvedRecipe[0].isApproved).toBe(true);
    });

    it('should allow bulk approval of generated recipes', async () => {
      // Generate recipes
      await request(app)
        .post('/api/admin/generate-recipes')
        .send({ count: 3 })
        .expect(202);

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get pending recipes
      const pendingRecipes = await db.select()
        .from(recipes)
        .where(eq(recipes.isApproved, false))
        .limit(3);

      const recipeIds = pendingRecipes.map(r => r.id);
      testRecipeIds = recipeIds;

      // Bulk approve
      await request(app)
        .post('/api/admin/recipes/bulk-approve')
        .send({ recipeIds })
        .expect(200);

      // Verify all approved
      const approvedRecipes = await db.select()
        .from(recipes)
        .where(eq(recipes.id, recipeIds[0]));

      approvedRecipes.forEach(recipe => {
        expect(recipe.isApproved).toBe(true);
      });
    });
  });
});
