import { test, expect } from '@playwright/test';

test.describe('BMAD Form Verification', () => {
  test('verify new form fields are visible and old fields are removed', async ({ page }) => {
    console.log('\n=== BMAD FORM VERIFICATION TEST ===\n');

    // Step 1: Login as admin
    await page.goto('http://localhost:4000/auth');
    await page.fill('input[type="email"]', 'admin@fitmeal.pro');
    await page.fill('input[type="password"]', 'AdminPass123');
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForURL('**/admin', { timeout: 10000 });
    console.log('✓ Logged in as admin');

    // Step 2: Navigate to BMAD Generator tab
    await page.click('button[value="bmad"]');
    await page.waitForTimeout(1000); // Let tab content load
    console.log('✓ Clicked BMAD Generator tab');

    // Take screenshot of full page
    await page.screenshot({
      path: 'test-results/bmad-form-full-page.png',
      fullPage: true
    });
    console.log('✓ Saved full page screenshot');

    // Step 3: Check for REMOVED fields (should NOT exist)
    const removedFields = [
      { name: 'Daily Calorie Goal', selector: 'label:has-text("Daily Calorie Goal")' },
      { name: 'Number of Days', selector: 'label:has-text("Number of Days")' },
      { name: 'Meals Per Day', selector: 'label:has-text("Meals Per Day")' },
      { name: 'Description', selector: 'label:has-text("Description")' }
    ];

    console.log('\n--- Checking REMOVED Fields (should NOT exist) ---');
    for (const field of removedFields) {
      const exists = await page.locator(field.selector).count() > 0;
      console.log(`${field.name}: ${exists ? '❌ STILL EXISTS (BUG!)' : '✅ Correctly removed'}`);
      expect(exists).toBe(false);
    }

    // Step 4: Check for NEW fields (should exist)
    const newFields = [
      { name: 'Focus Ingredient', selector: 'label:has-text("Focus Ingredient")' },
      { name: 'Difficulty Level', selector: 'label:has-text("Difficulty Level")' },
      { name: 'Recipe Preferences', selector: 'label:has-text("Recipe Preferences")' }
    ];

    console.log('\n--- Checking NEW Fields (should exist) ---');
    for (const field of newFields) {
      const exists = await page.locator(field.selector).count() > 0;
      console.log(`${field.name}: ${exists ? '✅ Found' : '❌ MISSING (BUG!)'}`);
      expect(exists).toBe(true);
    }

    // Step 5: Check if Meal Type changed from checkboxes to dropdown
    console.log('\n--- Checking Meal Type Field ---');
    const mealTypeCheckboxes = await page.locator('input[type="checkbox"][name*="mealType"]').count();
    const mealTypeDropdown = await page.locator('select, [role="combobox"]').filter({ hasText: /breakfast|lunch|dinner|snack/i }).count();

    console.log(`Meal Type Checkboxes: ${mealTypeCheckboxes} (should be 0)`);
    console.log(`Meal Type Dropdown: ${mealTypeDropdown} (should be 1)`);

    expect(mealTypeCheckboxes).toBe(0);
    expect(mealTypeDropdown).toBeGreaterThan(0);

    // Step 6: Screenshot the Advanced Form section
    const advancedForm = page.locator('form').first();
    await advancedForm.screenshot({
      path: 'test-results/bmad-form-advanced-section.png'
    });
    console.log('✓ Saved advanced form screenshot');

    // Step 7: Get full HTML of BMAD tab for debugging
    const bmadTabContent = await page.locator('[role="tabpanel"]').filter({ has: page.locator('text=Bulk Recipe Generator') }).innerHTML();

    // Save to file for inspection
    const fs = require('fs');
    fs.writeFileSync('test-results/bmad-form-html.html', bmadTabContent);
    console.log('✓ Saved BMAD form HTML to test-results/bmad-form-html.html');

    // Step 8: Check if component is BMADRecipeGenerator
    const componentName = await page.evaluate(() => {
      const bmadTab = document.querySelector('[role="tabpanel"]');
      return bmadTab?.getAttribute('data-component') || 'unknown';
    });
    console.log(`\nComponent name: ${componentName}`);

    // Step 9: Final Report
    console.log('\n=== VERIFICATION COMPLETE ===');
    console.log('\nScreenshots saved:');
    console.log('- test-results/bmad-form-full-page.png');
    console.log('- test-results/bmad-form-advanced-section.png');
    console.log('\nHTML dump saved:');
    console.log('- test-results/bmad-form-html.html');
    console.log('\n');
  });

  test('check if Vite is serving latest code', async ({ page }) => {
    console.log('\n=== CHECKING VITE DEV SERVER ===\n');

    // Check if Vite HMR is working
    const response = await page.goto('http://localhost:4000');
    expect(response?.status()).toBe(200);

    // Check for Vite client in HTML
    const html = await page.content();
    const hasViteClient = html.includes('/@vite/client') || html.includes('vite');
    console.log(`Vite client detected: ${hasViteClient ? '✅ Yes' : '❌ No'}`);

    // Check timestamp of served file
    const now = new Date();
    console.log(`Current time: ${now.toISOString()}`);
    console.log('\nIf changes were made recently, Vite should have reloaded automatically.');
    console.log('If not seeing changes, try:');
    console.log('1. Hard refresh browser (Ctrl+Shift+R)');
    console.log('2. Clear browser cache');
    console.log('3. Restart dev server: docker-compose --profile dev restart');
  });
});
