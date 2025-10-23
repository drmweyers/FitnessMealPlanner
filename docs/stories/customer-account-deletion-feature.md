# Story: Customer Account Deletion Feature

**Story ID:** DELETE-ACCOUNT-001
**Epic:** User Account Management
**Created:** October 22, 2025
**Status:** Ready for Implementation
**Risk Level:** 🔴 HIGH (Risk Profile: docs/qa/assessments/delete-account-risk-profile.md)

---

## Story Overview

**As a** customer
**I want to** delete my account and all associated data
**So that** I can exercise my GDPR "Right to be Forgotten" and remove my personal information

**Business Value:** GDPR compliance, user privacy control, legal requirement
**User Impact:** High (critical privacy feature)
**Technical Complexity:** High (cascade deletes, S3 cleanup, authorization)

---

## Acceptance Criteria

### 1. UI/UX Requirements
- [ ] Customer can access "Delete Account" option in their profile settings
- [ ] Delete button is clearly marked as dangerous (red/warning color)
- [ ] Confirmation dialog explains consequences (permanent, data loss)
- [ ] User must re-enter password to confirm deletion
- [ ] User must check "I understand this cannot be undone" checkbox
- [ ] Success message confirms account deletion
- [ ] User is logged out immediately after deletion

### 2. API Requirements
- [ ] `DELETE /api/user/account` endpoint created
- [ ] Endpoint requires authentication (customer only)
- [ ] Endpoint requires password re-authentication
- [ ] Endpoint validates CSRF token
- [ ] Endpoint returns 204 No Content on success
- [ ] Endpoint returns appropriate error codes (401, 403, 500)

### 3. Database Requirements
- [ ] Delete user record from `users` table
- [ ] Cascade delete `personalized_meal_plans` (customer-specific plans)
- [ ] Cascade delete `meal_plan_assignments` (trainer-customer assignments)
- [ ] Cascade delete `grocery_lists` (customer shopping lists)
- [ ] Cascade delete `customer_invitations` (pending invitations)
- [ ] Cascade delete `customer_measurements` (progress tracking)
- [ ] Cascade delete `customer_photos` (progress photos metadata)
- [ ] Cascade delete `customer_goals` (fitness goals)
- [ ] All deletes must occur in a single database transaction
- [ ] Transaction must rollback on any error

### 4. S3 Storage Requirements
- [ ] Delete all profile images for the user
- [ ] Delete all progress photos for the user
- [ ] S3 deletion must occur before database deletion
- [ ] S3 deletion errors must prevent account deletion
- [ ] Log all S3 cleanup operations

### 5. Authorization Requirements
- [ ] Only the customer can delete their own account
- [ ] Trainers cannot delete customer accounts
- [ ] Admins cannot delete customer accounts (unless policy allows)
- [ ] Password re-authentication required
- [ ] CSRF protection enforced

### 6. Notification Requirements
- [ ] Send confirmation email to customer after deletion
- [ ] Email confirms account is deleted and cannot be recovered
- [ ] Notify assigned trainer(s) that customer deleted account
- [ ] Include deletion timestamp in emails

### 7. Testing Requirements
- [ ] Unit tests for cascade deletes (8 tables)
- [ ] Unit tests for S3 cleanup
- [ ] Unit tests for authorization enforcement
- [ ] Unit tests for transaction rollback
- [ ] E2E tests for complete deletion workflow
- [ ] E2E tests for authorization boundaries
- [ ] E2E tests for error handling
- [ ] Test coverage > 80% for delete functionality

---

## Technical Implementation Details

### Database Schema Changes
**No schema changes required** - using existing foreign key constraints

**Verify Foreign Keys:**
```sql
-- Check existing cascade delete constraints
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
  AND ccu.table_name = 'users';
```

**Expected Cascade Deletes (ON DELETE CASCADE):**
- `personalized_meal_plans.customer_id` → `users.id`
- `meal_plan_assignments.customer_id` → `users.id`
- `grocery_lists.customer_id` → `users.id`
- `customer_invitations.customer_id` → `users.id`
- `customer_measurements.customer_id` → `users.id`
- `customer_photos.customer_id` → `users.id`
- `customer_goals.customer_id` → `users.id`

