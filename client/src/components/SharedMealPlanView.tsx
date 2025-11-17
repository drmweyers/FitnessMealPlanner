import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Clock, 
  Users, 
  Calendar, 
  Eye, 
  ChefHat, 
  Utensils, 
  Target, 
  AlertTriangle, 
  Share2, 
  ArrowLeft,
  Info
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import type { MealPlan } from '@shared/schema';

interface SharedMealPlanData {
  shareToken: string;
  mealPlan: MealPlan;
  notes: string | null;
  tags: string[];
  viewCount: number;
  createdAt: string;
  expiresAt: string | null;
  createdBy: {
    name: string | null;
    email: string;
  };
  isPublic: boolean;
}

const SharedMealPlanView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharedMealPlanData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSharedMealPlan = async () => {
      if (!token) {
        setError('Invalid share token');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/shared/${token}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch meal plan');
        }

        const mealPlanData = await response.json();
        setData(mealPlanData);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSharedMealPlan();
  }, [token]);

  const calculateTotalNutrition = (mealPlan: MealPlan) => {
    const totals = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    };

    mealPlan.meals.forEach(meal => {
      totals.calories += meal.recipe?.caloriesKcal ?? 0;
      totals.protein += parseFloat(meal.recipe?.proteinGrams || '0');
      totals.carbs += parseFloat(meal.recipe?.carbsGrams || '0');
      totals.fat += parseFloat(meal.recipe?.fatGrams || '0');
    });

    return totals;
  };

  const groupMealsByDay = (meals: MealPlan['meals']) => {
    const grouped: Record<number, MealPlan['meals']> = {};
    meals.forEach(meal => {
      if (!grouped[meal.day]) {
        grouped[meal.day] = [];
      }
      grouped[meal.day].push(meal);
    });
    return grouped;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-4">
              <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="text-muted-foreground">Loading meal plan...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Alert className="border-destructive bg-destructive/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Unable to Load Meal Plan</AlertTitle>
              <AlertDescription className="mt-2">
                {error}
              </AlertDescription>
            </Alert>
            <div className="mt-6 text-center">
              <Button asChild>
                <Link to="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go to Home
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { mealPlan, createdBy, viewCount, createdAt, expiresAt, notes, tags } = data;
  const totalNutrition = calculateTotalNutrition(mealPlan);
  const mealsByDay = groupMealsByDay(mealPlan.meals);
  const dailyAverageCalories = Math.round(totalNutrition.calories / mealPlan.days);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Share2 className="h-6 w-6 text-primary" />
              <span className="font-semibold text-lg">Shared Meal Plan</span>
            </div>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {viewCount} view{viewCount !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Meal Plan Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <CardTitle className="text-3xl font-bold text-primary">
                  {mealPlan.planName}
                </CardTitle>
                <CardDescription className="text-lg">
                  {mealPlan.description || `A ${mealPlan.days}-day meal plan designed for ${mealPlan.fitnessGoal.toLowerCase().replace('_', ' ')}`}
                </CardDescription>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p>Created by {createdBy.name || createdBy.email}</p>
                <p>{format(new Date(createdAt), 'MMM d, yyyy')}</p>
              </div>
            </div>

            {/* Tags */}
            {tags && tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {tags.map((tag, index) => (
                  <Badge key={index} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </CardHeader>
        </Card>

        {/* Key Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{mealPlan.days}</p>
              <p className="text-sm text-muted-foreground">Days</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Utensils className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{mealPlan.mealsPerDay}</p>
              <p className="text-sm text-muted-foreground">Meals/Day</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Target className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{mealPlan.dailyCalorieTarget}</p>
              <p className="text-sm text-muted-foreground">Target Calories</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <ChefHat className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{dailyAverageCalories}</p>
              <p className="text-sm text-muted-foreground">Avg Calories</p>
            </CardContent>
          </Card>
        </div>

        {/* Fitness Goal and Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Fitness Goal & Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <h4 className="font-medium">Goal</h4>
                <Badge variant="secondary" className="mt-1">
                  {mealPlan.fitnessGoal.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
              </div>
              {notes && (
                <div>
                  <h4 className="font-medium mb-2">Trainer Notes</h4>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                    {notes}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Daily Meal Plans */}
        <div className="space-y-6">
          {Object.entries(mealsByDay)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([day, dayMeals]) => {
              const sortedMeals = dayMeals.sort((a, b) => a.mealNumber - b.mealNumber);
              const dayTotalCalories = sortedMeals.reduce((sum, meal) => sum + (meal.recipe?.caloriesKcal ?? 0), 0);

              return (
                <Card key={day}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Day {day}</span>
                      <Badge variant="outline">
                        {dayTotalCalories} calories
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {sortedMeals.map((meal, index) => (
                        <div key={index} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary">
                              {meal.mealType.charAt(0).toUpperCase() + meal.mealType.slice(1)}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              Meal {meal.mealNumber}
                            </span>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold text-lg mb-1">
                              {meal.recipe?.name}
                            </h4>
                            {meal.recipe?.description && (
                              <p className="text-sm text-muted-foreground">
                                {meal.recipe.description}
                              </p>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {(meal.recipe?.prepTimeMinutes ?? 0) + (meal.recipe?.cookTimeMinutes || 0)} min
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {meal.recipe?.servings} serving{(meal.recipe?.servings ?? 0) > 1 ? 's' : ''}
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-1 text-xs">
                            <div className="text-center p-2 bg-muted rounded">
                              <p className="font-medium">{meal.recipe?.caloriesKcal}</p>
                              <p className="text-muted-foreground">Cal</p>
                            </div>
                            <div className="text-center p-2 bg-muted rounded">
                              <p className="font-medium">{parseFloat(meal.recipe?.proteinGrams || '0').toFixed(0)}g</p>
                              <p className="text-muted-foreground">Protein</p>
                            </div>
                            <div className="text-center p-2 bg-muted rounded">
                              <p className="font-medium">{parseFloat(meal.recipe?.carbsGrams || '0').toFixed(0)}g</p>
                              <p className="text-muted-foreground">Carbs</p>
                            </div>
                            <div className="text-center p-2 bg-muted rounded">
                              <p className="font-medium">{parseFloat(meal.recipe?.fatGrams || '0').toFixed(0)}g</p>
                              <p className="text-muted-foreground">Fat</p>
                            </div>
                          </div>

                          {/* Dietary Tags */}
                          {meal.recipe?.dietaryTags && meal.recipe.dietaryTags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {meal.recipe.dietaryTags.slice(0, 3).map((tag, tagIndex) => (
                                <Badge key={tagIndex} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {meal.recipe.dietaryTags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{meal.recipe.dietaryTags.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>

        {/* Total Nutrition Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Total Plan Nutrition</CardTitle>
            <CardDescription>
              Nutritional totals for the entire {mealPlan.days}-day meal plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-3xl font-bold text-primary">{totalNutrition.calories.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Calories</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-3xl font-bold text-green-600">{totalNutrition.protein.toFixed(0)}g</p>
                <p className="text-sm text-muted-foreground">Total Protein</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-3xl font-bold text-blue-600">{totalNutrition.carbs.toFixed(0)}g</p>
                <p className="text-sm text-muted-foreground">Total Carbs</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-3xl font-bold text-orange-600">{totalNutrition.fat.toFixed(0)}g</p>
                <p className="text-sm text-muted-foreground">Total Fat</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expiration Notice */}
        {expiresAt && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Share Expiration</AlertTitle>
            <AlertDescription>
              This shared meal plan will expire {formatDistanceToNow(new Date(expiresAt))} from now 
              ({format(new Date(expiresAt), 'PPp')}).
            </AlertDescription>
          </Alert>
        )}

        {/* Footer */}
        <div className="text-center py-8 text-sm text-muted-foreground">
          <p>This meal plan was shared from EvoFitMeals</p>
          <Button asChild variant="link" className="mt-2">
            <Link to="/">Create Your Own Meal Plans</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SharedMealPlanView;