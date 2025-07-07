import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MealPlan } from "@shared/schema";
import { Calendar, Users, Utensils, Clock, Zap, Target, Activity } from "lucide-react";

interface MealPlanCardProps {
  mealPlan: MealPlan;
  onClick: () => void;
}

export default function MealPlanCard({ mealPlan, onClick }: MealPlanCardProps) {
  // Calculate nutrition totals
  const totalCalories = mealPlan.meals.reduce((sum, meal) => sum + meal.recipe.caloriesKcal, 0);
  const totalProtein = mealPlan.meals.reduce((sum, meal) => sum + Number(meal.recipe.proteinGrams || 0), 0);
  const avgCaloriesPerDay = Math.round(totalCalories / mealPlan.days);
  const avgProteinPerDay = Math.round(totalProtein / mealPlan.days);

  // Get unique meal types
  const mealTypes = [...new Set(mealPlan.meals.map(meal => meal.mealType))];

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border border-slate-200 hover:border-slate-300">
      <div className="relative">
        {/* Header with gradient background */}
        <div className="w-full h-32 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-t-xl flex items-center justify-center">
          <div className="text-center">
            <Utensils className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <span className="text-blue-700 font-medium text-sm">
              {mealPlan.days} Day Plan
            </span>
          </div>
        </div>
      </div>

      <CardContent className="p-4" onClick={onClick}>
        <div className="space-y-3">
          {/* Plan Name */}
          <h3 className="font-semibold text-slate-900 line-clamp-2 leading-tight">
            {mealPlan.planName}
          </h3>

          {/* Fitness Goal */}
          <div className="flex items-center gap-1">
            <Target className="h-3 w-3 text-green-500" />
            <Badge variant="outline" className="text-xs px-2 py-1">
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

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
            <div className="flex items-center space-x-1">
              <Zap className="h-3 w-3 text-orange-500" />
              <span>{avgCaloriesPerDay} cal/day</span>
            </div>
            <div className="flex items-center space-x-1">
              <Activity className="h-3 w-3 text-green-500" />
              <span>{avgProteinPerDay}g protein/day</span>
            </div>
            <div className="flex items-center space-x-1">
              <Utensils className="h-3 w-3 text-blue-500" />
              <span>{mealPlan.mealsPerDay} meals/day</span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="h-3 w-3 text-purple-500" />
              <span>{mealPlan.meals.length} total meals</span>
            </div>
          </div>

          {/* Client Name if available */}
          {mealPlan.clientName && (
            <div className="flex items-center gap-1 text-sm text-slate-500">
              <Users className="h-3 w-3" />
              <span>For: {mealPlan.clientName}</span>
            </div>
          )}

          {/* Description preview */}
          {mealPlan.description && (
            <p className="text-xs text-slate-500 line-clamp-2">
              {mealPlan.description}
            </p>
          )}

          {/* Created date */}
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Clock className="h-3 w-3" />
            <span>
              Assigned {new Date(mealPlan.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 