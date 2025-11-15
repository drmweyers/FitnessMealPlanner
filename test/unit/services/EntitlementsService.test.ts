/**
 * Unit Tests: EntitlementsService
 *
 * Comprehensive tests for tier entitlement checking, usage tracking, and feature access.
 * Tests the core tier system functionality with Redis caching.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EntitlementsService } from '../../../server/services/EntitlementsService';

// Mock dependencies
vi.mock('../../../server/db', () => ({
  db: {
    query: {
      trainerSubscriptions: {
        findFirst: vi.fn(),
      },
      subscriptionItems: {
        findMany: vi.fn(),
      },
      tierUsageTracking: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../../../server/services/RedisService', () => ({
  RedisService: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  })),
}));

import { db } from '../../../server/db';

describe('EntitlementsService', () => {
  let service: EntitlementsService;
  const mockTrainerId = 'trainer-123';

  beforeEach(async () => {
    service = new EntitlementsService();
    await service.initialize();
    vi.clearAllMocks();
  });

  describe('getTierLimits', () => {
    it('should return correct limits for Starter tier', () => {
      // Access private method via any cast for testing
      const limits = (service as any).getTierLimits('starter');

      expect(limits).toEqual({
        customers: 9,
        mealPlans: 50,
        aiGenerations: 100,
        recipes: 1000,
      });
    });

    it('should return correct limits for Professional tier', () => {
      const limits = (service as any).getTierLimits('professional');

      expect(limits).toEqual({
        customers: 20,
        mealPlans: 200,
        aiGenerations: 500,
        recipes: 2500,
      });
    });

    it('should return correct limits for Enterprise tier', () => {
      const limits = (service as any).getTierLimits('enterprise');

      expect(limits).toEqual({
        customers: -1, // unlimited
        mealPlans: -1, // unlimited
        aiGenerations: -1, // unlimited
        recipes: 4000,
      });
    });
  });

  describe('getTierFeatures', () => {
    it('should return correct features for Starter tier', () => {
      const features = (service as any).getTierFeatures('starter');

      expect(features).toEqual({
        analytics: false,
        apiAccess: false,
        bulkOperations: false,
        customBranding: false,
        exportFormats: ['pdf'],
      });
    });

    it('should return correct features for Professional tier', () => {
      const features = (service as any).getTierFeatures('professional');

      expect(features).toEqual({
        analytics: true,
        apiAccess: false,
        bulkOperations: true,
        customBranding: true,
        exportFormats: ['pdf', 'csv'],
      });
    });

    it('should return correct features for Enterprise tier', () => {
      const features = (service as any).getTierFeatures('enterprise');

      expect(features).toEqual({
        analytics: true,
        apiAccess: true,
        bulkOperations: true,
        customBranding: true,
        exportFormats: ['pdf', 'csv', 'excel'],
      });
    });
  });

  describe('getEntitlements', () => {
    it('should return null when no subscription exists', async () => {
      vi.mocked(db.query.trainerSubscriptions.findFirst).mockResolvedValue(null);

      const result = await service.getEntitlements(mockTrainerId);

      expect(result).toBeNull();
    });

    it('should return entitlements with usage data', async () => {
      const mockSubscription = {
        id: 'sub-123',
        trainerId: mockTrainerId,
        tier: 'professional',
        status: 'active',
        currentPeriodStart: new Date('2024-01-01'),
        currentPeriodEnd: new Date('2024-02-01'),
        cancelAtPeriodEnd: false,
      };

      const mockUsage = {
        trainerId: mockTrainerId,
        periodEnd: new Date('2024-02-01'),
        customersCount: 5,
        mealPlansCount: 25,
        aiGenerationsCount: 50,
      };

      vi.mocked(db.query.trainerSubscriptions.findFirst).mockResolvedValue(mockSubscription as any);
      vi.mocked(db.query.subscriptionItems.findMany).mockResolvedValue([]);
      vi.mocked(db.query.tierUsageTracking.findFirst).mockResolvedValue(mockUsage as any);

      const result = await service.getEntitlements(mockTrainerId);

      expect(result).toMatchObject({
        tier: 'professional',
        status: 'active',
        features: {
          analytics: true,
          customBranding: true,
          exportFormats: ['pdf', 'csv'],
        },
        limits: {
          customers: {
            max: 20,
            used: 5,
            percentage: 25,
          },
          mealPlans: {
            max: 200,
            used: 25,
            percentage: 12.5,
          },
        },
      });
    });

    it('should handle unlimited resources (Enterprise tier)', async () => {
      const mockSubscription = {
        id: 'sub-123',
        trainerId: mockTrainerId,
        tier: 'enterprise',
        status: 'active',
        currentPeriodStart: new Date('2024-01-01'),
        currentPeriodEnd: new Date('2024-02-01'),
        cancelAtPeriodEnd: false,
      };

      const mockUsage = {
        trainerId: mockTrainerId,
        periodEnd: new Date('2024-02-01'),
        customersCount: 100,
        mealPlansCount: 500,
      };

      vi.mocked(db.query.trainerSubscriptions.findFirst).mockResolvedValue(mockSubscription as any);
      vi.mocked(db.query.subscriptionItems.findMany).mockResolvedValue([]);
      vi.mocked(db.query.tierUsageTracking.findFirst).mockResolvedValue(mockUsage as any);

      const result = await service.getEntitlements(mockTrainerId);

      expect(result?.limits.customers).toEqual({
        max: -1,
        used: 100,
        percentage: 0, // Unlimited = 0% used
      });

      expect(result?.limits.mealPlans).toEqual({
        max: -1,
        used: 500,
        percentage: 0,
      });
    });
  });

  describe('checkFeatureAccess', () => {
    it('should deny access when no subscription exists', async () => {
      vi.mocked(db.query.trainerSubscriptions.findFirst).mockResolvedValue(null);

      const result = await service.checkFeatureAccess(mockTrainerId, 'analytics');

      expect(result).toEqual({
        allowed: false,
        reason: 'No active subscription',
        upgradeRequired: true,
      });
    });

    it('should deny access for canceled subscription', async () => {
      const mockSubscription = {
        id: 'sub-123',
        trainerId: mockTrainerId,
        tier: 'professional',
        status: 'canceled',
        currentPeriodStart: new Date('2024-01-01'),
        currentPeriodEnd: new Date('2024-02-01'),
        cancelAtPeriodEnd: true,
      };

      vi.mocked(db.query.trainerSubscriptions.findFirst).mockResolvedValue(mockSubscription as any);
      vi.mocked(db.query.subscriptionItems.findMany).mockResolvedValue([]);
      vi.mocked(db.query.tierUsageTracking.findFirst).mockResolvedValue(null);

      const result = await service.checkFeatureAccess(mockTrainerId, 'analytics');

      expect(result).toEqual({
        allowed: false,
        reason: 'Subscription canceled',
        upgradeRequired: true,
      });
    });

    it('should allow access to features included in tier', async () => {
      const mockSubscription = {
        id: 'sub-123',
        trainerId: mockTrainerId,
        tier: 'professional',
        status: 'active',
        currentPeriodStart: new Date('2024-01-01'),
        currentPeriodEnd: new Date('2024-02-01'),
        cancelAtPeriodEnd: false,
      };

      vi.mocked(db.query.trainerSubscriptions.findFirst).mockResolvedValue(mockSubscription as any);
      vi.mocked(db.query.subscriptionItems.findMany).mockResolvedValue([]);
      vi.mocked(db.query.tierUsageTracking.findFirst).mockResolvedValue(null);

      const result = await service.checkFeatureAccess(mockTrainerId, 'analytics');

      expect(result).toMatchObject({
        allowed: true,
        currentTier: 'professional',
      });
    });

    it('should deny access to features not included in tier', async () => {
      const mockSubscription = {
        id: 'sub-123',
        trainerId: mockTrainerId,
        tier: 'starter',
        status: 'active',
        currentPeriodStart: new Date('2024-01-01'),
        currentPeriodEnd: new Date('2024-02-01'),
        cancelAtPeriodEnd: false,
      };

      vi.mocked(db.query.trainerSubscriptions.findFirst).mockResolvedValue(mockSubscription as any);
      vi.mocked(db.query.subscriptionItems.findMany).mockResolvedValue([]);
      vi.mocked(db.query.tierUsageTracking.findFirst).mockResolvedValue(null);

      const result = await service.checkFeatureAccess(mockTrainerId, 'analytics');

      expect(result).toEqual({
        allowed: false,
        reason: 'Feature not available in starter tier',
        upgradeRequired: true,
        currentTier: 'starter',
      });
    });
  });

  describe('checkUsageLimit', () => {
    it('should allow resource creation when under limit', async () => {
      const mockSubscription = {
        id: 'sub-123',
        trainerId: mockTrainerId,
        tier: 'starter',
        status: 'active',
        currentPeriodStart: new Date('2024-01-01'),
        currentPeriodEnd: new Date('2024-02-01'),
        cancelAtPeriodEnd: false,
      };

      const mockUsage = {
        trainerId: mockTrainerId,
        periodEnd: new Date('2024-02-01'),
        customersCount: 5,
        mealPlansCount: 20,
      };

      vi.mocked(db.query.trainerSubscriptions.findFirst).mockResolvedValue(mockSubscription as any);
      vi.mocked(db.query.subscriptionItems.findMany).mockResolvedValue([]);
      vi.mocked(db.query.tierUsageTracking.findFirst).mockResolvedValue(mockUsage as any);

      const result = await service.checkUsageLimit(mockTrainerId, 'customers');

      expect(result).toMatchObject({
        allowed: true,
        currentTier: 'starter',
      });
    });

    it('should block resource creation when limit reached', async () => {
      const mockSubscription = {
        id: 'sub-123',
        trainerId: mockTrainerId,
        tier: 'starter',
        status: 'active',
        currentPeriodStart: new Date('2024-01-01'),
        currentPeriodEnd: new Date('2024-02-01'),
        cancelAtPeriodEnd: false,
      };

      const mockUsage = {
        trainerId: mockTrainerId,
        periodEnd: new Date('2024-02-01'),
        customersCount: 9, // Starter limit
        mealPlansCount: 20,
      };

      vi.mocked(db.query.trainerSubscriptions.findFirst).mockResolvedValue(mockSubscription as any);
      vi.mocked(db.query.subscriptionItems.findMany).mockResolvedValue([]);
      vi.mocked(db.query.tierUsageTracking.findFirst).mockResolvedValue(mockUsage as any);

      const result = await service.checkUsageLimit(mockTrainerId, 'customers');

      expect(result).toEqual({
        allowed: false,
        reason: 'customers limit reached (9/9)',
        upgradeRequired: true,
        currentTier: 'starter',
      });
    });

    it('should always allow for unlimited resources (Enterprise)', async () => {
      const mockSubscription = {
        id: 'sub-123',
        trainerId: mockTrainerId,
        tier: 'enterprise',
        status: 'active',
        currentPeriodStart: new Date('2024-01-01'),
        currentPeriodEnd: new Date('2024-02-01'),
        cancelAtPeriodEnd: false,
      };

      const mockUsage = {
        trainerId: mockTrainerId,
        periodEnd: new Date('2024-02-01'),
        customersCount: 1000,
        mealPlansCount: 5000,
      };

      vi.mocked(db.query.trainerSubscriptions.findFirst).mockResolvedValue(mockSubscription as any);
      vi.mocked(db.query.subscriptionItems.findMany).mockResolvedValue([]);
      vi.mocked(db.query.tierUsageTracking.findFirst).mockResolvedValue(mockUsage as any);

      const result = await service.checkUsageLimit(mockTrainerId, 'customers');

      expect(result).toEqual({
        allowed: true,
        currentTier: 'enterprise',
      });
    });
  });

  describe('checkExportFormat', () => {
    it('should allow PDF export for all tiers', async () => {
      const mockSubscription = {
        id: 'sub-123',
        trainerId: mockTrainerId,
        tier: 'starter',
        status: 'active',
        currentPeriodStart: new Date('2024-01-01'),
        currentPeriodEnd: new Date('2024-02-01'),
        cancelAtPeriodEnd: false,
      };

      vi.mocked(db.query.trainerSubscriptions.findFirst).mockResolvedValue(mockSubscription as any);
      vi.mocked(db.query.subscriptionItems.findMany).mockResolvedValue([]);
      vi.mocked(db.query.tierUsageTracking.findFirst).mockResolvedValue(null);

      const result = await service.checkExportFormat(mockTrainerId, 'pdf');

      expect(result.allowed).toBe(true);
    });

    it('should deny CSV export for Starter tier', async () => {
      const mockSubscription = {
        id: 'sub-123',
        trainerId: mockTrainerId,
        tier: 'starter',
        status: 'active',
        currentPeriodStart: new Date('2024-01-01'),
        currentPeriodEnd: new Date('2024-02-01'),
        cancelAtPeriodEnd: false,
      };

      vi.mocked(db.query.trainerSubscriptions.findFirst).mockResolvedValue(mockSubscription as any);
      vi.mocked(db.query.subscriptionItems.findMany).mockResolvedValue([]);
      vi.mocked(db.query.tierUsageTracking.findFirst).mockResolvedValue(null);

      const result = await service.checkExportFormat(mockTrainerId, 'csv');

      expect(result).toEqual({
        allowed: false,
        reason: 'CSV export not available in starter tier',
        upgradeRequired: true,
        currentTier: 'starter',
      });
    });

    it('should allow CSV export for Professional tier', async () => {
      const mockSubscription = {
        id: 'sub-123',
        trainerId: mockTrainerId,
        tier: 'professional',
        status: 'active',
        currentPeriodStart: new Date('2024-01-01'),
        currentPeriodEnd: new Date('2024-02-01'),
        cancelAtPeriodEnd: false,
      };

      vi.mocked(db.query.trainerSubscriptions.findFirst).mockResolvedValue(mockSubscription as any);
      vi.mocked(db.query.subscriptionItems.findMany).mockResolvedValue([]);
      vi.mocked(db.query.tierUsageTracking.findFirst).mockResolvedValue(null);

      const result = await service.checkExportFormat(mockTrainerId, 'csv');

      expect(result.allowed).toBe(true);
    });

    it('should deny Excel export for Professional tier', async () => {
      const mockSubscription = {
        id: 'sub-123',
        trainerId: mockTrainerId,
        tier: 'professional',
        status: 'active',
        currentPeriodStart: new Date('2024-01-01'),
        currentPeriodEnd: new Date('2024-02-01'),
        cancelAtPeriodEnd: false,
      };

      vi.mocked(db.query.trainerSubscriptions.findFirst).mockResolvedValue(mockSubscription as any);
      vi.mocked(db.query.subscriptionItems.findMany).mockResolvedValue([]);
      vi.mocked(db.query.tierUsageTracking.findFirst).mockResolvedValue(null);

      const result = await service.checkExportFormat(mockTrainerId, 'excel');

      expect(result).toEqual({
        allowed: false,
        reason: 'EXCEL export not available in professional tier',
        upgradeRequired: true,
        currentTier: 'professional',
      });
    });

    it('should allow all export formats for Enterprise tier', async () => {
      const mockSubscription = {
        id: 'sub-123',
        trainerId: mockTrainerId,
        tier: 'enterprise',
        status: 'active',
        currentPeriodStart: new Date('2024-01-01'),
        currentPeriodEnd: new Date('2024-02-01'),
        cancelAtPeriodEnd: false,
      };

      vi.mocked(db.query.trainerSubscriptions.findFirst).mockResolvedValue(mockSubscription as any);
      vi.mocked(db.query.subscriptionItems.findMany).mockResolvedValue([]);
      vi.mocked(db.query.tierUsageTracking.findFirst).mockResolvedValue(null);

      const pdfResult = await service.checkExportFormat(mockTrainerId, 'pdf');
      const csvResult = await service.checkExportFormat(mockTrainerId, 'csv');
      const excelResult = await service.checkExportFormat(mockTrainerId, 'excel');

      expect(pdfResult.allowed).toBe(true);
      expect(csvResult.allowed).toBe(true);
      expect(excelResult.allowed).toBe(true);
    });
  });
});
