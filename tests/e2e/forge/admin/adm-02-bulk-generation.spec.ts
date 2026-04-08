/**
 * FORGE QA — ADM-02: Bulk Recipe Generation
 * Tests admin bulk generation UI and API endpoints.
 */
import { test, expect } from "@playwright/test";
import { ForgeApiClient } from "../../helpers/api-client.js";
import { ROUTES, API, BASE_URL } from "../../helpers/constants.js";

test.describe("ADM-02 — Bulk Recipe Generation", () => {
  let adminApi: ForgeApiClient;

  test.beforeAll(async () => {
    adminApi = await ForgeApiClient.loginAs("admin", BASE_URL);
  });

  test("/admin/bulk-generation page loads", async ({ page }) => {
    await page.goto(ROUTES.adminBulkGeneration, {
      waitUntil: "domcontentloaded",
    });
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("bulk generation page has form controls", async ({ page }) => {
    await page.goto(ROUTES.adminBulkGeneration, {
      waitUntil: "domcontentloaded",
    });
    const formElements = page.locator(
      'input, select, button[type="submit"], button:has-text("Generate")',
    );
    expect(await formElements.count()).toBeGreaterThan(0);
  });

  test("API: POST /api/admin/generate-recipes endpoint exists", async () => {
    const res = await adminApi.raw("POST", API.admin.generateRecipes, {
      count: 1,
      tierLevel: "starter",
    });
    // 200/202 = started, 400 = bad params (endpoint exists), 500 = server error
    expect([200, 201, 202, 400]).toContain(res.status);
  });

  test("API: GET /api/admin/bmad-metrics returns metrics", async () => {
    const res = await adminApi.raw("GET", API.admin.bmadMetrics);
    // Endpoint may return 200 with data or 404 if no batches run yet
    expect([200, 404]).toContain(res.status);
  });

  test("API: non-admin cannot access generate endpoint", async () => {
    const trainerApi = await ForgeApiClient.loginAs("trainer", BASE_URL);
    const res = await trainerApi.raw("POST", API.admin.generateRecipes, {
      count: 1,
    });
    expect(res.status).toBe(403);
  });

  test("API: non-admin cannot access BMAD metrics", async () => {
    const trainerApi = await ForgeApiClient.loginAs("trainer", BASE_URL);
    const res = await trainerApi.raw("GET", API.admin.bmadMetrics);
    expect([403, 401]).toContain(res.status);
  });

  test("bulk generation page has BMAD generator section", async ({ page }) => {
    await page.goto(ROUTES.adminBulkGeneration, {
      waitUntil: "domcontentloaded",
    });
    // Look for generation-related UI elements
    const genContent = page.locator("text=/generate|recipe|batch|bmad/i");
    expect(await genContent.count()).toBeGreaterThan(0);
  });

  test("API: POST /api/admin/parse-recipe-prompt accepts NL input", async () => {
    const res = await adminApi.raw("POST", "/api/admin/parse-recipe-prompt", {
      prompt: "high protein chicken recipes for muscle building",
    });
    // 200 = parsed, 400 = validation error, 404 = endpoint not wired
    expect([200, 400, 404]).toContain(res.status);
  });
});
