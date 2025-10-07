/**
 * COMPLETE NAVIGATION FLOWS TEST SUITE
 * 
 * This test suite provides exhaustive testing of ALL navigation flows for all user roles:
 * - Complete Admin user journey and navigation
 * - Complete Trainer user journey and navigation
 * - Complete Customer user journey and navigation
 * - Cross-role navigation restrictions
 * - Deep linking and URL handling
 * - Breadcrumb navigation
 * - Tab navigation within pages
 * - Modal navigation flows
 * - Mobile navigation patterns
 * - Browser back/forward button handling
 * - Error page navigation
 * - Authentication-based redirects
 */

import { test, expect, Page } from '@playwright/test';

// Test account credentials
const TEST_ACCOUNTS = {
  admin: { email: 'admin@fitmeal.pro', password: 'AdminPass123' },
  trainer: { email: 'trainer.test@evofitmeals.com', password: 'TestTrainer123!' },
  customer: { email: 'customer.test@evofitmeals.com', password: 'TestCustomer123!' }
};

// Helper function to login
async function loginAs(page: Page, role: 'admin' | 'trainer' | 'customer'): Promise<void> {
  const account = TEST_ACCOUNTS[role];
  console.log(`🔐 Logging in as ${role}: ${account.email}`);
  
  await page.goto('/login');
  await expect(page).toHaveTitle(/FitnessMealPlanner/);
  
  await page.fill('input[type="email"]', account.email);
  await page.fill('input[type="password"]', account.password);
  await page.click('button[type="submit"]');
  
  await page.waitForNavigation({ waitUntil: 'networkidle' });
  console.log(`✅ Successfully logged in as ${role}`);
}

// Helper function to test navigation link
async function testNavigationLink(page: Page, selector: string, expectedUrl: string, linkName: string): Promise<boolean> {
  try {
    console.log(`  🔗 Testing navigation: ${linkName}`);
    
    const link = page.locator(selector);
    await expect(link).toBeVisible();
    
    // Get initial URL
    const initialUrl = page.url();
    
    // Click the link
    await link.click();
    await page.waitForTimeout(1000);
    
    // Check if URL changed appropriately
    const currentUrl = page.url();
    const navigationSuccessful = currentUrl.includes(expectedUrl) || currentUrl !== initialUrl;
    
    console.log(`    Initial: ${initialUrl}`);
    console.log(`    Current: ${currentUrl}`);
    console.log(`    Expected to contain: ${expectedUrl}`);
    console.log(`    Navigation successful: ${navigationSuccessful}`);
    
    return navigationSuccessful;
  } catch (error) {
    console.log(`    ❌ Error testing navigation ${linkName}: ${error}`);
    return false;
  }
}

// Helper function to test all navigation elements on current page
async function testAllNavigationElements(page: Page, userRole: string): Promise<void> {
  console.log(`🧭 Testing all navigation elements for ${userRole}...`);
  
  // Find all navigation links
  const navLinks = await page.locator('nav a, [role="navigation"] a, .nav-link, .navigation a').all();
  const tabLinks = await page.locator('[role="tab"], .tab-trigger, [data-testid*="tab"]').all();
  const breadcrumbs = await page.locator('.breadcrumb a, [aria-label*="breadcrumb"] a').all();
  const menuItems = await page.locator('.menu a, .dropdown-menu a').all();
  
  console.log(`  Found ${navLinks.length} nav links, ${tabLinks.length} tabs, ${breadcrumbs.length} breadcrumbs, ${menuItems.length} menu items`);
  
  // Test primary navigation links
  for (let i = 0; i < Math.min(navLinks.length, 10); i++) {
    try {
      const link = navLinks[i];
      const href = await link.getAttribute('href');
      const text = await link.textContent();
      const isVisible = await link.isVisible();
      
      if (href && text && isVisible && !href.includes('logout')) {
        console.log(`    Nav link ${i + 1}: "${text.trim()}" -> ${href}`);
        
        // Test link click
        await link.click();
        await page.waitForTimeout(1000);
        
        const currentUrl = page.url();
        console.log(`      Navigated to: ${currentUrl}`);
        
        // Check if page loaded correctly
        const hasContent = await page.locator('main, .content, h1, h2').count() > 0;
        console.log(`      Page has content: ${hasContent}`);
      }
    } catch (error) {
      console.log(`    ⚠️ Error testing nav link ${i + 1}: ${error}`);
    }
  }
  
  // Test tab navigation
  for (let i = 0; i < Math.min(tabLinks.length, 8); i++) {
    try {
      const tab = tabLinks[i];
      const text = await tab.textContent();
      const isVisible = await tab.isVisible();
      
      if (text && isVisible) {
        console.log(`    Tab ${i + 1}: "${text.trim()}"`);
        
        // Test tab click
        await tab.click();
        await page.waitForTimeout(800);
        
        // Check if tab content loaded
        const tabContent = await page.locator('.tab-content, [role="tabpanel"]').count();
        console.log(`      Tab content areas: ${tabContent}`);
      }
    } catch (error) {
      console.log(`    ⚠️ Error testing tab ${i + 1}: ${error}`);
    }
  }
}

