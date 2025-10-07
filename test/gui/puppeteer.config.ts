import { Configuration } from 'puppeteer';

export const puppeteerConfig: Configuration = {
  headless: process.env.CI ? true : false,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor',
    '--window-size=1920,1080'
  ],
  defaultViewport: {
    width: 1920,
    height: 1080
  },
  slowMo: process.env.CI ? 0 : 50
};

export const testConfig = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:4000',
  timeout: 30000,
  adminCredentials: {
    email: 'admin@fitmeal.pro',
    password: 'Admin123!@#'
  },
  testDataPath: './test/gui/data',
  screenshotsPath: './test/gui/screenshots',
  visualDiffThreshold: 0.2
};