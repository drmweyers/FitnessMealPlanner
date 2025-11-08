import { test, expect } from '@playwright/test';

/**
 * E2E Test Suite: Tier Feature Gating (v2.0 - Subscription Model)
 *
 * Tests that tier-based feature access control works correctly across
 * all features, with PRIMARY FOCUS on API-level 403 enforcement.
 * Server-side entitlements are the authoritative source; UI merely mirrors state.
 *
 * Coverage:
 * - Customer management limits (9 / 20 / unlimited)
 * - Meal plan access (1,000 / 2,500 / 5,000+)
 * - Analytics access (none / basic / advanced)
 * - Export formats (PDF / CSV / Excel+PDF+API)
 * - API access (locked / locked / available)
 * - Bulk operations
 * - Custom branding
 *
 * Architecture: All gating enforced at API level
 * Entitlements Source: GET /api/v1/entitlements (server-computed, Redis-cached)
 * Business Model: Monthly Stripe Subscriptions
 * Tier Names: Starter / Professional / Enterprise
 *
 * @requires Test users with each tier level
 * @requires Entitlements service running
 * @requires Redis cache (5-minute TTL, webhook invalidation)
 */

test.describe('Tier Feature Gating - Starter Tier', () => {
  test.beforeEach(async ({ page }) => {
    // Login as Starter tier user
    await page.goto('/login');
    await page.fill('input[name="email"]', 'trainer.starter@evofitmeals.com');
    await page.fill('input[name="password"]', 'TestTrainer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/trainer/dashboard');

    // Verify on Starter tier
    await expect(page.locator('[data-testid="tier-badge"]')).toContainText('Starter');
  });

  test('should enforce 9 customer limit', async ({ page }) => {
    await page.goto('/trainer/customers');

    // Verify customer count
    const customerCount = page.locator('[data-testid="customer-count"]');
    await expect(customerCount).toBeVisible();

    const countText = await customerCount.textContent();
    const [current, max] = countText!.match(/(\d+) \/ (\d+)/)!.slice(1).map(Number);

    expect(max).toBe(9);

    // If at limit, verify "Add Customer" button disabled
    if (current >= 9) {
      const addButton = page.locator('button[data-testid="add-customer"]');
      await expect(addButton).toBeDisabled();

      // Verify upgrade prompt appears
      await expect(page.locator('[data-testid="customer-limit-reached"]')).toBeVisible();
      await expect(page.locator('[data-testid="upgrade-prompt"]')).toContainText('Upgrade to Professional for 20 customers');
    }
  });

  test('should display customer limit warning at 80%', async ({ page }) => {
    await page.goto('/trainer/customers');

    // Mock having 7-8 customers (80-90% of 9)
    // In real test, seed database with 7-8 customers

    const customerCount = page.locator('[data-testid="customer-count"]');
    const countText = await customerCount.textContent();
    const [current] = countText!.match(/(\d+)/)!.slice(1).map(Number);

    if (current >= 7) {
      // Verify warning banner appears
      await expect(page.locator('[data-testid="customer-limit-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="customer-limit-warning"]')).toContainText('approaching your customer limit');
    }
  });

  test('should block analytics access', async ({ page }) => {
    await page.goto('/trainer/analytics');

    // Verify analytics locked
    await expect(page.locator('[data-testid="analytics-locked"]')).toBeVisible();
    await expect(page.locator('[data-testid="feature-locked-message"]')).toContainText('Analytics available in Professional tier');

    // Verify upgrade CTA
    await expect(page.locator('button[data-testid="upgrade-to-professional"]')).toBeVisible();

    // Verify analytics dashboard NOT rendered
    await expect(page.locator('[data-testid="analytics-dashboard"]')).not.toBeVisible();
  });

  test('should only allow PDF export', async ({ page }) => {
    await page.goto('/trainer/meal-plans');

    // Click on a meal plan
    await page.locator('[data-testid="meal-plan-card"]').first().click();

    // Click export button
    await page.click('button[data-testid="export-meal-plan"]');

    // Verify only PDF option available
    await expect(page.locator('[data-testid="export-pdf"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-csv"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="export-excel"]')).not.toBeVisible();
  });

  test('should block API access', async ({ page }) => {
    await page.goto('/trainer/settings/api');

    // Verify API section locked
    await expect(page.locator('[data-testid="api-locked"]')).toBeVisible();
    await expect(page.locator('[data-testid="feature-locked-message"]')).toContainText('API access available in Enterprise tier');

    // Verify no API key generation button
    await expect(page.locator('button[data-testid="generate-api-key"]')).not.toBeVisible();
  });

  test('should block bulk operations', async ({ page }) => {
    await page.goto('/trainer/customers');

    // Verify bulk action toolbar NOT available
    await expect(page.locator('[data-testid="bulk-actions-toolbar"]')).not.toBeVisible();

    // Verify select-all checkbox NOT available
    await expect(page.locator('input[data-testid="select-all-customers"]')).not.toBeVisible();
  });

  test('should block custom branding', async ({ page }) => {
    await page.goto('/trainer/settings/branding');

    // Verify custom branding locked
    await expect(page.locator('[data-testid="branding-locked"]')).toBeVisible();
    await expect(page.locator('[data-testid="feature-locked-message"]')).toContainText('Custom branding available in Enterprise tier');

    // Verify no upload buttons for logo/colors
    await expect(page.locator('button[data-testid="upload-logo"]')).not.toBeVisible();
  });

  test('should display tier badge on all pages', async ({ page }) => {
    const pages = [
      '/trainer/dashboard',
      '/trainer/customers',
      '/trainer/meal-plans',
      '/trainer/recipes',
      '/trainer/settings',
    ];

    for (const url of pages) {
      await page.goto(url);
      await expect(page.locator('[data-testid="tier-badge"]')).toContainText('Starter');
      await expect(page.locator('[data-testid="tier-badge"]')).toBeVisible();
    }
  });

  test('should show upgrade prompts in navigation', async ({ page }) => {
    // Verify upgrade CTAs in sidebar
    await expect(page.locator('[data-testid="sidebar-upgrade-cta"]')).toBeVisible();
    await expect(page.locator('[data-testid="sidebar-upgrade-cta"]')).toContainText('Upgrade for more features');
  });
});

