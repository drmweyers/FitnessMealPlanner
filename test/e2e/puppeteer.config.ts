/**
 * Puppeteer Configuration for Business Logic Tests
 * 
 * Optimized configuration for reliable E2E testing of business logic
 */

import { PuppeteerLaunchOptions } from 'puppeteer';

export const PUPPETEER_CONFIG: PuppeteerLaunchOptions = {
  // Use headless mode for CI/CD, can be overridden for debugging
  headless: process.env.PUPPETEER_HEADLESS !== 'false',
  
  // Browser arguments for better stability
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--disable-gpu',
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor'
  ],
  
  // Slow down for better reliability
  slowMo: process.env.NODE_ENV === 'test' ? 0 : 50,
  
  // Default viewport
  defaultViewport: {
    width: 1366,
    height: 768
  }
};

export const TEST_CONFIG = {
  // Base URL for the application
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:4000',
  
  // Timeout settings
  timeout: 30000,
  navigationTimeout: 30000,
  
  // Test account credentials
  accounts: {
    admin: {
      email: 'admin@fitmeal.pro',
      password: 'Admin123!@#',
      expectedRole: 'admin',
      expectedRedirect: '/admin'
    },
    trainer: {
      email: 'testtrainer@example.com',
      password: 'TrainerPassword123!',
      expectedRole: 'trainer',
      expectedRedirect: '/trainer'
    },
    customer: {
      email: 'testcustomer@example.com',
      password: 'TestPassword123!',
      expectedRole: 'customer',
      expectedRedirect: '/my-meal-plans'
    }
  },
  
  // Test data paths
  testDataPath: './test/e2e/data',
  
  // Screenshot settings
  screenshots: {
    enabled: process.env.PUPPETEER_SCREENSHOTS === 'true',
    path: './test/e2e/screenshots',
    onFailure: true
  },
  
  // Retry settings
  retry: {
    attempts: process.env.CI ? 3 : 1,
    delay: 1000
  }
};

export default TEST_CONFIG;