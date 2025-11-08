/**
 * Usage Limit Indicator Component
 *
 * Displays current lifetime usage vs tier limits with real-time tracking.
 * Provides visual warnings when approaching limits and upgrade prompts when exceeded.
 *
 * Features:
 * - Real-time lifetime usage tracking (customers, meal plans, AI generations)
 * - Visual progress bars with color-coded warnings
 * - Percentage-based thresholds (80% = warning, 100% = limit reached)
 * - Auto-refresh for up-to-date data
 * - Compact and expanded display modes
 *
 * Usage:
 * <UsageLimitIndicator resourceType="customers" />
 * <UsageLimitIndicator resourceType="aiGenerations" expanded />
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import {
  Loader2,
  Users,
  FileText,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Usage statistics from backend
interface UsageStatistics {
  limits: {
    customers: {
      limit: number; // -1 = unlimited
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
  tierInfo: {
    tier: string; // 'starter' | 'professional' | 'enterprise'
    purchasedAt: string; // ISO date
  };
}

type ResourceType = 'customers' | 'mealPlans' | 'aiGenerations';

interface UsageLimitIndicatorProps {
  /** Resource type to display */
  resourceType: ResourceType;
  /** Show expanded view with details */
  expanded?: boolean;
  /** Callback when upgrade button is clicked */
  onUpgradeClick?: () => void;
  /** Auto-refresh interval in milliseconds (default: 60000 = 1 minute) */
  refreshInterval?: number;
}

