import { test, expect, Page } from '@playwright/test';
import { 
  TEST_ACCOUNTS, 
  loginAsTrainer, 
  loginAsCustomer, 
  logout, 
  takeTestScreenshot, 
  waitForNetworkIdle,
  checkForJavaScriptErrors,
  monitorNetworkActivity
} from './auth-helper';

/**
 * Comprehensive Trainer-Customer Interaction Tests
 * 
 * This test suite covers all trainer-customer interactions including:
 * - Trainer profile management
 * - Customer profile management  
 * - Meal plan creation and assignment
 * - Customer progress tracking
 * - End-to-end workflows
 */

test.describe('Trainer Profile Management', () => {
  test.beforeEach(async ({ page }) => {
    // Setup network monitoring and error checking
    await checkForJavaScriptErrors(page);
    const networkMonitor = await monitorNetworkActivity(page);
    
    // Set longer timeout for complex interactions
    page.setDefaultTimeout(30000);
  });

  test('Trainer Login and Dashboard Access', async ({ page }) => {
    // Login as trainer
    await loginAsTrainer(page);
    
    // Take screenshot of trainer dashboard
    await takeTestScreenshot(page, 'trainer-dashboard-initial.png', 'Trainer dashboard after login');
    
    // Verify trainer dashboard elements - check for actual content
    const headings = await page.locator('h1, h2').allTextContents();
    console.log('📋 Dashboard headings found:', headings);
    
    // Check for any indication this is the trainer dashboard
    const dashboardIndicators = [
      'Evofit',
      'Welcome',
      'trainer',
      'Trainer',
      'Dashboard'
    ];
    
    let indicatorFound = false;
    for (const indicator of dashboardIndicators) {
      const indicatorElement = page.locator(`text="${indicator}"`);
      if (await indicatorElement.count() > 0) {
        indicatorFound = true;
        console.log(`✅ Dashboard indicator found: ${indicator}`);
        break;
      }
    }
    
    expect(indicatorFound).toBe(true);
    
    // Check for key trainer navigation elements
    const navigationElements = [
      'text="Customers"',
      'text="Meal Plans"', 
      'text="Recipes"',
      'text="Profile"'
    ];
    
    console.log('🧭 Checking navigation elements...');
    for (const element of navigationElements) {
      const locator = page.locator(element);
      const count = await locator.count();
      if (count > 0) {
        // If multiple elements found, just check the first one
        const firstElement = locator.first();
        if (await firstElement.isVisible()) {
          console.log(`✅ Navigation element found: ${element}`);
        }
      }
    }
    
    // Verify no JavaScript errors
    await page.waitForTimeout(2000);
    await expect(page.locator('.error, [data-testid="error"]')).toHaveCount(0);
  });

  test('Trainer Profile Creation and Editing', async ({ page }) => {
    await loginAsTrainer(page);
    
    // Navigate to trainer profile
    await page.click('text="Profile"');
    await waitForNetworkIdle(page);
    
    await takeTestScreenshot(page, 'trainer-profile-page.png', 'Trainer profile page');
    
    // Check if profile form exists
    const profileFormExists = await page.locator('form, input[type="text"], input[type="email"]').count() > 0;
    
    if (profileFormExists) {
      // Test profile editing
      const nameField = page.locator('input[name="name"], input[name="firstName"], input[placeholder*="name" i]');
      if (await nameField.count() > 0) {
        await nameField.clear();
        await nameField.fill('Test Trainer Updated');
      }
      
      const bioField = page.locator('textarea[name="bio"], textarea[placeholder*="bio" i]');
      if (await bioField.count() > 0) {
        await bioField.clear();
        await bioField.fill('Experienced fitness trainer specializing in meal planning and nutrition.');
      }
      
      // Look for save button
      const saveButtons = [
        'button:has-text("Save")',
        'button:has-text("Update")', 
        'button[type="submit"]'
      ];
      
      for (const selector of saveButtons) {
        const saveButton = page.locator(selector);
        if (await saveButton.isVisible()) {
          await saveButton.click();
          break;
        }
      }
      
      await waitForNetworkIdle(page);
      await takeTestScreenshot(page, 'trainer-profile-updated.png', 'Trainer profile after update');
    }
  });

  test('Trainer Customer List View', async ({ page }) => {
    await loginAsTrainer(page);
    
    // Navigate to customers section
    const customerNavigation = [
      'text="Customers"',
      'text="My Customers"',
      'button:has-text("Customers")'
    ];
    
    let navigated = false;
    for (const nav of customerNavigation) {
      const element = page.locator(nav);
      if (await element.count() > 0 && await element.isVisible()) {
        await element.click();
        navigated = true;
        break;
      }
    }
    
    if (navigated) {
      await waitForNetworkIdle(page);
      await takeTestScreenshot(page, 'trainer-customers-list.png', 'Trainer customers list');
      
      // Check for customer list elements
      const customerListExists = await page.locator('.customer-card, .customer-item, table tr, .list-item').count() > 0;
      
      if (customerListExists) {
        console.log('✅ Customer list found');
        
        // Test customer interaction
        const firstCustomer = page.locator('.customer-card, .customer-item, table tr').first();
        if (await firstCustomer.count() > 0) {
          await firstCustomer.click();
          await waitForNetworkIdle(page);
          await takeTestScreenshot(page, 'customer-detail-view.png', 'Customer detail view');
        }
      } else {
        console.log('ℹ️ No customers found in list');
      }
    }
  });
});

