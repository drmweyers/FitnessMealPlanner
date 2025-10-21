/**
 * Manual Meal Plan Flow - Integration Tests
 *
 * Tests the complete flow:
 * 1. Parse manual meals (POST /api/trainer/parse-manual-meals)
 * 2. Save meal plan (POST /api/trainer/manual-meal-plan)
 * 3. Retrieve saved plans (GET /api/trainer/meal-plans)
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../server/db';
import { users, trainerMealPlans } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

const API_BASE = 'http://localhost:4000';

describe('Manual Meal Plan Flow - Integration', () => {
  let trainerToken: string;
  let trainerId: string;

  beforeAll(async () => {
    // Get trainer test account
    const [trainer] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'trainer.test@evofitmeals.com'))
      .limit(1);

    if (!trainer) {
      throw new Error('Trainer test account not found. Run seed script first.');
    }

    trainerId = trainer.id;

    // Login to get token
    const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'trainer.test@evofitmeals.com',
        password: 'TestTrainer123!'
      })
    });

    const loginData = await loginResponse.json();
    trainerToken = loginData.data.accessToken;

    expect(trainerToken).toBeDefined();
    expect(trainerToken.length).toBeGreaterThan(0);
  });

  afterAll(async () => {
    // Cleanup: Delete test meal plans created during tests
    await db
      .delete(trainerMealPlans)
      .where(eq(trainerMealPlans.trainerId, trainerId));
  });

  describe('Step 1: Parse Manual Meals', () => {
    test('should parse simple format meals', async () => {
      const response = await fetch(`${API_BASE}/api/trainer/parse-manual-meals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${trainerToken}`
        },
        body: JSON.stringify({
          text: 'Breakfast: Oatmeal with berries\nLunch: Chicken salad'
        })
      });

      expect(response.status).toBe(200);

      const data = await response.json();

      expect(data.status).toBe('success');
      expect(data.data.meals).toHaveLength(2);
      expect(data.data.count).toBe(2);

      // Verify meal structure
      expect(data.data.meals[0]).toHaveProperty('mealName');
      expect(data.data.meals[0]).toHaveProperty('category');
      expect(data.data.meals[0].mealName).toBe('Oatmeal with berries');
      expect(data.data.meals[0].category).toBe('breakfast');
    });

    test('should parse structured format with ingredients', async () => {
      const structuredText = `
Meal 1

-175g of Jasmine Rice
-150g of Lean ground beef
-100g of cooked broccoli

Meal 2

-4 eggs
-2 pieces of sourdough bread
-1 banana (100g)
      `;

      const response = await fetch(`${API_BASE}/api/trainer/parse-manual-meals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${trainerToken}`
        },
        body: JSON.stringify({ text: structuredText })
      });

      expect(response.status).toBe(200);

      const data = await response.json();

      expect(data.status).toBe('success');
      expect(data.data.meals).toHaveLength(2);

      // Verify first meal has ingredients
      expect(data.data.meals[0].ingredients).toBeDefined();
      expect(data.data.meals[0].ingredients).toHaveLength(3);
      expect(data.data.meals[0].ingredients[0]).toEqual({
        ingredient: 'Jasmine Rice',
        amount: '175',
        unit: 'g'
      });

      // Verify meal name was generated from ingredients
      expect(data.data.meals[0].mealName).toContain('Jasmine Rice');
    });

    test('should return error for empty text', async () => {
      const response = await fetch(`${API_BASE}/api/trainer/parse-manual-meals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${trainerToken}`
        },
        body: JSON.stringify({ text: '' })
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.status).toBe('error');
    });

    test('should require authentication', async () => {
      const response = await fetch(`${API_BASE}/api/trainer/parse-manual-meals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Meal 1\n-rice' })
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Step 2: Save Manual Meal Plan', () => {
    test('should save meal plan with parsed meals', async () => {
      const meals = [
        {
          mealName: 'Jasmine Rice, Lean ground beef, and cooked broccoli',
          category: 'dinner' as const,
          ingredients: [
            { ingredient: 'Jasmine Rice', amount: '175', unit: 'g' },
            { ingredient: 'Lean ground beef', amount: '150', unit: 'g' },
            { ingredient: 'cooked broccoli', amount: '100', unit: 'g' }
          ]
        },
        {
          mealName: 'Eggs, sourdough bread, and banana',
          category: 'breakfast' as const,
          ingredients: [
            { ingredient: 'eggs', amount: '4', unit: 'unit' },
            { ingredient: 'sourdough bread', amount: '2', unit: 'pieces' },
            { ingredient: 'banana (100g)', amount: '1', unit: 'unit' }
          ]
        }
      ];

      const response = await fetch(`${API_BASE}/api/trainer/manual-meal-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${trainerToken}`
        },
        body: JSON.stringify({
          planName: 'Integration Test Plan',
          meals
        })
      });

      expect(response.status).toBe(201);

      const data = await response.json();

      expect(data.status).toBe('success');
      expect(data.data).toHaveProperty('id');
      expect(data.data.trainerId).toBe(trainerId);

      // Verify saved in database
      const [saved] = await db
        .select()
        .from(trainerMealPlans)
        .where(eq(trainerMealPlans.id, data.data.id))
        .limit(1);

      expect(saved).toBeDefined();
      expect(saved.trainerId).toBe(trainerId);

      const mealPlanData = saved.mealPlanData as any;
      expect(mealPlanData.planName).toBe('Integration Test Plan');
      expect(mealPlanData.meals).toHaveLength(2);
      expect(mealPlanData.meals[0]).toHaveProperty('imageUrl');
    });

    test('should return error without plan name', async () => {
      const response = await fetch(`${API_BASE}/api/trainer/manual-meal-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${trainerToken}`
        },
        body: JSON.stringify({
          planName: '',
          meals: [{ mealName: 'Test', category: 'lunch' }]
        })
      });

      expect(response.status).toBe(400);
    });

    test('should return error without meals', async () => {
      const response = await fetch(`${API_BASE}/api/trainer/manual-meal-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${trainerToken}`
        },
        body: JSON.stringify({
          planName: 'Test Plan',
          meals: []
        })
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Step 3: Retrieve Saved Meal Plans', () => {
    let savedPlanId: string;

    beforeAll(async () => {
      // Create a meal plan for testing retrieval
      const meals = [
        {
          mealName: 'Test Meal',
          category: 'lunch' as const,
          ingredients: [
            { ingredient: 'chicken', amount: '150', unit: 'g' }
          ]
        }
      ];

      const response = await fetch(`${API_BASE}/api/trainer/manual-meal-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${trainerToken}`
        },
        body: JSON.stringify({
          planName: 'Retrieval Test Plan',
          meals
        })
      });

      const data = await response.json();
      savedPlanId = data.data.id;
    });

    test('should retrieve all trainer meal plans', async () => {
      const response = await fetch(`${API_BASE}/api/trainer/meal-plans`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${trainerToken}`
        }
      });

      expect(response.status).toBe(200);

      const data = await response.json();

      expect(data).toHaveProperty('mealPlans');
      expect(Array.isArray(data.mealPlans)).toBe(true);
      expect(data.mealPlans.length).toBeGreaterThan(0);

      // Verify our test plan is in the list
      const testPlan = data.mealPlans.find((p: any) => p.id === savedPlanId);
      expect(testPlan).toBeDefined();
      expect(testPlan.trainerId).toBe(trainerId);
      expect(testPlan.mealPlanData).toHaveProperty('planName');
      expect(testPlan.mealPlanData.planName).toBe('Retrieval Test Plan');
    });

    test('should include assignment count', async () => {
      const response = await fetch(`${API_BASE}/api/trainer/meal-plans`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${trainerToken}`
        }
      });

      const data = await response.json();

      expect(data.mealPlans[0]).toHaveProperty('assignmentCount');
      expect(typeof data.mealPlans[0].assignmentCount).toBe('number');
    });

    test('should return empty array for trainer with no plans', async () => {
      // Create a temporary trainer with unique email
      const uniqueEmail = `temp-trainer-${Date.now()}@test.com`;
      const hashedPassword = await bcrypt.hash('test', 10);
      const [tempTrainer] = await db
        .insert(users)
        .values({
          email: uniqueEmail,
          password: hashedPassword,
          role: 'trainer'
        })
        .returning();

      // Login as temp trainer
      const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: uniqueEmail,
          password: 'test'
        })
      });

      const loginData = await loginResponse.json();
      const tempToken = loginData.data.accessToken;

      // Query meal plans
      const response = await fetch(`${API_BASE}/api/trainer/meal-plans`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tempToken}`
        }
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.mealPlans).toEqual([]);
      expect(data.total).toBe(0);

      // Cleanup
      await db.delete(users).where(eq(users.id, tempTrainer.id));
    });

    test('should require authentication', async () => {
      const response = await fetch(`${API_BASE}/api/trainer/meal-plans`, {
        method: 'GET'
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Complete Flow: Parse → Save → Retrieve', () => {
    test('should complete full workflow successfully', async () => {
      // Step 1: Parse meals
      const parseResponse = await fetch(`${API_BASE}/api/trainer/parse-manual-meals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${trainerToken}`
        },
        body: JSON.stringify({
          text: `
Meal 1

-175g of Jasmine Rice
-150g of Lean ground beef
-100g of cooked broccoli

Meal 2

-4 eggs
-2 pieces of sourdough bread
          `
        })
      });

      expect(parseResponse.status).toBe(200);
      const parseData = await parseResponse.json();
      const parsedMeals = parseData.data.meals;

      expect(parsedMeals).toHaveLength(2);

      // Step 2: Save meal plan
      const saveResponse = await fetch(`${API_BASE}/api/trainer/manual-meal-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${trainerToken}`
        },
        body: JSON.stringify({
          planName: 'Complete Flow Test Plan',
          meals: parsedMeals
        })
      });

      expect(saveResponse.status).toBe(201);
      const saveData = await saveResponse.json();
      const savedPlanId = saveData.data.id;

      // Step 3: Retrieve saved plans
      const retrieveResponse = await fetch(`${API_BASE}/api/trainer/meal-plans`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${trainerToken}`
        }
      });

      expect(retrieveResponse.status).toBe(200);
      const retrieveData = await retrieveResponse.json();

      // Verify the plan we just saved is in the list
      const savedPlan = retrieveData.mealPlans.find((p: any) => p.id === savedPlanId);

      expect(savedPlan).toBeDefined();
      expect(savedPlan.mealPlanData.planName).toBe('Complete Flow Test Plan');
      expect(savedPlan.mealPlanData.meals).toHaveLength(2);
      expect(savedPlan.mealPlanData.meals[0].mealName).toContain('Jasmine Rice');
      expect(savedPlan.mealPlanData.meals[0].ingredients).toBeDefined();
      expect(savedPlan.mealPlanData.meals[0].imageUrl).toBeDefined();
    });
  });
});
