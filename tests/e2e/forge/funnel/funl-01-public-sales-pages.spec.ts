/**
 * FUNL-01: Public Sales Pages
 *
 * Actor: Unauthenticated
 * Runs in: 'unauthenticated' project
 *
 * Hard assertions only — every test FAILS when the feature breaks.
 */

import { test, expect } from "@playwright/test";
import { ROUTES, API, TIMEOUTS } from "../../helpers/constants.js";
import { ForgeApiClient } from "../../helpers/api-client.js";

test.describe("FUNL-01 — Public Sales Pages", () => {
  // ---------------------------------------------------------------------------
  // Landing pages
  // ---------------------------------------------------------------------------

  test("/get-started loads with hero section and a CTA element", async ({
    page,
  }) => {
    await page.goto(ROUTES.getStarted, { waitUntil: "domcontentloaded" });

    // Hero or prominent heading must exist
    const heroEl = page.locator(
      '[class*="hero"], [class*="Hero"], h1, [class*="headline"], [class*="banner"]',
    );
    await expect(heroEl.first()).toBeVisible({ timeout: TIMEOUTS.navigation });

    // CTA button must be present
    const ctaBtn = page.locator(
      'a[href*="register"], a[href*="get-started"], button:has-text("Get Started"), button:has-text("Start"), a:has-text("Get Started"), a:has-text("Start Free")',
    );
    await expect(ctaBtn.first()).toBeVisible({ timeout: TIMEOUTS.navigation });
  });

  test("/starter loads and shows $199 price text", async ({ page }) => {
    await page.goto(ROUTES.starter, { waitUntil: "domcontentloaded" });

    await expect(page.locator("text=199")).toBeVisible({
      timeout: TIMEOUTS.navigation,
    });
  });

  test("/professional loads and shows $299 price text", async ({ page }) => {
    await page.goto(ROUTES.professional, { waitUntil: "domcontentloaded" });

    await expect(page.locator("text=299")).toBeVisible({
      timeout: TIMEOUTS.navigation,
    });
  });

  test("/enterprise loads and shows $399 price text", async ({ page }) => {
    await page.goto(ROUTES.enterprise, { waitUntil: "domcontentloaded" });

    await expect(page.locator("text=399")).toBeVisible({
      timeout: TIMEOUTS.navigation,
    });
  });

  test("/pricing page loads with tier comparison section", async ({ page }) => {
    await page.goto(ROUTES.pricing, { waitUntil: "domcontentloaded" });

    // All 3 tier names or prices must appear
    const body = await page.textContent("body");
    const hasStarter = body?.includes("Starter") || body?.includes("199");
    const hasProfessional =
      body?.includes("Professional") || body?.includes("299");
    const hasEnterprise = body?.includes("Enterprise") || body?.includes("399");

    expect(hasStarter).toBe(true);
    expect(hasProfessional).toBe(true);
    expect(hasEnterprise).toBe(true);
  });

  test("/free-blueprint loads with email capture form", async ({ page }) => {
    await page.goto(ROUTES.freeBlueprint, { waitUntil: "domcontentloaded" });

    const emailInput = page.locator(
      'input[type="email"], input[name="email"], input[placeholder*="email" i]',
    );
    await expect(emailInput.first()).toBeVisible({
      timeout: TIMEOUTS.navigation,
    });
  });

  // ---------------------------------------------------------------------------
  // API: public pricing
  // ---------------------------------------------------------------------------

  test("API GET /api/v1/tiers/public/pricing returns JSON with 3 tiers", async () => {
    // Unauthenticated call — no ForgeApiClient auth needed
    const client = new ForgeApiClient();
    const res = await client.raw("GET", API.tiers.publicPricing);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect((res.body as unknown[]).length).toBeGreaterThanOrEqual(3);
  });

  // ---------------------------------------------------------------------------
  // CTA links
  // ---------------------------------------------------------------------------

  test("/get-started CTA buttons link to /register or checkout flow", async ({
    page,
  }) => {
    await page.goto(ROUTES.getStarted, { waitUntil: "domcontentloaded" });

    const ctaLinks = page.locator(
      'a[href*="register"], a[href*="checkout"], a[href*="purchase"], a[href*="buy"]',
    );
    await expect(ctaLinks.first()).toBeVisible({
      timeout: TIMEOUTS.navigation,
    });

    const href = await ctaLinks.first().getAttribute("href");
    expect(href).toMatch(/register|checkout|purchase|buy/i);
  });
});
