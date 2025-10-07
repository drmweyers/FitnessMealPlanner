import { test, expect, Page } from '@playwright/test';

/**
 * Critical User Workflows E2E Tests
 * 
 * Tests the most important user journeys that must work:
 * 1. Complete trainer onboarding and customer assignment
 * 2. End-to-end meal plan creation and delivery
 * 3. Customer progress tracking workflow  
 * 4. Recipe generation and approval process
 * 5. Multi-role collaboration scenarios
 */

// Test credentials for each role
const TEST_USERS = {
  admin: {
    email: 'admin@fitmeal.pro',
    password: 'AdminPass123'
  },
  trainer: {
    email: 'trainer.test@evofitmeals.com', 
    password: 'TestTrainer123!'
  },
  customer: {
    email: 'customer.test@evofitmeals.com',
    password: 'TestCustomer123!'
  }
};

// Helper functions
async function loginAs(page: Page, role: keyof typeof TEST_USERS) {
  const user = TEST_USERS[role];
  await page.goto('/login');
  await page.fill('#email', user.email);
  await page.fill('#password', user.password);
  await page.click('button[type="submit"]');
  
  // Wait for dashboard to load
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  await expect(page).toHaveURL(/.*dashboard/);
}

async function logout(page: Page) {
  // Try multiple logout strategies
  const logoutSelectors = [
    'button[aria-label="Logout"]',
    '[data-testid="logout-button"]',
    'text=Logout',
    'text=Sign Out',
    '[href="/logout"]'
  ];

  for (const selector of logoutSelectors) {
    try {
      await page.click(selector, { timeout: 2000 });
      await page.waitForURL('**/login', { timeout: 5000 });
      return;
    } catch {
      continue;
    }
  }
  
  // Fallback: navigate directly to logout
  await page.goto('/logout');
  await page.waitForURL('**/login');
}

