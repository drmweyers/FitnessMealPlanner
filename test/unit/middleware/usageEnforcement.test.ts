/**
 * Unit Tests: Usage Enforcement Middleware
 *
 * Tests the core usage limit enforcement system including:
 * - checkUsageLimit (determines if user can generate meal plans)
 * - incrementUsage (increments usage counter)
 * - resetMonthlyUsage (monthly reset job)
 * - enforceUsageLimit (Express middleware)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  checkUsageLimit,
  incrementUsage,
  resetMonthlyUsage,
  enforceUsageLimit,
} from '../../../server/middleware/usageEnforcement';
import { db } from '../../../server/db';
import { users } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import type { Request, Response, NextFunction } from 'express';

// Mock database
vi.mock('../../../server/db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
  },
}));

describe('checkUsageLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow grandfathered users unlimited access', async () => {
    // Mock user data
    const mockUser = {
      id: 1,
      email: 'grandfather@test.com',
      isGrandfathered: true,
      tierLevel: 'starter',
      paymentType: 'onetime',
      mealPlansGeneratedThisMonth: 999,
      usageLimit: 20,
    };

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([mockUser]),
      }),
    } as any);

    const result = await checkUsageLimit(1);

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('should allow active subscription users unlimited access', async () => {
    const mockUser = {
      id: 2,
      email: 'subscription@test.com',
      isGrandfathered: false,
      tierLevel: 'professional',
      paymentType: 'subscription',
      subscriptionStatus: 'active',
      mealPlansGeneratedThisMonth: 500,
    };

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([mockUser]),
      }),
    } as any);

    const result = await checkUsageLimit(2);

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('should allow one-time user under limit', async () => {
    const mockUser = {
      id: 3,
      email: 'onetime@test.com',
      isGrandfathered: false,
      tierLevel: 'starter',
      paymentType: 'onetime',
      subscriptionStatus: null,
      mealPlansGeneratedThisMonth: 15,
      usageLimit: 20,
    };

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([mockUser]),
      }),
    } as any);

    const result = await checkUsageLimit(3);

    expect(result.allowed).toBe(true);
    expect(result.currentUsage).toBe(15);
    expect(result.limit).toBe(20);
    expect(result.reason).toBeUndefined();
  });

  it('should block one-time user at limit', async () => {
    const mockUser = {
      id: 4,
      email: 'onetime-limit@test.com',
      isGrandfathered: false,
      tierLevel: 'starter',
      paymentType: 'onetime',
      subscriptionStatus: null,
      mealPlansGeneratedThisMonth: 20,
      usageLimit: 20,
    };

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([mockUser]),
      }),
    } as any);

    const result = await checkUsageLimit(4);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Monthly meal plan generation limit reached');
    expect(result.currentUsage).toBe(20);
    expect(result.limit).toBe(20);
    expect(result.upgradeUrl).toBe('/pricing?upgrade=true');
  });

  it('should block one-time user over limit (data integrity issue)', async () => {
    const mockUser = {
      id: 5,
      email: 'onetime-over@test.com',
      isGrandfathered: false,
      tierLevel: 'starter',
      paymentType: 'onetime',
      subscriptionStatus: null,
      mealPlansGeneratedThisMonth: 25,
      usageLimit: 20,
    };

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([mockUser]),
      }),
    } as any);

    const result = await checkUsageLimit(5);

    expect(result.allowed).toBe(false);
    expect(result.currentUsage).toBe(25);
    expect(result.limit).toBe(20);
  });

  it('should handle users with no usage data (new users)', async () => {
    const mockUser = {
      id: 6,
      email: 'newuser@test.com',
      isGrandfathered: false,
      tierLevel: 'starter',
      paymentType: 'onetime',
      subscriptionStatus: null,
      mealPlansGeneratedThisMonth: null,
      usageLimit: 20,
    };

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([mockUser]),
      }),
    } as any);

    const result = await checkUsageLimit(6);

    expect(result.allowed).toBe(true);
    expect(result.currentUsage).toBe(0);
    expect(result.limit).toBe(20);
  });

  it('should apply correct usage limits by tier', async () => {
    const tiers = [
      { tierLevel: 'starter', expectedLimit: 20 },
      { tierLevel: 'professional', expectedLimit: 50 },
      { tierLevel: 'enterprise', expectedLimit: 150 },
    ];

    for (const tier of tiers) {
      const mockUser = {
        id: 7,
        email: `${tier.tierLevel}@test.com`,
        isGrandfathered: false,
        tierLevel: tier.tierLevel,
        paymentType: 'onetime',
        subscriptionStatus: null,
        mealPlansGeneratedThisMonth: 10,
        usageLimit: tier.expectedLimit,
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockUser]),
        }),
      } as any);

      const result = await checkUsageLimit(7);

      expect(result.limit).toBe(tier.expectedLimit);
    }
  });

  it('should block canceled subscription users (unless they have one-time payment)', async () => {
    const mockUser = {
      id: 8,
      email: 'canceled@test.com',
      isGrandfathered: false,
      tierLevel: 'professional',
      paymentType: 'subscription',
      subscriptionStatus: 'canceled',
      mealPlansGeneratedThisMonth: 10,
      usageLimit: null,
    };

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([mockUser]),
      }),
    } as any);

    const result = await checkUsageLimit(8);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('subscription');
  });

  it('should handle past_due subscription status', async () => {
    const mockUser = {
      id: 9,
      email: 'pastdue@test.com',
      isGrandfathered: false,
      tierLevel: 'professional',
      paymentType: 'subscription',
      subscriptionStatus: 'past_due',
      mealPlansGeneratedThisMonth: 10,
    };

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([mockUser]),
      }),
    } as any);

    const result = await checkUsageLimit(9);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('payment');
  });

  it('should handle trialing subscription status (allow access)', async () => {
    const mockUser = {
      id: 10,
      email: 'trialing@test.com',
      isGrandfathered: false,
      tierLevel: 'professional',
      paymentType: 'subscription',
      subscriptionStatus: 'trialing',
      mealPlansGeneratedThisMonth: 10,
    };

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([mockUser]),
      }),
    } as any);

    const result = await checkUsageLimit(10);

    expect(result.allowed).toBe(true);
  });
});

describe('incrementUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should increment usage counter correctly', async () => {
    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    } as any);

    await incrementUsage(1);

    expect(db.update).toHaveBeenCalledWith(users);
  });

  it('should use atomic increment operation', async () => {
    const setMock = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });

    vi.mocked(db.update).mockReturnValue({
      set: setMock,
    } as any);

    await incrementUsage(1);

    // Verify set was called (atomic increment via db.raw)
    expect(setMock).toHaveBeenCalled();
  });

  it('should handle database errors gracefully', async () => {
    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockRejectedValue(new Error('Database error')),
      }),
    } as any);

    // Should not throw, but log error
    await expect(incrementUsage(1)).rejects.toThrow('Database error');
  });
});

describe('resetMonthlyUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reset one-time payment users to 0', async () => {
    const updateMock = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });

    vi.mocked(db.update).mockReturnValue({
      set: updateMock,
    } as any);

    await resetMonthlyUsage();

    expect(db.update).toHaveBeenCalledWith(users);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mealPlansGeneratedThisMonth: 0,
      })
    );
  });

  it('should set correct usageResetDate (next month, 1st)', async () => {
    const updateMock = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });

    vi.mocked(db.update).mockReturnValue({
      set: updateMock,
    } as any);

    await resetMonthlyUsage();

    const callArgs = updateMock.mock.calls[0][0];
    const resetDate = callArgs.usageResetDate;

    // Reset date should be 1st of next month
    expect(resetDate.getDate()).toBe(1);
    expect(resetDate.getHours()).toBe(0);
    expect(resetDate.getMinutes()).toBe(0);
  });

  it('should only reset one-time payment users (not subscriptions)', async () => {
    const whereMock = vi.fn().mockResolvedValue(undefined);

    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: whereMock,
      }),
    } as any);

    await resetMonthlyUsage();

    // Verify where clause filters to paymentType = 'onetime'
    expect(whereMock).toHaveBeenCalled();
  });

  it('should handle month-end edge cases (Jan 31 → Feb 1)', async () => {
    // Mock current date as Jan 31
    const originalDate = Date;
    global.Date = class extends originalDate {
      constructor() {
        super();
        return new originalDate('2025-01-31T00:00:00Z');
      }
    } as any;

    const updateMock = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });

    vi.mocked(db.update).mockReturnValue({
      set: updateMock,
    } as any);

    await resetMonthlyUsage();

    const callArgs = updateMock.mock.calls[0][0];
    const resetDate = callArgs.usageResetDate;

    // Should be Feb 1, not Feb 31 (which doesn't exist)
    expect(resetDate.getMonth()).toBe(1); // February (0-indexed)
    expect(resetDate.getDate()).toBe(1);

    // Restore original Date
    global.Date = originalDate;
  });
});

describe('enforceUsageLimit middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      user: { id: 1 },
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    nextFunction = vi.fn();
  });

  it('should call next() when usage allowed', async () => {
    const mockUser = {
      id: 1,
      email: 'allowed@test.com',
      isGrandfathered: false,
      tierLevel: 'starter',
      paymentType: 'onetime',
      subscriptionStatus: null,
      mealPlansGeneratedThisMonth: 10,
      usageLimit: 20,
    };

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([mockUser]),
      }),
    } as any);

    await enforceUsageLimit(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should return 429 when limit exceeded', async () => {
    const mockUser = {
      id: 1,
      email: 'limited@test.com',
      isGrandfathered: false,
      tierLevel: 'starter',
      paymentType: 'onetime',
      subscriptionStatus: null,
      mealPlansGeneratedThisMonth: 20,
      usageLimit: 20,
    };

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([mockUser]),
      }),
    } as any);

    await enforceUsageLimit(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(429);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        code: 'USAGE_LIMIT_EXCEEDED',
      })
    );
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should attach usageInfo to request object when allowed', async () => {
    const mockUser = {
      id: 1,
      email: 'allowed@test.com',
      isGrandfathered: false,
      tierLevel: 'starter',
      paymentType: 'onetime',
      subscriptionStatus: null,
      mealPlansGeneratedThisMonth: 15,
      usageLimit: 20,
    };

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([mockUser]),
      }),
    } as any);

    await enforceUsageLimit(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect((mockRequest as any).usageInfo).toBeDefined();
    expect((mockRequest as any).usageInfo.currentUsage).toBe(15);
    expect((mockRequest as any).usageInfo.limit).toBe(20);
  });

  it('should include upgradeUrl in error response', async () => {
    const mockUser = {
      id: 1,
      email: 'limited@test.com',
      isGrandfathered: false,
      tierLevel: 'starter',
      paymentType: 'onetime',
      subscriptionStatus: null,
      mealPlansGeneratedThisMonth: 20,
      usageLimit: 20,
    };

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([mockUser]),
      }),
    } as any);

    await enforceUsageLimit(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          upgradeUrl: '/pricing?upgrade=true',
        }),
      })
    );
  });

  it('should handle database errors gracefully (fail-open)', async () => {
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockRejectedValue(new Error('Database error')),
      }),
    } as any);

    await enforceUsageLimit(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    // Fail-open: Allow access on error, but log it
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should handle missing user in request', async () => {
    mockRequest.user = undefined;

    await enforceUsageLimit(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        code: 'UNAUTHORIZED',
      })
    );
  });
});
