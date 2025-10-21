/**
 * TrainerMealPlanPage
 *
 * Page object for Trainer Meal Plan creation and management
 */

import { Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';

export interface MealPlanCreationData {
  planName: string;
  customerId: string;
  days: number;
  dailyCalories: number;
  fitnessGoal: string;
  selectedRecipes?: string[];
}

export class TrainerMealPlanPage extends BasePage {
  // Selectors (using actual DOM selectors)
  private readonly mealPlanListContainer = '.meal-plan-list, main, div:has(.meal-plan-card)';
  private readonly createMealPlanButton = 'button:has-text("Create Meal Plan"), button:has-text("New Plan")';
  private readonly mealPlanModal = '[role="dialog"], .modal, .meal-plan-modal';
  private readonly planNameInput = 'input[name="planName"], input[placeholder*="plan"]';
  private readonly customerSelect = 'select[name="customerId"], select:has-text("Customer")';
  private readonly daysInput = 'input[name="days"], input[type="number"]';
  private readonly caloriesInput = 'input[name="dailyCalories"], input[type="number"]';
  private readonly fitnessGoalSelect = 'select[name="fitnessGoal"], select';
  private readonly recipeSelector = '.recipe-selector, .recipe-list';
  private readonly recipeCheckbox = 'input[type="checkbox"][name="recipes"], input[type="checkbox"]';
  private readonly submitButton = 'button[type="submit"], button:has-text("Create"), button:has-text("Save")';
  private readonly mealPlanCards = '.meal-plan-card, [role="article"], .card';
  private readonly assignButton = 'button:has-text("Assign")';
  private readonly assignModal = '[role="dialog"], .modal, .assign-modal';
  private readonly assignCustomerSelect = 'select[name="assignCustomer"], select';
  private readonly confirmAssignButton = 'button:has-text("Confirm"), button:has-text("Assign")';

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await this.page.goto('/trainer/meal-plans');
    await this.waitForPageLoad();
  }

  async clickCreateMealPlan(): Promise<void> {
    await this.click(this.createMealPlanButton);
    await this.waitForModal(this.mealPlanModal);
  }

  async fillMealPlanForm(data: MealPlanCreationData): Promise<void> {
    await this.fill(this.planNameInput, data.planName);
    await this.selectOption(this.customerSelect, data.customerId);
    await this.fill(this.daysInput, data.days.toString());
    await this.fill(this.caloriesInput, data.dailyCalories.toString());
    await this.selectOption(this.fitnessGoalSelect, data.fitnessGoal);

    if (data.selectedRecipes) {
      for (const recipeId of data.selectedRecipes) {
        await this.check(`${this.recipeCheckbox}[value="${recipeId}"]`);
      }
    }
  }

  async submitMealPlan(): Promise<void> {
    await this.click(this.submitButton);
    await this.waitForResponse('/api/trainer/meal-plans');
  }

  async createMealPlan(data: MealPlanCreationData): Promise<void> {
    await this.clickCreateMealPlan();
    await this.fillMealPlanForm(data);
    await this.submitMealPlan();
  }

  async getMealPlanCount(): Promise<number> {
    return await this.count(this.mealPlanCards);
  }

  async clickMealPlanCard(index: number): Promise<void> {
    await this.page.locator(this.mealPlanCards).nth(index).click();
  }

  async assignMealPlanToCustomer(planIndex: number, customerId: string): Promise<void> {
    await this.page.locator(this.mealPlanCards).nth(planIndex).locator(this.assignButton).click();
    await this.waitForModal(this.assignModal);
    await this.selectOption(this.assignCustomerSelect, customerId);
    await this.click(this.confirmAssignButton);
    await this.waitForResponse('/api/trainer/meal-plans/assign');
  }

  async assertMealPlanListVisible(): Promise<void> {
    await this.assertVisible(this.mealPlanListContainer);
  }

  async assertMealPlanCreated(): Promise<void> {
    await this.waitForResponse('/api/trainer/meal-plans');
  }

  async assertMealPlanVisible(planName: string): Promise<void> {
    await this.assertVisible(`text=${planName}`);
  }
}
