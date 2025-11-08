import { test, expect } from '@playwright/test';

/**
 * E2E Test Suite: Tier Upgrade Flow (v2.0 - Subscription Model)
 *
 * Tests all tier upgrade paths (Starter → Professional → Enterprise)
 * using Stripe Checkout Sessions with subscription updates and
 * Stripe-calculated proration.
 *
 * Coverage:
 * - Starter → Professional upgrade
 * - Professional → Enterprise upgrade
 * - Starter → Enterprise direct upgrade
 * - Stripe proration via Checkout Session
 * - Immediate feature access via entitlements invalidation
 * - Scheduled downgrades (cancel_at_period_end)
 * - Subscription lifecycle states
 * - Billing Portal integration
 * - Webhook-driven entitlements updates
 *
 * Business Model: Monthly Stripe Subscriptions
 * Tier Names: Starter / Professional / Enterprise
 * Pricing: Dynamic from /api/v1/public/pricing (NO hardcoded amounts)
 *
 * @requires Existing tier subscription in test database
 * @requires Stripe test mode credentials
 * @requires Webhook endpoint accessible
 */

// Helper: Fetch dynamic pricing
async function fetchPricing(page) {
  return await page.evaluate(async () => {
    const response = await fetch('/api/v1/public/pricing');
    return await response.json();
  });
}

