# Cross-Role Interaction Tests

## Purpose
This directory contains End-to-End (E2E) tests for **cross-role interactions** and **permission boundary validation**. These tests ensure that role-based access control (RBAC) is properly enforced and that different roles can interact correctly.

## Test Coverage

### Required Tests
- ✅ **01-admin-trainer-interactions.spec.ts** - Admin managing trainers, viewing trainer data
- ✅ **02-admin-customer-interactions.spec.ts** - Admin managing customers, viewing customer data
- ✅ **03-trainer-customer-workflow.spec.ts** - Trainer → Customer complete workflows
- ✅ **04-permission-boundaries.spec.ts** - All role permission violations
- ✅ **05-data-isolation.spec.ts** - Customer data isolation, trainer data isolation

## Test Categories

### 1. Permission Boundary Tests
Tests that verify unauthorized access is properly blocked:

```typescript
// Customer trying to access Trainer endpoints
test('Customer CANNOT access trainer customer list', async ({ page }) => {
  await RoleAuthHelper.loginAsCustomer(page);
  const response = await page.request.get('/api/trainer/customers');
  expect(response.status()).toBe(403); // Forbidden
});

// Customer trying to access other customer data
test('Customer CANNOT view other customer meal plans', async ({ page }) => {
  await RoleAuthHelper.loginAsCustomer(page);
  const response = await page.request.get('/api/customer/meal-plans?customerId=other-id');
  expect(response.status()).toBeOneOf([403, 404]); // Forbidden or Not Found
});

// Trainer trying to access Admin endpoints
test('Trainer CANNOT access admin user management', async ({ page }) => {
  await RoleAuthHelper.loginAsTrainer(page);
  const response = await page.request.get('/api/admin/users');
  expect(response.status()).toBe(403); // Forbidden
});
```

### 2. Cross-Role Workflow Tests
Tests that verify legitimate cross-role interactions work correctly:

```typescript
// Admin → Trainer → Customer workflow
test('Admin creates recipe → Trainer uses in plan → Customer receives', async ({ browser }) => {
  const adminContext = await browser.newContext();
  const trainerContext = await browser.newContext();
  const customerContext = await browser.newContext();

  const adminPage = await adminContext.newPage();
  const trainerPage = await trainerContext.newPage();
  const customerPage = await customerContext.newPage();

  // Step 1: Admin generates and approves recipe
  await RoleAuthHelper.loginAsAdmin(adminPage);
  const recipe = await AdminRecipeManagementPage.generateAndApproveRecipe(adminPage);

  // Step 2: Trainer creates meal plan using recipe
  await RoleAuthHelper.loginAsTrainer(trainerPage);
  const mealPlan = await TrainerMealPlanPage.createMealPlanWithRecipe(trainerPage, recipe.id);

  // Step 3: Trainer assigns to customer
  await TrainerMealPlanPage.assignToCustomer(trainerPage, mealPlan.id, 'customer.test@evofitmeals.com');

  // Step 4: Customer views assigned plan
  await RoleAuthHelper.loginAsCustomer(customerPage);
  await CustomerMealPlanPage.navigate(customerPage);
  await CustomerMealPlanPage.assertMealPlanVisible(customerPage, mealPlan.name);

  // Complete workflow verified
});
```

### 3. Data Isolation Tests
Tests that verify data is properly isolated between customers and trainers:

```typescript
// Customer A cannot see Customer B's data
test('Customer data isolation is enforced', async ({ browser }) => {
  const customerAContext = await browser.newContext();
  const customerBContext = await browser.newContext();

  const customerAPage = await customerAContext.newPage();
  const customerBPage = await customerBContext.newPage();

  // Customer A creates meal plan
  await RoleAuthHelper.loginAsCustomer(customerAPage, 'customerA@test.com');
  const mealPlan = await CustomerMealPlanPage.generateMealPlan(customerAPage, 'Customer A Plan');

  // Customer B tries to access Customer A's meal plan
  await RoleAuthHelper.loginAsCustomer(customerBPage, 'customerB@test.com');
  const response = await customerBPage.request.get(`/api/meal-plans/${mealPlan.id}`);
  expect(response.status()).toBeOneOf([403, 404]);
});
```

## Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { RoleAuthHelper } from '../../utils/roleTestHelpers';

