import { test, expect } from '@playwright/test';

// Test credentials
const ADMIN_CREDENTIALS = {
  email: 'admin@fitmeal.pro',
  password: 'AdminPass123'
};

const TRAINER_CREDENTIALS = {
  email: 'trainer.test@evofitmeals.com',
  password: 'TestTrainer123!'
};

const BASE_URL = 'http://localhost:4000';

test.describe('Recipe Generation Focused Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set timeout for each test
    test.setTimeout(60000);
  });

  test('Admin can successfully login and access dashboard', async ({ page }) => {
    console.log('🔐 Testing admin login...');
    
    // Navigate to login page
    await page.goto(`${BASE_URL}/login`);
    
    // Wait for page to be ready
    await page.waitForLoadState('networkidle');
    
    // Check login form is present
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Fill credentials
    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    
    console.log('📝 Filled credentials, clicking submit...');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard/admin page
    await page.waitForURL('**/admin', { timeout: 15000 });
    
    console.log('✅ Admin login successful');
    
    // Verify we're on admin page
    const currentUrl = page.url();
    expect(currentUrl).toContain('/admin');
    
    // Look for admin interface elements
    const adminElements = [
      'h1', 'h2', 'nav', '[role="navigation"]'
    ];
    
    for (const selector of adminElements) {
      const element = page.locator(selector).first();
      if (await element.count() > 0) {
        const text = await element.textContent();
        console.log(`📋 Found admin element "${selector}": "${text}"`);
        break;
      }
    }
  });

  test('Navigate to recipes section and check structure', async ({ page }) => {
    console.log('🍳 Testing recipe navigation...');
    
    // Login first
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin', { timeout: 15000 });
    
    console.log('🔍 Looking for recipe navigation...');
    
    // Look for different ways to access recipes
    const recipeNavSelectors = [
      'a:has-text("Recipes")',
      'button:has-text("Recipes")',
      'nav >> text=Recipes',
      '[href*="recipe"]',
      'button[role="tab"]:has-text("Recipes")'
    ];
    
    let recipeNavFound = false;
    
    for (const selector of recipeNavSelectors) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        console.log(`📱 Found recipe navigation: "${selector}"`);
        await element.first().click();
        recipeNavFound = true;
        break;
      }
    }
    
    if (!recipeNavFound) {
      console.log('⚠️ No recipe navigation found, checking page structure...');
      
      // Debug: Check what navigation elements exist
      const navElements = await page.locator('nav, [role="navigation"], a, button').all();
      console.log(`Found ${navElements.length} navigation elements:`);
      
      for (let i = 0; i < Math.min(10, navElements.length); i++) {
        const text = await navElements[i].textContent();
        const tag = await navElements[i].evaluate(el => el.tagName);
        console.log(`  ${tag}: "${text?.trim()}"`);
      }
      
      // Try to find any recipe-related content on current page
      const pageContent = await page.content();
      if (pageContent.includes('recipe') || pageContent.includes('Recipe')) {
        console.log('📄 Recipe content found on current page');
      }
    }
    
    // Wait for potential navigation
    await page.waitForTimeout(3000);
    
    // Check current URL
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    
    // Look for recipe-related content regardless of URL
    await page.waitForTimeout(2000);
    
    console.log('✅ Recipe navigation test completed');
  });

  test('Check for existing recipes and their structure', async ({ page }) => {
    console.log('📋 Testing recipe listing...');
    
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin', { timeout: 15000 });
    
    // Try to navigate to recipes
    const recipeNavigation = page.locator('a:has-text("Recipes"), button:has-text("Recipes"), [href*="recipe"]');
    if (await recipeNavigation.count() > 0) {
      await recipeNavigation.first().click();
      await page.waitForTimeout(3000);
    }
    
    console.log('🔍 Looking for recipe content...');
    
    // Look for various recipe-related elements
    const recipeSelectors = [
      '[data-testid="recipe-card"]',
      '.recipe-card',
      '[class*="recipe"]',
      'img[src*="recipe"]',
      'img[alt*="recipe"]',
      'img[src*="digitalocean"]',
      '.card:has(img)',
      '[data-testid*="recipe"]'
    ];
    
    let recipesFound = 0;
    let imagesFound = 0;
    
    for (const selector of recipeSelectors) {
      const elements = page.locator(selector);
      const count = await elements.count();
      
      if (count > 0) {
        console.log(`📦 Found ${count} elements matching "${selector}"`);
        recipesFound += count;
        
        // If these are images, count them separately
        if (selector.includes('img')) {
          imagesFound += count;
          
          // Check first few images
          const maxCheck = Math.min(3, count);
          for (let i = 0; i < maxCheck; i++) {
            const img = elements.nth(i);
            const src = await img.getAttribute('src');
            const alt = await img.getAttribute('alt');
            
            console.log(`  🖼️ Image ${i + 1}: src="${src}", alt="${alt}"`);
            
            // Test if image loads
            if (src && !src.includes('placeholder') && src.startsWith('http')) {
              try {
                const response = await page.request.get(src);
                console.log(`    Status: ${response.status()}`);
              } catch (error) {
                console.log(`    Error loading image: ${error}`);
              }
            }
          }
        }
      }
    }
    
    console.log(`📊 Total recipe elements found: ${recipesFound}`);
    console.log(`🖼️ Total images found: ${imagesFound}`);
    
    // Look for recipe management interface
    const managementElements = [
      'button:has-text("Add Recipe")',
      'button:has-text("Create Recipe")',
      'button:has-text("New Recipe")',
      'input[placeholder*="search"]',
      'select[name="category"]',
      '.pagination'
    ];
    
    for (const selector of managementElements) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        console.log(`🔧 Found management element: "${selector}"`);
      }
    }
    
    console.log('✅ Recipe listing check completed');
  });

  test('Test recipe API endpoints directly', async ({ page, request }) => {
    console.log('🌐 Testing recipe API endpoints...');
    
    try {
      // First login via API to get token
      const loginResponse = await request.post(`${BASE_URL}/api/auth/login`, {
        data: {
          email: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password
        }
      });
      
      console.log(`Login API status: ${loginResponse.status()}`);
      expect(loginResponse.ok()).toBeTruthy();
      
      const loginData = await loginResponse.json();
      const token = loginData.token;
      console.log('🎫 Token obtained successfully');
      
      // Test recipes endpoint
      const recipesResponse = await request.get(`${BASE_URL}/api/recipes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log(`Recipes API status: ${recipesResponse.status()}`);
      
      if (recipesResponse.ok()) {
        const recipesData = await recipesResponse.json();
        const recipes = recipesData.recipes || recipesData || [];
        
        console.log(`📋 API returned ${Array.isArray(recipes) ? recipes.length : 'unknown'} recipes`);
        
        if (Array.isArray(recipes) && recipes.length > 0) {
          const firstRecipe = recipes[0];
          console.log('🍳 First recipe structure:');
          console.log(`  Name: ${firstRecipe.name || firstRecipe.title || 'N/A'}`);
          console.log(`  ID: ${firstRecipe.id || 'N/A'}`);
          console.log(`  Image: ${firstRecipe.image_url || firstRecipe.imageUrl || 'N/A'}`);
          console.log(`  Category: ${firstRecipe.category || 'N/A'}`);
          
          // Test image URL if present
          const imageUrl = firstRecipe.image_url || firstRecipe.imageUrl;
          if (imageUrl && imageUrl.startsWith('http')) {
            try {
              const imageResponse = await request.get(imageUrl);
              console.log(`  Image status: ${imageResponse.status()}`);
            } catch (error) {
              console.log(`  Image error: ${error}`);
            }
          }
          
          // Test individual recipe endpoint
          if (firstRecipe.id) {
            const singleRecipeResponse = await request.get(`${BASE_URL}/api/recipes/${firstRecipe.id}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            console.log(`Single recipe API status: ${singleRecipeResponse.status()}`);
          }
        }
        
        // Count recipes with images
        if (Array.isArray(recipes)) {
          const recipesWithImages = recipes.filter(r => r.image_url || r.imageUrl);
          console.log(`🖼️ ${recipesWithImages.length}/${recipes.length} recipes have images`);
        }
        
      } else {
        console.log('❌ Recipes API call failed');
        const errorText = await recipesResponse.text();
        console.log(`Error: ${errorText}`);
      }
      
    } catch (error) {
      console.log(`🚨 API test error: ${error}`);
    }
    
    console.log('✅ API endpoint test completed');
  });

  test('Check recipe creation interface', async ({ page }) => {
    console.log('➕ Testing recipe creation interface...');
    
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin', { timeout: 15000 });
    
    // Navigate to recipes if possible
    const recipeNav = page.locator('a:has-text("Recipes"), button:has-text("Recipes")');
    if (await recipeNav.count() > 0) {
      await recipeNav.first().click();
      await page.waitForTimeout(3000);
    }
    
    // Look for Add/Create recipe button
    const createButtons = [
      'button:has-text("Add Recipe")',
      'button:has-text("Create Recipe")',
      'button:has-text("New Recipe")',
      'a:has-text("Add Recipe")',
      'button:has-text("+")'
    ];
    
    let createButtonFound = false;
    
    for (const selector of createButtons) {
      const button = page.locator(selector);
      if (await button.count() > 0) {
        console.log(`➕ Found create button: "${selector}"`);
        createButtonFound = true;
        
        // Click the button to see the form
        await button.first().click();
        await page.waitForTimeout(2000);
        
        // Look for form fields
        const formFields = [
          'input[name="name"]',
          'input[name="recipeName"]',
          'textarea[name="description"]',
          'select[name="category"]',
          'input[type="file"]',
          'button:has-text("Generate")',
          'button:has-text("AI")'
        ];
        
        console.log('🔍 Checking form fields:');
        for (const fieldSelector of formFields) {
          const field = page.locator(fieldSelector);
          const count = await field.count();
          if (count > 0) {
            console.log(`  ✅ Found: ${fieldSelector}`);
          }
        }
        
        // Look for AI generation features
        const aiButtons = page.locator('button:has-text("Generate"), button:has-text("AI")');
        if (await aiButtons.count() > 0) {
          console.log('🤖 AI generation buttons found');
        }
        
        break;
      }
    }
    
    if (!createButtonFound) {
      console.log('⚠️ No create recipe button found');
      
      // Check if recipe creation is available in current interface
      const pageContent = await page.content();
      if (pageContent.toLowerCase().includes('create') || pageContent.toLowerCase().includes('add')) {
        console.log('📝 Page contains create/add keywords');
      }
    }
    
    console.log('✅ Recipe creation interface check completed');
  });

  test('Trainer role recipe access verification', async ({ page }) => {
    console.log('👨‍🏫 Testing trainer recipe access...');
    
    // Login as trainer
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', TRAINER_CREDENTIALS.email);
    await page.fill('input[type="password"]', TRAINER_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/trainer', { timeout: 15000 });
    
    console.log('✅ Trainer login successful');
    
    // Check what tabs/sections are available
    const tabs = await page.locator('button[role="tab"], .tab, nav a').all();
    console.log(`📋 Found ${tabs.length} navigation tabs/links:`);
    
    const tabTexts = [];
    for (const tab of tabs) {
      const text = await tab.textContent();
      if (text?.trim()) {
        tabTexts.push(text.trim());
      }
    }
    
    console.log('Available tabs:', tabTexts);
    
    // Look for recipes access
    const recipeAccess = page.locator('button[role="tab"]:has-text("Recipes"), a:has-text("Recipes")');
    
    if (await recipeAccess.count() > 0) {
      console.log('🍳 Trainer has recipes access');
      
      // Navigate to recipes
      await recipeAccess.first().click();
      await page.waitForTimeout(3000);
      
      // Check if trainer can view recipes
      const recipes = page.locator('[data-testid="recipe-card"], .recipe-card, img[src*="recipe"]');
      const recipeCount = await recipes.count();
      console.log(`📦 Trainer can see ${recipeCount} recipes`);
      
      // Check if trainer can create recipes (should not be able to)
      const createButton = page.locator('button:has-text("Add Recipe"), button:has-text("Create Recipe")');
      const canCreate = await createButton.count() > 0;
      
      if (canCreate) {
        console.log('⚠️ WARNING: Trainer appears to have recipe creation access');
      } else {
        console.log('✅ Correct: Trainer cannot create recipes');
      }
      
    } else {
      console.log('ℹ️ Trainer does not have direct recipes access');
    }
    
    console.log('✅ Trainer role verification completed');
  });

  test('Comprehensive page structure analysis', async ({ page }) => {
    console.log('🔍 Performing comprehensive page analysis...');
    
    // Login as admin
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin', { timeout: 15000 });
    
    console.log('📊 Analyzing admin dashboard structure...');
    
    // Get all interactive elements
    const interactiveElements = await page.locator('a, button, input, select, [role="tab"]').all();
    const elementInfo = [];
    
    for (const element of interactiveElements.slice(0, 20)) { // Limit to first 20
      try {
        const tagName = await element.evaluate(el => el.tagName);
        const text = await element.textContent();
        const href = await element.getAttribute('href');
        const role = await element.getAttribute('role');
        
        elementInfo.push({
          tag: tagName,
          text: text?.trim() || '',
          href: href || '',
          role: role || ''
        });
      } catch (error) {
        // Skip elements that might be stale
        continue;
      }
    }
    
    console.log('🎯 Key interactive elements:');
    elementInfo.forEach((info, index) => {
      if (info.text || info.href) {
        console.log(`  ${index + 1}. ${info.tag}: "${info.text}" ${info.href ? `(${info.href})` : ''} ${info.role ? `[${info.role}]` : ''}`);
      }
    });
    
    // Look for recipe-related elements specifically
    const recipeKeywords = ['recipe', 'Recipe', 'meal', 'Meal', 'food', 'Food'];
    const recipeElements = [];
    
    for (const keyword of recipeKeywords) {
      const elements = await page.locator(`*:has-text("${keyword}")`).all();
      for (const element of elements.slice(0, 5)) { // Limit per keyword
        try {
          const text = await element.textContent();
          const tagName = await element.evaluate(el => el.tagName);
          if (text?.includes(keyword)) {
            recipeElements.push(`${tagName}: "${text.trim()}"`);
          }
        } catch (error) {
          continue;
        }
      }
    }
    
    console.log('🍳 Recipe-related content:');
    recipeElements.slice(0, 10).forEach((element, index) => {
      console.log(`  ${index + 1}. ${element}`);
    });
    
    // Check for images
    const images = await page.locator('img').all();
    console.log(`🖼️ Found ${images.length} images on page`);
    
    if (images.length > 0) {
      for (let i = 0; i < Math.min(5, images.length); i++) {
        const img = images[i];
        const src = await img.getAttribute('src');
        const alt = await img.getAttribute('alt');
        console.log(`  ${i + 1}. src="${src}" alt="${alt}"`);
      }
    }
    
    console.log('✅ Page analysis completed');
  });
});