import { test, expect } from '@playwright/test';
import { db } from '../../server/db';
import { users, personalizedMealPlans, groceryLists, customerMeasurements, customerPhotos, customerGoals } from '../../server/db/schema';
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

  test.beforeEach(async () => {
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
      mealPlanData: { planName: 'Test Plan', meals: [] },
    });

    await db.insert(customerMeasurements).values({
      customerId: testUserId,
      measurementDate: new Date(),
      weight: 70,
      height: 175,
    });

    await db.insert(customerGoals).values({
      customerId: testUserId,
      goalType: 'weight_loss',
      targetValue: 65,
      currentValue: 70,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
  });

  test.afterEach(async () => {
    // Cleanup: Delete test user if still exists (in case test failed)
    try {
      await db.delete(users).where(eq(users.email, testCustomer.email));
    } catch (error) {
      // User already deleted (expected for successful tests)
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
    await page.click('button[value="profile"]');

    // Wait for profile tab content
    await expect(page.locator('text=Account Settings')).toBeVisible();

    // 3. Click Delete Account button
    await page.click('button:has-text("Delete My Account")');

    // Wait for confirmation dialog
    await expect(page.locator('text=Are you absolutely sure?')).toBeVisible();

    // 4. Enter password
    await page.fill('input[type="password"][placeholder*="password"]', testCustomer.password);

    // 5. Check confirmation checkbox
    await page.click('label:has-text("I understand")');

    // 6. Click final Delete Account button
    await page.click('button:has-text("Delete Account"):not([aria-label])');

    // 7. Wait for success toast
    await expect(page.locator('text=Account Deleted')).toBeVisible();

    // 8. Should be redirected to login
    await page.waitForURL(`${baseURL}/login`, { timeout: 5000 });

    // 9. Verify user is deleted from database
    const users = await db.select().from(users).where(eq(users.email, testCustomer.email));
    expect(users.length).toBe(0);

    // 10. Verify cascade deletes worked
    const mealPlans = await db.select().from(personalizedMealPlans).where(eq(personalizedMealPlans.customerId, testUserId));
    expect(mealPlans.length).toBe(0);

    const measurements = await db.select().from(customerMeasurements).where(eq(customerMeasurements.customerId, testUserId));
    expect(measurements.length).toBe(0);

    const goals = await db.select().from(customerGoals).where(eq(customerGoals.customerId, testUserId));
    expect(goals.length).toBe(0);
  });

  test('E2E-2: Deletion with password re-authentication', async ({ page }) => {
    // 1. Login
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', testCustomer.email);
    await page.fill('input[type="password"]', testCustomer.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${baseURL}/customer`);

    // 2. Navigate to Profile tab
    await page.click('button[value="profile"]');
    await expect(page.locator('text=Account Settings')).toBeVisible();

    // 3. Click Delete Account button
    await page.click('button:has-text("Delete My Account")');
    await expect(page.locator('text=Are you absolutely sure?')).toBeVisible();

    // 4. Try with wrong password first
    await page.fill('input[type="password"][placeholder*="password"]', 'WrongPassword123!');
    await page.click('label:has-text("I understand")');
    await page.click('button:has-text("Delete Account"):not([aria-label])');

    // Should show error
    await expect(page.locator('text=Invalid password')).toBeVisible({ timeout: 3000 });

    // 5. Try again with correct password
    await page.fill('input[type="password"][placeholder*="password"]', testCustomer.password);
    await page.click('button:has-text("Delete Account"):not([aria-label])');

    // Should succeed
    await expect(page.locator('text=Account Deleted')).toBeVisible();
    await page.waitForURL(`${baseURL}/login`, { timeout: 5000 });
  });

  test('E2E-3: Deletion cancellation', async ({ page }) => {
    // 1. Login
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', testCustomer.email);
    await page.fill('input[type="password"]', testCustomer.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${baseURL}/customer`);

    // 2. Navigate to Profile tab
    await page.click('button[value="profile"]');
    await expect(page.locator('text=Account Settings')).toBeVisible();

    // 3. Click Delete Account button
    await page.click('button:has-text("Delete My Account")');
    await expect(page.locator('text=Are you absolutely sure?')).toBeVisible();

    // 4. Enter password and check confirmation
    await page.fill('input[type="password"][placeholder*="password"]', testCustomer.password);
    await page.click('label:has-text("I understand")');

    // 5. Click Cancel instead of Delete
    await page.click('button:has-text("Cancel")');

    // 6. Dialog should close
    await expect(page.locator('text=Are you absolutely sure?')).not.toBeVisible();

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
      listName: 'Test Grocery List',
      items: [{ name: 'Chicken', quantity: '1 kg', checked: false }],
    });

    await db.insert(customerPhotos).values({
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
    await page.click('button[value="profile"]');
    await expect(page.locator('text=Account Settings')).toBeVisible();

    // 3. Delete account
    await page.click('button:has-text("Delete My Account")');
    await page.fill('input[type="password"][placeholder*="password"]', testCustomer.password);
    await page.click('label:has-text("I understand")');
    await page.click('button:has-text("Delete Account"):not([aria-label])');

    // Wait for success
    await expect(page.locator('text=Account Deleted')).toBeVisible();

    // 4. Verify all related data is deleted
    const groceries = await db.select().from(groceryLists).where(eq(groceryLists.customerId, testUserId));
    expect(groceries.length).toBe(0);

    const photos = await db.select().from(customerPhotos).where(eq(customerPhotos.customerId, testUserId));
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
    await page.click('button[value="profile"]');
    await page.click('button:has-text("Delete My Account")');
    await page.fill('input[type="password"][placeholder*="password"]', testCustomer.password);
    await page.click('label:has-text("I understand")');
    await page.click('button:has-text("Delete Account"):not([aria-label])');
    await page.waitForURL(`${baseURL}/login`);

    // 3. Try to login again
    await page.fill('input[type="email"]', testCustomer.email);
    await page.fill('input[type="password"]', testCustomer.password);
    await page.click('button[type="submit"]');

    // Should show error
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });

  test('E2E-7: Deletion confirmation checkbox required', async ({ page }) => {
    // 1. Login
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', testCustomer.email);
    await page.fill('input[type="password"]', testCustomer.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${baseURL}/customer`);

    // 2. Navigate to Profile tab
    await page.click('button[value="profile"]');
    await expect(page.locator('text=Account Settings')).toBeVisible();

    // 3. Click Delete Account button
    await page.click('button:has-text("Delete My Account")');
    await expect(page.locator('text=Are you absolutely sure?')).toBeVisible();

    // 4. Enter password but DON'T check confirmation
    await page.fill('input[type="password"][placeholder*="password"]', testCustomer.password);

    // 5. Delete button should be disabled
    const deleteButton = page.locator('button:has-text("Delete Account"):not([aria-label])');
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
    await page.click('button[value="profile"]');
    await expect(page.locator('text=Account Settings')).toBeVisible();

    // 3. Click Delete Account button
    await page.click('button:has-text("Delete My Account")');
    await expect(page.locator('text=Are you absolutely sure?')).toBeVisible();

    // 4. Check confirmation but leave password empty
    await page.click('label:has-text("I understand")');

    // 5. Delete button should be disabled
    const deleteButton = page.locator('button:has-text("Delete Account"):not([aria-label])');
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
    await expect(page.locator('button[value="meal-plans"]')).toBeVisible();
    await expect(page.locator('button[value="progress"]')).toBeVisible();
    await expect(page.locator('button[value="grocery-list"]')).toBeVisible();
    await expect(page.locator('button[value="profile"]')).toBeVisible();

    // 3. Click Profile tab
    await page.click('button[value="profile"]');

    // 4. Verify profile content
    await expect(page.locator('text=Account Settings')).toBeVisible();
    await expect(page.locator('text=Email')).toBeVisible();
    await expect(page.locator(`text=${testCustomer.email}`)).toBeVisible();
    await expect(page.locator('text=Role')).toBeVisible();
    await expect(page.locator('text=Customer')).toBeVisible();

    // 5. Verify Danger Zone section
    await expect(page.locator('text=Danger Zone')).toBeVisible();
    await expect(page.locator('text=This will permanently delete:')).toBeVisible();
    await expect(page.locator('button:has-text("Delete My Account")')).toBeVisible();

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
    await page.click('button[value="profile"]');
    await expect(page.locator('text=Account Settings')).toBeVisible();

    // 3. Click Delete Account button
    await page.click('button:has-text("Delete My Account")');
    await expect(page.locator('text=Are you absolutely sure?')).toBeVisible();

    // 4. Enter password and check confirmation
    await page.fill('input[type="password"][placeholder*="password"]', testCustomer.password);
    await page.click('label:has-text("I understand")');

    // 5. Click Delete Account button
    await page.click('button:has-text("Delete Account"):not([aria-label])');

    // 6. Should show loading state (Deleting...)
    await expect(page.locator('text=Deleting...')).toBeVisible({ timeout: 1000 });

    // 7. Wait for completion
    await expect(page.locator('text=Account Deleted')).toBeVisible({ timeout: 5000 });
  });
});
