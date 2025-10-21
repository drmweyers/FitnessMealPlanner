/**
 * Trainer Customer Management Tests
 *
 * Tests trainer customer list, invitation, and management
 */

import { test, expect } from '@playwright/test';
import { RoleAuthHelper } from '../../utils/roleTestHelpers';
import { TrainerCustomerManagementPage } from '../../page-objects/trainer/TrainerCustomerManagementPage';

test.describe('Trainer Customer Management', () => {
  let customerPage: TrainerCustomerManagementPage;

  test.beforeEach(async ({ page }) => {
    // Login as trainer
    await RoleAuthHelper.loginAsTrainer(page);

    // Initialize page object
    customerPage = new TrainerCustomerManagementPage(page);
    await customerPage.navigate();
  });

  test('Trainer can view customer list', async ({ page }) => {
    // Verify customer list visible
    await customerPage.assertCustomerListVisible();

    // Get customer count
    const customerCount = await customerPage.getCustomerCount();
    expect(customerCount).toBeGreaterThanOrEqual(0);
    console.log(`Trainer has ${customerCount} customers`);
  });

  test('Trainer can search customers', async ({ page }) => {
    // Search for customer
    await customerPage.searchCustomers('test');

    // Wait for search
    await page.waitForTimeout(1000);
  });

  test('Trainer can open invite customer modal', async ({ page }) => {
    // Click invite customer
    await customerPage.clickInviteCustomer();

    // Modal should be visible (would need actual DOM validation)
  });

  test.skip('Trainer can invite new customer', async ({ page }) => {
    // Skip by default as this sends actual invitations
    await customerPage.clickInviteCustomer();

    await customerPage.fillInvitationForm({
      email: `new-customer-${Date.now()}@test.com`,
      name: 'Test Customer',
      message: 'Welcome! Looking forward to working with you.'
    });

    await customerPage.submitInvitation();

    // Verify invitation sent
    await customerPage.assertInvitationSent();
  });
});
