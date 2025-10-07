import { test, expect } from '@playwright/test';

test.describe('Health Protocol Elimination Validation', () => {

  test('Verify Health Protocol completely eliminated from trainer interface', async ({ page }) => {
    console.log('🎯 Starting Health Protocol elimination validation...');
    
    // Navigate to trainer page
    await page.goto('http://localhost:4000/trainer', { waitUntil: 'networkidle', timeout: 15000 });
    
    // Wait for interface to load
    await page.waitForSelector('[role="tablist"]', { timeout: 10000 });
    
    console.log('✅ Trainer interface loaded successfully');
    
    // CRITICAL TEST 1: No Health Protocol text anywhere
    console.log('🔍 Test 1: Checking for Health Protocol text...');
    const healthProtocolCount = await page.locator('text=Health Protocol').count();
    expect(healthProtocolCount).toBe(0);
    console.log('✅ Test 1 PASSED: No "Health Protocol" text found');
    
    // CRITICAL TEST 2: Exactly 4 tabs exist
    console.log('🔍 Test 2: Verifying tab count...');
    const tabCount = await page.locator('[role="tab"]').count();
    expect(tabCount).toBe(4);
    console.log(`✅ Test 2 PASSED: Found exactly ${tabCount} tabs`);
    
    // CRITICAL TEST 3: Verify expected tabs present
    console.log('🔍 Test 3: Verifying expected tabs...');
    await expect(page.locator('text=Browse Recipes')).toBeVisible();
    await expect(page.locator('text=Generate Plans')).toBeVisible();
    await expect(page.locator('text=Customers')).toBeVisible();
    await expect(page.locator('text=Saved Plans')).toBeVisible();
    console.log('✅ Test 3 PASSED: All expected tabs present');
    
    // CRITICAL TEST 4: No health-related data attributes
    console.log('🔍 Test 4: Checking for health-related data attributes...');
    const healthDataElements = await page.locator('[data-testid*="health"], [data-value*="health"], [class*="health"]').count();
    expect(healthDataElements).toBe(0);
    console.log('✅ Test 4 PASSED: No health-related data attributes found');
    
    // CRITICAL TEST 5: Tab functionality works
    console.log('🔍 Test 5: Testing tab functionality...');
    await page.click('text=Generate Plans');
    await expect(page.locator('[data-state="active"]')).toContainText('Generate');
    await page.click('text=Browse Recipes');
    await expect(page.locator('[data-state="active"]')).toContainText('Recipes');
    console.log('✅ Test 5 PASSED: Tab switching works correctly');
    
    console.log('🎉 ALL CRITICAL TESTS PASSED - Health Protocol successfully eliminated!');
  });

  test('URL manipulation cannot access Health Protocol', async ({ page }) => {
    console.log('🛡️ Testing URL manipulation resistance...');
    
    const maliciousUrls = [
      'http://localhost:4000/trainer#health-protocol',
      'http://localhost:4000/trainer?tab=health-protocol',
      'http://localhost:4000/trainer/health-protocol'
    ];

    for (const url of maliciousUrls) {
      console.log(`Testing: ${url}`);
      
      await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
      
      // Should still show trainer interface with 4 tabs, no health protocol
      const tabCount = await page.locator('[role="tab"]').count();
      expect(tabCount).toBe(4);
      
      const healthCount = await page.locator('text=Health Protocol').count();
      expect(healthCount).toBe(0);
      
      await expect(page.locator('text=Browse Recipes')).toBeVisible();
    }
    
    console.log('✅ URL manipulation resistance verified');
  });

  test('Console manipulation cannot restore Health Protocol', async ({ page }) => {
    console.log('🔧 Testing console manipulation resistance...');
    
    await page.goto('http://localhost:4000/trainer', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForSelector('[role="tablist"]', { timeout: 10000 });
    
    // Attempt various console manipulations
    await page.evaluate(() => {
      // Try to inject Health Protocol tab
      const tabsList = document.querySelector('[role="tablist"]');
      if (tabsList) {
        const healthTab = document.createElement('button');
        healthTab.setAttribute('role', 'tab');
        healthTab.textContent = 'Health Protocol';
        healthTab.setAttribute('data-testid', 'injected-health-tab');
        tabsList.appendChild(healthTab);
      }
      
      // Try storage manipulation
      localStorage.setItem('health-protocol-enabled', 'true');
      sessionStorage.setItem('health-active', 'true');
      
      // Try global object manipulation
      (window as any).healthProtocol = true;
      (window as any).showHealthTab = () => console.log('Health Protocol');
    });
    
    await page.waitForTimeout(1000);
    
    // Verify manipulations failed
    const healthCount = await page.locator('text=Health Protocol').count();
    expect(healthCount).toBe(0);
    
    const injectedCount = await page.locator('[data-testid="injected-health-tab"]').count();
    expect(injectedCount).toBe(0);
    
    const tabCount = await page.locator('[role="tab"]').count();
    expect(tabCount).toBe(4);
    
    console.log('✅ Console manipulation resistance verified');
  });

  test('Page refresh maintains Health Protocol elimination', async ({ page }) => {
    console.log('🔄 Testing page refresh stability...');
    
    await page.goto('http://localhost:4000/trainer', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForSelector('[role="tablist"]', { timeout: 10000 });
    
    // Perform multiple refreshes
    for (let i = 0; i < 3; i++) {
      console.log(`Refresh ${i + 1}/3`);
      
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForSelector('[role="tablist"]', { timeout: 10000 });
      
      // Verify elimination maintained
      const healthCount = await page.locator('text=Health Protocol').count();
      expect(healthCount).toBe(0);
      
      const tabCount = await page.locator('[role="tab"]').count();
      expect(tabCount).toBe(4);
      
      await expect(page.locator('text=Browse Recipes')).toBeVisible();
    }
    
    console.log('✅ Page refresh stability verified');
  });

  test('Visual layout remains consistent without Health Protocol', async ({ page }) => {
    console.log('🎨 Testing visual layout consistency...');
    
    await page.goto('http://localhost:4000/trainer', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForSelector('[role="tablist"]', { timeout: 10000 });
    
    // Get tab metrics
    const tabMetrics = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
      return tabs.map(tab => {
        const rect = tab.getBoundingClientRect();
        return {
          width: rect.width,
          height: rect.height,
          text: tab.textContent?.trim()
        };
      });
    });
    
    console.log('Tab metrics:', tabMetrics);
    
    // Verify exactly 4 tabs
    expect(tabMetrics.length).toBe(4);
    
    // Verify no health protocol in tab text
    tabMetrics.forEach(tab => {
      expect(tab.text).not.toContain('Health');
      expect(tab.text).not.toContain('Protocol');
    });
    
    // Verify reasonable dimensions
    tabMetrics.forEach((tab, index) => {
      expect(tab.width).toBeGreaterThan(50);
      expect(tab.height).toBeGreaterThan(30);
      console.log(`✓ Tab ${index + 1}: ${tab.text} - ${tab.width}x${tab.height}px`);
    });
    
    console.log('✅ Visual layout consistency verified');
  });
});