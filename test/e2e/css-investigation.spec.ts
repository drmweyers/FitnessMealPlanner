import { test } from '@playwright/test';

const TEST_USER = {
  email: 'customer.test@evofitmeals.com',
  password: 'TestCustomer123!'
};

test('Investigate CSS cascade and computed styles', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });

  // Navigate and login
  await page.goto('/login');
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/customer/, { timeout: 10000 });

  // Check all stylesheets loaded
  const stylesheets = await page.evaluate(() => {
    const sheets = Array.from(document.styleSheets);
    return sheets.map(sheet => ({
      href: sheet.href,
      rules: sheet.cssRules ? sheet.cssRules.length : 'N/A',
      disabled: sheet.disabled
    }));
  });

  console.log('\n=== Loaded Stylesheets ===');
  stylesheets.forEach(sheet => {
    console.log(`${sheet.href || 'inline'}: ${sheet.rules} rules, disabled: ${sheet.disabled}`);
  });

  // Check if Tailwind utilities are being applied
  const tailwindCheck = await page.evaluate(() => {
    // Create test elements with different Tailwind classes
    const tests = [
      { class: 'max-w-7xl', expected: '80rem' },
      { class: 'max-w-8xl', expected: '88rem' },
      { class: 'max-w-9xl', expected: '96rem' },
      { class: 'max-w-10xl', expected: '120rem' },
      { class: 'xl:max-w-9xl', expected: '96rem' },
      { class: '2xl:max-w-10xl', expected: '120rem' }
    ];

    const results = tests.map(test => {
      const div = document.createElement('div');
      div.className = test.class;
      document.body.appendChild(div);
      const computed = window.getComputedStyle(div);
      const maxWidth = computed.maxWidth;
      document.body.removeChild(div);
      return {
        class: test.class,
        expected: test.expected,
        actual: maxWidth
      };
    });

    return results;
  });

  console.log('\n=== Tailwind Class Resolution ===');
  tailwindCheck.forEach(check => {
    console.log(`${check.class}: expected ${check.expected}, got ${check.actual}`);
  });

  // Check the actual container and its computed styles
  const containerAnalysis = await page.evaluate(() => {
    const container = document.querySelector('main > div') as HTMLElement;
    if (!container) return null;

    const computed = window.getComputedStyle(container);
    const rect = container.getBoundingClientRect();

    // Get all CSS rules that apply to this element
    const matchingRules: any[] = [];
    Array.from(document.styleSheets).forEach(sheet => {
      try {
        if (sheet.cssRules) {
          Array.from(sheet.cssRules).forEach((rule: any) => {
            if (rule.selectorText && container.matches(rule.selectorText)) {
              matchingRules.push({
                selector: rule.selectorText,
                styles: rule.style.cssText
              });
            }
          });
        }
      } catch (e) {
        // Cross-origin stylesheets will throw
      }
    });

    return {
      className: container.className,
      computedMaxWidth: computed.maxWidth,
      computedWidth: computed.width,
      actualWidth: rect.width,
      boxSizing: computed.boxSizing,
      display: computed.display,
      position: computed.position,
      matchingRules: matchingRules.slice(0, 10) // Limit to first 10 rules
    };
  });

  console.log('\n=== Container Analysis ===');
  console.log('Class:', containerAnalysis?.className);
  console.log('Computed max-width:', containerAnalysis?.computedMaxWidth);
  console.log('Computed width:', containerAnalysis?.computedWidth);
  console.log('Actual width:', containerAnalysis?.actualWidth);
  console.log('Box-sizing:', containerAnalysis?.boxSizing);
  console.log('\n=== Matching CSS Rules ===');
  containerAnalysis?.matchingRules.forEach((rule, i) => {
    console.log(`${i + 1}. ${rule.selector}:`);
    console.log(`   ${rule.styles}`);
  });

  // Check if any parent elements are constraining
  const parentConstraints = await page.evaluate(() => {
    const container = document.querySelector('main > div') as HTMLElement;
    const parents: any[] = [];
    let element = container?.parentElement;

    while (element && element !== document.body) {
      const computed = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      parents.push({
        tagName: element.tagName,
        className: element.className,
        width: computed.width,
        maxWidth: computed.maxWidth,
        actualWidth: rect.width,
        overflow: computed.overflow
      });
      element = element.parentElement;
    }

    return parents;
  });

  console.log('\n=== Parent Constraints ===');
  parentConstraints.forEach(parent => {
    console.log(`${parent.tagName}.${parent.className}:`);
    console.log(`  Width: ${parent.width}, Max-width: ${parent.maxWidth}, Actual: ${parent.actualWidth}px`);
  });
});