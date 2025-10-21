/**
 * TrainerCustomerManagementPage
 *
 * Page object for Trainer Customer Management features
 */

import { Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';

export interface CustomerInvitationData {
  email: string;
  name?: string;
  message?: string;
}

export class TrainerCustomerManagementPage extends BasePage {
  // Selectors (using actual DOM selectors)
  private readonly customerListContainer = '.customer-list, main, div:has(.customer-card)';
  private readonly customerCards = '.customer-card, [role="article"], .card';
  private readonly inviteCustomerButton = 'button:has-text("Invite Customer"), button:has-text("Invite")';
  private readonly inviteModal = '[role="dialog"], .modal, .invite-modal';
  private readonly emailInput = 'input[name="email"], input[type="email"]';
  private readonly nameInput = 'input[name="name"], input[placeholder*="name"]';
  private readonly messageInput = 'textarea[name="message"], textarea';
  private readonly sendInvitationButton = 'button[type="submit"]:has-text("Send"), button:has-text("Invite")';
  private readonly successMessage = 'text=Success, text=Invited, .success-message';
  private readonly searchInput = 'input[placeholder*="Search"], input[type="search"]';

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await this.page.goto('/trainer');
    await this.waitForPageLoad();
  }

  async clickInviteCustomer(): Promise<void> {
    await this.click(this.inviteCustomerButton);
    await this.waitForModal(this.inviteModal);
  }

  async fillInvitationForm(data: CustomerInvitationData): Promise<void> {
    await this.fill(this.emailInput, data.email);
    if (data.name) await this.fill(this.nameInput, data.name);
    if (data.message) await this.fill(this.messageInput, data.message);
  }

  async submitInvitation(): Promise<void> {
    await this.click(this.sendInvitationButton);
    await this.waitForResponse('/api/trainer/invite');
  }

  async getCustomerCount(): Promise<number> {
    return await this.count(this.customerCards);
  }

  async searchCustomers(searchTerm: string): Promise<void> {
    await this.fill(this.searchInput, searchTerm);
  }

  async assertCustomerListVisible(): Promise<void> {
    await this.assertVisible(this.customerListContainer);
  }

  async assertInvitationSent(): Promise<void> {
    await this.assertVisible(this.successMessage);
  }
}
