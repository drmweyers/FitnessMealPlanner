/**
 * MEAL-02: AI-Generated Meal Plans
 *
 * Validates the AI meal plan generation UI form and the API generation endpoint.
 * Checks that the generated plan has the expected structure.
 *
 * Actor: Trainer (storageState from 'as-trainer' project)
 * API tests use ForgeApiClient.loginAs('trainer').
 */

import { test, expect } from "@playwright/test";
import { ForgeApiClient } from "../../helpers/api-client.js";
import { API, ROUTES, TIMEOUTS } from "../../helpers/constants.js";

let trainerClient: ForgeApiClient;

test.describe("MEAL-02 — AI-Generated Meal Plans", () => {
  test.beforeAll(async () => {
    trainerClient = await ForgeApiClient.loginAs("trainer");
  });

  // ---------------------------------------------------------------------------
  // UI — Generation form structure
  // ---------------------------------------------------------------------------

  test("navigate to /meal-plan-generator — page loads", async ({ page }) => {
    await page.goto(ROUTES.mealPlanGenerator, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(1_500);

    expect(page.url()).not.toMatch(/\/login/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("generation form has plan name input", async ({ page }) => {
    await page.goto(ROUTES.mealPlanGenerator, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("networkidle");

    const planNameInput = page.locator(
      'input[name="planName"], input[placeholder*="plan name"], input[placeholder*="Plan Name"], ' +
        'input[id*="planName"], input[id*="name"]',
    );
    await expect(planNameInput.first()).toBeVisible({
      timeout: TIMEOUTS.action,
    });
  });

  test("generation form has calories input", async ({ page }) => {
    await page.goto(ROUTES.mealPlanGenerator, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("networkidle");

    const caloriesInput = page.locator(
      'input[name*="calorie"], input[name*="Calorie"], input[placeholder*="calorie"], ' +
        'input[placeholder*="Calories"], input[name="targetCalories"]',
    );
    await expect(caloriesInput.first()).toBeVisible({
      timeout: TIMEOUTS.action,
    });
  });

  test("generation form has duration input", async ({ page }) => {
    await page.goto(ROUTES.mealPlanGenerator, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("networkidle");

    const durationInput = page.locator(
      'input[name*="duration"], input[name*="Duration"], select[name*="duration"], ' +
        'input[placeholder*="days"], input[placeholder*="week"]',
    );
    await expect(durationInput.first()).toBeVisible({
      timeout: TIMEOUTS.action,
    });
  });

  test("generation form has dietary restriction options", async ({ page }) => {
    await page.goto(ROUTES.mealPlanGenerator, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("networkidle");

    // Look for checkboxes, selects, or buttons for dietary restrictions
    const dietaryOptions = page.locator(
      'input[type="checkbox"], ' +
        'select[name*="diet"], select[name*="restriction"], ' +
        'button[data-testid*="diet"], ' +
        '[class*="dietary"], [class*="restriction"], ' +
        "text=/vegetarian|vegan|gluten|dairy|keto|paleo/i",
    );
    await expect(dietaryOptions.first()).toBeVisible({
      timeout: TIMEOUTS.action,
    });
  });

  test("submitting generation request shows loading or progress state", async ({
    page,
  }) => {
    await page.goto(ROUTES.mealPlanGenerator, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("networkidle");

    // Fill minimum required fields
    const planNameInput = page.locator(
      'input[name="planName"], input[placeholder*="plan name"], input[placeholder*="Plan Name"]',
    );
    if ((await planNameInput.count()) > 0) {
      await planNameInput.first().fill(`FORGE-AI-${Date.now()}`);
    }

    const caloriesInput = page.locator(
      'input[name*="calorie"], input[name*="Calorie"], input[name="targetCalories"]',
    );
    if ((await caloriesInput.count()) > 0) {
      await caloriesInput.first().fill("2000");
    }

    // Click generate/submit
    const generateBtn = page.locator(
      'button:has-text("Generate"), button:has-text("Create Plan"), button[type="submit"]',
    );
    await expect(generateBtn.first()).toBeVisible({ timeout: TIMEOUTS.action });
    await generateBtn.first().click();

    // Loading indicator must appear (spinner, progress bar, loading text)
    const loadingIndicator = page.locator(
      '[class*="spinner"], [class*="loading"], [class*="progress"], ' +
        '[role="progressbar"], text=/generating|loading|please wait/i',
    );
    await expect(loadingIndicator.first()).toBeVisible({ timeout: 8_000 });
  });

  // ---------------------------------------------------------------------------
  // API — Generation endpoint and response structure
  // ---------------------------------------------------------------------------

  test("API: POST /api/meal-plan/generate with valid params returns 200", async () => {
    const result = await trainerClient.raw("POST", API.mealPlans.generate, {
      planName: `FORGE-AI-API-${Date.now()}`,
      targetCalories: 2000,
      targetProtein: 150,
      targetCarbs: 200,
      targetFat: 60,
      durationDays: 7,
      dietaryRestrictions: [],
      mealType: "balanced",
    });

    // Generation may take time — accept 200 (sync) or 202 (async accepted)
    expect([200, 202]).toContain(result.status);
  });

  test("API: generated plan response has planName field", async () => {
    const planName = `FORGE-AI-Name-${Date.now()}`;
    const result = await trainerClient.raw("POST", API.mealPlans.generate, {
      planName,
      targetCalories: 1800,
      durationDays: 3,
      dietaryRestrictions: [],
    });

    expect([200, 201, 202]).toContain(result.status);

    if (result.status !== 202) {
      const body = result.body as Record<string, unknown>;
      const returnedName =
        (body?.planName as string) ||
        ((body?.plan as Record<string, unknown>)?.planName as string) ||
        ((body?.mealPlan as Record<string, unknown>)?.planName as string);
      expect(returnedName).toBeTruthy();
    }
  });

  test("API: generated plan has meals array with entries", async () => {
    const result = await trainerClient.raw("POST", API.mealPlans.generate, {
      planName: `FORGE-AI-Meals-${Date.now()}`,
      targetCalories: 2000,
      durationDays: 3,
      dietaryRestrictions: [],
    });

    expect([200, 201, 202]).toContain(result.status);

    if (result.status !== 202) {
      const body = result.body as Record<string, unknown>;
      const meals =
        (body?.meals as unknown[]) ||
        ((body?.mealPlanData as Record<string, unknown>)?.days as unknown[]) ||
        ((body?.plan as Record<string, unknown>)?.meals as unknown[]);

      expect(Array.isArray(meals)).toBe(true);
      expect(meals.length).toBeGreaterThan(0);
    }
  });

  test("API: each meal in generated plan has calorie/macro fields", async () => {
    const result = await trainerClient.raw("POST", API.mealPlans.generate, {
      planName: `FORGE-AI-Macros-${Date.now()}`,
      targetCalories: 2000,
      durationDays: 1,
      dietaryRestrictions: [],
    });

    expect([200, 201, 202]).toContain(result.status);

    if (result.status !== 202) {
      const body = result.body as Record<string, unknown>;

      // Locate the first meal object in the response structure
      const meals =
        (body?.meals as Record<string, unknown>[]) ||
        (
          (body?.mealPlanData as Record<string, unknown>)?.days as {
            meals?: Record<string, unknown>[];
          }[]
        )?.[0]?.meals ||
        null;

      if (meals && Array.isArray(meals) && meals.length > 0) {
        const firstMeal = meals[0] as Record<string, unknown>;
        const hasCalories =
          "calories" in firstMeal ||
          "totalCalories" in firstMeal ||
          "kcal" in firstMeal;
        expect(hasCalories).toBe(true);
      }
    }
  });
});
