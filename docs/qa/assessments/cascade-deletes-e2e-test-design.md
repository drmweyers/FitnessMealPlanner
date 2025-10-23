# Cascade Deletes E2E Test Design

**BMAD QA Agent:** Quinn
**Date:** January 21, 2025
**Test Type:** End-to-End Integration Test
**Priority:** P0 - CRITICAL (Data Integrity)
**Risk Level:** 10/10 (Data Loss Risk)
**Estimated Execution Time:** 45-60 minutes (full suite)

---

## Executive Summary

This document provides a comprehensive test design for validating cascade delete operations across the FitnessMealPlanner application. Cascade deletes are **mission-critical** as they ensure data integrity when users, meal plans, trainers, or recipes are deleted. Failure to properly implement cascade deletes can result in:

- **Orphaned database records** (data corruption)
- **Broken foreign key relationships** (application crashes)
- **S3 storage leaks** (cost escalation)
- **Privacy violations** (GDPR/data retention issues)
- **UI inconsistencies** (stale data shown to users)

**Coverage:**
- ✅ 22 passing unit tests (database logic)
- 🎯 11 E2E test scenarios (UI through database)
- 🎯 S3 file cleanup validation
- 🎯 Real-time UI state updates
- 🎯 Cross-role data isolation

---

## Test Objective

**Primary Goal:**
Validate complete cascade delete workflows from UI interaction through database cleanup and S3 file removal, ensuring no orphaned records or files remain after deletion operations.

**Success Criteria:**
- ✅ All 11 E2E scenarios pass with 100% success rate
- ✅ Zero orphaned database records detected
- ✅ Zero orphaned S3 files detected
- ✅ UI updates reflect deletions immediately (< 2s)
- ✅ Performance targets met (< 5s total deletion time)
- ✅ Data isolation maintained (no cross-customer/trainer leaks)

---

## Test Scope

### In Scope ✅

**User Deletion:**
- Customer account deletion complete flow
- All associated data cascade (meal plans, grocery lists, measurements, photos)
- S3 file cleanup (progress photos)
- Trainer relationship removal
- Assignment cleanup

**Meal Plan Deletion:**
- Meal plan deletion cascade
- Grocery list cleanup (linked only)
- Assignment removal
- Standalone grocery list preservation

**Trainer Deletion:**
- Trainer account deletion complete flow
- Customer relationship removal
- Assignment cleanup
- Customer data preservation

**UI Validation:**
- Real-time state updates after deletion
- Proper error handling
- User feedback (toasts/confirmations)
- Navigation after deletion

**Database Verification:**
- Foreign key constraint enforcement
- Cascade delete execution
- Data isolation validation
- No orphaned records

**S3 Storage:**
- Progress photo deletion
- Profile picture deletion
- Verification of file removal

### Out of Scope ❌

**Not Tested in This Suite:**
- Admin deletion workflows (not implemented)
- Recipe deletion (already covered in unit tests)
- Bulk deletion operations
- Undo/restore functionality
- Database transaction rollback scenarios
- Concurrent deletion conflicts (separate test suite)

---

## Test Architecture

### Tech Stack
- **E2E Framework:** Playwright
- **Frontend:** React (Vite)
- **Backend:** Express.js
- **Database:** PostgreSQL (Drizzle ORM)
- **Storage:** S3 (DigitalOcean Spaces)

### Test Data Requirements

#### Test Users
```typescript
// Customer with full profile
const testCustomer = {
  email: "cascade.customer@test.com",
  password: "TestPass123!",
  role: "customer",
  mealPlans: 3,
  groceryLists: 5,
  measurements: 10,
  progressPhotos: 5, // S3 files
};

// Trainer with assigned customers
const testTrainer = {
  email: "cascade.trainer@test.com",
  password: "TestPass123!",
  role: "trainer",
  assignedCustomers: 2,
  assignments: 4,
};

// Customer for trainer deletion test
const trainerCustomer = {
  email: "trainer.customer@test.com",
  password: "TestPass123!",
  role: "customer",
};
```

#### S3 Test Files
```typescript
// Progress photos with various sizes
const progressPhotos = [
  { name: "photo1.jpg", size: "100KB" },
  { name: "photo2.jpg", size: "500KB" },
  { name: "photo3.jpg", size: "1MB" },
  { name: "photo4.jpg", size: "2MB" },
  { name: "photo5.jpg", size: "5MB" },
];
```

### Test Environment Setup

**Prerequisites:**
```bash
# Start development environment
docker-compose --profile dev up -d

# Install Playwright browsers
npx playwright install chromium

# Seed test accounts
npm run seed:test-accounts

# Seed cascade delete test data
npm run seed:cascade-delete-test-data
```

**Teardown:**
```bash
# Clean up test data after suite
npm run cleanup:cascade-delete-test-data

# Verify S3 cleanup
node scripts/verify-s3-cleanup.js
```

---

## Test Scenarios (11 Total)

### Scenario 1: Customer Deletes Account - Meal Plans Cascade ✅

**Test ID:** `cascade-delete-e2e-001`
**Priority:** P0 - CRITICAL
**Estimated Duration:** 4 minutes

**Description:**
Customer deletes their account, all meal plans disappear from UI and database, trainer no longer sees customer in their list.

**Preconditions:**
- Customer account exists with 3 meal plans
- Trainer has assigned at least 1 meal plan to customer
- Customer is logged out

**Test Steps:**

1. **Login as customer**
   - Navigate to: `http://localhost:4000`
   - Enter email: `cascade.customer@test.com`
   - Enter password: `TestPass123!`
   - Click "Login" button
   - **Verify:** URL changes to `/customer`

2. **Verify meal plans exist**
   - Click "Meal Plans" navigation link
   - **Verify:** At least 3 meal plan cards visible
   - **Capture:** Screenshot of meal plans page
   - **Record:** Meal plan IDs for database verification

3. **Navigate to profile settings**
   - Click user profile icon (top-right)
   - Click "Settings" dropdown item
   - **Verify:** Settings page loads

4. **Initiate account deletion**
   - Scroll to "Danger Zone" section
   - Click "Delete Account" button
   - **Verify:** Confirmation modal appears

