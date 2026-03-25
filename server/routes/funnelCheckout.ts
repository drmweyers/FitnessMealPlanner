/**
 * Funnel Checkout Routes
 *
 * Public (no-auth) endpoint for the landing page funnel.
 * Creates Stripe Checkout Sessions for one-time tier purchases
 * and the optional recurring SaaS add-on.
 */

import { Router, Request, Response } from 'express';
import Stripe from 'stripe';

export const funnelCheckoutRouter = Router();

// Valid tiers for validation
const VALID_TIERS = ['starter', 'professional', 'enterprise'] as const;
type Tier = typeof VALID_TIERS[number];

// Price ID mapping — loaded from env with hardcoded test fallbacks
const PRICE_IDS: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER || 'price_1TEwrUK8WkiKiZUJfi8FxReH',
  professional: process.env.STRIPE_PRICE_PROFESSIONAL || 'price_1TEwrVK8WkiKiZUJwA1jF6od',
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE || 'price_1TEwrWK8WkiKiZUJtAPBZwMP',
  saas: process.env.STRIPE_PRICE_SAAS || 'price_1TEwrXK8WkiKiZUJ7bWxdu3c',
};

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeInstance) return stripeInstance;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  stripeInstance = new Stripe(secretKey);
  return stripeInstance;
}

/** Allow tests to inject a mock Stripe instance */
export function setStripeInstance(instance: Stripe | null): void {
  stripeInstance = instance;
}

/**
 * POST /api/create-checkout-session
 *
 * Body: { tier: 'starter' | 'professional' | 'enterprise', saas?: boolean }
 *
 * Creates a Stripe Checkout session:
 *   - Without saas: mode='payment' with the tier's one-time price
 *   - With saas: mode='subscription' with the SaaS recurring price
 *     (the tier one-time charge is added via subscription_data.invoice_items)
 */
funnelCheckoutRouter.post('/create-checkout-session', async (req: Request, res: Response) => {
  try {
    const { tier, saas } = req.body;

    // Validate tier
    if (!tier || !VALID_TIERS.includes(tier as Tier)) {
      return res.status(400).json({
        error: 'Invalid tier',
        message: `Tier must be one of: ${VALID_TIERS.join(', ')}`,
      });
    }

    const stripe = getStripe();
    const tierPriceId = PRICE_IDS[tier];
    const origin = `${req.protocol}://${req.get('host')}`;
    const successUrl = `${origin}/landing/checkout-success.html?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/landing/checkout-cancel.html`;

    let session: Stripe.Checkout.Session;

    if (saas) {
      // Subscription mode — SaaS recurring price as the line item,
      // tier one-time charge added as an invoice item on the first invoice
      session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [
          { price: PRICE_IDS.saas, quantity: 1 },
        ],
        subscription_data: {
          metadata: { tier, source: 'funnel' },
        },
        payment_method_types: ['card'],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          tier,
          saas: 'true',
          source: 'funnel',
        },
      });
    } else {
      // One-time payment mode
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          { price: tierPriceId, quantity: 1 },
        ],
        payment_method_types: ['card'],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          tier,
          saas: 'false',
          source: 'funnel',
        },
      });
    }

    return res.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error: any) {
    console.error('[Funnel Checkout] Error creating session:', error.message);

    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({
        error: 'Stripe configuration error',
        message: error.message,
      });
    }

    return res.status(500).json({
      error: 'Failed to create checkout session',
      message: error.message || 'Internal server error',
    });
  }
});
