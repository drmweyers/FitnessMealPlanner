/**
 * Stripe Webhook Handler
 *
 * Processes Stripe webhook events with idempotency and signature validation.
 * Canonical Source: docs/TIER_SOURCE_OF_TRUTH.md v2.0
 *
 * Features:
 * - Signature validation (security)
 * - Idempotent event processing (prevents duplicates)
 * - Subscription lifecycle management
 * - Payment event logging
 * - Entitlements cache invalidation
 *
 * Webhook Events Handled:
 * - checkout.session.completed - New subscription created
 * - customer.subscription.updated - Subscription changed (upgrade, status)
 * - customer.subscription.deleted - Subscription canceled
 * - invoice.payment_succeeded - Payment successful
 * - invoice.payment_failed - Payment failed
 * - customer.subscription.trial_will_end - Trial ending soon
 */

import Stripe from 'stripe';
import { db } from '../db';
import { eq, and } from 'drizzle-orm';
import {
  trainerSubscriptions,
  subscriptionItems,
  webhookEvents,
  paymentLogs,
  tierUsageTracking,
  InsertTrainerSubscription,
  InsertSubscriptionItem,
  InsertWebhookEvent,
  InsertPaymentLog,
} from '../../shared/schema';
import { entitlementsService } from './EntitlementsService';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  console.warn('WARNING: STRIPE_WEBHOOK_SECRET not set. Webhook signature validation disabled.');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export interface WebhookHandlerResult {
  success: boolean;
  eventId: string;
  eventType: string;
  processed: boolean; // false if already processed (idempotent)
  error?: string;
}

export class StripeWebhookHandler {
  /**
   * Verify webhook signature and construct event
   */
  constructEvent(payload: string | Buffer, signature: string): Stripe.Event {
    if (!WEBHOOK_SECRET) {
      // In development without webhook secret, parse payload directly
      console.warn('Webhook signature validation skipped (no STRIPE_WEBHOOK_SECRET)');
      return JSON.parse(payload.toString());
    }

    return stripe.webhooks.constructEvent(payload, signature, WEBHOOK_SECRET);
  }

  /**
   * Check if event was already processed (idempotency)
   */
  private async isEventProcessed(eventId: string): Promise<boolean> {
    const existing = await db.query.webhookEvents.findFirst({
      where: eq(webhookEvents.eventId, eventId),
    });

    return existing?.status === 'processed';
  }

  /**
   * Mark event as processed
   */
  private async markEventProcessed(eventId: string, eventType: string): Promise<void> {
    await db
      .insert(webhookEvents)
      .values({
        eventId,
        eventType,
        status: 'processed',
        processedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: webhookEvents.eventId,
        set: {
          status: 'processed',
          processedAt: new Date(),
        },
      });
  }

  /**
   * Mark event as failed
   */
  private async markEventFailed(eventId: string, eventType: string, error: string): Promise<void> {
    const existing = await db.query.webhookEvents.findFirst({
      where: eq(webhookEvents.eventId, eventId),
    });

    if (existing) {
      await db
        .update(webhookEvents)
        .set({
          status: 'failed',
          retryCount: existing.retryCount + 1,
          errorMessage: error,
        })
        .where(eq(webhookEvents.id, existing.id));
    } else {
      await db.insert(webhookEvents).values({
        eventId,
        eventType,
        status: 'failed',
        retryCount: 1,
        errorMessage: error,
      });
    }
  }

  /**
   * Handle webhook event
   */
  async handleEvent(event: Stripe.Event): Promise<WebhookHandlerResult> {
    const eventId = event.id;
    const eventType = event.type;

    try {
      // Check idempotency
      if (await this.isEventProcessed(eventId)) {
        return {
          success: true,
          eventId,
          eventType,
          processed: false, // Already processed
        };
      }

      // Route to specific handler
      switch (eventType) {
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
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

        case 'customer.subscription.trial_will_end':
          await this.handleTrialWillEnd(event.data.object as Stripe.Subscription);
          break;

        default:
          console.log(`Unhandled event type: ${eventType}`);
      }

      // Mark as processed
      await this.markEventProcessed(eventId, eventType);

      return {
        success: true,
        eventId,
        eventType,
        processed: true,
      };
    } catch (error: any) {
      console.error(`Error processing webhook event ${eventId}:`, error);
      await this.markEventFailed(eventId, eventType, error.message);

      return {
        success: false,
        eventId,
        eventType,
        processed: false,
        error: error.message,
      };
    }
  }

