/**
 * PDF Export Utility for Recipe Cards
 * 
 * This utility provides functions to export meal plan recipe cards to PDF format.
 * It creates professional-looking recipe cards that customers can print and use
 * for cooking instructions and ingredient lists.
 */

import jsPDF from 'jspdf';
import type { MealPlan } from '@shared/schema';

interface RecipeCardData {
  recipeName: string;
  description: string;
  calories: number;
  protein: string;
  carbs: string;
  fat: string;
  prepTime: number;
  servings: number;
  mealType: string;
  dietaryTags: string[];
  ingredients: Array<{
    name: string;
    amount: string;
    unit: string;
  }>;
  instructions: string;
  day: number;
  mealNumber: number;
}

interface MealPlanExportData {
  planName: string;
  fitnessGoal: string;
  dailyCalorieTarget: number;
  days: number;
  clientName?: string;
  generatedBy: string;
  createdAt: Date;
  recipes: RecipeCardData[];
}

/**
 * Extract recipe card data from a meal plan
 */
export function extractRecipeCardsFromMealPlan(mealPlan: any): MealPlanExportData {
  const recipes: RecipeCardData[] = mealPlan.meals.map((meal: any) => ({
    recipeName: meal.recipe.name,
    description: meal.recipe.description,
    calories: meal.recipe.caloriesKcal,
    protein: meal.recipe.proteinGrams,
    carbs: meal.recipe.carbsGrams,
    fat: meal.recipe.fatGrams,
    prepTime: meal.recipe.prepTimeMinutes,
    servings: meal.recipe.servings,
    mealType: meal.mealType,
    dietaryTags: meal.recipe.dietaryTags || [],
    ingredients: meal.recipe.ingredientsJson || [],
    instructions: meal.recipe.instructionsText,
    day: meal.day,
    mealNumber: meal.mealNumber,
  }));

  return {
    planName: mealPlan.mealPlanData?.planName || mealPlan.planName || 'Meal Plan',
    fitnessGoal: mealPlan.mealPlanData?.fitnessGoal || mealPlan.fitnessGoal || 'General Fitness',
    dailyCalorieTarget: mealPlan.mealPlanData?.dailyCalorieTarget || mealPlan.dailyCalorieTarget || 0,
    days: mealPlan.mealPlanData?.days || mealPlan.days || 7,
    clientName: mealPlan.mealPlanData?.clientName || mealPlan.clientName,
    generatedBy: mealPlan.mealPlanData?.generatedBy || mealPlan.generatedBy || 'Trainer',
    createdAt: new Date(mealPlan.mealPlanData?.createdAt || mealPlan.createdAt || new Date()),
    recipes,
  };
}

/**
 * Generate PDF with recipe cards from a meal plan
 */
