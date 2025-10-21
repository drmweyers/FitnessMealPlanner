import { test, expect } from '@playwright/test';

test('Check if meal plan generator is accessible', async ({ page }) => {
  // Login first
  await page.goto('/login');
  await page.fill('input[name="email"]', 'admin@fitmeal.pro');
  await page.fill('input[name="password"]', 'AdminPass123');
  await page.click('button[type="submit"]');

  // Wait for admin page
  await page.waitForURL('**/admin', { timeout: 10000 });
  console.log('✓ Logged in as admin');

  // Take a screenshot of admin page
  await page.screenshot({ path: 'test-results/admin-page.png' });

  // Check what's on the admin page
  const pageText = await page.textContent('body');
  console.log('Admin page contains:', pageText?.substring(0, 300));

  // Look for navigation items or tabs
  const navItems = await page.locator('nav a, [role="tab"], button').allTextContents();
  console.log('Navigation items found:', navItems);

  // Try to find meal plan related text
  const mealPlanElements = await page.locator('text=/meal.*plan/i').count();
  console.log('Meal plan related elements:', mealPlanElements);

  // Check if MealPlanGenerator component exists
  const generator = await page.locator('[data-testid*="meal"], [class*="meal-plan"]').count();
  console.log('Generator elements:', generator);
});
