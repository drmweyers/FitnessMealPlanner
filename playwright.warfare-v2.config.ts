/**
 * Playwright Config — FORGE QA Warfare v2
 *
 * Covers adversarial, state-machine, and cross-role simulation suites.
 * Runs via API (no browser UI needed) — headless Chromium for structured HTTP.
 *
 * Usage:
 *   BASE_URL=http://localhost:4000 npx playwright test --config=playwright.warfare-v2.config.ts
 *   npx playwright test --config=playwright.warfare-v2.config.ts tests/e2e/simulations/adversarial/03-auth-bypass.spec.ts
 */

import { defineConfig, devices } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const BASE_URL = process.env.BASE_URL || "https://evofitmeals.com";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: "./tests/e2e/simulations",
  fullyParallel: false, // Adversarial tests share seeded state — run sequentially within suite
  forbidOnly: !!process.env.CI,
  retries: 0, // No retries for adversarial tests — failures are signal
  workers: 1,
  timeout: 60_000,

  reporter: [
    ["list"],
    ["html", { outputFolder: "tests/e2e/reports/warfare-v2", open: "never" }],
    ["json", { outputFile: "tests/e2e/reports/warfare-v2-results.json" }],
  ],

  use: {
    baseURL: BASE_URL,
    trace: "off",
    screenshot: "off",
    video: "off",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    headless: true,
  },

  projects: [
    {
      name: "adversarial",
      testMatch: /simulations\/adversarial\/.+\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "state-machines",
      testMatch: /simulations\/state-machines\/.+\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "cross-role",
      testMatch: /simulations\/cross-role\/.+\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "side-effects",
      testMatch: /simulations\/side-effects\/.+\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chaos",
      testMatch: /simulations\/chaos\/.+\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "regression",
      testMatch: /simulations\/regression\/.+\.spec\.ts/,
      timeout: 300_000, // R001 batch timeout test needs up to 5 min
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
