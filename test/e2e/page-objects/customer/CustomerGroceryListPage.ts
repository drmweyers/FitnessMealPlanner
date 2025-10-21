/**
 * CustomerGroceryListPage
 *
 * Page object for Customer Grocery List management
 */

import { Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';

export interface GroceryListCreationData {
  name: string;
  mealPlanId?: string;
  items?: string[];
}

export class CustomerGroceryListPage extends BasePage {
  // Selectors (using actual DOM selectors)
  private readonly groceryListContainer = '.grocery-list-container, main, .list-container';
  private readonly createListButton = 'button:has-text("Create Grocery List"), button:has-text("New List")';
  private readonly listCards = '.grocery-list-card, [role="article"], .card';
  private readonly listModal = '[role="dialog"], .modal, .grocery-list-modal';
  private readonly listNameInput = 'input[name="listName"], input[placeholder*="list"]';
  private readonly mealPlanSelect = 'select[name="mealPlanId"], select';
  private readonly generateButton = 'button:has-text("Generate from Meal Plan"), button:has-text("Generate")';
  private readonly manualAddButton = 'button:has-text("Add Item"), button:has-text("Add")';
  private readonly itemInput = 'input[name="item"], input[placeholder*="item"]';
  private readonly addItemButton = 'button:has-text("Add")';
  private readonly groceryItems = '.grocery-item, li, .item';
  private readonly itemCheckbox = 'input[type="checkbox"]';
  private readonly deleteItemButton = 'button[aria-label="Delete"], button:has-text("Delete")';
  private readonly editItemButton = 'button[aria-label="Edit"], button:has-text("Edit")';
  private readonly saveListButton = 'button:has-text("Save")';
  private readonly exportButton = 'button:has-text("Export"), button:has-text("Print")';

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await this.page.goto('/customer/grocery-lists');
    await this.waitForPageLoad();
  }

  async clickCreateList(): Promise<void> {
    await this.click(this.createListButton);
    await this.waitForModal(this.listModal);
  }

  async fillListName(name: string): Promise<void> {
    await this.fill(this.listNameInput, name);
  }

  async selectMealPlan(mealPlanId: string): Promise<void> {
    await this.selectOption(this.mealPlanSelect, mealPlanId);
  }

  async clickGenerateFromMealPlan(): Promise<void> {
    await this.click(this.generateButton);
    await this.waitForResponse('/api/grocery-lists');
  }

  async addManualItem(itemName: string): Promise<void> {
    await this.click(this.manualAddButton);
    await this.fill(this.itemInput, itemName);
    await this.click(this.addItemButton);
  }

  async checkOffItem(index: number): Promise<void> {
    await this.page.locator(this.groceryItems).nth(index).locator(this.itemCheckbox).check();
  }

  async uncheckItem(index: number): Promise<void> {
    await this.page.locator(this.groceryItems).nth(index).locator(this.itemCheckbox).uncheck();
  }

  async deleteItem(index: number): Promise<void> {
    await this.page.locator(this.groceryItems).nth(index).locator(this.deleteItemButton).click();
  }

  async editItem(index: number, newName: string): Promise<void> {
    await this.page.locator(this.groceryItems).nth(index).locator(this.editItemButton).click();
    await this.fill(this.itemInput, newName);
    await this.pressKey('Enter');
  }

  async getItemCount(): Promise<number> {
    return await this.count(this.groceryItems);
  }

  async getCheckedItemCount(): Promise<number> {
    return await this.page.locator(`${this.groceryItems} ${this.itemCheckbox}:checked`).count();
  }

  async clickExport(): Promise<void> {
    await this.click(this.exportButton);
  }

  async saveList(): Promise<void> {
    await this.click(this.saveListButton);
    await this.waitForResponse('/api/grocery-lists');
  }

  async clickListCard(index: number): Promise<void> {
    await this.page.locator(this.listCards).nth(index).click();
  }

  async assertGroceryListContainerVisible(): Promise<void> {
    await this.assertVisible(this.groceryListContainer);
  }

  async assertListCreated(): Promise<void> {
    await this.waitForResponse('/api/grocery-lists');
  }

  async assertItemVisible(itemName: string): Promise<void> {
    await this.assertVisible(`${this.groceryItems}:has-text("${itemName}")`);
  }

  async assertItemChecked(index: number): Promise<void> {
    await this.page.locator(this.groceryItems).nth(index).locator(this.itemCheckbox).isChecked();
  }
}
