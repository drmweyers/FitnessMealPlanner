import { Router, Request, Response } from 'express';
import {
  createSubscriptionCheckout,
  createOnetimeCheckout,
  getOrCreateCustomer,
  createCustomerPortalSession,
  getSubscription,
  cancelSubscription,
  constructWebhookEvent,
  SUBSCRIPTION_TIERS,
  ONETIME_TIERS,
} from '../services/stripeService';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/subscription/tiers
 * Get available subscription and one-time payment tiers
 */
router.get('/tiers', async (req: Request, res: Response) => {
  try {
    res.json({
      subscription: SUBSCRIPTION_TIERS,
      onetime: ONETIME_TIERS,
    });
  } catch (error) {
    console.error('Error fetching tiers:', error);
    res.status(500).json({ error: 'Failed to fetch pricing tiers' });
  }
});

/**
 * POST /api/subscription/create-checkout
 * Create a Stripe Checkout session for subscription
 */
router.post('/create-checkout', async (req: Request, res: Response) => {
  try {
    const { tier, paymentType = 'subscription' } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get or create Stripe customer
    const stripeCustomer = await getOrCreateCustomer({
      email: user.email,
      name: user.name || undefined,
      metadata: {
        userId: user.id,
        role: user.role,
      },
    });

    // Update user with Stripe customer ID
    await db
      .update(users)
      .set({ stripeCustomerId: stripeCustomer.id })
      .where(eq(users.id, user.id));

    const successUrl = `${process.env.FRONTEND_URL || 'http://localhost:4000'}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.FRONTEND_URL || 'http://localhost:4000'}/pricing`;

    if (paymentType === 'subscription') {
      // Get the Stripe price ID from environment variables
      // Example: STRIPE_PRICE_ID_STARTER_MONTHLY=price_xxx
      const priceIdKey = `STRIPE_PRICE_ID_${tier}_MONTHLY`;
      const priceId = process.env[priceIdKey];

      if (!priceId) {
        return res.status(400).json({
          error: `Price ID not configured for tier: ${tier}`,
        });
      }

      const session = await createSubscriptionCheckout({
        customerId: stripeCustomer.id,
        priceId,
        customerEmail: user.email,
        successUrl,
        cancelUrl,
      });

      res.json({ sessionId: session.id, url: session.url });
    } else if (paymentType === 'onetime') {
      const session = await createOnetimeCheckout({
        customerId: stripeCustomer.id,
        tier: tier as 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE',
        customerEmail: user.email,
        successUrl,
        cancelUrl,
      });

      res.json({ sessionId: session.id, url: session.url });
    } else {
      return res.status(400).json({ error: 'Invalid payment type' });
    }
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * POST /api/subscription/portal
 * Create a Stripe Customer Portal session
 */
router.post('/portal', async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!user.stripeCustomerId) {
      return res.status(400).json({ error: 'No Stripe customer found' });
    }

    const returnUrl = `${process.env.FRONTEND_URL || 'http://localhost:4000'}/settings/billing`;

    const session = await createCustomerPortalSession({
      customerId: user.stripeCustomerId,
      returnUrl,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

/**
 * GET /api/subscription/status
 * Get current subscription status for logged-in user
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user from database with subscription info
    const [userData] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    let subscriptionDetails = null;

    if (userData.stripeSubscriptionId) {
      try {
        subscriptionDetails = await getSubscription(userData.stripeSubscriptionId);
      } catch (error) {
        console.error('Error fetching subscription from Stripe:', error);
      }
    }

    res.json({
      paymentType: userData.paymentType || 'onetime',
      tier: userData.subscriptionTier || userData.onetimeTier,
      subscriptionStatus: userData.subscriptionStatus,
      usageLimit: userData.usageLimit,
      usageThisMonth: userData.mealPlansGeneratedThisMonth || 0,
      usageResetDate: userData.usageResetDate,
      isGrandfathered: userData.isGrandfathered || false,
      subscription: subscriptionDetails,
    });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

/**
 * POST /api/subscription/cancel
 * Cancel current subscription
 */
router.post('/cancel', async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!user.stripeSubscriptionId) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    const canceledSubscription = await cancelSubscription(user.stripeSubscriptionId);

    // Update user in database
    await db
      .update(users)
      .set({
        subscriptionStatus: 'canceled',
        subscriptionCanceledAt: new Date(),
      })
      .where(eq(users.id, user.id));

    res.json({
      message: 'Subscription canceled successfully',
      subscription: canceledSubscription,
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

/**
 * POST /api/subscription/webhook
 * Handle Stripe webhook events
 * This endpoint must be registered in Stripe Dashboard
 */
router.post('/webhook', async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Webhook secret not configured');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  try {
    const event = constructWebhookEvent(req.body, signature, webhookSecret);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;

        // Handle successful payment
        if (session.mode === 'subscription') {
          // Subscription created
          const subscriptionId = session.subscription;
          const customerId = session.customer;
          const customerEmail = session.customer_email || session.customer_details?.email;

          // Find user by email
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, customerEmail))
            .limit(1);

          if (user) {
            await db
              .update(users)
              .set({
                stripeCustomerId: customerId,
                stripeSubscriptionId: subscriptionId,
                subscriptionStatus: 'active',
                paymentType: 'subscription',
                subscriptionPeriodStart: new Date(),
              })
              .where(eq(users.id, user.id));
          }
        } else if (session.mode === 'payment') {
          // One-time payment
          const customerEmail = session.customer_email || session.customer_details?.email;
          const metadata = session.metadata || {};

          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, customerEmail))
            .limit(1);

          if (user) {
            await db
              .update(users)
              .set({
                paymentType: 'onetime',
                onetimePurchaseDate: new Date(),
                onetimeAmount: session.amount_total,
                onetimeTier: metadata.tier?.toLowerCase(),
                usageLimit: metadata.tier === 'STARTER' ? 20 : metadata.tier === 'PROFESSIONAL' ? 50 : 150,
              })
              .where(eq(users.id, user.id));
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;

        // Update subscription status
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.stripeSubscriptionId, subscription.id))
          .limit(1);

        if (user) {
          await db
            .update(users)
            .set({
              subscriptionStatus: subscription.status,
              subscriptionPeriodStart: new Date(subscription.current_period_start * 1000),
              subscriptionPeriodEnd: new Date(subscription.current_period_end * 1000),
            })
            .where(eq(users.id, user.id));
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;

        // Subscription canceled
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.stripeSubscriptionId, subscription.id))
          .limit(1);

        if (user) {
          await db
            .update(users)
            .set({
              subscriptionStatus: 'canceled',
              subscriptionCanceledAt: new Date(),
            })
            .where(eq(users.id, user.id));
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription;

        // Mark subscription as past due
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.stripeSubscriptionId, subscriptionId))
          .limit(1);

        if (user) {
          await db
            .update(users)
            .set({
              subscriptionStatus: 'past_due',
            })
            .where(eq(users.id, user.id));
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook validation failed' });
  }
});

export default router;
