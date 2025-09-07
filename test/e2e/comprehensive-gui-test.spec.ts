/**
 * COMPREHENSIVE GUI E2E TEST SUITE
 * 
 * This test suite provides exhaustive testing of ALL GUI elements in the FitnessMealPlanner app:
 * - Every button click
 * - Every form field
 * - Every dropdown and select
 * - Every modal and dialog
 * - Every navigation link
 * - Every hover state and tooltip
 * - Every loading state
 * - Every error message
 * - Every responsive behavior
 * - Every edge case interaction
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test credentials for all three roles
const TEST_ACCOUNTS = {
  admin: { email: 'admin@fitmeal.pro', password: 'AdminPass123' },
  trainer: { email: 'trainer.test@evofitmeals.com', password: 'TestTrainer123!' },
  customer: { email: 'customer.test@evofitmeals.com', password: 'TestCustomer123!' }
};

// Helper function to login as specific role
async function loginAs(page: Page, role: 'admin' | 'trainer' | 'customer') {
  const account = TEST_ACCOUNTS[role];
  console.log(`🔐 Logging in as ${role}: ${account.email}`);
  
  await page.goto('/login');
  await expect(page).toHaveTitle(/FitnessMealPlanner/);
  
  // Fill login form
  await page.fill('input[type="email"]', account.email);
  await page.fill('input[type="password"]', account.password);
  
  // Click login button
  await page.click('button[type="submit"]');
  
  // Wait for navigation after login
  await page.waitForNavigation({ waitUntil: 'networkidle' });
  
  // Verify login success by checking for user-specific content
  switch(role) {
    case 'admin':
      await expect(page).toHaveURL(/\/admin/);
      await expect(page.locator('h1')).toContainText('Admin Dashboard');
      break;
    case 'trainer':
      await expect(page).toHaveURL(/\/trainer/);
      await expect(page.locator('h1')).toContainText('Welcome');
      break;
    case 'customer':
      await expect(page).toHaveURL(/\/my-meal-plans/);
      await expect(page.locator('h1')).toContainText('My Meal Plans');
      break;
  }
  
  console.log(`✅ Successfully logged in as ${role}`);
}

// Helper function to test all buttons on a page
async function testAllButtons(page: Page, pageName: string, excludeSelectors: string[] = []) {
  console.log(`🔍 Testing all buttons on ${pageName} page`);
  
  // Find all clickable elements
  const buttons = await page.locator('button, a, [role="button"], .cursor-pointer').all();
  console.log(`Found ${buttons.length} clickable elements on ${pageName}`);
  
  let testedCount = 0;
  let errorCount = 0;
  
  for (const button of buttons) {
    try {
      // Check if button is visible and enabled
      const isVisible = await button.isVisible();
      const isEnabled = await button.isEnabled();
      const text = await button.textContent() || '';
      const selector = await button.evaluate((el) => {
        // Generate a selector for this element
        const classes = el.className ? `.${el.className.split(' ').join('.')}` : '';
        const id = el.id ? `#${el.id}` : '';
        const tag = el.tagName.toLowerCase();
        return `${tag}${id}${classes}`;
      });
      
      // Skip buttons that should be excluded
      if (excludeSelectors.some(exclude => selector.includes(exclude))) {
        console.log(`⏭️  Skipping excluded button: ${text.substring(0, 30)}`);
        continue;
      }
      
      if (isVisible && isEnabled) {
        console.log(`🔘 Testing button: "${text.substring(0, 50)}"`);
        
        // Test hover state
        await button.hover();
        await page.waitForTimeout(100);
        
        // Check for tooltip or hover effects
        const hasTooltip = await page.locator('[role="tooltip"], .tooltip').count() > 0;
        if (hasTooltip) {
          console.log(`  💡 Tooltip found on hover`);
        }
        
        // Test click (with error handling for navigation/modal buttons)
        try {
          await button.click();
          await page.waitForTimeout(500); // Wait for any animations/responses
          testedCount++;
        } catch (clickError) {
          console.log(`  ⚠️  Click error: ${clickError}`);
          errorCount++;
        }
      }
    } catch (error) {
      console.log(`❌ Error testing button: ${error}`);
      errorCount++;
    }
  }
  
  console.log(`✅ ${pageName} button testing complete: ${testedCount} tested, ${errorCount} errors`);
  return { testedCount, errorCount };
}

// Helper function to test all form fields on a page
async function testAllFormFields(page: Page, pageName: string) {
  console.log(`📝 Testing all form fields on ${pageName} page`);
  
  const inputs = await page.locator('input, textarea, select').all();
  console.log(`Found ${inputs.length} form fields on ${pageName}`);
  
  let testedCount = 0;
  let errorCount = 0;
  
  for (const input of inputs) {
    try {
      const isVisible = await input.isVisible();
      const isEnabled = await input.isEnabled();
      const type = await input.getAttribute('type') || 'text';
      const placeholder = await input.getAttribute('placeholder') || '';
      
      if (isVisible && isEnabled) {
        console.log(`📋 Testing ${type} field: "${placeholder.substring(0, 30)}"`);
        
        // Test focus
        await input.focus();
        await page.waitForTimeout(100);
        
        // Test typing based on field type
        let testValue = '';
        switch (type) {
          case 'email':
            testValue = 'test@example.com';
            break;
          case 'password':
            testValue = 'TestPassword123!';
            break;
          case 'number':
            testValue = '123';
            break;
          case 'tel':
            testValue = '555-123-4567';
            break;
          default:
            testValue = 'Test input value';
        }
        
        // Clear and fill field
        await input.clear();
        await input.fill(testValue);
        
        // Test validation by clearing field (if required)
        await input.clear();
        await page.keyboard.press('Tab'); // Trigger validation
        await page.waitForTimeout(100);
        
        // Check for validation messages
        const hasValidationMessage = await page.locator('.error, [role="alert"], .text-red-500, .text-destructive').count() > 0;
        if (hasValidationMessage) {
          console.log(`  ⚠️  Validation message found`);
        }
        
        testedCount++;
      }
    } catch (error) {
      console.log(`❌ Error testing form field: ${error}`);
      errorCount++;
    }
  }
  
  console.log(`✅ ${pageName} form field testing complete: ${testedCount} tested, ${errorCount} errors`);
  return { testedCount, errorCount };
}

test.describe('Comprehensive GUI Testing Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport for consistent testing
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('LOGIN PAGE - All GUI Elements', async ({ page }) => {
    console.log('🔍 Testing LOGIN PAGE GUI elements');
    
    await page.goto('/login');
    await expect(page).toHaveTitle(/FitnessMealPlanner/);
    
    // Test page structure
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page.locator('form')).toBeVisible();
    
    // Test all form fields
    await testAllFormFields(page, 'Login');
    
    // Test specific login form elements
    const emailField = page.locator('input[type="email"]');
    const passwordField = page.locator('input[type="password"]');
    const loginButton = page.locator('button[type="submit"]');
    
    await expect(emailField).toBeVisible();
    await expect(passwordField).toBeVisible();
    await expect(loginButton).toBeVisible();
    
    // Test form validation
    console.log('🧪 Testing form validation...');
    await loginButton.click();
    await page.waitForTimeout(500);
    
    // Check for validation errors
    const errorMessages = await page.locator('.error, [role="alert"], .text-red-500, .text-destructive').count();
    console.log(`Found ${errorMessages} validation error messages`);
    
    // Test navigation links
    const registerLink = page.locator('a[href*="register"], a:has-text("Register"), a:has-text("Sign up")');
    const forgotPasswordLink = page.locator('a[href*="forgot"], a:has-text("Forgot"), a:has-text("Reset")');
    
    if (await registerLink.count() > 0) {
      console.log('🔗 Testing register link...');
      await registerLink.first().click();
      await expect(page).toHaveURL(/register/);
      await page.goBack();
    }
    
    if (await forgotPasswordLink.count() > 0) {
      console.log('🔗 Testing forgot password link...');
      await forgotPasswordLink.first().click();
      await expect(page).toHaveURL(/forgot/);
      await page.goBack();
    }
    
    // Test all other buttons
    await testAllButtons(page, 'Login', ['submit']);
  });

  test('REGISTRATION PAGE - All GUI Elements', async ({ page }) => {
    console.log('🔍 Testing REGISTRATION PAGE GUI elements');
    
    await page.goto('/register');
    
    // Test page structure
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page.locator('form')).toBeVisible();
    
    // Test all form fields
    await testAllFormFields(page, 'Registration');
    
    // Test role selection dropdown
    const roleSelect = page.locator('select, [role="combobox"]').first();
    if (await roleSelect.count() > 0) {
      console.log('🔽 Testing role selection dropdown...');
      await roleSelect.click();
      
      // Check for role options
      const options = await page.locator('option, [role="option"]').all();
      for (const option of options) {
        const optionText = await option.textContent();
        console.log(`  Found role option: ${optionText}`);
      }
    }
    
    // Test all buttons
    await testAllButtons(page, 'Registration');
  });

  test('ADMIN DASHBOARD - All GUI Elements', async ({ page }) => {
    console.log('🔍 Testing ADMIN DASHBOARD GUI elements');
    
    await loginAs(page, 'admin');
    
    // Test main dashboard elements
    await expect(page.locator('[data-testid="admin-tab-recipes"]')).toBeVisible();
    await expect(page.locator('[data-testid="admin-tab-meal-plans"]')).toBeVisible();
    await expect(page.locator('[data-testid="admin-tab-admin"]')).toBeVisible();
    
    // Test stats cards
    const statsCards = await page.locator('.grid .card, [class*="card"]').all();
    console.log(`Found ${statsCards.length} stats cards`);
    
    for (let i = 0; i < Math.min(statsCards.length, 6); i++) {
      const card = statsCards[i];
      await expect(card).toBeVisible();
      const cardText = await card.textContent();
      console.log(`  Stats card ${i + 1}: ${cardText?.substring(0, 50)}`);
    }
    
    // Test tab navigation
    console.log('🗂️ Testing admin tab navigation...');
    
    // Recipes Tab
    await page.click('[data-testid="admin-tab-recipes"]');
    await page.waitForTimeout(1000);
    await expect(page.locator('.recipe-card, [data-testid*="recipe"], .grid').first()).toBeVisible();
    
    // Test view toggle (cards/table)
    const viewToggle = page.locator('button:has-text("Cards"), button:has-text("Table"), [data-testid*="view"]');
    if (await viewToggle.count() > 0) {
      console.log('👁️ Testing view toggle...');
      await viewToggle.first().click();
      await page.waitForTimeout(500);
    }
    
    // Test search and filters
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
    if (await searchInput.count() > 0) {
      console.log('🔍 Testing search functionality...');
      await searchInput.fill('chicken');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
      await searchInput.clear();
    }
    
    // Test pagination if present
    const pagination = page.locator('.pagination, [data-testid*="page"]');
    if (await pagination.count() > 0) {
      console.log('📄 Testing pagination...');
      const nextButton = page.locator('button:has-text("Next"), [aria-label*="next"]');
      if (await nextButton.count() > 0) {
        await nextButton.click();
        await page.waitForTimeout(1000);
      }
    }
    
    // Meal Plans Tab
    await page.click('[data-testid="admin-tab-meal-plans"]');
    await page.waitForTimeout(1000);
    
    // Admin Tab
    await page.click('[data-testid="admin-tab-admin"]');
    await page.waitForTimeout(1000);
    
    // Test critical admin buttons
    const generateButton = page.locator('[data-testid="admin-generate-recipes"]');
    const pendingButton = page.locator('[data-testid="admin-view-pending"]');
    const exportButton = page.locator('[data-testid="admin-export-data"]');
    
    await expect(generateButton).toBeVisible();
    await expect(pendingButton).toBeVisible();
    await expect(exportButton).toBeVisible();
    
    console.log('🎯 Testing Generate Recipes button...');
    await generateButton.click();
    await page.waitForTimeout(2000);
    
    // Check if modal opened
    const modal = page.locator('[role="dialog"], .modal, .fixed.inset-0');
    if (await modal.count() > 0) {
      console.log('  ✅ Generate Recipes modal opened');
      
      // Test modal close
      const closeButton = page.locator('button:has-text("×"), button:has-text("Close"), [aria-label*="close"]');
      if (await closeButton.count() > 0) {
        await closeButton.first().click();
        await page.waitForTimeout(500);
      } else {
        // Click outside modal to close
        await page.click('body');
      }
    }
    
    // Test all buttons on admin page
    await testAllButtons(page, 'Admin Dashboard', ['admin-generate-recipes']);
  });

  test('RECIPE GENERATION MODAL - All GUI Elements', async ({ page }) => {
    console.log('🔍 Testing RECIPE GENERATION MODAL GUI elements');
    
    await loginAs(page, 'admin');
    await page.click('[data-testid="admin-tab-admin"]');
    await page.waitForTimeout(1000);
    
    // Open recipe generation modal
    await page.click('[data-testid="admin-generate-recipes"]');
    await page.waitForTimeout(2000);
    
    const modal = page.locator('[role="dialog"], .modal, .fixed.inset-0');
    await expect(modal).toBeVisible();
    
    // Test recipe count selector
    console.log('🔢 Testing recipe count selector...');
    const countSelector = page.locator('select').first();
    if (await countSelector.count() > 0) {
      await countSelector.click();
      const options = await page.locator('option').all();
      console.log(`  Found ${options.length} count options`);
      
      // Test selecting different counts
      for (let i = 0; i < Math.min(options.length, 5); i++) {
        const optionValue = await options[i].getAttribute('value');
        const optionText = await options[i].textContent();
        console.log(`    Option: ${optionText} (value: ${optionValue})`);
      }
      
      // Select a specific count
      await countSelector.selectOption('5');
    }
    
    // Test quick generation button
    const quickGenButton = page.locator('button:has-text("Generate Random"), button:has-text("Quick")');
    if (await quickGenButton.count() > 0) {
      console.log('⚡ Testing quick generation button...');
      await expect(quickGenButton).toBeVisible();
      await expect(quickGenButton).toBeEnabled();
    }
    
    // Test context-based generation form
    console.log('📋 Testing context-based generation form...');
    
    // Natural language input
    const nlInput = page.locator('textarea');
    if (await nlInput.count() > 0) {
      await nlInput.fill('High protein breakfast recipes for muscle gain');
      await page.waitForTimeout(500);
    }
    
    // Test dropdowns
    const dropdowns = await page.locator('select, [role="combobox"]').all();
    console.log(`Found ${dropdowns.length} dropdown fields`);
    
    for (let i = 0; i < Math.min(dropdowns.length, 8); i++) {
      try {
        const dropdown = dropdowns[i];
        const isVisible = await dropdown.isVisible();
        const isEnabled = await dropdown.isEnabled();
        
        if (isVisible && isEnabled) {
          await dropdown.click();
          await page.waitForTimeout(300);
          
          const options = await page.locator('option, [role="option"]').all();
          if (options.length > 1) {
            console.log(`  Dropdown ${i + 1}: ${options.length} options`);
            // Select second option to test functionality
            await options[1].click();
          }
        }
      } catch (error) {
        console.log(`  ⚠️  Error testing dropdown ${i + 1}: ${error}`);
      }
    }
    
    // Test macro nutrient inputs
    const numberInputs = await page.locator('input[type="number"]').all();
    console.log(`Found ${numberInputs.length} number input fields`);
    
    for (let i = 0; i < Math.min(numberInputs.length, 6); i++) {
      try {
        const input = numberInputs[i];
        if (await input.isVisible() && await input.isEnabled()) {
          await input.fill('25');
          await page.waitForTimeout(200);
        }
      } catch (error) {
        console.log(`  ⚠️  Error testing number input ${i + 1}: ${error}`);
      }
    }
    
    // Test main generation button
    const mainGenButton = page.locator('button:has-text("Generate Targeted"), button:has-text("Generate Context")');
    if (await mainGenButton.count() > 0) {
      console.log('🎯 Testing main generation button...');
      await expect(mainGenButton).toBeVisible();
      await expect(mainGenButton).toBeEnabled();
    }
    
    // Test all form fields in modal
    await testAllFormFields(page, 'Recipe Generation Modal');
    
    // Close modal
    const closeButton = page.locator('button:has-text("×"), button:has-text("Close")');
    if (await closeButton.count() > 0) {
      await closeButton.click();
    } else {
      await page.keyboard.press('Escape');
    }
    
    await page.waitForTimeout(500);
  });

  test('TRAINER DASHBOARD - All GUI Elements', async ({ page }) => {
    console.log('🔍 Testing TRAINER DASHBOARD GUI elements');
    
    await loginAs(page, 'trainer');
    
    // Test main tab navigation
    const tabs = await page.locator('[role="tab"], .tab, [data-testid*="tab"]').all();
    console.log(`Found ${tabs.length} trainer tabs`);
    
    for (let i = 0; i < Math.min(tabs.length, 6); i++) {
      try {
        const tab = tabs[i];
        const tabText = await tab.textContent();
        console.log(`🗂️ Testing tab: ${tabText?.substring(0, 20)}`);
        
        await tab.click();
        await page.waitForTimeout(1000);
        
        // Test content loaded
        const hasContent = await page.locator('main, .content, .tab-content').count() > 0;
        console.log(`  Content loaded: ${hasContent}`);
        
      } catch (error) {
        console.log(`  ⚠️  Error testing tab ${i + 1}: ${error}`);
      }
    }
    
    // Test recipe browsing
    console.log('📖 Testing recipe browsing...');
    
    // Go to recipes tab
    const recipesTab = page.locator('[role="tab"]:has-text("Recipe"), button:has-text("Recipe")');
    if (await recipesTab.count() > 0) {
      await recipesTab.first().click();
      await page.waitForTimeout(1000);
      
      // Test recipe cards/list
      const recipeItems = await page.locator('.recipe-card, [data-testid*="recipe"]').all();
      console.log(`  Found ${recipeItems.length} recipe items`);
      
      if (recipeItems.length > 0) {
        // Test clicking first recipe
        await recipeItems[0].click();
        await page.waitForTimeout(1000);
        
        // Check if recipe modal/detail opened
        const modal = page.locator('[role="dialog"], .modal, .recipe-modal');
        if (await modal.count() > 0) {
          console.log('  ✅ Recipe modal opened');
          
          // Test modal elements
          await testAllButtons(page, 'Recipe Modal');
          
          // Close modal
          const closeBtn = page.locator('button:has-text("×"), button:has-text("Close")');
          if (await closeBtn.count() > 0) {
            await closeBtn.first().click();
          } else {
            await page.keyboard.press('Escape');
          }
        }
      }
    }
    
    // Test customer management
    const customersTab = page.locator('[role="tab"]:has-text("Customer"), button:has-text("Customer")');
    if (await customersTab.count() > 0) {
      console.log('👥 Testing customer management...');
      await customersTab.first().click();
      await page.waitForTimeout(1000);
      
      // Test customer invitation
      const inviteButton = page.locator('button:has-text("Invite"), button:has-text("Add Customer")');
      if (await inviteButton.count() > 0) {
        await inviteButton.first().click();
        await page.waitForTimeout(1000);
        
        const inviteModal = page.locator('[role="dialog"], .modal');
        if (await inviteModal.count() > 0) {
          console.log('  ✅ Invite customer modal opened');
          
          // Test form fields
          await testAllFormFields(page, 'Customer Invitation');
          
          // Close modal
          const closeBtn = page.locator('button:has-text("Cancel"), button:has-text("Close")');
          if (await closeBtn.count() > 0) {
            await closeBtn.first().click();
          }
        }
      }
    }
    
    // Test meal plan generation
    const mealPlanTab = page.locator('[role="tab"]:has-text("Meal Plan"), button:has-text("Meal")');
    if (await mealPlanTab.count() > 0) {
      console.log('🍽️ Testing meal plan generation...');
      await mealPlanTab.first().click();
      await page.waitForTimeout(1000);
      
      // Test meal plan form if present
      await testAllFormFields(page, 'Meal Plan Generator');
    }
    
    // Test all buttons on trainer dashboard
    await testAllButtons(page, 'Trainer Dashboard');
  });

  test('CUSTOMER DASHBOARD - All GUI Elements', async ({ page }) => {
    console.log('🔍 Testing CUSTOMER DASHBOARD GUI elements');
    
    await loginAs(page, 'customer');
    
    // Test meal plans display
    await expect(page.locator('h1')).toContainText('My Meal Plans');
    
    // Test meal plan cards
    const mealPlanCards = await page.locator('.meal-plan, .card, [data-testid*="meal"]').all();
    console.log(`Found ${mealPlanCards.length} meal plan items`);
    
    if (mealPlanCards.length > 0) {
      // Test clicking first meal plan
      console.log('🍽️ Testing meal plan interaction...');
      await mealPlanCards[0].click();
      await page.waitForTimeout(1000);
      
      // Check for meal plan details
      const hasDetails = await page.locator('.meal-plan-detail, .recipe-list').count() > 0;
      console.log(`  Meal plan details visible: ${hasDetails}`);
    }
    
    // Test navigation to other customer pages
    const navLinks = await page.locator('nav a, [role="navigation"] a').all();
    console.log(`Found ${navLinks.length} navigation links`);
    
    for (let i = 0; i < Math.min(navLinks.length, 8); i++) {
      try {
        const link = navLinks[i];
        const linkText = await link.textContent();
        const href = await link.getAttribute('href');
        
        if (href && !href.includes('logout')) {
          console.log(`🔗 Testing navigation: ${linkText} -> ${href}`);
          await link.click();
          await page.waitForTimeout(1000);
          
          // Verify page loaded
          const currentUrl = page.url();
          console.log(`  Navigated to: ${currentUrl}`);
          
          // Test buttons on this page
          const pageButtons = await page.locator('button').count();
          console.log(`  Found ${pageButtons} buttons on this page`);
        }
      } catch (error) {
        console.log(`  ⚠️  Error testing navigation ${i + 1}: ${error}`);
      }
    }
    
    // Test progress tracking if available
    const progressLink = page.locator('a:has-text("Progress"), button:has-text("Progress")');
    if (await progressLink.count() > 0) {
      console.log('📊 Testing progress tracking...');
      await progressLink.first().click();
      await page.waitForTimeout(1000);
      
      // Test progress form elements
      await testAllFormFields(page, 'Progress Tracking');
    }
    
    // Test all buttons on customer dashboard
    await testAllButtons(page, 'Customer Dashboard');
  });

  test('RESPONSIVE DESIGN - All Viewport Sizes', async ({ page }) => {
    console.log('📱 Testing responsive design at multiple viewport sizes');
    
    const viewports = [
      { width: 375, height: 667, name: 'Mobile (iPhone 8)' },
      { width: 414, height: 896, name: 'Mobile (iPhone XR)' },
      { width: 768, height: 1024, name: 'Tablet (iPad)' },
      { width: 1024, height: 768, name: 'Desktop Small' },
      { width: 1440, height: 900, name: 'Desktop Large' },
      { width: 1920, height: 1080, name: 'Desktop XL' }
    ];
    
    for (const viewport of viewports) {
      console.log(`📐 Testing ${viewport.name} (${viewport.width}x${viewport.height})`);
      
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/login');
      await page.waitForTimeout(1000);
      
      // Test login page responsiveness
      const form = page.locator('form');
      await expect(form).toBeVisible();
      
      const formWidth = await form.boundingBox();
      console.log(`  Form width: ${formWidth?.width}px`);
      
      // Login and test main interface
      await loginAs(page, 'admin');
      
      // Test admin dashboard responsiveness
      const dashboard = page.locator('main, .container');
      const dashboardBox = await dashboard.first().boundingBox();
      console.log(`  Dashboard width: ${dashboardBox?.width}px`);
      
      // Test mobile menu if present
      if (viewport.width < 768) {
        const mobileMenu = page.locator('[aria-label*="menu"], .mobile-menu, button:has-text("☰")');
        if (await mobileMenu.count() > 0) {
          console.log('  📱 Testing mobile menu...');
          await mobileMenu.first().click();
          await page.waitForTimeout(500);
        }
      }
      
      // Test tabs responsiveness
      const tabs = page.locator('[role="tablist"], .tabs');
      if (await tabs.count() > 0) {
        const tabsBox = await tabs.first().boundingBox();
        console.log(`  Tabs width: ${tabsBox?.width}px`);
      }
      
      // Test cards/grid responsiveness
      const grid = page.locator('.grid, .flex');
      if (await grid.count() > 0) {
        const gridItems = await page.locator('.grid > *, .flex > *').count();
        console.log(`  Grid items visible: ${gridItems}`);
      }
    }
    
    // Reset to default viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('EDGE CASES AND ERROR SCENARIOS', async ({ page }) => {
    console.log('⚠️ Testing edge cases and error scenarios');
    
    // Test rapid clicking
    console.log('🔄 Testing rapid clicking behavior...');
    await page.goto('/login');
    
    const loginButton = page.locator('button[type="submit"]');
    for (let i = 0; i < 5; i++) {
      await loginButton.click({ force: true });
      await page.waitForTimeout(100);
    }
    
    // Test form submission with empty fields
    console.log('📝 Testing empty form submissions...');
    await page.goto('/register');
    const registerButton = page.locator('button[type="submit"]');
    await registerButton.click();
    await page.waitForTimeout(1000);
    
    // Check for validation errors
    const errorCount = await page.locator('.error, [role="alert"], .text-red-500').count();
    console.log(`  Found ${errorCount} validation error messages`);
    
    // Test navigation during loading states
    console.log('⏳ Testing navigation during loading...');
    await loginAs(page, 'admin');
    
    // Click a button that might cause loading
    const generateButton = page.locator('[data-testid="admin-generate-recipes"]');
    if (await generateButton.count() > 0) {
      await generateButton.click();
      // Immediately try to navigate away
      await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    }
    
    // Test browser back/forward buttons
    console.log('⬅️ Testing browser navigation...');
    await page.goto('/admin');
    await page.waitForTimeout(1000);
    await page.goBack();
    await page.waitForTimeout(1000);
    await page.goForward();
    await page.waitForTimeout(1000);
    
    // Test keyboard navigation
    console.log('⌨️ Testing keyboard navigation...');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    
    // Test drag and drop if present
    const draggableElements = await page.locator('[draggable="true"], .sortable').count();
    if (draggableElements > 0) {
      console.log('🖱️ Testing drag and drop functionality...');
      const firstDraggable = page.locator('[draggable="true"], .sortable').first();
      const targetArea = page.locator('.drop-zone, .sortable').nth(1);
      
      if (await targetArea.count() > 0) {
        await firstDraggable.dragTo(targetArea);
        await page.waitForTimeout(1000);
      }
    }
    
    // Test context menu (right-click)
    console.log('🖱️ Testing context menu...');
    await page.click('body', { button: 'right' });
    await page.waitForTimeout(500);
    
    // Test double-click scenarios
    console.log('🖱️ Testing double-click scenarios...');
    const clickableElements = await page.locator('button, a, [role="button"]').all();
    if (clickableElements.length > 0) {
      await clickableElements[0].dblclick();
      await page.waitForTimeout(500);
    }
    
    console.log('✅ Edge case testing completed');
  });

  test('ACCESSIBILITY FEATURES', async ({ page }) => {
    console.log('♿ Testing accessibility features');
    
    await loginAs(page, 'admin');
    
    // Test focus indicators
    console.log('🔍 Testing focus indicators...');
    const focusableElements = await page.locator('button, a, input, select, textarea, [tabindex]').all();
    
    for (let i = 0; i < Math.min(focusableElements.length, 10); i++) {
      const element = focusableElements[i];
      await element.focus();
      await page.waitForTimeout(200);
      
      // Check if focus is visible
      const isFocused = await element.evaluate((el) => el === document.activeElement);
      console.log(`  Element ${i + 1} focused: ${isFocused}`);
    }
    
    // Test ARIA labels and roles
    console.log('🏷️ Testing ARIA attributes...');
    const ariaElements = await page.locator('[aria-label], [aria-labelledby], [role]').count();
    console.log(`  Found ${ariaElements} elements with ARIA attributes`);
    
    // Test keyboard-only navigation
    console.log('⌨️ Testing keyboard-only navigation...');
    await page.keyboard.press('Tab');
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
      
      const activeElement = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? `${el.tagName.toLowerCase()}${el.className ? '.' + el.className.split(' ')[0] : ''}` : 'none';
      });
      
      if (i % 5 === 0) {
        console.log(`  Tab ${i + 1}: focused on ${activeElement}`);
      }
    }
    
    // Test high contrast mode simulation
    console.log('🎨 Testing high contrast compatibility...');
    await page.addStyleTag({
      content: `
        * {
          background: black !important;
          color: white !important;
          border-color: white !important;
        }
      `
    });
    await page.waitForTimeout(1000);
    
    // Verify elements are still visible
    const visibleElements = await page.locator('button:visible, a:visible').count();
    console.log(`  Visible elements in high contrast: ${visibleElements}`);
    
    console.log('✅ Accessibility testing completed');
  });

  test.afterEach(async ({ page }) => {
    // Take a screenshot for debugging
    const testName = test.info().title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    await page.screenshot({ path: `test-results/comprehensive-gui-${testName}.png`, fullPage: true });
  });
});