export function UsageLimitIndicator({
  resourceType,
  expanded = false,
  onUpgradeClick,
  refreshInterval = 60000, // 1 minute
}: UsageLimitIndicatorProps) {
  const [usage, setUsage] = useState<UsageStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsage();

    // Setup auto-refresh
    const interval = setInterval(fetchUsage, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const fetchUsage = async () => {
    try {
      setError(null);

      const response = await fetch('/api/v1/tiers/usage', {
        credentials: 'include',
      });

      if (response.status === 404) {
        setError('No active tier purchase');
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch usage statistics');
      }

      const data = await response.json();
      setUsage(data);
    } catch (err: any) {
      console.error('Error fetching usage:', err);
      setError(err.message || 'Failed to fetch usage');
    } finally {
      setLoading(false);
    }
  };

  // Get resource-specific data
  const getResourceData = () => {
    if (!usage) return null;

    const resource = usage.limits[resourceType];
    const isUnlimited = resource.limit === -1;

    return {
      ...resource,
      isUnlimited,
      percentage: isUnlimited ? 0 : (resource.used / resource.limit) * 100,
    };
  };

  // Get resource icon
  const getResourceIcon = () => {
    const icons = {
      customers: Users,
      mealPlans: FileText,
      aiGenerations: Sparkles,
    };
    return icons[resourceType];
  };

  // Get resource display name
  const getResourceName = () => {
    const names = {
      customers: 'Customers',
      mealPlans: 'Meal Plans',
      aiGenerations: 'AI Generations',
    };
    return names[resourceType];
  };

  // Get usage status (ok, warning, limit)
  const getUsageStatus = (percentage: number) => {
    if (percentage >= 100) return 'limit';
    if (percentage >= 80) return 'warning';
    return 'ok';
  };

  // Get status color
  const getStatusColor = (status: string) => {
    const colors = {
      ok: 'text-green-600',
      warning: 'text-yellow-600',
      limit: 'text-red-600',
    };
    return colors[status as keyof typeof colors] || 'text-gray-600';
  };

  // Get progress bar color
  const getProgressColor = (status: string) => {
    const colors = {
      ok: 'bg-green-600',
      warning: 'bg-yellow-600',
      limit: 'bg-red-600',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-600';
  };


  // Handle upgrade click
  const handleUpgrade = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
    } else {
      toast({
        title: 'Upgrade Required',
        description: `You've reached your ${getResourceName()} limit. Upgrade to increase your limits.`,
      });
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center gap-2 p-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading usage...</span>
      </div>
    );
  }

  // Error state
  if (error || !usage) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error || 'No tier data available'}</AlertDescription>
      </Alert>
    );
  }

  const resourceData = getResourceData();
  if (!resourceData) return null;

  const Icon = getResourceIcon();
  const status = resourceData.isUnlimited ? 'ok' : getUsageStatus(resourceData.percentage);

  // Compact view
  if (!expanded) {
    return (
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div className="flex items-center gap-3 flex-1">
          <Icon className={`h-5 w-5 ${getStatusColor(status)}`} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium">{getResourceName()}</span>
              {status === 'limit' && <Badge variant="destructive">Limit Reached</Badge>}
              {status === 'warning' && <Badge variant="outline" className="border-yellow-600 text-yellow-600">Low</Badge>}
            </div>
            {resourceData.isUnlimited ? (
              <span className="text-xs text-muted-foreground">Unlimited</span>
            ) : (
              <div className="flex items-center gap-2">
                <Progress
                  value={resourceData.percentage}
                  className="h-2 flex-1"
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {resourceData.used} / {resourceData.limit}
                </span>
              </div>
            )}
          </div>
        </div>
        {status === 'limit' && (
          <Button size="sm" variant="outline" onClick={handleUpgrade}>
            Upgrade
          </Button>
        )}
      </div>
    );
  }

  // Expanded view
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${getStatusColor(status)}`} />
            <CardTitle className="text-lg">{getResourceName()}</CardTitle>
          </div>
          {resourceData.isUnlimited && (
            <Badge variant="outline" className="border-green-600 text-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Unlimited
            </Badge>
          )}
        </div>
        <CardDescription>
          {resourceData.isUnlimited
            ? `You have unlimited ${getResourceName().toLowerCase()} with your tier`
            : `Total lifetime usage for your tier`}
        </CardDescription>
      </CardHeader>

      {!resourceData.isUnlimited && (
        <>
          <CardContent className="space-y-4">
            {/* Usage Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Usage</span>
                <span className={`font-semibold ${getStatusColor(status)}`}>
                  {resourceData.used} / {resourceData.limit}
                </span>
              </div>
              <Progress
                value={resourceData.percentage}
                className="h-3"
              />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {Math.round(resourceData.percentage)}% used
                </span>
                <span className="text-muted-foreground">
                  {resourceData.remaining} remaining
                </span>
              </div>
            </div>

            {/* Status Alert */}
            {status === 'limit' && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Limit Reached</AlertTitle>
                <AlertDescription>
                  You've reached your {getResourceName().toLowerCase()} limit for your tier.
                  Upgrade your tier to increase your limits.
                </AlertDescription>
              </Alert>
            )}

            {status === 'warning' && (
              <Alert>
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertTitle>Approaching Limit</AlertTitle>
                <AlertDescription>
                  You're using {Math.round(resourceData.percentage)}% of your {getResourceName().toLowerCase()} limit.
                  Consider upgrading to avoid interruptions.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>

          {status === 'limit' && (
            <CardFooter>
              <Button onClick={handleUpgrade} className="w-full">
                <TrendingUp className="mr-2 h-4 w-4" />
                Upgrade Tier
              </Button>
            </CardFooter>
          )}
        </>
      )}
    </Card>
  );
}

/**
 * Compact usage summary showing all resources
 */
interface UsageSummaryProps {
  onUpgradeClick?: () => void;
}

export function UsageSummary({ onUpgradeClick }: UsageSummaryProps) {
  return (
    <div className="space-y-3">
      <UsageLimitIndicator resourceType="customers" onUpgradeClick={onUpgradeClick} />
      <UsageLimitIndicator resourceType="mealPlans" onUpgradeClick={onUpgradeClick} />
      <UsageLimitIndicator resourceType="aiGenerations" onUpgradeClick={onUpgradeClick} />
    </div>
  );
}
