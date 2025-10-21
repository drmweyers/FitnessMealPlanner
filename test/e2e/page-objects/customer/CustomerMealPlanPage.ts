/**
 * CustomerMealPlanPage
 *
 * Page object for Customer Meal Plan features
 */

import { Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';

export interface MealPlanGenerationData {
  planName: string;
  days: number;
  dailyCalories: number;
  fitnessGoal: string;
  dietaryRestrictions?: string[];
}

export class CustomerMealPlanPage extends BasePage {
  // Selectors (using actual DOM selectors)
  private readonly mealPlanListContainer = '.meal-plan-list, main, div:has(.meal-plan-card)';
  private readonly mealPlanCards = '.meal-plan-card, [role="article"], .card';
  private readonly generateMealPlanButton = 'button:has-text("Generate Meal Plan"), button:has-text("Generate")';
  private readonly generationModal = '[role="dialog"], .modal, .generation-modal';
  private readonly planNameInput = 'input[name="planName"], input[placeholder*="plan"]';
  private readonly daysInput = 'input[name="days"], input[type="number"]';
  private readonly caloriesInput = 'input[name="dailyCalories"], input[type="number"]';
  private readonly fitnessGoalSelect = 'select[name="fitnessGoal"], select';
  private readonly dietaryCheckboxes = 'input[name="dietaryRestrictions"], input[type="checkbox"]';
  private readonly submitGenerationButton = 'button[type="submit"]:has-text("Generate"), button:has-text("Create")';
  private readonly mealPlanDetails = '.meal-plan-details, .details, main';
  private readonly recipes = '.recipe-item, [role="article"], .recipe';
  private readonly generateGroceryListButton = 'button:has-text("Generate Grocery List"), button:has-text("Grocery")';
  private readonly groceryListSuccess = 'text=Success, text=Created, .success-message';

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await this.page.goto('/customer/meal-plans');
    await this.waitForPageLoad();
  }

  async clickGenerateMealPlan(): Promise<void> {
    await this.click(this.generateMealPlanButton);
    await this.waitForModal(this.generationModal);
  }

  async fillMealPlanForm(data: MealPlanGenerationData): Promise<void> {
    await this.fill(this.planNameInput, data.planName);
    await this.fill(this.daysInput, data.days.toString());
    await this.fill(this.caloriesInput, data.dailyCalories.toString());
    await this.selectOption(this.fitnessGoalSelect, data.fitnessGoal);

    if (data.dietaryRestrictions) {
      for (const restriction of data.dietaryRestrictions) {
        await this.check(`${this.dietaryCheckboxes}[value="${restriction}"]`);
      }
    }
  }

  async submitMealPlanGeneration(): Promise<void> {
    await this.click(this.submitGenerationButton);
    await this.waitForResponse('/api/meal-plans');
  }

  async generateMealPlan(data: MealPlanGenerationData): Promise<void> {
    await this.clickGenerateMealPlan();
    await this.fillMealPlanForm(data);
    await this.submitMealPlanGeneration();
  }

  async getMealPlanCount(): Promise<number> {
    return await this.count(this.mealPlanCards);
  }

  async clickFirstMealPlan(): Promise<void> {
    await this.page.locator(this.mealPlanCards).first().click();
    await this.waitForVisible(this.mealPlanDetails);
  }

  async clickGenerateGroceryList(): Promise<void> {
    await this.click(this.generateGroceryListButton);
    await this.waitForResponse('/api/grocery-lists');
  }

  async assertMealPlanListVisible(): Promise<void> {
    await this.assertVisible(this.mealPlanListContainer);
  }

  async assertMealPlanDetailsVisible(): Promise<void> {
    await this.assertVisible(this.mealPlanDetails);
  }

  async assertRecipesDisplayed(): Promise<void> {
    const count = await this.count(this.recipes);
    expect(count).toBeGreaterThan(0);
  }

  async assertMealPlanVisible(planName: string): Promise<void> {
    await this.assertVisible(`text=${planName}`);
  }

  async assertGroceryListGenerated(): Promise<void> {
    await this.assertVisible(this.groceryListSuccess);
  }
}
