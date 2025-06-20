/**
 * Client Dashboard Page
 * 
 * Dashboard for clients to view their assigned meal plans and nutrition information.
 * Provides meal plan viewing, nutrition tracking, and progress monitoring.
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, Target, Utensils, TrendingUp, Download } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface MealPlan {
  id: string;
  data: {
    planName: string;
    fitnessGoal: string;
    dailyCalorieTarget: number;
    days: number;
    mealsPerDay: number;
    description?: string;
    meals: Array<{
      day: number;
      mealNumber: number;
      mealType: string;
      recipe: {
        id: string;
        name: string;
        description: string;
        caloriesKcal: number;
        proteinGrams: string;
        carbsGrams: string;
        fatGrams: string;
        prepTimeMinutes: number;
        servings: number;
        imageUrl?: string;
      };
    }>;
  };
  assignedTo: string;
  assignedBy: string;
  createdAt: string;
  updatedAt: string;
}

export default function ClientDashboard() {
  // Fetch client's latest meal plan
  const { data: latestPlan, isLoading: planLoading } = useQuery<MealPlan>({
    queryKey: ["/api/client/meal-plan"],
  });

  // Fetch all meal plans for history
  const { data: allPlans = [], isLoading: historyLoading } = useQuery<MealPlan[]>({
    queryKey: ["/api/client/meal-plans"],
  });

  if (planLoading || historyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!latestPlan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <Utensils className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              No Meal Plan Assigned
            </h2>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              Contact your trainer to get a personalized meal plan created for you.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const calculateTotalNutrition = (meals: MealPlan['data']['meals']) => {
    return meals.reduce(
      (totals, meal) => ({
        calories: totals.calories + meal.recipe.caloriesKcal,
        protein: totals.protein + parseFloat(meal.recipe.proteinGrams),
        carbs: totals.carbs + parseFloat(meal.recipe.carbsGrams),
        fat: totals.fat + parseFloat(meal.recipe.fatGrams),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  };

  const dailyNutrition = calculateTotalNutrition(
    latestPlan.data.meals.filter(meal => meal.day === 1)
  );

  const totalNutrition = calculateTotalNutrition(latestPlan.data.meals);
  const averageDailyNutrition = {
    calories: Math.round(totalNutrition.calories / latestPlan.data.days),
    protein: Math.round(totalNutrition.protein / latestPlan.data.days),
    carbs: Math.round(totalNutrition.carbs / latestPlan.data.days),
    fat: Math.round(totalNutrition.fat / latestPlan.data.days),
  };

  const groupMealsByDay = (meals: MealPlan['data']['meals']) => {
    return meals.reduce((groups, meal) => {
      if (!groups[meal.day]) {
        groups[meal.day] = [];
      }
      groups[meal.day].push(meal);
      return groups;
    }, {} as Record<number, MealPlan['data']['meals']>);
  };

  const mealsByDay = groupMealsByDay(latestPlan.data.meals);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            My Meal Plan
          </h1>
          <p className="text-slate-600 dark:text-slate-300">
            Your personalized nutrition and fitness plan
          </p>
        </div>

        {/* Current Plan Overview */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{latestPlan.data.planName}</CardTitle>
                <CardDescription className="text-lg">
                  Goal: {latestPlan.data.fitnessGoal.replace('_', ' ')} • {latestPlan.data.days} Days
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-sm">
                Created {new Date(latestPlan.createdAt).toLocaleDateString()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {latestPlan.data.description && (
              <p className="text-slate-600 dark:text-slate-300 mb-4">
                {latestPlan.data.description}
              </p>
            )}
            
            {/* Nutrition Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Target className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-600">{latestPlan.data.dailyCalorieTarget}</div>
                <div className="text-sm text-slate-600 dark:text-slate-300">Target Calories</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{averageDailyNutrition.protein}g</div>
                <div className="text-sm text-slate-600 dark:text-slate-300">Avg Protein</div>
              </div>
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{averageDailyNutrition.carbs}g</div>
                <div className="text-sm text-slate-600 dark:text-slate-300">Avg Carbs</div>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{averageDailyNutrition.fat}g</div>
                <div className="text-sm text-slate-600 dark:text-slate-300">Avg Fat</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Meal Plan Details */}
        <Tabs defaultValue="current" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="current">Current Plan</TabsTrigger>
            <TabsTrigger value="history">Plan History</TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="space-y-6">
            {Object.entries(mealsByDay).map(([day, dayMeals]) => (
              <Card key={day}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Day {day}
                  </CardTitle>
                  <CardDescription>
                    {dayMeals.length} meals • {calculateTotalNutrition(dayMeals).calories} calories
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {dayMeals
                      .sort((a, b) => a.mealNumber - b.mealNumber)
                      .map((meal) => (
                        <div key={`${meal.day}-${meal.mealNumber}`} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline">{meal.mealType}</Badge>
                              <h4 className="font-medium">{meal.recipe.name}</h4>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <Clock className="w-4 h-4" />
                              {meal.recipe.prepTimeMinutes} min
                            </div>
                          </div>
                          
                          <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                            {meal.recipe.description}
                          </p>
                          
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-blue-600">{meal.recipe.caloriesKcal}</span>
                              <div className="text-slate-500">Calories</div>
                            </div>
                            <div>
                              <span className="font-medium text-green-600">{meal.recipe.proteinGrams}g</span>
                              <div className="text-slate-500">Protein</div>
                            </div>
                            <div>
                              <span className="font-medium text-orange-600">{meal.recipe.carbsGrams}g</span>
                              <div className="text-slate-500">Carbs</div>
                            </div>
                            <div>
                              <span className="font-medium text-purple-600">{meal.recipe.fatGrams}g</span>
                              <div className="text-slate-500">Fat</div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Plan History</CardTitle>
                <CardDescription>Your previous meal plans and progress</CardDescription>
              </CardHeader>
              <CardContent>
                {allPlans.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No previous plans found</p>
                ) : (
                  <div className="space-y-4">
                    {allPlans.map((plan) => (
                      <div key={plan.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{plan.data.planName}</h4>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{plan.data.days} days</Badge>
                            <Badge variant="secondary">
                              {plan.data.fitnessGoal.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm text-slate-600 dark:text-slate-300">
                          <div>Target: {plan.data.dailyCalorieTarget} cal/day</div>
                          <div>Meals: {plan.data.mealsPerDay}/day</div>
                          <div>Created: {new Date(plan.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}