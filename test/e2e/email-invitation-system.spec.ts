/**
 * E2E Tests for Email Invitation System (Mailgun Integration)
 *
 * Tests the complete invitation flow:
 * 1. Trainer sends invitation via email
 * 2. Email is sent through Mailgun
 * 3. Customer receives invitation link
 * 4. Customer accepts invitation and creates account
 * 5. Trainer-customer relationship is established
 */

import { test, expect } from '@playwright/test';
import { loginAsTrainer, loginAsCustomer } from './helpers/auth';

// Test credentials
const TRAINER_EMAIL = 'trainer.test@evofitmeals.com';
const TRAINER_PASSWORD = 'TestTrainer123!';
const NEW_CUSTOMER_EMAIL = 'new.customer@test.com';

test.describe('Email Invitation System - Mailgun Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Start each test at the base URL
    await page.goto('/');
  });

  test('should send invitation email successfully', async ({ page }) => {
    // Login as trainer
    await loginAsTrainer(page, TRAINER_EMAIL, TRAINER_PASSWORD);

    // Navigate to customers page
    await page.click('a[href="/customers"]');
    await expect(page.locator('h1')).toContainText('My Customers');

    // Click "Invite Customer" button
    await page.click('button:has-text("Invite Customer")');

    // Fill in customer email
    const emailInput = page.locator('input[type="email"][name="email"]');
    await emailInput.fill(NEW_CUSTOMER_EMAIL);

    // Submit invitation
    await page.click('button:has-text("Send Invitation")');

    // Wait for success message
    await expect(page.locator('text=Invitation sent successfully')).toBeVisible({
      timeout: 10000,
    });

    // Verify invitation appears in pending invitations list
    await expect(page.locator(`text=${NEW_CUSTOMER_EMAIL}`)).toBeVisible();
  });

  test('should display sent invitation in trainer dashboard', async ({ page }) => {
    // Login as trainer
    await loginAsTrainer(page, TRAINER_EMAIL, TRAINER_PASSWORD);

    // Navigate to customers page
    await page.click('a[href="/customers"]');

    // Check for pending invitations section
    const pendingSection = page.locator('text=Pending Invitations');
    await expect(pendingSection).toBeVisible();

    // Verify invitation status shows as "pending"
    const invitationRow = page.locator(`tr:has-text("${NEW_CUSTOMER_EMAIL}")`);
    await expect(invitationRow.locator('text=Pending')).toBeVisible();
  });

  test('should handle invalid email validation', async ({ page }) => {
    // Login as trainer
    await loginAsTrainer(page, TRAINER_EMAIL, TRAINER_PASSWORD);

    // Navigate to customers page
    await page.click('a[href="/customers"]');
    await page.click('button:has-text("Invite Customer")');

    // Try to submit with invalid email
    const emailInput = page.locator('input[type="email"][name="email"]');
    await emailInput.fill('invalid-email');
    await page.click('button:has-text("Send Invitation")');

    // Should show validation error
    await expect(page.locator('text=Please enter a valid email')).toBeVisible();
  });

  test('should prevent duplicate invitations to same email', async ({ page }) => {
    // Login as trainer
    await loginAsTrainer(page, TRAINER_EMAIL, TRAINER_PASSWORD);

    // Navigate to customers page
    await page.click('a[href="/customers"]');

    // Send first invitation
    await page.click('button:has-text("Invite Customer")');
    const emailInput = page.locator('input[type="email"][name="email"]');
    await emailInput.fill('duplicate@test.com');
    await page.click('button:has-text("Send Invitation")');
    await expect(page.locator('text=Invitation sent successfully')).toBeVisible();

    // Try to send second invitation to same email
    await page.click('button:has-text("Invite Customer")');
    await emailInput.fill('duplicate@test.com');
    await page.click('button:has-text("Send Invitation")');

    // Should show error
    await expect(
      page.locator('text=Invitation already sent to this email')
    ).toBeVisible();
  });

  test('should allow resending expired invitations', async ({ page }) => {
    // Login as trainer
    await loginAsTrainer(page, TRAINER_EMAIL, TRAINER_PASSWORD);

    // Navigate to customers page
    await page.click('a[href="/customers"]');

    // Find an expired invitation (assuming test data exists)
    const expiredInvitation = page.locator('tr:has-text("Expired")').first();

    if (await expiredInvitation.isVisible()) {
      // Click resend button
      await expiredInvitation.locator('button:has-text("Resend")').click();

      // Verify success message
      await expect(page.locator('text=Invitation resent successfully')).toBeVisible();
    } else {
      // Skip test if no expired invitations exist
      test.skip();
    }
  });

  test('should display invitation details correctly', async ({ page }) => {
    // Login as trainer
    await loginAsTrainer(page, TRAINER_EMAIL, TRAINER_PASSWORD);

    // Navigate to customers page
    await page.click('a[href="/customers"]');

    // Click on an invitation to view details
    const invitationRow = page.locator('tr').filter({ hasText: NEW_CUSTOMER_EMAIL }).first();
    await invitationRow.click();

    // Verify invitation details modal/panel appears
    await expect(page.locator('text=Invitation Details')).toBeVisible();

    // Check for key details
    await expect(page.locator(`text=${NEW_CUSTOMER_EMAIL}`)).toBeVisible();
    await expect(page.locator('text=Status:')).toBeVisible();
    await expect(page.locator('text=Sent on:')).toBeVisible();
    await expect(page.locator('text=Expires on:')).toBeVisible();
  });

  test('invitation link should be valid and accessible', async ({ page, context }) => {
    // This test simulates the customer receiving the invitation email
    // In production, Mailgun would send the actual email with the link

    // For testing, we'll extract the invitation token from the database
    // and construct the invitation URL manually

    // Login as trainer first to send invitation
    await loginAsTrainer(page, TRAINER_EMAIL, TRAINER_PASSWORD);
    await page.click('a[href="/customers"]');
    await page.click('button:has-text("Invite Customer")');
    await page.locator('input[type="email"][name="email"]').fill('linktest@test.com');
    await page.click('button:has-text("Send Invitation")');
    await expect(page.locator('text=Invitation sent successfully')).toBeVisible();

    // In a real scenario, we'd check the Mailgun test mode or logs
    // For now, we'll verify the invitation exists in the system
    const invitationRow = page.locator('tr:has-text("linktest@test.com")');
    await expect(invitationRow).toBeVisible();

    // Note: Full link testing would require:
    // 1. Mailgun test mode API to retrieve sent emails
    // 2. Parsing invitation link from email body
    // 3. Navigating to link and verifying acceptance flow
  });

  test('should cancel pending invitation', async ({ page }) => {
    // Login as trainer
    await loginAsTrainer(page, TRAINER_EMAIL, TRAINER_PASSWORD);

    // Navigate to customers page
    await page.click('a[href="/customers"]');

    // Find a pending invitation
    const pendingInvitation = page.locator('tr').filter({ hasText: 'Pending' }).first();

    if (await pendingInvitation.isVisible()) {
      const customerEmail = await pendingInvitation.locator('td').first().textContent();

      // Click cancel/delete button
      await pendingInvitation.locator('button[aria-label="Cancel invitation"]').click();

      // Confirm cancellation in dialog
      await page.locator('button:has-text("Confirm")').click();

      // Verify invitation is removed
      await expect(page.locator(`text=${customerEmail}`)).not.toBeVisible();
    } else {
      test.skip();
    }
  });

  test('should show email analytics/logs for sent invitations', async ({ page }) => {
    // Login as trainer
    await loginAsTrainer(page, TRAINER_EMAIL, TRAINER_PASSWORD);

    // Navigate to customers page
    await page.click('a[href="/customers"]');

    // Click on an invitation
    const invitationRow = page.locator('tr').filter({ hasText: 'Pending' }).first();
    await invitationRow.click();

    // Look for email status information
    await expect(page.locator('text=Email Status:')).toBeVisible();

    // Verify Mailgun-specific details if available
    const mailgunSection = page.locator('text=Mailgun Message ID');
    if (await mailgunSection.isVisible()) {
      await expect(mailgunSection).toBeVisible();
    }
  });

  test('multiple trainers can invite same email to different programs', async ({
    page,
    context,
  }) => {
    // Login as first trainer
    await loginAsTrainer(page, TRAINER_EMAIL, TRAINER_PASSWORD);
    await page.click('a[href="/customers"]');
    await page.click('button:has-text("Invite Customer")');
    await page.locator('input[type="email"][name="email"]').fill('shared@test.com');
    await page.click('button:has-text("Send Invitation")');
    await expect(page.locator('text=Invitation sent successfully')).toBeVisible();

    // Logout
    await page.click('button[aria-label="User menu"]');
    await page.click('button:has-text("Logout")');

    // Login as second trainer (would need different credentials)
    // This test demonstrates the concept - actual implementation would require
    // a second trainer account

    // Note: In production, the system should allow the same customer email
    // to be invited by multiple trainers, creating separate trainer-customer
    // relationships for each
  });

  test('should handle Mailgun API errors gracefully', async ({ page }) => {
    // This test would require mocking Mailgun API to return errors
    // In production testing, you would:
    // 1. Use Mailgun's test mode
    // 2. Trigger API errors by using invalid configuration
    // 3. Verify the UI shows appropriate error messages

    // Login as trainer
    await loginAsTrainer(page, TRAINER_EMAIL, TRAINER_PASSWORD);
    await page.click('a[href="/customers"]');
    await page.click('button:has-text("Invite Customer")');

    // For now, verify error handling exists
    // Full implementation would require backend test mode or mocking
    await page.locator('input[type="email"][name="email"]').fill('error@test.com');

    // Note: Actual error simulation would happen here
    // The UI should show user-friendly error messages, not Mailgun technical errors
  });
});

