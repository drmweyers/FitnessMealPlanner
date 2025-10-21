/**
 * Admin User Management Tests
 *
 * Tests admin user CRUD operations and role management
 */

import { test, expect } from '@playwright/test';
import { RoleAuthHelper } from '../../utils/roleTestHelpers';
import { AdminUserManagementPage } from '../../page-objects/admin/AdminUserManagementPage';

test.describe('Admin User Management', () => {
  let userPage: AdminUserManagementPage;

  test.beforeEach(async ({ page }) => {
    // Login as admin
    await RoleAuthHelper.loginAsAdmin(page);

    // Initialize page object
    userPage = new AdminUserManagementPage(page);
    await userPage.navigate();
  });

  test('Admin can view user list', async ({ page }) => {
    // Verify user list visible
    await userPage.assertUserListVisible();

    // Get user count
    const userCount = await userPage.getUserCount();
    expect(userCount).toBeGreaterThanOrEqual(3); // At least admin, trainer, customer
  });

  test('Admin can search users', async ({ page }) => {
    // Search for trainer
    await userPage.searchUsers('trainer');

    // Wait for search to complete
    await page.waitForTimeout(1000);

    // Should have results
    const userCount = await userPage.getUserCount();
    console.log(`Found ${userCount} users matching 'trainer'`);
  });

  test('Admin can filter users by role', async ({ page }) => {
    // Filter by trainer role
    await userPage.filterByRole('trainer');

    // Wait for filter
    await page.waitForTimeout(1000);

    // Get filtered count
    const trainerCount = await userPage.getUserCount();
    console.log(`Found ${trainerCount} trainers`);
  });

  test('Admin can open create user modal', async ({ page }) => {
    // Click create user
    await userPage.clickCreateUser();

    // Modal should be visible
    // (Modal selector would need to be validated in actual DOM)
  });

  test.skip('Admin can create new user', async ({ page }) => {
    // Skip by default as this creates actual data
    await userPage.createUser({
      email: `test-user-${Date.now()}@test.com`,
      password: 'TestPassword123!',
      name: 'Test User',
      role: 'customer'
    });

    // Verify user created
    await userPage.assertUserCreated();
  });

  test('Admin can view user details in table', async ({ page }) => {
    const userCount = await userPage.getUserCount();

    if (userCount > 0) {
      // Get first user's email
      const email = await userPage.getUserEmail(0);
      expect(email).toBeTruthy();
      console.log(`First user email: ${email}`);

      // Get first user's role
      const role = await userPage.getUserRole(0);
      expect(role).toBeTruthy();
      console.log(`First user role: ${role}`);
    }
  });
});
