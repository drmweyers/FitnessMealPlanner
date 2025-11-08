/**
 * Tier Enforcement Middleware
 *
 * Server-side feature gating and usage limit enforcement.
 * Returns 403 responses with upgrade prompts when tier limits are exceeded.
 * Canonical Source: docs/TIER_SOURCE_OF_TRUTH.md v2.0
 *
 * Usage:
 * - requireFeature('analytics') - Requires analytics feature
 * - requireUsageLimit('customers') - Checks customer creation limit
 * - requireExportFormat('csv') - Checks export format permission
 * - requireTier('professional') - Requires minimum tier level
 */

import { Request, Response, NextFunction } from 'express';
import { entitlementsService, TierFeatures, CheckAccessResult } from '../services/EntitlementsService';

interface TierEnforcementError {
  error: string;
  code: 'TIER_LIMIT_REACHED' | 'FEATURE_LOCKED' | 'SUBSCRIPTION_REQUIRED' | 'SUBSCRIPTION_INACTIVE';
  currentTier?: string;
  requiredTier?: string;
  upgradeRequired: boolean;
  message: string;
}

/**
 * Middleware to check if trainer has access to a feature
 */
export function requireFeature(feature: keyof TierFeatures) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || req.user.role !== 'trainer') {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const trainerId = req.user.id;
      const accessResult = await entitlementsService.checkFeatureAccess(trainerId, feature);

      if (!accessResult.allowed) {
        const error: TierEnforcementError = {
          error: 'Feature not available',
          code: 'FEATURE_LOCKED',
          currentTier: accessResult.currentTier,
          upgradeRequired: accessResult.upgradeRequired || false,
          message: accessResult.reason || `This feature requires a higher tier subscription`,
        };
        return res.status(403).json(error);
      }

      next();
    } catch (error: any) {
      console.error('Tier enforcement error:', error);
      return res.status(500).json({ error: 'Failed to check feature access' });
    }
  };
}

/**
 * Middleware to check usage limits before resource creation
 */
export function requireUsageLimit(resourceType: 'customers' | 'mealPlans' | 'aiGenerations') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || req.user.role !== 'trainer') {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const trainerId = req.user.id;
      const accessResult = await entitlementsService.checkUsageLimit(trainerId, resourceType);

      if (!accessResult.allowed) {
        const error: TierEnforcementError = {
          error: 'Usage limit reached',
          code: 'TIER_LIMIT_REACHED',
          currentTier: accessResult.currentTier,
          upgradeRequired: accessResult.upgradeRequired || false,
          message: accessResult.reason || `${resourceType} limit reached for your tier`,
        };
        return res.status(403).json(error);
      }

      next();
    } catch (error: any) {
      console.error('Usage limit check error:', error);
      return res.status(500).json({ error: 'Failed to check usage limit' });
    }
  };
}

/**
 * Middleware to check export format permissions
 */
export function requireExportFormat(format: 'pdf' | 'csv' | 'excel') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || req.user.role !== 'trainer') {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const trainerId = req.user.id;
      const accessResult = await entitlementsService.checkExportFormat(trainerId, format);

      if (!accessResult.allowed) {
        const error: TierEnforcementError = {
          error: 'Export format not available',
          code: 'FEATURE_LOCKED',
          currentTier: accessResult.currentTier,
          upgradeRequired: accessResult.upgradeRequired || false,
          message: accessResult.reason || `${format.toUpperCase()} export requires a higher tier`,
        };
        return res.status(403).json(error);
      }

      next();
    } catch (error: any) {
      console.error('Export format check error:', error);
      return res.status(500).json({ error: 'Failed to check export format permission' });
    }
  };
}

/**
 * Middleware to require minimum tier level
 */
