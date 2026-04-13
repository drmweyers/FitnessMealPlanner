import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport:{width:1280,height:900} });
const page = await ctx.newPage();
page.setDefaultNavigationTimeout(60000);
await page.goto('https://evofitmeals.com/login', { waitUntil:'domcontentloaded' });
await page.fill('input[type="email"], input[name="email"]', 'trainer.test@evofitmeals.com');
await page.fill('input[type="password"], input[name="password"]', 'TestTrainer123!');
await page.click('button[type="submit"]');
await page.waitForURL(/trainer|dashboard/i, { timeout:20000 });
await page.waitForTimeout(5000);
await page.screenshot({ path:'tests/e2e/screenshots/forge/fix1-trainer-dash-full.png', fullPage:true });
console.log('URL:', page.url());
const text = await page.locator('body').innerText();
// Find mentions of recipe/library/3000
const lines = text.split('\n').map(l=>l.trim()).filter(Boolean);
console.log('\nLINES containing Recipe/Library/3000/available:');
lines.forEach(l=>{ if(/recipe|library|3[,.]?000|available/i.test(l)) console.log(' |', l); });
// Save html snippet
const html = await page.locator('body').innerHTML();
// Find cards mentioning Recipe Library
const idx = html.indexOf('Recipe Library');
console.log('\nRecipe Library in HTML at idx:', idx);
if (idx>=0) console.log('Context:', html.substring(Math.max(0,idx-150), idx+400).replace(/<[^>]+>/g,' ').replace(/\s+/g,' '));
await browser.close();
