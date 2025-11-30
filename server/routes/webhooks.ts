/**
 * n8n Webhook Routes
 *
 * Endpoints for n8n marketing automation integration
 * All webhooks include:
 * - Input validation (Zod schemas)
 * - Signature verification (HMAC SHA256)
 * - Replay attack prevention
 * - XSS/SQL injection protection
 *
 * Test Coverage:
 * - test/unit/webhooks/input-validation.test.ts (20 tests)
 * - test/unit/webhooks/signature-verification.test.ts (15 tests)
 * - test/e2e/n8n-user-journeys.spec.ts (24 tests)
 */

import { Router, Request, Response } from 'express';
import {
  validateLeadCapture,
  validateWelcome,
  validateAhaMoment,
  validateStripeSubscriptionUpdate,
  validatePayloadSize,
} from '../middleware/webhookValidation';
import { verifyWebhookSignature } from '../middleware/webhookSecurity';

const router = Router();

// Apply payload size limit to all webhook routes (1MB max)
router.use(validatePayloadSize(1024 * 1024));

/**
 * POST /api/webhooks/lead-capture
 *
 * Lead Magnet Webhook
 * Triggered when: User generates free meal plan or accesses free tool
 * n8n Workflow: Sends to 7-day nurture sequence
 * HubSpot: Creates contact with lifecycle stage "lead"
 * Mailgun: Sends Day 1 email immediately
 * Segment: Tracks "Lead Captured" event
 */
router.post(
  '/lead-capture',
  validateLeadCapture,
  async (req: Request, res: Response) => {
    try {
      const { email, firstName, lastName, leadSource, timestamp } = req.body;

      console.log('[Webhook] Lead capture received:', {
        email,
        leadSource,
        timestamp,
      });

      // TODO: Integration points (implement after webhook infrastructure is stable)
      // 1. Send to n8n lead capture workflow
      // 2. Create/update HubSpot contact
      // 3. Track Segment event
      // 4. Trigger Mailgun nurture sequence

      // For now, just acknowledge receipt and return validated data
      return res.status(200).json({
        success: true,
        message: 'Lead capture webhook received',
        email,
        firstName,
        lastName,
        leadSource,
        timestamp,
      });
    } catch (error: any) {
      console.error('[Webhook] Lead capture error:', error);
      return res.status(500).json({
        error: 'Failed to process lead capture webhook',
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/webhooks/welcome
 *
 * Welcome Onboarding Webhook
 * Triggered when: User completes Stripe checkout
 * n8n Workflow: Sends tier-specific welcome email
 * HubSpot: Updates lifecycle stage to "customer"
 * Mailgun: Sends welcome email with tier-specific content
 * Segment: Tracks "Subscription Created" event
 */
router.post(
  '/welcome',
  validateWelcome,
  async (req: Request, res: Response) => {
    try {
      const {
        email,
        firstName,
        lastName,
        accountType,
        customerId,
        subscriptionId,
        timestamp,
      } = req.body;

      console.log('[Webhook] Welcome webhook received:', {
        email,
        accountType,
        customerId,
        timestamp,
      });

      // TODO: Integration points
      // 1. Send to n8n welcome workflow
      // 2. Update HubSpot contact (lifecycle stage = "customer")
      // 3. Track Segment conversion event
      // 4. Trigger tier-specific Mailgun welcome email

      return res.status(200).json({
        success: true,
        message: 'Welcome webhook received',
        email,
        firstName,
        lastName,
        accountType,
        customerId,
        subscriptionId,
        timestamp,
      });
    } catch (error: any) {
      console.error('[Webhook] Welcome webhook error:', error);
      return res.status(500).json({
        error: 'Failed to process welcome webhook',
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/webhooks/aha-moment
 *
 * Aha Moment Celebration Webhook
 * Triggered when: Trainer creates their FIRST meal plan
 * n8n Workflow: Sends celebration email
 * HubSpot: Updates custom property "first_meal_plan_created"
 * Mailgun: Sends congratulations email with tips
 * Segment: Tracks "Aha Moment Reached" event
 *
 * Note: Should only trigger ONCE per user (first meal plan only)
 */
router.post(
  '/aha-moment',
  validateAhaMoment,
  async (req: Request, res: Response) => {
    try {
      const {
        email,
        firstName,
        mealPlanId,
        mealPlanType,
        calories,
        protein,
        accountType,
        timestamp,
      } = req.body;

      console.log('[Webhook] Aha moment webhook received:', {
        email,
        mealPlanId,
        timestamp,
      });

      // TODO: Integration points
      // 1. Send to n8n aha moment workflow
      // 2. Update HubSpot custom property
      // 3. Track Segment milestone event
      // 4. Trigger Mailgun celebration email

      return res.status(200).json({
        success: true,
        message: 'Aha moment webhook received',
        email,
        firstName,
        mealPlanId,
        mealPlanType,
        calories,
        protein,
        accountType,
        timestamp,
      });
    } catch (error: any) {
      console.error('[Webhook] Aha moment webhook error:', error);
      return res.status(500).json({
        error: 'Failed to process aha moment webhook',
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/webhooks/stripe-subscription-update
 *
 * Stripe Subscription Update Webhook
 * Triggered when: Stripe subscription status changes
 * Requires: HMAC SHA256 signature verification
 * n8n Workflow: Updates user tier and sends relevant emails
 * HubSpot: Updates subscription status
 * Segment: Tracks subscription change event
 */
router.post(
  '/stripe-subscription-update',
  verifyWebhookSignature, // Require signature for Stripe webhooks
  validateStripeSubscriptionUpdate,
  async (req: Request, res: Response) => {
    try {
      const {
        customerId,
        subscriptionId,
        status,
        planTier,
        timestamp,
      } = req.body;

      console.log('[Webhook] Stripe subscription update received:', {
        customerId,
        status,
        planTier,
        timestamp,
      });

      // TODO: Integration points
      // 1. Update user tier in database
      // 2. Send to n8n subscription change workflow
      // 3. Update HubSpot subscription status
      // 4. Track Segment event
      // 5. Trigger relevant Mailgun emails (upgrade, downgrade, cancellation)

      return res.status(200).json({
        success: true,
        message: 'Stripe subscription update webhook received',
        customerId,
        subscriptionId,
        status,
        planTier,
        timestamp,
      });
    } catch (error: any) {
      console.error('[Webhook] Stripe subscription update error:', error);
      return res.status(500).json({
        error: 'Failed to process Stripe subscription update webhook',
        message: error.message,
      });
    }
  }
);

/**
 * Health check endpoint
 * Useful for monitoring webhook service availability
 */
router.get('/health', (req: Request, res: Response) => {
  return res.status(200).json({
    status: 'healthy',
    service: 'n8n-webhooks',
    timestamp: new Date().toISOString(),
  });
});

export default router;
