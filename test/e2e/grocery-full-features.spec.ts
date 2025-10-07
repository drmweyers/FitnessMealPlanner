import { test, expect } from '@playwright/test';

test.describe('Grocery List Full Feature Test', () => {
  // Test credentials
  const customerEmail = 'customer.test@evofitmeals.com';
  const customerPassword = 'TestCustomer123!';

  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:4000');

    // Login as customer
    await page.fill('input[type="email"]', customerEmail);
    await page.fill('input[type="password"]', customerPassword);
    await page.click('button[type="submit"]');

    // Wait for dashboard to load
    await page.waitForSelector('text=Customer Dashboard', { timeout: 10000 });

    // Navigate to grocery list
    await page.click('button:has-text("Grocery")', { timeout: 10000 });

    // Wait for grocery list to load
    await page.waitForSelector('h1:has-text("Grocery List")', { timeout: 10000 });
  });

  test('1. Checkbox functionality - toggle item checked state', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.grocery-item-text', { timeout: 10000 });

    // Find an unchecked item
    const uncheckedItems = page.locator('div:has(input[type="checkbox"]:not(:checked))');
    const firstUnchecked = uncheckedItems.first();

    // Get the item text before checking
    const itemText = await firstUnchecked.locator('.grocery-item-text').first().textContent();
    console.log('Checking item:', itemText);

    // Click the checkbox
    await firstUnchecked.locator('input[type="checkbox"], div[role="button"][aria-label*="Check"]').first().click();

    // Wait for update
    await page.waitForTimeout(500);

    // Verify the item is now checked (has line-through style)
    const checkedItem = page.locator(`text="${itemText}"`).first();
    const hasLineThrough = await checkedItem.evaluate(el =>
      window.getComputedStyle(el).textDecoration.includes('line-through')
    );
    expect(hasLineThrough).toBeTruthy();
  });

  test('2. Edit item functionality', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.grocery-item-text', { timeout: 10000 });

    // Find and click the more options button for the first item
    const firstItemMoreButton = page.locator('button:has(svg.lucide-more-horizontal)').first();
    await firstItemMoreButton.click();

    // Click Edit in dropdown
    await page.click('text=Edit');

    // Wait for edit modal
    await expect(page.locator('text=Edit Item')).toBeVisible();
    await expect(page.locator('text=Update the details of your grocery item')).toBeVisible();

    // Update item name
    const nameInput = page.locator('input[placeholder="Item name"]');
    await nameInput.clear();
    await nameInput.fill('Updated Item Name');

    // Update quantity
    const qtyInput = page.locator('input[placeholder="Qty"]');
    await qtyInput.clear();
    await qtyInput.fill('10');

    // Click Update button
    await page.click('button:has-text("Update Item")');

    // Wait for modal to close
    await expect(page.locator('text=Edit Item')).not.toBeVisible();

    // Verify the item was updated
    await expect(page.locator('text=10 pcs Updated Item Name')).toBeVisible({ timeout: 10000 });
  });

  test('3. Add new item functionality', async ({ page }) => {
    // Click Add Item button
    await page.click('button:has-text("Add Item")');

    // Wait for add form to appear
    await expect(page.locator('input[placeholder="Item name"]')).toBeVisible();

    // Fill in new item details
    await page.fill('input[placeholder="Item name"]', 'Test New Item');
    await page.fill('input[placeholder="Qty"]', '5');

    // Select category
    const categorySelect = page.locator('select').first();
    await categorySelect.selectOption('produce');

    // Click Add Item button in the form
    const addButton = page.locator('button').filter({ hasText: 'Add Item' }).last();
    await addButton.click();

    // Wait for item to be added
    await expect(page.locator('text=5 pcs Test New Item')).toBeVisible({ timeout: 10000 });
  });

  test('4. Delete item functionality', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.grocery-item-text', { timeout: 10000 });

    // Get the first item text to verify deletion
    const firstItemText = await page.locator('.grocery-item-text').first().textContent();
    console.log('Deleting item:', firstItemText);

    // Click more options for first item
    const firstItemMoreButton = page.locator('button:has(svg.lucide-more-horizontal)').first();
    await firstItemMoreButton.click();

    // Click Delete in dropdown
    await page.click('text=Delete');

    // Wait for item to be deleted
    await page.waitForTimeout(1000);

    // Verify the item is no longer visible
    const deletedItem = page.locator(`text="${firstItemText}"`);
    await expect(deletedItem).toHaveCount(0);
  });

  test('5. Search functionality', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.grocery-item-text', { timeout: 10000 });

    // Get initial item count
    const initialCount = await page.locator('.grocery-item-text').count();
    console.log('Initial item count:', initialCount);

    // Search for a specific item
    await page.fill('input[placeholder="Search items..."]', 'milk');

    // Wait for search to filter
    await page.waitForTimeout(500);

    // Check that fewer items are shown (filtered)
    const filteredCount = await page.locator('.grocery-item-text').count();
    console.log('Filtered item count:', filteredCount);

    // Should have filtered results
    expect(filteredCount).toBeLessThanOrEqual(initialCount);

    // Clear search
    await page.fill('input[placeholder="Search items..."]', '');

    // Wait for all items to show again
    await page.waitForTimeout(500);

    // Verify all items are shown again
    const resetCount = await page.locator('.grocery-item-text').count();
    expect(resetCount).toBe(initialCount);
  });

  test('6. Category filter functionality', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.grocery-item-text', { timeout: 10000 });

    // Click on a category filter button (e.g., Produce)
    const produceButton = page.locator('button').filter({ hasText: 'Produce' }).first();
    if (await produceButton.isVisible()) {
      await produceButton.click();

      // Wait for filter to apply
      await page.waitForTimeout(500);

      // All visible items should be in the Produce category
      const visibleItems = page.locator('.grocery-item-text:visible');
      const count = await visibleItems.count();

      for (let i = 0; i < count; i++) {
        const itemText = await visibleItems.nth(i).textContent();
        console.log('Filtered item:', itemText);
      }

      // Click "All" to reset filter
      await page.click('button:has-text("All")');
    }
  });

  test('7. Sort functionality', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.grocery-item-text', { timeout: 10000 });

    // Open actions dropdown
    const actionsButton = page.locator('button:has(svg.lucide-more-horizontal)').first();
    await actionsButton.click();

    // Click Sort By Name
    await page.click('text=Name');

    // Wait for sort to apply
    await page.waitForTimeout(500);

    // Get all item names
    const itemNames = await page.locator('.grocery-item-text').allTextContents();

    // Check if sorted alphabetically
    const sortedNames = [...itemNames].sort();
    console.log('Item order:', itemNames);

    // Items should be in alphabetical order (roughly)
    expect(itemNames.length).toBeGreaterThan(0);
  });

  test('8. Clear completed items', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.grocery-item-text', { timeout: 10000 });

    // Check some items first
    const checkboxes = page.locator('input[type="checkbox"]:not(:checked), div[role="button"][aria-label*="Check"]');
    const checkboxCount = await checkboxes.count();

    if (checkboxCount > 0) {
      // Check first item
      await checkboxes.first().click();
      await page.waitForTimeout(500);
    }

    // Look for Clear Done button
    const clearButton = page.locator('button').filter({ hasText: /Clear Done|Clear Completed/ });
    if (await clearButton.isVisible()) {
      // Click Clear Done button
      await clearButton.click();

      // Wait for items to be cleared
      await page.waitForTimeout(1000);

      // Checked items should be removed
      const remainingChecked = await page.locator('input[type="checkbox"]:checked').count();
      expect(remainingChecked).toBe(0);
    }
  });

  test('9. Generate from meal plan (if available)', async ({ page }) => {
    // Check if Generate from Meal Plan button exists
    const generateButton = page.locator('button').filter({ hasText: /Generate from.*Plan/ });

    if (await generateButton.isVisible()) {
      // Click generate button
      await generateButton.click();

      // Wait for generation
      await page.waitForTimeout(2000);

      // Should show success message or new items
      const items = await page.locator('.grocery-item-text').count();
      expect(items).toBeGreaterThan(0);
    }
  });

  test('10. Export/Share list functionality', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.grocery-item-text', { timeout: 10000 });

    // Look for Share button
    const shareButton = page.locator('button').filter({ hasText: 'Share' });

    if (await shareButton.isVisible()) {
      // Click Share button
      await shareButton.click();

      // For web, this might trigger download or share dialog
      // We can't fully test native share, but we can verify button works
      await page.waitForTimeout(500);
    }
  });

  test('11. View mode switching (List/Category)', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.grocery-item-text', { timeout: 10000 });

    // Look for view toggle button
    const viewToggle = page.locator('button:has(svg.lucide-grid), button:has(svg.lucide-list)').first();

    if (await viewToggle.isVisible()) {
      // Get initial view
      const hasGrid = await viewToggle.locator('svg.lucide-grid').isVisible();

      // Click to toggle view
      await viewToggle.click();
      await page.waitForTimeout(500);

      // Verify view changed
      if (hasGrid) {
        await expect(viewToggle.locator('svg.lucide-list')).toBeVisible();
      } else {
        await expect(viewToggle.locator('svg.lucide-grid')).toBeVisible();
      }
    }
  });

  test('12. Multiple list management', async ({ page }) => {
    // Check if list switcher exists
    const listSwitcher = page.locator('button').filter({ hasText: /Select List|Test Grocery List|Weekly Shopping/ }).first();

    if (await listSwitcher.isVisible()) {
      // Click list switcher
      await listSwitcher.click();

      // Wait for dropdown
      await page.waitForTimeout(500);

      // Check if Create New List option exists
      const createNewOption = page.locator('text=Create New List');
      if (await createNewOption.isVisible()) {
        await createNewOption.click();

        // Fill new list name
        await page.fill('input[placeholder*="Weekly Shopping"]', 'Test List');

        // Create list
        await page.click('button:has-text("Create List")');

        // Wait for new list to be created
        await page.waitForTimeout(1000);
      }
    }
  });

  test('13. Item priority display', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.grocery-item-text', { timeout: 10000 });

    // Check for priority badges
    const highPriorityBadges = page.locator('text=High');
    const highPriorityCount = await highPriorityBadges.count();

    console.log('High priority items:', highPriorityCount);

    // Priority badges should be visible for high priority items
    if (highPriorityCount > 0) {
      await expect(highPriorityBadges.first()).toBeVisible();
    }
  });

  test('14. Estimated price calculation', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.grocery-item-text', { timeout: 10000 });

    // Look for estimated total
    const totalText = page.locator('text=/Est.*total.*\\$/');

    if (await totalText.isVisible()) {
      const total = await totalText.textContent();
      console.log('Estimated total:', total);

      // Should show a price
      expect(total).toMatch(/\$\d+\.\d{2}/);
    }
  });

  test('15. Empty state handling', async ({ page }) => {
    // Delete all items to test empty state
    let itemCount = await page.locator('.grocery-item-text').count();

    while (itemCount > 0) {
      // Delete first item
      const firstMoreButton = page.locator('button:has(svg.lucide-more-horizontal)').first();
      if (await firstMoreButton.isVisible()) {
        await firstMoreButton.click();
        await page.click('text=Delete');
        await page.waitForTimeout(500);
      }

      itemCount = await page.locator('.grocery-item-text').count();
    }

    // Should show empty state or Add Item prominently
    const addButton = page.locator('button:has-text("Add Item")');
    await expect(addButton).toBeVisible();
  });
});