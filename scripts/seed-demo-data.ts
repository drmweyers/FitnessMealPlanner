/**
 * Demo Data Seed Script (API-Based) — EvoFit Meals
 *
 * Seeds realistic demo data through the production API endpoints.
 * Authenticates as real users and calls the REST API to create data,
 * simulating actual nutritionist and client behavior.
 *
 * Usage:
 *   npx tsx scripts/seed-demo-data.ts
 *   npx tsx scripts/seed-demo-data.ts --dry-run
 *   BASE_URL=http://localhost:4000 npx tsx scripts/seed-demo-data.ts
 *
 * Test Accounts (all password: Demo1234!):
 *   Nutritionist:  nutritionist.sarah@evofitmeals.com
 *   Nutritionist:  nutritionist.mike@evofitmeals.com
 *   Admin:         admin@evofitmeals.com
 *   Clients:       client.alex@example.com, client.emma@example.com, client.olivia@example.com
 */

// ─── Configuration ───────────────────────────────────────────────────────────

const BASE_URL = process.env.BASE_URL || 'https://evofitmeals.com';
const DRY_RUN = process.argv.includes('--dry-run');
const PASSWORD = 'Demo1234!';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  userId: string;
}

interface MealPlan {
  id: string;
  name: string;
  weeks?: MealPlanWeek[];
}

interface MealPlanWeek {
  id: string;
  weekNumber: number;
  days?: MealPlanDay[];
}

interface MealPlanDay {
  id: string;
  dayNumber: number;
  meals?: DayMeal[];
}

interface DayMeal {
  id: string;
  mealType: string;
  recipeId?: string;
}

interface Recipe {
  id: string;
  name: string;
  category: string;
  calories: number;
}

interface ClientInfo {
  id: string;
  email: string;
}

// ─── Utility Functions ───────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toISO(d: Date): string {
  return d.toISOString();
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let stepCount = 0;

function log(msg: string): void {
  console.log(`  ${msg}`);
}

function logStep(msg: string): void {
  stepCount++;
  console.log(`\n[Step ${stepCount}] ${msg}`);
}

// ─── API Client ──────────────────────────────────────────────────────────────

async function apiRequest<T = any>(
  method: string,
  path: string,
  body?: any,
  token?: string,
  retries = MAX_RETRIES
): Promise<{ ok: boolean; status: number; data: T }> {
  const url = `${BASE_URL}${path}`;

  if (DRY_RUN) {
    log(`[DRY RUN] ${method} ${path} ${body ? JSON.stringify(body).slice(0, 100) + '...' : ''}`);
    return { ok: true, status: 200, data: {} as T };
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const controller = new AbortController();
      const fetchTimeout = setTimeout(() => controller.abort(), 60000);
      const response = await fetch(url, {
        method,
        headers,
        ...(body && { body: JSON.stringify(body) }),
        signal: controller.signal,
      });
      clearTimeout(fetchTimeout);

      const text = await response.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }

      if (!response.ok) {
        if (response.status === 409) {
          log(`  (already exists, skipping) ${method} ${path}`);
          return { ok: true, status: 409, data };
        }
        if (response.status === 400 && data?.error?.includes('already')) {
          log(`  (already exists, skipping) ${method} ${path}`);
          return { ok: true, status: 400, data };
        }
        if (attempt < retries) {
          log(`  Retry ${attempt}/${retries} for ${method} ${path} (${response.status})`);
          await sleep(RETRY_DELAY_MS * attempt);
          continue;
        }
        console.error(`  FAILED: ${method} ${path} → ${response.status}: ${JSON.stringify(data).slice(0, 200)}`);
        return { ok: false, status: response.status, data };
      }

      return { ok: true, status: response.status, data };
    } catch (err: any) {
      if (attempt < retries) {
        log(`  Network error on ${method} ${path}, retry ${attempt}/${retries}: ${err.message}`);
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }
      console.error(`  NETWORK ERROR: ${method} ${path}: ${err.message}`);
      return { ok: false, status: 0, data: {} as T };
    }
  }

  return { ok: false, status: 0, data: {} as T };
}

