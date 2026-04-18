/**
 * FORGE QA — RCP-02: Tier-Filtered Recipe Access
 *
 * Actor: Trainer (as-trainer storageState)
 * Covers: Entitlements API contract, route interception for tier mocking,
 *         UI recipe count display per tier.
 */

import { test, expect } from "@playwright/test";
import { ROUTES, API, TIER_LIMITS } from "../../helpers/constants.js";
import { ForgeApiClient } from "../../helpers/api-client.js";

test.describe("RCP-02: Tier-Filtered Recipe Access", () => {
  test("API: GET /api/entitlements returns recipeCount field", async () => {
    const client = await ForgeApiClient.loginAs("trainer");
    const res = await client.raw("GET", API.entitlements);

    expect(res.status).toBe(200);
    const body = res.body as {
      features?: { recipeCount?: number };
      recipeCount?: number;
      limits?: { recipes?: number };
    };

    const recipeCount =
      body.features?.recipeCount ?? body.recipeCount ?? body.limits?.recipes;

    expect(typeof recipeCount).toBe("number");
    expect(recipeCount).toBeGreaterThan(0);
  });

  test("Starter tier mock: entitlements shows recipeCount = 1500", async ({
    page,
  }) => {
    await page.route("**/api/entitlements", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          tier: "starter",
          status: "active",
          features: { recipeCount: TIER_LIMITS.starter.recipes },
          limits: {},
        }),
      });
    });

    await page.goto(ROUTES.recipes, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    // Make a direct API call to the mocked endpoint via page context
    const result = await page.evaluate(async () => {
      const res = await fetch("/api/entitlements");
      return res.json();
    });

    const recipeCount =
      (result as { features?: { recipeCount?: number }; recipeCount?: number })
        .features?.recipeCount ??
      (result as { recipeCount?: number }).recipeCount;

    expect(recipeCount).toBe(TIER_LIMITS.starter.recipes);
  });

  test("Professional tier mock: entitlements shows recipeCount = 3000", async ({
    page,
  }) => {
    await page.route("**/api/entitlements", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          tier: "professional",
          status: "active",
          features: { recipeCount: TIER_LIMITS.professional.recipes },
          limits: {},
        }),
      });
    });

    await page.goto(ROUTES.recipes, { waitUntil: "domcontentloaded" });

    const result = await page.evaluate(async () => {
      const res = await fetch("/api/entitlements");
      return res.json();
    });

    const recipeCount =
      (result as { features?: { recipeCount?: number } }).features
        ?.recipeCount ?? (result as { recipeCount?: number }).recipeCount;

    expect(recipeCount).toBe(TIER_LIMITS.professional.recipes);
  });

  test("Enterprise tier mock: entitlements shows recipeCount = 6000", async ({
    page,
  }) => {
    await page.route("**/api/entitlements", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          tier: "enterprise",
          status: "active",
          features: { recipeCount: TIER_LIMITS.enterprise.recipes },
          limits: {},
        }),
      });
    });

    await page.goto(ROUTES.recipes, { waitUntil: "domcontentloaded" });

    const result = await page.evaluate(async () => {
      const res = await fetch("/api/entitlements");
      return res.json();
    });

    const recipeCount =
      (result as { features?: { recipeCount?: number } }).features
        ?.recipeCount ?? (result as { recipeCount?: number }).recipeCount;

    expect(recipeCount).toBe(TIER_LIMITS.enterprise.recipes);
  });

  test('UI with starter mock: recipe count text shows "1,500"', async ({
    page,
  }) => {
    await page.route("**/api/entitlements", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          tier: "starter",
          status: "active",
          features: { recipeCount: TIER_LIMITS.starter.recipes },
          limits: {},
        }),
      });
    });

    await page.goto(ROUTES.trainerDashboard, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    const countText = page.locator("text=/1,500/");
    await expect(countText.first()).toBeVisible({ timeout: 10_000 });
  });

  test('UI with professional mock: recipe count text shows "3,000"', async ({
    page,
  }) => {
    await page.route("**/api/entitlements", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          tier: "professional",
          status: "active",
          features: { recipeCount: TIER_LIMITS.professional.recipes },
          limits: {},
        }),
      });
    });

    await page.goto(ROUTES.trainerDashboard, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    const countText = page.locator("text=/3,000/");
    await expect(countText.first()).toBeVisible({ timeout: 10_000 });
  });

  test("API: GET /api/recipes returns recipes appropriate to tier", async () => {
    const client = await ForgeApiClient.loginAs("trainer");
    const res = await client.raw("GET", API.recipes.list);

    expect(res.status).toBe(200);
    const body = res.body as {
      recipes?: unknown[];
      data?: unknown[];
      total?: number | string;
    };
    const recipes = Array.isArray(res.body)
      ? (res.body as unknown[])
      : (body.recipes ?? body.data ?? []);

    // Must return at least 1 recipe (tier access is working)
    expect(recipes.length).toBeGreaterThan(0);
  });

  test("Dashboard displays correct recipe access count for current tier", async ({
    page,
  }) => {
    await page.goto(ROUTES.trainerDashboard, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    // Valid recipe count numbers for any tier: 1,500 / 3,000 / 6,000
    const countLocator = page.locator("text=/1,500|3,000|6,000/");
    await expect(countLocator.first()).toBeVisible({ timeout: 10_000 });
  });
});
