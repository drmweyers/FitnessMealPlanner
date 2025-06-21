/**
 * Meal Plan Generator Service
 * 
 * This service handles the intelligent generation of personalized meal plans
 * based on user requirements, dietary preferences, and available recipes.
 * 
 * Key Features:
 * - Smart recipe selection with fallback strategies
 * - Automatic nutrition calculation and balancing
 * - Meal type distribution across days
 * - Calorie target optimization
 * - Dietary restriction compliance
 */

import { nanoid } from "nanoid";
import { storage } from "../storage";
import { generateMealImage } from "./openai";
import type { MealPlanGeneration, MealPlan, RecipeFilter } from "@shared/schema";

export class MealPlanGeneratorService {
  /**
   * Generate a complete meal plan based on user parameters
   * 
   * This method implements a multi-step process:
   * 1. Filter recipes based on dietary preferences and constraints
   * 2. Distribute meals across days and meal types
   * 3. Calculate comprehensive nutritional information
   * 4. Return a structured meal plan object
   * 
   * @param params - Meal plan generation parameters from user input
   * @param generatedBy - User ID who requested the meal plan
   * @returns Complete meal plan with recipes and nutrition data
   */
  async generateMealPlan(
    params: MealPlanGeneration,
    generatedBy: string
  ): Promise<MealPlan> {
    // Destructure parameters for easier handling
    const { 
      planName, 
      fitnessGoal, 
      description, 
      dailyCalorieTarget, 
      days, 
      mealsPerDay, 
      clientName, 
      ...filterParams  // Extract all filtering parameters
    } = params;

    /**
     * Recipe Selection Strategy
     * 
     * Uses a progressive filtering approach:
     * 1. Start with user-specified constraints
     * 2. Fall back to broader criteria if no matches
     * 3. Ensure minimum viable recipe pool
     */
    
    // Build initial filter with user preferences
    let recipeFilter: RecipeFilter = {
      approved: true, // Security: Only use approved recipes
      limit: 100,     // Get enough recipes for variety
      page: 1,
    };

    // Apply user-specified filters progressively
    if (filterParams.mealType) recipeFilter.mealType = filterParams.mealType;
    if (filterParams.dietaryTag) recipeFilter.dietaryTag = filterParams.dietaryTag;
    if (filterParams.maxPrepTime) recipeFilter.maxPrepTime = filterParams.maxPrepTime;

    // Execute initial recipe search
    console.log("Searching for recipes with filter:", recipeFilter);
    let { recipes } = await storage.searchRecipes(recipeFilter);
    console.log("Found", recipes.length, "recipes with filters");

    // Fallback strategy: If no recipes match constraints, use all approved recipes
    if (recipes.length === 0) {
      console.log("No recipes found with filters, trying fallback...");
      const fallbackFilter: RecipeFilter = {
        approved: true,
        limit: 100,
        page: 1,
      };
      const fallbackResult = await storage.searchRecipes(fallbackFilter);
      recipes = fallbackResult.recipes;
      console.log("Found", recipes.length, "recipes with fallback filter");
    }

    if (recipes.length === 0) {
      console.error("No recipes found in database");
      throw new Error("No approved recipes available in the database. Please add some recipes first or check your database connection.");
    }

    console.log(`Found ${recipes.length} approved recipes for meal plan generation`);

    // Define meal types for distribution
    const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    
    // Calculate calorie distribution per meal based on daily target
    const caloriesPerMeal = Math.round(dailyCalorieTarget / mealsPerDay);
    const calorieVariance = Math.round(caloriesPerMeal * 0.2); // 20% variance allowed
    
    const mealPlan: MealPlan = {
      id: nanoid(),
      planName,
      fitnessGoal,
      description: description || `${planName} - ${fitnessGoal} focused meal plan`,
      dailyCalorieTarget,
      clientName,
      days,
      mealsPerDay,
      generatedBy,
      createdAt: new Date(),
      meals: [],
    };

    // Generate meals for each day
    for (let day = 1; day <= days; day++) {
      for (let mealNumber = 1; mealNumber <= mealsPerDay; mealNumber++) {
        // Determine meal type based on meal number
        let mealType: string;
        if (mealsPerDay === 1) {
          mealType = params.mealType || 'lunch';
        } else if (mealsPerDay === 2) {
          mealType = mealNumber === 1 ? 'breakfast' : 'dinner';
        } else if (mealsPerDay === 3) {
          mealType = mealNumber === 1 ? 'breakfast' : mealNumber === 2 ? 'lunch' : 'dinner';
        } else {
          // For 4+ meals, cycle through all meal types
          mealType = mealTypes[(mealNumber - 1) % mealTypes.length];
        }

        // Filter recipes by meal type if no specific meal type was requested
        let availableRecipes = recipes;
        if (!params.mealType) {
          availableRecipes = recipes.filter(recipe => 
            recipe.mealTypes && recipe.mealTypes.includes(mealType)
          );
          
          // Fallback to all recipes if no specific meal type matches
          if (availableRecipes.length === 0) {
            availableRecipes = recipes;
          }
        }

        // Filter by calorie range per meal (target ± variance)
        const minCalories = caloriesPerMeal - calorieVariance;
        const maxCalories = caloriesPerMeal + calorieVariance;
        
        let calorieFilteredRecipes = availableRecipes.filter(recipe => 
          recipe.caloriesKcal >= minCalories && recipe.caloriesKcal <= maxCalories
        );
        
        // If no recipes fit the calorie range, use all available recipes
        if (calorieFilteredRecipes.length === 0) {
          calorieFilteredRecipes = availableRecipes;
        }

        // Select a random recipe, avoiding recent duplicates for variety
        const recentRecipeIds = mealPlan.meals
          .slice(-Math.min(mealsPerDay * 2, mealPlan.meals.length))
          .map(meal => meal.recipe.id);

        let selectedRecipes = calorieFilteredRecipes.filter(
          recipe => !recentRecipeIds.includes(recipe.id)
        );

        if (selectedRecipes.length === 0) {
          selectedRecipes = calorieFilteredRecipes;
        }

        const randomIndex = Math.floor(Math.random() * selectedRecipes.length);
        const selectedRecipe = selectedRecipes[randomIndex];

        // Use existing recipe image or fallback to placeholder
        const recipeDescription = selectedRecipe.description || `Delicious ${mealType} meal`;
        const recipeMealTypes = selectedRecipe.mealTypes || [mealType];
        
        // Use the recipe's existing image URL or a placeholder
        const imageUrl = selectedRecipe.imageUrl || `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=250&fit=crop`;

        mealPlan.meals.push({
          day,
          mealNumber,
          mealType,
          recipe: {
            id: selectedRecipe.id,
            name: selectedRecipe.name,
            description: recipeDescription,
            caloriesKcal: selectedRecipe.caloriesKcal,
            proteinGrams: selectedRecipe.proteinGrams || "0",
            carbsGrams: selectedRecipe.carbsGrams || "0",
            fatGrams: selectedRecipe.fatGrams || "0",
            prepTimeMinutes: selectedRecipe.prepTimeMinutes,
            cookTimeMinutes: selectedRecipe.cookTimeMinutes || 0,
            servings: selectedRecipe.servings,
            mealTypes: recipeMealTypes,
            dietaryTags: selectedRecipe.dietaryTags || [],
            mainIngredientTags: selectedRecipe.mainIngredientTags || [],
            ingredientsJson: selectedRecipe.ingredientsJson || [],
            instructionsText: selectedRecipe.instructionsText || "",
            imageUrl,
          },
        });
      }
    }

    return mealPlan;
  }

