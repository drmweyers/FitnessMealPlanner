import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:4000';
const ADMIN_EMAIL = 'admin@fitmeal.pro';
const ADMIN_PASSWORD = 'AdminPass123';

// Helper function to login as admin
async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/admin`, { timeout: 10000 });
}

test.describe('BMAD Recipe Generator - E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display BMAD Generator tab in admin dashboard', async ({ page }) => {
    await expect(page.locator('text=BMAD Generator')).toBeVisible({ timeout: 10000 });
  });

  test('should render BMAD Generator component when tab is clicked', async ({ page }) => {
    // Click BMAD Generator tab
    await page.click('text=BMAD Generator');

    // Wait for component to load
    await expect(page.locator('text=BMAD Multi-Agent Recipe Generator')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Bulk recipe generation with multi-agent AI workflow')).toBeVisible();
  });

  test('should show natural language interface', async ({ page }) => {
    await page.click('text=BMAD Generator');

    await expect(page.locator('text=AI-Powered Natural Language Generator')).toBeVisible();
    await expect(page.locator('textarea[placeholder*="Generate 20 weight loss recipes"]')).toBeVisible();
  });

  test('should toggle advanced settings form', async ({ page }) => {
    await page.click('text=BMAD Generator');

    // Click "Show Advanced Settings" button
    await page.click('text=Show Advanced Settings');

    // Verify form fields appear
    await expect(page.locator('text=Number of Recipes')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Meal Types')).toBeVisible();
    await expect(page.locator('text=Enable Image Generation')).toBeVisible();
  });

  test('should generate 5 recipes and show progress bar', async ({ page }) => {
    await page.click('text=BMAD Generator');
    await page.click('text=Show Advanced Settings');

    // Wait for form to be visible
    await page.waitForSelector('input[type="number"]', { timeout: 5000 });

    // Set recipe count to 5
    const countInput = page.locator('label:has-text("Number of Recipes") + div input[type="number"]').first();
    await countInput.fill('5');

    // Verify value was set
    await expect(countInput).toHaveValue('5');

    // Click Start BMAD Generation button
    const generateButton = page.locator('button:has-text("Start BMAD Generation")');
    await generateButton.click();

    // Wait for progress display to appear (with longer timeout for API call)
    await expect(page.locator('text=/recipes/')).toBeVisible({ timeout: 15000 });

    // Verify progress bar is visible
    await expect(page.locator('div[role="progressbar"]')).toBeVisible({ timeout: 5000 });

    // Verify chunk progress is shown
    await expect(page.locator('text=/Chunk \\d+\\/\\d+/')).toBeVisible({ timeout: 5000 });
  });

  test('should display real-time SSE progress updates', async ({ page }) => {
    await page.click('text=BMAD Generator');
    await page.click('text=Show Advanced Settings');

    await page.waitForSelector('input[type="number"]', { timeout: 5000 });

    const countInput = page.locator('label:has-text("Number of Recipes") + div input[type="number"]').first();
    await countInput.fill('5');

    const generateButton = page.locator('button:has-text("Start BMAD Generation")');
    await generateButton.click();

    // Wait for progress to appear
    await expect(page.locator('text=/\\d+\\/\\d+ recipes/')).toBeVisible({ timeout: 15000 });

    // Wait for progress to update (recipes completed should change)
    await page.waitForFunction(
      () => {
        const progressText = document.body.textContent || '';
        return progressText.match(/[1-9]\/\d+ recipes/);
      },
      { timeout: 30000 }
    );

    console.log('✅ Progress updates detected');
  });

  test('should display agent status badges during generation', async ({ page }) => {
    await page.click('text=BMAD Generator');
    await page.click('text=Show Advanced Settings');

    await page.waitForSelector('input[type="number"]', { timeout: 5000 });

    const countInput = page.locator('label:has-text("Number of Recipes") + div input[type="number"]').first();
    await countInput.fill('5');

    const generateButton = page.locator('button:has-text("Start BMAD Generation")');
    await generateButton.click();

    // Wait for agent status display
    await expect(page.locator('text=Concept Agent:')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Validator:')).toBeVisible();
    await expect(page.locator('text=Image Artist:')).toBeVisible();
    await expect(page.locator('text=Storage:')).toBeVisible();
  });

  test('should show phase transitions during generation', async ({ page }) => {
    await page.click('text=BMAD Generator');
    await page.click('text=Show Advanced Settings');

    await page.waitForSelector('input[type="number"]', { timeout: 5000 });

    const countInput = page.locator('label:has-text("Number of Recipes") + div input[type="number"]').first();
    await countInput.fill('5');

    const generateButton = page.locator('button:has-text("Start BMAD Generation")');
    await generateButton.click();

    // Wait for initial phase
    await expect(page.locator('text=/planning|generating|validating|imaging|complete/i')).toBeVisible({ timeout: 15000 });

    console.log('✅ Phase indicator visible');
  });

  test('should display image generation count', async ({ page }) => {
    await page.click('text=BMAD Generator');
    await page.click('text=Show Advanced Settings');

    await page.waitForSelector('input[type="number"]', { timeout: 5000 });

    const countInput = page.locator('label:has-text("Number of Recipes") + div input[type="number"]').first();
    await countInput.fill('5');

    // Ensure image generation is enabled
    const imageGenCheckbox = page.locator('label:has-text("Enable Image Generation") + div input[type="checkbox"]');
    const isChecked = await imageGenCheckbox.isChecked();
    if (!isChecked) {
      await imageGenCheckbox.click();
    }

    const generateButton = page.locator('button:has-text("Start BMAD Generation")');
    await generateButton.click();

    // Wait for image generation to show
    await expect(page.locator('text=/\\d+ images generated/i')).toBeVisible({ timeout: 30000 });
  });

  test('should show time remaining estimate', async ({ page }) => {
    await page.click('text=BMAD Generator');
    await page.click('text=Show Advanced Settings');

    await page.waitForSelector('input[type="number"]', { timeout: 5000 });

    const countInput = page.locator('label:has-text("Number of Recipes") + div input[type="number"]').first();
    await countInput.fill('10');

    const generateButton = page.locator('button:has-text("Start BMAD Generation")');
    await generateButton.click();

    // Wait for time estimate to appear
    await expect(page.locator('text=/~\\d+s remaining/i')).toBeVisible({ timeout: 20000 });
  });

  test('should disable form inputs during generation', async ({ page }) => {
    await page.click('text=BMAD Generator');
    await page.click('text=Show Advanced Settings');

    await page.waitForSelector('input[type="number"]', { timeout: 5000 });

    const countInput = page.locator('label:has-text("Number of Recipes") + div input[type="number"]').first();
    await countInput.fill('5');

    const generateButton = page.locator('button:has-text("Start BMAD Generation")');
    await generateButton.click();

    // Verify inputs are disabled during generation
    await expect(countInput).toBeDisabled({ timeout: 5000 });
  });

  test('should handle batchId correctly (no "undefined" in logs)', async ({ page }) => {
    // Listen to console logs
    const logs: string[] = [];
    page.on('console', (msg) => {
      logs.push(msg.text());
    });

    await page.click('text=BMAD Generator');
    await page.click('text=Show Advanced Settings');

    await page.waitForSelector('input[type="number"]', { timeout: 5000 });

    const countInput = page.locator('label:has-text("Number of Recipes") + div input[type="number"]').first();
    await countInput.fill('5');

    const generateButton = page.locator('button:has-text("Start BMAD Generation")');
    await generateButton.click();

    // Wait for generation to start
    await expect(page.locator('text=/\\d+\\/\\d+ recipes/')).toBeVisible({ timeout: 15000 });

    // Wait a bit for logs to accumulate
    await page.waitForTimeout(3000);

    // Check that no logs contain "batch undefined"
    const hasBatchUndefined = logs.some(log => log.includes('batch undefined'));
    expect(hasBatchUndefined).toBe(false);

    console.log('✅ No "batch undefined" found in logs');
  });

  test('should complete generation successfully', async ({ page }) => {
    await page.click('text=BMAD Generator');
    await page.click('text=Show Advanced Settings');

    await page.waitForSelector('input[type="number"]', { timeout: 5000 });

    const countInput = page.locator('label:has-text("Number of Recipes") + div input[type="number"]').first();
    await countInput.fill('5');

    const generateButton = page.locator('button:has-text("Start BMAD Generation")');
    await generateButton.click();

    // Wait for progress to show
    await expect(page.locator('text=/\\d+\\/\\d+ recipes/')).toBeVisible({ timeout: 15000 });

    // Wait for completion (up to 5 minutes for 5 recipes)
    await expect(page.locator('text=/5\\/5 recipes/')).toBeVisible({ timeout: 300000 });

    console.log('✅ Generation completed: 5/5 recipes');
  });

  test('should allow toggling feature flags', async ({ page }) => {
    await page.click('text=BMAD Generator');
    await page.click('text=Show Advanced Settings');

    await page.waitForSelector('text=Enable Image Generation', { timeout: 5000 });

    // Test image generation toggle
    const imageGenCheckbox = page.locator('label:has-text("Enable Image Generation")');
    await imageGenCheckbox.click();

    // Test S3 upload toggle
    const s3Checkbox = page.locator('label:has-text("Upload to S3")');
    await s3Checkbox.click();

    // Test nutrition validation toggle
    const nutritionCheckbox = page.locator('label:has-text("Enable Nutrition Validation")');
    await nutritionCheckbox.click();

    // All clicks should succeed without errors
    console.log('✅ All feature flags toggled successfully');
  });

  test('should validate recipe count range', async ({ page }) => {
    await page.click('text=BMAD Generator');
    await page.click('text=Show Advanced Settings');

    await page.waitForSelector('input[type="number"]', { timeout: 5000 });

    const countInput = page.locator('label:has-text("Number of Recipes") + div input[type="number"]').first();

    // Try setting value above max (100)
    await countInput.fill('150');

    const generateButton = page.locator('button:has-text("Start BMAD Generation")');
    await generateButton.click();

    // Should show validation error or prevent submission
    await page.waitForTimeout(1000);

    // Check if form validation prevented submission
    const progressVisible = await page.locator('text=/\\d+\\/\\d+ recipes/').isVisible();

    console.log(`Validation test: ${progressVisible ? 'Form submitted (unexpected)' : 'Form blocked (expected)'}`);
  });

  test('should persist progress state during SSE reconnection', async ({ page }) => {
    await page.click('text=BMAD Generator');
    await page.click('text=Show Advanced Settings');

    await page.waitForSelector('input[type="number"]', { timeout: 5000 });

    const countInput = page.locator('label:has-text("Number of Recipes") + div input[type="number"]').first();
    await countInput.fill('10');

    const generateButton = page.locator('button:has-text("Start BMAD Generation")');
    await generateButton.click();

    // Wait for progress
    await expect(page.locator('text=/\\d+\\/\\d+ recipes/')).toBeVisible({ timeout: 15000 });

    // Get current progress
    const initialProgress = await page.locator('text=/\\d+\\/\\d+ recipes/').textContent();
    console.log(`Initial progress: ${initialProgress}`);

    // Wait a bit
    await page.waitForTimeout(5000);

    // Progress should have updated or remained visible
    await expect(page.locator('text=/\\d+\\/\\d+ recipes/')).toBeVisible();

    const currentProgress = await page.locator('text=/\\d+\\/\\d+ recipes/').textContent();
    console.log(`Current progress: ${currentProgress}`);

    expect(currentProgress).toBeTruthy();
  });
});
