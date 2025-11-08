/**
 * Unit Tests: Usage Tracking Service
 *
 * Tests the usage tracking and analytics system including:
 * - trackUsage (log usage events)
 * - trackMealPlanGeneration (convenience wrapper)
 * - detectAbusePattern (abuse detection)
 * - getUserUsageStats (usage statistics)
 * - getUserUsageSummary (historical summary)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  trackUsage,
  trackMealPlanGeneration,
  detectAbusePattern,
  getUserUsageStats,
  getUserUsageSummary,
} from '../../../server/services/usageTracking';
import { db } from '../../../server/db';
import { usageTracking, users } from '../../../shared/schema';

// Mock database
vi.mock('../../../server/db', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
  },
}));

describe('trackUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should log meal plan generation event', async () => {
    const valuesMock = vi.fn().mockResolvedValue(undefined);

    vi.mocked(db.insert).mockReturnValue({
      values: valuesMock,
    } as any);

    await trackUsage({
      userId: 1,
      action: 'meal_plan_generated',
      resourceId: 'plan-123',
      metadata: { planName: 'Test Plan' },
    });

    expect(db.insert).toHaveBeenCalledWith(usageTracking);
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        action: 'meal_plan_generated',
        resourceId: 'plan-123',
      })
    );
  });

  it('should store metadata correctly as JSON', async () => {
    const valuesMock = vi.fn().mockResolvedValue(undefined);

    vi.mocked(db.insert).mockReturnValue({
      values: valuesMock,
    } as any);

    const metadata = {
      customerId: 5,
      planName: 'Custom Meal Plan',
      daysCount: 7,
      generationMethod: 'ai' as const,
    };

    await trackUsage({
      userId: 1,
      action: 'meal_plan_generated',
      resourceId: 'plan-456',
      metadata,
    });

    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata,
      })
    );
  });

  it('should set createdAt timestamp', async () => {
    const valuesMock = vi.fn().mockResolvedValue(undefined);

    vi.mocked(db.insert).mockReturnValue({
      values: valuesMock,
    } as any);

    await trackUsage({
      userId: 1,
      action: 'meal_plan_generated',
      resourceId: 'plan-789',
    });

    const callArgs = valuesMock.mock.calls[0][0];
    expect(callArgs.createdAt).toBeInstanceOf(Date);
  });

  it('should handle all action types', async () => {
    const actions = [
      'meal_plan_generated',
      'meal_plan_assigned',
      'recipe_created',
      'usage_limit_warning',
      'usage_limit_exceeded',
    ];

    const valuesMock = vi.fn().mockResolvedValue(undefined);

    vi.mocked(db.insert).mockReturnValue({
      values: valuesMock,
    } as any);

    for (const action of actions) {
      await trackUsage({
        userId: 1,
        action: action as any,
        resourceId: `resource-${action}`,
      });
    }

    expect(valuesMock).toHaveBeenCalledTimes(5);
  });

  it('should handle empty metadata', async () => {
    const valuesMock = vi.fn().mockResolvedValue(undefined);

    vi.mocked(db.insert).mockReturnValue({
      values: valuesMock,
    } as any);

    await trackUsage({
      userId: 1,
      action: 'meal_plan_generated',
      resourceId: 'plan-no-metadata',
      metadata: {},
    });

    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {},
      })
    );
  });
});

describe('trackMealPlanGeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create tracking event with meal_plan_generated action', async () => {
    const valuesMock = vi.fn().mockResolvedValue(undefined);

    vi.mocked(db.insert).mockReturnValue({
      values: valuesMock,
    } as any);

    await trackMealPlanGeneration(1, 'plan-123', {
      customerId: 5,
      planName: 'Weekly Plan',
      daysCount: 7,
      generationMethod: 'manual',
    });

    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'meal_plan_generated',
      })
    );
  });

  it('should include all metadata fields', async () => {
    const valuesMock = vi.fn().mockResolvedValue(undefined);

    vi.mocked(db.insert).mockReturnValue({
      values: valuesMock,
    } as any);

    await trackMealPlanGeneration(1, 'plan-456', {
      customerId: 10,
      planName: 'AI Generated Plan',
      daysCount: 14,
      generationMethod: 'ai',
    });

    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          customerId: 10,
          planName: 'AI Generated Plan',
          daysCount: 14,
          generationMethod: 'ai',
        },
      })
    );
  });

  it('should handle optional metadata fields', async () => {
    const valuesMock = vi.fn().mockResolvedValue(undefined);

    vi.mocked(db.insert).mockReturnValue({
      values: valuesMock,
    } as any);

    await trackMealPlanGeneration(1, 'plan-789', {
      planName: 'Minimal Plan',
    });

    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          planName: 'Minimal Plan',
        }),
      })
    );
  });
});

describe('detectAbusePattern', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should detect abuse when >50 plans in 24 hours', async () => {
    // Create 51 events in last 24 hours
    const mockEvents = Array(51)
      .fill(null)
      .map((_, i) => ({
        id: i,
        userId: 1,
        action: 'meal_plan_generated',
        createdAt: new Date(),
      }));

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockEvents),
          }),
        }),
      }),
    } as any);

    const result = await detectAbusePattern(1);

    expect(result).toBe(true);
  });

  it('should not flag normal usage (< 50 plans in 24 hours)', async () => {
    // Create 10 events in last 24 hours
    const mockEvents = Array(10)
      .fill(null)
      .map((_, i) => ({
        id: i,
        userId: 1,
        action: 'meal_plan_generated',
        createdAt: new Date(),
      }));

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockEvents),
          }),
        }),
      }),
    } as any);

    const result = await detectAbusePattern(1);

    expect(result).toBe(false);
  });

  it('should only count last 24 hours (not older events)', async () => {
    // 30 events in last 24 hours (should NOT trigger abuse)
    const recentEvents = Array(30)
      .fill(null)
      .map((_, i) => ({
        id: i,
        userId: 1,
        action: 'meal_plan_generated',
        createdAt: new Date(),
      }));

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(recentEvents),
          }),
        }),
      }),
    } as any);

    const result = await detectAbusePattern(1);

    expect(result).toBe(false);
  });

  it('should handle users with no events', async () => {
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    } as any);

    const result = await detectAbusePattern(1);

    expect(result).toBe(false);
  });

  it('should use ABUSE_THRESHOLD constant (50)', async () => {
    // Exactly 50 events (at threshold, not over)
    const mockEvents = Array(50)
      .fill(null)
      .map((_, i) => ({
        id: i,
        userId: 1,
        action: 'meal_plan_generated',
        createdAt: new Date(),
      }));

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockEvents),
          }),
        }),
      }),
    } as any);

    const result = await detectAbusePattern(1);

    // 50 = threshold, not abuse (need > 50)
    expect(result).toBe(false);
  });
});

describe('getUserUsageStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return current usage for one-time user', async () => {
    const mockUser = {
      id: 1,
      email: 'onetime@test.com',
      tierLevel: 'starter',
      paymentType: 'onetime',
      subscriptionStatus: null,
      mealPlansGeneratedThisMonth: 15,
      usageLimit: 20,
      usageResetDate: new Date('2025-02-01'),
    };

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([mockUser]),
      }),
    } as any);

    const stats = await getUserUsageStats(1);

    expect(stats.currentUsage).toBe(15);
    expect(stats.limit).toBe(20);
    expect(stats.isUnlimited).toBe(false);
    expect(stats.resetDate).toBeInstanceOf(Date);
  });

  it('should return unlimited status for subscription user', async () => {
    const mockUser = {
      id: 2,
      email: 'subscription@test.com',
      tierLevel: 'professional',
      paymentType: 'subscription',
      subscriptionStatus: 'active',
      mealPlansGeneratedThisMonth: 100,
      usageLimit: null,
    };

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([mockUser]),
      }),
    } as any);

    const stats = await getUserUsageStats(2);

    expect(stats.isUnlimited).toBe(true);
    expect(stats.limit).toBeNull();
    expect(stats.resetDate).toBeNull();
  });

  it('should return unlimited status for grandfathered user', async () => {
    const mockUser = {
      id: 3,
      email: 'grandfather@test.com',
      isGrandfathered: true,
      tierLevel: 'starter',
      paymentType: 'onetime',
      mealPlansGeneratedThisMonth: 500,
    };

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([mockUser]),
      }),
    } as any);

    const stats = await getUserUsageStats(3);

    expect(stats.isUnlimited).toBe(true);
  });

  it('should calculate warning level correctly', async () => {
    const testCases = [
      { usage: 5, limit: 20, expected: 'low' }, // 25%
      { usage: 16, limit: 20, expected: 'medium' }, // 80%
      { usage: 19, limit: 20, expected: 'high' }, // 95%
    ];

    for (const testCase of testCases) {
      const mockUser = {
        id: 1,
        tierLevel: 'starter',
        paymentType: 'onetime',
        mealPlansGeneratedThisMonth: testCase.usage,
        usageLimit: testCase.limit,
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockUser]),
        }),
      } as any);

      const stats = await getUserUsageStats(1);

      expect(stats.warningLevel).toBe(testCase.expected);
    }
  });

  it('should calculate usage percentage correctly', async () => {
    const mockUser = {
      id: 1,
      tierLevel: 'starter',
      paymentType: 'onetime',
      mealPlansGeneratedThisMonth: 15,
      usageLimit: 20,
    };

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([mockUser]),
      }),
    } as any);

    const stats = await getUserUsageStats(1);

    expect(stats.usagePercentage).toBe(75); // 15/20 * 100
  });

  it('should include reset date for one-time users', async () => {
    const resetDate = new Date('2025-03-01');

    const mockUser = {
      id: 1,
      tierLevel: 'starter',
      paymentType: 'onetime',
      mealPlansGeneratedThisMonth: 10,
      usageLimit: 20,
      usageResetDate: resetDate,
    };

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([mockUser]),
      }),
    } as any);

    const stats = await getUserUsageStats(1);

    expect(stats.resetDate).toEqual(resetDate);
  });

  it('should handle null usage (new users)', async () => {
    const mockUser = {
      id: 1,
      tierLevel: 'starter',
      paymentType: 'onetime',
      mealPlansGeneratedThisMonth: null,
      usageLimit: 20,
    };

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([mockUser]),
      }),
    } as any);

    const stats = await getUserUsageStats(1);

    expect(stats.currentUsage).toBe(0);
    expect(stats.usagePercentage).toBe(0);
  });
});

describe('getUserUsageSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return summary for specified number of days', async () => {
    const mockEvents = [
      { createdAt: new Date(), action: 'meal_plan_generated' },
      { createdAt: new Date(), action: 'meal_plan_generated' },
      { createdAt: new Date(), action: 'meal_plan_assigned' },
    ];

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockEvents),
        }),
      }),
    } as any);

    const summary = await getUserUsageSummary(1, 30);

    expect(summary.totalEvents).toBe(3);
    expect(summary.days).toBe(30);
  });

  it('should group events by action type', async () => {
    const mockEvents = [
      { createdAt: new Date(), action: 'meal_plan_generated' },
      { createdAt: new Date(), action: 'meal_plan_generated' },
      { createdAt: new Date(), action: 'meal_plan_assigned' },
      { createdAt: new Date(), action: 'recipe_created' },
    ];

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockEvents),
        }),
      }),
    } as any);

    const summary = await getUserUsageSummary(1, 30);

    expect(summary.byAction['meal_plan_generated']).toBe(2);
    expect(summary.byAction['meal_plan_assigned']).toBe(1);
    expect(summary.byAction['recipe_created']).toBe(1);
  });

  it('should calculate daily average', async () => {
    const mockEvents = Array(30)
      .fill(null)
      .map(() => ({
        createdAt: new Date(),
        action: 'meal_plan_generated',
      }));

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockEvents),
        }),
      }),
    } as any);

    const summary = await getUserUsageSummary(1, 30);

    expect(summary.averagePerDay).toBe(1); // 30 events / 30 days
  });

  it('should identify peak usage day', async () => {
    const peakDate = new Date('2025-01-15');

    const mockEvents = [
      { createdAt: peakDate, action: 'meal_plan_generated' },
      { createdAt: peakDate, action: 'meal_plan_generated' },
      { createdAt: peakDate, action: 'meal_plan_generated' },
      { createdAt: new Date('2025-01-16'), action: 'meal_plan_generated' },
    ];

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockEvents),
        }),
      }),
    } as any);

    const summary = await getUserUsageSummary(1, 30);

    expect(summary.peakDay.count).toBe(3);
    expect(summary.peakDay.date.toDateString()).toBe(peakDate.toDateString());
  });

  it('should handle users with no events', async () => {
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as any);

    const summary = await getUserUsageSummary(1, 30);

    expect(summary.totalEvents).toBe(0);
    expect(summary.averagePerDay).toBe(0);
    expect(summary.byAction).toEqual({});
  });
});
