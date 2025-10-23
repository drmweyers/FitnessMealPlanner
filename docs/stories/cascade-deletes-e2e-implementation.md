# Cascade Deletes E2E Test Implementation Story

**BMAD SM Agent:** Story Master
**Date:** January 21, 2025
**Story Type:** E2E Test Implementation
**Priority:** P0 - CRITICAL
**Estimated Effort:** 15 hours
**Reference:** `docs/qa/assessments/cascade-deletes-e2e-test-design.md`

---

## Story Overview

Implement comprehensive end-to-end tests for cascade delete workflows covering user deletion, meal plan deletion, and trainer deletion scenarios. This test suite validates complete data integrity from UI interaction through database cleanup and S3 file removal.

**Why This Is Critical:**
- **Data Loss Risk:** 10/10 - Improper cascade deletes can result in catastrophic data loss
- **Privacy Compliance:** GDPR/data retention requirements demand verified deletion
- **Cost Impact:** Orphaned S3 files lead to unnecessary storage costs
- **Production Stability:** Ensures no crashes from broken foreign key relationships

---

## Epic Link

**Phase 1:** P0 Critical E2E Tests
**Iteration 1:** Cascade Deletes E2E

---

## Acceptance Criteria

### Functional Requirements
- [ ] 11/11 E2E scenarios implemented and documented
- [ ] All scenarios pass with 100% success rate
- [ ] S3 cleanup verified for every photo deletion
- [ ] Zero database orphans detected across all tests
- [ ] Data isolation validated (no cross-customer/trainer leaks)

### Performance Requirements
- [ ] User deletion completes in < 5 seconds
- [ ] Meal plan deletion completes in < 3 seconds
- [ ] S3 cleanup completes in < 5 seconds
- [ ] UI updates complete in < 2 seconds
- [ ] Total test suite runs in < 60 minutes

### Quality Requirements
- [ ] Test coverage: 100% of cascade delete workflows
- [ ] Cross-browser validation (Chromium, Firefox, WebKit)
- [ ] Database verification queries for every scenario
- [ ] S3 verification scripts functional
- [ ] Error handling tested (failed deletions, network issues)

---

## Technical Requirements

### Test Framework
- **E2E Testing:** Playwright
- **Browser Targets:** Chromium, Firefox, WebKit
- **Test Runner:** `npx playwright test`
- **Parallel Execution:** Disabled (prevents data cleanup conflicts)
- **Timeout:** 60 seconds per test
- **Retries:** 1 (retry once on failure)

### Test File Structure
```
test/e2e/
├── cascade-deletes-e2e.spec.ts          # Main test file (11 scenarios)
├── helpers/
│   ├── auth.ts                          # Login helpers
│   ├── navigation.ts                    # Navigation utilities
│   ├── database.ts                      # DB verification queries
│   ├── s3.ts                            # S3 verification utilities
│   └── cleanup.ts                       # Test data cleanup
└── fixtures/
    └── cascade-test-data.ts             # Test data generation
```

### Dependencies
```json
{
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@aws-sdk/client-s3": "^3.400.0"
  }
}
```

---

## Implementation Tasks

### Task 1: Setup Test File and Helper Functions (2 hours)

**File:** `test/e2e/cascade-deletes-e2e.spec.ts`

**Deliverables:**

1. **Create main test file structure:**

```typescript
/**
 * Cascade Deletes E2E Tests
 *
 * Tests complete cascade delete workflows:
 * - User deletion → all data cleaned
 * - Meal plan deletion → grocery lists cascade
 * - Trainer deletion → relationships removed
 * - S3 file cleanup verification
 * - Data isolation validation
 *
 * Priority: P0 - CRITICAL (Data Integrity)
 * Risk: 10/10 (Data loss, privacy violations, cost escalation)
 *
 * @see docs/qa/assessments/cascade-deletes-e2e-test-design.md
 */

import { test, expect, Page } from '@playwright/test';
import { loginAsCustomer, loginAsTrainer, logout } from './helpers/auth';
import { deleteAccount, deleteMealPlan } from './helpers/navigation';
import { verifyDatabaseOrphans, verifyNoOrphans } from './helpers/database';
import { verifyS3FileExists, verifyS3FileDeleted } from './helpers/s3';
import { seedCascadeTestData, cleanupCascadeTestData } from './fixtures/cascade-test-data';

// Disable parallel execution to prevent data conflicts
test.describe.configure({ mode: 'serial' });

test.describe('Cascade Deletes E2E', () => {
  // Before all tests: seed test data
  test.beforeAll(async () => {
    await seedCascadeTestData();
  });

  // After all tests: cleanup test data
  test.afterAll(async () => {
    await cleanupCascadeTestData();
  });

  // Scenario 1: Customer deletes account → meal plans cascade
  // Scenario 2: Customer deletes account → grocery lists cascade
  // ... (all 11 scenarios)
});
```

2. **Create authentication helpers:**

**File:** `test/e2e/helpers/auth.ts`

```typescript
import { Page } from '@playwright/test';

export interface TestCredentials {
  email: string;
  password: string;
}

export async function loginAsCustomer(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto('http://localhost:4000');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button:has-text("Login")');
  await page.waitForURL(/\/customer/, { timeout: 5000 });
}

export async function loginAsTrainer(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto('http://localhost:4000');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button:has-text("Login")');
  await page.waitForURL(/\/trainer/, { timeout: 5000 });
}

export async function loginAsAdmin(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto('http://localhost:4000');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button:has-text("Login")');
  await page.waitForURL(/\/admin/, { timeout: 5000 });
}

export async function logout(page: Page): Promise<void> {
  await page.click('[data-testid="user-profile-menu"]');
  await page.click('button:has-text("Logout")');
  await page.waitForURL('/', { timeout: 5000 });
}
```

3. **Create database verification helpers:**

**File:** `test/e2e/helpers/database.ts`

```typescript
import fetch from 'node-fetch';

export interface OrphanCheckResult {
  mealPlans: number;
  groceryLists: number;
  measurements: number;
  progressPhotos: number;
  assignments: number;
  relationships: number;
  user: number;
}

export async function verifyDatabaseOrphans(
  userId: string
): Promise<OrphanCheckResult> {
  const response = await fetch(
    `http://localhost:4000/api/test/verify-orphans/${userId}`
  );

  if (!response.ok) {
    throw new Error(`Database verification failed: ${response.statusText}`);
  }

  return response.json();
}

export async function verifyNoOrphans(
  userId: string,
  context: string
): Promise<void> {
  const orphans = await verifyDatabaseOrphans(userId);

  const totalOrphans = Object.values(orphans).reduce((sum, count) => sum + count, 0);

  if (totalOrphans > 0) {
    throw new Error(
      `${context}: Found ${totalOrphans} orphaned records:\n` +
      JSON.stringify(orphans, null, 2)
    );
  }
}

