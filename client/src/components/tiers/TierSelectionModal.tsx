/**
 * Tier Selection Modal Component
 *
 * Displays dynamic pricing for all three tiers and handles one-time tier purchase.
 * Fetches pricing from /api/v1/public/pricing endpoint.
 *
 * Features:
 * - Dynamic pricing from API (no hardcoded prices)
 * - Tier comparison with features list
 * - Lifetime access badges
 * - Stripe Checkout Session redirect
 * - Loading states and error handling
 *
 * Usage:
 * <TierSelectionModal open={isOpen} onClose={() => setIsOpen(false)} />
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Check, Loader2, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TierPricing {
  name: string;
  stripePriceId: string;
  amount: number; // in cents
  currency: string;
  features: string[];
  limits: {
    customers: number;
    mealPlans: number;
  };
}

interface PricingData {
  tiers: {
    starter: TierPricing;
    professional: TierPricing;
    enterprise: TierPricing;
  };
}

interface TierSelectionModalProps {
  open: boolean;
  onClose: () => void;
  currentTier?: 'starter' | 'professional' | 'enterprise' | null;
  onSuccess?: () => void;
}

export function TierSelectionModal({ open, onClose, currentTier, onSuccess }: TierSelectionModalProps) {
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [purchasingTier, setPurchasingTier] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch pricing on mount
  useEffect(() => {
    if (open) {
      fetchPricing();
    }
  }, [open]);

  const fetchPricing = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/public/pricing');
      if (!response.ok) {
        throw new Error('Failed to fetch pricing');
      }
      const data = await response.json();
      setPricing(data);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load pricing information. Please try again.',
      });
      console.error('Error fetching pricing:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (tier: 'starter' | 'professional' | 'enterprise') => {
    try {
      setPurchasingTier(tier);

      // Create Checkout Session for one-time payment
      const response = await fetch('/api/v1/tiers/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tier,
          successUrl: `${window.location.origin}/trainer?purchase=success`,
          cancelUrl: `${window.location.origin}/trainer?purchase=canceled`,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to start checkout process',
      });
      console.error('Purchase error:', error);
      setPurchasingTier(null);
    }
  };

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
    }).format(amount / 100);
  };

  const tierOrder: ('starter' | 'professional' | 'enterprise')[] = ['starter', 'professional', 'enterprise'];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Choose Your Tier</DialogTitle>
          <DialogDescription>
            Select the perfect tier for your fitness training business.
            <span className="block mt-2 text-green-600 font-semibold">
              ✨ One-time payment. Lifetime access.
            </span>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : pricing ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            {tierOrder.map((tierKey) => {
              const tier = pricing.tiers[tierKey];
              const isCurrentTier = currentTier === tierKey;
              const isPurchasing = purchasingTier === tierKey;
              const isPopular = tierKey === 'professional';

              return (
                <Card
                  key={tierKey}
                  className={`relative flex flex-col ${
                    isPopular ? 'border-primary shadow-lg scale-105' : ''
                  } ${isCurrentTier ? 'border-green-500' : ''}`}
                >
                  {isPopular && (
                    <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
                      <Zap className="w-3 h-3 mr-1" />
                      Most Popular
                    </Badge>
                  )}

                  {isCurrentTier && (
                    <Badge className="absolute -top-3 right-4 bg-green-500">
                      Current Tier
                    </Badge>
                  )}

                  <CardHeader className="text-center pb-4">
                    <CardTitle className="text-2xl">{tier.name}</CardTitle>
                    <div className="mt-4">
                      <span className="text-4xl font-bold">
                        {formatPrice(tier.amount, tier.currency)}
                      </span>
                      <span className="text-muted-foreground ml-2">one-time</span>
                    </div>
                    {tier.limits.customers === -1 ? (
                      <CardDescription className="mt-2">
                        Unlimited customers & meal plans
                      </CardDescription>
                    ) : (
                      <CardDescription className="mt-2">
                        Up to {tier.limits.customers} customers
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="flex-1">
                    <ul className="space-y-3">
                      {tier.features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter>
                    <Button
                      className="w-full"
                      variant={isPopular ? 'default' : 'outline'}
                      disabled={isCurrentTier || isPurchasing}
                      onClick={() => handlePurchase(tierKey)}
                    >
                      {isPurchasing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : isCurrentTier ? (
                        'Current Tier'
                      ) : (
                        'Get Started'
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ) : null}

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>All tiers include secure payment processing via Stripe.</p>
          <p>One-time payment. Lifetime access. 30-day money-back guarantee.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
