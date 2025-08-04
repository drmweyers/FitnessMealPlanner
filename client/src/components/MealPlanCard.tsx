import React, { memo, useMemo, useCallback } from 'react';
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import type { CustomerMealPlan } from "@shared/schema";
import { Calendar, Users, Utensils, Clock, Zap, Target, Activity } from "lucide-react";
import { useSafeMealPlan } from '../hooks/useSafeMealPlan';

interface MealPlanCardProps {
  mealPlan: CustomerMealPlan;
  onClick?: () => void;
}

function MealPlanCard({ mealPlan, onClick }: MealPlanCardProps) {
  const {
    isValid,
    validMeals,
    days,
    planName,
    fitnessGoal,
    nutrition,
    mealTypes,
    hasMeals
  } = useSafeMealPlan(mealPlan);

  // Memoize expensive calculations
  const mealsPerDay = useMemo(() => Math.round(validMeals.length / days), [validMeals.length, days]);
  const totalMeals = useMemo(() => validMeals.length, [validMeals.length]);
  const assignedDate = useMemo(() => {
    if (mealPlan.assignedAt) {
      return new Date(mealPlan.assignedAt).toLocaleDateString();
    }
    return null;
  }, [mealPlan.assignedAt]);

  // Memoize display meal types to avoid recalculating slice operations
  const displayMealTypes = useMemo(() => {
    const visibleTypes = mealTypes.slice(0, 3);
    const extraCount = mealTypes.length - 3;
    return { visibleTypes, extraCount };
  }, [mealTypes]);

  // Memoize click handler to prevent recreation on every render
  const handleClick = useCallback(() => {
    onClick?.();
  }, [onClick]);
  
  // Early return with error display if invalid meal plan
  if (!isValid) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4">
          <div className="text-red-600">
            <h3 className="font-semibold">Error: Invalid meal plan data</h3>
          </div>
        </CardContent>
      </Card>
    );
  }

  try {
    const { avgCaloriesPerDay, avgProteinPerDay } = nutrition;

    return (
      <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border border-slate-200 hover:border-slate-300 h-full">
        <div className="relative">
          {/* Header with gradient background */}
          <div className="w-full h-24 sm:h-28 md:h-32 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-t-xl flex items-center justify-center">
            <div className="text-center px-2">
              <Utensils className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-blue-600 mx-auto mb-1 sm:mb-2" />
              <span className="text-blue-700 font-medium text-xs sm:text-sm">
                {days} Day Plan
              </span>
            </div>
          </div>
        </div>

        <CardContent className="p-2 xs:p-3 sm:p-4" onClick={handleClick}>
          <div className="space-y-1 xs:space-y-2 sm:space-y-3">
            {/* Plan Name */}
            <h3 className="font-semibold text-slate-900 line-clamp-2 leading-tight text-xs xs:text-sm sm:text-base">
              {planName}
            </h3>

            {/* Fitness Goal */}
            <div className="flex items-center gap-1 min-w-0">
              <Target className="h-3 w-3 text-green-500 flex-shrink-0" />
              <Badge variant="outline" className="text-xs px-2 py-1 truncate max-w-full">
                {fitnessGoal}
              </Badge>
            </div>

            {/* Meal Types */}
            {mealTypes.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {displayMealTypes.visibleTypes.map((type: string) => (
                  <Badge key={type} variant="secondary" className="text-xs px-2 py-1">
                    {type}
                  </Badge>
                ))}
                {displayMealTypes.extraCount > 0 && (
                  <Badge variant="outline" className="text-xs px-2 py-1">
                    +{displayMealTypes.extraCount}
                  </Badge>
                )}
              </div>
            )}

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-1 xs:gap-2 sm:gap-3 pt-1 xs:pt-2 border-t border-slate-100">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Zap className="h-3 w-3 text-orange-500" />
                  <span className="text-xs sm:text-sm font-medium text-slate-600">Calories</span>
                </div>
                <div className="text-lg sm:text-xl font-bold text-orange-600">
                  {avgCaloriesPerDay}
                </div>
                <div className="text-xs text-slate-500">per day</div>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Activity className="h-3 w-3 text-green-500" />
                  <span className="text-xs sm:text-sm font-medium text-slate-600">Protein</span>
                </div>
                <div className="text-lg sm:text-xl font-bold text-green-600">
                  {avgProteinPerDay}g
                </div>
                <div className="text-xs text-slate-500">per day</div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1 xs:pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1">
                <Utensils className="h-3 w-3" />
                <span>{mealsPerDay} meals/day</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{totalMeals} total meals</span>
              </div>
            </div>

            {/* Status and Assignment Info */}
            <div className="space-y-2">
              {mealPlan.isActive !== undefined && (
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${mealPlan.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <span className="text-xs text-slate-600">
                    {mealPlan.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              )}
              
              {assignedDate && (
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Calendar className="h-3 w-3" />
                  <span>Assigned {assignedDate}</span>
                </div>
              )}

              {/* Client Name if available */}
              {mealPlan.mealPlanData?.clientName && (
                <div className="flex items-center gap-1 text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded">
                  <Users className="h-3 w-3" />
                  <span className="truncate">For: {mealPlan.mealPlanData.clientName}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  } catch (error) {
    console.error('Error in MealPlanCard:', error);
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4">
          <div className="text-red-600">
            <h3 className="font-semibold">Error loading meal plan</h3>
            <p className="text-sm mt-1">Check console for details</p>
          </div>
        </CardContent>
      </Card>
    );
  }
}

// Memoize the component to prevent unnecessary re-renders when props haven't changed
export default memo(MealPlanCard, (prevProps, nextProps) => {
  // Custom comparison to avoid re-rendering if meal plan data is essentially the same
  return (
    prevProps.mealPlan?.id === nextProps.mealPlan?.id &&
    prevProps.mealPlan?.isActive === nextProps.mealPlan?.isActive &&
    prevProps.mealPlan?.assignedAt === nextProps.mealPlan?.assignedAt &&
    prevProps.onClick === nextProps.onClick
  );
});