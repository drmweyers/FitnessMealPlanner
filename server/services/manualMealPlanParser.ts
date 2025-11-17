// @ts-nocheck - Optional feature, type errors suppressed
/**
 * Manual Meal Plan Parser Service
 *
 * Parses free-text meal plans pasted by trainers into structured meal plan data.
 * Supports quantity-unit parsing with SI normalization while preserving display values.
 */

import { z } from 'zod';
import { IngredientLine, ManualMeal, ManualMealPlanInput } from '../../shared/schema.js';

// Unit conversion mappings to SI units (grams/ml)
const UNIT_CONVERSIONS: Record<string, { factor: number; siUnit: 'g' | 'ml'; type: 'weight' | 'volume' }> = {
  // Weight units
  'g': { factor: 1, siUnit: 'g', type: 'weight' },
  'gram': { factor: 1, siUnit: 'g', type: 'weight' },
  'grams': { factor: 1, siUnit: 'g', type: 'weight' },
  'kg': { factor: 1000, siUnit: 'g', type: 'weight' },
  'kilogram': { factor: 1000, siUnit: 'g', type: 'weight' },
  'kilograms': { factor: 1000, siUnit: 'g', type: 'weight' },
  'oz': { factor: 28.35, siUnit: 'g', type: 'weight' },
  'ounce': { factor: 28.35, siUnit: 'g', type: 'weight' },
  'ounces': { factor: 28.35, siUnit: 'g', type: 'weight' },
  'lb': { factor: 453.59, siUnit: 'g', type: 'weight' },
  'lbs': { factor: 453.59, siUnit: 'g', type: 'weight' },
  'pound': { factor: 453.59, siUnit: 'g', type: 'weight' },
  'pounds': { factor: 453.59, siUnit: 'g', type: 'weight' },

  // Volume units
  'ml': { factor: 1, siUnit: 'ml', type: 'volume' },
  'milliliter': { factor: 1, siUnit: 'ml', type: 'volume' },
  'milliliters': { factor: 1, siUnit: 'ml', type: 'volume' },
  'l': { factor: 1000, siUnit: 'ml', type: 'volume' },
  'liter': { factor: 1000, siUnit: 'ml', type: 'volume' },
  'liters': { factor: 1000, siUnit: 'ml', type: 'volume' },
  'cup': { factor: 240, siUnit: 'ml', type: 'volume' }, // US cup
  'cups': { factor: 240, siUnit: 'ml', type: 'volume' },
  'tbsp': { factor: 15, siUnit: 'ml', type: 'volume' },
  'tablespoon': { factor: 15, siUnit: 'ml', type: 'volume' },
  'tablespoons': { factor: 15, siUnit: 'ml', type: 'volume' },
  'tsp': { factor: 5, siUnit: 'ml', type: 'volume' },
  'teaspoon': { factor: 5, siUnit: 'ml', type: 'volume' },
  'teaspoons': { factor: 5, siUnit: 'ml', type: 'volume' },
  'fl oz': { factor: 29.57, siUnit: 'ml', type: 'volume' },
  'floz': { factor: 29.57, siUnit: 'ml', type: 'volume' },
  'fluid ounce': { factor: 29.57, siUnit: 'ml', type: 'volume' },
  'fluid ounces': { factor: 29.57, siUnit: 'ml', type: 'volume' },

  // Count units (no SI conversion, keep as-is)
  'piece': { factor: 1, siUnit: 'g', type: 'weight' }, // Default to weight for counting
  'pieces': { factor: 1, siUnit: 'g', type: 'weight' },
  'pcs': { factor: 1, siUnit: 'g', type: 'weight' },
  'pc': { factor: 1, siUnit: 'g', type: 'weight' },
  'slice': { factor: 1, siUnit: 'g', type: 'weight' },
  'slices': { factor: 1, siUnit: 'g', type: 'weight' },
  'item': { factor: 1, siUnit: 'g', type: 'weight' },
  'items': { factor: 1, siUnit: 'g', type: 'weight' },
};

