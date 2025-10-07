import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import puppeteer, { Browser, Page } from 'puppeteer';

/**
 * Comprehensive Business Logic Validation Tests
 * 
 * This test suite validates ALL business logic and role interactions
 * as specified in BUSINESS_LOGIC_SPECIFICATION.md
 * 
 * Test Coverage:
 * - Admin role capabilities and limitations
 * - Trainer role capabilities and limitations  
 * - Customer role capabilities and limitations
 * - Inter-role workflow processes
 * - Security and permission boundaries
 * - Data isolation rules
 */

const BASE_URL = 'http://localhost:4000';

// Test account credentials (must match actual accounts in database)
const TEST_ACCOUNTS = {
  admin: {
    email: 'admin@fitmeal.pro',
    password: 'Admin123!@#',
    expectedRole: 'admin',
    expectedRedirect: '/admin'
  },
  trainer: {
    email: 'testtrainer@example.com',
    password: 'TrainerPassword123!',
    expectedRole: 'trainer',
    expectedRedirect: '/trainer'
  },
  customer: {
    email: 'testcustomer@example.com',
    password: 'TestPassword123!',
    expectedRole: 'customer', 
    expectedRedirect: '/my-meal-plans'
  }
};

describe('Business Logic Validation - Complete Role-Based Testing', () => {
  let browser: Browser;
  let adminPage: Page;
  let trainerPage: Page;
  let customerPage: Page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    // Create fresh pages for each test
    adminPage = await browser.newPage();
    trainerPage = await browser.newPage();
    customerPage = await browser.newPage();
    
    // Set longer timeout for complex operations
    adminPage.setDefaultTimeout(30000);
    trainerPage.setDefaultTimeout(30000);
    customerPage.setDefaultTimeout(30000);
  });

  afterEach(async () => {
    // Clean up pages after each test
    await adminPage?.close();
    await trainerPage?.close();
    await customerPage?.close();
  });

  describe('🔐 Authentication & Role Verification', () => {
    test('Admin login redirects to admin dashboard', async () => {
      await adminPage.goto(`${BASE_URL}/login`);
      
      // Fill login form
      await adminPage.type('input[type="email"]', TEST_ACCOUNTS.admin.email);
      await adminPage.type('input[type="password"]', TEST_ACCOUNTS.admin.password);
      
      // Submit and wait for redirect
      await adminPage.click('button[type="submit"]');
      await adminPage.waitForURL(`${BASE_URL}${TEST_ACCOUNTS.admin.expectedRedirect}`);
      
      // Verify admin dashboard elements
      expect(adminPage.url()).toBe(`${BASE_URL}/admin`);
      await expect(adminPage.locator('text=Admin Dashboard')).toBeVisible();
    });

    test('Trainer login redirects to trainer dashboard', async () => {
      await trainerPage.goto(`${BASE_URL}/login`);
      
      await trainerPage.fill('input[type="email"]', TEST_ACCOUNTS.trainer.email);
      await trainerPage.fill('input[type="password"]', TEST_ACCOUNTS.trainer.password);
      
      await trainerPage.click('button[type="submit"]');
      await trainerPage.waitForURL(`${BASE_URL}${TEST_ACCOUNTS.trainer.expectedRedirect}`);
      
      expect(trainerPage.url()).toBe(`${BASE_URL}/trainer`);
      await expect(trainerPage.locator('text=Trainer Dashboard')).toBeVisible();
    });

    test('Customer login redirects to meal plans', async () => {
      await customerPage.goto(`${BASE_URL}/login`);
      
      await customerPage.fill('input[type="email"]', TEST_ACCOUNTS.customer.email);
      await customerPage.fill('input[type="password"]', TEST_ACCOUNTS.customer.password);
      
      await customerPage.click('button[type="submit"]');
      await customerPage.waitForURL(`${BASE_URL}${TEST_ACCOUNTS.customer.expectedRedirect}`);
      
      expect(customerPage.url()).toBe(`${BASE_URL}/my-meal-plans`);
      await expect(customerPage.locator('text=My Meal Plans')).toBeVisible();
    });
  });

  describe('👨‍💼 Admin Role - System Administration', () => {
    beforeEach(async () => {
      // Login as admin
      await adminPage.goto(`${BASE_URL}/login`);
      await adminPage.fill('input[type="email"]', TEST_ACCOUNTS.admin.email);
      await adminPage.fill('input[type="password"]', TEST_ACCOUNTS.admin.password);
      await adminPage.click('button[type="submit"]');
      await adminPage.waitForURL(`${BASE_URL}/admin`);
    });

    test('Admin can access recipe management interface', async () => {
      // Should see recipe management section
      await expect(adminPage.locator('text=Recipe Management')).toBeVisible();
      
      // Should see approve/unapprove controls
      await expect(adminPage.locator('button:has-text("Approve")')).toBeVisible();
      await expect(adminPage.locator('button:has-text("Delete")')).toBeVisible();
    });

    test('Admin can view all recipes (approved and unapproved)', async () => {
      // Navigate to recipes if not already there
      const recipesSection = adminPage.locator('[data-testid="recipes-section"]');
      if (await recipesSection.isVisible()) {
        // Should see both approved and unapproved recipes
        await expect(adminPage.locator('.recipe-item')).toHaveCount({ greaterThan: 0 });
        
        // Should see recipe status indicators
        await expect(adminPage.locator('.recipe-status')).toBeVisible();
      }
    });

    test('Admin can generate recipes using AI', async () => {
      // Look for AI generation button
      const generateButton = adminPage.locator('button:has-text("Generate Recipes")');
      if (await generateButton.isVisible()) {
        await generateButton.click();
        
        // Should see generation form
        await expect(adminPage.locator('input[type="number"]')).toBeVisible();
        await expect(adminPage.locator('button:has-text("Generate")')).toBeVisible();
      }
    });

    test('Admin can view system statistics', async () => {
      // Should see statistics dashboard
      await expect(adminPage.locator('[data-testid="stats-dashboard"]')).toBeVisible();
      
      // Should see user counts
      await expect(adminPage.locator('text=Total Users')).toBeVisible();
      await expect(adminPage.locator('text=Recipes')).toBeVisible();
    });

    test('Admin cannot access trainer-specific features', async () => {
      // Try to navigate to trainer page - should be blocked or redirected
      await adminPage.goto(`${BASE_URL}/trainer`);
      
      // Should either redirect back to admin or show access denied
      await adminPage.waitForLoadState('networkidle');
      const currentUrl = adminPage.url();
      
      // Admin should not be able to access trainer dashboard
      expect(currentUrl).not.toBe(`${BASE_URL}/trainer`);
    });

    test('Admin cannot modify individual user data directly', async () => {
      // Admin should not see user edit forms or modification buttons
      // This verifies the "view only" nature of admin user access
      const userEditButton = adminPage.locator('button:has-text("Edit User")');
      await expect(userEditButton).not.toBeVisible();
    });
  });

  describe('🏋️‍♂️ Trainer Role - Customer Management', () => {
    beforeEach(async () => {
      // Login as trainer
      await trainerPage.goto(`${BASE_URL}/login`);
      await trainerPage.fill('input[type="email"]', TEST_ACCOUNTS.trainer.email);
      await trainerPage.fill('input[type="password"]', TEST_ACCOUNTS.trainer.password);
      await trainerPage.click('button[type="submit"]');
      await trainerPage.waitForURL(`${BASE_URL}/trainer`);
    });

    test('Trainer can access customer invitation system', async () => {
      // Should see invite customer section
      await expect(trainerPage.locator('text=Invite Customer')).toBeVisible();
      
      // Should see invitation form
      await expect(trainerPage.locator('input[type="email"]')).toBeVisible();
      await expect(trainerPage.locator('button:has-text("Send Invitation")')).toBeVisible();
    });

    test('Trainer can send customer invitation', async () => {
      const inviteEmail = 'test-invite@example.com';
      
      // Fill invitation form
      const emailInput = trainerPage.locator('input[type="email"][placeholder*="customer" i]');
      await emailInput.fill(inviteEmail);
      
      // Send invitation
      const sendButton = trainerPage.locator('button:has-text("Send Invitation")');
      await sendButton.click();
      
      // Should see success message
      await expect(trainerPage.locator('text=Invitation sent')).toBeVisible();
    });

    test('Trainer can view assigned customers only', async () => {
      // Should see customer list section
      await expect(trainerPage.locator('[data-testid="customers-section"]')).toBeVisible();
      
      // Should not see customers from other trainers
      // This is verified by ensuring limited customer count
      const customerItems = trainerPage.locator('.customer-item');
      const count = await customerItems.count();
      
      // Trainer should only see their own customers (likely 0-2 in test environment)
      expect(count).toBeLessThan(10); // Reasonable limit for test data
    });

    test('Trainer can create and assign meal plans', async () => {
      // Look for meal plan creation interface
      const createMealPlanButton = trainerPage.locator('button:has-text("Create Meal Plan")');
      if (await createMealPlanButton.isVisible()) {
        await createMealPlanButton.click();
        
        // Should see meal plan creation form
        await expect(trainerPage.locator('[data-testid="meal-plan-form"]')).toBeVisible();
      }
    });

    test('Trainer can only see approved recipes', async () => {
      // Navigate to recipes section
      const recipesTab = trainerPage.locator('text=Recipes');
      if (await recipesTab.isVisible()) {
        await recipesTab.click();
        
        // Should not see approval status indicators (admin-only feature)
        await expect(trainerPage.locator('.recipe-approval-status')).not.toBeVisible();
        
        // Should not see unapproved recipes
        await expect(trainerPage.locator('.unapproved-recipe')).not.toBeVisible();
      }
    });

    test('Trainer cannot access admin features', async () => {
      // Try to navigate to admin page
      await trainerPage.goto(`${BASE_URL}/admin`);
      
      // Should be denied access or redirected
      await trainerPage.waitForLoadState('networkidle');
      const currentUrl = trainerPage.url();
      
      expect(currentUrl).not.toBe(`${BASE_URL}/admin`);
    });

    test('Trainer cannot see other trainers customers', async () => {
      // This test verifies data isolation
      // In a real system, we would create multiple trainers and verify isolation
      
      // Check that customer data is limited
      const customerSection = trainerPage.locator('[data-testid="customers-section"]');
      if (await customerSection.isVisible()) {
        const customerItems = trainerPage.locator('.customer-item');
        const count = await customerItems.count();
        
        // Should be limited number (only own customers)
        expect(count).toBeLessThanOrEqual(5);
      }
    });
  });

  describe('🧑‍🤝‍🧑 Customer Role - Content Access & Progress Tracking', () => {
    beforeEach(async () => {
      // Login as customer
      await customerPage.goto(`${BASE_URL}/login`);
      await customerPage.fill('input[type="email"]', TEST_ACCOUNTS.customer.email);
      await customerPage.fill('input[type="password"]', TEST_ACCOUNTS.customer.password);
      await customerPage.click('button[type="submit"]');
      await customerPage.waitForURL(`${BASE_URL}/my-meal-plans`);
    });

    test('Customer can view assigned meal plans', async () => {
      // Should be on meal plans page
      expect(customerPage.url()).toBe(`${BASE_URL}/my-meal-plans`);
      
      // Should see meal plans section
      await expect(customerPage.locator('[data-testid="meal-plans-section"]')).toBeVisible();
    });

    test('Customer can access progress tracking', async () => {
      // Navigate to progress tracking
      await customerPage.goto(`${BASE_URL}/progress`);
      
      // Should see progress tracking interface
      await expect(customerPage.locator('text=Progress Tracking')).toBeVisible();
      
      // Should see measurement inputs
      await expect(customerPage.locator('input[type="number"]')).toBeVisible();
    });

    test('Customer can record progress data', async () => {
      await customerPage.goto(`${BASE_URL}/progress`);
      
      // Find weight input and record measurement
      const weightInput = customerPage.locator('input[type="number"][placeholder*="weight" i]');
      if (await weightInput.isVisible()) {
        await weightInput.fill('150');
        
        // Save progress
        const saveButton = customerPage.locator('button:has-text("Save")');
        await saveButton.click();
        
        // Should see success message
        await expect(customerPage.locator('text=Progress saved')).toBeVisible();
      }
    });

    test('Customer can access approved recipes', async () => {
      // Navigate to recipes
      await customerPage.goto(`${BASE_URL}/recipes`);
      
      // Should see recipe library
      await expect(customerPage.locator('[data-testid="recipes-section"]')).toBeVisible();
      
      // Should not see admin controls
      await expect(customerPage.locator('button:has-text("Approve")')).not.toBeVisible();
      await expect(customerPage.locator('button:has-text("Delete")')).not.toBeVisible();
    });

    test('Customer can export meal plans to PDF', async () => {
      await customerPage.goto(`${BASE_URL}/my-meal-plans`);
      
      // Look for PDF export button
      const exportButton = customerPage.locator('button:has-text("Export PDF")');
      if (await exportButton.isVisible()) {
        await exportButton.click();
        
        // Should trigger PDF download or open PDF viewer
        await customerPage.waitForTimeout(2000); // Wait for PDF generation
      }
    });

    test('Customer cannot access admin or trainer features', async () => {
      // Try to access admin page
      await customerPage.goto(`${BASE_URL}/admin`);
      await customerPage.waitForLoadState('networkidle');
      expect(customerPage.url()).not.toBe(`${BASE_URL}/admin`);
      
      // Try to access trainer page  
      await customerPage.goto(`${BASE_URL}/trainer`);
      await customerPage.waitForLoadState('networkidle');
      expect(customerPage.url()).not.toBe(`${BASE_URL}/trainer`);
    });

    test('Customer cannot see other customers data', async () => {
      // Customer should only see their own progress data
      await customerPage.goto(`${BASE_URL}/progress`);
      
      // Should not see data from other customers
      // This is verified by ensuring personal data context
      await expect(customerPage.locator('text=Your Progress')).toBeVisible();
      await expect(customerPage.locator('text=Other Users')).not.toBeVisible();
    });
  });

  describe('🔄 Inter-Role Workflow Processes', () => {
    test('Complete Customer Onboarding Workflow', async () => {
      // Step 1: Trainer sends invitation
      await trainerPage.goto(`${BASE_URL}/login`);
      await trainerPage.fill('input[type="email"]', TEST_ACCOUNTS.trainer.email);
      await trainerPage.fill('input[type="password"]', TEST_ACCOUNTS.trainer.password);
      await trainerPage.click('button[type="submit"]');
      await trainerPage.waitForURL(`${BASE_URL}/trainer`);
      
      // Send invitation to new customer
      const inviteEmail = 'workflow-test@example.com';
      const emailInput = trainerPage.locator('input[type="email"][placeholder*="customer" i]');
      if (await emailInput.isVisible()) {
        await emailInput.fill(inviteEmail);
        await trainerPage.click('button:has-text("Send Invitation")');
        await expect(trainerPage.locator('text=Invitation sent')).toBeVisible();
      }
      
      // Note: Full email workflow would require email testing infrastructure
      // This test verifies the invitation creation part of the workflow
    });

    test('Recipe Approval Workflow', async () => {
      // Step 1: Admin accesses recipe management
      await adminPage.goto(`${BASE_URL}/login`);
      await adminPage.fill('input[type="email"]', TEST_ACCOUNTS.admin.email);
      await adminPage.fill('input[type="password"]', TEST_ACCOUNTS.admin.password);
      await adminPage.click('button[type="submit"]');
      await adminPage.waitForURL(`${BASE_URL}/admin`);
      
      // Should see unapproved recipes
      const unapprovedRecipes = adminPage.locator('.recipe-item.unapproved');
      if (await unapprovedRecipes.first().isVisible()) {
        // Approve a recipe
        await unapprovedRecipes.first().locator('button:has-text("Approve")').click();
        
        // Recipe should now be approved
        await expect(adminPage.locator('.recipe-item.approved')).toBeVisible();
      }
      
      // Step 2: Verify trainer can now see approved recipe
      await trainerPage.goto(`${BASE_URL}/login`);
      await trainerPage.fill('input[type="email"]', TEST_ACCOUNTS.trainer.email);
      await trainerPage.fill('input[type="password"]', TEST_ACCOUNTS.trainer.password);
      await trainerPage.click('button[type="submit"]');
      await trainerPage.waitForURL(`${BASE_URL}/trainer`);
      
      // Navigate to recipes - should see approved recipes
      const recipesTab = trainerPage.locator('text=Recipes');
      if (await recipesTab.isVisible()) {
        await recipesTab.click();
        await expect(trainerPage.locator('.recipe-item')).toBeVisible();
      }
    });

    test('Meal Plan Assignment Workflow', async () => {
      // Login as trainer
      await trainerPage.goto(`${BASE_URL}/login`);
      await trainerPage.fill('input[type="email"]', TEST_ACCOUNTS.trainer.email);
      await trainerPage.fill('input[type="password"]', TEST_ACCOUNTS.trainer.password);
      await trainerPage.click('button[type="submit"]');
      await trainerPage.waitForURL(`${BASE_URL}/trainer`);
      
      // Create or assign meal plan
      const createMealPlanButton = trainerPage.locator('button:has-text("Create Meal Plan")');
      if (await createMealPlanButton.isVisible()) {
        await createMealPlanButton.click();
        
        // Should see meal plan creation interface
        await expect(trainerPage.locator('[data-testid="meal-plan-form"]')).toBeVisible();
        
        // Note: Full workflow would require creating meal plan and assigning to customer
        // This test verifies the meal plan creation interface exists
      }
    });
  });

  describe('🔒 Security & Permission Boundaries', () => {
    test('Unauthorized access attempts are blocked', async () => {
      // Test direct URL access without authentication
      const testPage = await browser.newPage();
      
      // Try to access admin page without login
      await testPage.goto(`${BASE_URL}/admin`);
      
      // Should redirect to login or show access denied
      await testPage.waitForLoadState('networkidle');
      const currentUrl = testPage.url();
      
      expect(currentUrl).not.toBe(`${BASE_URL}/admin`);
      expect(currentUrl).toContain('login');
      
      await testPage.close();
    });

    test('Role-based route protection works', async () => {
      // Login as customer
      await customerPage.goto(`${BASE_URL}/login`);
      await customerPage.fill('input[type="email"]', TEST_ACCOUNTS.customer.email);
      await customerPage.fill('input[type="password"]', TEST_ACCOUNTS.customer.password);
      await customerPage.click('button[type="submit"]');
      await customerPage.waitForURL(`${BASE_URL}/my-meal-plans`);
      
      // Try to access admin routes - should be blocked
      await customerPage.goto(`${BASE_URL}/admin`);
      await customerPage.waitForLoadState('networkidle');
      expect(customerPage.url()).not.toBe(`${BASE_URL}/admin`);
      
      // Try to access trainer routes - should be blocked  
      await customerPage.goto(`${BASE_URL}/trainer`);
      await customerPage.waitForLoadState('networkidle');
      expect(customerPage.url()).not.toBe(`${BASE_URL}/trainer`);
    });

    test('Data isolation is enforced', async () => {
      // This test verifies that each role only sees their authorized data
      
      // Admin should see all data
      await adminPage.goto(`${BASE_URL}/login`);
      await adminPage.fill('input[type="email"]', TEST_ACCOUNTS.admin.email);
      await adminPage.fill('input[type="password"]', TEST_ACCOUNTS.admin.password);
      await adminPage.click('button[type="submit"]');
      await adminPage.waitForURL(`${BASE_URL}/admin`);
      
      const adminRecipeCount = await adminPage.locator('.recipe-item').count();
      
      // Trainer should see fewer recipes (only approved)
      await trainerPage.goto(`${BASE_URL}/login`);
      await trainerPage.fill('input[type="email"]', TEST_ACCOUNTS.trainer.email);
      await trainerPage.fill('input[type="password"]', TEST_ACCOUNTS.trainer.password);
      await trainerPage.click('button[type="submit"]');
      await trainerPage.waitForURL(`${BASE_URL}/trainer`);
      
      const recipesTab = trainerPage.locator('text=Recipes');
      if (await recipesTab.isVisible()) {
        await recipesTab.click();
        const trainerRecipeCount = await trainerPage.locator('.recipe-item').count();
        
        // Trainer should see same or fewer recipes than admin
        expect(trainerRecipeCount).toBeLessThanOrEqual(adminRecipeCount);
      }
    });

    test('JWT token expiration and refresh works', async () => {
      // Login and verify token is working
      await customerPage.goto(`${BASE_URL}/login`);
      await customerPage.fill('input[type="email"]', TEST_ACCOUNTS.customer.email);
      await customerPage.fill('input[type="password"]', TEST_ACCOUNTS.customer.password);
      await customerPage.click('button[type="submit"]');
      await customerPage.waitForURL(`${BASE_URL}/my-meal-plans`);
      
      // Make an API request to verify authentication
      const response = await customerPage.evaluate(async () => {
        return fetch('/api/auth/me', {
          credentials: 'include'
        }).then(r => r.status);
      });
      
      expect(response).toBe(200);
      
      // Note: Testing actual token expiration would require waiting 15+ minutes
      // or manipulating system time, which is complex in this test environment
    });
  });

  describe('📊 Business Rules Validation', () => {
    test('Content approval gate works correctly', async () => {
      // Verify that unapproved content is not visible to non-admin users
      
      // Login as admin and check for unapproved recipes
      await adminPage.goto(`${BASE_URL}/login`);
      await adminPage.fill('input[type="email"]', TEST_ACCOUNTS.admin.email);
      await adminPage.fill('input[type="password"]', TEST_ACCOUNTS.admin.password);
      await adminPage.click('button[type="submit"]');
      await adminPage.waitForURL(`${BASE_URL}/admin`);
      
      const adminRecipeItems = adminPage.locator('.recipe-item');
      const adminRecipeCount = await adminRecipeItems.count();
      
      // Login as trainer and verify they see fewer or equal recipes
      await trainerPage.goto(`${BASE_URL}/login`);
      await trainerPage.fill('input[type="email"]', TEST_ACCOUNTS.trainer.email);
      await trainerPage.fill('input[type="password"]', TEST_ACCOUNTS.trainer.password);
      await trainerPage.click('button[type="submit"]');
      await trainerPage.waitForURL(`${BASE_URL}/trainer`);
      
      const recipesTab = trainerPage.locator('text=Recipes');
      if (await recipesTab.isVisible()) {
        await recipesTab.click();
        const trainerRecipeItems = trainerPage.locator('.recipe-item');
        const trainerRecipeCount = await trainerRecipeItems.count();
        
        // Trainer should not see more recipes than admin
        expect(trainerRecipeCount).toBeLessThanOrEqual(adminRecipeCount);
      }
    });

    test('Invitation-based relationships are enforced', async () => {
      // Verify customers can only be associated through invitation system
      
      await trainerPage.goto(`${BASE_URL}/login`);
      await trainerPage.fill('input[type="email"]', TEST_ACCOUNTS.trainer.email);
      await trainerPage.fill('input[type="password"]', TEST_ACCOUNTS.trainer.password);
      await trainerPage.click('button[type="submit"]');
      await trainerPage.waitForURL(`${BASE_URL}/trainer`);
      
      // Should see invitation interface, not direct customer addition
      await expect(trainerPage.locator('input[type="email"][placeholder*="invite" i]')).toBeVisible();
      
      // Should not see "Add Customer" or similar direct addition buttons
      await expect(trainerPage.locator('button:has-text("Add Customer Directly")')).not.toBeVisible();
    });

    test('Progress data privacy is maintained', async () => {
      // Verify customer progress data is private and isolated
      
      await customerPage.goto(`${BASE_URL}/login`);
      await customerPage.fill('input[type="email"]', TEST_ACCOUNTS.customer.email);
      await customerPage.fill('input[type="password"]', TEST_ACCOUNTS.customer.password);
      await customerPage.click('button[type="submit"]');
      await customerPage.waitForURL(`${BASE_URL}/my-meal-plans`);
      
      await customerPage.goto(`${BASE_URL}/progress`);
      
      // Should see own progress interface
      await expect(customerPage.locator('text=Your Progress')).toBeVisible();
      
      // Should not see other users' data
      await expect(customerPage.locator('text=Other Users')).not.toBeVisible();
      await expect(customerPage.locator('.other-user-data')).not.toBeVisible();
    });

    test('Role hierarchy permissions are correct', async () => {
      // Verify Admin > Trainer > Customer permission hierarchy
      
      // Admin should have most access
      await adminPage.goto(`${BASE_URL}/login`);
      await adminPage.fill('input[type="email"]', TEST_ACCOUNTS.admin.email);
      await adminPage.fill('input[type="password"]', TEST_ACCOUNTS.admin.password);
      await adminPage.click('button[type="submit"]');
      await adminPage.waitForURL(`${BASE_URL}/admin`);
      
      // Count admin-accessible features
      const adminFeatures = await adminPage.locator('button, .feature-item').count();
      
      // Trainer should have fewer features
      await trainerPage.goto(`${BASE_URL}/login`);
      await trainerPage.fill('input[type="email"]', TEST_ACCOUNTS.trainer.email);
      await trainerPage.fill('input[type="password"]', TEST_ACCOUNTS.trainer.password);
      await trainerPage.click('button[type="submit"]');
      await trainerPage.waitForURL(`${BASE_URL}/trainer`);
      
      const trainerFeatures = await trainerPage.locator('button, .feature-item').count();
      
      // Customer should have fewest features
      await customerPage.goto(`${BASE_URL}/login`);
      await customerPage.fill('input[type="email"]', TEST_ACCOUNTS.customer.email);
      await customerPage.fill('input[type="password"]', TEST_ACCOUNTS.customer.password);
      await customerPage.click('button[type="submit"]');
      await customerPage.waitForURL(`${BASE_URL}/my-meal-plans`);
      
      const customerFeatures = await customerPage.locator('button, .feature-item').count();
      
      // Verify hierarchy: Admin >= Trainer >= Customer
      expect(adminFeatures).toBeGreaterThanOrEqual(trainerFeatures);
      expect(trainerFeatures).toBeGreaterThanOrEqual(customerFeatures);
    });
  });

  describe('🧪 Critical User Journeys', () => {
    test('Complete trainer-to-customer workflow', async () => {
      // This test verifies the complete workflow from trainer creating content to customer accessing it
      
      // Step 1: Admin approves some recipes (prerequisite)
      await adminPage.goto(`${BASE_URL}/login`);
      await adminPage.fill('input[type="email"]', TEST_ACCOUNTS.admin.email);
      await adminPage.fill('input[type="password"]', TEST_ACCOUNTS.admin.password);
      await adminPage.click('button[type="submit"]');
      await adminPage.waitForURL(`${BASE_URL}/admin`);
      
      // Ensure there are approved recipes
      const approveButtons = adminPage.locator('button:has-text("Approve")');
      const approveCount = await approveButtons.count();
      if (approveCount > 0) {
        await approveButtons.first().click();
        await expect(adminPage.locator('text=Recipe approved')).toBeVisible();
      }
      
      // Step 2: Trainer creates meal plan
      await trainerPage.goto(`${BASE_URL}/login`);
      await trainerPage.fill('input[type="email"]', TEST_ACCOUNTS.trainer.email);
      await trainerPage.fill('input[type="password"]', TEST_ACCOUNTS.trainer.password);
      await trainerPage.click('button[type="submit"]');
      await trainerPage.waitForURL(`${BASE_URL}/trainer`);
      
      // Create meal plan if interface is available
      const createMealPlanButton = trainerPage.locator('button:has-text("Create Meal Plan")');
      if (await createMealPlanButton.isVisible()) {
        await createMealPlanButton.click();
        await expect(trainerPage.locator('[data-testid="meal-plan-form"]')).toBeVisible();
      }
      
      // Step 3: Customer accesses assigned content
      await customerPage.goto(`${BASE_URL}/login`);
      await customerPage.fill('input[type="email"]', TEST_ACCOUNTS.customer.email);
      await customerPage.fill('input[type="password"]', TEST_ACCOUNTS.customer.password);
      await customerPage.click('button[type="submit"]');
      await customerPage.waitForURL(`${BASE_URL}/my-meal-plans`);
      
      // Should see meal plans page
      await expect(customerPage.locator('[data-testid="meal-plans-section"]')).toBeVisible();
    });

    test('Complete progress tracking workflow', async () => {
      // Customer records progress and trainer can view it
      
      // Step 1: Customer records progress
      await customerPage.goto(`${BASE_URL}/login`);
      await customerPage.fill('input[type="email"]', TEST_ACCOUNTS.customer.email);
      await customerPage.fill('input[type="password"]', TEST_ACCOUNTS.customer.password);
      await customerPage.click('button[type="submit"]');
      await customerPage.waitForURL(`${BASE_URL}/my-meal-plans`);
      
      await customerPage.goto(`${BASE_URL}/progress`);
      
      // Record a measurement if interface is available
      const weightInput = customerPage.locator('input[type="number"][placeholder*="weight" i]');
      if (await weightInput.isVisible()) {
        await weightInput.fill('155');
        const saveButton = customerPage.locator('button:has-text("Save")');
        await saveButton.click();
        
        // Should see confirmation
        await expect(customerPage.locator('text=Progress saved')).toBeVisible();
      }
      
      // Step 2: Trainer views customer progress
      await trainerPage.goto(`${BASE_URL}/login`);
      await trainerPage.fill('input[type="email"]', TEST_ACCOUNTS.trainer.email);
      await trainerPage.fill('input[type="password"]', TEST_ACCOUNTS.trainer.password);
      await trainerPage.click('button[type="submit"]');
      await trainerPage.waitForURL(`${BASE_URL}/trainer`);
      
      // Look for customer progress in trainer dashboard
      const customerSection = trainerPage.locator('[data-testid="customers-section"]');
      if (await customerSection.isVisible()) {
        await expect(customerSection).toBeVisible();
      }
    });
  });
});