/**
 * NavigationBar
 *
 * Shared page object for navigation bar across all roles
 */

import { Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';

export class NavigationBar extends BasePage {
  // Selectors
  private readonly navbar = '[data-testid="navbar"], nav';
  private readonly logo = '[data-testid="logo"], .logo';
  private readonly homeLink = 'a:has-text("Home"), a:has-text("Dashboard")';
  private readonly userMenu = '[data-testid="user-menu"], .user-dropdown';
  private readonly userMenuButton = 'button:has-text("Profile"), [aria-label="User menu"]';
  private readonly profileLink = 'a:has-text("Profile")';
  private readonly settingsLink = 'a:has-text("Settings")';
  private readonly logoutButton = 'button:has-text("Logout"), a:has-text("Logout"), button:has-text("Sign Out")';
  private readonly notificationsBell = '[data-testid="notifications"], button[aria-label="Notifications"]';
  private readonly notificationsDropdown = '[data-testid="notifications-dropdown"]';
  private readonly notificationItems = '[data-testid="notification-item"]';

  // Role-specific links (conditional)
  private readonly adminLink = 'a:has-text("Admin")';
  private readonly recipesLink = 'a:has-text("Recipes")';
  private readonly mealPlansLink = 'a:has-text("Meal Plans")';
  private readonly customersLink = 'a:has-text("Customers"), a:has-text("My Customers")';
  private readonly progressLink = 'a:has-text("Progress")';
  private readonly groceryListsLink = 'a:has-text("Grocery Lists")';
  private readonly favoritesLink = 'a:has-text("Favorites")';

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    // Navigation bar is present on all pages, no specific navigation needed
    await this.waitForPageLoad();
  }

  async clickLogo(): Promise<void> {
    await this.click(this.logo);
  }

  async clickHome(): Promise<void> {
    await this.click(this.homeLink);
  }

  async openUserMenu(): Promise<void> {
    await this.click(this.userMenuButton);
    await this.waitForVisible(this.userMenu);
  }

  async goToProfile(): Promise<void> {
    await this.openUserMenu();
    await this.click(this.profileLink);
  }

  async goToSettings(): Promise<void> {
    await this.openUserMenu();
    await this.click(this.settingsLink);
  }

  async logout(): Promise<void> {
    await this.openUserMenu();
    await this.click(this.logoutButton);
    await this.page.waitForURL('**/login**');
  }

  async openNotifications(): Promise<void> {
    await this.click(this.notificationsBell);
    await this.waitForVisible(this.notificationsDropdown);
  }

  async getNotificationCount(): Promise<number> {
    return await this.count(this.notificationItems);
  }

  async clickNotification(index: number): Promise<void> {
    await this.page.locator(this.notificationItems).nth(index).click();
  }

  // Role-specific navigation methods
  async goToAdmin(): Promise<void> {
    if (await this.isVisible(this.adminLink)) {
      await this.click(this.adminLink);
    }
  }

  async goToRecipes(): Promise<void> {
    if (await this.isVisible(this.recipesLink)) {
      await this.click(this.recipesLink);
    }
  }

  async goToMealPlans(): Promise<void> {
    if (await this.isVisible(this.mealPlansLink)) {
      await this.click(this.mealPlansLink);
    }
  }

  async goToCustomers(): Promise<void> {
    if (await this.isVisible(this.customersLink)) {
      await this.click(this.customersLink);
    }
  }

  async goToProgress(): Promise<void> {
    if (await this.isVisible(this.progressLink)) {
      await this.click(this.progressLink);
    }
  }

  async goToGroceryLists(): Promise<void> {
    if (await this.isVisible(this.groceryListsLink)) {
      await this.click(this.groceryListsLink);
    }
  }

  async goToFavorites(): Promise<void> {
    if (await this.isVisible(this.favoritesLink)) {
      await this.click(this.favoritesLink);
    }
  }

  // Assertions
  async assertNavbarVisible(): Promise<void> {
    await this.assertVisible(this.navbar);
  }

  async assertLogoVisible(): Promise<void> {
    await this.assertVisible(this.logo);
  }

  async assertUserMenuVisible(): Promise<void> {
    await this.assertVisible(this.userMenuButton);
  }

  async assertNotificationsBellVisible(): Promise<void> {
    await this.assertVisible(this.notificationsBell);
  }

  async assertAdminLinkVisible(): Promise<void> {
    await this.assertVisible(this.adminLink);
  }

  async assertAdminLinkNotVisible(): Promise<void> {
    await this.assertHidden(this.adminLink);
  }
}
