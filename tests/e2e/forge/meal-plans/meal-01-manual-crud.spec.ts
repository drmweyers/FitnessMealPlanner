/**
 * MEAL-01: Manual Meal Plan CRUD
 *
 * Validates manual meal plan creation, reading, updating, and deletion via
 * both the trainer UI and the REST API.
 *
 * Actor: Trainer (storageState from 'as-trainer' project)
 * API tests use ForgeApiClient.loginAs('trainer').
 */

import { test, expect } from "@playwright/test";
import { ForgeApiClient } from "../../helpers/api-client.js";
import { API, ROUTES, TIMEOUTS } from "../../helpers/constants.js";

const PLAN_NAME = `FORGE-TEST-Manual-${Date.now()}`;

// ---------------------------------------------------------------------------
// UI — Page structure (parallel, independent of API tests)
// ---------------------------------------------------------------------------

test.describe("MEAL-01 — Manual Meal Plan CRUD — UI", () => {
  test("navigate to /trainer/manual-meal-plan — page loads", async ({
    page,
  }) => {
    await page.goto(ROUTES.manualMealPlan, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1_500);

    expect(page.url()).not.toMatch(/\/login/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("manual-meal-plan page has plan name input field", async ({ page }) => {
    await page.goto(ROUTES.manualMealPlan, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    const nameInput = page.locator(
      'input[name="planName"], input[placeholder*="name" i], input[placeholder*="plan" i], ' +
        'input[id*="name" i], input[id*="plan" i], ' +
        'input[type="text"], textarea',
    );
    await expect(nameInput.first()).toBeVisible({ timeout: TIMEOUTS.action });
  });

  test("manual-meal-plan page has calorie or macro input fields", async ({
    page,
  }) => {
    await page.goto(ROUTES.manualMealPlan, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    const macroInput = page.locator(
      'input[name*="calorie" i], input[placeholder*="calorie" i], ' +
        'input[name*="protein" i], input[name*="carb" i], input[name*="fat" i], ' +
        'input[placeholder*="Calories" i], input[type="number"], ' +
        'input[name*="macro" i], input[placeholder*="protein" i], ' +
        'input[placeholder*="carb" i], input[placeholder*="fat" i]',
    );
    await expect(macroInput.first()).toBeVisible({ timeout: TIMEOUTS.action });
  });

  test("navigate to /trainer/meal-plans — page loads with plan list", async ({
    page,
  }) => {
    await page.goto(ROUTES.trainerMealPlans, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    expect(page.url()).not.toMatch(/\/login/);
    await expect(page.locator("body")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// API — CRUD operations (serial, each step depends on the previous)
// ---------------------------------------------------------------------------

test.describe("MEAL-01 — Manual Meal Plan CRUD — API", () => {
  test.describe.configure({ mode: "serial" });

  let trainerClient: ForgeApiClient;
  let createdPlanId: string;

  test.beforeAll(async () => {
    trainerClient = await ForgeApiClient.loginAs("trainer");
  });

  test.afterAll(async () => {
    if (createdPlanId) {
      try {
        await trainerClient.delete(API.trainer.mealPlan(createdPlanId));
      } catch {
        // Best-effort cleanup
      }
    }
  });

  test("API: POST /api/trainer/meal-plans creates a plan — returns 201 with id", async () => {
    const result = await trainerClient.raw("POST", API.trainer.mealPlans, {
      planName: PLAN_NAME,
      description: "FORGE automated test plan",
      targetCalories: 2200,
      targetProtein: 180,
      targetCarbs: 220,
      targetFat: 65,
      durationDays: 7,
      mealPlanData: {
        days: [
          {
            day: 1,
            meals: [
              {
                name: "Breakfast",
                calories: 550,
                protein: 40,
                carbs: 60,
                fat: 15,
              },
            ],
          },
        ],
      },
    });

    expect([200, 201]).toContain(result.status);

    const body = result.body as Record<string, unknown>;
    expect(body).toBeDefined();

    createdPlanId =
      (body?.id as string) ||
      ((body?.plan as Record<string, unknown>)?.id as string) ||
      ((body?.mealPlan as Record<string, unknown>)?.id as string);

    expect(createdPlanId).toBeTruthy();
  });

  test("API: GET /api/trainer/meal-plans returns the created plan", async () => {
    test.skip(!createdPlanId, "Plan not created — skipping list check");

    const result = await trainerClient.raw("GET", API.trainer.mealPlans);

    expect(result.status).toBe(200);

    const rawBody = result.body as Record<string, unknown>;
    const plans: Record<string, unknown>[] = Array.isArray(rawBody)
      ? (rawBody as Record<string, unknown>[])
      : (rawBody.mealPlans as Record<string, unknown>[]) ||
        (rawBody.data as Record<string, unknown>[]) ||
        [];

    expect(Array.isArray(plans)).toBe(true);
    expect(plans.length).toBeGreaterThan(0);

    const found = plans.some(
      (p) => p.id === createdPlanId || p.planName === PLAN_NAME,
    );
    expect(found).toBe(true);
  });

  test("API: GET /api/trainer/meal-plans/:planId returns plan detail", async () => {
    test.skip(!createdPlanId, "Plan not created — skipping detail check");

    const result = await trainerClient.raw(
      "GET",
      API.trainer.mealPlan(createdPlanId),
    );

    expect(result.status).toBe(200);

    const rawBody = result.body as Record<string, unknown>;
    const body =
      (rawBody.mealPlan as Record<string, unknown>) ||
      (rawBody.plan as Record<string, unknown>) ||
      rawBody;
    expect(body.id || body.planId || rawBody.id).toBeTruthy();

    const planName =
      (body.planName as string) ||
      (body.name as string) ||
      (rawBody.planName as string);
    expect(planName).toBe(PLAN_NAME);
  });

  test("API: PUT /api/trainer/meal-plans/:planId updates plan — returns 200", async () => {
    test.skip(!createdPlanId, "Plan not created — skipping update check");

    const updatedName = `${PLAN_NAME}-updated`;
    const result = await trainerClient.raw(
      "PUT",
      API.trainer.mealPlan(createdPlanId),
      {
        planName: updatedName,
        targetCalories: 2400,
      },
    );

    expect(result.status).toBe(200);

    const body = result.body as Record<string, unknown>;
    const returnedName =
      (body.planName as string) ||
      (body.name as string) ||
      ((body.plan as Record<string, unknown>)?.planName as string);

    if (returnedName) {
      expect(returnedName).toBe(updatedName);
    } else {
      const getResult = await trainerClient.raw(
        "GET",
        API.trainer.mealPlan(createdPlanId),
      );
      expect(getResult.status).toBe(200);
      const getBody = getResult.body as Record<string, unknown>;
      const fetchedName =
        (getBody.planName as string) || (getBody.name as string);
      expect(fetchedName).toBe(updatedName);
    }
  });

  test("API: DELETE /api/trainer/meal-plans/:planId removes plan — returns 200", async () => {
    test.skip(!createdPlanId, "Plan not created — skipping delete check");

    const result = await trainerClient.raw(
      "DELETE",
      API.trainer.mealPlan(createdPlanId),
    );

    expect([200, 204]).toContain(result.status);
  });

  test("API: GET /api/trainer/meal-plans after delete — deleted plan is absent", async () => {
    test.skip(!createdPlanId, "Plan not created — skipping post-delete check");

    const result = await trainerClient.raw("GET", API.trainer.mealPlans);

    expect(result.status).toBe(200);

    const rawBody = result.body as Record<string, unknown>;
    const plans: Record<string, unknown>[] = Array.isArray(rawBody)
      ? (rawBody as Record<string, unknown>[])
      : (rawBody.mealPlans as Record<string, unknown>[]) ||
        (rawBody.data as Record<string, unknown>[]) ||
        [];

    expect(Array.isArray(plans)).toBe(true);

    const stillPresent = plans.some(
      (p) => p.id === createdPlanId || p.planName === PLAN_NAME,
    );
    expect(stillPresent).toBe(false);

    createdPlanId = "";
  });
});