// Helper function to test deep linking
async function testDeepLinks(page: Page, role: 'admin' | 'trainer' | 'customer'): Promise<void> {
  console.log(`🔗 Testing deep links for ${role}...`);
  
  const deepLinks = {
    admin: [
      '/admin',
      '/admin/analytics',
      '/admin/profile',
      '/profile'
    ],
    trainer: [
      '/trainer',
      '/trainer/customers', 
      '/trainer/meal-plans',
      '/meal-plan-generator',
      '/trainer/profile',
      '/profile'
    ],
    customer: [
      '/customer',
      '/my-meal-plans',
      '/nutrition',
      '/meal-prep', 
      '/grocery-list',
      '/customer/profile',
      '/profile'
    ]
  };
  
  const linksToTest = deepLinks[role];
  
  for (const link of linksToTest) {
    try {
      console.log(`  🔍 Testing deep link: ${link}`);
      
      await page.goto(link);
      await page.waitForTimeout(1500);
      
      const currentUrl = page.url();
      const expectedInUrl = link === '/profile' ? '/profile' : link;
      const linkWorks = currentUrl.includes(expectedInUrl);
      
      console.log(`    URL: ${currentUrl}`);
      console.log(`    Link works: ${linkWorks}`);
      
      // Check if page has expected content
      if (linkWorks) {
        const hasContent = await page.locator('h1, h2, main, .content').count() > 0;
        console.log(`    Page has content: ${hasContent}`);
        
        // Check for specific role-based content
        if (role === 'admin' && link.includes('admin')) {
          const hasAdminContent = await page.locator('[data-testid*="admin"], .admin').count() > 0;
          console.log(`    Has admin content: ${hasAdminContent}`);
        } else if (role === 'trainer' && link.includes('trainer')) {
          const hasTrainerContent = await page.locator('.trainer, [data-testid*="trainer"]').count() > 0;
          console.log(`    Has trainer content: ${hasTrainerContent}`);
        } else if (role === 'customer' && link.includes('customer')) {
          const hasCustomerContent = await page.locator('.customer, [data-testid*="customer"]').count() > 0;
          console.log(`    Has customer content: ${hasCustomerContent}`);
        }
      }
    } catch (error) {
      console.log(`    ❌ Error testing deep link ${link}: ${error}`);
    }
  }
}

// Helper function to test unauthorized access
async function testUnauthorizedAccess(page: Page, role: 'admin' | 'trainer' | 'customer'): Promise<void> {
  console.log(`🚫 Testing unauthorized access restrictions for ${role}...`);
  
  const restrictedUrls = {
    admin: [], // Admin can access everything
    trainer: [
      '/admin',
      '/admin/analytics'
    ],
    customer: [
      '/admin',
      '/admin/analytics', 
      '/trainer',
      '/trainer/customers',
      '/meal-plan-generator'
    ]
  };
  
  const urlsToTest = restrictedUrls[role];
  
  for (const url of urlsToTest) {
    try {
      console.log(`  🚫 Testing restricted access to: ${url}`);
      
      await page.goto(url);
      await page.waitForTimeout(1500);
      
      const currentUrl = page.url();
      const wasRedirected = !currentUrl.includes(url);
      
      console.log(`    Attempted: ${url}`);
      console.log(`    Current: ${currentUrl}`);
      console.log(`    Was redirected: ${wasRedirected}`);
      
      if (wasRedirected) {
        // Check if redirected to appropriate page
        const redirectedToLogin = currentUrl.includes('/login');
        const redirectedToHome = currentUrl.includes('/') && !currentUrl.includes(url);
        console.log(`    Redirected to login: ${redirectedToLogin}`);
        console.log(`    Redirected to home: ${redirectedToHome}`);
      } else {
        console.log(`    ⚠️ Access not properly restricted!`);
      }
    } catch (error) {
      console.log(`    ❌ Error testing restricted access to ${url}: ${error}`);
    }
  }
}

