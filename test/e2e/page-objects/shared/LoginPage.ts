/**
 * LoginPage
 *
 * Shared page object for login functionality across all roles
 */

import { Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';

export class LoginPage extends BasePage {
  // Selectors (using text-based and actual input types)
  private readonly emailInput = 'input[name="email"], input[type="email"]';
  private readonly passwordInput = 'input[name="password"], input[type="password"]';
  private readonly loginButton = 'button[type="submit"]:has-text("Login"), button:has-text("Sign In")';
  private readonly errorMessage = 'text=Invalid, text=Error, text=Failed, .error-message, .alert-error';
  private readonly forgotPasswordLink = 'a:has-text("Forgot Password")';
  private readonly registerLink = 'a:has-text("Register"), a:has-text("Sign Up")';

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await this.page.goto('/login');
    await this.waitForPageLoad();
  }

  async login(email: string, password: string): Promise<void> {
    await this.fill(this.emailInput, email);
    await this.fill(this.passwordInput, password);
    await this.click(this.loginButton);
    await this.waitForPageLoad();
  }

  async assertLoginSuccessful(): Promise<void> {
    // After successful login, URL should change from /login
    await this.page.waitForFunction(() => !window.location.pathname.includes('/login'), {
      timeout: 10000
    });
  }

  async assertLoginError(): Promise<void> {
    // Check if still on login page (indicates error occurred)
    await this.page.waitForTimeout(2000); // Wait for any error to appear

    // Try to find error message, or verify we're still on login page
    const onLoginPage = this.page.url().includes('/login');
    const errorVisible = await this.page.locator(this.errorMessage).count() > 0;

    if (!onLoginPage && !errorVisible) {
      throw new Error('Expected login error, but login succeeded or no error shown');
    }
  }

  async clickForgotPassword(): Promise<void> {
    await this.click(this.forgotPasswordLink);
  }

  async clickRegister(): Promise<void> {
    await this.click(this.registerLink);
  }
}
