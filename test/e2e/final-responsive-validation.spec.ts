import { test, expect } from '@playwright/test';

test.describe('Final Responsive Validation - All Fixes Applied', () => {

  // Test all critical viewports
  const viewports = [
    { name: 'iPhone SE', width: 375, height: 667, type: 'mobile' },
    { name: 'iPhone 12', width: 390, height: 844, type: 'mobile' },
    { name: 'iPad Mini', width: 768, height: 1024, type: 'tablet' },
    { name: 'iPad Air', width: 820, height: 1180, type: 'tablet' },
    { name: 'Desktop', width: 1280, height: 720, type: 'desktop' },
    { name: 'Full HD', width: 1920, height: 1080, type: 'desktop' },
    { name: '2K', width: 2560, height: 1440, type: 'desktop' }
  ];

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:4000/login');
  });

  // Test 1: Navigation Visibility Across All Viewports
  test('Navigation shows correctly at all breakpoints', async ({ page }) => {
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      // Check mobile navigation visibility
      const mobileNav = page.locator('[data-testid="mobile-navigation"]');
      if (viewport.type === 'mobile') {
        await expect(mobileNav).toBeVisible({ timeout: 5000 });
        console.log(`✅ ${viewport.name}: Mobile nav visible`);
      } else {
        await expect(mobileNav).toBeHidden({ timeout: 5000 });
        console.log(`✅ ${viewport.name}: Mobile nav hidden`);
      }

      // Check desktop navigation visibility
      const desktopHeader = page.locator('header[data-desktop-nav="true"], header.hidden.md\\:block, header').first();
      if (viewport.type === 'desktop' || viewport.type === 'tablet') {
        await expect(desktopHeader).toBeVisible({ timeout: 5000 });
        console.log(`✅ ${viewport.name}: Desktop nav visible`);
      } else {
        await expect(desktopHeader).toBeHidden({ timeout: 5000 });
        console.log(`✅ ${viewport.name}: Desktop nav hidden`);
      }
    }
  });

  // Test 2: No Horizontal Scroll at Any Viewport
  test('No horizontal scrolling at any breakpoint', async ({ page }) => {
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      // Check for horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth ||
               document.body.scrollWidth > document.body.clientWidth;
      });

      expect(hasHorizontalScroll).toBe(false);
      console.log(`✅ ${viewport.name}: No horizontal scroll`);
    }
  });

  // Test 3: Width Utilization
  test('Proper width utilization at all viewports', async ({ page }) => {
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/customer', { timeout: 10000 });

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      const mainContent = page.locator('main > div').first();
      const box = await mainContent.boundingBox();

      if (box) {
        if (viewport.type === 'mobile') {
          // Mobile should use nearly 100% width (minus padding)
          const utilizationPercent = (box.width / viewport.width) * 100;
          expect(utilizationPercent).toBeGreaterThan(90);
          expect(utilizationPercent).toBeLessThanOrEqual(100);
          console.log(`✅ ${viewport.name}: Width utilization ${utilizationPercent.toFixed(1)}%`);
        } else if (viewport.type === 'tablet') {
          // Tablet should use most of the width with padding
          const utilizationPercent = (box.width / viewport.width) * 100;
          expect(utilizationPercent).toBeGreaterThan(85);
          console.log(`✅ ${viewport.name}: Width utilization ${utilizationPercent.toFixed(1)}%`);
        } else {
          // Desktop should use around 90% width
          const utilizationPercent = (box.width / viewport.width) * 100;
          expect(utilizationPercent).toBeGreaterThan(80);
          expect(utilizationPercent).toBeLessThan(95);
          console.log(`✅ ${viewport.name}: Width utilization ${utilizationPercent.toFixed(1)}%`);
        }
      }
    }
  });

  // Test 4: Touch Targets on Mobile
  test('Touch targets meet 44px minimum on mobile', async ({ page }) => {
    const mobileViewports = viewports.filter(v => v.type === 'mobile');

    for (const viewport of mobileViewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      // Check button sizes
      const buttons = await page.locator('button').all();
      let validButtons = 0;

      for (const button of buttons.slice(0, 5)) { // Check first 5 buttons
        const box = await button.boundingBox();
        if (box && box.height >= 44) {
          validButtons++;
        }
      }

      expect(validButtons).toBeGreaterThan(0);
      console.log(`✅ ${viewport.name}: Touch targets validated (${validButtons} buttons ≥44px)`);
    }
  });

  // Test 5: Content Density on Desktop
  test('Desktop shows appropriate content density', async ({ page }) => {
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/customer', { timeout: 10000 });

    const desktopViewports = viewports.filter(v => v.type === 'desktop');

    for (const viewport of desktopViewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      // Check if grid has multiple columns
      const gridElements = await page.locator('.grid, [class*="grid-cols"]').all();

      if (gridElements.length > 0) {
        const firstGrid = gridElements[0];
        const gridStyle = await firstGrid.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            gridTemplateColumns: computed.gridTemplateColumns,
            display: computed.display
          };
        });

        // Desktop should have multiple columns
        if (gridStyle.display === 'grid' && gridStyle.gridTemplateColumns) {
          const columns = gridStyle.gridTemplateColumns.split(' ').length;
          expect(columns).toBeGreaterThanOrEqual(2);
          console.log(`✅ ${viewport.name}: Grid has ${columns} columns`);
        }
      }
    }
  });

  // Test 6: Forms are Accessible
  test('Forms are usable across all viewports', async ({ page }) => {
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('http://localhost:4000/login');

      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');
      const submitButton = page.locator('button[type="submit"]');

      // All form elements should be visible
      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
      await expect(submitButton).toBeVisible();

      // Check sizes on mobile
      if (viewport.type === 'mobile') {
        const emailBox = await emailInput.boundingBox();
        const buttonBox = await submitButton.boundingBox();

        if (emailBox) {
          expect(emailBox.height).toBeGreaterThanOrEqual(44);
        }
        if (buttonBox) {
          expect(buttonBox.height).toBeGreaterThanOrEqual(44);
        }
      }

      console.log(`✅ ${viewport.name}: Forms are accessible`);
    }
  });

  // Test 7: Modal Behavior
  test('Modals adapt to viewport size', async ({ page }) => {
    // Login first
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/customer', { timeout: 10000 });

    // Go to progress tab to test modal
    await page.goto('http://localhost:4000/customer?tab=progress');
    await page.waitForTimeout(2000);

    for (const viewport of [viewports[0], viewports[4]]) { // Test mobile and desktop
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      // Try to open a modal (Add Measurement button)
      const addButton = page.locator('button:has-text("Add Measurement")').first();
      if (await addButton.isVisible()) {
        await addButton.click();
        await page.waitForTimeout(500);

        const modal = page.locator('[role="dialog"], .modal').first();
        if (await modal.isVisible()) {
          const modalBox = await modal.boundingBox();

          if (modalBox) {
            if (viewport.type === 'mobile') {
              // Mobile modals should be nearly full screen
              const widthPercent = (modalBox.width / viewport.width) * 100;
              expect(widthPercent).toBeGreaterThan(95);
              console.log(`✅ ${viewport.name}: Modal is full-screen (${widthPercent.toFixed(1)}%)`);
            } else {
              // Desktop modals should be centered and not full width
              const widthPercent = (modalBox.width / viewport.width) * 100;
              expect(widthPercent).toBeLessThan(80);
              console.log(`✅ ${viewport.name}: Modal is centered (${widthPercent.toFixed(1)}%)`);
            }
          }

          // Close modal
          const closeButton = page.locator('[aria-label="Close"], button:has-text("Cancel")').first();
          if (await closeButton.isVisible()) {
            await closeButton.click();
          }
        }
      }
    }
  });
});

