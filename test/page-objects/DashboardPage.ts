/**
 * Dashboard Page Object Model
 * Handles dashboard interactions for all user roles
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  // Common selectors across all dashboard types
  private selectors = {
    // Navigation elements
    logoutButton: 'button:has-text("Logout"), a:has-text("Logout"), [data-testid="logout"]',
    profileLink: 'a[href*="profile"], [data-testid="profile"]',
    
    // Common dashboard elements
    dashboardTitle: 'h1, h2, .dashboard-title, [data-testid="dashboard-title"]',
    navigationMenu: 'nav, .nav, [data-testid="nav"]',
    
    // Admin specific
    adminFeatures: {
      recipeManagement: 'text="Recipe Management", [href*="recipe"], [data-testid="recipes"]',
      userManagement: 'text="User Management", text="Users", [data-testid="users"]',
      systemStats: 'text="Statistics", text="Stats", [data-testid="stats"]',
      approveButton: 'button:has-text("Approve")'
    },
    
    // Trainer specific
    trainerFeatures: {
      customerInvite: 'text="Invite Customer", text="Invite", [data-testid="invite"]',
      customerList: 'text="Customers", [data-testid="customers"]',
      mealPlans: 'text="Meal Plans", [data-testid="meal-plans"]'
    },
    
    // Customer specific
    customerFeatures: {
      myMealPlans: 'text="My Meal Plans", [data-testid="my-meal-plans"]',
      progress: 'text="Progress", [data-testid="progress"]',
      recipes: 'text="Recipes", [data-testid="recipes"]'
    }
  };

  constructor(page: Page, baseUrl?: string) {
    super(page, baseUrl);
  }

  /**
   * Wait for dashboard to load
   */
  async waitForDashboardLoad() {
    await this.waitForPageLoad();
    // Wait for either navigation or dashboard title
    try {
      await Promise.race([
        this.page.waitForSelector(this.selectors.navigationMenu, { timeout: 5000 }),
        this.page.waitForSelector(this.selectors.dashboardTitle, { timeout: 5000 })
      ]);
    } catch {
      // Continue if neither found - some dashboards might have different structure
    }
  }

  /**
   * Logout from dashboard
   */
  async logout() {
    await this.addVisualIndicator('Logging out');
    
    const logoutButton = await this.page.$(this.selectors.logoutButton);
    if (logoutButton) {
      await Promise.all([
        this.page.waitForNavigation({ timeout: 10000 }),
        logoutButton.click()
      ]);
    } else {
      // Fallback - clear session manually
      await this.clearSession();
      await this.goto('/login');
    }
    
    await this.waitForPageLoad();
  }

  /**
   * Verify admin dashboard features
   */
  async verifyAdminFeatures() {
    await this.addVisualIndicator('Verifying Admin Features');
    
    const features = Object.values(this.selectors.adminFeatures);
    let foundFeatures = 0;
    
    for (const feature of features) {
      try {
        const element = this.page.locator(feature).first();
        if (await element.isVisible({ timeout: 2000 })) {
          foundFeatures++;
        }
      } catch {
        // Feature not found or not visible
      }
    }
    
    expect(foundFeatures).toBeGreaterThan(0);
    return foundFeatures;
  }

  /**
   * Verify trainer dashboard features
   */
  async verifyTrainerFeatures() {
    await this.addVisualIndicator('Verifying Trainer Features');
    
    const features = Object.values(this.selectors.trainerFeatures);
    let foundFeatures = 0;
    
    for (const feature of features) {
      try {
        const element = this.page.locator(feature).first();
        if (await element.isVisible({ timeout: 2000 })) {
          foundFeatures++;
        }
      } catch {
        // Feature not found or not visible
      }
    }
    
    expect(foundFeatures).toBeGreaterThan(0);
    return foundFeatures;
  }

  /**
   * Verify customer dashboard features
   */
  async verifyCustomerFeatures() {
    await this.addVisualIndicator('Verifying Customer Features');
    
    const features = Object.values(this.selectors.customerFeatures);
    let foundFeatures = 0;
    
    for (const feature of features) {
      try {
        const element = this.page.locator(feature).first();
        if (await element.isVisible({ timeout: 2000 })) {
          foundFeatures++;
        }
      } catch {
        // Feature not found or not visible
      }
    }
    
    expect(foundFeatures).toBeGreaterThan(0);
    return foundFeatures;
  }

  /**
   * Check if user has access to admin features (should fail for non-admins)
   */
  async hasAdminAccess(): Promise<boolean> {
    try {
      const adminFeature = this.page.locator(this.selectors.adminFeatures.approveButton).first();
      return await adminFeature.isVisible({ timeout: 2000 });
    } catch {
      return false;
    }
  }

  /**
   * Navigate to profile page
   */
  async navigateToProfile() {
    const profileLink = await this.page.$(this.selectors.profileLink);
    if (profileLink) {
      await profileLink.click();
      await this.waitForPageLoad();
    }
  }

  /**
   * Verify dashboard accessibility
   */
  async verifyAccessibility() {
    // Check for basic accessibility elements
    const title = await this.page.title();
    expect(title.length).toBeGreaterThan(0);
    
    // Check for navigation landmarks
    const hasNavigation = await this.elementExists('nav, [role="navigation"]');
    const hasMain = await this.elementExists('main, [role="main"]');
    
    // At least one should exist for proper structure
    expect(hasNavigation || hasMain).toBeTruthy();
  }
}