export async function verifyUserDeleted(email: string): Promise<boolean> {
  const response = await fetch(
    `http://localhost:4000/api/test/user-exists/${email}`
  );

  if (!response.ok) {
    throw new Error(`User existence check failed: ${response.statusText}`);
  }

  const result = await response.json();
  return !result.exists;
}

export async function verifyMealPlanDeleted(
  mealPlanId: string
): Promise<boolean> {
  const response = await fetch(
    `http://localhost:4000/api/test/meal-plan-exists/${mealPlanId}`
  );

  if (!response.ok) {
    throw new Error(`Meal plan existence check failed: ${response.statusText}`);
  }

  const result = await response.json();
  return !result.exists;
}

export async function getDataCounts(userId: string): Promise<{
  mealPlans: number;
  groceryLists: number;
  measurements: number;
  photos: number;
}> {
  const response = await fetch(
    `http://localhost:4000/api/test/data-counts/${userId}`
  );

  if (!response.ok) {
    throw new Error(`Data count fetch failed: ${response.statusText}`);
  }

  return response.json();
}
```

4. **Create S3 verification helpers:**

**File:** `test/e2e/helpers/s3.ts`

```typescript
import { S3Client, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'evofitmeals';

export async function verifyS3FileExists(imageUrl: string): Promise<boolean> {
  try {
    // Extract S3 key from URL
    const key = extractS3KeyFromUrl(imageUrl);

    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    if (error.name === 'NotFound') {
      return false;
    }
    throw error;
  }
}

export async function verifyS3FileDeleted(imageUrl: string): Promise<boolean> {
  const exists = await verifyS3FileExists(imageUrl);
  return !exists;
}

export async function verifyAllS3FilesDeleted(
  imageUrls: string[]
): Promise<{ deleted: number; remaining: number }> {
  let deleted = 0;
  let remaining = 0;

  for (const url of imageUrls) {
    const isDeleted = await verifyS3FileDeleted(url);
    if (isDeleted) {
      deleted++;
    } else {
      remaining++;
    }
  }

  return { deleted, remaining };
}

export async function countS3FilesForCustomer(
  customerUuid: string
): Promise<number> {
  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `progress/${customerUuid}/`,
    });

    const response = await s3Client.send(command);
    return response.Contents?.length || 0;
  } catch (error) {
    console.error('S3 file count failed:', error);
    return 0;
  }
}

function extractS3KeyFromUrl(url: string): string {
  // Extract key from URL like: https://evofitmeals.s3.amazonaws.com/progress/uuid/photo.jpg
  const urlParts = url.split('.com/');
  if (urlParts.length !== 2) {
    throw new Error(`Invalid S3 URL: ${url}`);
  }
  return urlParts[1];
}
```

5. **Create navigation helpers:**

**File:** `test/e2e/helpers/navigation.ts`

```typescript
import { Page } from '@playwright/test';

export async function deleteAccount(page: Page): Promise<void> {
  // Navigate to settings
  await page.click('[data-testid="user-profile-menu"]');
  await page.click('a:has-text("Settings")');

  // Scroll to danger zone
  await page.evaluate(() => {
    const dangerZone = document.querySelector('[data-testid="danger-zone"]');
    dangerZone?.scrollIntoView({ behavior: 'smooth' });
  });

  // Click delete account button
  await page.click('button:has-text("Delete Account")');

  // Confirm deletion
  await page.waitForSelector('[data-testid="delete-confirmation-modal"]');
  await page.fill('input[name="confirmText"]', 'DELETE');
  await page.click('button:has-text("Confirm Delete")');

  // Wait for redirect to login
  await page.waitForURL('/', { timeout: 5000 });
}

export async function deleteMealPlan(
  page: Page,
  mealPlanId: string
): Promise<void> {
  // Navigate to meal plans
  await page.click('a:has-text("Meal Plans")');

  // Click options menu for specific meal plan
  await page.click(`[data-meal-plan-id="${mealPlanId}"] button[aria-label="Options"]`);

  // Click delete option
  await page.click('button:has-text("Delete Meal Plan")');

  // Confirm deletion
  await page.waitForSelector('[data-testid="delete-meal-plan-modal"]');
  await page.click('button:has-text("Confirm Delete")');

  // Wait for success toast
  await page.waitForSelector('text=Meal plan deleted', { timeout: 3000 });
}

export async function navigateToCustomerList(page: Page): Promise<void> {
  await page.click('a:has-text("Customers")');
  await page.waitForSelector('[data-testid="customer-list"]');
}

export async function navigateToMealPlans(page: Page): Promise<void> {
  await page.click('a:has-text("Meal Plans")');
  await page.waitForSelector('[data-testid="meal-plans-container"]');
}