5. **Confirm deletion**
   - Read warning message
   - Type confirmation text: "DELETE"
   - Click "Confirm Delete" button
   - **Verify:** Loading spinner appears

6. **Verify automatic logout**
   - **Wait for:** Redirect to login page (max 5s)
   - **Verify:** URL is `/` or `/login`
   - **Verify:** Success toast: "Account deleted successfully"

7. **Verify customer cannot re-login**
   - Enter email: `cascade.customer@test.com`
   - Enter password: `TestPass123!`
   - Click "Login" button
   - **Verify:** Error message: "Invalid credentials"

8. **Login as trainer**
   - Enter email: `cascade.trainer@test.com`
   - Enter password: `TestPass123!`
   - Click "Login" button
   - **Verify:** Trainer dashboard loads

9. **Verify customer removed from trainer's customer list**
   - Click "Customers" navigation link
   - **Verify:** `cascade.customer@test.com` NOT in list
   - **Capture:** Screenshot of customer list

10. **Verify meal plan assignments removed**
    - Click "Meal Plans" navigation link
    - **Verify:** No assignments for deleted customer
    - **Verify:** No orphaned meal plan references

**Expected Results:**
- ✅ Customer account deleted from database
- ✅ All 3 customer meal plans deleted
- ✅ Customer cannot re-login
- ✅ Trainer no longer sees customer in list
- ✅ Meal plan assignments removed from trainer view
- ✅ No orphaned meal plan records in database
- ✅ UI updates reflect deletion within 2 seconds

**Database Verification Queries:**
```sql
-- Verify customer user deleted
SELECT * FROM users WHERE email = 'cascade.customer@test.com';
-- Expected: 0 rows

-- Verify all meal plans deleted
SELECT * FROM meal_plans WHERE customer_id = '[customer_uuid]';
-- Expected: 0 rows

-- Verify all assignments deleted
SELECT * FROM meal_plan_assignments WHERE customer_id = '[customer_uuid]';
-- Expected: 0 rows

-- Verify trainer-customer relationship deleted
SELECT * FROM trainer_customer_relationships WHERE customer_id = '[customer_uuid]';
-- Expected: 0 rows
```

**Acceptance Criteria:**
- [ ] Customer account deleted successfully
- [ ] All meal plans removed from UI
- [ ] All meal plans removed from database
- [ ] Customer cannot re-login
- [ ] Trainer view updated (customer gone)
- [ ] No database orphans detected
- [ ] UI updates within 2 seconds
- [ ] Performance: Total deletion time < 5s

---

### Scenario 2: Customer Deletes Account - Grocery Lists Cascade ✅

**Test ID:** `cascade-delete-e2e-002`
**Priority:** P0 - CRITICAL
**Estimated Duration:** 3 minutes

**Description:**
Customer deletes account, all grocery lists (both linked and standalone) disappear from UI and database.

**Preconditions:**
- Customer account exists with 5 grocery lists
- 3 grocery lists linked to meal plans
- 2 standalone grocery lists (no meal plan association)

**Test Steps:**

1. **Login as customer**
   - Navigate to: `http://localhost:4000`
   - Enter credentials for `cascade.customer@test.com`
   - Click "Login" button

2. **Verify grocery lists exist**
   - Click "Grocery Lists" navigation link
   - **Verify:** 5 grocery list cards visible
   - **Verify:** At least 3 show "From Meal Plan: [name]"
   - **Verify:** At least 2 show "Standalone List"
   - **Capture:** Screenshot of grocery lists page
   - **Record:** Grocery list IDs for database verification

3. **Navigate to profile settings**
   - Click user profile icon
   - Click "Settings"

4. **Delete account**
   - Click "Delete Account" button
   - Type confirmation: "DELETE"
   - Click "Confirm Delete"

5. **Verify logout and redirection**
   - **Wait for:** Redirect to login page
   - **Verify:** Success toast appears

6. **Verify customer cannot re-login**
   - Attempt login with deleted credentials
   - **Verify:** Error message appears

**Expected Results:**
- ✅ All 5 grocery lists deleted (linked + standalone)
- ✅ No grocery lists remain in database
- ✅ Deletion completes within 5 seconds

**Database Verification Queries:**
```sql
-- Verify all grocery lists deleted
SELECT * FROM grocery_lists WHERE customer_id = '[customer_uuid]';
-- Expected: 0 rows

-- Verify no orphaned grocery list items
SELECT gl.* FROM grocery_list_items gli
LEFT JOIN grocery_lists gl ON gli.grocery_list_id = gl.id
WHERE gl.id IS NULL;
-- Expected: 0 rows
```

**Acceptance Criteria:**
- [ ] All 5 grocery lists removed from UI
- [ ] All grocery lists removed from database
- [ ] Both linked and standalone lists deleted
- [ ] No orphaned grocery list items
- [ ] Performance: Deletion time < 5s

---

### Scenario 3: Customer Deletes Account - Measurements Cascade ✅

**Test ID:** `cascade-delete-e2e-003`
**Priority:** P0 - CRITICAL
**Estimated Duration:** 3 minutes

**Description:**
Customer deletes account, all body measurements disappear from UI and database.

**Preconditions:**
- Customer account exists with 10 body measurements
- Measurements span 3 months (historical data)

**Test Steps:**

1. **Login as customer**
   - Navigate to: `http://localhost:4000`
   - Enter credentials for `cascade.customer@test.com`
   - Click "Login" button

2. **Verify measurements exist**
   - Click "Progress" navigation link
   - Click "Measurements" tab
   - **Verify:** 10 measurement entries visible in table
   - **Verify:** Chart displays measurement trends
   - **Capture:** Screenshot of measurements page
   - **Record:** Measurement IDs for database verification

3. **Navigate to profile settings**
   - Click user profile icon
   - Click "Settings"

4. **Delete account**
   - Click "Delete Account" button
   - Type confirmation: "DELETE"
   - Click "Confirm Delete"

5. **Verify logout**
   - **Wait for:** Redirect to login page

**Expected Results:**
- ✅ All 10 measurements deleted from database
- ✅ No measurement records remain

