import { defineConfig, devices } from '@playwright/test';

/**
 * MOBILE-OPTIMIZED PLAYWRIGHT CONFIGURATION
 *
 * This configuration is specifically tuned for mobile UI testing with:
 * - Mobile-first device emulation
 * - Extended timeouts for mobile performance
 * - Visual regression testing setup
 * - CI/CD optimized settings
 * - Comprehensive error reporting
 */

export default defineConfig({
  testDir: './test/e2e',

  // Test file patterns - focus on mobile tests
  testMatch: [
    '**/mobile-ui-comprehensive.test.ts',
    '**/mobile-ui-*.test.ts',
    '**/verify-mobile-fixes.test.ts'
  ],

  // Performance settings optimized for mobile testing
  fullyParallel: false, // Sequential for reliable mobile testing
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 1, // More retries for mobile flakiness
  workers: process.env.CI ? 1 : 1, // Single worker for stability
  timeout: 45000, // Extended timeout for mobile performance

  // Global test settings
  use: {
    baseURL: 'http://localhost:4000',

    // Mobile-optimized settings
    actionTimeout: 15000, // Extended for mobile interactions
    navigationTimeout: 30000, // Extended for mobile navigation

    // Visual testing
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',

    // Mobile browser settings
    locale: 'en-US',
    timezoneId: 'America/New_York',

    // Network simulation for realistic mobile conditions
    // Uncomment for network throttling tests:
    // launchOptions: {
    //   slowMo: 100, // Slow down actions for visual verification
    // }
  },

  // Enhanced reporting for mobile test results
  reporter: [
    ['html', {
      outputFolder: 'playwright-report-mobile',
      open: 'never' // Don't auto-open in CI
    }],
    ['list'],
    ['json', { outputFile: 'mobile-test-results.json' }],
    ['junit', { outputFile: 'mobile-test-results.xml' }] // For CI integration
  ],

  // Global setup and teardown
  // globalSetup: process.env.CI ? undefined : './test/global-setup.ts',

  // Mobile device projects
  projects: [
    // === MOBILE DEVICES ===
    {
      name: 'mobile-chrome-iphone',
      use: {
        ...devices['iPhone 12'],
        // Override for more comprehensive mobile testing
        viewport: { width: 375, height: 812 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',

        // Mobile-specific browser settings
        contextOptions: {
          reducedMotion: 'no-preference', // Test animations
          forcedColors: 'none',
        }
      },
    },

    {
      name: 'mobile-chrome-android',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 393, height: 851 },
        deviceScaleFactor: 2.75,
        isMobile: true,
        hasTouch: true,
      },
    },

    {
      name: 'mobile-small-screen',
      use: {
        ...devices['iPhone SE'],
        viewport: { width: 320, height: 568 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },

    // === TABLET DEVICES ===
    {
      name: 'tablet-ipad',
      use: {
        ...devices['iPad'],
        viewport: { width: 768, height: 1024 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },

    {
      name: 'tablet-landscape',
      use: {
        ...devices['iPad'],
        viewport: { width: 1024, height: 768 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },

    // === MOBILE BROWSERS ===
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 12'],
        browserName: 'webkit',
        viewport: { width: 375, height: 812 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },

    {
      name: 'mobile-firefox',
      use: {
        browserName: 'firefox',
        viewport: { width: 375, height: 812 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (Mobile; rv:68.0) Gecko/68.0 Firefox/68.0',
      },
    },

    // === PERFORMANCE TESTING ===
    {
      name: 'mobile-slow-network',
      use: {
        ...devices['iPhone 12'],
        viewport: { width: 375, height: 812 },

        // Simulate slow mobile network
        contextOptions: {
          offline: false,
          // Note: Network throttling would be configured here in real scenarios
        },

        // Extended timeouts for slow network
        actionTimeout: 20000,
        navigationTimeout: 45000,
      },
    },

    // === ACCESSIBILITY TESTING ===
    {
      name: 'mobile-accessibility',
      use: {
        ...devices['iPhone 12'],
        viewport: { width: 375, height: 812 },

        contextOptions: {
          reducedMotion: 'reduce', // Test with reduced motion
          forcedColors: 'active', // Test with high contrast
        }
      },
    },

    // === VISUAL REGRESSION ===
    {
      name: 'mobile-visual-regression',
      use: {
        ...devices['iPhone 12'],
        viewport: { width: 375, height: 812 },

        // Optimized for screenshot stability
        actionTimeout: 10000,

        // Disable animations for consistent screenshots
        contextOptions: {
          reducedMotion: 'reduce',
        }
      },
    },
  ],

  // Development server configuration
  webServer: {
    command: process.env.CI
      ? 'echo "CI: Expecting server to be running"'
      : 'echo "Dev: Please ensure Docker is running: docker-compose --profile dev up -d"',
    url: 'http://localhost:4000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // Extended timeout for Docker startup
    stdout: 'ignore',
    stderr: 'pipe',
  },

  // Test result retention
  outputDir: 'test-results-mobile/',

  // Global expectations for mobile testing
  expect: {
    // Visual comparison settings
    threshold: 0.2, // Allow slight differences in mobile rendering

    // Mobile-specific timeouts
    timeout: 10000,
  },

  // Test metadata
  metadata: {
    testType: 'mobile-ui',
    platform: 'mobile',
    purpose: 'Verify mobile UI fixes for modal positioning and navigation'
  }
});