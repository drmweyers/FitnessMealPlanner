/**
 * Login Page Object Model
 * Handles all login page interactions
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  // Selectors
  private selectors = {
    emailInput: 'input[type="email"]',
    passwordInput: 'input[type="password"]',
    submitButton: 'button[type="submit"]',
    errorMessage: '.error, [data-testid="error"], .text-red-500, .alert-error',
    forgotPasswordLink: 'a[href*="forgot"], text="Forgot Password"',
    registerLink: 'a[href*="register"], text="Register"'
  };

  constructor(page: Page, baseUrl?: string) {
    super(page, baseUrl);
  }

  /**
   * Navigate to login page
   */
  async navigate() {
    await this.goto('/login');
    await this.waitForElement(this.selectors.emailInput);
  }

  /**
   * Fill email field
   */
  async fillEmail(email: string) {
    await this.page.fill(this.selectors.emailInput, email);
  }

  /**
   * Fill password field
   */
  async fillPassword(password: string) {
    await this.page.fill(this.selectors.passwordInput, password);
  }

  /**
   * Click submit button
   */
  async clickSubmit() {
    await this.page.click(this.selectors.submitButton);
  }

  /**
   * Complete login process
   */
  async login(email: string, password: string) {
    await this.addVisualIndicator(`Logging in as ${email}`);
    await this.fillEmail(email);
    await this.fillPassword(password);
    
    // Submit and wait for navigation
    await Promise.all([
      this.page.waitForNavigation({ timeout: 10000 }),
      this.clickSubmit()
    ]);
    
    await this.waitForPageLoad();
  }

  /**
   * Submit empty form (for validation testing)
   */
  async submitEmptyForm() {
    await this.clickSubmit();
    await this.page.waitForTimeout(2000);
  }

  /**
   * Check for validation errors
   */
  async hasValidationErrors(): Promise<boolean> {
    const errorElements = await this.page.$$(this.selectors.errorMessage);
    return errorElements.length > 0;
  }

  /**
   * Get error messages
   */
  async getErrorMessages(): Promise<string[]> {
    const errorElements = await this.page.$$(this.selectors.errorMessage);
    const messages: string[] = [];
    
    for (const element of errorElements) {
      const text = await element.textContent();
      if (text) {
        messages.push(text.trim());
      }
    }
    
    return messages;
  }

  /**
   * Check if still on login page (failed login)
   */
  async isStillOnLoginPage(): Promise<boolean> {
    const currentUrl = this.getCurrentUrl();
    return currentUrl.includes('/login');
  }

  /**
   * Verify login page elements
   */
  async verifyPageElements() {
    await expect(this.page.locator(this.selectors.emailInput)).toBeVisible();
    await expect(this.page.locator(this.selectors.passwordInput)).toBeVisible();
    await expect(this.page.locator(this.selectors.submitButton)).toBeVisible();
  }

  /**
   * Check page title
   */
  async verifyTitle() {
    const title = await this.page.title();
    expect(title.length).toBeGreaterThan(0);
    expect(title).toMatch(/EvoFit|Login|FitnessMealPlanner/);
  }
}