**Database Verification Queries:**
```sql
-- Verify all measurements deleted
SELECT * FROM progress_measurements WHERE customer_id = '[customer_uuid]';
-- Expected: 0 rows
```

**Acceptance Criteria:**
- [ ] All measurements removed from database
- [ ] No orphaned measurement records
- [ ] Performance: Deletion time < 5s

---

### Scenario 4: Customer Deletes Account - Progress Photos + S3 Cleanup ✅

**Test ID:** `cascade-delete-e2e-004`
**Priority:** P0 - CRITICAL
**Risk Level:** 10/10 (S3 file cleanup failure = cost escalation)
**Estimated Duration:** 5 minutes

**Description:**
Customer deletes account, all progress photos disappear from UI, database records deleted, AND S3 files physically removed from cloud storage.

**Preconditions:**
- Customer account exists with 5 progress photos
- S3 files exist with keys: `progress/[customer_uuid]/photo[1-5].jpg`
- Total S3 storage: ~8.6 MB (100KB + 500KB + 1MB + 2MB + 5MB)

**Test Steps:**

1. **Login as customer**
   - Navigate to: `http://localhost:4000`
   - Enter credentials for `cascade.customer@test.com`
   - Click "Login" button

2. **Verify progress photos exist**
   - Click "Progress" navigation link
   - Click "Photos" tab
   - **Verify:** 5 photo thumbnails visible
   - **Verify:** Each photo loads (no broken images)
   - **Capture:** Screenshot of photos page
   - **Record:** Photo IDs and S3 keys for verification

3. **Verify S3 files exist before deletion**
   - **Execute script:** `node scripts/verify-s3-files-exist.js [customer_uuid]`
   - **Expected output:** "5 files found in S3"

4. **Navigate to profile settings**
   - Click user profile icon
   - Click "Settings"

5. **Delete account**
   - Click "Delete Account" button
   - Type confirmation: "DELETE"
   - Click "Confirm Delete"

6. **Wait for S3 cleanup (async operation)**
   - **Wait:** 5 seconds (S3 delete operations are async)

7. **Verify S3 files deleted**
   - **Execute script:** `node scripts/verify-s3-files-deleted.js [customer_uuid]`
   - **Expected output:** "0 files found in S3"

8. **Verify S3 cleanup in database log**
   - **Query:** `SELECT * FROM s3_cleanup_log WHERE customer_id = '[customer_uuid]'`
   - **Expected:** Log entry showing 5 files deleted successfully

**Expected Results:**
- ✅ All 5 progress photo database records deleted
- ✅ All 5 S3 files physically removed from cloud storage
- ✅ No orphaned S3 files remain
- ✅ S3 cleanup completes within 5 seconds
- ✅ S3 cleanup log entry created

**S3 Verification Commands:**
```bash
# Verify S3 files before deletion
aws s3 ls s3://evofitmeals/progress/[customer_uuid]/ --recursive
# Expected: 5 files listed

# Verify S3 files after deletion
aws s3 ls s3://evofitmeals/progress/[customer_uuid]/ --recursive
# Expected: 0 files (or "Unable to locate credentials" if path deleted)
```

**Database Verification Queries:**
```sql
-- Verify all progress photos deleted
SELECT * FROM progress_photos WHERE customer_id = '[customer_uuid]';
-- Expected: 0 rows

-- Verify S3 cleanup log
SELECT * FROM s3_cleanup_log WHERE customer_id = '[customer_uuid]' ORDER BY created_at DESC LIMIT 1;
-- Expected: 1 row with status = 'success', files_deleted = 5
```

**Acceptance Criteria:**
- [ ] All photo database records deleted
- [ ] All S3 files physically removed
- [ ] S3 verification script confirms deletion
- [ ] S3 cleanup log entry exists
- [ ] No orphaned S3 files
- [ ] Performance: S3 cleanup < 5s

**High Risk Mitigation:**
- ⚠️ **Risk:** S3 delete may fail but DB succeeds (orphaned files)
- ✅ **Mitigation 1:** Background job retries S3 deletion
- ✅ **Mitigation 2:** S3 cleanup log tracks failures
- ✅ **Mitigation 3:** Weekly cron job scans for orphaned S3 files
- ✅ **Mitigation 4:** Test includes S3 verification script

---

### Scenario 5: Customer Deletes Account - Trainer Relationships Removed ✅

**Test ID:** `cascade-delete-e2e-005`
**Priority:** P0 - CRITICAL
**Estimated Duration:** 4 minutes

**Description:**
Customer deletes account, trainer-customer relationship disappears, customer no longer in trainer's customer list.

**Preconditions:**
- Customer account exists
- Customer assigned to 1 trainer
- Trainer has customer relationship with customer

**Test Steps:**

1. **Login as trainer**
   - Navigate to: `http://localhost:4000`
   - Enter credentials for `cascade.trainer@test.com`
   - Click "Login" button

2. **Verify customer exists in trainer's list**
   - Click "Customers" navigation link
   - **Verify:** `cascade.customer@test.com` visible in customer list
   - **Capture:** Screenshot of customer list
   - **Record:** Customer ID

3. **Logout as trainer**
   - Click user profile icon
   - Click "Logout"

4. **Login as customer**
   - Enter credentials for `cascade.customer@test.com`
   - Click "Login" button

5. **Delete customer account**
   - Navigate to Settings
   - Click "Delete Account"
   - Type confirmation: "DELETE"
   - Click "Confirm Delete"

6. **Login as trainer again**
   - Navigate to: `http://localhost:4000`
   - Enter credentials for `cascade.trainer@test.com`
   - Click "Login" button

7. **Verify customer removed from trainer's list**
   - Click "Customers" navigation link
   - **Verify:** `cascade.customer@test.com` NOT in list
   - **Capture:** Screenshot showing customer gone

**Expected Results:**
- ✅ Trainer-customer relationship deleted
- ✅ Customer no longer in trainer's UI
- ✅ Deletion completes within 2 seconds

**Database Verification Queries:**
```sql
-- Verify trainer-customer relationship deleted
SELECT * FROM trainer_customer_relationships
WHERE customer_id = '[customer_uuid]' AND trainer_id = '[trainer_uuid]';
-- Expected: 0 rows
```

