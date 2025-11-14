/**
 * Manual Meal Plan Creator Component - Enhanced with Nutrition Input
 *
 * Enables trainers to create custom meal plans manually without AI.
 * Features:
 * - Free-form text entry with auto-parsing
 * - Structured meal entry form
 * - Optional nutrition input (per-meal OR daily totals)
 * - Category-based images
 * - Zero AI costs
 */

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../lib/queryClient';
import { Sparkles, Check, AlertCircle, ArrowRight, ArrowLeft, Plus, X, Info, Utensils } from 'lucide-react';
import { MealTypeDropdown } from './MealTypeDropdown';

type MealCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack';
type NutritionMode = 'per-meal' | 'daily-total' | 'none';

interface ManualMealEntry {
  mealName: string;
  category: MealCategory;
  imageUrl?: string;
  description?: string;
  ingredients?: Array<{
    ingredient: string;
    amount: string;
    unit: string;
  }>;
  instructions?: string;
  // Optional nutrition per meal
  manualNutrition?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
}

interface DailyNutrition {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export default function ManualMealPlanCreator() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Form state
  const [mealText, setMealText] = useState('');
  const [planName, setPlanName] = useState('');
  const [selectedMealType, setSelectedMealType] = useState<string | undefined>(undefined);
  const [meals, setMeals] = useState<ManualMealEntry[]>([]);
  const [isPreview, setIsPreview] = useState(false);
  const [nutritionMode, setNutritionMode] = useState<NutritionMode>('none');
  const [dailyNutrition, setDailyNutrition] = useState<DailyNutrition>({});

