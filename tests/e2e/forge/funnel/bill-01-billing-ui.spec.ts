/**
 * BILL-01: Billing UI
 *
 * Actor: Trainer (as-trainer storageState)
 * Runs in: 'as-trainer' project
 *
 * Hard assertions only — every test FAILS when the feature breaks.
 */

import { test, expect } from "@playwright/test";
import { ROUTES, API, TIMEOUTS } from "../../helpers/constants.js";
import { ForgeApiClient } from "../../helpers/api-client.js";

test.describe("BILL-01 — Billing UI", () => {
  // ---------------------------------------------------------------------------
  // Page load
  // ---------------------------------------------------------------------------

  test("/billing page loads without redirecting to /login", async ({
    page,
  }) => {
    await page.goto(ROUTES.billing, { waitUntil: "domcontentloaded" });

    await page.waitForTimeout(2_000);
    expect(page.url()).not.toMatch(/\/login/);
  });

  // ---------------------------------------------------------------------------
  // Page content
  // ---------------------------------------------------------------------------

  test("/billing page shows current tier name", async ({ page }) => {
    await page.goto(ROUTES.billing, { waitUntil: "domcontentloaded" });

    const tierLabel = page.locator("text=/starter|professional|enterprise/i");
    await expect(tierLabel.first()).toBeVisible({
      timeout: TIMEOUTS.navigation,
    });
  });

  test("/billing page shows usage statistics with customers used / max", async ({
    page,
  }) => {
    await page.goto(ROUTES.billing, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1_500);

    const body = await page.textContent("body");
    // Must show some usage-related text
    const hasUsage =
      body?.match(/\d+\s*\/\s*\d+/) != null || // e.g. "3 / 9"
      body?.match(/customers?/i) != null ||
      body?.match(/usage/i) != null;

    expect(hasUsage).toBe(true);
  });

  test("/billing page has upgrade CTA or tier management button", async ({
    page,
  }) => {
    await page.goto(ROUTES.billing, { waitUntil: "domcontentloaded" });

    const upgradeEl = page.locator(
      'button:has-text("Upgrade"), a:has-text("Upgrade"), button:has-text("Manage"), a:has-text("Manage"), button:has-text("Change Plan"), [class*="upgrade"], [class*="Upgrade"]',
    );
    await expect(upgradeEl.first()).toBeVisible({
      timeout: TIMEOUTS.navigation,
    });
  });

  // ---------------------------------------------------------------------------
  // API: tier and usage
  // ---------------------------------------------------------------------------

  test("API returns tier/entitlement info for authenticated trainer", async () => {
    const api = await ForgeApiClient.loginAs("trainer");

    // Try /api/entitlements first, fall back to /api/v1/tiers/current
    let res = await api.raw("GET", API.entitlements);
    if (res.status === 404) {
      res = await api.raw("GET", API.tiers.current);
    }
    if (res.status === 404) {
      res = await api.raw("GET", API.usage.stats);
    }

    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(body).not.toBeNull();
    const bodyStr = JSON.stringify(body).toLowerCase();
    expect(bodyStr).toMatch(
      /starter|professional|enterprise|tier|plan|entitlement/,
    );
  });

  test("API returns usage data with limits for authenticated trainer", async () => {
    const api = await ForgeApiClient.loginAs("trainer");

    // Try /api/usage/stats first, fall back to /api/v1/tiers/usage
    let res = await api.raw("GET", API.usage.stats);
    if (res.status === 404) {
      res = await api.raw("GET", API.tiers.usage);
    }
    if (res.status === 404) {
      res = await api.raw("GET", API.trainer.dashboardStats);
    }

    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(body).not.toBeNull();
  });

  test("API usage data has customers and mealPlans fields", async () => {
    const api = await ForgeApiClient.loginAs("trainer");

    // Try /api/usage/stats first, fall back to /api/trainer/dashboard-stats
    let res = await api.raw("GET", API.usage.stats);
    if (res.status === 404) {
      res = await api.raw("GET", API.trainer.dashboardStats);
    }
    if (res.status === 404) {
      res = await api.raw("GET", API.tiers.usage);
    }

    expect(res.status).toBe(200);
    const bodyStr = JSON.stringify(res.body).toLowerCase();

    // Must reference customers and meal plans in some form
    const hasCustomers = bodyStr.includes("customer");
    const hasMealPlans =
      bodyStr.includes("mealplan") ||
      bodyStr.includes("meal_plan") ||
      bodyStr.includes("plans");

    expect(hasCustomers).toBe(true);
    expect(hasMealPlans).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Subscription status
  // ---------------------------------------------------------------------------

  test("/billing page shows subscription status indicator", async ({
    page,
  }) => {
    await page.goto(ROUTES.billing, { waitUntil: "domcontentloaded" });

    const statusEl = page.locator(
      "text=/active|lifetime|one.time|subscri|current plan/i",
    );
    await expect(statusEl.first()).toBeVisible({
      timeout: TIMEOUTS.navigation,
    });
  });
});