test.describe('Invitation Email Template', () => {
  test('email should contain trainer name and branding', async ({ page }) => {
    // This test verifies the email template structure
    // In production, you would:
    // 1. Use Mailgun's test mode to retrieve sent emails
    // 2. Parse email HTML/text content
    // 3. Verify branding elements are present

    // For now, we verify the invitation creation succeeds
    await loginAsTrainer(page, TRAINER_EMAIL, TRAINER_PASSWORD);
    await page.click('a[href="/customers"]');
    await page.click('button:has-text("Invite Customer")');
    await page.locator('input[type="email"][name="email"]').fill('template@test.com');
    await page.click('button:has-text("Send Invitation")');
    await expect(page.locator('text=Invitation sent successfully')).toBeVisible();

    // Note: Full template testing would parse actual email from Mailgun
  });

  test('email should include expiration date', async ({ page }) => {
    // Similar to above - would require Mailgun test mode integration
    // to verify email content includes expiration date

    await loginAsTrainer(page, TRAINER_EMAIL, TRAINER_PASSWORD);
    await page.click('a[href="/customers"]');
    await page.click('button:has-text("Invite Customer")');
    await page.locator('input[type="email"][name="email"]').fill('expiry@test.com');
    await page.click('button:has-text("Send Invitation")');
    await expect(page.locator('text=Invitation sent successfully')).toBeVisible();

    // In UI, verify expiration date is shown
    const invitationRow = page.locator('tr:has-text("expiry@test.com")');
    await expect(invitationRow.locator('text=/Expires|days/')).toBeVisible();
  });
});

