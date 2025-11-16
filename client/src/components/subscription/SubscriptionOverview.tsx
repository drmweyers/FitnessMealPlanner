/**
 * Subscription Overview Component
 *
 * Displays current subscription status, usage, and tier information
 * for trainers. Shows upgrade/downgrade options and usage metrics.
 */

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { useTier } from '@/hooks/useTier';
import {
  CreditCard,
  TrendingUp,
  Users,
  FileText,
  Zap,
  AlertCircle,
  Check,
  Crown,
  Loader2,
} from 'lucide-react';
import { useState } from 'react';
import { TierSelectionModal } from '../tiers/TierSelectionModal';

interface SubscriptionData {
  tier: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  limits: {
    customers: { max: number; used: number; percentage: number };
    mealPlans: { max: number; used: number; percentage: number };
  };
}

export function SubscriptionOverview() {
  const { tier, isLoading: tierLoading } = useTier();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Fetch subscription details
  const { data: subscription, isLoading, error } = useQuery<SubscriptionData>({
    queryKey: ['subscription-details'],
    queryFn: async () => {
      const response = await fetch('/api/entitlements', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch subscription details');
      const data = await response.json();
      return data;
    },
  });

  if (isLoading || tierLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error || !subscription) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load subscription details. Please refresh the page.
        </AlertDescription>
      </Alert>
    );
  }

  const tierInfo = {
    starter: {
      name: 'Starter',
      icon: Check,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    professional: {
      name: 'Professional',
      icon: Zap,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
    },
    enterprise: {
      name: 'Enterprise',
      icon: Crown,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
    },
  };

  const currentTierInfo = tierInfo[subscription.tier];
  const TierIcon = currentTierInfo.icon;

  const statusBadge = {
    active: <Badge className="bg-green-500">Active</Badge>,
    trialing: <Badge className="bg-blue-500">Trial</Badge>,
    past_due: <Badge variant="destructive">Past Due</Badge>,
    canceled: <Badge variant="secondary">Canceled</Badge>,
    unpaid: <Badge variant="destructive">Unpaid</Badge>,
  };

  const canUpgrade =
    subscription.tier === 'starter' || subscription.tier === 'professional';

  return (
    <>
      <div className="grid gap-6">
        {/* Main Subscription Card */}
        <Card className={`${currentTierInfo.borderColor} border-2`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`${currentTierInfo.bgColor} p-3 rounded-lg`}>
                  <TierIcon className={`h-6 w-6 ${currentTierInfo.color}`} />
                </div>
                <div>
                  <CardTitle className="text-2xl">
                    {currentTierInfo.name} Tier
                  </CardTitle>
                  <CardDescription>
                    {subscription.status === 'active'
                      ? `Active until ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                      : `Status: ${subscription.status}`}
                  </CardDescription>
                </div>
              </div>
              <div>{statusBadge[subscription.status]}</div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {subscription.cancelAtPeriodEnd && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your subscription will be canceled on{' '}
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </AlertDescription>
              </Alert>
            )}

            {subscription.status === 'past_due' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your payment is past due. Please update your payment method to
                  avoid service interruption.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex gap-2">
            {canUpgrade && (
              <Button onClick={() => setShowUpgradeModal(true)}>
                <TrendingUp className="mr-2 h-4 w-4" />
                Upgrade Tier
              </Button>
            )}
            <Button variant="outline">
              <CreditCard className="mr-2 h-4 w-4" />
              Manage Billing
            </Button>
          </CardFooter>
        </Card>

        {/* Usage Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customers Usage */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0 flex-shrink">
                  <Users className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <CardTitle className="text-base sm:text-lg truncate">Customers</CardTitle>
                </div>
                <Badge variant="outline" className="flex-shrink-0 whitespace-nowrap text-xs sm:text-sm">
                  {subscription.limits.customers.used}/{subscription.limits.customers.max === -1 ? '∞' : subscription.limits.customers.max}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Progress
                value={subscription.limits.customers.percentage}
                className="h-2"
              />
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                {subscription.limits.customers.max === -1
                  ? 'Unlimited customers'
                  : `${Math.round(subscription.limits.customers.percentage)}% used`}
              </p>
            </CardContent>
          </Card>

          {/* Meal Plans Usage */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0 flex-shrink">
                  <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <CardTitle className="text-base sm:text-lg truncate">Meal Plans</CardTitle>
                </div>
                <Badge variant="outline" className="flex-shrink-0 whitespace-nowrap text-xs sm:text-sm">
                  {subscription.limits.mealPlans.used}/{subscription.limits.mealPlans.max === -1 ? '∞' : subscription.limits.mealPlans.max}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Progress
                value={subscription.limits.mealPlans.percentage}
                className="h-2"
              />
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                {subscription.limits.mealPlans.max === -1
                  ? 'Unlimited meal plans'
                  : `${Math.round(subscription.limits.mealPlans.percentage)}% used`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tier Comparison */}
        {canUpgrade && (
          <Card>
            <CardHeader>
              <CardTitle>Unlock More Features</CardTitle>
              <CardDescription>
                Upgrade your tier to access more customers, meal plans, and exclusive features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-2">Starter</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>✓ 9 customers</li>
                    <li>✓ 50 meal plans</li>
                    <li>✓ PDF exports</li>
                    <li>✓ 1,000 recipes</li>
                    <li>✓ 5 meal types</li>
                  </ul>
                </div>
                <div className="border-l-2 border-primary pl-4">
                  <h4 className="font-semibold mb-2 text-primary">Professional</h4>
                  <ul className="space-y-1">
                    <li>✓ 20 customers</li>
                    <li>✓ 200 meal plans</li>
                    <li>✓ CSV & Excel exports</li>
                    <li>✓ 2,500 recipes</li>
                    <li>✓ 10 meal types</li>
                    <li>✓ Custom branding</li>
                    <li>✓ Analytics dashboard</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Enterprise</h4>
                  <ul className="space-y-1">
                    <li>✓ Unlimited customers</li>
                    <li>✓ Unlimited meal plans</li>
                    <li>✓ All export formats</li>
                    <li>✓ 4,000 recipes</li>
                    <li>✓ 17 meal types</li>
                    <li>✓ White-label mode</li>
                    <li>✓ Custom domain</li>
                    <li>✓ API access</li>
                  </ul>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => setShowUpgradeModal(true)} className="w-full">
                <TrendingUp className="mr-2 h-4 w-4" />
                View Upgrade Options
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>

      <TierSelectionModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentTier={subscription.tier}
      />
    </>
  );
}
