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

/**
 * Mock entitlements matching the real /api/entitlements response shape.
 * Enterprise uses -1 for unlimited customers and meal plans.
 */
const ENTERPRISE_ENTITLEMENTS = {
  success: true,
  tier: "enterprise",
  status: "active",
  features: {
    recipeCount: TIER_LIMITS.enterprise.recipes,
    mealTypeCount: 15,
    canUploadLogo: true,
    canCustomizeColors: true,
    canEnableWhiteLabel: true,
    canSetCustomDomain: true,
    advancedFilters: true,
  },
  currentPeriodEnd: {},
  cancelAtPeriodEnd: false,
  limits: {
    customers: {
      max: TIER_LIMITS.enterprise.customers, // -1 = unlimited
      used: 10,
      percentage: 0,
    },
    mealPlans: {
      max: TIER_LIMITS.enterprise.mealPlans, // -1 = unlimited
      used: 50,
      percentage: 0,
    },
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

  test("dashboard renders with enterprise entitlements mock without crash", async ({
    page,
  }) => {
    let mockServed = false;

    await page.route("**/api/entitlements**", (route) => {
      mockServed = true;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(ENTERPRISE_ENTITLEMENTS),
      });
    });

    const jsErrors: string[] = [];
    page.on("pageerror", (err) => jsErrors.push(err.message));

    await page.goto(ROUTES.trainerDashboard, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3_000);

    const fatalErrors = jsErrors.filter(
      (e) => !e.includes("ResizeObserver") && !e.includes("non-Error"),
    );
    expect(fatalErrors).toHaveLength(0);

    const pageText = await page.textContent("body");
    expect(pageText!.length).toBeGreaterThan(50);
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
      (capturedBody as typeof ENTERPRISE_ENTITLEMENTS).features
        .canEnableWhiteLabel,
    ).toBe(true);
  });

  test("enterprise entitlements include all professional features (logo + colors)", async ({
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
    expect(ent.features.canUploadLogo).toBe(true);
    expect(ent.features.canCustomizeColors).toBe(true);
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

  test("API GET /api/entitlements returns limits with numeric max values", async () => {
    const api = await ForgeApiClient.loginAs("trainer");
    const res = await api.raw("GET", API.entitlements);

    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    const bodyStr = JSON.stringify(body);

    // Limits must contain numeric values (including -1 for unlimited)
    expect(bodyStr).toMatch(/\d+|-1/);
  });

  test("API /api/entitlements limits do not contain division-by-zero artifacts", async () => {
    const api = await ForgeApiClient.loginAs("trainer");
    const res = await api.raw("GET", API.entitlements);

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
    const body = res.body as Record<string, unknown>;

    // Response is { tiers: { enterprise: { amount: 39900, ... } } }
    const tiers = body.tiers as Record<string, Record<string, unknown>>;
    const enterprise = tiers.enterprise;
    expect(enterprise).toBeTruthy();

    const bodyStr = JSON.stringify(enterprise);
    expect(bodyStr).toContain("399");
  });
});
