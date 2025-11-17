/**
 * Stripe Payment Service
 *
 * Handles all Stripe payment operations for the 3-tier subscription system.
 * Includes checkout session creation, webhook processing, and subscription management.
 */

import Stripe from 'stripe';
import { db } from '../db';
import { eq, and } from 'drizzle-orm';
import {
  trainerSubscriptions,
  subscriptionItems,
  webhookEvents,
  paymentLogs,
} from '../../shared/schema';
import { entitlementsService } from './EntitlementsService';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

export type TierLevel = 'starter' | 'professional' | 'enterprise';

interface TierPricing {
  tier: TierLevel;
  stripePriceId: string;
  amount: number; // in cents
  currency: string;
  name: string;
  features: string[];
  limits: {
    customers: number;
    mealPlans: number;
  };
}

// Tier pricing configuration
const TIER_PRICING: Record<TierLevel, TierPricing> = {
  starter: {
    tier: 'starter',
    stripePriceId: process.env.STRIPE_PRICE_STARTER || 'price_starter',
    amount: 0, // Free tier
    currency: 'usd',
    name: 'Starter',
    features: [
      '9 customers',
      '50 meal plans',
      '1,000 recipes',
      '5 meal types',
      'PDF exports',
      'Email support',
    ],
    limits: {
      customers: 9,
      mealPlans: 50,
    },
  },
  professional: {
    tier: 'professional',
    stripePriceId: process.env.STRIPE_PRICE_PROFESSIONAL || 'price_professional',
    amount: 9900, // $99.00
    currency: 'usd',
    name: 'Professional',
    features: [
      '20 customers',
      '200 meal plans',
      '2,500 recipes',
      '10 meal types',
      'CSV & Excel exports',
      'Custom branding',
      'Analytics dashboard',
      'Priority support',
    ],
    limits: {
      customers: 20,
      mealPlans: 200,
    },
  },
  enterprise: {
    tier: 'enterprise',
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise',
    amount: 29900, // $299.00
    currency: 'usd',
    name: 'Enterprise',
    features: [
      'Unlimited customers',
      'Unlimited meal plans',
      '4,000 recipes',
      '17 meal types',
      'All export formats',
      'White-label mode',
      'Custom domain',
      'API access',
      'Dedicated support',
    ],
    limits: {
      customers: -1, // unlimited
      mealPlans: -1, // unlimited
    },
  },
};

export class StripePaymentService {
  /**
   * Get public pricing information for all tiers
   */
  async getPricing() {
    return {
      tiers: TIER_PRICING,
    };
  }

  /**
   * Create a Stripe Checkout Session for tier purchase
   */
  async createCheckoutSession(
    trainerId: string,
    tier: TierLevel,
    successUrl: string,
    cancelUrl: string
  ): Promise<{ url: string; sessionId: string }> {
    const pricing = TIER_PRICING[tier];

    if (!pricing) {
      throw new Error(`Invalid tier: ${tier}`);
    }

    // Get or create Stripe customer
    const customer = await this.getOrCreateStripeCustomer(trainerId);

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'payment', // One-time payment
      line_items: [
        {
          price: pricing.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        trainerId,
        tier,
      },
    });

    // Log payment attempt
    await db.insert(paymentLogs).values({
      trainerId,
      stripeCustomerId: customer.id,
      eventType: 'purchase',
      amount: pricing.amount,
      currency: pricing.currency,
      status: 'pending',
      metadata: { sessionId: session.id, tier },
      occurredAt: new Date(),
    });

