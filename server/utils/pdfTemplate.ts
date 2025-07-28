/**
 * PDF Template Utilities
 * 
 * Handles HTML template compilation and data transformation for PDF generation
 */

import ejs from 'ejs';
import path from 'path';
import { fileURLToPath } from 'url';
import dayjs from 'dayjs';
import { readFileSync } from 'fs';
import url from 'url';

// Get current module directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface MealPlanPdfData {
  mealPlan: {
    id: string;
    planName: string;
    fitnessGoal: string;
    description?: string;
    dailyCalorieTarget: number;
    days: number;
    mealsPerDay: number;
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
        mealTypes: string[];
        dietaryTags: string[];
        ingredientsJson: Array<{
          name: string;
          amount: string;
          unit: string;
        }>;
        instructionsText: string;
      };
    }>;
  };
  customerName: string;
  generatedDate: string;
  generatedBy: string;
  options: {
    includeShoppingList?: boolean;
    includeMacroSummary?: boolean;
    includeRecipePhotos?: boolean;
    orientation?: 'portrait' | 'landscape';
    pageSize?: 'A4' | 'Letter';
  };
  brandInfo: {
    name: string;
    tagline: string;
    website: string;
    colors: {
      primary: string;
      accent: string;
      text: string;
      grey: string;
    };
  };
}

/**
 * Compile HTML template with meal plan data
 */
export async function compileHtmlTemplate(data: MealPlanPdfData): Promise<string> {
  try {
    const templatePath = path.join(__dirname, '..', 'views', 'pdfTemplate.ejs');
    
    // Enhance data with calculated values
    const enhancedData = {
      ...data,
      // Group meals by day
      mealsByDay: groupMealsByDay(data.mealPlan.meals),
      // Calculate nutritional totals
      nutritionTotals: calculateNutritionTotals(data.mealPlan.meals),
      // Generate shopping list if requested
      shoppingList: data.options.includeShoppingList 
        ? generateShoppingList(data.mealPlan.meals) 
        : null,
      // Generate table of contents
      tableOfContents: generateTableOfContents(data.mealPlan),
      // Helper functions for template
      helpers: {
        formatNumber: (num: number) => num.toFixed(1),
        formatDate: (date: string) => dayjs(date).format('MMMM D, YYYY'),
        capitalize: (str: string) => str.charAt(0).toUpperCase() + str.slice(1),
        formatMealType: (type: string) => type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        formatFitnessGoal: (goal: string) => goal.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        generateRecipeId: (day: number, mealNumber: number) => `recipe-day-${day}-meal-${mealNumber}`
      },
      // Add the macro chart data function to global scope for EJS
      generateMacroChartData: generateMacroChartData
    };

    // Render template
    const html = await ejs.renderFile(templatePath, enhancedData, {
      async: true,
      cache: process.env.NODE_ENV === 'production'
    });

    return html;
  } catch (error) {
    console.error('Template compilation error:', error);
    throw new Error(`Failed to compile PDF template: ${(error as Error).message}`);
  }
}

/**
 * Group meals by day for easier template iteration
 */
function groupMealsByDay(meals: MealPlanPdfData['mealPlan']['meals']) {
  const mealsByDay: { [day: number]: typeof meals } = {};
  
  meals.forEach(meal => {
    if (!mealsByDay[meal.day]) {
      mealsByDay[meal.day] = [];
    }
    mealsByDay[meal.day].push(meal);
  });

  // Sort meals within each day by meal number
  Object.keys(mealsByDay).forEach(day => {
    mealsByDay[parseInt(day)].sort((a, b) => a.mealNumber - b.mealNumber);
  });

  return mealsByDay;
}

/**
 * Calculate total nutritional values for the meal plan
 */