// ─── Authentication ──────────────────────────────────────────────────────────

async function login(email: string): Promise<AuthTokens | null> {
  if (DRY_RUN) {
    log(`[DRY RUN] Login as ${email}`);
    return { accessToken: 'dry-run-token', refreshToken: 'dry-run-refresh', userId: 'dry-run-id' };
  }

  const result = await apiRequest<any>('POST', '/api/auth/login', {
    email,
    password: PASSWORD,
  });

  if (!result.ok) {
    console.error(`  Failed to login as ${email}`);
    return null;
  }

  const data = result.data.data || result.data;
  const tokens = data.tokens || data;
  const user = data.user || {};

  return {
    accessToken: tokens.accessToken || data.accessToken || data.token,
    refreshToken: tokens.refreshToken || data.refreshToken,
    userId: user.id || data.userId || data.id || '',
  };
}

// ─── Step 1: Create Meal Plans ────────────────────────────────────────────────

async function createMealPlans(
  nutritionistToken: string,
  recipes: Recipe[]
): Promise<{ weightLossPlan: MealPlan | null; muscleGainPlan: MealPlan | null; balancedPlan: MealPlan | null }> {
  logStep('Creating meal plans (as nutritionist.sarah)');

  // Categorize recipes for use in meal plans
  const breakfastRecipes = recipes.filter(r =>
    r.category?.toLowerCase().includes('breakfast') || r.name?.toLowerCase().includes('oat') ||
    r.name?.toLowerCase().includes('egg') || r.name?.toLowerCase().includes('smoothie')
  );
  const lunchRecipes = recipes.filter(r =>
    r.category?.toLowerCase().includes('lunch') || r.name?.toLowerCase().includes('salad') ||
    r.name?.toLowerCase().includes('wrap') || r.name?.toLowerCase().includes('bowl')
  );
  const dinnerRecipes = recipes.filter(r =>
    r.category?.toLowerCase().includes('dinner') || r.name?.toLowerCase().includes('chicken') ||
    r.name?.toLowerCase().includes('salmon') || r.name?.toLowerCase().includes('beef')
  );
  const snackRecipes = recipes.filter(r =>
    r.category?.toLowerCase().includes('snack') || r.name?.toLowerCase().includes('protein') ||
    r.name?.toLowerCase().includes('bar') || r.name?.toLowerCase().includes('nuts')
  );

  // Helper: safe recipe ID from category array
  const getRecipeId = (arr: Recipe[], index: number): string | undefined =>
    arr[index % Math.max(arr.length, 1)]?.id;

  // ─── Weight Loss Plan (4 weeks, 1200–1500 cal/day) ───
  log('  Creating Weight Loss 4-Week Plan...');
  const weightLossResult = await apiRequest<any>('POST', '/api/meal-plans', {
    name: 'Weight Loss 4-Week Plan',
    description: '4-week calorie-controlled meal plan targeting 1200–1500 kcal/day. High protein, low refined carbs, emphasis on whole foods and vegetables.',
    planType: 'weight_loss',
    durationWeeks: 4,
    targetCalories: 1350,
    targetProtein: 120,
    targetCarbs: 130,
    targetFat: 45,
    goals: ['Lose 1–2 lbs/week', 'High protein to preserve muscle', 'Sustainable eating habits'],
    dietaryRestrictions: [],
    weeks: [
      {
        weekNumber: 1,
        name: 'Week 1 — Establish Baseline',
        days: [1, 2, 3, 4, 5, 6, 7].map(day => ({
          dayNumber: day,
          meals: [
            { mealType: 'breakfast', recipeId: getRecipeId(breakfastRecipes, day), portionMultiplier: 1.0 },
            { mealType: 'lunch', recipeId: getRecipeId(lunchRecipes, day), portionMultiplier: 0.9 },
            { mealType: 'dinner', recipeId: getRecipeId(dinnerRecipes, day), portionMultiplier: 1.0 },
            { mealType: 'snack', recipeId: getRecipeId(snackRecipes, day), portionMultiplier: 0.8 },
          ].filter(m => m.recipeId),
        })),
      },
    ],
  }, nutritionistToken);

  const weightLossPlan = weightLossResult.ok ? (weightLossResult.data.data || weightLossResult.data) : null;
  if (weightLossPlan?.id) {
    log(`  Created "Weight Loss 4-Week Plan" (id: ${weightLossPlan.id})`);
  }

  // ─── Muscle Gain Plan (6 weeks, 2500–2800 cal/day) ───
  log('  Creating Muscle Gain 6-Week Plan...');
  const muscleGainResult = await apiRequest<any>('POST', '/api/meal-plans', {
    name: 'Muscle Gain 6-Week Plan',
    description: '6-week high-protein, calorie-surplus meal plan targeting 2500–2800 kcal/day. Optimized for muscle hypertrophy with 5–6 meals per day.',
    planType: 'muscle_gain',
    durationWeeks: 6,
    targetCalories: 2650,
    targetProtein: 200,
    targetCarbs: 280,
    targetFat: 80,
    goals: ['Gain 0.5–1 lb lean muscle/week', 'High caloric surplus', '5–6 meals for sustained protein synthesis'],
    dietaryRestrictions: [],
    weeks: [
      {
        weekNumber: 1,
        name: 'Week 1 — Foundation Surplus',
        days: [1, 2, 3, 4, 5, 6, 7].map(day => ({
          dayNumber: day,
          meals: [
            { mealType: 'breakfast', recipeId: getRecipeId(breakfastRecipes, day), portionMultiplier: 1.5 },
            { mealType: 'mid_morning_snack', recipeId: getRecipeId(snackRecipes, day), portionMultiplier: 1.2 },
            { mealType: 'lunch', recipeId: getRecipeId(lunchRecipes, day), portionMultiplier: 1.5 },
            { mealType: 'afternoon_snack', recipeId: getRecipeId(snackRecipes, day + 1), portionMultiplier: 1.0 },
            { mealType: 'dinner', recipeId: getRecipeId(dinnerRecipes, day), portionMultiplier: 1.5 },
          ].filter(m => m.recipeId),
        })),
      },
    ],
  }, nutritionistToken);

  const muscleGainPlan = muscleGainResult.ok ? (muscleGainResult.data.data || muscleGainResult.data) : null;
  if (muscleGainPlan?.id) {
    log(`  Created "Muscle Gain 6-Week Plan" (id: ${muscleGainPlan.id})`);
  }

  // ─── Balanced Maintenance Plan (ongoing) ───
  log('  Creating Balanced Maintenance Plan...');
  const balancedResult = await apiRequest<any>('POST', '/api/meal-plans', {
    name: 'Balanced Maintenance Plan',
    description: 'Ongoing balanced nutrition plan for healthy maintenance. 2000–2200 kcal/day with macro balance across protein, carbs, and healthy fats.',
    planType: 'maintenance',
    durationWeeks: 4,
    targetCalories: 2100,
    targetProtein: 140,
    targetCarbs: 220,
    targetFat: 70,
    goals: ['Maintain healthy weight', 'Balanced macros', 'Sustainable long-term nutrition'],
    dietaryRestrictions: [],
    weeks: [
      {
        weekNumber: 1,
        name: 'Week 1',
        days: [1, 2, 3, 4, 5, 6, 7].map(day => ({
          dayNumber: day,
          meals: [
            { mealType: 'breakfast', recipeId: getRecipeId(breakfastRecipes, day + 2), portionMultiplier: 1.0 },
            { mealType: 'lunch', recipeId: getRecipeId(lunchRecipes, day + 2), portionMultiplier: 1.0 },
            { mealType: 'dinner', recipeId: getRecipeId(dinnerRecipes, day + 2), portionMultiplier: 1.0 },
            { mealType: 'snack', recipeId: getRecipeId(snackRecipes, day + 2), portionMultiplier: 1.0 },
          ].filter(m => m.recipeId),
        })),
      },
    ],
  }, nutritionistToken);

  const balancedPlan = balancedResult.ok ? (balancedResult.data.data || balancedResult.data) : null;
  if (balancedPlan?.id) {
    log(`  Created "Balanced Maintenance Plan" (id: ${balancedPlan.id})`);
  }

  return { weightLossPlan, muscleGainPlan, balancedPlan };
}

