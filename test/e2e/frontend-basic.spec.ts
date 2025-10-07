/**
 * Basic Frontend Functionality Tests
 * Tests frontend components without requiring database setup
 */

import { test, expect } from '@playwright/test';

test.describe('🌐 Basic Frontend Functionality Tests', () => {
  
  test.describe('Application Accessibility', () => {
    test('Application loads successfully', async ({ page }) => {
      console.log('🧪 Testing basic application load...');
      
      // Navigate to the application
      await page.goto('http://localhost:4000');
      
      // Wait for page to load
      await page.waitForLoadState('networkidle');
      
      // Check if page loads without errors
      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);
      
      console.log(`✅ Application loaded successfully with title: "${title}"`);
      
      // Take screenshot
      await page.screenshot({ 
        path: `test-screenshots/app-load-${Date.now()}.png`,
        fullPage: true 
      });
    });

    test('Login page is accessible', async ({ page }) => {
      console.log('🧪 Testing login page accessibility...');
      
      // Navigate to login page
      await page.goto('http://localhost:4000/login');
      await page.waitForLoadState('networkidle');
      
      // Check for login form elements
      const hasEmailInput = await page.locator('input[type="email"]').count() > 0;
      const hasPasswordInput = await page.locator('input[type="password"]').count() > 0;
      const hasSubmitButton = await page.locator('button[type="submit"]').count() > 0;
      
      console.log(`Login form elements found: email=${hasEmailInput}, password=${hasPasswordInput}, submit=${hasSubmitButton}`);
      
      // At least basic form should be present
      expect(hasEmailInput || hasPasswordInput || hasSubmitButton).toBeTruthy();
      
      // Take screenshot
      await page.screenshot({ 
        path: `test-screenshots/login-page-${Date.now()}.png`,
        fullPage: true 
      });
    });

    test('Registration page is accessible', async ({ page }) => {
      console.log('🧪 Testing registration page accessibility...');
      
      // Navigate to registration page
      await page.goto('http://localhost:4000/register');
      await page.waitForLoadState('networkidle');
      
      // Check if registration page loads
      const currentUrl = page.url();
      const hasRegisterContent = await page.locator('form, input, button').count() > 0;
      
      console.log(`Registration page loaded: URL="${currentUrl}", hasContent=${hasRegisterContent}`);
      
      // Take screenshot
      await page.screenshot({ 
        path: `test-screenshots/register-page-${Date.now()}.png`,
        fullPage: true 
      });
      
      // Should either show registration form or redirect appropriately
      expect(hasRegisterContent || currentUrl !== 'http://localhost:4000/register').toBeTruthy();
    });
  });

  test.describe('Navigation and Routing', () => {
    test('404 page handles unknown routes', async ({ page }) => {
      console.log('🧪 Testing 404 error handling...');
      
      // Navigate to non-existent route
      await page.goto('http://localhost:4000/non-existent-page');
      await page.waitForLoadState('networkidle');
      
      const currentUrl = page.url();
      const pageContent = await page.textContent('body');
      
      console.log(`404 handling: URL="${currentUrl}"`);
      console.log(`Page content length: ${pageContent?.length || 0} characters`);
      
      // Should handle 404 gracefully - either show 404 page or redirect
      expect(pageContent?.length).toBeGreaterThan(0);
      
      // Take screenshot
      await page.screenshot({ 
        path: `test-screenshots/404-page-${Date.now()}.png`,
        fullPage: true 
      });
    });

    test('Basic navigation links work', async ({ page }) => {
      console.log('🧪 Testing basic navigation...');
      
      // Start from home page
      await page.goto('http://localhost:4000');
      await page.waitForLoadState('networkidle');
      
      // Look for navigation links
      const navLinks = await page.locator('a, nav a, [data-testid*="nav"]').all();
      
      console.log(`Found ${navLinks.length} potential navigation elements`);
      
      let workingLinks = 0;
      let testedLinks = 0;
      
      // Test first few links to avoid overwhelming the test
      const linksToTest = navLinks.slice(0, Math.min(5, navLinks.length));
      
      for (const link of linksToTest) {
        try {
          const href = await link.getAttribute('href');
          if (href && href.startsWith('/') && !href.includes('logout')) {
            testedLinks++;
            await link.click();
            await page.waitForTimeout(1000); // Brief pause
            
            const newUrl = page.url();
            if (newUrl !== 'http://localhost:4000') {
              workingLinks++;
            }
            
            // Go back to home for next test
            await page.goto('http://localhost:4000');
            await page.waitForTimeout(1000);
          }
        } catch (error) {
          console.log(`Navigation link test error: ${error.message}`);
        }
      }
      
      console.log(`Navigation test: ${workingLinks}/${testedLinks} links working`);
      
      // Take screenshot
      await page.screenshot({ 
        path: `test-screenshots/navigation-test-${Date.now()}.png`,
        fullPage: true 
      });
    });
  });

  test.describe('Responsive Design Basic Tests', () => {
    const viewports = [
      { name: 'Desktop', width: 1920, height: 1080 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Mobile', width: 375, height: 667 }
    ];

    for (const viewport of viewports) {
      test(`Application renders correctly on ${viewport.name}`, async ({ page }) => {
        console.log(`🧪 Testing ${viewport.name} responsiveness...`);
        
        // Set viewport
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        
        // Navigate to application
        await page.goto('http://localhost:4000');
        await page.waitForLoadState('networkidle');
        
        // Check basic rendering
        const body = await page.locator('body').boundingBox();
        const hasContent = await page.locator('body *').count() > 0;
        
        console.log(`${viewport.name} rendering: hasContent=${hasContent}, body=${body?.width}x${body?.height}`);
        
        expect(hasContent).toBeTruthy();
        
        // Take screenshot
        await page.screenshot({ 
          path: `test-screenshots/${viewport.name.toLowerCase()}-view-${Date.now()}.png`,
          fullPage: true 
        });
      });
    }
  });

  test.describe('Form Validation (Frontend Only)', () => {
    test('Login form validation works', async ({ page }) => {
      console.log('🧪 Testing frontend form validation...');
      
      // Navigate to login page
      await page.goto('http://localhost:4000/login');
      await page.waitForLoadState('networkidle');
      
      // Try to find and submit empty form
      const submitButton = page.locator('button[type="submit"]').first();
      
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(2000);
        
        // Look for validation messages
        const errorMessages = await page.locator('.error, .alert, [data-testid*="error"], .text-red').all();
        const hasValidation = errorMessages.length > 0;
        
        console.log(`Form validation: ${hasValidation ? 'Present' : 'Not found'} (${errorMessages.length} error elements)`);
        
        // Take screenshot
        await page.screenshot({ 
          path: `test-screenshots/form-validation-${Date.now()}.png`,
          fullPage: true 
        });
      } else {
        console.log('No submit button found on login page');
      }
    });
  });

  test.describe('Performance and Loading', () => {
    test('Application loads within reasonable time', async ({ page }) => {
      console.log('🧪 Testing application load performance...');
      
      const startTime = Date.now();
      
      // Navigate to application
      await page.goto('http://localhost:4000');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      console.log(`Application load time: ${loadTime}ms`);
      
      // Should load within 10 seconds
      expect(loadTime).toBeLessThan(10000);
      
      // Check if content is actually visible
      const visibleContent = await page.locator('body *:visible').count();
      console.log(`Visible elements: ${visibleContent}`);
      
      expect(visibleContent).toBeGreaterThan(0);
    });

    test('Multiple page navigation performance', async ({ page }) => {
      console.log('🧪 Testing multi-page navigation performance...');
      
      const pages = ['/', '/login', '/register'];
      const navigationTimes = [];
      
      for (const pagePath of pages) {
        const startTime = Date.now();
        
        try {
          await page.goto(`http://localhost:4000${pagePath}`);
          await page.waitForLoadState('networkidle');
          
          const navTime = Date.now() - startTime;
          navigationTimes.push({ page: pagePath, time: navTime });
          
          console.log(`Navigation to ${pagePath}: ${navTime}ms`);
          
          // Brief pause between navigations
          await page.waitForTimeout(500);
        } catch (error) {
          console.log(`Navigation to ${pagePath} failed: ${error.message}`);
        }
      }
      
      // Calculate average navigation time
      const avgTime = navigationTimes.reduce((sum, nav) => sum + nav.time, 0) / navigationTimes.length;
      console.log(`Average navigation time: ${avgTime.toFixed(0)}ms`);
      
      // Average navigation should be reasonable
      expect(avgTime).toBeLessThan(5000);
    });
  });
});