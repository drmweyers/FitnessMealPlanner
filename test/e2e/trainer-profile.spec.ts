import { test, expect } from '@playwright/test';

test.describe('Trainer Profile Tests', () => {
  // Test credentials - using working trainer account
  const trainerEmail = 'trainer.test@evofitmeals.com';
  const trainerPassword = 'TestTrainer123!';
  const baseURL = 'http://localhost:4000';

  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto(baseURL);
    
    // Wait for login form to be visible
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    // Login as trainer
    await page.fill('input[type="email"]', trainerEmail);
    await page.fill('input[type="password"]', trainerPassword);
    
    // Click login button
    await page.click('button:has-text("Sign In"), button:has-text("Login"), button[type="submit"]');
    
    // Wait for successful login - should redirect to trainer dashboard
    await page.waitForURL((url) => {
      return url.pathname.includes('/trainer') || 
             url.pathname.includes('/dashboard') ||
             url.pathname === '/';
    }, { timeout: 10000 });
    
    // Give it a moment for auth to complete
    await page.waitForTimeout(1000);
    
    // Navigate to profile page
    await page.goto(`${baseURL}/trainer/profile`);
    await page.waitForLoadState('networkidle');
  });

  test('Trainer profile page loads without 404 errors', async ({ page }) => {
    // Check that we're on the profile page and not a 404
    const pageTitle = await page.locator('h1').first().textContent();
    expect(pageTitle).toContain('Trainer Profile');
    
    // Check response status
    const response = await page.goto(`${baseURL}/trainer/profile`);
    expect(response?.status()).toBe(200);
    
    // Verify no 404 text is present
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain('404');
    expect(bodyText).not.toContain('Page not found');
    expect(bodyText).not.toContain('Not Found');
  });

  test('Trainer profile has no tabs (single page layout)', async ({ page }) => {
    // Check that there are no tab elements
    const tabElements = await page.locator('[role="tab"]').count();
    expect(tabElements).toBe(0);
    
    // Check that there is no "Health Protocol" text anywhere
    const healthProtocolElements = await page.locator('text=/health protocol/i').count();
    expect(healthProtocolElements).toBe(0);
    
    // Verify profile sections are present
    await expect(page.locator('text=/Account Details/i')).toBeVisible();
    await expect(page.locator('text=/Performance Overview/i')).toBeVisible();
  });

  test('All profile sections load correctly', async ({ page }) => {
    // Account Details section
    await expect(page.locator('h3:has-text("Account Details")')).toBeVisible();
    
    // Performance Overview section
    await expect(page.locator('h3:has-text("Performance Overview")')).toBeVisible();
    
    // Quick Actions section
    await expect(page.locator('h3:has-text("Quick Actions")')).toBeVisible();
    
    // PDF Export section
    await expect(page.locator('h3:has-text("PDF Export")')).toBeVisible();
  });

  test('No navigation errors when clicking around profile', async ({ page }) => {
    // Click on various interactive elements and check for 404s
    const interactiveElements = await page.locator('button:visible').all();
    
    for (let i = 0; i < Math.min(interactiveElements.length, 3); i++) {
      const element = interactiveElements[i];
      const buttonText = await element.textContent();
      
      // Skip logout button
      if (buttonText?.toLowerCase().includes('logout')) continue;
      
      // Click button
      await element.click();
      
      // Wait a moment for any navigation
      await page.waitForTimeout(500);
      
      // Check we're not on a 404 page
      const currentBodyText = await page.locator('body').textContent();
      expect(currentBodyText).not.toContain('404');
      expect(currentBodyText).not.toContain('Page not found');
      
      // Navigate back to profile if we left
      if (!page.url().includes('/trainer/profile')) {
        await page.goto(`${baseURL}/trainer/profile`);
        await page.waitForLoadState('networkidle');
      }
    }
  });

  test('Console has no 404 errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (text.includes('404') || text.includes('Not Found')) {
          consoleErrors.push(text);
        }
      }
    });
    
    // Listen for page errors
    page.on('pageerror', error => {
      if (error.message.includes('404')) {
        consoleErrors.push(error.message);
      }
    });
    
    // Navigate and interact with the page
    await page.goto(`${baseURL}/trainer/profile`);
    await page.waitForLoadState('networkidle');
    
    // Wait a bit to catch any async errors
    await page.waitForTimeout(2000);
    
    // Assert no 404 errors were logged
    expect(consoleErrors.length).toBe(0);
  });

  test('Network requests return successful status codes', async ({ page }) => {
    const failedRequests: string[] = [];
    
    // Monitor network requests
    page.on('response', response => {
      if (response.status() === 404) {
        failedRequests.push(`404: ${response.url()}`);
      }
    });
    
    // Navigate to trainer profile
    await page.goto(`${baseURL}/trainer/profile`);
    await page.waitForLoadState('networkidle');
    
    // Wait for any lazy-loaded content
    await page.waitForTimeout(2000);
    
    // Assert no 404 responses
    if (failedRequests.length > 0) {
      console.log('Failed requests:', failedRequests);
    }
    expect(failedRequests.length).toBe(0);
  });
});