/**
 * Trainer Authentication Tests
 *
 * Tests trainer login and authentication flows
 */

import { test, expect } from '@playwright/test';
import { RoleAuthHelper, RoleAssertionHelper } from '../../utils/roleTestHelpers';
import { TrainerDashboardPage } from '../../page-objects/trainer/TrainerDashboardPage';

test.describe('Trainer Authentication', () => {
  test('Trainer can login successfully', async ({ page }) => {
    // Login as trainer
    await RoleAuthHelper.loginAsTrainer(page);

    // Verify we're on trainer dashboard
    await RoleAuthHelper.verifyRoleAccess(page, 'trainer');

    // Verify trainer elements visible
    await RoleAssertionHelper.assertTrainerElements(page);
  });

  test('Trainer dashboard loads after login', async ({ page }) => {
    // Login
    await RoleAuthHelper.loginAsTrainer(page);

    // Use page object
    const dashboardPage = new TrainerDashboardPage(page);

    // Verify dashboard elements
    await dashboardPage.assertDashboardVisible();
    await dashboardPage.assertWelcomeMessageVisible();
  });

  test('Trainer can navigate to customers', async ({ page }) => {
    await RoleAuthHelper.loginAsTrainer(page);

    const dashboardPage = new TrainerDashboardPage(page);

    // Navigate to customers
    await dashboardPage.goToMyCustomers();

    // Verify navigation
    expect(page.url()).toContain('/trainer');
  });

  test('Trainer can logout successfully', async ({ page }) => {
    // Login
    await RoleAuthHelper.loginAsTrainer(page);

    // Verify logged in
    await RoleAuthHelper.verifyRoleAccess(page, 'trainer');

    // Logout
    await RoleAuthHelper.logout(page);

    // Verify redirected to login
    expect(page.url()).toContain('/login');
  });
});