**Acceptance Criteria:**
- [ ] Trainer-customer relationship removed
- [ ] Customer not visible in trainer's list
- [ ] UI updates within 2 seconds
- [ ] No database orphans

---

### Scenario 6: Meal Plan Deletion - Grocery Lists Cascade (Linked Only) ✅

**Test ID:** `cascade-delete-e2e-006`
**Priority:** P0 - CRITICAL
**Estimated Duration:** 3 minutes

**Description:**
Customer deletes meal plan, only grocery lists LINKED to that meal plan are deleted. Standalone grocery lists are preserved.

**Preconditions:**
- Customer account exists
- Customer has 1 meal plan with 2 linked grocery lists
- Customer has 1 standalone grocery list (no meal plan association)

**Test Steps:**

1. **Login as customer**
   - Navigate to: `http://localhost:4000`
   - Enter credentials for `cascade.customer@test.com`
   - Click "Login" button

2. **Verify grocery lists before deletion**
   - Click "Grocery Lists" navigation link
   - **Verify:** 3 grocery lists visible
     - 2 showing "From Meal Plan: [name]"
     - 1 showing "Standalone List"
   - **Record:** Grocery list IDs

3. **Navigate to meal plans**
   - Click "Meal Plans" navigation link
   - **Verify:** At least 1 meal plan card visible

4. **Delete meal plan**
   - Click "⋮" (options menu) on meal plan card
   - Click "Delete Meal Plan"
   - **Verify:** Confirmation modal appears
   - Click "Confirm Delete"
   - **Verify:** Success toast: "Meal plan deleted"

5. **Verify linked grocery lists deleted**
   - Click "Grocery Lists" navigation link
   - **Verify:** Only 1 grocery list remains (standalone)
   - **Verify:** 2 linked grocery lists are GONE

6. **Verify standalone grocery list preserved**
   - **Verify:** Standalone list still shows all items
   - Click into standalone list
   - **Verify:** Items are intact and functional

**Expected Results:**
- ✅ Meal plan deleted from database
- ✅ 2 linked grocery lists deleted
- ✅ 1 standalone grocery list preserved
- ✅ Standalone list remains fully functional

**Database Verification Queries:**
```sql
-- Verify meal plan deleted
SELECT * FROM meal_plans WHERE id = '[meal_plan_uuid]';
-- Expected: 0 rows

-- Verify linked grocery lists deleted
SELECT * FROM grocery_lists WHERE meal_plan_id = '[meal_plan_uuid]';
-- Expected: 0 rows

-- Verify standalone grocery list preserved
SELECT * FROM grocery_lists WHERE customer_id = '[customer_uuid]' AND meal_plan_id IS NULL;
-- Expected: 1 row
```

**Acceptance Criteria:**
- [ ] Meal plan deleted
- [ ] Linked grocery lists deleted
- [ ] Standalone grocery list preserved
- [ ] No orphaned grocery list items
- [ ] UI updates within 2 seconds

**Edge Case Validation:**
- ✅ Standalone grocery lists NOT deleted
- ✅ Only grocery lists with `meal_plan_id = [deleted_plan_id]` are removed

---

### Scenario 7: Meal Plan Deletion - Assignments Removed ✅

**Test ID:** `cascade-delete-e2e-007`
**Priority:** P0 - CRITICAL
**Estimated Duration:** 4 minutes

**Description:**
Trainer deletes meal plan assignment, assignment disappears from both trainer's and customer's views.

**Preconditions:**
- Trainer account exists
- Customer account exists
- Trainer has assigned 1 meal plan to customer

**Test Steps:**

1. **Login as trainer**
   - Navigate to: `http://localhost:4000`
   - Enter credentials for `cascade.trainer@test.com`
   - Click "Login" button

2. **Verify assignment exists**
   - Click "Customers" navigation link
   - Click on customer: `cascade.customer@test.com`
   - **Verify:** "Assigned Meal Plans" section shows 1 meal plan
   - **Record:** Assignment ID

3. **Delete meal plan assignment**
   - Click "⋮" (options menu) on assigned meal plan
   - Click "Remove Assignment"
   - **Verify:** Confirmation modal appears
   - Click "Confirm Remove"
   - **Verify:** Success toast: "Assignment removed"

4. **Verify assignment removed from trainer's view**
   - **Verify:** Assigned meal plan no longer visible
   - Refresh page
   - **Verify:** Assignment still not visible

5. **Logout as trainer**
   - Click user profile icon
   - Click "Logout"

6. **Login as customer**
   - Enter credentials for `cascade.customer@test.com`
   - Click "Login" button

7. **Verify meal plan no longer assigned**
   - Click "Meal Plans" navigation link
   - **Verify:** Meal plan still exists (not deleted, just unassigned)
   - **Verify:** "Assigned by: [Trainer Name]" label is GONE
   - **Verify:** Meal plan shows as customer's own plan

**Expected Results:**
- ✅ Assignment removed from database
- ✅ Assignment no longer in trainer's view
- ✅ Meal plan preserved (not deleted)
- ✅ Meal plan now unassigned (belongs to customer)

**Database Verification Queries:**
```sql
-- Verify assignment deleted
SELECT * FROM meal_plan_assignments WHERE id = '[assignment_uuid]';
-- Expected: 0 rows

-- Verify meal plan still exists
SELECT * FROM meal_plans WHERE id = '[meal_plan_uuid]';
-- Expected: 1 row

-- Verify meal plan ownership unchanged
SELECT * FROM meal_plans WHERE id = '[meal_plan_uuid]' AND customer_id = '[customer_uuid]';
-- Expected: 1 row
```

**Acceptance Criteria:**
- [ ] Assignment removed from database
- [ ] Assignment not visible to trainer
- [ ] Meal plan preserved
- [ ] Meal plan still accessible to customer
- [ ] UI updates within 2 seconds

---

### Scenario 8: Trainer Deletes Account - Customer Relationships Removed ✅

**Test ID:** `cascade-delete-e2e-008`
**Priority:** P0 - CRITICAL
**Estimated Duration:** 4 minutes

