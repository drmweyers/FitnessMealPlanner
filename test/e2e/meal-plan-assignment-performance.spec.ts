import { test, expect, Page } from '@playwright/test';
import { loginAsTrainer } from './auth-helper';
import { TrainerMealPlanPage } from './page-objects/TrainerMealPlanPage';
import { MealPlanTestData } from './test-helpers/MealPlanTestData';

/**
 * Performance Tests for Meal Plan Assignment GUI
 * 
 * Tests loading times, responsiveness, memory usage, and performance
 * under various conditions in the meal plan assignment workflow.
 */

test.describe('Meal Plan Assignment Performance Tests', () => {
  let trainerPage: TrainerMealPlanPage;
  let testData: MealPlanTestData;

  test.beforeEach(async ({ page }) => {
    trainerPage = new TrainerMealPlanPage(page);
    testData = new MealPlanTestData(page);

    await loginAsTrainer(page);
    await trainerPage.navigateToTrainerDashboard();
  });

  test('Page load performance - Initial render time', async ({ page }) => {
    console.log('⚡ Testing initial page load performance...');

    // Measure navigation to trainer dashboard
    const navigationStart = Date.now();
    await page.goto('/trainer');
    await page.waitForLoadState('networkidle');
    const navigationTime = Date.now() - navigationStart;

    console.log(`📊 Navigation time: ${navigationTime}ms`);
    expect(navigationTime).toBeLessThan(5000); // Should load within 5 seconds

    // Measure tab switching performance
    const tabSwitchStart = Date.now();
    await trainerPage.clickSavedPlansTab();
    await trainerPage.waitForSavedPlansToLoad();
    const tabSwitchTime = Date.now() - tabSwitchStart;

    console.log(`📊 Tab switch time: ${tabSwitchTime}ms`);
    expect(tabSwitchTime).toBeLessThan(2000); // Should switch within 2 seconds

    // Measure Web Vitals using Performance API
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals: any = {};
        
        // Largest Contentful Paint
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            vitals.lcp = entries[entries.length - 1].startTime;
          }
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            vitals.fid = entries[0].processingStart - entries[0].startTime;
          }
        }).observe({ entryTypes: ['first-input'] });

        // Cumulative Layout Shift
        let clsValue = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          vitals.cls = clsValue;
        }).observe({ entryTypes: ['layout-shift'] });

        // Return vitals after 2 seconds
        setTimeout(() => resolve(vitals), 2000);
      });
    });

    console.log('📊 Web Vitals:', webVitals);

    // Basic performance expectations
    if ((webVitals as any).lcp) {
      expect((webVitals as any).lcp).toBeLessThan(4000); // LCP should be under 4s
    }
    if ((webVitals as any).cls) {
      expect((webVitals as any).cls).toBeLessThan(0.25); // CLS should be under 0.25
    }

    console.log('✅ Page load performance test passed');
  });

  test('Large dataset performance - 100+ meal plans', async ({ page }) => {
    console.log('📊 Testing performance with large dataset...');

    // Create large dataset mock
    const largeMealPlans = Array.from({ length: 100 }, (_, i) => ({
      id: `perf-plan-${i}`,
      trainerId: 'trainer-1',
      mealPlanData: MealPlanTestData.createTestMealPlan(i + 1),
      notes: `Performance test meal plan ${i + 1}`,
      tags: ['performance', 'large-dataset'],
      isTemplate: false,
      createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      assignmentCount: Math.floor(Math.random() * 5)
    }));

    await page.route('/api/trainer/meal-plans', async route => {
      // Add artificial delay to simulate real API
      await new Promise(resolve => setTimeout(resolve, 100));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ mealPlans: largeMealPlans })
      });
    });

    // Measure load time with large dataset
    const loadStart = Date.now();
    await trainerPage.clickSavedPlansTab();
    await trainerPage.waitForSavedPlansToLoad();
    const loadTime = Date.now() - loadStart;

    console.log(`📊 Large dataset load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(8000); // Should load within 8 seconds even with large dataset

    // Test scroll performance
    const scrollStart = Date.now();
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(100);
    const scrollTime = Date.now() - scrollStart;

    console.log(`📊 Scroll performance: ${scrollTime}ms`);
    expect(scrollTime).toBeLessThan(1000);

    // Test search performance with large dataset
    const searchStart = Date.now();
    await trainerPage.searchMealPlans('Weight Loss');
    await page.waitForTimeout(500);
    const searchTime = Date.now() - searchStart;

    console.log(`📊 Search time with large dataset: ${searchTime}ms`);
    expect(searchTime).toBeLessThan(3000);

    console.log('✅ Large dataset performance test passed');
  });

  test('Modal performance - Open/close times', async ({ page }) => {
    console.log('🔲 Testing modal performance...');

    await testData.setupMockAPIResponses();
    await trainerPage.clickSavedPlansTab();
    await trainerPage.waitForSavedPlansToLoad();

    // Test dropdown menu performance
    const dropdownOpenStart = Date.now();
    await trainerPage.openMealPlanDropdown();
    const dropdownOpenTime = Date.now() - dropdownOpenStart;

    console.log(`📊 Dropdown open time: ${dropdownOpenTime}ms`);
    expect(dropdownOpenTime).toBeLessThan(500);

    // Test assignment modal performance
    const modalOpenStart = Date.now();
    await trainerPage.clickAssignToCustomer();
    await trainerPage.waitForAssignmentModal();
    const modalOpenTime = Date.now() - modalOpenStart;

    console.log(`📊 Modal open time: ${modalOpenTime}ms`);
    expect(modalOpenTime).toBeLessThan(1000);

    // Test modal close performance
    const modalCloseStart = Date.now();
    await trainerPage.cancelAssignmentButton.click();
    await trainerPage.verifyAssignmentModalClosed();
    const modalCloseTime = Date.now() - modalCloseStart;

    console.log(`📊 Modal close time: ${modalCloseTime}ms`);
    expect(modalCloseTime).toBeLessThan(500);

    console.log('✅ Modal performance test passed');
  });

  test('Network performance - API response times', async ({ page }) => {
    console.log('🌐 Testing network performance...');

    const networkMetrics: { [key: string]: number } = {};

    // Monitor network requests
    page.on('response', async (response) => {
      const url = response.url();
      const timing = response.timing();
      
      if (url.includes('/api/')) {
        const endpoint = url.split('/api/')[1];
        networkMetrics[endpoint] = timing.responseEnd - timing.requestStart;
        console.log(`📊 ${endpoint}: ${networkMetrics[endpoint]}ms`);
      }
    });

    await testData.setupMockAPIResponses();

    // Test meal plans API performance
    await trainerPage.clickSavedPlansTab();
    await trainerPage.waitForSavedPlansToLoad();

    // Test customers API performance
    await trainerPage.clickCustomersTab();
    await trainerPage.waitForCustomersToLoad();

    // Test assignment API performance
    await trainerPage.clickSavedPlansTab();
    await trainerPage.waitForSavedPlansToLoad();

    try {
      await trainerPage.assignMealPlanToCustomer();
    } catch (error) {
      console.log('💡 Assignment completed or skipped for performance test');
    }

    // Verify API response times are reasonable
    Object.entries(networkMetrics).forEach(([endpoint, time]) => {
      expect(time).toBeLessThan(5000); // No API call should take more than 5 seconds
      console.log(`📊 ${endpoint} performance: ${time}ms`);
    });

    console.log('✅ Network performance test passed');
  });

  test('Memory usage - Prevent memory leaks', async ({ page }) => {
    console.log('🧠 Testing memory usage and leak prevention...');

    await testData.setupMockAPIResponses();

    // Get initial memory baseline
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });

    console.log(`📊 Initial memory usage: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`);

    // Perform multiple operations that could cause memory leaks
    for (let i = 0; i < 5; i++) {
      console.log(`🔄 Memory test iteration ${i + 1}/5`);
      
      // Navigate between tabs
      await trainerPage.clickSavedPlansTab();
      await trainerPage.waitForSavedPlansToLoad();
      
      await trainerPage.clickCustomersTab();
      await trainerPage.waitForCustomersToLoad();
      
      // Open and close modal
      await trainerPage.clickSavedPlansTab();
      await trainerPage.waitForSavedPlansToLoad();
      
      try {
        await trainerPage.openMealPlanDropdown();
        await trainerPage.clickAssignToCustomer();
        await trainerPage.waitForAssignmentModal();
        await trainerPage.cancelAssignmentButton.click();
        await trainerPage.verifyAssignmentModalClosed();
      } catch (error) {
        console.log('💡 Modal operation completed or skipped');
      }
      
      // Force garbage collection if available
      await page.evaluate(() => {
        if (window.gc) {
          window.gc();
        }
      });
      
      await page.waitForTimeout(100);
    }

    // Check final memory usage
    const finalMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });

    console.log(`📊 Final memory usage: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`);

    const memoryIncrease = finalMemory - initialMemory;
    const memoryIncreasePercent = ((memoryIncrease / initialMemory) * 100);

    console.log(`📊 Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (${memoryIncreasePercent.toFixed(1)}%)`);

    // Memory usage shouldn't increase dramatically (allowing for some growth)
    if (initialMemory > 0) {
      expect(memoryIncreasePercent).toBeLessThan(300); // Memory shouldn't triple
    }

    console.log('✅ Memory usage test passed');
  });

  test('Concurrent operations performance', async ({ page }) => {
    console.log('🔄 Testing concurrent operations performance...');

    await testData.setupMockAPIResponses();

    // Test rapid tab switching
    const rapidSwitchStart = Date.now();
    
    for (let i = 0; i < 10; i++) {
      await trainerPage.clickSavedPlansTab();
      await page.waitForTimeout(100);
      await trainerPage.clickCustomersTab();
      await page.waitForTimeout(100);
    }
    
    const rapidSwitchTime = Date.now() - rapidSwitchStart;
    console.log(`📊 Rapid tab switching (20 switches): ${rapidSwitchTime}ms`);
    expect(rapidSwitchTime).toBeLessThan(5000);

    // Test rapid search operations
    await trainerPage.clickSavedPlansTab();
    await trainerPage.waitForSavedPlansToLoad();

    const rapidSearchStart = Date.now();
    const searchTerms = ['Weight', 'Muscle', 'Diet', 'Plan', 'Nutrition'];
    
    for (const term of searchTerms) {
      await trainerPage.searchMealPlans(term);
      await page.waitForTimeout(100);
    }
    
    const rapidSearchTime = Date.now() - rapidSearchStart;
    console.log(`📊 Rapid searching (5 searches): ${rapidSearchTime}ms`);
    expect(rapidSearchTime).toBeLessThan(3000);

    console.log('✅ Concurrent operations test passed');
  });

  test('DOM manipulation performance', async ({ page }) => {
    console.log('🏗️ Testing DOM manipulation performance...');

    // Create dataset with many elements
    const manyMealPlans = Array.from({ length: 50 }, (_, i) => ({
      id: `dom-plan-${i}`,
      trainerId: 'trainer-1',
      mealPlanData: MealPlanTestData.createTestMealPlan(i + 1),
      notes: `DOM test meal plan ${i + 1}`,
      tags: ['dom', 'performance'],
      isTemplate: false,
      createdAt: new Date().toISOString(),
      assignmentCount: 0
    }));

    await page.route('/api/trainer/meal-plans', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ mealPlans: manyMealPlans })
      });
    });

    // Measure DOM rendering performance
    const renderStart = Date.now();
    await trainerPage.clickSavedPlansTab();
    await trainerPage.waitForSavedPlansToLoad();
    const renderTime = Date.now() - renderStart;

    console.log(`📊 DOM rendering time (50 elements): ${renderTime}ms`);
    expect(renderTime).toBeLessThan(3000);

    // Test DOM query performance
    const queryStart = Date.now();
    const elementCount = await trainerPage.getMealPlanCount();
    const queryTime = Date.now() - queryStart;

    console.log(`📊 DOM query time: ${queryTime}ms (found ${elementCount} elements)`);
    expect(queryTime).toBeLessThan(500);

    // Test DOM manipulation during search
    const manipulationStart = Date.now();
    await trainerPage.searchMealPlans('DOM');
    await page.waitForTimeout(300);
    const manipulationTime = Date.now() - manipulationStart;

    console.log(`📊 DOM manipulation time (filtering): ${manipulationTime}ms`);
    expect(manipulationTime).toBeLessThan(1000);

    console.log('✅ DOM manipulation performance test passed');
  });

  test('Resource loading performance', async ({ page }) => {
    console.log('📦 Testing resource loading performance...');

    // Monitor resource loading
    const resourceMetrics: { [key: string]: number } = {};

    page.on('response', (response) => {
      const url = response.url();
      const resourceType = response.request().resourceType();
      const timing = response.timing();
      
      if (timing && timing.responseEnd > 0) {
        const loadTime = timing.responseEnd - timing.requestStart;
        resourceMetrics[`${resourceType}:${url.split('/').pop()}`] = loadTime;
      }
    });

    await testData.setupMockAPIResponses();
    await trainerPage.clickSavedPlansTab();
    await trainerPage.waitForSavedPlansToLoad();

    // Wait for all resources to load
    await page.waitForLoadState('networkidle');

    // Analyze resource loading times
    let totalImageTime = 0;
    let totalScriptTime = 0;
    let totalStyleTime = 0;
    let imageCount = 0;
    let scriptCount = 0;
    let styleCount = 0;

    Object.entries(resourceMetrics).forEach(([resource, time]) => {
      const [type] = resource.split(':');
      
      switch (type) {
        case 'image':
          totalImageTime += time;
          imageCount++;
          break;
        case 'script':
          totalScriptTime += time;
          scriptCount++;
          break;
        case 'stylesheet':
          totalStyleTime += time;
          styleCount++;
          break;
      }
      
      console.log(`📊 ${resource}: ${time}ms`);
    });

    // Performance expectations
    if (imageCount > 0) {
      const avgImageTime = totalImageTime / imageCount;
      console.log(`📊 Average image load time: ${avgImageTime.toFixed(2)}ms`);
      expect(avgImageTime).toBeLessThan(2000);
    }

    if (scriptCount > 0) {
      const avgScriptTime = totalScriptTime / scriptCount;
      console.log(`📊 Average script load time: ${avgScriptTime.toFixed(2)}ms`);
      expect(avgScriptTime).toBeLessThan(3000);
    }

    if (styleCount > 0) {
      const avgStyleTime = totalStyleTime / styleCount;
      console.log(`📊 Average stylesheet load time: ${avgStyleTime.toFixed(2)}ms`);
      expect(avgStyleTime).toBeLessThan(2000);
    }

    console.log('✅ Resource loading performance test passed');
  });

  test('Animation performance - 60fps target', async ({ page }) => {
    console.log('🎬 Testing animation performance...');

    await testData.setupMockAPIResponses();
    await trainerPage.clickSavedPlansTab();
    await trainerPage.waitForSavedPlansToLoad();

    // Monitor frame rate during modal open/close
    let frameCount = 0;
    let frameTimeTotal = 0;
    
    const startFrameMonitoring = () => {
      return page.evaluate(() => {
        return new Promise<{ averageFrameTime: number; frameCount: number }>((resolve) => {
          let frames = 0;
          let totalTime = 0;
          let lastTime = performance.now();
          
          const measureFrame = () => {
            const currentTime = performance.now();
            const frameTime = currentTime - lastTime;
            totalTime += frameTime;
            frames++;
            lastTime = currentTime;
            
            if (frames < 60) { // Measure for about 1 second
              requestAnimationFrame(measureFrame);
            } else {
              resolve({
                averageFrameTime: totalTime / frames,
                frameCount: frames
              });
            }
          };
          
          requestAnimationFrame(measureFrame);
        });
      });
    };

    // Test modal animation performance
    const frameMonitoringPromise = startFrameMonitoring();
    
    await trainerPage.openMealPlanDropdown();
    await trainerPage.clickAssignToCustomer();
    await trainerPage.waitForAssignmentModal();
    
    const frameMetrics = await frameMonitoringPromise;
    
    const targetFrameTime = 16.67; // 60fps = 16.67ms per frame
    const actualFps = 1000 / frameMetrics.averageFrameTime;
    
    console.log(`📊 Average frame time: ${frameMetrics.averageFrameTime.toFixed(2)}ms`);
    console.log(`📊 Actual FPS: ${actualFps.toFixed(1)}`);
    console.log(`📊 Frame count measured: ${frameMetrics.frameCount}`);

    // Performance should be close to 60fps (allowing for some variance)
    expect(frameMetrics.averageFrameTime).toBeLessThan(25); // At least 40fps
    expect(actualFps).toBeGreaterThan(40);

    // Test scroll performance
    const scrollMetrics = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let frameTime = 0;
        let frameCount = 0;
        let lastTime = performance.now();
        
        const measureScrollFrame = () => {
          const currentTime = performance.now();
          frameTime += currentTime - lastTime;
          frameCount++;
          lastTime = currentTime;
          
          if (frameCount < 30) {
            requestAnimationFrame(measureScrollFrame);
          } else {
            resolve(frameTime / frameCount);
          }
        };
        
        // Start scrolling
        window.scrollBy(0, 100);
        requestAnimationFrame(measureScrollFrame);
      });
    });

    console.log(`📊 Scroll frame time: ${scrollMetrics.toFixed(2)}ms`);
    expect(scrollMetrics).toBeLessThan(20); // Good scroll performance

    console.log('✅ Animation performance test passed');
  });
});