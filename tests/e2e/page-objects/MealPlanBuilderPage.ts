import { Page, expect } from "@playwright/test";
import { ROUTES } from "../helpers/constants.js";

export class MealPlanBuilderPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto(ROUTES.manualMealPlan, {
      waitUntil: "domcontentloaded",
    });
  }

  async expectLoaded() {
    await expect(this.page).not.toHaveURL(/\/login/);
  }

  async fillPlanName(name: string) {
    await this.page.fill(
      'input[name="planName"], input[placeholder*="plan name" i]',
      name,
    );
  }

  async setTargetCalories(cal: number) {
    const calorieInput = this.page.locator(
      'input[name="calories"], input[placeholder*="calorie" i]',
    );
    if ((await calorieInput.count()) > 0) {
      await calorieInput.fill(String(cal));
    }
  }

  async savePlan() {
    await this.page.click(
      'button:has-text("Save"), button:has-text("Create"), button[type="submit"]',
    );
  }
}
