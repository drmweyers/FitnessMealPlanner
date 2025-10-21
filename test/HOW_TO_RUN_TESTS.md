# 🚀 How to Run the New E2E Tests

## Quick Start

### Prerequisites
1. **Docker dev server running:**
   ```bash
   docker-compose --profile dev up -d
   ```

2. **Verify server is running:**
   ```bash
   curl http://localhost:4000/health
   ```

3. **Playwright installed:**
   ```bash
   npx playwright install --with-deps
   ```

---

## Running Tests

### 1. Run ALL New Tests

```bash
# Run all role-based tests
npx playwright test test/e2e/role-based/

# Run with UI mode (see browser)
npx playwright test test/e2e/role-based/ --ui

# Run in headed mode (watch tests run)
npx playwright test test/e2e/role-based/ --headed
```

### 2. Run Tests by Role

**Admin Tests:**
```bash
# All admin tests
npx playwright test test/e2e/role-based/admin/

# Specific admin test
npx playwright test test/e2e/role-based/admin/01-authentication.spec.ts
npx playwright test test/e2e/role-based/admin/02-recipe-management.spec.ts
npx playwright test test/e2e/role-based/admin/03-user-management.spec.ts
```

**Trainer Tests:**
```bash
# All trainer tests
npx playwright test test/e2e/role-based/trainer/

# Specific trainer test
npx playwright test test/e2e/role-based/trainer/01-authentication.spec.ts
npx playwright test test/e2e/role-based/trainer/02-customer-management.spec.ts
```

**Customer Tests:**
```bash
# All customer tests
npx playwright test test/e2e/role-based/customer/

# Specific customer test
npx playwright test test/e2e/role-based/customer/01-authentication.spec.ts
npx playwright test test/e2e/role-based/customer/02-meal-plan-viewing.spec.ts
npx playwright test test/e2e/role-based/customer/05-grocery-lists.spec.ts
```

**Cross-Role Tests:**
```bash
# Permission boundary tests
npx playwright test test/e2e/role-based/cross-role/04-permission-boundaries.spec.ts
```

**Workflow Tests:**
```bash
# Complete user journeys
npx playwright test test/e2e/workflows/complete-user-journeys.spec.ts
```

### 3. Run Specific Test

```bash
# Run single test by name
npx playwright test --grep "Admin can login successfully"

# Run single test file
npx playwright test test/e2e/role-based/admin/01-authentication.spec.ts
```

### 4. Run with Different Options

```bash
# Run in UI mode (interactive)
npx playwright test --ui

# Run in headed mode (see browser)
npx playwright test --headed

# Run with specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Run with debug mode
npx playwright test --debug

# Run and update snapshots
npx playwright test --update-snapshots
```

---

## Test Organization

### Tests Created (13 files)

**Admin Tests (3 files):**
- ✅ `test/e2e/role-based/admin/01-authentication.spec.ts` - Login, logout, navigation
- ✅ `test/e2e/role-based/admin/02-recipe-management.spec.ts` - Recipe library, BMAD, search
- ✅ `test/e2e/role-based/admin/03-user-management.spec.ts` - User CRUD, role management

**Trainer Tests (2 files):**
- ✅ `test/e2e/role-based/trainer/01-authentication.spec.ts` - Login, logout, navigation
- ✅ `test/e2e/role-based/trainer/02-customer-management.spec.ts` - Customer list, invitation

**Customer Tests (3 files):**
- ✅ `test/e2e/role-based/customer/01-authentication.spec.ts` - Login, logout, navigation
- ✅ `test/e2e/role-based/customer/02-meal-plan-viewing.spec.ts` - Meal plan list, details
- ✅ `test/e2e/role-based/customer/05-grocery-lists.spec.ts` - Grocery list management

**Cross-Role Tests (1 file):**
- ✅ `test/e2e/role-based/cross-role/04-permission-boundaries.spec.ts` - RBAC validation

**Workflow Tests (1 file):**
- ✅ `test/e2e/workflows/complete-user-journeys.spec.ts` - End-to-end user journeys

**Total: 13 test files, 40+ individual tests**

---

## Test Credentials

All tests use these standard credentials:

```typescript
// Admin
email: 'admin@fitmeal.pro'
password: 'AdminPass123'

// Trainer
email: 'trainer.test@evofitmeals.com'
password: 'TestTrainer123!'

// Customer
email: 'customer.test@evofitmeals.com'
password: 'TestCustomer123!'
```

---

## Understanding Test Results

### Successful Test Output
```
✓ Admin can login successfully (2.3s)
✓ Admin dashboard loads after login (1.5s)
✓ Admin can navigate to different sections (2.1s)

3 passed (6.2s)
```

### Failed Test Output
```
✗ Admin can login successfully (2.3s)

  Error: expect(received).toContain(expected)

  Expected substring: "admin"
  Received string:    "/login"

  at test/e2e/role-based/admin/01-authentication.spec.ts:15:25
```

