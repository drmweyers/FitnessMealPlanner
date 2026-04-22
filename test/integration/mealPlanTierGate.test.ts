// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";

// Regression: POST /api/meal-plan/generate must silently strip Advanced
// Filter fields for Starter tier. Verifies the tier gate added 2026-04-22
// as part of the "Advanced Filter is Pro+" launch-blocker fix.
//
// Paired with `mealPlanGeneratorVariety.test.ts` — that file checks the
// variety + dedup logic; this one checks the tier gate at the HTTP layer.
// Run against localhost:4000. Override with BASE_URL.

const BASE = process.env.BASE_URL || "http://localhost:4000";

// Canonical tier trainers seeded by scripts/seed-tier-test-accounts.ts
const STARTER = {
  email: "trainer.starter@test.com",
  password: "TestPass123!",
};
const PRO = {
  email: "trainer.test@evofitmeals.com",
  password: "TestTrainer123!",
};

async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as any;
  return data?.data?.accessToken || data?.accessToken;
}

async function generate(token: string, body: any): Promise<any> {
  const res = await fetch(`${BASE}/api/meal-plan/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function getEntitlements(token: string): Promise<any> {
  const res = await fetch(`${BASE}/api/entitlements`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

describe("Meal plan generator — tier gate on Advanced Filter fields", () => {
  let starterToken: string | null = null;
  let proToken: string | null = null;

  beforeAll(async () => {
    starterToken = await login(STARTER.email, STARTER.password);
    proToken = await login(PRO.email, PRO.password);
  });

  it("entitlements endpoint surfaces advancedFilters flag", async () => {
    if (!starterToken || !proToken) {
      throw new Error("login failed — seed tier test accounts first");
    }

    const starter = await getEntitlements(starterToken);
    const pro = await getEntitlements(proToken);

    expect(starter?.features?.advancedFilters).toBe(false);
    expect(pro?.features?.advancedFilters).toBe(true);
  });

  it("Starter trainer: advanced fields silent-stripped, plan still generates", async () => {
    if (!starterToken) throw new Error("starter login failed");

    const { status, body } = await generate(starterToken, {
      planName: "starter-strip-test",
      fitnessGoal: "weight_loss",
      dailyCalorieTarget: 1800,
      days: 3,
      mealsPerDay: 3,
      minProtein: 30, // should be stripped
      maxCalories: 800, // should be stripped
      maxPrepTime: 30, // should be stripped
    });

    // Starter should get a 200 with a generated plan. The strip is silent —
    // no 403, no error. The plan is a basic one (advanced fields ignored).
    expect(
      status,
      `expected 200, got ${status}: ${JSON.stringify(body).slice(0, 200)}`,
    ).toBe(200);
    expect(body?.mealPlan?.meals?.length).toBe(9);

    // If the generator had honored minProtein=30 maxCalories=800 (the narrow
    // filter that produced the 9-beef bug), we'd see clustering. Without the
    // strip, the pre-fix generator might also repeat. This assertion proves
    // the strip is working: the basic plan has variety because it ran
    // UNCONSTRAINED, not filtered by protein/calories.
    //
    // Weak but defensible signal: at least 4 unique recipes in a basic plan.
    const uniqueRecipeIds = new Set(
      body.mealPlan.meals.map((m: any) => m.recipe.id),
    );
    expect(uniqueRecipeIds.size).toBeGreaterThanOrEqual(4);
  });

  it("Professional trainer: advanced fields honored by generator", async () => {
    if (!proToken) throw new Error("pro login failed");

    const { status, body } = await generate(proToken, {
      planName: "pro-respect-test",
      fitnessGoal: "muscle_gain",
      dailyCalorieTarget: 2500,
      days: 3,
      mealsPerDay: 3,
      minProtein: 30,
      maxCalories: 800,
    });

    expect(status).toBe(200);
    expect(body?.mealPlan?.meals?.length).toBe(9);

    // Every meal in the plan must respect the maxCalories constraint (with
    // some tolerance for the calorie-range relaxation). Before the tier gate,
    // this would also pass; but the assertion now proves Pro still gets the
    // filtered behavior after the strip code was added.
    const caloriesAll = body.mealPlan.meals.map(
      (m: any) => m.recipe.caloriesKcal,
    );
    const max = Math.max(...caloriesAll);
    // Pro should respect maxCalories=800 (with possible calorie relaxation up
    // to 1.5x, so <= 1200). Much better than unconstrained 2500-cal meals.
    expect(max).toBeLessThanOrEqual(1200);
  });
});