export async function navigateToGroceryLists(page: Page): Promise<void> {
  await page.click('a:has-text("Grocery Lists")');
  await page.waitForSelector('[data-testid="grocery-lists-container"]');
}
```

**Acceptance Criteria:**
- [ ] All helper functions created and typed
- [ ] Test file structure established
- [ ] Database verification API endpoints exist
- [ ] S3 verification logic functional
- [ ] Authentication helpers working across all roles
- [ ] Navigation helpers covering all pages

---

### Task 2: User Deletion Flow - Meal Plans Cascade (1.5 hours)

**Scenario 1 Implementation:** Customer deletes account → meal plans cascade

**Test Code:**

```typescript
test('Scenario 1: Customer deletes account → meal plans cascade', async ({ page }) => {
  // Arrange: Seed customer with 3 meal plans
  const customer = {
    email: 'cascade.customer@test.com',
    password: 'TestPass123!',
    uuid: 'test-customer-uuid-001',
  };

  const trainer = {
    email: 'cascade.trainer@test.com',
    password: 'TestPass123!',
  };

  // Act 1: Login as customer and verify meal plans
  await loginAsCustomer(page, customer.email, customer.password);
  await navigateToMealPlans(page);

  const mealPlanCount = await page.locator('[data-testid="meal-plan-card"]').count();
  expect(mealPlanCount).toBe(3);

  // Take screenshot for documentation
  await page.screenshot({ path: 'test-results/scenario1-before-delete.png' });

  // Act 2: Delete account
  const startTime = Date.now();
  await deleteAccount(page);
  const deletionTime = Date.now() - startTime;

  // Assert 1: Performance requirement met
  expect(deletionTime).toBeLessThan(5000); // < 5s

  // Assert 2: Redirected to login
  expect(page.url()).toContain('/login');

  // Assert 3: Customer cannot re-login
  await page.fill('input[name="email"]', customer.email);
  await page.fill('input[name="password"]', customer.password);
  await page.click('button:has-text("Login")');

  await page.waitForSelector('text=Invalid credentials', { timeout: 3000 });

  // Assert 4: Database cleanup verified
  await verifyNoOrphans(customer.uuid, 'Scenario 1: Customer deletion');

  // Assert 5: Trainer no longer sees customer
  await loginAsTrainer(page, trainer.email, trainer.password);
  await navigateToCustomerList(page);

  const customerExists = await page.locator(`text=${customer.email}`).isVisible().catch(() => false);
  expect(customerExists).toBe(false);

  // Take screenshot for documentation
  await page.screenshot({ path: 'test-results/scenario1-after-delete.png' });
});
```

**Database Verification Queries (API Endpoint):**

**File:** `server/routes/test.ts` (create if doesn't exist)

```typescript
import { Router } from 'express';
import { db } from '../db';
import { users, mealPlans, groceryLists, progressMeasurements, progressPhotos, mealPlanAssignments, trainerCustomerRelationships } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Verify no orphaned records for a deleted user
router.get('/verify-orphans/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const [
      mealPlansCount,
      groceryListsCount,
      measurementsCount,
      photosCount,
      assignmentsCount,
      relationshipsCount,
      userCount,
    ] = await Promise.all([
      db.select({ count: sql`count(*)` }).from(mealPlans).where(eq(mealPlans.customerId, userId)),
      db.select({ count: sql`count(*)` }).from(groceryLists).where(eq(groceryLists.customerId, userId)),
      db.select({ count: sql`count(*)` }).from(progressMeasurements).where(eq(progressMeasurements.customerId, userId)),
      db.select({ count: sql`count(*)` }).from(progressPhotos).where(eq(progressPhotos.customerId, userId)),
      db.select({ count: sql`count(*)` }).from(mealPlanAssignments).where(eq(mealPlanAssignments.customerId, userId)),
      db.select({ count: sql`count(*)` }).from(trainerCustomerRelationships).where(eq(trainerCustomerRelationships.customerId, userId)),
      db.select({ count: sql`count(*)` }).from(users).where(eq(users.id, userId)),
    ]);

    res.json({
      mealPlans: Number(mealPlansCount[0].count),
      groceryLists: Number(groceryListsCount[0].count),
      measurements: Number(measurementsCount[0].count),
      progressPhotos: Number(photosCount[0].count),
      assignments: Number(assignmentsCount[0].count),
      relationships: Number(relationshipsCount[0].count),
      user: Number(userCount[0].count),
    });
  } catch (error) {
    console.error('Orphan verification failed:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

export default router;
```

**Acceptance Criteria:**
- [ ] Customer account deleted successfully
- [ ] All 3 meal plans removed from database
- [ ] Customer cannot re-login
- [ ] Trainer no longer sees customer
- [ ] No database orphans (0 orphaned records)
- [ ] UI updates within 2 seconds
- [ ] Performance: Deletion time < 5s
- [ ] Test passes 100%

---

### Task 3: User Deletion Flow - Grocery Lists Cascade (1 hour)

**Scenario 2 Implementation:** Customer deletes account → grocery lists cascade (linked + standalone)

**Test Code:**

```typescript
test('Scenario 2: Customer deletes account → grocery lists cascade', async ({ page }) => {
  // Arrange: Customer with 5 grocery lists (3 linked, 2 standalone)
  const customer = {
    email: 'cascade.customer.gl@test.com',
    password: 'TestPass123!',
    uuid: 'test-customer-uuid-002',
  };

  // Act 1: Login and verify grocery lists
  await loginAsCustomer(page, customer.email, customer.password);
  await navigateToGroceryLists(page);

  const listCount = await page.locator('[data-testid="grocery-list-card"]').count();
  expect(listCount).toBe(5);

  // Verify linked vs standalone
  const linkedLists = await page.locator('text=From Meal Plan:').count();
  const standaloneLists = await page.locator('text=Standalone List').count();
  expect(linkedLists).toBe(3);
  expect(standaloneLists).toBe(2);

  // Act 2: Delete account
  await deleteAccount(page);

  // Assert: All grocery lists deleted (including standalone)
  await verifyNoOrphans(customer.uuid, 'Scenario 2: Grocery lists');

  // Verify specific counts
  const orphans = await verifyDatabaseOrphans(customer.uuid);
  expect(orphans.groceryLists).toBe(0);
});
```

**Acceptance Criteria:**
- [ ] All 5 grocery lists removed (both linked and standalone)
- [ ] No orphaned grocery list items
- [ ] Database verified clean
- [ ] Performance: Deletion < 5s
- [ ] Test passes 100%

---

### Task 4: User Deletion Flow - Measurements Cascade (1 hour)

**Scenario 3 Implementation:** Customer deletes account → measurements cascade

**Test Code:**

```typescript
test('Scenario 3: Customer deletes account → measurements cascade', async ({ page }) => {
  // Arrange: Customer with 10 measurements
  const customer = {
    email: 'cascade.customer.meas@test.com',
    password: 'TestPass123!',
    uuid: 'test-customer-uuid-003',
  };

  // Act 1: Login and verify measurements
  await loginAsCustomer(page, customer.email, customer.password);
  await page.click('a:has-text("Progress")');
  await page.click('button:has-text("Measurements")');

  const measurementRows = await page.locator('[data-testid="measurement-row"]').count();
  expect(measurementRows).toBeGreaterThanOrEqual(10);

  // Act 2: Delete account
  await deleteAccount(page);

  // Assert: All measurements deleted
  const orphans = await verifyDatabaseOrphans(customer.uuid);
  expect(orphans.measurements).toBe(0);
});
```

**Acceptance Criteria:**
- [ ] All measurements removed from database
- [ ] No orphaned measurement records
- [ ] Performance: Deletion < 5s
- [ ] Test passes 100%

---

### Task 5: User Deletion Flow - Progress Photos + S3 Cleanup (2 hours)

**⚠️ HIGH PRIORITY - S3 Cleanup Critical**

**Scenario 4 Implementation:** Customer deletes account → progress photos + S3 cleanup

**Test Code:**

```typescript
test('Scenario 4: Customer deletes account → progress photos + S3 cleanup', async ({ page }) => {
  // Arrange: Customer with 5 progress photos (S3 files)
  const customer = {
    email: 'cascade.customer.photos@test.com',
    password: 'TestPass123!',
    uuid: 'test-customer-uuid-004',
  };

  // Get photo URLs before deletion
  await loginAsCustomer(page, customer.email, customer.password);
  await page.click('a:has-text("Progress")');
  await page.click('button:has-text("Photos")');

  const photoUrls: string[] = await page.locator('[data-testid="progress-photo-img"]')
    .evaluateAll((imgs: HTMLImageElement[]) => imgs.map(img => img.src));

  expect(photoUrls.length).toBe(5);

  // Verify S3 files exist BEFORE deletion
  for (const url of photoUrls) {
    const exists = await verifyS3FileExists(url);
    expect(exists).toBe(true);
  }

  // Act: Delete account
  await deleteAccount(page);

  // Wait for S3 cleanup (async operation)
  await page.waitForTimeout(3000); // 3 seconds for S3 delete

  // Assert 1: Database photos deleted
  const orphans = await verifyDatabaseOrphans(customer.uuid);
  expect(orphans.progressPhotos).toBe(0);

  // Assert 2: S3 files physically deleted
  const s3Results = await verifyAllS3FilesDeleted(photoUrls);
  expect(s3Results.deleted).toBe(5);
  expect(s3Results.remaining).toBe(0);

  // Assert 3: S3 file count verification
  const fileCount = await countS3FilesForCustomer(customer.uuid);
  expect(fileCount).toBe(0);
});
```

**S3 Cleanup Verification Script:**

**File:** `scripts/verify-s3-cleanup.js`

```javascript
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function verifyS3Cleanup(customerUuid) {
  const command = new ListObjectsV2Command({
    Bucket: process.env.S3_BUCKET_NAME,
    Prefix: `progress/${customerUuid}/`,
  });

  try {
    const response = await s3Client.send(command);
    const fileCount = response.Contents?.length || 0;

    console.log(`✅ S3 cleanup verified: ${fileCount} files found`);

    if (fileCount > 0) {
      console.log('⚠️  Orphaned files detected:');
      response.Contents.forEach(file => {
        console.log(`  - ${file.Key} (${file.Size} bytes)`);
      });
    }

    return fileCount;
  } catch (error) {
    console.error('❌ S3 verification failed:', error);
    throw error;
  }
}

// Usage: node scripts/verify-s3-cleanup.js <customer-uuid>
const customerUuid = process.argv[2];
if (!customerUuid) {
  console.error('Usage: node verify-s3-cleanup.js <customer-uuid>');
  process.exit(1);
}

verifyS3Cleanup(customerUuid).then(fileCount => {
  process.exit(fileCount > 0 ? 1 : 0);
});
```

**Acceptance Criteria:**
- [ ] All 5 photo database records deleted
- [ ] All 5 S3 files physically removed from cloud storage
- [ ] S3 verification script confirms 0 files remaining
- [ ] No orphaned S3 files
- [ ] Performance: S3 cleanup < 5s
- [ ] Test passes 100%

**Risk Mitigation:**
- ⚠️ **Risk:** S3 delete may fail but DB succeeds (orphaned files)
- ✅ **Mitigation 1:** Test includes 3-second wait for async S3 cleanup
- ✅ **Mitigation 2:** Verification script checks S3 file count
- ✅ **Mitigation 3:** Test fails if any S3 files remain

---

### Task 6: User Deletion Flow - Trainer Relationships Removed (1 hour)

**Scenario 5 Implementation:** Customer deletes account → trainer relationships removed

**Test Code:**

```typescript
test('Scenario 5: Customer deletes account → trainer relationships removed', async ({ page }) => {
  // Arrange
  const customer = {
    email: 'cascade.customer.rel@test.com',
    password: 'TestPass123!',
    uuid: 'test-customer-uuid-005',
  };

  const trainer = {
    email: 'cascade.trainer@test.com',
    password: 'TestPass123!',
  };

  // Act 1: Verify customer exists in trainer's list
  await loginAsTrainer(page, trainer.email, trainer.password);
  await navigateToCustomerList(page);

  const customerExistsBefore = await page.locator(`text=${customer.email}`).isVisible();
  expect(customerExistsBefore).toBe(true);

  await logout(page);

  // Act 2: Delete customer account
  await loginAsCustomer(page, customer.email, customer.password);
  await deleteAccount(page);

  // Assert: Customer removed from trainer's list
  await loginAsTrainer(page, trainer.email, trainer.password);
  await navigateToCustomerList(page);

  const customerExistsAfter = await page.locator(`text=${customer.email}`).isVisible().catch(() => false);
  expect(customerExistsAfter).toBe(false);

  // Database verification
  const orphans = await verifyDatabaseOrphans(customer.uuid);
  expect(orphans.relationships).toBe(0);
});
```

**Acceptance Criteria:**
- [ ] Trainer-customer relationship removed from database
- [ ] Customer not visible in trainer's UI
- [ ] UI updates within 2 seconds
- [ ] No orphaned relationships
- [ ] Test passes 100%

---

### Task 7: Meal Plan Deletion - Grocery Lists Cascade (Linked Only) (1.5 hours)

**Scenario 6 Implementation:** Meal plan deletion cascades only linked grocery lists

**Test Code:**

```typescript
test('Scenario 6: Meal plan deletion → grocery lists cascade (linked only)', async ({ page }) => {
  // Arrange: Customer with 1 meal plan (2 linked grocery lists) + 1 standalone list
  const customer = {
    email: 'cascade.customer.mp@test.com',
    password: 'TestPass123!',
    uuid: 'test-customer-uuid-006',
  };

  const mealPlanId = 'test-meal-plan-001';

  // Act 1: Verify 3 grocery lists (2 linked, 1 standalone)
  await loginAsCustomer(page, customer.email, customer.password);
  await navigateToGroceryLists(page);

  const totalListsBefore = await page.locator('[data-testid="grocery-list-card"]').count();
  const linkedListsBefore = await page.locator('text=From Meal Plan:').count();
  const standaloneListsBefore = await page.locator('text=Standalone List').count();

  expect(totalListsBefore).toBe(3);
  expect(linkedListsBefore).toBe(2);
  expect(standaloneListsBefore).toBe(1);

  // Act 2: Delete meal plan
  await deleteMealPlan(page, mealPlanId);

  // Assert 1: Linked grocery lists deleted
  await navigateToGroceryLists(page);

  const totalListsAfter = await page.locator('[data-testid="grocery-list-card"]').count();
  const linkedListsAfter = await page.locator('text=From Meal Plan:').count();
  const standaloneListsAfter = await page.locator('text=Standalone List').count();

  expect(totalListsAfter).toBe(1); // Only standalone remains
  expect(linkedListsAfter).toBe(0); // Linked lists gone
  expect(standaloneListsAfter).toBe(1); // Standalone preserved

  // Assert 2: Standalone list functional
  await page.click('[data-testid="grocery-list-card"]:has-text("Standalone List")');
  await page.waitForSelector('[data-testid="grocery-list-items"]');

  const itemCount = await page.locator('[data-testid="grocery-list-item"]').count();
  expect(itemCount).toBeGreaterThan(0);
});
```

**Database Verification:**

```sql
-- Verify meal plan deleted
SELECT * FROM meal_plans WHERE id = 'test-meal-plan-001';
-- Expected: 0 rows

-- Verify linked grocery lists deleted
SELECT * FROM grocery_lists WHERE meal_plan_id = 'test-meal-plan-001';
-- Expected: 0 rows

-- Verify standalone list preserved
SELECT * FROM grocery_lists
WHERE customer_id = 'test-customer-uuid-006' AND meal_plan_id IS NULL;
-- Expected: 1 row
```

**Acceptance Criteria:**
- [ ] Meal plan deleted from database
- [ ] 2 linked grocery lists deleted
- [ ] 1 standalone grocery list preserved
- [ ] Standalone list remains fully functional
- [ ] No orphaned grocery list items
- [ ] UI updates within 2 seconds
- [ ] Test passes 100%

---

### Task 8: Meal Plan Deletion - Assignments Removed (1 hour)

**Scenario 7 Implementation:** Trainer removes meal plan assignment

**Test Code:**

```typescript
test('Scenario 7: Meal plan deletion → assignments removed', async ({ page }) => {
  // Arrange
  const trainer = {
    email: 'cascade.trainer@test.com',
    password: 'TestPass123!',
  };

  const customer = {
    email: 'cascade.customer.assign@test.com',
    password: 'TestPass123!',
  };

  const assignmentId = 'test-assignment-001';

  // Act 1: Verify assignment exists
  await loginAsTrainer(page, trainer.email, trainer.password);
  await navigateToCustomerList(page);
  await page.click(`text=${customer.email}`);

  const assignmentExists = await page.locator(`[data-assignment-id="${assignmentId}"]`).isVisible();
  expect(assignmentExists).toBe(true);

  // Act 2: Remove assignment
  await page.click(`[data-assignment-id="${assignmentId}"] button[aria-label="Options"]`);
  await page.click('button:has-text("Remove Assignment")');
  await page.click('button:has-text("Confirm Remove")');

  // Assert 1: Assignment removed from trainer view
  await page.waitForSelector('text=Assignment removed', { timeout: 3000 });

  const assignmentStillVisible = await page.locator(`[data-assignment-id="${assignmentId}"]`).isVisible().catch(() => false);
  expect(assignmentStillVisible).toBe(false);

  // Assert 2: Meal plan still exists (not deleted)
  await logout(page);
  await loginAsCustomer(page, customer.email, customer.password);
  await navigateToMealPlans(page);

  const mealPlanExists = await page.locator('[data-testid="meal-plan-card"]').count();
  expect(mealPlanExists).toBeGreaterThan(0);

  // Assert 3: Meal plan now unassigned (no "Assigned by" label)
  const assignedByLabel = await page.locator('text=Assigned by:').isVisible().catch(() => false);
  expect(assignedByLabel).toBe(false);
});
```

**Acceptance Criteria:**
- [ ] Assignment removed from database
- [ ] Assignment not visible to trainer
- [ ] Meal plan preserved (not deleted)
- [ ] Meal plan still accessible to customer
- [ ] Meal plan shows as unassigned
- [ ] UI updates within 2 seconds
- [ ] Test passes 100%

---

### Task 9: Trainer Deletion - Customer Relationships Removed (1.5 hours)

**Scenario 8 Implementation:** Trainer deletes account → relationships removed, customer data preserved

**Test Code:**

```typescript
test('Scenario 8: Trainer deletes account → relationships removed, customers preserved', async ({ page }) => {
  // Arrange
  const trainer = {
    email: 'cascade.trainer.del@test.com',
    password: 'TestPass123!',
    uuid: 'test-trainer-uuid-001',
  };

  const customer1 = {
    email: 'cascade.customer1@test.com',
    password: 'TestPass123!',
    uuid: 'test-customer1-uuid',
  };

  const customer2 = {
    email: 'cascade.customer2@test.com',
    password: 'TestPass123!',
    uuid: 'test-customer2-uuid',
  };

  // Act 1: Record customer data before trainer deletion
  await loginAsCustomer(page, customer1.email, customer1.password);
  const customer1DataBefore = await getDataCounts(customer1.uuid);
  await logout(page);

  // Act 2: Delete trainer account
  await loginAsTrainer(page, trainer.email, trainer.password);
  await deleteAccount(page);

  // Assert 1: Trainer deleted
  const trainerDeleted = await verifyUserDeleted(trainer.email);
  expect(trainerDeleted).toBe(true);

  // Assert 2: Customer accounts preserved
  await loginAsCustomer(page, customer1.email, customer1.password);
  const customer1DataAfter = await getDataCounts(customer1.uuid);

  expect(customer1DataAfter.mealPlans).toBe(customer1DataBefore.mealPlans);
  expect(customer1DataAfter.groceryLists).toBe(customer1DataBefore.groceryLists);
  expect(customer1DataAfter.measurements).toBe(customer1DataBefore.measurements);
  expect(customer1DataAfter.photos).toBe(customer1DataBefore.photos);

  await logout(page);

  // Assert 3: Customer 2 also preserved
  await loginAsCustomer(page, customer2.email, customer2.password);
  await navigateToMealPlans(page);

  const mealPlanCount = await page.locator('[data-testid="meal-plan-card"]').count();
  expect(mealPlanCount).toBeGreaterThan(0);
});
```

**Acceptance Criteria:**
- [ ] Trainer account deleted
- [ ] Trainer-customer relationships removed
- [ ] Customer accounts preserved
- [ ] Customer data (meal plans, grocery lists) preserved
- [ ] Customers can still login
- [ ] No orphaned relationships
- [ ] Test passes 100%

---

### Task 10: Trainer Deletion - Assignments Removed (1 hour)

**Scenario 9 Implementation:** Trainer deletes account → assignments removed, meal plans preserved

**Test Code:**

```typescript
test('Scenario 9: Trainer deletes account → assignments removed, meal plans preserved', async ({ page }) => {
  // Arrange
  const trainer = {
    email: 'cascade.trainer.assign@test.com',
    password: 'TestPass123!',
    uuid: 'test-trainer-uuid-002',
  };

  const customer = {
    email: 'cascade.customer.assign2@test.com',
    password: 'TestPass123!',
    uuid: 'test-customer-assign2-uuid',
  };

  // Act: Delete trainer
  await loginAsTrainer(page, trainer.email, trainer.password);
  await deleteAccount(page);

  // Assert: Meal plans still exist but unassigned
  await loginAsCustomer(page, customer.email, customer.password);
  await navigateToMealPlans(page);

  const mealPlanCount = await page.locator('[data-testid="meal-plan-card"]').count();
  expect(mealPlanCount).toBeGreaterThan(0);

  // Verify no "Assigned by" labels
  const assignedLabels = await page.locator('text=Assigned by:').count();
  expect(assignedLabels).toBe(0);
});
```

**Acceptance Criteria:**
- [ ] Trainer account deleted
- [ ] All meal plan assignments removed
- [ ] Customer meal plans preserved
- [ ] Meal plans now unassigned
- [ ] No orphaned assignments
- [ ] Test passes 100%

---

### Task 11: Data Isolation - Customer Deletion (1.5 hours)

**Scenario 10 Implementation:** Customer 1 deletes account, Customer 2 data untouched

**Test Code:**

```typescript
test('Scenario 10: Data isolation → Customer 1 deleted, Customer 2 untouched', async ({ page }) => {
  // Arrange
  const customer1 = {
    email: 'cascade.customer1.iso@test.com',
    password: 'TestPass123!',
    uuid: 'test-customer1-iso-uuid',
  };

  const customer2 = {
    email: 'cascade.customer2.iso@test.com',
    password: 'TestPass123!',
    uuid: 'test-customer2-iso-uuid',
  };

  // Act 1: Record Customer 2 data BEFORE Customer 1 deletion
  await loginAsCustomer(page, customer2.email, customer2.password);
  const customer2DataBefore = await getDataCounts(customer2.uuid);
  await page.screenshot({ path: 'test-results/scenario10-customer2-before.png' });
  await logout(page);

  // Act 2: Delete Customer 1
  await loginAsCustomer(page, customer1.email, customer1.password);
  await deleteAccount(page);

  // Assert 1: Customer 1 deleted
  const customer1Deleted = await verifyUserDeleted(customer1.email);
  expect(customer1Deleted).toBe(true);

  // Assert 2: Customer 2 data unchanged
  await loginAsCustomer(page, customer2.email, customer2.password);
  const customer2DataAfter = await getDataCounts(customer2.uuid);

  expect(customer2DataAfter.mealPlans).toBe(customer2DataBefore.mealPlans);
  expect(customer2DataAfter.groceryLists).toBe(customer2DataBefore.groceryLists);
  expect(customer2DataAfter.measurements).toBe(customer2DataBefore.measurements);
  expect(customer2DataAfter.photos).toBe(customer2DataBefore.photos);

  // Assert 3: Customer 2 UI fully functional
  await navigateToGroceryLists(page);
  await page.click('button:has-text("Create Grocery List")');
  await page.fill('input[name="listName"]', 'Test List - Data Isolation');
  await page.click('button:has-text("Create")');

  await page.waitForSelector('text=Grocery list created', { timeout: 3000 });

  await page.screenshot({ path: 'test-results/scenario10-customer2-after.png' });
});
```

**Acceptance Criteria:**
- [ ] Customer 1 deleted successfully
- [ ] Customer 2 account preserved
- [ ] Customer 2 data counts unchanged
- [ ] Customer 2 UI fully functional
- [ ] No data leakage between customers
- [ ] Test passes 100%

---

### Task 12: Data Isolation - Trainer Deletion (1 hour)

**Scenario 11 Implementation:** Trainer 1 deletes account, Trainer 2 data untouched

**Test Code:**

```typescript
test('Scenario 11: Data isolation → Trainer 1 deleted, Trainer 2 untouched', async ({ page }) => {
  // Arrange
  const trainer1 = {
    email: 'cascade.trainer1.iso@test.com',
    password: 'TestPass123!',
    uuid: 'test-trainer1-iso-uuid',
  };

  const trainer2 = {
    email: 'cascade.trainer2.iso@test.com',
    password: 'TestPass123!',
    uuid: 'test-trainer2-iso-uuid',
  };

  // Act 1: Record Trainer 2 customer count before deletion
  await loginAsTrainer(page, trainer2.email, trainer2.password);
  await navigateToCustomerList(page);

  const trainer2CustomersBefore = await page.locator('[data-testid="customer-card"]').count();
  await logout(page);

  // Act 2: Delete Trainer 1
  await loginAsTrainer(page, trainer1.email, trainer1.password);
  await deleteAccount(page);

  // Assert: Trainer 2 customers preserved
  await loginAsTrainer(page, trainer2.email, trainer2.password);
  await navigateToCustomerList(page);

  const trainer2CustomersAfter = await page.locator('[data-testid="customer-card"]').count();
  expect(trainer2CustomersAfter).toBe(trainer2CustomersBefore);

  // Verify functionality intact
  await page.click('button:has-text("Invite Customer")');
  await page.waitForSelector('[data-testid="invite-customer-modal"]');
});
```

**Acceptance Criteria:**
- [ ] Trainer 1 deleted successfully
- [ ] Trainer 2 account preserved
- [ ] Trainer 2 customer relationships preserved
- [ ] Trainer 2 assignments preserved
- [ ] Trainer 2 UI fully functional
- [ ] No data leakage between trainers
- [ ] Test passes 100%

---

## Test Data Management

### Seed Script Requirements

**File:** `scripts/seed-cascade-delete-test-data.js`

```javascript
/**
 * Seed Cascade Delete Test Data
 *
 * Creates comprehensive test data for cascade delete E2E tests:
 * - 3 test customers (with full profiles)
 * - 2 test trainers (with assigned customers)
 * - 15 meal plans
 * - 20 grocery lists (linked + standalone)
 * - 30 body measurements
 * - 15 progress photos (S3 files)
 */

import { db } from '../server/db/index.js';
import { users, mealPlans, groceryLists, progressMeasurements, progressPhotos } from '../shared/schema.js';
import bcrypt from 'bcryptjs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: process.env.AWS_REGION });

async function seedCascadeTestData() {
  console.log('🌱 Seeding cascade delete test data...');

  // Create customers
  const customer1 = await createCustomer({
    email: 'cascade.customer@test.com',
    password: 'TestPass123!',
    name: 'Cascade Test Customer',
  });

  const customer2 = await createCustomer({
    email: 'cascade.customer2.iso@test.com',
    password: 'TestPass123!',
    name: 'Cascade Test Customer 2',
  });

  // Create trainers
  const trainer1 = await createTrainer({
    email: 'cascade.trainer@test.com',
    password: 'TestPass123!',
    name: 'Cascade Test Trainer',
  });

  // Create meal plans
  await createMealPlans(customer1.id, 3);
  await createMealPlans(customer2.id, 3);

  // Create grocery lists
  await createGroceryLists(customer1.id, 5); // 3 linked, 2 standalone

  // Create measurements
  await createMeasurements(customer1.id, 10);
  await createMeasurements(customer2.id, 10);

  // Create progress photos (with S3 upload)
  await createProgressPhotos(customer1.id, 5);
  await createProgressPhotos(customer2.id, 5);

  // Create relationships
  await createTrainerCustomerRelationship(trainer1.id, customer1.id);

  console.log('✅ Cascade delete test data seeded successfully');
}

async function createCustomer({ email, password, name }) {
  const hashedPassword = await bcrypt.hash(password, 10);

  const [user] = await db.insert(users).values({
    email,
    password: hashedPassword,
    name,
    role: 'customer',
  }).returning();

  return user;
}

async function createTrainer({ email, password, name }) {
  const hashedPassword = await bcrypt.hash(password, 10);

  const [user] = await db.insert(users).values({
    email,
    password: hashedPassword,
    name,
    role: 'trainer',
  }).returning();

  return user;
}

async function createMealPlans(customerId, count) {
  for (let i = 0; i < count; i++) {
    await db.insert(mealPlans).values({
      customerId,
      name: `Test Meal Plan ${i + 1}`,
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
  }
}

async function createGroceryLists(customerId, count) {
  for (let i = 0; i < count; i++) {
    await db.insert(groceryLists).values({
      customerId,
      name: `Test Grocery List ${i + 1}`,
      mealPlanId: i < 3 ? 'meal-plan-uuid' : null, // First 3 linked, rest standalone
    });
  }
}

async function createMeasurements(customerId, count) {
  for (let i = 0; i < count; i++) {
    await db.insert(progressMeasurements).values({
      customerId,
      date: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000),
      weight: 180 - i,
      bodyFat: 20 - i * 0.5,
    });
  }
}

async function createProgressPhotos(customerId, count) {
  for (let i = 0; i < count; i++) {
    // Create dummy image buffer
    const imageBuffer = Buffer.from(`test-image-${i}`);

    // Upload to S3
    const s3Key = `progress/${customerId}/photo${i + 1}.jpg`;
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      Body: imageBuffer,
      ContentType: 'image/jpeg',
    }));

    // Create database record
    await db.insert(progressPhotos).values({
      customerId,
      s3Key,
      imageUrl: `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${s3Key}`,
      date: new Date(),
    });
  }
}