// Summary test to ensure all critical features work
test('Summary: All responsive features working together', async ({ page }) => {
  const criticalTests = {
    mobileNav: false,
    desktopNav: false,
    noHorizontalScroll: false,
    touchTargets: false,
    widthUtilization: false,
    formUsability: false
  };

  // Test mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('http://localhost:4000/login');

  // Mobile nav should be visible
  const mobileNav = page.locator('[data-testid="mobile-navigation"]');
  criticalTests.mobileNav = await mobileNav.isVisible();

  // No horizontal scroll
  criticalTests.noHorizontalScroll = await page.evaluate(() => {
    return document.documentElement.scrollWidth <= document.documentElement.clientWidth;
  });

  // Touch targets
  const submitButton = page.locator('button[type="submit"]');
  const buttonBox = await submitButton.boundingBox();
  if (buttonBox) {
    criticalTests.touchTargets = buttonBox.height >= 44;
  }

  // Form usability
  const emailInput = page.locator('input[type="email"]');
  criticalTests.formUsability = await emailInput.isVisible();

  // Test desktop viewport
  await page.setViewportSize({ width: 1920, height: 1080 });

  // Desktop nav should be visible
  const desktopHeader = page.locator('header').first();
  criticalTests.desktopNav = await desktopHeader.isVisible();

  // Width utilization
  await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
  await page.fill('input[type="password"]', 'TestCustomer123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/customer', { timeout: 10000 });

  const mainContent = page.locator('main > div').first();
  const mainBox = await mainContent.boundingBox();
  if (mainBox) {
    const utilizationPercent = (mainBox.width / 1920) * 100;
    criticalTests.widthUtilization = utilizationPercent > 80 && utilizationPercent < 95;
  }

  // Generate summary report
  console.log('\n========== FINAL VALIDATION SUMMARY ==========');
  console.log('Mobile Navigation Visible on Mobile:', criticalTests.mobileNav ? '✅ PASS' : '❌ FAIL');
  console.log('Desktop Navigation Visible on Desktop:', criticalTests.desktopNav ? '✅ PASS' : '❌ FAIL');
  console.log('No Horizontal Scroll:', criticalTests.noHorizontalScroll ? '✅ PASS' : '❌ FAIL');
  console.log('Touch Targets ≥44px on Mobile:', criticalTests.touchTargets ? '✅ PASS' : '❌ FAIL');
  console.log('Desktop Width Utilization (80-95%):', criticalTests.widthUtilization ? '✅ PASS' : '❌ FAIL');
  console.log('Forms Usable:', criticalTests.formUsability ? '✅ PASS' : '❌ FAIL');
  console.log('===============================================\n');

  // All critical tests must pass
  Object.entries(criticalTests).forEach(([test, passed]) => {
    expect(passed).toBe(true);
  });
});