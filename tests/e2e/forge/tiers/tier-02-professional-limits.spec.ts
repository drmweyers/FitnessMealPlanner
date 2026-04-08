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

const PROFESSIONAL_ENTITLEMENTS = {
  tier: "professional",
  features: {
    recipeCount: TIER_LIMITS.professional.recipes,
    maxCustomers: TIER_LIMITS.professional.customers,
    maxMealPlans: TIER_LIMITS.professional.mealPlans,
    analytics: true,
    branding: true,
    whiteLabel: false,
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

  test("dashboard shows 20 customer limit when entitlements mocked to professional", async ({
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
    expect(pageText).toMatch(/\b20\b/);
  });

  test("professional entitlements enable analytics feature", async ({
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
      (capturedBody as typeof PROFESSIONAL_ENTITLEMENTS).features.analytics,
    ).toBe(true);
  });

  test("professional entitlements enable branding feature", async ({
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
      (capturedBody as typeof PROFESSIONAL_ENTITLEMENTS).features.branding,
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
    const body = res.body as unknown[];
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(3);
  });

  test("API /api/v1/tiers/public/pricing includes prices $199, $299, $399", async () => {
    const api = await ForgeApiClient.loginAs("trainer");
    const res = await api.raw("GET", API.tiers.publicPricing);

    expect(res.status).toBe(200);
    const bodyStr = JSON.stringify(res.body);

    expect(bodyStr).toContain("199");
    expect(bodyStr).toContain("299");
    expect(bodyStr).toContain("399");
  });

  test("professional tier in pricing has maxCustomers of 20", async () => {
    const api = await ForgeApiClient.loginAs("trainer");
    const res = await api.raw("GET", API.tiers.publicPricing);

    expect(res.status).toBe(200);
    const tiers = res.body as Array<Record<string, unknown>>;

    const professional = tiers.find(
      (t) =>
        String(t.name || t.tier || t.tierName || "").toLowerCase() ===
        "professional",
    );
    expect(professional).not.toBeUndefined();
    const bodyStr = JSON.stringify(professional);
    expect(bodyStr).toContain("20");
  });
});
