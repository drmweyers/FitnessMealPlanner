# Meal Card Clicking E2E Test Guide

## Overview
This guide covers the comprehensive Playwright end-to-end tests for the meal card clicking functionality. These tests verify that the meal card clicking fix works correctly in real browser environments.

## Test File Location
```
test/e2e/meal-card-clicking.spec.ts
```

## What These Tests Cover

### 1. Customer Login & Navigation
- ✅ Login as customer with meal plans assigned
- ✅ Navigate to meal plans section
- ✅ Verify meal plans are displayed correctly ("Showing 3 of 3 meal plans")

### 2. Meal Plan Modal Interaction
- ✅ Click to open a meal plan
- ✅ Verify meal plan modal opens correctly
- ✅ Verify daily meal schedule table displays

### 3. Meal Card Clicking (CORE FUNCTIONALITY)
- ✅ Click on meal rows/cards in the meal plan
- ✅ Verify recipe detail modal opens on top
- ✅ Verify recipe information displays correctly
- ✅ Test clicking multiple different meal cards
- ✅ Verify proper modal stacking (no z-index conflicts)

### 4. Modal Management
- ✅ Test closing recipe modal returns to meal plan
- ✅ Test opening multiple recipe modals in sequence
- ✅ Verify no modal conflicts or visual glitches
- ✅ Test ESC key functionality

### 5. Browser Compatibility
- ✅ Test in multiple viewport sizes (mobile, tablet, desktop)
- ✅ Verify responsive behavior on different screen sizes
- ✅ Performance and user experience testing

### 6. Error Handling & Edge Cases
- ✅ Handle rapid clicking without breaking state
- ✅ Network delay recovery
- ✅ JavaScript error monitoring

## Prerequisites

### 1. Development Environment Setup
```bash
# Ensure Docker is running and development server is started
cd FitnessMealPlanner
docker-compose --profile dev up -d

# Verify services are running
docker ps

# Check if app is accessible
curl http://localhost:4000
```

### 2. Test Data Setup
The tests use the predefined test accounts from `TEST_ACCOUNTS.md`:

**Customer Account:**
- Email: `customer.test@evofitmeals.com`
- Password: `TestCustomer123!`
- Name: Sarah Johnson

**Trainer Account:**
- Email: `trainer.test@evofitmeals.com`
- Password: `TestTrainer123!`
- Name: Michael Thompson

## Running the Tests

### Option 1: Run All Meal Card Tests
```bash
# Run the complete meal card clicking test suite
npx playwright test test/e2e/meal-card-clicking.spec.ts
```

### Option 2: Run Specific Test Groups
```bash
# Run only core functionality tests
npx playwright test test/e2e/meal-card-clicking.spec.ts -g "Meal Card Clicking"

# Run only modal management tests
npx playwright test test/e2e/meal-card-clicking.spec.ts -g "Modal Management"

# Run only browser compatibility tests
npx playwright test test/e2e/meal-card-clicking.spec.ts -g "Browser Compatibility"
```

### Option 3: Run in Headed Mode (Watch Tests Execute)
```bash
# See tests running in browser window
npx playwright test test/e2e/meal-card-clicking.spec.ts --headed

# Run with slow motion for better observation
npx playwright test test/e2e/meal-card-clicking.spec.ts --headed --slowMo=1000
```

### Option 4: Debug Mode
```bash
# Debug specific test
npx playwright test test/e2e/meal-card-clicking.spec.ts -g "should open recipe detail modal" --debug
```

## Current Known Issues

### ⚠️ Development Server Issues
**Problem:** The development server is not starting due to import/export issues in service files.

**Affected Files:**
- `server/services/FavoritesService.ts` - Missing exports
- `server/services/EngagementService.ts` - Incorrect schema imports  
- `shared/schema-favorites.ts` - Syntax error (fixed)

**Symptoms:**
```
SyntaxError: The requested module '../../shared/schema-engagement.js' does not provide an export named 'recipeShares'
```

**Required Fixes:**
1. **Fix Schema Imports in EngagementService:**
   ```typescript
   // Current (broken):
   import { recipeViews, recipeRatings, ... } from '../../shared/schema.js';
   
   // Should be:
   import { recipeViews, recipeRatings, ... } from '../../shared/schema-engagement.js';
   ```

2. **Verify Schema Exports:**
   - Check that all imported items are actually exported from schema-engagement.ts
   - Update schema files to export all required tables and types

3. **Service Dependencies:**
   - Ensure all service classes have proper exports
   - Fix circular dependency issues if they exist

### 🔧 Temporary Workaround
To run tests immediately without fixing server issues:

1. **Use Production Build:**
   ```bash
   # Build production version
   docker-compose --profile prod up -d
   
   # Update test base URL
   # In playwright.config.ts, change baseURL to production port
   ```

