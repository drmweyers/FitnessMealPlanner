/**
 * Recipe Generation Modal Component
 *
 * Modal wrapper around MealPlanGenerator that allows admins to generate recipes
 * based on specific meal plan criteria. This provides context-aware recipe generation
 * instead of random recipe generation.
 */

import React, { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "../hooks/use-toast";
import { apiRequest } from "../lib/queryClient";
import { isUnauthorizedError } from "../lib/authUtils";
import { X, Wand2, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
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

export default function RecipeGenerationModal({
  isOpen,
  onClose,
}: RecipeGenerationModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [recipeCount, setRecipeCount] = useState(10);
  const [naturalLanguageInput, setNaturalLanguageInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
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
  });

  // Handle generation completion
  const handleGenerationComplete = (results: any) => {
    setIsGenerating(false);
    setCurrentJobId(null);
    
    toast({
      title: "Recipe Generation Completed!",
      description: `Successfully generated ${results.success} recipes${results.failed > 0 ? ` (${results.failed} failed)` : ''}. Refreshing page to show new recipes.`,
    });
    
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/recipes"] });
    
    // Close modal and refresh after a short delay
    setTimeout(() => {
      onClose();
    }, 1500);
    
    // Refresh handled by queryClient invalidation - no need for full page reload
    setTimeout(() => {
      // Optional: Could redirect to admin recipes tab to show new recipes
      // setLocation("/admin");
    }, 3000);
  };

  // Handle generation error
  const handleGenerationError = (error: string) => {
    setIsGenerating(false);
    setCurrentJobId(null);
    
    toast({
      title: "Recipe Generation Failed",
      description: error,
      variant: "destructive",
    });
  };

  // Extract meal plan context for recipe generation
  const generateRecipesFromContext = useMutation({
    mutationFn: async (context: RecipeGenerationContext) => {
      const response = await apiRequest("POST", "/api/admin/generate", context);
      return response.json();
    },
    onSuccess: (data) => {
      // Start progress tracking
      setIsGenerating(true);
      setCurrentJobId(data.jobId);
      
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
        // Clear expired tokens
        localStorage.removeItem('token');
        // Redirect to login using React Router
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

  // Handle context-based generation
  const handleContextGeneration = () => {
    if (!checkAuthentication()) return;
    
    const context: RecipeGenerationContext = {
      count: recipeCount,
      naturalLanguagePrompt: naturalLanguageInput.trim() || undefined,
      fitnessGoal: formData.fitnessGoal !== "all" ? formData.fitnessGoal : undefined,
      targetCalories: formData.dailyCalorieTarget ? Math.floor(formData.dailyCalorieTarget / 3) : undefined,
      mainIngredient: formData.mainIngredient.trim() || undefined,
      maxPrepTime: formData.maxPrepTime,
      maxCalories: formData.maxCalories,
      minProtein: formData.minProtein,
      maxProtein: formData.maxProtein,
      minCarbs: formData.minCarbs,
      maxCarbs: formData.maxCarbs,
      minFat: formData.minFat,
      maxFat: formData.maxFat,
    };

    // Map dietary tags to dietary restrictions
    if (formData.dietaryTag && formData.dietaryTag !== "all") {
      context.dietaryRestrictions = [formData.dietaryTag];
    }

    // Map meal types
    if (formData.mealType && formData.mealType !== "all") {
      context.mealTypes = [formData.mealType];
    }

    generateRecipesFromContext.mutate(context);
  };

  // Check if user has valid authentication
  const checkAuthentication = () => {
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
  };

  // Handle quick generation with basic count
  const handleQuickGeneration = () => {
    if (!checkAuthentication()) return;
    generateRecipesFromContext.mutate({ count: recipeCount });
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
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
              onClick={onClose}
              className="text-gray-600 border-gray-300"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
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
                <Select value={recipeCount.toString()} onValueChange={(value) => setRecipeCount(Number(value))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 recipe</SelectItem>
                    <SelectItem value="2">2 recipes</SelectItem>
                    <SelectItem value="3">3 recipes</SelectItem>
                    <SelectItem value="4">4 recipes</SelectItem>
                    <SelectItem value="5">5 recipes</SelectItem>
                    <SelectItem value="6">6 recipes</SelectItem>
                    <SelectItem value="7">7 recipes</SelectItem>
                    <SelectItem value="8">8 recipes</SelectItem>
                    <SelectItem value="9">9 recipes</SelectItem>
                    <SelectItem value="10">10 recipes</SelectItem>
                    <SelectItem value="20">20 recipes</SelectItem>
                    <SelectItem value="30">30 recipes</SelectItem>
                    <SelectItem value="50">50 recipes</SelectItem>
                    <SelectItem value="75">75 recipes</SelectItem>
                    <SelectItem value="100">100 recipes</SelectItem>
                    <SelectItem value="150">150 recipes</SelectItem>
                    <SelectItem value="200">200 recipes</SelectItem>
                    <SelectItem value="250">250 recipes</SelectItem>
                    <SelectItem value="300">300 recipes</SelectItem>
                    <SelectItem value="400">400 recipes</SelectItem>
                    <SelectItem value="500">500 recipes</SelectItem>
                  </SelectContent>
                </Select>
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
                  disabled={generateRecipesFromContext.isPending || isGenerating}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {generateRecipesFromContext.isPending ? (
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
                  value={naturalLanguageInput}
                  onChange={(e) => setNaturalLanguageInput(e.target.value)}
                  className="min-h-[80px] border-primary/30 focus:border-primary"
                />
              </div>

                            {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fitness Goal</Label>
                  <Select value={formData.fitnessGoal} onValueChange={(value) => setFormData({...formData, fitnessGoal: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select fitness goal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Fitness Goals</SelectItem>
                      <SelectItem value="weight_loss">Weight Loss</SelectItem>
                      <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                      <SelectItem value="maintenance">Weight Maintenance</SelectItem>
                      <SelectItem value="athletic_performance">Athletic Performance</SelectItem>
                      <SelectItem value="general_health">General Health</SelectItem>
                      <SelectItem value="cutting">Cutting</SelectItem>
                      <SelectItem value="bulking">Bulking</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Daily Calorie Target</Label>
                  <Input
                    type="number"
                    min="800"
                    max="5000"
                    value={formData.dailyCalorieTarget}
                    onChange={(e) => setFormData({...formData, dailyCalorieTarget: Number(e.target.value)})}
                  />
                </div>
              </div>

              {/* Filter Preferences */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-slate-700">Filter Preferences</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Meal Type</Label>
                    <Select value={formData.mealType} onValueChange={(value) => setFormData({...formData, mealType: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="All meal types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Meals</SelectItem>
                        <SelectItem value="breakfast">Breakfast</SelectItem>
                        <SelectItem value="lunch">Lunch</SelectItem>
                        <SelectItem value="dinner">Dinner</SelectItem>
                        <SelectItem value="snack">Snack</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Dietary</Label>
                    <Select value={formData.dietaryTag} onValueChange={(value) => setFormData({...formData, dietaryTag: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="All diets" />
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
                  </div>

                  <div className="space-y-2">
                    <Label>Max Prep Time</Label>
                    <Select value={formData.maxPrepTime?.toString() || "all"} onValueChange={(value) => setFormData({...formData, maxPrepTime: value === "all" ? undefined : Number(value)})}>
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
                  </div>

                  <div className="space-y-2">
                    <Label>Max Calories</Label>
                    <Select value={formData.maxCalories?.toString() || "all"} onValueChange={(value) => setFormData({...formData, maxCalories: value === "all" ? undefined : Number(value)})}>
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
                  </div>
                </div>
              </div>

              {/* Macro Nutrient Targets */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-slate-700">Macro Nutrient Targets (per meal)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Protein */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-slate-600">Protein (g)</h5>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Min</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={formData.minProtein || ""}
                          onChange={(e) => setFormData({...formData, minProtein: e.target.value ? Number(e.target.value) : undefined})}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Max</Label>
                        <Input
                          type="number"
                          placeholder="∞"
                          value={formData.maxProtein || ""}
                          onChange={(e) => setFormData({...formData, maxProtein: e.target.value ? Number(e.target.value) : undefined})}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Carbohydrates */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-slate-600">Carbohydrates (g)</h5>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Min</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={formData.minCarbs || ""}
                          onChange={(e) => setFormData({...formData, minCarbs: e.target.value ? Number(e.target.value) : undefined})}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Max</Label>
                        <Input
                          type="number"
                          placeholder="∞"
                          value={formData.maxCarbs || ""}
                          onChange={(e) => setFormData({...formData, maxCarbs: e.target.value ? Number(e.target.value) : undefined})}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Fat */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-slate-600">Fat (g)</h5>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Min</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={formData.minFat || ""}
                          onChange={(e) => setFormData({...formData, minFat: e.target.value ? Number(e.target.value) : undefined})}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Max</Label>
                        <Input
                          type="number"
                          placeholder="∞"
                          value={formData.maxFat || ""}
                          onChange={(e) => setFormData({...formData, maxFat: e.target.value ? Number(e.target.value) : undefined})}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Main Ingredient (Optional)</Label>
                <Input
                  placeholder="e.g., chicken, salmon, quinoa..."
                  value={formData.mainIngredient}
                  onChange={(e) => setFormData({...formData, mainIngredient: e.target.value})}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleContextGeneration}
                  disabled={generateRecipesFromContext.isPending || isGenerating}
                  className="flex-1 bg-primary hover:bg-primary/90"
                  size="lg"
                >
                  {generateRecipesFromContext.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Generating Targeted Recipes...
                    </>
                  ) : (
                    <>
                      <Target className="h-4 w-4 mr-2" />
                      Generate Targeted Recipes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Progress Tracking */}
          {isGenerating && currentJobId && (
            <RecipeGenerationProgress
              jobId={currentJobId}
              totalRecipes={recipeCount}
              onComplete={handleGenerationComplete}
              onError={handleGenerationError}
            />
          )}
        </div>
      </div>
    </div>
  );
} 