export async function exportMealPlanRecipesToPDF(
  mealPlanData: MealPlanExportData,
  options: {
    includeNutrition?: boolean;
    includeImages?: boolean;
    cardSize?: 'small' | 'medium' | 'large';
  } = {}
): Promise<void> {
  const {
    includeNutrition = true,
    includeImages = false,
    cardSize = 'medium'
  } = options;

  // Create new PDF document
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const usableWidth = pageWidth - (margin * 2);
  
  // Card dimensions based on size
  const cardDimensions = {
    small: { width: usableWidth / 2 - 5, height: 80 },
    medium: { width: usableWidth, height: 120 },
    large: { width: usableWidth, height: 160 }
  };
  
  const cardWidth = cardDimensions[cardSize].width;
  const cardHeight = cardDimensions[cardSize].height;
  const cardsPerRow = cardSize === 'small' ? 2 : 1;
  const cardsPerPage = Math.floor((pageHeight - margin * 2) / (cardHeight + 10));

  // Title page
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text(mealPlanData.planName, pageWidth / 2, 40, { align: 'center' });
  
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Fitness Goal: ${mealPlanData.fitnessGoal}`, pageWidth / 2, 60, { align: 'center' });
  
  if (mealPlanData.clientName) {
    pdf.text(`For: ${mealPlanData.clientName}`, pageWidth / 2, 80, { align: 'center' });
  }
  
  pdf.text(`${mealPlanData.days} Day Plan • ${mealPlanData.dailyCalorieTarget} cal/day target`, pageWidth / 2, 100, { align: 'center' });
  
  pdf.setFontSize(12);
  pdf.text(`Generated: ${mealPlanData.createdAt.toLocaleDateString()}`, pageWidth / 2, 120, { align: 'center' });

  // Recipe cards
  let currentPage = 1;
  let cardIndex = 0;
  
  for (const recipe of mealPlanData.recipes) {
    const cardsOnCurrentPage = cardIndex % cardsPerPage;
    const cardCol = cardIndex % cardsPerRow;
    
    // Add new page if needed (except for first card which goes on title page)
    if (cardIndex > 0 && cardsOnCurrentPage === 0) {
      pdf.addPage();
      currentPage++;
    }
    
    // Calculate card position
    let x = margin;
    let y = cardIndex === 0 ? 140 : margin + (cardsOnCurrentPage * (cardHeight + 10));
    
    if (cardsPerRow === 2) {
      x = margin + (cardCol * (cardWidth + 10));
      y = margin + (Math.floor(cardsOnCurrentPage / cardsPerRow) * (cardHeight + 10));
    }
    
    // Draw recipe card
    drawRecipeCard(pdf, recipe, x, y, cardWidth, cardHeight, includeNutrition);
    
    cardIndex++;
  }

  // Generate filename
  const safeFileName = mealPlanData.planName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const timestamp = new Date().toISOString().slice(0, 10);
  const fileName = `${safeFileName}_recipes_${timestamp}.pdf`;

  // Save PDF
  pdf.save(fileName);
}

/**
 * Draw a single recipe card on the PDF
 */
function drawRecipeCard(
  pdf: jsPDF,
  recipe: RecipeCardData,
  x: number,
  y: number,
  width: number,
  height: number,
  includeNutrition: boolean
): void {
  // Card border
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.5);
  pdf.rect(x, y, width, height);

  // Card background for header
  pdf.setFillColor(248, 250, 252);
  pdf.rect(x, y, width, 25, 'F');

  // Recipe name and meal info
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 30, 30);
  
  const recipeName = recipe.recipeName.length > 30 
    ? recipe.recipeName.substring(0, 30) + '...' 
    : recipe.recipeName;
  pdf.text(recipeName, x + 5, y + 12);

  // Day and meal info
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Day ${recipe.day} • ${recipe.mealType} • ${recipe.prepTime} min`, x + 5, y + 20);

  let currentY = y + 35;

  // Description
  if (recipe.description) {
    pdf.setFontSize(9);
    pdf.setTextColor(60, 60, 60);
    const description = recipe.description.length > 60 
      ? recipe.description.substring(0, 60) + '...' 
      : recipe.description;
    pdf.text(description, x + 5, currentY);
    currentY += 12;
  }

  // Nutrition info (if enabled and space allows)
  if (includeNutrition && height > 80) {
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(80, 80, 80);
    pdf.text('NUTRITION:', x + 5, currentY);
    
    pdf.setFont('helvetica', 'normal');
    const nutritionText = `${recipe.calories} cal • ${recipe.protein}g protein • ${recipe.carbs}g carbs • ${recipe.fat}g fat`;
    pdf.text(nutritionText, x + 5, currentY + 8);
    currentY += 20;
  }

  // Ingredients (if space allows)
  if (height > 100 && recipe.ingredients && recipe.ingredients.length > 0) {
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(80, 80, 80);
    pdf.text('INGREDIENTS:', x + 5, currentY);
    currentY += 8;

    pdf.setFont('helvetica', 'normal');
    const maxIngredients = Math.min(recipe.ingredients.length, Math.floor((height - currentY + y - 15) / 6));
    
    for (let i = 0; i < maxIngredients; i++) {
      const ingredient = recipe.ingredients[i];
      const ingredientText = `• ${ingredient.amount}${ingredient.unit} ${ingredient.name}`;
      const truncatedText = ingredientText.length > 35 
        ? ingredientText.substring(0, 35) + '...' 
        : ingredientText;
      pdf.text(truncatedText, x + 8, currentY);
      currentY += 6;
    }

    if (recipe.ingredients.length > maxIngredients) {
      pdf.setTextColor(120, 120, 120);
      pdf.text(`... and ${recipe.ingredients.length - maxIngredients} more ingredients`, x + 8, currentY);
    }
  }

  // Dietary tags
  if (recipe.dietaryTags && recipe.dietaryTags.length > 0) {
    const tagsY = y + height - 8;
    pdf.setFontSize(7);
    pdf.setTextColor(100, 100, 100);
    const tagsText = recipe.dietaryTags.slice(0, 3).join(' • ');
    pdf.text(tagsText, x + 5, tagsY);
  }
}

