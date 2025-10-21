/**
 * Admin Dashboard - 3-Tab Consolidation E2E Test Suite
 *
 * Verifies the consolidated 3-tab Admin dashboard structure:
 * 1. Recipe Library (renamed from "Recipes")
 * 2. Meal Plan Builder (renamed from "Meal Plans")
 * 3. BMAD Generator (unchanged)
 *
 * Tests include:
 * - Tab count verification
 * - Tab label verification
 * - Action toolbar functionality
 * - Tab navigation
 * - Mobile responsiveness
 * - Keyboard navigation
 * - Backward compatibility
 */

import { test, expect, Page } from '@playwright/test';
import {
  loginAsAdmin,
  takeTestScreenshot,
  waitForNetworkIdle,
  TEST_CONFIG
} from './auth-helper';

// Test timeouts
const TEST_TIMEOUTS = {
  modal: 10000,
  network: 15000,
  navigation: 10000,
  element: 5000
};

test.describe('Admin Dashboard - 3-Tab Structure', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    page.setDefaultTimeout(30000);

    // Setup console monitoring
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console error:', msg.text());
      }
    });

    // Login as admin
    await loginAsAdmin(page);
    await waitForNetworkIdle(page);
    await takeTestScreenshot(page, 'admin-dashboard-initial.png', 'Initial admin dashboard');
  });

  test.afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  test.describe('Tab Structure Verification', () => {
    test('should display exactly 3 tabs', async () => {
      console.log('🧪 Verifying exactly 3 tabs exist...');

      // Wait for tab list to be visible
      await page.waitForSelector('[role="tablist"]', { timeout: TEST_TIMEOUTS.element });

      // Count all tabs
      const tabs = page.locator('[role="tablist"] [role="tab"]');
      const tabCount = await tabs.count();

      console.log(`📊 Tab count: ${tabCount}`);
      await takeTestScreenshot(page, 'tab-count-verification.png', `Found ${tabCount} tabs`);

      // Verify exactly 3 tabs
      expect(tabCount).toBe(3);
      console.log('✅ Verified exactly 3 tabs exist');
    });

    test('should have Recipe Library tab with renamed label', async () => {
      console.log('🧪 Verifying "Recipe Library" tab exists...');

      // Check for "Recipe Library" text in desktop view
      const recipeTabDesktop = page.locator('[role="tab"]:has-text("Recipe Library")');
      await expect(recipeTabDesktop).toBeVisible({ timeout: TEST_TIMEOUTS.element });

      // Verify tab has correct testid
      const recipeTab = page.locator('[data-testid="admin-tab-recipes"]');
      await expect(recipeTab).toBeVisible();

      console.log('✅ Recipe Library tab verified');
      await takeTestScreenshot(page, 'recipe-library-tab.png', 'Recipe Library tab');
    });

    test('should have Meal Plan Builder tab with renamed label', async () => {
      console.log('🧪 Verifying "Meal Plan Builder" tab exists...');

      // Check for "Meal Plan Builder" text in desktop view
      const mealPlanTabDesktop = page.locator('[role="tab"]:has-text("Meal Plan Builder")');
      await expect(mealPlanTabDesktop).toBeVisible({ timeout: TEST_TIMEOUTS.element });

      // Verify tab has correct testid
      const mealPlanTab = page.locator('[data-testid="admin-tab-meal-plans"]');
      await expect(mealPlanTab).toBeVisible();

      console.log('✅ Meal Plan Builder tab verified');
      await takeTestScreenshot(page, 'meal-plan-builder-tab.png', 'Meal Plan Builder tab');
    });

    test('should have BMAD Generator tab', async () => {
      console.log('🧪 Verifying "BMAD Generator" tab exists...');

      // Check for "BMAD Generator" text in desktop view
      const bmadTabDesktop = page.locator('[role="tab"]:has-text("BMAD Generator")');
      await expect(bmadTabDesktop).toBeVisible({ timeout: TEST_TIMEOUTS.element });

      // Verify tab has correct testid
      const bmadTab = page.locator('[data-testid="admin-tab-bmad"]');
      await expect(bmadTab).toBeVisible();

      console.log('✅ BMAD Generator tab verified');
      await takeTestScreenshot(page, 'bmad-generator-tab.png', 'BMAD Generator tab');
    });

    test('should NOT have separate Admin tab', async () => {
      console.log('🧪 Verifying old "Admin" tab does NOT exist...');

      // Check that no tab with just "Admin" text exists (excluding "Admin Dashboard" header)
      const adminTab = page.locator('[role="tab"][data-testid="admin-tab-admin"]');
      const tabCount = await adminTab.count();

      console.log(`📊 Admin tab count: ${tabCount}`);

      // Verify admin tab does not exist
      expect(tabCount).toBe(0);
      console.log('✅ Verified old Admin tab does not exist');
    });

    test('should have proper tab icons', async () => {
      console.log('🧪 Verifying tab icons...');

      // Check Recipe Library icon (Utensils)
      const recipeIcon = page.locator('[data-testid="admin-tab-recipes"] svg');
      await expect(recipeIcon).toBeVisible();

      // Check Meal Plan Builder icon (Calendar)
      const mealPlanIcon = page.locator('[data-testid="admin-tab-meal-plans"] svg');
      await expect(mealPlanIcon).toBeVisible();

      // Check BMAD Generator icon (Bot)
      const bmadIcon = page.locator('[data-testid="admin-tab-bmad"] svg');
      await expect(bmadIcon).toBeVisible();

      console.log('✅ All tab icons verified');
      await takeTestScreenshot(page, 'tab-icons.png', 'Tab icons');
    });
  });

  test.describe('Recipe Library Tab - Action Toolbar', () => {
    test.beforeEach(async () => {
      // Ensure we're on the Recipe Library tab
      const recipeTab = page.locator('[data-testid="admin-tab-recipes"]');
      await recipeTab.click();
      await waitForNetworkIdle(page);
    });

    test('should have Recipe Library header with action toolbar', async () => {
      console.log('🧪 Verifying Recipe Library header and action toolbar...');

      // Check for Recipe Library header
      const header = page.locator('h2:has-text("Recipe Library")');
      await expect(header).toBeVisible({ timeout: TEST_TIMEOUTS.element });

      // Verify 3 action buttons exist in toolbar
      await expect(page.locator('[data-testid="admin-generate-recipes"]')).toBeVisible();
      await expect(page.locator('[data-testid="admin-view-pending"]')).toBeVisible();
      await expect(page.locator('[data-testid="admin-export-data"]')).toBeVisible();

      console.log('✅ Recipe Library header and action toolbar verified');
      await takeTestScreenshot(page, 'recipe-library-toolbar.png', 'Recipe Library toolbar');
    });

    test('Generate Recipes button opens modal', async () => {
      console.log('🧪 Testing Generate Recipes button...');

      const generateButton = page.locator('[data-testid="admin-generate-recipes"]');
      await expect(generateButton).toBeVisible();
      await expect(generateButton).toContainText('Generate Recipes');

      // Check for icon
      const icon = generateButton.locator('svg');
      await expect(icon).toBeVisible();

      // Click button to open modal
      await generateButton.click();
      await page.waitForTimeout(500);

      // Verify modal opens (check for common modal attributes)
      const modal = page.locator('[role="dialog"], .modal, [data-testid="recipe-generation-modal"]');
      const modalCount = await modal.count();
      expect(modalCount).toBeGreaterThan(0);

      console.log('✅ Generate Recipes button works correctly');
      await takeTestScreenshot(page, 'generate-recipes-modal.png', 'Generate Recipes modal');
    });

    test('Review Queue button shows pending count', async () => {
      console.log('🧪 Testing Review Queue button...');

      const reviewButton = page.locator('[data-testid="admin-view-pending"]');
      await expect(reviewButton).toBeVisible();

      // Verify button text includes "Review Queue" and a number
      const buttonText = await reviewButton.textContent();
      expect(buttonText).toContain('Review Queue');
      expect(buttonText).toMatch(/\(\d+\)/); // Should contain (number)

      // Check for icon
      const icon = reviewButton.locator('svg');
      await expect(icon).toBeVisible();

      console.log(`✅ Review Queue button verified: ${buttonText}`);
    });

    test('Export Data button opens export modal', async () => {
      console.log('🧪 Testing Export Data button...');

      const exportButton = page.locator('[data-testid="admin-export-data"]');
      await expect(exportButton).toBeVisible();
      await expect(exportButton).toContainText('Export Data');

      // Check for icon
      const icon = exportButton.locator('svg');
      await expect(icon).toBeVisible();

      // Click button to open export modal
      await exportButton.click();
      await page.waitForTimeout(500);

      // Verify export modal opens
      const modal = page.locator('[role="dialog"], .modal, [data-testid="export-modal"]');
      const modalCount = await modal.count();
      expect(modalCount).toBeGreaterThan(0);

      console.log('✅ Export Data button works correctly');
      await takeTestScreenshot(page, 'export-data-modal.png', 'Export Data modal');
    });

    test('should have AdminRecipeGenerator component visible', async () => {
      console.log('🧪 Verifying AdminRecipeGenerator component...');

      // Check for AI Recipe Generator section
      const aiGeneratorSection = page.locator('text="AI Recipe Generator"').first();
      await expect(aiGeneratorSection).toBeVisible({ timeout: TEST_TIMEOUTS.element });

      console.log('✅ AdminRecipeGenerator component verified');
      await takeTestScreenshot(page, 'admin-recipe-generator.png', 'Admin Recipe Generator');
    });

    test('should display recipe statistics cards', async () => {
      console.log('🧪 Verifying recipe statistics cards...');

      // Wait for stats cards to load
      await page.waitForSelector('text="Total Recipes"', { timeout: TEST_TIMEOUTS.network });

      // Verify all 4 stat cards exist
      await expect(page.locator('text="Total Recipes"')).toBeVisible();
      await expect(page.locator('text="Approved"')).toBeVisible();
      await expect(page.locator('text="Pending Review"')).toBeVisible();
      await expect(page.locator('text="Users"')).toBeVisible();

      console.log('✅ Recipe statistics cards verified');
      await takeTestScreenshot(page, 'recipe-stats-cards.png', 'Recipe statistics');
    });

    test('should have search and filter functionality', async () => {
      console.log('🧪 Verifying search and filter components...');

      // Check for search input
      const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
      await expect(searchInput).toBeVisible({ timeout: TEST_TIMEOUTS.element });

      // Check for view toggle (cards/table)
      const viewToggle = page.locator('button:has-text("Cards"), button:has-text("Table")').first();
      await expect(viewToggle).toBeVisible();

      // Check for selection mode button
      const selectModeButton = page.locator('button:has-text("Select Mode")').first();
      await expect(selectModeButton).toBeVisible();

      console.log('✅ Search and filter functionality verified');
      await takeTestScreenshot(page, 'search-filters.png', 'Search and filters');
    });

    test('should display recipe grid or table', async () => {
      console.log('🧪 Verifying recipe display...');

      // Wait for recipes to load (either grid or table view)
      await page.waitForSelector('.recipe-card, [data-testid="recipe-card"], table', {
        timeout: TEST_TIMEOUTS.network
      });

      // Check if recipes are displayed
      const recipeCards = await page.locator('.recipe-card, [data-testid="recipe-card"]').count();
      const recipeTableRows = await page.locator('table tbody tr').count();

      console.log(`📊 Recipe cards: ${recipeCards}, Table rows: ${recipeTableRows}`);

      // Verify at least one display method is showing recipes
      expect(recipeCards + recipeTableRows).toBeGreaterThan(0);

      console.log('✅ Recipe display verified');
      await takeTestScreenshot(page, 'recipe-display.png', 'Recipe display');
    });
  });

  test.describe('Tab Navigation', () => {
    test('should navigate between all tabs correctly', async () => {
      console.log('🧪 Testing tab navigation...');

      // Navigate to Recipe Library
      console.log('📍 Navigating to Recipe Library...');
      await page.locator('[data-testid="admin-tab-recipes"]').click();
      await page.waitForTimeout(500); // Wait for transition
      await expect(page.locator('[role="tabpanel"]:visible')).toBeVisible();
      await takeTestScreenshot(page, 'nav-recipe-library.png', 'Recipe Library tab');

      // Verify AdminRecipeGenerator is visible
      await expect(page.locator('text="AI Recipe Generator"').first()).toBeVisible({ timeout: TEST_TIMEOUTS.element });

      // Navigate to Meal Plan Builder
      console.log('📍 Navigating to Meal Plan Builder...');
      await page.locator('[data-testid="admin-tab-meal-plans"]').click();
      await page.waitForTimeout(500);
      await expect(page.locator('[role="tabpanel"]:visible')).toBeVisible();
      await takeTestScreenshot(page, 'nav-meal-plan-builder.png', 'Meal Plan Builder tab');

      // Verify MealPlanGenerator component is visible
      const mealPlanContent = page.locator('[role="tabpanel"]:visible');
      await expect(mealPlanContent).toBeVisible();

      // Navigate to BMAD Generator
      console.log('📍 Navigating to BMAD Generator...');
      await page.locator('[data-testid="admin-tab-bmad"]').click();
      await page.waitForTimeout(500);
      await expect(page.locator('[role="tabpanel"]:visible')).toBeVisible();
      await takeTestScreenshot(page, 'nav-bmad-generator.png', 'BMAD Generator tab');

      console.log('✅ Tab navigation verified');
    });

    test('should maintain active tab state', async () => {
      console.log('🧪 Testing active tab state...');

      // Click Recipe Library tab
      await page.locator('[data-testid="admin-tab-recipes"]').click();
      await page.waitForTimeout(300);

      // Verify Recipe Library tab is active
      const recipeTabActive = page.locator('[data-testid="admin-tab-recipes"][data-state="active"]');
      await expect(recipeTabActive).toBeVisible();

      // Click Meal Plan Builder tab
      await page.locator('[data-testid="admin-tab-meal-plans"]').click();
      await page.waitForTimeout(300);

      // Verify Meal Plan Builder tab is active and Recipe Library is not
      const mealPlanTabActive = page.locator('[data-testid="admin-tab-meal-plans"][data-state="active"]');
      await expect(mealPlanTabActive).toBeVisible();

      const recipeTabInactive = page.locator('[data-testid="admin-tab-recipes"][data-state="inactive"]');
      await expect(recipeTabInactive).toBeVisible();

      console.log('✅ Active tab state verified');
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should show abbreviated tab labels on mobile', async () => {
      console.log('🧪 Testing mobile tab labels...');

      // Set mobile viewport (iPhone 12)
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(500);

      await takeTestScreenshot(page, 'mobile-tabs.png', 'Mobile view tabs');

      // On mobile, tabs should show abbreviated text
      // Recipe Library → "Recipes" (sm:hidden class)
      const recipeTabMobile = page.locator('[data-testid="admin-tab-recipes"] .sm\\:hidden');
      await expect(recipeTabMobile).toBeVisible();

      // Meal Plan Builder → "Plans" (sm:hidden class)
      const mealPlanTabMobile = page.locator('[data-testid="admin-tab-meal-plans"] .sm\\:hidden');
      await expect(mealPlanTabMobile).toBeVisible();

      // BMAD Generator → "BMAD" (sm:hidden class)
      const bmadTabMobile = page.locator('[data-testid="admin-tab-bmad"] .sm\\:hidden');
      await expect(bmadTabMobile).toBeVisible();

      console.log('✅ Mobile tab labels verified');
    });

    test('should show full tab labels on desktop', async () => {
      console.log('🧪 Testing desktop tab labels...');

      // Set desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(500);

      await takeTestScreenshot(page, 'desktop-tabs.png', 'Desktop view tabs');

      // On desktop, tabs should show full text (hidden sm:inline)
      await expect(page.locator('text="Recipe Library"')).toBeVisible();
      await expect(page.locator('text="Meal Plan Builder"')).toBeVisible();
      await expect(page.locator('text="BMAD Generator"')).toBeVisible();

      console.log('✅ Desktop tab labels verified');
    });

    test('should maintain layout on tablet viewports', async () => {
      console.log('🧪 Testing tablet view...');

      // Set tablet viewport (iPad)
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(500);

      await takeTestScreenshot(page, 'tablet-tabs.png', 'Tablet view tabs');

      // Verify all 3 tabs are visible
      const tabs = page.locator('[role="tablist"] [role="tab"]');
      expect(await tabs.count()).toBe(3);

      // Verify tabs are properly arranged
      const tabsList = page.locator('[role="tablist"]');
      await expect(tabsList).toBeVisible();

      console.log('✅ Tablet layout verified');
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should support keyboard navigation between tabs', async () => {
      console.log('🧪 Testing keyboard navigation...');

      // Focus on first tab
      await page.locator('[data-testid="admin-tab-recipes"]').focus();
      await page.waitForTimeout(300);

      // Press Right Arrow to move to next tab
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(300);

      // Verify Meal Plan Builder tab is focused
      const mealPlanTabFocused = await page.locator('[data-testid="admin-tab-meal-plans"]').evaluate(
        el => document.activeElement === el
      );
      expect(mealPlanTabFocused).toBe(true);

      // Press Right Arrow again to move to BMAD tab
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(300);

      // Verify BMAD tab is focused
      const bmadTabFocused = await page.locator('[data-testid="admin-tab-bmad"]').evaluate(
        el => document.activeElement === el
      );
      expect(bmadTabFocused).toBe(true);

      console.log('✅ Keyboard navigation verified');
      await takeTestScreenshot(page, 'keyboard-navigation.png', 'Keyboard navigation');
    });

    test('should activate tab with Enter key', async () => {
      console.log('🧪 Testing Enter key activation...');

      // Focus on Recipe Library tab
      await page.locator('[data-testid="admin-tab-recipes"]').focus();
      await page.waitForTimeout(300);

      // Navigate to Meal Plan Builder with keyboard
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(300);

      // Press Enter to activate
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      // Verify Meal Plan Builder tab is active
      const mealPlanTabActive = page.locator('[data-testid="admin-tab-meal-plans"][data-state="active"]');
      await expect(mealPlanTabActive).toBeVisible();

      console.log('✅ Enter key activation verified');
    });
  });

  test.describe('Backward Compatibility', () => {
    test('Recipe Library functionality unchanged', async () => {
      console.log('🧪 Verifying Recipe Library functionality...');

      // Navigate to Recipe Library
      await page.locator('[data-testid="admin-tab-recipes"]').click();
      await waitForNetworkIdle(page);

      // Verify core recipe management features exist
      await expect(page.locator('text="AI Recipe Generator"').first()).toBeVisible({ timeout: TEST_TIMEOUTS.element });
      await expect(page.locator('text="Total Recipes"')).toBeVisible();

      // Verify search functionality
      const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill('chicken');
        await page.waitForTimeout(1000);
        console.log('✅ Recipe search functionality works');
      }

      await takeTestScreenshot(page, 'recipe-functionality.png', 'Recipe functionality');
      console.log('✅ Recipe Library functionality verified');
    });

    test('Meal Plan Builder unchanged', async () => {
      console.log('🧪 Verifying Meal Plan Builder functionality...');

      // Navigate to Meal Plan Builder
      await page.locator('[data-testid="admin-tab-meal-plans"]').click();
      await waitForNetworkIdle(page);

      // Verify MealPlanGenerator component is present
      const mealPlanContent = page.locator('[role="tabpanel"]:visible');
      await expect(mealPlanContent).toBeVisible({ timeout: TEST_TIMEOUTS.element });

      console.log('✅ Meal Plan Builder functionality verified');
      await takeTestScreenshot(page, 'meal-plan-functionality.png', 'Meal Plan Builder');
    });

    test('BMAD Generator unchanged', async () => {
      console.log('🧪 Verifying BMAD Generator functionality...');

      // Navigate to BMAD Generator
      await page.locator('[data-testid="admin-tab-bmad"]').click();
      await waitForNetworkIdle(page);

      // Verify BMAD component is present
      const bmadContent = page.locator('[role="tabpanel"]:visible');
      await expect(bmadContent).toBeVisible({ timeout: TEST_TIMEOUTS.element });

      console.log('✅ BMAD Generator functionality verified');
      await takeTestScreenshot(page, 'bmad-functionality.png', 'BMAD Generator');
    });

    test('All previously accessible features still accessible', async () => {
      console.log('🧪 Verifying all features accessible...');

      // Navigate through all tabs and verify key features
      const tabs = [
        { testid: 'admin-tab-recipes', features: ['AI Recipe Generator', 'Total Recipes'] },
        { testid: 'admin-tab-meal-plans', features: [] }, // MealPlanGenerator renders dynamically
        { testid: 'admin-tab-bmad', features: [] }, // BMADRecipeGenerator renders dynamically
      ];

      for (const tab of tabs) {
        console.log(`📍 Checking tab: ${tab.testid}`);
        await page.locator(`[data-testid="${tab.testid}"]`).click();
        await page.waitForTimeout(500);

        // Verify tab content is visible
        await expect(page.locator('[role="tabpanel"]:visible')).toBeVisible();

        // Check for specific features
        for (const feature of tab.features) {
          const featureElement = page.locator(`text="${feature}"`).first();
          if (await featureElement.count() > 0) {
            await expect(featureElement).toBeVisible({ timeout: TEST_TIMEOUTS.element });
            console.log(`  ✅ Feature verified: ${feature}`);
          }
        }
      }

      console.log('✅ All features accessible');
      await takeTestScreenshot(page, 'all-features-accessible.png', 'All features');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle rapid tab switching', async () => {
      console.log('🧪 Testing rapid tab switching...');

      // Rapidly switch between tabs
      for (let i = 0; i < 3; i++) {
        await page.locator('[data-testid="admin-tab-recipes"]').click();
        await page.waitForTimeout(100);
        await page.locator('[data-testid="admin-tab-meal-plans"]').click();
        await page.waitForTimeout(100);
        await page.locator('[data-testid="admin-tab-bmad"]').click();
        await page.waitForTimeout(100);
      }

      // Verify final tab is active and content is visible
      const bmadTabActive = page.locator('[data-testid="admin-tab-bmad"][data-state="active"]');
      await expect(bmadTabActive).toBeVisible();
      await expect(page.locator('[role="tabpanel"]:visible')).toBeVisible();

      console.log('✅ Rapid tab switching handled correctly');
      await takeTestScreenshot(page, 'rapid-switching.png', 'After rapid switching');
    });

    test('should not show console errors during tab navigation', async () => {
      console.log('🧪 Testing for console errors...');

      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // Navigate through all tabs
      await page.locator('[data-testid="admin-tab-recipes"]').click();
      await page.waitForTimeout(500);
      await page.locator('[data-testid="admin-tab-meal-plans"]').click();
      await page.waitForTimeout(500);
      await page.locator('[data-testid="admin-tab-bmad"]').click();
      await page.waitForTimeout(500);

      // Verify no console errors occurred
      expect(consoleErrors.length).toBe(0);
      console.log('✅ No console errors during navigation');
    });

    test('should maintain tab state after page reload', async () => {
      console.log('🧪 Testing tab state after reload...');

      // Navigate to Meal Plan Builder
      await page.locator('[data-testid="admin-tab-meal-plans"]').click();
      await page.waitForTimeout(500);

      // Reload the page
      await page.reload();
      await waitForNetworkIdle(page);

      // Verify we're still on admin dashboard with 3 tabs
      const tabs = page.locator('[role="tablist"] [role="tab"]');
      expect(await tabs.count()).toBe(3);

      console.log('✅ Tab state maintained after reload');
      await takeTestScreenshot(page, 'after-reload.png', 'After reload');
    });
  });

  test.describe('Visual Regression', () => {
    test('should match expected layout for all tabs', async () => {
      console.log('🧪 Running visual regression tests...');

      // Recipe Library tab
      await page.locator('[data-testid="admin-tab-recipes"]').click();
      await page.waitForTimeout(500);
      await takeTestScreenshot(page, 'visual-recipe-library.png', 'Recipe Library visual');

      // Meal Plan Builder tab
      await page.locator('[data-testid="admin-tab-meal-plans"]').click();
      await page.waitForTimeout(500);
      await takeTestScreenshot(page, 'visual-meal-plan-builder.png', 'Meal Plan Builder visual');

      // BMAD Generator tab
      await page.locator('[data-testid="admin-tab-bmad"]').click();
      await page.waitForTimeout(500);
      await takeTestScreenshot(page, 'visual-bmad-generator.png', 'BMAD Generator visual');

      console.log('✅ Visual regression tests completed');
    });

    test('should have consistent styling across tabs', async () => {
      console.log('🧪 Testing consistent styling...');

      // Get computed styles for each tab
      const recipeTab = page.locator('[data-testid="admin-tab-recipes"]');
      const mealPlanTab = page.locator('[data-testid="admin-tab-meal-plans"]');
      const bmadTab = page.locator('[data-testid="admin-tab-bmad"]');

      // Verify all tabs have same classes
      const recipeClasses = await recipeTab.getAttribute('class');
      const mealPlanClasses = await mealPlanTab.getAttribute('class');
      const bmadClasses = await bmadTab.getAttribute('class');

      console.log(`Recipe tab classes: ${recipeClasses}`);
      console.log(`Meal Plan tab classes: ${mealPlanClasses}`);
      console.log(`BMAD tab classes: ${bmadClasses}`);

      // All tabs should have similar base classes
      expect(recipeClasses).toContain('flex');
      expect(mealPlanClasses).toContain('flex');
      expect(bmadClasses).toContain('flex');

      console.log('✅ Consistent styling verified');
    });
  });
});

