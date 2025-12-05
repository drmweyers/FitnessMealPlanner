import Stripe from 'stripe';

// Initialize Stripe with API key from environment
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
});

/**
 * Stripe Subscription Service
 * Handles all Stripe-related operations for hybrid pricing model
 */

// Subscription tier configuration
export const SUBSCRIPTION_TIERS = {
  STARTER: {
    name: 'Starter Pro',
    priceMonthly: 1499, // $14.99 in cents
    maxClients: 9,
    features: [
      'Up to 9 clients',
      'Essential recipe library',
      'AI meal plan generation',
      'PDF exports',
      'Email support',
    ],
  },
  PROFESSIONAL: {
    name: 'Professional Pro',
    priceMonthly: 2999, // $29.99 in cents
    maxClients: 20,
    features: [
      'Up to 20 clients',
      'Complete recipe library',
      'Advanced AI plans',
      'Progress tracking',
      'Priority support',
      'Custom branding',
    ],
  },
  ENTERPRISE: {
    name: 'Enterprise Pro',
    priceMonthly: 5999, // $59.99 in cents
    maxClients: 50,
    features: [
      'Up to 50 clients',
      'Unlimited recipes',
      'Team accounts',
      'API access',
      'White label options',
      'Dedicated support',
    ],
  },
};

// One-time payment tier configuration
export const ONETIME_TIERS = {
  STARTER: {
    name: 'Starter',
    price: 39900, // $399 in cents
    maxClients: 9,
    usageLimit: 50, // meal plans per month
    features: [
      'Up to 9 clients',
      '50 meal plans/month',
      'Essential recipe library',
      'AI meal plan generation',
      'PDF exports',
      'Email support',
      'Lifetime access',
    ],
  },
  PROFESSIONAL: {
    name: 'Professional',
    price: 59900, // $599 in cents
    maxClients: 20,
    usageLimit: 200, // meal plans per month
    features: [
      'Up to 20 clients',
      '200 meal plans/month',
      'Complete recipe library',
      'Advanced AI plans',
      'Progress tracking',
      'Priority support',
      'Custom branding',
      'Lifetime access',
    ],
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 99900, // $999 in cents
    maxClients: 50,
    usageLimit: 500, // meal plans per month
    features: [
      'Up to 50 clients',
      '500 meal plans/month',
      'Unlimited recipes',
      'Team accounts',
      'API access',
      'White label options',
      'Dedicated support',
      'Lifetime access',
    ],
  },
};

/**
 * Create a subscription checkout session
 */
export async function createSubscriptionCheckout({
  customerId,
  priceId,
  customerEmail,
  successUrl,
  cancelUrl,
}: {
  customerId?: string;
  priceId: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}) {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      customer_email: customerId ? undefined : customerEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      metadata: {
        customerEmail,
      },
    });

    return session;
  } catch (error) {
    console.error('Error creating subscription checkout:', error);
    throw error;
  }
}

/**
 * Create a one-time payment checkout session
 */
export async function createOnetimeCheckout({
  customerId,
  tier,
  customerEmail,
  successUrl,
  cancelUrl,
}: {
  customerId?: string;
  tier: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}) {
  try {
    const tierConfig = ONETIME_TIERS[tier];

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      customer_email: customerId ? undefined : customerEmail,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `EvoFitMeals ${tierConfig.name}`,
              description: `Lifetime access - ${tierConfig.usageLimit} meal plans/month`,
            },
            unit_amount: tierConfig.price,
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      metadata: {
        customerEmail,
        tier,
        paymentType: 'onetime',
      },
    });

    return session;
  } catch (error) {
    console.error('Error creating one-time checkout:', error);
    throw error;
  }
}

/**
 * Create or retrieve Stripe customer
 */
export async function getOrCreateCustomer({
  email,
  name,
  metadata,
}: {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}) {
  try {
    // Check if customer already exists
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0];
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email,
      name,
      metadata,
    });

    return customer;
  } catch (error) {
    console.error('Error getting or creating customer:', error);
    throw error;
  }
}

/**
 * Get subscription details
 */
export async function getSubscription(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('Error retrieving subscription:', error);
    throw error;
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.cancel(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

/**
 * Create customer portal session for subscription management
 */
export async function createCustomerPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}) {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session;
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    throw error;
  }
}

/**
 * Verify webhook signature
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
) {
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
    return event;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    throw error;
  }
}

/**
 * Get usage information for a customer
 */
export async function getCustomerUsage(customerId: string) {
  try {
    // This would query your database for usage information
    // Placeholder for now
    return {
      mealPlansGenerated: 0,
      currentPeriod: new Date(),
      limit: 0,
    };
  } catch (error) {
    console.error('Error getting customer usage:', error);
    throw error;
  }
}

export default stripe;