async function createTrainerCustomerRelationship(trainerId, customerId) {
  // Implementation depends on your schema
  console.log(`Creating relationship: trainer ${trainerId} → customer ${customerId}`);
}

// Run seed script
seedCascadeTestData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
```

### Cleanup Script Requirements

**File:** `scripts/cleanup-cascade-delete-test-data.js`

```javascript
/**
 * Cleanup Cascade Delete Test Data
 *
 * Removes all test data created for cascade delete E2E tests.
 * Includes S3 file cleanup.
 */

import { db } from '../server/db/index.js';
import { users } from '../shared/schema.js';
import { eq, like } from 'drizzle-orm';
import { S3Client, DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: process.env.AWS_REGION });

async function cleanupCascadeTestData() {
  console.log('🧹 Cleaning up cascade delete test data...');

  // Get all test users
  const testUsers = await db.select()
    .from(users)
    .where(like(users.email, 'cascade.%@test.com'));

  // Delete S3 files for each test customer
  for (const user of testUsers) {
    if (user.role === 'customer') {
      await deleteS3FilesForCustomer(user.id);
    }
  }

  // Delete test users (cascade deletes handle related data)
  await db.delete(users)
    .where(like(users.email, 'cascade.%@test.com'));

  console.log('✅ Cascade delete test data cleaned up successfully');
}