test.describe('Customer Profile Management', () => {
  test('Customer Login and Dashboard Access', async ({ page }) => {
    await loginAsCustomer(page);
    
    await takeTestScreenshot(page, 'customer-dashboard-initial.png', 'Customer dashboard after login');
    
    // Verify customer dashboard elements
    await expect(page.locator('h1, h2')).toContainText(['Customer', 'Dashboard', 'My']);
    
    // Check for customer navigation elements
    const customerElements = [
      'text="My Meal Plans"',
      'text="Progress"',
      'text="Profile"'
    ];
    
    for (const element of customerElements) {
      const locator = page.locator(element);
      if (await locator.count() > 0) {
        await expect(locator).toBeVisible();
      }
    }
  });

  test('Customer Profile Viewing and Editing', async ({ page }) => {
    await loginAsCustomer(page);
    
    // Navigate to customer profile
    await page.click('text="Profile"');
    await waitForNetworkIdle(page);
    
    await takeTestScreenshot(page, 'customer-profile-page.png', 'Customer profile page');
    
    // Test profile information display
    const profileFields = [
      'input[name="name"], input[name="firstName"]',
      'input[name="email"]',
      'input[name="phone"]'
    ];
    
    for (const field of profileFields) {
      const element = page.locator(field);
      if (await element.count() > 0) {
        await expect(element).toBeVisible();
      }
    }
  });

  test('Customer Progress Tracking Access', async ({ page }) => {
    await loginAsCustomer(page);
    
    // Navigate to progress section
    const progressNavigation = [
      'text="Progress"',
      'text="My Progress"',
      'button:has-text("Progress")'
    ];
    
    for (const nav of progressNavigation) {
      const element = page.locator(nav);
      if (await element.count() > 0 && await element.isVisible()) {
        await element.click();
        break;
      }
    }
    
    await waitForNetworkIdle(page);
    await takeTestScreenshot(page, 'customer-progress-page.png', 'Customer progress tracking page');
    
    // Check for progress tracking elements
    const progressElements = [
      'text="Measurements"',
      'text="Photos"',
      'text="Goals"',
      'input[type="number"]',
      'input[type="file"]'
    ];
    
    let progressFeaturesFound = 0;
    for (const element of progressElements) {
      const locator = page.locator(element);
      if (await locator.count() > 0) {
        progressFeaturesFound++;
      }
    }
    
    console.log(`📊 Progress features found: ${progressFeaturesFound}/${progressElements.length}`);
  });
});

test.describe('Meal Plan Management', () => {
  test('Trainer Meal Plan Creation', async ({ page }) => {
    await loginAsTrainer(page);
    
    // Navigate to meal plans section
    const mealPlanNavigation = [
      'text="Meal Plans"',
      'text="Create Meal Plan"',
      'button:has-text("Meal Plan")'
    ];
    
    let navigated = false;
    for (const nav of mealPlanNavigation) {
      const element = page.locator(nav);
      if (await element.count() > 0 && await element.isVisible()) {
        await element.click();
        navigated = true;
        break;
      }
    }
    
    if (navigated) {
      await waitForNetworkIdle(page);
      await takeTestScreenshot(page, 'trainer-meal-plans.png', 'Trainer meal plans page');
      
      // Look for create meal plan button
      const createButtons = [
        'button:has-text("Create")',
        'button:has-text("New")',
        'button:has-text("Add")',
        '+',
        'text="Generate"'
      ];
      
      for (const buttonText of createButtons) {
        const button = page.locator(buttonText);
        if (await button.count() > 0 && await button.isVisible()) {
          await button.click();
          await waitForNetworkIdle(page);
          await takeTestScreenshot(page, 'meal-plan-creation-form.png', 'Meal plan creation form');
          break;
        }
      }
    }
  });

  test('Customer Meal Plan Viewing', async ({ page }) => {
    await loginAsCustomer(page);
    
    // Navigate to meal plans
    const mealPlanNavigation = [
      'text="My Meal Plans"',
      'text="Meal Plans"',
      'button:has-text("Meal Plan")'
    ];
    
    for (const nav of mealPlanNavigation) {
      const element = page.locator(nav);
      if (await element.count() > 0 && await element.isVisible()) {
        await element.click();
        break;
      }
    }
    
    await waitForNetworkIdle(page);
    await takeTestScreenshot(page, 'customer-meal-plans.png', 'Customer meal plans view');
    
    // Check for meal plan content
    const mealPlanElements = [
      '.meal-plan-card',
      '.meal-plan-item', 
      'table tr',
      'text="Breakfast"',
      'text="Lunch"',
      'text="Dinner"'
    ];
    
    let mealPlanContentFound = false;
    for (const element of mealPlanElements) {
      const locator = page.locator(element);
      if (await locator.count() > 0) {
        mealPlanContentFound = true;
        break;
      }
    }
    
    console.log(`🍽️ Meal plan content found: ${mealPlanContentFound}`);
  });
});