// ─── Step 2: Assign Meal Plans to Clients ─────────────────────────────────────

async function assignMealPlans(
  nutritionistToken: string,
  weightLossPlan: MealPlan | null,
  muscleGainPlan: MealPlan | null,
  balancedPlan: MealPlan | null,
  clients: Record<string, ClientInfo>
): Promise<Record<string, any>> {
  logStep('Assigning meal plans to clients');

  const assignments: Record<string, any> = {};
  const threeWeeksAgo = daysAgo(21);

  // Assign Muscle Gain to Alex
  if (muscleGainPlan && clients.alex) {
    const result = await apiRequest<any>(
      'POST',
      `/api/meal-plans/${muscleGainPlan.id}/assign`,
      { clientId: clients.alex.id, startDate: toISO(threeWeeksAgo) },
      nutritionistToken
    );
    if (result.ok) {
      assignments.alex = result.data.data || result.data;
      log(`  Assigned "Muscle Gain" to Alex`);
    }
  }

  // Assign Weight Loss to Emma
  if (weightLossPlan && clients.emma) {
    const result = await apiRequest<any>(
      'POST',
      `/api/meal-plans/${weightLossPlan.id}/assign`,
      { clientId: clients.emma.id, startDate: toISO(threeWeeksAgo) },
      nutritionistToken
    );
    if (result.ok) {
      assignments.emma = result.data.data || result.data;
      log(`  Assigned "Weight Loss" to Emma`);
    }
  }

  // Assign Balanced to Olivia
  if (balancedPlan && clients.olivia) {
    const result = await apiRequest<any>(
      'POST',
      `/api/meal-plans/${balancedPlan.id}/assign`,
      { clientId: clients.olivia.id, startDate: toISO(threeWeeksAgo) },
      nutritionistToken
    );
    if (result.ok) {
      assignments.olivia = result.data.data || result.data;
      log(`  Assigned "Balanced Maintenance" to Olivia`);
    }
  }

  return assignments;
}