test.describe('Tier Feature Gating - Professional Tier', () => {
  test.beforeEach(async ({ page }) => {
    // Login as Professional tier user
    await page.goto('/login');
    await page.fill('input[name="email"]', 'trainer.professional@evofitmeals.com');
    await page.fill('input[name="password"]', 'TestTrainer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/trainer/dashboard');

    // Verify on Professional tier
    await expect(page.locator('[data-testid="tier-badge"]')).toContainText('Professional');
  });

  test('should enforce 20 customer limit', async ({ page }) => {
    await page.goto('/trainer/customers');

    const customerCount = page.locator('[data-testid="customer-count"]');
    await expect(customerCount).toBeVisible();

    const countText = await customerCount.textContent();
    const [_, max] = countText!.match(/(\d+) \/ (\d+)/)!.slice(1).map(Number);

    expect(max).toBe(20);
  });

  test('should allow basic analytics access', async ({ page }) => {
    await page.goto('/trainer/analytics');

    // Verify analytics dashboard visible
    await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible();

    // Verify basic analytics widgets
    await expect(page.locator('[data-testid="total-customers-widget"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-meal-plans-widget"]')).toBeVisible();
    await expect(page.locator('[data-testid="revenue-widget"]')).toBeVisible();

    // Verify advanced features locked
    await expect(page.locator('[data-testid="cohort-analysis-locked"]')).toBeVisible();
    await expect(page.locator('[data-testid="predictive-analytics-locked"]')).toBeVisible();
  });

  test('should allow CSV export only', async ({ page }) => {
    await page.goto('/trainer/analytics');

    await page.click('button[data-testid="export-analytics"]');

    // Verify CSV available
    await expect(page.locator('[data-testid="export-csv"]')).toBeVisible();

    // Verify Excel and PDF locked
    await expect(page.locator('[data-testid="export-excel"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-excel"]')).toHaveClass(/locked/);

    await expect(page.locator('[data-testid="export-pdf"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-pdf"]')).toHaveClass(/locked/);

    // Click locked option shows upgrade prompt
    await page.click('[data-testid="export-excel"]');
    await expect(page.locator('[data-testid="upgrade-prompt"]')).toContainText('Upgrade to Enterprise for Excel export');
  });

  test('should block API access', async ({ page }) => {
    await page.goto('/trainer/settings/api');

    // Verify API still locked (Enterprise only)
    await expect(page.locator('[data-testid="api-locked"]')).toBeVisible();
    await expect(page.locator('[data-testid="feature-locked-message"]')).toContainText('API access available in Enterprise tier');
  });

  test('should allow bulk operations', async ({ page }) => {
    await page.goto('/trainer/customers');

    // Verify bulk actions toolbar available
    await expect(page.locator('[data-testid="bulk-actions-toolbar"]')).toBeVisible();

    // Select multiple customers
    await page.locator('input[data-testid="select-customer"]').first().check();
    await page.locator('input[data-testid="select-customer"]').nth(1).check();

    // Verify bulk action buttons appear
    await expect(page.locator('button[data-testid="bulk-export"]')).toBeVisible();
    await expect(page.locator('button[data-testid="bulk-assign-meal-plan"]')).toBeVisible();
  });

  test('should block custom branding', async ({ page }) => {
    await page.goto('/trainer/settings/branding');

    // Custom branding still locked (Enterprise only)
    await expect(page.locator('[data-testid="branding-locked"]')).toBeVisible();
  });

  test('should display upgrade prompts for Enterprise features', async ({ page }) => {
    await page.goto('/trainer/analytics');

    // Verify Enterprise feature upgrade prompts
    await expect(page.locator('[data-testid="enterprise-features-banner"]')).toBeVisible();
    await expect(page.locator('[data-testid="enterprise-features-banner"]')).toContainText('Unlock Excel export, API access, and more');
  });
});

