/**
 * Feature Gate Component
 *
 * Wraps tier-restricted features and shows upgrade prompts when access is denied.
 * Uses server-side entitlements to determine feature access.
 *
 * Features:
 * - Server-side feature access validation
 * - Locked state UI with upgrade prompts
 * - Loading and error states
 * - Customizable fallback UI
 * - Automatic tier detection and messaging
 *
 * Usage:
 * <FeatureGate feature="analytics">
 *   <AnalyticsDashboard />
 * </FeatureGate>
 */

import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Lock, Loader2, AlertCircle, ArrowUpRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Entitlements interface matching backend
interface TierEntitlements {
  tier: 'starter' | 'professional' | 'enterprise';
  status: 'trialing' | 'active' | 'past_due' | 'unpaid' | 'canceled';
  features: {
    analytics: boolean;
    apiAccess: boolean;
    bulkOperations: boolean;
    customBranding: boolean;
    exportFormats: string[];
  };
  limits: {
    customers: {
      limit: number;
      used: number;
      remaining: number;
    };
    mealPlans: {
      limit: number;
      used: number;
      remaining: number;
    };
    aiGenerations: {
      limit: number;
      used: number;
      remaining: number;
    };
  };
  billing: {
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    trialEnd: string | null;
  };
}

type FeatureName = keyof TierEntitlements['features'];
type ExportFormat = 'pdf' | 'csv' | 'excel';

interface FeatureGateProps {
  /** Feature to check access for */
  feature: FeatureName;
  /** Optional export format to check (for exportFormats feature) */
  exportFormat?: ExportFormat;
  /** Custom fallback UI when access is denied */
  fallback?: React.ReactNode;
  /** Content to render when access is granted */
  children: React.ReactNode;
  /** Callback when upgrade button is clicked */
  onUpgradeClick?: () => void;
  /** Show minimal locked UI (just icon, no upgrade prompt) */
  minimal?: boolean;
}

export function FeatureGate({
  feature,
  exportFormat,
  fallback,
  children,
  onUpgradeClick,
  minimal = false,
}: FeatureGateProps) {
  const [entitlements, setEntitlements] = useState<TierEntitlements | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchEntitlements();
  }, []);

  const fetchEntitlements = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/v1/tiers/current', {
        credentials: 'include',
      });

      if (response.status === 404) {
        // No active subscription - treat as no access
        setEntitlements(null);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch entitlements');
      }

      const data = await response.json();
      setEntitlements(data);
    } catch (err: any) {
      console.error('Error fetching entitlements:', err);
      setError(err.message || 'Failed to check feature access');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not verify feature access. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Check if user has access to the feature
  const hasAccess = (): boolean => {
    if (!entitlements) return false;

    // Check subscription status
    if (entitlements.status === 'canceled' || entitlements.status === 'unpaid') {
      return false;
    }

    // Check feature-specific access
    if (feature === 'exportFormats' && exportFormat) {
      return entitlements.features.exportFormats.includes(exportFormat);
    }

    return entitlements.features[feature] === true;
  };

  // Get recommended tier for this feature
  const getRequiredTier = (): string => {
    if (feature === 'analytics' || feature === 'bulkOperations') {
      return 'Professional';
    }
    if (feature === 'apiAccess' || feature === 'customBranding') {
      return 'Enterprise';
    }
    if (feature === 'exportFormats' && exportFormat) {
      if (exportFormat === 'pdf') return 'Starter';
      if (exportFormat === 'csv') return 'Professional';
      if (exportFormat === 'excel') return 'Professional';
    }
    return 'Professional';
  };

  // Get feature display name
  const getFeatureName = (): string => {
    const names: Record<FeatureName, string> = {
      analytics: 'Analytics Dashboard',
      apiAccess: 'API Access',
      bulkOperations: 'Bulk Operations',
      customBranding: 'Custom Branding',
      exportFormats: exportFormat ? `${exportFormat.toUpperCase()} Export` : 'Export Formats',
    };
    return names[feature] || feature;
  };

  // Handle upgrade button click
  const handleUpgrade = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
    } else {
      // Default: open tier selection modal (implementation depends on parent)
      toast({
        title: 'Upgrade Required',
        description: `Please upgrade to ${getRequiredTier()} tier to access ${getFeatureName()}.`,
      });
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to verify feature access. Please refresh the page.
        </AlertDescription>
      </Alert>
    );
  }

  // Access granted - render children
  if (hasAccess()) {
    return <>{children}</>;
  }

  // Access denied - render fallback or default locked UI
  if (fallback) {
    return <>{fallback}</>;
  }

  // Minimal locked UI
  if (minimal) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Lock className="h-4 w-4" />
        <span className="text-sm">Locked</span>
      </div>
    );
  }

  // Full locked UI with upgrade prompt
  return (
    <Card className="border-dashed">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">{getFeatureName()}</CardTitle>
        </div>
        <CardDescription>
          {entitlements
            ? `Upgrade to ${getRequiredTier()} tier to unlock this feature`
            : 'Active subscription required to access this feature'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entitlements?.status === 'canceled' && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Subscription Canceled</AlertTitle>
            <AlertDescription>
              Your subscription is canceled. Please reactivate or start a new subscription.
            </AlertDescription>
          </Alert>
        )}
        {entitlements?.status === 'unpaid' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Payment Required</AlertTitle>
            <AlertDescription>
              Your subscription payment failed. Please update your payment method.
            </AlertDescription>
          </Alert>
        )}
        {!entitlements && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Active Subscription</AlertTitle>
            <AlertDescription>
              Start a subscription to access {getFeatureName()} and other premium features.
            </AlertDescription>
          </Alert>
        )}
        {entitlements &&
          entitlements.status !== 'canceled' &&
          entitlements.status !== 'unpaid' && (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Current tier: <span className="font-semibold text-foreground capitalize">{entitlements.tier}</span></p>
              <p>Required tier: <span className="font-semibold text-foreground">{getRequiredTier()}</span></p>
            </div>
          )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleUpgrade} className="w-full">
          {entitlements ? 'Upgrade Plan' : 'Start Subscription'}
          <ArrowUpRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}

/**
 * Hook to check feature access programmatically
 * Useful for conditional logic outside of component rendering
 */
export function useFeatureAccess(feature: FeatureName, exportFormat?: ExportFormat) {
  const [entitlements, setEntitlements] = useState<TierEntitlements | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEntitlements();
  }, []);

  const fetchEntitlements = async () => {
    try {
      const response = await fetch('/api/v1/tiers/current', {
        credentials: 'include',
      });

      if (response.status === 404) {
        setEntitlements(null);
        setLoading(false);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setEntitlements(data);
      }
    } catch (err) {
      console.error('Error fetching entitlements:', err);
    } finally {
      setLoading(false);
    }
  };

  const hasAccess = (): boolean => {
    if (!entitlements) return false;
    if (entitlements.status === 'canceled' || entitlements.status === 'unpaid') {
      return false;
    }
    if (feature === 'exportFormats' && exportFormat) {
      return entitlements.features.exportFormats.includes(exportFormat);
    }
    return entitlements.features[feature] === true;
  };

  return {
    hasAccess: hasAccess(),
    loading,
    entitlements,
    currentTier: entitlements?.tier || null,
  };
}