// ─── Step 3: Log Nutrition (Clients) ─────────────────────────────────────────

async function logNutrition(
  clientToken: string,
  clientName: string,
  targetCalories: number,
  days: number
): Promise<void> {
  logStep(`Logging nutrition for ${clientName} (${days} days)`);

  for (let d = days; d >= 1; d--) {
    const date = daysAgo(d);
    // Slight variation around target: ±150 cal
    const cal = targetCalories + Math.round((Math.random() - 0.5) * 300);
    const protein = Math.round(cal * 0.30 / 4);
    const carbs = Math.round(cal * 0.40 / 4);
    const fat = Math.round(cal * 0.30 / 9);

    const result = await apiRequest<any>(
      'POST',
      '/api/nutrition/logs',
      {
        logDate: toDateStr(date),
        totalCalories: cal,
        protein,
        carbohydrates: carbs,
        fat,
        water: 2000 + Math.round(Math.random() * 1000), // ml
        notes: d === days ? 'Starting nutrition tracking' : undefined,
      },
      clientToken
    );

    if (result.ok && d % 5 === 0) {
      log(`  Logged ${days - d + 1} of ${days} days for ${clientName}`);
    }
  }

  log(`  Nutrition logging complete for ${clientName}`);
}

// ─── Step 4: Record Progress Measurements ────────────────────────────────────

