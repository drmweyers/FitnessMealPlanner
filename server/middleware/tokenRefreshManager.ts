/**
 * Token Refresh Manager
 *
 * Handles JWT refresh token operations with race condition prevention,
 * grace periods, and proper token rotation.
 *
 * Features:
 * - Request deduplication (prevents multiple simultaneous refreshes)
 * - Refresh token grace period (old token valid for 60s after new one issued)
 * - Token expiry buffer (refresh 5 minutes before actual expiry)
 * - Automatic cleanup of stale requests
 */

import { User } from '../../shared/schema';
import { generateTokens } from '../auth';
import { storage } from '../storage';

// Grace period for old refresh tokens (60 seconds)
const REFRESH_GRACE_PERIOD = 60 * 1000; // 60 seconds

// Refresh tokens before they expire (5 minutes buffer)
export const REFRESH_BUFFER = 5 * 60 * 1000; // 5 minutes

/**
 * Refresh request tracker
 * Maps userId to pending refresh promise to prevent duplicate requests
 */
const pendingRefreshes = new Map<string, {
  promise: Promise<{ accessToken: string; refreshToken: string }>;
  timestamp: number;
}>();

/**
 * Gracefully expiring refresh tokens
 * Maps old refresh token to expiry timestamp (grace period)
 */
const gracePeriodTokens = new Map<string, number>();

/**
 * Cleanup old pending refreshes (older than 30 seconds)
 * Prevents memory leaks from abandoned requests
 */
function cleanupStalePendingRefreshes() {
  const now = Date.now();
  const staleThreshold = 30 * 1000; // 30 seconds

  for (const [userId, entry] of pendingRefreshes.entries()) {
    if (now - entry.timestamp > staleThreshold) {
      pendingRefreshes.delete(userId);
    }
  }
}

/**
 * Cleanup expired grace period tokens
 */
function cleanupExpiredGracePeriodTokens() {
  const now = Date.now();

  for (const [token, expiry] of gracePeriodTokens.entries()) {
    if (now > expiry) {
      gracePeriodTokens.delete(token);
    }
  }
}

/**
 * Check if a refresh token is in grace period
 */
export function isTokenInGracePeriod(token: string): boolean {
  const expiry = gracePeriodTokens.get(token);
  if (!expiry) return false;

  return Date.now() < expiry;
}

/**
 * Add a token to grace period
 */
function addTokenToGracePeriod(token: string) {
  const gracePeriodExpiry = Date.now() + REFRESH_GRACE_PERIOD;
  gracePeriodTokens.set(token, gracePeriodExpiry);

  // Auto-cleanup after grace period + 1 second
  setTimeout(() => {
    gracePeriodTokens.delete(token);
  }, REFRESH_GRACE_PERIOD + 1000);
}

/**
 * Execute the actual refresh token operation
 */
async function executeRefresh(
  userId: string,
  oldRefreshToken: string
): Promise<{ accessToken: string; refreshToken: string }> {
  try {
    // Get user from database
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate new token pair
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    // Store new refresh token in database
    const refreshTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await storage.createRefreshToken(user.id, newRefreshToken, refreshTokenExpires);

    // Add old token to grace period BEFORE deleting from database
    // This allows in-flight requests to complete successfully
    addTokenToGracePeriod(oldRefreshToken);

    // Delete old refresh token from database (after grace period set)
    await storage.deleteRefreshToken(oldRefreshToken);

    return { accessToken, refreshToken: newRefreshToken };
  } catch (error) {
    console.error('Token refresh execution failed:', error);
    throw error;
  }
}

/**
 * Refresh tokens with deduplication
 *
 * If a refresh is already in progress for this user, returns the existing promise.
 * This prevents race conditions when multiple requests trigger refresh simultaneously.
 *
 * @param userId - User ID to refresh tokens for
 * @param oldRefreshToken - Current refresh token to be rotated
 * @returns Promise resolving to new access and refresh tokens
 */
export async function refreshTokensWithDeduplication(
  userId: string,
  oldRefreshToken: string
): Promise<{ accessToken: string; refreshToken: string }> {
  // Cleanup stale requests periodically
  cleanupStalePendingRefreshes();
  cleanupExpiredGracePeriodTokens();

  // Check if refresh already in progress for this user
  const pending = pendingRefreshes.get(userId);
  if (pending) {
    console.log(`[TokenRefresh] Deduplicating refresh request for user ${userId}`);
    return pending.promise;
  }

  // Create new refresh promise
  const refreshPromise = executeRefresh(userId, oldRefreshToken);

  // Store in pending map
  pendingRefreshes.set(userId, {
    promise: refreshPromise,
    timestamp: Date.now()
  });

  // Clean up after completion (success or failure)
  refreshPromise.finally(() => {
    pendingRefreshes.delete(userId);
  });

  return refreshPromise;
}

/**
 * Check if a token needs refresh based on expiry time
 *
 * @param tokenExpiry - Token expiration timestamp (milliseconds)
 * @returns true if token should be refreshed (within buffer period)
 */
export function shouldRefreshToken(tokenExpiry: number): boolean {
  const now = Date.now();
  return tokenExpiry - now < REFRESH_BUFFER;
}

/**
 * Parse JWT to extract expiry time
 * Note: This is a simple base64 decode, NOT cryptographic verification
 *
 * @param token - JWT token string
 * @returns Expiry timestamp in milliseconds, or null if invalid
 */
export function getTokenExpiry(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    if (!payload.exp) return null;

    // Convert from seconds to milliseconds
    return payload.exp * 1000;
  } catch (error) {
    console.error('Failed to parse token expiry:', error);
    return null;
  }
}

/**
 * Get refresh statistics for monitoring
 */
export function getRefreshStats() {
  return {
    pendingRefreshes: pendingRefreshes.size,
    gracePeriodTokens: gracePeriodTokens.size,
    gracePeriodList: Array.from(gracePeriodTokens.entries()).map(([token, expiry]) => ({
      token: token.substring(0, 20) + '...',
      expiresIn: Math.max(0, expiry - Date.now())
    }))
  };
}
