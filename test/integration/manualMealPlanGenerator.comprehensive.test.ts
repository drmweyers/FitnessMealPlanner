/**
 * Manual Meal Plan Generator - Comprehensive Integration Test Suite
 *
 * Complete test coverage for manual (non-AI) meal plan creation workflow.
 * This suite tests the trainer's ability to create custom meal plans without AI,
 * using structured text input with ingredients.
 *
 * Test Coverage:
 * - Text parsing (simple and structured formats)
 * - Ingredient extraction and validation
 * - Meal plan saving and retrieval
 * - Database integrity
 * - Multiple input format variations
 * - Edge cases and error handling
 *
 * Related Files:
 * - server/services/manualMealPlanService.ts - Parser and service logic
 * - server/routes/trainerRoutes.ts - API endpoints
 * - client/src/components/ManualMealPlanCreator.tsx - UI component
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../server/db';
import { users, trainerMealPlans } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

const API_BASE = 'http://localhost:4000';

describe('Manual Meal Plan Generator - Comprehensive Suite', () => {
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

  // ============================================================================
  // SECTION 1: PARSE MANUAL MEALS - API ENDPOINT TESTS
  // ============================================================================

  describe('Step 1: Parse Manual Meals API', () => {
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

  // ============================================================================
  // SECTION 2: SAVE MANUAL MEAL PLAN - DATABASE INTEGRATION
  // ============================================================================

  describe('Step 2: Save Manual Meal Plan', () => {
    test('should save meal plan with parsed meals and ingredients', async () => {
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
          planName: 'Comprehensive Test Plan',
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
      expect(mealPlanData.planName).toBe('Comprehensive Test Plan');
      expect(mealPlanData.meals).toHaveLength(2);
      expect(mealPlanData.meals[0]).toHaveProperty('imageUrl');
      expect(mealPlanData.meals[0]).toHaveProperty('ingredients');
      expect(mealPlanData.meals[0].ingredients).toHaveLength(3);

      // Verify meal plan structure compatibility
      expect(mealPlanData).toHaveProperty('days');
      expect(mealPlanData).toHaveProperty('mealsPerDay');
      expect(mealPlanData).toHaveProperty('fitnessGoal');
      expect(mealPlanData.mealsPerDay).toBe(2);
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

  // ============================================================================
  // SECTION 3: RETRIEVE SAVED MEAL PLANS
  // ============================================================================

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

  // ============================================================================
  // SECTION 4: COMPLETE WORKFLOW - END-TO-END
  // ============================================================================

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

  // ============================================================================
  // SECTION 5: INPUT FORMAT VARIATIONS
  // ============================================================================

  describe('Input Format Variations', () => {
    test('Variation 1: Simple format with category prefixes', async () => {
      const input = `Breakfast: Oatmeal with berries and almonds
Lunch: Grilled chicken salad with avocado
Dinner: Baked salmon with quinoa and asparagus
Snack: Greek yogurt with honey`;

      // Parse
      const parseResponse = await fetch(`${API_BASE}/api/trainer/parse-manual-meals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${trainerToken}`
        },
        body: JSON.stringify({ text: input })
      });

      expect(parseResponse.status).toBe(200);
      const parseData = await parseResponse.json();

      expect(parseData.status).toBe('success');
      expect(parseData.data.meals).toHaveLength(4);
      expect(parseData.data.meals[0].category).toBe('breakfast');
      expect(parseData.data.meals[1].category).toBe('lunch');
      expect(parseData.data.meals[2].category).toBe('dinner');
      expect(parseData.data.meals[3].category).toBe('snack');

      // Save
      const saveResponse = await fetch(`${API_BASE}/api/trainer/manual-meal-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${trainerToken}`
        },
        body: JSON.stringify({
          planName: 'Variation 1 Test',
          meals: parseData.data.meals
        })
      });

      expect(saveResponse.status).toBe(201);
      const saveData = await saveResponse.json();

      expect(saveData.status).toBe('success');
      expect(saveData.data.mealPlanData.meals).toHaveLength(4);
      expect(saveData.data.mealPlanData.mealsPerDay).toBe(4);
      expect(saveData.data.mealPlanData.days).toBe(1);
    });

    test('Variation 2: Mixed units (cups, tbsp, oz, lb, ml)', async () => {
      const input = `Meal 1

-2 cups of oats
-1 cup of almond milk
-2 tbsp of honey
-0.5 cup of blueberries

Meal 2

-6 oz of chicken breast
-1 cup of brown rice
-2 tbsp of olive oil
-1 lb of mixed vegetables

Meal 3

-250ml of protein shake
-1 tbsp of peanut butter
-1 banana`;

      // Parse
      const parseResponse = await fetch(`${API_BASE}/api/trainer/parse-manual-meals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${trainerToken}`
        },
        body: JSON.stringify({ text: input })
      });

      expect(parseResponse.status).toBe(200);
      const parseData = await parseResponse.json();

      expect(parseData.status).toBe('success');
      expect(parseData.data.meals).toHaveLength(3);

      // Verify mixed units parsed correctly
      expect(parseData.data.meals[0].ingredients).toBeDefined();
      expect(parseData.data.meals[0].ingredients.length).toBeGreaterThan(0);
      expect(parseData.data.meals[1].ingredients).toBeDefined();
      expect(parseData.data.meals[2].ingredients).toBeDefined();

      // Save
      const saveResponse = await fetch(`${API_BASE}/api/trainer/manual-meal-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${trainerToken}`
        },
        body: JSON.stringify({
          planName: 'Variation 2 Test',
          meals: parseData.data.meals
        })
      });

      expect(saveResponse.status).toBe(201);
      const saveData = await saveResponse.json();

      expect(saveData.status).toBe('success');
      expect(saveData.data.mealPlanData.meals).toHaveLength(3);
      expect(saveData.data.mealPlanData.mealsPerDay).toBe(3);
    });

    test('Variation 3: Minimal format (no units, simple items)', async () => {
      const input = `Meal 1
-2 eggs
-2 toast
-1 banana

Meal 2
-chicken wrap
-side salad
-apple

Meal 3
-steak
-baked potato
-green beans`;

      // Parse
      const parseResponse = await fetch(`${API_BASE}/api/trainer/parse-manual-meals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${trainerToken}`
        },
        body: JSON.stringify({ text: input })
      });

      expect(parseResponse.status).toBe(200);
      const parseData = await parseResponse.json();

      expect(parseData.status).toBe('success');
      expect(parseData.data.meals).toHaveLength(3);

      // Verify minimal format parsed (should use defaults)
      expect(parseData.data.meals[0].ingredients).toBeDefined();
      expect(parseData.data.meals[0].ingredients.length).toBe(3);

      // Save
      const saveResponse = await fetch(`${API_BASE}/api/trainer/manual-meal-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${trainerToken}`
        },
        body: JSON.stringify({
          planName: 'Variation 3 Test',
          meals: parseData.data.meals
        })
      });

      expect(saveResponse.status).toBe(201);
      const saveData = await saveResponse.json();

      expect(saveData.status).toBe('success');
      expect(saveData.data.mealPlanData.meals).toHaveLength(3);
    });

    test('Variation 4: Complex format with decimals and multiple bullet styles', async () => {
      const input = `Meal 1

-175.5g of jasmine rice
-150.25g of lean ground beef
-100g of cooked broccoli
-15ml of soy sauce

Meal 2

•4 eggs
•2 slices of sourdough bread
•1.5 banana (150g)
•50.5g of strawberries
•10g of grass-fed butter
•15ml of raw honey

Meal 3

-100.75g turkey breast
-150g of sweet potato
-100g of asparagus
•250ml of coconut water
•1 tbsp of olive oil`;

      // Parse
      const parseResponse = await fetch(`${API_BASE}/api/trainer/parse-manual-meals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${trainerToken}`
        },
        body: JSON.stringify({ text: input })
      });

      expect(parseResponse.status).toBe(200);
      const parseData = await parseResponse.json();

      expect(parseData.status).toBe('success');
      expect(parseData.data.meals).toHaveLength(3);

      // Verify decimal amounts parsed correctly
      const meal1 = parseData.data.meals[0];
      expect(meal1.ingredients).toBeDefined();
      expect(meal1.ingredients[0].amount).toBe('175.5');
      expect(meal1.ingredients[0].unit).toBe('g');
      expect(meal1.ingredients[0].ingredient).toBe('jasmine rice');

      // Verify mixed bullet points work
      const meal2 = parseData.data.meals[1];
      expect(meal2.ingredients).toHaveLength(6);

      // Verify meal 3 with both bullet styles
      const meal3 = parseData.data.meals[2];
      expect(meal3.ingredients).toHaveLength(5);

      // Save
      const saveResponse = await fetch(`${API_BASE}/api/trainer/manual-meal-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${trainerToken}`
        },
        body: JSON.stringify({
          planName: 'Variation 4 Test',
          meals: parseData.data.meals
        })
      });

      expect(saveResponse.status).toBe(201);
      const saveData = await saveResponse.json();

      expect(saveData.status).toBe('success');
      expect(saveData.data.mealPlanData.meals).toHaveLength(3);
      expect(saveData.data.mealPlanData.mealsPerDay).toBe(3);

      // Verify ingredients preserved in saved data
      const savedMeal1 = saveData.data.mealPlanData.meals[0];
      expect(savedMeal1.ingredients).toBeDefined();
      expect(savedMeal1.ingredients.length).toBe(4);
    });
  });
});
