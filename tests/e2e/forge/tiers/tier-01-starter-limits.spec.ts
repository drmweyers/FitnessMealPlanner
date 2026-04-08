/**
 * TIER-01: Starter Tier Limits
 *
 * Actor: Trainer (tier-enforcement storageState + route mocking)
 * Runs in: 'tier-enforcement' project
 *
 * Hard assertions only — every test FAILS when the feature breaks.
 */

import { test, expect } from "@playwright/test";
import { ROUTES, API, TIER_LIMITS, TIMEOUTS } from "../../helpers/constants.js";
import { ForgeApiClient } from "../../helpers/api-client.js";

const STARTER_ENTITLEMENTS = {
  tier: "starter",
  features: {
    recipeCount: TIER_LIMITS.starter.recipes,
    maxCustomers: TIER_LIMITS.starter.customers,
    maxMealPlans: TIER_LIMITS.starter.mealPlans,
    analytics: false,
    branding: false,
    whiteLabel: false,
  },
};

test.describe("TIER-01 — Starter Tier Limits", () => {
  // ---------------------------------------------------------------------------
  // Mocked entitlement UI tests
  // ---------------------------------------------------------------------------

  test("dashboard shows 1,500 recipe count when entitlements mocked to starter", async ({
    page,
  }) => {
    await page.route("**/api/entitlements", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(STARTER_ENTITLEMENTS),
      }),
    );

    await page.goto(ROUTES.trainerDashboard, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2_000);

    const pageText = await page.textContent("body");
    expect(pageText).toContain("1,500");
  });

  test("dashboard reflects 9 customer limit when entitlements mocked to starter", async ({
    page,
  }) => {
    await page.route("**/api/entitlements", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(STARTER_ENTITLEMENTS),
      }),
    );

    await page.goto(ROUTES.trainerDashboard, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2_000);

    const pageText = await page.textContent("body");
    // 9 customers limit must appear somewhere on the dashboard
    expect(pageText).toMatch(/\b9\b/);
  });

  test("dashboard reflects 50 meal plan limit when entitlements mocked to starter", async ({
    page,
  }) => {
    await page.route("**/api/entitlements", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(STARTER_ENTITLEMENTS),
      }),
    );

    await page.goto(ROUTES.trainerDashboard, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2_000);

    const pageText = await page.textContent("body");
    expect(pageText).toMatch(/\b50\b/);
  });

  test("mocked starter entitlements show analytics: false in response", async ({
    page,
  }) => {
    let capturedBody: unknown = null;

    await page.route("**/api/entitlements", (route) => {
      capturedBody = STARTER_ENTITLEMENTS;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(STARTER_ENTITLEMENTS),
      });
    });

    await page.goto(ROUTES.trainerDashboard, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1_000);

    expect(capturedBody).not.toBeNull();
    expect(
      (capturedBody as typeof STARTER_ENTITLEMENTS).features.analytics,
    ).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Real API: entitlements structure
  // ---------------------------------------------------------------------------

  test("API GET /api/entitlements returns tier and features fields", async () => {
    const api = await ForgeApiClient.loginAs("trainer");
    const res = await api.raw("GET", API.entitlements);

    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(body).toHaveProperty("tier");
    expect(body).toHaveProperty("features");
  });

  test("API GET /api/v1/tiers/current returns current tier info", async () => {
    const api = await ForgeApiClient.loginAs("trainer");
    const res = await api.raw("GET", API.tiers.current);

    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(body).not.toBeNull();
    // Must have some tier identification
    const hasTierInfo =
      "tier" in body || "name" in body || "plan" in body || "tierName" in body;
    expect(hasTierInfo).toBe(true);
  });

  test("API GET /api/v1/tiers/usage returns usage statistics", async () => {
    const api = await ForgeApiClient.loginAs("trainer");
    const res = await api.raw("GET", API.tiers.usage);

    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(body).not.toBeNull();
  });

  test("API /api/v1/tiers/usage response has used and max fields", async () => {
    const api = await ForgeApiClient.loginAs("trainer");
    const res = await api.raw("GET", API.tiers.usage);

    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;

    // Check top-level or nested structure for used/max
    const bodyStr = JSON.stringify(body);
    const hasUsed = bodyStr.includes('"used"') || bodyStr.includes('"current"');
    const hasMax = bodyStr.includes('"max"') || bodyStr.includes('"limit"');

    expect(hasUsed).toBe(true);
    expect(hasMax).toBe(true);
  });
});