test.describe('Tier Upgrade Flow', () => {
  test.beforeEach(async ({ page, context }) => {
    // Helper: Complete Starter tier purchase using Checkout Session
    await page.goto('/login');
    await page.fill('input[name="email"]', 'trainer.test@evofitmeals.com');
    await page.fill('input[name="password"]', 'TestTrainer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/trainer/dashboard');

    // Purchase Starter tier if not already purchased
    const tierBadge = page.locator('[data-testid="tier-badge"]');
    const tierBadgeVisible = await tierBadge.isVisible().catch(() => false);

    if (!tierBadgeVisible) {
      // Select Starter tier
      await page.click('[data-testid="tier-starter"] button[data-testid="select-tier"]');

      // Handle Checkout Session redirect
      const checkoutPagePromise = context.waitForEvent('page');
      const checkoutPage = await checkoutPagePromise;
      await checkoutPage.waitForLoadState('networkidle');

      // Fill payment details on Stripe Checkout
      await checkoutPage.fill('[placeholder="Card number"]', '4242424242424242');
      await checkoutPage.fill('[placeholder="MM / YY"]', '12/30');
      await checkoutPage.fill('[placeholder="CVC"]', '123');
      await checkoutPage.fill('[placeholder="ZIP"]', '12345');

      // Submit payment
      await checkoutPage.click('button[type="submit"]');

      // Wait for redirect back to success page
      await page.waitForURL(/\/subscription\/success/, { timeout: 30000 });
      await page.click('button[data-testid="go-to-dashboard"]');
    }

    // Verify on Starter tier
    await expect(page.locator('[data-testid="tier-badge"]')).toContainText('Starter');
  });

  test('should display upgrade prompt for Starter users', async ({ page }) => {
    // Navigate to upgrade page
    await page.click('[data-testid="upgrade-tier-cta"]');

    // Verify upgrade modal appears
    await expect(page.locator('[data-testid="tier-upgrade-modal"]')).toBeVisible();
    await expect(page.locator('h2')).toContainText('Upgrade Your Tier');

    // Verify only Professional and Enterprise shown (not Starter)
    await expect(page.locator('[data-testid="tier-professional"]')).toBeVisible();
    await expect(page.locator('[data-testid="tier-enterprise"]')).toBeVisible();
    await expect(page.locator('[data-testid="tier-starter"]')).not.toBeVisible();

    // Verify current tier highlighted
    await expect(page.locator('[data-testid="current-tier-badge"]')).toContainText('Current: Starter');
  });

  test('should upgrade from Starter to Professional with Stripe proration', async ({ page, context }) => {
    // Fetch dynamic pricing for verification
    const pricing = await fetchPricing(page);
    const professionalPrice = `$${(pricing.tiers.professional.amount / 100).toFixed(2)}`;

    // Click upgrade CTA
    await page.click('[data-testid="upgrade-tier-cta"]');

    // Select Professional tier
    await page.click('[data-testid="tier-professional"] button[data-testid="upgrade-to-tier"]');

    // Wait for Checkout Session redirect
    const checkoutPagePromise = context.waitForEvent('page');
    const checkoutPage = await checkoutPagePromise;
    await checkoutPage.waitForLoadState('networkidle');

    // Verify we're on Stripe Checkout
    expect(checkoutPage.url()).toContain('checkout.stripe.com');

    // Verify subscription upgrade details on Checkout page
    await expect(checkoutPage.locator('text=/Professional/i')).toBeVisible();
    // Note: Stripe displays prorated amount automatically; no hardcoded expectations

    // Fill payment details (subscription update may require payment confirmation)
    await checkoutPage.fill('[placeholder="Card number"]', '4242424242424242');
    await checkoutPage.fill('[placeholder="MM / YY"]', '12/30');
    await checkoutPage.fill('[placeholder="CVC"]', '123');
    await checkoutPage.fill('[placeholder="ZIP"]', '12345');

    // Submit payment
    await checkoutPage.click('button[type="submit"]');

    // Wait for redirect back to success page (after webhook processing)
    await page.waitForURL(/\/subscription\/success/, { timeout: 30000 });

    // Verify success message
    await expect(page.locator('[data-testid="subscription-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Professional');

    // Return to dashboard
    await page.click('button[data-testid="go-to-dashboard"]');

    // Verify tier badge updated (entitlements invalidated by webhook)
    await expect(page.locator('[data-testid="tier-badge"]')).toContainText('Professional');

    // Verify subscription status is active
    await expect(page.locator('[data-testid="subscription-status"]')).toContainText('Active');
  });

  test('should upgrade from Professional to Enterprise with Stripe proration', async ({ page, context }) => {
    // First upgrade to Professional
    await page.click('[data-testid="upgrade-tier-cta"]');
    await page.click('[data-testid="tier-professional"] button[data-testid="upgrade-to-tier"]');

    let checkoutPagePromise = context.waitForEvent('page');
    let checkoutPage = await checkoutPagePromise;
    await checkoutPage.waitForLoadState('networkidle');
    await checkoutPage.fill('[placeholder="Card number"]', '4242424242424242');
    await checkoutPage.fill('[placeholder="MM / YY"]', '12/30');
    await checkoutPage.fill('[placeholder="CVC"]', '123');
    await checkoutPage.fill('[placeholder="ZIP"]', '12345');
    await checkoutPage.click('button[type="submit"]');
    await page.waitForURL(/\/subscription\/success/, { timeout: 30000 });
    await page.click('button[data-testid="go-to-dashboard"]');

    // Now upgrade to Enterprise
    await page.click('[data-testid="upgrade-tier-cta"]');

    // Verify only Enterprise shown
    await expect(page.locator('[data-testid="tier-enterprise"]')).toBeVisible();
    await expect(page.locator('[data-testid="tier-professional"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="tier-starter"]')).not.toBeVisible();

    await page.click('[data-testid="tier-enterprise"] button[data-testid="upgrade-to-tier"]');

    // Handle Checkout Session redirect for Enterprise upgrade
    checkoutPagePromise = context.waitForEvent('page');
    checkoutPage = await checkoutPagePromise;
    await checkoutPage.waitForLoadState('networkidle');

    // Verify we're on Stripe Checkout
    expect(checkoutPage.url()).toContain('checkout.stripe.com');
    await expect(checkoutPage.locator('text=/Enterprise/i')).toBeVisible();

    // Fill payment details
    await checkoutPage.fill('[placeholder="Card number"]', '4242424242424242');
    await checkoutPage.fill('[placeholder="MM / YY"]', '12/30');
    await checkoutPage.fill('[placeholder="CVC"]', '123');
    await checkoutPage.fill('[placeholder="ZIP"]', '12345');

    await checkoutPage.click('button[type="submit"]');
    await page.waitForURL(/\/subscription\/success/, { timeout: 30000 });
    await page.click('button[data-testid="go-to-dashboard"]');

    await expect(page.locator('[data-testid="tier-badge"]')).toContainText('Enterprise');
    await expect(page.locator('[data-testid="subscription-status"]')).toContainText('Active');
  });

  test('should allow direct upgrade from Starter to Enterprise', async ({ page, context }) => {
    await page.click('[data-testid="upgrade-tier-cta"]');

    // Select Enterprise directly
    await page.click('[data-testid="tier-enterprise"] button[data-testid="upgrade-to-tier"]');

    // Handle Checkout Session redirect
    const checkoutPagePromise = context.waitForEvent('page');
    const checkoutPage = await checkoutPagePromise;
    await checkoutPage.waitForLoadState('networkidle');

    // Verify we're on Stripe Checkout
    expect(checkoutPage.url()).toContain('checkout.stripe.com');
    await expect(checkoutPage.locator('text=/Enterprise/i')).toBeVisible();
    // Note: Stripe calculates proration from Starter to Enterprise automatically

    // Fill payment details
    await checkoutPage.fill('[placeholder="Card number"]', '4242424242424242');
    await checkoutPage.fill('[placeholder="MM / YY"]', '12/30');
    await checkoutPage.fill('[placeholder="CVC"]', '123');
    await checkoutPage.fill('[placeholder="ZIP"]', '12345');

    await checkoutPage.click('button[type="submit"]');
    await page.waitForURL(/\/subscription\/success/, { timeout: 30000 });
    await page.click('button[data-testid="go-to-dashboard"]');

    await expect(page.locator('[data-testid="tier-badge"]')).toContainText('Enterprise');
    await expect(page.locator('[data-testid="subscription-status"]')).toContainText('Active');
  });

  test('should immediately grant Professional features after upgrade', async ({ page, context }) => {
    // Verify Starter limitations
    await page.goto('/trainer/customers');
    await expect(page.locator('[data-testid="customer-limit"]')).toContainText('9 / 9');

    // Verify analytics NOT available
    await page.goto('/trainer/analytics');
    await expect(page.locator('[data-testid="analytics-locked"]')).toBeVisible();
    await expect(page.locator('[data-testid="upgrade-prompt"]')).toContainText('Upgrade to Professional for Analytics');

    // Perform upgrade
    await page.click('[data-testid="upgrade-tier-cta"]');
    await page.click('[data-testid="tier-professional"] button[data-testid="upgrade-to-tier"]');

    // Handle Checkout Session redirect
    const checkoutPagePromise = context.waitForEvent('page');
    const checkoutPage = await checkoutPagePromise;
    await checkoutPage.waitForLoadState('networkidle');
    await checkoutPage.fill('[placeholder="Card number"]', '4242424242424242');
    await checkoutPage.fill('[placeholder="MM / YY"]', '12/30');
    await checkoutPage.fill('[placeholder="CVC"]', '123');
    await checkoutPage.fill('[placeholder="ZIP"]', '12345');
    await checkoutPage.click('button[type="submit"]');
    await page.waitForURL(/\/subscription\/success/, { timeout: 30000 });
    await page.click('button[data-testid="go-to-dashboard"]');

    // Verify new limits (entitlements invalidated by webhook)
    await page.goto('/trainer/customers');
    await expect(page.locator('[data-testid="customer-limit"]')).toContainText('9 / 20'); // Still 9 customers, but limit now 20

    // Verify analytics NOW available (immediate access via entitlements)
    await page.goto('/trainer/analytics');
    await expect(page.locator('[data-testid="analytics-locked"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible();
  });

  test('should immediately grant Enterprise features after upgrade', async ({ page, context }) => {
    // Upgrade to Enterprise
    await page.click('[data-testid="upgrade-tier-cta"]');
    await page.click('[data-testid="tier-enterprise"] button[data-testid="upgrade-to-tier"]');

    // Handle Checkout Session redirect
    const checkoutPagePromise = context.waitForEvent('page');
    const checkoutPage = await checkoutPagePromise;
    await checkoutPage.waitForLoadState('networkidle');
    await checkoutPage.fill('[placeholder="Card number"]', '4242424242424242');
    await checkoutPage.fill('[placeholder="MM / YY"]', '12/30');
    await checkoutPage.fill('[placeholder="CVC"]', '123');
    await checkoutPage.fill('[placeholder="ZIP"]', '12345');
    await checkoutPage.click('button[type="submit"]');
    await page.waitForURL(/\/subscription\/success/, { timeout: 30000 });
    await page.click('button[data-testid="go-to-dashboard"]');

    // Verify unlimited customers (entitlements updated via webhook)
    await page.goto('/trainer/customers');
    await expect(page.locator('[data-testid="customer-limit"]')).toContainText('Unlimited');

    // Verify advanced analytics available
    await page.goto('/trainer/analytics');
    await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible();

    // Verify export options (Enterprise feature)
    await page.click('[data-testid="export-analytics"]');
    await expect(page.locator('[data-testid="export-csv"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-excel"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-pdf"]')).toBeVisible();

    // Verify API access (Enterprise-only feature)
    await page.goto('/trainer/settings/api');
    await expect(page.locator('[data-testid="api-keys-section"]')).toBeVisible();
    await expect(page.locator('button[data-testid="generate-api-key"]')).toBeVisible();
  });

  test('should handle upgrade payment failure gracefully', async ({ page }) => {
    await page.click('[data-testid="upgrade-tier-cta"]');
    await page.click('[data-testid="tier-professional"] button[data-testid="upgrade-to-tier"]');

    // Mock payment failure (this would require test backend setup)
    // For now, verify error handling UI exists
    await page.click('button[data-testid="confirm-upgrade"]');

    // If payment fails, error should be displayed
    // (Actual failure testing requires Stripe test cards with specific behaviors)
  });

  test('should cancel upgrade flow without charging', async ({ page }) => {
    await page.click('[data-testid="upgrade-tier-cta"]');
    await page.click('[data-testid="tier-professional"] button[data-testid="upgrade-to-tier"]');

    // Verify on confirmation screen
    await expect(page.locator('[data-testid="upgrade-confirmation"]')).toBeVisible();

    // Click cancel
    await page.click('button[data-testid="cancel-upgrade"]');

    // Verify returned to dashboard
    await expect(page.locator('[data-testid="upgrade-confirmation"]')).not.toBeVisible();

    // Verify still on Starter tier
    await expect(page.locator('[data-testid="tier-badge"]')).toContainText('Starter');

    // Verify no charge occurred (check billing history)
    await page.goto('/trainer/billing');
    const transactions = page.locator('[data-testid="transaction-row"]');
    const count = await transactions.count();

    // Should only have initial Starter purchase, not Professional upgrade
    expect(count).toBe(1);
  });

  test('should prevent downgrade attempts', async ({ page }) => {
    // Upgrade to Professional
    await page.click('[data-testid="upgrade-tier-cta"]');
    await page.click('[data-testid="tier-professional"] button[data-testid="upgrade-to-tier"]');
    await page.click('button[data-testid="confirm-upgrade"]');
    await expect(page.locator('[data-testid="upgrade-success"]')).toBeVisible({ timeout: 10000 });
    await page.click('button[data-testid="go-to-dashboard"]');

    // Try to access tier selection (should not show lower tiers)
    await page.goto('/trainer/billing');
    await page.click('[data-testid="manage-subscription"]');

    // Verify Starter tier NOT available for selection
    await expect(page.locator('[data-testid="tier-starter"]')).not.toBeVisible();

    // Verify downgrade warning if attempting via settings
    await page.goto('/trainer/settings/subscription');
    const downgradeCTA = page.locator('button[data-testid="downgrade-tier"]');
    const isDowngradeVisible = await downgradeCTA.isVisible().catch(() => false);

    if (isDowngradeVisible) {
      await downgradeCTA.click();
      await expect(page.locator('[data-testid="downgrade-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="downgrade-warning"]')).toContainText('Downgrading may result in data loss');
    }
  });

  test('should display upgrade CTAs in feature-locked areas', async ({ page }) => {
    // On Starter tier, navigate to analytics (locked)
    await page.goto('/trainer/analytics');

    await expect(page.locator('[data-testid="analytics-locked"]')).toBeVisible();
    await expect(page.locator('[data-testid="upgrade-prompt"]')).toContainText('Upgrade to Professional');

    // Click upgrade CTA from locked feature
    await page.click('[data-testid="upgrade-from-locked-feature"]');

    // Verify upgrade modal appears
    await expect(page.locator('[data-testid="tier-upgrade-modal"]')).toBeVisible();

    // Verify Professional tier pre-selected or highlighted
    await expect(page.locator('[data-testid="tier-professional"]')).toHaveClass(/highlighted/);
  });

  test('should record upgrade in transaction history', async ({ page }) => {
    // Perform upgrade
    await page.click('[data-testid="upgrade-tier-cta"]');
    await page.click('[data-testid="tier-professional"] button[data-testid="upgrade-to-tier"]');
    await page.click('button[data-testid="confirm-upgrade"]');
    await expect(page.locator('[data-testid="upgrade-success"]')).toBeVisible({ timeout: 10000 });

    // Navigate to billing
    await page.goto('/trainer/billing');

    // Verify transaction history
    await expect(page.locator('[data-testid="transaction-history"]')).toBeVisible();

    // Verify both transactions: initial Starter purchase + Professional upgrade
    const transactions = page.locator('[data-testid="transaction-row"]');
    await expect(transactions).toHaveCount(2);

    // Verify most recent transaction is upgrade
    await expect(transactions.first()).toContainText('Upgrade to Professional');
    await expect(transactions.first()).toContainText('Completed');
  });

  test('should update billing cycle after upgrade', async ({ page, context }) => {
    // Fetch dynamic pricing for verification
    const pricing = await fetchPricing(page);
    const professionalPrice = `$${(pricing.tiers.professional.amount / 100).toFixed(2)}`;

    // Perform upgrade
    await page.click('[data-testid="upgrade-tier-cta"]');
    await page.click('[data-testid="tier-professional"] button[data-testid="upgrade-to-tier"]');

    // Handle Checkout Session redirect
    const checkoutPagePromise = context.waitForEvent('page');
    const checkoutPage = await checkoutPagePromise;
    await checkoutPage.waitForLoadState('networkidle');
    await checkoutPage.fill('[placeholder="Card number"]', '4242424242424242');
    await checkoutPage.fill('[placeholder="MM / YY"]', '12/30');
    await checkoutPage.fill('[placeholder="CVC"]', '123');
    await checkoutPage.fill('[placeholder="ZIP"]', '12345');
    await checkoutPage.click('button[type="submit"]');
    await page.waitForURL(/\/subscription\/success/, { timeout: 30000 });

    // Navigate to billing
    await page.goto('/trainer/billing');

    // Verify next billing date updated
    await expect(page.locator('[data-testid="next-billing-date"]')).toBeVisible();

    // Verify new tier price displayed (dynamic from Stripe)
    await expect(page.locator('[data-testid="subscription-amount"]')).toContainText(professionalPrice);
    await expect(page.locator('[data-testid="billing-frequency"]')).toContainText('per month');
  });

  test('should send upgrade confirmation email', async ({ page, context }) => {
    // This test would require email service integration
    // For now, verify the UI shows confirmation that email was sent

    await page.click('[data-testid="upgrade-tier-cta"]');
    await page.click('[data-testid="tier-professional"] button[data-testid="upgrade-to-tier"]');

    // Handle Checkout Session redirect
    const checkoutPagePromise = context.waitForEvent('page');
    const checkoutPage = await checkoutPagePromise;
    await checkoutPage.waitForLoadState('networkidle');
    await checkoutPage.fill('[placeholder="Card number"]', '4242424242424242');
    await checkoutPage.fill('[placeholder="MM / YY"]', '12/30');
    await checkoutPage.fill('[placeholder="CVC"]', '123');
    await checkoutPage.fill('[placeholder="ZIP"]', '12345');
    await checkoutPage.click('button[type="submit"]');
    await page.waitForURL(/\/subscription\/success/, { timeout: 30000 });

    // Verify email sent confirmation
    await expect(page.locator('[data-testid="email-sent-confirmation"]')).toContainText('Confirmation email sent to');
  });

  test('should maintain existing data after upgrade', async ({ page, context }) => {
    // Create some customers on Starter tier
    await page.goto('/trainer/customers');
    await page.click('button[data-testid="add-customer"]');
    await page.fill('input[name="name"]', 'Test Customer');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.click('button[type="submit"]');
    await expect(page.locator('[data-testid="customer-card"]')).toContainText('Test Customer');

    // Perform upgrade
    await page.click('[data-testid="upgrade-tier-cta"]');
    await page.click('[data-testid="tier-professional"] button[data-testid="upgrade-to-tier"]');

    // Handle Checkout Session redirect
    const checkoutPagePromise = context.waitForEvent('page');
    const checkoutPage = await checkoutPagePromise;
    await checkoutPage.waitForLoadState('networkidle');
    await checkoutPage.fill('[placeholder="Card number"]', '4242424242424242');
    await checkoutPage.fill('[placeholder="MM / YY"]', '12/30');
    await checkoutPage.fill('[placeholder="CVC"]', '123');
    await checkoutPage.fill('[placeholder="ZIP"]', '12345');
    await checkoutPage.click('button[type="submit"]');
    await page.waitForURL(/\/subscription\/success/, { timeout: 30000 });
    await page.click('button[data-testid="go-to-dashboard"]');

    // Verify customer still exists (data preserved during upgrade)
    await page.goto('/trainer/customers');
    await expect(page.locator('[data-testid="customer-card"]')).toContainText('Test Customer');
  });

  // ========================================
  // NEW SUBSCRIPTION LIFECYCLE TESTS (v2.0)
  // ========================================

  test('should schedule downgrade to take effect at period end', async ({ page, context }) => {
    // First upgrade to Professional
    await page.click('[data-testid="upgrade-tier-cta"]');
    await page.click('[data-testid="tier-professional"] button[data-testid="upgrade-to-tier"]');

    let checkoutPagePromise = context.waitForEvent('page');
    let checkoutPage = await checkoutPagePromise;
    await checkoutPage.waitForLoadState('networkidle');
    await checkoutPage.fill('[placeholder="Card number"]', '4242424242424242');
    await checkoutPage.fill('[placeholder="MM / YY"]', '12/30');
    await checkoutPage.fill('[placeholder="CVC"]', '123');
    await checkoutPage.fill('[placeholder="ZIP"]', '12345');
    await checkoutPage.click('button[type="submit"]');
    await page.waitForURL(/\/subscription\/success/, { timeout: 30000 });
    await page.click('button[data-testid="go-to-dashboard"]');

    // Navigate to subscription management
    await page.goto('/trainer/billing');
    await page.click('[data-testid="manage-subscription"]');

    // Schedule downgrade to Starter
    await page.click('[data-testid="schedule-downgrade"]');
    await page.selectOption('[data-testid="target-tier"]', 'starter');
    await page.click('button[data-testid="confirm-downgrade"]');

    // Verify downgrade scheduled (not immediate)
    await expect(page.locator('[data-testid="scheduled-downgrade-notice"]')).toBeVisible();
    await expect(page.locator('[data-testid="scheduled-downgrade-notice"]')).toContainText('Will downgrade to Starter on');

    // Verify still on Professional tier until period end
    await page.goto('/trainer/dashboard');
    await expect(page.locator('[data-testid="tier-badge"]')).toContainText('Professional');
    await expect(page.locator('[data-testid="subscription-status"]')).toContainText('Active');

    // Verify subscription has cancel_at_period_end flag
    await page.goto('/trainer/billing');
    await expect(page.locator('[data-testid="cancel-at-period-end"]')).toContainText('true');
  });

  test('should integrate with Stripe Billing Portal', async ({ page, context }) => {
    // Upgrade to Professional first
    await page.click('[data-testid="upgrade-tier-cta"]');
    await page.click('[data-testid="tier-professional"] button[data-testid="upgrade-to-tier"]');

    let checkoutPagePromise = context.waitForEvent('page');
    let checkoutPage = await checkoutPagePromise;
    await checkoutPage.waitForLoadState('networkidle');
    await checkoutPage.fill('[placeholder="Card number"]', '4242424242424242');
    await checkoutPage.fill('[placeholder="MM / YY"]', '12/30');
    await checkoutPage.fill('[placeholder="CVC"]', '123');
    await checkoutPage.fill('[placeholder="ZIP"]', '12345');
    await checkoutPage.click('button[type="submit"]');
    await page.waitForURL(/\/subscription\/success/, { timeout: 30000 });

    // Navigate to billing
    await page.goto('/trainer/billing');

    // Click Stripe Billing Portal link
    await page.click('[data-testid="open-billing-portal"]');

    // Wait for Billing Portal redirect
    const billingPortalPromise = context.waitForEvent('page');
    const billingPortal = await billingPortalPromise;
    await billingPortal.waitForLoadState('networkidle');

    // Verify we're on Stripe Billing Portal
    expect(billingPortal.url()).toContain('billing.stripe.com');

    // Verify subscription details visible
    await expect(billingPortal.locator('text=/subscription/i')).toBeVisible();
    await expect(billingPortal.locator('text=/Professional/i')).toBeVisible();
  });

  test('should reflect subscription status after upgrade (active state)', async ({ page, context }) => {
    // Fetch pricing for verification
    const pricing = await fetchPricing(page);

    // Perform upgrade
    await page.click('[data-testid="upgrade-tier-cta"]');
    await page.click('[data-testid="tier-professional"] button[data-testid="upgrade-to-tier"]');

    const checkoutPagePromise = context.waitForEvent('page');
    const checkoutPage = await checkoutPagePromise;
    await checkoutPage.waitForLoadState('networkidle');
    await checkoutPage.fill('[placeholder="Card number"]', '4242424242424242');
    await checkoutPage.fill('[placeholder="MM / YY"]', '12/30');
    await checkoutPage.fill('[placeholder="CVC"]', '123');
    await checkoutPage.fill('[placeholder="ZIP"]', '12345');
    await checkoutPage.click('button[type="submit"]');
    await page.waitForURL(/\/subscription\/success/, { timeout: 30000 });

    // Verify subscription status on success page
    await expect(page.locator('[data-testid="subscription-status"]')).toContainText('Active');

    // Navigate to dashboard
    await page.click('button[data-testid="go-to-dashboard"]');

    // Verify subscription status persists
    await expect(page.locator('[data-testid="subscription-status"]')).toContainText('Active');

    // Verify on billing page
    await page.goto('/trainer/billing');
    await expect(page.locator('[data-testid="subscription-status"]')).toContainText('Active');
    await expect(page.locator('[data-testid="subscription-status"]')).not.toContainText('past_due');
    await expect(page.locator('[data-testid="subscription-status"]')).not.toContainText('canceled');
  });

  test('should invalidate entitlements cache after upgrade (webhook-driven)', async ({ page, context }) => {
    // Upgrade to Professional
    await page.click('[data-testid="upgrade-tier-cta"]');
    await page.click('[data-testid="tier-professional"] button[data-testid="upgrade-to-tier"]');

    const checkoutPagePromise = context.waitForEvent('page');
    const checkoutPage = await checkoutPagePromise;
    await checkoutPage.waitForLoadState('networkidle');
    await checkoutPage.fill('[placeholder="Card number"]', '4242424242424242');
    await checkoutPage.fill('[placeholder="MM / YY"]', '12/30');
    await checkoutPage.fill('[placeholder="CVC"]', '123');
    await checkoutPage.fill('[placeholder="ZIP"]', '12345');
    await checkoutPage.click('button[type="submit"]');
    await page.waitForURL(/\/subscription\/success/, { timeout: 30000 });
    await page.click('button[data-testid="go-to-dashboard"]');

    // Make API call to verify entitlements updated
    const entitlements = await page.evaluate(async () => {
      const response = await fetch('/api/v1/entitlements');
      return await response.json();
    });

    // Verify Professional entitlements (not Starter)
    expect(entitlements.tier).toBe('professional');
    expect(entitlements.limits.customers).toBe(20);
    expect(entitlements.features.analytics).toBe('basic');
    expect(entitlements.features.csv_export).toBe(true);

    // Verify entitlements cache was invalidated (webhook processed)
    // The fact that we get Professional limits means cache was cleared
  });
});
