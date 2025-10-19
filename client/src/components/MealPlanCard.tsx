import React, { memo, useCallback, useMemo, useState } from 'react';
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import type { CustomerMealPlan } from "@shared/schema";
import { Calendar, Users, Utensils, Clock, Zap, Target, Activity, Trash2 } from "lucide-react";
import { useSafeMealPlan } from '../hooks/useSafeMealPlan';
import { useAuth } from '../contexts/AuthContext';

interface MealPlanCardProps {
  mealPlan: CustomerMealPlan;
  onClick?: () => void;
  onDelete?: (mealPlanId: string) => void;
}

function MealPlanCard({ mealPlan, onClick, onDelete }: MealPlanCardProps) {
  // CRITICAL: All hooks must be called before any conditional returns
  const { user } = useAuth();
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

  // Memoized date formatting
  const formattedAssignedDate = useMemo(() => {
    return mealPlan?.assignedAt ? new Date(mealPlan.assignedAt).toLocaleDateString() : null;
  }, [mealPlan?.assignedAt]);

  // Memoized calculations
  const mealStats = useMemo(() => {
    return {
      mealsPerDay: Math.round(validMeals.length / days),
      totalMeals: validMeals.length,
      displayedMealTypes: mealTypes.slice(0, 3),
      extraMealTypesCount: Math.max(0, mealTypes.length - 3)
    };
  }, [validMeals.length, days, mealTypes]);

  // Optimized click handler
  const handleClick = useCallback(() => {
    onClick?.();
  }, [onClick]);

  // Delete handler
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click event
    if (onDelete && mealPlan.id) {
      onDelete(mealPlan.id);
    }
  }, [onDelete, mealPlan.id]);

  // Early null check - AFTER all hooks
  if (!mealPlan) {
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
          
          {/* Delete button - only show for customers viewing their own plans */}
          {user?.role === 'customer' && onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 h-8 w-8 p-0 bg-white/80 hover:bg-red-50 hover:text-red-600 rounded-full shadow-sm"
              onClick={handleDelete}
              aria-label="Delete meal plan"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
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
                {mealStats.displayedMealTypes.map((type: string) => (
                  <Badge key={type} variant="secondary" className="text-xs px-2 py-1">
                    {type}
                  </Badge>
                ))}
                {mealStats.extraMealTypesCount > 0 && (
                  <Badge variant="outline" className="text-xs px-2 py-1">
                    +{mealStats.extraMealTypesCount}
                  </Badge>
                )}
              </div>
            )}

            {/* Ingredient Preview */}
            {validMeals[0]?.ingredients && validMeals[0].ingredients.length > 0 && (
              <div className="bg-slate-50 rounded p-2 border border-slate-100">
                <div className="text-xs font-medium text-slate-700 mb-1">Sample Ingredients:</div>
                <div className="text-xs text-slate-600 space-y-0.5">
                  {validMeals[0].ingredients.slice(0, 3).map((ing, idx) => (
                    <div key={idx} className="truncate">
                      • {ing.amount}{ing.unit !== 'unit' ? ing.unit : ''}{ing.unit !== 'unit' ? ' ' : ' × '}{ing.ingredient}
                    </div>
                  ))}
                  {validMeals[0].ingredients.length > 3 && (
                    <div className="text-slate-400">+{validMeals[0].ingredients.length - 3} more...</div>
                  )}
                </div>
              </div>
            )}

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-1 xs:gap-2 sm:gap-3 pt-1 xs:pt-2 border-t border-slate-100">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Zap className="h-3 w-3 text-orange-500" />
                  <span className="text-xs sm:text-sm font-medium text-slate-600">Calories</span>
                </div>
                <div className={`text-lg sm:text-xl font-bold ${avgCaloriesPerDay > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                  {avgCaloriesPerDay > 0 ? avgCaloriesPerDay : 'Not calculated'}
                </div>
                <div className="text-xs text-slate-500">per day</div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Activity className="h-3 w-3 text-green-500" />
                  <span className="text-xs sm:text-sm font-medium text-slate-600">Protein</span>
                </div>
                <div className={`text-lg sm:text-xl font-bold ${avgProteinPerDay > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                  {avgProteinPerDay > 0 ? `${avgProteinPerDay}g` : 'Not calculated'}
                </div>
                <div className="text-xs text-slate-500">per day</div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1 xs:pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1">
                <Utensils className="h-3 w-3" />
                <span>{mealStats.mealsPerDay} meals/day</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{mealStats.totalMeals} total meals</span>
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
              
              {formattedAssignedDate && (
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Calendar className="h-3 w-3" />
                  <span>Assigned {formattedAssignedDate}</span>
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

// Export memoized component
export default memo(MealPlanCard);