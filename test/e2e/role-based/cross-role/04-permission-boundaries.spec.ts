/**
 * Permission Boundary Tests
 *
 * Tests that role-based access control (RBAC) is properly enforced
 * Verifies users cannot access resources outside their role permissions
 */

import { test, expect } from '@playwright/test';
import { RoleAuthHelper, RoleAssertionHelper } from '../../utils/roleTestHelpers';

test.describe('Permission Boundary Tests', () => {
  test.describe('Customer Permission Boundaries', () => {
    test('Customer CANNOT access admin dashboard', async ({ page }) => {
      // Login as customer
      await RoleAuthHelper.loginAsCustomer(page);

      // Try to navigate to admin dashboard
      await page.goto('/admin');

      // Should be denied or redirected
      await RoleAssertionHelper.assertPermissionDenied(page);
    });

    test('Customer CANNOT access trainer dashboard', async ({ page }) => {
      // Login as customer
      await RoleAuthHelper.loginAsCustomer(page);

      // Try to navigate to trainer dashboard
      await page.goto('/trainer');

      // Should be denied or redirected
      await RoleAssertionHelper.assertPermissionDenied(page);
    });

    test('Customer CAN ONLY access customer dashboard', async ({ page }) => {
      // Login as customer
      await RoleAuthHelper.loginAsCustomer(page);

      // Navigate to customer dashboard (should work)
      await page.goto('/customer');

      // Verify access granted
      await RoleAuthHelper.verifyRoleAccess(page, 'customer');
    });
  });

  test.describe('Trainer Permission Boundaries', () => {
    test('Trainer CANNOT access admin dashboard', async ({ page }) => {
      // Login as trainer
      await RoleAuthHelper.loginAsTrainer(page);

      // Try to navigate to admin dashboard
      await page.goto('/admin');

      // Should be denied or redirected
      await RoleAssertionHelper.assertPermissionDenied(page);
    });

    test('Trainer CAN access trainer dashboard', async ({ page }) => {
      // Login as trainer
      await RoleAuthHelper.loginAsTrainer(page);

      // Navigate to trainer dashboard (should work)
      await page.goto('/trainer');

      // Verify access granted
      await RoleAuthHelper.verifyRoleAccess(page, 'trainer');
    });

    test('Trainer CANNOT access customer-specific pages', async ({ page }) => {
      // Login as trainer
      await RoleAuthHelper.loginAsTrainer(page);

      // Try to navigate to customer page
      await page.goto('/customer');

      // Should be denied or redirected
      // (In some apps, trainers might be redirected to their own dashboard)
      const url = page.url();
      expect(url).not.toContain('/customer');
    });
  });

  test.describe('Admin Permission Boundaries', () => {
    test('Admin CAN access admin dashboard', async ({ page }) => {
      // Login as admin
      await RoleAuthHelper.loginAsAdmin(page);

      // Navigate to admin dashboard (should work)
      await page.goto('/admin');

      // Verify access granted
      await RoleAuthHelper.verifyRoleAccess(page, 'admin');
    });

    test('Admin has admin-only navigation elements', async ({ page }) => {
      // Login as admin
      await RoleAuthHelper.loginAsAdmin(page);

      // Verify admin-specific elements present
      await RoleAssertionHelper.assertAdminElements(page);
    });
  });

  test.describe('Unauthenticated Access', () => {
    test('Unauthenticated user CANNOT access admin dashboard', async ({ page }) => {
      // Try to access admin without login
      await page.goto('/admin');

      // Should redirect to login
      expect(page.url()).toContain('/login');
    });

    test('Unauthenticated user CANNOT access trainer dashboard', async ({ page }) => {
      // Try to access trainer without login
      await page.goto('/trainer');

      // Should redirect to login
      expect(page.url()).toContain('/login');
    });

    test('Unauthenticated user CANNOT access customer dashboard', async ({ page }) => {
      // Try to access customer without login
      await page.goto('/customer');

      // Should redirect to login
      expect(page.url()).toContain('/login');
    });
  });
});
