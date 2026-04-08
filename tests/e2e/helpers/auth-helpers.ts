/**
 * FORGE QA Auth Helpers — EvoFitMeals
 *
 * Playwright page-level login helpers for cross-role journey tests
 * that can't rely on pre-saved storageState.
 */

import { Page, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { CREDENTIALS, ROUTES, type SeedState } from "./constants.js";

type Role = "trainer" | "customer" | "admin";

const REDIRECT_MAP: Record<Role, RegExp> = {
  trainer: /\/trainer/,
  customer: /\/customer|\/meal|\/dashboard/,
  admin: /\/admin|\/dashboard/,
};

/**
 * Login as a role via the UI. Use for journey tests that need to switch roles mid-test.
 */
export async function loginAs(page: Page, role: Role): Promise<void> {
  const cred = CREDENTIALS[role];
  await page.goto(ROUTES.login, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"], input[name="email"]', cred.email);
  await page.fill(
    'input[type="password"], input[name="password"]',
    cred.password,
  );
  await page.click('button[type="submit"]');
  await page.waitForURL(REDIRECT_MAP[role], { timeout: 15_000 });
}

export async function loginAsTrainer(page: Page): Promise<void> {
  return loginAs(page, "trainer");
}

export async function loginAsCustomer(page: Page): Promise<void> {
  return loginAs(page, "customer");
}

export async function loginAsAdmin(page: Page): Promise<void> {
  return loginAs(page, "admin");
}

/**
 * Login with arbitrary credentials (for tier-specific accounts).
 */
export async function loginWith(
  page: Page,
  email: string,
  password: string,
  expectUrlPattern?: RegExp,
): Promise<void> {
  await page.goto(ROUTES.login, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');
  if (expectUrlPattern) {
    await page.waitForURL(expectUrlPattern, { timeout: 15_000 });
  } else {
    // Wait for any navigation away from login
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 15_000,
    });
  }
}

/**
 * Logout via UI. Tries common patterns.
 */
export async function logout(page: Page): Promise<void> {
  // Try clicking avatar/menu first
  const avatar = page.locator(
    '[data-testid="user-menu"], button:has(img[alt*="avatar"]), .user-avatar, .avatar-button',
  );
  if ((await avatar.count()) > 0) {
    await avatar.first().click();
    await page.waitForTimeout(500);
  }

  const logoutBtn = page.locator(
    'button:has-text("Logout"), button:has-text("Log Out"), a:has-text("Logout"), [data-testid="logout"]',
  );
  await expect(logoutBtn.first()).toBeVisible({ timeout: 5_000 });
  await logoutBtn.first().click();
  await page.waitForURL(/\/login/, { timeout: 10_000 });
}

/**
 * Assert that navigating to a route redirects unauthenticated users to login.
 */
export async function expectAuthRequired(
  page: Page,
  route: string,
): Promise<void> {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
}

/**
 * Load the seed state manifest written by forge-seed.ts.
 */
export function loadSeedState(): SeedState {
  const statePath = path.join(process.cwd(), "tests/e2e/setup/seed-state.json");
  if (!fs.existsSync(statePath)) {
    throw new Error(
      `Seed state not found at ${statePath}. Run 'npm run seed:forge' first.`,
    );
  }
  return JSON.parse(fs.readFileSync(statePath, "utf-8")) as SeedState;
}