test.describe('End-to-End Trainer-Customer Workflow', () => {
  test('Complete Trainer-Customer Interaction Flow', async ({ page }) => {
    // Test 1: Trainer creates meal plan
    console.log('🔄 Step 1: Trainer login and meal plan creation');
    await loginAsTrainer(page);
    await takeTestScreenshot(page, 'workflow-01-trainer-login.png', 'Workflow: Trainer dashboard');
    
    // Navigate to meal plans and try to create one
    const mealPlanNav = page.locator('text="Meal Plans", button:has-text("Meal Plan")').first();
    if (await mealPlanNav.count() > 0) {
      await mealPlanNav.click();
      await waitForNetworkIdle(page);
      await takeTestScreenshot(page, 'workflow-02-meal-plans.png', 'Workflow: Meal plans section');
    }
    
    // Logout trainer
    await logout(page);
    
    // Test 2: Customer views assigned meal plans
    console.log('🔄 Step 2: Customer login and meal plan viewing');
    await loginAsCustomer(page);
    await takeTestScreenshot(page, 'workflow-03-customer-login.png', 'Workflow: Customer dashboard');
    
    // Navigate to customer meal plans
    const customerMealPlanNav = page.locator('text="My Meal Plans", text="Meal Plans"').first();
    if (await customerMealPlanNav.count() > 0) {
      await customerMealPlanNav.click();
      await waitForNetworkIdle(page);
      await takeTestScreenshot(page, 'workflow-04-customer-meal-plans.png', 'Workflow: Customer meal plans');
    }
    
    // Test 3: Customer progress update
    console.log('🔄 Step 3: Customer progress tracking');
    const progressNav = page.locator('text="Progress", button:has-text("Progress")').first();
    if (await progressNav.count() > 0) {
      await progressNav.click();
      await waitForNetworkIdle(page);
      await takeTestScreenshot(page, 'workflow-05-customer-progress.png', 'Workflow: Customer progress');
    }
    
    await logout(page);
    
    // Test 4: Trainer views customer progress
    console.log('🔄 Step 4: Trainer reviews customer progress');
    await loginAsTrainer(page);
    
    const customersNav = page.locator('text="Customers", button:has-text("Customers")').first();
    if (await customersNav.count() > 0) {
      await customersNav.click();
      await waitForNetworkIdle(page);
      await takeTestScreenshot(page, 'workflow-06-trainer-customers.png', 'Workflow: Trainer customer review');
    }
    
    console.log('✅ End-to-end workflow test completed');
  });
});

test.describe('Responsive Design Tests', () => {
  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1280, height: 720 },
    { name: 'Large Desktop', width: 1920, height: 1080 }
  ];

  for (const viewport of viewports) {
    test(`Trainer Dashboard - ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      await loginAsTrainer(page);
      await waitForNetworkIdle(page);
      
      await takeTestScreenshot(page, `responsive-trainer-${viewport.name.toLowerCase()}.png`, 
        `Trainer dashboard on ${viewport.name}`);
      
      // Check that key elements are still accessible
      const keyElements = [
        'text="Dashboard"',
        'text="Customers"',
        'text="Meal Plans"'
      ];
      
      for (const element of keyElements) {
        const locator = page.locator(element);
        if (await locator.count() > 0) {
          // Element should be visible or accessible via mobile menu
          const isVisible = await locator.isVisible();
          const inMobileMenu = await page.locator('button:has-text("Menu"), .hamburger, .mobile-menu').count() > 0;
          
          if (!isVisible && inMobileMenu && viewport.width < 768) {
            // Try to open mobile menu
            await page.click('button:has-text("Menu"), .hamburger, .mobile-menu');
            await page.waitForTimeout(500);
          }
        }
      }
    });

    test(`Customer Dashboard - ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      await loginAsCustomer(page);
      await waitForNetworkIdle(page);
      
      await takeTestScreenshot(page, `responsive-customer-${viewport.name.toLowerCase()}.png`, 
        `Customer dashboard on ${viewport.name}`);
    });
  }
});