---

## Viewing Test Reports

### HTML Report
```bash
# Generate and open HTML report
npx playwright show-report
```

### View Screenshots
Screenshots are saved to:
```
test-results/
├── screenshots/
│   └── admin-dashboard-2025-01-12.png
└── videos/
    └── test-recording.webm
```

---

## Common Issues & Solutions

### Issue: "Server not running"

**Solution:**
```bash
# Start Docker dev server
docker-compose --profile dev up -d

# Verify it's running
curl http://localhost:4000/health
```

### Issue: "Playwright browsers not installed"

**Solution:**
```bash
# Install Playwright browsers
npx playwright install --with-deps
```

### Issue: "Login fails - credentials invalid"

**Solution:**
```bash
# Reset test accounts
npm run reset:test-accounts

# Or manually verify credentials in database
```

### Issue: "Tests timeout"

**Solution:**
```bash
# Increase timeout in playwright.config.ts
export default defineConfig({
  use: {
    actionTimeout: 10000, // Increase from default
  },
  timeout: 60000, // Increase test timeout
});
```

### Issue: "Element not found"

**Solution:**
- Check if Docker server is running
- Verify you're testing correct environment
- Check browser console for errors:
  ```bash
  npx playwright test --headed
  ```

---

## Test Development Workflow

### 1. Write New Test

```typescript
import { test } from '@playwright/test';
import { RoleAuthHelper } from '../../utils/roleTestHelpers';
import { AdminRecipeManagementPage } from '../../page-objects/admin/AdminRecipeManagementPage';

test('My new test', async ({ page }) => {
  // Login
  await RoleAuthHelper.loginAsAdmin(page);

  // Use page object
  const adminPage = new AdminRecipeManagementPage(page);
  await adminPage.navigate();

  // Test your feature
  // ...
});
```

### 2. Run Test in Development

```bash
# Run with UI mode for development
npx playwright test --ui --grep "My new test"

# Or run in headed mode
npx playwright test --headed --grep "My new test"
```

### 3. Debug Test

```bash
# Run with debug mode (pauses at breakpoints)
npx playwright test --debug --grep "My new test"
```

### 4. Verify Test Passes

```bash
# Run test multiple times to ensure stability
npx playwright test --grep "My new test" --repeat-each=3
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: docker-compose --profile dev up -d
      - run: npx playwright test test/e2e/role-based/
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Performance Optimization

### Run Tests in Parallel

```bash
# Run with multiple workers
npx playwright test --workers=4
```

### Run Only Fast Tests

```bash
# Skip slow tests
npx playwright test --grep-invert "skip|slow"
```

### Use Specific Browser

```bash
# Only use chromium (fastest)
npx playwright test --project=chromium
```

---

## Best Practices

### ✅ DO
- Use page objects for all interactions
- Use RoleAuthHelper for authentication
- Write descriptive test names
- Add console.log for debugging
- Skip tests that modify data with `.skip`

### ❌ DON'T
- Hardcode selectors in tests
- Create test data without cleanup
- Run tests that modify production data
- Skip authentication steps
- Use `page.goto()` directly (use page objects)

---

## Quick Reference Commands

```bash
# Run all new tests
npx playwright test test/e2e/role-based/

# Run admin tests only
npx playwright test test/e2e/role-based/admin/

# Run trainer tests only
npx playwright test test/e2e/role-based/trainer/

# Run customer tests only
npx playwright test test/e2e/role-based/customer/

# Run permission tests
npx playwright test test/e2e/role-based/cross-role/

# Run workflow tests
npx playwright test test/e2e/workflows/

# Run in UI mode
npx playwright test --ui

# Run specific test
npx playwright test --grep "Admin can login"

# Debug mode
npx playwright test --debug

# Generate report
npx playwright show-report
```

---

## Next Steps

### Add More Tests
1. Create new test file in appropriate role directory
2. Use existing page objects
3. Follow naming convention: `##-feature-name.spec.ts`
4. Run and verify

### Extend Page Objects
1. Add new methods to existing page objects
2. Follow existing patterns
3. Document with JSDoc comments

### Create New Page Objects
1. Create in appropriate role directory
2. Extend BasePage class
3. Follow existing patterns
4. Use in tests

---

## Getting Help

**Documentation:**
- `test/MASTER_TEST_ENHANCEMENT_PLAN.md` - Master plan
- `test/PHASE_2_COMPLETE.md` - Phase 2 summary
- `test/e2e/page-objects/README.md` - Page object guide
- `test/e2e/role-based/*/README.md` - Role-specific guides

**Debugging:**
1. Run with `--ui` mode
2. Check Docker logs: `docker logs fitnessmealplanner-dev`
3. Check browser console in headed mode
4. Add `await page.pause()` to pause test execution

---

**Happy Testing! 🚀**

---

**Last Updated:** [Current Session]
**Maintained By:** Testing Team
