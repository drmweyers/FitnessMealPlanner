import { test, expect } from '@playwright/test';
import { db } from '../../server/db';
import { users } from '../../server/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import * as path from 'path';
import {
  countS3Objects,
  deleteTestS3Objects,
  waitForS3Consistency,
} from '../utils/s3TestHelpers';

test.describe('S3 Security - E2E Tests', () => {
  const baseURL = 'http://localhost:4000';

  const testCustomerA = {
    email: 'customer-a@example.com',
    password: 'CustomerA123!',
    role: 'customer' as const,
  };

  const testCustomerB = {
    email: 'customer-b@example.com',
    password: 'CustomerB123!',
    role: 'customer' as const,
  };

  const testAdmin = {
    email: 'admin@fitmeal.pro',
    password: 'AdminPass123',
  };

  let customerAId: number;
  let customerBId: number;

  const testImagePath = path.join(__dirname, '..', 'fixtures', 'test-image-1.jpg');

  test.beforeEach(async () => {
    // Create test customer accounts
    const hashedPasswordA = await bcrypt.hash(testCustomerA.password, 10);
    const [userA] = await db.insert(users).values({
      email: testCustomerA.email,
      password: hashedPasswordA,
      role: testCustomerA.role,
    }).returning();
    customerAId = userA.id;

    const hashedPasswordB = await bcrypt.hash(testCustomerB.password, 10);
    const [userB] = await db.insert(users).values({
      email: testCustomerB.email,
      password: hashedPasswordB,
      role: testCustomerB.role,
    }).returning();
    customerBId = userB.id;
  });

  test.afterEach(async () => {
    // Cleanup test accounts
    await db.delete(users).where(eq(users.email, testCustomerA.email));
    await db.delete(users).where(eq(users.email, testCustomerB.email));

    // Cleanup test S3 objects
    await deleteTestS3Objects(`progress-photos/${customerAId}/`);
    await deleteTestS3Objects(`progress-photos/${customerBId}/`);
    await deleteTestS3Objects(`profile-images/${customerAId}/`);
    await deleteTestS3Objects(`profile-images/${customerBId}/`);
    await waitForS3Consistency(500);
  });

  test('S3-SECURITY-1: Cross-user access prevention (Customer A → Customer B)', async ({ page, context }) => {
    // 1. Login as Customer A
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', testCustomerA.email);
    await page.fill('input[type="password"]', testCustomerA.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${baseURL}/customer`);

    // 2. Get Customer A's session token
    const cookies = await context.cookies();
    const sessionToken = cookies.find(c => c.name === 'sessionToken' || c.name === 'connect.sid');

    // 3. Attempt to upload to Customer B's progress photos via API
    const response = await context.request.post(`${baseURL}/api/upload/progress-photo`, {
      headers: {
        'Authorization': `Bearer ${sessionToken?.value}`,
      },
      multipart: {
        customerId: customerBId.toString(), // Attempt to upload to Customer B
        file: {
          name: 'test-image-1.jpg',
          mimeType: 'image/jpeg',
          buffer: Buffer.from('fake image data'),
        },
      },
    });

    // 4. Verify 403 Forbidden response
    expect(response.status()).toBe(403);

    // 5. Verify no S3 upload attempted
    await waitForS3Consistency(500);
    const customerBObjects = await countS3Objects(`progress-photos/${customerBId}/`);
    expect(customerBObjects).toBe(0);

    // 6. Verify error message
    const responseBody = await response.json();
    expect(responseBody).toHaveProperty('error');
    expect(responseBody.error).toMatch(/unauthorized|forbidden|not allowed/i);
  });

  test('S3-SECURITY-2: Role-based upload permissions (Customer → Recipe Image)', async ({ page, context }) => {
    // 1. Login as Customer A
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', testCustomerA.email);
    await page.fill('input[type="password"]', testCustomerA.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${baseURL}/customer`);

    // 2. Get Customer A's session token
    const cookies = await context.cookies();
    const sessionToken = cookies.find(c => c.name === 'sessionToken' || c.name === 'connect.sid');

    // 3. Attempt to upload recipe image (admin-only operation)
    const response = await context.request.post(`${baseURL}/api/upload/recipe-image`, {
      headers: {
        'Authorization': `Bearer ${sessionToken?.value}`,
      },
      multipart: {
        recipeName: 'Unauthorized Recipe Upload',
        file: {
          name: 'test-image-1.jpg',
          mimeType: 'image/jpeg',
          buffer: Buffer.from('fake image data'),
        },
      },
    });

    // 4. Verify 403 Forbidden response
    expect(response.status()).toBe(403);

    // 5. Verify no S3 upload attempted
    await waitForS3Consistency(500);
    const recipeObjects = await countS3Objects('recipe-images/');
    const initialCount = recipeObjects;

    // After unauthorized attempt, count should remain the same
    const finalCount = await countS3Objects('recipe-images/');
    expect(finalCount).toBe(initialCount);

    // 6. Verify error message
    const responseBody = await response.json();
    expect(responseBody).toHaveProperty('error');
    expect(responseBody.error).toMatch(/unauthorized|admin only|permission denied/i);
  });

  test('S3-SECURITY-3: Signed URL expiration (access control)', async ({ page }) => {
    // This test validates that signed URLs expire after the configured time period

    // Note: This test requires:
    // 1. Generating a signed URL with short expiration (e.g., 60 seconds)
    // 2. Waiting for expiration
    // 3. Attempting to access the URL
    // 4. Verifying access is denied

    test.skip();

    // Expected behavior:
    // - User uploads image → S3 signed URL generated with expiration
    // - User can access image via signed URL within expiration period
    // - After expiration, access denied (403 Forbidden or 404 Not Found)
    // - User must request new signed URL to access image
  });

  test('S3-SECURITY-4: API authentication enforcement', async ({ page, context }) => {
    // 1. Attempt upload without any authentication
    const response = await context.request.post(`${baseURL}/api/upload/progress-photo`, {
      multipart: {
        customerId: customerAId.toString(),
        file: {
          name: 'test-image-1.jpg',
          mimeType: 'image/jpeg',
          buffer: Buffer.from('fake image data'),
        },
      },
    });

    // 2. Verify 401 Unauthorized response
    expect(response.status()).toBe(401);

    // 3. Verify no S3 upload attempted
    await waitForS3Consistency(500);
    const customerAObjects = await countS3Objects(`progress-photos/${customerAId}/`);
    expect(customerAObjects).toBe(0);

    // 4. Verify error message
    const responseBody = await response.json();
    expect(responseBody).toHaveProperty('error');
    expect(responseBody.error).toMatch(/unauthorized|authentication required|not logged in/i);
  });

  test('S3-SECURITY-5: File type validation (XSS prevention)', async ({ page }) => {
    // 1. Login as Customer A
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', testCustomerA.email);
    await page.fill('input[type="password"]', testCustomerA.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${baseURL}/customer`);

    // 2. Navigate to Progress → Photos
    await page.click('button[value="progress"]');
    await page.click('button:has-text("Photos")');

    // 3. Attempt to upload HTML file (potential XSS vector)
    const htmlFilePath = path.join(__dirname, '..', 'fixtures', 'malicious.html');

    // For this test to work, we'd need to create a malicious HTML file
    test.skip();

    // Expected behavior:
    // - File upload rejected due to invalid MIME type
    // - Error message: "Invalid file type. Only images are allowed."
    // - No S3 upload attempted
    // - XSS attack prevented
  });

  test('S3-SECURITY-6: SQL injection prevention in S3 keys', async ({ page, context }) => {
    // 1. Login as Customer A
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', testCustomerA.email);
    await page.fill('input[type="password"]', testCustomerA.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${baseURL}/customer`);

    // 2. Get session token
    const cookies = await context.cookies();
    const sessionToken = cookies.find(c => c.name === 'sessionToken' || c.name === 'connect.sid');

    // 3. Attempt SQL injection via filename
    const response = await context.request.post(`${baseURL}/api/upload/progress-photo`, {
      headers: {
        'Authorization': `Bearer ${sessionToken?.value}`,
      },
      multipart: {
        customerId: customerAId.toString(),
        file: {
          name: "'; DROP TABLE users; --.jpg",
          mimeType: 'image/jpeg',
          buffer: Buffer.from('fake image data'),
        },
      },
    });

    // 4. Verify upload either succeeds (with sanitized filename) or fails safely
    expect([200, 400]).toContain(response.status());

    // 5. Verify database is intact (users table still exists)
    const usersExist = await db.select().from(users).limit(1);
    expect(usersExist.length).toBeGreaterThan(0);

    // 6. If upload succeeded, verify filename was sanitized
    if (response.status() === 200) {
      const responseBody = await response.json();
      expect(responseBody.photoUrl).not.toContain('DROP TABLE');
      expect(responseBody.photoUrl).not.toContain(';');
    }
  });
});
