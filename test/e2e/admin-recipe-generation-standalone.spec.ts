/**
 * Standalone Admin Recipe Generation E2E Tests
 * 
 * Tests the recipe generation UI components directly by mocking authentication
 * and backend responses to focus on UI functionality testing.
 */

import { test, expect } from '@playwright/test';

test.describe('Admin Recipe Generation - UI Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Mock all authentication checks to pass
    await page.addInitScript(() => {
      // Mock localStorage to simulate logged-in admin
      localStorage.setItem('token', 'mock-admin-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'admin-1',
        email: 'admin@fitmeal.pro',
        role: 'admin',
        name: 'Test Admin'
      }));
    });

    // Mock authentication endpoints
    await page.route('**/api/auth/**', async route => {
      const url = route.request().url();
      if (url.includes('/me')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'admin-1',
            email: 'admin@fitmeal.pro',
            role: 'admin',
            name: 'Test Admin'
          })
        });
      } else {
        await route.continue();
      }
    });

    // Mock recipe generation endpoints
    await page.route('**/api/admin/generate**', async route => {
      const postData = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: `Generation started for ${postData?.count || 10} recipes`,
          count: postData?.count || 10,
          started: true,
          success: postData?.count || 10,
          failed: 0,
          errors: []
        })
      });
    });

    // Mock admin stats
    await page.route('**/api/admin/stats**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total: 150,
          approved: 145,
          pending: 5,
          users: 25
        })
      });
    });

    // Mock recipes endpoint
    await page.route('**/api/recipes**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          recipes: [],
          total: 0
        })
      });
    });
  });

  test('1. Navigate Directly to Admin Dashboard', async ({ page }) => {
    // Go directly to admin page (authentication mocked)
    await page.goto('/admin');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check for admin dashboard elements
    await expect(page.locator('h1')).toContainText(/Admin.*Dashboard/i);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-screenshots/admin-dashboard-direct.png',
      fullPage: true 
    });
  });

  test('2. Access Admin Tab and Recipe Generation', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // Click on Admin tab
    const adminTab = page.locator('[role="tab"]:has-text("Admin"), button:has-text("Admin")');
    await adminTab.click();
    
    // Wait for content to load
    await page.waitForTimeout(2000);
    
    // Look for Generate button
    const generateButton = page.locator('button:has-text("Generate")');
    await expect(generateButton).toBeVisible();
    
    // Click generate button
    await generateButton.click();
    
    // Wait for modal or new interface
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-screenshots/recipe-generation-interface.png',
      fullPage: true 
    });
  });

  test('3. Test Recipe Generation Form Elements', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // Navigate to generation interface
    const adminTab = page.locator('[role="tab"]:has-text("Admin"), button:has-text("Admin")');
    await adminTab.click();
    await page.waitForTimeout(2000);
    
    const generateButton = page.locator('button:has-text("Generate")');
    await generateButton.click();
    await page.waitForTimeout(3000);
    
    // Test form elements (adjust selectors based on actual implementation)
    const formElements = {
      countInput: 'input[type="number"], select:has(option)',
      mealTypeSelect: 'select:near-text("Meal"), select:near-text("Type")',
      dietarySelect: 'select:near-text("Diet"), select:near-text("Dietary")',
      ingredientInput: 'input[placeholder*="ingredient"], input:near-text("Ingredient")',
      submitButton: 'button[type="submit"], button:has-text("Generate")'
    };

    // Test each form element if it exists
    for (const [name, selector] of Object.entries(formElements)) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 })) {
        console.log(`✓ Found ${name}`);
        
        // Take action based on element type
        if (name === 'countInput') {
          await element.fill('15');
        } else if (name.includes('Select') && await element.isVisible()) {
          await element.click();
          // Try to select an option
          await page.keyboard.press('ArrowDown');
          await page.keyboard.press('Enter');
        } else if (name === 'ingredientInput') {
          await element.fill('chicken');
        }
      }
    }
    
    // Take screenshot of filled form
    await page.screenshot({ 
      path: 'test-screenshots/form-elements-filled.png',
      fullPage: true 
    });
  });

  test('4. Test Bulk Generation Buttons', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // Navigate to generation interface
    const adminTab = page.locator('[role="tab"]:has-text("Admin"), button:has-text("Admin")');
    await adminTab.click();
    await page.waitForTimeout(2000);
    
    const generateButton = page.locator('button:has-text("Generate")');
    await generateButton.click();
    await page.waitForTimeout(3000);
    
    // Test bulk generation buttons for different counts
    const bulkCounts = ['10', '20', '30', '50'];
    
    for (const count of bulkCounts) {
      const bulkButton = page.locator(`button:has-text("${count}")`);
      if (await bulkButton.isVisible({ timeout: 2000 })) {
        console.log(`✓ Found bulk button for ${count} recipes`);
        
        await bulkButton.click();
        await page.waitForTimeout(1000);
        
        // Look for confirmation or additional generate button
        const confirmButton = page.locator('button:has-text("Generate"), button:has-text("Start")');
        if (await confirmButton.isVisible({ timeout: 2000 })) {
          await confirmButton.click();
          await page.waitForTimeout(2000);
        }
        
        // Take screenshot
        await page.screenshot({ 
          path: `test-screenshots/bulk-generation-${count}.png`,
          fullPage: true 
        });
        
        // Check for toast or success message
        const toastMessage = page.locator('[role="alert"], .toast, .notification');
        if (await toastMessage.isVisible({ timeout: 3000 })) {
          console.log(`✓ Toast message appeared for ${count} recipe generation`);
        }
        
        break; // Test only the first available bulk button
      }
    }
  });

  test('5. Test Natural Language Input Interface', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // Navigate to generation interface
    const adminTab = page.locator('[role="tab"]:has-text("Admin"), button:has-text("Admin")');
    await adminTab.click();
    await page.waitForTimeout(2000);
    
    const generateButton = page.locator('button:has-text("Generate")');
    await generateButton.click();
    await page.waitForTimeout(3000);
    
    // Look for natural language input
    const nlTextarea = page.locator('textarea');
    if (await nlTextarea.isVisible({ timeout: 3000 })) {
      const testInput = 'Generate 15 high-protein breakfast recipes under 20 minutes prep time, focusing on eggs and Greek yogurt, suitable for keto diet';
      
      await nlTextarea.fill(testInput);
      
      // Look for parse or generate button
      const parseButton = page.locator('button:has-text("Parse"), button:has-text("AI")');
      if (await parseButton.isVisible()) {
        await parseButton.click();
        await page.waitForTimeout(3000);
      }
      
      // Look for direct generation button
      const directGenButton = page.locator('button:has-text("Direct"), button:has-text("Generate")');
      if (await directGenButton.isVisible()) {
        await directGenButton.click();
        await page.waitForTimeout(3000);
      }
      
      // Take screenshot
      await page.screenshot({ 
        path: 'test-screenshots/natural-language-input.png',
        fullPage: true 
      });
    }
  });

  test('6. Test Progress Indicators and Status Messages', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // Navigate to generation interface and start generation
    const adminTab = page.locator('[role="tab"]:has-text("Admin"), button:has-text("Admin")');
    await adminTab.click();
    await page.waitForTimeout(2000);
    
    const generateButton = page.locator('button:has-text("Generate")');
    await generateButton.click();
    await page.waitForTimeout(3000);
    
    // Try to start a generation to see progress indicators
    const startButton = page.locator('button:has-text("Generate"), button[type="submit"]').last();
    if (await startButton.isVisible()) {
      await startButton.click();
      
      // Look for progress indicators
      const progressElements = [
        '.progress-bar',
        '[role="progressbar"]',
        '.spinner',
        '.animate-spin',
        'text="Initializing"',
        'text="Generating"',
        'text="Processing"'
      ];
      
      for (const selector of progressElements) {
        const element = page.locator(selector);
        if (await element.isVisible({ timeout: 3000 })) {
          console.log(`✓ Found progress indicator: ${selector}`);
          
          // Take screenshot
          await page.screenshot({ 
            path: `test-screenshots/progress-${selector.replace(/[^a-zA-Z0-9]/g, '-')}.png`,
            fullPage: true 
          });
          break;
        }
      }
    }
  });

  test('7. Test Responsive Design on Different Viewports', async ({ page }) => {
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1440, height: 900, name: 'desktop' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');
      
      // Navigate to recipe generation
      const adminTab = page.locator('[role="tab"]:has-text("Admin"), button:has-text("Admin")');
      if (await adminTab.isVisible()) {
        await adminTab.click();
        await page.waitForTimeout(2000);
        
        const generateButton = page.locator('button:has-text("Generate")');
        if (await generateButton.isVisible()) {
          await generateButton.click();
          await page.waitForTimeout(3000);
        }
      }
      
      // Take screenshot
      await page.screenshot({ 
        path: `test-screenshots/responsive-${viewport.name}-${viewport.width}x${viewport.height}.png`,
        fullPage: true 
      });
    }
  });

  test('8. Test Error Handling and Validation', async ({ page }) => {
    // Mock error responses
    await page.route('**/api/admin/generate**', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Invalid recipe count. Must be between 1 and 50.',
          error: 'VALIDATION_ERROR'
        })
      });
    });

    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // Navigate to generation interface
    const adminTab = page.locator('[role="tab"]:has-text("Admin"), button:has-text("Admin")');
    await adminTab.click();
    await page.waitForTimeout(2000);
    
    const generateButton = page.locator('button:has-text("Generate")');
    await generateButton.click();
    await page.waitForTimeout(3000);
    
    // Try to trigger validation by submitting form
    const submitButton = page.locator('button[type="submit"], button:has-text("Generate")').last();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      
      // Look for error messages
      const errorElements = [
        '[role="alert"]',
        '.error-message',
        '.toast',
        '.notification',
        'text="Invalid"',
        'text="Error"'
      ];
      
      for (const selector of errorElements) {
        const element = page.locator(selector);
        if (await element.isVisible({ timeout: 5000 })) {
          console.log(`✓ Found error message: ${selector}`);
          
          // Take screenshot
          await page.screenshot({ 
            path: 'test-screenshots/error-handling.png',
            fullPage: true 
          });
          break;
        }
      }
    }
  });

  test('9. Test Complete User Journey', async ({ page }) => {
    // Complete end-to-end journey
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // Step 1: Access admin interface
    await page.screenshot({ path: 'test-screenshots/journey-1-admin-dashboard.png' });
    
    // Step 2: Navigate to Admin tab
    const adminTab = page.locator('[role="tab"]:has-text("Admin"), button:has-text("Admin")');
    await adminTab.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-screenshots/journey-2-admin-tab.png' });
    
    // Step 3: Open recipe generation
    const generateButton = page.locator('button:has-text("Generate")');
    await generateButton.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-screenshots/journey-3-generation-modal.png' });
    
    // Step 4: Fill form (if elements exist)
    const countInput = page.locator('input[type="number"]').first();
    if (await countInput.isVisible()) {
      await countInput.fill('12');
    }
    
    const textarea = page.locator('textarea').first();
    if (await textarea.isVisible()) {
      await textarea.fill('Generate healthy breakfast recipes for weight loss');
    }
    
    await page.screenshot({ path: 'test-screenshots/journey-4-form-filled.png' });
    
    // Step 5: Submit generation
    const submitButton = page.locator('button[type="submit"], button:has-text("Generate")').last();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(3000);
    }
    
    await page.screenshot({ path: 'test-screenshots/journey-5-generation-complete.png' });
    
    console.log('✅ Complete user journey test completed');
  });
});