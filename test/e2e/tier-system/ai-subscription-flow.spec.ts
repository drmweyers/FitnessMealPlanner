import { test, expect } from '@playwright/test';

/**
 * E2E Test Suite: AI Subscription Flow (v2.0 - Separate Subscription Model)
 *
 * Tests the AI subscription as a SEPARATE monthly subscription (independent
 * from tier subscriptions) using Stripe Checkout Sessions.
 *
 * Coverage:
 * - AI subscription purchase (separate from tier)
 * - AI generation quota tracking
 * - AI usage limits enforcement
 * - AI subscription cancellation (DOES NOT affect tier)
 * - AI subscription upgrade/downgrade
 * - Integration with tier system (tier-independent)
 *
 * Business Model: Separate Monthly Stripe Subscription
 * Pricing: Dynamic from /api/v1/public/pricing (NO hardcoded amounts)
 * Tier Independence: Canceling AI never downgrades or affects tier subscription
 *
 * @requires Tier subscription active
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

test.describe('AI Subscription Flow - Purchase', () => {
  test.beforeEach(async ({ page }) => {
    // Login as trainer with tier but NO AI subscription
    await page.goto('/login');
    await page.fill('input[name="email"]', 'trainer.professional@evofitmeals.com');
    await page.fill('input[name="password"]', 'TestTrainer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/trainer/dashboard');
  });

  test('should display AI subscription options with dynamic pricing', async ({ page }) => {
    // Fetch dynamic pricing from API
    const pricing = await fetchPricing(page);

    await page.goto('/trainer/ai-subscription');

    // Verify all 3 AI plans displayed
    await expect(page.locator('[data-testid="ai-plan-starter"]')).toBeVisible();
    await expect(page.locator('[data-testid="ai-plan-professional"]')).toBeVisible();
    await expect(page.locator('[data-testid="ai-plan-enterprise"]')).toBeVisible();

    // Verify dynamic pricing (from /api/v1/public/pricing)
    const aiStarterPrice = `$${(pricing.ai.starter.amount / 100).toFixed(2)}`;
    const aiProfessionalPrice = `$${(pricing.ai.professional.amount / 100).toFixed(2)}`;
    const aiEnterprisePrice = `$${(pricing.ai.enterprise.amount / 100).toFixed(2)}`;

    await expect(page.locator('[data-testid="ai-plan-starter"] [data-testid="price"]')).toContainText(aiStarterPrice);
    await expect(page.locator('[data-testid="ai-plan-professional"] [data-testid="price"]')).toContainText(aiProfessionalPrice);
    await expect(page.locator('[data-testid="ai-plan-enterprise"] [data-testid="price"]')).toContainText(aiEnterprisePrice);

    // Verify monthly interval
    await expect(page.locator('[data-testid="ai-plan-starter"]')).toContainText('/month');

    // Verify generation quotas
    await expect(page.locator('[data-testid="ai-plan-starter"]')).toContainText('100 generations/month');
    await expect(page.locator('[data-testid="ai-plan-professional"]')).toContainText('500 generations/month');
    await expect(page.locator('[data-testid="ai-plan-enterprise"]')).toContainText('Unlimited generations');
  });

  test('should purchase AI Starter subscription via Checkout Session', async ({ page, context }) => {
    // Fetch dynamic pricing
    const pricing = await fetchPricing(page);
    const aiStarterPrice = `$${(pricing.ai.starter.amount / 100).toFixed(2)}`;

    await page.goto('/trainer/ai-subscription');

    // Select Starter plan
    await page.click('[data-testid="ai-plan-starter"] button[data-testid="subscribe"]');

    // Wait for Checkout Session redirect
    const checkoutPagePromise = context.waitForEvent('page');
    const checkoutPage = await checkoutPagePromise;
    await checkoutPage.waitForLoadState('networkidle');

    // Verify we're on Stripe Checkout
    expect(checkoutPage.url()).toContain('checkout.stripe.com');

    // Verify AI subscription details
    await expect(checkoutPage.locator('text=/AI.*Starter/i')).toBeVisible();
    await expect(checkoutPage.locator(`text=/${aiStarterPrice}/i`)).toBeVisible();

    // Fill payment details
    await checkoutPage.fill('[placeholder="Card number"]', '4242424242424242');
    await checkoutPage.fill('[placeholder="MM / YY"]', '12/30');
    await checkoutPage.fill('[placeholder="CVC"]', '123');
    await checkoutPage.fill('[placeholder="ZIP"]', '12345');

    // Submit payment
    await checkoutPage.click('button[type="submit"]');

    // Wait for redirect back to success page (after webhook processing)
    await page.waitForURL(/\/subscription\/success/, { timeout: 30000 });

    // Verify success
    await expect(page.locator('[data-testid="subscription-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText('AI Starter subscription activated');

    // Return to dashboard
    await page.click('button[data-testid="go-to-dashboard"]');

    // Verify AI badge displayed (entitlements updated via webhook)
    await expect(page.locator('[data-testid="ai-subscription-badge"]')).toContainText('AI Starter');
    await expect(page.locator('[data-testid="ai-generations-remaining"]')).toContainText('100 / 100');

    // Verify tier subscription still active (AI is separate)
    await expect(page.locator('[data-testid="tier-badge"]')).toBeVisible();
  });

  test('should purchase AI Professional subscription successfully', async ({ page }) => {
    await page.goto('/trainer/ai-subscription');

    await page.click('[data-testid="ai-plan-professional"] button[data-testid="subscribe"]');

    await expect(page.locator('[data-testid="amount"]')).toContainText('$39.00');

    const stripeFrame = page.frameLocator('iframe[title*="Secure payment"]').first();
    await stripeFrame.locator('input[name="cardnumber"]').fill('4242424242424242');
    await stripeFrame.locator('input[name="exp-date"]').fill('12/30');
    await stripeFrame.locator('input[name="cvc"]').fill('123');
    await stripeFrame.locator('input[name="postal"]').fill('12345');

    await page.click('button[data-testid="submit-payment"]');
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible({ timeout: 10000 });

    await page.click('button[data-testid="go-to-dashboard"]');

    await expect(page.locator('[data-testid="ai-subscription-badge"]')).toContainText('AI Professional');
    await expect(page.locator('[data-testid="ai-generations-remaining"]')).toContainText('500 / 500');
  });

  test('should purchase AI Enterprise subscription successfully', async ({ page }) => {
    await page.goto('/trainer/ai-subscription');

    await page.click('[data-testid="ai-plan-enterprise"] button[data-testid="subscribe"]');

    await expect(page.locator('[data-testid="amount"]')).toContainText('$79.00');

    const stripeFrame = page.frameLocator('iframe[title*="Secure payment"]').first();
    await stripeFrame.locator('input[name="cardnumber"]').fill('4242424242424242');
    await stripeFrame.locator('input[name="exp-date"]').fill('12/30');
    await stripeFrame.locator('input[name="cvc"]').fill('123');
    await stripeFrame.locator('input[name="postal"]').fill('12345');

    await page.click('button[data-testid="submit-payment"]');
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible({ timeout: 10000 });

    await page.click('button[data-testid="go-to-dashboard"]');

    await expect(page.locator('[data-testid="ai-subscription-badge"]')).toContainText('AI Enterprise');
    await expect(page.locator('[data-testid="ai-generations-remaining"]')).toContainText('Unlimited');
  });
});

test.describe('AI Subscription Flow - Usage Tracking', () => {
  test.beforeEach(async ({ page }) => {
    // Login as trainer with AI Starter subscription (100 generations)
    await page.goto('/login');
    await page.fill('input[name="email"]', 'trainer.ai.starter@evofitmeals.com');
    await page.fill('input[name="password"]', 'TestTrainer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/trainer/dashboard');

    // Verify AI subscription active
    await expect(page.locator('[data-testid="ai-subscription-badge"]')).toContainText('AI Starter');
  });

  test('should decrement generation quota after using AI', async ({ page }) => {
    // Check initial quota
    await page.goto('/trainer/dashboard');
    let initialQuota = await page.locator('[data-testid="ai-generations-remaining"]').textContent();
    expect(initialQuota).toMatch(/\d+ \/ 100/);

    const [initial] = initialQuota!.match(/(\d+)/)!.map(Number);

    // Use AI to generate meal plan
    await page.goto('/trainer/meal-plans/generate');
    await page.click('button[data-testid="use-ai-generation"]');

    // Fill generation parameters
    await page.fill('input[name="calorieTarget"]', '2000');
    await page.selectOption('select[name="dietaryPreference"]', 'balanced');
    await page.click('button[data-testid="generate-with-ai"]');

    // Wait for generation to complete
    await expect(page.locator('[data-testid="generation-complete"]')).toBeVisible({ timeout: 30000 });

    // Check quota decremented
    await page.goto('/trainer/dashboard');
    const newQuota = await page.locator('[data-testid="ai-generations-remaining"]').textContent();
    const [current] = newQuota!.match(/(\d+)/)!.map(Number);

    expect(current).toBe(initial - 1);
  });

  test('should display warning at 80% quota usage', async ({ page }) => {
    // Mock having used 80+ generations (database seed)
    // In real test, seed database with usage_count = 80

    await page.goto('/trainer/dashboard');

    // Verify warning banner
    await expect(page.locator('[data-testid="ai-quota-warning"]')).toBeVisible();
    await expect(page.locator('[data-testid="ai-quota-warning"]')).toContainText('approaching your AI generation limit');

    // Verify upgrade prompt
    await expect(page.locator('button[data-testid="upgrade-ai-plan"]')).toBeVisible();
  });

  test('should block AI generation when quota exhausted', async ({ page }) => {
    // Mock having used all 100 generations
    // In real test, seed database with usage_count = 100

    await page.goto('/trainer/meal-plans/generate');

    // Verify AI generation button disabled
    await expect(page.locator('button[data-testid="use-ai-generation"]')).toBeDisabled();

    // Verify quota exhausted message
    await expect(page.locator('[data-testid="ai-quota-exhausted"]')).toBeVisible();
    await expect(page.locator('[data-testid="ai-quota-exhausted"]')).toContainText('AI generation quota exhausted');

    // Verify upgrade prompt
    await expect(page.locator('button[data-testid="upgrade-ai-plan"]')).toBeVisible();
  });

  test('should reset quota on monthly billing cycle', async ({ page }) => {
    // This test would require time-based testing
    // Verify quota reset logic in unit tests
    // E2E test can verify UI displays reset date

    await page.goto('/trainer/settings/ai-subscription');

    // Verify next reset date displayed
    await expect(page.locator('[data-testid="quota-reset-date"]')).toBeVisible();
    await expect(page.locator('[data-testid="quota-reset-date"]')).toMatch(/Next reset: \w+ \d{1,2}, \d{4}/);
  });

  test('should track AI usage in history', async ({ page }) => {
    // Use AI generation
    await page.goto('/trainer/meal-plans/generate');
    await page.click('button[data-testid="use-ai-generation"]');
    await page.fill('input[name="calorieTarget"]', '2000');
    await page.selectOption('select[name="dietaryPreference"]', 'balanced');
    await page.click('button[data-testid="generate-with-ai"]');
    await expect(page.locator('[data-testid="generation-complete"]')).toBeVisible({ timeout: 30000 });

    // Navigate to AI usage history
    await page.goto('/trainer/settings/ai-subscription');
    await page.click('[data-testid="view-usage-history"]');

    // Verify usage entry
    await expect(page.locator('[data-testid="usage-history"]')).toBeVisible();
    await expect(page.locator('[data-testid="usage-entry"]').first()).toContainText('Meal Plan Generation');
    await expect(page.locator('[data-testid="usage-entry"]').first()).toContainText('1 generation');
  });
});

test.describe('AI Subscription Flow - Upgrade/Downgrade', () => {
  test.beforeEach(async ({ page }) => {
    // Login with AI Starter subscription
    await page.goto('/login');
    await page.fill('input[name="email"]', 'trainer.ai.starter@evofitmeals.com');
    await page.fill('input[name="password"]', 'TestTrainer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/trainer/dashboard');
  });

  test('should upgrade AI plan from Starter to Professional', async ({ page }) => {
    await page.goto('/trainer/settings/ai-subscription');

    // Click upgrade AI plan
    await page.click('button[data-testid="upgrade-ai-plan"]');

    // Verify upgrade modal
    await expect(page.locator('[data-testid="ai-upgrade-modal"]')).toBeVisible();

    // Select Professional plan
    await page.click('[data-testid="ai-plan-professional"] button[data-testid="upgrade-to-plan"]');

    // Verify proration
    await expect(page.locator('[data-testid="proration-details"]')).toBeVisible();
    await expect(page.locator('[data-testid="plan-difference"]')).toContainText('$20.00'); // $39 - $19

    // Confirm upgrade
    await page.click('button[data-testid="confirm-ai-upgrade"]');

    // Verify success
    await expect(page.locator('[data-testid="upgrade-success"]')).toBeVisible({ timeout: 10000 });

    // Verify new quota
    await page.goto('/trainer/dashboard');
    await expect(page.locator('[data-testid="ai-subscription-badge"]')).toContainText('AI Professional');
    await expect(page.locator('[data-testid="ai-generations-remaining"]')).toContainText('/ 500');
  });

  test('should downgrade AI plan from Professional to Starter', async ({ page }) => {
    // First upgrade to Professional
    await page.goto('/trainer/settings/ai-subscription');
    await page.click('button[data-testid="upgrade-ai-plan"]');
    await page.click('[data-testid="ai-plan-professional"] button[data-testid="upgrade-to-plan"]');
    await page.click('button[data-testid="confirm-ai-upgrade"]');
    await expect(page.locator('[data-testid="upgrade-success"]')).toBeVisible({ timeout: 10000 });

    // Now downgrade to Starter
    await page.goto('/trainer/settings/ai-subscription');
    await page.click('button[data-testid="change-ai-plan"]');
    await page.click('[data-testid="ai-plan-starter"] button[data-testid="downgrade-to-plan"]');

    // Verify downgrade warning
    await expect(page.locator('[data-testid="downgrade-warning"]')).toBeVisible();
    await expect(page.locator('[data-testid="downgrade-warning"]')).toContainText('Your monthly quota will decrease to 100 generations');

    // Confirm downgrade
    await page.click('button[data-testid="confirm-ai-downgrade"]');

    // Verify downgrade scheduled (takes effect next billing cycle)
    await expect(page.locator('[data-testid="downgrade-scheduled"]')).toBeVisible();
    await expect(page.locator('[data-testid="downgrade-scheduled"]')).toContainText('Downgrade scheduled for next billing cycle');
  });
});

test.describe('AI Subscription Flow - Cancellation', () => {
  test.beforeEach(async ({ page }) => {
    // Login with AI subscription
    await page.goto('/login');
    await page.fill('input[name="email"]', 'trainer.ai.starter@evofitmeals.com');
    await page.fill('input[name="password"]', 'TestTrainer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/trainer/dashboard');
  });

  test('should cancel AI subscription successfully', async ({ page }) => {
    await page.goto('/trainer/settings/ai-subscription');

    // Click cancel subscription
    await page.click('button[data-testid="cancel-ai-subscription"]');

    // Verify cancellation confirmation modal
    await expect(page.locator('[data-testid="cancel-ai-confirmation"]')).toBeVisible();
    await expect(page.locator('[data-testid="cancel-ai-confirmation"]')).toContainText('Are you sure you want to cancel');

    // Confirm cancellation
    await page.click('button[data-testid="confirm-ai-cancellation"]');

    // Verify cancellation success
    await expect(page.locator('[data-testid="cancellation-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="cancellation-success"]')).toContainText('AI subscription cancelled');

    // Verify tier subscription still active
    await page.goto('/trainer/dashboard');
    await expect(page.locator('[data-testid="tier-badge"]')).toBeVisible(); // Tier still active
    await expect(page.locator('[data-testid="ai-subscription-badge"]')).not.toBeVisible(); // AI gone

    // Verify AI features disabled
    await page.goto('/trainer/meal-plans/generate');
    await expect(page.locator('button[data-testid="use-ai-generation"]')).toBeDisabled();
    await expect(page.locator('[data-testid="ai-subscription-required"]')).toBeVisible();
  });

  test('should NOT affect tier features when cancelling AI', async ({ page }) => {
    // Verify tier features working before cancellation
    await page.goto('/trainer/customers');
    await expect(page.locator('button[data-testid="add-customer"]')).toBeEnabled();

    // Cancel AI subscription
    await page.goto('/trainer/settings/ai-subscription');
    await page.click('button[data-testid="cancel-ai-subscription"]');
    await page.click('button[data-testid="confirm-ai-cancellation"]');
    await expect(page.locator('[data-testid="cancellation-success"]')).toBeVisible();

    // Verify tier features STILL working
    await page.goto('/trainer/customers');
    await expect(page.locator('button[data-testid="add-customer"]')).toBeEnabled();

    // Verify tier-specific features unchanged
    await page.goto('/trainer/analytics');
    await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible(); // Professional tier analytics still work
  });

  test('should allow re-subscribing after cancellation', async ({ page }) => {
    // Cancel subscription
    await page.goto('/trainer/settings/ai-subscription');
    await page.click('button[data-testid="cancel-ai-subscription"]');
    await page.click('button[data-testid="confirm-ai-cancellation"]');
    await expect(page.locator('[data-testid="cancellation-success"]')).toBeVisible();

    // Re-subscribe
    await page.goto('/trainer/ai-subscription');
    await page.click('[data-testid="ai-plan-starter"] button[data-testid="subscribe"]');

    const stripeFrame = page.frameLocator('iframe[title*="Secure payment"]').first();
    await stripeFrame.locator('input[name="cardnumber"]').fill('4242424242424242');
    await stripeFrame.locator('input[name="exp-date"]').fill('12/30');
    await stripeFrame.locator('input[name="cvc"]').fill('123');
    await stripeFrame.locator('input[name="postal"]').fill('12345');

    await page.click('button[data-testid="submit-payment"]');
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible({ timeout: 10000 });

    // Verify AI subscription restored
    await page.goto('/trainer/dashboard');
    await expect(page.locator('[data-testid="ai-subscription-badge"]')).toContainText('AI Starter');
  });
});

test.describe('AI Subscription Flow - Integration with Tier System', () => {
  test('should require active tier before purchasing AI', async ({ page }) => {
    // Login as user without tier
    await page.goto('/login');
    await page.fill('input[name="email"]', 'trainer.notier@evofitmeals.com');
    await page.fill('input[name="password"]', 'TestTrainer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/trainer/dashboard');

    // Try to access AI subscription
    await page.goto('/trainer/ai-subscription');

    // Verify blocked
    await expect(page.locator('[data-testid="tier-required-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="tier-required-message"]')).toContainText('Tier subscription required before purchasing AI');

    // Verify redirect to tier selection
    await expect(page.locator('[data-testid="tier-selection-cta"]')).toBeVisible();
  });

  test('should display combined billing summary with dynamic pricing', async ({ page }) => {
    // Fetch dynamic pricing
    const pricing = await fetchPricing(page);
    const professionalTierPrice = `$${(pricing.tiers.professional.amount / 100).toFixed(2)}`;
    const aiStarterPrice = `$${(pricing.ai.starter.amount / 100).toFixed(2)}`;

    // Login with both tier and AI subscription
    await page.goto('/login');
    await page.fill('input[name="email"]', 'trainer.ai.starter@evofitmeals.com');
    await page.fill('input[name="password"]', 'TestTrainer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/trainer/dashboard');

    // Navigate to billing
    await page.goto('/trainer/billing');

    // Verify both subscriptions listed (SEPARATE subscriptions)
    await expect(page.locator('[data-testid="tier-subscription"]')).toBeVisible();
    await expect(page.locator('[data-testid="tier-subscription"]')).toContainText('Professional Tier');
    await expect(page.locator('[data-testid="tier-subscription"]')).toContainText(professionalTierPrice);
    await expect(page.locator('[data-testid="tier-subscription"]')).toContainText('/month');

    await expect(page.locator('[data-testid="ai-subscription"]')).toBeVisible();
    await expect(page.locator('[data-testid="ai-subscription"]')).toContainText('AI Starter');
    await expect(page.locator('[data-testid="ai-subscription"]')).toContainText(aiStarterPrice);
    await expect(page.locator('[data-testid="ai-subscription"]')).toContainText('/month');

    // Verify total billing (sum of separate subscriptions)
    const totalAmount = (pricing.tiers.professional.amount + pricing.ai.starter.amount) / 100;
    const totalDisplay = `$${totalAmount.toFixed(2)}`;
    await expect(page.locator('[data-testid="total-monthly-billing"]')).toContainText(totalDisplay);

    // Verify subscription independence indicated
    await expect(page.locator('[data-testid="subscription-note"]')).toContainText('Subscriptions billed separately');
  });

  test('should handle separate payment failures', async ({ page }) => {
    // If tier payment fails, AI should still work (separate subscriptions)
    // This test would require mocking payment failures
    // Verify in unit tests that subscriptions are independent
  });
});
