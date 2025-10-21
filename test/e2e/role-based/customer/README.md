# Customer Role E2E Tests

## Purpose
This directory contains End-to-End (E2E) tests specifically for **Customer role** functionality. These tests validate all features and workflows available to customers using the meal planning system.

## Test Coverage

### Required Tests
- ✅ **01-authentication.spec.ts** - Customer login, logout, registration, password reset
- ✅ **02-meal-plan-viewing.spec.ts** - View assigned meal plans, meal plan details
- ✅ **03-meal-plan-generation.spec.ts** - Generate own meal plans, customize settings
- ✅ **04-progress-tracking.spec.ts** - Add measurements, upload photos, set goals
- ✅ **05-grocery-lists.spec.ts** - Generate, view, edit, check off grocery items
- ✅ **06-favorites.spec.ts** - Add favorite recipes, view favorites, remove favorites
- ✅ **07-profile-management.spec.ts** - Edit profile, upload photo, update preferences

## Naming Convention

**Format:** `{number}-{feature-name}.spec.ts`

**Examples:**
- `01-authentication.spec.ts`
- `02-meal-plan-viewing.spec.ts`
- `05-grocery-lists.spec.ts`

**Numbering Guide:**
- 01-09: Core customer features (auth, meal plans, progress)
- 10-19: Additional features (grocery lists, favorites, profile)
- 20-29: Edge cases and error scenarios
- 30+: Advanced workflows and integrations

## Test Structure

Each test file should follow this structure:

```typescript
import { test, expect } from '@playwright/test';
import { RoleAuthHelper } from '../../utils/roleTestHelpers';
import { CustomerMealPlanPage } from '../../page-objects/customer/CustomerMealPlanPage';

test.describe('Customer Meal Plan Viewing - Comprehensive Tests', () => {
  let customerPage: CustomerMealPlanPage;

  test.beforeEach(async ({ page }) => {
    await RoleAuthHelper.loginAsCustomer(page);
    customerPage = new CustomerMealPlanPage(page);
    await customerPage.navigate();
  });

  test('Customer can view assigned meal plans', async ({ page }) => {
    await customerPage.assertMealPlanListVisible();
    const planCount = await customerPage.getMealPlanCount();
    expect(planCount).toBeGreaterThan(0);
  });

  test('Customer can view meal plan details', async ({ page }) => {
    await customerPage.clickFirstMealPlan();
    await customerPage.assertMealPlanDetailsVisible();
    await customerPage.assertRecipesDisplayed();
  });

  test('Customer can generate grocery list from meal plan', async ({ page }) => {
    await customerPage.clickFirstMealPlan();
    await customerPage.clickGenerateGroceryList();
    await customerPage.assertGroceryListGenerated();
  });

  // More tests...
});
```

## Page Objects

Customer tests should use these page objects:
- `CustomerMealPlanPage` - View plans, generate plans, meal plan details
- `CustomerGroceryListPage` - Grocery list CRUD, check off items
- `CustomerProgressTrackingPage` - Add measurements, photos, goals
- `CustomerFavoritesPage` - Manage favorite recipes
- `CustomerProfilePage` - Edit profile, preferences
- `CustomerDashboardPage` - Main customer dashboard

## Test Data

Use test credentials from `roleTestHelpers.ts`:
```typescript
const customer = {
  email: 'customer.test@evofitmeals.com',
  password: 'TestCustomer123!'
};
```

## Running Tests

```bash
# Run all customer tests
npx playwright test test/e2e/role-based/customer/

# Run specific test file
npx playwright test test/e2e/role-based/customer/05-grocery-lists.spec.ts

# Run in UI mode for debugging
npx playwright test test/e2e/role-based/customer/ --ui

# Run with specific browser
npx playwright test test/e2e/role-based/customer/ --project=chromium

# Run on mobile viewport (customer feature is mobile-optimized)
npx playwright test test/e2e/role-based/customer/ --project=mobile
```

## What NOT to Test Here

- ❌ Admin-specific features (put in `../admin/`)
- ❌ Trainer-specific features (put in `../trainer/`)
- ❌ Cross-role interactions (put in `../cross-role/`)
- ❌ API contract tests (put in `test/api-contracts/`)
- ❌ Visual regression (put in `../visual-regression/`)
- ❌ Performance tests (put in `../performance/`)

## Expected Coverage

**Target:** 100% of customer-specific features tested

**Features to Cover:**
- Authentication (login, logout, registration, password reset)
- Viewing assigned meal plans
- Self-service meal plan generation
- Meal plan customization
- Progress tracking (measurements, weight, body fat, etc.)
- Progress photos upload
- Goal setting and tracking
- Grocery list generation
- Grocery list management (add, edit, delete items)
- Grocery item check-off functionality
- Favorite recipes management
- Profile editing
- Profile photo upload
- Email preferences
- PDF export of meal plans
- Meal plan sharing

## Mobile Responsiveness

**Important:** Customer features are heavily used on mobile devices. All tests should:
- ✅ Test on mobile viewports (375×667)
- ✅ Test touch interactions
- ✅ Test mobile navigation patterns
- ✅ Verify responsive layouts

## Maintenance

**When to update these tests:**
- When new customer features are added
- When existing customer features change behavior
- When customer UI changes significantly
- When customer API endpoints change
- When mobile responsiveness requirements change

**Review Schedule:**
- Weekly: Check for failing tests
- Monthly: Update selectors if UI changed
- Quarterly: Review test coverage completeness
- Quarterly: Test mobile responsiveness

---

**Last Updated:** [Current Date]
**Maintained By:** Testing Team
**Related Documentation:**
- `test/MASTER_TEST_ENHANCEMENT_PLAN.md`
- `test/docs/ROLE_BASED_TESTING_GUIDE.md`
