import { test, expect, Page } from '@playwright/test';

test.describe('Critical Edge Case Validation - Health Protocol Elimination', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Navigate directly to trainer page
    await page.goto('http://localhost:4000/trainer', { waitUntil: 'networkidle' });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('CRITICAL: No Health Protocol tabs or content visible', async () => {
    console.log('🔍 Verifying no Health Protocol content exists...');
    
    // Verify no health protocol text anywhere on page
    const healthProtocolCount = await page.locator('text=Health Protocol').count();
    expect(healthProtocolCount).toBe(0);
    
    // Verify no health protocol data attributes
    const healthDataElements = await page.locator('[data-testid*="health"], [data-value*="health"]').count();
    expect(healthDataElements).toBe(0);
    
    // Verify exactly 4 tabs exist
    const tabCount = await page.locator('[role="tab"]').count();
    expect(tabCount).toBe(4);
    
    console.log('✅ CRITICAL TEST PASSED: No Health Protocol content found');
  });

  test('CRITICAL: URL manipulation cannot access Health Protocol', async () => {
    console.log('🧪 Testing URL manipulation attempts...');
    
    const maliciousUrls = [
      'http://localhost:4000/trainer#health-protocol',
      'http://localhost:4000/trainer?tab=health-protocol',
      'http://localhost:4000/trainer/health-protocol',
      'http://localhost:4000/health-protocol',
    ];

    for (const url of maliciousUrls) {
      console.log(`Testing URL: ${url}`);
      
      await page.goto(url, { waitUntil: 'networkidle' });
      
      // Verify no health protocol content
      const healthCount = await page.locator('text=Health Protocol').count();
      expect(healthCount).toBe(0);
      
      // Verify tab count remains 4
      const tabCount = await page.locator('[role="tab"]').count();
      expect(tabCount).toBe(4);
      
      // Verify trainer interface loads normally
      await expect(page.locator('text=Browse Recipes')).toBeVisible();
      await expect(page.locator('text=Generate Plans')).toBeVisible();
      await expect(page.locator('text=Customers')).toBeVisible();
      await expect(page.locator('text=Saved Plans')).toBeVisible();
    }
    
    console.log('✅ CRITICAL TEST PASSED: URL manipulation blocked');
  });

  test('CRITICAL: Rapid tab switching stability', async () => {
    console.log('⚡ Testing rapid tab switching...');
    
    let healthProtocolAppeared = false;
    
    // Rapid switching test (20 cycles)
    for (let i = 0; i < 20; i++) {
      await page.click('text=Browse Recipes');
      await page.click('text=Generate Plans');
      await page.click('text=Customers');
      await page.click('text=Saved Plans');
      
      // Check every 5 cycles
      if (i % 5 === 0) {
        const healthCount = await page.locator('text=Health Protocol').count();
        if (healthCount > 0) {
          healthProtocolAppeared = true;
          break;
        }
        
        const tabCount = await page.locator('[role="tab"]').count();
        expect(tabCount).toBe(4);
      }
    }
    
    expect(healthProtocolAppeared).toBe(false);
    
    // Verify interface still responsive
    await page.click('text=Browse Recipes');
    await expect(page.locator('[data-state="active"]')).toContainText('Recipes');
    
    console.log('✅ CRITICAL TEST PASSED: Rapid switching stable');
  });

  test('CRITICAL: Console manipulation cannot restore Health Protocol', async () => {
    console.log('🛡️ Testing console manipulation resistance...');
    
    // Attempt DOM manipulation
    await page.evaluate(() => {
      const tabsList = document.querySelector('[role="tablist"]');
      if (tabsList) {
        const healthTab = document.createElement('button');
        healthTab.setAttribute('role', 'tab');
        healthTab.textContent = 'Health Protocol';
        healthTab.setAttribute('data-testid', 'health-protocol-injected');
        tabsList.appendChild(healthTab);
      }
      
      // Try storage manipulation
      localStorage.setItem('health-protocol-enabled', 'true');
      sessionStorage.setItem('health-protocol-active', 'true');
      
      // Try window object manipulation
      (window as any).healthProtocol = true;
    });
    
    await page.waitForTimeout(1000);
    
    // Verify manipulations failed
    const healthCount = await page.locator('text=Health Protocol').count();
    expect(healthCount).toBe(0);
    
    const injectedCount = await page.locator('[data-testid="health-protocol-injected"]').count();
    expect(injectedCount).toBe(0);
    
    const tabCount = await page.locator('[role="tab"]').count();
    expect(tabCount).toBe(4);
    
    console.log('✅ CRITICAL TEST PASSED: Console manipulation blocked');
  });

  test('CRITICAL: Page refresh maintains elimination', async () => {
    console.log('🔄 Testing page refresh stability...');
    
    // Test multiple refreshes
    for (let i = 0; i < 3; i++) {
      console.log(`Refresh ${i + 1}/3`);
      
      await page.reload({ waitUntil: 'networkidle' });
      
      // Verify no health protocol after refresh
      const healthCount = await page.locator('text=Health Protocol').count();
      expect(healthCount).toBe(0);
      
      // Verify tab count consistent
      const tabCount = await page.locator('[role="tab"]').count();
      expect(tabCount).toBe(4);
      
      // Verify functionality intact
      await expect(page.locator('text=Browse Recipes')).toBeVisible();
    }
    
    console.log('✅ CRITICAL TEST PASSED: Page refresh stable');
  });

  test('CRITICAL: All expected tabs present and functional', async () => {
    console.log('🎯 Validating expected tab functionality...');
    
    const expectedTabs = [
      { name: 'Browse Recipes', content: 'Recipes' },
      { name: 'Generate Plans', content: 'Generate' },
      { name: 'Customers', content: 'Customers' },
      { name: 'Saved Plans', content: 'Saved' }
    ];
    
    for (const tab of expectedTabs) {
      console.log(`Testing tab: ${tab.name}`);
      
      // Click tab
      await page.click(`text=${tab.name}`);
      await page.waitForTimeout(200);
      
      // Verify tab becomes active
      const activeTab = await page.locator('[data-state="active"]').textContent();
      expect(activeTab).toContain(tab.content);
      
      // Verify no health protocol content in tab
      const healthCount = await page.locator('text=Health Protocol').count();
      expect(healthCount).toBe(0);
    }
    
    console.log('✅ CRITICAL TEST PASSED: All expected tabs functional');
  });

  test('CRITICAL: Visual layout consistency', async () => {
    console.log('🎨 Validating visual layout consistency...');
    
    // Get tab layout measurements
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
    
    // Verify exactly 4 tabs
    expect(tabMetrics.length).toBe(4);
    
    // Verify consistent height
    const firstHeight = tabMetrics[0].height;
    tabMetrics.forEach((tab, index) => {
      expect(tab.height).toBe(firstHeight);
      expect(tab.text).not.toContain('Health');
      expect(tab.text).not.toContain('Protocol');
      console.log(`✓ Tab ${index + 1}: ${tab.text} - Height: ${tab.height}px`);
    });
    
    // Verify reasonable widths (tabs should fill container)
    const totalWidth = tabMetrics.reduce((sum, tab) => sum + tab.width, 0);
    expect(totalWidth).toBeGreaterThan(400); // Reasonable minimum
    
    console.log('✅ CRITICAL TEST PASSED: Visual layout consistent');
  });

  test('CRITICAL: Network error recovery', async () => {
    console.log('🌐 Testing network error recovery...');
    
    // Simulate network failure
    await page.route('**/*', route => {
      if (Math.random() < 0.6) {
        route.abort();
      } else {
        route.continue();
      }
    });
    
    // Try to navigate during network issues
    try {
      await page.click('text=Generate Plans');
      await page.waitForTimeout(500);
    } catch (e) {
      console.log('Network error expected during simulation');
    }
    
    // Remove network simulation
    await page.unroute('**/*');
    
    // Test recovery
    await page.reload({ waitUntil: 'networkidle' });
    
    // Verify recovery maintains Health Protocol elimination
    const healthCount = await page.locator('text=Health Protocol').count();
    expect(healthCount).toBe(0);
    
    const tabCount = await page.locator('[role="tab"]').count();
    expect(tabCount).toBe(4);
    
    // Verify functionality restored
    await page.click('text=Browse Recipes');
    await expect(page.locator('[data-state="active"]')).toContainText('Recipes');
    
    console.log('✅ CRITICAL TEST PASSED: Network recovery stable');
  });
});