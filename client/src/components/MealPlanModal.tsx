import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import type { CustomerMealPlan, Recipe } from "@shared/schema";
import { Calendar, Users, Utensils, Clock, Zap, Target, Activity } from "lucide-react";
import { useState, memo, useMemo, useCallback } from "react";
import RecipeDetailModal from "./RecipeDetailModal";
import MealTableRow from "./MealTableRow";
import { useSafeMealPlan } from '../hooks/useSafeMealPlan';

interface MealPlanModalProps {
  mealPlan: CustomerMealPlan;
  onClose: () => void;
}

function MealPlanModal({ mealPlan, onClose }: MealPlanModalProps) {
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const {
    isValid,
    validMeals,
    days,
    planName,
    fitnessGoal,
    clientName,
    dailyCalorieTarget,
    nutrition,
    getMealsForDay
  } = useSafeMealPlan(mealPlan);

  // Memoize callback functions to prevent child re-renders
  const handleRecipeClick = useCallback((recipe: Recipe) => {
    setSelectedRecipe(recipe);
  }, []);

  const handleCloseRecipeModal = useCallback(() => {
    setSelectedRecipe(null);
  }, []);

  // Memoize expensive calculations
  const mealsPerDay = useMemo(() => Math.round(validMeals.length / days), [validMeals.length, days]);

  if (!isValid) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
          </DialogHeader>
          <div className="text-red-600 p-4">
            <p>Invalid meal plan data. Cannot display details.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const { avgCaloriesPerDay, avgProteinPerDay, avgCarbsPerDay, avgFatPerDay } = nutrition;

  const formatMealType = (mealType: string) => {
    return mealType.charAt(0).toUpperCase() + mealType.slice(1);
  };

  const getMealTypeColor = (mealType: string) => {
    const colors = {
      breakfast: "bg-orange-100 text-orange-700",
      lunch: "bg-yellow-100 text-yellow-700",
      dinner: "bg-primary/10 text-primary",
      snack: "bg-pink-100 text-pink-700",
    };
    return (
      colors[mealType as keyof typeof colors] || "bg-slate-100 text-slate-700"
    );
  };

  const getMealTypeIcon = (mealType: string) => {
    switch (mealType) {
      case "breakfast":
        return "🌅";
      case "lunch":
        return "☀️";
      case "dinner":
        return "🌙";
      case "snack":
        return "🍎";
      default:
        return "🍽️";
    }
  };

  // handleRecipeClick now defined above with useCallback

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] xs:w-[90vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Utensils className="h-5 w-5 text-blue-600" />
            <span>{planName}</span>
          </DialogTitle>
          <DialogDescription>
            Detailed view of your {days}-day meal plan with nutrition breakdown and daily meal schedule.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Plan Overview */}
          <div className="bg-slate-50 p-2 xs:p-4 rounded-lg">
            <div className="grid grid-cols-2 xs:grid-cols-4 md:grid-cols-4 gap-2 xs:gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {avgCaloriesPerDay}
                </div>
                <div className="text-sm text-slate-600">Avg Cal/Day</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {avgProteinPerDay}g
                </div>
                <div className="text-sm text-slate-600">Avg Protein/Day</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {avgCarbsPerDay}g
                </div>
                <div className="text-sm text-slate-600">Avg Carbs/Day</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {avgFatPerDay}g
                </div>
                <div className="text-sm text-slate-600">Avg Fat/Day</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Target className="h-4 w-4 text-green-500" />
                <span>{fitnessGoal}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span>{days} days</span>
              </div>
              <div className="flex items-center gap-1">
                <Utensils className="h-4 w-4 text-purple-500" />
                <span>{mealsPerDay} meals/day</span>
              </div>
              {clientName && (
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-slate-500" />
                  <span>For: {clientName}</span>
                </div>
              )}
            </div>

            {mealPlan.description && (
              <p className="text-sm text-slate-600 mt-3">
                {mealPlan.description}
              </p>
            )}
          </div>

          {/* Daily Meal Plan */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Daily Meal Schedule</h3>
            {Array.from({ length: days }, (_, dayIndex) => {
              const day = dayIndex + 1;
              const dayMeals = getMealsForDay(day);

              return (
                <Card key={day} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Day {day}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-hidden border-t">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr className="border-b">
                            <th className="text-left py-3 px-4 font-medium text-gray-600 uppercase text-xs tracking-wider">
                              Recipe
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-600 uppercase text-xs tracking-wider">
                              Type
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-600 uppercase text-xs tracking-wider">
                              Nutrition
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-600 uppercase text-xs tracking-wider">
                              Time
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {dayMeals.map((meal, mealIndex) => (
                            <MealTableRow
                              key={`${meal.recipe.id}-${mealIndex}`}
                              recipe={meal.recipe}
                              mealType={meal.mealType}
                              onRecipeClick={handleRecipeClick}
                              formatMealType={formatMealType}
                              getMealTypeColor={getMealTypeColor}
                              getMealTypeIcon={getMealTypeIcon}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Assignment Info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-blue-700">
              <Clock className="h-4 w-4" />
              <span className="font-medium">Assignment Details</span>
            </div>
            <p className="text-blue-600 text-sm mt-1">
              This meal plan was assigned to you on {new Date(mealPlan.assignedAt || mealPlan.mealPlanData?.createdAt || new Date()).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Recipe Detail Modal */}
        <RecipeDetailModal
          recipe={selectedRecipe}
          isOpen={!!selectedRecipe}
          onClose={handleCloseRecipeModal}
        />
      </DialogContent>
    </Dialog>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default memo(MealPlanModal, (prevProps, nextProps) => {
  // Only re-render if the meal plan ID changes or modal state changes
  return (
    prevProps.mealPlan?.id === nextProps.mealPlan?.id &&
    prevProps.onClose === nextProps.onClose
  );
}); 