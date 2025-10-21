# Admin Role E2E Tests

## Purpose
This directory contains End-to-End (E2E) tests specifically for **Admin role** functionality. These tests validate all features and workflows available exclusively to administrators.

## Test Coverage

### Required Tests
- ✅ **01-authentication.spec.ts** - Admin login, logout, session management
- ✅ **02-recipe-management.spec.ts** - Recipe CRUD operations, approval workflow, BMAD generation
- ✅ **03-bulk-operations.spec.ts** - Bulk approve, bulk delete, batch operations
- ✅ **04-user-management.spec.ts** - User creation, role assignment, user editing
- ✅ **05-analytics-dashboard.spec.ts** - System analytics, reports, data visualization
- ✅ **06-system-monitoring.spec.ts** - System health, performance monitoring, error tracking

## Naming Convention

**Format:** `{number}-{feature-name}.spec.ts`

**Examples:**
- `01-authentication.spec.ts`
- `02-recipe-management.spec.ts`
- `03-bulk-operations.spec.ts`

**Numbering Guide:**
- 01-09: Core admin features (auth, recipe management, user management)
- 10-19: Advanced admin features (analytics, system monitoring)
- 20-29: Edge cases and error scenarios
- 30+: Integration tests with other roles

## Test Structure

Each test file should follow this structure:

```typescript
import { test, expect } from '@playwright/test';
import { RoleAuthHelper } from '../../utils/roleTestHelpers';
import { AdminRecipeManagementPage } from '../../page-objects/admin/AdminRecipeManagementPage';

test.describe('Admin Recipe Management - Comprehensive Tests', () => {
  let adminPage: AdminRecipeManagementPage;

  test.beforeEach(async ({ page }) => {
    await RoleAuthHelper.loginAsAdmin(page);
    adminPage = new AdminRecipeManagementPage(page);
    await adminPage.navigate();
  });

  test('Admin can view recipe library', async ({ page }) => {
    await adminPage.goToRecipesTab();
    await adminPage.assertRecipeLibraryVisible();
  });

  test('Admin can generate recipes via BMAD', async ({ page }) => {
    await adminPage.goToBMADTab();
    await adminPage.generateRecipes({ count: 5 });
    await adminPage.assertGenerationStarted();
  });

  // More tests...
});
```

## Page Objects

Admin tests should use these page objects:
- `AdminRecipeManagementPage` - Recipe library, BMAD generator, approval
- `AdminUserManagementPage` - User CRUD, role assignment
- `AdminAnalyticsPage` - Analytics dashboard, reports
- `AdminDashboardPage` - Main admin dashboard

## Test Data

Use test credentials from `roleTestHelpers.ts`:
```typescript
const admin = {
  email: 'admin@fitmeal.pro',
  password: 'AdminPass123'
};
```

## Running Tests

```bash
# Run all admin tests
npx playwright test test/e2e/role-based/admin/

# Run specific test file
npx playwright test test/e2e/role-based/admin/02-recipe-management.spec.ts

# Run in UI mode for debugging
npx playwright test test/e2e/role-based/admin/ --ui

# Run with specific browser
npx playwright test test/e2e/role-based/admin/ --project=chromium
```

## What NOT to Test Here

- ❌ Trainer-specific features (put in `../trainer/`)
- ❌ Customer-specific features (put in `../customer/`)
- ❌ Cross-role interactions (put in `../cross-role/`)
- ❌ API contract tests (put in `test/api-contracts/`)
- ❌ Visual regression (put in `../visual-regression/`)
- ❌ Performance tests (put in `../performance/`)

## Expected Coverage

**Target:** 100% of admin-specific features tested

**Features to Cover:**
- Recipe generation (BMAD)
- Recipe approval workflow
- Recipe library management
- User management (CRUD)
- Role assignment
- System analytics
- Performance monitoring
- Bulk operations
- Data export
- System configuration

## Maintenance

**When to update these tests:**
- When new admin features are added
- When existing admin features change behavior
- When admin UI changes significantly
- When admin API endpoints change

**Review Schedule:**
- Weekly: Check for failing tests
- Monthly: Update selectors if UI changed
- Quarterly: Review test coverage completeness

---

**Last Updated:** [Current Date]
**Maintained By:** Testing Team
**Related Documentation:**
- `test/MASTER_TEST_ENHANCEMENT_PLAN.md`
- `test/docs/ROLE_BASED_TESTING_GUIDE.md`