test.describe('Critical User Workflows', () => {
  
  test('Complete Trainer-Customer Workflow', async ({ page }) => {
    // This test covers the entire trainer-customer interaction cycle
    
    // 1. Trainer logs in and invites customer
    await loginAs(page, 'trainer');
    
    // Navigate to customer management
    await page.click('text=Customers', { timeout: 5000 });
    await expect(page).toHaveURL(/.*customers/);
    
    // Invite new customer (simulate)
    await page.click('text=Invite Customer', { timeout: 5000 });
    await page.fill('#customer-email', 'newcustomer@test.com');
    await page.fill('#customer-name', 'Test Customer');
    await page.click('button[type="submit"]');
    
    // Verify invitation sent
    await expect(page.locator('text=Invitation sent')).toBeVisible({ timeout: 5000 });
    
    // 2. Create meal plan for customer
    await page.click('text=Meal Plans');
    await expect(page).toHaveURL(/.*meal-plans/);
    
    await page.click('text=Create New Plan');
    
    // Fill out meal plan form
    await page.fill('#plan-name', 'Test Meal Plan');
    await page.selectOption('#customer-select', { label: 'Test Customer' });
    await page.fill('#duration', '7');
    await page.selectOption('#goal', 'weight_loss');
    
    // Generate meal plan
    await page.click('text=Generate Plan');
    
    // Wait for generation to complete
    await expect(page.locator('text=Plan Generated Successfully')).toBeVisible({ timeout: 15000 });
    
    // 3. Assign meal plan to customer
    await page.click('text=Assign to Customer');
    await expect(page.locator('text=Meal plan assigned')).toBeVisible({ timeout: 5000 });
    
    await logout(page);
    
    // 4. Customer logs in to view assigned meal plan
    await loginAs(page, 'customer');
    
    await page.click('text=My Meal Plans');
    await expect(page).toHaveURL(/.*meal-plans/);
    
    // Verify assigned meal plan is visible
    await expect(page.locator('text=Test Meal Plan')).toBeVisible();
    
    // 5. Customer views meal plan details
    await page.click('text=Test Meal Plan');
    await expect(page.locator('text=Week 1')).toBeVisible();
    await expect(page.locator('text=Breakfast')).toBeVisible();
    await expect(page.locator('text=Lunch')).toBeVisible();
    await expect(page.locator('text=Dinner')).toBeVisible();
    
    // 6. Customer exports meal plan as PDF
    await page.click('text=Export PDF');
    
    // Wait for PDF generation
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 10000 }),
      page.click('text=Download PDF')
    ]);
    
    expect(download.suggestedFilename()).toContain('.pdf');
    
    await logout(page);
  });

  test('Recipe Generation and Approval Workflow', async ({ page }) => {
    // Test the complete recipe lifecycle from generation to approval
    
    // 1. Admin logs in and generates recipes
    await loginAs(page, 'admin');
    
    await page.click('text=Recipe Generation');
    await expect(page).toHaveURL(/.*recipe-generation/);
    
    // Configure recipe generation
    await page.fill('#recipe-count', '3');
    await page.selectOption('#cuisine', 'mediterranean');
    await page.selectOption('#difficulty', 'medium');
    await page.fill('#dietary-restrictions', 'vegetarian');
    
    // Start generation
    await page.click('text=Generate Recipes');
    
    // Wait for progress to complete
    await expect(page.locator('text=3 recipes generated')).toBeVisible({ timeout: 20000 });
    
    // 2. Review generated recipes
    await page.click('text=Review Generated');
    
    // Approve first recipe
    await page.click('text=Mediterranean Vegetable Bowl', { timeout: 5000 });
    await expect(page.locator('[data-testid="recipe-modal"]')).toBeVisible();
    
    await page.click('text=Approve Recipe');
    await expect(page.locator('text=Recipe approved')).toBeVisible();
    
    // Close modal
    await page.press('Escape');
    
    // 3. Navigate to approved recipes
    await page.click('text=Recipes');
    await expect(page).toHaveURL(/.*recipes/);
    
    // Verify approved recipe is in the catalog
    await expect(page.locator('text=Mediterranean Vegetable Bowl')).toBeVisible();
    
    await logout(page);
    
    // 4. Trainer can now use approved recipe
    await loginAs(page, 'trainer');
    
    await page.click('text=Recipes');
    await expect(page.locator('text=Mediterranean Vegetable Bowl')).toBeVisible();
    
    // Add to meal plan
    await page.hover('text=Mediterranean Vegetable Bowl');
    await page.click('text=Add to Meal Plan');
    
    // Verify recipe added to selection
    await expect(page.locator('text=Added to meal plan')).toBeVisible();
    
    await logout(page);
  });

  test('Customer Progress Tracking Workflow', async ({ page }) => {
    // Test complete progress tracking from trainer setup to customer updates
    
    // 1. Trainer sets up progress tracking for customer
    await loginAs(page, 'trainer');
    
    await page.click('text=Customers');
    await page.click('text=Test Customer'); // Assumes customer exists
    
    // Navigate to progress tracking
    await page.click('text=Progress Tracking');
    
    // Set up tracking parameters
    await page.click('text=Configure Tracking');
    
    await page.check('#track-weight');
    await page.check('#track-measurements');
    await page.check('#track-photos');
    await page.fill('#target-weight', '65');
    await page.fill('#target-date', '2024-06-01');
    
    await page.click('text=Save Configuration');
    await expect(page.locator('text=Tracking configured')).toBeVisible();
    
    await logout(page);
    
    // 2. Customer logs in and updates progress
    await loginAs(page, 'customer');
    
    await page.click('text=Progress');
    await expect(page).toHaveURL(/.*progress/);
    
    // Add new progress entry
    await page.click('text=Add Progress Update');
    
    await page.fill('#current-weight', '67.5');
    await page.fill('#waist', '32');
    await page.fill('#chest', '38');
    await page.fill('#progress-notes', 'Feeling stronger this week');
    
    // Upload progress photo (simulate)
    await page.click('text=Upload Photo');
    // In real test, would use page.setInputFiles for actual file upload
    
    await page.click('text=Save Progress');
    await expect(page.locator('text=Progress saved')).toBeVisible();
    
    // 3. View progress charts
    await expect(page.locator('[data-testid="weight-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="measurement-chart"]')).toBeVisible();
    
    // 4. Compare with previous entries
    await page.click('text=Progress History');
    await expect(page.locator('text=67.5 kg')).toBeVisible();
    await expect(page.locator('text=Feeling stronger')).toBeVisible();
    
    await logout(page);
    
    // 5. Trainer reviews customer progress
    await loginAs(page, 'trainer');
    
    await page.click('text=Customers');
    await page.click('text=Test Customer');
    await page.click('text=Progress Tracking');
    
    // Trainer sees updated progress
    await expect(page.locator('text=67.5 kg')).toBeVisible();
    await expect(page.locator('text=Progress: -2.5 kg')).toBeVisible();
    
    // Trainer adds feedback
    await page.click('text=Add Feedback');
    await page.fill('#trainer-feedback', 'Great progress! Keep up the good work.');
    await page.click('text=Save Feedback');
    
    await logout(page);
  });

  test('Search and Discovery Workflow', async ({ page }) => {
    // Test recipe search, filtering, and discovery features
    
    await loginAs(page, 'trainer');
    
    // 1. Navigate to recipe catalog
    await page.click('text=Recipes');
    await expect(page).toHaveURL(/.*recipes/);
    
    // 2. Test basic search
    await page.fill('#recipe-search', 'chicken');
    await page.press('#recipe-search', 'Enter');
    
    // Wait for search results
    await expect(page.locator('text=Search Results')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="recipe-card"]')).toHaveCount(3, { timeout: 5000 });
    
    // 3. Apply filters
    await page.selectOption('#cuisine-filter', 'asian');
    await page.selectOption('#difficulty-filter', 'easy');
    await page.fill('#max-calories', '400');
    
    await page.click('text=Apply Filters');
    
    // Verify filtered results
    await expect(page.locator('text=Asian Chicken Stir Fry')).toBeVisible();
    
    // 4. Test advanced search
    await page.click('text=Advanced Search');
    await page.fill('#ingredients-include', 'chicken, vegetables');
    await page.fill('#ingredients-exclude', 'dairy, nuts');
    await page.check('#gluten-free');
    
    await page.click('text=Search');
    
    // Verify advanced search results
    await expect(page.locator('[data-testid="recipe-card"]')).toHaveCount(2, { timeout: 5000 });
    
    // 5. Save favorite recipe
    await page.hover('[data-testid="recipe-card"]');
    await page.click('[data-testid="favorite-button"]');
    await expect(page.locator('text=Added to favorites')).toBeVisible();
    
    // 6. View favorites
    await page.click('text=My Favorites');
    await expect(page.locator('text=Asian Chicken Stir Fry')).toBeVisible();
    
    await logout(page);
  });

  test('Error Handling and Recovery Workflow', async ({ page }) => {
    // Test application behavior under error conditions
    
    await loginAs(page, 'trainer');
    
    // 1. Test network error handling during meal plan generation
    await page.click('text=Meal Plans');
    await page.click('text=Create New Plan');
    
    // Fill form with invalid data to trigger error
    await page.fill('#plan-name', '');  // Empty name
    await page.fill('#duration', '0');  // Invalid duration
    
    await page.click('text=Generate Plan');
    
    // Verify error handling
    await expect(page.locator('text=Please enter a valid plan name')).toBeVisible();
    await expect(page.locator('text=Duration must be between 1 and 30 days')).toBeVisible();
    
    // 2. Test recovery by fixing errors
    await page.fill('#plan-name', 'Recovery Test Plan');
    await page.fill('#duration', '7');
    
    await page.click('text=Generate Plan');
    await expect(page.locator('text=Plan Generated Successfully')).toBeVisible({ timeout: 15000 });
    
    // 3. Test session timeout handling
    // Simulate session expiry by clearing localStorage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Try to access protected route
    await page.goto('/customers');
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('text=Session expired')).toBeVisible();
    
    // 4. Test graceful degradation
    await loginAs(page, 'trainer');
    
    // Navigate to a feature that might fail
    await page.click('text=Recipe Generation');
    
    // Simulate API failure by intercepting network requests
    await page.route('**/api/recipes/generate', route => {
      route.abort('failed');
    });
    
    await page.click('text=Generate Recipes');
    
    // Verify graceful error handling
    await expect(page.locator('text=Recipe generation temporarily unavailable')).toBeVisible();
    await expect(page.locator('text=Please try again later')).toBeVisible();
    
    await logout(page);
  });

  test('Performance and Load Handling', async ({ page }) => {
    // Test application performance under load
    
    await loginAs(page, 'admin');
    
    // 1. Test large dataset handling
    await page.goto('/recipes');
    
    // Measure page load time
    const startTime = Date.now();
    await page.waitForSelector('[data-testid="recipe-grid"]');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
    
    // 2. Test pagination with large datasets
    await expect(page.locator('[data-testid="recipe-card"]')).toHaveCount(20); // Default page size
    
    await page.click('text=Next Page');
    await expect(page.locator('[data-testid="recipe-card"]')).toHaveCount(20);
    
    // 3. Test search performance with large results
    await page.fill('#recipe-search', 'healthy');
    
    const searchStart = Date.now();
    await page.press('#recipe-search', 'Enter');
    await page.waitForSelector('[data-testid="search-results"]');
    const searchTime = Date.now() - searchStart;
    
    expect(searchTime).toBeLessThan(3000); // Search should complete within 3 seconds
    
    // 4. Test concurrent operations
    const actions = [
      () => page.click('text=Meal Plans'),
      () => page.click('text=Customers'),
      () => page.click('text=Analytics'),
    ];
    
    // Execute multiple navigations rapidly
    await Promise.all(actions.map(action => action()));
    
    // Application should remain responsive
    await expect(page.locator('[data-testid="navigation"]')).toBeVisible();
    
    await logout(page);
  });
});

test.describe('Cross-Browser Compatibility', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`Core functionality works in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
      // Skip if not the target browser
      if (currentBrowser !== browserName) {
        test.skip();
      }
      
      // Test basic login and navigation
      await loginAs(page, 'trainer');
      
      // Test core features
      await page.click('text=Recipes');
      await expect(page.locator('[data-testid="recipe-grid"]')).toBeVisible();
      
      await page.click('text=Meal Plans');
      await expect(page.locator('[data-testid="meal-plans-list"]')).toBeVisible();
      
      await page.click('text=Customers');
      await expect(page.locator('[data-testid="customers-table"]')).toBeVisible();
      
      await logout(page);
      
      // Verify logout worked
      await expect(page).toHaveURL(/.*login/);
    });
  });
});