// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";

// Regression: Phase B + C of the generator refactor (2026-04-13).
// Before, a 3-day × 3-meal plan with a narrow filter could return the
// SAME recipe 9 times. These tests assert:
//   - Plan-level dedup: unique recipes >= min(available, totalMeals)
//   - Variety: no single mainIngredientTag appears in > 40% of meals
// Run against localhost:4000 by default; override with BASE_URL.

const BASE = "http://localhost:4000";

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
  return res.json();
}

describe("Meal plan generator — dedup + variety (Phase B+C regression)", () => {
  let token: string;

  beforeAll(async () => {
    token = await login("trainer.test@evofitmeals.com", "TestTrainer123!");
    if (!token) throw new Error("login failed — dev server running?");
  });

  it("3-day × 3-meal balanced plan has varied recipes (no 9x repetition)", async () => {
    const data = await generate(token, {
      planName: "variety-test",
      fitnessGoal: "balanced",
      dailyCalorieTarget: 2000,
      days: 3,
      mealsPerDay: 3,
    });

    const mealPlan = data?.mealPlan;
    expect(mealPlan, "generation failed").toBeTruthy();
    const meals: any[] = mealPlan.meals || [];
    expect(meals.length).toBe(9);

    const recipeIds = meals.map((m: any) => m.recipe.id);
    const uniqueRecipeCount = new Set(recipeIds).size;

    // Expect at least 5 unique recipes in a 9-meal plan. Before Phase B,
    // this could be as low as 1.
    expect(
      uniqueRecipeCount,
      `Generator repeating recipes. Got ${uniqueRecipeCount}/9 unique.`,
    ).toBeGreaterThanOrEqual(5);
  });

  it("no single mainIngredientTag exceeds 40% of meals in a balanced plan", async () => {
    const data = await generate(token, {
      planName: "variety-test-2",
      fitnessGoal: "balanced",
      dailyCalorieTarget: 2000,
      days: 3,
      mealsPerDay: 3,
    });
    const meals: any[] = data?.mealPlan?.meals || [];
    expect(meals.length).toBe(9);

    const tagCounts = new Map<string, number>();
    for (const m of meals) {
      for (const t of (m.recipe.mainIngredientTags || []) as string[]) {
        const key = String(t).toLowerCase();
        tagCounts.set(key, (tagCounts.get(key) || 0) + 1);
      }
    }

    // 40% of 9 meals = 3.6 → cap is 4 occurrences (inclusive). In a balanced
    // plan with no narrow filters, variety enforcement should hold strictly.
    const maxCount = Math.max(0, ...Array.from(tagCounts.values()));
    expect(
      maxCount,
      `Variety violated: top tag appears ${maxCount}/9 times. Counts: ${JSON.stringify(Object.fromEntries(tagCounts))}`,
    ).toBeLessThanOrEqual(4);
  });

  it("muscle_gain with high protein constraint still has varied recipes", async () => {
    const data = await generate(token, {
      planName: "variety-test-3",
      fitnessGoal: "muscle_gain",
      dailyCalorieTarget: 2500,
      days: 3,
      mealsPerDay: 3,
      minProtein: 25,
    });
    const meals: any[] = data?.mealPlan?.meals || [];
    // 2026-04-22 QA tightening: was a silent `return` if pool empty, which
    // let the test vacuously pass on an under-seeded DB. Now fails loudly
    // with a fixable message so CI catches it.
    expect(
      meals.length,
      `DB under-seeded: no high-protein recipes matched minProtein:25. ` +
        `Run \`docker exec fitnessmealplanner-postgres psql -U postgres -d fitmeal ` +
        `-c "SELECT COUNT(*) FROM recipes WHERE is_approved=true AND protein_grams::numeric >= 25"\` ` +
        `to check. Seed more recipes if count is 0.`,
    ).toBe(9);
    const uniqueRecipes = new Set(meals.map((m: any) => m.recipe.id)).size;
    // Before Phase B+C, this test returned 9 identical ribeye meals.
    // Now we expect at least 4 unique recipes even under a tight filter.
    expect(uniqueRecipes).toBeGreaterThanOrEqual(4);
  });

  // ---- 2026-04-22 regression: prod bugs triangulated against meals.evofit.io ----
  //
  // These two reproduce the ACTUAL failure modes that shipped to production.
  // The previous suite (above) tested the dedup logic but the upstream cap of
  // limit: 100 in storage.searchRecipes let the bugs survive in prod anyway.
  // These tests hit narrow-filter paths that collapse the candidate pool hard.

  it("maxIngredients=3 returns 9 unique recipes (prod bug: Silken Tofu x9)", async () => {
    const data = await generate(token, {
      planName: "maxIngredients-regression",
      fitnessGoal: "weight_loss",
      dailyCalorieTarget: 1800,
      days: 3,
      mealsPerDay: 3,
      maxIngredients: 3,
    });
    const meals: any[] = data?.mealPlan?.meals || [];
    // With the 2026-04-22 soft-filter fix, the generator falls back to the
    // wider 2000-recipe pool when < totalMeals match maxIngredients≤3. So
    // meals.length === 0 would indicate the generator is broken OR the DB
    // has fewer than 9 approved recipes total — either way we want a loud
    // failure, not a silent skip.
    expect(
      meals.length,
      `maxIngredients=3 returned 0 meals — soft-filter fallback is broken ` +
        `or DB has <9 approved recipes. Check generator log for pool size.`,
    ).toBe(9);
    const uniqueRecipes = new Set(meals.map((m: any) => m.recipe.id)).size;
    // Prod returned 1 unique recipe x9 before the fix. Even with a tight
    // filter, generator must surface at least 5 distinct recipes.
    expect(
      uniqueRecipes,
      `maxIngredients=3 repetition bug: got ${uniqueRecipes}/9 unique recipes.`,
    ).toBeGreaterThanOrEqual(5);
  });

  it("minProtein=30 maxCalories=800 enforces ingredient variety (prod bug: 9x beef)", async () => {
    const data = await generate(token, {
      planName: "tight-macro-variety",
      fitnessGoal: "muscle_gain",
      dailyCalorieTarget: 2500,
      days: 3,
      mealsPerDay: 3,
      minProtein: 30,
      maxCalories: 800,
    });
    const meals: any[] = data?.mealPlan?.meals || [];
    expect(
      meals.length,
      `minProtein:30 maxCalories:800 returned 0 meals — DB under-seeded. ` +
        `Expected ≥200 recipes matching those constraints (prod has ~1500).`,
    ).toBe(9);

    const tagCounts = new Map<string, number>();
    for (const m of meals) {
      for (const t of (m.recipe.mainIngredientTags || []) as string[]) {
        const key = String(t).toLowerCase();
        tagCounts.set(key, (tagCounts.get(key) || 0) + 1);
      }
    }
    const maxCount = Math.max(0, ...Array.from(tagCounts.values()));
    // Prod returned 9 beef meals before the fix. Variety cap 40% of 9 = 4,
    // but with tight filters allow up to 6 (67%) as degraded-pool fallback.
    expect(
      maxCount,
      `ingredient variety violated: top tag x${maxCount}/9. Counts: ${JSON.stringify(Object.fromEntries(tagCounts))}`,
    ).toBeLessThanOrEqual(6);
  });
});