test.describe('Tier Feature Gating - Enterprise Tier', () => {
  test.beforeEach(async ({ page }) => {
    // Login as Enterprise tier user
    await page.goto('/login');
    await page.fill('input[name="email"]', 'trainer.enterprise@evofitmeals.com');
    await page.fill('input[name="password"]', 'TestTrainer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/trainer/dashboard');

    // Verify on Enterprise tier
    await expect(page.locator('[data-testid="tier-badge"]')).toContainText('Enterprise');
  });

  test('should have unlimited customer capacity', async ({ page }) => {
    await page.goto('/trainer/customers');

    const customerCount = page.locator('[data-testid="customer-count"]');
    await expect(customerCount).toContainText('Unlimited');

    // Verify add customer always enabled
    await expect(page.locator('button[data-testid="add-customer"]')).toBeEnabled();

    // Verify no limit warnings
    await expect(page.locator('[data-testid="customer-limit-warning"]')).not.toBeVisible();
  });

  test('should have full analytics access', async ({ page }) => {
    await page.goto('/trainer/analytics');

    // Verify all analytics widgets visible
    await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-customers-widget"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-meal-plans-widget"]')).toBeVisible();
    await expect(page.locator('[data-testid="revenue-widget"]')).toBeVisible();

    // Verify advanced features unlocked
    await expect(page.locator('[data-testid="cohort-analysis"]')).toBeVisible();
    await expect(page.locator('[data-testid="predictive-analytics"]')).toBeVisible();
    await expect(page.locator('[data-testid="customer-segmentation"]')).toBeVisible();

    // Verify no locked features
    await expect(page.locator('[data-testid="cohort-analysis-locked"]')).not.toBeVisible();
  });

  test('should allow all export formats', async ({ page }) => {
    await page.goto('/trainer/analytics');

    await page.click('button[data-testid="export-analytics"]');

    // Verify all formats available
    await expect(page.locator('[data-testid="export-csv"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-excel"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-pdf"]')).toBeVisible();

    // Verify none are locked
    await expect(page.locator('[data-testid="export-csv"]')).not.toHaveClass(/locked/);
    await expect(page.locator('[data-testid="export-excel"]')).not.toHaveClass(/locked/);
    await expect(page.locator('[data-testid="export-pdf"]')).not.toHaveClass(/locked/);
  });

  test('should have API access', async ({ page }) => {
    await page.goto('/trainer/settings/api');

    // Verify API section unlocked
    await expect(page.locator('[data-testid="api-keys-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="api-locked"]')).not.toBeVisible();

    // Verify can generate API keys
    await expect(page.locator('button[data-testid="generate-api-key"]')).toBeVisible();
    await expect(page.locator('button[data-testid="generate-api-key"]')).toBeEnabled();

    // Generate API key
    await page.click('button[data-testid="generate-api-key"]');

    // Verify API key generated
    await expect(page.locator('[data-testid="api-key-display"]')).toBeVisible();
    const apiKey = await page.locator('[data-testid="api-key-value"]').textContent();
    expect(apiKey).toMatch(/^sk_[a-zA-Z0-9]{32}$/);
  });

  test('should have custom branding access', async ({ page }) => {
    await page.goto('/trainer/settings/branding');

    // Verify custom branding unlocked
    await expect(page.locator('[data-testid="custom-branding-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="branding-locked"]')).not.toBeVisible();

    // Verify can upload logo
    await expect(page.locator('button[data-testid="upload-logo"]')).toBeVisible();
    await expect(page.locator('button[data-testid="upload-logo"]')).toBeEnabled();

    // Verify can customize colors
    await expect(page.locator('input[data-testid="primary-color"]')).toBeVisible();
    await expect(page.locator('input[data-testid="secondary-color"]')).toBeVisible();
  });

  test('should have all bulk operations available', async ({ page }) => {
    await page.goto('/trainer/customers');

    // Verify bulk actions toolbar
    await expect(page.locator('[data-testid="bulk-actions-toolbar"]')).toBeVisible();

    // Select multiple customers
    await page.locator('input[data-testid="select-all-customers"]').check();

    // Verify all bulk operations available
    await expect(page.locator('button[data-testid="bulk-export"]')).toBeVisible();
    await expect(page.locator('button[data-testid="bulk-assign-meal-plan"]')).toBeVisible();
    await expect(page.locator('button[data-testid="bulk-email"]')).toBeVisible();
    await expect(page.locator('button[data-testid="bulk-archive"]')).toBeVisible();
  });

  test('should display no upgrade prompts', async ({ page }) => {
    const pages = [
      '/trainer/dashboard',
      '/trainer/customers',
      '/trainer/meal-plans',
      '/trainer/analytics',
      '/trainer/settings',
    ];

    for (const url of pages) {
      await page.goto(url);

      // Verify no upgrade CTAs
      await expect(page.locator('[data-testid="upgrade-prompt"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="sidebar-upgrade-cta"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="feature-locked"]')).not.toBeVisible();
    }
  });

  test('should have priority support badge', async ({ page }) => {
    await page.goto('/trainer/settings/support');

    // Verify priority support indicator
    await expect(page.locator('[data-testid="priority-support-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="priority-support-badge"]')).toContainText('Priority Support');

    // Verify faster response time messaging
    await expect(page.locator('[data-testid="response-time"]')).toContainText('24-hour response time');
  });
});

