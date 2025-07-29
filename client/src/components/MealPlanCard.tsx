import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import type { MealPlan } from "@shared/schema";
import { Calendar, Users, Utensils, Clock, Zap, Target, Activity } from "lucide-react";

interface MealPlanCardProps {
  mealPlan: MealPlan & {
    planName?: string;
    fitnessGoal?: string;
    dailyCalorieTarget?: number;
    totalDays?: number;
    mealsPerDay?: number;
    assignedAt?: string;
    isActive?: boolean;
    description?: string;
  };
  onClick: () => void;
}

export default function MealPlanCard({ mealPlan, onClick }: MealPlanCardProps) {
  // Use enhanced data when available, fallback to calculated values
  const days = mealPlan.totalDays || mealPlan.days;
  const avgCaloriesPerDay = mealPlan.dailyCalorieTarget || 
    Math.round(mealPlan.meals.reduce((sum, meal) => sum + meal.recipe.caloriesKcal, 0) / days);
  
  // Calculate nutrition totals
  const totalCalories = mealPlan.meals.reduce((sum, meal) => sum + meal.recipe.caloriesKcal, 0);
  const totalProtein = mealPlan.meals.reduce((sum, meal) => sum + Number(meal.recipe.proteinGrams || 0), 0);
  const avgProteinPerDay = Math.round(totalProtein / days);

  // Get unique meal types
  const mealTypes = mealPlan.meals
    .map(meal => meal.mealType)
    .filter((type, index, array) => array.indexOf(type) === index);

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

      <CardContent className="p-3 sm:p-4" onClick={onClick}>
        <div className="space-y-2 sm:space-y-3">
          {/* Plan Name */}
          <h3 className="font-semibold text-slate-900 line-clamp-2 leading-tight text-sm sm:text-base">
            {mealPlan.planName}
          </h3>

          {/* Fitness Goal */}
          <div className="flex items-center gap-1">
            <Target className="h-3 w-3 text-green-500 flex-shrink-0" />
            <Badge variant="outline" className="text-xs px-2 py-1 truncate">
              {mealPlan.fitnessGoal.replace('_', ' ')}
            </Badge>
          </div>

          {/* Meal Types */}
          {mealTypes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {mealTypes.slice(0, 3).map((type) => (
                <Badge key={type} variant="secondary" className="text-xs px-2 py-1">
                  {type}
                </Badge>
              ))}
              {mealTypes.length > 3 && (
                <Badge variant="outline" className="text-xs px-2 py-1">
                  +{mealTypes.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-2 border-t border-slate-100">
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
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1">
              <Utensils className="h-3 w-3" />
              <span>{mealPlan.mealsPerDay || Math.round(mealPlan.meals.length / days)} meals/day</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{mealPlan.meals.length} total meals</span>
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
            
            {mealPlan.assignedAt && (
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Calendar className="h-3 w-3" />
                <span>Assigned {new Date(mealPlan.assignedAt).toLocaleDateString()}</span>
              </div>
            )}

            {/* Client Name if available */}
            {mealPlan.clientName && (
              <div className="flex items-center gap-1 text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded">
                <Users className="h-3 w-3" />
                <span className="truncate">For: {mealPlan.clientName}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 