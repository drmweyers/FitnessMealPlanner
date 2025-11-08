import { test } from '@playwright/test';
import * as fs from 'fs';

test('extract BMAD form HTML', async ({ page }) => {
  // Login
  await page.goto('http://localhost:4000/auth');
  await page.fill('input[type="email"]', 'admin@fitmeal.pro');
  await page.fill('input[type="password"]', 'AdminPass123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin');

  // Go to BMAD tab
  await page.click('button[value="bmad"]');
  await page.waitForTimeout(2000);

  // Get ALL labels on the page
  const allLabels = await page.$$eval('label', labels =>
    labels.map(l => l.textContent?.trim()).filter(Boolean)
  );

  console.log('\n=== ALL LABELS FOUND ===');
  allLabels.forEach(label => console.log(`- ${label}`));

  // Save HTML
  const html = await page.content();
  fs.writeFileSync('test-results/bmad-complete-page.html', html);

  // Screenshot
  await page.screenshot({ path: 'test-results/bmad-screenshot.png', fullPage: true });

  console.log('\nFiles saved:');
  console.log('- test-results/bmad-complete-page.html');
  console.log('- test-results/bmad-screenshot.png');
});
