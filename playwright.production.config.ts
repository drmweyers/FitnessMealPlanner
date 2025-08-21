import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Production Environment Testing
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './test/e2e',
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 3 : 1,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : 2,
  
  /* Global timeout for entire test suite */
  globalTimeout: 60 * 60 * 1000, // 1 hour
  
  /* Timeout for each test */
  timeout: 60 * 1000, // 1 minute per test
  
  /* Expect timeout */
  expect: {
    timeout: 10 * 1000, // 10 seconds for assertions
  },

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { 
      outputFolder: 'playwright-report-production',
      open: 'never' 
    }],
    ['list'],
    ['json', { outputFile: 'test-results-production.json' }],
    ['junit', { outputFile: 'test-results-production.xml' }]
  ],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'https://evofitmeals.com',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'retain-on-failure',
    
    /* Take screenshots on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Extra HTTP headers */
    extraHTTPHeaders: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    
    /* Network conditions */
    offline: false,
    
    /* Ignore HTTPS errors */
    ignoreHTTPSErrors: false,
    
    /* User agent */
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 PlaywrightTesting/1.0',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium-production',
      use: { 
        ...devices['Desktop Chrome'],
        // Production testing should be headless
        headless: true,
        // No slow motion for production
        slowMo: 0,
        // Standard viewport
        viewport: { width: 1280, height: 720 },
        // Longer timeout for production network
        navigationTimeout: 30000,
        actionTimeout: 15000,
      },
    },

    {
      name: 'firefox-production',
      use: { 
        ...devices['Desktop Firefox'],
        headless: true,
        slowMo: 0,
        viewport: { width: 1280, height: 720 },
        navigationTimeout: 30000,
        actionTimeout: 15000,
      },
    },

    {
      name: 'webkit-production',
      use: { 
        ...devices['Desktop Safari'],
        headless: true,
        slowMo: 0,
        viewport: { width: 1280, height: 720 },
        navigationTimeout: 30000,
        actionTimeout: 15000,
      },
    },

    /* Mobile testing */
    {
      name: 'mobile-chrome-production',
      use: { 
        ...devices['Pixel 5'],
        headless: true,
        slowMo: 0,
        navigationTimeout: 30000,
        actionTimeout: 15000,
      },
    },

    {
      name: 'mobile-safari-production',
      use: { 
        ...devices['iPhone 12'],
        headless: true,
        slowMo: 0,
        navigationTimeout: 30000,
        actionTimeout: 15000,
      },
    },

    /* Tablet testing */
    {
      name: 'tablet-production',
      use: { 
        ...devices['iPad Pro'],
        headless: true,
        slowMo: 0,
        navigationTimeout: 30000,
        actionTimeout: 15000,
      },
    },
  ],

  /* No webServer for production - we're testing the live site */
  webServer: undefined,
});