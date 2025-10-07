import { test } from '@playwright/test';

const TEST_USER = {
  email: 'customer.test@evofitmeals.com',
  password: 'TestCustomer123!'
};

test('Debug all parent container widths', async ({ page }) => {
  // Set viewport to 1920px
  await page.setViewportSize({ width: 1920, height: 1080 });

  // Navigate and login
  await page.goto('/login');
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');

  await page.waitForURL(/\/customer/, { timeout: 10000 });

  // Check every parent element
  const hierarchy = await page.evaluate(() => {
    const mainDiv = document.querySelector('main > div');
    const results: any[] = [];

    let element = mainDiv as HTMLElement;
    while (element && element !== document.body) {
      const computed = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      results.push({
        tagName: element.tagName,
        className: element.className,
        width: computed.width,
        maxWidth: computed.maxWidth,
        marginLeft: computed.marginLeft,
        marginRight: computed.marginRight,
        paddingLeft: computed.paddingLeft,
        paddingRight: computed.paddingRight,
        computedWidth: rect.width,
        display: computed.display,
        position: computed.position,
        boxSizing: computed.boxSizing
      });
      element = element.parentElement!;
    }

    // Add body and html
    const bodyComputed = window.getComputedStyle(document.body);
    results.push({
      tagName: 'BODY',
      width: bodyComputed.width,
      maxWidth: bodyComputed.maxWidth,
      computedWidth: document.body.getBoundingClientRect().width
    });

    const htmlComputed = window.getComputedStyle(document.documentElement);
    results.push({
      tagName: 'HTML',
      width: htmlComputed.width,
      maxWidth: htmlComputed.maxWidth,
      computedWidth: document.documentElement.getBoundingClientRect().width
    });

    return results;
  });

  console.log('\nElement Hierarchy (from innermost to outermost):');
  hierarchy.forEach((el, index) => {
    console.log(`\n${index}. ${el.tagName}:`);
    console.log(`   Class: ${el.className}`);
    console.log(`   Width: ${el.width} (computed: ${el.computedWidth}px)`);
    console.log(`   Max-width: ${el.maxWidth}`);
    console.log(`   Margins: L=${el.marginLeft} R=${el.marginRight}`);
    console.log(`   Padding: L=${el.paddingLeft} R=${el.paddingRight}`);
    console.log(`   Display: ${el.display}, Position: ${el.position}, Box-sizing: ${el.boxSizing}`);
  });
});