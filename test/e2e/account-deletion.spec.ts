import { test, expect } from '@playwright/test';
import { db } from '../../server/db';
import { users, personalizedMealPlans, groceryLists, progressPhotos } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

test.describe('Account Deletion - E2E Workflows', () => {
  const baseURL = 'http://localhost:4000';
  const testCustomer = {
    email: 'delete-test@example.com',
    password: 'DeleteTest123!',
    role: 'customer' as const,
  };

  let testUserId: number;
  let testTrainerId: number;

  test.beforeEach(async () => {
    // Create test trainer account
    const trainerPassword = await bcrypt.hash('TrainerPass123!', 10);
    const [trainer] = await db.insert(users).values({
      email: 'test-trainer@example.com',
      password: trainerPassword,
      role: 'trainer',
    }).returning();

    testTrainerId = trainer.id;

    // Create test customer account
    const hashedPassword = await bcrypt.hash(testCustomer.password, 10);
    const [user] = await db.insert(users).values({
      email: testCustomer.email,
      password: hashedPassword,
      role: testCustomer.role,
    }).returning();

    testUserId = user.id;

    // Add some test data for cascade delete verification
    await db.insert(personalizedMealPlans).values({
      customerId: testUserId,
      trainerId: testTrainerId,
      mealPlanData: { planName: 'Test Plan', meals: [] },
    });

    // Note: Skipping progressMeasurements insert due to schema mismatch between DB and TypeScript
    // Database has snake_case columns (chest_cm), schema has camelCase (chestCm)
    // This needs a proper migration but doesn't block account deletion testing

    // Note: customerGoals table removed from schema (stub export only)
    // Tests will verify cascade deletion with personalizedMealPlans instead
  });

  test.afterEach(async () => {
    // Cleanup: Delete test users if still exist (in case test failed)
    try {
      await db.delete(users).where(eq(users.email, testCustomer.email));
      await db.delete(users).where(eq(users.email, 'test-trainer@example.com'));
    } catch (error) {
      // Users already deleted (expected for successful tests)
    }
  });

  test('E2E-1: Complete deletion workflow (happy path)', async ({ page }) => {
    // 1. Login as customer
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', testCustomer.email);
    await page.fill('input[type="password"]', testCustomer.password);
    await page.click('button[type="submit"]');

    // Wait for redirect to customer dashboard
    await page.waitForURL(`${baseURL}/customer`);

    // 2. Navigate to Profile tab
    const profileButton = page.locator('button[value="profile"], button:has-text("Profile")').first();
    await expect(profileButton).toBeVisible({ timeout: 5000 });
    await profileButton.click();
    await page.waitForTimeout(2000);

    // Wait for profile tab content (Danger Zone section is always visible)
    const dangerZone = page.locator('text="Danger Zone"').first();
    await expect(dangerZone).toBeVisible({ timeout: 5000 });

    // 3. Click Delete Account button
    const deleteAccountButton = page.locator('button:has-text("Delete My Account"), button:has-text("Delete Account")').first();
    await expect(deleteAccountButton).toBeVisible();
    await deleteAccountButton.click();
    await page.waitForTimeout(500);

    // Wait for confirmation dialog
    const dialogTitle = page.locator('text=Are you absolutely sure?, h2:has-text("Are you absolutely sure")').first();
    await expect(dialogTitle).toBeVisible({ timeout: 3000 });

    // 4. Enter password
    await page.fill('input[type="password"][placeholder*="password"], input#delete-password', testCustomer.password);

    // 5. Check confirmation checkbox
    const confirmLabel = page.locator('label:has-text("I understand"), label[for="confirm-delete"]').first();
    await confirmLabel.click();
    await page.waitForTimeout(300);

    // 6. Click final Delete Account button
    const finalDeleteButton = page.locator('button:has-text("Delete Account"):not([aria-label])').last();
    await expect(finalDeleteButton).toBeEnabled();
    await finalDeleteButton.click();

    // 7. Wait for success toast
    await expect(page.locator('text=Account Deleted, [role="status"]:has-text("Account Deleted")')).toBeVisible({ timeout: 5000 });

    // 8. Should be redirected to login
    await page.waitForURL(`${baseURL}/login`, { timeout: 10000 });

    // 9. Verify user is deleted from database
    const foundUsers = await db.select().from(users).where(eq(users.email, testCustomer.email));
    expect(foundUsers.length).toBe(0);

    // 10. Verify cascade deletes worked
    const mealPlans = await db.select().from(personalizedMealPlans).where(eq(personalizedMealPlans.customerId, testUserId));
    expect(mealPlans.length).toBe(0);

    // Note: customerGoals table removed from schema, verifying with personalizedMealPlans instead
  });

  test('E2E-2: Deletion with password re-authentication', async ({ page }) => {
    // 1. Login
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', testCustomer.email);
    await page.fill('input[type="password"]', testCustomer.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${baseURL}/customer`);

    // 2. Navigate to Profile tab
    const profileButton = page.locator('button[value="profile"], button:has-text("Profile")').first();
    await profileButton.click();
    await page.waitForTimeout(1000);
    await expect(page.locator('text="Danger Zone"').first()).toBeVisible({ timeout: 5000 });

    // 3. Click Delete Account button
    const deleteAccountButton = page.locator('button:has-text("Delete My Account")').first();
    await deleteAccountButton.click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=Are you absolutely sure?').first()).toBeVisible({ timeout: 3000 });

    // 4. Try with wrong password first
    await page.fill('input[type="password"][placeholder*="password"], input#delete-password', 'WrongPassword123!');
    await page.locator('label:has-text("I understand")').first().click();
    await page.waitForTimeout(300);
    await page.locator('button:has-text("Delete Account"):not([aria-label])').last().click();

    // Should show error
    await expect(page.locator('text=Invalid password, text=incorrect').first()).toBeVisible({ timeout: 3000 });

    // 5. Try again with correct password
    await page.fill('input[type="password"][placeholder*="password"], input#delete-password', testCustomer.password);
    await page.locator('button:has-text("Delete Account"):not([aria-label])').last().click();

    // Should succeed
    await expect(page.locator('text=Account Deleted').first()).toBeVisible({ timeout: 5000 });
    await page.waitForURL(`${baseURL}/login`, { timeout: 10000 });
  });

  test('E2E-3: Deletion cancellation', async ({ page }) => {
    // 1. Login
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', testCustomer.email);
    await page.fill('input[type="password"]', testCustomer.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${baseURL}/customer`);

    // 2. Navigate to Profile tab
    const profileButton = page.locator('button[value="profile"], button:has-text("Profile")').first();
    await profileButton.click();
    await page.waitForTimeout(1000);
    await expect(page.locator('text="Danger Zone"').first()).toBeVisible({ timeout: 5000 });

    // 3. Click Delete Account button
    await page.locator('button:has-text("Delete My Account")').first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=Are you absolutely sure?').first()).toBeVisible({ timeout: 3000 });

    // 4. Enter password and check confirmation
    await page.fill('input[type="password"][placeholder*="password"], input#delete-password', testCustomer.password);
    await page.locator('label:has-text("I understand")').first().click();
    await page.waitForTimeout(300);

    // 5. Click Cancel instead of Delete
    const cancelButton = page.locator('button:has-text("Cancel")').first();
    await cancelButton.click();
    await page.waitForTimeout(500);

    // 6. Dialog should close
    await expect(page.locator('text=Are you absolutely sure?')).not.toBeVisible({ timeout: 3000 });

    // 7. Still on customer page
    expect(page.url()).toContain('/customer');

    // 8. User should still exist in database
    const foundUsers = await db.select().from(users).where(eq(users.email, testCustomer.email));
    expect(foundUsers.length).toBe(1);
  });

  test('E2E-4: Unauthorized deletion attempt (non-customer)', async ({ page, context }) => {
    // Note: This test validates that only customers can access the delete account feature
    // Trainers and admins should not see the Profile tab or delete button

    // Create a trainer account
    const trainerPassword = await bcrypt.hash('TrainerTest123!', 10);
    const [trainer] = await db.insert(users).values({
      email: 'trainer-test@example.com',
      password: trainerPassword,
      role: 'trainer',
    }).returning();

    // 1. Login as trainer
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', 'trainer-test@example.com');
    await page.fill('input[type="password"]', 'TrainerTest123!');
    await page.click('button[type="submit"]');

    // Wait for redirect to trainer dashboard
    await page.waitForURL(`${baseURL}/trainer`);

    // 2. Trainer should not have Profile tab with delete account
    // (Trainer page has different structure)

    // 3. Attempt to call API directly
    const response = await context.request.delete(`${baseURL}/api/account`, {
      data: {
        password: 'TrainerTest123!',
        confirmDeletion: true,
      },
    });

    // Should return 403 Forbidden
    expect(response.status()).toBe(403);

    // Cleanup
    await db.delete(users).where(eq(users.id, trainer.id));
  });

  test('E2E-5: Deletion with cascade relationships', async ({ page }) => {
    // Add additional related data
    await db.insert(groceryLists).values({
      customerId: testUserId,
      name: 'Test Grocery List',
      // items are in separate groceryListItems table
    });

    await db.insert(progressPhotos).values({
      customerId: testUserId,
      photoUrl: 'https://example.com/photo.jpg',
      photoType: 'progress',
      uploadDate: new Date(),
    });

    // 1. Login and delete account
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', testCustomer.email);
    await page.fill('input[type="password"]', testCustomer.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${baseURL}/customer`);

    // 2. Navigate to Profile tab
    const profileButton = page.locator('button[value="profile"], button:has-text("Profile")').first();
    await profileButton.click();
    await page.waitForTimeout(1000);
    await expect(page.locator('text="Danger Zone"').first()).toBeVisible({ timeout: 5000 });

    // 3. Delete account
    await page.locator('button:has-text("Delete My Account")').first().click();
    await page.waitForTimeout(500);
    await page.fill('input[type="password"][placeholder*="password"], input#delete-password', testCustomer.password);
    await page.locator('label:has-text("I understand")').first().click();
    await page.waitForTimeout(300);
    await page.locator('button:has-text("Delete Account"):not([aria-label])').last().click();

    // Wait for success
    await expect(page.locator('text=Account Deleted').first()).toBeVisible({ timeout: 5000 });

    // 4. Verify all related data is deleted
    const groceries = await db.select().from(groceryLists).where(eq(groceryLists.customerId, testUserId));
    expect(groceries.length).toBe(0);

    const photos = await db.select().from(progressPhotos).where(eq(progressPhotos.customerId, testUserId));
    expect(photos.length).toBe(0);
  });

  test('E2E-6: Login fails after deletion', async ({ page }) => {
    // 1. Login and delete account
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', testCustomer.email);
    await page.fill('input[type="password"]', testCustomer.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${baseURL}/customer`);

    // 2. Delete account
    const profileButton = page.locator('button[value="profile"], button:has-text("Profile")').first();
    await profileButton.click();
    await page.waitForTimeout(1000);
    await page.locator('button:has-text("Delete My Account")').first().click();
    await page.waitForTimeout(500);
    await page.fill('input[type="password"][placeholder*="password"], input#delete-password', testCustomer.password);
    await page.locator('label:has-text("I understand")').first().click();
    await page.waitForTimeout(300);
    await page.locator('button:has-text("Delete Account"):not([aria-label])').last().click();
    await page.waitForURL(`${baseURL}/login`, { timeout: 10000 });

    // 3. Try to login again
    await page.fill('input[type="email"]', testCustomer.email);
    await page.fill('input[type="password"]', testCustomer.password);
    await page.click('button[type="submit"]');

    // Should show error - verify login fails by checking URL (should NOT redirect)
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).not.toContain('/customer'); // Should NOT redirect to customer dashboard
  });

  test('E2E-7: Deletion confirmation checkbox required', async ({ page }) => {
    // 1. Login
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', testCustomer.email);
    await page.fill('input[type="password"]', testCustomer.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${baseURL}/customer`);

    // 2. Navigate to Profile tab
    const profileButton = page.locator('button[value="profile"], button:has-text("Profile")').first();
    await profileButton.click();
    await page.waitForTimeout(1000);
    await expect(page.locator('text="Danger Zone"').first()).toBeVisible({ timeout: 5000 });

    // 3. Click Delete Account button
    await page.locator('button:has-text("Delete My Account")').first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=Are you absolutely sure?').first()).toBeVisible({ timeout: 3000 });

    // 4. Enter password but DON'T check confirmation
    await page.fill('input[type="password"][placeholder*="password"], input#delete-password', testCustomer.password);

    // 5. Delete button should be disabled
    const deleteButton = page.locator('button:has-text("Delete Account"):not([aria-label])').last();
    await expect(deleteButton).toBeDisabled();
  });

  test('E2E-8: Deletion with empty password field', async ({ page }) => {
    // 1. Login
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', testCustomer.email);
    await page.fill('input[type="password"]', testCustomer.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${baseURL}/customer`);

    // 2. Navigate to Profile tab
    const profileButton = page.locator('button[value="profile"], button:has-text("Profile")').first();
    await profileButton.click();
    await page.waitForTimeout(1000);
    await expect(page.locator('text="Danger Zone"').first()).toBeVisible({ timeout: 5000 });

    // 3. Click Delete Account button
    await page.locator('button:has-text("Delete My Account")').first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=Are you absolutely sure?').first()).toBeVisible({ timeout: 3000 });

    // 4. Check confirmation but leave password empty
    await page.locator('label:has-text("I understand")').first().click();
    await page.waitForTimeout(300);

    // 5. Delete button should be disabled
    const deleteButton = page.locator('button:has-text("Delete Account"):not([aria-label])').last();
    await expect(deleteButton).toBeDisabled();
  });

  test('E2E-9: Profile tab navigation and UI', async ({ page }) => {
    // 1. Login
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', testCustomer.email);
    await page.fill('input[type="password"]', testCustomer.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${baseURL}/customer`);

    // 2. Verify 4 tabs exist
    await expect(page.locator('button[value="meal-plans"], button:has-text("Meal Plan")').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button[value="progress"], button:has-text("Progress")').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button[value="grocery-list"], button:has-text("Grocery")').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button[value="profile"], button:has-text("Profile")').first()).toBeVisible({ timeout: 5000 });

    // 3. Click Profile tab
    const profileButton = page.locator('button[value="profile"], button:has-text("Profile")').first();
    await profileButton.click();
    await page.waitForTimeout(1000);

    // 4. Verify profile content
    await expect(page.locator('text="Danger Zone"').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Email, label:has-text("Email")').first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator(`text=${testCustomer.email}`).first()).toBeVisible();
    await expect(page.locator('text=Role, label:has-text("Role")').first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=Customer').first()).toBeVisible();

    // 5. Verify Danger Zone section
    await expect(page.locator('text=Danger Zone').first()).toBeVisible();
    await expect(page.locator('text=This will permanently delete:, text=permanently delete').first()).toBeVisible();
    await expect(page.locator('button:has-text("Delete My Account")').first()).toBeVisible();

    // 6. URL should include ?tab=profile
    expect(page.url()).toContain('tab=profile');
  });

  test('E2E-10: Deletion loading state', async ({ page }) => {
    // 1. Login
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', testCustomer.email);
    await page.fill('input[type="password"]', testCustomer.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${baseURL}/customer`);

    // 2. Navigate to Profile tab
    const profileButton = page.locator('button[value="profile"], button:has-text("Profile")').first();
    await profileButton.click();
    await page.waitForTimeout(1000);
    await expect(page.locator('text="Danger Zone"').first()).toBeVisible({ timeout: 5000 });

    // 3. Click Delete Account button
    await page.locator('button:has-text("Delete My Account")').first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=Are you absolutely sure?').first()).toBeVisible({ timeout: 3000 });

    // 4. Enter password and check confirmation
    await page.fill('input[type="password"][placeholder*="password"], input#delete-password', testCustomer.password);
    await page.locator('label:has-text("I understand")').first().click();
    await page.waitForTimeout(300);

    // 5. Click Delete Account button
    const deleteButton = page.locator('button:has-text("Delete Account"):not([aria-label])').last();
    await deleteButton.click();

    // 6. Should show loading state (Deleting...)
    await expect(page.locator('text=Deleting...').first()).toBeVisible({ timeout: 2000 });

    // 7. Wait for completion
    await expect(page.locator('text=Account Deleted').first()).toBeVisible({ timeout: 10000 });
  });
});