test.describe('Tier Feature Gating - Cross-Tier Validation', () => {
  test('should prevent API calls to restricted endpoints', async ({ page, request }) => {
    // Login as Starter tier
    await page.goto('/login');
    await page.fill('input[name="email"]', 'trainer.starter@evofitmeals.com');
    await page.fill('input[name="password"]', 'TestTrainer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/trainer/dashboard');

    // Get auth token
    const token = await page.evaluate(() => localStorage.getItem('authToken'));

    // Try to access Professional-only analytics endpoint
    const analyticsResponse = await request.get('/api/v1/analytics/dashboard', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(analyticsResponse.status()).toBe(403);

    const body = await analyticsResponse.json();
    expect(body.error).toContain('Professional tier required');
  });

  test('should consistently enforce limits across UI and API', async ({ page, request }) => {
    // Login as Starter tier with 9 customers already
    await page.goto('/login');
    await page.fill('input[name="email"]', 'trainer.starter.full@evofitmeals.com');
    await page.fill('input[name="password"]', 'TestTrainer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/trainer/dashboard');

    // UI: Verify add customer button disabled
    await page.goto('/trainer/customers');
    await expect(page.locator('button[data-testid="add-customer"]')).toBeDisabled();

    // API: Try to add customer via API
    const token = await page.evaluate(() => localStorage.getItem('authToken'));

    const addCustomerResponse = await request.post('/api/v1/customers', {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: 'Test Customer', email: 'test@example.com' },
    });

    expect(addCustomerResponse.status()).toBe(403);

    const body = await addCustomerResponse.json();
    expect(body.error).toContain('Customer limit reached');
  });
});

