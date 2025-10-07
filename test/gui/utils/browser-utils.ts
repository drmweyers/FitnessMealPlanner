import puppeteer, { Browser, Page } from 'puppeteer';
import { puppeteerConfig, testConfig } from '../puppeteer.config';
import fs from 'fs/promises';
import path from 'path';

export class BrowserUtils {
  private static browser: Browser | null = null;
  private static page: Page | null = null;

  static async setup(): Promise<{ browser: Browser; page: Page }> {
    if (!this.browser) {
      this.browser = await puppeteer.launch(puppeteerConfig);
    }
    
    this.page = await this.browser.newPage();
    
    // Set viewport and user agent
    await this.page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1
    });
    
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    );

    // Enable request/response logging in debug mode
    if (process.env.DEBUG) {
      this.page.on('request', (request) => {
        console.log(`Request: ${request.method()} ${request.url()}`);
      });
      
      this.page.on('response', (response) => {
        console.log(`Response: ${response.status()} ${response.url()}`);
      });
    }

    return { browser: this.browser, page: this.page };
  }

  static async teardown(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  static async takeScreenshot(page: Page, name: string): Promise<string> {
    const screenshotDir = path.join(process.cwd(), testConfig.screenshotsPath);
    await fs.mkdir(screenshotDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}_${timestamp}.png`;
    const filepath = path.join(screenshotDir, filename);
    
    await page.screenshot({
      path: filepath,
      fullPage: true,
      type: 'png'
    });
    
    return filepath;
  }

  static async waitForNetworkIdle(page: Page, timeout = 10000): Promise<void> {
    // Puppeteer equivalent of waitForLoadState
    await page.waitForNetworkIdle({ timeout, idleTime: 500 });
  }

  static async waitForTimeout(page: Page, ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  static async login(page: Page, credentials = testConfig.adminCredentials): Promise<void> {
    await page.goto(`${testConfig.baseUrl}/login`);
    await page.waitForSelector('input[type="email"]', { timeout: testConfig.timeout });
    
    // Fill login form
    await page.type('input[type="email"]', credentials.email);
    await page.type('input[type="password"]', credentials.password);
    
    // Submit form
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click('button[type="submit"]')
    ]);
    
    // Verify login success
    await page.waitForSelector('[data-testid="dashboard"], [data-testid="admin-panel"]', 
      { timeout: testConfig.timeout });
  }

  static async navigateToPage(page: Page, route: string): Promise<void> {
    const url = `${testConfig.baseUrl}${route}`;
    await page.goto(url, { waitUntil: 'networkidle0' });
  }

  static async waitForElement(page: Page, selector: string, timeout = testConfig.timeout): Promise<void> {
    await page.waitForSelector(selector, { timeout });
  }

  static async scrollToElement(page: Page, selector: string): Promise<void> {
    await page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, selector);
    
    // Wait for scroll to complete
    await this.waitForTimeout(page, 500);
  }

  static async getElementText(page: Page, selector: string): Promise<string> {
    return page.$eval(selector, (el) => el.textContent?.trim() || '');
  }

  static async clickElement(page: Page, selector: string): Promise<void> {
    await page.waitForSelector(selector, { visible: true });
    await page.click(selector);
  }

  static async typeInField(page: Page, selector: string, text: string, clear = true): Promise<void> {
    await page.waitForSelector(selector, { visible: true });
    
    if (clear) {
      await page.click(selector, { clickCount: 3 });
    }
    
    await page.type(selector, text);
  }

  static async selectOption(page: Page, selector: string, value: string): Promise<void> {
    await page.waitForSelector(selector, { visible: true });
    await page.select(selector, value);
  }

  static async waitForToast(page: Page, expectedText?: string): Promise<string> {
    const toastSelector = '[data-testid="toast"], .toast, [role="alert"]';
    await page.waitForSelector(toastSelector, { timeout: 5000 });
    
    const toastText = await this.getElementText(page, toastSelector);
    
    if (expectedText && !toastText.includes(expectedText)) {
      throw new Error(`Expected toast to contain "${expectedText}", but got "${toastText}"`);
    }
    
    return toastText;
  }

  static async checkForErrors(page: Page): Promise<string[]> {
    const errors: string[] = [];
    
    // Check for console errors
    const logs = await page.evaluate(() => {
      return (window as any).__testLogs || [];
    });
    
    // Check for error messages on page
    const errorElements = await page.$$('.error, [data-testid="error"], .alert-error');
    for (const element of errorElements) {
      const text = await element.evaluate((el) => el.textContent?.trim() || '');
      if (text) errors.push(text);
    }
    
    return errors;
  }
}