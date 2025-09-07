/**
 * Optimized Recipe Generation Modal Component
 *
 * This component addresses the 30+ second delays during recipe generation by:
 * 1. Using optimized Select components with proper memoization
 * 2. Implementing stable event handlers with useCallback
 * 3. Preventing unnecessary re-renders with React.memo and useMemo
 * 4. Adding debounced form updates to reduce computation
 * 5. Using error boundaries for graceful failure handling
 * 6. Implementing proper loading states and user feedback
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "./ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../hooks/use-toast";
import { apiRequest } from "../lib/queryClient";
import { isUnauthorizedError } from "../lib/authUtils";
import { X, Wand2, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { OptimizedSelectField, OptimizedSelectItem, SelectErrorBoundary } from "./ui/optimized-select";
import RecipeGenerationProgress from "./RecipeGenerationProgress";
import { useLocation } from "wouter";

interface RecipeGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RecipeGenerationContext {
  count?: number;
  mealTypes?: string[];
  dietaryRestrictions?: string[];
  targetCalories?: number;
  mainIngredient?: string;
  fitnessGoal?: string;
  naturalLanguagePrompt?: string;
  maxPrepTime?: number;
  maxCalories?: number;
  minProtein?: number;
  maxProtein?: number;
  minCarbs?: number;
  maxCarbs?: number;
  minFat?: number;
  maxFat?: number;
}

// Memoized recipe count options
const RECIPE_COUNT_OPTIONS = [
  { value: "1", label: "1 recipe" },
  { value: "2", label: "2 recipes" },
  { value: "3", label: "3 recipes" },
  { value: "4", label: "4 recipes" },
  { value: "5", label: "5 recipes" },
  { value: "6", label: "6 recipes" },
  { value: "7", label: "7 recipes" },
  { value: "8", label: "8 recipes" },
  { value: "9", label: "9 recipes" },
  { value: "10", label: "10 recipes" },
  { value: "20", label: "20 recipes" },
  { value: "30", label: "30 recipes" },
  { value: "50", label: "50 recipes" },
  { value: "75", label: "75 recipes" },
  { value: "100", label: "100 recipes" },
  { value: "150", label: "150 recipes" },
  { value: "200", label: "200 recipes" },
  { value: "250", label: "250 recipes" },
  { value: "300", label: "300 recipes" },
  { value: "400", label: "400 recipes" },
  { value: "500", label: "500 recipes" },
] as const;

// Memoized fitness goal options
const FITNESS_GOAL_OPTIONS = [
  { value: "all", label: "All Fitness Goals" },
  { value: "weight_loss", label: "Weight Loss" },
  { value: "muscle_gain", label: "Muscle Gain" },
  { value: "maintenance", label: "Weight Maintenance" },
  { value: "athletic_performance", label: "Athletic Performance" },
  { value: "general_health", label: "General Health" },
  { value: "cutting", label: "Cutting" },
  { value: "bulking", label: "Bulking" },
] as const;

// Memoized meal type options
const MEAL_TYPE_OPTIONS = [
  { value: "all", label: "All Meals" },
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
] as const;

// Memoized dietary tag options
const DIETARY_TAG_OPTIONS = [
  { value: "all", label: "All Diets" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "keto", label: "Keto" },
  { value: "paleo", label: "Paleo" },
  { value: "mediterranean", label: "Mediterranean" },
  { value: "low_carb", label: "Low Carb" },
  { value: "high_protein", label: "High Protein" },
  { value: "gluten_free", label: "Gluten Free" },
  { value: "dairy_free", label: "Dairy Free" },
] as const;

// Debounce hook for form updates
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Memoized Select components for form options
const RecipeCountSelect = React.memo<{
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}>(({ value, onChange, disabled = false }) => {
  const handleChange = useCallback((stringValue: string) => {
    onChange(Number(stringValue));
  }, [onChange]);

  const selectItems = useMemo(() => (
    RECIPE_COUNT_OPTIONS.map(option => (
      <OptimizedSelectItem key={option.value} value={option.value}>
        {option.label}
      </OptimizedSelectItem>
    ))
  ), []);

  return (
    <SelectErrorBoundary>
      <OptimizedSelectField
        value={value.toString()}
        onValueChange={handleChange}
        disabled={disabled}
        className="w-32"
      >
        {selectItems}
      </OptimizedSelectField>
    </SelectErrorBoundary>
  );
});

RecipeCountSelect.displayName = 'RecipeCountSelect';

const FitnessGoalSelect = React.memo<{
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}>(({ value, onChange, disabled = false }) => {
  const selectItems = useMemo(() => (
    FITNESS_GOAL_OPTIONS.map(option => (
      <OptimizedSelectItem key={option.value} value={option.value}>
        {option.label}
      </OptimizedSelectItem>
    ))
  ), []);

  return (
    <SelectErrorBoundary>
      <OptimizedSelectField
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        placeholder="Select fitness goal"
      >
        {selectItems}
      </OptimizedSelectField>
    </SelectErrorBoundary>
  );
});

FitnessGoalSelect.displayName = 'FitnessGoalSelect';

const MealTypeSelect = React.memo<{
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}>(({ value, onChange, disabled = false }) => {
  const selectItems = useMemo(() => (
    MEAL_TYPE_OPTIONS.map(option => (
      <OptimizedSelectItem key={option.value} value={option.value}>
        {option.label}
      </OptimizedSelectItem>
    ))
  ), []);

  return (
    <SelectErrorBoundary>
      <OptimizedSelectField
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        placeholder="All meal types"
      >
        {selectItems}
      </OptimizedSelectField>
    </SelectErrorBoundary>
  );
});

MealTypeSelect.displayName = 'MealTypeSelect';

const DietaryTagSelect = React.memo<{
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}>(({ value, onChange, disabled = false }) => {
  const selectItems = useMemo(() => (
    DIETARY_TAG_OPTIONS.map(option => (
      <OptimizedSelectItem key={option.value} value={option.value}>
        {option.label}
      </OptimizedSelectItem>
    ))
  ), []);

  return (
    <SelectErrorBoundary>
      <OptimizedSelectField
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        placeholder="All diets"
      >
        {selectItems}
      </OptimizedSelectField>
    </SelectErrorBoundary>
  );
});

DietaryTagSelect.displayName = 'DietaryTagSelect';

export default function RecipeGenerationModalOptimized({
  isOpen,
  onClose,
}: RecipeGenerationModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  // Form state with stable initial values
  const [formState, setFormState] = useState(() => ({
    recipeCount: 10,
    naturalLanguageInput: "",
    fitnessGoal: "all",
    dailyCalorieTarget: 2000,
    mealType: "all",
    dietaryTag: "all",
    mainIngredient: "",
    maxPrepTime: undefined as number | undefined,
    maxCalories: undefined as number | undefined,
    minProtein: undefined as number | undefined,
    maxProtein: undefined as number | undefined,
    minCarbs: undefined as number | undefined,
    maxCarbs: undefined as number | undefined,
    minFat: undefined as number | undefined,
    maxFat: undefined as number | undefined,
  }));

  const [generationState, setGenerationState] = useState({
    isGenerating: false,
    currentJobId: null as string | null,
  });

  // Debounce form updates to prevent excessive re-renders
  const debouncedFormState = useDebounce(formState, 300);

  // Memoized form update handlers
  const updateFormField = useCallback(<K extends keyof typeof formState>(
    field: K,
    value: typeof formState[K]
  ) => {
    setFormState(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleRecipeCountChange = useCallback((value: number) => {
    updateFormField('recipeCount', value);
  }, [updateFormField]);

  const handleNaturalLanguageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateFormField('naturalLanguageInput', e.target.value);
  }, [updateFormField]);

  const handleFitnessGoalChange = useCallback((value: string) => {
    updateFormField('fitnessGoal', value);
  }, [updateFormField]);

  const handleDailyCalorieTargetChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormField('dailyCalorieTarget', Number(e.target.value));
  }, [updateFormField]);

  const handleMealTypeChange = useCallback((value: string) => {
    updateFormField('mealType', value);
  }, [updateFormField]);

  const handleDietaryTagChange = useCallback((value: string) => {
    updateFormField('dietaryTag', value);
  }, [updateFormField]);

  const handleMainIngredientChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormField('mainIngredient', e.target.value);
  }, [updateFormField]);

  // Memoized generation completion handler
  const handleGenerationComplete = useCallback((results: any) => {
    setGenerationState({
      isGenerating: false,
      currentJobId: null,
    });
    
    toast({
      title: "Recipe Generation Completed!",
      description: `Successfully generated ${results.success} recipes${results.failed > 0 ? ` (${results.failed} failed)` : ''}. Refreshing page to show new recipes.`,
    });
    
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    queryClient.invalidateQueries({ queryKey: ["admin-recipes"] });
    
    // Close modal after delay
    setTimeout(() => {
      onClose();
    }, 1500);
  }, [toast, queryClient, onClose]);

  // Memoized generation error handler
  const handleGenerationError = useCallback((error: string) => {
    setGenerationState({
      isGenerating: false,
      currentJobId: null,
    });
    
    toast({
      title: "Recipe Generation Failed",
      description: error,
      variant: "destructive",
    });
  }, [toast]);

  // Recipe generation mutation
  const generateRecipesMutation = useMutation({
    mutationFn: async (context: RecipeGenerationContext) => {
      const response = await apiRequest("POST", "/api/admin/generate", context);
      return response.json();
    },
    onSuccess: (data) => {
      setGenerationState({
        isGenerating: true,
        currentJobId: data.jobId,
      });
      
      toast({
        title: "Recipe Generation Started",
        description: data.message,
      });
    },
    onError: (error) => {
      console.error("Recipe generation error:", error);
      
      if (isUnauthorizedError(error) || error.message.includes("401") || error.message.includes("jwt expired") || error.message.includes("Authentication required")) {
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please log in again to continue.",
          variant: "destructive",
        });
        localStorage.removeItem('token');
        setTimeout(() => {
          setLocation("/login");
        }, 1000);
        return;
      }
      
      toast({
        title: "Recipe Generation Failed",
        description: error.message || "Failed to start recipe generation. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Authentication check
  const checkAuthentication = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast({
        title: "Authentication Required",
        description: "Please log in to generate recipes.",
        variant: "destructive",
      });
      setTimeout(() => {
        setLocation("/login");
      }, 1000);
      return false;
    }
    return true;
  }, [toast, setLocation]);

  // Memoized context generation handler
  const handleContextGeneration = useCallback(() => {
    if (!checkAuthentication()) return;
    
    const context: RecipeGenerationContext = {
      count: debouncedFormState.recipeCount,
      naturalLanguagePrompt: debouncedFormState.naturalLanguageInput.trim() || undefined,
      fitnessGoal: debouncedFormState.fitnessGoal !== "all" ? debouncedFormState.fitnessGoal : undefined,
      targetCalories: debouncedFormState.dailyCalorieTarget ? Math.floor(debouncedFormState.dailyCalorieTarget / 3) : undefined,
      mainIngredient: debouncedFormState.mainIngredient.trim() || undefined,
      maxPrepTime: debouncedFormState.maxPrepTime,
      maxCalories: debouncedFormState.maxCalories,
      minProtein: debouncedFormState.minProtein,
      maxProtein: debouncedFormState.maxProtein,
      minCarbs: debouncedFormState.minCarbs,
      maxCarbs: debouncedFormState.maxCarbs,
      minFat: debouncedFormState.minFat,
      maxFat: debouncedFormState.maxFat,
    };

    // Map dietary tags to dietary restrictions
    if (debouncedFormState.dietaryTag && debouncedFormState.dietaryTag !== "all") {
      context.dietaryRestrictions = [debouncedFormState.dietaryTag];
    }

    // Map meal types
    if (debouncedFormState.mealType && debouncedFormState.mealType !== "all") {
      context.mealTypes = [debouncedFormState.mealType];
    }

    generateRecipesMutation.mutate(context);
  }, [checkAuthentication, debouncedFormState, generateRecipesMutation]);

  // Memoized quick generation handler
  const handleQuickGeneration = useCallback(() => {
    if (!checkAuthentication()) return;
    generateRecipesMutation.mutate({ count: debouncedFormState.recipeCount });
  }, [checkAuthentication, debouncedFormState.recipeCount, generateRecipesMutation]);

  // Memoized close handler
  const handleClose = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    onClose();
  }, [onClose]);

  // Don't render if not open
  if (!isOpen) return null;

  const isLoading = generateRecipesMutation.isPending || generationState.isGenerating;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div 
        className="bg-white rounded-lg max-w-5xl w-full max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 sticky top-0 bg-white z-10">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Generate Targeted Recipes</h1>
              <p className="text-gray-600 mt-1">
                Use meal plan criteria to generate contextually relevant recipes
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClose}
              className="text-gray-600 border-gray-300"
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Show progress if generation is active */}
          {generationState.isGenerating && generationState.currentJobId && (
            <RecipeGenerationProgress
              jobId={generationState.currentJobId}
              onComplete={handleGenerationComplete}
              onError={handleGenerationError}
            />
          )}

          {/* Recipe Count Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Recipe Count
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Label htmlFor="recipe-count">Number of recipes to generate:</Label>
                <RecipeCountSelect
                  value={formState.recipeCount}
                  onChange={handleRecipeCountChange}
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Quick Generation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                Quick Random Generation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <p className="text-gray-600 flex-1">Generate random recipes without specific criteria</p>
                <Button
                  onClick={handleQuickGeneration}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Generating...
                    </>
                  ) : (
                    "Generate Random Recipes"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Context-Based Generation */}
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Target className="h-5 w-5" />
                Context-Based Generation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Natural Language Input */}
              <div className="space-y-3">
                <Label htmlFor="natural-language" className="text-primary font-medium">
                  Describe Recipe Requirements (Optional)
                </Label>
                <Textarea
                  id="natural-language"
                  placeholder="Example: I need protein-rich breakfast recipes for weight loss, around 400 calories each, with eggs as main ingredient..."
                  value={formState.naturalLanguageInput}
                  onChange={handleNaturalLanguageChange}
                  className="min-h-[80px] border-primary/30 focus:border-primary"
                  disabled={isLoading}
                />
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fitness Goal</Label>
                  <FitnessGoalSelect
                    value={formState.fitnessGoal}
                    onChange={handleFitnessGoalChange}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Daily Calorie Target</Label>
                  <Input
                    type="number"
                    min="800"
                    max="5000"
                    value={formState.dailyCalorieTarget}
                    onChange={handleDailyCalorieTargetChange}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Filter Preferences */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-slate-700">Filter Preferences</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Meal Type</Label>
                    <MealTypeSelect
                      value={formState.mealType}
                      onChange={handleMealTypeChange}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Dietary</Label>
                    <DietaryTagSelect
                      value={formState.dietaryTag}
                      onChange={handleDietaryTagChange}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Main Ingredient</Label>
                    <Input
                      placeholder="e.g., chicken, salmon"
                      value={formState.mainIngredient}
                      onChange={handleMainIngredientChange}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <div className="pt-4 border-t">
                <Button
                  onClick={handleContextGeneration}
                  disabled={isLoading}
                  className="w-full bg-primary hover:bg-primary/90"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Generating Context-Based Recipes...
                    </>
                  ) : (
                    <>
                      <Target className="h-4 w-4 mr-2" />
                      Generate Context-Based Recipes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}