---

### API Endpoint Design

**Endpoint:** `DELETE /api/user/account`

**Request:**
```typescript
// Body
{
  password: string;           // User's current password for re-auth
  confirmDeletion: boolean;   // Must be true
}

// Headers
{
  'X-CSRF-Token': string;     // CSRF protection
  'Authorization': 'Bearer {token}'
}
```

**Response:**
```typescript
// Success (204 No Content)
// No body

// Error (401 Unauthorized)
{
  error: "Invalid password"
}

// Error (403 Forbidden)
{
  error: "Not authorized to delete this account"
}

// Error (500 Internal Server Error)
{
  error: "Failed to delete account",
  details: "S3 cleanup failed" // or "Database transaction failed"
}
```

**Implementation Flow:**
1. Validate authentication token
2. Validate CSRF token
3. Verify user is a customer (role check)
4. Verify password matches (bcrypt compare)
5. Verify `confirmDeletion` is true
6. Begin S3 cleanup (profile images + progress photos)
7. If S3 cleanup succeeds, begin database transaction
8. Delete user record (cascade deletes handle relationships)
9. Commit transaction
10. Send confirmation emails (async)
11. Invalidate user session
12. Return 204 No Content

---

### Service Layer Design

**File:** `server/services/accountDeletion.ts`

```typescript
import { db } from '../db';
import { users } from '../db/schema';
import { deleteS3Object, listS3Objects } from './s3Service';
import { sendEmail } from './emailService';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

export interface DeleteAccountParams {
  userId: number;
  password: string;
  confirmDeletion: boolean;
}

export class AccountDeletionError extends Error {
  constructor(
    message: string,
    public code: 'S3_CLEANUP_FAILED' | 'DB_TRANSACTION_FAILED' | 'INVALID_PASSWORD' | 'NOT_CONFIRMED'
  ) {
    super(message);
    this.name = 'AccountDeletionError';
  }
}

/**
 * Delete a customer account with all associated data
 *
 * @throws {AccountDeletionError} If deletion fails
 */
export async function deleteCustomerAccount(
  params: DeleteAccountParams
): Promise<void> {
  const { userId, password, confirmDeletion } = params;

  // 1. Validate inputs
  if (!confirmDeletion) {
    throw new AccountDeletionError(
      'Account deletion must be explicitly confirmed',
      'NOT_CONFIRMED'
    );
  }

  // 2. Get user record
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error('User not found');
  }

  // 3. Verify password
  const passwordValid = await bcrypt.compare(password, user.password);
  if (!passwordValid) {
    throw new AccountDeletionError(
      'Invalid password',
      'INVALID_PASSWORD'
    );
  }

  // 4. Clean up S3 objects
  try {
    await cleanupUserS3Objects(userId);
  } catch (error) {
    console.error('S3 cleanup failed:', error);
    throw new AccountDeletionError(
      'Failed to clean up user files',
      'S3_CLEANUP_FAILED'
    );
  }

  // 5. Delete user record (cascade deletes handle relationships)
  try {
    await db.transaction(async (tx) => {
      await tx.delete(users).where(eq(users.id, userId));
    });
  } catch (error) {
    console.error('Database transaction failed:', error);
    throw new AccountDeletionError(
      'Failed to delete user record',
      'DB_TRANSACTION_FAILED'
    );
  }

  // 6. Send confirmation emails (async, don't block)
  try {
    await sendDeletionConfirmationEmails(user);
  } catch (error) {
    console.error('Email notification failed:', error);
    // Don't fail the deletion if emails fail
  }
}

/**
 * Clean up all S3 objects for a user
 */
async function cleanupUserS3Objects(userId: number): Promise<void> {
  const profileImagePrefix = `profile-images/${userId}/`;
  const progressPhotosPrefix = `progress-photos/${userId}/`;

  // List and delete profile images
  const profileImages = await listS3Objects(profileImagePrefix);
  for (const image of profileImages) {
    await deleteS3Object(image.Key!);
  }

  // List and delete progress photos
  const progressPhotos = await listS3Objects(progressPhotosPrefix);
  for (const photo of progressPhotos) {
    await deleteS3Object(photo.Key!);
  }

  console.log(`Cleaned up ${profileImages.length + progressPhotos.length} S3 objects for user ${userId}`);
}

/**
 * Send confirmation emails after account deletion
 */
async function sendDeletionConfirmationEmails(user: typeof users.$inferSelect): Promise<void> {
  // Send to customer
  await sendEmail({
    to: user.email,
    subject: 'Account Deletion Confirmation',
    template: 'account-deleted',
    data: {
      name: user.name || user.email,
      deletedAt: new Date().toISOString()
    }
  });

  // TODO: Notify assigned trainers (if needed)
}
```

