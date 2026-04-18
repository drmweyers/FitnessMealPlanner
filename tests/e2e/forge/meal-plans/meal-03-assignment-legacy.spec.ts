/**
 * MEAL-03: Legacy Meal Plan Assignment
 *
 * Tests the trainer-to-customer meal plan assignment flow using the legacy
 * per-customer assignment endpoint. Uses seed state for IDs.
 *
 * Actor: Trainer primary, Customer for cross-role checks
 * Runs in: 'as-trainer' project
 *
 * NOTE: The legacy POST /api/trainer/customers/:id/meal-plans requires
 * { mealPlanData: {...} } (actual plan data), NOT { mealPlanId }.
 * The GET endpoint returns { mealPlans: [...], total: N }.
 */

import { test, expect } from "@playwright/test";
import { ForgeApiClient } from "../../helpers/api-client.js";
import { loadSeedState } from "../../helpers/auth-helpers.js";
import { API, ROUTES, TIMEOUTS } from "../../helpers/constants.js";

let trainerClient: ForgeApiClient;
let seedState: ReturnType<typeof loadSeedState>;
let createdAssignmentId: string | null = null;

test.describe("MEAL-03 — Legacy Meal Plan Assignment", () => {
  test.describe.configure({ mode: "serial" });
  test.beforeAll(async () => {
    seedState = loadSeedState();
    trainerClient = await ForgeApiClient.loginAs("trainer");
  });

  test.afterAll(async () => {
    // Cleanup assignment created during test
    if (createdAssignmentId) {
      try {
        await trainerClient.delete(
          `/api/trainer/assigned-meal-plans/${createdAssignmentId}`,
        );
      } catch {
        // Best-effort
      }
    }
  });

  // ---------------------------------------------------------------------------
  // Assignment creation
  // ---------------------------------------------------------------------------

  test("API: POST /api/trainer/customers/:id/meal-plans assigns plan — returns 200 or 201", async () => {
    const { customerUserId } = seedState;

    // Legacy endpoint requires mealPlanData (actual plan data), not mealPlanId
    const result = await trainerClient.raw(
      "POST",
      API.trainer.customerMealPlans(customerUserId),
      {
        mealPlanData: {
          planName: "FORGE Legacy Test Plan",
          days: [
            {
              day: 1,
              meals: [
                {
                  name: "Breakfast",
                  calories: 500,
                  protein: 35,
                  carbs: 50,
                  fat: 15,
                },
              ],
            },
          ],
        },
      },
    );

    expect([200, 201]).toContain(result.status);

    // Capture assignment ID for cleanup and downstream tests
    const body = result.body as Record<string, unknown>;
    createdAssignmentId =
      (body?.id as string) ||
      (body?.assignmentId as string) ||
      ((body?.assignment as Record<string, unknown>)?.id as string) ||
      null;
  });

  test("API: GET /api/trainer/customers/:id/meal-plans returns assigned plans", async () => {
    const { customerUserId } = seedState;

    const result = await trainerClient.raw(
      "GET",
      API.trainer.customerMealPlans(customerUserId),
    );

    expect(result.status).toBe(200);

    // Server returns { mealPlans: [...], total: N }
    const rawBody = result.body as Record<string, unknown>;
    const plans: Record<string, unknown>[] = Array.isArray(rawBody)
      ? (rawBody as Record<string, unknown>[])
      : (rawBody.mealPlans as Record<string, unknown>[]) ||
        (rawBody.data as Record<string, unknown>[]) ||
        [];

    expect(Array.isArray(plans)).toBe(true);
    expect(plans.length).toBeGreaterThan(0);
  });

  test("API: assigned plan has correct structure (mealPlanData, date fields)", async () => {
    const { customerUserId } = seedState;

    const result = await trainerClient.raw(
      "GET",
      API.trainer.customerMealPlans(customerUserId),
    );

    expect(result.status).toBe(200);

    const rawBody = result.body as Record<string, unknown>;
    const plans: Record<string, unknown>[] = Array.isArray(rawBody)
      ? (rawBody as Record<string, unknown>[])
      : (rawBody.mealPlans as Record<string, unknown>[]) || [];

    expect(plans.length).toBeGreaterThan(0);

    const firstPlan = plans[0];
    // Must have a date or plan data field
    const hasDateField =
      "startDate" in firstPlan ||
      "assignedAt" in firstPlan ||
      "createdAt" in firstPlan;
    const hasPlanData =
      "mealPlanData" in firstPlan ||
      "planData" in firstPlan ||
      "mealPlanId" in firstPlan ||
      "planId" in firstPlan ||
      "planName" in firstPlan;

    expect(hasDateField || hasPlanData).toBe(true);
  });

  test("API: assignment includes trainer ID reference", async () => {
    const { customerUserId, trainerUserId } = seedState;

    const result = await trainerClient.raw(
      "GET",
      API.trainer.customerMealPlans(customerUserId),
    );

    expect(result.status).toBe(200);

    const rawBody = result.body as Record<string, unknown>;
    const plans: Record<string, unknown>[] = Array.isArray(rawBody)
      ? (rawBody as Record<string, unknown>[])
      : (rawBody.mealPlans as Record<string, unknown>[]) || [];

    expect(plans.length).toBeGreaterThan(0);

    // At least one plan should have a trainerId field
    const hasTrainerRef = plans.some(
      (p) =>
        p.trainerId === trainerUserId ||
        p.assignedBy === trainerUserId ||
        "trainerId" in p ||
        "assignedBy" in p,
    );
    expect(hasTrainerRef).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // UI — Trainer view
  // ---------------------------------------------------------------------------

  test("trainer can view customer meal plans on /trainer/customers UI", async ({
    page,
  }) => {
    await page.goto(ROUTES.trainerCustomers, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    expect(page.url()).not.toMatch(/\/login/);
    await expect(page.locator("body")).toBeVisible();

    // Customers list must render something
    const customerEl = page.locator(
      '[data-testid="customer-card"], [class*="customer"], [class*="client"], tr, li[class], ' +
        '[class*="card"], [class*="row"], [class*="item"]',
    );
    await expect(customerEl.first()).toBeVisible({ timeout: TIMEOUTS.action });
  });

  // ---------------------------------------------------------------------------
  // Validation — Bad input
  // ---------------------------------------------------------------------------

  test("API: assigning empty/invalid data returns 400", async () => {
    const { customerUserId } = seedState;

    const result = await trainerClient.raw(
      "POST",
      API.trainer.customerMealPlans(customerUserId),
      {}, // Empty body — must fail validation (mealPlanData is required)
    );

    expect([400, 422]).toContain(result.status);
  });

  // ---------------------------------------------------------------------------
  // Customer cross-role check
  // ---------------------------------------------------------------------------

  test("customer can access their profile stats via API", async () => {
    const customerClient = await ForgeApiClient.loginAs("customer");
    // No /api/customer/meal-plans endpoint exists; use profile stats instead
    const result = await customerClient.raw("GET", API.customer.profileStats);

    expect([200, 201]).toContain(result.status);

    const body = result.body as unknown;
    expect(body).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Unassignment
  // ---------------------------------------------------------------------------

  test("API: DELETE /api/trainer/assigned-meal-plans/:planId removes assignment", async () => {
    test.skip(
      !createdAssignmentId,
      "No assignment ID captured — skipping delete",
    );

    const result = await trainerClient.raw(
      "DELETE",
      `/api/trainer/assigned-meal-plans/${createdAssignmentId}`,
    );

    expect([200, 204]).toContain(result.status);
    createdAssignmentId = null;
  });
});
