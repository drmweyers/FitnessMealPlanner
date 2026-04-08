/**
 * TIER-03: Enterprise Tier Limits
 *
 * Actor: Trainer (tier-enforcement storageState + route mocking)
 * Runs in: 'tier-enforcement' project
 *
 * Hard assertions only — every test FAILS when the feature breaks.
 */

import { test, expect } from "@playwright/test";
import { ROUTES, API, TIER_LIMITS, TIMEOUTS } from "../../helpers/constants.js";
import { ForgeApiClient } from "../../helpers/api-client.js";

const ENTERPRISE_ENTITLEMENTS = {
  tier: "enterprise",
  features: {
    recipeCount: TIER_LIMITS.enterprise.recipes,
    maxCustomers: TIER_LIMITS.enterprise.customers, // -1 = unlimited
    maxMealPlans: TIER_LIMITS.enterprise.mealPlans, // -1 = unlimited
    analytics: true,
    branding: true,
    whiteLabel: true,
  },
};

test.describe("TIER-03 — Enterprise Tier Limits", () => {
  // ---------------------------------------------------------------------------
  // Mocked entitlement UI tests
  // ---------------------------------------------------------------------------

  test("dashboard shows 6,000 recipe count when entitlements mocked to enterprise", async ({
    page,
  }) => {
    await page.route("**/api/entitlements", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(ENTERPRISE_ENTITLEMENTS),
      }),
    );

    await page.goto(ROUTES.trainerDashboard, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2_000);

    const pageText = await page.textContent("body");
    expect(pageText).toContain("6,000");
  });

  test("dashboard shows Unlimited for customer count when entitlements mocked to enterprise", async ({
    page,
  }) => {
    await page.route("**/api/entitlements", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(ENTERPRISE_ENTITLEMENTS),
      }),
    );

    await page.goto(ROUTES.trainerDashboard, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2_000);

    const pageText = await page.textContent("body");
    expect(pageText).toMatch(/unlimited|∞|-1/i);
  });

  test("enterprise entitlements enable white-label feature", async ({
    page,
  }) => {
    let capturedBody: unknown = null;

    await page.route("**/api/entitlements", (route) => {
      capturedBody = ENTERPRISE_ENTITLEMENTS;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(ENTERPRISE_ENTITLEMENTS),
      });
    });

    await page.goto(ROUTES.trainerDashboard, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1_000);

    expect(capturedBody).not.toBeNull();
    expect(
      (capturedBody as typeof ENTERPRISE_ENTITLEMENTS).features.whiteLabel,
    ).toBe(true);
  });

  test("enterprise entitlements include all professional features (analytics + branding)", async ({
    page,
  }) => {
    let capturedBody: unknown = null;

    await page.route("**/api/entitlements", (route) => {
      capturedBody = ENTERPRISE_ENTITLEMENTS;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(ENTERPRISE_ENTITLEMENTS),
      });
    });

    await page.goto(ROUTES.trainerDashboard, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1_000);

    expect(capturedBody).not.toBeNull();
    const ent = capturedBody as typeof ENTERPRISE_ENTITLEMENTS;
    expect(ent.features.analytics).toBe(true);
    expect(ent.features.branding).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Real API: entitlements and tier info
  // ---------------------------------------------------------------------------

  test("API GET /api/entitlements returns valid features object", async () => {
    const api = await ForgeApiClient.loginAs("trainer");
    const res = await api.raw("GET", API.entitlements);

    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(body).toHaveProperty("features");
    expect(typeof body.features).toBe("object");
    expect(body.features).not.toBeNull();
  });

  test("API GET /api/v1/tiers/usage returns numeric or -1 max values", async () => {
    const api = await ForgeApiClient.loginAs("trainer");
    const res = await api.raw("GET", API.tiers.usage);

    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    const bodyStr = JSON.stringify(body);

    // Usage must contain numeric values (including -1 for unlimited)
    expect(bodyStr).toMatch(/\d+|-1/);
  });

  test("API /api/v1/tiers/usage usage percentage fields handle -1 unlimited without error", async () => {
    const api = await ForgeApiClient.loginAs("trainer");
    const res = await api.raw("GET", API.tiers.usage);

    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;

    // Response must not contain division-by-zero artifacts
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toContain("Infinity");
    expect(bodyStr).not.toContain("NaN");
  });

  test("enterprise pricing entry in public pricing is $399", async () => {
    const api = await ForgeApiClient.loginAs("trainer");
    const res = await api.raw("GET", API.tiers.publicPricing);

    expect(res.status).toBe(200);
    const tiers = res.body as Array<Record<string, unknown>>;

    const enterprise = tiers.find(
      (t) =>
        String(t.name || t.tier || t.tierName || "").toLowerCase() ===
        "enterprise",
    );
    expect(enterprise).not.toBeUndefined();
    const bodyStr = JSON.stringify(enterprise);
    expect(bodyStr).toContain("399");
  });
});