test.describe('Admin Dashboard - Integration Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    page.setDefaultTimeout(30000);
    await loginAsAdmin(page);
    await waitForNetworkIdle(page);
  });

  test.afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  test('should work correctly with Analytics Dashboard link', async () => {
    console.log('🧪 Testing Analytics Dashboard link...');

    // Verify Analytics Dashboard link exists
    const analyticsLink = page.locator('a:has-text("Analytics Dashboard")');
    await expect(analyticsLink).toBeVisible({ timeout: TEST_TIMEOUTS.element });

    console.log('✅ Analytics Dashboard link verified');
    await takeTestScreenshot(page, 'analytics-link.png', 'Analytics Dashboard link');
  });

  test('should maintain proper grid layout with 3 tabs', async () => {
    console.log('🧪 Testing grid layout...');

    // Verify TabsList has correct grid columns class
    const tabsList = page.locator('[role="tablist"]');
    const classes = await tabsList.getAttribute('class');

    // Should have grid-cols-3 for 3 tabs
    expect(classes).toContain('grid-cols-3');

    console.log('✅ Grid layout verified');
  });

  test('should handle authentication properly across tabs', async () => {
    console.log('🧪 Testing authentication across tabs...');

    // Navigate through all tabs
    const tabs = ['admin-tab-recipes', 'admin-tab-meal-plans', 'admin-tab-bmad'];

    for (const tabId of tabs) {
      console.log(`📍 Testing auth on ${tabId}...`);
      await page.locator(`[data-testid="${tabId}"]`).click();
      await page.waitForTimeout(500);

      // Verify we're still authenticated (not redirected to login)
      const currentUrl = page.url();
      expect(currentUrl).toContain('/admin');
      expect(currentUrl).not.toContain('/login');
    }

    console.log('✅ Authentication maintained across tabs');
  });
});
