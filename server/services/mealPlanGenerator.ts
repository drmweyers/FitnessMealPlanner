import { nanoid } from "nanoid";
import { storage } from "../storage";
import { generateMealImage } from "./openai";
import type { MealPlanGeneration, MealPlan, RecipeFilter } from "@shared/schema";

export class MealPlanGeneratorService {
  async generateMealPlan(
    params: MealPlanGeneration,
    generatedBy: string
  ): Promise<MealPlan> {
    const { 
      planName, 
      fitnessGoal, 
      description, 
      dailyCalorieTarget, 
      days, 
      mealsPerDay, 
      clientName, 
      ...filterParams 
    } = params;

    // Create filter for recipe search - start with basic approved filter
    let recipeFilter: RecipeFilter = {
      approved: true,
      limit: 100,
      page: 1,
    };

    // Add non-restrictive filters first
    if (filterParams.mealType) recipeFilter.mealType = filterParams.mealType;
    if (filterParams.dietaryTag) recipeFilter.dietaryTag = filterParams.dietaryTag;
    if (filterParams.maxPrepTime) recipeFilter.maxPrepTime = filterParams.maxPrepTime;

    // Get available recipes matching the criteria
    let { recipes } = await storage.searchRecipes(recipeFilter);

    // If no recipes found with filters, try with just approved recipes
    if (recipes.length === 0) {
      const fallbackFilter: RecipeFilter = {
        approved: true,
        limit: 100,
        page: 1,
      };
      const fallbackResult = await storage.searchRecipes(fallbackFilter);
      recipes = fallbackResult.recipes;
    }

    if (recipes.length === 0) {
      throw new Error("No approved recipes available in the database. Please add some recipes first.");
    }

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

        // Generate unique image for this meal
        let imageUrl: string | undefined;
        const recipeDescription = selectedRecipe.description || `Delicious ${mealType} meal`;
        const recipeMealTypes = selectedRecipe.mealTypes || [mealType];
        
        try {
          imageUrl = await generateMealImage({
            name: selectedRecipe.name,
            description: recipeDescription,
            mealTypes: recipeMealTypes,
          });
        } catch (error) {
          console.error(`Failed to generate image for ${selectedRecipe.name}:`, error);
          // Image generation will fallback to placeholder in the function itself
        }

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
            servings: selectedRecipe.servings,
            mealTypes: recipeMealTypes,
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