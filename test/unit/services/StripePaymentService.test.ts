/**
 * Unit Tests: StripePaymentService
 *
 * Comprehensive tests for tier-based Stripe payment processing.
 * Tests all 3 tiers: Starter (FREE), Professional ($99), Enterprise ($299)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock environment variables before importing service
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_mock_secret';

// Mock Stripe before importing service
const mockStripe = {
  checkout: {
    sessions: {
      create: vi.fn(),
    },
  },
  customers: {
    create: vi.fn(),
    retrieve: vi.fn(),
  },
  webhooks: {
    constructEvent: vi.fn(),
  },
  billingPortal: {
    sessions: {
      create: vi.fn(),
    },
  },
  paymentMethods: {
    list: vi.fn(),
  },
};

vi.mock('stripe', () => {
  return {
    default: vi.fn(() => mockStripe),
  };
});

// Mock database
vi.mock('../../../server/db', () => ({
  db: {
    query: {
      trainerSubscriptions: {
        findFirst: vi.fn(),
      },
      users: {
        findFirst: vi.fn(),
      },
      webhookEvents: {
        findFirst: vi.fn(),
      },
      paymentLogs: {
        findMany: vi.fn(),
      },
    },
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../../server/services/EntitlementsService', () => ({
  entitlementsService: {
    invalidateCache: vi.fn().mockResolvedValue(undefined),
  },
}));

import { db } from '../../../server/db';
import { entitlementsService } from '../../../server/services/EntitlementsService';

// Import service after mocks
let stripePaymentService: any;

describe('StripePaymentService - 3-Tier System', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await import('../../../server/services/StripePaymentService');
    stripePaymentService = module.stripePaymentService;
  });

  describe('getPricing', () => {
    it('should return pricing for all 3 tiers', async () => {
      const pricing = await stripePaymentService.getPricing();

      expect(pricing).toHaveProperty('tiers');
      expect(pricing.tiers).toHaveProperty('starter');
      expect(pricing.tiers).toHaveProperty('professional');
      expect(pricing.tiers).toHaveProperty('enterprise');
    });

    it('should have correct pricing: Starter FREE, Professional $99, Enterprise $299', async () => {
      const pricing = await stripePaymentService.getPricing();

      expect(pricing.tiers.starter.amount).toBe(0); // FREE
      expect(pricing.tiers.professional.amount).toBe(9900); // $99.00
      expect(pricing.tiers.enterprise.amount).toBe(29900); // $299.00
    });

    it('should have correct tier features for Starter (FREE)', async () => {
      const pricing = await stripePaymentService.getPricing();

      expect(pricing.tiers.starter.features).toContain('9 customers');
      expect(pricing.tiers.starter.features).toContain('1,000 recipes');
      expect(pricing.tiers.starter.features).toContain('5 meal types');
    });

    it('should have correct tier features for Professional ($99)', async () => {
      const pricing = await stripePaymentService.getPricing();

      expect(pricing.tiers.professional.features).toContain('20 customers');
      expect(pricing.tiers.professional.features).toContain('2,500 recipes');
      expect(pricing.tiers.professional.features).toContain('Custom branding');
    });

    it('should have correct tier features for Enterprise ($299)', async () => {
      const pricing = await stripePaymentService.getPricing();

      expect(pricing.tiers.enterprise.features).toContain('Unlimited customers');
      expect(pricing.tiers.enterprise.features).toContain('4,000 recipes');
      expect(pricing.tiers.enterprise.features).toContain('White-label mode');
    });
  });

  describe('createCheckoutSession', () => {
    it('should create checkout session for Professional tier ($99)', async () => {
      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      };

      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession);
      mockStripe.customers.create.mockResolvedValue({ id: 'cus_123' });

      vi.mocked(db.query.trainerSubscriptions.findFirst).mockResolvedValue(null);
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: 'trainer-123',
        email: 'trainer@test.com',
      } as any);

      const result = await stripePaymentService.createCheckoutSession(
        'trainer-123',
        'professional',
        'http://localhost:4000/success',
        'http://localhost:4000/cancel'
      );

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('sessionId');
      expect(result.url).toBe('https://checkout.stripe.com/pay/cs_test_123');
    });

    it('should create checkout session for FREE Starter tier ($0)', async () => {
      const mockSession = {
        id: 'cs_test_starter',
        url: 'https://checkout.stripe.com/pay/cs_test_starter',
      };

      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession);
      mockStripe.customers.create.mockResolvedValue({ id: 'cus_123' });

      vi.mocked(db.query.trainerSubscriptions.findFirst).mockResolvedValue(null);
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: 'trainer-123',
        email: 'trainer@test.com',
      } as any);

      const result = await stripePaymentService.createCheckoutSession(
        'trainer-123',
        'starter',
        'http://localhost:4000/success',
        'http://localhost:4000/cancel'
      );

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('sessionId');
    });

    it('should create checkout session for Enterprise tier ($299)', async () => {
      const mockSession = {
        id: 'cs_test_enterprise',
        url: 'https://checkout.stripe.com/pay/cs_test_enterprise',
      };

      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession);
      mockStripe.customers.create.mockResolvedValue({ id: 'cus_ent' });

      vi.mocked(db.query.trainerSubscriptions.findFirst).mockResolvedValue(null);
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: 'trainer-456',
        email: 'trainer@enterprise.com',
      } as any);

      const result = await stripePaymentService.createCheckoutSession(
        'trainer-456',
        'enterprise',
        'http://localhost:4000/success',
        'http://localhost:4000/cancel'
      );

      expect(result).toHaveProperty('url');
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalled();
    });

    it('should throw error for invalid tier', async () => {
      await expect(
        stripePaymentService.createCheckoutSession(
          'trainer-123',
          'invalid-tier' as any,
          'http://localhost:4000/success',
          'http://localhost:4000/cancel'
        )
      ).rejects.toThrow('Invalid tier');
    });

    it('should reuse existing Stripe customer if available', async () => {
      const existingSubscription = {
        id: 'sub-123',
        trainerId: 'trainer-123',
        stripeCustomerId: 'cus_existing',
      };

      mockStripe.customers.retrieve.mockResolvedValue({
        id: 'cus_existing',
        deleted: false,
      });

      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      });

      vi.mocked(db.query.trainerSubscriptions.findFirst).mockResolvedValue(existingSubscription as any);

      await stripePaymentService.createCheckoutSession(
        'trainer-123',
        'enterprise',
        'http://localhost:4000/success',
        'http://localhost:4000/cancel'
      );

      expect(mockStripe.customers.retrieve).toHaveBeenCalledWith('cus_existing');
      expect(mockStripe.customers.create).not.toHaveBeenCalled();
    });
  });

  describe('handleWebhook', () => {
    it('should verify webhook signature', async () => {
      const mockEvent = {
        id: 'evt_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            customer: 'cus_123',
            metadata: {
              trainerId: 'trainer-123',
              tier: 'professional',
            },
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      vi.mocked(db.query.webhookEvents.findFirst).mockResolvedValue(null);
      vi.mocked(db.query.trainerSubscriptions.findFirst).mockResolvedValue(null);

      await stripePaymentService.handleWebhook('payload', 'signature');

      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        'payload',
        'signature',
        expect.any(String)
      );
    });

    it('should reject invalid webhook signatures', async () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await expect(
        stripePaymentService.handleWebhook('payload', 'invalid-signature')
      ).rejects.toThrow('Webhook signature verification failed');
    });

    it('should skip duplicate webhook events', async () => {
      const mockEvent = {
        id: 'evt_duplicate',
        type: 'checkout.session.completed',
        data: { object: {} },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      vi.mocked(db.query.webhookEvents.findFirst).mockResolvedValue({
        id: '1',
        stripeEventId: 'evt_duplicate',
        processed: true,
      } as any);

      const result = await stripePaymentService.handleWebhook('payload', 'signature');

      expect(result.received).toBe(true);
    });
  });

  describe('getBillingHistory', () => {
    it('should return billing history for trainer', async () => {
      const mockLogs = [
        {
          id: '1',
          trainerId: 'trainer-123',
          eventType: 'checkout.session.completed',
          amount: 9900,
          currency: 'usd',
          status: 'succeeded',
          createdAt: new Date('2024-01-01'),
        },
      ];

      vi.mocked(db.query.paymentLogs.findMany).mockResolvedValue(mockLogs as any);

      const history = await stripePaymentService.getBillingHistory('trainer-123');

      expect(history).toHaveLength(1);
      expect(history[0]).toHaveProperty('amount', 9900);
      expect(history[0]).toHaveProperty('status', 'succeeded');
    });

    it('should return empty array for trainer with no payments', async () => {
      vi.mocked(db.query.paymentLogs.findMany).mockResolvedValue([]);

      const history = await stripePaymentService.getBillingHistory('trainer-new');

      expect(history).toEqual([]);
    });
  });

  describe('Payment Descriptions', () => {
    it('should provide human-readable payment descriptions', async () => {
      const mockLogs = [
        {
          id: '1',
          trainerId: 'trainer-123',
          eventType: 'checkout.session.completed',
          amount: 9900,
          currency: 'usd',
          status: 'succeeded',
          createdAt: new Date('2024-01-01'),
        },
      ];

      vi.mocked(db.query.paymentLogs.findMany).mockResolvedValue(mockLogs as any);

      const history = await stripePaymentService.getBillingHistory('trainer-123');

      expect(history[0].description).toBe('Tier Purchase');
    });
  });

  describe('Tier Limits Validation', () => {
    it('should have correct customer limits per tier', async () => {
      const pricing = await stripePaymentService.getPricing();

      expect(pricing.tiers.starter.limits.customers).toBe(9);
      expect(pricing.tiers.professional.limits.customers).toBe(20);
      expect(pricing.tiers.enterprise.limits.customers).toBe(-1); // Unlimited
    });

    it('should have correct meal plan limits per tier', async () => {
      const pricing = await stripePaymentService.getPricing();

      expect(pricing.tiers.starter.limits.mealPlans).toBe(50);
      expect(pricing.tiers.professional.limits.mealPlans).toBe(200);
      expect(pricing.tiers.enterprise.limits.mealPlans).toBe(-1); // Unlimited
    });
  });
});
