import { chromium } from 'playwright';

const BASE = 'https://evofitmeals.com';
const SHOT = 'tests/e2e/screenshots/forge';
const results = [];

function log(name, pass, detail='') {
  results.push({name, pass, detail});
  console.log(`${pass?'PASS':'FAIL'} — ${name}${detail?': '+detail:''}`);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport:{width:1280,height:900} });
const page = await ctx.newPage();
page.setDefaultTimeout(60000);
page.setDefaultNavigationTimeout(60000);

try {
  // ========== FIX 4: Login page logo ==========
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SHOT}/fix4-login-logo.png`, fullPage: false });
  const loginLogos = await page.locator('img[src*="logo"], img[alt*="EvoFit" i], img[alt*="logo" i]').count();
  const loginLogoVisible = loginLogos > 0 && await page.locator('img[src*="logo"], img[alt*="EvoFit" i], img[alt*="logo" i]').first().isVisible().catch(()=>false);
  log('FIX4a — /login logo visible', loginLogoVisible, `count=${loginLogos}`);

  // Login as trainer
  await page.fill('input[type="email"], input[name="email"]', 'trainer.test@evofitmeals.com');
  await page.fill('input[type="password"], input[name="password"]', 'TestTrainer123!');
  await page.click('button[type="submit"]');
  await page.waitForURL(/trainer|dashboard/i, { timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SHOT}/fix4-trainer-header-logo.png` });
  const headerLogos = await page.locator('header img, nav img').count();
  const headerLogoVisible = headerLogos > 0;
  log('FIX4b — /trainer header logo visible', headerLogoVisible, `count=${headerLogos}`);

  // ========== FIX 1: Recipe Library card on trainer Pro dashboard ==========
  // Look for "Recipe Library" card text
  const bodyText = await page.locator('body').innerText();
  const hasXof3000 = /\d+\s*of\s*3[,.]?000/i.test(bodyText);
  const has3000Available = /3[,.]?000\s*recipes\s*available/i.test(bodyText);
  log('FIX1 — Recipe Library shows "3,000 recipes available"', has3000Available && !hasXof3000,
      `has3000Available=${has3000Available} hasXof3000=${hasXof3000}`);
  await page.screenshot({ path: `${SHOT}/fix1-trainer-dashboard.png`, fullPage: true });

  // ========== FIX 2: Browse Recipes compact pagination ==========
  await page.goto(`${BASE}/recipes`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `${SHOT}/fix2-recipes-pagination.png`, fullPage: true });
  const recipesText = await page.locator('body').innerText();
  const hasShowingOf = /showing\s+\d+[\s\-–to]+\d+\s+of\s+\d/i.test(recipesText);
  const hasPageXofY = /page\s+\d+\s*of\s*\d+/i.test(recipesText);
  const hasPrevNext = /prev/i.test(recipesText) && /next/i.test(recipesText);
  const hasPerPage = /25|50|100/.test(recipesText);
  // Look for wall of numbered buttons (bad: more than 10 numeric pagination buttons)
  const numericPageBtns = await page.locator('button:text-matches("^\d+$"), a:text-matches("^\d+$")').count();
  const noWallOfButtons = numericPageBtns < 10;
  const allGood = hasShowingOf && hasPageXofY && hasPrevNext && hasPerPage && noWallOfButtons;
  log('FIX2 — Browse Recipes compact pagination', allGood,
      `showing=${hasShowingOf} pageXofY=${hasPageXofY} prevNext=${hasPrevNext} perPage=${hasPerPage} numericBtns=${numericPageBtns}`);

  // ========== FIX 3: Create Custom tab Pro Tip inside Option 1 ==========
  // Navigate to meal plan builder or generator
  await page.goto(`${BASE}/meal-plan-generator`, { waitUntil: 'domcontentloaded' }).catch(()=>{});
  await page.waitForTimeout(2000);
  let url = page.url();
  if (!/generat|builder|plan/i.test(url)) {
    // Try alt route
    await page.goto(`${BASE}/trainer`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const genLink = page.locator('a:has-text("Generate"), a:has-text("Meal Plan"), button:has-text("Create")').first();
    if (await genLink.count()>0) { await genLink.click().catch(()=>{}); await page.waitForTimeout(2000); }
  }
  // Click "Create Custom" tab if present
  const customTab = page.locator('button:has-text("Create Custom"), [role="tab"]:has-text("Create Custom"), button:has-text("Custom")').first();
  if (await customTab.count()>0) {
    await customTab.click().catch(()=>{});
    await page.waitForTimeout(1500);
  }
  await page.screenshot({ path: `${SHOT}/fix3-create-custom-tab.png`, fullPage: true });
  const pageText = await page.locator('body').innerText();
  const hasProTip = /pro tip/i.test(pageText);
  const hasOption1 = /option\s*1/i.test(pageText);
  // Check DOM structure: Pro Tip alert should be descendant of Option 1 container
  const proTipInsideOption1 = await page.evaluate(() => {
    const opt1 = Array.from(document.querySelectorAll('*')).find(el => /option\s*1/i.test(el.textContent||'') && el.children.length > 0 && el.textContent.length < 3000);
    if (!opt1) return { found:false, reason:'no Option 1 container' };
    const tip = Array.from(opt1.querySelectorAll('*')).find(el => /pro tip/i.test(el.textContent||''));
    if (!tip) return { found:false, reason:'pro tip not inside Option 1' };
    const textarea = opt1.querySelector('textarea');
    if (!textarea) return { found:true, nested:true, aboveTextarea:null, reason:'no textarea to compare' };
    // Check document order
    const pos = tip.compareDocumentPosition(textarea);
    const tipBeforeTextarea = !!(pos & Node.DOCUMENT_POSITION_FOLLOWING);
    return { found:true, nested:true, aboveTextarea: tipBeforeTextarea };
  });
  log('FIX3 — Create Custom Pro Tip nested inside Option 1 above textarea',
      !!(proTipInsideOption1.found && proTipInsideOption1.nested && (proTipInsideOption1.aboveTextarea!==false)),
      JSON.stringify(proTipInsideOption1));

} catch(e) {
  console.error('ERROR:', e.message);
  log('script', false, e.message);
} finally {
  await browser.close();
}

console.log('\n=== SUMMARY ===');
console.log(JSON.stringify(results, null, 2));
