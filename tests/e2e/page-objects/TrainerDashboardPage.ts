import { Page, expect } from "@playwright/test";
import { ROUTES } from "../helpers/constants.js";

export class TrainerDashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto(ROUTES.trainerDashboard, {
      waitUntil: "domcontentloaded",
    });
  }

  async expectLoaded() {
    await expect(this.page).not.toHaveURL(/\/login/);
    await expect(this.page.locator("body")).toBeVisible();
  }

  async getStatCard(label: RegExp | string) {
    const selector =
      typeof label === "string" ? `text=${label}` : this.page.getByText(label);
    return selector;
  }

  async clickCustomersNav() {
    await this.page.click(
      'a[href*="customers"], a:has-text("Clients"), a:has-text("Customers")',
    );
    await this.page.waitForURL(/customers|clients/);
  }

  async clickMealPlansNav() {
    await this.page.click('a[href*="meal-plans"], a:has-text("Meal Plans")');
    await this.page.waitForURL(/meal-plans/);
  }

  async clickRecipesNav() {
    await this.page.click('a[href*="recipes"], a:has-text("Recipes")');
    await this.page.waitForURL(/recipes/);
  }
}
