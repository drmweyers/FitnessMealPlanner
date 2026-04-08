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

let trainerClient: ForgeApiClient;
let createdPlanId: string;

test.describe("MEAL-01 — Manual Meal Plan CRUD", () => {
  test.beforeAll(async () => {
    trainerClient = await ForgeApiClient.loginAs("trainer");
  });

  test.afterAll(async () => {
    // Cleanup — delete the plan created during this run if it still exists
    if (createdPlanId) {
      try {
        await trainerClient.delete(API.trainer.mealPlan(createdPlanId));
      } catch {
        // Best-effort cleanup
      }
    }
  });

  // ---------------------------------------------------------------------------
  // UI — Page structure
  // ---------------------------------------------------------------------------

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
      'input[name="planName"], input[placeholder*="name"], input[placeholder*="Plan"], input[id*="name"]',
    );
    await expect(nameInput.first()).toBeVisible({ timeout: TIMEOUTS.action });
  });

  test("manual-meal-plan page has calorie or macro input fields", async ({
    page,
  }) => {
    await page.goto(ROUTES.manualMealPlan, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    const macroInput = page.locator(
      'input[name*="calorie"], input[name*="Calorie"], input[placeholder*="calorie"], ' +
        'input[name*="protein"], input[name*="carb"], input[name*="fat"], ' +
        'input[placeholder*="Calories"], input[type="number"]',
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

  // ---------------------------------------------------------------------------
  // API — CRUD operations
  // ---------------------------------------------------------------------------

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

    expect(result.status).toBe(201);

    const body = result.body as Record<string, unknown>;
    expect(body).toBeDefined();

    // Extract the created plan ID
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

    const body = result.body as unknown[];
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);

    const found = body.some(
      (p) =>
        (p as Record<string, unknown>).id === createdPlanId ||
        (p as Record<string, unknown>).planName === PLAN_NAME,
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

    const body = result.body as Record<string, unknown>;
    expect(body.id || body.planId).toBeTruthy();

    const planName =
      (body.planName as string) ||
      (body.name as string) ||
      ((body.plan as Record<string, unknown>)?.planName as string);
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

    // Either the response reflects the update OR a subsequent GET does
    if (returnedName) {
      expect(returnedName).toBe(updatedName);
    } else {
      // Verify via GET
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

    const body = result.body as unknown[];
    expect(Array.isArray(body)).toBe(true);

    const stillPresent = body.some(
      (p) =>
        (p as Record<string, unknown>).id === createdPlanId ||
        (p as Record<string, unknown>).planName === PLAN_NAME,
    );
    expect(stillPresent).toBe(false);

    // Mark as cleaned so afterAll does not double-delete
    createdPlanId = "";
  });
});