export interface ParsedResult {
  meals: ManualMeal[];
  parseWarnings: string[];
}

/**
 * Normalize unit names for consistent parsing
 */
function normalizeUnit(unit: string): string {
  return unit.toLowerCase().trim().replace(/[.,]/g, '');
}

/**
 * Convert quantity and unit to SI units
 */
function convertToSI(quantity: number, unit: string): {
  quantitySI: number | undefined;
  unitSI: 'g' | 'ml' | undefined;
} {
  const normalizedUnit = normalizeUnit(unit);
  const conversion = UNIT_CONVERSIONS[normalizedUnit];

  if (!conversion) {
    // Unknown unit, can't convert
    return { quantitySI: undefined, unitSI: undefined };
  }

  // For count units (pieces, slices), don't convert if we can't determine weight/volume
  if (['piece', 'pieces', 'pcs', 'pc', 'slice', 'slices', 'item', 'items'].includes(normalizedUnit)) {
    return { quantitySI: undefined, unitSI: undefined };
  }

  return {
    quantitySI: quantity * conversion.factor,
    unitSI: conversion.siUnit,
  };
}

/**
 * Parse an ingredient line like "175g of Jasmine Rice" or "4 eggs"
 */
function parseIngredientLine(line: string): IngredientLine | null {
  // Remove leading dashes/bullets and trim
  const cleanLine = line.replace(/^[-•*]\s*/, '').trim();

  if (!cleanLine) return null;

  // Regex to match quantity, unit, and ingredient name
  // Supports: "175g of Jasmine Rice", "4 eggs", "2 tbsp olive oil", "1 cup chopped onions"
  const ingredientRegex = /^(?<qty>\d+(?:\.\d+)?)\s*(?<unit>g|grams?|kg|kilograms?|oz|ounces?|lbs?|pounds?|ml|milliliters?|l|liters?|cups?|tbsp|tablespoons?|tsp|teaspoons?|fl\s*oz|floz|fluid\s*ounces?|pieces?|pcs?|pc|slices?|items?)?\s*(?:of\s+)?(?<name>.+)$/i;

  const match = cleanLine.match(ingredientRegex);

  if (!match?.groups) {
    // Try without quantity (just ingredient name)
    return {
      name: cleanLine,
      displayQuantity: undefined,
      displayUnit: undefined,
      quantitySI: undefined,
      unitSI: undefined,
      estimationStatus: 'unknown' as const,
    };
  }

  const { qty, unit, name } = match.groups;
  const quantity = parseFloat(qty);
  const trimmedName = name.trim();
  const trimmedUnit = unit?.trim() || '';

  // Convert to SI if possible
  const { quantitySI, unitSI } = unit ? convertToSI(quantity, trimmedUnit) : { quantitySI: undefined, unitSI: undefined };

  // Build display string
  const displayQuantity = unit ? `${qty} ${trimmedUnit}` : qty;

  return {
    name: trimmedName,
    displayQuantity,
    displayUnit: trimmedUnit || undefined,
    quantitySI,
    unitSI,
    estimationStatus: 'unknown' as const,
  };
}

/**
 * Parse meal plan text into structured meals
 */
