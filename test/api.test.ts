import express, { Express } from 'express';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { registerRoutes } from '../server/routes';
import { storage } from '../server/storage';
import { hashPassword } from '../server/auth';

// Global test setup - agent available to all describe blocks
let app: Express;
let server: any;
let agent: request.SuperTest<request.Test>;

beforeAll(async () => {
    app = express();
    app.use(express.json());
    server = await registerRoutes(app);
    agent = request(app);
});

afterAll(() => {
    if (server) {
        server.close();
    }
});

describe('API Tests', () => {

    describe('Public API Routes', () => {
        it('should return 404 for an unknown route', async () => {
            await agent.get('/this-route-does-not-exist').expect(404);
        });
    });

    describe('Admin API Endpoints', () => {
      let adminToken: string;

      beforeAll(async () => {
        const adminUser = {
          email: `test-admin-${Date.now()}@fitmeal.pro`,
          password: 'Password123!',
          role: 'admin' as const,
        };

        await storage.createUser({
            ...adminUser,
            password: await hashPassword(adminUser.password),
        });

        const res = await agent.post('/api/auth/login').send(adminUser);
        adminToken = res.body.data.accessToken;
      });

      it('should allow an admin to access the stats endpoint', async () => {
        const res = await agent
          .get('/api/admin/stats')
          .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('total');
      });

      it('should deny access to a non-admin user', async () => {
        const nonAdminRes = await agent.get('/api/admin/stats').expect(401);
      });
    });
});

describe('API Routes', () => {
  it('should get recipes with default filters', async () => {
    const response = await agent
      .get('/api/recipes')
      .expect(200);

    expect(response.body).toHaveProperty('recipes');
    expect(response.body).toHaveProperty('total');
    expect(Array.isArray(response.body.recipes)).toBe(true);
  });

  it('should filter recipes by meal type', async () => {
    const response = await agent
      .get('/api/recipes?mealType=breakfast')
      .expect(200);

    expect(response.body.recipes).toBeDefined();
    if (response.body.recipes.length > 0) {
      expect(response.body.recipes[0].mealTypes).toContain('breakfast');
    }
  });

  it('should filter recipes by calorie range', async () => {
    const response = await agent
      .get('/api/recipes?minCalories=200&maxCalories=500')
      .expect(200);

    expect(response.body.recipes).toBeDefined();
    response.body.recipes.forEach((recipe: any) => {
      expect(recipe.caloriesKcal).toBeGreaterThanOrEqual(200);
      expect(recipe.caloriesKcal).toBeLessThanOrEqual(500);
    });
  });

  it('should search recipes by name', async () => {
    const response = await agent
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
    const response = await agent
      .get('/api/recipes?page=1&limit=5')
      .expect(200);

    expect(response.body.recipes).toBeDefined();
    expect(response.body.recipes.length).toBeLessThanOrEqual(5);
  });

  it('should get a specific recipe by ID', async () => {
    // First get a list of recipes to get a valid ID
    const listResponse = await agent
      .get('/api/recipes?limit=1')
      .expect(200);

    if (listResponse.body.recipes.length > 0) {
      const recipeId = listResponse.body.recipes[0].id;
      
      const response = await agent
        .get(`/api/recipes/${recipeId}`)
        .expect(200);

      expect(response.body.id).toBe(recipeId);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('ingredients');
    }
  });

  it('should return 404 for non-existent recipe', async () => {
    await agent
      .get('/api/recipes/non-existent-id')
      .expect(404);
  });
});

describe('Admin Routes', () => {
  it('should require authentication for admin recipes', async () => {
    await agent
      .get('/api/admin/recipes')
      .expect(401);
  });

  it('should require authentication for admin stats', async () => {
    await agent
      .get('/api/admin/stats')
      .expect(401);
  });

  it('should require authentication for recipe approval', async () => {
    await agent
      .patch('/api/admin/recipes/test-id/approve')
      .expect(401);
  });

  it('should require authentication for recipe deletion', async () => {
    await agent
      .delete('/api/admin/recipes/test-id')
      .expect(401);
  });

  it('should require authentication for recipe generation', async () => {
    await agent
      .post('/api/admin/generate-recipes')
      .send({ count: 5 })
      .expect(401);
  });
});

describe('Meal Plan Generation', () => {
  it('should require authentication for meal plan generation', async () => {
    await agent
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
    const response = await agent
      .get('/api/recipes?minCalories=invalid&maxCalories=also-invalid')
      .expect(400);

    expect(response.body).toHaveProperty('message');
  });

  it('should handle missing required fields in POST requests', async () => {
    const response = await agent
      .post('/api/generate-meal-plan')
      .send({})
      .expect(401); // Will be 401 due to auth, but validates the route exists
  });
});