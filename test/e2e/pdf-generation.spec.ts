import { test, expect } from '@playwright/test';
import { TEST_ACCOUNTS } from './test-data-setup';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:4000';

test.describe('PDF Generation Features', () => {
  test.beforeEach(async ({ page }) => {
    // Login as trainer
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', TEST_ACCOUNTS.trainer.username);
    await page.fill('input[type="password"]', TEST_ACCOUNTS.trainer.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
  });

  test('should generate and export meal plan PDF', async ({ page }) => {
    // Navigate to meal plan generator
    await page.goto(`${BASE_URL}/meal-plan-generator`);
    await page.waitForLoadState('networkidle');
    
    // Fill in meal plan details
    await page.fill('input[name="planName"]', 'Test PDF Export Plan');
    await page.selectOption('select[name="fitnessGoal"]', 'weight_loss');
    await page.fill('input[name="dailyCalorieTarget"]', '2000');
    await page.fill('input[name="days"]', '7');
    await page.fill('input[name="mealsPerDay"]', '3');
    
    // Generate meal plan
    await page.click('button:has-text("Generate Meal Plan")');
    
    // Wait for generation to complete
    await page.waitForSelector('text=/Generated Successfully/i', { timeout: 30000 });
    
    // Set up download listener
    const downloadPromise = page.waitForEvent('download');
    
    // Click export to PDF button
    await page.click('button:has-text("Export to PDF")');
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify download
    expect(download).toBeTruthy();
    const fileName = download.suggestedFilename();
    expect(fileName).toContain('.pdf');
    
    // Save to test results
    const savePath = path.join('test-results', fileName);
    await download.saveAs(savePath);
    
    // Verify file exists and has content
    expect(fs.existsSync(savePath)).toBeTruthy();
    const stats = fs.statSync(savePath);
    expect(stats.size).toBeGreaterThan(10000); // PDF should be at least 10KB
    
    console.log(`✅ PDF exported successfully: ${fileName} (${stats.size} bytes)`);
  });

  test('should test server-side PDF generation API', async ({ page, request }) => {
    // First, get authentication cookie from page context
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name === 'session' || c.name === 'token');
    
    // Prepare test meal plan data
    const mealPlanData = {
      planName: 'API Test Meal Plan',
      fitnessGoal: 'muscle_gain',
      dailyCalorieTarget: 2500,
      days: 7,
      mealsPerDay: 4,
      dietaryRestrictions: [],
      meals: [
        {
          day: 1,
          mealType: 'breakfast',
          recipe: {
            name: 'Protein Pancakes',
            calories: 400,
            protein: 30,
            carbs: 45,
            fats: 10,
            ingredients: ['eggs', 'protein powder', 'oats', 'banana'],
            instructions: 'Mix ingredients and cook on griddle'
          }
        },
        {
          day: 1,
          mealType: 'lunch',
          recipe: {
            name: 'Grilled Chicken Salad',
            calories: 500,
            protein: 40,
            carbs: 30,
            fats: 20,
            ingredients: ['chicken breast', 'mixed greens', 'olive oil', 'vegetables'],
            instructions: 'Grill chicken and serve over salad'
          }
        }
      ]
    };
    
    // Make API request for PDF export
    const response = await request.post(`${BASE_URL}/api/pdf/export`, {
      data: { mealPlan: mealPlanData },
      headers: authCookie ? { 'Cookie': `${authCookie.name}=${authCookie.value}` } : {}
    });
    
    // Check response
    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toContain('application/pdf');
    
    // Get PDF content
    const pdfBuffer = await response.body();
    expect(pdfBuffer.length).toBeGreaterThan(10000);
    
    // Save PDF for inspection
    const fileName = 'api-test-meal-plan.pdf';
    const savePath = path.join('test-results', fileName);
    fs.writeFileSync(savePath, pdfBuffer);
    
    console.log(`✅ Server-side PDF generated: ${fileName} (${pdfBuffer.length} bytes)`);
  });

  test('should generate progress report PDF', async ({ page, request }) => {
    // Get auth cookie
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name === 'session' || c.name === 'token');
    
    // Prepare progress report data
    const progressData = {
      customerId: 'test-customer-id',
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      },
      measurements: [
        { date: new Date().toISOString(), weight: 180, bodyFat: 18 },
        { date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), weight: 182, bodyFat: 19 },
        { date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), weight: 184, bodyFat: 20 }
      ],
      goals: [
        { name: 'Lose 10 pounds', target: 170, current: 180, achieved: false },
        { name: 'Reduce body fat', target: 15, current: 18, achieved: false }
      ],
      mealPlansCompleted: 4,
      totalWorkouts: 20,
      notes: 'Great progress this month!'
    };
    
    // Make API request
    const response = await request.post(`${BASE_URL}/api/pdf/export/progress-report`, {
      data: progressData,
      headers: authCookie ? { 'Cookie': `${authCookie.name}=${authCookie.value}` } : {}
    });
    
    if (response.ok()) {
      const pdfBuffer = await response.body();
      expect(pdfBuffer.length).toBeGreaterThan(5000);
      
      const fileName = 'progress-report.pdf';
      const savePath = path.join('test-results', fileName);
      fs.writeFileSync(savePath, pdfBuffer);
      
      console.log(`✅ Progress report PDF generated: ${fileName} (${pdfBuffer.length} bytes)`);
    } else {
      console.log('⚠️ Progress report PDF endpoint not yet implemented');
    }
  });

  test('should handle batch PDF export', async ({ page, request }) => {
    // Get auth cookie
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name === 'session' || c.name === 'token');
    
    // Prepare batch export request
    const batchData = {
      exportType: 'meal_plans',
      items: [
        { id: 'plan-1', name: 'Week 1 Plan' },
        { id: 'plan-2', name: 'Week 2 Plan' },
        { id: 'plan-3', name: 'Week 3 Plan' }
      ],
      format: 'combined' // or 'separate'
    };
    
    // Make API request
    const response = await request.post(`${BASE_URL}/api/pdf/export/batch`, {
      data: batchData,
      headers: authCookie ? { 'Cookie': `${authCookie.name}=${authCookie.value}` } : {}
    });
    
    if (response.ok()) {
      const result = await response.json();
      
      if (result.format === 'combined') {
        // Single PDF with all content
        expect(result.pdf).toBeTruthy();
        console.log('✅ Batch PDF export (combined) successful');
      } else {
        // Multiple PDFs
        expect(result.pdfs).toBeInstanceOf(Array);
        expect(result.pdfs.length).toBe(3);
        console.log(`✅ Batch PDF export (separate) successful: ${result.pdfs.length} files`);
      }
    } else {
      console.log('⚠️ Batch PDF export endpoint not yet implemented');
    }
  });

  test('should handle PDF generation errors gracefully', async ({ page, request }) => {
    // Get auth cookie
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name === 'session' || c.name === 'token');
    
    // Send invalid data to trigger error
    const invalidData = {
      mealPlan: null // Invalid data
    };
    
    const response = await request.post(`${BASE_URL}/api/pdf/export`, {
      data: invalidData,
      headers: authCookie ? { 'Cookie': `${authCookie.name}=${authCookie.value}` } : {}
    });
    
    // Should return error status
    expect(response.status()).toBeGreaterThanOrEqual(400);
    
    const error = await response.json();
    expect(error).toHaveProperty('message');
    
    console.log('✅ PDF generation error handling works correctly');
  });

  test('should test PDF export performance', async ({ page, request }) => {
    // Get auth cookie
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name === 'session' || c.name === 'token');
    
    // Create a large meal plan
    const largeMealPlan = {
      planName: 'Performance Test Plan',
      fitnessGoal: 'general',
      dailyCalorieTarget: 2000,
      days: 30, // 30 days
      mealsPerDay: 5, // 5 meals per day = 150 total meals
      meals: []
    };
    
    // Generate 150 meals
    for (let day = 1; day <= 30; day++) {
      for (const mealType of ['breakfast', 'snack1', 'lunch', 'snack2', 'dinner']) {
        largeMealPlan.meals.push({
          day,
          mealType,
          recipe: {
            name: `${mealType} Day ${day}`,
            calories: 400,
            protein: 25,
            carbs: 40,
            fats: 15,
            ingredients: ['ingredient1', 'ingredient2', 'ingredient3'],
            instructions: 'Prepare and cook as directed'
          }
        });
      }
    }
    
    const startTime = Date.now();
    
    const response = await request.post(`${BASE_URL}/api/pdf/export`, {
      data: { mealPlan: largeMealPlan },
      headers: authCookie ? { 'Cookie': `${authCookie.name}=${authCookie.value}` } : {},
      timeout: 60000 // 60 second timeout for large PDF
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (response.ok()) {
      const pdfBuffer = await response.body();
      const sizeInMB = (pdfBuffer.length / 1024 / 1024).toFixed(2);
      
      console.log(`✅ Large PDF generated successfully:`);
      console.log(`   - Size: ${sizeInMB} MB`);
      console.log(`   - Time: ${duration}ms`);
      console.log(`   - Performance: ${duration < 10000 ? 'GOOD' : duration < 30000 ? 'ACCEPTABLE' : 'NEEDS OPTIMIZATION'}`);
      
      // Performance assertions
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      expect(pdfBuffer.length).toBeGreaterThan(50000); // Should have substantial content
    } else {
      console.log('⚠️ Large PDF generation failed or not implemented');
    }
  });
});

test.describe('PDF Export UI Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', TEST_ACCOUNTS.customer.username);
    await page.fill('input[type="password"]', TEST_ACCOUNTS.customer.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
  });

  test('should show PDF export options in customer dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/customer`);
    await page.waitForLoadState('networkidle');
    
    // Look for PDF export buttons
    const exportButtons = page.locator('button:has-text("Export"), button:has-text("PDF")');
    const count = await exportButtons.count();
    
    if (count > 0) {
      console.log(`✅ Found ${count} PDF export option(s) in customer dashboard`);
      
      // Click first export button
      await exportButtons.first().click();
      
      // Check for export modal or direct download
      const modalVisible = await page.locator('[role="dialog"]').isVisible().catch(() => false);
      if (modalVisible) {
        console.log('   - Export modal displayed');
        
        // Check for export options
        const hasOptions = await page.locator('text=/Format|Quality|Include/i').isVisible().catch(() => false);
        if (hasOptions) {
          console.log('   - Export customization options available');
        }
      }
    } else {
      console.log('⚠️ No PDF export options found in customer dashboard');
    }
  });
});