import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../server/routes';

describe('Application Integration Tests', () => {
  let app: express.Application;
  let server: any;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    
    // Register all routes
    server = await registerRoutes(app as any);
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('Public Recipe API', () => {
    it('should return approved recipes', async () => {
      const response = await request(app)
        .get('/api/recipes')
        .expect(200);

      expect(response.body).toHaveProperty('recipes');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.recipes)).toBe(true);
      expect(typeof response.body.total).toBe('number');

      // All returned recipes should be approved
      response.body.recipes.forEach((recipe: any) => {
        expect(recipe.isApproved).toBe(true);
        expect(recipe).toHaveProperty('id');
        expect(recipe).toHaveProperty('name');
        expect(recipe).toHaveProperty('caloriesKcal');
        expect(recipe).toHaveProperty('prepTimeMinutes');
        expect(recipe).toHaveProperty('cookTimeMinutes');
      });
    });

    it('should filter recipes by calorie range', async () => {
      const response = await request(app)
        .get('/api/recipes?minCalories=200&maxCalories=500')
        .expect(200);

      response.body.recipes.forEach((recipe: any) => {
        expect(recipe.caloriesKcal).toBeGreaterThanOrEqual(200);
        expect(recipe.caloriesKcal).toBeLessThanOrEqual(500);
      });
    });

    it('should filter recipes by prep time', async () => {
      const response = await request(app)
        .get('/api/recipes?maxPrepTime=30')
        .expect(200);

      response.body.recipes.forEach((recipe: any) => {
        expect(recipe.prepTimeMinutes).toBeLessThanOrEqual(30);
      });
    });

    it('should paginate results correctly', async () => {
      const response = await request(app)
        .get('/api/recipes?page=1&limit=5')
        .expect(200);

      expect(response.body.recipes.length).toBeLessThanOrEqual(5);
    });

    it('should search recipes by name', async () => {
      const response = await request(app)
        .get('/api/recipes?search=chicken')
        .expect(200);

      if (response.body.recipes.length > 0) {
        const hasSearchTerm = response.body.recipes.some((recipe: any) => 
          recipe.name.toLowerCase().includes('chicken') ||
          recipe.description?.toLowerCase().includes('chicken')
        );
        expect(hasSearchTerm).toBe(true);
      }
    });

    it('should get individual recipe by ID', async () => {
      // First get a list to get a valid ID
      const listResponse = await request(app)
        .get('/api/recipes?limit=1')
        .expect(200);

      if (listResponse.body.recipes.length > 0) {
        const recipeId = listResponse.body.recipes[0].id;
        
        const response = await request(app)
          .get(`/api/recipes/${recipeId}`)
          .expect(200);

        expect(response.body.id).toBe(recipeId);
        expect(response.body.isApproved).toBe(true);
      }
    });

    it('should return 404 for non-existent recipe', async () => {
      await request(app)
        .get('/api/recipes/non-existent-id')
        .expect(404);
    });
  });

  describe('Authentication Requirements', () => {
    it('should require auth for admin recipes endpoint', async () => {
      await request(app)
        .get('/api/admin/recipes')
        .expect(401);
    });

    it('should require auth for admin stats', async () => {
      await request(app)
        .get('/api/admin/stats')
        .expect(401);
    });

    it('should require auth for recipe approval', async () => {
      await request(app)
        .patch('/api/admin/recipes/test-id/approve')
        .expect(401);
    });

    it('should require auth for recipe deletion', async () => {
      await request(app)
        .delete('/api/admin/recipes/test-id')
        .expect(401);
    });

    it('should require auth for meal plan generation', async () => {
      await request(app)
        .post('/api/generate-meal-plan')
        .send({
          planName: 'Test Plan',
          fitnessGoal: 'weight-loss',
          dailyCalorieTarget: 2000,
          days: 7,
          mealsPerDay: 3,
          clientName: 'Test Client'
        })
        .expect(401);
    });

    it('should require auth for recipe generation', async () => {
      await request(app)
        .post('/api/admin/generate-recipes')
        .send({ count: 5 })
        .expect(401);
    });
  });

  describe('Data Validation', () => {
    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/recipes?minCalories=invalid&maxCalories=also-invalid')
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should handle negative calorie values', async () => {
      const response = await request(app)
        .get('/api/recipes?minCalories=-100')
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should handle invalid page numbers', async () => {
      const response = await request(app)
        .get('/api/recipes?page=0')
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Response Structure', () => {
    it('should return properly structured recipe data', async () => {
      const response = await request(app)
        .get('/api/recipes?limit=1')
        .expect(200);

      if (response.body.recipes.length > 0) {
        const recipe = response.body.recipes[0];
        
        // Check required fields
        expect(recipe).toHaveProperty('id');
        expect(recipe).toHaveProperty('name');
        expect(recipe).toHaveProperty('caloriesKcal');
        expect(recipe).toHaveProperty('proteinGrams');
        expect(recipe).toHaveProperty('carbsGrams');
        expect(recipe).toHaveProperty('fatGrams');
        expect(recipe).toHaveProperty('prepTimeMinutes');
        expect(recipe).toHaveProperty('cookTimeMinutes');
        expect(recipe).toHaveProperty('servings');
        expect(recipe).toHaveProperty('ingredientsJson');
        expect(recipe).toHaveProperty('instructionsText');
        expect(recipe).toHaveProperty('mealTypes');
        expect(recipe).toHaveProperty('dietaryTags');
        expect(recipe).toHaveProperty('isApproved');

        // Validate data types
        expect(typeof recipe.id).toBe('string');
        expect(typeof recipe.name).toBe('string');
        expect(typeof recipe.caloriesKcal).toBe('number');
        expect(typeof recipe.prepTimeMinutes).toBe('number');
        expect(typeof recipe.cookTimeMinutes).toBe('number');
        expect(typeof recipe.servings).toBe('number');
        expect(Array.isArray(recipe.ingredientsJson)).toBe(true);
        expect(Array.isArray(recipe.mealTypes)).toBe(true);
        expect(Array.isArray(recipe.dietaryTags)).toBe(true);
        expect(typeof recipe.isApproved).toBe('boolean');
      }
    });

    it('should return consistent pagination metadata', async () => {
      const response = await request(app)
        .get('/api/recipes')
        .expect(200);

      expect(response.body).toHaveProperty('recipes');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.recipes)).toBe(true);
      expect(typeof response.body.total).toBe('number');
      expect(response.body.total).toBeGreaterThanOrEqual(response.body.recipes.length);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/generate-meal-plan')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
    });

    it('should handle very large limit values', async () => {
      const response = await request(app)
        .get('/api/recipes?limit=999999')
        .expect(200);

      // Should cap the limit internally
      expect(response.body.recipes.length).toBeLessThanOrEqual(100);
    });

    it('should handle empty search terms', async () => {
      const response = await request(app)
        .get('/api/recipes?search=')
        .expect(200);

      expect(response.body).toHaveProperty('recipes');
    });
  });

  describe('Performance and Load', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, () => 
        request(app).get('/api/recipes?limit=5')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('recipes');
      });
    });

    it('should respond within reasonable time', async () => {
      const start = Date.now();
      
      await request(app)
        .get('/api/recipes')
        .expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000); // 5 seconds max
    });
  });
});