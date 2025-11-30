/**
 * Webhook Signature Verification Middleware
 *
 * HMAC SHA256 signature verification for n8n webhooks
 * Prevents replay attacks and ensures webhook authenticity
 *
 * Based on Security Agent recommendations from Enterprise Readiness Report
 * Test Coverage: test/unit/webhooks/signature-verification.test.ts (15 tests)
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET || 'test-secret-key-do-not-use-in-production';

// Replay attack prevention: 5-minute window
const TIMESTAMP_TOLERANCE_SECONDS = 300;

// Future timestamp tolerance: 1-minute
const FUTURE_TIMESTAMP_TOLERANCE_SECONDS = 60;

/**
 * Verify HMAC SHA256 signature
 *
 * Security features:
 * - Constant-time comparison (prevents timing attacks)
 * - Timestamp validation (prevents replay attacks)
 * - Future timestamp rejection (prevents clock manipulation)
 *
 * Headers expected:
 * - x-n8n-signature: Hex-encoded HMAC SHA256 signature
 * - x-n8n-timestamp: Unix timestamp in seconds
 */
export function verifyWebhookSignature(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Extract signature and timestamp from headers
    const signature = req.get('x-n8n-signature');
    const timestamp = req.get('x-n8n-timestamp');

    // Validate headers present
    if (!signature || signature.trim() === '') {
      return res.status(401).json({
        error: 'Missing signature header (x-n8n-signature)',
      });
    }

    if (!timestamp || timestamp.trim() === '') {
      return res.status(401).json({
        error: 'Missing timestamp header (x-n8n-timestamp)',
      });
    }

    // Validate timestamp format (must be numeric)
    if (!/^\d+$/.test(timestamp)) {
      return res.status(401).json({
        error: 'Invalid timestamp format. Must be Unix timestamp in seconds.',
      });
    }

    // Validate signature format (must be hex string, 64 characters for SHA256)
    if (!/^[a-f0-9]{64}$/i.test(signature)) {
      return res.status(401).json({
        error: 'Invalid signature format. Must be 64-character hex string.',
      });
    }

    // Parse timestamp
    const requestTimestamp = parseInt(timestamp, 10);
    const currentTimestamp = Math.floor(Date.now() / 1000);

    // Check if timestamp is too old (replay attack prevention)
    if (currentTimestamp - requestTimestamp > TIMESTAMP_TOLERANCE_SECONDS) {
      return res.status(401).json({
        error: 'Request timestamp too old. Possible replay attack.',
        message: `Timestamp must be within ${TIMESTAMP_TOLERANCE_SECONDS} seconds`,
      });
    }

    // Check if timestamp is too far in future (clock manipulation prevention)
    if (requestTimestamp - currentTimestamp > FUTURE_TIMESTAMP_TOLERANCE_SECONDS) {
      return res.status(401).json({
        error: 'Request timestamp too far in future.',
        message: `Timestamp cannot be more than ${FUTURE_TIMESTAMP_TOLERANCE_SECONDS} seconds ahead`,
      });
    }

    // Compute expected signature
    const payload = `${timestamp}.${JSON.stringify(req.body)}`;
    const expectedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    // Constant-time comparison (prevents timing attacks)
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (signatureBuffer.length !== expectedBuffer.length) {
      return res.status(401).json({
        error: 'Invalid signature',
      });
    }

    // Use crypto.timingSafeEqual for constant-time comparison
    const isValid = crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

    if (!isValid) {
      return res.status(401).json({
        error: 'Invalid signature. Webhook authentication failed.',
      });
    }

    // Signature verified successfully
    next();
  } catch (error: any) {
    console.error('Webhook signature verification error:', error);
    return res.status(500).json({
      error: 'Internal server error during signature verification',
    });
  }
}

/**
 * Optional: Create signature for testing
 * Used by test suite to generate valid signatures
 *
 * @param payload - Request body object
 * @param timestamp - Unix timestamp in seconds (as string)
 * @returns Hex-encoded HMAC SHA256 signature
 */
export function createSignature(payload: any, timestamp: string): string {
  const signaturePayload = `${timestamp}.${JSON.stringify(payload)}`;
  return crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(signaturePayload)
    .digest('hex');
}

/**
 * Optional: Get current Unix timestamp
 * Used by test suite to generate valid timestamps
 *
 * @returns Current Unix timestamp in seconds (as string)
 */
export function getCurrentTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}