**Description:**
Trainer deletes account, all trainer-customer relationships removed, but customer accounts and data preserved.

**Preconditions:**
- Trainer account exists with 2 assigned customers
- Customers have data (meal plans, grocery lists, etc.)

**Test Steps:**

1. **Login as customer 1**
   - Navigate to: `http://localhost:4000`
   - Enter credentials for `cascade.customer1@test.com`
   - Click "Login" button

2. **Verify customer 1 has data**
   - Click "Meal Plans" navigation link
   - **Verify:** At least 1 meal plan exists
   - **Record:** Customer 1 meal plan count

3. **Logout as customer 1**
   - Click user profile icon
   - Click "Logout"

4. **Login as trainer**
   - Enter credentials for `cascade.trainer@test.com`
   - Click "Login" button

5. **Verify trainer has 2 customers**
   - Click "Customers" navigation link
   - **Verify:** 2 customer cards visible
   - **Capture:** Screenshot

6. **Delete trainer account**
   - Navigate to Settings
   - Click "Delete Account"
   - Type confirmation: "DELETE"
   - Click "Confirm Delete"

7. **Verify trainer cannot re-login**
   - Attempt login with deleted trainer credentials
   - **Verify:** Error message: "Invalid credentials"

8. **Login as customer 1 again**
   - Navigate to: `http://localhost:4000`
   - Enter credentials for `cascade.customer1@test.com`
   - Click "Login" button

9. **Verify customer 1 data preserved**
   - Click "Meal Plans" navigation link
   - **Verify:** All meal plans still exist (same count as step 2)
   - Click "Grocery Lists" navigation link
   - **Verify:** All grocery lists still exist

10. **Verify trainer relationship removed**
    - Navigate to "Profile" or "Settings"
    - **Verify:** No trainer information shown
    - **Verify:** "Assigned Trainer: None" or similar message

**Expected Results:**
- ✅ Trainer account deleted
- ✅ Trainer-customer relationships deleted
- ✅ Customer accounts preserved
- ✅ Customer data (meal plans, grocery lists) preserved
- ✅ Customer no longer linked to deleted trainer

**Database Verification Queries:**
```sql
-- Verify trainer deleted
SELECT * FROM users WHERE email = 'cascade.trainer@test.com';
-- Expected: 0 rows

-- Verify trainer-customer relationships deleted
SELECT * FROM trainer_customer_relationships WHERE trainer_id = '[trainer_uuid]';
-- Expected: 0 rows

-- Verify customer accounts preserved
SELECT * FROM users WHERE email IN ('cascade.customer1@test.com', 'cascade.customer2@test.com');
-- Expected: 2 rows

-- Verify customer meal plans preserved
SELECT * FROM meal_plans WHERE customer_id IN ('[customer1_uuid]', '[customer2_uuid]');
-- Expected: > 0 rows (customer data intact)
```

**Acceptance Criteria:**
- [ ] Trainer account deleted
- [ ] Trainer-customer relationships removed
- [ ] Customer accounts preserved
- [ ] Customer data preserved
- [ ] Trainer cannot re-login
- [ ] Customers can still login
- [ ] No orphaned relationships

---

### Scenario 9: Trainer Deletes Account - Assignments Removed ✅

**Test ID:** `cascade-delete-e2e-009`
**Priority:** P0 - CRITICAL
**Estimated Duration:** 4 minutes

**Description:**
Trainer deletes account, all meal plan assignments created by trainer are removed, but customer meal plans preserved.

**Preconditions:**
- Trainer account exists
- Trainer has assigned 2 meal plans to 2 different customers

**Test Steps:**

1. **Login as trainer**
   - Navigate to: `http://localhost:4000`
   - Enter credentials for `cascade.trainer@test.com`
   - Click "Login" button

2. **Verify assignments exist**
   - Click "Customers" navigation link
   - Click on customer 1
   - **Verify:** At least 1 assigned meal plan visible
   - **Record:** Assignment count for customer 1
   - Go back to customers list
   - Click on customer 2
   - **Verify:** At least 1 assigned meal plan visible
   - **Record:** Assignment count for customer 2

3. **Delete trainer account**
   - Navigate to Settings
   - Click "Delete Account"
   - Type confirmation: "DELETE"
   - Click "Confirm Delete"

4. **Login as customer 1**
   - Navigate to: `http://localhost:4000`
   - Enter credentials for customer 1
   - Click "Login" button

5. **Verify meal plans still exist but unassigned**
   - Click "Meal Plans" navigation link
   - **Verify:** All meal plans still exist
   - **Verify:** No "Assigned by: [Trainer Name]" labels
   - **Verify:** Meal plans now show as customer's own plans

6. **Logout and login as customer 2**
   - Repeat step 5 for customer 2

**Expected Results:**
- ✅ Trainer account deleted
- ✅ All meal plan assignments removed
- ✅ Customer meal plans preserved
- ✅ Meal plans now unassigned (belong to customers)

**Database Verification Queries:**
```sql
-- Verify trainer deleted
SELECT * FROM users WHERE email = 'cascade.trainer@test.com';
-- Expected: 0 rows

-- Verify all assignments by trainer deleted
SELECT * FROM meal_plan_assignments WHERE trainer_id = '[trainer_uuid]';
-- Expected: 0 rows

-- Verify customer meal plans preserved
SELECT * FROM meal_plans WHERE customer_id IN ('[customer1_uuid]', '[customer2_uuid]');
-- Expected: > 0 rows (meal plans intact)
```

**Acceptance Criteria:**
- [ ] Trainer account deleted
- [ ] All assignments removed
- [ ] Customer meal plans preserved
- [ ] Meal plans now unassigned
- [ ] No orphaned assignments

---

### Scenario 10: Data Isolation - Customer Deletion Does Not Affect Other Customers ✅

**Test ID:** `cascade-delete-e2e-010`
**Priority:** P0 - CRITICAL (Data Isolation)
**Estimated Duration:** 5 minutes

**Description:**
Customer 1 deletes account, Customer 2's data remains completely untouched and functional.