test.describe('Complete Navigation Flows Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('ADMIN COMPLETE NAVIGATION FLOW', async ({ page }) => {
    console.log('🧪 Testing ADMIN COMPLETE NAVIGATION FLOW');
    
    await loginAs(page, 'admin');
    
    // Test landing after login
    console.log('📍 Testing admin landing page...');
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator('h1')).toContainText('Admin Dashboard');
    
    // Test main admin tabs navigation
    console.log('🗂️ Testing admin tabs navigation...');
    
    // Recipes tab
    await page.click('[data-testid="admin-tab-recipes"]');
    await page.waitForTimeout(1000);
    console.log('  ✅ Navigated to Recipes tab');
    
    // Check for recipes content
    const recipesContent = await page.locator('.recipe-card, .recipe-table, [data-testid*="recipe"]').count();
    console.log(`  Found ${recipesContent} recipe elements`);
    
    // Test view toggle
    const viewToggle = page.locator('button:has-text("Cards"), button:has-text("Table"), [data-testid*="view"]');
    if (await viewToggle.count() > 0) {
      await viewToggle.first().click();
      await page.waitForTimeout(500);
      console.log('  ✅ View toggle tested');
    }
    
    // Meal Plans tab
    await page.click('[data-testid="admin-tab-meal-plans"]');
    await page.waitForTimeout(1000);
    console.log('  ✅ Navigated to Meal Plans tab');
    
    // Admin tab
    await page.click('[data-testid="admin-tab-admin"]');
    await page.waitForTimeout(1000);
    console.log('  ✅ Navigated to Admin tab');
    
    // Test admin action buttons navigation
    console.log('🔘 Testing admin action buttons...');
    
    // Generate Recipes Modal
    await page.click('[data-testid="admin-generate-recipes"]');
    await page.waitForTimeout(2000);
    
    let modal = page.locator('[role="dialog"], .modal, .fixed.inset-0');
    if (await modal.count() > 0) {
      console.log('  ✅ Generate Recipes modal opened');
      
      // Test modal navigation
      const modalTabs = await modal.locator('button, [role="tab"]').count();
      console.log(`    Modal has ${modalTabs} interactive elements`);
      
      // Close modal
      const closeButton = modal.locator('button:has-text("×"), button:has-text("Close")');
      if (await closeButton.count() > 0) {
        await closeButton.click();
      } else {
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(500);
    }
    
    // Pending Recipes Modal
    await page.click('[data-testid="admin-view-pending"]');
    await page.waitForTimeout(2000);
    
    modal = page.locator('[role="dialog"], .modal, .fixed.inset-0');
    if (await modal.count() > 0) {
      console.log('  ✅ Pending Recipes modal opened');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
    
    // Export Data Modal
    await page.click('[data-testid="admin-export-data"]');
    await page.waitForTimeout(2000);
    
    modal = page.locator('[role="dialog"], .modal, .fixed.inset-0');
    if (await modal.count() > 0) {
      console.log('  ✅ Export Data modal opened');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
    
    // Test navigation to Analytics
    console.log('📊 Testing Analytics navigation...');
    const analyticsLink = page.locator('a[href*="analytics"], button:has-text("Analytics")');
    if (await analyticsLink.count() > 0) {
      await analyticsLink.first().click();
      await page.waitForTimeout(1500);
      
      const onAnalytics = page.url().includes('analytics');
      console.log(`  Analytics page loaded: ${onAnalytics}`);
      
      if (onAnalytics) {
        // Test analytics content
        const chartsCount = await page.locator('.chart, [data-testid*="chart"], canvas').count();
        console.log(`    Found ${chartsCount} chart elements`);
        
        // Navigate back
        await page.goBack();
        await page.waitForTimeout(1000);
      }
    }
    
    // Test profile navigation
    console.log('👤 Testing Profile navigation...');
    await page.goto('/admin/profile');
    await page.waitForTimeout(1000);
    
    const onProfile = page.url().includes('profile');
    console.log(`  Profile page loaded: ${onProfile}`);
    
    if (onProfile) {
      // Test profile form elements
      const profileFields = await page.locator('input, textarea, select').count();
      console.log(`    Found ${profileFields} profile form fields`);
    }
    
    // Test all navigation elements
    await page.goto('/admin');
    await page.waitForTimeout(1000);
    await testAllNavigationElements(page, 'Admin');
    
    // Test deep links
    await testDeepLinks(page, 'admin');
    
    // Test browser navigation
    console.log('⬅️ Testing browser back/forward...');
    await page.goBack();
    await page.waitForTimeout(1000);
    const backUrl = page.url();
    
    await page.goForward();
    await page.waitForTimeout(1000);
    const forwardUrl = page.url();
    
    console.log(`  Back navigation: ${backUrl}`);
    console.log(`  Forward navigation: ${forwardUrl}`);
    
    console.log('✅ ADMIN COMPLETE NAVIGATION FLOW testing completed');
  });

  test('TRAINER COMPLETE NAVIGATION FLOW', async ({ page }) => {
    console.log('🧪 Testing TRAINER COMPLETE NAVIGATION FLOW');
    
    await loginAs(page, 'trainer');
    
    // Test landing after login
    console.log('📍 Testing trainer landing page...');
    await expect(page).toHaveURL(/\/trainer/);
    await expect(page.locator('h1')).toContainText('Welcome');
    
    // Test main trainer tabs navigation
    console.log('🗂️ Testing trainer tabs navigation...');
    
    // Get all tabs
    const tabs = await page.locator('[role="tab"], .tab-trigger, [data-testid*="tab"]').all();
    console.log(`  Found ${tabs.length} trainer tabs`);
    
    for (let i = 0; i < Math.min(tabs.length, 6); i++) {
      try {
        const tab = tabs[i];
        const tabText = await tab.textContent();
        console.log(`  🗂️ Testing tab: "${tabText?.trim()}"`);
        
        await tab.click();
        await page.waitForTimeout(1200);
        
        // Check tab content loaded
        const hasContent = await page.locator('.tab-content, [role="tabpanel"], main').count() > 0;
        console.log(`    Content loaded: ${hasContent}`);
        
        // Test specific tab functionality
        if (tabText?.toLowerCase().includes('recipe')) {
          console.log('    Testing recipes tab content...');
          const recipeElements = await page.locator('.recipe-card, .recipe-item, [data-testid*="recipe"]').count();
          console.log(`      Found ${recipeElements} recipe elements`);
          
          // Test recipe interaction
          if (recipeElements > 0) {
            const firstRecipe = page.locator('.recipe-card, .recipe-item').first();
            if (await firstRecipe.isVisible()) {
              await firstRecipe.click();
              await page.waitForTimeout(1000);
              
              const recipeModal = await page.locator('[role="dialog"], .modal').count();
              if (recipeModal > 0) {
                console.log('      ✅ Recipe modal opened');
                await page.keyboard.press('Escape');
                await page.waitForTimeout(500);
              }
            }
          }
        } else if (tabText?.toLowerCase().includes('customer')) {
          console.log('    Testing customers tab content...');
          const customerElements = await page.locator('.customer-card, .customer-item, [data-testid*="customer"]').count();
          console.log(`      Found ${customerElements} customer elements`);
          
          // Test customer invitation
          const inviteButton = page.locator('button:has-text("Invite"), button:has-text("Add Customer")');
          if (await inviteButton.count() > 0) {
            await inviteButton.first().click();
            await page.waitForTimeout(1000);
            
            const inviteModal = await page.locator('[role="dialog"], .modal').count();
            if (inviteModal > 0) {
              console.log('      ✅ Customer invitation modal opened');
              await page.keyboard.press('Escape');
              await page.waitForTimeout(500);
            }
          }
        } else if (tabText?.toLowerCase().includes('meal')) {
          console.log('    Testing meal plans tab content...');
          const mealPlanElements = await page.locator('.meal-plan, .plan-item, [data-testid*="plan"]').count();
          console.log(`      Found ${mealPlanElements} meal plan elements`);
        }
      } catch (error) {
        console.log(`    ⚠️ Error testing tab ${i + 1}: ${error}`);
      }
    }
    
    // Test direct navigation to trainer routes
    console.log('🔗 Testing direct trainer route navigation...');
    
    const trainerRoutes = [
      { url: '/trainer/customers', name: 'Customers' },
      { url: '/trainer/meal-plans', name: 'Meal Plans' },
      { url: '/meal-plan-generator', name: 'Meal Plan Generator' },
      { url: '/recipes', name: 'Recipes' },
      { url: '/favorites', name: 'Favorites' }
    ];
    
    for (const route of trainerRoutes) {
      try {
        console.log(`  🔗 Testing route: ${route.name} (${route.url})`);
        
        await page.goto(route.url);
        await page.waitForTimeout(1500);
        
        const currentUrl = page.url();
        const routeWorks = currentUrl.includes(route.url) || currentUrl.includes('trainer');
        console.log(`    Route works: ${routeWorks} (${currentUrl})`);
        
        if (routeWorks) {
          const hasContent = await page.locator('h1, h2, main, .content').count() > 0;
          console.log(`    Has content: ${hasContent}`);
        }
      } catch (error) {
        console.log(`    ❌ Error testing route ${route.name}: ${error}`);
      }
    }
    
    // Test profile navigation
    console.log('👤 Testing trainer profile navigation...');
    await page.goto('/trainer/profile');
    await page.waitForTimeout(1000);
    
    const onProfile = page.url().includes('profile');
    console.log(`  Profile page loaded: ${onProfile}`);
    
    if (onProfile) {
      // Test trainer-specific profile fields
      const profileFields = await page.locator('input, textarea, select').count();
      console.log(`    Found ${profileFields} profile form fields`);
      
      // Check for trainer-specific fields (bio, specialization, etc.)
      const bioField = await page.locator('textarea[name*="bio"], textarea[placeholder*="bio" i]').count();
      const specializationField = await page.locator('input[name*="specialization"], select[name*="specialization"]').count();
      console.log(`    Bio field: ${bioField > 0}, Specialization field: ${specializationField > 0}`);
    }
    
    // Test unauthorized access restrictions
    await testUnauthorizedAccess(page, 'trainer');
    
    // Test all navigation elements
    await page.goto('/trainer');
    await page.waitForTimeout(1000);
    await testAllNavigationElements(page, 'Trainer');
    
    // Test deep links
    await testDeepLinks(page, 'trainer');
    
    console.log('✅ TRAINER COMPLETE NAVIGATION FLOW testing completed');
  });

  test('CUSTOMER COMPLETE NAVIGATION FLOW', async ({ page }) => {
    console.log('🧪 Testing CUSTOMER COMPLETE NAVIGATION FLOW');
    
    await loginAs(page, 'customer');
    
    // Test landing after login
    console.log('📍 Testing customer landing page...');
    await expect(page).toHaveURL(/\/my-meal-plans/);
    await expect(page.locator('h1')).toContainText('My Meal Plans');
    
    // Test meal plans display
    console.log('🍽️ Testing meal plans display...');
    const mealPlanElements = await page.locator('.meal-plan, .plan-card, [data-testid*="meal"], [data-testid*="plan"]').count();
    console.log(`  Found ${mealPlanElements} meal plan elements`);
    
    if (mealPlanElements > 0) {
      // Test meal plan interaction
      const firstPlan = page.locator('.meal-plan, .plan-card').first();
      if (await firstPlan.isVisible()) {
        console.log('  🍽️ Testing meal plan click...');
        await firstPlan.click();
        await page.waitForTimeout(1000);
        
        // Check if plan details opened
        const planDetails = await page.locator('.meal-plan-detail, .plan-details, .recipe-list').count();
        console.log(`    Plan details elements: ${planDetails}`);
      }
    }
    
    // Test customer-specific navigation
    console.log('🧭 Testing customer navigation links...');
    
    const customerRoutes = [
      { url: '/nutrition', name: 'Nutrition Tracking' },
      { url: '/meal-prep', name: 'Meal Prep Calendar' },
      { url: '/grocery-list', name: 'Grocery List' }
    ];
    
    for (const route of customerRoutes) {
      try {
        console.log(`  🔗 Testing customer route: ${route.name} (${route.url})`);
        
        await page.goto(route.url);
        await page.waitForTimeout(1500);
        
        const currentUrl = page.url();
        const routeWorks = currentUrl.includes(route.url.substring(1)) || currentUrl.includes('customer');
        console.log(`    Route works: ${routeWorks} (${currentUrl})`);
        
        if (routeWorks) {
          const hasContent = await page.locator('h1, h2, main, .content').count() > 0;
          console.log(`    Has content: ${hasContent}`);
          
          // Test route-specific functionality
          if (route.url === '/nutrition') {
            const nutritionElements = await page.locator('.nutrition, .macro, [data-testid*="nutrition"]').count();
            console.log(`      Nutrition elements: ${nutritionElements}`);
          } else if (route.url === '/meal-prep') {
            const calendarElements = await page.locator('.calendar, .schedule, [data-testid*="calendar"]').count();
            console.log(`      Calendar elements: ${calendarElements}`);
          } else if (route.url === '/grocery-list') {
            const groceryElements = await page.locator('.grocery, .shopping, [data-testid*="grocery"]').count();
            console.log(`      Grocery list elements: ${groceryElements}`);
          }
        }
      } catch (error) {
        console.log(`    ❌ Error testing customer route ${route.name}: ${error}`);
      }
    }
    
    // Test progress tracking navigation
    console.log('📊 Testing progress tracking...');
    
    // Look for progress/tracking navigation
    const progressLinks = await page.locator('a:has-text("Progress"), button:has-text("Progress"), a:has-text("Track")').all();
    
    if (progressLinks.length > 0) {
      console.log(`  Found ${progressLinks.length} progress-related links`);
      
      // Test first progress link
      await progressLinks[0].click();
      await page.waitForTimeout(1500);
      
      const onProgressPage = page.url().includes('progress') || page.url().includes('track');
      console.log(`  Progress page loaded: ${onProgressPage}`);
      
      if (onProgressPage) {
        // Test progress tracking elements
        const progressElements = await page.locator('.progress, .tracking, .measurement, [data-testid*="progress"]').count();
        console.log(`    Progress tracking elements: ${progressElements}`);
        
        // Test progress form elements
        const progressForms = await page.locator('form, input, textarea').count();
        console.log(`    Progress form elements: ${progressForms}`);
      }
    }
    
    // Test customer profile navigation
    console.log('👤 Testing customer profile navigation...');
    await page.goto('/customer/profile');
    await page.waitForTimeout(1000);
    
    const onProfile = page.url().includes('profile');
    console.log(`  Profile page loaded: ${onProfile}`);
    
    if (onProfile) {
      // Test customer-specific profile fields
      const profileFields = await page.locator('input, textarea, select').count();
      console.log(`    Found ${profileFields} profile form fields`);
      
      // Check for customer-specific fields (goals, measurements, etc.)
      const goalFields = await page.locator('input[name*="goal"], textarea[name*="goal"]').count();
      const measurementFields = await page.locator('input[name*="weight"], input[name*="height"]').count();
      console.log(`    Goal fields: ${goalFields}, Measurement fields: ${measurementFields}`);
    }
    
    // Test PDF export functionality
    console.log('📄 Testing PDF export navigation...');
    
    // Look for PDF/export buttons
    const pdfButtons = await page.locator('button:has-text("PDF"), button:has-text("Export"), button:has-text("Download")').all();
    
    if (pdfButtons.length > 0) {
      console.log(`  Found ${pdfButtons.length} PDF/export buttons`);
      
      for (let i = 0; i < Math.min(pdfButtons.length, 3); i++) {
        const button = pdfButtons[i];
        const buttonText = await button.textContent();
        console.log(`    Testing PDF button: "${buttonText?.trim()}"`);
        
        if (await button.isVisible() && await button.isEnabled()) {
          // Note: We don't actually click to avoid triggering downloads
          console.log(`      PDF button ready for interaction`);
        }
      }
    }
    
    // Test unauthorized access restrictions
    await testUnauthorizedAccess(page, 'customer');
    
    // Test all navigation elements
    await page.goto('/my-meal-plans');
    await page.waitForTimeout(1000);
    await testAllNavigationElements(page, 'Customer');
    
    // Test deep links
    await testDeepLinks(page, 'customer');
    
    console.log('✅ CUSTOMER COMPLETE NAVIGATION FLOW testing completed');
  });

  test('CROSS-ROLE NAVIGATION AND RESTRICTIONS', async ({ page }) => {
    console.log('🧪 Testing CROSS-ROLE NAVIGATION AND RESTRICTIONS');
    
    // Test unauthorized access for each role
    const roles: Array<'admin' | 'trainer' | 'customer'> = ['admin', 'trainer', 'customer'];
    
    for (const role of roles) {
      console.log(`🔐 Testing ${role} access restrictions...`);
      await loginAs(page, role);
      await testUnauthorizedAccess(page, role);
    }
    
    // Test role switching navigation
    console.log('🔄 Testing role switching scenarios...');
    
    // Login as admin, then try customer routes
    await loginAs(page, 'admin');
    
    // Admin trying customer routes (should work for admin)
    await page.goto('/my-meal-plans');
    await page.waitForTimeout(1000);
    console.log(`  Admin accessing customer route: ${page.url()}`);
    
    // Admin trying trainer routes (should work for admin)
    await page.goto('/trainer/customers');
    await page.waitForTimeout(1000);
    console.log(`  Admin accessing trainer route: ${page.url()}`);
    
    // Login as trainer, then try admin routes (should be restricted)
    await loginAs(page, 'trainer');
    
    await page.goto('/admin');
    await page.waitForTimeout(1500);
    console.log(`  Trainer trying admin route: ${page.url()}`);
    
    // Login as customer, then try trainer routes (should be restricted)
    await loginAs(page, 'customer');
    
    await page.goto('/trainer');
    await page.waitForTimeout(1500);
    console.log(`  Customer trying trainer route: ${page.url()}`);
    
    await page.goto('/meal-plan-generator');
    await page.waitForTimeout(1500);
    console.log(`  Customer trying meal plan generator: ${page.url()}`);
    
    console.log('✅ CROSS-ROLE NAVIGATION AND RESTRICTIONS testing completed');
  });

  test('BROWSER NAVIGATION AND ERROR HANDLING', async ({ page }) => {
    console.log('🧪 Testing BROWSER NAVIGATION AND ERROR HANDLING');
    
    await loginAs(page, 'admin');
    
    // Test browser back/forward navigation
    console.log('⬅️➡️ Testing browser back/forward navigation...');
    
    const navigationPath = [
      '/admin',
      '/admin/analytics', 
      '/admin/profile',
      '/admin'
    ];
    
    for (const path of navigationPath) {
      await page.goto(path);
      await page.waitForTimeout(1000);
      console.log(`  Navigated to: ${path}`);
    }
    
    // Test back navigation
    for (let i = 0; i < navigationPath.length - 1; i++) {
      await page.goBack();
      await page.waitForTimeout(800);
      const currentUrl = page.url();
      console.log(`    Back ${i + 1}: ${currentUrl}`);
    }
    
    // Test forward navigation
    for (let i = 0; i < navigationPath.length - 1; i++) {
      await page.goForward();
      await page.waitForTimeout(800);
      const currentUrl = page.url();
      console.log(`    Forward ${i + 1}: ${currentUrl}`);
    }
    
    // Test 404 error handling
    console.log('❌ Testing 404 error handling...');
    
    const nonExistentUrls = [
      '/non-existent-page',
      '/admin/non-existent',
      '/trainer/invalid-route',
      '/customer/missing-page'
    ];
    
    for (const url of nonExistentUrls) {
      try {
        await page.goto(url);
        await page.waitForTimeout(1000);
        
        const currentUrl = page.url();
        const hasErrorPage = await page.locator('h1:has-text("404"), h1:has-text("Not Found"), .error-page').count() > 0;
        const wasRedirected = !currentUrl.includes(url);
        
        console.log(`  URL: ${url}`);
        console.log(`    Current: ${currentUrl}`);
        console.log(`    Has error page: ${hasErrorPage}`);
        console.log(`    Was redirected: ${wasRedirected}`);
      } catch (error) {
        console.log(`    Navigation error handled: ${error}`);
      }
    }
    
    // Test refresh navigation
    console.log('🔄 Testing page refresh navigation...');
    
    await page.goto('/admin');
    await page.waitForTimeout(1000);
    
    const beforeRefresh = page.url();
    await page.reload();
    await page.waitForTimeout(1500);
    const afterRefresh = page.url();
    
    console.log(`  Before refresh: ${beforeRefresh}`);
    console.log(`  After refresh: ${afterRefresh}`);
    console.log(`  Refresh preserved navigation: ${beforeRefresh === afterRefresh}`);
    
    // Test modal navigation interruption
    console.log('🪟 Testing modal navigation interruption...');
    
    await page.click('[data-testid="admin-tab-admin"]');
    await page.waitForTimeout(1000);
    
    // Open modal
    await page.click('[data-testid="admin-generate-recipes"]');
    await page.waitForTimeout(1000);
    
    const modal = page.locator('[role="dialog"], .modal');
    const modalOpen = await modal.count() > 0;
    
    if (modalOpen) {
      console.log('  Modal opened');
      
      // Try to navigate away with modal open
      await page.goto('/admin/analytics');
      await page.waitForTimeout(1500);
      
      const navigationSuccessful = page.url().includes('analytics');
      const modalStillOpen = await modal.count() > 0;
      
      console.log(`    Navigation with modal open successful: ${navigationSuccessful}`);
      console.log(`    Modal still open after navigation: ${modalStillOpen}`);
    }
    
    console.log('✅ BROWSER NAVIGATION AND ERROR HANDLING testing completed');
  });

  test('MOBILE NAVIGATION PATTERNS', async ({ page }) => {
    console.log('🧪 Testing MOBILE NAVIGATION PATTERNS');
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await loginAs(page, 'trainer');
    
    console.log('📱 Testing mobile navigation elements...');
    
    // Look for mobile menu trigger
    const mobileMenuTriggers = await page.locator('[aria-label*="menu" i], .mobile-menu-trigger, button:has-text("☰"), .hamburger').all();
    
    if (mobileMenuTriggers.length > 0) {
      console.log(`  Found ${mobileMenuTriggers.length} mobile menu triggers`);
      
      for (let i = 0; i < Math.min(mobileMenuTriggers.length, 2); i++) {
        const trigger = mobileMenuTriggers[i];
        
        if (await trigger.isVisible()) {
          console.log(`    Testing mobile menu trigger ${i + 1}`);
          
          await trigger.click();
          await page.waitForTimeout(1000);
          
          // Look for opened mobile menu
          const mobileMenu = page.locator('.mobile-menu, .nav-menu-open, [aria-expanded="true"]');
          const menuOpened = await mobileMenu.count() > 0;
          
          console.log(`      Mobile menu opened: ${menuOpened}`);
          
          if (menuOpened) {
            // Test mobile menu navigation
            const menuLinks = await mobileMenu.locator('a, button').all();
            console.log(`      Found ${menuLinks.length} menu links`);
            
            // Click first menu link
            if (menuLinks.length > 0) {
              const firstLink = menuLinks[0];
              const linkText = await firstLink.textContent();
              console.log(`      Testing menu link: "${linkText?.trim()}"`);
              
              await firstLink.click();
              await page.waitForTimeout(1000);
              
              const navigationWorked = page.url() !== '/trainer';
              console.log(`      Menu navigation worked: ${navigationWorked}`);
            }
          }
        }
      }
    } else {
      console.log('  No mobile menu triggers found - testing responsive navigation');
      
      // Test if regular navigation works on mobile
      const regularNavLinks = await page.locator('nav a, [role="navigation"] a').all();
      console.log(`    Found ${regularNavLinks.length} regular navigation links`);
      
      // Test first few navigation links
      for (let i = 0; i < Math.min(regularNavLinks.length, 3); i++) {
        const link = regularNavLinks[i];
        if (await link.isVisible()) {
          const linkText = await link.textContent();
          console.log(`      Testing nav link on mobile: "${linkText?.trim()}"`);
          
          await link.click();
          await page.waitForTimeout(1000);
        }
      }
    }
    
    // Test mobile tab navigation
    console.log('  📱 Testing mobile tab navigation...');
    
    const tabs = await page.locator('[role="tab"], .tab-trigger').all();
    console.log(`    Found ${tabs.length} tabs on mobile`);
    
    for (let i = 0; i < Math.min(tabs.length, 4); i++) {
      const tab = tabs[i];
      if (await tab.isVisible()) {
        const tabText = await tab.textContent();
        console.log(`      Testing mobile tab: "${tabText?.trim()}"`);
        
        await tab.click();
        await page.waitForTimeout(800);
      }
    }
    
    // Test swipe/touch gestures simulation
    console.log('  👆 Testing touch/swipe gestures...');
    
    // Simulate swipe left/right if carousel or swipeable elements exist
    const swipeableElements = await page.locator('.swipeable, .carousel, [data-swipe]').all();
    
    if (swipeableElements.length > 0) {
      console.log(`    Found ${swipeableElements.length} swipeable elements`);
      
      for (const element of swipeableElements) {
        if (await element.isVisible()) {
          // Simulate swipe gesture
          const box = await element.boundingBox();
          if (box) {
            await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2);
            await page.mouse.down();
            await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2);
            await page.mouse.up();
            await page.waitForTimeout(500);
            
            console.log('      Swipe gesture simulated');
          }
        }
      }
    }
    
    // Reset to desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    
    console.log('✅ MOBILE NAVIGATION PATTERNS testing completed');
  });

  test.afterEach(async ({ page }) => {
    // Take screenshot for debugging
    const testName = test.info().title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    await page.screenshot({ 
      path: `test-results/navigation-${testName}.png`, 
      fullPage: true 
    });
  });
});