  /**
   * Handle checkout.session.completed
   * Creates new trainer subscription in database
   */
  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const trainerId = session.metadata?.trainerId;
    const tier = session.metadata?.tier as 'starter' | 'professional' | 'enterprise';

    if (!trainerId || !tier) {
      throw new Error('Missing trainerId or tier in session metadata');
    }

    // Get subscription details from Stripe
    const subscriptionId = session.subscription as string;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Create trainer subscription in database
    const [trainerSub] = await db
      .insert(trainerSubscriptions)
      .values({
        trainerId,
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        tier,
        status: subscription.status as any,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      })
      .returning();

    // Create subscription items
    for (const item of subscription.items.data) {
      await db.insert(subscriptionItems).values({
        subscriptionId: trainerSub.id,
        kind: 'tier', // Default to tier, AI items will be added later
        stripePriceId: item.price.id,
        stripeSubscriptionItemId: item.id,
        status: subscription.status as any,
      });
    }

    // Initialize usage tracking for current period
    await db.insert(tierUsageTracking).values({
      trainerId,
      periodStart: new Date(subscription.current_period_start * 1000),
      periodEnd: new Date(subscription.current_period_end * 1000),
      customersCount: 0,
      mealPlansCount: 0,
      aiGenerationsCount: 0,
      exportsCsvCount: 0,
      exportsExcelCount: 0,
      exportsPdfCount: 0,
    });

    // Log payment event
    await db.insert(paymentLogs).values({
      trainerId,
      eventType: 'purchase',
      amount: (subscription.items.data[0].price.unit_amount || 0) / 100,
      currency: subscription.items.data[0].price.currency,
      status: 'completed',
      occurredAt: new Date(),
    });

