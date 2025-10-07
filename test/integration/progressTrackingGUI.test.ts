import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import puppeteer from 'puppeteer';
import type { Browser, Page } from 'puppeteer';
import { spawn, ChildProcess } from 'child_process';

describe('Progress Tracking GUI Integration Tests', () => {
  let browser: Browser;
  let page: Page;
  let serverProcess: ChildProcess | null = null;
  const BASE_URL = 'http://localhost:4000';
  const TEST_EMAIL = 'test-customer@example.com';
  const TEST_PASSWORD = 'testpassword123';

  beforeAll(async () => {
    // Start the development server using Docker
    console.log('Starting development server...');
    serverProcess = spawn('docker-compose', ['--profile', 'dev', 'up', '-d'], {
      stdio: 'pipe',
      cwd: process.cwd()
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 15000));

    // Launch browser
    browser = await puppeteer.launch({
      headless: false, // Set to true for CI/CD
      defaultViewport: { width: 1280, height: 720 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => console.log('Browser Console:', msg.text()));
    page.on('pageerror', error => console.error('Browser Error:', error.message));
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
    
    if (serverProcess) {
      // Stop the development server
      const stopProcess = spawn('docker-compose', ['--profile', 'dev', 'down'], {
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      await new Promise((resolve) => {
        stopProcess.on('close', resolve);
      });
    }
  });

  beforeEach(async () => {
    // Clear browser storage and cookies
    await page.goto(BASE_URL);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Clear cookies
    const cookies = await page.cookies();
    await page.deleteCookie(...cookies);
  });

  describe('Authentication and Navigation', () => {
    test('should login and navigate to customer progress tab', async () => {
      // Navigate to login page
      await page.goto(`${BASE_URL}/login`);
      await page.waitForSelector('input[type="email"]', { timeout: 10000 });

      // Login
      await page.type('input[type="email"]', TEST_EMAIL);
      await page.type('input[type="password"]', TEST_PASSWORD);
      await page.click('button[type="submit"]');

      // Wait for navigation to customer page
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
      
      // Should be on customer dashboard
      expect(page.url()).toContain('/customer');

      // Check if progress tab exists
      const progressTab = await page.waitForSelector('[role="tab"]:has-text("Progress")', { timeout: 5000 });
      expect(progressTab).toBeTruthy();

      // Click progress tab
      await progressTab.click();
      
      // Wait for progress content to load
      await page.waitForSelector('text=Progress Tracking', { timeout: 5000 });
      
      // Verify URL includes progress parameter
      const url = page.url();
      expect(url).toContain('tab=progress');
    });

    test('should navigate to progress from profile page', async () => {
      // First login
      await page.goto(`${BASE_URL}/login`);
      await page.waitForSelector('input[type="email"]');
      await page.type('input[type="email"]', TEST_EMAIL);
      await page.type('input[type="password"]', TEST_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForNavigation();

      // Navigate to profile page
      await page.goto(`${BASE_URL}/profile`);
      await page.waitForSelector('text=My Profile', { timeout: 5000 });

      // Find and click "View Progress" button
      const viewProgressButton = await page.waitForSelector('button:has-text("View Progress")', { timeout: 5000 });
      await viewProgressButton.click();

      // Should navigate to customer page with progress tab
      await page.waitForSelector('text=Progress Tracking', { timeout: 5000 });
      expect(page.url()).toContain('/customer?tab=progress');
    });
  });

  describe('Progress Tracking Dashboard', () => {
    beforeEach(async () => {
      // Login and navigate to progress tab
      await page.goto(`${BASE_URL}/login`);
      await page.waitForSelector('input[type="email"]');
      await page.type('input[type="email"]', TEST_EMAIL);
      await page.type('input[type="password"]', TEST_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForNavigation();
      
      // Navigate directly to progress tab
      await page.goto(`${BASE_URL}/customer?tab=progress`);
      await page.waitForSelector('text=Progress Tracking', { timeout: 10000 });
    });

    test('should display progress tracking dashboard with all tabs', async () => {
      // Check main heading
      const heading = await page.waitForSelector('text=Progress Tracking');
      expect(heading).toBeTruthy();

      // Check description
      const description = await page.waitForSelector('text=Track your fitness journey');
      expect(description).toBeTruthy();

      // Check quick stats cards
      const weightCard = await page.waitForSelector('text=Current Weight');
      const bodyFatCard = await page.waitForSelector('text=Body Fat %');
      const goalsCard = await page.waitForSelector('text=Active Goals');
      const photosCard = await page.waitForSelector('text=Progress Photos');

      expect(weightCard).toBeTruthy();
      expect(bodyFatCard).toBeTruthy();
      expect(goalsCard).toBeTruthy();
      expect(photosCard).toBeTruthy();

      // Check tabs
      const measurementsTab = await page.waitForSelector('[role="tab"]:has-text("Measurements")');
      const photosTab = await page.waitForSelector('[role="tab"]:has-text("Progress Photos")');
      const goalsTab = await page.waitForSelector('[role="tab"]:has-text("Goals")');

      expect(measurementsTab).toBeTruthy();
      expect(photosTab).toBeTruthy();
      expect(goalsTab).toBeTruthy();
    });

    test('should switch between tabs correctly', async () => {
      // Should start on measurements tab
      const measurementsContent = await page.waitForSelector('text=Body Measurements');
      expect(measurementsContent).toBeTruthy();

      // Click Goals tab
      const goalsTab = await page.waitForSelector('[role="tab"]:has-text("Goals")');
      await goalsTab.click();
      
      // Wait for goals content
      await page.waitForSelector('text=Fitness Goals', { timeout: 5000 });
      const goalsContent = await page.$('text=Fitness Goals');
      expect(goalsContent).toBeTruthy();

      // Click Photos tab
      const photosTab = await page.waitForSelector('[role="tab"]:has-text("Progress Photos")');
      await photosTab.click();
      
      // Wait for photos content
      await page.waitForSelector('text=Progress Photos', { timeout: 5000 });
      const photosContent = await page.$('text=Upload Photo');
      expect(photosContent).toBeTruthy();

      // Go back to measurements
      const measurementsTab = await page.waitForSelector('[role="tab"]:has-text("Measurements")');
      await measurementsTab.click();
      
      await page.waitForSelector('text=Body Measurements', { timeout: 5000 });
      const backToMeasurements = await page.$('text=Add Measurement');
      expect(backToMeasurements).toBeTruthy();
    });
  });

  describe('Measurements Tab Functionality', () => {
    beforeEach(async () => {
      // Login and navigate to measurements tab
      await page.goto(`${BASE_URL}/login`);
      await page.waitForSelector('input[type="email"]');
      await page.type('input[type="email"]', TEST_EMAIL);
      await page.type('input[type="password"]', TEST_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForNavigation();
      
      await page.goto(`${BASE_URL}/customer?tab=progress`);
      await page.waitForSelector('text=Body Measurements', { timeout: 10000 });
    });

    test('should open add measurement dialog', async () => {
      // Click Add Measurement button
      const addButton = await page.waitForSelector('button:has-text("Add Measurement")');
      await addButton.click();

      // Wait for dialog to appear
      await page.waitForSelector('text=Add New Measurement', { timeout: 5000 });
      
      // Check form fields are present
      const dateInput = await page.waitForSelector('input[type="date"]');
      const weightInput = await page.waitForSelector('input[placeholder*="Weight"]');
      const bodyFatInput = await page.waitForSelector('input[placeholder*="Body Fat"]');
      
      expect(dateInput).toBeTruthy();
      expect(weightInput).toBeTruthy();
      expect(bodyFatInput).toBeTruthy();

      // Check save button exists
      const saveButton = await page.waitForSelector('button:has-text("Save Measurement")');
      expect(saveButton).toBeTruthy();
    });

    test('should create new measurement with form validation', async () => {
      // Open add measurement dialog
      const addButton = await page.waitForSelector('button:has-text("Add Measurement")');
      await addButton.click();
      await page.waitForSelector('text=Add New Measurement');

      // Fill out the form
      await page.fill('input[type="date"]', '2024-01-15');
      
      // Find weight input by label
      const weightInput = await page.locator('label:has-text("Weight") + input').first();
      await weightInput.fill('175.5');
      
      // Find body fat input
      const bodyFatInput = await page.locator('label:has-text("Body Fat") + input').first();
      await bodyFatInput.fill('14.8');
      
      // Find notes textarea
      const notesInput = await page.locator('label:has-text("Notes") + textarea').first();
      await notesInput.fill('Feeling great today!');

      // Submit form
      const saveButton = await page.waitForSelector('button:has-text("Save Measurement")');
      await saveButton.click();

      // Wait for success feedback (toast or dialog close)
      await page.waitForTimeout(2000);
      
      // Dialog should close
      const dialogStillOpen = await page.$('text=Add New Measurement');
      expect(dialogStillOpen).toBeFalsy();
    });

    test('should display measurement history', async () => {
      // Wait for measurements to load
      await page.waitForSelector('text=Measurement History', { timeout: 10000 });
      
      // Check if table/list exists
      const historySection = await page.waitForSelector('text=Measurement History');
      expect(historySection).toBeTruthy();
      
      // Should show latest measurement section
      const latestSection = await page.$('text=Latest Measurement');
      if (latestSection) {
        expect(latestSection).toBeTruthy();
      }
    });
  });

  describe('Goals Tab Functionality', () => {
    beforeEach(async () => {
      // Login and navigate to goals tab
      await page.goto(`${BASE_URL}/login`);
      await page.waitForSelector('input[type="email"]');
      await page.type('input[type="email"]', TEST_EMAIL);
      await page.type('input[type="password"]', TEST_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForNavigation();
      
      await page.goto(`${BASE_URL}/customer?tab=progress`);
      await page.waitForSelector('text=Progress Tracking');
      
      // Click Goals tab
      const goalsTab = await page.waitForSelector('[role="tab"]:has-text("Goals")');
      await goalsTab.click();
      await page.waitForSelector('text=Fitness Goals', { timeout: 5000 });
    });

    test('should display goals interface', async () => {
      // Check main heading
      const heading = await page.waitForSelector('text=Fitness Goals');
      expect(heading).toBeTruthy();

      // Check set new goal button
      const newGoalButton = await page.waitForSelector('button:has-text("Set New Goal")');
      expect(newGoalButton).toBeTruthy();

      // Check for goals sections
      const activeGoalsSection = await page.$('text=Active Goals');
      const completedGoalsSection = await page.$('text=Completed Goals');
      
      // At least one should exist
      expect(activeGoalsSection || completedGoalsSection).toBeTruthy();
    });

    test('should open create goal dialog', async () => {
      // Click Set New Goal button
      const newGoalButton = await page.waitForSelector('button:has-text("Set New Goal")');
      await newGoalButton.click();

      // Wait for dialog
      await page.waitForSelector('text=Set a New Goal', { timeout: 5000 });
      
      // Check form fields
      const goalTypeSelect = await page.waitForSelector('select[name="goalType"], [role="combobox"]');
      const goalNameInput = await page.waitForSelector('input[placeholder*="goal name"], input[name="goalName"]');
      const targetValueInput = await page.waitForSelector('input[placeholder*="target"], input[name="targetValue"]');
      
      expect(goalTypeSelect).toBeTruthy();
      expect(goalNameInput).toBeTruthy();
      expect(targetValueInput).toBeTruthy();
    });

    test('should create new goal', async () => {
      // Open create goal dialog
      const newGoalButton = await page.waitForSelector('button:has-text("Set New Goal")');
      await newGoalButton.click();
      await page.waitForSelector('text=Set a New Goal');

      // Fill out form
      const goalNameInput = await page.locator('label:has-text("Goal Name") + input').first();
      await goalNameInput.fill('Lose 10 pounds');
      
      const targetValueInput = await page.locator('label:has-text("Target Value") + input').first();
      await targetValueInput.fill('170');
      
      const unitInput = await page.locator('label:has-text("Unit") + input').first();
      await unitInput.fill('lbs');

      // Submit form
      const createButton = await page.waitForSelector('button:has-text("Create Goal")');
      await createButton.click();

      // Wait for success
      await page.waitForTimeout(2000);
      
      // Dialog should close
      const dialogStillOpen = await page.$('text=Set a New Goal');
      expect(dialogStillOpen).toBeFalsy();
    });
  });

  describe('Photos Tab Functionality', () => {
    beforeEach(async () => {
      // Login and navigate to photos tab
      await page.goto(`${BASE_URL}/login`);
      await page.waitForSelector('input[type="email"]');
      await page.type('input[type="email"]', TEST_EMAIL);
      await page.type('input[type="password"]', TEST_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForNavigation();
      
      await page.goto(`${BASE_URL}/customer?tab=progress`);
      await page.waitForSelector('text=Progress Tracking');
      
      // Click Photos tab
      const photosTab = await page.waitForSelector('[role="tab"]:has-text("Progress Photos")');
      await photosTab.click();
      await page.waitForSelector('text=Upload Photo', { timeout: 5000 });
    });

    test('should display photos interface', async () => {
      // Check main heading
      const heading = await page.waitForSelector('text=Progress Photos');
      expect(heading).toBeTruthy();

      // Check upload button
      const uploadButton = await page.waitForSelector('button:has-text("Upload Photo")');
      expect(uploadButton).toBeTruthy();

      // Check description text
      const description = await page.waitForSelector('text=Progress photos help you visually track');
      expect(description).toBeTruthy();

      // Check coming soon message (since upload is not fully implemented)
      const comingSoon = await page.$('text=Photo upload functionality coming soon');
      expect(comingSoon).toBeTruthy();
    });

    test('should have functional upload button', async () => {
      // Click upload button
      const uploadButton = await page.waitForSelector('button:has-text("Upload Photo")');
      expect(uploadButton).toBeTruthy();
      
      // Button should be enabled
      const isDisabled = await uploadButton.evaluate(button => button.disabled);
      expect(isDisabled).toBeFalsy();
      
      // Clicking should not cause errors (even if functionality is coming soon)
      await uploadButton.click();
      
      // Should not crash the page
      const pageStillWorking = await page.$('text=Progress Photos');
      expect(pageStillWorking).toBeTruthy();
    });
  });

  describe('Responsive Design Tests', () => {
    test('should work on mobile viewport', async () => {
      // Set mobile viewport
      await page.setViewport({ width: 375, height: 667 });
      
      // Login and navigate
      await page.goto(`${BASE_URL}/login`);
      await page.waitForSelector('input[type="email"]');
      await page.type('input[type="email"]', TEST_EMAIL);
      await page.type('input[type="password"]', TEST_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForNavigation();
      
      await page.goto(`${BASE_URL}/customer?tab=progress`);
      await page.waitForSelector('text=Progress Tracking', { timeout: 10000 });

      // Check that tabs are still functional
      const goalsTab = await page.waitForSelector('[role="tab"]:has-text("Goals")');
      await goalsTab.click();
      await page.waitForSelector('text=Fitness Goals');
      
      // Check that buttons are clickable
      const newGoalButton = await page.waitForSelector('button:has-text("Set New Goal")');
      expect(newGoalButton).toBeTruthy();
      
      // Reset viewport
      await page.setViewport({ width: 1280, height: 720 });
    });

    test('should work on tablet viewport', async () => {
      // Set tablet viewport
      await page.setViewport({ width: 768, height: 1024 });
      
      // Login and navigate
      await page.goto(`${BASE_URL}/login`);
      await page.waitForSelector('input[type="email"]');
      await page.type('input[type="email"]', TEST_EMAIL);
      await page.type('input[type="password"]', TEST_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForNavigation();
      
      await page.goto(`${BASE_URL}/customer?tab=progress`);
      await page.waitForSelector('text=Progress Tracking', { timeout: 10000 });

      // Verify layout works at tablet size
      const quickStats = await page.$$('text=Current Weight, text=Body Fat %, text=Active Goals, text=Progress Photos');
      expect(quickStats.length).toBeGreaterThan(0);
      
      // Reset viewport
      await page.setViewport({ width: 1280, height: 720 });
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.waitForSelector('input[type="email"]');
      await page.type('input[type="email"]', TEST_EMAIL);
      await page.type('input[type="password"]', TEST_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForNavigation();

      // Intercept API calls and make them fail
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        if (request.url().includes('/api/progress/')) {
          request.abort();
        } else {
          request.continue();
        }
      });

      // Navigate to progress tab
      await page.goto(`${BASE_URL}/customer?tab=progress`);
      
      // Should still render the basic structure even if API fails
      await page.waitForSelector('text=Progress Tracking', { timeout: 10000 });
      
      // Should show add buttons even if data fails to load
      const addMeasurement = await page.$('button:has-text("Add Measurement")');
      expect(addMeasurement).toBeTruthy();

      // Disable request interception
      await page.setRequestInterception(false);
    });

    test('should handle authentication errors', async () => {
      // Navigate to progress without logging in
      await page.goto(`${BASE_URL}/customer?tab=progress`);
      
      // Should redirect to login or show auth error
      await page.waitForTimeout(3000);
      
      const currentUrl = page.url();
      const isLoginPage = currentUrl.includes('/login');
      const hasAuthError = await page.$('text=unauthorized, text=login required, text=authentication');
      
      // Should either redirect to login or show an auth error
      expect(isLoginPage || hasAuthError).toBeTruthy();
    });
  });

  describe('Performance Tests', () => {
    test('should load progress tracking page within reasonable time', async () => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.waitForSelector('input[type="email"]');
      await page.type('input[type="email"]', TEST_EMAIL);
      await page.type('input[type="password"]', TEST_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForNavigation();

      // Measure page load time
      const startTime = Date.now();
      
      await page.goto(`${BASE_URL}/customer?tab=progress`);
      await page.waitForSelector('text=Progress Tracking', { timeout: 10000 });
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 10 seconds (generous for Docker environment)
      expect(loadTime).toBeLessThan(10000);
    });

    test('should handle tab switching efficiently', async () => {
      // Login and navigate
      await page.goto(`${BASE_URL}/login`);
      await page.waitForSelector('input[type="email"]');
      await page.type('input[type="email"]', TEST_EMAIL);
      await page.type('input[type="password"]', TEST_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForNavigation();
      
      await page.goto(`${BASE_URL}/customer?tab=progress`);
      await page.waitForSelector('text=Progress Tracking');

      // Measure tab switching performance
      const startTime = Date.now();
      
      // Switch to Goals tab
      const goalsTab = await page.waitForSelector('[role="tab"]:has-text("Goals")');
      await goalsTab.click();
      await page.waitForSelector('text=Fitness Goals');
      
      // Switch to Photos tab
      const photosTab = await page.waitForSelector('[role="tab"]:has-text("Progress Photos")');
      await photosTab.click();
      await page.waitForSelector('text=Upload Photo');
      
      // Switch back to Measurements
      const measurementsTab = await page.waitForSelector('[role="tab"]:has-text("Measurements")');
      await measurementsTab.click();
      await page.waitForSelector('text=Body Measurements');
      
      const switchTime = Date.now() - startTime;
      
      // Tab switching should be fast (under 3 seconds total)
      expect(switchTime).toBeLessThan(3000);
    });
  });
});