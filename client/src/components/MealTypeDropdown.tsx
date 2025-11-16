/**
 * MealTypeDropdown Component
 *
 * Dropdown with tier-filtered meal types
 * Shows lock icons for inaccessible types with upgrade tooltips
 */

import { useMealTypes } from '@/hooks/useTier';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Lock } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MealType {
  id: string;
  name: string;
  displayName: string;
  tierLevel: 'starter' | 'professional' | 'enterprise';
  isAccessible: boolean;
  requiresUpgrade: boolean;
}

interface MealTypeDropdownProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function MealTypeDropdown({
  value,
  onChange,
  placeholder = 'Select meal type',
  className,
}: MealTypeDropdownProps) {
  const { data, isLoading } = useMealTypes();

  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger className={className}>
          <SelectValue placeholder="Loading meal types..." />
        </SelectTrigger>
      </Select>
    );
  }

  const mealTypes: MealType[] = data?.data?.mealTypes || [];
  const accessibleTypes = mealTypes.filter(mt => mt.isAccessible);
  const lockedTypes = mealTypes.filter(mt => !mt.isAccessible);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {/* Accessible meal types */}
        {accessibleTypes.map((mealType) => (
          <SelectItem key={mealType.id} value={mealType.name}>
            {mealType.displayName}
          </SelectItem>
        ))}

        {/* Locked meal types with tooltips */}
        {lockedTypes.length > 0 && (
          <>
            {accessibleTypes.length > 0 && (
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1">
                Upgrade to unlock
              </div>
            )}
            {lockedTypes.map((mealType) => (
              <TooltipProvider key={mealType.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative flex items-center px-2 py-1.5 text-sm text-muted-foreground cursor-not-allowed opacity-60">
                      <Lock className="h-3 w-3 mr-2" />
                      {mealType.displayName}
                      <span className="ml-auto text-xs capitalize">
                        {mealType.tierLevel}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-semibold">
                      Upgrade to {mealType.tierLevel}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Access {mealType.displayName} meal plans
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </>
        )}
      </SelectContent>
    </Select>
  );
}

/**
 * MealTypeList Component
 *
 * Alternative list view showing all meal types with lock status
 */
export function MealTypeList() {
  const { data, isLoading } = useMealTypes();

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  const mealTypes: MealType[] = data?.data?.mealTypes || [];

  return (
    <div className="space-y-2">
      {mealTypes.map((mealType) => (
        <div
          key={mealType.id}
          className={`flex items-center justify-between p-3 rounded-lg border ${
            mealType.isAccessible
              ? 'bg-background'
              : 'bg-muted/50 opacity-60'
          }`}
        >
          <div className="flex items-center gap-3">
            {!mealType.isAccessible && (
              <Lock className="h-4 w-4 text-muted-foreground" />
            )}
            <div>
              <div className="font-medium">{mealType.displayName}</div>
              {!mealType.isAccessible && (
                <div className="text-xs text-muted-foreground">
                  Requires {mealType.tierLevel} tier
                </div>
              )}
            </div>
          </div>
          {!mealType.isAccessible && (
            <button className="text-sm text-primary hover:underline">
              Upgrade
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
