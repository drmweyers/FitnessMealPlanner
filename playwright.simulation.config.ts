/**
 * Playwright Config — EvoFit Meals User Simulation
 *
 * Targets the FORGE simulation flow specs in tests/e2e/flows/.
 * Runs against production by default. Override with BASE_URL env var.
 *
 * Usage:
 *   npx playwright test --config=playwright.simulation.config.ts
 *   BASE_URL=http://localhost:4000 npx playwright test --config=playwright.simulation.config.ts
 */

import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://evofitmeals.com';

export default defineConfig({
  testDir: './tests/e2e/flows',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // Sequential for demo data consistency
  reporter: [
    ['html', { outputFolder: 'tests/e2e/reports/simulation' }],
    ['list'],
    ['json', { outputFile: 'tests/e2e/reports/simulation-results.json' }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 15000,
    navigationTimeout: 30000,
    headless: true,
  },
  outputDir: 'tests/e2e/screenshots',
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
  // No webServer — runs against already-deployed production
});
