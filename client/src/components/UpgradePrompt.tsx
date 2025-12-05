/**
 * UpgradePrompt Component
 *
 * Modal dialog shown when users try to access tier-locked features
 * Displays pricing and upgrade options
 */

import React from 'react';
import { useTier, TierLevel } from '@/hooks/useTier';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Crown, Zap, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface UpgradePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
  requiredTier: TierLevel;
}

const TIER_PRICING = {
  starter: { price: 0, label: 'Free' },
  professional: { price: 299, label: 'Professional' },
  enterprise: { price: 499, label: 'Enterprise' },
};

const TIER_FEATURES: Record<TierLevel, string[]> = {
  starter: [
    '1,000 recipes',
    '5 meal types',
    '9 customers',
    'Basic exports (PDF)',
  ],
  professional: [
    '2,500 recipes',
    '10 meal types',
    '20 customers',
    'Logo & color branding',
    'CSV/Excel exports',
    'Priority support',
  ],
  enterprise: [
    '4,000 recipes',
    '17 meal types',
    'Unlimited customers',
    'White-label mode',
    'Custom domain',
    'Advanced analytics',
    'Dedicated support',
  ],
};

export function UpgradePrompt({ open, onOpenChange, feature, requiredTier }: UpgradePromptProps) {
  const { tier } = useTier();
  const { toast } = useToast();

  const targetTierData = TIER_PRICING[requiredTier];
  const targetFeatures = TIER_FEATURES[requiredTier];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            {requiredTier === 'professional' && <Zap className="h-5 w-5 text-blue-600" />}
            {requiredTier === 'enterprise' && <Crown className="h-5 w-5 text-purple-600" />}
            <DialogTitle>Upgrade to {targetTierData.label}</DialogTitle>
          </div>
          <DialogDescription>
            Unlock <strong>{feature}</strong> and more with {targetTierData.label}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Pricing */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-6 text-center">
            <div className="text-4xl font-bold mb-2">
              ${targetTierData.price}
              <span className="text-lg font-normal text-muted-foreground">/one-time</span>
            </div>
            <p className="text-sm text-muted-foreground">Lifetime access • No recurring fees</p>
          </div>

          {/* Features */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              What's included
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {targetFeatures.map((feature, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Current tier notice */}
          <div className="bg-muted/50 rounded-lg p-4 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Your current tier:</p>
                <p className="text-muted-foreground capitalize">{tier}</p>
              </div>
              <Badge variant="outline" className="capitalize">
                {tier}
              </Badge>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-3">
            <Button 
              className="flex-1" 
              size="lg"
              onClick={async () => {
                try {
                  const response = await fetch('/api/v1/tiers/purchase', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                      tier: requiredTier,
                      successUrl: `${window.location.origin}${window.location.pathname}?purchase=success`,
                      cancelUrl: `${window.location.origin}${window.location.pathname}?purchase=canceled`,
                    }),
                  });

                  if (!response.ok) {
                    const error = await response.json();
                    // Handle test account error with user-friendly message
                    if (error.isTestAccount) {
                      toast({
                        variant: 'destructive',
                        title: error.error || 'Test Account',
                        description: error.message || 'This is a test account. Payment features are not available for test accounts.',
                      });
                      return;
                    }
                    throw new Error(error.message || error.error || 'Failed to create checkout session');
                  }

                  const { url } = await response.json();
                  window.location.href = url;
                } catch (error: any) {
                  console.error('Purchase error:', error);
                  toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: error.message || 'Failed to start checkout process',
                  });
                }
              }}
            >
              Upgrade Now
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => onOpenChange(false)}
            >
              Maybe Later
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Questions? Contact support@evofitmeals.com
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * useUpgradePrompt Hook
 *
 * Helper hook to manage upgrade prompt state
 */
export function useUpgradePrompt() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [feature, setFeature] = React.useState('');
  const [requiredTier, setRequiredTier] = React.useState<TierLevel>('professional');

  const showUpgradePrompt = (featureName: string, tier: TierLevel) => {
    setFeature(featureName);
    setRequiredTier(tier);
    setIsOpen(true);
  };

  return {
    isOpen,
    setIsOpen,
    feature,
    requiredTier,
    showUpgradePrompt,
  };
}