// ========================================
// NEW API-LEVEL 403 ENFORCEMENT TESTS (v2.0)
// ========================================

test.describe('API-Level 403 Enforcement - Server-Side Gating', () => {
  test('should return 403 for Starter tier accessing analytics API', async ({ page, request }) => {
    // Login as Starter tier
    await page.goto('/login');
    await page.fill('input[name="email"]', 'trainer.starter@evofitmeals.com');
    await page.fill('input[name="password"]', 'TestTrainer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/trainer/dashboard');

    const token = await page.evaluate(() => localStorage.getItem('authToken'));

    // Try to access analytics endpoints (Professional+)
    const dashboardResponse = await request.get('/api/v1/analytics/dashboard', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(dashboardResponse.status()).toBe(403);
    expect((await dashboardResponse.json()).error).toContain('analytics');

    // Try to access basic analytics (Professional+)
    const basicAnalyticsResponse = await request.get('/api/v1/analytics/basic', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(basicAnalyticsResponse.status()).toBe(403);
  });

  test('should return 403 for Starter tier accessing API key generation', async ({ page, request }) => {
    // Login as Starter tier
    await page.goto('/login');
    await page.fill('input[name="email"]', 'trainer.starter@evofitmeals.com');
    await page.fill('input[name="password"]', 'TestTrainer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/trainer/dashboard');

    const token = await page.evaluate(() => localStorage.getItem('authToken'));

    // Try to generate API key (Enterprise only)
    const apiKeyResponse = await request.post('/api/v1/api-keys', {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: 'Test API Key' },
    });
    expect(apiKeyResponse.status()).toBe(403);
    expect((await apiKeyResponse.json()).error).toContain('Enterprise tier required');
  });

  test('should return 403 for Professional tier accessing API keys', async ({ page, request }) => {
    // Login as Professional tier
    await page.goto('/login');
    await page.fill('input[name="email"]', 'trainer.professional@evofitmeals.com');
    await page.fill('input[name="password"]', 'TestTrainer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/trainer/dashboard');

    const token = await page.evaluate(() => localStorage.getItem('authToken'));

    // Try to generate API key (Enterprise only)
    const apiKeyResponse = await request.post('/api/v1/api-keys', {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: 'Test API Key' },
    });
    expect(apiKeyResponse.status()).toBe(403);
    expect((await apiKeyResponse.json()).error).toContain('Enterprise tier required');
  });

  test('should return 403 for Starter tier exceeding customer limit', async ({ page, request }) => {
    // Login as Starter tier at limit
    await page.goto('/login');
    await page.fill('input[name="email"]', 'trainer.starter.full@evofitmeals.com');
    await page.fill('input[name="password"]', 'TestTrainer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/trainer/dashboard');

    const token = await page.evaluate(() => localStorage.getItem('authToken'));

    // Try to add customer when at limit (9/9)
    const addCustomerResponse = await request.post('/api/v1/customers', {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: 'Over Limit Customer', email: 'overlimit@example.com' },
    });
    expect(addCustomerResponse.status()).toBe(403);
    expect((await addCustomerResponse.json()).error).toContain('Customer limit reached');
    expect((await addCustomerResponse.json()).limit).toBe(9);
    expect((await addCustomerResponse.json()).current).toBe(9);
  });

  test('should return 403 for Professional tier exceeding customer limit', async ({ page, request }) => {
    // Login as Professional tier at limit
    await page.goto('/login');
    await page.fill('input[name="email"]', 'trainer.professional.full@evofitmeals.com');
    await page.fill('input[name="password"]', 'TestTrainer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/trainer/dashboard');

    const token = await page.evaluate(() => localStorage.getItem('authToken'));

    // Try to add customer when at limit (20/20)
    const addCustomerResponse = await request.post('/api/v1/customers', {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: 'Over Limit Customer', email: 'overlimit@example.com' },
    });
    expect(addCustomerResponse.status()).toBe(403);
    expect((await addCustomerResponse.json()).limit).toBe(20);
  });

  test('should return 403 for Starter tier accessing CSV export', async ({ page, request }) => {
    // Login as Starter tier
    await page.goto('/login');
    await page.fill('input[name="email"]', 'trainer.starter@evofitmeals.com');
    await page.fill('input[name="password"]', 'TestTrainer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/trainer/dashboard');

    const token = await page.evaluate(() => localStorage.getItem('authToken'));

    // Try to export CSV (Professional+)
    const csvExportResponse = await request.post('/api/v1/analytics/export/csv', {
      headers: { Authorization: `Bearer ${token}` },
      data: { dateRange: 'last_30_days' },
    });
    expect(csvExportResponse.status()).toBe(403);
    expect((await csvExportResponse.json()).error).toContain('CSV export');
  });

  test('should return 403 for Professional tier accessing Excel export', async ({ page, request }) => {
    // Login as Professional tier
    await page.goto('/login');
    await page.fill('input[name="email"]', 'trainer.professional@evofitmeals.com');
    await page.fill('input[name="password"]', 'TestTrainer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/trainer/dashboard');

    const token = await page.evaluate(() => localStorage.getItem('authToken'));

    // Try to export Excel (Enterprise only)
    const excelExportResponse = await request.post('/api/v1/analytics/export/excel', {
      headers: { Authorization: `Bearer ${token}` },
      data: { dateRange: 'last_30_days' },
    });
    expect(excelExportResponse.status()).toBe(403);
    expect((await excelExportResponse.json()).error).toContain('Excel export');
    expect((await excelExportResponse.json()).requiredTier).toBe('enterprise');
  });

  test('should return 403 for Starter tier accessing bulk operations', async ({ page, request }) => {
    // Login as Starter tier
    await page.goto('/login');
    await page.fill('input[name="email"]', 'trainer.starter@evofitmeals.com');
    await page.fill('input[name="password"]', 'TestTrainer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/trainer/dashboard');

    const token = await page.evaluate(() => localStorage.getItem('authToken'));

    // Try to perform bulk customer export (Professional+)
    const bulkExportResponse = await request.post('/api/v1/customers/bulk-export', {
      headers: { Authorization: `Bearer ${token}` },
      data: { customerIds: ['1', '2', '3'] },
    });
    expect(bulkExportResponse.status()).toBe(403);
    expect((await bulkExportResponse.json()).error).toContain('bulk operations');
  });

  test('should serve entitlements from /api/v1/entitlements endpoint', async ({ page }) => {
    // Login as Starter tier
    await page.goto('/login');
    await page.fill('input[name="email"]', 'trainer.starter@evofitmeals.com');
    await page.fill('input[name="password"]', 'TestTrainer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/trainer/dashboard');

    // Fetch entitlements from server
    const entitlements = await page.evaluate(async () => {
      const response = await fetch('/api/v1/entitlements');
      return await response.json();
    });

    // Verify Starter entitlements
    expect(entitlements.tier).toBe('starter');
    expect(entitlements.limits.customers).toBe(9);
    expect(entitlements.limits.meal_plans).toBe(1000);
    expect(entitlements.features.analytics).toBe('none');
    expect(entitlements.features.api_access).toBe(false);
    expect(entitlements.features.bulk_operations).toBe(false);
    expect(entitlements.features.csv_export).toBe(false);
    expect(entitlements.features.excel_export).toBe(false);
    expect(entitlements.features.pdf_export).toBe(true);
  });

  test('should serve Professional entitlements correctly', async ({ page }) => {
    // Login as Professional tier
    await page.goto('/login');
    await page.fill('input[name="email"]', 'trainer.professional@evofitmeals.com');
    await page.fill('input[name="password"]', 'TestTrainer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/trainer/dashboard');

    // Fetch entitlements
    const entitlements = await page.evaluate(async () => {
      const response = await fetch('/api/v1/entitlements');
      return await response.json();
    });

    // Verify Professional entitlements
    expect(entitlements.tier).toBe('professional');
    expect(entitlements.limits.customers).toBe(20);
    expect(entitlements.limits.meal_plans).toBe(2500);
    expect(entitlements.features.analytics).toBe('basic');
    expect(entitlements.features.api_access).toBe(false);
    expect(entitlements.features.bulk_operations).toBe(true);
    expect(entitlements.features.csv_export).toBe(true);
    expect(entitlements.features.excel_export).toBe(false); // Enterprise only
    expect(entitlements.features.pdf_export).toBe(true);
  });

  test('should serve Enterprise entitlements correctly', async ({ page }) => {
    // Login as Enterprise tier
    await page.goto('/login');
    await page.fill('input[name="email"]', 'trainer.enterprise@evofitmeals.com');
    await page.fill('input[name="password"]', 'TestTrainer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/trainer/dashboard');

    // Fetch entitlements
    const entitlements = await page.evaluate(async () => {
      const response = await fetch('/api/v1/entitlements');
      return await response.json();
    });

    // Verify Enterprise entitlements
    expect(entitlements.tier).toBe('enterprise');
    expect(entitlements.limits.customers).toBe(-1); // Unlimited
    expect(entitlements.limits.meal_plans).toBe(5000);
    expect(entitlements.features.analytics).toBe('advanced');
    expect(entitlements.features.api_access).toBe(true);
    expect(entitlements.features.bulk_operations).toBe(true);
    expect(entitlements.features.csv_export).toBe(true);
    expect(entitlements.features.excel_export).toBe(true);
    expect(entitlements.features.pdf_export).toBe(true);
    expect(entitlements.features.custom_branding).toBe(true);
  });

  test('should enforce gating at API layer even if UI bypassed', async ({ page, request }) => {
    // Login as Starter tier
    await page.goto('/login');
    await page.fill('input[name="email"]', 'trainer.starter@evofitmeals.com');
    await page.fill('input[name="password"]', 'TestTrainer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/trainer/dashboard');

    const token = await page.evaluate(() => localStorage.getItem('authToken'));

    // Simulate bypassing UI by calling API directly
    // Even if UI was manipulated to show analytics, API must block
    const analyticsResponse = await request.get('/api/v1/analytics/dashboard', {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Must return 403 (not depend on UI hiding)
    expect(analyticsResponse.status()).toBe(403);

    // Verify error message includes tier requirement
    const body = await analyticsResponse.json();
    expect(body.error).toContain('tier required');
    expect(body.currentTier).toBe('starter');
    expect(body.requiredTier).toContain('professional');
  });

  test('should validate entitlements from Redis cache (server-side)', async ({ page }) => {
    // Login as Starter tier
    await page.goto('/login');
    await page.fill('input[name="email"]', 'trainer.starter@evofitmeals.com');
    await page.fill('input[name="password"]', 'TestTrainer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/trainer/dashboard');

    // Fetch entitlements twice (should hit Redis cache on second call)
    const entitlements1 = await page.evaluate(async () => {
      const response = await fetch('/api/v1/entitlements');
      return await response.json();
    });

    const entitlements2 = await page.evaluate(async () => {
      const response = await fetch('/api/v1/entitlements');
      return await response.json();
    });

    // Both calls should return identical entitlements (from Redis)
    expect(entitlements1).toEqual(entitlements2);

    // Verify cache metadata present
    expect(entitlements2.cached).toBe(true); // Server should indicate cache hit
    expect(entitlements2.ttl).toBeLessThanOrEqual(300); // 5-minute TTL
  });
});
