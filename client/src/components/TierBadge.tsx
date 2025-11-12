/**
 * TierBadge Component
 *
 * Displays user's current tier with visual styling
 * Shows in navbar/dashboard to make tier status always visible
 */

import { useTier, TierLevel } from '@/hooks/useTier';
import { Badge } from '@/components/ui/badge';
import { Crown, Zap, Star } from 'lucide-react';

const TIER_CONFIG: Record<TierLevel, {
  label: string;
  icon: React.ReactNode;
  className: string;
  description: string;
}> = {
  starter: {
    label: 'Starter',
    icon: <Star className="h-3 w-3" />,
    className: 'bg-slate-100 text-slate-800 border-slate-300',
    description: '1,000 recipes • 5 meal types',
  },
  professional: {
    label: 'Professional',
    icon: <Zap className="h-3 w-3" />,
    className: 'bg-blue-100 text-blue-800 border-blue-300',
    description: '2,500 recipes • 10 meal types • Branding',
  },
  enterprise: {
    label: 'Enterprise',
    icon: <Crown className="h-3 w-3" />,
    className: 'bg-purple-100 text-purple-800 border-purple-300',
    description: '4,000 recipes • 17 meal types • White-label',
  },
};

interface TierBadgeProps {
  showDescription?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function TierBadge({ showDescription = false, size = 'md' }: TierBadgeProps) {
  const { tier, features } = useTier();
  const config = TIER_CONFIG[tier];

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant="outline"
        className={`${config.className} ${sizeClasses[size]} flex items-center gap-1.5 font-medium`}
      >
        {config.icon}
        <span>{config.label}</span>
      </Badge>
      {showDescription && (
        <span className="text-sm text-muted-foreground hidden sm:inline">
          {config.description}
        </span>
      )}
    </div>
  );
}

/**
 * TierBadgeWithUpgrade Component
 *
 * Shows tier badge with upgrade button for lower tiers
 */
export function TierBadgeWithUpgrade() {
  const { tier, isEnterprise } = useTier();

  return (
    <div className="flex items-center gap-3">
      <TierBadge showDescription />
      {!isEnterprise && (
        <button className="text-sm text-primary hover:underline font-medium">
          Upgrade →
        </button>
      )}
    </div>
  );
}
