import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Bulletproof Playwright Configuration
 * Zero flaky tests | Accessibility compliance | Performance budgets
 */
export default defineConfig({
  testDir: './test/e2e',
  outputDir: './test-results/e2e',

  // ZERO FLAKY TOLERANCE
  fullyParallel: false, // Sequential for deterministic results
  forbidOnly: !!process.env.CI,
  retries: 0, // NO RETRIES - Tests must pass first time
  workers: 1, // Single worker to avoid race conditions

  // Global test settings
  timeout: 30000, // 30 second timeout
  expect: {
    timeout: 10000, // 10 second assertion timeout
  },

  // Comprehensive reporting
  reporter: [
    ['html', { outputFolder: 'reports/playwright', open: 'never' }],
    ['json', { outputFile: 'reports/playwright/results.json' }],
    ['junit', { outputFile: 'reports/playwright/junit.xml' }],
    ['list'],
    ['github'] // For CI integration
  ],

  // Global test configuration
  use: {
    baseURL: 'http://localhost:4000',

    // DETERMINISTIC SETTINGS
    actionTimeout: 10000,
    navigationTimeout: 15000,

    // Always capture evidence
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Consistent browser state
    ignoreHTTPSErrors: true,
    bypassCSP: false, // Don't bypass CSP in tests

    // Performance monitoring
    extraHTTPHeaders: {
      'Accept-Language': 'en-US',
    },
  },

  // Test projects with specific configurations
  projects: [
    // Chromium - Primary testing browser
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        headless: process.env.CI ? true : false,
        viewport: { width: 1280, height: 720 },

        // Performance settings
        launchOptions: {
          args: [
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
          ]
        }
      },
      testMatch: ['**/*.spec.ts', '**/*.test.ts']
    },

    // Mobile testing
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 7'],
        headless: true,
      },
      testMatch: ['**/mobile-*.spec.ts']
    },

    // Accessibility testing
    {
      name: 'accessibility',
      use: {
        ...devices['Desktop Chrome'],
        headless: true,
        viewport: { width: 1280, height: 720 }
      },
      testMatch: ['**/accessibility-*.spec.ts']
    },

    // Performance testing
    {
      name: 'performance',
      use: {
        ...devices['Desktop Chrome'],
        headless: true,
        viewport: { width: 1280, height: 720 }
      },
      testMatch: ['**/performance-*.spec.ts']
    },

    // Critical path testing (Firefox)
    {
      name: 'firefox-critical',
      use: {
        ...devices['Desktop Firefox'],
        headless: true,
        viewport: { width: 1280, height: 720 }
      },
      testMatch: ['**/critical-*.spec.ts']
    }
  ],

  // Global setup and teardown
  globalSetup: './test/setup/global-setup.ts',
  globalTeardown: './test/setup/global-teardown.ts',

  // Test data directory
  testDir: './test/e2e',

  // Web server configuration
  webServer: {
    command: 'echo "Bulletproof E2E tests require Docker dev server: docker-compose --profile dev up -d"',
    url: 'http://localhost:4000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minute startup timeout
    stdout: 'ignore',
    stderr: 'pipe',
  },

  // Metadata for reporting
  metadata: {
    testType: 'bulletproof-e2e',
    environment: process.env.NODE_ENV || 'test',
    version: process.env.npm_package_version || 'dev'
  }
});