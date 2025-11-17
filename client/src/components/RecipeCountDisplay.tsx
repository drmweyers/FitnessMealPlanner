/**
 * RecipeCountDisplay Component
 *
 * Shows available recipe count based on tier
 * Displays on dashboard to highlight tier value
 */

import { useState } from 'react';
import { useTier, useRecipeCount } from '@/hooks/useTier';
import { ChefHat, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TierSelectionModal } from './tiers/TierSelectionModal';

export function RecipeCountDisplay() {
  const { tier, features } = useTier();
  const { data: actualCount, isLoading } = useRecipeCount();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const maxRecipes = features.recipeCount;
  const currentCount = actualCount || 0;
  const percentage = Math.min((currentCount / maxRecipes) * 100, 100);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ChefHat className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Recipe Library</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Available in your {tier} tier
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{currentCount.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">
              of {maxRecipes.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2 mb-3">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Upgrade prompt if not at max tier */}
        {tier !== 'enterprise' && (
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>
                {tier === 'starter' ? '1,500' : '1,500'} more recipes with{' '}
                {tier === 'starter' ? 'Professional' : 'Enterprise'}
              </span>
            </div>
            <button 
              onClick={() => setShowUpgradeModal(true)}
              className="text-sm font-medium text-primary hover:underline"
            >
              Upgrade
            </button>
          </div>
        )}
      </CardContent>

      <TierSelectionModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentTier={tier}
      />
    </Card>
  );
}

/**
 * Compact version for sidebar/navbar
 */
export function RecipeCountBadge() {
  const { features } = useTier();
  const { data: actualCount } = useRecipeCount();

  return (
    <div className="flex items-center gap-2 text-sm">
      <ChefHat className="h-4 w-4 text-muted-foreground" />
      <span className="font-medium">
        {actualCount?.toLocaleString() || '—'}
      </span>
      <span className="text-muted-foreground">
        / {features.recipeCount.toLocaleString()} recipes
      </span>
    </div>
  );
}
