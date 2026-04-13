/**
 * FORGE QA Warfare v2 — Simulations Playwright Config
 *
 * Runs the 10 workflow specs under tests/e2e/simulations/workflows/.
 * Targets production (https://evofitmeals.com) by default.
 * Override: BASE_URL=http://localhost:4000 npx playwright test --config=tests/e2e/simulations/playwright.config.ts
 *
 * Usage:
 *   npx playwright test --config=tests/e2e/simulations/playwright.config.ts
 *   npx playwright test --config=tests/e2e/simulations/playwright.config.ts tests/e2e/simulations/workflows/06-bug-pipeline.spec.ts
 */

import { defineConfig, devices } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(__dirname, "../auth-state");
const BASE_URL = process.env.BASE_URL || "https://evofitmeals.com";

export default defineConfig({
  testDir: "./workflows",
  fullyParallel: false, // workflows have sequential dependencies within each spec
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,

  reporter: [
    ["list"],
    [
      "html",
      {
        outputFolder: path.join(__dirname, "../reports/simulations"),
        open: "never",
      },
    ],
    [
      "json",
      {
        outputFile: path.join(__dirname, "../reports/simulations-results.json"),
      },
    ],
  ],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    headless: true,
  },

  outputDir: path.join(__dirname, "../screenshots/simulations"),

  projects: [
    // -------------------------------------------------------------------------
    // All simulation workflows run headless in a single Chrome instance
    // -------------------------------------------------------------------------
    {
      name: "simulations",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 900 },
        // No storageState — each workflow manages its own auth via actors
      },
    },

    // -------------------------------------------------------------------------
    // Trainer-authenticated project (for specs that read trainer auth state)
    // -------------------------------------------------------------------------
    {
      name: "as-trainer",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 900 },
        storageState: path.join(AUTH_DIR, "trainer.json"),
      },
      testMatch: /09-pdf-export/,
    },
  ],
});
