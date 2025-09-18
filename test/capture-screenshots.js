import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function captureScreenshots() {
  console.log('Starting screenshot capture...');

  // Create screenshots directory if it doesn't exist
  const screenshotsDir = path.join(__dirname, '..', 'public', 'landing', 'images', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    // Capture landing page
    console.log('Capturing landing page...');
    await page.goto('http://localhost:4000/landing/index.html', { waitUntil: 'networkidle' });
    await page.screenshot({
      path: path.join(screenshotsDir, 'landing-hero.png'),
      fullPage: false
    });
    await page.screenshot({
      path: path.join(screenshotsDir, 'landing-full.png'),
      fullPage: true
    });

    // Login as admin to capture app pages
    console.log('Logging in as admin...');
    await page.goto('http://localhost:4000/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'admin@fitmeal.pro');
    await page.fill('input[type="password"]', 'AdminPass123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin', { timeout: 10000 });

    // Capture admin dashboard
    console.log('Capturing admin dashboard...');
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(screenshotsDir, 'admin-dashboard.png'),
      fullPage: false
    });

    // Capture recipes page
    console.log('Capturing recipes page...');
    await page.goto('http://localhost:4000/recipes', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(screenshotsDir, 'recipes-grid.png'),
      fullPage: false
    });

    // Capture meal plans page
    console.log('Capturing meal plans page...');
    await page.goto('http://localhost:4000/meal-plans', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(screenshotsDir, 'meal-plans.png'),
      fullPage: false
    });

    // For additional user roles, we'll use new browser contexts
    // Close current context and create new one for trainer
    await context.close();

    const trainerContext = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    const trainerPage = await trainerContext.newPage();

    console.log('Logging in as trainer...');
    await trainerPage.goto('http://localhost:4000/login', { waitUntil: 'networkidle' });
    await trainerPage.fill('input[type="email"]', 'trainer.test@evofitmeals.com');
    await trainerPage.fill('input[type="password"]', 'TestTrainer123!');
    await trainerPage.click('button[type="submit"]');
    await trainerPage.waitForURL('**/trainer', { timeout: 10000 });

    // Capture trainer dashboard
    console.log('Capturing trainer dashboard...');
    await trainerPage.waitForTimeout(2000);
    await trainerPage.screenshot({
      path: path.join(screenshotsDir, 'trainer-dashboard.png'),
      fullPage: false
    });

    // Capture customers page
    console.log('Capturing customers management page...');
    await trainerPage.goto('http://localhost:4000/customers', { waitUntil: 'networkidle' });
    await trainerPage.waitForTimeout(2000);
    await trainerPage.screenshot({
      path: path.join(screenshotsDir, 'customer-management.png'),
      fullPage: false
    });

    await trainerContext.close();

    // Create new context for customer
    const customerContext = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    const customerPage = await customerContext.newPage();

    console.log('Logging in as customer...');
    await customerPage.goto('http://localhost:4000/login', { waitUntil: 'networkidle' });
    await customerPage.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await customerPage.fill('input[type="password"]', 'TestCustomer123!');
    await customerPage.click('button[type="submit"]');
    await customerPage.waitForURL('**/customer', { timeout: 10000 });

    // Capture customer view
    console.log('Capturing customer meal plan view...');
    await customerPage.waitForTimeout(2000);
    await customerPage.screenshot({
      path: path.join(screenshotsDir, 'customer-view.png'),
      fullPage: false
    });

    // Try to capture progress tracking if available
    const progressTab = await customerPage.$('button:has-text("Progress")');
    if (progressTab) {
      console.log('Capturing progress tracking...');
      await progressTab.click();
      await customerPage.waitForTimeout(2000);
      await customerPage.screenshot({
        path: path.join(screenshotsDir, 'progress-tracking.png'),
        fullPage: false
      });
    }

    await customerContext.close();

    console.log('Screenshot capture complete!');
    console.log(`Screenshots saved to: ${screenshotsDir}`);

  } catch (error) {
    console.error('Error capturing screenshots:', error);
  } finally {
    await browser.close();
  }
}

// Run the screenshot capture
captureScreenshots().catch(console.error);