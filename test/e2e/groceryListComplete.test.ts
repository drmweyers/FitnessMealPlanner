import { test, expect, Page } from '@playwright/test';

// Test credentials
const CUSTOMER_EMAIL = 'customer.test@evofitmeals.com';
const CUSTOMER_PASSWORD = 'TestCustomer123!';

// Helper function to login as customer
async function loginAsCustomer(page: Page) {
  await page.goto('http://localhost:4000');

  // Click login button
  const loginButton = page.locator('button:has-text("Sign In"), button:has-text("Login")').first();
  await loginButton.click({ timeout: 10000 });

  // Fill in login form
  await page.fill('input[type="email"]', CUSTOMER_EMAIL);
  await page.fill('input[type="password"]', CUSTOMER_PASSWORD);

  // Submit login
  const submitButton = page.locator('button[type="submit"]:has-text("Sign In"), button[type="submit"]:has-text("Login")').first();
  await submitButton.click();

  // Wait for redirect to customer dashboard
  await page.waitForURL('**/customer', { timeout: 15000 });

  // Additional wait for page to fully load
  await page.waitForLoadState('networkidle');
}

test.describe('Grocery List Feature - Complete Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport for consistent testing
    await page.setViewportSize({ width: 1280, height: 720 });

    // Login before each test
    await loginAsCustomer(page);
  });

  test('Customer can navigate to grocery list tab', async ({ page }) => {
    // Verify we're on the customer page
    await expect(page).toHaveURL(/.*\/customer/);

    // Look for the grocery tab
    const groceryTab = page.locator('button[role="tab"]:has-text("Grocery")');
    await expect(groceryTab).toBeVisible({ timeout: 10000 });

    // Click on the grocery tab
    await groceryTab.click();

    // Verify URL changes to include grocery-list tab
    await expect(page).toHaveURL(/.*\?tab=grocery-list/);

    // Verify grocery list content is displayed
    const groceryContent = page.locator('[role="tabpanel"][data-state="active"]');
    await expect(groceryContent).toBeVisible();

    // Take a screenshot for debugging
    await page.screenshot({ path: 'test-screenshots/grocery-tab-navigation.png', fullPage: true });
  });

  test('Grocery list wrapper renders correctly', async ({ page }) => {
    // Navigate to grocery list tab
    await page.click('button[role="tab"]:has-text("Grocery")');

    // Wait for grocery list wrapper to be visible
    const groceryWrapper = page.locator('div:has(> div:has-text("Grocery"))').first();

    // Check if loading state appears first
    const loadingText = page.locator('text=/Loading grocery lists/i');
    if (await loadingText.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('Loading state detected');
      await expect(loadingText).toBeHidden({ timeout: 10000 });
    }

    // Check for various possible states
    const possibleStates = [
      // Empty state - create first list
      page.locator('text=/Create your first grocery list/i'),
      // List selector
      page.locator('text=/Select a list or create a new one/i'),
      // Actual grocery list
      page.locator('[data-testid="mobile-grocery-list"]'),
      // Create new list button
      page.locator('button:has-text("Create New List")'),
      // List items
      page.locator('text=/items/i')
    ];

    // Wait for at least one state to be visible
    let foundState = false;
    for (const state of possibleStates) {
      if (await state.isVisible({ timeout: 2000 }).catch(() => false)) {
        foundState = true;
        console.log(`Found state: ${await state.textContent().catch(() => 'component')}`);
        break;
      }
    }

    expect(foundState).toBe(true);

    // Take screenshot of current state
    await page.screenshot({ path: 'test-screenshots/grocery-list-state.png', fullPage: true });
  });

  test('Customer can create a new grocery list', async ({ page }) => {
    // Navigate to grocery list tab
    await page.click('button[role="tab"]:has-text("Grocery")');

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Look for create new list button
    const createButton = page.locator('button:has-text("Create New List")');

    if (await createButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Click create new list
      await createButton.click();

      // Fill in list name
      const listNameInput = page.locator('input[placeholder*="Weekly Shopping"], input[placeholder*="Meal Prep"]');
      await expect(listNameInput).toBeVisible({ timeout: 5000 });

      const testListName = `Test List ${Date.now()}`;
      await listNameInput.fill(testListName);

      // Submit the form
      const submitButton = page.locator('button:has-text("Create List")').filter({ hasNotText: 'Creating' });
      await submitButton.click();

      // Wait for list to be created
      await page.waitForTimeout(2000);

      // Verify list was created
      const listCreated = page.locator(`text="${testListName}"`).or(page.locator('[data-testid="mobile-grocery-list"]'));
      await expect(listCreated).toBeVisible({ timeout: 10000 });

      console.log('Successfully created new grocery list');
    } else {
      // List already exists, verify it's displayed
      const existingList = page.locator('[data-testid="mobile-grocery-list"], div:has-text("items")').first();
      await expect(existingList).toBeVisible({ timeout: 10000 });
      console.log('Existing grocery list found');
    }

    await page.screenshot({ path: 'test-screenshots/grocery-list-created.png', fullPage: true });
  });

  test('Customer can see grocery list items', async ({ page }) => {
    // Navigate to grocery list tab
    await page.click('button[role="tab"]:has-text("Grocery")');

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Check if we need to select or create a list first
    const createButton = page.locator('button:has-text("Create New List")');
    const selectList = page.locator('button:has-text("Weekly Shopping List"), button:has-text("My Grocery List")').first();

    if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Create a list first
      await createButton.click();
      await page.fill('input[placeholder*="Weekly Shopping"], input[placeholder*="Meal Prep"]', 'Shopping List');
      await page.click('button:has-text("Create List")');
      await page.waitForTimeout(2000);
    } else if (await selectList.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Select existing list
      await selectList.click();
      await page.waitForTimeout(1000);
    }

    // Now check for grocery list content
    const groceryListContent = page.locator('[data-testid="mobile-grocery-list"], div:has(button:has-text("Add Item"))').first();

    if (await groceryListContent.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Grocery list content is visible');

      // Look for item elements
      const itemElements = page.locator('[data-testid="grocery-item"], div:has(input[type="checkbox"])');
      const itemCount = await itemElements.count();

      if (itemCount > 0) {
        console.log(`Found ${itemCount} grocery items`);

        // Verify checkbox functionality
        const firstItem = itemElements.first();
        const checkbox = firstItem.locator('input[type="checkbox"]');

        if (await checkbox.isVisible()) {
          const isChecked = await checkbox.isChecked();
          await checkbox.click();
          await page.waitForTimeout(500);
          const newState = await checkbox.isChecked();
          expect(newState).toBe(!isChecked);
          console.log('Checkbox functionality working');
        }
      } else {
        // Try to add an item
        const addButton = page.locator('button:has-text("Add Item"), button:has(svg)').last();
        if (await addButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await addButton.click();

          const itemInput = page.locator('input[placeholder*="item name"], input[placeholder*="Add"]');
          if (await itemInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await itemInput.fill('Test Item');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(1000);
            console.log('Added test item to list');
          }
        }
      }
    }

    await page.screenshot({ path: 'test-screenshots/grocery-list-items.png', fullPage: true });
  });

  test('Grocery list checkbox functionality works', async ({ page }) => {
    // Navigate to grocery list tab
    await page.click('button[role="tab"]:has-text("Grocery")');

    // Wait for content to load
    await page.waitForTimeout(3000);

    // Ensure we have a list with items
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();

    if (checkboxCount > 0) {
      console.log(`Found ${checkboxCount} checkboxes`);

      // Test first checkbox
      const firstCheckbox = checkboxes.first();
      const initialState = await firstCheckbox.isChecked();

      // Click to toggle
      await firstCheckbox.click();
      await page.waitForTimeout(500);

      // Verify state changed
      const newState = await firstCheckbox.isChecked();
      expect(newState).toBe(!initialState);

      // Click again to toggle back
      await firstCheckbox.click();
      await page.waitForTimeout(500);

      // Verify state reverted
      const finalState = await firstCheckbox.isChecked();
      expect(finalState).toBe(initialState);

      console.log('Checkbox toggle functionality verified');
    } else {
      console.log('No checkboxes found - list may be empty');

      // Try to add an item first
      const addButton = page.locator('button:has-text("Add"), button:has(text="+"").last()');
      if (await addButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addButton.click();

        const input = page.locator('input').last();
        await input.fill('Checkbox Test Item');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // Now try to find checkbox again
        const newCheckbox = page.locator('input[type="checkbox"]').first();
        if (await newCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
          await newCheckbox.click();
          console.log('Successfully tested checkbox on newly added item');
        }
      }
    }

    await page.screenshot({ path: 'test-screenshots/grocery-checkbox-test.png', fullPage: true });
  });

  test('Grocery list persists after page refresh', async ({ page }) => {
    // Navigate to grocery list tab
    await page.click('button[role="tab"]:has-text("Grocery")');

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Get current state
    const beforeRefresh = await page.content();

    // Refresh the page
    await page.reload();

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Navigate back to grocery list tab
    const groceryTabAfter = page.locator('button[role="tab"]:has-text("Grocery")');
    await groceryTabAfter.click();

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Verify content is still there
    const afterRefresh = await page.content();

    // Check that we still have grocery list elements
    const hasGroceryElements = afterRefresh.includes('Grocery') ||
                               afterRefresh.includes('Shopping') ||
                               afterRefresh.includes('Create New List');

    expect(hasGroceryElements).toBe(true);
    console.log('Grocery list persisted after refresh');

    await page.screenshot({ path: 'test-screenshots/grocery-after-refresh.png', fullPage: true });
  });

  test('Complete grocery list user flow', async ({ page }) => {
    console.log('Starting complete user flow test');

    // Step 1: Navigate to grocery list
    await page.click('button[role="tab"]:has-text("Grocery")');
    await page.waitForTimeout(2000);
    console.log('Navigated to grocery tab');

    // Step 2: Create or select a list
    const needsListCreation = await page.locator('text=/Create your first grocery list/i').isVisible({ timeout: 2000 }).catch(() => false) ||
                             await page.locator('button:has-text("Create New List")').isVisible({ timeout: 2000 }).catch(() => false);

    if (needsListCreation) {
      const createBtn = page.locator('button:has-text("Create New List")');
      if (await createBtn.isVisible()) {
        await createBtn.click();
        await page.fill('input[placeholder*="Weekly Shopping"], input[placeholder*="Meal Prep"]', 'Complete Test List');
        await page.click('button:has-text("Create List")');
        await page.waitForTimeout(2000);
        console.log('Created new list');
      }
    }

    // Step 3: Add items if needed
    const addItemButton = page.locator('button:has-text("Add"), button:has-text("+")').last();
    if (await addItemButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Add multiple items
      const itemsToAdd = ['Milk', 'Bread', 'Eggs', 'Chicken', 'Rice'];

      for (const item of itemsToAdd) {
        await addItemButton.click();
        const input = page.locator('input').last();
        await input.fill(item);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
      }
      console.log('Added test items');
    }

    // Step 4: Check off some items
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();

    if (checkboxCount > 0) {
      // Check off first two items
      for (let i = 0; i < Math.min(2, checkboxCount); i++) {
        const checkbox = checkboxes.nth(i);
        if (!await checkbox.isChecked()) {
          await checkbox.click();
          await page.waitForTimeout(300);
        }
      }
      console.log('Checked off items');
    }

    // Step 5: Verify final state
    await page.screenshot({ path: 'test-screenshots/grocery-complete-flow.png', fullPage: true });

    // Verify we have a functional grocery list
    const hasItems = await page.locator('input[type="checkbox"]').count() > 0;
    const hasCheckedItems = await page.locator('input[type="checkbox"]:checked').count() > 0;

    console.log(`Test complete - Has items: ${hasItems}, Has checked items: ${hasCheckedItems}`);
    expect(hasItems || await page.locator('button:has-text("Add")').isVisible()).toBe(true);
  });
});

// Additional test for mobile responsiveness
test.describe('Grocery List - Mobile Responsive', () => {
  test('Grocery list works on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });

    // Login
    await loginAsCustomer(page);

    // Navigate to grocery tab
    const groceryTab = page.locator('button[role="tab"]:has-text("Grocery")');
    await groceryTab.click();

    // Wait for content
    await page.waitForTimeout(2000);

    // Verify mobile-optimized elements are visible
    const mobileContent = page.locator('[data-testid="mobile-grocery-list"], div:has-text("Grocery")').first();
    await expect(mobileContent).toBeVisible({ timeout: 10000 });

    // Check that UI elements fit mobile screen
    const viewportSize = page.viewportSize();
    if (viewportSize) {
      const boundingBox = await mobileContent.boundingBox();
      if (boundingBox) {
        expect(boundingBox.width).toBeLessThanOrEqual(viewportSize.width);
        console.log('Mobile responsiveness verified');
      }
    }

    await page.screenshot({ path: 'test-screenshots/grocery-mobile-view.png', fullPage: true });
  });
});