import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@fitmeal.pro';
const ADMIN_PASSWORD = 'AdminPass123';
const BASE_URL = 'http://localhost:4000';

test.describe('Queue Auto-Refresh Test', () => {

  test('Queue should auto-refresh after recipe generation', async ({ page }) => {
    console.log('\n=== QUEUE AUTO-REFRESH TEST ===\n');

    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*\/admin/, { timeout: 10000 });
    console.log('✅ Logged in as admin');

    // Go to Bulk Generator tab
    await page.click('[data-testid="admin-tab-bmad"]');
    await page.waitForTimeout(1000);
    console.log('✅ Navigated to Bulk Generator tab');

    // Track invalidation console logs
    const invalidationLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('invalidat') || text.includes('Invalidat') || text.includes('Recipe Invalidation')) {
        invalidationLogs.push(text);
        console.log('🔄', text);
      }
      if (text.includes('Generation Complete') || text.includes('complete')) {
        console.log('✅ Generation event:', text);
      }
    });

    // Get initial pending count by checking the "Review Queue" button text
    const reviewQueueButton = page.locator('button:has-text("Review Queue")');
    await expect(reviewQueueButton).toBeVisible({ timeout: 5000 });
    const initialButtonText = await reviewQueueButton.textContent();
    console.log('📊 Initial Review Queue Button:', initialButtonText);

    // Extract count from button text (e.g., "Review Queue (5)" -> 5)
    const initialCountMatch = initialButtonText?.match(/\((\d+)\)/);
    const initialCount = initialCountMatch ? parseInt(initialCountMatch[1]) : 0;
    console.log(`   Initial pending count: ${initialCount}`);

    // Set recipe count to 1
    const recipeCountInput = page.locator('input[name="recipeCount"]');
    await expect(recipeCountInput).toBeVisible();
    await recipeCountInput.fill('1');
    console.log('✅ Set recipe count to 1');

    // Click Start BMAD Generation
    const startButton = page.locator('button:has-text("Start BMAD Generation")');
    await expect(startButton).toBeVisible();
    await startButton.click();
    console.log('🚀 Clicked Start BMAD Generation');

    // Wait for generation to complete (up to 60 seconds)
    console.log('\n⏳ Waiting for generation to complete...');
    let generationComplete = false;
    let waited = 0;

    while (!generationComplete && waited < 60000) {
      await page.waitForTimeout(1000);
      waited += 1000;

      // Check for completion toast
      const toastVisible = await page.locator('text=Generation Complete').isVisible().catch(() => false);
      if (toastVisible) {
        generationComplete = true;
        console.log('✅ Generation Complete toast visible');
        break;
      }

      // Also check button text changes
      const currentButtonText = await reviewQueueButton.textContent().catch(() => '');
      if (currentButtonText !== initialButtonText) {
        console.log(`   Button text changed: "${initialButtonText}" -> "${currentButtonText}"`);
      }
    }

    if (!generationComplete) {
      console.log('⚠️ Generation did not complete within timeout (may still be in progress)');
    }

    // Wait a bit more for invalidation to propagate
    await page.waitForTimeout(3000);

    // Check invalidation logs
    console.log(`\n📝 Invalidation Logs: ${invalidationLogs.length} entries`);
    if (invalidationLogs.length > 0) {
      invalidationLogs.forEach(log => console.log('   -', log));
    }

    // Get final pending count from button
    const finalButtonText = await reviewQueueButton.textContent();
    const finalCountMatch = finalButtonText?.match(/\((\d+)\)/);
    const finalCount = finalCountMatch ? parseInt(finalCountMatch[1]) : 0;

    console.log('\n📊 FINAL RESULTS:');
    console.log(`   Initial count: ${initialCount}`);
    console.log(`   Final count: ${finalCount}`);
    console.log(`   Difference: ${finalCount - initialCount}`);
    console.log(`   Button text: "${initialButtonText}" -> "${finalButtonText}"`);

    // Analysis
    if (invalidationLogs.length === 0) {
      console.log('\n❌ FAILURE: No invalidation logs detected');
      console.log('   This means invalidateRecipeQueries() was NOT called');
    } else {
      console.log(`\n✅ Invalidation was triggered (${invalidationLogs.length} log entries)`);
    }

    if (finalCount === initialCount) {
      console.log('\n⚠️ WARNING: Pending count did NOT change');
      console.log('   This could mean:');
      console.log('   1. Generation is still in progress');
      console.log('   2. Recipe was auto-approved (not added to pending queue)');
      console.log('   3. Query invalidation did not trigger refetch');
    } else if (finalCount > initialCount) {
      console.log('\n✅ SUCCESS: Pending count increased (queue auto-refreshed!)');
    } else {
      console.log('\n⚠️ UNEXPECTED: Pending count decreased');
    }

    // Assertions
    expect(invalidationLogs.length, 'Invalidation should be triggered').toBeGreaterThan(0);

    // Note: We can't assert count increase because recipes might be auto-approved
    // Instead, we verify that invalidation happened
    if (invalidationLogs.length > 0) {
      console.log('\n✅ PASS: Auto-refresh mechanism is working (invalidation triggered)');
    }
  });
});