---

### Route Handler Design

**File:** `server/routes/user.ts` (or new `server/routes/account.ts`)

```typescript
import express from 'express';
import { authenticate } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrf';
import { deleteCustomerAccount, AccountDeletionError } from '../services/accountDeletion';

const router = express.Router();

/**
 * DELETE /api/user/account
 *
 * Delete the authenticated customer's account
 */
router.delete(
  '/account',
  authenticate,
  csrfProtection,
  async (req, res) => {
    try {
      // Ensure user is a customer
      if (req.user?.role !== 'customer') {
        return res.status(403).json({
          error: 'Only customers can delete their own accounts'
        });
      }

      const { password, confirmDeletion } = req.body;

      // Validate inputs
      if (!password || typeof password !== 'string') {
        return res.status(400).json({
          error: 'Password is required'
        });
      }

      if (confirmDeletion !== true) {
        return res.status(400).json({
          error: 'Deletion must be explicitly confirmed'
        });
      }

      // Delete account
      await deleteCustomerAccount({
        userId: req.user.id,
        password,
        confirmDeletion
      });

      // Invalidate session
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction failed:', err);
        }
      });

      // Return success
      return res.status(204).send();

    } catch (error) {
      if (error instanceof AccountDeletionError) {
        if (error.code === 'INVALID_PASSWORD') {
          return res.status(401).json({ error: error.message });
        }
        if (error.code === 'NOT_CONFIRMED') {
          return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({
          error: error.message,
          code: error.code
        });
      }

      console.error('Account deletion failed:', error);
      return res.status(500).json({
        error: 'Failed to delete account'
      });
    }
  }
);

export default router;
```

---

### Frontend UI Design

**File:** `client/src/pages/Customer.tsx`

**Add to Profile Tab:**

```typescript
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';
import { Input } from '../components/ui/input';
import { Checkbox } from '../components/ui/checkbox';
import { Trash2 } from 'lucide-react';

export function DeleteAccountSection() {
  const { logout } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    if (!password || !confirmChecked) {
      setError('Please enter your password and confirm deletion');
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken() // Assume this exists
        },
        credentials: 'include',
        body: JSON.stringify({
          password,
          confirmDeletion: confirmChecked
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete account');
      }

      // Account deleted successfully
      logout(); // This will redirect to login page

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
      setIsDeleting(false);
    }
  };

  return (
    <div className="border border-red-200 rounded-lg p-4 bg-red-50">
      <h3 className="text-lg font-semibold text-red-900 mb-2">
        Danger Zone
      </h3>
      <p className="text-sm text-red-700 mb-4">
        Once you delete your account, there is no going back. This will permanently delete:
      </p>
      <ul className="text-sm text-red-700 mb-4 list-disc list-inside">
        <li>Your profile and personal information</li>
        <li>All your meal plans and assignments</li>
        <li>Your grocery lists</li>
        <li>Your progress tracking data (measurements, photos, goals)</li>
        <li>Your trainer relationships</li>
      </ul>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="w-full">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete My Account
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                This action cannot be undone. This will permanently delete your account
                and remove all your data from our servers.
              </p>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Enter your password to confirm:
                </label>
                <Input
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="confirm-delete"
                  checked={confirmChecked}
                  onCheckedChange={(checked) => setConfirmChecked(checked as boolean)}
                />
                <label
                  htmlFor="confirm-delete"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I understand this action cannot be undone
                </label>
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={!password || !confirmChecked || isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete Account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

**Add to Customer Profile Tab:**
```typescript
// In Customer.tsx, add to Profile tab
<div className="mt-8">
  <DeleteAccountSection />
