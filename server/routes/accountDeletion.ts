// @ts-nocheck - Type errors suppressed
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { deleteCustomerAccount, validateDeletionRequest, AccountDeletionError } from '../services/accountDeletion';

const accountDeletionRouter = Router();

/**
 * Delete customer account
 * DELETE /api/account
 *
 * Permanently deletes the customer's account and all associated data:
 * - User record
 * - Personalized meal plans
 * - Meal plan assignments
 * - Grocery lists
 * - Customer invitations
 * - Customer measurements
 * - Customer photos
 * - Customer goals
 * - S3 objects (profile images, progress photos)
 *
 * Requires:
 * - Authentication (customer only)
 * - Password re-authentication
 * - Explicit confirmation
 *
 * Request body:
 * {
 *   password: string;        // User's current password for re-authentication
 *   confirmDeletion: boolean; // Must be true
 * }
 *
 * Responses:
 * - 204 No Content: Account deleted successfully
 * - 400 Bad Request: Missing or invalid parameters
 * - 401 Unauthorized: Invalid password
 * - 403 Forbidden: Not authorized (non-customer)
 * - 404 Not Found: User not found
 * - 500 Internal Server Error: S3 or database failure
 */
accountDeletionRouter.delete('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Validate user role (only customers can delete their own accounts)
    try {
      validateDeletionRequest(userId, userRole);
    } catch (error) {
      return res.status(403).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Not authorized to delete this account',
        code: 'FORBIDDEN'
      });
    }

    // Extract request body
    const { password, confirmDeletion } = req.body;

    // Validate inputs
    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        status: 'error',
        message: 'Password is required for account deletion',
        code: 'MISSING_PASSWORD'
      });
    }

    if (confirmDeletion !== true) {
      return res.status(400).json({
        status: 'error',
        message: 'Deletion must be explicitly confirmed',
        code: 'NOT_CONFIRMED'
      });
    }

    // Delete account
    await deleteCustomerAccount({
      userId,
      password,
      confirmDeletion
    });

    // Invalidate session (if session-based auth is used)
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction failed:', err);
        }
      });
    }

    // Return success (204 No Content)
    return res.status(204).send();

  } catch (error) {
    if (error instanceof AccountDeletionError) {
      // Handle specific deletion errors
      if (error.code === 'INVALID_PASSWORD') {
        return res.status(401).json({
          status: 'error',
          message: error.message,
          code: error.code
        });
      }
      if (error.code === 'NOT_CONFIRMED') {
        return res.status(400).json({
          status: 'error',
          message: error.message,
          code: error.code
        });
      }
      if (error.code === 'USER_NOT_FOUND') {
        return res.status(404).json({
          status: 'error',
          message: error.message,
          code: error.code
        });
      }
      // S3_CLEANUP_FAILED or DB_TRANSACTION_FAILED
      return res.status(500).json({
        status: 'error',
        message: error.message,
        code: error.code
      });
    }

    // Generic error
    console.error('Account deletion failed:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to delete account',
      code: 'DELETE_ERROR'
    });
  }
});

export default accountDeletionRouter;
