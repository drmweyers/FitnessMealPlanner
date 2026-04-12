/**
 * seed-world.ts — FORGE QA Warfare v2
 *
 * Idempotent API-driven seed for the warfare test suite. Establishes a
 * realistic multi-role world state and writes IDs to seed-state.json so
 * specs can read by handle, not by guesswork.
 *
 * Run:
 *   npx tsx tests/e2e/simulations/seed/seed-world.ts
 *   BASE_URL=http://localhost:4000 npx tsx tests/e2e/simulations/seed/seed-world.ts
 *
 * Re-running is safe — every step probes for existing data first.
 */

import { writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { TrainerActor, ClientActor, AdminActor } from "../actors/index.js";
import { CREDENTIALS } from "../../helpers/constants.js";

const BASE_URL = process.env.BASE_URL || "http://localhost:4000";
const STATE_PATH = join(
  process.cwd(),
  "tests/e2e/simulations/seed/world-state.json",
);

interface WorldState {
  baseUrl: string;
  seededAt: string;
  trainer: { id?: string; email: string };
  customer: { id?: string; email: string };
  admin: { id?: string; email: string };
  mealPlanIds: string[];
  assignedPlanId?: string;
  recipeIds: string[];
  favoriteRecipeId?: string;
  measurementIds: string[];
  groceryListId?: string;
}

async function safe<T>(fn: () => Promise<T>, label: string): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    console.warn(`  [seed] ${label} skipped: ${(err as Error).message}`);
    return null;
  }
}

async function pickArray(value: unknown): Promise<unknown[]> {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    const v = value as Record<string, unknown>;
    if (Array.isArray(v.data)) return v.data;
    if (Array.isArray(v.items)) return v.items;
    if (Array.isArray(v.results)) return v.results;
  }
  return [];
}

function pickId(row: unknown): string | undefined {
  if (row && typeof row === "object") {
    const r = row as Record<string, unknown>;
    if (typeof r.id === "string") return r.id;
    if (typeof r._id === "string") return r._id;
  }
  return undefined;
}

async function main() {
  console.log(`[seed] World seed against ${BASE_URL}`);

  const trainer = await TrainerActor.login(CREDENTIALS.trainer, BASE_URL);
  const customer = await ClientActor.login(CREDENTIALS.customer, BASE_URL);
  const admin = await AdminActor.login(CREDENTIALS.admin, BASE_URL);
  console.log("[seed] Logged in as trainer, customer, admin");

  const state: WorldState = {
    baseUrl: BASE_URL,
    seededAt: new Date().toISOString(),
    trainer: { email: CREDENTIALS.trainer.email },
    customer: { email: CREDENTIALS.customer.email },
    admin: { email: CREDENTIALS.admin.email },
    mealPlanIds: [],
    recipeIds: [],
    measurementIds: [],
  };

  // ── Trainer meal plans ────────────────────────────────────────────────────
  const planList = await safe(() => trainer.listMealPlans(), "list meal plans");
  const plans = await pickArray(planList);
  state.mealPlanIds = plans.map(pickId).filter((x): x is string => !!x);
  console.log(`[seed] Trainer has ${state.mealPlanIds.length} meal plans`);

  if (state.mealPlanIds.length === 0) {
    const created = await safe(
      () =>
        trainer.createMealPlan({
          name: "Warfare Seed Plan",
          description: "Auto-seeded by warfare v2",
          targetCalories: 2000,
        }),
      "create seed meal plan",
    );
    const id = pickId(created);
    if (id) state.mealPlanIds.push(id);
  }

  // ── Recipes ──────────────────────────────────────────────────────────────
  const recipeList = await safe(
    () => trainer.listRecipes({ limit: "10" }),
    "list recipes",
  );
  const recipes = await pickArray(recipeList);
  state.recipeIds = recipes
    .map(pickId)
    .filter((x): x is string => !!x)
    .slice(0, 5);
  console.log(`[seed] Found ${state.recipeIds.length} recipes`);

  if (state.recipeIds[0]) {
    await safe(
      () => customer.favoriteRecipe(state.recipeIds[0]),
      "favorite first recipe",
    );
    state.favoriteRecipeId = state.recipeIds[0];
  }

  // ── Customer progress ────────────────────────────────────────────────────
  const measurementList = await safe(
    () => customer.listMeasurements(),
    "list measurements",
  );
  const measurements = await pickArray(measurementList);
  state.measurementIds = measurements
    .map(pickId)
    .filter((x): x is string => !!x);
  console.log(
    `[seed] Customer has ${state.measurementIds.length} measurements`,
  );

  if (state.measurementIds.length === 0) {
    const m = await safe(
      () =>
        customer.logMeasurement({
          date: new Date().toISOString(),
          weightKg: 75,
          bodyFatPercentage: 20,
          notes: "warfare seed",
        }),
      "log seed measurement",
    );
    const id = pickId(m);
    if (id) state.measurementIds.push(id);
  }

  // ── Grocery list ─────────────────────────────────────────────────────────
  const groceryList = await safe(
    () => customer.groceryLists(),
    "grocery lists",
  );
  const lists = await pickArray(groceryList);
  state.groceryListId = pickId(lists[0]);
  console.log(`[seed] Grocery list: ${state.groceryListId || "none"}`);

  // ── Persist ──────────────────────────────────────────────────────────────
  await mkdir(dirname(STATE_PATH), { recursive: true });
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2));
  console.log(`[seed] Wrote ${STATE_PATH}`);
  console.log("[seed] Done.");
}

main().catch((err) => {
  console.error("[seed] FAILED:", err);
  process.exit(1);
});