async function deleteS3FilesForCustomer(customerId) {
  const listCommand = new ListObjectsV2Command({
    Bucket: process.env.S3_BUCKET_NAME,
    Prefix: `progress/${customerId}/`,
  });

  const listResponse = await s3Client.send(listCommand);

  if (!listResponse.Contents || listResponse.Contents.length === 0) {
    console.log(`No S3 files to delete for customer ${customerId}`);
    return;
  }

  const deleteCommand = new DeleteObjectsCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Delete: {
      Objects: listResponse.Contents.map(obj => ({ Key: obj.Key })),
    },
  });

  await s3Client.send(deleteCommand);
  console.log(`Deleted ${listResponse.Contents.length} S3 files for customer ${customerId}`);
}

// Run cleanup script
cleanupCascadeTestData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  });
```

---

## Performance Requirements

### Performance Targets

| Metric | Target | Max Acceptable | Test Validation |
|--------|--------|----------------|-----------------|
| User deletion time | < 2s | < 5s | `expect(deletionTime).toBeLessThan(5000)` |
| UI update after deletion | < 1s | < 2s | `waitForSelector({ timeout: 2000 })` |
| S3 file cleanup | < 3s | < 5s | `await page.waitForTimeout(3000)` |
| Database cascade | < 2s | < 4s | Measured via API timing |
| Total test suite | < 45 min | < 60 min | Playwright test reporter |

### Performance Validation Code

```typescript
// Measure deletion time in tests
const startTime = Date.now();
await deleteAccount(page);
const deletionTime = Date.now() - startTime;
expect(deletionTime).toBeLessThan(5000); // 5s max

