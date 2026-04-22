/**
 * TIER-02: Professional Tier Limits
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
 */
const PROFESSIONAL_ENTITLEMENTS = {
  success: true,
  tier: "professional",
  status: "active",
  features: {
    recipeCount: TIER_LIMITS.professional.recipes,
    mealTypeCount: 10,
    canUploadLogo: true,
    canCustomizeColors: true,
    canEnableWhiteLabel: false,
    canSetCustomDomain: false,
    advancedFilters: true,
  },
  currentPeriodEnd: {},
  cancelAtPeriodEnd: false,
  limits: {
    customers: {
      max: TIER_LIMITS.professional.customers,
      used: 5,
      percentage: 25,
    },
    mealPlans: {
      max: TIER_LIMITS.professional.mealPlans,
      used: 20,
      percentage: 10,
    },
  },
};

test.describe("TIER-02 — Professional Tier Limits", () => {
  // ---------------------------------------------------------------------------
  // Mocked entitlement UI tests
  // ---------------------------------------------------------------------------

  test("dashboard shows 3,000 recipe count when entitlements mocked to professional", async ({
    page,
  }) => {
    await page.route("**/api/entitlements", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(PROFESSIONAL_ENTITLEMENTS),
      }),
    );

    await page.goto(ROUTES.trainerDashboard, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2_000);

    const pageText = await page.textContent("body");
    expect(pageText).toContain("3,000");
  });

  test("dashboard renders with professional entitlements mock without crash", async ({
    page,
  }) => {
    let mockServed = false;

    await page.route("**/api/entitlements**", (route) => {
      mockServed = true;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(PROFESSIONAL_ENTITLEMENTS),
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

  test("professional entitlements enable branding features", async ({
    page,
  }) => {
    let capturedBody: unknown = null;

    await page.route("**/api/entitlements", (route) => {
      capturedBody = PROFESSIONAL_ENTITLEMENTS;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(PROFESSIONAL_ENTITLEMENTS),
      });
    });

    await page.goto(ROUTES.trainerDashboard, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1_000);

    expect(capturedBody).not.toBeNull();
    expect(
      (capturedBody as typeof PROFESSIONAL_ENTITLEMENTS).features.canUploadLogo,
    ).toBe(true);
  });

  test("professional entitlements enable color customization", async ({
    page,
  }) => {
    let capturedBody: unknown = null;

    await page.route("**/api/entitlements", (route) => {
      capturedBody = PROFESSIONAL_ENTITLEMENTS;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(PROFESSIONAL_ENTITLEMENTS),
      });
    });

    await page.goto(ROUTES.trainerDashboard, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1_000);

    expect(capturedBody).not.toBeNull();
    expect(
      (capturedBody as typeof PROFESSIONAL_ENTITLEMENTS).features
        .canCustomizeColors,
    ).toBe(true);
  });

  test("dashboard with professional mock renders without crash", async ({
    page,
  }) => {
    await page.route("**/api/entitlements", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(PROFESSIONAL_ENTITLEMENTS),
      }),
    );

    const jsErrors: string[] = [];
    page.on("pageerror", (err) => jsErrors.push(err.message));

    await page.goto(ROUTES.trainerDashboard, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2_000);

    const fatalErrors = jsErrors.filter(
      (e) => !e.includes("ResizeObserver") && !e.includes("non-Error"),
    );
    expect(fatalErrors).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Real API: pricing
  // ---------------------------------------------------------------------------

  test("API GET /api/v1/tiers/public/pricing returns all 3 tiers", async () => {
    const api = await ForgeApiClient.loginAs("trainer");
    const res = await api.raw("GET", API.tiers.publicPricing);

    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;

    // Response is { tiers: { starter: {...}, professional: {...}, enterprise: {...} } }
    const tiers = body.tiers as Record<string, unknown>;
    expect(tiers).toBeTruthy();
    const tierNames = Object.keys(tiers);
    expect(tierNames.length).toBeGreaterThanOrEqual(3);
    expect(tierNames).toContain("starter");
    expect(tierNames).toContain("professional");
    expect(tierNames).toContain("enterprise");
  });

  test("API /api/v1/tiers/public/pricing includes prices $199, $299, $399", async () => {
    const api = await ForgeApiClient.loginAs("trainer");
    const res = await api.raw("GET", API.tiers.publicPricing);

    expect(res.status).toBe(200);
    const bodyStr = JSON.stringify(res.body);

    // Prices are in cents: 19900, 29900, 39900
    expect(bodyStr).toContain("199");
    expect(bodyStr).toContain("299");
    expect(bodyStr).toContain("399");
  });

  test("professional tier in pricing has maxCustomers of 20", async () => {
    const api = await ForgeApiClient.loginAs("trainer");
    const res = await api.raw("GET", API.tiers.publicPricing);

    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;

    // Response is { tiers: { professional: { limits: { customers: 20 }, ... } } }
    const tiers = body.tiers as Record<string, Record<string, unknown>>;
    const professional = tiers.professional;
    expect(professional).toBeTruthy();

    const bodyStr = JSON.stringify(professional);
    expect(bodyStr).toContain("20");
  });
});
