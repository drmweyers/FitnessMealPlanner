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

import { useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { useToast } from "../hooks/use-toast";
import { apiRequest } from "../lib/queryClient";
import { useAuth } from "../contexts/AuthContext";
import jsPDF from 'jspdf';
import {
  mealPlanGenerationSchema,
  type MealPlanGeneration,
  type MealPlan,
} from "@shared/schema";
import {
  ChefHat,
  Calendar,
  Users,
  Utensils,
  Clock,
  Zap,
  Target,
  Activity,
  FileText,
  Wand2,
  Sparkles,
  Download,
  UserPlus,
} from "lucide-react";
import EvoFitPDFExport from "./EvoFitPDFExport";
import html2canvas from "html2canvas";
import RecipeModal from "./RecipeModal";
import MealPlanAssignment from "./MealPlanAssignment";

/**
 * Type definition for meal plan generation results
 * Includes the meal plan data plus comprehensive nutrition analysis
 */
interface MealPlanResult {
  mealPlan: MealPlan;
  nutrition: {
    total: { calories: number; protein: number; carbs: number; fat: number };
    averageDaily: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
    daily: Array<{
      day: number;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    }>;
  };
  message: string;
  completed?: boolean;
  timestamp?: string;
}

export default function MealPlanGenerator() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Component state management
  const [generatedPlan, setGeneratedPlan] = useState<MealPlanResult | null>(
    null,
  );
  const [naturalLanguageInput, setNaturalLanguageInput] = useState("");
  const [showAdvancedForm, setShowAdvancedForm] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [forceRender, setForceRender] = useState(0);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const mealPlanRef = useRef<HTMLDivElement>(null);

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
    queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
  }, [queryClient]);

  /**
   * Auto-scroll and ensure meal plan visibility when generated
   */
  useEffect(() => {
    if (generatedPlan && mealPlanRef.current) {
      console.log("Auto-scrolling to meal plan after generation");

      // Small delay to ensure DOM is updated
      const scrollTimer = setTimeout(() => {
        if (mealPlanRef.current) {
          mealPlanRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }, 200);

      return () => clearTimeout(scrollTimer);
    }
  }, [generatedPlan]);

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
    mutationFn: async (
      naturalLanguageInput: string,
    ): Promise<MealPlanGeneration> => {
      const response = await fetch("/api/meal-plan/parse-natural-language", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naturalLanguageInput }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

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
          form.setValue(key as keyof MealPlanGeneration, value, {
            shouldValidate: true,
          });
        }
      });

      // Enhanced auto-refresh for natural language parsing
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      queryClient.refetchQueries({ queryKey: ["/api/recipes"] });

      // Force immediate GUI refresh
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
        queryClient.refetchQueries({ queryKey: ["/api/recipes"] });
      }, 50);

      setShowAdvancedForm(true);
      toast({
        title: "AI Parsing Complete",
        description:
          "Your natural language request has been converted to meal plan parameters.",
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
      const response = await apiRequest(
        "POST",
        "/api/meal-plan/generate",
        data,
      );
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedPlan(data);
      toast({
        title: "Meal Plan Generated!",
        description: "Your personalized meal plan is ready.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/meal-plans"] });
      
      // Force refresh the page when meal plan generation is completed
      // if (data.completed) {
      //   setTimeout(() => {
      //     window.location.reload();
      //   }, 2000); // Wait 2 seconds to let user see the success message
      // }
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // PDF export is now handled by the EvoFitPDFExport component
  // This function remains for backward compatibility
  const exportToPDF = async () => {
    if (!generatedPlan) {
      toast({
        title: "Error",
        description: "No meal plan data to export.",
        variant: "destructive",
      });
      return;
    }

    const { mealPlan, nutrition } = generatedPlan;
    
    // Create PDF with standard A4 size
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    let yPosition = margin;

    // Modern Color Palette - Professional and vibrant
    const colors = {
      primary: [33, 150, 243],      // Modern Blue
      secondary: [255, 152, 0],     // Vibrant Orange
      accent: [76, 175, 80],        // Fresh Green
      dark: [37, 47, 63],           // Deep Navy
      light: [248, 249, 250],       // Clean White-Gray
      white: [255, 255, 255],       // Pure White
      text: [33, 33, 33],           // Rich Black
      success: [46, 204, 113],      // Success Green
      warning: [255, 193, 7],       // Warm Yellow
      danger: [244, 67, 54],        // Modern Red
      gradient1: [87, 96, 111],     // Gradient Start
      gradient2: [52, 73, 94],      // Gradient End
    };

    // Modern Design Helper Functions
    const setColor = (color: number[], type: 'fill' | 'text' | 'draw' = 'text') => {
      if (type === 'fill') {
        pdf.setFillColor(color[0], color[1], color[2]);
      } else if (type === 'text') {
        pdf.setTextColor(color[0], color[1], color[2]);
      } else if (type === 'draw') {
        pdf.setDrawColor(color[0], color[1], color[2]);
      }
    };

    const addRect = (x: number, y: number, width: number, height: number, color: number[], style: 'F' | 'S' | 'FS' = 'F') => {
      setColor(color, 'fill');
      if (style === 'S') setColor(color, 'draw');
      pdf.rect(x, y, width, height, style);
    };

    const addRoundedRect = (x: number, y: number, width: number, height: number, radius: number, color: number[]) => {
      setColor(color, 'fill');
      pdf.roundedRect(x, y, width, height, radius, radius, 'F');
    };

    const addText = (text: string, x: number, y: number, options: any = {}) => {
      const fontSize = options.fontSize || 12;
      const font = options.font || 'helvetica';
      const style = options.style || 'normal';
      const color = options.color || colors.text;
      
      pdf.setFontSize(fontSize);
      pdf.setFont(font, style);
      setColor(color, 'text');
      
      if (options.align) {
        pdf.text(text, x, y, { align: options.align });
      } else {
        pdf.text(text, x, y);
      }
    };

    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 12, color: number[] = colors.text) => {
      pdf.setFontSize(fontSize);
      setColor(color, 'text');
      const lines = pdf.splitTextToSize(text, maxWidth);
      pdf.text(lines, x, y);
      return lines.length * (fontSize * 0.35);
    };

    const cleanText = (text: string) => {
      return text.replace(/[^\x00-\x7F]/g, "").trim();
    };

    // Add Professional Header
    const addHeader = (title: string, subtitle?: string) => {
      // Header background with gradient effect
      addRect(0, 0, pageWidth, 40, colors.primary);
      addRect(0, 0, pageWidth, 20, colors.gradient1);
      
      // Brand/Logo area
      addText("FITMEAL PRO", margin, 15, { 
        fontSize: 11, 
        style: 'bold', 
        color: colors.white 
      });
      
      // Main title
      addText(title, pageWidth / 2, 25, { 
        fontSize: 16, 
        style: 'bold', 
        color: colors.white, 
        align: 'center' 
      });
      
      if (subtitle) {
        addText(subtitle, pageWidth / 2, 35, { 
          fontSize: 10, 
          color: colors.white, 
          align: 'center' 
        });
      }
    };

    // Add Professional Footer
    const addFooter = (pageNum: number) => {
      const footerY = pageHeight - 15;
      
      // Footer line
      setColor(colors.light, 'draw');
      pdf.setLineWidth(0.5);
      pdf.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
      
      // Footer text
      addText(`${cleanText(mealPlan.planName)} - ${cleanText(mealPlan.clientName || 'Client')}`, margin, footerY, {
        fontSize: 8,
        color: colors.gradient1
      });
      
      addText(`Page ${pageNum}`, pageWidth - margin, footerY, {
        fontSize: 8,
        color: colors.gradient1,
        align: 'right'
      });
    };

    // Modern Recipe Card
    const addRecipeCard = (recipe: any, x: number, y: number, width: number, height: number, mealType: string) => {
      const mealColors = {
        breakfast: colors.warning,
        lunch: colors.success,
        dinner: colors.danger
      };
      
      const cardColor = mealColors[mealType as keyof typeof mealColors] || colors.primary;
      
      // Card background with shadow effect
      addRect(x + 2, y + 2, width, height, [200, 200, 200]); // Shadow
      addRoundedRect(x, y, width, height, 3, colors.white);
      
      // Meal type badge
      addRoundedRect(x + 5, y + 5, 40, 12, 2, cardColor);
      addText(mealType.toUpperCase(), x + 25, y + 13, {
        fontSize: 8,
        style: 'bold',
        color: colors.white,
        align: 'center'
      });
      
      // Recipe name
      addText(cleanText(recipe.name || ''), x + 5, y + 25, {
        fontSize: 11,
        style: 'bold',
        color: colors.dark
      });
      
      // Nutrition info in compact format
      const nutrition = `${recipe.caloriesKcal}kcal • ${recipe.proteinGrams}g protein • ${recipe.cookTimeMinutes}min`;
      addText(nutrition, x + 5, y + 35, {
        fontSize: 8,
        color: colors.gradient1
      });
      
      // Description (truncated)
      if (recipe.description) {
        const desc = cleanText(recipe.description);
        const shortDesc = desc.length > 80 ? desc.substring(0, 80) + '...' : desc;
        addWrappedText(shortDesc, x + 5, y + 42, width - 10, 8, colors.text);
      }
      
      // Ingredients count
      const ingredientCount = recipe.ingredientsJson?.length || 0;
      addText(`${ingredientCount} ingredients`, x + width - 35, y + height - 8, {
        fontSize: 7,
        color: colors.gradient1,
        align: 'right'
      });
    };

    // PAGE 1: COVER & OVERVIEW
    addHeader("PREMIUM MEAL PLAN", "Your Complete Nutrition Guide");
    
    yPosition = 60;
    
    // Hero section
    addRoundedRect(margin, yPosition, pageWidth - 2 * margin, 80, 8, colors.light);
    
    // Plan name - hero style
    addText(cleanText(mealPlan.planName.toUpperCase()), pageWidth / 2, yPosition + 25, {
      fontSize: 24,
      style: 'bold',
      color: colors.primary,
      align: 'center'
    });
    
    // Client info
    addText(`Prepared for ${cleanText(mealPlan.clientName || 'Client')}`, pageWidth / 2, yPosition + 40, {
      fontSize: 14,
      color: colors.dark,
      align: 'center'
    });
    
    // Goal badge
    addRoundedRect(pageWidth / 2 - 40, yPosition + 50, 80, 20, 10, colors.accent);
    addText(cleanText((mealPlan.fitnessGoal || 'general').replace('_', ' ').toUpperCase()), pageWidth / 2, yPosition + 63, {
      fontSize: 10,
      style: 'bold',
      color: colors.white,
      align: 'center'
    });
    
    yPosition += 100;
    
    // Key metrics in modern cards
    const cardWidth = (pageWidth - 4 * margin) / 3;
    const metrics = [
      { label: 'DURATION', value: `${mealPlan.days} Days`, color: colors.primary },
      { label: 'DAILY MEALS', value: `${mealPlan.mealsPerDay}`, color: colors.success },
      { label: 'CALORIES/DAY', value: `${mealPlan.dailyCalorieTarget}`, color: colors.danger }
    ];
    
    metrics.forEach((metric, index) => {
      const cardX = margin + index * (cardWidth + margin);
      addRoundedRect(cardX, yPosition, cardWidth, 50, 5, metric.color);
      
      addText(metric.label, cardX + cardWidth / 2, yPosition + 20, {
        fontSize: 9,
        style: 'bold',
        color: colors.white,
        align: 'center'
      });
      
      addText(metric.value, cardX + cardWidth / 2, yPosition + 35, {
        fontSize: 16,
        style: 'bold',
        color: colors.white,
        align: 'center'
      });
    });
    
    yPosition += 70;
    
    // Nutrition overview
    addText('WEEKLY NUTRITION BREAKDOWN', margin, yPosition, {
      fontSize: 14,
      style: 'bold',
      color: colors.dark
    });
    yPosition += 15;
    
    const nutritionCards = [
      { label: 'Total Calories', value: `${nutrition.total.calories} kcal`, color: colors.primary },
      { label: 'Protein', value: `${nutrition.total.protein}g`, color: colors.success },
      { label: 'Carbs', value: `${nutrition.total.carbs}g`, color: colors.warning },
      { label: 'Fats', value: `${nutrition.total.fat}g`, color: colors.danger }
    ];
    
    const nutritionCardWidth = (pageWidth - 5 * margin) / 4;
    nutritionCards.forEach((card, index) => {
      const cardX = margin + index * (nutritionCardWidth + margin);
      addRect(cardX, yPosition, nutritionCardWidth, 35, card.color);
      
      addText(card.label, cardX + nutritionCardWidth / 2, yPosition + 12, {
        fontSize: 8,
        color: colors.white,
        align: 'center'
      });
      
      addText(card.value, cardX + nutritionCardWidth / 2, yPosition + 25, {
        fontSize: 11,
        style: 'bold',
        color: colors.white,
        align: 'center'
      });
    });

    addFooter(1);

    // PAGE 2: WEEKLY CALENDAR & SHOPPING LIST
    pdf.addPage();
    addHeader("WEEKLY OVERVIEW", "Calendar & Shopping Guide");
    
    yPosition = 60;
    
    // Weekly calendar - compact grid
    addText('7-DAY MEAL CALENDAR', margin, yPosition, {
      fontSize: 14,
      style: 'bold',
      color: colors.dark
    });
    yPosition += 20;
    
    const mealsByDay = mealPlan.meals.reduce((acc, meal) => {
      if (!acc[meal.day]) acc[meal.day] = [];
      acc[meal.day].push(meal);
      return acc;
    }, {} as Record<number, typeof mealPlan.meals>);
    
    // Calendar grid - compact
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const cellWidth = (pageWidth - 2 * margin) / 7;
    const cellHeight = 25;
    
    // Day headers
    dayNames.forEach((day, index) => {
      const cellX = margin + index * cellWidth;
      addRect(cellX, yPosition, cellWidth, cellHeight, colors.primary);
      addText(day, cellX + cellWidth / 2, yPosition + 15, {
        fontSize: 9,
        style: 'bold',
        color: colors.white,
        align: 'center'
      });
    });
    yPosition += cellHeight;
    
    // Meal types with colors
    const mealTypes = ['breakfast', 'lunch', 'dinner'];
    const mealTypeColors = {
      breakfast: colors.warning,
      lunch: colors.success,
      dinner: colors.danger
    };
    
    mealTypes.forEach((mealType, mealIndex) => {
      for (let day = 1; day <= 7; day++) {
        const cellX = margin + (day - 1) * cellWidth;
        const cellY = yPosition + mealIndex * cellHeight;
        const meal = mealsByDay[day]?.find(m => m.mealType === mealType);
        
        if (meal) {
          addRect(cellX, cellY, cellWidth, cellHeight, mealTypeColors[mealType as keyof typeof mealTypeColors]);
          let recipeName = cleanText(meal.recipe.name || '');
          if (recipeName.length > 12) recipeName = recipeName.substring(0, 12) + '...';
          
          addText(recipeName, cellX + cellWidth / 2, cellY + 15, {
            fontSize: 7,
            color: colors.white,
            align: 'center'
          });
        } else {
          addRect(cellX, cellY, cellWidth, cellHeight, colors.light);
        }
      }
    });
    yPosition += mealTypes.length * cellHeight + 20;
    
    // Compact Shopping List
    addText('SMART SHOPPING LIST', margin, yPosition, {
      fontSize: 14,
      style: 'bold',
      color: colors.dark
    });
    yPosition += 15;
    
    // Aggregate ingredients
    const ingredientMap = new Map<string, { amount: number; unit: string; name: string }>();
    
    mealPlan.meals.forEach(meal => {
      meal.recipe.ingredientsJson?.forEach(ingredient => {
        const key = `${ingredient.name.toLowerCase()}_${ingredient.unit}`;
        if (ingredientMap.has(key)) {
          const existing = ingredientMap.get(key)!;
          existing.amount += parseFloat(ingredient.amount || '0');
        } else {
          ingredientMap.set(key, {
            amount: parseFloat(ingredient.amount || '0'),
            unit: ingredient.unit || '',
            name: ingredient.name || ''
          });
        }
      });
    });
    
    const sortedIngredients = Array.from(ingredientMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    
    // Group by category
    const categories = {
      'Proteins': ['chicken', 'beef', 'fish', 'eggs', 'tofu', 'beans'],
      'Produce': ['tomato', 'onion', 'garlic', 'spinach', 'broccoli', 'pepper', 'cucumber', 'carrot', 'apple', 'banana', 'lemon', 'lime', 'avocado'],
      'Pantry': ['rice', 'pasta', 'bread', 'quinoa', 'oats', 'oil', 'vinegar', 'sauce', 'salt', 'pepper']
    };
    
    const categorizedIngredients: Record<string, typeof sortedIngredients> = { 'Other': [] };
    
    Object.keys(categories).forEach(cat => {
      categorizedIngredients[cat] = [];
    });
    
    sortedIngredients.forEach(ingredient => {
      let found = false;
      for (const [cat, keywords] of Object.entries(categories)) {
        if (keywords.some(keyword => ingredient.name.toLowerCase().includes(keyword))) {
          categorizedIngredients[cat].push(ingredient);
          found = true;
          break;
        }
      }
      if (!found) categorizedIngredients['Other'].push(ingredient);
    });
    
    // Display in columns
    const columnWidth = (pageWidth - 3 * margin) / 2;
    let leftColumn = true;
    
    Object.entries(categorizedIngredients).forEach(([category, ingredients]) => {
      if (ingredients.length === 0) return;
      
      const columnX = leftColumn ? margin : margin + columnWidth + margin;
      
      if (yPosition > pageHeight - 50) {
        pdf.addPage();
        addHeader("SHOPPING LIST", "Continued");
        yPosition = 60;
      }
      
      // Category header
      addRoundedRect(columnX, yPosition, columnWidth, 15, 3, colors.accent);
      addText(category, columnX + 5, yPosition + 10, {
        fontSize: 10,
        style: 'bold',
        color: colors.white
      });
      yPosition += 20;
      
      // Items (max 8 per column)
      const maxItems = Math.min(8, ingredients.length);
      for (let i = 0; i < maxItems; i++) {
        const ingredient = ingredients[i];
        const amount = ingredient.amount % 1 === 0 ? ingredient.amount.toString() : ingredient.amount.toFixed(1);
        const itemText = `• ${amount} ${ingredient.unit} ${cleanText(ingredient.name)}`;
        
        if (itemText.length > 35) {
          addText(`• ${amount} ${ingredient.unit}`, columnX + 5, yPosition, { fontSize: 8, color: colors.text });
          addText(cleanText(ingredient.name), columnX + 5, yPosition + 8, { fontSize: 8, color: colors.text });
          yPosition += 16;
        } else {
          addText(itemText, columnX + 5, yPosition, { fontSize: 8, color: colors.text });
          yPosition += 10;
        }
      }
      
      if (ingredients.length > maxItems) {
        addText(`... and ${ingredients.length - maxItems} more items`, columnX + 5, yPosition, {
          fontSize: 7,
          color: colors.gradient1
        });
        yPosition += 10;
      }
      
      yPosition += 10;
      leftColumn = !leftColumn;
      
      if (leftColumn) yPosition -= (maxItems * 10 + 40); // Reset for right column
    });

    addFooter(2);

    // PAGES 3-4: DAILY MEAL PLANS (2 days per page)
    let currentPage = 3;
    const daysPerPage = 2;
    
    for (let startDay = 1; startDay <= 7; startDay += daysPerPage) {
      pdf.addPage();
      addHeader("DAILY MEAL PLANS", `Days ${startDay}-${Math.min(startDay + daysPerPage - 1, 7)}`);
      
      yPosition = 60;
      
      for (let dayOffset = 0; dayOffset < daysPerPage && startDay + dayOffset <= 7; dayOffset++) {
        const day = startDay + dayOffset;
        const dayMeals = mealsByDay[day] || [];
        
        // Day header
        addRoundedRect(margin, yPosition, pageWidth - 2 * margin, 25, 5, colors.primary);
        addText(`DAY ${day}`, margin + 10, yPosition + 16, {
          fontSize: 14,
          style: 'bold',
          color: colors.white
        });
        
        // Day nutrition
        const dayNutrition = nutrition.daily[day - 1];
        if (dayNutrition) {
          addText(`${dayNutrition.calories} kcal • ${dayNutrition.protein}g protein • ${dayNutrition.carbs}g carbs • ${dayNutrition.fat}g fat`, 
                  pageWidth - margin - 10, yPosition + 16, {
            fontSize: 9,
            color: colors.white,
            align: 'right'
          });
        }
        
        yPosition += 35;
        
        // Meal cards - 3 per row
        const sortedMeals = dayMeals.sort((a, b) => a.mealNumber - b.mealNumber);
        const cardWidth = (pageWidth - 4 * margin) / 3;
        const cardHeight = 70;
        
        sortedMeals.forEach((meal, index) => {
          const cardX = margin + index * (cardWidth + margin);
          addRecipeCard(meal.recipe, cardX, yPosition, cardWidth, cardHeight, meal.mealType);
        });
        
        yPosition += cardHeight + 20;
        
        // Ingredients summary for the day
        if (dayMeals.length > 0) {
          addText(`Key Ingredients for Day ${day}:`, margin, yPosition, {
            fontSize: 10,
            style: 'bold',
            color: colors.dark
          });
          yPosition += 12;
          
          const dayIngredients = new Set<string>();
          dayMeals.forEach(meal => {
            meal.recipe.ingredientsJson?.slice(0, 5).forEach(ingredient => {
              dayIngredients.add(cleanText(ingredient.name || ''));
            });
          });
          
          const ingredientText = Array.from(dayIngredients).slice(0, 8).join(' • ');
          addWrappedText(ingredientText, margin + 5, yPosition, pageWidth - 2 * margin, 8, colors.gradient1);
          yPosition += 20;
        }
      }
      
      addFooter(currentPage);
      currentPage++;
    }

    // FINAL PAGE: INSTRUCTIONS & TIPS
    pdf.addPage();
    addHeader("MEAL PREP GUIDE", "Instructions & Pro Tips");
    
    yPosition = 60;
    
    // Quick prep tips
    addText('MEAL PREP SUCCESS TIPS', margin, yPosition, {
      fontSize: 14,
      style: 'bold',
      color: colors.dark
    });
    yPosition += 20;
    
    const tips = [
      'Prep ingredients on Sunday for the week ahead',
      'Cook grains and proteins in batches',
      'Pre-cut vegetables and store properly',
      'Use glass containers for better food storage',
      'Label everything with dates',
      'Keep healthy snacks readily available'
    ];
    
    tips.forEach((tip, index) => {
      addRoundedRect(margin, yPosition, pageWidth - 2 * margin, 15, 3, index % 2 === 0 ? colors.light : colors.white);
      addText(`${index + 1}. ${tip}`, margin + 10, yPosition + 10, {
        fontSize: 10,
        color: colors.text
      });
      yPosition += 20;
    });
    
    yPosition += 10;
    
    // Contact/support info
    addRoundedRect(margin, yPosition, pageWidth - 2 * margin, 40, 5, colors.primary);
    addText('NEED SUPPORT?', pageWidth / 2, yPosition + 15, {
      fontSize: 12,
      style: 'bold',
      color: colors.white,
      align: 'center'
    });
    addText('Contact your nutrition coach for meal modifications', pageWidth / 2, yPosition + 28, {
      fontSize: 9,
      color: colors.white,
      align: 'center'
    });

    addFooter(currentPage);

    // Save the PDF
    const fileName = `${cleanText((mealPlan.planName || 'meal_plan').replace(/\s/g, "_"))}_${cleanText(mealPlan.clientName || 'client')}_professional.pdf`;
    pdf.save(fileName);
    
    toast({
      title: "🎉 Professional PDF Created!",
      description: "Your concise meal plan brochure is ready!",
    });
  };

  const handleNaturalLanguageParse = () => {
    if (!naturalLanguageInput.trim()) {
      toast({
        title: "Input Required",
        description:
          "Please enter a description of your meal plan requirements.",
        variant: "destructive",
      });
      return;
    }
    parseNaturalLanguage.mutate(naturalLanguageInput);
  };

  const onSubmit = (data: MealPlanGeneration) => {
    // If we have natural language input, add it to the description
    if (naturalLanguageInput.trim() && !data.description) {
      data.description = `Generated from prompt: "${naturalLanguageInput.trim()}"`;
    }
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
    return (
      colors[mealType as keyof typeof colors] || "bg-slate-100 text-slate-700"
    );
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            Meal Plan Generator
          </CardTitle>
          <CardDescription>
            Create customized meal plans for your clients based on their dietary
            preferences and nutritional goals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Natural Language AI Interface */}
          <Card className="mb-4 sm:mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6">
              <CardTitle className="flex items-center gap-2 text-blue-800 text-base sm:text-lg">
                <Wand2 className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">AI-Powered Natural Language Generator</span>
                <span className="sm:hidden">AI Meal Plan Generator</span>
              </CardTitle>
              <CardDescription className="text-blue-600 text-sm sm:text-base">
                Describe your meal plan requirements in plain English and let AI
                automatically fill the form below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-4 sm:px-6">
              <div className="space-y-2 sm:space-y-3">
                <Label
                  htmlFor="natural-language"
                  className="text-blue-700 font-medium text-sm sm:text-base"
                >
                  Describe Your Meal Plan Requirements
                </Label>
                <Textarea
                  id="natural-language"
                  placeholder="Example: I need a 5-day weight loss meal plan for Sarah with 1600 calories per day, 3 meals daily, focusing on lean proteins and vegetables, avoiding gluten..."
                  value={naturalLanguageInput}
                  onChange={(e) => setNaturalLanguageInput(e.target.value)}
                  className="min-h-[80px] sm:min-h-[100px] border-blue-200 focus:border-blue-400 text-sm sm:text-base resize-none"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button
                  type="button"
                  onClick={handleNaturalLanguageParse}
                  disabled={
                    parseNaturalLanguage.isPending ||
                    !naturalLanguageInput.trim()
                  }
                  className="bg-blue-600 hover:bg-blue-700 text-sm sm:text-base py-2 sm:py-3 flex-1 sm:flex-none"
                >
                  {parseNaturalLanguage.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      <span className="hidden sm:inline">Parsing with AI...</span>
                      <span className="sm:hidden">Parsing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Parse with AI</span>
                      <span className="sm:hidden">Parse</span>
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={() => onSubmit(form.getValues())}
                  disabled={
                    generateMealPlan.isPending || !naturalLanguageInput.trim()
                  }
                  className="bg-green-600 hover:bg-green-700 text-sm sm:text-base py-2 sm:py-3 flex-1 sm:flex-none"
                >
                  {generateMealPlan.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      <span className="hidden sm:inline">Generating...</span>
                      <span className="sm:hidden">Generating...</span>
                    </>
                  ) : (
                    <>
                      <ChefHat className="h-4 w-4 mr-2" />
                      <span className="hidden lg:inline">Generate Plan Directly</span>
                      <span className="lg:hidden">Generate</span>
                    </>
                  )}
                </Button>
                {showAdvancedForm && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAdvancedForm(false)}
                    className="border-blue-300 text-blue-700 hover:bg-blue-50 text-sm sm:text-base py-2 sm:py-3"
                  >
                    <span className="hidden sm:inline">Hide Advanced Form</span>
                    <span className="sm:hidden">Hide Form</span>
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
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {/* Plan Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <FormField
                    control={form.control}
                    name="planName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-sm sm:text-base">
                          <Target className="h-4 w-4" />
                          Plan Name *
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="7-Day Weight Loss Plan"
                            className="text-sm sm:text-base"
                            {...field}
                          />
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
                        <FormLabel className="flex items-center gap-2 text-sm sm:text-base">
                          <Activity className="h-4 w-4" />
                          Fitness Goal *
                        </FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <SelectTrigger className="text-sm sm:text-base">
                              <SelectValue placeholder="Select fitness goal" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="weight_loss">
                                Weight Loss
                              </SelectItem>
                              <SelectItem value="muscle_gain">
                                Muscle Gain
                              </SelectItem>
                              <SelectItem value="maintenance">
                                Weight Maintenance
                              </SelectItem>
                              <SelectItem value="athletic_performance">
                                Athletic Performance
                              </SelectItem>
                              <SelectItem value="general_health">
                                General Health
                              </SelectItem>
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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <FormField
                    control={form.control}
                    name="dailyCalorieTarget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-sm sm:text-base">
                          <Zap className="h-4 w-4" />
                          Daily Calorie Target *
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="800"
                            max="5001"
                            placeholder="2000"
                            className="text-sm sm:text-base"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value))
                            }
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
                        <FormLabel className="flex items-center gap-2 text-sm sm:text-base">
                          <Users className="h-4 w-4" />
                          Client Name (Optional)
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="John Doe" 
                            className="text-sm sm:text-base"
                            {...field} 
                          />
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
                      <FormLabel className="flex items-center gap-2 text-sm sm:text-base">
                        <FileText className="h-4 w-4" />
                        Plan Description (Optional)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the purpose and details of this meal plan for your client..."
                          className="min-h-[80px] sm:min-h-[100px] text-sm sm:text-base resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Basic Settings */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  <FormField
                    control={form.control}
                    name="days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-sm sm:text-base">
                          <Calendar className="h-4 w-4" />
                          Number of Days
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="30"
                            className="text-sm sm:text-base"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value))
                            }
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
                        <FormLabel className="flex items-center gap-2 text-sm sm:text-base">
                          <Utensils className="h-4 w-4" />
                          Meals Per Day
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={field.value?.toString()}
                            onValueChange={(value) =>
                              field.onChange(parseInt(value))
                            }
                          >
                            <SelectTrigger className="text-sm sm:text-base">
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
                  
                  {/* Empty div to maintain grid alignment on larger screens */}
                  <div className="hidden lg:block"></div>
                </div>

                <Separator />

                {/* Filter Options */}
                <div>
                  <h4 className="text-sm sm:text-base font-medium text-slate-700 mb-4">
                    Filter Preferences
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    <FormField
                      control={form.control}
                      name="mealType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">Meal Type</FormLabel>
                          <FormControl>
                            <Select
                              value={field.value || "all"}
                              onValueChange={(value) =>
                                field.onChange(
                                  value === "all" ? undefined : value,
                                )
                              }
                            >
                              <SelectTrigger className="text-sm sm:text-base">
                                <SelectValue placeholder="All Meals" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Meals</SelectItem>
                                <SelectItem value="breakfast">
                                  Breakfast
                                </SelectItem>
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
                          <FormLabel className="text-sm sm:text-base">Dietary</FormLabel>
                          <FormControl>
                            <Select
                              value={field.value || "all"}
                              onValueChange={(value) =>
                                field.onChange(
                                  value === "all" ? undefined : value,
                                )
                              }
                            >
                              <SelectTrigger className="text-sm sm:text-base">
                                <SelectValue placeholder="All Diets" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Diets</SelectItem>
                                <SelectItem value="vegetarian">
                                  Vegetarian
                                </SelectItem>
                                <SelectItem value="vegan">Vegan</SelectItem>
                                <SelectItem value="keto">Keto</SelectItem>
                                <SelectItem value="paleo">Paleo</SelectItem>
                                <SelectItem value="gluten-free">
                                  Gluten Free
                                </SelectItem>
                                <SelectItem value="low-carb">
                                  Low Carb
                                </SelectItem>
                                <SelectItem value="high-protein">
                                  High Protein
                                </SelectItem>
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
                          <FormLabel className="flex items-center gap-2 text-sm sm:text-base">
                            <Clock className="h-4 w-4" />
                            Max Prep Time
                          </FormLabel>
                          <FormControl>
                            <Select
                              value={field.value?.toString() || "all"}
                              onValueChange={(value) =>
                                field.onChange(
                                  value === "all" ? undefined : parseInt(value),
                                )
                              }
                            >
                              <SelectTrigger className="text-sm sm:text-base">
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
                          <FormLabel className="flex items-center gap-2 text-sm sm:text-base">
                            <Zap className="h-4 w-4" />
                            Max Calories
                          </FormLabel>
                          <FormControl>
                            <Select
                              value={field.value?.toString() || "all"}
                              onValueChange={(value) =>
                                field.onChange(
                                  value === "all" ? undefined : parseInt(value),
                                )
                              }
                            >
                              <SelectTrigger className="text-sm sm:text-base">
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
                  <h4 className="text-sm sm:text-base font-medium text-slate-700 mb-4 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Macro Nutrient Targets (per meal)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {/* Protein */}
                    <div className="space-y-3">
                      <h5 className="text-sm font-medium text-slate-600">
                        Protein (g)
                      </h5>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        <FormField
                          control={form.control}
                          name="minProtein"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs sm:text-sm">Min</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  className="text-sm sm:text-base"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(
                                      e.target.value
                                        ? parseInt(e.target.value)
                                        : undefined,
                                    )
                                  }
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
                              <FormLabel className="text-xs sm:text-sm">Max</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="∞"
                                  className="text-sm sm:text-base"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(
                                      e.target.value
                                        ? parseInt(e.target.value)
                                        : undefined,
                                    )
                                  }
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
                      <h5 className="text-sm font-medium text-slate-600">
                        Carbohydrates (g)
                      </h5>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        <FormField
                          control={form.control}
                          name="minCarbs"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs sm:text-sm">Min</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  className="text-sm sm:text-base"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(
                                      e.target.value
                                        ? parseInt(e.target.value)
                                        : undefined,
                                    )
                                  }
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
                              <FormLabel className="text-xs sm:text-sm">Max</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="∞"
                                  className="text-sm sm:text-base"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(
                                      e.target.value
                                        ? parseInt(e.target.value)
                                        : undefined,
                                    )
                                  }
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
                      <h5 className="text-sm font-medium text-slate-600">
                        Fat (g)
                      </h5>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        <FormField
                          control={form.control}
                          name="minFat"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs sm:text-sm">Min</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  className="text-sm sm:text-base"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(
                                      e.target.value
                                        ? parseInt(e.target.value)
                                        : undefined,
                                    )
                                  }
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
                              <FormLabel className="text-xs sm:text-sm">Max</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="∞"
                                  className="text-sm sm:text-base"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(
                                      e.target.value
                                        ? parseInt(e.target.value)
                                        : undefined,
                                    )
                                  }
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

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <Button
                    type="submit"
                    className="flex-1 text-sm sm:text-base py-2 sm:py-3"
                    disabled={generateMealPlan.isPending}
                    size="lg"
                  >
                    {generateMealPlan.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        <span className="hidden sm:inline">Generating Meal Plan...</span>
                        <span className="sm:hidden">Generating...</span>
                      </>
                    ) : (
                      <>
                        <ChefHat className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Generate Meal Plan</span>
                        <span className="sm:hidden">Generate</span>
                      </>
                    )}
                  </Button>

                  {generatedPlan && (
                    <Button
                      type="button"
                      onClick={() => {
                        console.log("Manual refresh button clicked");
                        setRefreshKey((prev) => prev + 1);
                        setForceRender((prev) => prev + 1);
                        if (mealPlanRef.current) {
                          mealPlanRef.current.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                        }
                      }}
                      variant="outline"
                      size="lg"
                      className="px-4 sm:px-6 text-sm sm:text-base py-2 sm:py-3"
                    >
                      <Target className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Refresh List</span>
                      <span className="sm:hidden">Refresh</span>
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>

      {/* Generated Meal Plan Results */}
      {generatedPlan && (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Target className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="text-base sm:text-lg font-semibold truncate">
                  {generatedPlan.mealPlan.planName}
                </span>
              </div>
              <div className="flex flex-col xs:flex-row gap-2">
                {(user?.role === 'trainer' || user?.role === 'admin') && (
                  <Button
                    onClick={() => setIsAssignmentModalOpen(true)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                  >
                    <UserPlus className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Assign to Customers</span>
                    <span className="sm:hidden">Assign</span>
                  </Button>
                )}
                <Button
                  onClick={() => {
                    setRefreshKey((prev) => prev + 1);
                    setForceRender((prev) => prev + 1);
                    if (mealPlanRef.current) {
                      mealPlanRef.current.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                >
                  <ChefHat className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Refresh List</span>
                  <span className="sm:hidden">Refresh</span>
                </Button>
                <EvoFitPDFExport
                  mealPlan={generatedPlan?.mealPlan}
                  customerName={generatedPlan?.mealPlan?.clientName || 'Customer'}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                >
                  <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Export EvoFit PDF</span>
                  <span className="sm:hidden">Export</span>
                </EvoFitPDFExport>
              </div>
            </CardTitle>
            <CardDescription className="space-y-2 sm:space-y-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                <span className="flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  <span className="capitalize">{generatedPlan.mealPlan.fitnessGoal.replace('_', ' ')}</span>
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
                <div className="flex items-center gap-1 text-xs sm:text-sm">
                  <Users className="h-3 w-3" />
                  For: {generatedPlan.mealPlan.clientName}
                </div>
              )}
              {generatedPlan.mealPlan.description && (
                <p className="text-xs sm:text-sm mt-2 line-clamp-2 sm:line-clamp-none">
                  {generatedPlan.mealPlan.description}
                </p>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent
            id="meal-plan-content"
            className="space-y-6 print:bg-white print:text-black print:shadow-none"
          >
            {/* Nutrition Summary */}
            <div className="bg-slate-50 p-3 sm:p-4 rounded-lg">
              <h4 className="font-medium mb-3 text-sm sm:text-base">
                Nutrition Summary (Daily Average)
              </h4>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="text-center">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-600">
                    {generatedPlan.nutrition.averageDaily.calories}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-600">Calories</div>
                </div>
                <div className="text-center">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600">
                    {generatedPlan.nutrition.averageDaily.protein}g
                  </div>
                  <div className="text-xs sm:text-sm text-slate-600">Protein</div>
                </div>
                <div className="text-center">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">
                    {generatedPlan.nutrition.averageDaily.carbs}g
                  </div>
                  <div className="text-xs sm:text-sm text-slate-600">Carbs</div>
                </div>
                <div className="text-center">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">
                    {generatedPlan.nutrition.averageDaily.fat}g
                  </div>
                  <div className="text-xs sm:text-sm text-slate-600">Fat</div>
                </div>
              </div>
            </div>

            {/* Meal Plan */}
            <div
              ref={mealPlanRef}
              key={`${refreshKey}-${forceRender}`}
              className="space-y-4"
            >
              {Array.from(
                { length: generatedPlan.mealPlan.days },
                (_, dayIndex) => {
                  const day = dayIndex + 1;
                  const dayMeals = generatedPlan.mealPlan.meals.filter(
                    (meal) => meal.day === day,
                  );
                  const dayNutrition = generatedPlan.nutrition.daily[dayIndex];

                  return (
                    <Card
                      key={`${day}-${refreshKey}-${forceRender}`}
                      className="border-l-4 border-l-blue-500"
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center justify-between">
                          <span>Day {day}</span>
                          <div className="flex gap-4 text-sm font-normal">
                            <Badge variant="outline">
                              {dayNutrition.calories} cal
                            </Badge>
                            <Badge variant="outline">
                              {dayNutrition.protein}g protein
                            </Badge>
                            <Badge variant="outline">
                              {dayNutrition.carbs}g carbs
                            </Badge>
                            <Badge variant="outline">
                              {dayNutrition.fat}g fat
                            </Badge>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-hidden border-t">
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
                                const recipe = meal.recipe as any;
                                return (
                                  <tr
                                    key={mealIndex}
                                    className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
                                    onClick={() =>
                                      handleRecipeClick(meal.recipe)
                                    }
                                  >
                                    <td className="py-4 px-4">
                                      <div className="flex items-center space-x-3">
                                        <img
                                          src={
                                            recipe.imageUrl ||
                                            "/api/placeholder/60/60"
                                          }
                                          alt={recipe.name}
                                          className="w-12 h-12 rounded-lg object-cover"
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
                                        {formatMealType(meal.mealType)}
                                      </span>
                                    </td>
                                    <td className="py-4 px-4">
                                      <div className="text-sm text-gray-900">
                                        {recipe.caloriesKcal} cal
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {Number(recipe.proteinGrams).toFixed(0)}
                                        g protein
                                      </div>
                                    </td>
                                    <td className="py-4 px-4">
                                      <div className="text-sm text-gray-900">
                                        {recipe.prepTimeMinutes +
                                          (recipe.cookTimeMinutes || 0)}{" "}
                                        min
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

                        {/* Mobile Card View */}
                        <div className="md:hidden border-t">
                          <div className="space-y-3 p-3 sm:p-4">
                            {dayMeals.map((meal, mealIndex) => {
                              const recipe = meal.recipe as any;
                              return (
                                <div
                                  key={mealIndex}
                                  className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md cursor-pointer transition-shadow"
                                  onClick={() => handleRecipeClick(meal.recipe)}
                                >
                                  <div className="flex items-start space-x-3">
                                    <img
                                      src={
                                        recipe.imageUrl ||
                                        "/api/placeholder/60/60"
                                      }
                                      alt={recipe.name}
                                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between mb-2">
                                        <h4 className="font-medium text-gray-900 text-sm truncate pr-2">
                                          {recipe.name}
                                        </h4>
                                        <span
                                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getMealTypeColor(meal.mealType)} flex-shrink-0`}
                                        >
                                          {getMealTypeIcon(meal.mealType)}
                                        </span>
                                      </div>
                                      <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                                        {recipe.description ||
                                          "Delicious and nutritious meal"}
                                      </p>
                                      <div className="flex items-center justify-between text-xs text-gray-600">
                                        <span>{recipe.caloriesKcal} cal</span>
                                        <span>{Number(recipe.proteinGrams).toFixed(0)}g protein</span>
                                        <span>
                                          {recipe.prepTimeMinutes +
                                            (recipe.cookTimeMinutes || 0)}{" "}
                                          min
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                },
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <RecipeModal recipe={selectedRecipe} onClose={closeRecipeModal} />
      )}

      {/* Meal Plan Assignment Modal */}
      {generatedPlan && (
        <Dialog open={isAssignmentModalOpen} onOpenChange={setIsAssignmentModalOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <UserPlus className="h-5 w-5 text-blue-600" />
                <span>Assign Meal Plan to Customers</span>
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4 p-4 bg-slate-50 rounded-lg border">
              <h4 className="font-semibold text-slate-900 mb-2">
                {generatedPlan.mealPlan.planName}
              </h4>
              <div className="flex flex-wrap gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  {generatedPlan.mealPlan.fitnessGoal}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {generatedPlan.mealPlan.days} days
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {generatedPlan.mealPlan.mealsPerDay} meals/day
                </Badge>
              </div>
              <div className="text-sm text-slate-600">
                <span className="mr-4">🔥 {generatedPlan.nutrition.averageDaily.calories} avg cal/day</span>
                <span className="mr-4">💪 {generatedPlan.nutrition.averageDaily.protein}g avg protein/day</span>
                <span>🍽️ {generatedPlan.mealPlan.meals.length} total meals</span>
              </div>
              {generatedPlan.mealPlan.clientName && (
                <p className="text-sm text-slate-600 mt-2">
                  👤 For: {generatedPlan.mealPlan.clientName}
                </p>
              )}
            </div>
            <MealPlanAssignment mealPlan={generatedPlan.mealPlan} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
