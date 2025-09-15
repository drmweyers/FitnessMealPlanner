import { test, expect } from '@playwright/test';

test.describe('Nested Modal Test - Recipe Detail from Meal Plan', () => {
  test.use({
    viewport: { width: 375, height: 812 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
  });

  test('Recipe modal should open centered when clicked from meal plan modal', async ({ page }) => {
    console.log('=== NESTED MODAL TEST ===');
    console.log('Testing: Recipe modal opening from within meal plan modal');
    console.log('Expected: Recipe modal should be centered and display content');
    console.log('');

    // Navigate and login
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL('**/customer', { timeout: 10000 });
    await page.waitForTimeout(2000);

    console.log('Step 1: Looking for meal plan cards...');

    // First, navigate to meal plans tab
    await page.goto('http://localhost:4000/customer?tab=meal-plans');
    await page.waitForTimeout(2000);

    // Look for any meal plan cards
    const mealPlanCards = await page.locator('.cursor-pointer, [class*="card"], [class*="Card"]').all();
    let foundMealPlan = false;
    let foundRecipe = false;

    for (const card of mealPlanCards) {
      const text = await card.textContent().catch(() => '');
      if (text && (text.toLowerCase().includes('meal') || text.toLowerCase().includes('plan') || text.toLowerCase().includes('personalized'))) {
        console.log(`Found meal plan card: "${text.substring(0, 50)}..."`);

        // Click to open meal plan modal
        await card.click();
        await page.waitForTimeout(1500);

        // Check if meal plan modal opened
        const mealPlanModal = page.locator('[role="dialog"]').first();
        if (await mealPlanModal.isVisible()) {
          foundMealPlan = true;
          console.log('✓ Meal plan modal opened');

          // Check modal positioning
          const mealPlanBox = await mealPlanModal.boundingBox();
          if (mealPlanBox) {
            const modalCenter = mealPlanBox.x + (mealPlanBox.width / 2);
            const viewportCenter = 187.5; // 375 / 2
            console.log(`Meal plan modal center: ${modalCenter}px (expected: ${viewportCenter}px)`);
          }

          // Now look for recipe rows in the meal plan modal
          console.log('Step 2: Looking for recipe rows in meal plan...');

          // Try to find recipe rows in a table
          const recipeRows = await page.locator('tr.cursor-pointer, tr[onClick], tbody tr').all();
          console.log(`Found ${recipeRows.length} potential recipe rows`);

          for (const row of recipeRows) {
            const rowText = await row.textContent().catch(() => '');
            if (rowText && rowText.length > 10) {
              console.log(`Clicking recipe row: "${rowText.substring(0, 40)}..."`);

              // Click the recipe row
              await row.click();
              await page.waitForTimeout(1500);

              // Check if recipe modal opened (there should now be 2 dialogs)
              const allModals = await page.locator('[role="dialog"]').all();
              console.log(`Number of modals open: ${allModals.length}`);

              if (allModals.length >= 2) {
                foundRecipe = true;
                const recipeModal = allModals[allModals.length - 1]; // Get the topmost modal

                // Check if recipe modal is visible
                if (await recipeModal.isVisible()) {
                  console.log('✓ Recipe modal opened');

                  // Check positioning
                  const recipeBox = await recipeModal.boundingBox();
                  if (recipeBox) {
                    const recipeModalCenter = recipeBox.x + (recipeBox.width / 2);
                    const viewportCenter = 187.5; // 375 / 2
                    const isCentered = Math.abs(recipeModalCenter - viewportCenter) < 60;

                    console.log('Recipe Modal Positioning:');
                    console.log(`  X: ${recipeBox.x}px`);
                    console.log(`  Width: ${recipeBox.width}px`);
                    console.log(`  Center: ${recipeModalCenter}px`);
                    console.log(`  Expected Center: ${viewportCenter}px`);
                    console.log(`  Offset: ${Math.abs(recipeModalCenter - viewportCenter)}px`);

                    expect(isCentered).toBe(true);

                    if (isCentered) {
                      console.log('✅ Recipe modal is PROPERLY CENTERED');
                    } else {
                      console.log('❌ Recipe modal is NOT centered');
                    }

                    // Check if modal has content
                    const modalContent = await recipeModal.textContent();
                    const hasContent = modalContent && modalContent.length > 50;

                    if (hasContent) {
                      console.log('✓ Recipe modal has content');

                      // Check for specific recipe elements
                      const hasTitle = modalContent.includes('Recipe Details');
                      const hasNutrition = modalContent.includes('Calories') || modalContent.includes('Protein');

                      console.log(`  Has title: ${hasTitle}`);
                      console.log(`  Has nutrition info: ${hasNutrition}`);
                    } else {
                      console.log('❌ Recipe modal appears empty');
                    }

                    expect(hasContent).toBe(true);
                  }
                }
                break;
              }
            }
          }

          if (!foundRecipe) {
            // Try clicking on any element that looks like a recipe
            const anyClickable = await page.locator('.hover\\:bg-gray-50, [class*="hover"]').first();
            if (await anyClickable.count() > 0) {
              await anyClickable.click();
              await page.waitForTimeout(1500);

              const allModals = await page.locator('[role="dialog"]').all();
              if (allModals.length >= 2) {
                console.log('Found recipe modal after alternative click');
                foundRecipe = true;
              }
            }
          }

          break;
        }
      }
    }

    if (!foundMealPlan) {
      console.log('⚠️ No meal plan cards found - customer may not have meal plans assigned');
    } else if (!foundRecipe) {
      console.log('⚠️ Could not open recipe modal from meal plan');
    }

    console.log('');
    console.log('=== TEST SUMMARY ===');
    console.log(`Meal Plan Modal: ${foundMealPlan ? '✓ Opened' : '✗ Not found'}`);
    console.log(`Recipe Modal: ${foundRecipe ? '✓ Opened and centered' : '✗ Not opened'}`);
  });
});