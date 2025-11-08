/**
 * Story 2.14: Settings Page Component
 *
 * Displays user's tier information and upgrade/downgrade options
 */

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTierInfo } from '@/hooks/useTierInfo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChefHat, TrendingUp, Crown, Zap } from 'lucide-react';
import { TierSelectionModal } from '@/components/tiers/TierSelectionModal';

export default function Settings() {
  const { user } = useAuth();
  const { tierName, tierLevel, accessibleRecipeCount, monthlyAllocation } = useTierInfo();
  const [showTierModal, setShowTierModal] = useState(false);

  // Tier upgrade/downgrade options
  const canUpgradeToProfessional = tierLevel === 'starter';
  const canUpgradeToEnterprise = tierLevel === 'professional';
  const canDowngradeToProfessional = tierLevel === 'enterprise';
  const canDowngradeToStarter = tierLevel === 'professional';

  return (
    <div className="space-y-6">
      {/* Current Tier Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Your Subscription</CardTitle>
              <CardDescription>Manage your tier and access</CardDescription>
            </div>
            <Badge
              data-testid="current-tier-badge"
              variant="outline"
              className={`
                px-4 py-2 text-lg font-semibold
                ${tierLevel === 'starter' ? 'bg-blue-100 text-blue-800 border-blue-300' : ''}
                ${tierLevel === 'professional' ? 'bg-purple-100 text-purple-800 border-purple-300' : ''}
                ${tierLevel === 'enterprise' ? 'bg-amber-100 text-amber-800 border-amber-300' : ''}
              `}
            >
              {tierLevel === 'starter' && <ChefHat className="h-5 w-5 mr-2 inline" />}
              {tierLevel === 'professional' && <Zap className="h-5 w-5 mr-2 inline" />}
              {tierLevel === 'enterprise' && <Crown className="h-5 w-5 mr-2 inline" />}
              {tierName}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-lg">
              <ChefHat className="h-6 w-6 text-slate-600 mt-1" />
              <div>
                <p className="font-semibold text-slate-900">Recipe Access</p>
                <p className="text-2xl font-bold text-slate-700">
                  {accessibleRecipeCount.toLocaleString()} recipes
                </p>
                <p className="text-sm text-slate-600">Available in your tier</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-slate-600 mt-1" />
              <div>
                <p className="font-semibold text-slate-900">Monthly Growth</p>
                <p className="text-2xl font-bold text-slate-700">
                  +{monthlyAllocation}
                </p>
                <p className="text-sm text-slate-600">New recipes each month</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Options */}
      {(canUpgradeToProfessional || canUpgradeToEnterprise) && (
        <Card>
          <CardHeader>
            <CardTitle>Upgrade Your Tier</CardTitle>
            <CardDescription>Get access to more recipes and features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {canUpgradeToProfessional && (
              <div className="flex items-center justify-between p-4 border border-purple-200 rounded-lg bg-purple-50">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="h-5 w-5 text-purple-600" />
                    <h3 className="font-semibold text-lg text-purple-900">Professional Tier</h3>
                  </div>
                  <p className="text-sm text-purple-700">2,500 recipes + 50 new recipes/month</p>
                  <p className="text-sm text-purple-600 mt-2" data-testid="upgrade-price">
                    Upgrade for $100/month
                  </p>
                </div>
                <Button
                  data-testid="upgrade-to-professional"
                  className="bg-purple-600 hover:bg-purple-700"
                  onClick={() => setShowTierModal(true)}
                >
                  Upgrade Now
                </Button>
              </div>
            )}
            {canUpgradeToEnterprise && (
              <div className="flex items-center justify-between p-4 border border-amber-200 rounded-lg bg-amber-50">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Crown className="h-5 w-5 text-amber-600" />
                    <h3 className="font-semibold text-lg text-amber-900">Enterprise Tier</h3>
                  </div>
                  <p className="text-sm text-amber-700">4,000 recipes + 100 new recipes/month</p>
                  <p className="text-sm text-amber-600 mt-2">
                    Upgrade for $200/month
                  </p>
                </div>
                <Button
                  className="bg-amber-600 hover:bg-amber-700"
                  onClick={() => setShowTierModal(true)}
                >
                  Upgrade Now
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Downgrade Options (if applicable) */}
      {(canDowngradeToStarter || canDowngradeToProfessional) && (
        <Card>
          <CardHeader>
            <CardTitle>Change Your Plan</CardTitle>
            <CardDescription>Downgrade to a lower tier if needed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {canDowngradeToProfessional && (
              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                <div>
                  <h3 className="font-semibold text-slate-900">Downgrade to Professional</h3>
                  <p className="text-sm text-slate-600">2,500 recipes + 50 new recipes/month</p>
                  <p className="text-sm text-slate-500 mt-2">Save $100/month</p>
                </div>
                <Button variant="outline">
                  Downgrade
                </Button>
              </div>
            )}
            {canDowngradeToStarter && (
              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                <div>
                  <h3 className="font-semibold text-slate-900">Downgrade to Starter</h3>
                  <p className="text-sm text-slate-600">1,000 recipes + 25 new recipes/month</p>
                  <p className="text-sm text-slate-500 mt-2">Save $100/month</p>
                </div>
                <Button variant="outline">
                  Downgrade
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Billing Management */}
      <Card>
        <CardHeader>
          <CardTitle>Billing & Subscription</CardTitle>
          <CardDescription>Manage your payment methods and billing history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Access the Stripe billing portal to update payment methods, view invoices, and manage your subscription.
            </p>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const response = await fetch('/api/v1/tiers/billing-portal', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                      returnUrl: window.location.href,
                    }),
                  });

                  if (response.ok) {
                    const { url } = await response.json();
                    window.location.href = url;
                  }
                } catch (error) {
                  console.error('Error opening billing portal:', error);
                }
              }}
            >
              Manage Billing
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-slate-600">Email</p>
            <p className="font-medium text-slate-900">{user?.email}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Name</p>
            <p className="font-medium text-slate-900">{user?.name || 'Not set'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Role</p>
            <p className="font-medium text-slate-900 capitalize">{user?.role}</p>
          </div>
        </CardContent>
      </Card>

      {/* Tier Selection Modal */}
      <TierSelectionModal
        open={showTierModal}
        onClose={() => setShowTierModal(false)}
        currentTier={tierLevel}
        onSuccess={() => {
          setShowTierModal(false);
          // Reload page to refresh tier information
          window.location.reload();
        }}
      />
    </div>
  );
}
