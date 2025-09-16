import { test } from '@playwright/test';

const TEST_USER = {
  email: 'customer.test@evofitmeals.com',
  password: 'TestCustomer123!'
};

test('Debug container width styles', async ({ page }) => {
  // Set viewport to 1920px
  await page.setViewportSize({ width: 1920, height: 1080 });

  // Navigate and login
  await page.goto('/login');
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');

  await page.waitForURL(/\/customer/, { timeout: 10000 });

  // Get the main container
  const mainContainer = page.locator('main > div').first();

  // Log computed styles
  const styles = await mainContainer.evaluate((el) => {
    const computed = window.getComputedStyle(el);
    return {
      width: computed.width,
      maxWidth: computed.maxWidth,
      paddingLeft: computed.paddingLeft,
      paddingRight: computed.paddingRight,
      marginLeft: computed.marginLeft,
      marginRight: computed.marginRight,
      className: el.className,
      computedWidth: el.getBoundingClientRect().width,
      screenWidth: window.innerWidth
    };
  });

  console.log('Container Styles:', styles);

  // Check if any parent elements have constraints
  const parentStyles = await page.locator('main').evaluate((el) => {
    const computed = window.getComputedStyle(el);
    return {
      width: computed.width,
      maxWidth: computed.maxWidth,
      className: el.className
    };
  });

  console.log('Parent (main) Styles:', parentStyles);

  // Check body styles
  const bodyStyles = await page.locator('body').evaluate((el) => {
    const computed = window.getComputedStyle(el);
    return {
      width: computed.width,
      maxWidth: computed.maxWidth,
      overflow: computed.overflow
    };
  });

  console.log('Body Styles:', bodyStyles);

  // Check if Tailwind classes are being applied correctly
  const tailwindTest = await page.evaluate(() => {
    const testDiv = document.createElement('div');
    testDiv.className = 'xl:max-w-9xl 2xl:max-w-10xl';
    document.body.appendChild(testDiv);
    const computed = window.getComputedStyle(testDiv);
    const result = {
      maxWidth: computed.maxWidth,
      className: testDiv.className
    };
    document.body.removeChild(testDiv);
    return result;
  });

  console.log('Tailwind Test Div:', tailwindTest);
});