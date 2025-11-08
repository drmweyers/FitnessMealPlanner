/**
 * E2E Tests: Tier Purchase Flow
 *
 * Tests complete user journey from tier selection to Stripe payment.
 * Part of BMAD 3-Tier System Test Suite
 */

import { test, expect } from '@playwright/test';

test.describe.skip('Tier Purchase Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as trainer without tier
    await page.goto('http://localhost:4000');
    await page.fill('[name="email"]', 'trainer.no-tier@test.com');
    await page.fill('[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/home');
  });

  test('should display tier selection modal on first login', async ({ page }) => {
    await expect(page.locator('[data-testid="tier-selection-modal"]')).toBeVisible();
    await expect(page.locator('text=Choose Your Tier')).toBeVisible();
  });

  test('should display all three tiers with correct pricing', async ({ page }) => {
    await expect(page.locator('[data-testid="starter-tier"]')).toBeVisible();
    await expect(page.locator('[data-testid="professional-tier"]')).toBeVisible();
    await expect(page.locator('[data-testid="enterprise-tier"]')).toBeVisible();

    await expect(page.locator('text=$199')).toBeVisible();
    await expect(page.locator('text=$299')).toBeVisible();
    await expect(page.locator('text=$399')).toBeVisible();
  });

  test('should display lifetime access badge', async ({ page }) => {
    await expect(page.locator('text=One-time payment. Lifetime access.')).toBeVisible();
  });

  test('should display 30-day money-back guarantee', async ({ page }) => {
    await expect(page.locator('text=30-day money-back guarantee')).toBeVisible();
  });

  test('should redirect to Stripe Checkout for Starter tier', async ({ page }) => {
    await page.click('[data-testid="starter-tier-purchase-button"]');
    
    // Wait for Stripe redirect
    await page.waitForURL('**/checkout.stripe.com/**', { timeout: 10000 });
    
    // Verify we're on Stripe Checkout
    expect(page.url()).toContain('checkout.stripe.com');
  });

  test('should redirect to Stripe Checkout for Professional tier', async ({ page }) => {
    await page.click('[data-testid="professional-tier-purchase-button"]');
    await page.waitForURL('**/checkout.stripe.com/**', { timeout: 10000 });
    expect(page.url()).toContain('checkout.stripe.com');
  });

  test('should redirect to Stripe Checkout for Enterprise tier', async ({ page }) => {
    await page.click('[data-testid="enterprise-tier-purchase-button"]');
    await page.waitForURL('**/checkout.stripe.com/**', { timeout: 10000 });
    expect(page.url()).toContain('checkout.stripe.com');
  });

  test('should show loading state during Stripe redirect', async ({ page }) => {
    page.click('[data-testid="starter-tier-purchase-button"]');
    
    // Check for loading state before redirect
    await expect(page.locator('[data-testid="purchase-loading"]')).toBeVisible();
  });

  test('should display feature comparison correctly', async ({ page }) => {
    // Starter tier features
    await expect(page.locator('[data-testid="starter-customers"]')).toContainText('9');
    await expect(page.locator('[data-testid="starter-meal-plans"]')).toContainText('50');
    await expect(page.locator('[data-testid="starter-recipes"]')).toContainText('1,000');
    
    // Professional tier features
    await expect(page.locator('[data-testid="professional-customers"]')).toContainText('20');
    await expect(page.locator('[data-testid="professional-meal-plans"]')).toContainText('200');
    await expect(page.locator('[data-testid="professional-recipes"]')).toContainText('2,500');
    
    // Enterprise tier features
    await expect(page.locator('[data-testid="enterprise-customers"]')).toContainText('50');
    await expect(page.locator('[data-testid="enterprise-meal-plans"]')).toContainText('500');
    await expect(page.locator('[data-testid="enterprise-recipes"]')).toContainText('4,000');
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/v1/tiers/purchase', route => {
      route.fulfill({ status: 500, body: 'Server error' });
    });

    await page.click('[data-testid="starter-tier-purchase-button"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="purchase-error"]')).toBeVisible();
    await expect(page.locator('text=Unable to process purchase')).toBeVisible();
  });

  test('should close modal and allow dismissal', async ({ page }) => {
    await page.click('[data-testid="tier-modal-close"]');
    await expect(page.locator('[data-testid="tier-selection-modal"]')).not.toBeVisible();
  });
});

test.describe.skip('Successful Purchase Verification', () => {
  test('should grant tier access after successful payment', async ({ page }) => {
    // This test would require Stripe test mode payment completion
    // Simulate successful payment callback
    await page.goto('http://localhost:4000/tier-purchase-success?session_id=test_session_123');
    
    await expect(page.locator('text=Purchase successful!')).toBeVisible();
    await expect(page.locator('text=You now have access to')).toBeVisible();
  });

  test('should show tier badge after purchase', async ({ page }) => {
    // Login as trainer with Starter tier
    await page.goto('http://localhost:4000');
    await page.fill('[name="email"]', 'trainer.starter@test.com');
    await page.fill('[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('[data-testid="tier-badge"]')).toContainText('Starter');
  });

  test('should display usage limits after purchase', async ({ page }) => {
    // Login as trainer with tier
    await page.goto('http://localhost:4000');
    await page.fill('[name="email"]', 'trainer.starter@test.com');
    await page.fill('[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('[data-testid="usage-indicator"]')).toBeVisible();
    await expect(page.locator('text=Customers: 0/9')).toBeVisible();
    await expect(page.locator('text=Meal Plans: 0/50')).toBeVisible();
  });
});
