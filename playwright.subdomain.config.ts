import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for verifying meals.evofit.io subdomain after DNS propagation.
 * Run with: npx playwright test --config=playwright.subdomain.config.ts
 */
export default defineConfig({
  testDir: "./tests/subdomain",
  fullyParallel: true,
  retries: 2,
  workers: 2,
  timeout: 30 * 1000,
  expect: { timeout: 10 * 1000 },

  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report-subdomain", open: "never" }],
  ],

  use: {
    baseURL: "https://meals.evofit.io",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ignoreHTTPSErrors: false,
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        headless: true,
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 5"], headless: true },
    },
  ],
});
