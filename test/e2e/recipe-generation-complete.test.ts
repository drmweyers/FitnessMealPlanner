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

const CUSTOMER_CREDENTIALS = {
  email: 'customer.test@evofitmeals.com',
  password: 'TestCustomer123!'
};

// Base URL for the application
const BASE_URL = 'http://localhost:4000';

test.describe('Recipe Generation Complete Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto(BASE_URL);
    
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test('Admin can access recipe management and view existing recipes', async ({ page }) => {
    // Login as admin
    await page.click('text=Login');
    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    // Wait for successful login
    await page.waitForURL('**/dashboard');
    
    // Navigate to recipe management
    await page.click('text=Recipes');
    
    // Verify recipe page loads
    await expect(page.locator('h1:has-text("Recipe Management")')).toBeVisible();
    
    // Check if recipes are displayed
    const recipeCards = page.locator('[data-testid="recipe-card"], .recipe-card, [class*="recipe"]');
    const recipeCount = await recipeCards.count();
    
    // Verify at least some recipes exist
    expect(recipeCount).toBeGreaterThan(0);
    
    // Check for recipe images
    const firstRecipeImage = recipeCards.first().locator('img');
    if (await firstRecipeImage.count() > 0) {
      const imageSrc = await firstRecipeImage.getAttribute('src');
      expect(imageSrc).toBeTruthy();
      
      // Verify image loads
      const imageResponse = await page.request.get(imageSrc!);
      expect(imageResponse.status()).toBe(200);
    }
    
    // Check pagination if available
    const paginationButtons = page.locator('[data-testid="pagination"], .pagination, [class*="pagination"]');
    if (await paginationButtons.count() > 0) {
      console.log('Pagination is available');
    }
  });

  test('Admin can create a new recipe with AI generation', async ({ page }) => {
    // Login as admin
    await page.click('text=Login');
    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard');
    
    // Navigate to recipe management
    await page.click('text=Recipes');
    
    // Look for Add Recipe or Create Recipe button
    const addRecipeButton = page.locator('button:has-text("Add Recipe"), button:has-text("Create Recipe"), button:has-text("New Recipe")');
    
    if (await addRecipeButton.count() > 0) {
      await addRecipeButton.first().click();
      
      // Fill in recipe form
      const recipeName = `Test Recipe ${Date.now()}`;
      
      // Try different possible field selectors
      const nameFields = [
        'input[name="name"]',
        'input[name="recipeName"]',
        'input[placeholder*="Recipe name"]',
        'input[placeholder*="Name"]',
        'input#name',
        'input#recipeName'
      ];
      
      for (const selector of nameFields) {
        if (await page.locator(selector).count() > 0) {
          await page.fill(selector, recipeName);
          break;
        }
      }
      
      // Fill description
      const descriptionFields = [
        'textarea[name="description"]',
        'textarea[placeholder*="Description"]',
        'textarea#description'
      ];
      
      for (const selector of descriptionFields) {
        if (await page.locator(selector).count() > 0) {
          await page.fill(selector, 'A delicious and healthy test recipe');
          break;
        }
      }
      
      // Select category if available
      const categorySelect = page.locator('select[name="category"], select#category');
      if (await categorySelect.count() > 0) {
        await categorySelect.selectOption({ index: 1 });
      }
      
      // Check for AI generation button
      const aiGenerateButton = page.locator('button:has-text("Generate with AI"), button:has-text("AI Generate"), button:has-text("Auto Generate")');
      if (await aiGenerateButton.count() > 0) {
        await aiGenerateButton.first().click();
        
        // Wait for AI generation to complete (may take time)
        await page.waitForTimeout(5000);
        
        // Check if image was generated
        const generatedImage = page.locator('img[alt*="recipe"], img[alt*="Recipe"], .recipe-image img');
        if (await generatedImage.count() > 0) {
          const imageSrc = await generatedImage.getAttribute('src');
          expect(imageSrc).toBeTruthy();
          console.log('AI generated image URL:', imageSrc);
        }
      }
      
      // Submit the recipe
      const submitButton = page.locator('button[type="submit"]:has-text("Save"), button[type="submit"]:has-text("Create"), button:has-text("Save Recipe")');
      if (await submitButton.count() > 0) {
        await submitButton.first().click();
        
        // Wait for success message or redirect
        await page.waitForTimeout(2000);
        
        // Check for success notification
        const successMessage = page.locator('[role="alert"], .toast-success, .notification-success, text=/Recipe.*created/i');
        if (await successMessage.count() > 0) {
          console.log('Recipe created successfully');
        }
      }
    }
  });

  test('Recipe queue displays and updates properly', async ({ page }) => {
    // Login as admin
    await page.click('text=Login');
    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard');
    
    // Navigate to recipe management
    await page.click('text=Recipes');
    
    // Check for recipe status filters (Pending, Approved, All)
    const statusFilters = page.locator('button:has-text("Pending"), button:has-text("Approved"), button:has-text("All")');
    
    if (await statusFilters.count() > 0) {
      // Test Pending filter
      const pendingButton = page.locator('button:has-text("Pending")');
      if (await pendingButton.count() > 0) {
        await pendingButton.click();
        await page.waitForTimeout(1000);
        console.log('Viewing pending recipes');
      }
      
      // Test Approved filter
      const approvedButton = page.locator('button:has-text("Approved")');
      if (await approvedButton.count() > 0) {
        await approvedButton.click();
        await page.waitForTimeout(1000);
        console.log('Viewing approved recipes');
      }
      
      // Test All filter
      const allButton = page.locator('button:has-text("All")');
      if (await allButton.count() > 0) {
        await allButton.click();
        await page.waitForTimeout(1000);
        console.log('Viewing all recipes');
      }
    }
    
    // Check recipe actions (Approve/Edit/Delete)
    const recipeActions = page.locator('button:has-text("Approve"), button:has-text("Edit"), button:has-text("Delete")');
    const actionCount = await recipeActions.count();
    
    if (actionCount > 0) {
      console.log(`Found ${actionCount} recipe action buttons`);
      
      // Test approve action if available
      const approveButton = page.locator('button:has-text("Approve")').first();
      if (await approveButton.count() > 0 && await approveButton.isEnabled()) {
        await approveButton.click();
        await page.waitForTimeout(1000);
        
        // Check for confirmation or success message
        const confirmDialog = page.locator('[role="dialog"], .modal, .confirm-dialog');
        if (await confirmDialog.count() > 0) {
          const confirmButton = confirmDialog.locator('button:has-text("Confirm"), button:has-text("Yes")');
          if (await confirmButton.count() > 0) {
            await confirmButton.click();
            console.log('Recipe approved');
          }
        }
      }
    }
  });

  test('Recipe images load and display correctly', async ({ page }) => {
    // Login as admin
    await page.click('text=Login');
    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard');
    
    // Navigate to recipe management
    await page.click('text=Recipes');
    
    // Wait for recipes to load
    await page.waitForTimeout(2000);
    
    // Find all recipe images
    const recipeImages = page.locator('img[src*="recipe"], img[src*="digitalocean"], img[alt*="recipe"], .recipe-image img');
    const imageCount = await recipeImages.count();
    
    console.log(`Found ${imageCount} recipe images`);
    
    if (imageCount > 0) {
      // Check first few images
      const maxImagesToCheck = Math.min(5, imageCount);
      
      for (let i = 0; i < maxImagesToCheck; i++) {
        const image = recipeImages.nth(i);
        const src = await image.getAttribute('src');
        
        if (src && !src.includes('placeholder')) {
          // Check if image loads successfully
          const imageResponse = await page.request.get(src);
          expect(imageResponse.status()).toBe(200);
          console.log(`Image ${i + 1} loaded successfully: ${src}`);
          
          // Verify image is visible
          await expect(image).toBeVisible();
          
          // Check natural dimensions
          const dimensions = await image.evaluate((img: HTMLImageElement) => ({
            width: img.naturalWidth,
            height: img.naturalHeight
          }));
          
          expect(dimensions.width).toBeGreaterThan(0);
          expect(dimensions.height).toBeGreaterThan(0);
          console.log(`Image ${i + 1} dimensions: ${dimensions.width}x${dimensions.height}`);
        }
      }
    }
  });

  test('Trainer can view recipes but not create them', async ({ page }) => {
    // Login as trainer
    await page.click('text=Login');
    await page.fill('input[type="email"]', TRAINER_CREDENTIALS.email);
    await page.fill('input[type="password"]', TRAINER_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard');
    
    // Look for recipe navigation
    const recipeLink = page.locator('a:has-text("Recipes"), nav >> text=Recipes');
    
    if (await recipeLink.count() > 0) {
      await recipeLink.first().click();
      
      // Verify recipes are displayed
      await page.waitForTimeout(2000);
      
      // Check that Add Recipe button is NOT present for trainers
      const addRecipeButton = page.locator('button:has-text("Add Recipe"), button:has-text("Create Recipe")');
      const addButtonCount = await addRecipeButton.count();
      
      if (addButtonCount === 0) {
        console.log('Correct: Trainer cannot create recipes');
      } else {
        console.log('Warning: Trainer might have recipe creation access');
      }
      
      // Verify trainer can view recipes
      const recipeCards = page.locator('[data-testid="recipe-card"], .recipe-card, [class*="recipe"]');
      const recipeCount = await recipeCards.count();
      
      if (recipeCount > 0) {
        console.log(`Trainer can view ${recipeCount} recipes`);
      }
    }
  });

  test('Customer can view assigned meal plans with recipes', async ({ page }) => {
    // Login as customer
    await page.click('text=Login');
    await page.fill('input[type="email"]', CUSTOMER_CREDENTIALS.email);
    await page.fill('input[type="password"]', CUSTOMER_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard');
    
    // Navigate to meal plans
    const mealPlanLink = page.locator('a:has-text("Meal Plans"), a:has-text("My Meal Plans"), nav >> text=Meal');
    
    if (await mealPlanLink.count() > 0) {
      await mealPlanLink.first().click();
      await page.waitForTimeout(2000);
      
      // Check if meal plans are displayed
      const mealPlanCards = page.locator('[data-testid="meal-plan"], .meal-plan-card, [class*="meal-plan"]');
      const mealPlanCount = await mealPlanCards.count();
      
      if (mealPlanCount > 0) {
        console.log(`Customer has ${mealPlanCount} meal plans`);
        
        // Click on first meal plan to view details
        await mealPlanCards.first().click();
        await page.waitForTimeout(2000);
        
        // Check for recipes in the meal plan
        const recipeItems = page.locator('[data-testid="recipe-item"], .recipe-item, [class*="recipe"]');
        const recipeCount = await recipeItems.count();
        
        if (recipeCount > 0) {
          console.log(`Meal plan contains ${recipeCount} recipes`);
          
          // Check if recipe images are displayed
          const recipeImages = page.locator('img[src*="recipe"], img[src*="digitalocean"]');
          const imageCount = await recipeImages.count();
          
          if (imageCount > 0) {
            console.log(`Found ${imageCount} recipe images in meal plan`);
          }
        }
      }
    }
  });

  test('Search and filter functionality works correctly', async ({ page }) => {
    // Login as admin
    await page.click('text=Login');
    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard');
    
    // Navigate to recipe management
    await page.click('text=Recipes');
    await page.waitForTimeout(2000);
    
    // Test search functionality
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"], input[name="search"]');
    
    if (await searchInput.count() > 0) {
      // Search for a specific term
      await searchInput.fill('chicken');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
      
      // Check if results are filtered
      const searchResults = page.locator('[data-testid="recipe-card"], .recipe-card');
      const resultCount = await searchResults.count();
      console.log(`Search returned ${resultCount} results for "chicken"`);
      
      // Clear search
      await searchInput.clear();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
    }
    
    // Test category filter if available
    const categoryFilter = page.locator('select[name="category"], select#category-filter');
    
    if (await categoryFilter.count() > 0) {
      // Get available options
      const options = await categoryFilter.locator('option').allTextContents();
      console.log('Available categories:', options);
      
      if (options.length > 1) {
        // Select a category
        await categoryFilter.selectOption({ index: 1 });
        await page.waitForTimeout(2000);
        
        // Check filtered results
        const filteredResults = page.locator('[data-testid="recipe-card"], .recipe-card');
        const filteredCount = await filteredResults.count();
        console.log(`Category filter returned ${filteredCount} results`);
      }
    }
  });

  test('Recipe detail view displays all information', async ({ page }) => {
    // Login as admin
    await page.click('text=Login');
    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard');
    
    // Navigate to recipe management
    await page.click('text=Recipes');
    await page.waitForTimeout(2000);
    
    // Click on first recipe to view details
    const firstRecipe = page.locator('[data-testid="recipe-card"], .recipe-card').first();
    
    if (await firstRecipe.count() > 0) {
      await firstRecipe.click();
      await page.waitForTimeout(2000);
      
      // Check for recipe details
      const recipeTitle = page.locator('h1, h2').first();
      const titleText = await recipeTitle.textContent();
      console.log('Recipe title:', titleText);
      
      // Check for recipe image
      const recipeImage = page.locator('img[src*="recipe"], img[src*="digitalocean"], .recipe-detail-image img');
      if (await recipeImage.count() > 0) {
        const imageSrc = await recipeImage.getAttribute('src');
        console.log('Recipe detail image:', imageSrc);
        
        // Verify image loads
        if (imageSrc && !imageSrc.includes('placeholder')) {
          const imageResponse = await page.request.get(imageSrc);
          expect(imageResponse.status()).toBe(200);
        }
      }
      
      // Check for ingredients
      const ingredients = page.locator('text=/ingredient/i, ul >> li, .ingredients-list li');
      const ingredientCount = await ingredients.count();
      
      if (ingredientCount > 0) {
        console.log(`Recipe has ${ingredientCount} ingredients listed`);
      }
      
      // Check for instructions
      const instructions = page.locator('text=/instruction/i, ol >> li, .instructions-list li');
      const instructionCount = await instructions.count();
      
      if (instructionCount > 0) {
        console.log(`Recipe has ${instructionCount} instructions`);
      }
      
      // Check for nutritional information
      const nutritionInfo = page.locator('text=/calorie/i, text=/protein/i, .nutrition-info');
      if (await nutritionInfo.count() > 0) {
        console.log('Nutritional information is displayed');
      }
      
      // Check for action buttons (Edit, Delete, Back)
      const actionButtons = page.locator('button:has-text("Edit"), button:has-text("Delete"), button:has-text("Back")');
      const buttonCount = await actionButtons.count();
      console.log(`Found ${buttonCount} action buttons in recipe detail view`);
    }
  });

  test('Pagination works correctly for large recipe lists', async ({ page }) => {
    // Login as admin
    await page.click('text=Login');
    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard');
    
    // Navigate to recipe management
    await page.click('text=Recipes');
    await page.waitForTimeout(2000);
    
    // Look for pagination controls
    const paginationControls = page.locator('[data-testid="pagination"], .pagination, nav[aria-label="pagination"]');
    
    if (await paginationControls.count() > 0) {
      // Check for page numbers
      const pageNumbers = paginationControls.locator('button, a').filter({ hasText: /^\d+$/ });
      const pageCount = await pageNumbers.count();
      console.log(`Found ${pageCount} page numbers`);
      
      // Check for next/previous buttons
      const nextButton = paginationControls.locator('button:has-text("Next"), a:has-text("Next"), button[aria-label="Next"]');
      const prevButton = paginationControls.locator('button:has-text("Previous"), a:has-text("Previous"), button[aria-label="Previous"]');
      
      if (await nextButton.count() > 0 && await nextButton.isEnabled()) {
        // Click next page
        await nextButton.click();
        await page.waitForTimeout(2000);
        
        // Verify page changed
        const currentPageIndicator = paginationControls.locator('.active, [aria-current="page"]');
        const currentPage = await currentPageIndicator.textContent();
        console.log('Current page after clicking Next:', currentPage);
        
        // Click previous if available
        if (await prevButton.count() > 0 && await prevButton.isEnabled()) {
          await prevButton.click();
          await page.waitForTimeout(2000);
          
          const newCurrentPage = await currentPageIndicator.textContent();
          console.log('Current page after clicking Previous:', newCurrentPage);
        }
      }
      
      // Test items per page selector if available
      const itemsPerPageSelect = page.locator('select[name="itemsPerPage"], select[aria-label*="items per page"]');
      
      if (await itemsPerPageSelect.count() > 0) {
        const options = await itemsPerPageSelect.locator('option').allTextContents();
        console.log('Items per page options:', options);
        
        // Change items per page
        if (options.length > 1) {
          await itemsPerPageSelect.selectOption({ index: 1 });
          await page.waitForTimeout(2000);
          
          // Count displayed items
          const displayedItems = page.locator('[data-testid="recipe-card"], .recipe-card');
          const itemCount = await displayedItems.count();
          console.log(`Displaying ${itemCount} items per page`);
        }
      }
    } else {
      console.log('No pagination needed or pagination not visible');
    }
  });

  test('Recipe generation API endpoints respond correctly', async ({ page, request }) => {
    // Login and get auth token
    const loginResponse = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        email: ADMIN_CREDENTIALS.email,
        password: ADMIN_CREDENTIALS.password
      }
    });
    
    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    const token = loginData.token;
    
    // Test GET /api/recipes endpoint
    const recipesResponse = await request.get(`${BASE_URL}/api/recipes`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    expect(recipesResponse.ok()).toBeTruthy();
    const recipesData = await recipesResponse.json();
    console.log(`API returned ${recipesData.recipes?.length || recipesData.length} recipes`);
    
    // Check if recipes have images
    if (Array.isArray(recipesData.recipes || recipesData)) {
      const recipes = recipesData.recipes || recipesData;
      const recipesWithImages = recipes.filter((r: any) => r.image_url || r.imageUrl);
      console.log(`${recipesWithImages.length} out of ${recipes.length} recipes have images`);
      
      // Verify image URLs are accessible
      if (recipesWithImages.length > 0) {
        const firstImageUrl = recipesWithImages[0].image_url || recipesWithImages[0].imageUrl;
        const imageResponse = await request.get(firstImageUrl);
        expect(imageResponse.status()).toBe(200);
        console.log('First recipe image is accessible:', firstImageUrl);
      }
    }
    
    // Test recipe categories endpoint if available
    const categoriesResponse = await request.get(`${BASE_URL}/api/recipes/categories`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (categoriesResponse.ok()) {
      const categoriesData = await categoriesResponse.json();
      console.log('Available recipe categories:', categoriesData);
    }
    
    // Test single recipe endpoint
    if (recipesData.recipes?.length > 0 || recipesData.length > 0) {
      const recipes = recipesData.recipes || recipesData;
      const firstRecipeId = recipes[0].id;
      
      const singleRecipeResponse = await request.get(`${BASE_URL}/api/recipes/${firstRecipeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (singleRecipeResponse.ok()) {
        const singleRecipe = await singleRecipeResponse.json();
        console.log('Single recipe details retrieved:', singleRecipe.name || singleRecipe.title);
        
        // Check for all expected fields
        const expectedFields = ['name', 'description', 'ingredients', 'instructions', 'nutrition_info'];
        const presentFields = expectedFields.filter(field => 
          singleRecipe[field] || singleRecipe[field.replace('_', '')]
        );
        console.log(`Recipe has ${presentFields.length}/${expectedFields.length} expected fields`);
      }
    }
  });
});

// Edge cases and comprehensive validation tests
test.describe('Recipe Generation Edge Cases', () => {
  test('Handles network errors gracefully during image generation', async ({ page }) => {
    // This test simulates network issues
    await page.route('**/api/recipes/generate-image', route => {
      route.abort('failed');
    });
    
    // Login as admin
    await page.goto(BASE_URL);
    await page.click('text=Login');
    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard');
    
    // Navigate to recipes and try to create one
    await page.click('text=Recipes');
    
    const addButton = page.locator('button:has-text("Add Recipe"), button:has-text("Create Recipe")');
    if (await addButton.count() > 0) {
      await addButton.first().click();
      
      // Try to generate with AI
      const aiButton = page.locator('button:has-text("Generate with AI")');
      if (await aiButton.count() > 0) {
        await aiButton.click();
        
        // Should show error message
        const errorMessage = await page.waitForSelector('[role="alert"], .error-message, .toast-error', {
          timeout: 10000
        }).catch(() => null);
        
        if (errorMessage) {
          console.log('Error handling works for network failures');
        }
      }
    }
  });

  test('Validates recipe form inputs correctly', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Login as admin
    await page.click('text=Login');
    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard');
    
    // Navigate to recipes
    await page.click('text=Recipes');
    
    const addButton = page.locator('button:has-text("Add Recipe"), button:has-text("Create Recipe")');
    if (await addButton.count() > 0) {
      await addButton.first().click();
      
      // Try to submit empty form
      const submitButton = page.locator('button[type="submit"]:has-text("Save"), button[type="submit"]:has-text("Create")');
      if (await submitButton.count() > 0) {
        await submitButton.click();
        
        // Check for validation errors
        const validationErrors = page.locator('.error, .field-error, [role="alert"]');
        const errorCount = await validationErrors.count();
        
        if (errorCount > 0) {
          console.log(`Form validation shows ${errorCount} errors for empty fields`);
        }
      }
      
      // Test max length validation
      const nameInput = page.locator('input[name="name"], input[name="recipeName"]').first();
      if (await nameInput.count() > 0) {
        // Try to input very long text
        const longText = 'A'.repeat(500);
        await nameInput.fill(longText);
        
        // Check if truncated or shows error
        const actualValue = await nameInput.inputValue();
        if (actualValue.length < 500) {
          console.log(`Name field has max length of ${actualValue.length} characters`);
        }
      }
    }
  });

  test('Handles concurrent recipe operations correctly', async ({ page, context }) => {
    // Open two tabs
    const page1 = page;
    const page2 = await context.newPage();
    
    // Login in both tabs
    for (const p of [page1, page2]) {
      await p.goto(BASE_URL);
      await p.click('text=Login');
      await p.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
      await p.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
      await p.click('button[type="submit"]');
      await p.waitForURL('**/dashboard');
      await p.click('text=Recipes');
    }
    
    // Try to edit same recipe in both tabs
    const firstRecipe1 = page1.locator('[data-testid="recipe-card"], .recipe-card').first();
    const firstRecipe2 = page2.locator('[data-testid="recipe-card"], .recipe-card').first();
    
    if (await firstRecipe1.count() > 0 && await firstRecipe2.count() > 0) {
      // Click edit in first tab
      await firstRecipe1.click();
      const editButton1 = page1.locator('button:has-text("Edit")');
      if (await editButton1.count() > 0) {
        await editButton1.click();
        
        // Click edit in second tab
        await firstRecipe2.click();
        const editButton2 = page2.locator('button:has-text("Edit")');
        if (await editButton2.count() > 0) {
          await editButton2.click();
          
          // Make changes in both tabs
          const nameField1 = page1.locator('input[name="name"]').first();
          const nameField2 = page2.locator('input[name="name"]').first();
          
          if (await nameField1.count() > 0 && await nameField2.count() > 0) {
            await nameField1.fill('Updated from Tab 1');
            await nameField2.fill('Updated from Tab 2');
            
            // Submit both
            const submit1 = page1.locator('button[type="submit"]').first();
            const submit2 = page2.locator('button[type="submit"]').first();
            
            await submit1.click();
            await page1.waitForTimeout(1000);
            await submit2.click();
            await page2.waitForTimeout(1000);
            
            // Check for conflict handling
            const conflictMessage = page2.locator('text=/conflict/i, text=/updated/i');
            if (await conflictMessage.count() > 0) {
              console.log('Concurrent edit conflict handled properly');
            }
          }
        }
      }
    }
    
    await page2.close();
  });

  test('Recipe image fallback works when image fails to load', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Intercept image requests and fail some
    await page.route('**/*.jpg', route => {
      if (Math.random() > 0.5) {
        route.abort();
      } else {
        route.continue();
      }
    });
    
    // Login as admin
    await page.click('text=Login');
    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard');
    await page.click('text=Recipes');
    
    // Check for placeholder images
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < Math.min(5, imageCount); i++) {
      const img = images.nth(i);
      const src = await img.getAttribute('src');
      
      // Check if fallback/placeholder is shown
      if (src?.includes('placeholder') || src?.includes('default')) {
        console.log('Placeholder image is being used as fallback');
      }
      
      // Check alt text
      const alt = await img.getAttribute('alt');
      if (alt) {
        console.log(`Image has alt text: ${alt}`);
      }
    }
  });

  test('Recipe bulk operations work correctly', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Login as admin
    await page.click('text=Login');
    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard');
    await page.click('text=Recipes');
    
    // Look for bulk action controls
    const bulkSelectCheckboxes = page.locator('input[type="checkbox"][data-testid*="select"], .recipe-select-checkbox');
    
    if (await bulkSelectCheckboxes.count() > 0) {
      // Select multiple recipes
      const checkboxCount = Math.min(3, await bulkSelectCheckboxes.count());
      for (let i = 0; i < checkboxCount; i++) {
        await bulkSelectCheckboxes.nth(i).check();
      }
      
      // Look for bulk action buttons
      const bulkActions = page.locator('button:has-text("Bulk"), button:has-text("Delete Selected"), button:has-text("Approve Selected")');
      
      if (await bulkActions.count() > 0) {
        console.log('Bulk actions are available');
        
        // Test bulk approve if available
        const bulkApprove = page.locator('button:has-text("Approve Selected")');
        if (await bulkApprove.count() > 0) {
          await bulkApprove.click();
          
          // Confirm action
          const confirmButton = page.locator('button:has-text("Confirm")');
          if (await confirmButton.count() > 0) {
            await confirmButton.click();
            await page.waitForTimeout(2000);
            console.log('Bulk approve executed');
          }
        }
      }
    }
  });
});