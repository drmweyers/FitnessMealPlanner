/**
 * FORGE QA Seed Script — EvoFitMeals
 *
 * Idempotent API-based data seeding for FORGE QA tests.
 * Creates complete simulation data using ONLY the official test accounts.
 *
 * Usage:
 *   npx tsx tests/e2e/setup/forge-seed.ts
 *   BASE_URL=http://localhost:4000 npx tsx tests/e2e/setup/forge-seed.ts
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ForgeApiClient } from "../helpers/api-client.js";
import { BASE_URL, API, type SeedState } from "../helpers/constants.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_STATE_PATH = path.join(__dirname, "seed-state.json");

// Prefix for all FORGE-created data (makes cleanup easy)
const FORGE_PREFIX = "FORGE-QA";

interface MealPlanData {
  planName: string;
  duration: number;
  dailyCalories: number;
  macros: { protein: number; carbs: number; fat: number };
  meals: Array<{
    day: number;
    mealType: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>;
}

function buildMealPlanData(
  name: string,
  calories: number,
  days: number,
): MealPlanData {
  const protein = Math.round((calories * 0.3) / 4);
  const carbs = Math.round((calories * 0.4) / 4);
  const fat = Math.round((calories * 0.3) / 9);

  const meals: MealPlanData["meals"] = [];
  for (let day = 1; day <= Math.min(days, 7); day++) {
    meals.push(
      {
        day,
        mealType: "breakfast",
        name: `${name} Breakfast D${day}`,
        calories: Math.round(calories * 0.25),
        protein: Math.round(protein * 0.25),
        carbs: Math.round(carbs * 0.25),
        fat: Math.round(fat * 0.25),
      },
      {
        day,
        mealType: "lunch",
        name: `${name} Lunch D${day}`,
        calories: Math.round(calories * 0.35),
        protein: Math.round(protein * 0.35),
        carbs: Math.round(carbs * 0.35),
        fat: Math.round(fat * 0.35),
      },
      {
        day,
        mealType: "dinner",
        name: `${name} Dinner D${day}`,
        calories: Math.round(calories * 0.35),
        protein: Math.round(protein * 0.35),
        carbs: Math.round(carbs * 0.35),
        fat: Math.round(fat * 0.35),
      },
      {
        day,
        mealType: "snack",
        name: `${name} Snack D${day}`,
        calories: Math.round(calories * 0.05),
        protein: Math.round(protein * 0.05),
        carbs: Math.round(carbs * 0.05),
        fat: Math.round(fat * 0.05),
      },
    );
  }

  return {
    planName: `${FORGE_PREFIX} ${name}`,
    duration: days,
    dailyCalories: calories,
    macros: { protein, carbs, fat },
    meals,
  };
}

async function seed() {
  const baseUrl = process.env.BASE_URL || BASE_URL;
  console.log(`\n[forge-seed] Seeding against: ${baseUrl}\n`);

  // -------------------------------------------------------------------------
  // Phase 1: Authenticate all actors
  // -------------------------------------------------------------------------
  console.log("[forge-seed] Phase 1: Authenticating...");

  let trainerClient: ForgeApiClient;
  let customerClient: ForgeApiClient;
  let adminClient: ForgeApiClient;

  try {
    trainerClient = await ForgeApiClient.loginAs("trainer", baseUrl);
    console.log("  ✓ Trainer authenticated");
  } catch (e: any) {
    console.error("  ✗ Trainer login failed:", e.message);
    process.exit(1);
  }

  try {
    customerClient = await ForgeApiClient.loginAs("customer", baseUrl);
    console.log("  ✓ Customer authenticated");
  } catch (e: any) {
    console.error("  ✗ Customer login failed:", e.message);
    process.exit(1);
  }

  try {
    adminClient = await ForgeApiClient.loginAs("admin", baseUrl);
    console.log("  ✓ Admin authenticated");
  } catch (e: any) {
    console.error("  ✗ Admin login failed:", e.message);
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // Phase 2: Get user IDs
  // -------------------------------------------------------------------------
  console.log("\n[forge-seed] Phase 2: Resolving user IDs...");

  // /api/auth/me returns { status, data: { user: { id, email, role } } }
  const trainerMeRaw = await trainerClient.get<any>(API.auth.me);
  const customerMeRaw = await customerClient.get<any>(API.auth.me);
  const adminMeRaw = await adminClient.get<any>(API.auth.me);

  const trainerMe =
    trainerMeRaw.data?.user || trainerMeRaw.user || trainerMeRaw;
  const customerMe =
    customerMeRaw.data?.user || customerMeRaw.user || customerMeRaw;
  const adminMe = adminMeRaw.data?.user || adminMeRaw.user || adminMeRaw;

  console.log(`  Trainer: ${trainerMe.email} (${trainerMe.id})`);
  console.log(`  Customer: ${customerMe.email} (${customerMe.id})`);
  console.log(`  Admin: ${adminMe.email} (${adminMe.id})`);

  // -------------------------------------------------------------------------
  // Phase 3: Discover recipes (read-only)
  // -------------------------------------------------------------------------
  console.log("\n[forge-seed] Phase 3: Discovering recipes...");

  let recipeIds: string[] = [];
  try {
    const recipesRes = await trainerClient.get<{
      recipes?: any[];
      data?: any[];
      [key: string]: any;
    }>(API.recipes.list, { limit: "20", page: "1" });
    const recipes =
      recipesRes.recipes ||
      recipesRes.data ||
      (Array.isArray(recipesRes) ? recipesRes : []);
    recipeIds = recipes.map((r: any) => r.id).filter(Boolean);
    console.log(`  Found ${recipeIds.length} recipes`);
  } catch (e: any) {
    console.warn(`  ⚠ Could not fetch recipes: ${e.message}`);
  }

  // -------------------------------------------------------------------------
  // Phase 4: Create trainer meal plans (idempotent)
  // -------------------------------------------------------------------------
  console.log("\n[forge-seed] Phase 4: Creating trainer meal plans...");

  const planConfigs = [
    { name: "Weight Loss 4-Week", calories: 1350, days: 28 },
    { name: "Muscle Gain 6-Week", calories: 2650, days: 42 },
    { name: "Balanced Maintenance", calories: 2100, days: 14 },
  ];

  // Check existing plans — response is array or { mealPlans: [...] }
  let existingPlans: any[] = [];
  try {
    const plansRes = await trainerClient.get<any>(API.trainer.mealPlans);
    existingPlans = Array.isArray(plansRes)
      ? plansRes
      : plansRes.mealPlans || plansRes.data || plansRes.plans || [];
    console.log(`  Found ${existingPlans.length} existing plans`);
  } catch {
    existingPlans = [];
  }

  const planIds: Record<string, string> = {};
  const planKeys = ["weightLoss", "muscleGain", "balanced"] as const;

  for (let i = 0; i < planConfigs.length; i++) {
    const config = planConfigs[i];
    const fullName = `${FORGE_PREFIX} ${config.name}`;
    const key = planKeys[i];

    // Check if already exists
    const existing = existingPlans.find(
      (p: any) => (p.mealPlanData?.planName || p.planName || "") === fullName,
    );

    if (existing) {
      planIds[key] = existing.id;
      console.log(`  ✓ Plan "${fullName}" already exists (${existing.id})`);
      continue;
    }

    try {
      const data = buildMealPlanData(config.name, config.calories, config.days);
      const created = await trainerClient.post<any>(API.trainer.mealPlans, {
        mealPlanData: data,
        notes: `FORGE QA seed plan — ${config.name}`,
        tags: ["forge-qa", "seed"],
        isTemplate: false,
      });
      // Response: { mealPlan: { id, ... }, message }
      planIds[key] = created.mealPlan?.id || created.id;
      console.log(`  ✓ Created plan "${fullName}" (${created.id})`);
    } catch (e: any) {
      console.error(`  ✗ Failed to create plan "${fullName}": ${e.message}`);
    }
  }

  // -------------------------------------------------------------------------
  // Phase 5: Assign weight loss plan to customer
  // -------------------------------------------------------------------------
  console.log("\n[forge-seed] Phase 5: Assigning plan to customer...");

  let primaryAssignmentId = "";
  if (planIds.weightLoss) {
    try {
      // Check existing assignments
      const planDetail = await trainerClient.get<any>(
        API.trainer.mealPlan(planIds.weightLoss),
      );
      const existingAssignment = (planDetail.assignments || []).find(
        (a: any) => a.customerId === customerMe.id,
      );

      if (existingAssignment) {
        primaryAssignmentId = existingAssignment.id;
        console.log(`  ✓ Assignment already exists (${primaryAssignmentId})`);
      } else {
        const assigned = await trainerClient.post<any>(
          API.trainer.mealPlanAssign(planIds.weightLoss),
          {
            customerId: customerMe.id,
            notes: "FORGE QA seed assignment",
          },
        );
        // Response may be { assignment: { id }, message } or { id }
        primaryAssignmentId = assigned.assignment?.id || assigned.id || "";
        console.log(`  ✓ Assigned plan to customer (${primaryAssignmentId})`);
      }
    } catch (e: any) {
      console.warn(`  ⚠ Assignment failed: ${e.message}`);
    }
  }

  // -------------------------------------------------------------------------
  // Phase 6: Create grocery list for customer
  // -------------------------------------------------------------------------
  console.log("\n[forge-seed] Phase 6: Creating grocery list...");

  let groceryListId = "";
  try {
    const existingLists = await customerClient.get<any>(API.grocery.lists);
    const lists = Array.isArray(existingLists)
      ? existingLists
      : existingLists.groceryLists || existingLists.data || [];
    const forgeLists = lists.filter((l: any) =>
      (l.name || "").startsWith(FORGE_PREFIX),
    );

    if (forgeLists.length > 0) {
      groceryListId = forgeLists[0].id;
      console.log(`  ✓ Grocery list already exists (${groceryListId})`);
    } else {
      const created = await customerClient.post<{ id: string }>(
        API.grocery.lists,
        {
          name: `${FORGE_PREFIX} Shopping List`,
        },
      );
      groceryListId = created.id;

      // Add items — category must be: produce, meat, dairy, pantry, beverages, snacks, other
      // quantity must be a number (int), unit max 20 chars
      const items = [
        { name: "Chicken Breast", category: "meat", quantity: 2, unit: "lbs" },
        { name: "Brown Rice", category: "pantry", quantity: 1, unit: "bag" },
        { name: "Broccoli", category: "produce", quantity: 2, unit: "heads" },
        { name: "Olive Oil", category: "pantry", quantity: 1, unit: "bottle" },
        { name: "Greek Yogurt", category: "dairy", quantity: 2, unit: "cups" },
      ];
      for (const item of items) {
        await customerClient.post(API.grocery.items(groceryListId), item);
      }
      console.log(
        `  ✓ Created grocery list with ${items.length} items (${groceryListId})`,
      );
    }
  } catch (e: any) {
    console.warn(`  ⚠ Grocery list creation failed: ${e.message}`);
  }

  // -------------------------------------------------------------------------
  // Phase 7: Seed progress measurements for customer
  // -------------------------------------------------------------------------
  console.log("\n[forge-seed] Phase 7: Seeding progress measurements...");

  const measurementIds: string[] = [];
  // measurementDate expects z.string().datetime() — full ISO format
  const measurementData = [
    {
      measurementDate: new Date(Date.now() - 14 * 86400000).toISOString(),
      weightKg: 82.0,
      bodyFatPercentage: 22.0,
      waistCm: 86,
      chestCm: 102,
      hipsCm: 98,
    },
    {
      measurementDate: new Date(Date.now() - 7 * 86400000).toISOString(),
      weightKg: 81.2,
      bodyFatPercentage: 21.5,
      waistCm: 85,
      chestCm: 102,
      hipsCm: 97,
    },
  ];

  try {
    const existingMeasurements = await customerClient.get<any>(
      API.progress.measurements,
    );
    const measurements = Array.isArray(existingMeasurements)
      ? existingMeasurements
      : existingMeasurements.measurements || existingMeasurements.data || [];

    if (measurements.length >= 2) {
      measurementIds.push(measurements[0].id, measurements[1].id);
      console.log(
        `  ✓ Measurements already exist (${measurements.length} found)`,
      );
    } else {
      for (const data of measurementData) {
        try {
          const created = await customerClient.post<any>(
            API.progress.measurements,
            data,
          );
          // Response may be wrapped: { id } or { measurement: { id } }
          const id = created.id || created.measurement?.id || "";
          measurementIds.push(id);
          console.log(`  ✓ Created measurement for ${data.measurementDate}`);
        } catch (e: any) {
          console.warn(`  ⚠ Measurement creation failed: ${e.message}`);
        }
      }
    }
  } catch (e: any) {
    console.warn(`  ⚠ Measurements phase failed: ${e.message}`);
  }

  // -------------------------------------------------------------------------
  // Phase 8: Favorite a recipe
  // -------------------------------------------------------------------------
  console.log("\n[forge-seed] Phase 8: Favoriting a recipe...");

  let favoritedRecipeId = "";
  if (recipeIds.length > 0) {
    favoritedRecipeId = recipeIds[0];
    try {
      await trainerClient.post(API.favorites, { recipeId: favoritedRecipeId });
      console.log(`  ✓ Favorited recipe ${favoritedRecipeId}`);
    } catch (e: any) {
      // 409 or 400 "already favorited" is fine
      if (e.status === 409 || e.status === 400) {
        console.log(`  ✓ Recipe already favorited`);
      } else {
        console.warn(`  ⚠ Favorite failed: ${e.message}`);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Phase 9: Share a meal plan
  // -------------------------------------------------------------------------
  console.log("\n[forge-seed] Phase 9: Creating share link...");

  let shareToken = "";
  if (planIds.balanced) {
    try {
      const shared = await trainerClient.post<{
        shareToken?: string;
        token?: string;
      }>(API.mealPlans.share(planIds.balanced));
      shareToken = shared.shareToken || shared.token || "";
      console.log(`  ✓ Share token: ${shareToken}`);
    } catch (e: any) {
      // May already be shared
      console.warn(`  ⚠ Share failed (may already exist): ${e.message}`);
    }
  }

  // -------------------------------------------------------------------------
  // Phase 10: Write seed state manifest
  // -------------------------------------------------------------------------
  console.log("\n[forge-seed] Phase 10: Writing seed state...");

  const seedState: SeedState = {
    trainerUserId: trainerMe.id,
    customerUserId: customerMe.id,
    adminUserId: adminMe.id,
    planIds: {
      weightLoss: planIds.weightLoss || "",
      muscleGain: planIds.muscleGain || "",
      balanced: planIds.balanced || "",
    },
    assignmentIds: {
      primary: primaryAssignmentId,
    },
    shareToken,
    groceryListId,
    measurementIds,
    recipeIds: recipeIds.slice(0, 10),
    favoritedRecipeId,
  };

  fs.writeFileSync(SEED_STATE_PATH, JSON.stringify(seedState, null, 2));
  console.log(`\n[forge-seed] ✓ Seed state written to ${SEED_STATE_PATH}`);
  console.log("[forge-seed] ✓ Seeding complete!\n");

  return seedState;
}

// Run if called directly
seed().catch((err) => {
  console.error("[forge-seed] Fatal error:", err);
  process.exit(1);
});

export { seed };