**Preconditions:**
- Customer 1 account exists with full profile
- Customer 2 account exists with full profile
- Both customers have meal plans, grocery lists, measurements
- Both customers assigned to same trainer

**Test Steps:**

1. **Login as customer 2**
   - Navigate to: `http://localhost:4000`
   - Enter credentials for `cascade.customer2@test.com`
   - Click "Login" button

2. **Record customer 2 data before deletion**
   - Click "Meal Plans" → **Record:** Meal plan count
   - Click "Grocery Lists" → **Record:** Grocery list count
   - Click "Progress" → "Measurements" → **Record:** Measurement count
   - Click "Progress" → "Photos" → **Record:** Photo count
   - **Capture:** Screenshots of all pages

3. **Logout as customer 2**
   - Click user profile icon
   - Click "Logout"

4. **Login as customer 1**
   - Enter credentials for `cascade.customer1@test.com`
   - Click "Login" button

5. **Delete customer 1 account**
   - Navigate to Settings
   - Click "Delete Account"
   - Type confirmation: "DELETE"
   - Click "Confirm Delete"

6. **Login as customer 2 again**
   - Navigate to: `http://localhost:4000`
   - Enter credentials for `cascade.customer2@test.com`
   - Click "Login" button

7. **Verify customer 2 data unchanged**
   - Click "Meal Plans"
   - **Verify:** Meal plan count matches step 2
   - Click "Grocery Lists"
   - **Verify:** Grocery list count matches step 2
   - Click "Progress" → "Measurements"
   - **Verify:** Measurement count matches step 2
   - Click "Progress" → "Photos"
   - **Verify:** Photo count matches step 2

8. **Verify customer 2 functionality intact**
   - Create new grocery list
   - **Verify:** Creation succeeds
   - Add item to grocery list
   - **Verify:** Item added successfully
   - Navigate to meal plans
   - Click on meal plan
   - **Verify:** Meal plan details load correctly

**Expected Results:**
- ✅ Customer 1 account deleted
- ✅ Customer 2 account and data completely untouched
- ✅ Customer 2 meal plans intact
- ✅ Customer 2 grocery lists intact
- ✅ Customer 2 measurements intact
- ✅ Customer 2 photos intact
- ✅ Customer 2 functionality fully operational

**Database Verification Queries:**
```sql
-- Verify customer 1 deleted
SELECT * FROM users WHERE email = 'cascade.customer1@test.com';
-- Expected: 0 rows

-- Verify customer 2 preserved
SELECT * FROM users WHERE email = 'cascade.customer2@test.com';
-- Expected: 1 row

-- Verify customer 2 data counts unchanged
SELECT
  (SELECT COUNT(*) FROM meal_plans WHERE customer_id = '[customer2_uuid]') as meal_plans,
  (SELECT COUNT(*) FROM grocery_lists WHERE customer_id = '[customer2_uuid]') as grocery_lists,
  (SELECT COUNT(*) FROM progress_measurements WHERE customer_id = '[customer2_uuid]') as measurements,
  (SELECT COUNT(*) FROM progress_photos WHERE customer_id = '[customer2_uuid]') as photos;
-- Expected: Counts match pre-deletion values
```

**Acceptance Criteria:**
- [ ] Customer 1 deleted successfully
- [ ] Customer 2 account preserved
- [ ] Customer 2 data counts unchanged
- [ ] Customer 2 UI fully functional
- [ ] No data leakage between customers
- [ ] No accidental cascade to wrong customer

**High Risk Validation:**
- ⚠️ **Risk:** Wrong customer ID used in WHERE clause (catastrophic data loss)
- ✅ **Mitigation:** Verify customer 2 data before and after deletion
- ✅ **Mitigation:** Database audit log review

---

### Scenario 11: Data Isolation - Trainer Deletion Does Not Affect Other Trainers ✅

**Test ID:** `cascade-delete-e2e-011`
**Priority:** P0 - CRITICAL (Data Isolation)
**Estimated Duration:** 5 minutes

**Description:**
Trainer 1 deletes account, Trainer 2's customers and assignments remain completely untouched.

**Preconditions:**
- Trainer 1 account exists with 2 assigned customers
- Trainer 2 account exists with 2 assigned customers
- Both trainers have active meal plan assignments

**Test Steps:**

1. **Login as trainer 2**
   - Navigate to: `http://localhost:4000`
   - Enter credentials for `cascade.trainer2@test.com`
   - Click "Login" button

2. **Record trainer 2 data before deletion**
   - Click "Customers" navigation link
   - **Record:** Customer count (should be 2)
   - Click on each customer
   - **Record:** Assignment counts for each customer
   - **Capture:** Screenshots

3. **Logout as trainer 2**
   - Click user profile icon
   - Click "Logout"

4. **Login as trainer 1**
   - Enter credentials for `cascade.trainer1@test.com`
   - Click "Login" button

5. **Delete trainer 1 account**
   - Navigate to Settings
   - Click "Delete Account"
   - Type confirmation: "DELETE"
   - Click "Confirm Delete"

6. **Login as trainer 2 again**
   - Navigate to: `http://localhost:4000`
   - Enter credentials for `cascade.trainer2@test.com`
   - Click "Login" button

7. **Verify trainer 2 customers unchanged**
   - Click "Customers" navigation link
   - **Verify:** Customer count still 2
   - Click on each customer
   - **Verify:** Assignment counts match step 2

8. **Verify trainer 2 functionality intact**
   - Click "Create Meal Plan" button
   - **Verify:** Modal opens correctly
   - Navigate to customer profile
   - Click "Assign Meal Plan"
   - **Verify:** Assignment functionality works

**Expected Results:**
- ✅ Trainer 1 account deleted
- ✅ Trainer 2 account and relationships untouched
- ✅ Trainer 2 customers preserved
- ✅ Trainer 2 assignments preserved
- ✅ Trainer 2 functionality fully operational