async function recordProgressMeasurements(
  clientToken: string,
  clientName: string,
  startWeight: number,
  endWeight: number,
  startBodyFat: number,
  endBodyFat: number,
  weeks: number
): Promise<void> {
  logStep(`Recording progress measurements for ${clientName}`);

  for (let w = 0; w < weeks; w++) {
    const date = daysAgo((weeks - 1 - w) * 7);
    const progress = weeks > 1 ? w / (weeks - 1) : 0;
    const weight = startWeight + (endWeight - startWeight) * progress;
    const bodyFat = startBodyFat + (endBodyFat - startBodyFat) * progress;

    const result = await apiRequest<any>(
      'POST',
      '/api/progress/measurements',
      {
        measurementDate: toDateStr(date),
        weight: parseFloat(weight.toFixed(1)),
        bodyFatPercentage: parseFloat(bodyFat.toFixed(1)),
        measurements: {
          waist: parseFloat((82 - w * 0.4 + (Math.random() - 0.5)).toFixed(1)),
          hips: parseFloat((98 + (Math.random() - 0.5)).toFixed(1)),
          chest: parseFloat((95 - w * 0.2 + (Math.random() - 0.5)).toFixed(1)),
        },
        notes: w === 0 ? 'Initial measurement' : w === weeks - 1 ? 'Most recent check-in' : undefined,
      },
      clientToken
    );

    if (result.ok) {
      log(`  Week ${w + 1}: ${weight.toFixed(1)} kg, ${bodyFat.toFixed(1)}% BF`);
    }
  }
}

// ─── Step 5: Create Nutrition Goals ──────────────────────────────────────────

async function createNutritionGoals(
  clientToken: string,
  clientName: string,
  goals: Array<{
    goalType: string;
    description: string;
    targetValue?: number;
    targetDate?: string;
    priority?: number;
  }>
): Promise<void> {
  logStep(`Creating nutrition goals for ${clientName}`);

  for (const goal of goals) {
    const result = await apiRequest<any>(
      'POST',
      '/api/nutrition/goals',
      goal,
      clientToken
    );

    if (result.ok) {
      log(`  Created goal: ${goal.description}`);
    }
  }
}

// ─── Step 6: Generate Shopping Lists ─────────────────────────────────────────

async function generateShoppingLists(
  nutritionistToken: string,
  assignments: Record<string, any>
): Promise<void> {
  logStep('Generating shopping lists for active meal plan assignments');

  for (const [clientName, assignment] of Object.entries(assignments)) {
    if (!assignment?.id && !assignment?.mealPlanId) continue;

    const planId = assignment.mealPlanId || assignment.planId || assignment.id;
    if (!planId) continue;

    const result = await apiRequest<any>(
      'POST',
      '/api/shopping-lists/generate',
      {
        mealPlanAssignmentId: assignment.id,
        weekNumber: 1,
        startDate: toDateStr(daysFromNow(0)),
        endDate: toDateStr(daysFromNow(6)),
      },
      nutritionistToken
    );

    if (result.ok) {
      log(`  Generated shopping list for ${clientName}'s meal plan`);
    }
  }
}

// ─── Step 7: Fetch Clients ────────────────────────────────────────────────────

async function fetchClientIds(
  nutritionistToken: string
): Promise<Record<string, ClientInfo>> {
  logStep('Fetching client IDs');

  const result = await apiRequest<any>(
    'GET',
    '/api/clients',
    undefined,
    nutritionistToken
  );

  const clients: Record<string, ClientInfo> = {};

  if (result.ok) {
    const clientList = result.data.clients || result.data.data || result.data || [];
    for (const client of Array.isArray(clientList) ? clientList : []) {
      const email = (client.email || '').toLowerCase();
      if (email.includes('alex')) {
        clients.alex = { id: client.id, email };
        log(`  Alex: ${client.id}`);
      } else if (email.includes('emma')) {
        clients.emma = { id: client.id, email };
        log(`  Emma: ${client.id}`);
      } else if (email.includes('olivia')) {
        clients.olivia = { id: client.id, email };
        log(`  Olivia: ${client.id}`);
      }
    }
  }

  // Fallback: login directly
  if (!clients.alex) {
    const auth = await login('client.alex@example.com');
    if (auth) clients.alex = { id: auth.userId, email: 'client.alex@example.com' };
  }
  if (!clients.emma) {
    const auth = await login('client.emma@example.com');
    if (auth) clients.emma = { id: auth.userId, email: 'client.emma@example.com' };
  }
  if (!clients.olivia) {
    const auth = await login('client.olivia@example.com');
    if (auth) clients.olivia = { id: auth.userId, email: 'client.olivia@example.com' };
  }

  return clients;
}

