/**
 * FORGE QA Warfare v2 Playwright Config — FitnessMealPlanner
 *
 * Runs the warfare-v2 actor-based suites under tests/e2e/simulations/.
 * Targets PRODUCTION (https://evofitmeals.com) by default — non-destructive.
 *
 * Usage:
 *   npx playwright test --config=playwright.warfare.config.ts
 *   npx playwright test --config=playwright.warfare.config.ts --grep workflows
 *   BASE_URL=http://localhost:4000 npx playwright test --config=playwright.warfare.config.ts
 *
 * Suites:
 *   workflows/      — Sprint 2 happy-path workflows
 *   adversarial/    — Sprint 3 IDOR/auth/escalation/XSS/SQL/idempotency
 *   state-machines/ — Sprint 3 FSM coverage
 *   cross-role/     — Sprint 3 cross-role integrity
 *   side-effects/   — Sprint 4 invisible side effects
 *   chaos/          — Sprint 4 dependency failure injection
 *   regression/     — Sprint 4 known-bug regression suite
 */

import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "https://evofitmeals.com";

export default defineConfig({
  testDir: "./tests/e2e/simulations",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,
  timeout: 60_000,
  expect: { timeout: 10_000 },

  reporter: [
    ["list"],
    ["html", { outputFolder: "tests/e2e/reports/warfare", open: "never" }],
    ["json", { outputFile: "tests/e2e/reports/warfare-results.json" }],
  ],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
    headless: process.env.HEADED !== "1",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    extraHTTPHeaders: {
      "x-warfare-test": "1",
    },
  },

  outputDir: "tests/e2e/screenshots/warfare",

  projects: [
    {
      name: "warfare",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 900 },
      },
    },
  ],
});