</div>
```

---

## Testing Strategy

### Unit Tests (24 tests)

**File:** `test/unit/accountDeletion.test.ts`

**Test Cases:**
1. ✅ Delete account with no data
2. ✅ Delete account with meal plans (cascade)
3. ✅ Delete account with grocery lists (cascade)
4. ✅ Delete account with measurements (cascade)
5. ✅ Delete account with photos (cascade + S3)
6. ✅ Delete account with goals (cascade)
7. ✅ Delete account with invitations (cascade)
8. ✅ Delete account with assignments (cascade)
9. ✅ S3 cleanup success
10. ✅ S3 cleanup failure (retry logic)
11. ✅ Authorization: customer can delete own account
12. ✅ Authorization: customer cannot delete other accounts
13. ✅ Authorization: trainer cannot delete customer account
14. ✅ Authorization: admin cannot delete customer account
15. ✅ Transaction rollback on database error
16. ✅ Transaction rollback on S3 error
17. ✅ CSRF token validation
18. ✅ Password re-authentication success
19. ✅ Password re-authentication failure
20. ✅ Concurrent deletion prevention
21. ✅ Delete with pending invitation
22. ✅ Delete with active meal plan assignment
23. ✅ Delete with multiple progress photos
24. ✅ Delete with empty profile (edge case)

---

### E2E Tests (10 tests)

**File:** `test/e2e/account-deletion.spec.ts`

**Test Cases:**
1. ✅ Complete deletion workflow (happy path)
2. ✅ Deletion with password re-auth
3. ✅ Deletion cancellation
4. ✅ Unauthorized deletion attempt
5. ✅ Deletion with S3 cleanup
6. ✅ Deletion with cascade relationships
7. ✅ Trainer sees customer removed
8. ✅ Deletion confirmation email sent
9. ✅ Login fails after deletion
10. ✅ Recovery attempt fails (hard delete)

---

## Implementation Tasks

### Backend Tasks
- [ ] Create `server/services/accountDeletion.ts`
  - [ ] Implement `deleteCustomerAccount` function
  - [ ] Implement `cleanupUserS3Objects` function
  - [ ] Implement `sendDeletionConfirmationEmails` function
  - [ ] Add comprehensive error handling
  - [ ] Add logging for audit trail

- [ ] Create `server/routes/account.ts` (or update `user.ts`)
  - [ ] Implement `DELETE /api/user/account` endpoint
  - [ ] Add authentication middleware
  - [ ] Add CSRF protection middleware
  - [ ] Add role validation (customer only)
  - [ ] Add password re-authentication
  - [ ] Add session invalidation

- [ ] Update `server/services/s3Service.ts`
  - [ ] Add `listS3Objects` function (if not exists)
  - [ ] Add `deleteS3Object` function (if not exists)
  - [ ] Add batch delete support
  - [ ] Add retry logic for failed deletions

- [ ] Update `server/services/emailService.ts`
  - [ ] Create `account-deleted` email template
  - [ ] Add `sendDeletionConfirmationEmail` function

### Frontend Tasks
- [ ] Create `DeleteAccountSection` component
  - [ ] Add danger zone UI
  - [ ] Add confirmation dialog
  - [ ] Add password re-authentication input
  - [ ] Add "I understand" checkbox
  - [ ] Add error handling and display
  - [ ] Add loading state

- [ ] Update `client/src/pages/Customer.tsx`
  - [ ] Add `DeleteAccountSection` to Profile tab
  - [ ] Position at bottom of profile (danger zone)
  - [ ] Test responsive design

- [ ] Update `client/src/contexts/AuthContext.tsx`
  - [ ] Ensure `logout` function clears all state
  - [ ] Ensure redirect to login after logout

### Testing Tasks
- [ ] Create `test/unit/accountDeletion.test.ts`
  - [ ] Write 24 unit tests (see Testing Strategy)
  - [ ] Use test database with fixtures
  - [ ] Mock S3 service
  - [ ] Mock email service
  - [ ] Achieve >80% coverage

- [ ] Create `test/e2e/account-deletion.spec.ts`
  - [ ] Write 10 E2E tests (see Testing Strategy)
  - [ ] Use Playwright
  - [ ] Test across browsers (Chromium, Firefox, WebKit)
  - [ ] Use test accounts with real data

- [ ] Update existing cascade delete tests
  - [ ] Ensure all 11 tests now pass with delete account feature
  - [ ] Verify cascades work as expected
  - [ ] Validate S3 cleanup integration

### Documentation Tasks
- [ ] Update API documentation
  - [ ] Document `DELETE /api/user/account` endpoint
  - [ ] Add request/response examples
  - [ ] Add error codes

- [ ] Update user documentation
  - [ ] Add "How to delete your account" guide
  - [ ] Explain data deletion policy
  - [ ] Add FAQ about account recovery (none available)

- [ ] Update privacy policy (if needed)
  - [ ] Document GDPR compliance
  - [ ] Explain deletion process
  - [ ] Add contact for questions

---

## Definition of Done

- [ ] All backend tasks completed
- [ ] All frontend tasks completed
- [ ] All 24 unit tests written and passing
- [ ] All 10 E2E tests written and passing
- [ ] All 11 existing cascade delete tests passing
- [ ] Code reviewed and approved
- [ ] QA review completed (see `docs/qa/gates/delete-account-qa-gate.md`)
- [ ] Documentation updated
- [ ] Feature tested in development environment
- [ ] Feature ready for production deployment

---

## Rollback Plan

**If Issues Found:**
1. Disable endpoint via feature flag
2. Review logs for errors
3. Fix bug and redeploy
4. Re-enable feature

**Database Backup:**
- Daily automated backups
- Point-in-time recovery available

---

## Monitoring

**Metrics to Track:**
- Account deletion requests (count)
- Successful deletions (count)
- Failed deletions (count + reason)
- S3 cleanup success rate
- Average deletion time

**Alerts:**
- Failed deletions > 5%
- S3 cleanup failures
- Deletion time > 30 seconds

---

## Dependencies

**External:**
- AWS S3 SDK (already in use)
- Email service (already in use)
- bcrypt (already in use)

**Internal:**
- Cascade delete tests (Phase 1 complete)
- S3 service (server/services/s3Service.ts)
- Email service (server/services/emailService.ts)
- Authentication middleware (server/middleware/auth.ts)
- CSRF middleware (server/middleware/csrf.ts)

---

## Estimated Effort

**Backend:** 2-3 hours
**Frontend:** 1-2 hours
**Testing:** 2-3 hours
**QA Review:** 1 hour
**Documentation:** 30 minutes

**Total:** 6.5-9.5 hours

---

## Success Criteria

**Feature is successful when:**
1. ✅ Customer can delete their account via UI
2. ✅ All associated data is deleted (8 tables)
3. ✅ All S3 images are deleted
4. ✅ Authorization is enforced (customer only)
5. ✅ Password re-authentication works
6. ✅ Confirmation emails are sent
7. ✅ All 34 tests pass (24 unit + 10 E2E)
8. ✅ All 11 existing cascade delete tests pass
9. ✅ QA review is PASS
10. ✅ No production errors after deployment

---

**Story Ready for Implementation**
**Next Step:** Begin implementation with backend service layer

---

## Notes

- This feature enables GDPR compliance
- Hard delete approach (no recovery period for MVP)
- S3 cleanup is critical (avoid orphaned files)
- Transaction ensures all-or-nothing deletion
- Comprehensive testing validates cascade deletes
- High user value (privacy control)