**Database Verification Queries:**
```sql
-- Verify trainer 1 deleted
SELECT * FROM users WHERE email = 'cascade.trainer1@test.com';
-- Expected: 0 rows

-- Verify trainer 2 preserved
SELECT * FROM users WHERE email = 'cascade.trainer2@test.com';
-- Expected: 1 row

-- Verify trainer 2 relationships preserved
SELECT * FROM trainer_customer_relationships WHERE trainer_id = '[trainer2_uuid]';
-- Expected: 2 rows

-- Verify trainer 2 assignments preserved
SELECT * FROM meal_plan_assignments WHERE trainer_id = '[trainer2_uuid]';
-- Expected: > 0 rows (assignments intact)
```

**Acceptance Criteria:**
- [ ] Trainer 1 deleted successfully
- [ ] Trainer 2 account preserved
- [ ] Trainer 2 customer relationships preserved
- [ ] Trainer 2 assignments preserved
- [ ] Trainer 2 UI fully functional
- [ ] No data leakage between trainers

---

## Performance Requirements

| Metric | Target | Max Acceptable | Monitoring |
|--------|--------|----------------|------------|
| User deletion time | < 2s | < 5s | Playwright performance API |
| UI update after deletion | < 1s | < 2s | waitForSelector timeout |
| S3 file cleanup | < 3s | < 5s | S3 API response time |
| Database cascade completion | < 2s | < 4s | Database query timing |
| Total E2E test suite runtime | < 45 min | < 60 min | Playwright test reporter |

**Performance Validation:**
```typescript
// Example performance check in test
const startTime = Date.now();
await page.click('button:has-text("Delete Account")');
await page.waitForURL('/login', { timeout: 5000 });
const deletionTime = Date.now() - startTime;
expect(deletionTime).toBeLessThan(5000); // 5s max
```

---

## Acceptance Criteria (Complete Test Suite)

### Functional Criteria ✅
- [ ] All 11 scenarios pass with 100% success rate
- [ ] No orphaned database records detected across all tests
- [ ] No orphaned S3 files detected
- [ ] UI updates reflect deletions immediately (< 2s)
- [ ] Data isolation maintained (no cross-customer/trainer leaks)
- [ ] Foreign key constraints enforced correctly

### Performance Criteria ⚡
- [ ] User deletion completes in < 5 seconds
- [ ] Meal plan deletion completes in < 3 seconds
- [ ] S3 cleanup completes in < 5 seconds
- [ ] UI updates complete in < 2 seconds
- [ ] Total test suite runs in < 60 minutes

### Database Criteria 🗄️
- [ ] All CASCADE DELETE constraints working
- [ ] No orphaned records in any table
- [ ] Foreign key relationships intact
- [ ] Database audit logs accurate

### S3 Storage Criteria ☁️
- [ ] All S3 files deleted when user deleted
- [ ] S3 cleanup log entries accurate
- [ ] No orphaned S3 files remain
- [ ] S3 API calls succeed (no 500 errors)

### UI/UX Criteria 🎨
- [ ] Success toasts appear after deletion
- [ ] Confirmation modals prevent accidental deletion
- [ ] Loading indicators show during deletion
- [ ] Error handling for failed deletions
- [ ] Graceful logout after account deletion

---

## Risk Assessment

### High Risk Areas (Priority Mitigation)

#### 1. S3 File Deletion Failure (Risk: 9/10)
**Problem:** S3 delete may fail but database succeeds → orphaned files → cost escalation

**Mitigation Strategies:**
- ✅ Background job retries S3 deletion (3 attempts)
- ✅ S3 cleanup log tracks failures
- ✅ Weekly cron job scans for orphaned S3 files
- ✅ E2E test includes S3 verification script
- ✅ S3 lifecycle policy (delete after 90 days if orphaned)

**Test Coverage:**
- Scenario 4: Explicit S3 cleanup validation
- S3 verification scripts

#### 2. Race Conditions During Concurrent Deletions (Risk: 7/10)
**Problem:** Two users delete same resource simultaneously → database deadlock or partial deletion

**Mitigation Strategies:**
- ✅ Database transaction isolation level: SERIALIZABLE
- ✅ Optimistic locking with row versioning
- ✅ Retry logic for deadlock detection
- ✅ User feedback during concurrent operations

**Test Coverage:**
- Separate test suite: `cascade-deletes-concurrent.spec.ts` (out of scope here)

#### 3. UI State Management After Deletion (Risk: 6/10)
**Problem:** UI shows stale data after deletion (cached state not invalidated)

**Mitigation Strategies:**
- ✅ Force refetch after deletion
- ✅ React Query invalidation
- ✅ Optimistic UI updates with rollback
- ✅ E2E tests verify UI updates immediately

**Test Coverage:**
- All scenarios verify UI updates within 2 seconds
- Explicit refetch verification steps

#### 4. Foreign Key Constraint Violations (Risk: 5/10)
**Problem:** DELETE operation fails due to missing CASCADE or SET NULL

**Mitigation Strategies:**
- ✅ Database schema review: All FKs have ON DELETE CASCADE
- ✅ Unit tests for FK enforcement (22 passing tests)
- ✅ E2E tests verify cascade behavior

**Test Coverage:**
- Unit tests: `cascadeDeletes.test.ts` (22 tests)
- E2E: All 11 scenarios

#### 5. Data Isolation Breach (Risk: 10/10 if occurs, low probability)
**Problem:** Wrong customer/trainer ID used in WHERE clause → delete wrong user's data

**Mitigation Strategies:**
- ✅ Parameterized queries (no SQL injection)
- ✅ Authorization middleware (verify ownership)
- ✅ Database audit log for all deletions
- ✅ E2E tests explicitly verify data isolation (Scenarios 10 & 11)

**Test Coverage:**
- Scenario 10: Customer isolation
- Scenario 11: Trainer isolation

---

## Test Environment Configuration

