# Trainer Role E2E Tests

## Purpose
This directory contains End-to-End (E2E) tests specifically for **Trainer role** functionality. These tests validate all features and workflows available to trainers managing their customers.

## Test Coverage

### Required Tests
- ✅ **01-authentication.spec.ts** - Trainer login, logout, session management
- ✅ **02-customer-management.spec.ts** - Customer list, invitation, customer details
- ✅ **03-meal-plan-creation.spec.ts** - Create meal plans, edit meal plans, templates
- ✅ **04-meal-plan-assignment.spec.ts** - Assign plans to customers, bulk assignment
- ✅ **05-progress-tracking.spec.ts** - View customer progress, measurements, photos
- ✅ **06-customer-analytics.spec.ts** - Customer reports, progress charts, comparisons

## Naming Convention

**Format:** `{number}-{feature-name}.spec.ts`

**Examples:**
- `01-authentication.spec.ts`
- `02-customer-management.spec.ts`
- `03-meal-plan-creation.spec.ts`

**Numbering Guide:**
- 01-09: Core trainer features (auth, customer management, meal plans)
- 10-19: Advanced trainer features (analytics, bulk operations)
- 20-29: Edge cases and error scenarios
- 30+: Integration tests with customers

## Test Structure

Each test file should follow this structure:

```typescript
import { test, expect } from '@playwright/test';
import { RoleAuthHelper } from '../../utils/roleTestHelpers';
import { TrainerCustomerManagementPage } from '../../page-objects/trainer/TrainerCustomerManagementPage';

test.describe('Trainer Customer Management - Comprehensive Tests', () => {
  let trainerPage: TrainerCustomerManagementPage;

  test.beforeEach(async ({ page }) => {
    await RoleAuthHelper.loginAsTrainer(page);
    trainerPage = new TrainerCustomerManagementPage(page);
    await trainerPage.navigate();
  });

  test('Trainer can view customer list', async ({ page }) => {
    await trainerPage.assertCustomerListVisible();
    const customerCount = await trainerPage.getCustomerCount();
    expect(customerCount).toBeGreaterThan(0);
  });

  test('Trainer can invite new customer', async ({ page }) => {
    await trainerPage.clickInviteCustomer();
    await trainerPage.fillInvitationForm({
      email: `newcustomer${Date.now()}@test.com`,
      name: 'Test Customer'
    });
    await trainerPage.submitInvitation();
    await trainerPage.assertInvitationSent();
  });

  // More tests...
});
```

## Page Objects

Trainer tests should use these page objects:
- `TrainerCustomerManagementPage` - Customer list, invitation, details
- `TrainerMealPlanPage` - Meal plan creation, editing, assignment
- `TrainerProgressTrackingPage` - View customer progress, measurements
- `TrainerDashboardPage` - Main trainer dashboard

## Test Data

Use test credentials from `roleTestHelpers.ts`:
```typescript
const trainer = {
  email: 'trainer.test@evofitmeals.com',
  password: 'TestTrainer123!'
};
```

## Running Tests

```bash
# Run all trainer tests
npx playwright test test/e2e/role-based/trainer/

# Run specific test file
npx playwright test test/e2e/role-based/trainer/03-meal-plan-creation.spec.ts

# Run in UI mode for debugging
npx playwright test test/e2e/role-based/trainer/ --ui

# Run with specific browser
npx playwright test test/e2e/role-based/trainer/ --project=chromium
```

## What NOT to Test Here

- ❌ Admin-specific features (put in `../admin/`)
- ❌ Customer-specific features (put in `../customer/`)
- ❌ Cross-role interactions (put in `../cross-role/`)
- ❌ API contract tests (put in `test/api-contracts/`)
- ❌ Visual regression (put in `../visual-regression/`)
- ❌ Performance tests (put in `../performance/`)

## Expected Coverage

**Target:** 100% of trainer-specific features tested

**Features to Cover:**
- Customer management (view, invite, edit)
- Meal plan creation (all variations)
- Meal plan assignment to customers
- Customer progress viewing
- Measurements and photos tracking
- Customer analytics and reports
- Recipe library access
- Meal plan templates
- Bulk customer operations
- Customer communication

## Maintenance

**When to update these tests:**
- When new trainer features are added
- When existing trainer features change behavior
- When trainer UI changes significantly
- When trainer API endpoints change

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
