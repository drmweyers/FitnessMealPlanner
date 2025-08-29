import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import type { CustomerMealPlan } from "@shared/schema";
import { Calendar, Users, Utensils, Clock, Zap, Target, Activity, ChefHat } from "lucide-react";
import RecipeDetailModal from "./RecipeDetailModal";
import MealPrepDisplay from "./MealPrepDisplay";
import { useSafeMealPlan } from '../hooks/useSafeMealPlan';

interface MealPlanModalProps {
  mealPlan: CustomerMealPlan;
  onClose: () => void;
}

export default function MealPlanModal({ mealPlan, onClose }: MealPlanModalProps) {
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);

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

  const handleRecipeClick = (recipeId: string, event?: React.MouseEvent) => {
    console.log('Recipe clicked:', { recipeId, event });
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    setSelectedRecipeId(recipeId);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] xs:w-[90vw] sm:max-w-6xl max-h-[95vh] overflow-y-auto z-[50]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Utensils className="h-5 w-5 text-blue-600" />
            <span>{planName}</span>
          </DialogTitle>
          <DialogDescription>
            Detailed view of your {days}-day meal plan with nutrition breakdown and daily meal schedule.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="meals" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="meals" className="flex items-center gap-2">
              <Utensils className="w-4 h-4" />
              Meal Schedule
            </TabsTrigger>
            <TabsTrigger value="prep" className="flex items-center gap-2">
              <ChefHat className="w-4 h-4" />
              Meal Prep Guide
            </TabsTrigger>
          </TabsList>

          <TabsContent value="meals" className="space-y-6">
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
                  <span>{days} days (cycles weekly)</span>
                </div>
                <div className="flex items-center gap-1">
                  <Utensils className="h-4 w-4 text-purple-500" />
                  <span>{Math.round(validMeals.length / days)} meals/day</span>
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
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Daily Meal Schedule</h3>
                <div className="bg-orange-100 px-3 py-1 rounded-full">
                  <span className="text-sm text-orange-700 font-medium">
                    🔄 Repeats every {days} days
                  </span>
                </div>
              </div>
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
                            {dayMeals.map((meal, mealIndex) => {
                              const recipe = meal.recipe;
                              return (
                                <tr
                                  key={mealIndex}
                                  className="border-b hover:bg-gray-50 transition-colors cursor-pointer"
                                  onClick={(e) => handleRecipeClick(recipe.id, e)}
                                >
                                  <td className="py-4 px-4">
                                    <div className="flex items-center space-x-3">
                                      <img
                                        src={
                                          recipe.imageUrl ||
                                          "/api/placeholder/60/60"
                                        }
                                        alt={recipe.name}
                                        className="w-12 h-12 rounded-lg object-cover pointer-events-none"
                                        onError={(e) => {
                                          const img = e.target as HTMLImageElement;
                                          img.src = `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=60&h=60&fit=crop`;
                                        }}
                                      />
                                      <div>
                                        <div className="font-medium text-gray-900">
                                          {recipe.name}
                                        </div>
                                        <div className="text-sm text-gray-500 line-clamp-1">
                                          {recipe.description ||
                                            "Delicious and nutritious meal"}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-4 px-4">
                                    <span
                                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMealTypeColor(meal.mealType)}`}
                                    >
                                      {getMealTypeIcon(meal.mealType)} {formatMealType(meal.mealType)}
                                    </span>
                                  </td>
                                  <td className="py-4 px-4">
                                    <div className="text-sm text-gray-900">
                                      {recipe.caloriesKcal} cal
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {Number(recipe.proteinGrams).toFixed(0)}g protein
                                    </div>
                                  </td>
                                  <td className="py-4 px-4">
                                    <div className="text-sm text-gray-900">
                                      {recipe.prepTimeMinutes + (recipe.cookTimeMinutes || 0)} min
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      prep + cook
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
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
          </TabsContent>

          <TabsContent value="prep">
            {mealPlan.mealPlanData?.startOfWeekMealPrep ? (
              <MealPrepDisplay 
                mealPrep={mealPlan.mealPlanData.startOfWeekMealPrep}
                planName={planName}
                days={days}
              />
            ) : (
              <div className="text-center py-12">
                <ChefHat className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  No Meal Prep Guide Available
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  This meal plan doesn't include detailed meal prep instructions. 
                  Contact your trainer for a meal plan with shopping lists and prep steps.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Recipe Detail Modal */}
        <RecipeDetailModal
          recipeId={selectedRecipeId}
          isOpen={!!selectedRecipeId}
          onClose={() => setSelectedRecipeId(null)}
        />
      </DialogContent>
    </Dialog>
  );
} 