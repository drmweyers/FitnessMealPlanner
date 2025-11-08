import { useTierInfo } from '@/hooks/useTierInfo';
import { Badge } from '@/components/ui/badge';
import { ChefHat, TrendingUp } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Story 2.14: Tier Access Badge Component
 *
 * Displays user's tier level and accessible recipe count
 * Shows monthly allocation in tooltip for context
 */
export function TierAccessBadge() {
  const { tierName, accessibleRecipeCount, monthlyAllocation } = useTierInfo();

  // Tier-specific styling
  const tierColors = {
    starter: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    professional: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
    enterprise: 'bg-amber-100 text-amber-800 hover:bg-amber-200'
  };

  const tierColor = tierColors[tierName.toLowerCase() as 'starter' | 'professional' | 'enterprise'] || tierColors.starter;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`${tierColor} cursor-help flex items-center gap-2 px-3 py-1`}
          >
            <ChefHat className="h-4 w-4" />
            <span className="font-semibold">{tierName}</span>
            <span className="text-xs">({accessibleRecipeCount.toLocaleString()} recipes)</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="font-semibold">Your {tierName} Tier Access</p>
            <div className="flex items-center gap-2 text-sm">
              <ChefHat className="h-4 w-4" />
              <span>Access to {accessibleRecipeCount.toLocaleString()} recipes</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>+{monthlyAllocation} new recipes each month</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
