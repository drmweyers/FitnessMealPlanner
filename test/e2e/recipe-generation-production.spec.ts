import { test, expect, Page } from '@playwright/test';

// Test configuration for production
const PRODUCTION_URL = 'https://evofitmeals.com';
const LOCAL_URL = 'http://localhost:4000';

// Test credentials
const TEST_ADMIN = {
  email: 'admin@fitmeal.pro',
  password: 'AdminPass123',
};

test.describe('Recipe Generation - Production vs Development', () => {
  let adminToken: string;

  test.beforeEach(async ({ page }) => {
    // Set a longer timeout for production tests
    test.setTimeout(60000);
  });

  test('should access production site successfully', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    await expect(page).toHaveTitle(/FitnessMealPlanner|EvoFit/i);
    
    // Check if login page loads
    const loginButton = page.locator('button:has-text("Sign In"), button:has-text("Login")').first();
    await expect(loginButton).toBeVisible({ timeout: 10000 });
  });

  test('should login as admin on production', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/login`);
    
    // Fill login form
    await page.fill('input[type="email"], input[name="email"]', TEST_ADMIN.email);
    await page.fill('input[type="password"], input[name="password"]', TEST_ADMIN.password);
    
    // Click login button
    await page.click('button[type="submit"]:has-text("Sign In"), button[type="submit"]:has-text("Login")');
    
    // Wait for redirect to dashboard
    await page.waitForURL(/dashboard|admin/i, { timeout: 10000 });
    
    // Verify logged in
    const dashboardElement = page.locator('h1:has-text("Dashboard"), h2:has-text("Dashboard"), nav:has-text("Dashboard")').first();
    await expect(dashboardElement).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to recipe management on production', async ({ page }) => {
    // Login first
    await page.goto(`${PRODUCTION_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', TEST_ADMIN.email);
    await page.fill('input[type="password"], input[name="password"]', TEST_ADMIN.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|admin/i, { timeout: 10000 });
    
    // Navigate to recipes
    await page.click('a:has-text("Recipes"), button:has-text("Recipes")');
    await page.waitForURL(/recipes/i, { timeout: 10000 });
    
    // Check if recipe page loaded
    const recipeHeader = page.locator('h1:has-text("Recipe"), h2:has-text("Recipe")').first();
    await expect(recipeHeader).toBeVisible({ timeout: 10000 });
  });

  test('should test recipe generation API on production', async ({ page }) => {
    // Login to get token
    await page.goto(`${PRODUCTION_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', TEST_ADMIN.email);
    await page.fill('input[type="password"], input[name="password"]', TEST_ADMIN.password);
    
    // Intercept the login response to get the token
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/test-auth') || 
      response.url().includes('/api/auth/login') ||
      response.url().includes('/api/login')
    );
    
    await page.click('button[type="submit"]');
    
    try {
      const response = await responsePromise;
      const responseData = await response.json();
      
      if (responseData.token) {
        adminToken = responseData.token;
      } else if (responseData.accessToken) {
        adminToken = responseData.accessToken;
      }
      
      // Also check headers for tokens
      const accessToken = response.headers()['x-access-token'];
      if (accessToken) {
        adminToken = accessToken;
      }
    } catch (error) {
      console.log('Could not extract token from login response');
    }
    
    // Wait for navigation
    await page.waitForURL(/dashboard|admin/i, { timeout: 10000 });
  });

  test('should generate recipes with images on production', async ({ page }) => {
    // Login
    await page.goto(`${PRODUCTION_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', TEST_ADMIN.email);
    await page.fill('input[type="password"], input[name="password"]', TEST_ADMIN.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|admin/i, { timeout: 10000 });
    
    // Navigate to admin recipes page
    await page.goto(`${PRODUCTION_URL}/admin/recipes`);
    
    // Look for generate button
    const generateButton = page.locator('button:has-text("Generate"), button:has-text("Create Recipe")').first();
    
    if (await generateButton.isVisible({ timeout: 5000 })) {
      // Click generate button
      await generateButton.click();
      
      // Wait for generation to start
      await page.waitForTimeout(3000);
      
      // Check for success message or new recipes
      const successMessage = page.locator('text=/generated|created|success/i').first();
      const hasSuccess = await successMessage.isVisible({ timeout: 10000 }).catch(() => false);
      
      if (hasSuccess) {
        console.log('Recipe generation triggered successfully on production');
      }
    } else {
      console.log('Generate button not found, checking existing recipes');
    }
    
    // Check if recipes have images with correct S3 URLs
    await page.goto(`${PRODUCTION_URL}/recipes`);
    await page.waitForTimeout(2000);
    
    // Check for recipe images
    const recipeImages = page.locator('img[src*="digitaloceanspaces.com"], img[src*="pti"]');
    const imageCount = await recipeImages.count();
    
    if (imageCount > 0) {
      console.log(`Found ${imageCount} recipe images from S3`);
      
      // Check first image URL
      const firstImageSrc = await recipeImages.first().getAttribute('src');
      console.log('First recipe image URL:', firstImageSrc);
      
      // Verify it's using the correct bucket
      expect(firstImageSrc).toContain('pti');
      expect(firstImageSrc).toContain('digitaloceanspaces.com');
    } else {
      console.log('No recipe images found with S3 URLs');
    }
  });

  test('should compare recipe generation between production and development', async ({ page }) => {
    const results = {
      production: { working: false, hasImages: false, bucket: '' },
      development: { working: false, hasImages: false, bucket: '' },
    };
    
    // Test production
    try {
      await page.goto(`${PRODUCTION_URL}/recipes`);
      await page.waitForTimeout(2000);
      
      const prodImages = page.locator('img[src*="digitaloceanspaces.com"]');
      const prodImageCount = await prodImages.count();
      
      if (prodImageCount > 0) {
        results.production.hasImages = true;
        const src = await prodImages.first().getAttribute('src');
        if (src?.includes('pti')) {
          results.production.bucket = 'pti';
          results.production.working = true;
        } else if (src?.includes('healthtech')) {
          results.production.bucket = 'healthtech';
        }
      }
    } catch (error) {
      console.log('Production test error:', error);
    }
    
    // Test development
    try {
      await page.goto(`${LOCAL_URL}/recipes`);
      await page.waitForTimeout(2000);
      
      const devImages = page.locator('img[src*="digitaloceanspaces.com"]');
      const devImageCount = await devImages.count();
      
      if (devImageCount > 0) {
        results.development.hasImages = true;
        const src = await devImages.first().getAttribute('src');
        if (src?.includes('pti')) {
          results.development.bucket = 'pti';
          results.development.working = true;
        } else if (src?.includes('healthtech')) {
          results.development.bucket = 'healthtech';
        }
      }
    } catch (error) {
      console.log('Development test error:', error);
    }
    
    // Output comparison results
    console.log('\n=== Recipe Generation Comparison ===');
    console.log('Production:');
    console.log(`  - Working: ${results.production.working}`);
    console.log(`  - Has Images: ${results.production.hasImages}`);
    console.log(`  - S3 Bucket: ${results.production.bucket}`);
    console.log('Development:');
    console.log(`  - Working: ${results.development.working}`);
    console.log(`  - Has Images: ${results.development.hasImages}`);
    console.log(`  - S3 Bucket: ${results.development.bucket}`);
    console.log('=====================================\n');
    
    // Both should be using the 'pti' bucket now
    expect(results.production.bucket).toBe('pti');
    expect(results.development.bucket).toBe('pti');
  });

  test('should verify S3 image URLs are accessible', async ({ page }) => {
    // Test a direct S3 URL
    const testImageUrl = 'https://tor1.digitaloceanspaces.com/pti/recipes/placeholder.jpg';
    
    const response = await page.request.get(testImageUrl);
    
    // Check if image is accessible
    if (response.ok()) {
      console.log('✅ S3 bucket is accessible and configured correctly');
    } else {
      console.log(`❌ S3 bucket returned status: ${response.status()}`);
    }
    
    // Also test through the app
    await page.goto(`${PRODUCTION_URL}/recipes`);
    
    // Wait for images to load
    await page.waitForTimeout(3000);
    
    // Check for broken images
    const brokenImages = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.filter(img => !img.complete || img.naturalHeight === 0).map(img => img.src);
    });
    
    if (brokenImages.length > 0) {
      console.log('Found broken images:', brokenImages);
    } else {
      console.log('✅ All recipe images loaded successfully');
    }
    
    expect(brokenImages.length).toBe(0);
  });

  test('should test recipe generation button functionality', async ({ page }) => {
    // Login as admin
    await page.goto(`${PRODUCTION_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', TEST_ADMIN.email);
    await page.fill('input[type="password"], input[name="password"]', TEST_ADMIN.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|admin/i, { timeout: 10000 });
    
    // Go to admin panel
    await page.goto(`${PRODUCTION_URL}/admin`);
    await page.waitForTimeout(2000);
    
    // Check for recipe generation section
    const recipeSection = page.locator('text=/recipe.*generation|generate.*recipe/i').first();
    
    if (await recipeSection.isVisible({ timeout: 5000 })) {
      console.log('✅ Recipe generation section found');
      
      // Look for generation controls
      const generateButton = page.locator('button:has-text("Generate")').first();
      const batchButton = page.locator('button:has-text("Batch")').first();
      
      if (await generateButton.isVisible({ timeout: 3000 })) {
        console.log('✅ Generate button is visible');
        
        // Test if button is enabled
        const isDisabled = await generateButton.isDisabled();
        if (!isDisabled) {
          console.log('✅ Generate button is enabled and ready');
        } else {
          console.log('⚠️ Generate button is disabled');
        }
      }
      
      if (await batchButton.isVisible({ timeout: 3000 })) {
        console.log('✅ Batch generation button found');
      }
    } else {
      console.log('⚠️ Recipe generation section not found in admin panel');
    }
  });
});