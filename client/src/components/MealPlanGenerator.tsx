/**
 * Meal Plan Generator Component
 * 
 * This is the core component for creating personalized meal plans in FitMeal Pro.
 * It provides both natural language processing and detailed form-based input
 * for generating meal plans tailored to fitness goals and dietary preferences.
 * 
 * Key Features:
 * - Natural language meal plan generation using OpenAI
 * - Advanced form with nutritional constraints and preferences
 * - Real-time meal plan preview with detailed recipe information
 * - PDF export functionality for client deliverables
 * - Interactive recipe modals with full cooking instructions
 * - Comprehensive nutrition tracking and analysis
 */

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { ChefHat, Calendar, Users, Utensils, Clock, Zap, Target, Activity, FileText, Wand2, Sparkles, Download } from "lucide-react";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import RecipeModal from './RecipeModal';

/**
 * Type definition for meal plan generation results
 * Includes the meal plan data plus comprehensive nutrition analysis
 */
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
  const queryClient = useQueryClient();
  
  // Component state management
  const [generatedPlan, setGeneratedPlan] = useState<MealPlanResult | null>(null);
  const [naturalLanguageInput, setNaturalLanguageInput] = useState("");
  const [showAdvancedForm, setShowAdvancedForm] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);

  /**
   * Recipe Modal Handlers
   * 
   * Manages the display of detailed recipe information in a modal overlay.
   * Users can click on meal cards to view full cooking instructions.
   */
  const handleRecipeClick = (recipe: any) => {
    setSelectedRecipe(recipe);
  };

  const closeRecipeModal = () => {
    setSelectedRecipe(null);
  };

  /**
   * Component Initialization
   * 
   * Ensures the latest recipe data is available when the component loads
   * for optimal meal plan generation results.
   */
  useEffect(() => {
    // Refresh recipe data on component mount to ensure latest available recipes
    queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
  }, [queryClient]);

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

  const parseNaturalLanguage = useMutation({
    mutationFn: async (naturalLanguageInput: string): Promise<MealPlanGeneration> => {
      const response = await apiRequest('POST', '/api/meal-plan/parse-natural-language', {
        naturalLanguageInput
      });
      const result = await response.json();
      console.log("Raw API response:", result);
      
      // Map the API response to the form structure
      const mappedData: MealPlanGeneration = {
        planName: result.planName || "",
        fitnessGoal: result.fitnessGoal || "",
        description: result.description || "",
        dailyCalorieTarget: Number(result.dailyCalorieTarget) || 2000,
        days: Number(result.days) || 7,
        mealsPerDay: Number(result.mealsPerDay) || 3,
        clientName: result.clientName || "",
        // Initialize optional filter fields
        mealType: undefined,
        dietaryTag: undefined,
        maxPrepTime: undefined,
        maxCalories: undefined,
        minCalories: undefined,
        minProtein: undefined,
        maxProtein: undefined,
        minCarbs: undefined,
        maxCarbs: undefined,
        minFat: undefined,
        maxFat: undefined,
      };
      
      console.log("Mapped data:", mappedData);
      return mappedData;
    },
    onSuccess: (parsedData: MealPlanGeneration) => {
      console.log("Parsed data:", parsedData);
      
      // Set individual form values to trigger re-renders
      Object.entries(parsedData).forEach(([key, value]) => {
        if (value !== undefined) {
          form.setValue(key as keyof MealPlanGeneration, value, { shouldValidate: true });
        }
      });
      
      // Refresh recipe data to ensure latest available recipes
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
      queryClient.refetchQueries({ queryKey: ['/api/recipes'] });
      
      setShowAdvancedForm(true);
      toast({
        title: "AI Parsing Complete",
        description: "Your natural language request has been converted to meal plan parameters.",
      });
      console.log("Form values after setValue:", form.getValues());
    },
    onError: (error: Error) => {
      toast({
        title: "Parsing Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateMealPlan = useMutation({
    mutationFn: async (data: MealPlanGeneration): Promise<MealPlanResult> => {
      console.log("Generating meal plan with data:", data);
      
      try {
        const response = await apiRequest('POST', '/api/meal-plan/generate', data);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API Error: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log("Meal plan generation result:", result);
        
        // Validate the response structure
        if (!result.mealPlan || !result.nutrition) {
          throw new Error("Invalid response format from server");
        }
        
        return result as MealPlanResult;
      } catch (error) {
        console.error("Meal plan generation error:", error);
        throw error;
      }
    },
    onSuccess: (data: MealPlanResult) => {
      console.log("Meal plan generation successful:", data);
      setGeneratedPlan(data);
      
      // Auto-refresh recipe data only (remove admin endpoints for public users)
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
      queryClient.refetchQueries({ queryKey: ['/api/recipes'] });
      
      toast({
        title: "Meal Plan Generated Successfully",
        description: data.message || `Generated ${data.mealPlan.days.length}-day meal plan`,
      });
    },
    onError: (error: Error) => {
      console.error("Meal plan generation failed:", error);
      toast({
        title: "Generation Failed",
        description: error.message || "An unexpected error occurred during meal plan generation",
        variant: "destructive",
      });
    },
  });

  const handleNaturalLanguageParse = () => {
    if (!naturalLanguageInput.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter a description of your meal plan requirements.",
        variant: "destructive",
      });
      return;
    }
    parseNaturalLanguage.mutate(naturalLanguageInput);
  };

  const handleDirectGeneration = async () => {
    if (!naturalLanguageInput.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter a description of your meal plan requirements.",
        variant: "destructive",
      });
      return;
    }

    try {
      // First parse the natural language input
      const response = await apiRequest('POST', '/api/meal-plan/parse-natural-language', {
        naturalLanguageInput
      });
      const parsedData = await response.json();
      
      // Map the parsed data to the generation format
      const generationData: MealPlanGeneration = {
        planName: parsedData.planName || "",
        fitnessGoal: parsedData.fitnessGoal || "",
        description: parsedData.description || "",
        dailyCalorieTarget: Number(parsedData.dailyCalorieTarget) || 2000,
        days: Number(parsedData.days) || 7,
        mealsPerDay: Number(parsedData.mealsPerDay) || 3,
        clientName: parsedData.clientName || "",
        // Initialize optional filter fields
        mealType: undefined,
        dietaryTag: undefined,
        maxPrepTime: undefined,
        maxCalories: undefined,
        minCalories: undefined,
        minProtein: undefined,
        maxProtein: undefined,
        minCarbs: undefined,
        maxCarbs: undefined,
        minFat: undefined,
        maxFat: undefined,
      };

      // Directly generate the meal plan
      generateMealPlan.mutate(generationData);
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to parse and generate meal plan. Please try again.",
        variant: "destructive",
      });
    }
  };

  const exportToPDF = async () => {
    if (!generatedPlan) return;

    try {
      const element = document.getElementById('meal-plan-content');
      if (!element) return;

      toast({
        title: "Generating PDF",
        description: "Creating PDF document...",
      });

      // Ensure element is visible and has content
      element.style.display = 'block';
      element.style.visibility = 'visible';

      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: true,
        height: element.scrollHeight,
        width: element.scrollWidth,
        scrollX: 0,
        scrollY: 0,
      });

      console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);

      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas has zero dimensions');
      }

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const availableWidth = pdfWidth - (margin * 2);
      const availableHeight = pdfHeight - (margin * 2);
      
      const imgAspectRatio = canvas.width / canvas.height;
      let imgWidth = availableWidth;
      let imgHeight = availableWidth / imgAspectRatio;
      
      // If image is too tall for one page, scale it down
      if (imgHeight > availableHeight) {
        imgHeight = availableHeight;
        imgWidth = availableHeight * imgAspectRatio;
      }
      
      // Calculate total height in PDF units
      const scaledHeight = (canvas.height * imgWidth) / canvas.width;
      const pageCount = Math.ceil(scaledHeight / availableHeight);
      
      for (let i = 0; i < pageCount; i++) {
        if (i > 0) {
          pdf.addPage();
        }
        
        const yPosition = margin - (i * availableHeight);
        
        pdf.addImage(
          imgData,
          'PNG',
          margin,
          yPosition,
          imgWidth,
          scaledHeight
        );
      }

      const fileName = `${generatedPlan.mealPlan.planName.replace(/[^a-z0-9\s]/gi, '')}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast({
        title: "PDF Exported",
        description: "Meal plan PDF downloaded successfully.",
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "Export Failed",
        description: `Failed to generate PDF: ${(error as Error).message}`,
        variant: "destructive",
      });
    }
  };

  const onSubmit = (data: MealPlanGeneration) => {
    generateMealPlan.mutate(data);
  };

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
    return colors[mealType as keyof typeof colors] || "bg-slate-100 text-slate-700";
  };

  const getDietaryTagColor = (tag: string) => {
    const colors = {
      vegetarian: "bg-green-100 text-green-700",
      vegan: "bg-blue-100 text-blue-700",
      keto: "bg-green-100 text-green-700",
      paleo: "bg-orange-100 text-orange-700",
      "gluten-free": "bg-purple-100 text-purple-700",
      "low-carb": "bg-red-100 text-red-700",
      "high-protein": "bg-purple-100 text-purple-700",
    };
    return colors[tag as keyof typeof colors] || "bg-slate-100 text-slate-700";
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
          {/* Natural Language AI Interface */}
          <Card className="mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Wand2 className="h-5 w-5" />
                AI-Powered Natural Language Generator
              </CardTitle>
              <CardDescription className="text-blue-600">
                Describe your meal plan requirements in plain English and let AI automatically fill the form below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label htmlFor="natural-language" className="text-blue-700 font-medium">
                  Describe Your Meal Plan Requirements
                </Label>
                <Textarea
                  id="natural-language"
                  placeholder="Example: I need a 5-day weight loss meal plan for Sarah with 1600 calories per day, 3 meals daily, focusing on lean proteins and vegetables, avoiding gluten..."
                  value={naturalLanguageInput}
                  onChange={(e) => setNaturalLanguageInput(e.target.value)}
                  className="min-h-[100px] border-blue-200 focus:border-blue-400"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={handleNaturalLanguageParse}
                  disabled={parseNaturalLanguage.isPending || !naturalLanguageInput.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {parseNaturalLanguage.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Parsing with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Parse with AI
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={handleDirectGeneration}
                  disabled={generateMealPlan.isPending || !naturalLanguageInput.trim()}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {generateMealPlan.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <ChefHat className="h-4 w-4 mr-2" />
                      Generate Plan Directly
                    </>
                  )}
                </Button>
                {showAdvancedForm && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAdvancedForm(false)}
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    Hide Advanced Form
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Simple Toggle Button for Manual Form Access */}
          {!showAdvancedForm && (
            <div className="flex justify-center mb-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAdvancedForm(true)}
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <Target className="h-4 w-4 mr-2" />
                Manual Configuration
              </Button>
            </div>
          )}

          {/* Advanced Form - Show after AI parsing or manual toggle */}
          {showAdvancedForm && (
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
          )}
        </CardContent>
      </Card>

      {/* Generated Meal Plan Results */}
      {generatedPlan && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                {generatedPlan.mealPlan.planName}
              </div>
              <Button
                onClick={exportToPDF}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export to PDF
              </Button>
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
          <CardContent id="meal-plan-content" className="space-y-6 print:bg-white print:text-black print:shadow-none">
            
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
                    <CardContent className="p-0">
                      <div className="overflow-hidden border-t">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr className="border-b">
                              <th className="text-left py-3 px-4 font-medium text-gray-600 uppercase text-xs tracking-wider">Recipe</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-600 uppercase text-xs tracking-wider">Type</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-600 uppercase text-xs tracking-wider">Nutrition</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-600 uppercase text-xs tracking-wider">Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dayMeals.map((meal, mealIndex) => {
                              const recipe = meal.recipe as any;
                              return (
                                <tr 
                                  key={mealIndex}
                                  className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
                                  onClick={() => handleRecipeClick(meal.recipe)}
                                >
                                  <td className="py-4 px-4">
                                    <div className="flex items-center space-x-3">
                                      <img 
                                        src={recipe.imageUrl || '/api/placeholder/60/60'} 
                                        alt={recipe.name}
                                        className="w-12 h-12 rounded-lg object-cover"
                                      />
                                      <div>
                                        <div className="font-medium text-gray-900">{recipe.name}</div>
                                        <div className="text-sm text-gray-500 line-clamp-1">
                                          {recipe.description || 'Delicious and nutritious meal'}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-4 px-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMealTypeColor(meal.mealType)}`}>
                                      {formatMealType(meal.mealType)}
                                    </span>
                                  </td>
                                  <td className="py-4 px-4">
                                    <div className="text-sm text-gray-900">{recipe.caloriesKcal} cal</div>
                                    <div className="text-xs text-gray-500">
                                      {Number(recipe.proteinGrams).toFixed(0)}g protein
                                    </div>
                                  </td>
                                  <td className="py-4 px-4">
                                    <div className="text-sm text-gray-900">
                                      {recipe.prepTimeMinutes + (recipe.cookTimeMinutes || 0)} min
                                    </div>
                                    <div className="text-xs text-gray-500">prep + cook</div>
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
          </CardContent>
        </Card>
      )}

      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <RecipeModal
          recipe={selectedRecipe}
          onClose={closeRecipeModal}
        />
      )}
    </div>
  );
}