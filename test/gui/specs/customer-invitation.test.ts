import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import puppeteer, { Browser, Page } from 'puppeteer';
import { BrowserUtils } from '../utils/browser-utils';
import { VisualTesting } from '../utils/visual-testing';

describe('Customer Invitation Feature', () => {
  let browser: Browser;
  let page: Page;
  const testEmail = `testcustomer${Date.now()}@test.com`;
  const trainerEmail = `testtrainer${Date.now()}@test.com`;
  const trainerPassword = 'TestPass123@';

  beforeEach(async () => {
    browser = await puppeteer.launch({
      headless: process.env.CI === 'true',
      slowMo: 50,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    page = await browser.newPage();

    // Set viewport for consistent testing
    await page.setViewport({ width: 1280, height: 800 });
    
    // Enable request interception to monitor network calls
    await page.setRequestInterception(true);
    const networkRequests: any[] = [];
    
    page.on('request', (request) => {
      if (request.url().includes('/api/')) {
        networkRequests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
          postData: request.postData()
        });
      }
      request.continue();
    });

    // Store network requests for later inspection
    (page as any).networkRequests = networkRequests;
  });

  afterEach(async () => {
    await browser.close();
  });

  describe('Complete Invitation Flow', () => {
    it('should allow trainer to send customer invitation and display success', async () => {
      console.log('🧪 Testing customer invitation feature...');

      // Step 1: Register a new trainer account
      console.log('📝 Step 1: Registering trainer account...');
      await page.goto('http://localhost:4000/register');
      await page.waitForSelector('input[type="email"]');

      await page.type('input[type="email"]', trainerEmail);
      await page.type('input[type="password"]', trainerPassword);
      
      // Select trainer role
      const roleSelect = await page.$('select[name="role"], [data-testid="role-select"]');
      if (roleSelect) {
        await page.select('select[name="role"]', 'trainer');
      } else {
        // Try clicking trainer role button/radio
        const trainerRole = await page.$('[data-testid="trainer-role"], input[value="trainer"]');
        if (trainerRole) {
          await trainerRole.click();
        }
      }

      await page.click('button[type="submit"], [data-testid="register-button"]');
      
      // Wait for registration success and redirect
      await browserUtils.waitForNavigation();
      
      // Step 2: Navigate to trainer profile
      console.log('👤 Step 2: Navigating to trainer profile...');
      
      // Try multiple possible navigation paths
      const profilePaths = [
        'a[href="/trainer-profile"]',
        'a[href="/profile"]', 
        '[data-testid="trainer-profile-link"]',
        'text=Profile',
        'text=Trainer Profile'
      ];

      let navigated = false;
      for (const selector of profilePaths) {
        try {
          const element = await page.$(selector);
          if (element) {
            await element.click();
            navigated = true;
            break;
          }
        } catch (e) {
          // Try next selector
        }
      }

      // If no navigation link found, try direct URL
      if (!navigated) {
        await page.goto('http://localhost:4000/trainer-profile');
      }

      await browserUtils.waitForSelector('h1, [data-testid="trainer-profile-title"]');

      // Step 3: Open invitation modal
      console.log('📧 Step 3: Opening invitation modal...');
      
      const inviteSelectors = [
        'button:has-text("Send Customer Invitation")',
        '[data-testid="send-invitation-button"]',
        'text=Send Customer Invitation'
      ];

      let inviteButton = null;
      for (const selector of inviteSelectors) {
        try {
          inviteButton = await page.$(selector);
          if (inviteButton) break;
        } catch (e) {
          // Try next selector
        }
      }

      expect(inviteButton).toBeTruthy();
      await inviteButton!.click();

      // Wait for modal to appear
      await browserUtils.waitForSelector('input[type="email"], [data-testid="customer-email-input"]');

      // Step 4: Fill invitation form
      console.log('✍️ Step 4: Filling invitation form...');
      
      const emailInput = await page.$('input[type="email"], [data-testid="customer-email-input"]');
      expect(emailInput).toBeTruthy();
      
      await emailInput!.clear();
      await emailInput!.type(testEmail);

      // Add optional message
      const messageTextarea = await page.$('textarea, [data-testid="invitation-message"]');
      if (messageTextarea) {
        await messageTextarea.type('Welcome to FitMeal Pro! I look forward to helping you reach your fitness goals.');
      }

      // Step 5: Send invitation
      console.log('🚀 Step 5: Sending invitation...');
      
      const sendButton = await page.$('button[type="submit"], button:has-text("Send Invitation"), [data-testid="send-invitation-submit"]');
      expect(sendButton).toBeTruthy();
      
      await sendButton!.click();

      // Step 6: Verify success
      console.log('✅ Step 6: Verifying success...');
      
      // Wait for success toast/notification
      await browserUtils.waitForSelector('.toast, [data-testid="success-toast"], .notification', { timeout: 10000 });
      
      // Verify success message content
      const successElement = await page.$('.toast, [data-testid="success-toast"], .notification');
      const successText = await successElement?.textContent();
      expect(successText).toContain('Invitation sent');
      expect(successText).toContain(testEmail);

      // Step 7: Verify invitation appears in recent invitations
      console.log('📋 Step 7: Verifying invitation in recent list...');
      
      // Wait for modal to close
      await browserUtils.waitForTimeout(2000);
      
      // Look for recent invitations section
      const recentInvitations = await page.$('text=Recent Invitations, [data-testid="recent-invitations"]');
      if (recentInvitations) {
        // Verify the invitation email appears in the list
        const invitationList = await page.$(`text=${testEmail}`);
        expect(invitationList).toBeTruthy();
        
        // Verify status badge shows "Pending"
        const statusBadge = await page.$('text=Pending');
        expect(statusBadge).toBeTruthy();
      }

      // Step 8: Verify API calls were made correctly
      console.log('🔍 Step 8: Verifying API calls...');
      
      const networkRequests = (page as any).networkRequests;
      const invitationRequest = networkRequests.find((req: any) => 
        req.url.includes('/api/invitations/send') && req.method === 'POST'
      );
      
      expect(invitationRequest).toBeTruthy();
      expect(invitationRequest.headers.authorization).toMatch(/^Bearer /);
      
      const requestData = JSON.parse(invitationRequest.postData || '{}');
      expect(requestData.customerEmail).toBe(testEmail);

      console.log('🎉 Customer invitation test completed successfully!');
    });

    it('should handle invitation form validation errors', async () => {
      console.log('🧪 Testing invitation form validation...');

      // Step 1: Login as existing trainer (reuse from previous test or create new)
      await page.goto('http://localhost:4000/login');
      await browserUtils.waitForSelector('input[type="email"]');
      
      // For this test, we'll create a quick trainer account
      await page.goto('http://localhost:4000/register');
      await page.type('input[type="email"]', `trainer${Date.now()}@test.com`);
      await page.type('input[type="password"]', 'TestPass123@');
      
      const roleSelect = await page.$('select[name="role"]');
      if (roleSelect) {
        await page.select('select[name="role"]', 'trainer');
      }
      
      await page.click('button[type="submit"]');
      await browserUtils.waitForNavigation();

      // Navigate to trainer profile
      await page.goto('http://localhost:4000/trainer-profile');
      await browserUtils.waitForSelector('h1');

      // Open invitation modal
      const inviteButton = await page.$('button:has-text("Send Customer Invitation"), [data-testid="send-invitation-button"]');
      await inviteButton!.click();
      await browserUtils.waitForSelector('input[type="email"]');

      // Step 2: Test empty email validation
      console.log('📧 Testing empty email validation...');
      
      const sendButton = await page.$('button[type="submit"], button:has-text("Send Invitation")');
      await sendButton!.click();

      // Should show validation error
      const errorMessage = await browserUtils.waitForSelector('.toast, [data-testid="error-toast"], .error');
      const errorText = await errorMessage.textContent();
      expect(errorText).toContain('email');

      // Step 3: Test invalid email format
      console.log('📧 Testing invalid email format...');
      
      const emailInput = await page.$('input[type="email"]');
      await emailInput!.clear();
      await emailInput!.type('invalid-email-format');
      await sendButton!.click();

      // Should show validation error for invalid email
      await browserUtils.waitForTimeout(1000);
      const invalidEmailError = await page.$('.toast, [data-testid="error-toast"], .error');
      if (invalidEmailError) {
        const errorText = await invalidEmailError.textContent();
        expect(errorText).toMatch(/email|invalid|format/i);
      }

      console.log('✅ Validation tests completed successfully!');
    });

    it('should handle duplicate invitation attempts', async () => {
      console.log('🧪 Testing duplicate invitation handling...');

      const duplicateEmail = `duplicate${Date.now()}@test.com`;
      
      // Register trainer and navigate to profile (simplified)
      await page.goto('http://localhost:4000/register');
      await page.type('input[type="email"]', `trainer${Date.now()}@test.com`);
      await page.type('input[type="password"]', 'TestPass123@');
      
      const roleSelect = await page.$('select[name="role"]');
      if (roleSelect) {
        await page.select('select[name="role"]', 'trainer');
      }
      
      await page.click('button[type="submit"]');
      await browserUtils.waitForNavigation();
      await page.goto('http://localhost:4000/trainer-profile');

      // Send first invitation
      const inviteButton = await page.$('button:has-text("Send Customer Invitation")');
      await inviteButton!.click();
      await browserUtils.waitForSelector('input[type="email"]');
      
      const emailInput = await page.$('input[type="email"]');
      await emailInput!.type(duplicateEmail);
      
      const sendButton = await page.$('button[type="submit"], button:has-text("Send Invitation")');
      await sendButton!.click();
      
      // Wait for success
      await browserUtils.waitForSelector('.toast');
      await browserUtils.waitForTimeout(3000);

      // Try to send duplicate invitation
      console.log('🔄 Attempting duplicate invitation...');
      
      await inviteButton!.click();
      await browserUtils.waitForSelector('input[type="email"]');
      
      const emailInput2 = await page.$('input[type="email"]');
      await emailInput2!.clear();
      await emailInput2!.type(duplicateEmail);
      await sendButton!.click();

      // Should show error for duplicate invitation
      const duplicateError = await browserUtils.waitForSelector('.toast, [data-testid="error-toast"]');
      const errorText = await duplicateError.textContent();
      expect(errorText).toMatch(/already sent|pending|duplicate/i);

      console.log('✅ Duplicate invitation test completed successfully!');
    });
  });

  describe('Visual Regression Tests', () => {
    it('should match invitation modal appearance', async () => {
      // Quick setup
      await page.goto('http://localhost:4000/register');
      await page.type('input[type="email"]', `trainer${Date.now()}@test.com`);
      await page.type('input[type="password"]', 'TestPass123@');
      
      const roleSelect = await page.$('select[name="role"]');
      if (roleSelect) {
        await page.select('select[name="role"]', 'trainer');
      }
      
      await page.click('button[type="submit"]');
      await browserUtils.waitForNavigation();
      await page.goto('http://localhost:4000/trainer-profile');

      // Open modal
      const inviteButton = await page.$('button:has-text("Send Customer Invitation")');
      await inviteButton!.click();
      await browserUtils.waitForSelector('input[type="email"]');

      // Take screenshot and compare
      await visualTesting.compareScreenshot('invitation-modal', {
        fullPage: false,
        clip: { x: 0, y: 0, width: 800, height: 600 }
      });
    });
  });
});