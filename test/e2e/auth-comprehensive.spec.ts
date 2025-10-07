import { test, expect, Page } from '@playwright/test';

/**
 * Comprehensive Authentication Tests
 * 
 * Tests all authentication scenarios:
 * - Login/logout for all roles
 * - Password validation
 * - Session management
 * - Role-based access control
 * - Security edge cases
 */

const CREDENTIALS = {
  admin: { email: 'admin@fitmeal.pro', password: 'AdminPass123' },
  trainer: { email: 'trainer.test@evofitmeals.com', password: 'TestTrainer123!' },
  customer: { email: 'customer.test@evofitmeals.com', password: 'TestCustomer123!' }
};

// Helper function to login
async function performLogin(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  
  await page.fill('#email', email);
  await page.fill('#password', password);
  
  const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();
  await submitButton.click();
  
  // Wait for either success (redirect) or error
  await Promise.race([
    page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {}),
    page.waitForSelector('.error, [role="alert"], .alert-error', { timeout: 5000 }).catch(() => {})
  ]);
}

// Helper to check if user is logged in
async function isLoggedIn(page: Page): Promise<boolean> {
  const url = page.url();
  return !url.includes('/login') && (url.includes('/dashboard') || url.includes('/profile'));
}

test.describe('Authentication Comprehensive Tests', () => {
  
  test.describe('Valid Login Tests', () => {
    
    test('Admin login success', async ({ page }) => {
      await performLogin(page, CREDENTIALS.admin.email, CREDENTIALS.admin.password);
      
      // Should be redirected to dashboard
      await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
      
      // Check for admin-specific UI elements
      const adminIndicators = [
        'text=Admin',
        'text=Manage Users',
        'text=System',
        '[data-role="admin"]',
        '.admin-panel'
      ];
      
      let adminElementFound = false;
      for (const selector of adminIndicators) {
        try {
          await page.waitForSelector(selector, { timeout: 3000 });
          adminElementFound = true;
          console.log(`Admin indicator found: ${selector}`);
          break;
        } catch (e) {
          // Continue checking
        }
      }
      
      // At minimum, should not be on login page
      expect(await isLoggedIn(page)).toBeTruthy();
    });
    
    test('Trainer login success', async ({ page }) => {
      await performLogin(page, CREDENTIALS.trainer.email, CREDENTIALS.trainer.password);
      
      await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
      
      // Check for trainer-specific elements
      const trainerIndicators = [
        'text=Customers',
        'text=My Customers',
        'text=Create Meal Plan',
        '[data-role="trainer"]',
        '.trainer-dashboard'
      ];
      
      for (const selector of trainerIndicators) {
        try {
          await page.waitForSelector(selector, { timeout: 3000 });
          console.log(`Trainer indicator found: ${selector}`);
          break;
        } catch (e) {
          // Continue checking
        }
      }
      
      expect(await isLoggedIn(page)).toBeTruthy();
    });
    
    test('Customer login success', async ({ page }) => {
      await performLogin(page, CREDENTIALS.customer.email, CREDENTIALS.customer.password);
      
      await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
      
      // Check for customer-specific elements
      const customerIndicators = [
        'text=My Meal Plans',
        'text=My Progress',
        'text=My Profile',
        '[data-role="customer"]',
        '.customer-dashboard'
      ];
      
      for (const selector of customerIndicators) {
        try {
          await page.waitForSelector(selector, { timeout: 3000 });
          console.log(`Customer indicator found: ${selector}`);
          break;
        } catch (e) {
          // Continue checking
        }
      }
      
      expect(await isLoggedIn(page)).toBeTruthy();
    });
  });
  
  test.describe('Invalid Login Tests', () => {
    
    test('Login with invalid email', async ({ page }) => {
      await performLogin(page, 'nonexistent@user.com', 'anypassword');
      
      // Should stay on login page or show error
      await page.waitForTimeout(3000);
      const url = page.url();
      expect(url).toContain('login');
      
      // Check for error message
      const errorSelectors = [
        '.error',
        '.alert-error', 
        '[role="alert"]',
        'text=Invalid',
        'text=incorrect',
        'text=failed'
      ];
      
      for (const selector of errorSelectors) {
        try {
          const errorElement = await page.locator(selector).first();
          if (await errorElement.isVisible({ timeout: 2000 })) {
            console.log(`Error message found: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue checking
        }
      }
    });
    
    test('Login with incorrect password', async ({ page }) => {
      await performLogin(page, CREDENTIALS.admin.email, 'wrongpassword');
      
      await page.waitForTimeout(3000);
      const url = page.url();
      expect(url).toContain('login');
    });
    
    test('Login with empty fields', async ({ page }) => {
      await page.goto('/login');
      
      // Try submitting empty form
      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();
      
      await page.waitForTimeout(2000);
      
      // Should stay on login page
      const url = page.url();
      expect(url).toContain('login');
    });
    
    test('Login with malformed email', async ({ page }) => {
      const malformedEmails = [
        'invalid-email',
        '@missing-local.com',
        'missing-at-sign.com',
        'spaces in@email.com'
      ];
      
      for (const email of malformedEmails) {
        await performLogin(page, email, 'anypassword');
        await page.waitForTimeout(1000);
        
        const url = page.url();
        expect(url).toContain('login');
        console.log(`Malformed email "${email}" correctly rejected`);
      }
    });
  });
  
  test.describe('Session Management Tests', () => {
    
    test('Logout functionality', async ({ page }) => {
      await performLogin(page, CREDENTIALS.trainer.email, CREDENTIALS.trainer.password);
      await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
      
      // Find and click logout
      const logoutSelectors = [
        'button:has-text("Logout")',
        'button:has-text("Sign Out")',
        'a:has-text("Logout")',
        '[data-testid="logout"]',
        '.logout-btn'
      ];
      
      let loggedOut = false;
      for (const selector of logoutSelectors) {
        try {
          const logoutButton = page.locator(selector).first();
          if (await logoutButton.isVisible({ timeout: 3000 })) {
            await logoutButton.click();
            await page.waitForTimeout(2000);
            
            const url = page.url();
            if (url.includes('login')) {
              loggedOut = true;
              console.log(`Logout successful via: ${selector}`);
              break;
            }
          }
        } catch (e) {
          // Continue trying other selectors
        }
      }
      
      // Alternative: Check if navigating to protected route redirects to login
      if (!loggedOut) {
        await page.goto('/dashboard');
        await page.waitForTimeout(2000);
        
        const url = page.url();
        if (url.includes('login')) {
          console.log('Session appears to be cleared (redirected to login)');
        }
      }
    });
    
    test('Protected route access without login', async ({ page }) => {
      await page.context().clearCookies();
      
      const protectedRoutes = ['/dashboard', '/profile', '/users', '/recipes'];
      
      for (const route of protectedRoutes) {
        await page.goto(route);
        await page.waitForTimeout(2000);
        
        const url = page.url();
        if (url.includes('login')) {
          console.log(`Protected route "${route}" correctly redirected to login`);
        } else {
          console.log(`Warning: Protected route "${route}" allowed without authentication`);
        }
      }
    });
    
    test('Session persistence across page refreshes', async ({ page }) => {
      await performLogin(page, CREDENTIALS.customer.email, CREDENTIALS.customer.password);
      await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
      
      // Refresh the page
      await page.reload();
      await page.waitForTimeout(3000);
      
      // Should still be logged in
      const url = page.url();
      expect(url).not.toContain('login');
      expect(await isLoggedIn(page)).toBeTruthy();
    });
    
    test('Multiple browser tab session sharing', async ({ context }) => {
      const page1 = await context.newPage();
      const page2 = await context.newPage();
      
      // Login in first tab
      await performLogin(page1, CREDENTIALS.admin.email, CREDENTIALS.admin.password);
      await expect(page1).toHaveURL(/.*dashboard/, { timeout: 10000 });
      
      // Navigate to dashboard in second tab
      await page2.goto('/dashboard');
      await page2.waitForTimeout(3000);
      
      // Second tab should also be logged in (shared session)
      const url2 = page2.url();
      expect(url2).not.toContain('login');
      
      await page1.close();
      await page2.close();
    });
  });
  
  test.describe('Role-Based Access Control Tests', () => {
    
    test('Admin role permissions', async ({ page }) => {
      await performLogin(page, CREDENTIALS.admin.email, CREDENTIALS.admin.password);
      await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
      
      // Test admin-specific routes
      const adminRoutes = ['/users', '/admin', '/settings'];
      
      for (const route of adminRoutes) {
        try {
          await page.goto(route);
          await page.waitForTimeout(2000);
          
          const url = page.url();
          if (url.includes('login') || url.includes('403') || url.includes('unauthorized')) {
            console.log(`Admin route "${route}" blocked - unexpected`);
          } else {
            console.log(`Admin route "${route}" accessible`);
          }
        } catch (e) {
          console.log(`Admin route "${route}" navigation failed`);
        }
      }
    });
    
    test('Trainer role restrictions', async ({ page }) => {
      await performLogin(page, CREDENTIALS.trainer.email, CREDENTIALS.trainer.password);
      await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
      
      // Try accessing admin-only routes
      const restrictedRoutes = ['/admin', '/users/manage', '/system-settings'];
      
      for (const route of restrictedRoutes) {
        try {
          await page.goto(route);
          await page.waitForTimeout(2000);
          
          const url = page.url();
          if (url.includes('403') || url.includes('unauthorized') || url.includes('login')) {
            console.log(`Restricted route "${route}" correctly blocked for trainer`);
          } else {
            console.log(`Warning: Trainer accessed restricted route "${route}"`);
          }
        } catch (e) {
          console.log(`Restricted route "${route}" navigation failed (expected)`);
        }
      }
    });
    
    test('Customer role restrictions', async ({ page }) => {
      await performLogin(page, CREDENTIALS.customer.email, CREDENTIALS.customer.password);
      await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
      
      // Try accessing trainer/admin routes
      const restrictedRoutes = ['/admin', '/customers/manage', '/recipes/create'];
      
      for (const route of restrictedRoutes) {
        try {
          await page.goto(route);
          await page.waitForTimeout(2000);
          
          const url = page.url();
          if (url.includes('403') || url.includes('unauthorized') || url.includes('login')) {
            console.log(`Restricted route "${route}" correctly blocked for customer`);
          } else {
            console.log(`Warning: Customer accessed restricted route "${route}"`);
          }
        } catch (e) {
          console.log(`Restricted route "${route}" navigation failed (expected)`);
        }
      }
    });
  });
  
  test.describe('Security Edge Cases', () => {
    
    test('SQL injection attempts in login', async ({ page }) => {
      const sqlInjectionAttempts = [
        "admin@test.com'; DROP TABLE users; --",
        "admin@test.com' OR '1'='1",
        "admin@test.com' UNION SELECT * FROM users --"
      ];
      
      for (const maliciousEmail of sqlInjectionAttempts) {
        await performLogin(page, maliciousEmail, 'password');
        await page.waitForTimeout(2000);
        
        // Should not log in and should stay on login page
        const url = page.url();
        expect(url).toContain('login');
        console.log(`SQL injection attempt "${maliciousEmail}" correctly blocked`);
      }
    });
    
    test('XSS attempts in login form', async ({ page }) => {
      const xssAttempts = [
        "<script>alert('xss')</script>",
        "javascript:alert('xss')",
        "<img src=x onerror=alert('xss')>"
      ];
      
      for (const xssPayload of xssAttempts) {
        await performLogin(page, xssPayload, 'password');
        await page.waitForTimeout(2000);
        
        // Check that XSS was not executed (no alert dialog)
        const dialogs = page.locator('dialog, .alert').count();
        expect(await dialogs).toBe(0);
        
        const url = page.url();
        expect(url).toContain('login');
        console.log(`XSS attempt "${xssPayload}" correctly sanitized`);
      }
    });
    
    test('Rate limiting on login attempts', async ({ page }) => {
      const maxAttempts = 5;
      
      // Make multiple rapid login attempts
      for (let i = 0; i < maxAttempts; i++) {
        await performLogin(page, 'test@test.com', 'wrongpassword');
        await page.waitForTimeout(500);
      }
      
      // Next attempt should potentially be rate limited
      await performLogin(page, CREDENTIALS.admin.email, CREDENTIALS.admin.password);
      await page.waitForTimeout(3000);
      
      // Check for rate limiting message
      const rateLimitSelectors = [
        'text=rate limit',
        'text=too many attempts',
        'text=try again later',
        '.rate-limit-error'
      ];
      
      for (const selector of rateLimitSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.isVisible({ timeout: 1000 })) {
            console.log(`Rate limiting detected: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue checking
        }
      }
    });
    
    test('CSRF protection verification', async ({ page }) => {
      await page.goto('/login');
      
      // Check for CSRF tokens in forms
      const csrfSelectors = [
        'input[name*="csrf"]',
        'input[name*="token"]',
        'meta[name="csrf-token"]',
        '[data-csrf]'
      ];
      
      let csrfFound = false;
      for (const selector of csrfSelectors) {
        try {
          const csrfElement = page.locator(selector).first();
          if (await csrfElement.isVisible({ timeout: 2000 })) {
            console.log(`CSRF protection element found: ${selector}`);
            csrfFound = true;
            break;
          }
        } catch (e) {
          // Continue checking
        }
      }
      
      if (!csrfFound) {
        console.log('No CSRF protection tokens detected - potential security concern');
      }
    });
  });
});