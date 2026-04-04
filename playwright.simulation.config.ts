/**
 * Playwright Config — EvoFit Meals User Simulation
 *
 * Targets the FORGE simulation flow specs in tests/e2e/flows/.
 * Runs against production by default. Override with BASE_URL env var.
 *
 * Auth state is saved once by globalSetup (tests/e2e/setup/auth.setup.ts).
 * All specs reuse saved state — no per-test login required.
 *
 * Usage:
 *   npx playwright test --config=playwright.simulation.config.ts
 *   BASE_URL=http://localhost:4000 npx playwright test --config=playwright.simulation.config.ts
 *
 * First run (headed, you can see the login):
 *   HEADED=1 npx playwright test --config=playwright.simulation.config.ts
 *
 * Force re-auth (delete saved state):
 *   rm tests/e2e/auth-state/*.json && npx playwright test --config=playwright.simulation.config.ts
 */

import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'https://evofitmeals.com';
const AUTH_DIR = path.join(__dirname, 'tests/e2e/auth-state');

export default defineConfig({
  testDir: './tests/e2e/flows',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // Sequential for demo data consistency
  globalSetup: './tests/e2e/setup/auth.setup.ts',
  reporter: [
    ['html', { outputFolder: 'tests/e2e/reports/simulation' }],
    ['list'],
    ['json', { outputFile: 'tests/e2e/reports/simulation-results.json' }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'off',
    actionTimeout: 15000,
    navigationTimeout: 30000,
    headless: process.env.HEADED !== '1',
  },
  outputDir: 'tests/e2e/screenshots',
  projects: [
    {
      name: 'as-trainer',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        storageState: path.join(AUTH_DIR, 'trainer.json'),
      },
      testMatch: /0[2-8]-.*\.spec\.ts/,
    },
    {
      name: 'as-client',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        storageState: path.join(AUTH_DIR, 'client.json'),
      },
      testMatch: /06-.*\.spec\.ts/,
    },
    {
      name: 'as-admin',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        storageState: path.join(AUTH_DIR, 'admin.json'),
      },
      testMatch: /09-.*\.spec\.ts/,
    },
    {
      name: 'unauthenticated',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
      testMatch: /01-login\.spec\.ts|10-responsive.*\.spec\.ts/,
    },
  ],
  // No webServer — runs against already-deployed production
});