export function parseManualMealPlan(input: ManualMealPlanInput): ParsedResult {
  const lines = input.pastedText.split('\n').map(line => line.trim()).filter(line => line);
  const meals: ManualMeal[] = [];
  const parseWarnings: string[] = [];

  let currentMeal: Partial<ManualMeal> | null = null;
  let mealCounter = 1;
  let dayCounter = 1;

  for (const line of lines) {
    // Check if this is a meal header
    const mealHeaderMatch = line.match(/^Meal\s+(\d+)(?:\s*[:-]\s*(.+))?$/i);

    if (mealHeaderMatch) {
      // Save previous meal if exists
      if (currentMeal && currentMeal.ingredients && currentMeal.ingredients.length > 0) {
        meals.push({
          day: dayCounter,
          mealNumber: mealCounter,
          mealType: currentMeal.mealType || 'unspecified',
          ingredients: currentMeal.ingredients,
        });
        mealCounter++;
      }

      // Start new meal
      const mealTypeFromHeader = mealHeaderMatch[2]?.trim().toLowerCase();
      const mealType = mealTypeFromHeader || 'unspecified';

      currentMeal = {
        mealType,
        ingredients: [],
      };
      continue;
    }

    // Check if this is a day header
    const dayHeaderMatch = line.match(/^Day\s+(\d+)$/i);
    if (dayHeaderMatch) {
      // Save current meal if exists
      if (currentMeal && currentMeal.ingredients && currentMeal.ingredients.length > 0) {
        meals.push({
          day: dayCounter,
          mealNumber: mealCounter,
          mealType: currentMeal.mealType || 'unspecified',
          ingredients: currentMeal.ingredients,
        });
      }

      dayCounter = parseInt(dayHeaderMatch[1]);
      mealCounter = 1;
      currentMeal = null;
      continue;
    }

    // Try to parse as ingredient line
    if (currentMeal) {
      const ingredient = parseIngredientLine(line);
      if (ingredient) {
        currentMeal.ingredients!.push(ingredient);
      } else if (line.length > 3) { // Ignore very short lines
        parseWarnings.push(`Could not parse ingredient line: "${line}"`);
      }
    } else {
      // Line outside of meal context - start a default meal
      const ingredient = parseIngredientLine(line);
      if (ingredient) {
        currentMeal = {
          mealType: 'unspecified',
          ingredients: [ingredient],
        };
      }
    }
  }

  // Save final meal if exists
  if (currentMeal && currentMeal.ingredients && currentMeal.ingredients.length > 0) {
    meals.push({
      day: dayCounter,
      mealNumber: mealCounter,
      mealType: currentMeal.mealType || 'unspecified',
      ingredients: currentMeal.ingredients,
    });
  }

  // Validate we have meals
  if (meals.length === 0) {
    throw new Error('No valid meals found in the provided text');
  }

  // Adjust meal numbering to be consistent per day
  const mealsByDay = new Map<number, ManualMeal[]>();
  meals.forEach(meal => {
    if (!mealsByDay.has(meal.day)) {
      mealsByDay.set(meal.day, []);
    }
    mealsByDay.get(meal.day)!.push(meal);
  });

  // Renumber meals within each day
  const finalMeals: ManualMeal[] = [];
  mealsByDay.forEach((dayMeals, day) => {
    dayMeals.forEach((meal, index) => {
      finalMeals.push({
        ...meal,
        day,
        mealNumber: index + 1,
      });
    });
  });

  return {
    meals: finalMeals,
    parseWarnings,
  };
}

/**
 * Convert parsed meals to meal plan structure
 */
export function convertToMealPlan(
  input: ManualMealPlanInput,
  parsedMeals: ManualMeal[],
  imageUrls: Record<string, string> = {}
) {
  const mealEntries = parsedMeals.map(meal => {
    const mealKey = `day${meal.day}-meal${meal.mealNumber}`;
    return {
      day: meal.day,
      mealNumber: meal.mealNumber,
      mealType: meal.mealType,
      manual: true as const,
      manualIngredients: meal.ingredients,
      recipe: undefined,
      imageUrl: imageUrls[mealKey],
    };
  });

  return {
    id: `manual-${Date.now()}`,
    planName: input.planName,
    fitnessGoal: input.fitnessGoal,
    description: 'Manual meal plan created from pasted text',
    dailyCalorieTarget: 2000, // Default, as we can't calculate from manual ingredients
    clientName: undefined,
    days: input.days,
    mealsPerDay: input.mealsPerDay,
    generatedBy: '', // Will be set by the route handler
    createdAt: new Date(),
    source: 'manual' as const,
    meals: mealEntries,
  };
}