export function requireTier(minimumTier: 'starter' | 'professional' | 'enterprise') {
  const tierLevels = { starter: 1, professional: 2, enterprise: 3 };
  const minimumLevel = tierLevels[minimumTier];

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || req.user.role !== 'trainer') {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const trainerId = req.user.id;
      const entitlements = await entitlementsService.getEntitlements(trainerId);

      if (!entitlements) {
        const error: TierEnforcementError = {
          error: 'No active subscription',
          code: 'SUBSCRIPTION_REQUIRED',
          requiredTier: minimumTier,
          upgradeRequired: true,
          message: 'Active subscription required to access this feature',
        };
        return res.status(403).json(error);
      }

      // Check subscription status
      if (entitlements.status === 'canceled' || entitlements.status === 'unpaid') {
        const error: TierEnforcementError = {
          error: 'Subscription inactive',
          code: 'SUBSCRIPTION_INACTIVE',
          currentTier: entitlements.tier,
          upgradeRequired: true,
          message: `Your subscription is ${entitlements.status}. Please update your payment method.`,
        };
        return res.status(403).json(error);
      }

      // Check tier level
      const currentLevel = tierLevels[entitlements.tier];
      if (currentLevel < minimumLevel) {
        const error: TierEnforcementError = {
          error: 'Tier upgrade required',
          code: 'FEATURE_LOCKED',
          currentTier: entitlements.tier,
          requiredTier: minimumTier,
          upgradeRequired: true,
          message: `This feature requires ${minimumTier} tier or higher`,
        };
        return res.status(403).json(error);
      }

      next();
    } catch (error: any) {
      console.error('Tier requirement check error:', error);
      return res.status(500).json({ error: 'Failed to check tier requirement' });
    }
  };
}

/**
 * Middleware to increment usage after successful resource creation
 * Should be used AFTER the resource is successfully created
 */
export function trackUsage(resourceType: 'customers' | 'mealPlans' | 'aiGenerations' | 'exportsCsv' | 'exportsExcel' | 'exportsPdf') {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original res.json to intercept successful responses
    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      // Only track usage if request was successful (2xx status)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        if (req.user && req.user.role === 'trainer') {
          entitlementsService.incrementUsage(req.user.id, resourceType)
            .catch(error => {
              console.error('Failed to track usage:', error);
              // Don't fail the request if usage tracking fails
            });
        }
      }

      return originalJson(body);
    };

    next();
  };
}

/**
 * Helper middleware to attach entitlements to request object
 * Useful for routes that need to check multiple permissions
 */
export async function attachEntitlements(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'trainer') {
      return next();
    }

    const trainerId = req.user.id;
    const entitlements = await entitlementsService.getEntitlements(trainerId);

    // Attach to request object for use in route handlers
    (req as any).entitlements = entitlements;

    next();
  } catch (error: any) {
    console.error('Failed to attach entitlements:', error);
    // Continue without entitlements (route handlers should check)
    next();
  }
}

/**
 * Helper function to check if request has entitlements attached
 */
export function hasEntitlements(req: Request): boolean {
  return !!(req as any).entitlements;
}

/**
 * Helper function to get entitlements from request
 */
export function getEntitlements(req: Request): any {
  return (req as any).entitlements;
}

/**
 * Story 2.14: Recipe Tier Filtering Middleware
 *
 * Attaches the user's tier level to the request for recipe filtering.
 * Progressive access model: Higher tiers can access all lower tier recipes.
 * - Starter: tier_level = 'starter' only (1,000 recipes)
 * - Professional: tier_level <= 'professional' (starter + professional = 2,500 recipes)
 * - Enterprise: tier_level <= 'enterprise' (all recipes = 4,000 recipes)
 *
 * Usage: Add to recipe routes before querying database
 * Route handlers should filter using: WHERE tier_level <= req.userTierLevel
 */
export async function attachRecipeTierFilter(req: Request, res: Response, next: NextFunction) {
  try {
    // Default to 'starter' tier if no authentication (public access)
    let userTier: 'starter' | 'professional' | 'enterprise' = 'starter';

    // Get tier from authenticated user
    if (req.user && req.user.role === 'trainer') {
      const trainerId = req.user.id;
      const entitlements = await entitlementsService.getEntitlements(trainerId);

      if (entitlements && entitlements.status === 'active') {
        userTier = entitlements.tier;
      }
    }

    // Attach tier to request for use in SQL queries
    (req as any).userTierLevel = userTier;

    // Attach tier numeric value for easier SQL comparisons
    const tierLevels = { starter: 1, professional: 2, enterprise: 3 };
    (req as any).userTierNumeric = tierLevels[userTier];

    next();
  } catch (error: any) {
    console.error('Failed to attach recipe tier filter:', error);
    // Default to starter tier on error (fail-safe)
    (req as any).userTierLevel = 'starter';
    (req as any).userTierNumeric = 1;
    next();
  }
}

/**
 * Helper function to get user's tier level from request
 */
export function getUserTierLevel(req: Request): 'starter' | 'professional' | 'enterprise' {
  return (req as any).userTierLevel || 'starter';
}

/**
 * Helper function to get user's tier numeric value (1=starter, 2=professional, 3=enterprise)
 */
export function getUserTierNumeric(req: Request): number {
  return (req as any).userTierNumeric || 1;
}
