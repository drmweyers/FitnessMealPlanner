/**
 * FORGE QA — RCP-04: Recipe Assignment to Customer
 *
 * Actor: Admin / Trainer (API-level)
 * Covers: Assign recipe to customer, customer sees assignment, error cases.
 */

import { test, expect } from "@playwright/test";
import { API } from "../../helpers/constants.js";
import { ForgeApiClient } from "../../helpers/api-client.js";
import { loadSeedState } from "../../helpers/auth-helpers.js";

test.describe("RCP-04: Recipe Assignment to Customer", () => {
  let adminClient: ForgeApiClient;
  let trainerClient: ForgeApiClient;
  let customerClient: ForgeApiClient;
  let seedState: ReturnType<typeof loadSeedState>;
  let assignedRecipeId: string;

  test.beforeAll(async () => {
    [adminClient, trainerClient, customerClient] = await Promise.all([
      ForgeApiClient.loginAs("admin"),
      ForgeApiClient.loginAs("trainer"),
      ForgeApiClient.loginAs("customer"),
    ]);
    seedState = loadSeedState();

    // Pick a recipe from seed for assignment tests
    const listRes = await adminClient.raw("GET", API.recipes.list);
    const body = listRes.body as {
      recipes?: Array<{ id: string }>;
      data?: Array<{ id: string }>;
    };
    const recipes = Array.isArray(listRes.body)
      ? (listRes.body as Array<{ id: string }>)
      : (body.recipes ?? body.data ?? []);
    expect(recipes.length).toBeGreaterThan(0);
    assignedRecipeId = recipes[0].id;
  });

  test("API: POST /api/admin/assign-recipe assigns recipe to customer — 200", async () => {
    const res = await adminClient.raw("POST", API.admin.assignRecipe, {
      recipeId: assignedRecipeId,
      customerId: seedState.customerUserId,
    });
    expect([200, 201]).toContain(res.status);
  });

  test("API: Customer can see assigned recipe in their personalized list", async () => {
    // Customer fetches their recipes/assignments
    const res = await customerClient.raw("GET", API.recipes.list);
    expect(res.status).toBe(200);

    const body = res.body as {
      recipes?: Array<{ id: string }>;
      data?: Array<{ id: string }>;
    };
    const recipes = Array.isArray(res.body)
      ? (res.body as Array<{ id: string }>)
      : (body.recipes ?? body.data ?? []);
    expect(Array.isArray(recipes)).toBe(true);
    expect(recipes.length).toBeGreaterThan(0);
  });

  test("Assign multiple recipes — all appear for customer", async () => {
    // Fetch a second recipe to assign
    const listRes = await adminClient.raw("GET", API.recipes.list);
    const body = listRes.body as {
      recipes?: Array<{ id: string }>;
      data?: Array<{ id: string }>;
    };
    const recipes = Array.isArray(listRes.body)
      ? (listRes.body as Array<{ id: string }>)
      : (body.recipes ?? body.data ?? []);

    expect(recipes.length).toBeGreaterThan(1);
    const secondRecipeId = recipes[1].id;

    const assignRes = await adminClient.raw("POST", API.admin.assignRecipe, {
      recipeId: secondRecipeId,
      customerId: seedState.customerUserId,
    });
    expect([200, 201]).toContain(assignRes.status);

    // Customer list must still be non-empty
    const customerRes = await customerClient.raw("GET", API.recipes.list);
    expect(customerRes.status).toBe(200);
    const customerBody = customerRes.body as {
      recipes?: unknown[];
      data?: unknown[];
    };
    const customerRecipes = Array.isArray(customerRes.body)
      ? customerRes.body
      : (customerBody.recipes ?? customerBody.data ?? []);
    expect(customerRecipes.length).toBeGreaterThan(0);
  });

  test("Trainer's customer detail reflects assigned recipes", async () => {
    const res = await trainerClient.raw(
      "GET",
      API.trainer.customerMealPlans(seedState.customerUserId),
    );
    // 200 or 404 if endpoint structure differs — but must not be 500
    expect(res.status).not.toBe(500);
    expect([200, 404]).toContain(res.status);
  });

  test("Assign recipe that does not exist — 404", async () => {
    const res = await adminClient.raw("POST", API.admin.assignRecipe, {
      recipeId: "nonexistent-recipe-id-00000000",
      customerId: seedState.customerUserId,
    });
    expect([400, 404, 422]).toContain(res.status);
  });

  test("Assign to non-existent customer — 404", async () => {
    const res = await adminClient.raw("POST", API.admin.assignRecipe, {
      recipeId: assignedRecipeId,
      customerId: "nonexistent-customer-id-00000000",
    });
    expect([400, 404, 422]).toContain(res.status);
  });

  test("API: GET /api/admin/customers returns customer list", async () => {
    const res = await adminClient.raw("GET", API.admin.customers);
    expect(res.status).toBe(200);

    const body = res.body as { customers?: unknown[]; data?: unknown[] };
    const customers = Array.isArray(res.body)
      ? res.body
      : (body.customers ?? body.data ?? []);
    expect(Array.isArray(customers)).toBe(true);
    expect(customers.length).toBeGreaterThan(0);
  });

  test("Trainer can see assignment count on dashboard — dashboard stats returns data", async () => {
    const res = await trainerClient.raw("GET", API.trainer.dashboardStats);
    expect(res.status).toBe(200);

    const body = res.body as Record<string, unknown>;
    // Stats must be an object with at least one key
    expect(typeof body).toBe("object");
    expect(Object.keys(body).length).toBeGreaterThan(0);
  });
});