    return {
      url: session.url!,
      sessionId: session.id,
    };
  }

  /**
   * Get or create Stripe customer for trainer
   */
  private async getOrCreateStripeCustomer(trainerId: string): Promise<Stripe.Customer> {
    // Check if trainer already has a subscription with Stripe customer ID
    const existingSubscription = await db.query.trainerSubscriptions.findFirst({
      where: eq(trainerSubscriptions.trainerId, trainerId),
    });

    if (existingSubscription?.stripeCustomerId) {
      // Fetch existing customer
      try {
        const customer = await stripe.customers.retrieve(
          existingSubscription.stripeCustomerId
        );
        if (!customer.deleted) {
          return customer as Stripe.Customer;
        }
      } catch (error) {
        console.error('Failed to retrieve Stripe customer:', error);
        // Continue to create new customer
      }
    }

    // Get trainer email
    const trainer = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, trainerId),
    });

    if (!trainer) {
      throw new Error('Trainer not found');
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email: trainer.email,
      metadata: {
        trainerId,
      },
    });

    return customer;
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(
    payload: string,
    signature: string
  ): Promise<{ received: boolean; event?: Stripe.Event }> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is required');
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error: any) {
      throw new Error(`Webhook signature verification failed: ${error.message}`);
    }

    // Check for duplicate webhook processing
    const existingEvent = await db.query.webhookEvents.findFirst({
      where: (events, { eq }) => eq(events.eventId, event.id),
    });

    if (existingEvent && existingEvent.status === 'processed') {
      console.log(`[Webhook] Duplicate event ${event.id} - already processed`);
      return { received: true, event };
    }

    // Log webhook event (handle duplicates gracefully)
    await db
      .insert(webhookEvents)
      .values({
        eventId: event.id,
        eventType: event.type,
        payloadMetadata: event.data.object as any,
        status: 'pending',
      })
      .onConflictDoUpdate({
        target: webhookEvents.eventId,
        set: {
          eventType: event.type,
          payloadMetadata: event.data.object as any,
        },
      });

    // Process event
    try {
      await this.processWebhookEvent(event);

      // Mark as processed
      await db
        .update(webhookEvents)
        .set({ status: 'processed', processedAt: new Date() })
        .where((events, { eq }) => eq(events.eventId, event.id));
    } catch (error: any) {
      console.error(`[Webhook] Failed to process event ${event.id}:`, error);

      // Log error
      await db
        .update(webhookEvents)
        .set({ status: 'failed', errorMessage: error.message })
        .where((events, { eq }) => eq(events.eventId, event.id));

      throw error;
    }

    return { received: true, event };
  }

  /**
   * Process specific webhook event types
   */
  private async processWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
        await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }
  }

  /**
   * Handle successful checkout completion
   */
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const trainerId = session.metadata?.trainerId;
    const tier = session.metadata?.tier as TierLevel;

    if (!trainerId || !tier) {
      throw new Error('Missing trainerId or tier in session metadata');
    }

    // Get pricing info
    const pricing = TIER_PRICING[tier];

    // Create or update subscription
    const existingSubscription = await db.query.trainerSubscriptions.findFirst({
      where: eq(trainerSubscriptions.trainerId, trainerId),
    });

    const subscriptionData = {
      trainerId,
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: `manual_${session.id}`, // One-time payment, no subscription ID
      tier,
      status: 'active' as const,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      cancelAtPeriodEnd: false,
    };

    if (existingSubscription) {
      await db
        .update(trainerSubscriptions)
        .set(subscriptionData)
        .where(eq(trainerSubscriptions.id, existingSubscription.id));
    } else {
      await db.insert(trainerSubscriptions).values(subscriptionData);
    }

    // Log payment
    await db.insert(paymentLogs).values({
      trainerId,
      stripeCustomerId: session.customer as string,
      eventType: 'purchase',
      amount: pricing.amount,
      currency: pricing.currency,
      status: 'succeeded',
      metadata: { sessionId: session.id, tier },
      occurredAt: new Date(),
    });

    // Invalidate entitlements cache
    await entitlementsService.invalidateCache(trainerId);

    console.log(`[Webhook] Tier purchase completed: ${trainerId} → ${tier}`);
  }

  /**
   * Handle subscription created (if switching to recurring model)
   */
  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    const trainerId = subscription.metadata?.trainerId;

    if (!trainerId) {
      console.warn('[Webhook] Subscription created without trainerId metadata');
      return;
    }

    // Update subscription record
    await db
      .update(trainerSubscriptions)
      .set({
        stripeSubscriptionId: subscription.id,
        status: subscription.status as any,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      })
      .where(eq(trainerSubscriptions.trainerId, trainerId));

    await entitlementsService.invalidateCache(trainerId);
  }

  /**
   * Handle subscription updated
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const trainerId = subscription.metadata?.trainerId;

    if (!trainerId) {
      // Try to find by subscription ID
      const existing = await db.query.trainerSubscriptions.findFirst({
        where: eq(trainerSubscriptions.stripeSubscriptionId, subscription.id),
      });

      if (!existing) {
        console.warn('[Webhook] Subscription updated for unknown trainer');
        return;
      }
    }

    await db
      .update(trainerSubscriptions)
      .set({
        status: subscription.status as any,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      })
      .where(
        trainerId
          ? eq(trainerSubscriptions.trainerId, trainerId)
          : eq(trainerSubscriptions.stripeSubscriptionId, subscription.id)
      );

    await entitlementsService.invalidateCache(trainerId!);
  }

  /**
   * Handle subscription deleted (canceled)
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const existing = await db.query.trainerSubscriptions.findFirst({
      where: eq(trainerSubscriptions.stripeSubscriptionId, subscription.id),
    });

    if (!existing) {
      console.warn('[Webhook] Subscription deleted for unknown subscription');
      return;
    }

    await db
      .update(trainerSubscriptions)
      .set({
        status: 'canceled',
        cancelAtPeriodEnd: false,
      })
      .where(eq(trainerSubscriptions.id, existing.id));

    await entitlementsService.invalidateCache(existing.trainerId);
  }

  /**
   * Handle successful invoice payment
   */
  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;

    // Find trainer by customer ID
    const subscription = await db.query.trainerSubscriptions.findFirst({
      where: eq(trainerSubscriptions.stripeCustomerId, customerId),
    });

    if (!subscription) {
      console.warn('[Webhook] Invoice payment for unknown customer');
      return;
    }

    // Log successful payment
    await db.insert(paymentLogs).values({
      trainerId: subscription.trainerId,
      stripeCustomerId: customerId,
      eventType: 'purchase',
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: 'succeeded',
      metadata: { invoiceId: invoice.id },
      occurredAt: new Date(),
    });
  }

  /**
   * Handle failed invoice payment
   */
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;

    const subscription = await db.query.trainerSubscriptions.findFirst({
      where: eq(trainerSubscriptions.stripeCustomerId, customerId),
    });

    if (!subscription) {
      console.warn('[Webhook] Invoice payment failed for unknown customer');
      return;
    }

    // Log failed payment
    await db.insert(paymentLogs).values({
      trainerId: subscription.trainerId,
      stripeCustomerId: customerId,
      eventType: 'purchase',
      amount: invoice.amount_due,
      currency: invoice.currency,
      status: 'failed',
      metadata: { invoiceId: invoice.id },
      occurredAt: new Date(),
    });

    // Update subscription status to past_due
    await db
      .update(trainerSubscriptions)
      .set({ status: 'past_due' })
      .where(eq(trainerSubscriptions.id, subscription.id));

    await entitlementsService.invalidateCache(subscription.trainerId);
  }

  /**
   * Create Stripe billing portal session
   */
  async createBillingPortalSession(
    trainerId: string,
    returnUrl: string
  ): Promise<{ url: string }> {
    const subscription = await db.query.trainerSubscriptions.findFirst({
      where: eq(trainerSubscriptions.trainerId, trainerId),
    });

    if (!subscription || !subscription.stripeCustomerId) {
      throw new Error('No active subscription found');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  }

  /**
   * Get payment method for customer
   */
  async getPaymentMethod(trainerId: string): Promise<any> {
    const subscription = await db.query.trainerSubscriptions.findFirst({
      where: eq(trainerSubscriptions.trainerId, trainerId),
    });

    if (!subscription || !subscription.stripeCustomerId) {
      return null;
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: subscription.stripeCustomerId,
      type: 'card',
    });

    if (paymentMethods.data.length === 0) {
      return null;
    }

    const pm = paymentMethods.data[0];
    return {
      brand: pm.card?.brand,
      last4: pm.card?.last4,
      expMonth: pm.card?.exp_month,
      expYear: pm.card?.exp_year,
    };
  }

  /**
   * Get billing history for trainer
   */
  async getBillingHistory(trainerId: string): Promise<any[]> {
    const logs = await db.query.paymentLogs.findMany({
      where: eq(paymentLogs.trainerId, trainerId),
      orderBy: (logs, { desc }) => [desc(logs.createdAt)],
    });

    return logs.map((log) => ({
      id: log.id,
      date: log.createdAt.toISOString(),
      amount: log.amount,
      currency: log.currency,
      status: log.status,
      description: this.getPaymentDescription(log.eventType),
    }));
  }

  /**
   * Get human-readable payment description
   */
  private getPaymentDescription(eventType: string): string {
    const descriptions: Record<string, string> = {
      'checkout.session.completed': 'Tier Purchase',
      'invoice.payment_succeeded': 'Subscription Payment',
      'invoice.payment_failed': 'Payment Failed',
    };

    return descriptions[eventType] || eventType;
  }
}

// Singleton instance
export const stripePaymentService = new StripePaymentService();