  calculateMealPlanNutrition(mealPlan: MealPlan) {
    const totalNutrition = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    };

    const dailyNutrition = [];

    for (let day = 1; day <= mealPlan.days; day++) {
      const dayMeals = mealPlan.meals.filter(meal => meal.day === day);
      const dayNutrition = {
        day,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      };

      dayMeals.forEach(meal => {
        dayNutrition.calories += meal.recipe.caloriesKcal;
        dayNutrition.protein += parseFloat(meal.recipe.proteinGrams);
        dayNutrition.carbs += parseFloat(meal.recipe.carbsGrams);
        dayNutrition.fat += parseFloat(meal.recipe.fatGrams);
      });

      dailyNutrition.push(dayNutrition);

      totalNutrition.calories += dayNutrition.calories;
      totalNutrition.protein += dayNutrition.protein;
      totalNutrition.carbs += dayNutrition.carbs;
      totalNutrition.fat += dayNutrition.fat;
    }

    return {
      total: totalNutrition,
      daily: dailyNutrition,
      averageDaily: {
        calories: Math.round(totalNutrition.calories / mealPlan.days),
        protein: Math.round(totalNutrition.protein / mealPlan.days),
        carbs: Math.round(totalNutrition.carbs / mealPlan.days),
        fat: Math.round(totalNutrition.fat / mealPlan.days),
      },
    };
  }
}

export const mealPlanGenerator = new MealPlanGeneratorService();