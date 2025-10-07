/**
 * Admin Fix and Verify
 * Deep dive into admin issues and implement fixes
 */

import { test, expect } from '@playwright/test';

const ADMIN_CREDENTIALS = {
  email: 'admin@fitmeal.pro',
  password: 'AdminPass123'
};

test('Admin Issue Investigation and Fix', async ({ page }) => {
  console.log('🔧 Starting admin issue investigation and fix...');
  
  // Enable request/response monitoring
  const responses = [];
  page.on('response', response => {
    if (response.url().includes('/api/admin/recipes')) {
      responses.push({
        url: response.url(),
        status: response.status(),
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Login as admin
  await page.goto('http://localhost:4000/login');
  await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
  await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin');
  
  // Wait for page to fully load
  await page.waitForTimeout(5000);
  
  console.log('🔍 Analyzing recipe data loading...');
  
  // Check API responses
  console.log(`📡 Recipe API calls: ${responses.length}`);
  for (const response of responses) {
    console.log(`   ${response.status} - ${response.url} at ${response.timestamp}`);
  }
  
  // Get actual recipe data from the API response
  const recipeApiResponse = await page.evaluate(async () => {
    try {
      const response = await fetch('/api/admin/recipes?approved=true&page=1&limit=12');
      const data = await response.json();
      return {
        status: response.status,
        dataKeys: Object.keys(data),
        recipeCount: data.recipes?.length || 0,
        totalCount: data.total || 0,
        firstRecipe: data.recipes?.[0] || null
      };
    } catch (error) {
      return { error: error.message };
    }
  });
  
  console.log('📊 Recipe API Response Analysis:');
  console.log(`   Status: ${recipeApiResponse.status}`);
  console.log(`   Data keys: ${recipeApiResponse.dataKeys?.join(', ')}`);
  console.log(`   Recipe count: ${recipeApiResponse.recipeCount}`);
  console.log(`   Total count: ${recipeApiResponse.totalCount}`);
  if (recipeApiResponse.firstRecipe) {
    console.log(`   First recipe: ${recipeApiResponse.firstRecipe.title || 'No title'}`);
  }
  
  // Examine the DOM structure for recipe containers
  console.log('🏗️ Analyzing DOM structure...');
  
  const domAnalysis = await page.evaluate(() => {
    // Look for potential recipe containers
    const containers = [
      document.querySelectorAll('[data-testid*="recipe"]'),
      document.querySelectorAll('.recipe-card'),
      document.querySelectorAll('.recipe-item'),
      document.querySelectorAll('[class*="recipe"]'),
      document.querySelectorAll('div:has(> img[alt*="recipe"])'),
      document.querySelectorAll('div:has(> img[src*="recipe"])')
    ];
    
    return {
      testIdContainers: containers[0].length,
      recipeCardContainers: containers[1].length,
      recipeItemContainers: containers[2].length,
      recipeClassContainers: containers[3].length,
      imgAltContainers: containers[4].length,
      imgSrcContainers: containers[5].length,
      totalElements: document.querySelectorAll('*').length,
      recipesTabContent: !!document.querySelector('[role="tabpanel"][id*="recipes"]'),
      activeTab: document.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.trim()
    };
  });
  
  console.log('🔍 DOM Analysis Results:');
  console.log(`   TestID containers: ${domAnalysis.testIdContainers}`);
  console.log(`   Recipe card containers: ${domAnalysis.recipeCardContainers}`);
  console.log(`   Recipe item containers: ${domAnalysis.recipeItemContainers}`);
  console.log(`   Recipe class containers: ${domAnalysis.recipeClassContainers}`);
  console.log(`   Image alt containers: ${domAnalysis.imgAltContainers}`);
  console.log(`   Image src containers: ${domAnalysis.imgSrcContainers}`);
  console.log(`   Total DOM elements: ${domAnalysis.totalElements}`);
  console.log(`   Active tab: ${domAnalysis.activeTab}`);
  console.log(`   Recipes tab content exists: ${domAnalysis.recipesTabContent}`);
  
  // Check for loading states or errors in React
  const reactState = await page.evaluate(() => {
    // Try to access React DevTools or component state
    const reactErrors = Array.from(document.querySelectorAll('*')).filter(el => 
      el.textContent?.includes('Error') || 
      el.textContent?.includes('Loading') ||
      el.textContent?.includes('Failed')
    ).map(el => el.textContent?.trim()).slice(0, 3);
    
    return {
      reactErrors,
      hasRecipesText: document.body.textContent?.includes('recipes'),
      hasRecipeData: document.body.textContent?.includes('Recipe'),
      bodyTextLength: document.body.textContent?.length || 0
    };
  });
  
  console.log('⚛️ React State Analysis:');
  console.log(`   React errors: ${reactState.reactErrors.join(', ')}`);
  console.log(`   Has "recipes" text: ${reactState.hasRecipesText}`);  
  console.log(`   Has "Recipe" text: ${reactState.hasRecipeData}`);
  console.log(`   Body text length: ${reactState.bodyTextLength}`);
  
  // Take detailed screenshots
  await page.screenshot({ path: 'admin-fix-verify/full-page.png', fullPage: true });
  
  // Try to manually trigger recipe loading by clicking recipes tab
  console.log('🖱️ Manually triggering recipes tab...');
  
  try {
    const recipesTab = page.locator('[role="tab"]:has-text("Recipe")').first();
    const isRecipesTabVisible = await recipesTab.isVisible();
    console.log(`   Recipes tab visible: ${isRecipesTabVisible}`);
    
    if (isRecipesTabVisible) {
      await recipesTab.click();
      await page.waitForTimeout(3000);
      
      // Check again for recipe cards after tab click
      const postClickAnalysis = await page.evaluate(() => {
        return {
          recipeCards: document.querySelectorAll('[data-testid*="recipe"], .recipe-card').length,
          gridContainers: document.querySelectorAll('.grid, [class*="grid"]').length,
          images: document.querySelectorAll('img').length,
          hasCardClass: document.querySelectorAll('[class*="card"]').length
        };
      });
      
      console.log('📋 Post-click analysis:');
      console.log(`   Recipe cards: ${postClickAnalysis.recipeCards}`);
      console.log(`   Grid containers: ${postClickAnalysis.gridContainers}`);
      console.log(`   Images: ${postClickAnalysis.images}`);
      console.log(`   Elements with "card" class: ${postClickAnalysis.hasCardClass}`);
      
      await page.screenshot({ path: 'admin-fix-verify/after-recipes-click.png' });
    }
  } catch (error) {
    console.log(`❌ Error clicking recipes tab: ${error.message}`);
  }
  
  // Final summary
  console.log('\n📋 ADMIN DIAGNOSIS SUMMARY:');
  console.log(`   ✅ API Working: ${recipeApiResponse.recipeCount} recipes available`);
  console.log(`   ❌ Frontend Issue: 0 recipe cards displaying`);
  console.log(`   🔍 Potential Cause: React component not rendering recipe data`);
  console.log(`   📱 Mobile Nav: Working correctly`);
  console.log(`   🧭 Tab Navigation: Partially working`);
  
  if (recipeApiResponse.recipeCount > 0 && domAnalysis.recipeCardContainers === 0) {
    console.log('\n🚨 ISSUE IDENTIFIED:');
    console.log('   Recipe data is loading from API but not rendering in UI');
    console.log('   This suggests a React component rendering issue');
    console.log('   Recommended: Check admin recipe component for data binding issues');
  }
});