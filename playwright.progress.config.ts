import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Recipe Generation Progress Tests
 * 
 * Specialized configuration for testing progress bar and auto-refresh functionality.
 * Optimized for visual feedback and debugging during development.
 */
export default defineConfig({
  testDir: './test/e2e',
  
  /* Test file patterns - only progress tests */
  testMatch: [
    '**/recipe-generation-progress.spec.ts',
    '**/recipe-generation-*.spec.ts'
  ],
  
  /* Run tests sequentially for better debugging */
  fullyParallel: false,
  
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  
  /* Retry configuration */
  retries: process.env.CI ? 2 : 1, // Allow 1 retry locally for flaky network tests
  
  /* Single worker for progress tests to avoid conflicts */
  workers: 1,
  
  /* Timeout configuration */
  timeout: 90000, // 90 seconds for longer progress tests
  expect: {
    timeout: 10000, // 10 seconds for assertions
  },
  
  /* Reporter configuration optimized for progress testing */
  reporter: [
    ['html', { 
      outputFolder: 'playwright-report-progress',
      open: 'never' // Don't auto-open in CI
    }],
    ['list'], // Console output
    ['json', { outputFile: 'test-results/progress-test-results.json' }],
    // Add JUnit for CI integration if needed
    process.env.CI ? ['junit', { outputFile: 'test-results/progress-junit.xml' }] : null
  ].filter(Boolean),
  
  /* Shared settings optimized for progress testing */
  use: {
    /* Base URL for the application */
    baseURL: 'http://localhost:4000',
    
    /* Authentication state reuse to speed up tests */
    // Note: We'll handle auth in test setup instead
    
    /* Tracing configuration */
    trace: 'retain-on-failure', // Keep traces on failure for debugging
    
    /* Screenshot configuration */
    screenshot: 'only-on-failure',
    
    /* Video recording for progress testing */
    video: 'retain-on-failure',
    
    /* Action timeouts */
    actionTimeout: 15000, // 15 seconds for actions (progress updates can be slow)
    navigationTimeout: 30000, // 30 seconds for navigation
    
    /* Default viewport for progress testing */
    viewport: { width: 1280, height: 720 },
    
    /* Ignore HTTPS errors in development */
    ignoreHTTPSErrors: true,
    
    /* Set user agent */
    userAgent: 'FitnessMealPlanner-ProgressTests/1.0',
  },
  
  /* Projects configuration for different testing scenarios */
  projects: [
    {
      name: 'progress-chromium-headed',
      use: { 
        ...devices['Desktop Chrome'],
        headless: false, // Visual feedback for development
        slowMo: 500, // Slow down for better observation
        viewport: { width: 1280, height: 720 },
        // Enable developer tools for debugging
        launchOptions: {
          devtools: false, // Set to true for debugging
        }
      },
    },
    
    {
      name: 'progress-chromium-headless',
      use: { 
        ...devices['Desktop Chrome'],
        headless: true, // For CI/automated testing
        slowMo: 0, // Full speed
        viewport: { width: 1280, height: 720 }
      },
    },
    
    {
      name: 'progress-mobile',
      use: { 
        ...devices['iPhone 12'],
        // Mobile-specific settings for responsive tests
      },
    },
    
    {
      name: 'progress-tablet',
      use: { 
        ...devices['iPad Pro'],
        // Tablet-specific settings
      },
    },
    
    // Uncomment for cross-browser testing
    // {
    //   name: 'progress-firefox',
    //   use: { 
    //     ...devices['Desktop Firefox'],
    //     headless: process.env.CI ? true : false
    //   },
    // },
    
    // {
    //   name: 'progress-webkit',
    //   use: { 
    //     ...devices['Desktop Safari'],
    //     headless: process.env.CI ? true : false
    //   },
    // },
  ],
  
  /* Global test setup and teardown */
  globalSetup: require.resolve('./test/e2e/global-setup.ts'), // Will create this if needed
  globalTeardown: require.resolve('./test/e2e/global-teardown.ts'), // Will create this if needed
  
  /* Output directories */
  outputDir: 'test-results/progress-tests',
  
  /* Web server configuration */
  webServer: {
    command: 'echo "Ensure Docker dev server is running: docker-compose --profile dev up -d"',
    url: 'http://localhost:4000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes to start server
    stdout: 'ignore',
    stderr: 'pipe',
  },
  
  /* Environment variables for progress tests */
  metadata: {
    testType: 'progress',
    version: '1.0.0',
    description: 'Recipe Generation Progress Bar and Auto-Refresh Tests'
  }
});