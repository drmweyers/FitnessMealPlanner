/**
 * AdminUserManagementPage
 *
 * Page object for Admin User Management features
 */

import { Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';

export interface UserCreationData {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'trainer' | 'customer';
}

export class AdminUserManagementPage extends BasePage {
  // Selectors (using actual DOM selectors)
  private readonly userListContainer = 'table, .user-list, main';
  private readonly userTableRows = 'tbody tr, tr';
  private readonly createUserButton = 'button:has-text("Create User"), button:has-text("Add User"), button:has-text("New User")';
  private readonly userModal = '[role="dialog"], .modal, .user-modal';
  private readonly emailInput = 'input[name="email"], input[type="email"]';
  private readonly passwordInput = 'input[name="password"], input[type="password"]';
  private readonly nameInput = 'input[name="name"], input[placeholder*="name"]';
  private readonly roleSelect = 'select[name="role"], select';
  private readonly submitButton = 'button[type="submit"], button:has-text("Submit"), button:has-text("Save")';
  private readonly successMessage = 'text=Success, text=Created, .success-message';
  private readonly searchInput = 'input[placeholder*="Search"], input[type="search"]';
  private readonly filterRoleSelect = 'select[name="filterRole"], select:has-text("Role")';
  private readonly editButton = 'button:has-text("Edit"), button[aria-label="Edit"]';
  private readonly deleteButton = 'button:has-text("Delete"), button[aria-label="Delete"]';
  private readonly confirmDeleteButton = 'button:has-text("Confirm"), button:has-text("Delete")';

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await this.page.goto('/admin/users');
    await this.waitForPageLoad();
  }

  async clickCreateUser(): Promise<void> {
    await this.click(this.createUserButton);
    await this.waitForModal(this.userModal);
  }

  async fillUserForm(data: UserCreationData): Promise<void> {
    await this.fill(this.emailInput, data.email);
    await this.fill(this.passwordInput, data.password);
    await this.fill(this.nameInput, data.name);
    await this.selectOption(this.roleSelect, data.role);
  }

  async submitUserForm(): Promise<void> {
    await this.click(this.submitButton);
    await this.waitForResponse('/api/admin/users');
  }

  async createUser(data: UserCreationData): Promise<void> {
    await this.clickCreateUser();
    await this.fillUserForm(data);
    await this.submitUserForm();
  }

  async getUserCount(): Promise<number> {
    return await this.count(this.userTableRows);
  }

  async searchUsers(searchTerm: string): Promise<void> {
    await this.fill(this.searchInput, searchTerm);
    await this.waitForResponse('/api/admin/users');
  }

  async filterByRole(role: string): Promise<void> {
    await this.selectOption(this.filterRoleSelect, role);
    await this.waitForResponse('/api/admin/users');
  }

  async editUser(rowIndex: number): Promise<void> {
    await this.page.locator(this.userTableRows).nth(rowIndex).locator(this.editButton).click();
    await this.waitForModal(this.userModal);
  }

  async deleteUser(rowIndex: number): Promise<void> {
    await this.page.locator(this.userTableRows).nth(rowIndex).locator(this.deleteButton).click();
    await this.click(this.confirmDeleteButton);
    await this.waitForResponse('/api/admin/users');
  }

  async getUserEmail(rowIndex: number): Promise<string> {
    return await this.getTableCellText('table', rowIndex, 0);
  }

  async getUserRole(rowIndex: number): Promise<string> {
    return await this.getTableCellText('table', rowIndex, 2);
  }

  async assertUserListVisible(): Promise<void> {
    await this.assertVisible(this.userListContainer);
  }

  async assertUserCreated(): Promise<void> {
    await this.assertVisible(this.successMessage);
  }

  async assertUserVisible(email: string): Promise<void> {
    await this.assertVisible(`text=${email}`);
  }
}
