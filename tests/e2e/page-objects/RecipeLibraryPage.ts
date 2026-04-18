import { Page, expect } from "@playwright/test";
import { ROUTES } from "../helpers/constants.js";

export class RecipeLibraryPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto(ROUTES.recipes, { waitUntil: "domcontentloaded" });
  }

  async expectLoaded() {
    await expect(this.page).not.toHaveURL(/\/login/);
  }

  async search(query: string) {
    const searchInput = this.page.locator(
      'input[type="search"], input[placeholder*="search" i], input[name="search"], input[placeholder*="Search" i]',
    );
    await searchInput.fill(query);
    // Allow debounce
    await this.page.waitForTimeout(500);
  }

  async getVisibleRecipeCount(): Promise<number> {
    const cards = this.page.locator(
      'article, [class*="recipe"], [class*="Recipe"], [class*="card"], .grid > div, .grid > a',
    );
    return cards.count();
  }

  async openFirstRecipe() {
    const card = this.page
      .locator(
        'article, [class*="recipe"], [class*="Recipe"], [class*="card"], .grid > div, .grid > a',
      )
      .first();
    await expect(card).toBeVisible({ timeout: 15_000 });
    await card.click();
  }

  async filterByMealType(type: string) {
    const filterBtn = this.page.locator(
      `button:has-text("${type}"), [data-value="${type}"]`,
    );
    if ((await filterBtn.count()) > 0) {
      await filterBtn.first().click();
      await this.page.waitForTimeout(500);
    }
  }
}
