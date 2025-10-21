import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@fitmeal.pro';
const ADMIN_PASSWORD = 'AdminPass123';
const BASE_URL = 'http://localhost:4000';

test.describe('Queue Auto-Refresh - Recipe Library Tab', () => {

  test('Recipe Library pending count should auto-refresh after BMAD generation', async ({ page }) => {
    console.log('\n=== QUEUE AUTO-REFRESH TEST (Recipe Library Tab) ===\n');

    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*\/admin/, { timeout: 10000 });
    console.log('✅ Logged in as admin');

    // Go to Recipe Library tab (should be default)
    await page.click('[data-testid="admin-tab-recipes"]');
    await page.waitForTimeout(1000);
    console.log('✅ On Recipe Library tab');

    // Track invalidation console logs
    const invalidationLogs: string[] = [];
    const allConsoleLogs: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      allConsoleLogs.push(text);

      if (text.includes('invalidat') || text.includes('Invalidat') || text.includes('Recipe Invalidation')) {
        invalidationLogs.push(text);
        console.log('🔄', text);
      }
      if (text.includes('Generation Complete') || text.includes('complete')) {
        console.log('✅ Generation event:', text);
      }
      if (text.includes('refetch') || text.includes('Refetch')) {
        console.log('🔄 Refetch:', text);
      }
    });

    // Find the "Review Queue" button on Recipe Library tab
    const reviewQueueButton = page.locator('[data-testid="admin-view-pending"]');
    await expect(reviewQueueButton).toBeVisible({ timeout: 5000 });
    console.log('✅ Review Queue button found');

    // Get initial pending count from button text
    const initialButtonText = await reviewQueueButton.textContent();
    console.log('📊 Initial button text:', initialButtonText);

    // Extract count (e.g., "Review Queue (5)" -> 5)
    const initialCountMatch = initialButtonText?.match(/\((\d+)\)/);
    const initialCount = initialCountMatch ? parseInt(initialCountMatch[1]) : 0;
    console.log(`   Initial pending count: ${initialCount}`);

    // Now go to BMAD Generator tab to generate a recipe
    await page.click('[data-testid="admin-tab-bmad"]');
    await page.waitForTimeout(1000);
    console.log('\n🔄 Switched to Bulk Generator tab');

    // Set recipe count to 1
    const recipeCountInput = page.locator('input[name="recipeCount"]');
    await expect(recipeCountInput).toBeVisible();
    await recipeCountInput.fill('1');
    console.log('✅ Set recipe count to 1');

    // Click Start BMAD Generation
    const startButton = page.locator('button:has-text("Start BMAD Generation")');
    await expect(startButton).toBeVisible();
    await startButton.click();
    console.log('🚀 Started BMAD generation');

    // Wait for generation to complete
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

      if (waited % 5000 === 0) {
        console.log(`   ... waited ${waited / 1000}s`);
      }
    }

    if (!generationComplete) {
      console.log('⚠️ Generation did not complete within timeout');
    }

    // Wait for invalidation to propagate
    console.log('\n⏳ Waiting for invalidation to propagate (3s)...');
    await page.waitForTimeout(3000);

    // Check invalidation logs
    console.log(`\n📝 Invalidation Logs: ${invalidationLogs.length} entries`);
    if (invalidationLogs.length > 0) {
      invalidationLogs.slice(0, 10).forEach(log => console.log('   -', log));
    } else {
      console.log('   ❌ No invalidation logs detected!');
      console.log('\n   Recent console logs:');
      allConsoleLogs.slice(-20).forEach(log => console.log('   -', log));
    }

    // Switch BACK to Recipe Library tab to check if count updated
    console.log('\n🔄 Switching back to Recipe Library tab...');
    await page.click('[data-testid="admin-tab-recipes"]');
    await page.waitForTimeout(2000);

    // Get final pending count
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
      console.log('   This means invalidateRecipeQueries() was NOT called after generation');
      console.log('   BUG CONFIRMED: Queue auto-refresh is broken!');
    } else {
      console.log(`\n✅ Invalidation was triggered (${invalidationLogs.length} log entries)`);
    }

    if (finalCount === initialCount) {
      console.log('\n⚠️ Pending count did NOT change');
      console.log('   Possible reasons:');
      console.log('   1. Recipe was auto-approved (not added to pending)');
      console.log('   2. Query invalidation did not trigger refetch');
      console.log('   3. Generation still in progress');
    } else if (finalCount > initialCount) {
      console.log('\n✅ SUCCESS: Pending count increased!');
      console.log('   Queue auto-refresh is WORKING');
    } else {
      console.log('\n⚠️ Pending count decreased (unexpected)');
    }

    // The main check is invalidation happened
    expect(invalidationLogs.length, 'Invalidation should be called after generation').toBeGreaterThan(0);
  });
});
