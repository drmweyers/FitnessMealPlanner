import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { mealPlanGenerationSchema, type MealPlanGeneration, type MealPlan } from "@shared/schema";
import { ChefHat, Calendar, Users, Utensils, Clock, Zap, Target, Activity, FileText } from "lucide-react";

interface MealPlanResult {
  mealPlan: MealPlan;
  nutrition: {
    total: { calories: number; protein: number; carbs: number; fat: number };
    averageDaily: { calories: number; protein: number; carbs: number; fat: number };
    daily: Array<{ day: number; calories: number; protein: number; carbs: number; fat: number }>;
  };
  message: string;
}

export default function MealPlanGenerator() {
  const { toast } = useToast();
  const [generatedPlan, setGeneratedPlan] = useState<MealPlanResult | null>(null);

  const form = useForm<MealPlanGeneration>({
    resolver: zodResolver(mealPlanGenerationSchema),
    defaultValues: {
      planName: "",
      fitnessGoal: "",
      description: "",
      dailyCalorieTarget: 2000,
      days: 7,
      mealsPerDay: 3,
      clientName: "",
    },
  });

  const generateMealPlan = useMutation({
    mutationFn: async (data: MealPlanGeneration): Promise<MealPlanResult> => {
      return apiRequest({
        url: '/api/generate-meal-plan',
        method: 'POST',
        body: data,
      });
    },
    onSuccess: (data: MealPlanResult) => {
      setGeneratedPlan(data);
      toast({
        title: "Meal Plan Generated",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MealPlanGeneration) => {
    generateMealPlan.mutate(data);
  };

  const formatMealType = (mealType: string) => {
    return mealType.charAt(0).toUpperCase() + mealType.slice(1);
  };

  const getMealTypeIcon = (mealType: string) => {
    switch (mealType) {
      case 'breakfast': return '🌅';
      case 'lunch': return '☀️';
      case 'dinner': return '🌙';
      case 'snack': return '🍎';
      default: return '🍽️';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            Meal Plan Generator
          </CardTitle>
          <CardDescription>
            Create customized meal plans for your clients based on their dietary preferences and nutritional goals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Plan Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="planName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Plan Name *
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="7-Day Weight Loss Plan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fitnessGoal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Fitness Goal *
                      </FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select fitness goal" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weight_loss">Weight Loss</SelectItem>
                            <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                            <SelectItem value="maintenance">Weight Maintenance</SelectItem>
                            <SelectItem value="athletic_performance">Athletic Performance</SelectItem>
                            <SelectItem value="general_health">General Health</SelectItem>
                            <SelectItem value="cutting">Cutting</SelectItem>
                            <SelectItem value="bulking">Bulking</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dailyCalorieTarget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Daily Calorie Target *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="800"
                          max="5000"
                          placeholder="2000"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Client Name (Optional)
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Plan Description (Optional)
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the purpose and details of this meal plan for your client..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Basic Settings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                <FormField
                  control={form.control}
                  name="days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Number of Days
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="30"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mealsPerDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Utensils className="h-4 w-4" />
                        Meals Per Day
                      </FormLabel>
                      <FormControl>
                        <Select
                          value={field.value?.toString()}
                          onValueChange={(value) => field.onChange(parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 Meal</SelectItem>
                            <SelectItem value="2">2 Meals</SelectItem>
                            <SelectItem value="3">3 Meals</SelectItem>
                            <SelectItem value="4">4 Meals</SelectItem>
                            <SelectItem value="5">5 Meals</SelectItem>
                            <SelectItem value="6">6 Meals</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Filter Options */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-4">Filter Preferences</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  <FormField
                    control={form.control}
                    name="mealType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meal Type</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value || 'all'}
                            onValueChange={(value) => field.onChange(value === 'all' ? undefined : value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="All Meals" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Meals</SelectItem>
                              <SelectItem value="breakfast">Breakfast</SelectItem>
                              <SelectItem value="lunch">Lunch</SelectItem>
                              <SelectItem value="dinner">Dinner</SelectItem>
                              <SelectItem value="snack">Snack</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dietaryTag"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dietary</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value || 'all'}
                            onValueChange={(value) => field.onChange(value === 'all' ? undefined : value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="All Diets" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Diets</SelectItem>
                              <SelectItem value="vegetarian">Vegetarian</SelectItem>
                              <SelectItem value="vegan">Vegan</SelectItem>
                              <SelectItem value="keto">Keto</SelectItem>
                              <SelectItem value="paleo">Paleo</SelectItem>
                              <SelectItem value="gluten-free">Gluten Free</SelectItem>
                              <SelectItem value="low-carb">Low Carb</SelectItem>
                              <SelectItem value="high-protein">High Protein</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxPrepTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Max Prep Time
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={field.value?.toString() || 'all'}
                            onValueChange={(value) => field.onChange(value === 'all' ? undefined : parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Any Time" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Any Time</SelectItem>
                              <SelectItem value="15">15 minutes</SelectItem>
                              <SelectItem value="30">30 minutes</SelectItem>
                              <SelectItem value="60">1 hour</SelectItem>
                              <SelectItem value="120">2 hours</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxCalories"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          Max Calories
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={field.value?.toString() || 'all'}
                            onValueChange={(value) => field.onChange(value === 'all' ? undefined : parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Any Amount" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Any Amount</SelectItem>
                              <SelectItem value="300">Under 300</SelectItem>
                              <SelectItem value="500">Under 500</SelectItem>
                              <SelectItem value="800">Under 800</SelectItem>
                              <SelectItem value="1200">Under 1200</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Macro Nutrient Filters */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-4 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Macro Nutrient Targets (per meal)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Protein */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-slate-600">Protein (g)</h5>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name="minProtein"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Min</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="maxProtein"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Max</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="∞"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Carbohydrates */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-slate-600">Carbohydrates (g)</h5>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name="minCarbs"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Min</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="maxCarbs"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Max</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="∞"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Fat */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-slate-600">Fat (g)</h5>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name="minFat"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Min</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="maxFat"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Max</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="∞"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={generateMealPlan.isPending}
                size="lg"
              >
                {generateMealPlan.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Generating Meal Plan...
                  </>
                ) : (
                  <>
                    <ChefHat className="h-4 w-4 mr-2" />
                    Generate Meal Plan
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Generated Meal Plan Results */}
      {generatedPlan && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              {generatedPlan.mealPlan.planName}
            </CardTitle>
            <CardDescription className="space-y-1">
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  {generatedPlan.mealPlan.fitnessGoal}
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {generatedPlan.mealPlan.dailyCalorieTarget} cal/day
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {generatedPlan.mealPlan.days} days, {generatedPlan.mealPlan.mealsPerDay} meals/day
                </span>
              </div>
              {generatedPlan.mealPlan.clientName && (
                <div className="flex items-center gap-1 text-sm">
                  <Users className="h-3 w-3" />
                  For: {generatedPlan.mealPlan.clientName}
                </div>
              )}
              {generatedPlan.mealPlan.description && (
                <p className="text-sm mt-2">{generatedPlan.mealPlan.description}</p>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Nutrition Summary */}
            <div className="bg-slate-50 p-4 rounded-lg">
              <h4 className="font-medium mb-3">Nutrition Summary (Daily Average)</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {generatedPlan.nutrition.averageDaily.calories}
                  </div>
                  <div className="text-sm text-slate-600">Calories</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {generatedPlan.nutrition.averageDaily.protein}g
                  </div>
                  <div className="text-sm text-slate-600">Protein</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {generatedPlan.nutrition.averageDaily.carbs}g
                  </div>
                  <div className="text-sm text-slate-600">Carbs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {generatedPlan.nutrition.averageDaily.fat}g
                  </div>
                  <div className="text-sm text-slate-600">Fat</div>
                </div>
              </div>
            </div>

            {/* Meal Plan */}
            <div className="space-y-4">
              {Array.from({ length: generatedPlan.mealPlan.days }, (_, dayIndex) => {
                const day = dayIndex + 1;
                const dayMeals = generatedPlan.mealPlan.meals.filter(meal => meal.day === day);
                const dayNutrition = generatedPlan.nutrition.daily[dayIndex];

                return (
                  <Card key={day} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span>Day {day}</span>
                        <div className="flex gap-4 text-sm font-normal">
                          <Badge variant="outline">{dayNutrition.calories} cal</Badge>
                          <Badge variant="outline">{dayNutrition.protein}g protein</Badge>
                          <Badge variant="outline">{dayNutrition.carbs}g carbs</Badge>
                          <Badge variant="outline">{dayNutrition.fat}g fat</Badge>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <div className="grid gap-3">
                          {dayMeals.map((meal, mealIndex) => (
                            <div key={mealIndex} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg min-w-[500px]">
                              {/* Meal Image */}
                              {meal.recipe.imageUrl && (
                                <div className="flex-shrink-0">
                                  <img
                                    src={meal.recipe.imageUrl}
                                    alt={meal.recipe.name}
                                    className="w-20 h-20 object-cover rounded-lg shadow-sm"
                                    onError={(e) => {
                                      // Fallback to meal type icon if image fails to load
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                </div>
                              )}
                              
                              <div className="flex items-center justify-between flex-1">
                                <div className="flex items-center gap-3 flex-shrink-0">
                                  <span className="text-lg">{getMealTypeIcon(meal.mealType)}</span>
                                  <div>
                                    <div className="font-medium">{meal.recipe.name}</div>
                                    <div className="text-sm text-slate-600">
                                      {formatMealType(meal.mealType)} • {meal.recipe.prepTimeMinutes} min prep
                                    </div>
                                    {meal.recipe.description && (
                                      <div className="text-xs text-slate-500 mt-1 max-w-xs truncate">
                                        {meal.recipe.description}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right text-sm text-slate-600 flex-shrink-0">
                                  <div className="font-medium">{meal.recipe.caloriesKcal} cal</div>
                                  <div className="whitespace-nowrap text-xs">
                                    {meal.recipe.proteinGrams}g P • {meal.recipe.carbsGrams}g C • {meal.recipe.fatGrams}g F
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}