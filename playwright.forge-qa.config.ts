/**
 * FORGE QA Playwright Config — EvoFitMeals
 *
 * Comprehensive actor-based E2E test configuration.
 * 6 projects covering all roles and workflows.
 *
 * Usage:
 *   npx playwright test --config=playwright.forge-qa.config.ts
 *   BASE_URL=http://localhost:4000 npx playwright test --config=playwright.forge-qa.config.ts
 *   npx playwright test --config=playwright.forge-qa.config.ts --project=as-trainer
 */

import { defineConfig, devices } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const BASE_URL = process.env.BASE_URL || "https://evofitmeals.com";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(__dirname, "tests/e2e/auth-state");

export default defineConfig({
  testDir: "./tests/e2e/forge",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,
  globalSetup: "./tests/e2e/setup/forge-global-setup.ts",

  reporter: [
    ["list"],
    ["html", { outputFolder: "tests/e2e/reports/forge", open: "never" }],
    ["json", { outputFile: "tests/e2e/reports/forge-results.json" }],
  ],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    headless: process.env.HEADED !== "1",
  },

  outputDir: "tests/e2e/screenshots/forge",

  projects: [
    // -----------------------------------------------------------------------
    // Trainer role tests
    // -----------------------------------------------------------------------
    {
      name: "as-trainer",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 900 },
        storageState: path.join(AUTH_DIR, "trainer.json"),
      },
      testMatch: /\/(auth|meal-plans|recipes|export|shopping|funnel)\//,
      testIgnore: /auth-01-login|auth-03-invitation|journeys/,
    },

    // -----------------------------------------------------------------------
    // Customer role tests
    // -----------------------------------------------------------------------
    {
      name: "as-customer",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 900 },
        storageState: path.join(AUTH_DIR, "client.json"),
      },
      testMatch: /\/(customer|nutrition|progress)\//,
    },

    // -----------------------------------------------------------------------
    // Admin role tests
    // -----------------------------------------------------------------------
    {
      name: "as-admin",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 900 },
        storageState: path.join(AUTH_DIR, "admin.json"),
      },
      testMatch: /\/admin\//,
    },

    // -----------------------------------------------------------------------
    // Unauthenticated tests (login, public pages, shared views)
    // -----------------------------------------------------------------------
    {
      name: "unauthenticated",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 900 },
      },
      testMatch: /auth-01-login|funl-01|share-01/,
    },

    // -----------------------------------------------------------------------
    // Tier enforcement tests (use route interception for tier mocking)
    // -----------------------------------------------------------------------
    {
      name: "tier-enforcement",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 900 },
        storageState: path.join(AUTH_DIR, "trainer.json"),
      },
      testMatch: /\/tiers\//,
    },

    // -----------------------------------------------------------------------
    // Cross-role journey tests (manage their own auth)
    // -----------------------------------------------------------------------
    {
      name: "cross-role-journeys",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 900 },
        // No storageState — journeys manage auth themselves
      },
      testMatch: /\/journeys\//,
    },
  ],
});
