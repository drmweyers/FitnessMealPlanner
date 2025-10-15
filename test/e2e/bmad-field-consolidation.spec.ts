import { test, expect } from '@playwright/test';

test.describe('BMAD Field Consolidation - GUI Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('http://localhost:4000');
    await page.fill('input[type="email"]', 'admin@fitmeal.pro');
    await page.fill('input[type="password"]', 'AdminPass123');
    await page.click('button[type="submit"]');

    // Wait for redirect and navigate to admin page
    await page.waitForURL('**/admin');

    // Click BMAD Generator tab (should be 3rd tab now)
    await page.click('text=BMAD Generator');

    // Wait for form to load
    await page.waitForSelector('text=Recipe Types to Generate', { timeout: 10000 });
  });

  test('should show meal types checkboxes with updated label', async ({ page }) => {
    // Verify new label exists
    await expect(page.locator('text=Recipe Types to Generate')).toBeVisible();

    // Verify helper text
    await expect(page.locator('text=Select one or more meal categories')).toBeVisible();

    // Check all meal type checkboxes are present
    const checkboxes = page.locator('label:has-text("Breakfast"), label:has-text("Lunch"), label:has-text("Dinner"), label:has-text("Snack")');
    await expect(checkboxes).toHaveCount(4);
  });

  test('should NOT show meal type dropdown in Filter Preferences', async ({ page }) => {
    // Scroll to Filter Preferences section
    await page.locator('text=Filter Preferences').scrollIntoViewIfNeeded();

    // Verify section exists
    await expect(page.locator('text=Filter Preferences')).toBeVisible();

    // Get the Filter Preferences section
    const filterSection = page.locator('text=Filter Preferences').locator('..');

    // Count select dropdowns in Filter Preferences - should be 3 (not 4)
    const dropdownLabels = await filterSection.locator('label').allTextContents();

    // Should have: Dietary, Max Prep Time, Max Calories Per Recipe
    // Should NOT have: Meal Type
    expect(dropdownLabels).not.toContain('Meal Type');

    // Verify we have exactly 3 filter fields
    const selectElements = filterSection.locator('select');
    await expect(selectElements).toHaveCount(3);
  });

  test('should show clarified calorie field labels', async ({ page }) => {
    // Check for Daily Calorie Goal label
    await expect(page.locator('text=Daily Calorie Goal (Optional)')).toBeVisible();

    // Check for Max Calories Per Recipe label
    await page.locator('text=Filter Preferences').scrollIntoViewIfNeeded();
    await expect(page.locator('text=Max Calories Per Recipe')).toBeVisible();
  });

  test('should show helper text for calorie fields', async ({ page }) => {
    // Check Daily Calorie Goal helper text
    await expect(page.locator('text=Total daily calorie target for complete meal plan')).toBeVisible();

    // Scroll to Max Calories Per Recipe and check its helper text
    await page.locator('text=Filter Preferences').scrollIntoViewIfNeeded();
    await expect(page.locator('text=Maximum allowed calories for each individual recipe')).toBeVisible();
  });

  test('should allow submitting form with meal types array', async ({ page }) => {
    // Fill required field
    await page.fill('input[type="number"]', '10');

    // Select multiple meal types via checkboxes
    await page.check('label:has-text("Breakfast") input[type="checkbox"]');
    await page.check('label:has-text("Lunch") input[type="checkbox"]');

    // Scroll to submit button
    await page.locator('button:has-text("Start BMAD Generation")').scrollIntoViewIfNeeded();

    // Submit form
    await page.click('button:has-text("Start BMAD Generation")');

    // Should see generation started toast (wait up to 5 seconds)
    await expect(page.locator('text=BMAD Generation Started')).toBeVisible({ timeout: 5000 });
  });

  test('Filter Preferences should have exactly 3 fields in 3-column grid', async ({ page }) => {
    // Scroll to Filter Preferences
    await page.locator('text=Filter Preferences').scrollIntoViewIfNeeded();

    // Get the grid container
    const gridContainer = page.locator('text=Filter Preferences').locator('..').locator('.grid');

    // Check grid has 3 columns class
    const gridClass = await gridContainer.getAttribute('class');
    expect(gridClass).toContain('lg:grid-cols-3');

    // Verify field labels
    const filterSection = page.locator('text=Filter Preferences').locator('..');

    await expect(filterSection.locator('text=Dietary')).toBeVisible();
    await expect(filterSection.locator('text=Max Prep Time')).toBeVisible();
    await expect(filterSection.locator('text=Max Calories Per Recipe')).toBeVisible();

    // Ensure NO "Meal Type" dropdown
    await expect(filterSection.locator('text=Meal Type')).not.toBeVisible();
  });

  test('should handle Quick Bulk Generation with updated schema', async ({ page }) => {
    // Scroll to Quick Bulk Generation section
    await page.locator('text=Quick Bulk Generation').scrollIntoViewIfNeeded();

    // Click 10 recipes button
    await page.click('button:has-text("10"):has-text("recipes")');

    // Should see generation started toast
    await expect(page.locator('text=Quick Generation Started')).toBeVisible({ timeout: 5000 });
  });

  test('should NOT have legacy fields in form data', async ({ page }) => {
    // This test verifies that legacy fields are not present in the DOM

    // Fill the form
    await page.fill('input[type="number"]', '5');
    await page.check('label:has-text("Breakfast") input[type="checkbox"]');

    // Scroll to advanced form fields
    await page.locator('text=Daily Calorie Goal').scrollIntoViewIfNeeded();

    // Verify legacy field names don't exist as form field names
    const formInputs = page.locator('input[name], select[name]');
    const inputNames = await formInputs.evaluateAll(elements =>
      elements.map(el => (el as HTMLInputElement).name)
    );

    // Legacy field names should NOT be present
    expect(inputNames).not.toContain('mealType'); // duplicate removed
    expect(inputNames).not.toContain('targetCalories'); // legacy removed
    expect(inputNames).not.toContain('dietaryRestrictions'); // legacy removed
    expect(inputNames).not.toContain('mainIngredient'); // legacy removed
  });

  test('should show all 3 sections: Natural Language, Quick Bulk, Advanced Form', async ({ page }) => {
    // Section 1: Natural Language Generator
    await expect(page.locator('text=AI-Powered Natural Language Generator')).toBeVisible();

    // Section 2: Quick Bulk Generation
    await expect(page.locator('text=Quick Bulk Generation')).toBeVisible();

    // Section 3: Advanced Form (with Show/Hide toggle)
    await expect(page.locator('text=Recipe Types to Generate')).toBeVisible();
  });

  test('should maintain form state after field consolidation', async ({ page }) => {
    // Fill multiple fields
    await page.fill('input[type="number"]', '20');
    await page.check('label:has-text("Breakfast") input[type="checkbox"]');
    await page.check('label:has-text("Dinner") input[type="checkbox"]');

    // Scroll and fill more fields
    await page.locator('text=Daily Calorie Goal').scrollIntoViewIfNeeded();
    await page.fill('input[placeholder="e.g., 2000"]', '1800');

    // Scroll to Filter Preferences
    await page.locator('text=Filter Preferences').scrollIntoViewIfNeeded();
    await page.selectOption('select >> nth=0', 'keto'); // Dietary dropdown

    // Verify all values are maintained
    const countValue = await page.inputValue('input[type="number"]');
    expect(countValue).toBe('20');

    const breakfastChecked = await page.isChecked('label:has-text("Breakfast") input[type="checkbox"]');
    expect(breakfastChecked).toBe(true);

    const calorieValue = await page.inputValue('input[placeholder="e.g., 2000"]');
    expect(calorieValue).toBe('1800');
  });
});
