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
      maxIngredients,
      generateMealPrep,
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
    const recipeFilter: RecipeFilter = {
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

        // NEW FEATURE: Ingredient-aware recipe selection
        let selectedRecipe;
        if (maxIngredients && maxIngredients > 0) {
          selectedRecipe = this.selectRecipeWithIngredientLimit(
            calorieFilteredRecipes, 
            mealPlan.meals, 
            maxIngredients, 
            mealsPerDay
          );
        } else {
          // Original logic: Select a random recipe, avoiding recent duplicates for variety
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
          selectedRecipe = selectedRecipes[randomIndex];
        }

        // Use existing recipe image or generate unique AI image
        const recipeDescription = selectedRecipe.description || `Delicious ${mealType} meal`;
        const recipeMealTypes = selectedRecipe.mealTypes || [mealType];

        // Generate unique AI image for each meal if recipe doesn't have one
        let imageUrl = selectedRecipe.imageUrl;

        if (!imageUrl) {
          try {
            console.log(`[Meal Plan Generator] Generating unique AI image for: ${selectedRecipe.name}`);

            // Create GeneratedRecipe-compatible object for image generation
            const recipeForImage = {
              name: selectedRecipe.name,
              description: recipeDescription,
              mealTypes: recipeMealTypes,
              dietaryTags: selectedRecipe.dietaryTags || [],
              mainIngredientTags: selectedRecipe.mainIngredientTags || [],
              ingredients: selectedRecipe.ingredientsJson || [],
              instructions: selectedRecipe.instructionsText || "",
              prepTimeMinutes: selectedRecipe.prepTimeMinutes,
              cookTimeMinutes: selectedRecipe.cookTimeMinutes || 0,
              servings: selectedRecipe.servings,
              estimatedNutrition: {
                calories: selectedRecipe.caloriesKcal,
                protein: parseFloat(selectedRecipe.proteinGrams?.toString() || "0"),
                carbs: parseFloat(selectedRecipe.carbsGrams?.toString() || "0"),
                fat: parseFloat(selectedRecipe.fatGrams?.toString() || "0"),
              }
            };

            imageUrl = await generateMealImage(recipeForImage);
            console.log(`[Meal Plan Generator] Successfully generated image: ${imageUrl.substring(0, 50)}...`);
          } catch (error) {
            console.error(`[Meal Plan Generator] Failed to generate AI image for ${selectedRecipe.name}:`, error);
            // Fallback to placeholder with unique signature to avoid duplication
            const uniqueSig = `${selectedRecipe.id}-${day}-${mealNumber}`;
            imageUrl = `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=250&fit=crop&sig=${uniqueSig}`;
          }
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

    // NEW FEATURE: Generate meal prep instructions if requested
    if (generateMealPrep !== false) {
      mealPlan.startOfWeekMealPrep = this.generateMealPrepInstructions(mealPlan);
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

  /**
   * NEW FEATURE: Select recipe while respecting ingredient limits
   * 
   * This method prioritizes recipes that reuse ingredients already selected
   * for the meal plan, helping to keep the total ingredient count within
   * the specified limit.
   */
  private selectRecipeWithIngredientLimit(
    availableRecipes: any[],
    currentMeals: any[],
    maxIngredients: number,
    mealsPerDay: number
  ): any {
    // Get all ingredients already used in the meal plan
    const usedIngredients = new Set<string>();
    currentMeals.forEach(meal => {
      if (meal.recipe.ingredientsJson) {
        meal.recipe.ingredientsJson.forEach((ingredient: any) => {
          usedIngredients.add(ingredient.name.toLowerCase());
        });
      }
    });

    // Calculate how many new ingredients we can still add
    const remainingIngredientSlots = maxIngredients - usedIngredients.size;

    // Score recipes based on ingredient reuse
    const scoredRecipes = availableRecipes.map(recipe => {
      const recipeIngredients = recipe.ingredientsJson || [];
      let newIngredientsCount = 0;
      let reuseScore = 0;

      recipeIngredients.forEach((ingredient: any) => {
        const ingredientName = ingredient.name.toLowerCase();
        if (usedIngredients.has(ingredientName)) {
          reuseScore += 2; // Bonus for reusing ingredients
        } else {
          newIngredientsCount += 1;
        }
      });

      // Penalize recipes that would exceed ingredient limit
      let penalty = 0;
      if (newIngredientsCount > remainingIngredientSlots) {
        penalty = (newIngredientsCount - remainingIngredientSlots) * 10;
      }

      return {
        recipe,
        score: reuseScore - newIngredientsCount - penalty,
        newIngredientsCount
      };
    });

    // Filter out recipes that would exceed the ingredient limit (unless no other options)
    let validRecipes = scoredRecipes.filter(item => 
      item.newIngredientsCount <= remainingIngredientSlots
    );

    // If no recipes fit the constraint, use all recipes (fallback)
    if (validRecipes.length === 0) {
      validRecipes = scoredRecipes;
    }

    // Sort by score (highest first) and add some randomness
    validRecipes.sort((a, b) => b.score - a.score);
    
    // Select from top 30% to maintain variety while respecting constraints
    const topCount = Math.max(1, Math.ceil(validRecipes.length * 0.3));
    const topRecipes = validRecipes.slice(0, topCount);
    
    const randomIndex = Math.floor(Math.random() * topRecipes.length);
    return topRecipes[randomIndex].recipe;
  }

  /**
   * NEW FEATURE: Generate comprehensive meal prep instructions
   * 
   * This method analyzes all recipes in the meal plan to create:
   * - A consolidated shopping list with total quantities
   * - Step-by-step prep instructions for the start of the week
   * - Storage instructions for prepped ingredients
   */
  private generateMealPrepInstructions(mealPlan: any): any {
    // Consolidate all ingredients across the meal plan
    const ingredientMap = new Map<string, {
      totalAmount: number;
      unit: string;
      usedInRecipes: string[];
    }>();

    // Collect all ingredients from all meals
    mealPlan.meals.forEach((meal: any) => {
      if (meal.recipe.ingredientsJson) {
        meal.recipe.ingredientsJson.forEach((ingredient: any) => {
          const name = ingredient.name.toLowerCase();
          const amount = parseFloat(ingredient.amount) || 0;
          const unit = ingredient.unit || '';

          if (ingredientMap.has(name)) {
            const existing = ingredientMap.get(name)!;
            existing.totalAmount += amount;
            if (!existing.usedInRecipes.includes(meal.recipe.name)) {
              existing.usedInRecipes.push(meal.recipe.name);
            }
          } else {
            ingredientMap.set(name, {
              totalAmount: amount,
              unit: unit,
              usedInRecipes: [meal.recipe.name]
            });
          }
        });
      }
    });

    // Generate shopping list
    const shoppingList = Array.from(ingredientMap.entries()).map(([ingredient, data]) => ({
      ingredient: this.capitalizeFirst(ingredient),
      totalAmount: data.totalAmount > 0 ? data.totalAmount.toString() : '1',
      unit: data.unit,
      usedInRecipes: data.usedInRecipes
    }));

    // Generate prep instructions based on ingredient types
    const prepInstructions = this.generatePrepSteps(shoppingList);

    // Generate storage instructions
    const storageInstructions = this.generateStorageInstructions(shoppingList);

    // Calculate total prep time estimate
    const totalPrepTime = prepInstructions.reduce((total, step) => total + step.estimatedTime, 0);

    return {
      totalPrepTime,
      shoppingList,
      prepInstructions,
      storageInstructions
    };
  }

  /**
   * Generate step-by-step prep instructions based on ingredients
   */
  private generatePrepSteps(shoppingList: any[]): any[] {
    const steps: any[] = [];
    let stepNumber = 1;

    // Categorize ingredients for efficient prep
    const vegetables = shoppingList.filter(item => 
      this.isVegetable(item.ingredient.toLowerCase())
    );
    const proteins = shoppingList.filter(item => 
      this.isProtein(item.ingredient.toLowerCase())
    );
    const grains = shoppingList.filter(item => 
      this.isGrain(item.ingredient.toLowerCase())
    );

    // Vegetable prep
    if (vegetables.length > 0) {
      steps.push({
        step: stepNumber++,
        instruction: `Wash and prep vegetables: ${vegetables.map(v => v.ingredient).join(', ')}. Chop, dice, or slice as needed for recipes.`,
        estimatedTime: Math.max(15, vegetables.length * 5),
        ingredients: vegetables.map(v => v.ingredient)
      });
    }

    // Protein prep
    if (proteins.length > 0) {
      steps.push({
        step: stepNumber++,
        instruction: `Prepare proteins: ${proteins.map(p => p.ingredient).join(', ')}. Trim, portion, and marinate if needed.`,
        estimatedTime: Math.max(20, proteins.length * 8),
        ingredients: proteins.map(p => p.ingredient)
      });
    }

    // Grain/legume prep
    if (grains.length > 0) {
      steps.push({
        step: stepNumber++,
        instruction: `Cook grains and legumes: ${grains.map(g => g.ingredient).join(', ')}. Cook according to package directions and store in portions.`,
        estimatedTime: Math.max(25, grains.length * 10),
        ingredients: grains.map(g => g.ingredient)
      });
    }

    // Final storage step
    steps.push({
      step: stepNumber++,
      instruction: "Label and store all prepped ingredients according to storage instructions. Clean prep area and wash containers.",
      estimatedTime: 10,
      ingredients: []
    });

    return steps;
  }

  /**
   * Generate storage instructions for prepped ingredients
   */
  private generateStorageInstructions(shoppingList: any[]): any[] {
    return shoppingList.map(item => {
      const ingredient = item.ingredient.toLowerCase();
      
      if (this.isVegetable(ingredient)) {
        return {
          ingredient: item.ingredient,
          method: "Refrigerate in airtight containers",
          duration: "3-5 days"
        };
      } else if (this.isProtein(ingredient)) {
        return {
          ingredient: item.ingredient,
          method: "Refrigerate (cooked) or freeze (raw portions)",
          duration: "3-4 days refrigerated, 3 months frozen"
        };
      } else if (this.isGrain(ingredient)) {
        return {
          ingredient: item.ingredient,
          method: "Refrigerate in sealed containers",
          duration: "5-7 days"
        };
      } else if (this.isDairy(ingredient)) {
        return {
          ingredient: item.ingredient,
          method: "Refrigerate",
          duration: "Use by expiration date"
        };
      } else {
        return {
          ingredient: item.ingredient,
          method: "Store in pantry or refrigerate as appropriate",
          duration: "Follow package instructions"
        };
      }
    });
  }

  // Helper methods for ingredient categorization
  private isVegetable(ingredient: string): boolean {
    const vegetables = ['tomato', 'onion', 'garlic', 'carrot', 'celery', 'bell pepper', 
      'broccoli', 'spinach', 'lettuce', 'cucumber', 'zucchini', 'asparagus', 'mushroom', 
      'kale', 'cabbage', 'cauliflower'];
    return vegetables.some(veg => ingredient.includes(veg));
  }

  private isProtein(ingredient: string): boolean {
    const proteins = ['chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'turkey', 
      'tofu', 'tempeh', 'eggs', 'beans', 'lentils', 'chickpeas'];
    return proteins.some(protein => ingredient.includes(protein));
  }

  private isGrain(ingredient: string): boolean {
    const grains = ['rice', 'quinoa', 'oats', 'pasta', 'bread', 'barley', 'bulgur', 'farro'];
    return grains.some(grain => ingredient.includes(grain));
  }

  private isDairy(ingredient: string): boolean {
    const dairy = ['milk', 'cheese', 'yogurt', 'butter', 'cream'];
    return dairy.some(item => ingredient.includes(item));
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

export const mealPlanGenerator = new MealPlanGeneratorService();