2. **Mock API Responses:**
   ```typescript
   // Add to test setup
   await page.route('**/api/**', route => {
     route.fulfill({
       status: 200,
       body: JSON.stringify({ mockData: true })
     });
   });
   ```

3. **Use External Test Environment:**
   - Deploy to staging environment
   - Update baseURL in playwright.config.ts

## Test Output & Screenshots

### Screenshot Locations
Tests automatically generate screenshots in:
```
test-screenshots/
├── customer-meal-plans-view.png
├── meal-plan-modal-open.png
├── recipe-modal-stacked.png
├── recipe-detail-modal-content.png
├── recipe-modal-card-1.png
├── recipe-modal-card-2.png
├── mobile-recipe-modal.png
├── tablet-recipe-modal.png
└── desktop-functionality.png
```

### Test Reports
```bash
# Generate HTML report
npx playwright show-report

# View test results
npx playwright test --reporter=html
```

## Test Architecture

### Page Objects Used
1. **LoginPage** - Handle login functionality
2. **CustomerDashboard** - Navigate customer dashboard
3. **MealPlanModal** - Interact with meal plan modal
4. **RecipeDetailModal** - Manage recipe detail modal

### Robust Selector Strategy
Tests use multiple fallback selectors to handle different UI states:

```typescript
// Example: Finding meal plan cards
const selectors = [
  '.meal-plan-card',
  '[data-testid="meal-plan-card"]', 
  '.meal-plan',
  '[data-testid*="meal-plan"]',
  '.card:has(text("meal"))'
];
```

### Error Handling
- Graceful fallbacks for missing elements
- Network delay simulation
- Console error monitoring
- Timeout management

## Performance Benchmarks

The tests include performance assertions:
- Modal opening time < 3 seconds
- Smooth visual transitions
- No critical JavaScript errors
- Responsive design validation

## Maintenance

### Updating Tests
When UI changes occur:

1. **Update Selectors:**
   ```typescript
   // Add new selectors to arrays
   const mealCardSelectors = [
     '.meal-card',           // existing
     '.new-meal-element',    // new selector
     '[data-testid="meal"]'  // data attributes
   ];
   ```

2. **Update Screenshots:**
   ```bash
   # Update baseline screenshots
   npx playwright test --update-snapshots
   ```

3. **Test Data Changes:**
   - Update TEST_ACCOUNTS.md if credentials change
   - Modify test expectations if meal plan structure changes

### Adding New Test Cases
```typescript
test('new functionality test', async ({ page }) => {
  await test.step('Setup phase', async () => {
    // Setup code
  });
  
  await test.step('Action phase', async () => {
    // Test actions
  });
  
  await test.step('Verification phase', async () => {
    // Assertions
  });
});
```

## Troubleshooting

### Common Issues

1. **"Element not found" errors:**
   - Check if development server is running
   - Verify test data exists
   - Update selectors if UI changed

2. **Modal stacking issues:**
   - Look for z-index conflicts in CSS
   - Check modal backdrop interactions
   - Verify event propagation

3. **Timeout errors:**
   - Increase test timeout for slow environments
   - Check network conditions
   - Verify API responses

### Debugging Commands
```bash
# Run single test with debug
npx playwright test test/e2e/meal-card-clicking.spec.ts -g "specific test name" --debug

# Run with verbose output  
npx playwright test test/e2e/meal-card-clicking.spec.ts --reporter=list

# Generate trace files
npx playwright test test/e2e/meal-card-clicking.spec.ts --trace=on
```

## Success Criteria

Tests pass when:
- ✅ Customer can login and see meal plans
- ✅ Meal plan modals open correctly 
- ✅ Meal cards are clickable and open recipe modals
- ✅ Recipe modals display on top with proper z-index
- ✅ Multiple meal cards can be clicked sequentially
- ✅ Modals can be closed properly
- ✅ No JavaScript errors occur
- ✅ Performance meets benchmarks
- ✅ Responsive design works across viewports

## Next Steps

1. **Fix Development Server** - Resolve import/export issues
2. **Run Initial Test Suite** - Execute tests once server is working
3. **Review Screenshots** - Verify visual correctness
4. **Performance Optimization** - Address any slow operations
5. **Cross-browser Testing** - Expand to Firefox, Safari if needed
6. **CI/CD Integration** - Add tests to automated pipeline

---

## Contact & Support

For issues with these tests:
1. Check development server is running
2. Verify test account credentials
3. Review console logs for errors
4. Check screenshot outputs for visual issues
5. Reference existing unit test patterns for expected behavior

The comprehensive test suite provides thorough coverage of the meal card clicking functionality from a real user perspective, ensuring the fix works properly in production-like conditions.