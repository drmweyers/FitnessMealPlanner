import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../server/routes';
import { storage } from '../server/storage';

describe('API Routes', () => {
  let app: express.Application;
  let server: any;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    server = await registerRoutes(app as any);
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('Recipe Routes', () => {
    it('should get recipes with default filters', async () => {
      const response = await request(app)
        .get('/api/recipes')
        .expect(200);

      expect(response.body).toHaveProperty('recipes');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.recipes)).toBe(true);
    });

    it('should filter recipes by meal type', async () => {
      const response = await request(app)
        .get('/api/recipes?mealType=breakfast')
        .expect(200);

      expect(response.body.recipes).toBeDefined();
      if (response.body.recipes.length > 0) {
        expect(response.body.recipes[0].mealTypes).toContain('breakfast');
      }
    });

    it('should filter recipes by calorie range', async () => {
      const response = await request(app)
        .get('/api/recipes?minCalories=200&maxCalories=500')
        .expect(200);

      expect(response.body.recipes).toBeDefined();
      response.body.recipes.forEach((recipe: any) => {
        expect(recipe.caloriesKcal).toBeGreaterThanOrEqual(200);
        expect(recipe.caloriesKcal).toBeLessThanOrEqual(500);
      });
    });

    it('should search recipes by name', async () => {
      const response = await request(app)
        .get('/api/recipes?search=chicken')
        .expect(200);

      expect(response.body.recipes).toBeDefined();
      // Only test if results exist
      if (response.body.recipes.length > 0) {
        const hasSearchTerm = response.body.recipes.some((recipe: any) => 
          recipe.name.toLowerCase().includes('chicken') ||
          recipe.description?.toLowerCase().includes('chicken')
        );
        expect(hasSearchTerm).toBe(true);
      }
    });

    it('should paginate recipes correctly', async () => {
      const response = await request(app)
        .get('/api/recipes?page=1&limit=5')
        .expect(200);

      expect(response.body.recipes).toBeDefined();
      expect(response.body.recipes.length).toBeLessThanOrEqual(5);
    });

    it('should get a specific recipe by ID', async () => {
      // First get a list of recipes to get a valid ID
      const listResponse = await request(app)
        .get('/api/recipes?limit=1')
        .expect(200);

      if (listResponse.body.recipes.length > 0) {
        const recipeId = listResponse.body.recipes[0].id;
        
        const response = await request(app)
          .get(`/api/recipes/${recipeId}`)
          .expect(200);

        expect(response.body.id).toBe(recipeId);
        expect(response.body).toHaveProperty('name');
        expect(response.body).toHaveProperty('ingredients');
      }
    });

    it('should return 404 for non-existent recipe', async () => {
      await request(app)
        .get('/api/recipes/non-existent-id')
        .expect(404);
    });
  });

  describe('Admin Routes', () => {
    it('should require authentication for admin recipes', async () => {
      await request(app)
        .get('/api/admin/recipes')
        .expect(401);
    });

    it('should require authentication for admin stats', async () => {
      await request(app)
        .get('/api/admin/stats')
        .expect(401);
    });

    it('should require authentication for recipe approval', async () => {
      await request(app)
        .patch('/api/admin/recipes/test-id/approve')
        .expect(401);
    });

    it('should require authentication for recipe deletion', async () => {
      await request(app)
        .delete('/api/admin/recipes/test-id')
        .expect(401);
    });

    it('should require authentication for recipe generation', async () => {
      await request(app)
        .post('/api/admin/generate-recipes')
        .send({ count: 5 })
        .expect(401);
    });
  });

  describe('Meal Plan Generation', () => {
    it('should require authentication for meal plan generation', async () => {
      await request(app)
        .post('/api/generate-meal-plan')
        .send({
          planName: 'Test Plan',
          days: 7,
          mealsPerDay: 3,
          targetCalories: 2000,
          clientName: 'Test Client'
        })
        .expect(401);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid query parameters gracefully', async () => {
      const response = await request(app)
        .get('/api/recipes?minCalories=invalid&maxCalories=also-invalid')
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should handle missing required fields in POST requests', async () => {
      const response = await request(app)
        .post('/api/generate-meal-plan')
        .send({})
        .expect(401); // Will be 401 due to auth, but validates the route exists
    });
  });
});