function calculateNutritionTotals(meals: MealPlanPdfData['mealPlan']['meals']) {
  const totals = {
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    avgCaloriesPerDay: 0,
    avgProteinPerDay: 0,
    avgCarbsPerDay: 0,
    avgFatPerDay: 0
  };

  meals.forEach(meal => {
    totals.totalCalories += meal.recipe.caloriesKcal;
    totals.totalProtein += parseFloat(meal.recipe.proteinGrams) || 0;
    totals.totalCarbs += parseFloat(meal.recipe.carbsGrams) || 0;
    totals.totalFat += parseFloat(meal.recipe.fatGrams) || 0;
  });

  // Calculate daily averages
  const uniqueDays = new Set(meals.map(meal => meal.day));
  const numDays = uniqueDays.size;

  if (numDays > 0) {
    totals.avgCaloriesPerDay = totals.totalCalories / numDays;
    totals.avgProteinPerDay = totals.totalProtein / numDays;
    totals.avgCarbsPerDay = totals.totalCarbs / numDays;
    totals.avgFatPerDay = totals.totalFat / numDays;
  }

  return totals;
}

/**
 * Generate consolidated shopping list from all recipes
 */
function generateShoppingList(meals: MealPlanPdfData['mealPlan']['meals']) {
  const ingredientMap: { [key: string]: { amount: number; unit: string; name: string } } = {};

  meals.forEach(meal => {
    meal.recipe.ingredientsJson.forEach(ingredient => {
      const key = `${ingredient.name.toLowerCase()}-${ingredient.unit.toLowerCase()}`;
      const amount = parseFloat(ingredient.amount) || 0;

      if (ingredientMap[key]) {
        ingredientMap[key].amount += amount;
      } else {
        ingredientMap[key] = {
          name: ingredient.name,
          amount: amount,
          unit: ingredient.unit
        };
      }
    });
  });

  // Convert to array and sort alphabetically
  return Object.values(ingredientMap)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(ingredient => ({
      ...ingredient,
      formattedAmount: ingredient.amount % 1 === 0 
        ? ingredient.amount.toString() 
        : ingredient.amount.toFixed(2).replace(/\.?0+$/, '')
    }));
}

/**
 * Generate table of contents for the PDF
 */
function generateTableOfContents(mealPlan: MealPlanPdfData['mealPlan']) {
  const contents = [
    { title: 'Overview', page: 2 },
    { title: 'Weekly Meal Schedule', page: 3 }
  ];

  let currentPage = 4;

  // Add daily meal pages
  for (let day = 1; day <= mealPlan.days; day++) {
    contents.push({
      title: `Day ${day} Meals`,
      page: currentPage
    });
    currentPage++;
  }

  // Add recipe detail pages
  contents.push({
    title: 'Recipe Details',
    page: currentPage
  });
  currentPage += mealPlan.meals.length;

  // Add optional sections
  contents.push({
    title: 'Shopping List',
    page: currentPage
  });
  currentPage++;

  contents.push({
    title: 'Nutrition Summary',
    page: currentPage
  });

  return contents;
}

/**
 * Get static asset URL for the PDF template
 */
export function getAssetUrl(assetPath: string): string {
  // In production, this would point to your CDN or static file server
  // For now, return a placeholder or local path
  return `/assets/${assetPath}`;
}

/**
 * Generate macro distribution data for charts
 */
export function generateMacroChartData(nutritionTotals: ReturnType<typeof calculateNutritionTotals>) {
  const proteinCalories = nutritionTotals.avgProteinPerDay * 4;
  const carbCalories = nutritionTotals.avgCarbsPerDay * 4;
  const fatCalories = nutritionTotals.avgFatPerDay * 9;
  const totalCalories = proteinCalories + carbCalories + fatCalories;

  if (totalCalories === 0) {
    return {
      protein: 0,
      carbs: 0,
      fat: 0
    };
  }

  return {
    protein: Math.round((proteinCalories / totalCalories) * 100),
    carbs: Math.round((carbCalories / totalCalories) * 100),
    fat: Math.round((fatCalories / totalCalories) * 100)
  };
}