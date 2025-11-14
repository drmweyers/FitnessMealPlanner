/**
 * Payment Routes
 *
 * Stripe payment endpoints for the 3-tier subscription system.
 * Includes checkout, billing portal, payment methods, and billing history.
 */

import { Router, Request, Response } from 'express';
import { stripePaymentService } from '../services/StripePaymentService';
import { requireAuth, requireRole } from '../middleware/auth';
import { z } from 'zod';

export const paymentRouter = Router();

/**
 * GET /api/v1/public/pricing
 * Get tier pricing information (public endpoint)
 */
paymentRouter.get('/v1/public/pricing', async (req: Request, res: Response) => {
  try {
    const pricing = await stripePaymentService.getPricing();
    res.json(pricing);
  } catch (error: any) {
    console.error('[Payment API] Failed to fetch pricing:', error);
    res.status(500).json({
      error: 'Failed to fetch pricing information',
    });
  }
});

/**
 * POST /api/v1/tiers/purchase
 * Create Stripe checkout session for tier purchase
 */
const purchaseSchema = z.object({
  tier: z.enum(['starter', 'professional', 'enterprise']),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

paymentRouter.post(
  '/v1/tiers/purchase',
  requireAuth,
  requireRole('trainer'),
  async (req: Request, res: Response) => {
    try {
      const { tier, successUrl, cancelUrl } = purchaseSchema.parse(req.body);
      const trainerId = req.user!.id;

      const session = await stripePaymentService.createCheckoutSession(
        trainerId,
        tier,
        successUrl,
        cancelUrl
      );

      res.json({
        success: true,
        url: session.url,
        sessionId: session.sessionId,
      });
    } catch (error: any) {
      console.error('[Payment API] Failed to create checkout session:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid request data',
          details: error.errors,
        });
      }

      res.status(500).json({
        error: error.message || 'Failed to create checkout session',
      });
    }
  }
);

/**
 * POST /api/v1/stripe/webhook
 * Handle Stripe webhook events
 */
paymentRouter.post('/v1/stripe/webhook', async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;

  if (!signature) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  try {
    const payload = req.body;

    // If body is already parsed as JSON, stringify it
    const rawBody = typeof payload === 'string' ? payload : JSON.stringify(payload);

    const result = await stripePaymentService.handleWebhook(rawBody, signature);

    res.json({ received: true, eventId: result.event?.id });
  } catch (error: any) {
    console.error('[Webhook] Error:', error);
    res.status(400).json({
      error: error.message || 'Webhook processing failed',
    });
  }
});

/**
 * POST /api/v1/tiers/billing-portal
 * Create Stripe billing portal session
 */
const billingPortalSchema = z.object({
  returnUrl: z.string().url().optional(),
});

paymentRouter.post(
  '/v1/tiers/billing-portal',
  requireAuth,
  requireRole('trainer'),
  async (req: Request, res: Response) => {
    try {
      const { returnUrl } = billingPortalSchema.parse(req.body);
      const trainerId = req.user!.id;

      const defaultReturnUrl = `${req.protocol}://${req.get('host')}/billing`;
      const session = await stripePaymentService.createBillingPortalSession(
        trainerId,
        returnUrl || defaultReturnUrl
      );

      res.json({
        success: true,
        url: session.url,
      });
    } catch (error: any) {
      console.error('[Payment API] Failed to create billing portal session:', error);
      res.status(500).json({
        error: error.message || 'Failed to create billing portal session',
      });
    }
  }
);

/**
 * GET /api/v1/payment-method
 * Get trainer's payment method details
 */
paymentRouter.get(
  '/v1/payment-method',
  requireAuth,
  requireRole('trainer'),
  async (req: Request, res: Response) => {
    try {
      const trainerId = req.user!.id;

      const paymentMethod = await stripePaymentService.getPaymentMethod(trainerId);

      if (!paymentMethod) {
        return res.status(404).json({
          error: 'No payment method found',
        });
      }

      res.json(paymentMethod);
    } catch (error: any) {
      console.error('[Payment API] Failed to fetch payment method:', error);
      res.status(500).json({
        error: 'Failed to fetch payment method',
      });
    }
  }
);

/**
 * GET /api/v1/billing-history
 * Get trainer's billing history
 */
paymentRouter.get(
  '/v1/billing-history',
  requireAuth,
  requireRole('trainer'),
  async (req: Request, res: Response) => {
    try {
      const trainerId = req.user!.id;

      const history = await stripePaymentService.getBillingHistory(trainerId);

      res.json(history);
    } catch (error: any) {
      console.error('[Payment API] Failed to fetch billing history:', error);
      res.status(500).json({
        error: 'Failed to fetch billing history',
      });
    }
  }
);

/**
 * POST /api/v1/tiers/upgrade
 * Upgrade to a higher tier
 */
const upgradeSchema = z.object({
  tier: z.enum(['professional', 'enterprise']),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

paymentRouter.post(
  '/v1/tiers/upgrade',
  requireAuth,
  requireRole('trainer'),
  async (req: Request, res: Response) => {
    try {
      const { tier, successUrl, cancelUrl } = upgradeSchema.parse(req.body);
      const trainerId = req.user!.id;

      // Use same checkout flow as purchase
      const session = await stripePaymentService.createCheckoutSession(
        trainerId,
        tier,
        successUrl,
        cancelUrl
      );

      res.json({
        success: true,
        url: session.url,
        sessionId: session.sessionId,
      });
    } catch (error: any) {
      console.error('[Payment API] Failed to create upgrade session:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid request data',
          details: error.errors,
        });
      }

      res.status(500).json({
        error: error.message || 'Failed to create upgrade session',
      });
    }
  }
);

/**
 * POST /api/v1/tiers/cancel
 * Cancel subscription (will remain active until period end)
 */
paymentRouter.post(
  '/v1/tiers/cancel',
  requireAuth,
  requireRole('trainer'),
  async (req: Request, res: Response) => {
    try {
      const trainerId = req.user!.id;

      // Redirect to billing portal for cancellation
      // Stripe handles cancellation logic through their portal
      const session = await stripePaymentService.createBillingPortalSession(
        trainerId,
        `${req.protocol}://${req.get('host')}/billing`
      );

      res.json({
        success: true,
        message: 'Redirecting to billing portal for cancellation',
        url: session.url,
      });
    } catch (error: any) {
      console.error('[Payment API] Failed to initiate cancellation:', error);
      res.status(500).json({
        error: error.message || 'Failed to initiate cancellation',
      });
    }
  }
);