### Database Setup
```sql
-- Enable cascading deletes (verify schema)
ALTER TABLE meal_plans
  DROP CONSTRAINT IF EXISTS meal_plans_customer_id_fkey,
  ADD CONSTRAINT meal_plans_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE grocery_lists
  DROP CONSTRAINT IF EXISTS grocery_lists_customer_id_fkey,
  ADD CONSTRAINT grocery_lists_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE progress_measurements
  DROP CONSTRAINT IF EXISTS progress_measurements_customer_id_fkey,
  ADD CONSTRAINT progress_measurements_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE progress_photos
  DROP CONSTRAINT IF EXISTS progress_photos_customer_id_fkey,
  ADD CONSTRAINT progress_photos_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE meal_plan_assignments
  DROP CONSTRAINT IF EXISTS meal_plan_assignments_customer_id_fkey,
  ADD CONSTRAINT meal_plan_assignments_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE trainer_customer_relationships
  DROP CONSTRAINT IF EXISTS trainer_customer_relationships_customer_id_fkey,
  ADD CONSTRAINT trainer_customer_relationships_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE;
```

### S3 Configuration
```typescript
// S3 verification script
// scripts/verify-s3-files-deleted.js
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const s3Client = new S3Client({ region: "us-east-1" });

async function verifyS3Cleanup(customerUuid) {
  const command = new ListObjectsV2Command({
    Bucket: "evofitmeals",
    Prefix: `progress/${customerUuid}/`,
  });

  const response = await s3Client.send(command);
  const fileCount = response.Contents?.length || 0;

  console.log(`${fileCount} files found in S3 for customer ${customerUuid}`);
  return fileCount;
}

// Usage in test
const fileCount = await verifyS3Cleanup(customerUuid);
expect(fileCount).toBe(0);
```

### Playwright Configuration
```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './test/e2e',
  timeout: 60000, // 60s per test (includes S3 wait time)
  retries: 1, // Retry once on failure
  use: {
    baseURL: 'http://localhost:4000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'cascade-deletes',
      testMatch: /cascade-deletes-e2e\.spec\.ts/,
    },
  ],
});
```

---

## Success Metrics

### Test Suite Health
- ✅ 11/11 scenarios passing = 100% success rate
- ✅ 0 flaky tests (retries not needed)
- ✅ < 60 minutes total runtime
- ✅ 100% database cleanup (0 orphans)
- ✅ 100% S3 cleanup (0 orphans)

### Production Readiness Indicators
- ✅ Zero critical bugs found
- ✅ Performance targets met
- ✅ Data isolation verified
- ✅ UI consistency validated
- ✅ Foreign key constraints enforced

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

# 2. Install Playwright
npx playwright install chromium

# 3. Seed test accounts
npm run seed:cascade-delete-test-data

# 4. Verify S3 credentials
npm run verify:s3-credentials
```

### Run Tests
```bash
# Run full test suite
npx playwright test test/e2e/cascade-deletes-e2e.spec.ts

# Run single scenario
npx playwright test test/e2e/cascade-deletes-e2e.spec.ts -g "Scenario 1"

# Run with UI mode (debugging)
npx playwright test test/e2e/cascade-deletes-e2e.spec.ts --ui

# Run with headed browser (watch execution)
npx playwright test test/e2e/cascade-deletes-e2e.spec.ts --headed
```

### Cleanup
```bash
# Clean up test data
npm run cleanup:cascade-delete-test-data

# Verify S3 cleanup
node scripts/verify-s3-cleanup.js

# Reset database to clean state
npm run db:reset:dev
```

---

## Appendix: Database Schema Validation

### Tables with CASCADE DELETE Constraints
```sql
-- Verify all foreign keys have ON DELETE CASCADE
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND rc.delete_rule = 'CASCADE';
```

**Expected CASCADE DELETE Foreign Keys:**
- `meal_plans.customer_id` → `users.id` (CASCADE)
- `grocery_lists.customer_id` → `users.id` (CASCADE)
- `grocery_lists.meal_plan_id` → `meal_plans.id` (CASCADE)
- `progress_measurements.customer_id` → `users.id` (CASCADE)
- `progress_photos.customer_id` → `users.id` (CASCADE)
- `meal_plan_assignments.customer_id` → `users.id` (CASCADE)
- `meal_plan_assignments.trainer_id` → `users.id` (CASCADE)
- `meal_plan_assignments.meal_plan_id` → `meal_plans.id` (CASCADE)
- `trainer_customer_relationships.trainer_id` → `users.id` (CASCADE)
- `trainer_customer_relationships.customer_id` → `users.id` (CASCADE)

---

## Appendix: S3 Cleanup Implementation

### S3 Cleanup Service
```typescript
// server/services/s3CleanupService.ts
import { S3Client, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { db } from "../db";
import { progressPhotos, s3CleanupLog } from "../../shared/schema";
import { eq } from "drizzle-orm";

export class S3CleanupService {
  private s3Client: S3Client;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  async cleanupCustomerPhotos(customerUuid: string): Promise<void> {
    try {
      // Get all S3 keys for customer
      const photos = await db
        .select({ s3Key: progressPhotos.s3Key })
        .from(progressPhotos)
        .where(eq(progressPhotos.customerId, customerUuid));

      if (photos.length === 0) {
        console.log(`No photos to delete for customer ${customerUuid}`);
        return;
      }

      // Delete from S3
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Delete: {
          Objects: photos.map((photo) => ({ Key: photo.s3Key })),
        },
      });

      const response = await this.s3Client.send(deleteCommand);

      // Log cleanup
      await db.insert(s3CleanupLog).values({
        customerId: customerUuid,
        filesDeleted: photos.length,
        status: "success",
        deletedKeys: photos.map((p) => p.s3Key),
      });

      console.log(`Deleted ${photos.length} S3 files for customer ${customerUuid}`);
    } catch (error) {
      console.error("S3 cleanup failed:", error);

      // Log failure
      await db.insert(s3CleanupLog).values({
        customerId: customerUuid,
        filesDeleted: 0,
        status: "failed",
        errorMessage: error.message,
      });

      throw error;
    }
  }
}
```

---

## Document Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-21 | BMAD QA Agent (Quinn) | Initial comprehensive test design |

---

**QA Agent Review Status:** ✅ APPROVED FOR IMPLEMENTATION
**Next Step:** Create E2E test implementation file: `test/e2e/cascade-deletes-e2e.spec.ts`
**Estimated Implementation Time:** 6-8 hours (all 11 scenarios + S3 verification scripts)
**Priority:** P0 - CRITICAL (Data Integrity Risk = 10/10)