// ─── Step 8: Fetch Recipes ────────────────────────────────────────────────────

async function fetchRecipes(token: string): Promise<Recipe[]> {
  logStep('Fetching recipe library');

  const result = await apiRequest<any>('GET', '/api/recipes?limit=200', undefined, token);
  if (!result.ok) {
    console.error('  Failed to fetch recipes');
    return [];
  }

  const recipes: Recipe[] = result.data.recipes || result.data.data || result.data || [];
  log(`Fetched ${Array.isArray(recipes) ? recipes.length : 0} recipes`);
  return Array.isArray(recipes) ? recipes : [];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('EvoFit Meals — Demo Data Seed Script (API)');
  console.log('='.repeat(60));
  console.log(`Target: ${BASE_URL}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no API calls)' : 'LIVE'}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  // ─── Authenticate ──────────────────────────────────────────

  logStep('Authenticating users');

  const sarahAuth = await login('nutritionist.sarah@evofitmeals.com');
  if (!sarahAuth) {
    console.error('FATAL: Cannot login as nutritionist.sarah. Aborting.');
    process.exit(1);
  }
  log('Logged in as nutritionist.sarah');

  const alexAuth = await login('client.alex@example.com');
  if (!alexAuth) console.error('WARNING: Cannot login as client.alex');
  else log('Logged in as client.alex');

  const emmaAuth = await login('client.emma@example.com');
  if (!emmaAuth) console.error('WARNING: Cannot login as client.emma');
  else log('Logged in as client.emma');

  const oliviaAuth = await login('client.olivia@example.com');
  if (!oliviaAuth) console.error('WARNING: Cannot login as client.olivia');
  else log('Logged in as client.olivia');

  // ─── Fetch Recipes ─────────────────────────────────────────

  const recipes = await fetchRecipes(sarahAuth.accessToken);
  if (recipes.length === 0) {
    console.error('WARNING: No recipes found. Meal plans will be created without recipe assignments.');
  }

  // ─── Fetch Clients ─────────────────────────────────────────

  const clients = await fetchClientIds(sarahAuth.accessToken);

  // Override with login IDs if fetched directly
  if (alexAuth && clients.alex) clients.alex.id = clients.alex.id || alexAuth.userId;
  if (emmaAuth && clients.emma) clients.emma.id = clients.emma.id || emmaAuth.userId;
  if (oliviaAuth && clients.olivia) clients.olivia.id = clients.olivia.id || oliviaAuth.userId;

  // ─── Create Meal Plans ─────────────────────────────────────

  const { weightLossPlan, muscleGainPlan, balancedPlan } = await createMealPlans(
    sarahAuth.accessToken,
    recipes
  );

  // ─── Assign Meal Plans ─────────────────────────────────────

  const assignments = await assignMealPlans(
    sarahAuth.accessToken,
    weightLossPlan,
    muscleGainPlan,
    balancedPlan,
    clients
  );

  // ─── Log Nutrition (3 weeks back) ─────────────────────────

  if (alexAuth) {
    await logNutrition(alexAuth.accessToken, 'Alex', 2650, 21);
  }
  if (emmaAuth) {
    await logNutrition(emmaAuth.accessToken, 'Emma', 1350, 21);
  }
  if (oliviaAuth) {
    await logNutrition(oliviaAuth.accessToken, 'Olivia', 2100, 21);
  }

  // ─── Record Progress Measurements ─────────────────────────

  if (alexAuth) {
    // Alex: gaining muscle — slight weight increase, BF stable
    await recordProgressMeasurements(alexAuth.accessToken, 'Alex', 80.0, 82.5, 15.0, 14.5, 4);
  }
  if (emmaAuth) {
    // Emma: losing weight — consistent decrease
    await recordProgressMeasurements(emmaAuth.accessToken, 'Emma', 72.0, 68.5, 28.0, 25.5, 4);
  }
  if (oliviaAuth) {
    // Olivia: maintaining — stable weight
    await recordProgressMeasurements(oliviaAuth.accessToken, 'Olivia', 65.0, 65.2, 22.0, 21.5, 4);
  }

  // ─── Create Nutrition Goals ───────────────────────────────

  if (alexAuth) {
    await createNutritionGoals(alexAuth.accessToken, 'Alex', [
      {
        goalType: 'muscle_gain',
        description: 'Gain 5kg lean muscle in 3 months',
        targetValue: 87.5,
        targetDate: '2026-06-30',
        priority: 1,
      },
      {
        goalType: 'protein_intake',
        description: 'Hit 200g protein daily',
        targetValue: 200,
        targetDate: '2026-04-01',
        priority: 2,
      },
      {
        goalType: 'hydration',
        description: 'Drink 3L water daily',
        targetValue: 3000,
        targetDate: '2026-04-01',
        priority: 3,
      },
    ]);
  }

  if (emmaAuth) {
    await createNutritionGoals(emmaAuth.accessToken, 'Emma', [
      {
        goalType: 'weight_loss',
        description: 'Lose 5kg by summer (May 2026)',
        targetValue: 67.0,
        targetDate: '2026-05-31',
        priority: 1,
      },
      {
        goalType: 'calorie_deficit',
        description: 'Maintain 300–400 kcal deficit daily',
        targetValue: 400,
        targetDate: '2026-05-31',
        priority: 2,
      },
      {
        goalType: 'nutrition_consistency',
        description: 'Log meals 6 out of 7 days/week',
        targetValue: 6,
        targetDate: '2026-06-30',
        priority: 3,
      },
    ]);
  }

  if (oliviaAuth) {
    await createNutritionGoals(oliviaAuth.accessToken, 'Olivia', [
      {
        goalType: 'maintenance',
        description: 'Maintain 65kg body weight',
        targetValue: 65.0,
        targetDate: '2026-12-31',
        priority: 1,
      },
      {
        goalType: 'balanced_macros',
        description: 'Hit 30/40/30 P/C/F macro split daily',
        targetValue: 30,
        targetDate: '2026-04-30',
        priority: 2,
      },
      {
        goalType: 'veggie_intake',
        description: 'Eat 5 servings of vegetables daily',
        targetValue: 5,
        targetDate: '2026-04-30',
        priority: 3,
      },
    ]);
  }

  // ─── Generate Shopping Lists ──────────────────────────────

  await generateShoppingLists(sarahAuth.accessToken, assignments);

  // ─── Summary ──────────────────────────────────────────────

  console.log('\n' + '='.repeat(60));
  console.log('SEED COMPLETE');
  console.log('='.repeat(60));
  console.log('\nData created through API:');
  console.log('  - 3 meal plans (Weight Loss, Muscle Gain, Balanced Maintenance)');
  console.log('  - 3 meal plan assignments (Alex, Emma, Olivia)');
  console.log('  - 63 daily nutrition logs (3 weeks × 3 clients)');
  console.log('  - 12 progress measurements (4 weeks × 3 clients)');
  console.log('  - 9 nutrition goals (3 per client)');
  console.log('  - 3 shopping lists (one per active assignment)');
  console.log(`\nTarget: ${BASE_URL}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log('='.repeat(60));
}

// ─── Run ──────────────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error('\nFATAL ERROR:', err);
  process.exit(1);
});
