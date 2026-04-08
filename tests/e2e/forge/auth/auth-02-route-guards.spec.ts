/**
 * AUTH-02: Role-Based Route Guards
 *
 * Validates UI redirect guards and API authorization enforcement.
 * Uses ForgeApiClient for API-level assertions and page navigation for UI guards.
 *
 * Actor: Mixed (unauthenticated, trainer storageState, customer storageState)
 * Runs in: 'as-trainer' project (storageState available for role tests)
 *          API tests create their own authenticated clients.
 */

import { test, expect } from "@playwright/test";
import { ForgeApiClient } from "../../helpers/api-client.js";
import { expectAuthRequired } from "../../helpers/auth-helpers.js";
import { ROUTES, API, TIMEOUTS } from "../../helpers/constants.js";

test.describe("AUTH-02 — Route Guards", () => {
  // ---------------------------------------------------------------------------
  // UI route guards — unauthenticated redirect behaviour
  // ---------------------------------------------------------------------------

  test.describe("UI route guards (unauthenticated)", () => {
    // Fresh page with no storageState for each of these
    test("unauthenticated /trainer redirects to /login", async ({
      browser,
    }) => {
      const context = await browser.newContext(); // no storageState
      const page = await context.newPage();

      await page.goto(ROUTES.trainerDashboard, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForURL(/\/login/, { timeout: TIMEOUTS.navigation });
      expect(page.url()).toMatch(/\/login/);

      await context.close();
    });

    test("unauthenticated /admin redirects to /login", async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto(ROUTES.admin, { waitUntil: "domcontentloaded" });
      await page.waitForURL(/\/login/, { timeout: TIMEOUTS.navigation });
      expect(page.url()).toMatch(/\/login/);

      await context.close();
    });

    test("unauthenticated /customer redirects to /login", async ({
      browser,
    }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto(ROUTES.customerDashboard, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForURL(/\/login/, { timeout: TIMEOUTS.navigation });
      expect(page.url()).toMatch(/\/login/);

      await context.close();
    });
  });

  // ---------------------------------------------------------------------------
  // API-level authorization enforcement
  // ---------------------------------------------------------------------------

  test.describe("API authorization", () => {
    test("GET /api/trainer/customers without auth token returns 401", async () => {
      const unauthClient = new ForgeApiClient();
      const result = await unauthClient.raw("GET", API.trainer.customers);

      expect(result.status).toBe(401);
    });

    test("customer token on GET /api/trainer/customers returns 403", async () => {
      const customerClient = await ForgeApiClient.loginAs("customer");
      const result = await customerClient.raw("GET", API.trainer.customers);

      expect(result.status).toBe(403);
    });

    test("trainer token on GET /api/admin/customers returns 403", async () => {
      const trainerClient = await ForgeApiClient.loginAs("trainer");
      const result = await trainerClient.raw("GET", API.admin.customers);

      expect(result.status).toBe(403);
    });
  });

  // ---------------------------------------------------------------------------
  // Positive access — roles CAN reach their own routes
  // ---------------------------------------------------------------------------

  test.describe("Positive access checks", () => {
    test("admin CAN access /admin page", async ({ browser }) => {
      // Admin storageState would be needed here — use fresh login
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto(ROUTES.login, { waitUntil: "domcontentloaded" });
      await page.fill(
        'input[type="email"], input[name="email"]',
        "admin@fitmeal.pro",
      );
      await page.fill(
        'input[type="password"], input[name="password"]',
        "AdminPass123",
      );
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/admin|\/dashboard/, {
        timeout: TIMEOUTS.navigation,
      });

      await page.goto(ROUTES.admin, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1_500);

      // Must NOT be redirected to login
      expect(page.url()).not.toMatch(/\/login/);

      await context.close();
    });

    test("trainer CAN access /trainer page", async ({ page }) => {
      // Uses storageState from 'as-trainer' project
      await page.goto(ROUTES.trainerDashboard, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForTimeout(1_500);

      expect(page.url()).not.toMatch(/\/login/);
      await expect(page.locator("body")).toBeVisible();
    });

    test("trainer token on GET /api/trainer/customers returns 200", async () => {
      const trainerClient = await ForgeApiClient.loginAs("trainer");
      const result = await trainerClient.raw("GET", API.trainer.customers);

      expect(result.status).toBe(200);
    });
  });
});