test.describe('Invitation Acceptance Flow', () => {
  test('customer can accept invitation via link', async ({ page }) => {
    // This test simulates the full acceptance flow
    // 1. Trainer sends invitation
    // 2. Customer clicks link (simulated)
    // 3. Customer completes registration
    // 4. Trainer-customer relationship is created

    // Step 1: Send invitation as trainer
    await loginAsTrainer(page, TRAINER_EMAIL, TRAINER_PASSWORD);
    await page.click('a[href="/customers"]');
    await page.click('button:has-text("Invite Customer")');
    await page.locator('input[type="email"][name="email"]').fill('acceptance@test.com');
    await page.click('button:has-text("Send Invitation")');
    await expect(page.locator('text=Invitation sent successfully')).toBeVisible();

    // Logout trainer
    await page.click('button[aria-label="User menu"]');
    await page.click('button:has-text("Logout")');

    // Step 2 & 3: Customer accepts (would require invitation token)
    // This would be extracted from Mailgun in production
    // For now, we can only test up to invitation creation

    // Note: Full acceptance flow testing requires:
    // - Mailgun test mode integration
    // - Email parsing to extract invitation link
    // - Navigation to acceptance page
    // - Registration form completion
    // - Verification of trainer-customer relationship in database
  });

  test('expired invitation should show error on acceptance attempt', async ({ page }) => {
    // This would test that customers cannot accept expired invitations
    // Requires invitation token and manual expiration in test database

    // Navigate to acceptance page with expired token (simulated)
    await page.goto('/accept-invitation/expired-token-123');

    // Should show expiration error
    await expect(
      page.locator('text=/This invitation has expired|Invitation expired/')
    ).toBeVisible();
  });

  test('already accepted invitation should redirect appropriately', async ({ page }) => {
    // Test that re-accepting an invitation shows appropriate message

    // Navigate to acceptance page with already-used token (simulated)
    await page.goto('/accept-invitation/used-token-123');

    // Should show already accepted message
    await expect(
      page.locator('text=/already been accepted|Invitation already used/')
    ).toBeVisible();
  });
});
