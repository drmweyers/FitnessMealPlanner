/**
 * Admin Authentication Tests
 *
 * Tests admin login, logout, and authentication flows
 */

import { test, expect } from '@playwright/test';
import { RoleAuthHelper, RoleAssertionHelper } from '../../utils/roleTestHelpers';
import { AdminDashboardPage } from '../../page-objects/admin/AdminDashboardPage';
import { LoginPage } from '../../page-objects/shared/LoginPage';

test.describe('Admin Authentication', () => {
  test('Admin can login successfully', async ({ page }) => {
    // Use helper to login
    await RoleAuthHelper.loginAsAdmin(page);

    // Verify we're on admin dashboard
    await RoleAuthHelper.verifyRoleAccess(page, 'admin');

    // Verify admin elements visible
    await RoleAssertionHelper.assertAdminElements(page);
  });

  test('Admin dashboard loads after login', async ({ page }) => {
    // Login as admin
    await RoleAuthHelper.loginAsAdmin(page);

    // Use page object
    const dashboardPage = new AdminDashboardPage(page);

    // Verify dashboard elements
    await dashboardPage.assertDashboardVisible();
    await dashboardPage.assertWelcomeMessageVisible();
  });

  test('Admin can navigate to different sections', async ({ page }) => {
    // Login
    await RoleAuthHelper.loginAsAdmin(page);

    const dashboardPage = new AdminDashboardPage(page);

    // Navigate to Recipes
    await dashboardPage.goToRecipes();
    expect(page.url()).toContain('/admin');

    // Navigate back to dashboard
    await dashboardPage.navigate();
    await dashboardPage.assertDashboardVisible();
  });

  test('Admin can logout successfully', async ({ page }) => {
    // Login
    await RoleAuthHelper.loginAsAdmin(page);

    // Verify logged in
    await RoleAuthHelper.verifyRoleAccess(page, 'admin');

    // Logout
    await RoleAuthHelper.logout(page);

    // Verify redirected to login
    expect(page.url()).toContain('/login');
  });

  test('Invalid admin credentials show error', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    // Try invalid credentials
    await loginPage.login('invalid@admin.com', 'wrongpassword');

    // Should show error
    await loginPage.assertLoginError();
  });
});