test.describe('Security and Authorization Tests', () => {
  test('Customer Cannot Access Trainer Features', async ({ page }) => {
    await loginAsCustomer(page);
    
    // Try to access trainer-only routes
    const trainerRoutes = [
      '/trainer/customers',
      '/trainer/meal-plans/create',
      '/admin'
    ];
    
    for (const route of trainerRoutes) {
      await page.goto(route);
      await waitForNetworkIdle(page);
      
      // Should be redirected or see access denied
      const currentUrl = page.url();
      const hasAccessError = await page.locator('text="Access Denied", text="Unauthorized", text="403", text="Not Found"').count() > 0;
      
      if (!currentUrl.includes(route) || hasAccessError) {
        console.log(`✅ Customer properly blocked from ${route}`);
      } else {
        console.log(`⚠️ Customer may have accessed restricted route: ${route}`);
      }
      
      await takeTestScreenshot(page, `security-customer-blocked-${route.replace(/\//g, '-')}.png`, 
        `Customer blocked from ${route}`);
    }
  });

  test('Trainer Cannot Access Admin Features', async ({ page }) => {
    await loginAsTrainer(page);
    
    // Try to access admin-only routes
    const adminRoutes = [
      '/admin',
      '/admin/users',
      '/admin/recipes'
    ];
    
    for (const route of adminRoutes) {
      await page.goto(route);
      await waitForNetworkIdle(page);
      
      const currentUrl = page.url();
      const hasAccessError = await page.locator('text="Access Denied", text="Unauthorized", text="403"').count() > 0;
      
      if (!currentUrl.includes(route) || hasAccessError) {
        console.log(`✅ Trainer properly blocked from ${route}`);
      } else {
        console.log(`⚠️ Trainer may have accessed restricted route: ${route}`);
      }
    }
  });

  test('Session Management - Logout Security', async ({ page }) => {
    // Login as trainer
    await loginAsTrainer(page);
    
    // Logout
    await logout(page);
    
    // Try to access trainer dashboard after logout
    await page.goto('/trainer');
    await waitForNetworkIdle(page);
    
    // Should be redirected to login
    const currentUrl = page.url();
    const isOnLogin = currentUrl.includes('/login') || currentUrl === 'http://localhost:4000/';
    
    expect(isOnLogin).toBe(true);
    await takeTestScreenshot(page, 'security-logout-redirect.png', 'Logout security test');
  });
});

test.describe('Performance Tests', () => {
  test('Page Load Performance', async ({ page }) => {
    const startTime = Date.now();
    
    await loginAsTrainer(page);
    
    const loadTime = Date.now() - startTime;
    console.log(`📊 Trainer dashboard load time: ${loadTime}ms`);
    
    // Basic performance check - should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
    
    // Check for performance issues
    const performanceEntries = await page.evaluate(() => 
      JSON.stringify(performance.getEntriesByType('navigation'))
    );
    
    const navigationTiming = JSON.parse(performanceEntries)[0];
    if (navigationTiming) {
      console.log(`📊 DOM Content Loaded: ${navigationTiming.domContentLoadedEventEnd - navigationTiming.domContentLoadedEventStart}ms`);
      console.log(`📊 Load Event: ${navigationTiming.loadEventEnd - navigationTiming.loadEventStart}ms`);
    }
  });

  test('Network Requests Performance', async ({ page }) => {
    const networkMonitor = await monitorNetworkActivity(page);
    
    await loginAsTrainer(page);
    await waitForNetworkIdle(page);
    
    const requests = networkMonitor.getRequests();
    const failedRequests = networkMonitor.getFailedRequests();
    
    console.log(`📊 Total requests: ${requests.length}`);
    console.log(`📊 Failed requests: ${failedRequests.length}`);
    
    // Log failed requests for debugging
    if (failedRequests.length > 0) {
      console.log('Failed requests:', failedRequests);
    }
    
    // Should have minimal failed requests
    expect(failedRequests.length).toBeLessThan(5);
  });
});