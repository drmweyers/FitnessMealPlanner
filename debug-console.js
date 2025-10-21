import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Capture all console messages
  const logs = [];
  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
    console.log(`[${msg.type()}] ${msg.text()}`);
  });
  
  // Capture page errors
  page.on('pageerror', error => {
    console.error('Page error:', error.message);
    logs.push(`[PAGE ERROR] ${error.message}`);
  });
  
  // Capture network failures
  page.on('requestfailed', request => {
    console.error('Request failed:', request.url(), request.failure()?.errorText);
    logs.push(`[NETWORK ERROR] ${request.url()} - ${request.failure()?.errorText}`);
  });
  
  try {
    await page.goto('http://localhost:4000/login', { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    // Check if any HTML exists at all
    const bodyContent = await page.evaluate(() => document.body.innerHTML);
    console.log('Body content length:', bodyContent.length);
    console.log('Body content preview:', bodyContent.substring(0, 500));
    
    // Check if root element exists
    const rootExists = await page.evaluate(() => !!document.getElementById('root'));
    console.log('Root element exists:', rootExists);
    
    // Check if main.tsx script loaded
    const scripts = await page.evaluate(() => 
      Array.from(document.querySelectorAll('script')).map(s => s.src)
    );
    console.log('Scripts found:', scripts);
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    console.log('\nAll logs:');
    logs.forEach(log => console.log(log));
    await browser.close();
  }
})();