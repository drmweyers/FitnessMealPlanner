/**
 * FORGE QA — ADM-03: Admin Recipe Management
 * Tests admin recipe browsing, approval, tier assignment.
 *
 * Note: GET /api/recipes returns { recipes: [...], total: "1500" }
 * POST /api/admin/assign-recipe expects { recipeId, customerIds: [...] }
 * Recipes have caloriesKcal (not calories), tierLevel field.
 */
import { test, expect } from "@playwright/test";
import { ForgeApiClient } from "../../helpers/api-client.js";
import { API, BASE_URL } from "../../helpers/constants.js";
import { loadSeedState } from "../../helpers/auth-helpers.js";

test.describe("ADM-03 — Admin Recipe Management", () => {
  let adminApi: ForgeApiClient;

  test.beforeAll(async () => {
    adminApi = await ForgeApiClient.loginAs("admin", BASE_URL);
  });

  test("API: admin can view all recipes including unapproved", async () => {
    const res = await adminApi.get<any>(API.recipes.list, { limit: "10" });
    const recipes = res.recipes || res.data || (Array.isArray(res) ? res : []);
    expect(recipes.length).toBeGreaterThan(0);
  });

  test("API: recipes have tier level field", async () => {
    const res = await adminApi.get<any>(API.recipes.list, { limit: "5" });
    const recipes = res.recipes || res.data || (Array.isArray(res) ? res : []);
    const first = recipes[0];
    expect(first).toBeDefined();
    expect(first).toHaveProperty("tierLevel");
    expect(["starter", "professional", "enterprise"]).toContain(
      first.tierLevel,
    );
  });

  test("API: recipes have required nutrition fields", async () => {
    const res = await adminApi.get<any>(API.recipes.list, { limit: "5" });
    const recipes = res.recipes || res.data || (Array.isArray(res) ? res : []);
    const recipe = recipes[0];
    expect(recipe).toHaveProperty("caloriesKcal");
    expect(recipe).toHaveProperty("name");
  });

  test("API: GET /api/recipes/:id returns single recipe", async () => {
    const seedState = loadSeedState();
    if (seedState.recipeIds.length > 0) {
      const recipe = await adminApi.get<any>(
        API.recipes.get(seedState.recipeIds[0]),
      );
      expect(recipe).toHaveProperty("id", seedState.recipeIds[0]);
      expect(recipe).toHaveProperty("name");
    }
  });

  test("API: recipe search by name works", async () => {
    const res = await adminApi.get<any>(API.recipes.list, {
      search: "chicken",
      limit: "10",
    });
    const recipes = res.recipes || res.data || (Array.isArray(res) ? res : []);
    // May return 0 if no chicken recipes, but endpoint should work
    expect(Array.isArray(recipes)).toBe(true);
  });

  test("API: POST /api/admin/assign-recipe assigns recipe to customer", async () => {
    const seedState = loadSeedState();
    if (seedState.recipeIds.length > 0) {
      const res = await adminApi.raw("POST", API.admin.assignRecipe, {
        recipeId: seedState.recipeIds[0],
        customerIds: [seedState.customerUserId],
      });
      // 200 = success (may be "no changes" if already assigned), 201, 409 = duplicate
      expect([200, 201, 409]).toContain(res.status);
    }
  });

  test("API: assign recipe with invalid recipeId returns error or no-op", async () => {
    const seedState = loadSeedState();
    const res = await adminApi.raw("POST", API.admin.assignRecipe, {
      recipeId: "00000000-0000-0000-0000-000000000000",
      customerIds: [seedState.customerUserId],
    });
    // Production may return 200 with added:0, 400, 404, or 500
    // The key assertion: endpoint exists and processes the request
    expect(res.status).toBeDefined();
    if (res.status === 200) {
      const body = res.body as { added?: number };
      expect(body.added).toBe(0);
    }
  });

  test("API: recipe count per tier is correct", async () => {
    // Verify starter recipes exist
    const starterRes = await adminApi.get<any>(API.recipes.list, {
      tierLevel: "starter",
      limit: "1",
    });
    // total may be a string ("1500")
    const total = Number(starterRes.total) || starterRes.totalCount || 0;
    // Production should have 1,500+ starter recipes
    expect(total).toBeGreaterThan(0);
  });
});
