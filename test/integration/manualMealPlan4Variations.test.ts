/**
 * Manual Meal Plan - 4 Input Variations Test
 *
 * Tests 4 different input formats to ensure robust parsing and saving:
 * 1. Simple format with category prefixes
 * 2. Mixed units (cups, tbsp, oz, etc.)
 * 3. Minimal format
 * 4. Complex format with decimal measurements
 */

import { describe, test, expect, beforeAll } from 'vitest';

const API_BASE = 'http://localhost:4000';

describe('Manual Meal Plan - 4 Input Variations', () => {
  let trainerToken: string;

  beforeAll(async () => {
    // Login as trainer
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
  });

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