// Measure UI update time
const uiUpdateStart = Date.now();
await page.waitForURL('/login', { timeout: 2000 });
const uiUpdateTime = Date.now() - uiUpdateStart;
expect(uiUpdateTime).toBeLessThan(2000); // 2s max
```

---

## Definition of Done

### Implementation Complete When:
- [ ] 11/11 scenarios implemented with full test code
- [ ] All helper functions created and tested
- [ ] Database verification API endpoints functional
- [ ] S3 verification scripts working
- [ ] Test data seed/cleanup scripts operational
- [ ] All tests passing with 100% success rate

### Quality Gates Met When:
- [ ] Zero database orphans detected
- [ ] Zero S3 orphans detected
- [ ] Performance targets met (<5s deletion)
- [ ] Cross-browser validation passed
- [ ] Data isolation verified (Scenarios 10 & 11)
- [ ] Test documentation complete

### Production Ready When:
- [ ] All acceptance criteria met
- [ ] QA review completed (QA Gate: PASS)
- [ ] Code reviewed and approved
- [ ] Test results documented
- [ ] Screenshots/videos captured for key scenarios
- [ ] Committed to repository

---

## Estimated Effort Breakdown

| Task | Effort | Priority |
|------|--------|----------|
| 1. Setup + Helpers | 2h | P0 |
| 2. Scenario 1 (Meal Plans) | 1.5h | P0 |
| 3. Scenario 2 (Grocery Lists) | 1h | P0 |
| 4. Scenario 3 (Measurements) | 1h | P0 |
| 5. Scenario 4 (S3 Photos) | 2h | P0 |
| 6. Scenario 5 (Relationships) | 1h | P0 |
| 7. Scenario 6 (MP Delete GL) | 1.5h | P0 |
| 8. Scenario 7 (Assignments) | 1h | P0 |
| 9. Scenario 8 (Trainer Del Rels) | 1.5h | P0 |
| 10. Scenario 9 (Trainer Del Assigns) | 1h | P0 |
| 11. Scenario 10 (Customer Isolation) | 1.5h | P0 |
| 12. Scenario 11 (Trainer Isolation) | 1h | P0 |
| **TOTAL** | **15h** | **P0** |

**Sprint Planning:**
- **Sprint 1 (Week 1):** Tasks 1-6 (8.5 hours)
- **Sprint 2 (Week 2):** Tasks 7-12 (6.5 hours)

---

## Dependencies

### Infrastructure
- [ ] Docker development environment running
- [ ] PostgreSQL database accessible
- [ ] S3/DigitalOcean Spaces credentials configured
- [ ] Playwright installed and browsers downloaded

### Test Accounts
- [ ] Admin test account: `admin@fitmeal.pro`
- [ ] Trainer test account: `cascade.trainer@test.com`
- [ ] Customer test accounts created via seed script

### Database Schema
- [ ] All foreign keys have `ON DELETE CASCADE`
- [ ] Database migrations applied
- [ ] Test database clean state

### API Endpoints
- [ ] `/api/test/verify-orphans/:userId` endpoint created
- [ ] `/api/test/user-exists/:email` endpoint created
- [ ] `/api/test/data-counts/:userId` endpoint created

---

## Risks & Mitigation

### High-Risk Areas

#### 1. S3 File Deletion Failure (Risk: 9/10)
**Problem:** S3 delete may fail but database succeeds → orphaned files

**Mitigation:**
- ✅ Test includes 3-second wait for async S3 cleanup
- ✅ S3 verification script checks file count
- ✅ Test fails if any S3 files remain
- ✅ Background job retries S3 deletion (production)

#### 2. Race Conditions (Risk: 7/10)
**Problem:** Parallel test execution causes data conflicts

**Mitigation:**
- ✅ `test.describe.configure({ mode: 'serial' })` forces sequential execution
- ✅ Each test uses unique email addresses
- ✅ Cleanup script runs after all tests

#### 3. UI State Management (Risk: 6/10)
**Problem:** UI shows stale data after deletion

**Mitigation:**
- ✅ Tests explicitly verify UI updates
- ✅ Force refetch after deletion operations
- ✅ React Query invalidation tested

#### 4. Data Isolation Breach (Risk: 10/10 if occurs)
**Problem:** Wrong customer ID used → delete wrong user's data

**Mitigation:**
- ✅ Scenarios 10 & 11 explicitly test data isolation
- ✅ Before/after data count comparisons
- ✅ Database audit logging (production)

---

## Success Criteria

### Test Suite Health Metrics
- ✅ 11/11 scenarios passing = 100% success rate
- ✅ 0 flaky tests (no retries needed)
- ✅ < 60 minutes total runtime
- ✅ 100% database cleanup (0 orphans)
- ✅ 100% S3 cleanup (0 orphans)

### Quality Gate Decision

**PASS Criteria:**
- All 11 scenarios pass
- No orphaned database records
- No orphaned S3 files
- Performance < 5s per deletion
- UI updates < 2s

**CONCERNS Criteria:**
- 1-2 non-critical failures (e.g., UI timing issues)
- Performance slightly over target (5-7s)
- Minor UI inconsistencies

**FAIL Criteria:**
- Any scenario fails with data loss
- Orphaned database records detected
- S3 cleanup failures
- Data isolation breach
- Performance > 10s per deletion

---

## Execution Instructions

### Setup
```bash
# 1. Start Docker environment
docker-compose --profile dev up -d

