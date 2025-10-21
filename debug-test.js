import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Listen for console logs and errors
  page.on('console', msg => {
    console.log(`[${msg.type()}] ${msg.text()}`);
  });
  
  page.on('pageerror', error => {
    console.error('Page error:', error.message);
  });
  
  page.on('requestfailed', request => {
    console.error('Request failed:', request.url(), request.failure()?.errorText);
  });
  
  await page.goto('http://localhost:4000/login');
  
  // Wait a bit for the page to load
  await page.waitForTimeout(3000);
  
  // Check if root element exists and has content
  const rootElement = await page.$('#root');
  const rootContent = await rootElement?.innerHTML();
  console.log('Root element content:', rootContent?.substring(0, 200) + '...');
  
  // Take a screenshot
  await page.screenshot({ path: 'debug-login-page.png' });
  
  await browser.close();
})();