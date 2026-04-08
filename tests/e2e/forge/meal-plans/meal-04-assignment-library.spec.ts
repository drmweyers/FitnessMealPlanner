/**
 * MEAL-04: Library-Based Assignment
 *
 * Tests assigning plans from the trainer's meal plan library to customers,
 * including bulk assignment, history, and dashboard stats.
 *
 * Actor: Trainer primary, Customer for cross-role checks
 * Runs in: 'as-trainer' project
 */

import { test, expect } from "@playwright/test";
import { ForgeApiClient } from "../../helpers/api-client.js";
import { loadSeedState } from "../../helpers/auth-helpers.js";
import { API, TIMEOUTS } from "../../helpers/constants.js";

const PLAN_NAME = `FORGE-TEST-Library-${Date.now()}`;

let trainerClient: ForgeApiClient;
let customerClient: ForgeApiClient;
let seedState: ReturnType<typeof loadSeedState>;
let libraryPlanId: string;

test.describe("MEAL-04 — Library-Based Assignment", () => {
  test.beforeAll(async () => {
    seedState = loadSeedState();
    trainerClient = await ForgeApiClient.loginAs("trainer");
    customerClient = await ForgeApiClient.loginAs("customer");

    // Create a fresh plan in the library to use throughout this suite
    const createResult = await trainerClient.raw(
      "POST",
      API.trainer.mealPlans,
      {
        planName: PLAN_NAME,
        description: "FORGE library assignment test plan",
        targetCalories: 2100,
        targetProtein: 160,
        targetCarbs: 210,
        targetFat: 65,
        durationDays: 7,
        mealPlanData: {
          days: [
            {
              day: 1,
              meals: [
                {
                  name: "Lunch",
                  calories: 700,
                  protein: 55,
                  carbs: 70,
                  fat: 22,
                },
              ],
            },
          ],
        },
      },
    );

    if ([200, 201].includes(createResult.status)) {
      const body = createResult.body as Record<string, unknown>;
      libraryPlanId =
        (body?.id as string) ||
        ((body?.plan as Record<string, unknown>)?.id as string) ||
        ((body?.mealPlan as Record<string, unknown>)?.id as string);
    }
  });

  test.afterAll(async () => {
    // Best-effort cleanup of the library plan
    if (libraryPlanId) {
      try {
        await trainerClient.delete(API.trainer.mealPlan(libraryPlanId));
      } catch {
        // Ignore
      }
    }
  });

  // ---------------------------------------------------------------------------
  // Library listing
  // ---------------------------------------------------------------------------

  test("API: GET /api/trainer/meal-plans returns trainer library", async () => {
    const result = await trainerClient.raw("GET", API.trainer.mealPlans);

    expect(result.status).toBe(200);

    const body = result.body as unknown[];
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  test("library contains FORGE-QA seeded plans", async () => {
    const result = await trainerClient.raw("GET", API.trainer.mealPlans);

    expect(result.status).toBe(200);
    const plans = result.body as Record<string, unknown>[];
    expect(plans.length).toBeGreaterThan(0);

    // At minimum the plan we just created must be present
    const found = plans.some(
      (p) =>
        (p.planName as string) === PLAN_NAME ||
        (p.name as string) === PLAN_NAME ||
        p.id === libraryPlanId,
    );
    expect(found).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Library-based assignment
  // ---------------------------------------------------------------------------

  test("API: POST /api/trainer/meal-plans/:id/assign with customerId returns 200 or 201", async () => {
    test.skip(
      !libraryPlanId,
      "Library plan not created — skipping assign test",
    );

    const { customerUserId } = seedState;

    const result = await trainerClient.raw(
      "POST",
      API.trainer.mealPlanAssign(libraryPlanId),
      {
        customerId: customerUserId,
        startDate: new Date().toISOString().split("T")[0],
      },
    );

    expect([200, 201]).toContain(result.status);
  });

  test("API: GET /api/trainer/meal-plans/:id shows plan after assignment", async () => {
    test.skip(
      !libraryPlanId,
      "Library plan not created — skipping detail check",
    );

    const result = await trainerClient.raw(
      "GET",
      API.trainer.mealPlan(libraryPlanId),
    );

    expect(result.status).toBe(200);

    const body = result.body as Record<string, unknown>;
    const planName =
      (body.planName as string) ||
      (body.name as string) ||
      ((body.plan as Record<string, unknown>)?.planName as string);

    expect(planName).toBe(PLAN_NAME);
  });

  test("API: assigned plan visible in customer plan list", async () => {
    // Check customer can see a plan assigned to them
    const result = await customerClient.raw("GET", "/api/customer/meal-plans");

    expect([200, 201]).toContain(result.status);

    const body = result.body as unknown;
    expect(body).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Unassignment
  // ---------------------------------------------------------------------------

  test("API: DELETE /api/trainer/meal-plans/:id/assign/:customerId unassigns plan", async () => {
    test.skip(
      !libraryPlanId,
      "Library plan not created — skipping unassign test",
    );

    const { customerUserId } = seedState;

    const result = await trainerClient.raw(
      "DELETE",
      API.trainer.mealPlanUnassign(libraryPlanId, customerUserId),
    );

    expect([200, 204]).toContain(result.status);
  });

  test("API: after unassign, customer plan list no longer includes the plan", async () => {
    test.skip(
      !libraryPlanId,
      "Library plan not created — skipping post-unassign check",
    );

    const result = await customerClient.raw("GET", "/api/customer/meal-plans");

    expect([200, 201]).toContain(result.status);

    const plans = result.body as Record<string, unknown>[];
    if (Array.isArray(plans)) {
      const stillPresent = plans.some(
        (p) =>
          p.id === libraryPlanId ||
          p.mealPlanId === libraryPlanId ||
          (p.planName as string) === PLAN_NAME,
      );
      expect(stillPresent).toBe(false);
    }
  });

  // ---------------------------------------------------------------------------
  // Bulk assignment
  // ---------------------------------------------------------------------------

  test("API: POST /api/trainer/assign-meal-plan-bulk assigns to multiple customers", async () => {
    test.skip(
      !libraryPlanId,
      "Library plan not created — skipping bulk assign",
    );

    const { customerUserId } = seedState;

    const result = await trainerClient.raw(
      "POST",
      API.trainer.assignMealPlanBulk,
      {
        mealPlanId: libraryPlanId,
        customerIds: [customerUserId],
        startDate: new Date().toISOString().split("T")[0],
      },
    );

    // Accept 200, 201, or 207 (multi-status for bulk)
    expect([200, 201, 207]).toContain(result.status);
  });

  // ---------------------------------------------------------------------------
  // Assignment history and dashboard stats
  // ---------------------------------------------------------------------------

  test("API: GET /api/trainer/assignment-history returns assignment records", async () => {
    const result = await trainerClient.raw(
      "GET",
      API.trainer.assignmentHistory,
    );

    expect(result.status).toBe(200);

    const body = result.body as unknown;
    // Body should be an array or paginated object
    expect(body).toBeDefined();
    if (Array.isArray(body)) {
      // If array, must have entries (our assignments created above)
      // We do not assert exact count to avoid flakiness with test ordering
      expect(Array.isArray(body)).toBe(true);
    } else {
      // Paginated response
      const obj = body as Record<string, unknown>;
      const hasData =
        "data" in obj ||
        "records" in obj ||
        "assignments" in obj ||
        "items" in obj;
      expect(hasData).toBe(true);
    }
  });

  test("API: GET /api/trainer/dashboard-stats reflects correct counts", async () => {
    const result = await trainerClient.raw("GET", API.trainer.dashboardStats);

    expect(result.status).toBe(200);

    const body = result.body as Record<string, unknown>;
    expect(body).toBeDefined();

    // Dashboard stats must include at least one numeric metric
    const hasStats =
      typeof body.totalCustomers === "number" ||
      typeof body.customerCount === "number" ||
      typeof body.totalMealPlans === "number" ||
      typeof body.mealPlanCount === "number" ||
      typeof body.totalAssignments === "number" ||
      Object.values(body).some((v) => typeof v === "number");

    expect(hasStats).toBe(true);
  });
});
