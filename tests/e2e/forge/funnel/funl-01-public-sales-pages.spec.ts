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
    test.setTimeout(60_000);

    // Retry navigation on transient network errors
    let loaded = false;
    for (let attempt = 0; attempt < 3 && !loaded; attempt++) {
      try {
        await page.goto(ROUTES.getStarted, {
          waitUntil: "domcontentloaded",
          timeout: 30_000,
        });
        loaded = true;
      } catch {
        if (attempt < 2) await page.waitForTimeout(2_000);
      }
    }
    if (!loaded) {
      await page.goto(ROUTES.getStarted, { waitUntil: "domcontentloaded" });
    }

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
    test.setTimeout(45_000);
    await page.goto(ROUTES.starter, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await page.waitForTimeout(3_000);

    const body = await page.textContent("body");
    expect(body).toContain("199");
  });

  test("/professional loads and shows $299 price text", async ({ page }) => {
    test.setTimeout(45_000);
    await page.goto(ROUTES.professional, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await page.waitForTimeout(3_000);

    const body = await page.textContent("body");
    expect(body).toContain("299");
  });

  test("/enterprise loads and shows $399 price text", async ({ page }) => {
    test.setTimeout(45_000);
    await page.goto(ROUTES.enterprise, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await page.waitForTimeout(3_000);

    const body = await page.textContent("body");
    expect(body).toContain("399");
  });

  test("/pricing page loads with tier comparison section", async ({ page }) => {
    await page.goto(ROUTES.pricing, { waitUntil: "networkidle" });
    await page.waitForTimeout(2_000);

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

  test("API GET /api/v1/public/pricing returns JSON with 3 tiers", async () => {
    // Unauthenticated call — no ForgeApiClient auth needed
    const client = new ForgeApiClient();
    const res = await client.raw("GET", API.tiers.publicPricing);

    expect(res.status).toBe(200);

    // API may return an array or an object with tiers property
    const body = res.body as Record<string, unknown>;
    if (Array.isArray(body)) {
      expect(body.length).toBeGreaterThanOrEqual(3);
    } else {
      // Object format: { tiers: { starter: {...}, professional: {...}, enterprise: {...} } }
      const tiers = body.tiers as Record<string, unknown> | undefined;
      expect(tiers).toBeDefined();
      expect(Object.keys(tiers!).length).toBeGreaterThanOrEqual(3);
    }
  });

  // ---------------------------------------------------------------------------
  // CTA links
  // ---------------------------------------------------------------------------

  test("/get-started CTA buttons link to /register, /pricing, or checkout flow", async ({
    page,
  }) => {
    await page.goto(ROUTES.getStarted, { waitUntil: "domcontentloaded" });

    const ctaLinks = page.locator(
      'a[href*="register"], a[href*="checkout"], a[href*="purchase"], a[href*="buy"], a[href*="pricing"]',
    );
    await expect(ctaLinks.first()).toBeVisible({
      timeout: TIMEOUTS.navigation,
    });

    const href = await ctaLinks.first().getAttribute("href");
    expect(href).toMatch(/register|checkout|purchase|buy|pricing/i);
  });
});
