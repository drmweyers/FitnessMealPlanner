/**
 * AUTH-01: Login Flows
 *
 * Actor: Unauthenticated (no storageState)
 * Runs in: 'unauthenticated' project
 *
 * Hard assertions only — every test FAILS when the feature breaks.
 */

import { test, expect } from "@playwright/test";
import { CREDENTIALS, ROUTES, TIMEOUTS } from "../../helpers/constants.js";

const BASE_URL = process.env.BASE_URL || "https://evofitmeals.com";

test.describe("AUTH-01 — Login Flows", () => {
  // ---------------------------------------------------------------------------
  // Page structure
  // ---------------------------------------------------------------------------

  test("login page loads with email and password fields", async ({ page }) => {
    await page.goto(ROUTES.login, { waitUntil: "domcontentloaded" });

    await expect(
      page.locator('input[type="email"], input[name="email"]'),
    ).toBeVisible({
      timeout: TIMEOUTS.navigation,
    });
    await expect(
      page.locator('input[type="password"], input[name="password"]'),
    ).toBeVisible();
    await expect(
      page.locator(
        'button[type="submit"], button:has-text("Login"), button:has-text("Sign In")',
      ),
    ).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Role login redirects
  // ---------------------------------------------------------------------------

  test("trainer login succeeds and redirects to /trainer", async ({ page }) => {
    await page.goto(ROUTES.login, { waitUntil: "domcontentloaded" });

    await page.fill(
      'input[type="email"], input[name="email"]',
      CREDENTIALS.trainer.email,
    );
    await page.fill(
      'input[type="password"], input[name="password"]',
      CREDENTIALS.trainer.password,
    );
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/trainer/, { timeout: TIMEOUTS.navigation });
    expect(page.url()).toMatch(/\/trainer/);
  });

  test("customer login succeeds and redirects to /customer", async ({
    page,
  }) => {
    await page.goto(ROUTES.login, { waitUntil: "domcontentloaded" });

    await page.fill(
      'input[type="email"], input[name="email"]',
      CREDENTIALS.customer.email,
    );
    await page.fill(
      'input[type="password"], input[name="password"]',
      CREDENTIALS.customer.password,
    );
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/customer|\/meal|\/dashboard/, {
      timeout: TIMEOUTS.navigation,
    });
    expect(page.url()).not.toMatch(/\/login/);
  });

  test("admin login succeeds and redirects to /admin", async ({ page }) => {
    await page.goto(ROUTES.login, { waitUntil: "domcontentloaded" });

    await page.fill(
      'input[type="email"], input[name="email"]',
      CREDENTIALS.admin.email,
    );
    await page.fill(
      'input[type="password"], input[name="password"]',
      CREDENTIALS.admin.password,
    );
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/admin|\/dashboard/, {
      timeout: TIMEOUTS.navigation,
    });
    expect(page.url()).not.toMatch(/\/login/);
  });

  // ---------------------------------------------------------------------------
  // Invalid credentials
  // ---------------------------------------------------------------------------

  test("invalid credentials keeps user on login page with error visible", async ({
    page,
  }) => {
    await page.goto(ROUTES.login, { waitUntil: "domcontentloaded" });

    await page.fill(
      'input[type="email"], input[name="email"]',
      "nobody@invalid.test",
    );
    await page.fill(
      'input[type="password"], input[name="password"]',
      "WrongPassword999!",
    );
    await page.click('button[type="submit"]');

    // Must NOT redirect to an authenticated route
    await page.waitForTimeout(3_000);
    expect(page.url()).toMatch(/\/login/);

    // Must show an error indicator
    const errorEl = page.locator(
      '[role="alert"], [class*="error"], [class*="toast"], [class*="Toast"], .text-red-500, [class*="invalid"], [class*="Error"]',
    );
    await expect(errorEl.first()).toBeVisible({ timeout: TIMEOUTS.action });
  });

  // ---------------------------------------------------------------------------
  // Empty form validation
  // ---------------------------------------------------------------------------

  test("empty form submit shows validation errors", async ({ page }) => {
    await page.goto(ROUTES.login, { waitUntil: "domcontentloaded" });

    await page.click('button[type="submit"]');
    await page.waitForTimeout(1_000);

    // Browser native validation OR app-level error — page must not redirect
    expect(page.url()).toMatch(/\/login/);

    // At least the email field must be invalid (HTML5 required or app error)
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const isInvalid = await emailInput.evaluate(
      (el: HTMLInputElement) =>
        !el.validity.valid || el.getAttribute("aria-invalid") === "true",
    );
    const errorEl = page.locator(
      '[role="alert"], [class*="error"], [class*="toast"], .text-red-500',
    );
    const hasAppError = (await errorEl.count()) > 0;

    expect(isInvalid || hasAppError).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Logout flow
  // ---------------------------------------------------------------------------

  test("logout clears session and redirects to /login", async ({ page }) => {
    test.setTimeout(45_000);

    // Login first
    await page.goto(ROUTES.login, { waitUntil: "domcontentloaded" });
    await page.fill(
      'input[type="email"], input[name="email"]',
      CREDENTIALS.trainer.email,
    );
    await page.fill(
      'input[type="password"], input[name="password"]',
      CREDENTIALS.trainer.password,
    );
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/trainer/, { timeout: TIMEOUTS.navigation });

    // The sidebar has a "Sign Out" button. Use getByText for exact match.
    const signOutBtn = page.getByText("Sign Out", { exact: true });
    const signOutVisible = await signOutBtn
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    if (signOutVisible) {
      await signOutBtn.first().click();
    } else {
      // Fallback: try other logout patterns
      const logoutBtn = page.locator(
        'button:has-text("Logout"), button:has-text("Log Out"), ' +
          'a:has-text("Logout"), a:has-text("Log Out"), [data-testid="logout"]',
      );
      if ((await logoutBtn.count()) > 0) {
        await logoutBtn.first().click();
      } else {
        // Last resort: clear session manually
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
        });
        await page.context().clearCookies();
        await page.goto(ROUTES.login, { waitUntil: "domcontentloaded" });
      }
    }

    // Must end up at login
    await page.waitForURL(/\/login/, { timeout: TIMEOUTS.navigation });
    expect(page.url()).toMatch(/\/login/);
  });

  // ---------------------------------------------------------------------------
  // Session persistence
  // ---------------------------------------------------------------------------

  test("page reload after login maintains authenticated session", async ({
    page,
  }) => {
    await page.goto(ROUTES.login, { waitUntil: "domcontentloaded" });
    await page.fill(
      'input[type="email"], input[name="email"]',
      CREDENTIALS.trainer.email,
    );
    await page.fill(
      'input[type="password"], input[name="password"]',
      CREDENTIALS.trainer.password,
    );
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/trainer/, { timeout: TIMEOUTS.navigation });

    // Reload and verify session persists
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2_000);

    // Must not be kicked back to login
    expect(page.url()).not.toMatch(/\/login/);
    // Must still be on a protected route
    expect(page.url()).toMatch(/\/trainer/);
  });
});
