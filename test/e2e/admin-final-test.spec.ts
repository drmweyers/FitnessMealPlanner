/**
 * Admin Final Test and Fix
 * Complete admin functionality validation and improvement
 */

import { test, expect } from '@playwright/test';

const ADMIN_CREDENTIALS = {
  email: 'admin@fitmeal.pro',
  password: 'AdminPass123'
};

test('Admin Complete Functionality Test and Fix', async ({ page }) => {
  console.log('🎯 Running complete admin functionality test...');
  
  // Login as admin
  await page.goto('http://localhost:4000/login');
  await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
  await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin');
  
  console.log('✅ Admin login successful');
  
  // Take initial screenshot
  await page.screenshot({ path: 'admin-final-test/01-admin-dashboard.png' });
  
  // Test 1: Verify Recipe Data Structure
  console.log('📊 Testing recipe data structure...');
  
  const recipeApiData = await page.evaluate(async () => {
    try {
      const response = await fetch('/api/admin/recipes?approved=true&page=1&limit=5');
      const data = await response.json();
      
      return {
        status: response.status,
        hasRecipes: !!data.recipes,
        recipeCount: data.recipes?.length || 0,
        totalCount: data.total || 0,
        firstRecipeKeys: data.recipes?.[0] ? Object.keys(data.recipes[0]) : [],
        firstRecipeData: data.recipes?.[0] ? {
          id: data.recipes[0].id,
          name: data.recipes[0].name,
          title: data.recipes[0].title,
          imageUrl: data.recipes[0].imageUrl,
          caloriesKcal: data.recipes[0].caloriesKcal,
          mealTypes: data.recipes[0].mealTypes,
          approved: data.recipes[0].approved
        } : null
      };
    } catch (error) {
      return { error: error.message };
    }
  });
  
  console.log('📋 Recipe API Data Analysis:');
  console.log(`   Status: ${recipeApiData.status}`);
  console.log(`   Has recipes array: ${recipeApiData.hasRecipes}`);
  console.log(`   Recipe count: ${recipeApiData.recipeCount}`);
  console.log(`   Total available: ${recipeApiData.totalCount}`);
  console.log(`   First recipe keys: ${recipeApiData.firstRecipeKeys?.join(', ')}`);
  
  if (recipeApiData.firstRecipeData) {
    console.log('🔍 First Recipe Data:');
    console.log(`   ID: ${recipeApiData.firstRecipeData.id}`);
    console.log(`   Name: ${recipeApiData.firstRecipeData.name}`);
    console.log(`   Title: ${recipeApiData.firstRecipeData.title}`);
    console.log(`   Image URL: ${recipeApiData.firstRecipeData.imageUrl}`);
    console.log(`   Calories: ${recipeApiData.firstRecipeData.caloriesKcal}`);
    console.log(`   Meal Types: ${recipeApiData.firstRecipeData.mealTypes}`);
    console.log(`   Approved: ${recipeApiData.firstRecipeData.approved}`);
  }
  
  // Test 2: Check DOM Rendering
  console.log('🏗️ Testing DOM rendering...');
  
  await page.waitForTimeout(3000); // Allow React to render
  
  const domInfo = await page.evaluate(() => {
    return {
      recipeCardsCount: document.querySelectorAll('[data-recipe-id]').length,
      cardContainers: document.querySelectorAll('.grid div[class*="Card"]').length,
      images: document.querySelectorAll('img[alt*="recipe"], img[src*="recipe"]').length,
      recipeNames: Array.from(document.querySelectorAll('h3')).map(h => h.textContent?.trim()).filter(Boolean),
      errorElements: Array.from(document.querySelectorAll('*')).filter(el => 
        el.textContent?.includes('Error') || el.textContent?.includes('Failed')
      ).map(el => el.textContent?.trim()),
      loadingElements: Array.from(document.querySelectorAll('*')).filter(el =>
        el.textContent?.includes('Loading') || el.classList.contains('animate-pulse')
      ).length
    };
  });
  
  console.log('🖼️ DOM Rendering Analysis:');
  console.log(`   Recipe cards with data-recipe-id: ${domInfo.recipeCardsCount}`);
  console.log(`   Card containers: ${domInfo.cardContainers}`);
  console.log(`   Recipe images: ${domInfo.images}`);
  console.log(`   Recipe names found: ${domInfo.recipeNames.slice(0, 3).join(', ')}${domInfo.recipeNames.length > 3 ? '...' : ''}`);
  console.log(`   Error elements: ${domInfo.errorElements.length}`);
  console.log(`   Loading elements: ${domInfo.loadingElements}`);
  
  // Test 3: If recipes aren't rendering, try to trigger it
  if (domInfo.recipeCardsCount === 0 && recipeApiData.recipeCount > 0) {
    console.log('🔧 Recipe data exists but not rendering. Attempting fixes...');
    
    // Try clicking recipes tab to refresh
    await page.click('[role="tab"]:has-text("Recipe")');
    await page.waitForTimeout(2000);
    
    // Try switching to table view and back
    const viewToggle = page.locator('button:has-text("Cards"), button:has-text("Table")');
    const viewToggleCount = await viewToggle.count();
    
    if (viewToggleCount > 0) {
      console.log('🔄 Trying view toggle to refresh data...');
      await viewToggle.first().click();
      await page.waitForTimeout(2000);
      
      // Check table view
      const tableData = await page.evaluate(() => {
        return {
          tableRows: document.querySelectorAll('tbody tr').length,
          tableVisible: document.querySelector('table')?.offsetHeight > 0
        };
      });
      
      console.log(`   Table view - rows: ${tableData.tableRows}, visible: ${tableData.tableVisible}`);
      await page.screenshot({ path: 'admin-final-test/02-table-view.png' });
      
      // Switch back to cards
      if (viewToggleCount > 1) {
        await viewToggle.last().click();
        await page.waitForTimeout(2000);
      }
    }
    
    // Check if cards appeared after refresh
    const refreshedCardCount = await page.evaluate(() => {
      return document.querySelectorAll('[data-recipe-id]').length;
    });
    
    console.log(`   After refresh attempts, card count: ${refreshedCardCount}`);
  }
  
  // Test 4: Admin Actions Test
  console.log('⚡ Testing admin actions...');
  
  // Go to admin tab
  await page.click('[role="tab"]:has-text("Admin")');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'admin-final-test/03-admin-tab.png' });
  
  // Check admin action cards
  const adminActions = await page.evaluate(() => {
    return {
      generateButton: !!document.querySelector('button:has-text("Generate")'),
      viewPendingButton: !!document.querySelector('button:has-text("View Pending")'),
      exportButton: !!document.querySelector('button:has-text("Export")'),
      actionCards: document.querySelectorAll('.grid > div').length
    };
  });
  
  console.log('🎯 Admin Actions Available:');
  console.log(`   Generate recipes button: ${adminActions.generateButton}`);
  console.log(`   View pending button: ${adminActions.viewPendingButton}`);
  console.log(`   Export button: ${adminActions.exportButton}`);
  console.log(`   Total action cards: ${adminActions.actionCards}`);
  
  // Test Generate Recipes Modal
  if (adminActions.generateButton) {
    console.log('🧪 Testing recipe generation modal...');
    await page.click('button:has-text("Generate")');
    await page.waitForTimeout(2000);
    
    const modalInfo = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      return {
        modalVisible: !!modal,
        modalTitle: modal?.querySelector('h2, h3')?.textContent?.trim(),
        formInputs: modal?.querySelectorAll('input, select, textarea').length || 0,
        closeButton: !!modal?.querySelector('button[aria-label*="close"], button:has-text("Cancel")')
      };
    });
    
    console.log(`   Modal visible: ${modalInfo.modalVisible}`);
    console.log(`   Modal title: ${modalInfo.modalTitle}`);
    console.log(`   Form inputs: ${modalInfo.formInputs}`);
    console.log(`   Close button: ${modalInfo.closeButton}`);
    
    if (modalInfo.modalVisible) {
      await page.screenshot({ path: 'admin-final-test/04-generation-modal.png' });
      
      // Close modal
      if (modalInfo.closeButton) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
      }
    }
  }
  
  // Test View Pending
  if (adminActions.viewPendingButton) {
    console.log('📋 Testing pending recipes modal...');
    await page.click('button:has-text("View Pending")');
    await page.waitForTimeout(2000);
    
    const pendingModalInfo = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      return {
        modalVisible: !!modal,
        pendingCount: document.body.textContent?.match(/(\d+).*pending/i)?.[1] || '0',
        tableVisible: !!modal?.querySelector('table'),
        tableRows: modal?.querySelectorAll('tbody tr').length || 0
      };
    });
    
    console.log(`   Pending modal visible: ${pendingModalInfo.modalVisible}`);
    console.log(`   Pending count: ${pendingModalInfo.pendingCount}`);
    console.log(`   Table visible: ${pendingModalInfo.tableVisible}`);
    console.log(`   Table rows: ${pendingModalInfo.tableRows}`);
    
    if (pendingModalInfo.modalVisible) {
      await page.screenshot({ path: 'admin-final-test/05-pending-modal.png' });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    }
  }
  
  // Test 5: Navigation and Responsiveness
  console.log('📱 Testing navigation and responsiveness...');
  
  // Test mobile view
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'admin-final-test/06-mobile-view.png' });
  
  const mobileInfo = await page.evaluate(() => {
    return {
      tabsVisible: !!document.querySelector('[role="tablist"]'),
      mobileNavVisible: !!document.querySelector('.mobile-nav'),
      touchTargets: Array.from(document.querySelectorAll('button')).filter(btn => {
        const rect = btn.getBoundingClientRect();
        return rect.width >= 44 && rect.height >= 44;
      }).length
    };
  });
  
  console.log(`   Tabs visible on mobile: ${mobileInfo.tabsVisible}`);
  console.log(`   Mobile nav visible: ${mobileInfo.mobileNavVisible}`);
  console.log(`   Proper touch targets: ${mobileInfo.touchTargets}`);
  
  // Reset to desktop
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(1000);
  
  // Test 6: Final Summary
  console.log('\n🎉 ADMIN FUNCTIONALITY TEST SUMMARY:');
  console.log('=' .repeat(50));
  console.log(`✅ Admin Login: SUCCESS`);
  console.log(`${recipeApiData.status === 200 ? '✅' : '❌'} Recipe API: ${recipeApiData.status === 200 ? 'SUCCESS' : 'FAILED'}`);
  console.log(`${recipeApiData.recipeCount > 0 ? '✅' : '❌'} Recipe Data: ${recipeApiData.recipeCount} recipes available`);
  console.log(`${domInfo.recipeCardsCount > 0 ? '✅' : '❌'} Recipe Rendering: ${domInfo.recipeCardsCount} cards displayed`);
  console.log(`${adminActions.generateButton ? '✅' : '❌'} Recipe Generation: ${adminActions.generateButton ? 'AVAILABLE' : 'NOT FOUND'}`);
  console.log(`${adminActions.viewPendingButton ? '✅' : '❌'} Pending Review: ${adminActions.viewPendingButton ? 'AVAILABLE' : 'NOT FOUND'}`);
  console.log(`${adminActions.exportButton ? '✅' : '❌'} Export Function: ${adminActions.exportButton ? 'AVAILABLE' : 'NOT FOUND'}`);
  console.log(`${mobileInfo.touchTargets > 5 ? '✅' : '❌'} Mobile Responsive: ${mobileInfo.touchTargets} touch targets`);
  console.log(`${domInfo.errorElements.length === 0 ? '✅' : '❌'} Error Free: ${domInfo.errorElements.length} errors found`);
  
  if (recipeApiData.recipeCount > 0 && domInfo.recipeCardsCount === 0) {
    console.log('\n🚨 IDENTIFIED ISSUE:');
    console.log('   Recipe data is loading from API but not rendering in UI');
    console.log('   This is likely a React component rendering issue');
    console.log('   API returns data but RecipeCard components are not displaying');
  }
  
  if (recipeApiData.firstRecipeData && !recipeApiData.firstRecipeData.name) {
    console.log('\n🚨 DATA STRUCTURE ISSUE:');
    console.log('   Recipe data structure may be incorrect');
    console.log('   Missing required fields like "name"');
  }
  
  // Take final screenshot
  await page.screenshot({ path: 'admin-final-test/07-final-state.png', fullPage: true });
  
  console.log('\n📸 Screenshots saved to admin-final-test/ directory');
  console.log('🏁 Admin functionality test completed!');
});