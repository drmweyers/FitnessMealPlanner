import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@fitmeal.pro';
const ADMIN_PASSWORD = 'AdminPass123';
const BASE_URL = 'http://localhost:4000';

test.describe('Parse Button and Queue Auto-Refresh Debugging', () => {

  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for redirect to admin page
    await page.waitForURL(/.*\/admin/);
    await page.waitForTimeout(1000);
  });

  test('BUG #1: Parse AI Button - Should populate form fields', async ({ page }) => {
    console.log('\n=== TESTING PARSE AI BUTTON ===');

    // Go to Meal Plan Builder tab
    await page.click('text=Meal Plan Builder');
    await page.waitForTimeout(500);

    // Listen for console logs
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(text);
      console.log('Browser Console:', text);
    });

    // Listen for network requests to parse endpoint
    const parseRequests: any[] = [];
    page.on('request', request => {
      if (request.url().includes('parse-natural-language')) {
        console.log('📤 Parse Request:', request.url());
        console.log('   Body:', request.postData());
        parseRequests.push({
          url: request.url(),
          method: request.method(),
          body: request.postData()
        });
      }
    });

    page.on('response', async response => {
      if (response.url().includes('parse-natural-language')) {
        console.log('📥 Parse Response:', response.status());
        const body = await response.text().catch(() => 'Could not read body');
        console.log('   Response Body:', body);
      }
    });

    // Enter natural language input
    const naturalLanguageInput = 'Create a 7-day weight loss plan with 3 meals per day and 2000 calories';
    await page.fill('textarea[placeholder*="natural language"]', naturalLanguageInput);
    console.log('✅ Entered natural language input:', naturalLanguageInput);

    // Get form values BEFORE clicking Parse
    const formValuesBefore = await page.evaluate(() => {
      const planNameInput = document.querySelector('input[name="planName"]') as HTMLInputElement;
      const daysInput = document.querySelector('input[name="days"]') as HTMLInputElement;
      const mealsInput = document.querySelector('input[name="mealsPerDay"]') as HTMLInputElement;
      const caloriesInput = document.querySelector('input[name="dailyCalorieTarget"]') as HTMLInputElement;

      return {
        planName: planNameInput?.value || '',
        days: daysInput?.value || '',
        mealsPerDay: mealsInput?.value || '',
        dailyCalorieTarget: caloriesInput?.value || ''
      };
    });
    console.log('📋 Form values BEFORE Parse:', formValuesBefore);

    // Click the Parse AI button
    const parseButton = page.locator('button:has-text("Parse AI")');
    await expect(parseButton).toBeVisible();
    console.log('✅ Parse AI button is visible');

    await parseButton.click();
    console.log('🖱️ Clicked Parse AI button');

    // Wait for potential API call and response
    await page.waitForTimeout(3000);

    // Check if any parse requests were made
    console.log('\n📊 Parse Requests Made:', parseRequests.length);
    if (parseRequests.length > 0) {
      console.log('   First Request:', JSON.stringify(parseRequests[0], null, 2));
    }

    // Get form values AFTER clicking Parse
    const formValuesAfter = await page.evaluate(() => {
      const planNameInput = document.querySelector('input[name="planName"]') as HTMLInputElement;
      const daysInput = document.querySelector('input[name="days"]') as HTMLInputElement;
      const mealsInput = document.querySelector('input[name="mealsPerDay"]') as HTMLInputElement;
      const caloriesInput = document.querySelector('input[name="dailyCalorieTarget"]') as HTMLInputElement;

      return {
        planName: planNameInput?.value || '',
        days: daysInput?.value || '',
        mealsPerDay: mealsInput?.value || '',
        dailyCalorieTarget: caloriesInput?.value || ''
      };
    });
    console.log('📋 Form values AFTER Parse:', formValuesAfter);

    // Check console logs for relevant messages
    const relevantLogs = consoleLogs.filter(log =>
      log.includes('parse') ||
      log.includes('Parse') ||
      log.includes('natural') ||
      log.includes('error') ||
      log.includes('Error')
    );
    console.log('\n📝 Relevant Console Logs:', relevantLogs);

    // Assertions
    expect(parseRequests.length, 'Parse API should be called').toBeGreaterThan(0);

    // Check if form was populated (at least one field should change)
    const formChanged =
      formValuesAfter.planName !== formValuesBefore.planName ||
      formValuesAfter.days !== formValuesBefore.days ||
      formValuesAfter.mealsPerDay !== formValuesBefore.mealsPerDay ||
      formValuesAfter.dailyCalorieTarget !== formValuesBefore.dailyCalorieTarget;

    if (!formChanged) {
      console.log('❌ FAILURE: Form was NOT populated after Parse AI clicked');
      console.log('   Expected: At least one field to change');
      console.log('   Actual: All fields remained the same');
    } else {
      console.log('✅ SUCCESS: Form was populated');
    }

    expect(formChanged, 'Form should be populated after Parse AI').toBe(true);
  });

  test('BUG #2: Queue Auto-Refresh - Should update without page reload', async ({ page }) => {
    console.log('\n=== TESTING QUEUE AUTO-REFRESH ===');

    // Go to BMAD Generator tab
    await page.click('text=BMAD Generator');
    await page.waitForTimeout(500);

    // Listen for console logs about invalidation
    const invalidationLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('invalidat') || text.includes('Invalidat') || text.includes('refetch')) {
        invalidationLogs.push(text);
        console.log('🔄 Invalidation Log:', text);
      }
    });

    // Get initial pending recipe count
    const initialCount = await page.locator('text=/Pending.*Recipe/').textContent();
    console.log('📊 Initial Pending Count:', initialCount);

    // Track recipe generation completion
    let generationComplete = false;
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Generation Complete') || text.includes('complete')) {
        generationComplete = true;
        console.log('✅ Generation Complete Event Detected');
      }
    });

    // Start generating 1 recipe
    await page.fill('input[name="recipeCount"]', '1');
    await page.click('button:has-text("Start BMAD Generation")');
    console.log('🚀 Started generating 1 recipe');

    // Wait for generation to complete (up to 60 seconds)
    let waited = 0;
    while (!generationComplete && waited < 60000) {
      await page.waitForTimeout(1000);
      waited += 1000;

      // Check for completion toast or message
      const toastVisible = await page.locator('text=Generation Complete').isVisible().catch(() => false);
      if (toastVisible) {
        generationComplete = true;
        console.log('✅ Generation Complete Toast Visible');
        break;
      }
    }

    if (!generationComplete) {
      console.log('⚠️ Generation may not have completed within timeout');
    }

    // Wait a bit more for invalidation to trigger
    await page.waitForTimeout(2000);

    // Check invalidation logs
    console.log('\n📝 Invalidation Logs Captured:', invalidationLogs.length);
    invalidationLogs.forEach(log => console.log('   -', log));

    // Get the pending count AFTER generation (WITHOUT page reload)
    const afterCount = await page.locator('text=/Pending.*Recipe/').textContent();
    console.log('📊 After Generation Count:', afterCount);

    // Parse counts to compare
    const initialNumber = parseInt(initialCount?.match(/\d+/)?.[0] || '0');
    const afterNumber = parseInt(afterCount?.match(/\d+/)?.[0] || '0');

    console.log(`\n📈 Count Comparison:`);
    console.log(`   Before: ${initialNumber}`);
    console.log(`   After: ${afterNumber}`);
    console.log(`   Difference: ${afterNumber - initialNumber}`);

    if (invalidationLogs.length === 0) {
      console.log('❌ FAILURE: No invalidation logs detected');
      console.log('   This means invalidateRecipeQueries() was NOT called');
    } else {
      console.log(`✅ Invalidation was triggered (${invalidationLogs.length} log entries)`);
    }

    if (afterNumber <= initialNumber) {
      console.log('❌ FAILURE: Pending count did NOT increase');
      console.log('   Expected: Count to increase after generation');
      console.log('   Actual: Count stayed the same or decreased');
    } else {
      console.log('✅ SUCCESS: Pending count increased without page reload');
    }

    // Assertions
    expect(invalidationLogs.length, 'Invalidation should be triggered').toBeGreaterThan(0);
    expect(afterNumber, 'Pending count should increase').toBeGreaterThan(initialNumber);
  });
});
