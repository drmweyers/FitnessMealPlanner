import { db } from '../db';
import { users } from '@shared/schema';
import { cleanupUserS3Objects } from './s3Cleanup';
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
    public code: 'S3_CLEANUP_FAILED' | 'DB_TRANSACTION_FAILED' | 'INVALID_PASSWORD' | 'NOT_CONFIRMED' | 'USER_NOT_FOUND'
  ) {
    super(message);
    this.name = 'AccountDeletionError';
  }
}

/**
 * Delete a customer account with all associated data
 *
 * Process:
 * 1. Validate inputs (password, confirmation)
 * 2. Clean up S3 objects (profile images, progress photos)
 * 3. Delete user record (cascade deletes handle relationships)
 * 4. Send confirmation email (async, don't block)
 *
 * Cascade Deletes (via foreign key constraints):
 * - personalized_meal_plans.customer_id → users.id (ON DELETE CASCADE)
 * - meal_plan_assignments.customer_id → users.id (ON DELETE CASCADE)
 * - grocery_lists.customer_id → users.id (ON DELETE CASCADE)
 * - customer_invitations.customer_id → users.id (ON DELETE CASCADE)
 * - customer_measurements.customer_id → users.id (ON DELETE CASCADE)
 * - customer_photos.customer_id → users.id (ON DELETE CASCADE)
 * - customer_goals.customer_id → users.id (ON DELETE CASCADE)
 *
 * @param params - Delete account parameters
 * @throws {AccountDeletionError} If deletion fails
 */
export async function deleteCustomerAccount(
  params: DeleteAccountParams
): Promise<void> {
  const { userId, password, confirmDeletion } = params;

  console.log(`[AccountDeletion] Starting deletion for user ${userId}`);

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
    throw new AccountDeletionError(
      'User not found',
      'USER_NOT_FOUND'
    );
  }

  console.log(`[AccountDeletion] Found user: ${user.email} (role: ${user.role})`);

  // 3. Verify password
  const passwordValid = await bcrypt.compare(password, user.password);
  if (!passwordValid) {
    console.warn(`[AccountDeletion] Invalid password for user ${userId}`);
    throw new AccountDeletionError(
      'Invalid password',
      'INVALID_PASSWORD'
    );
  }

  console.log(`[AccountDeletion] Password verified for user ${userId}`);

  // 4. Clean up S3 objects
  try {
    const s3Cleanup = await cleanupUserS3Objects(userId);
    console.log(`[AccountDeletion] S3 cleanup complete for user ${userId}:`, s3Cleanup);
  } catch (error) {
    console.error(`[AccountDeletion] S3 cleanup failed for user ${userId}:`, error);
    throw new AccountDeletionError(
      'Failed to clean up user files in S3',
      'S3_CLEANUP_FAILED'
    );
  }

  // 5. Delete user record (cascade deletes handle relationships)
  try {
    await db.transaction(async (tx) => {
      const result = await tx.delete(users).where(eq(users.id, userId));
      console.log(`[AccountDeletion] User record deleted for user ${userId}`);
    });
  } catch (error) {
    console.error(`[AccountDeletion] Database transaction failed for user ${userId}:`, error);
    throw new AccountDeletionError(
      'Failed to delete user record from database',
      'DB_TRANSACTION_FAILED'
    );
  }

  console.log(`[AccountDeletion] Account deletion complete for user ${userId} (${user.email})`);

  // 6. Send confirmation emails (async, don't block)
  // Note: Email service integration deferred to future iteration
  // For MVP, we'll just log the action
  console.log(`[AccountDeletion] TODO: Send deletion confirmation email to ${user.email}`);
  console.log(`[AccountDeletion] TODO: Notify assigned trainers about customer deletion`);
}

/**
 * Validate deletion request before processing
 *
 * @param userId - User ID
 * @param role - User role
 * @throws {Error} If validation fails
 */
export function validateDeletionRequest(userId: number, role: string): void {
  // Only customers can delete their own accounts
  if (role !== 'customer') {
    throw new Error('Only customers can delete their own accounts');
  }

  if (!userId || userId <= 0) {
    throw new Error('Invalid user ID');
  }
}