# 2. Install Playwright browsers
npx playwright install chromium firefox webkit

# 3. Seed test data
node scripts/seed-cascade-delete-test-data.js

# 4. Verify S3 credentials
echo $AWS_ACCESS_KEY_ID
echo $S3_BUCKET_NAME
```

### Run Tests
```bash
# Run full test suite
npx playwright test test/e2e/cascade-deletes-e2e.spec.ts

# Run single scenario
npx playwright test test/e2e/cascade-deletes-e2e.spec.ts -g "Scenario 1"

# Run with UI mode (debugging)
npx playwright test test/e2e/cascade-deletes-e2e.spec.ts --ui

# Run across all browsers
npx playwright test test/e2e/cascade-deletes-e2e.spec.ts --project=chromium --project=firefox --project=webkit

# Generate HTML report
npx playwright test test/e2e/cascade-deletes-e2e.spec.ts --reporter=html
```

### Cleanup
```bash
# Clean up test data
node scripts/cleanup-cascade-delete-test-data.js

# Verify S3 cleanup
node scripts/verify-s3-cleanup.js test-customer-uuid-001

# Reset database to clean state
npm run db:reset:dev
```

---

## Additional Notes

### Cross-Browser Testing
- **Chromium:** Primary browser, fastest execution
- **Firefox:** Validate CSS/rendering differences
- **WebKit:** Validate Safari compatibility (important for mobile users)

### Test Data Strategy
- Use unique email addresses for each scenario
- Seed data before test suite starts (`test.beforeAll`)
- Clean up data after test suite completes (`test.afterAll`)
- Avoid test data conflicts by using UUIDs

### Debugging Tips
- Use `--headed` flag to watch tests execute in browser
- Use `--ui` flag for interactive debugging
- Add `await page.pause()` to pause execution
- Check screenshots in `test-results/` directory
- Review Playwright traces for failed tests

---

## References

- **QA Test Design:** `docs/qa/assessments/cascade-deletes-e2e-test-design.md`
- **Unit Tests:** `test/unit/services/cascadeDeletes.test.ts` (22 passing tests)
- **Database Schema:** `shared/schema.ts`
- **Playwright Docs:** https://playwright.dev/docs/intro

---

**Story Created By:** BMAD SM Agent (Story Master)
**Date:** January 21, 2025
**Priority:** P0 - CRITICAL
**Estimated Effort:** 15 hours
**QA Review Status:** ✅ APPROVED FOR IMPLEMENTATION
