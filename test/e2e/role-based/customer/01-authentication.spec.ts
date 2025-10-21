/**
 * Customer Authentication Tests
 *
 * Tests customer login and authentication flows
 */

import { test, expect } from '@playwright/test';
import { RoleAuthHelper, RoleAssertionHelper } from '../../utils/roleTestHelpers';
import { CustomerDashboardPage } from '../../page-objects/customer/CustomerDashboardPage';

test.describe('Customer Authentication', () => {
  test('Customer can login successfully', async ({ page }) => {
    // Login as customer
    await RoleAuthHelper.loginAsCustomer(page);

    // Verify we're on customer dashboard
    await RoleAuthHelper.verifyRoleAccess(page, 'customer');

    // Verify customer elements visible
    await RoleAssertionHelper.assertCustomerElements(page);
  });

  test('Customer dashboard loads after login', async ({ page }) => {
    // Login
    await RoleAuthHelper.loginAsCustomer(page);

    // Use page object
    const dashboardPage = new CustomerDashboardPage(page);

    // Verify dashboard elements
    await dashboardPage.assertDashboardVisible();
    await dashboardPage.assertWelcomeMessageVisible();
  });

  test('Customer can navigate to meal plans', async ({ page }) => {
    await RoleAuthHelper.loginAsCustomer(page);

    const dashboardPage = new CustomerDashboardPage(page);

    // Navigate to meal plans
    await dashboardPage.goToMealPlans();

    // Verify navigation
    expect(page.url()).toContain('/customer');
  });

  test('Customer can navigate to grocery lists', async ({ page }) => {
    await RoleAuthHelper.loginAsCustomer(page);

    const dashboardPage = new CustomerDashboardPage(page);

    // Navigate to grocery lists
    await dashboardPage.goToGroceryLists();

    // Verify navigation
    expect(page.url()).toContain('grocery');
  });

  test('Customer can logout successfully', async ({ page }) => {
    // Login
    await RoleAuthHelper.loginAsCustomer(page);

    // Verify logged in
    await RoleAuthHelper.verifyRoleAccess(page, 'customer');

    // Logout
    await RoleAuthHelper.logout(page);

    // Verify redirected to login
    expect(page.url()).toContain('/login');
  });
});