    // Invalidate entitlements cache
    await entitlementsService.invalidateCache(trainerId);
  }

  /**
   * Handle customer.subscription.updated
   * Updates subscription status, tier, period dates
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const trainerId = subscription.metadata?.trainerId;

    if (!trainerId) {
      console.warn('No trainerId in subscription metadata, skipping update');
      return;
    }

    // Update trainer subscription
    await db
      .update(trainerSubscriptions)
      .set({
        tier: (subscription.metadata?.tier as any) || undefined,
        status: subscription.status as any,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        updatedAt: new Date(),
      })
      .where(eq(trainerSubscriptions.stripeSubscriptionId, subscription.id));

    // Update subscription items status
    const trainerSub = await db.query.trainerSubscriptions.findFirst({
      where: eq(trainerSubscriptions.stripeSubscriptionId, subscription.id),
    });

    if (trainerSub) {
      for (const item of subscription.items.data) {
        await db
          .update(subscriptionItems)
          .set({
            status: subscription.status as any,
            updatedAt: new Date(),
          })
          .where(eq(subscriptionItems.stripeSubscriptionItemId, item.id));
      }
    }

    // Log upgrade/downgrade if tier changed
    if (subscription.metadata?.previousTier && subscription.metadata?.tier !== subscription.metadata.previousTier) {
      const isUpgrade = ['starter', 'professional', 'enterprise'].indexOf(subscription.metadata.tier) >
        ['starter', 'professional', 'enterprise'].indexOf(subscription.metadata.previousTier);

      await db.insert(paymentLogs).values({
        trainerId,
        eventType: isUpgrade ? 'upgrade' : 'downgrade',
        amount: (subscription.items.data[0].price.unit_amount || 0) / 100,
        currency: subscription.items.data[0].price.currency,
        status: 'completed',
        metadata: {
          previousTier: subscription.metadata.previousTier,
          newTier: subscription.metadata.tier,
        },
        occurredAt: new Date(),
      });
    }

    // Invalidate entitlements cache
    await entitlementsService.invalidateCache(trainerId);
  }

  /**
   * Handle customer.subscription.deleted
   * Marks subscription as canceled
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    await db
      .update(trainerSubscriptions)
      .set({
        status: 'canceled',
        updatedAt: new Date(),
      })
      .where(eq(trainerSubscriptions.stripeSubscriptionId, subscription.id));

    // Invalidate entitlements cache
    const trainerSub = await db.query.trainerSubscriptions.findFirst({
      where: eq(trainerSubscriptions.stripeSubscriptionId, subscription.id),
    });

    if (trainerSub) {
      await entitlementsService.invalidateCache(trainerSub.trainerId);
    }
  }

  /**
   * Handle invoice.payment_succeeded
   * Logs successful payment and resets usage for new billing period
   */
  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = invoice.subscription as string;

    if (!subscriptionId) {
      return; // Not a subscription invoice
    }

    const trainerSub = await db.query.trainerSubscriptions.findFirst({
      where: eq(trainerSubscriptions.stripeSubscriptionId, subscriptionId),
    });

    if (!trainerSub) {
      console.warn(`Subscription not found for invoice ${invoice.id}`);
      return;
    }

    // Log payment
    await db.insert(paymentLogs).values({
      trainerId: trainerSub.trainerId,
      eventType: 'purchase',
      amount: invoice.amount_paid / 100,
      currency: invoice.currency,
      stripeInvoiceId: invoice.id,
      stripePaymentIntentId: invoice.payment_intent as string,
      status: 'completed',
      occurredAt: new Date(invoice.status_transitions.paid_at! * 1000),
    });

    // Reset usage tracking for new period (if period rolled over)
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const existingUsage = await db.query.tierUsageTracking.findFirst({
      where: and(
        eq(tierUsageTracking.trainerId, trainerSub.trainerId),
        eq(tierUsageTracking.periodEnd, trainerSub.currentPeriodEnd)
      ),
    });

    if (!existingUsage) {
      await db.insert(tierUsageTracking).values({
        trainerId: trainerSub.trainerId,
        periodStart: new Date(subscription.current_period_start * 1000),
        periodEnd: new Date(subscription.current_period_end * 1000),
        customersCount: 0,
        mealPlansCount: 0,
        aiGenerationsCount: 0,
        exportsCsvCount: 0,
        exportsExcelCount: 0,
        exportsPdfCount: 0,
      });
    }
  }

  /**
   * Handle invoice.payment_failed
   * Logs failed payment
   */
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = invoice.subscription as string;

    if (!subscriptionId) {
      return;
    }

    const trainerSub = await db.query.trainerSubscriptions.findFirst({
      where: eq(trainerSubscriptions.stripeSubscriptionId, subscriptionId),
    });

    if (!trainerSub) {
      return;
    }

    // Log failed payment
    await db.insert(paymentLogs).values({
      trainerId: trainerSub.trainerId,
      eventType: 'failed',
      amount: invoice.amount_due / 100,
      currency: invoice.currency,
      stripeInvoiceId: invoice.id,
      status: 'failed',
      occurredAt: new Date(),
    });

    // Update subscription status (will be updated via subscription.updated webhook too)
    await db
      .update(trainerSubscriptions)
      .set({
        status: 'past_due',
        updatedAt: new Date(),
      })
      .where(eq(trainerSubscriptions.id, trainerSub.id));

    // Invalidate cache
    await entitlementsService.invalidateCache(trainerSub.trainerId);
  }

  /**
   * Handle customer.subscription.trial_will_end
   * Send notification to trainer (optional)
   */
  private async handleTrialWillEnd(subscription: Stripe.Subscription): Promise<void> {
    // This could trigger an email notification
    // For now, just log it
    console.log(`Trial ending soon for subscription ${subscription.id}`);
  }
}

// Singleton instance
export const stripeWebhookHandler = new StripeWebhookHandler();
