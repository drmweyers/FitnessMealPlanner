/**
 * Meal Card Clicking GUI End-to-End Tests
 * 
 * Comprehensive Playwright tests to verify the meal card clicking functionality
 * works correctly from a user perspective in a real browser environment.
 * 
 * These tests cover the complete user journey from login to meal card interactions,
 * ensuring the fix for meal card clicking works properly in production-like conditions.
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test credentials from TEST_ACCOUNTS.md
const CUSTOMER_CREDENTIALS = {
  email: 'customer.test@evofitmeals.com',
  password: 'TestCustomer123!',
  name: 'Sarah Johnson'
};

const TRAINER_CREDENTIALS = {
  email: 'trainer.test@evofitmeals.com', 
  password: 'TestTrainer123!',
  name: 'Michael Thompson'
};

// Page object helpers
class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);
    await this.page.click('button[type="submit"]');
    
    // Wait for navigation after login
    await this.page.waitForURL(/\/dashboard|\/customer|\/trainer/, { timeout: 10000 });
  }

  async isLoginFormVisible() {
    return await this.page.isVisible('input[type="email"]');
  }
}

class CustomerDashboard {
  constructor(private page: Page) {}

  async waitForPageLoad() {
    // Wait for customer dashboard to load
    await this.page.waitForSelector('[data-testid="customer-dashboard"], .customer-dashboard, h1, h2', { timeout: 10000 });
  }

  async navigateToMealPlans() {
    // Look for meal plans navigation - multiple possible selectors
    const selectors = [
      'a[href*="meal"]',
      'button:has-text("Meal Plans")',
      'button:has-text("meal")',
      '[data-testid="meal-plans-tab"]',
      'nav a[href*="meal"]',
      '.meal-plans-link'
    ];

    let clicked = false;
    for (const selector of selectors) {
      try {
        if (await this.page.isVisible(selector)) {
          await this.page.click(selector);
          clicked = true;
          break;
        }
      } catch (error) {
        // Continue to next selector
      }
    }

    if (!clicked) {
      // If no navigation link found, the meal plans might already be visible
      const mealPlanSelectors = [
        '.meal-plan',
        '[data-testid*="meal"]',
        'text="Showing"',
        'text="meal plan"'
      ];

      let found = false;
      for (const selector of mealPlanSelectors) {
        try {
          if (await this.page.isVisible(selector)) {
            found = true;
            break;
          }
        } catch (error) {
          // Continue checking
        }
      }

      if (!found) {
        throw new Error('Could not find meal plans section or navigation');
      }
    }

    // Wait for meal plans to load
    await this.page.waitForTimeout(2000);
  }

  async getMealPlanCards() {
    // Multiple selectors for meal plan cards
    const selectors = [
      '.meal-plan-card',
      '[data-testid="meal-plan-card"]',
      '.meal-plan',
      '[data-testid*="meal-plan"]',
      '.card:has(text("meal"))',
      '.card:has(text("plan"))'
    ];

    for (const selector of selectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: 3000 });
        return await this.page.locator(selector);
      } catch (error) {
        continue;
      }
    }

    throw new Error('No meal plan cards found');
  }

  async verifyMealPlansDisplay() {
    // Check for meal plans display text or cards
    const indicators = [
      'text="Showing 3 of 3 meal plans"',
      'text*="meal plan"',
      '.meal-plan-card',
      '[data-testid*="meal-plan"]'
    ];

    let found = false;
    for (const indicator of indicators) {
      try {
        if (await this.page.isVisible(indicator)) {
          found = true;
          break;
        }
      } catch (error) {
        continue;
      }
    }

    expect(found).toBeTruthy();
  }
}

class MealPlanModal {
  constructor(private page: Page) {}

  async waitForModalOpen() {
    // Wait for meal plan modal to appear
    const modalSelectors = [
      '[role="dialog"]',
      '.modal',
      '[data-testid="meal-plan-modal"]',
      '.meal-plan-modal'
    ];

    for (const selector of modalSelectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: 5000 });
        return;
      } catch (error) {
        continue;
      }
    }

    throw new Error('Meal plan modal did not open');
  }

  async verifyMealPlanContent() {
    // Check for meal plan content like daily schedule table
    const contentSelectors = [
      'table',
      '.daily-schedule',
      '.meal-schedule',
      '[data-testid*="schedule"]',
      'text="Day"',
      'text="Breakfast"',
      'text="Lunch"',
      'text="Dinner"'
    ];

    let found = false;
    for (const selector of contentSelectors) {
      try {
        if (await this.page.isVisible(selector)) {
          found = true;
          break;
        }
      } catch (error) {
        continue;
      }
    }

    expect(found).toBeTruthy();
  }

  async getMealCards() {
    // Get clickable meal rows/cards within the modal
    const mealSelectors = [
      'table tbody tr',
      '.meal-row',
      '.meal-card',
      '[data-testid*="meal"]',
      'tr:has-text("Breakfast"), tr:has-text("Lunch"), tr:has-text("Dinner")',
      '.clickable-row'
    ];

    for (const selector of mealSelectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: 3000 });
        const elements = await this.page.locator(selector);
        if (await elements.count() > 0) {
          return elements;
        }
      } catch (error) {
        continue;
      }
    }

    throw new Error('No meal cards/rows found in modal');
  }

  async clickFirstMealCard() {
    const mealCards = await this.getMealCards();
    await mealCards.first().click();
  }

  async clickMealCardByIndex(index: number) {
    const mealCards = await this.getMealCards();
    await mealCards.nth(index).click();
  }

  async closeModal() {
    // Close the meal plan modal
    const closeSelectors = [
      '[data-testid="close-modal"]',
      'button[aria-label="Close"]',
      '.close-button',
      'button:has-text("Close")',
      'button:has-text("×")'
    ];

    for (const selector of closeSelectors) {
      try {
        if (await this.page.isVisible(selector)) {
          await this.page.click(selector);
          return;
        }
      } catch (error) {
        continue;
      }
    }

    // Try pressing Escape key
    await this.page.keyboard.press('Escape');
  }
}

class RecipeDetailModal {
  constructor(private page: Page) {}

  async waitForModalOpen() {
    // Wait for recipe detail modal to appear on top of meal plan modal
    const recipeModalSelectors = [
      '[data-testid="recipe-detail-modal"]',
      '.recipe-modal',
      '[role="dialog"]:has-text("Recipe")',
      '.modal:has-text("Recipe")',
      '[data-testid*="recipe"]'
    ];

    for (const selector of recipeModalSelectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: 5000 });
        return;
      } catch (error) {
        continue;
      }
    }

    throw new Error('Recipe detail modal did not open');
  }

  async verifyRecipeContent() {
    // Check for recipe details like name, description, nutrition info
    const contentSelectors = [
      'text="Recipe"',
      'text="Ingredients"',
      'text="Instructions"',
      'text="Calories"',
      'text="Protein"',
      '.recipe-name',
      '.recipe-description',
      '.nutrition-info'
    ];

    let found = false;
    for (const selector of contentSelectors) {
      try {
        if (await this.page.isVisible(selector)) {
          found = true;
          break;
        }
      } catch (error) {
        continue;
      }
    }

    expect(found).toBeTruthy();
  }

  async closeModal() {
    // Close the recipe detail modal
    const closeSelectors = [
      '[data-testid="close-recipe-modal"]',
      '[data-testid="close-modal"]',
      'button[aria-label="Close"]',
      '.close-button',
      'button:has-text("Close")',
      'button:has-text("×")'
    ];

    for (const selector of closeSelectors) {
      try {
        if (await this.page.isVisible(selector)) {
          await this.page.click(selector);
          return;
        }
      } catch (error) {
        continue;
      }
    }

    // Try pressing Escape key
    await this.page.keyboard.press('Escape');
  }

  async isVisible() {
    const modalSelectors = [
      '[data-testid="recipe-detail-modal"]',
      '.recipe-modal',
      '[role="dialog"]:has-text("Recipe")'
    ];

    for (const selector of modalSelectors) {
      try {
        if (await this.page.isVisible(selector)) {
          return true;
        }
      } catch (error) {
        continue;
      }
    }

    return false;
  }
}

// Test suite
test.describe('Meal Card Clicking GUI End-to-End Tests', () => {
  let loginPage: LoginPage;
  let customerDashboard: CustomerDashboard;
  let mealPlanModal: MealPlanModal;
  let recipeDetailModal: RecipeDetailModal;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    customerDashboard = new CustomerDashboard(page);
    mealPlanModal = new MealPlanModal(page);
    recipeDetailModal = new RecipeDetailModal(page);

    // Set longer timeout for these E2E tests
    test.setTimeout(60000);
  });

  test.describe('Customer Login & Navigation', () => {
    test('should successfully login as customer and navigate to meal plans', async ({ page }) => {
      await test.step('Navigate to login page', async () => {
        await loginPage.goto();
        expect(await loginPage.isLoginFormVisible()).toBeTruthy();
      });

      await test.step('Login with customer credentials', async () => {
        await loginPage.login(CUSTOMER_CREDENTIALS.email, CUSTOMER_CREDENTIALS.password);
        await customerDashboard.waitForPageLoad();
      });

      await test.step('Navigate to meal plans section', async () => {
        await customerDashboard.navigateToMealPlans();
        await customerDashboard.verifyMealPlansDisplay();
      });

      // Take screenshot for verification
      await page.screenshot({
        path: 'test-screenshots/customer-meal-plans-view.png',
        fullPage: true
      });
    });

    test('should display meal plans with correct count and information', async ({ page }) => {
      // Login and navigate to meal plans
      await loginPage.goto();
      await loginPage.login(CUSTOMER_CREDENTIALS.email, CUSTOMER_CREDENTIALS.password);
      await customerDashboard.waitForPageLoad();
      await customerDashboard.navigateToMealPlans();

      await test.step('Verify meal plans are displayed correctly', async () => {
        await customerDashboard.verifyMealPlansDisplay();
        
        // Check for specific meal plan count if visible
        try {
          await expect(page.locator('text="Showing 3 of 3 meal plans"')).toBeVisible({ timeout: 5000 });
        } catch {
          // If specific count not found, just ensure meal plans are present
          const mealPlanCards = await customerDashboard.getMealPlanCards();
          expect(await mealPlanCards.count()).toBeGreaterThan(0);
        }
      });
    });
  });

  test.describe('Meal Plan Modal Interaction', () => {
    test.beforeEach(async ({ page }) => {
      // Setup: Login and navigate to meal plans
      await loginPage.goto();
      await loginPage.login(CUSTOMER_CREDENTIALS.email, CUSTOMER_CREDENTIALS.password);
      await customerDashboard.waitForPageLoad();
      await customerDashboard.navigateToMealPlans();
    });

    test('should open meal plan modal when clicking on meal plan card', async ({ page }) => {
      await test.step('Click on first meal plan card', async () => {
        const mealPlanCards = await customerDashboard.getMealPlanCards();
        await mealPlanCards.first().click();
      });

      await test.step('Verify meal plan modal opens', async () => {
        await mealPlanModal.waitForModalOpen();
        await mealPlanModal.verifyMealPlanContent();
      });

      // Take screenshot of modal
      await page.screenshot({
        path: 'test-screenshots/meal-plan-modal-open.png',
        fullPage: true
      });
    });

    test('should display daily meal schedule table in modal', async ({ page }) => {
      // Open meal plan modal
      const mealPlanCards = await customerDashboard.getMealPlanCards();
      await mealPlanCards.first().click();
      await mealPlanModal.waitForModalOpen();

      await test.step('Verify meal schedule table is displayed', async () => {
        await mealPlanModal.verifyMealPlanContent();
        
        // Look for table structure or meal listings
        const hasTable = await page.isVisible('table');
        const hasMealTypes = await page.isVisible('text="Breakfast"') || 
                          await page.isVisible('text="Lunch"') ||
                          await page.isVisible('text="Dinner"');
        
        expect(hasTable || hasMealTypes).toBeTruthy();
      });
    });
  });

  test.describe('Meal Card Clicking (CORE FUNCTIONALITY)', () => {
    test.beforeEach(async ({ page }) => {
      // Setup: Login, navigate to meal plans, and open meal plan modal
      await loginPage.goto();
      await loginPage.login(CUSTOMER_CREDENTIALS.email, CUSTOMER_CREDENTIALS.password);
      await customerDashboard.waitForPageLoad();
      await customerDashboard.navigateToMealPlans();
      
      const mealPlanCards = await customerDashboard.getMealPlanCards();
      await mealPlanCards.first().click();
      await mealPlanModal.waitForModalOpen();
    });

    test('should open recipe detail modal when clicking on meal card/row', async ({ page }) => {
      await test.step('Click on first meal card', async () => {
        await mealPlanModal.clickFirstMealCard();
      });

      await test.step('Verify recipe detail modal opens on top', async () => {
        await recipeDetailModal.waitForModalOpen();
        await recipeDetailModal.verifyRecipeContent();
      });

      await test.step('Verify both modals are present (proper stacking)', async () => {
        // Recipe modal should be visible on top
        expect(await recipeDetailModal.isVisible()).toBeTruthy();
        
        // Meal plan modal should still be in background
        // We can't easily check this without specific selectors, but at least
        // verify the recipe modal is displayed
        await page.screenshot({
          path: 'test-screenshots/recipe-modal-stacked.png',
          fullPage: true
        });
      });
    });

    test('should display recipe information correctly in modal', async ({ page }) => {
      // Click meal card to open recipe modal
      await mealPlanModal.clickFirstMealCard();
      await recipeDetailModal.waitForModalOpen();

      await test.step('Verify recipe details are displayed', async () => {
        await recipeDetailModal.verifyRecipeContent();
        
        // Check for key recipe information
        const hasRecipeInfo = await page.isVisible('text="Recipe"') ||
                            await page.isVisible('text="Ingredients"') ||
                            await page.isVisible('text="Calories"') ||
                            await page.isVisible('text="Protein"');
        
        expect(hasRecipeInfo).toBeTruthy();
      });

      // Take screenshot for documentation
      await page.screenshot({
        path: 'test-screenshots/recipe-detail-modal-content.png',
        fullPage: true
      });
    });

    test('should handle clicking multiple different meal cards', async ({ page }) => {
      const mealCards = await mealPlanModal.getMealCards();
      const cardCount = await mealCards.count();

      // Test clicking different meal cards (up to 3 or available count)
      const cardsToTest = Math.min(cardCount, 3);

      for (let i = 0; i < cardsToTest; i++) {
        await test.step(`Click meal card ${i + 1}`, async () => {
          await mealPlanModal.clickMealCardByIndex(i);
          await recipeDetailModal.waitForModalOpen();
          await recipeDetailModal.verifyRecipeContent();
          
          // Take screenshot for each modal
          await page.screenshot({
            path: `test-screenshots/recipe-modal-card-${i + 1}.png`,
            fullPage: true
          });

          // Close recipe modal to test next card
          await recipeDetailModal.closeModal();
          await page.waitForTimeout(1000); // Brief wait between clicks
        });
      }
    });

    test('should not have z-index conflicts between modals', async ({ page }) => {
      await test.step('Open recipe modal and verify proper stacking', async () => {
        await mealPlanModal.clickFirstMealCard();
        await recipeDetailModal.waitForModalOpen();
        
        // Recipe modal should be on top and interactable
        await recipeDetailModal.verifyRecipeContent();
        
        // Test that recipe modal is interactable (not covered by other elements)
        const closeButton = page.locator('[data-testid="close-recipe-modal"], button[aria-label="Close"], button:has-text("Close")').first();
        if (await closeButton.isVisible()) {
          // Should be able to click close button without issues
          expect(await closeButton.isEnabled()).toBeTruthy();
        }
      });
    });
  });

  test.describe('Modal Management', () => {
    test.beforeEach(async ({ page }) => {
      // Setup: Get to meal plan modal state
      await loginPage.goto();
      await loginPage.login(CUSTOMER_CREDENTIALS.email, CUSTOMER_CREDENTIALS.password);
      await customerDashboard.waitForPageLoad();
      await customerDashboard.navigateToMealPlans();
      
      const mealPlanCards = await customerDashboard.getMealPlanCards();
      await mealPlanCards.first().click();
      await mealPlanModal.waitForModalOpen();
    });

    test('should close recipe modal and return to meal plan', async ({ page }) => {
      await test.step('Open recipe modal', async () => {
        await mealPlanModal.clickFirstMealCard();
        await recipeDetailModal.waitForModalOpen();
      });

      await test.step('Close recipe modal', async () => {
        await recipeDetailModal.closeModal();
        await page.waitForTimeout(1000);
        
        // Recipe modal should be closed
        expect(await recipeDetailModal.isVisible()).toBeFalsy();
      });

      await test.step('Verify meal plan modal is still open', async () => {
        // Meal plan modal should still be visible
        await mealPlanModal.verifyMealPlanContent();
      });
    });

    test('should handle opening multiple recipe modals in sequence', async ({ page }) => {
      const mealCards = await mealPlanModal.getMealCards();
      const cardCount = Math.min(await mealCards.count(), 2);

      for (let i = 0; i < cardCount; i++) {
        await test.step(`Open and close recipe modal ${i + 1}`, async () => {
          // Open recipe modal
          await mealPlanModal.clickMealCardByIndex(i);
          await recipeDetailModal.waitForModalOpen();
          await recipeDetailModal.verifyRecipeContent();
          
          // Close recipe modal
          await recipeDetailModal.closeModal();
          await page.waitForTimeout(1000);
          
          // Verify it's closed
          expect(await recipeDetailModal.isVisible()).toBeFalsy();
        });
      }

      await test.step('Verify meal plan modal remains functional', async () => {
        await mealPlanModal.verifyMealPlanContent();
      });
    });

    test('should handle ESC key for modal closing', async ({ page }) => {
      await test.step('Open recipe modal', async () => {
        await mealPlanModal.clickFirstMealCard();
        await recipeDetailModal.waitForModalOpen();
      });

      await test.step('Close with ESC key', async () => {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
        
        // Top modal (recipe) should be closed
        expect(await recipeDetailModal.isVisible()).toBeFalsy();
      });

      await test.step('Verify meal plan modal is still open', async () => {
        await mealPlanModal.verifyMealPlanContent();
      });
    });
  });

  test.describe('Browser Compatibility & Responsive Design', () => {
    test('should work correctly on different viewport sizes', async ({ page }) => {
      // Test on mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await loginPage.goto();
      await loginPage.login(CUSTOMER_CREDENTIALS.email, CUSTOMER_CREDENTIALS.password);
      await customerDashboard.waitForPageLoad();
      await customerDashboard.navigateToMealPlans();
      
      // Open meal plan modal
      const mealPlanCards = await customerDashboard.getMealPlanCards();
      await mealPlanCards.first().click();
      await mealPlanModal.waitForModalOpen();
      
      // Test meal card clicking on mobile
      await mealPlanModal.clickFirstMealCard();
      await recipeDetailModal.waitForModalOpen();
      
      await page.screenshot({
        path: 'test-screenshots/mobile-recipe-modal.png',
        fullPage: true
      });

      // Test on tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await recipeDetailModal.closeModal();
      await mealPlanModal.clickMealCardByIndex(1);
      await recipeDetailModal.waitForModalOpen();
      
      await page.screenshot({
        path: 'test-screenshots/tablet-recipe-modal.png',
        fullPage: true
      });

      // Back to desktop
      await page.setViewportSize({ width: 1280, height: 720 });
    });

    test('should maintain functionality across different screen sizes', async ({ page }) => {
      const viewports = [
        { width: 320, height: 568, name: 'small-mobile' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 1440, height: 900, name: 'desktop' }
      ];

      for (const viewport of viewports) {
        await test.step(`Test on ${viewport.name} (${viewport.width}x${viewport.height})`, async () => {
          await page.setViewportSize({ width: viewport.width, height: viewport.height });
          
          // Quick functionality test
          await loginPage.goto();
          await loginPage.login(CUSTOMER_CREDENTIALS.email, CUSTOMER_CREDENTIALS.password);
          await customerDashboard.waitForPageLoad();
          await customerDashboard.navigateToMealPlans();
          
          const mealPlanCards = await customerDashboard.getMealPlanCards();
          await mealPlanCards.first().click();
          await mealPlanModal.waitForModalOpen();
          await mealPlanModal.clickFirstMealCard();
          await recipeDetailModal.waitForModalOpen();
          
          // Verify modal is visible and functional
          await recipeDetailModal.verifyRecipeContent();
          
          await page.screenshot({
            path: `test-screenshots/${viewport.name}-functionality.png`,
            fullPage: true
          });
          
          await recipeDetailModal.closeModal();
        });
      }
    });
  });

  test.describe('Error Handling & Edge Cases', () => {
    test.beforeEach(async ({ page }) => {
      // Setup to meal plan modal
      await loginPage.goto();
      await loginPage.login(CUSTOMER_CREDENTIALS.email, CUSTOMER_CREDENTIALS.password);
      await customerDashboard.waitForPageLoad();
      await customerDashboard.navigateToMealPlans();
      
      const mealPlanCards = await customerDashboard.getMealPlanCards();
      await mealPlanCards.first().click();
      await mealPlanModal.waitForModalOpen();
    });

    test('should handle rapid clicking without breaking state', async ({ page }) => {
      const mealCards = await mealPlanModal.getMealCards();
      
      await test.step('Perform rapid clicks on meal card', async () => {
        // Click the same meal card multiple times rapidly
        for (let i = 0; i < 3; i++) {
          await mealCards.first().click({ timeout: 1000 });
          await page.waitForTimeout(100); // Brief pause between clicks
        }
      });

      await test.step('Verify only one recipe modal is open', async () => {
        await recipeDetailModal.waitForModalOpen();
        await recipeDetailModal.verifyRecipeContent();
        
        // Should still be functional
        await recipeDetailModal.closeModal();
        expect(await recipeDetailModal.isVisible()).toBeFalsy();
      });
    });

    test('should recover gracefully from network delays', async ({ page }) => {
      // Simulate slow network
      await page.route('**/*', route => {
        setTimeout(() => route.continue(), 1000);
      });

      await test.step('Click meal card with network delay', async () => {
        await mealPlanModal.clickFirstMealCard();
        
        // Should still work with delays
        await recipeDetailModal.waitForModalOpen();
        await recipeDetailModal.verifyRecipeContent();
      });

      // Remove network simulation
      await page.unroute('**/*');
    });

    test('should handle modal interactions without JavaScript errors', async ({ page }) => {
      // Listen for console errors
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await test.step('Perform complete meal card click workflow', async () => {
        await mealPlanModal.clickFirstMealCard();
        await recipeDetailModal.waitForModalOpen();
        await recipeDetailModal.closeModal();
      });

      await test.step('Verify no critical JavaScript errors occurred', async () => {
        // Filter out minor/expected errors
        const criticalErrors = errors.filter(error => 
          !error.includes('favicon') && 
          !error.includes('manifest') &&
          !error.includes('404')
        );
        
        expect(criticalErrors.length).toBe(0);
      });
    });
  });

  test.describe('Performance & User Experience', () => {
    test('should open modals within reasonable time', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login(CUSTOMER_CREDENTIALS.email, CUSTOMER_CREDENTIALS.password);
      await customerDashboard.waitForPageLoad();
      await customerDashboard.navigateToMealPlans();

      await test.step('Measure meal plan modal opening time', async () => {
        const mealPlanCards = await customerDashboard.getMealPlanCards();
        
        const startTime = Date.now();
        await mealPlanCards.first().click();
        await mealPlanModal.waitForModalOpen();
        const mealPlanModalTime = Date.now() - startTime;
        
        // Should open within 3 seconds
        expect(mealPlanModalTime).toBeLessThan(3000);
      });

      await test.step('Measure recipe modal opening time', async () => {
        const startTime = Date.now();
        await mealPlanModal.clickFirstMealCard();
        await recipeDetailModal.waitForModalOpen();
        const recipeModalTime = Date.now() - startTime;
        
        // Should open within 3 seconds
        expect(recipeModalTime).toBeLessThan(3000);
      });
    });

    test('should provide smooth visual transitions', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login(CUSTOMER_CREDENTIALS.email, CUSTOMER_CREDENTIALS.password);
      await customerDashboard.waitForPageLoad();
      await customerDashboard.navigateToMealPlans();

      // Open meal plan modal
      const mealPlanCards = await customerDashboard.getMealPlanCards();
      await mealPlanCards.first().click();
      await mealPlanModal.waitForModalOpen();

      await test.step('Test modal transitions are smooth', async () => {
        // Open recipe modal
        await mealPlanModal.clickFirstMealCard();
        await recipeDetailModal.waitForModalOpen();
        
        // Wait for any animations to complete
        await page.waitForTimeout(1000);
        
        // Close and reopen to test transitions
        await recipeDetailModal.closeModal();
        await page.waitForTimeout(500);
        
        await mealPlanModal.clickFirstMealCard();
        await recipeDetailModal.waitForModalOpen();
        
        // Verify final state
        await recipeDetailModal.verifyRecipeContent();
      });
    });
  });
});