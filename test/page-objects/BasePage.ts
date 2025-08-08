/**
 * Base Page Object Model
 * Contains common functionality shared across all pages
 */

import { Page, expect } from '@playwright/test';

export class BasePage {
  protected page: Page;
  protected baseUrl: string;

  constructor(page: Page, baseUrl: string = 'http://localhost:4000') {
    this.page = page;
    this.baseUrl = baseUrl;
  }

  /**
   * Navigate to a specific path
   */
  async goto(path: string = '') {
    const fullUrl = `${this.baseUrl}${path}`;
    await this.page.goto(fullUrl);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for an element to be visible
   */
  async waitForElement(selector: string, timeout: number = 10000) {
    await this.page.waitForSelector(selector, { timeout, state: 'visible' });
  }

  /**
   * Take a screenshot with timestamp
   */
  async takeScreenshot(name: string) {
    const timestamp = new Date().getTime();
    const filename = `${name}-${timestamp}.png`;
    await this.page.screenshot({ 
      path: `test-screenshots/${filename}`,
      fullPage: true 
    });
    return filename;
  }

  /**
   * Wait for page to load completely
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000); // Additional buffer
  }

  /**
   * Check if element exists
   */
  async elementExists(selector: string): Promise<boolean> {
    const element = await this.page.$(selector);
    return element !== null;
  }

  /**
   * Get current URL
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /**
   * Check if we're on expected path
   */
  async verifyPath(expectedPath: string) {
    const currentUrl = this.getCurrentUrl();
    expect(currentUrl).toContain(expectedPath);
  }

  /**
   * Clear all cookies and storage
   */
  async clearSession() {
    await this.page.context().clearCookies();
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }

  /**
   * Add visual indicator for test steps
   */
  async addVisualIndicator(stepName: string) {
    await this.page.evaluate((step) => {
      const indicator = document.createElement('div');
      indicator.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #4CAF50;
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      `;
      indicator.textContent = `Testing: ${step}`;
      indicator.id = 'test-indicator';
      
      const existing = document.getElementById('test-indicator');
      if (existing) existing.remove();
      
      document.body.appendChild(indicator);
      
      setTimeout(() => {
        const elem = document.getElementById('test-indicator');
        if (elem) elem.remove();
      }, 3000);
    }, stepName);
    
    await this.page.waitForTimeout(1500);
  }
}