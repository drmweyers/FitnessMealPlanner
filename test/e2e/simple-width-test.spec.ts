import { test, expect } from '@playwright/test';

test('Simple width test on blank page', async ({ page }) => {
  // Set viewport to 1920px
  await page.setViewportSize({ width: 1920, height: 1080 });

  // Navigate to a simple HTML page
  await page.goto('data:text/html,<html><head><style>body{margin:0;padding:0;}.container{width:100%;max-width:1920px;margin:0 auto;padding:0 32px;background:lightblue;height:100vh;}.inner{background:white;height:100%;}</style></head><body><div class="container"><div class="inner">Test</div></div></body></html>');

  // Get container width
  const containerWidth = await page.locator('.container').evaluate(el => el.getBoundingClientRect().width);
  const innerWidth = await page.locator('.inner').evaluate(el => el.getBoundingClientRect().width);

  console.log('Simple container width:', containerWidth);
  console.log('Inner content width:', innerWidth);

  expect(containerWidth).toBe(1920);
  expect(innerWidth).toBe(1856); // 1920 - 64px padding
});

test('Test Tailwind classes directly', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });

  // Create a test page with Tailwind
  await page.goto('/login');

  // Inject a test div
  const testResult = await page.evaluate(() => {
    const div = document.createElement('div');
    div.className = 'w-full xl:max-w-9xl 2xl:max-w-10xl mx-auto';
    div.style.background = 'red';
    div.style.height = '50px';
    document.body.appendChild(div);
    const rect = div.getBoundingClientRect();
    const computed = window.getComputedStyle(div);
    return {
      width: rect.width,
      maxWidth: computed.maxWidth,
      className: div.className
    };
  });

  console.log('Tailwind test div:', testResult);
});