  // Parse meals mutation
  const parseMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await apiRequest('POST', '/api/trainer/parse-manual-meals', { text });
      return response.json();
    },
    onSuccess: (data: any) => {
      setMeals(data.data.meals);
      setIsPreview(true);
      toast({
        title: 'Meals Parsed Successfully',
        description: `${data.data.count} meals detected and categorized`
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error Parsing Meals',
        description: error.message || 'Failed to parse meal entries',
        variant: 'destructive'
      });
    }
  });

  // Save meal plan mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Prepare meal data with nutrition
      const mealsWithNutrition = meals.map((meal, index) => {
        let mealNutrition = meal.manualNutrition;

        // If daily total mode, distribute nutrition evenly across meals
        if (nutritionMode === 'daily-total' && meals.length > 0) {
          mealNutrition = {
            calories: dailyNutrition.calories ? Math.round(dailyNutrition.calories / meals.length) : undefined,
            protein: dailyNutrition.protein ? Math.round(dailyNutrition.protein / meals.length) : undefined,
            carbs: dailyNutrition.carbs ? Math.round(dailyNutrition.carbs / meals.length) : undefined,
            fat: dailyNutrition.fat ? Math.round(dailyNutrition.fat / meals.length) : undefined,
          };
        }

        return {
          ...meal,
          manualNutrition: mealNutrition
        };
      });

      const response = await apiRequest('POST', '/api/trainer/manual-meal-plan', {
        planName,
        meals: mealsWithNutrition
      });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate saved meal plans cache
      queryClient.invalidateQueries({ queryKey: ['trainer-meal-plans', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['trainer-meal-plans'] });

      toast({
        title: '✅ Plan Saved!',
        description: `"${planName}" has been saved to your library`,
        duration: 5000,
      });

      // Reset form after 2 seconds
      setTimeout(() => {
        setMealText('');
        setPlanName('');
        setSelectedMealType(undefined);
        setMeals([]);
        setIsPreview(false);
        setNutritionMode('none');
        setDailyNutrition({});
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: 'Error Creating Meal Plan',
        description: error.message || 'Failed to create meal plan',
        variant: 'destructive'
      });
    }
  });

  // Handlers
  const handleParseMeals = () => {
    if (!mealText.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter meal details',
        variant: 'destructive'
      });
      return;
    }
    parseMutation.mutate(mealText);
  };

  const addManualMeal = () => {
    setMeals([...meals, {
      mealName: '',
      category: 'lunch',
      ingredients: []
    }]);
  };

  const updateMeal = (index: number, updates: Partial<ManualMealEntry>) => {
    setMeals(meals.map((m, i) => i === index ? { ...m, ...updates } : m));
  };

  const updateMealCategory = (index: number, category: MealCategory) => {
    updateMeal(index, { category });
  };

  const updateMealNutrition = (index: number, field: keyof DailyNutrition, value: string) => {
    const numValue = value ? parseInt(value) : undefined;
    const current = meals[index].manualNutrition || {};
    updateMeal(index, {
      manualNutrition: { ...current, [field]: numValue }
    });
  };

  const removeMeal = (index: number) => {
    setMeals(meals.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!planName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a meal plan name',
        variant: 'destructive'
      });
      return;
    }
    if (meals.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one meal',
        variant: 'destructive'
      });
      return;
    }
    saveMutation.mutate();
  };

  const handleBackToEdit = () => {
    setIsPreview(false);
  };

  // Category badge colors
  const getCategoryColor = (category: MealCategory) => {
    const colors = {
      breakfast: 'bg-orange-100 text-orange-800',
      lunch: 'bg-green-100 text-green-800',
      dinner: 'bg-blue-100 text-blue-800',
      snack: 'bg-purple-100 text-purple-800'
    };
    return colors[category];
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-500" />
          <CardTitle>Create Custom Meal Plan</CardTitle>
        </div>
        <CardDescription>
          Manual entry - No AI costs, instant creation with optional nutrition tracking
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Two ways to create:</strong> Paste meal text for auto-parsing, or add meals manually.
            Nutrition is optional - leave blank to show "Not calculated".
          </AlertDescription>
        </Alert>

        {!isPreview ? (
          /* ========== ENTRY MODE ========== */
          <>
            {/* Text Parsing Option */}
            <div className="space-y-3">
              <Label htmlFor="meal-text" className="text-base font-semibold flex items-center gap-2">
                Option 1: Paste Meal Text (Auto-Parse)
                <Badge variant="outline" className="text-xs">Recommended</Badge>
              </Label>
              <p className="text-sm text-muted-foreground">
                Paste your meal plan text below. Format: "Meal 1", "Meal 2", etc. with ingredients listed with dashes.
              </p>
              <Textarea
                id="meal-text"
                placeholder={`Example format:

Meal 1
-175g of Jasmine Rice
-150g of Lean ground beef
-100g of cooked broccoli

Meal 2
-4 eggs
-2 pieces of sourdough bread
-1 banana (100g)

Meal 3
-100g turkey breast
-150g of sweet potato
-100g of asparagus`}
                value={mealText}
                onChange={(e) => setMealText(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
              <Button
                onClick={handleParseMeals}
                disabled={parseMutation.isPending || !mealText.trim()}
                className="w-full"
                size="lg"
              >
                {parseMutation.isPending ? (
                  'Parsing Meals...'
                ) : (
                  <>
                    Parse Meals <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>

            {/* Manual Entry Option */}
            <div className="pt-6 border-t">
              <Label className="text-base font-semibold flex items-center gap-2 mb-3">
                Option 2: Add Meals Manually
              </Label>

              {meals.length === 0 ? (
                <Button
                  onClick={addManualMeal}
                  variant="outline"
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Meal
                </Button>
              ) : (
                <div className="space-y-3">
                  {meals.map((meal, index) => (
                    <Card key={index} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold">Meal {index + 1}</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMeal(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Meal Name</Label>
                            <Input
                              value={meal.mealName}
                              onChange={(e) => updateMeal(index, { mealName: e.target.value })}
                              placeholder="e.g., Rice & Beef"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Category</Label>
                            <Select
                              value={meal.category}
                              onValueChange={(cat) => updateMealCategory(index, cat as MealCategory)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="breakfast">🌅 Breakfast</SelectItem>
                                <SelectItem value="lunch">☀️ Lunch</SelectItem>
                                <SelectItem value="dinner">🌙 Dinner</SelectItem>
                                <SelectItem value="snack">🍎 Snack</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}

                  <Button
                    onClick={addManualMeal}
                    variant="outline"
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Another Meal
                  </Button>

                  <Button
                    onClick={() => setIsPreview(true)}
                    disabled={meals.length === 0}
                    className="w-full"
                    size="lg"
                  >
                    Continue to Preview <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </>
        ) : (
          /* ========== PREVIEW MODE ========== */
          <>
            {/* Plan name */}
            <div>
              <Label htmlFor="plan-name" className="text-base font-semibold">
                Meal Plan Name *
              </Label>
              <Input
                id="plan-name"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="e.g., John's Weekly Plan, Bulking Phase 1"
                className="mt-2"
              />
            </div>

            {/* Meal Type Filter (Optional) */}
            <div>
              <Label className="text-base font-semibold flex items-center gap-2">
                <Utensils className="h-4 w-4" />
                Meal Type (Optional - Tier Filtered)
              </Label>
              <p className="text-sm text-muted-foreground mt-1 mb-2">
                Categorize this plan by meal type. Locked types require tier upgrade.
              </p>
              <MealTypeDropdown
                value={selectedMealType}
                onChange={setSelectedMealType}
                placeholder="Select meal type (optional)"
              />
            </div>

            {/* Nutrition Mode Selector */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Nutrition Tracking (Optional)</Label>
              <RadioGroup value={nutritionMode} onValueChange={(v) => setNutritionMode(v as NutritionMode)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="nutrition-none" />
                  <Label htmlFor="nutrition-none" className="font-normal cursor-pointer">
                    No nutrition tracking (show "Not calculated")
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="per-meal" id="nutrition-per-meal" />
                  <Label htmlFor="nutrition-per-meal" className="font-normal cursor-pointer">
                    Enter nutrition per meal
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="daily-total" id="nutrition-daily" />
                  <Label htmlFor="nutrition-daily" className="font-normal cursor-pointer">
                    Enter daily total nutrition (distributed across meals)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Daily Total Nutrition (if selected) */}
            {nutritionMode === 'daily-total' && (
              <Card className="p-4 bg-blue-50">
                <Label className="text-sm font-semibold mb-3 block">Daily Total Nutrition</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Calories</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 2400"
                      value={dailyNutrition.calories || ''}
                      onChange={(e) => setDailyNutrition({...dailyNutrition, calories: e.target.value ? parseInt(e.target.value) : undefined})}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Protein (g)</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 180"
                      value={dailyNutrition.protein || ''}
                      onChange={(e) => setDailyNutrition({...dailyNutrition, protein: e.target.value ? parseInt(e.target.value) : undefined})}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Carbs (g)</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 240"
                      value={dailyNutrition.carbs || ''}
                      onChange={(e) => setDailyNutrition({...dailyNutrition, carbs: e.target.value ? parseInt(e.target.value) : undefined})}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Fat (g)</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 60"
                      value={dailyNutrition.fat || ''}
                      onChange={(e) => setDailyNutrition({...dailyNutrition, fat: e.target.value ? parseInt(e.target.value) : undefined})}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  These values will be distributed evenly across {meals.length} meal{meals.length !== 1 ? 's' : ''}
                </p>
              </Card>
            )}

            {/* Meal preview list */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">
                  Meals ({meals.length})
                </Label>
                <Badge variant="outline">
                  {meals.filter(m => m.category === 'breakfast').length} Breakfast,{' '}
                  {meals.filter(m => m.category === 'lunch').length} Lunch,{' '}
                  {meals.filter(m => m.category === 'dinner').length} Dinner,{' '}
                  {meals.filter(m => m.category === 'snack').length} Snack
                </Badge>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {meals.map((meal, index) => (
                  <div
                    key={index}
                    className="p-3 border rounded-lg"
                  >
                    <div className="flex gap-3 items-start mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{meal.mealName}</p>
                        {meal.ingredients && meal.ingredients.length > 0 && (
                          <div className="mt-2 text-xs">
                            <div className="text-muted-foreground font-medium mb-1">
                              {meal.ingredients.length} ingredient{meal.ingredients.length !== 1 ? 's' : ''}:
                            </div>
                            <ul className="space-y-0.5 text-slate-600">
                              {meal.ingredients.map((ing, idx) => (
                                <li key={idx}>
                                  • {ing.amount}{ing.unit !== 'unit' ? ing.unit : ''}{ing.unit !== 'unit' ? ' ' : ' × '}{ing.ingredient}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <Badge
                          variant="secondary"
                          className={`mt-2 ${getCategoryColor(meal.category)}`}
                        >
                          {meal.category}
                        </Badge>
                      </div>

                      <Select
                        value={meal.category}
                        onValueChange={(cat) => updateMealCategory(index, cat as MealCategory)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="breakfast">🌅 Breakfast</SelectItem>
                          <SelectItem value="lunch">☀️ Lunch</SelectItem>
                          <SelectItem value="dinner">🌙 Dinner</SelectItem>
                          <SelectItem value="snack">🍎 Snack</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMeal(index)}
                      >
                        Remove
                      </Button>
                    </div>

                    {/* Per-Meal Nutrition (if selected) */}
                    {nutritionMode === 'per-meal' && (
                      <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t">
                        <div>
                          <Label className="text-xs">Cal</Label>
                          <Input
                            type="number"
                            placeholder="450"
                            className="h-8 text-xs"
                            value={meal.manualNutrition?.calories || ''}
                            onChange={(e) => updateMealNutrition(index, 'calories', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Pro(g)</Label>
                          <Input
                            type="number"
                            placeholder="35"
                            className="h-8 text-xs"
                            value={meal.manualNutrition?.protein || ''}
                            onChange={(e) => updateMealNutrition(index, 'protein', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Carb(g)</Label>
                          <Input
                            type="number"
                            placeholder="45"
                            className="h-8 text-xs"
                            value={meal.manualNutrition?.carbs || ''}
                            onChange={(e) => updateMealNutrition(index, 'carbs', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Fat(g)</Label>
                          <Input
                            type="number"
                            placeholder="12"
                            className="h-8 text-xs"
                            value={meal.manualNutrition?.fat || ''}
                            onChange={(e) => updateMealNutrition(index, 'fat', e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleBackToEdit}
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Edit
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending || !planName.trim() || meals.length === 0}
                className="flex-1"
                size="lg"
              >
                {saveMutation.isPending ? (
                  'Saving...'
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Save Meal Plan
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
