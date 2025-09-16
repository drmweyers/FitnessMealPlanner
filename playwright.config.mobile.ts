import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './test/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'test/mobile-test-results' }],
    ['json', { outputFile: 'test/mobile-test-results.json' }],
    ['line']
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:4000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    /* Mobile-specific settings */
    hasTouch: true,
    isMobile: true,
  },

  /* Configure projects for major mobile devices */
  projects: [
    // iPhone devices
    {
      name: 'iPhone SE',
      use: {
        ...devices['iPhone SE'],
        viewport: { width: 375, height: 667 }
      },
    },
    {
      name: 'iPhone 12',
      use: {
        ...devices['iPhone 12'],
        viewport: { width: 390, height: 844 }
      },
    },
    {
      name: 'iPhone 12 Pro Max',
      use: {
        ...devices['iPhone 12 Pro Max'],
        viewport: { width: 428, height: 926 }
      },
    },

    // Android devices
    {
      name: 'Samsung Galaxy S8',
      use: {
        ...devices['Galaxy S8'],
        viewport: { width: 360, height: 740 }
      },
    },
    {
      name: 'Samsung Galaxy S20',
      use: {
        ...devices['Galaxy S20'],
        viewport: { width: 360, height: 800 }
      },
    },
    {
      name: 'Google Pixel 5',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 393, height: 851 }
      },
    },

    // Tablet devices
    {
      name: 'iPad Mini',
      use: {
        ...devices['iPad Mini'],
        viewport: { width: 768, height: 1024 }
      },
    },
    {
      name: 'iPad Pro',
      use: {
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 1366 }
      },
    },

    // Custom performance testing configurations
    {
      name: 'Low-end Mobile',
      use: {
        viewport: { width: 375, height: 667 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 Mobile/15A372 Safari/604.1',
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        // Simulate slower device
        launchOptions: {
          args: ['--cpu-throttling-rate=4']
        }
      },
    },
    {
      name: 'High-end Mobile',
      use: {
        viewport: { width: 428, height: 926 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15A372 Safari/604.1',
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'docker-compose --profile dev up -d && sleep 10',
    port: 4000,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },

  /* Global setup and teardown */
  globalSetup: './test/mobile-test-setup.ts',
  globalTeardown: './test/mobile-test-teardown.ts',

  /* Test timeout */
  timeout: 60000,
  expect: {
    timeout: 10000,
  },

  /* Output directories */
  outputDir: 'test/mobile-test-results',
});