test.describe('Permission Boundary Tests', () => {
  describe('Customer Permission Boundaries', () => {
    test('Customer CANNOT access /api/trainer/customers', async ({ page }) => {
      // Test implementation
    });

    test('Customer CANNOT access /api/admin/recipes', async ({ page }) => {
      // Test implementation
    });

    // 30+ more customer boundary tests
  });

  describe('Trainer Permission Boundaries', () => {
    test('Trainer CANNOT access /api/admin/users', async ({ page }) => {
      // Test implementation
    });

    test('Trainer CANNOT access non-assigned customer data', async ({ page }) => {
      // Test implementation
    });

    // 30+ more trainer boundary tests
  });

  describe('Data Isolation', () => {
    test('Customer cannot view other customer meal plans', async ({ browser }) => {
      // Test implementation
    });

    test('Trainer cannot view non-assigned customer progress', async ({ browser }) => {
      // Test implementation
    });

    // 20+ more data isolation tests
  });
});
```

## Permission Matrix

This table shows what each role SHOULD and SHOULD NOT be able to access:

| Endpoint | Admin | Trainer | Customer | Expected Status |
|----------|-------|---------|----------|-----------------|
| `/api/admin/*` | ✅ 200 | ❌ 403 | ❌ 403 | Tested |
| `/api/trainer/customers` | ✅ 200 | ✅ 200 | ❌ 403 | Tested |
| `/api/trainer/meal-plans` | ✅ 200 | ✅ 200 | ❌ 403 | Tested |
| `/api/customer/meal-plans` (own) | ✅ 200 | ⚠️ 403 | ✅ 200 | Tested |
| `/api/customer/meal-plans` (other) | ✅ 200 | ❌ 403 | ❌ 403 | Tested |
| `/api/recipes` (view) | ✅ 200 | ✅ 200 | ✅ 200 | Tested |
| `/api/progress/:id` (own) | ✅ 200 | ⚠️ 200 | ✅ 200 | Tested |
| `/api/progress/:id` (other) | ✅ 200 | ❌ 403 | ❌ 403 | Tested |

**Legend:**
- ✅ Should have access (200 OK)
- ❌ Should be denied (403 Forbidden)
- ⚠️ Conditional access (depends on relationship)

## Running Tests

```bash
# Run all cross-role tests
npx playwright test test/e2e/role-based/cross-role/

# Run specific test file
npx playwright test test/e2e/role-based/cross-role/04-permission-boundaries.spec.ts

# Run permission boundary tests only
npx playwright test test/e2e/role-based/cross-role/04-permission-boundaries.spec.ts

# Run in UI mode for debugging
npx playwright test test/e2e/role-based/cross-role/ --ui
```

## Expected Coverage

**Target:** 100% of cross-role interactions and permission boundaries tested

**Interactions to Test:**
1. **Admin → Trainer:**
   - Admin views trainer statistics
   - Admin manages trainer accounts
   - Admin views trainer's meal plans

2. **Admin → Customer:**
   - Admin views customer data
   - Admin manages customer accounts
   - Admin views customer progress

3. **Trainer → Customer:**
   - Trainer invites customer
   - Trainer assigns meal plan to customer
   - Trainer views customer progress
   - Trainer sends messages to customer

4. **Permission Boundaries (80+ tests):**
   - Customer → Trainer endpoints (all should fail)
   - Customer → Admin endpoints (all should fail)
   - Customer → Other customer data (all should fail)
   - Trainer → Admin endpoints (all should fail)
   - Trainer → Non-assigned customer (all should fail)
   - Unauthenticated → Protected endpoints (all should fail)

5. **Data Isolation (20+ tests):**
   - Customer meal plan isolation
   - Customer progress data isolation
   - Customer grocery list isolation
   - Trainer customer list isolation

## Security Testing Checklist

For each endpoint, verify:
- ✅ Authentication is required (401 if not logged in)
- ✅ Role authorization is enforced (403 if wrong role)
- ✅ Resource ownership is validated (403/404 if not owner)
- ✅ No data leakage in error messages
- ✅ Proper HTTP status codes returned

## Maintenance

**When to update these tests:**
- When new API endpoints are added
- When role permissions change
- When new roles are introduced
- When cross-role workflows change
- After security audits or penetration tests

**Review Schedule:**
- Weekly: Check for failing tests
- Monthly: Review permission matrix completeness
- Quarterly: Security audit of permission boundaries
- After each release: Verify no permission regressions

## Critical Security Tests

**🔒 These tests MUST NEVER fail:**
- Customer cannot access other customer data
- Trainer cannot access admin functions
- Trainer cannot access non-assigned customer data
- Unauthenticated users cannot access protected data
- Role changes are properly enforced

**Failure Impact:** CRITICAL - Security vulnerability
**On Failure:** Block deployment, investigate immediately

---

**Last Updated:** [Current Date]
**Maintained By:** Testing Team & Security Team
**Related Documentation:**
- `test/MASTER_TEST_ENHANCEMENT_PLAN.md`
- `test/docs/ROLE_BASED_TESTING_GUIDE.md`
- `test/api-contracts/permissionBoundaries.test.ts`