/**
 * Export via server-side (Puppeteer) for large meal plans
 * Uses the timeout-optimized server endpoint
 */
async function exportViaServerSide(
  mealPlan: any,
  options: {
    includeNutrition?: boolean;
    cardSize?: 'small' | 'medium' | 'large';
  } = {}
): Promise<void> {
  const response = await fetch('/api/pdf/export', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mealPlanData: mealPlan,
      customerName: mealPlan.mealPlanData?.clientName || mealPlan.clientName,
      options: {
        includeShoppingList: true,
        includeMacroSummary: options.includeNutrition ?? true,
        includeRecipePhotos: false,
        orientation: 'portrait',
        pageSize: 'A4'
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Server export failed with status ${response.status}`);
  }

  // Download the PDF
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;

  // Extract filename from response headers or use default
  const contentDisposition = response.headers.get('content-disposition');
  const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
  a.download = filenameMatch ? filenameMatch[1] : 'meal-plan.pdf';

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Export a single meal plan to PDF
 * This is the main function that will be called from the UI
 *
 * Automatically routes to server-side export for large plans (20+ recipes)
 * to utilize timeout optimization and better performance
 */
export async function exportSingleMealPlanToPDF(
  mealPlan: any,
  options: {
    includeNutrition?: boolean;
    cardSize?: 'small' | 'medium' | 'large';
  } = {}
): Promise<void> {
  try {
    const mealCount = mealPlan.meals?.length || 0;

    // Use server-side export for large plans (20+ recipes)
    // This uses the timeout-optimized Puppeteer implementation
    if (mealCount >= 20) {
      console.log(`Large plan detected (${mealCount} recipes) - using server-side export with timeout optimization`);
      await exportViaServerSide(mealPlan, options);
    } else {
      // Use client-side export for small plans (< 20 recipes)
      console.log(`Small plan detected (${mealCount} recipes) - using client-side jsPDF export`);
      const mealPlanData = extractRecipeCardsFromMealPlan(mealPlan);
      await exportMealPlanRecipesToPDF(mealPlanData, options);
    }
  } catch (error) {
    console.error('Error exporting meal plan to PDF:', error);
    throw new Error('Failed to export meal plan to PDF. Please try again.');
  }
}

/**
 * Export multiple meal plans to a combined PDF
 */
export async function exportMultipleMealPlansToPDF(
  mealPlans: any[],
  options: {
    includeNutrition?: boolean;
    cardSize?: 'small' | 'medium' | 'large';
    customerName?: string;
  } = {}
): Promise<void> {
  try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    
    // Combined title page
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Recipe Collection', pageWidth / 2, 40, { align: 'center' });
    
    if (options.customerName) {
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`For: ${options.customerName}`, pageWidth / 2, 60, { align: 'center' });
    }
    
    pdf.setFontSize(14);
    pdf.text(`${mealPlans.length} Meal Plans • Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 80, { align: 'center' });

    // Add each meal plan
    for (let i = 0; i < mealPlans.length; i++) {
      if (i > 0) pdf.addPage();
      
      const mealPlanData = extractRecipeCardsFromMealPlan(mealPlans[i]);
      
      // Add meal plan title
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text(mealPlanData.planName, pageWidth / 2, 30, { align: 'center' });
      
      // Add recipes from this meal plan
      let cardIndex = 0;
      const margin = 20;
      const cardHeight = 120;
      const cardsPerPage = 2;
      
      for (const recipe of mealPlanData.recipes) {
        if (cardIndex > 0 && cardIndex % cardsPerPage === 0) {
          pdf.addPage();
        }
        
        const y = 50 + (cardIndex % cardsPerPage) * (cardHeight + 10);
        drawRecipeCard(pdf, recipe, margin, y, pageWidth - margin * 2, cardHeight, options.includeNutrition ?? true);
        cardIndex++;
      }
    }

    // Save combined PDF
    const fileName = options.customerName 
      ? `${options.customerName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_meal_plans_${new Date().toISOString().slice(0, 10)}.pdf`
      : `meal_plans_collection_${new Date().toISOString().slice(0, 10)}.pdf`;
    
    pdf.save(fileName);
  } catch (error) {
    console.error('Error exporting multiple meal plans to PDF:', error);
    throw new Error('Failed to export meal plans to PDF. Please try again.');
  }
}