# Grocery List Test Suite Documentation
**Created**: January 19, 2025
**Purpose**: Comprehensive test coverage for grocery list feature

## Test Files Overview

### Unit Tests

#### 1. `test/unit/groceryListComprehensive.test.ts`
**Coverage**: Complete grocery list functionality
**Test Cases**:
- Database schema validation
- API endpoint testing
- Hook functionality
- State management
- Error handling

#### 2. `test/unit/GroceryListWrapper.race-condition.test.tsx`
**Coverage**: Race condition specific testing
**Key Test**:
```typescript
test('should not show empty state during loading', async () => {
  const { queryByText } = render(<GroceryListWrapper />);

  // During loading
  expect(queryByText('Loading your grocery lists')).toBeInTheDocument();
  expect(queryByText('Create your first grocery list')).not.toBeInTheDocument();

  // After loading with data
  await waitFor(() => {
    expect(queryByText('Meal Plan Grocery List')).toBeInTheDocument();
  });
});
```

### E2E Tests

#### 1. `test/e2e/grocery-lists-visibility.test.ts`
**Purpose**: Verify grocery lists are visible in UI
```typescript
test('Customer can see grocery lists in UI', async ({ page }) => {
  // Login
  await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
  await page.fill('input[type="password"]', 'TestCustomer123!');
  await page.click('button[type="submit"]');

  // Navigate to grocery lists
  await page.click('button:has-text("Grocery")');

  // Verify visibility
  const emptyStateVisible = await page.locator('text=Create your first grocery list').isVisible();
  const listsVisible = await page.locator('button:has-text("Meal Plan Grocery List")').count();

  expect(emptyStateVisible).toBe(false);
  expect(listsVisible).toBeGreaterThan(0);
});
```

#### 2. `test/e2e/grocery-lists-race-condition.test.ts`
**Purpose**: Detect race condition bugs
```typescript
test('No race condition between loading and display', async ({ page }) => {
  // Capture immediate state
  const emptyStateImmediate = await page.locator('text=Create your first grocery list').isVisible();

  // Wait for API
  await page.waitForTimeout(5000);

  // Check after API completes
  const emptyStateAfterWait = await page.locator('text=Create your first grocery list').isVisible();
  const buttonsAfterWait = await page.locator('button.w-full.justify-between').count();

  // Race condition detected if empty state shown initially but lists exist
  if (emptyStateImmediate && !emptyStateAfterWait && buttonsAfterWait > 0) {
    throw new Error('Race condition detected');
  }
});
```

#### 3. `test/e2e/debug-grocery-ui.spec.ts`
**Purpose**: Comprehensive debugging helper
```typescript
test('Debug grocery UI completely', async ({ page }) => {
  // Capture network requests
  page.on('response', response => {
    if (response.url().includes('grocery')) {
      console.log(`${response.status()} - ${response.url()}`);
    }
  });

  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('ERROR:', msg.text());
    }
  });

  // Check all UI elements
  const checks = [
    'text=Loading your grocery lists',
    'text=Create your first grocery list',
    'text=Meal Plan Grocery List',
  ];

  for (const selector of checks) {
    const count = await page.locator(selector).count();
    console.log(`"${selector}": ${count} found`);
  }
});
```

#### 4. `test/e2e/check-js-errors.spec.ts`
**Purpose**: Detect JavaScript errors
```typescript
test('Check for JavaScript errors', async ({ page }) => {
  const errors: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    errors.push(`PAGE ERROR: ${err.message}`);
  });

  // Navigate and interact
  await page.click('button:has-text("Grocery")');

  // Assert no errors
  expect(errors.length).toBe(0);
});
```

## Running Tests

### Run All Grocery List Tests
```bash
# Unit tests
npm test -- --grep "grocery"

# E2E tests
npx playwright test --grep "grocery"
```

### Run Specific Test Suites
```bash
# Race condition tests only
npx playwright test grocery-lists-race-condition

# Visibility tests only
npx playwright test grocery-lists-visibility

# Debug helper
npx playwright test debug-grocery-ui --headed
```

### Run with Different Browsers
```bash
# Chrome
npx playwright test --project=chromium

# Firefox
npx playwright test --project=firefox

# Safari
npx playwright test --project=webkit
```

## Test Data Setup

### Required Database State
```sql
-- Ensure test customer has grocery lists
INSERT INTO grocery_lists (customer_id, meal_plan_id, name)
SELECT
  u.id,
  mp.id,
  'Test Grocery List'
FROM users u
LEFT JOIN personalized_meal_plans mp ON mp.customer_id = u.id
WHERE u.email = 'customer.test@evofitmeals.com';

-- Add items to grocery list
INSERT INTO grocery_list_items (grocery_list_id, name, quantity, unit, category)
SELECT
  gl.id,
  'Test Item',
  '1',
  'unit',
  'Produce'
FROM grocery_lists gl
JOIN users u ON gl.customer_id = u.id
WHERE u.email = 'customer.test@evofitmeals.com'
LIMIT 1;
```

### Seed Test Accounts
```bash
# Inside Docker
docker exec -i fitnessmealplanner-dev sh -c "npm run seed:test-accounts"

# Or directly
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/fitnessmealplanner" \
  npm run seed:test-accounts
```

## Expected Test Results

### Successful Test Output
```
✅ Customer logged in successfully
✅ Clicked Grocery tab
📊 === FINAL RESULTS ===
Loading text count: 0
Empty state count: 0
Meal Plan List count: 1
Grocery header count: 0
List buttons count: 7
Grocery items count: 10
JavaScript errors: 0
🎉 SUCCESS! Grocery lists are FINALLY VISIBLE!
```

### Common Failure Patterns

#### Pattern 1: Race Condition
- Empty state visible initially
- Lists appear after delay
- Solution: Add loading state guard

#### Pattern 2: API Parse Error
- Console: "Unexpected response structure"
- Lists return empty array
- Solution: Check response parsing

#### Pattern 3: JavaScript Type Error
- Console: "toFixed is not a function"
- Page appears blank
- Solution: Type check numeric values

## Debugging Checklist

1. **Check API Response**
   ```bash
   curl -X GET http://localhost:4000/api/grocery-lists \
     -H "Authorization: Bearer $TOKEN"
   ```

2. **Check Console Errors**
   - Open browser DevTools
   - Look for red error messages
   - Check for "toFixed" or "undefined" errors

3. **Check Network Tab**
   - Verify /api/grocery-lists returns 200
   - Check response contains groceryLists array
   - Verify authentication token is sent

4. **Check React Component**
   - Use React DevTools
   - Check GroceryListWrapper props
   - Verify useGroceryLists hook data

5. **Run Debug Test**
   ```bash
   npx playwright test debug-grocery-ui --headed --debug
   ```

## Continuous Integration

### GitHub Actions Workflow
```yaml
name: Grocery List Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test -- --grep "grocery"
      - run: npx playwright test --grep "grocery"
```

## Maintenance Notes

- Review tests monthly for relevance
- Update test data when schema changes
- Add new tests for each bug found
- Keep debug tests for troubleshooting
- Document any flaky tests with solutions

---

This test suite provides comprehensive coverage for the grocery list feature and includes specific tests for the race condition bug that was discovered and fixed.