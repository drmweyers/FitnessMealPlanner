/**
 * Meal Plan Variation and Rotation Service
 * 
 * Intelligent system for creating meal plan variations and managing
 * long-term rotation to prevent monotony while maintaining nutritional
 * targets and customer satisfaction.
 * 
 * Key Features:
 * - Intelligent recipe substitution and variation
 * - Seasonal ingredient rotation
 * - Progressive difficulty/complexity adjustment
 * - Customer engagement pattern analysis
 * - Automatic variety injection
 * - Long-term rotation planning
 * - Cultural and seasonal cuisine rotation
 */

import { storage } from "../storage";
import { customerPreferenceService } from "./customerPreferenceService";
import { nutritionalOptimizer } from "./nutritionalOptimizer";
import type { MealPlan, Recipe } from "@shared/schema";

// Variation and rotation data structures
export interface MealPlanVariation {
  baseId: string;
  variationId: string;
  variationType: VariationType;
  changes: MealChange[];
  nutritionalImpact: NutritionalImpact;
  varietyScore: number;
  difficultyAdjustment: number;
  seasonalAlignment: number;
  customerFitScore: number;
  createdAt: Date;
}

type VariationType = 
  | 'seasonal_rotation'
  | 'cuisine_variation' 
  | 'difficulty_progression'
  | 'ingredient_substitution'
  | 'portion_adjustment'
  | 'cooking_method_variation'
  | 'cultural_exploration'
  | 'dietary_adaptation'
  | 'budget_optimization';

interface MealChange {
  day: number;
  mealNumber: number;
  originalRecipe: {
    id: string;
    name: string;
  };
  newRecipe: {
    id: string;
    name: string;
  };
  changeReason: string;
  nutritionalDelta: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  confidenceScore: number;
}

interface NutritionalImpact {
  calorieChange: number;
  proteinChange: number;
  carbsChange: number;
  fatChange: number;
  micronutrientImpact: string[];
  overallHealthScore: number;
}

interface VariationStrategy {
  name: string;
  description: string;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'seasonal';
  targetAudience: string[];
  priority: number;
  implementations: VariationImplementation[];
}

interface VariationImplementation {
  trigger: string;
  action: string;
  success_criteria: string[];
  fallback: string;
}

interface RotationPlan {
  customerId: string;
  planDuration: number; // weeks
  rotationCycles: RotationCycle[];
  variationFrequency: number; // days between variations
  customerEngagement: EngagementMetrics;
  adaptiveParameters: AdaptiveParameters;
  nextRotationDate: Date;
}

interface RotationCycle {
  cycleNumber: number;
  theme: string;
  duration: number; // weeks
  focusAreas: string[];
  mealPlanVariations: string[];
  expectedOutcomes: string[];
  successMetrics: string[];
}

interface EngagementMetrics {
  varietyPreference: number; // 0-1, how much variety customer wants
  adventurousness: number; // 0-1, willingness to try new things
  consistencyNeeds: number; // 0-1, need for routine and familiarity
  feedbackResponsiveness: number; // 0-1, how much they engage with changes
  boredomThreshold: number; // days before getting bored
}

interface AdaptiveParameters {
  learningRate: number;
  variationAmplitude: number; // How dramatic changes can be
  nutritionalTolerance: number; // How much nutrition can vary
  seasonalSensitivity: number; // How much to weight seasonal ingredients
  culturalOpenness: number; // Willingness to try different cuisines
}

interface SeasonalIngredientMap {
  season: 'spring' | 'summer' | 'fall' | 'winter';
  primaryIngredients: string[];
  secondaryIngredients: string[];
  flavourProfiles: string[];
  cookingMethods: string[];
  culturalInfluences: string[];
}

interface CulturalCuisineRotation {
  cuisine: string;
  complexity: 'beginner' | 'intermediate' | 'advanced';
  keyIngredients: string[];
  signature_dishes: string[];
  nutritionalCharacteristics: {
    avgProtein: number;
    avgCarbs: number;
    avgFat: number;
    typicalCalories: number;
  };
  seasonal_alignment: string[];
  difficulty_progression: string[];
}

export class MealPlanVariationService {
  
  // Seasonal ingredient mappings for intelligent rotation
  private readonly seasonalIngredients: SeasonalIngredientMap[] = [
    {
      season: 'spring',
      primaryIngredients: ['asparagus', 'artichokes', 'spring onions', 'peas', 'strawberries', 'apricots'],
      secondaryIngredients: ['spinach', 'arugula', 'radishes', 'carrots'],
      flavourProfiles: ['fresh', 'light', 'citrusy', 'herbal'],
      cookingMethods: ['grilling', 'steaming', 'sautéing', 'raw preparations'],
      culturalInfluences: ['mediterranean', 'japanese', 'french']
    },
    {
      season: 'summer',
      primaryIngredients: ['tomatoes', 'zucchini', 'bell peppers', 'berries', 'stone fruits', 'corn'],
      secondaryIngredients: ['cucumbers', 'eggplant', 'basil', 'mint'],
      flavourProfiles: ['bright', 'refreshing', 'smoky', 'tropical'],
      cookingMethods: ['grilling', 'no-cook', 'pickling', 'chilled soups'],
      culturalInfluences: ['italian', 'mexican', 'middle eastern', 'caribbean']
    },
    {
      season: 'fall',
      primaryIngredients: ['squash', 'pumpkin', 'apples', 'cranberries', 'sweet potatoes', 'brussels sprouts'],
      secondaryIngredients: ['cauliflower', 'cabbage', 'pears', 'pomegranate'],
      flavourProfiles: ['warm spices', 'caramelized', 'nutty', 'earthy'],
      cookingMethods: ['roasting', 'braising', 'slow cooking', 'baking'],
      culturalInfluences: ['american', 'german', 'indian', 'moroccan']
    },
    {
      season: 'winter',
      primaryIngredients: ['root vegetables', 'citrus', 'dark leafy greens', 'dried beans', 'nuts'],
      secondaryIngredients: ['potatoes', 'onions', 'garlic', 'ginger'],
      flavourProfiles: ['rich', 'warming', 'spicy', 'comfort'],
      cookingMethods: ['stewing', 'soup making', 'roasting', 'braising'],
      culturalInfluences: ['asian', 'scandinavian', 'eastern european', 'ethiopian']
    }
  ];

  // Cultural cuisine progression for systematic exploration
  private readonly cuisineRotations: CulturalCuisineRotation[] = [
    {
      cuisine: 'Mediterranean',
      complexity: 'beginner',
      keyIngredients: ['olive oil', 'tomatoes', 'herbs', 'seafood', 'legumes'],
      signature_dishes: ['Greek salad', 'Grilled fish', 'Hummus bowls'],
      nutritionalCharacteristics: {
        avgProtein: 25,
        avgCarbs: 45,
        avgFat: 35,
        typicalCalories: 450
      },
      seasonal_alignment: ['spring', 'summer'],
      difficulty_progression: ['simple salads', 'grilled proteins', 'complex stews']
    },
    {
      cuisine: 'Asian-Fusion',
      complexity: 'intermediate',
      keyIngredients: ['ginger', 'soy sauce', 'sesame oil', 'vegetables', 'rice'],
      signature_dishes: ['Stir-fries', 'Buddha bowls', 'Miso soups'],
      nutritionalCharacteristics: {
        avgProtein: 22,
        avgCarbs: 55,
        avgFat: 20,
        typicalCalories: 420
      },
      seasonal_alignment: ['fall', 'winter'],
      difficulty_progression: ['simple stir-fries', 'fermented elements', 'complex broths']
    }
  ];

  // Variation strategies for different customer needs
  private readonly variationStrategies: VariationStrategy[] = [
    {
      name: 'Seasonal Rotation',
      description: 'Rotate ingredients and flavours based on seasonal availability',
      frequency: 'seasonal',
      targetAudience: ['health_conscious', 'environmentally_aware'],
      priority: 8,
      implementations: [
        {
          trigger: 'season_change',
          action: 'substitute_seasonal_ingredients',
          success_criteria: ['ingredient_freshness', 'customer_satisfaction'],
          fallback: 'gradual_ingredient_transition'
        }
      ]
    },
    {
      name: 'Cuisine Exploration',
      description: 'Systematically introduce new cultural cuisines',
      frequency: 'monthly',
      targetAudience: ['adventurous_eaters', 'cultural_explorers'],
      priority: 6,
      implementations: [
        {
          trigger: 'boredom_threshold_reached',
          action: 'introduce_new_cuisine',
          success_criteria: ['engagement_increase', 'recipe_ratings'],
          fallback: 'familiar_fusion_approach'
        }
      ]
    },
    {
      name: 'Difficulty Progression',
      description: 'Gradually increase cooking complexity to build skills',
      frequency: 'biweekly',
      targetAudience: ['skill_builders', 'cooking_enthusiasts'],
      priority: 7,
      implementations: [
        {
          trigger: 'skill_improvement_detected',
          action: 'increase_recipe_complexity',
          success_criteria: ['completion_rate', 'preparation_time'],
          fallback: 'maintain_current_complexity'
        }
      ]
    }
  ];

  /**
   * Create intelligent meal plan variation based on customer profile and history
   */
  async createMealPlanVariation(
    baseMealPlan: MealPlan,
    customerId: string,
    variationType?: VariationType,
    variationParameters?: any
  ): Promise<MealPlanVariation> {
    
    console.log(`[Variation Service] Creating ${variationType || 'intelligent'} variation for meal plan ${baseMealPlan.id}`);
    
    try {
      // Get customer preferences and engagement metrics
      const customerPrefs = await customerPreferenceService.getCustomerPreferences(customerId);
      const engagementMetrics = await this.analyzeCustomerEngagement(customerId);
      
      // Determine optimal variation type if not specified
      const selectedVariationType = variationType || 
        await this.determineOptimalVariationType(baseMealPlan, customerPrefs, engagementMetrics);
      
      // Get available recipes for substitutions
      const { recipes: availableRecipes } = await storage.searchRecipes({
        approved: true,
        limit: 300,
        page: 1
      });
      
      // Generate variation based on type
      const variation = await this.generateVariation(
        baseMealPlan,
        selectedVariationType,
        availableRecipes,
        customerPrefs,
        engagementMetrics,
        variationParameters
      );
      
      console.log(`[Variation Service] Created ${selectedVariationType} variation with ${variation.changes.length} changes`);
      
      return variation;
      
    } catch (error) {
      console.error('[Variation Service] Error creating variation:', error);
      throw error;
    }
  }

  /**
   * Generate a long-term rotation plan for a customer
   */
  async createRotationPlan(
    customerId: string,
    baseMealPlan: MealPlan,
    planDuration: number = 12 // weeks
  ): Promise<RotationPlan> {
    
    console.log(`[Rotation Service] Creating ${planDuration}-week rotation plan for customer ${customerId}`);
    
    // Analyze customer engagement patterns
    const engagementMetrics = await this.analyzeCustomerEngagement(customerId);
    const customerPrefs = await customerPreferenceService.getCustomerPreferences(customerId);
    
    // Calculate adaptive parameters
    const adaptiveParams = this.calculateAdaptiveParameters(customerPrefs, engagementMetrics);
    
    // Generate rotation cycles
    const rotationCycles = this.generateRotationCycles(
      planDuration, 
      engagementMetrics, 
      adaptiveParams
    );
    
    // Calculate variation frequency
    const variationFrequency = this.calculateOptimalVariationFrequency(engagementMetrics);
    
    const rotationPlan: RotationPlan = {
      customerId: customerId,
      planDuration: planDuration,
      rotationCycles: rotationCycles,
      variationFrequency: variationFrequency,
      customerEngagement: engagementMetrics,
      adaptiveParameters: adaptiveParams,
      nextRotationDate: new Date(Date.now() + (variationFrequency * 24 * 60 * 60 * 1000))
    };
    
    console.log(`[Rotation Service] Created plan with ${rotationCycles.length} cycles, ${variationFrequency}-day variation frequency`);
    
    return rotationPlan;
  }

  /**
   * Generate seasonal variation based on current season and ingredient availability
   */
  async createSeasonalVariation(
    baseMealPlan: MealPlan,
    targetSeason?: 'spring' | 'summer' | 'fall' | 'winter'
  ): Promise<MealPlanVariation> {
    
    const currentSeason = targetSeason || this.getCurrentSeason();
    const seasonalMap = this.seasonalIngredients.find(s => s.season === currentSeason);
    
    if (!seasonalMap) {
      throw new Error(`No seasonal mapping found for ${currentSeason}`);
    }
    
    console.log(`[Seasonal Variation] Creating variation for ${currentSeason} season`);
    
    // Get available seasonal recipes
    const { recipes: availableRecipes } = await storage.searchRecipes({
      approved: true,
      limit: 200,
      page: 1
    });
    
    // Filter recipes that align with seasonal ingredients
    const seasonalRecipes = this.filterSeasonalRecipes(availableRecipes, seasonalMap);
    
    // Generate seasonal substitutions
    const changes: MealChange[] = [];
    
    for (let i = 0; i < baseMealPlan.meals.length; i++) {
      const meal = baseMealPlan.meals[i];
      const seasonalAlternative = this.findSeasonalAlternative(
        meal.recipe,
        seasonalRecipes,
        seasonalMap
      );
      
      if (seasonalAlternative && this.shouldMakeSeasonalChange(meal.recipe, seasonalAlternative, seasonalMap)) {
        const nutritionalDelta = this.calculateNutritionalDelta(meal.recipe, seasonalAlternative);
        
        changes.push({
          day: meal.day,
          mealNumber: meal.mealNumber,
          originalRecipe: {
            id: meal.recipe.id,
            name: meal.recipe.name
          },
          newRecipe: {
            id: seasonalAlternative.id,
            name: seasonalAlternative.name
          },
          changeReason: `Seasonal rotation to ${currentSeason} ingredients`,
          nutritionalDelta: nutritionalDelta,
          confidenceScore: this.calculateSeasonalConfidenceScore(seasonalAlternative, seasonalMap)
        });
      }
    }
    
    // Calculate variation metrics
    const nutritionalImpact = this.calculateOverallNutritionalImpact(changes);
    const varietyScore = this.calculateVarietyScore(changes, baseMealPlan);
    const seasonalAlignment = this.calculateSeasonalAlignment(changes, seasonalMap);
    
    return {
      baseId: baseMealPlan.id,
      variationId: this.generateVariationId('seasonal', currentSeason),
      variationType: 'seasonal_rotation',
      changes: changes,
      nutritionalImpact: nutritionalImpact,
      varietyScore: varietyScore,
      difficultyAdjustment: 0, // Seasonal variations don't typically change difficulty
      seasonalAlignment: seasonalAlignment,
      customerFitScore: 0.8, // Default good fit for seasonal changes
      createdAt: new Date()
    };
  }

  /**
   * Create cuisine-based variation for cultural exploration
   */
  async createCuisineVariation(
    baseMealPlan: MealPlan,
    targetCuisine: string,
    complexityLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner'
  ): Promise<MealPlanVariation> {
    
    console.log(`[Cuisine Variation] Creating ${targetCuisine} variation at ${complexityLevel} level`);
    
    const cuisineRotation = this.cuisineRotations.find(c => 
      c.cuisine.toLowerCase() === targetCuisine.toLowerCase()
    );
    
    if (!cuisineRotation) {
      throw new Error(`No cuisine rotation found for ${targetCuisine}`);
    }
    
    // Get recipes that match the target cuisine
    const { recipes: availableRecipes } = await storage.searchRecipes({
      approved: true,
      limit: 200,
      page: 1
    });
    
    const cuisineRecipes = this.filterRecipesByCuisine(availableRecipes, cuisineRotation);
    
    // Generate cuisine-based substitutions
    const changes: MealChange[] = [];
    
    // Strategically replace 2-3 meals per week with cuisine alternatives
    const mealsToReplace = this.selectMealsForCuisineVariation(baseMealPlan, 3);
    
    for (const mealIndex of mealsToReplace) {
      const meal = baseMealPlan.meals[mealIndex];
      const cuisineAlternative = this.findCuisineAlternative(
        meal.recipe,
        cuisineRecipes,
        cuisineRotation,
        complexityLevel
      );
      
      if (cuisineAlternative) {
        const nutritionalDelta = this.calculateNutritionalDelta(meal.recipe, cuisineAlternative);
        
        changes.push({
          day: meal.day,
          mealNumber: meal.mealNumber,
          originalRecipe: {
            id: meal.recipe.id,
            name: meal.recipe.name
          },
          newRecipe: {
            id: cuisineAlternative.id,
            name: cuisineAlternative.name
          },
          changeReason: `Cuisine exploration: introducing ${targetCuisine} flavours`,
          nutritionalDelta: nutritionalDelta,
          confidenceScore: this.calculateCuisineConfidenceScore(cuisineAlternative, cuisineRotation)
        });
      }
    }
    
    // Calculate variation metrics
    const nutritionalImpact = this.calculateOverallNutritionalImpact(changes);
    const varietyScore = this.calculateVarietyScore(changes, baseMealPlan);
    const difficultyAdjustment = this.calculateDifficultyAdjustment(changes, complexityLevel);
    
    return {
      baseId: baseMealPlan.id,
      variationId: this.generateVariationId('cuisine', targetCuisine),
      variationType: 'cuisine_variation',
      changes: changes,
      nutritionalImpact: nutritionalImpact,
      varietyScore: varietyScore,
      difficultyAdjustment: difficultyAdjustment,
      seasonalAlignment: 0.5, // Neutral seasonal alignment
      customerFitScore: 0.7, // Default moderate fit for cuisine exploration
      createdAt: new Date()
    };
  }

  /**
   * Create progressive difficulty variation to build cooking skills
   */
  async createDifficultyProgressionVariation(
    baseMealPlan: MealPlan,
    targetDifficulty: 'increase' | 'decrease' | 'maintain',
    skillLevel: 'beginner' | 'intermediate' | 'advanced'
  ): Promise<MealPlanVariation> {
    
    console.log(`[Difficulty Variation] Creating ${targetDifficulty} difficulty variation for ${skillLevel} level`);
    
    const { recipes: availableRecipes } = await storage.searchRecipes({
      approved: true,
      limit: 200,
      page: 1
    });
    
    // Analyze current meal plan difficulty
    const currentDifficulty = this.analyzeMealPlanDifficulty(baseMealPlan);
    const targetDifficultyLevel = this.calculateTargetDifficulty(
      currentDifficulty, 
      targetDifficulty, 
      skillLevel
    );
    
    // Generate difficulty-adjusted substitutions
    const changes: MealChange[] = [];
    
    // Select meals that would benefit from difficulty adjustment
    const mealsToAdjust = this.selectMealsForDifficultyAdjustment(
      baseMealPlan, 
      targetDifficulty, 
      2 // Adjust 2 meals per variation
    );
    
    for (const mealIndex of mealsToAdjust) {
      const meal = baseMealPlan.meals[mealIndex];
      const adjustedRecipe = this.findDifficultyAdjustedAlternative(
        meal.recipe,
        availableRecipes,
        targetDifficultyLevel
      );
      
      if (adjustedRecipe) {
        const nutritionalDelta = this.calculateNutritionalDelta(meal.recipe, adjustedRecipe);
        
        changes.push({
          day: meal.day,
          mealNumber: meal.mealNumber,
          originalRecipe: {
            id: meal.recipe.id,
            name: meal.recipe.name
          },
          newRecipe: {
            id: adjustedRecipe.id,
            name: adjustedRecipe.name
          },
          changeReason: `Difficulty progression: ${targetDifficulty} complexity for skill building`,
          nutritionalDelta: nutritionalDelta,
          confidenceScore: 0.8 // High confidence in difficulty adjustments
        });
      }
    }
    
    const nutritionalImpact = this.calculateOverallNutritionalImpact(changes);
    const varietyScore = this.calculateVarietyScore(changes, baseMealPlan);
    const difficultyAdjustment = this.calculateDifficultyAdjustment(changes, targetDifficulty);
    
    return {
      baseId: baseMealPlan.id,
      variationId: this.generateVariationId('difficulty', targetDifficulty),
      variationType: 'difficulty_progression',
      changes: changes,
      nutritionalImpact: nutritionalImpact,
      varietyScore: varietyScore,
      difficultyAdjustment: difficultyAdjustment,
      seasonalAlignment: 0.5, // Neutral seasonal alignment
      customerFitScore: 0.9, // High fit as it's tailored to skill level
      createdAt: new Date()
    };
  }

  /**
   * Apply variation to create new meal plan
   */
  applyVariationToMealPlan(
    baseMealPlan: MealPlan,
    variation: MealPlanVariation
  ): MealPlan {
    
    console.log(`[Variation Service] Applying variation ${variation.variationId} to meal plan ${baseMealPlan.id}`);
    
    // Create a deep copy of the base meal plan
    const variedMealPlan: MealPlan = JSON.parse(JSON.stringify(baseMealPlan));
    
    // Update basic properties
    variedMealPlan.id = variation.variationId;
    variedMealPlan.planName = `${baseMealPlan.planName} - ${this.getVariationLabel(variation.variationType)}`;
    variedMealPlan.description = `${baseMealPlan.description} | Variation: ${variation.variationType.replace('_', ' ')}`;
    variedMealPlan.createdAt = new Date();
    
    // Apply all changes
    variation.changes.forEach(change => {
      const mealIndex = variedMealPlan.meals.findIndex(meal => 
        meal.day === change.day && meal.mealNumber === change.mealNumber
      );
      
      if (mealIndex >= 0) {
        // Find the new recipe from our available recipes
        // In a full implementation, you'd fetch the full recipe data
        variedMealPlan.meals[mealIndex].recipe.id = change.newRecipe.id;
        variedMealPlan.meals[mealIndex].recipe.name = change.newRecipe.name;
        // Update nutritional values based on delta
        variedMealPlan.meals[mealIndex].recipe.caloriesKcal += change.nutritionalDelta.calories;
        const currentProtein = parseFloat(variedMealPlan.meals[mealIndex].recipe.proteinGrams);
        const currentCarbs = parseFloat(variedMealPlan.meals[mealIndex].recipe.carbsGrams);  
        const currentFat = parseFloat(variedMealPlan.meals[mealIndex].recipe.fatGrams);
        
        variedMealPlan.meals[mealIndex].recipe.proteinGrams = (currentProtein + change.nutritionalDelta.protein).toString();
        variedMealPlan.meals[mealIndex].recipe.carbsGrams = (currentCarbs + change.nutritionalDelta.carbs).toString();
        variedMealPlan.meals[mealIndex].recipe.fatGrams = (currentFat + change.nutritionalDelta.fat).toString();
      }
    });
    
    // Add variation metadata to meal plan
    (variedMealPlan as any).variationMetadata = {
      baseId: variation.baseId,
      variationType: variation.variationType,
      changesCount: variation.changes.length,
      varietyScore: variation.varietyScore,
      nutritionalImpact: variation.nutritionalImpact,
      createdAt: variation.createdAt
    };
    
    console.log(`[Variation Service] Applied ${variation.changes.length} changes to create varied meal plan`);
    
    return variedMealPlan;
  }

  // Helper methods for variation generation
  private async determineOptimalVariationType(
    baseMealPlan: MealPlan,
    customerPrefs: any,
    engagementMetrics: EngagementMetrics
  ): Promise<VariationType> {
    
    // Analyze what type of variation would be most beneficial
    if (engagementMetrics.boredomThreshold < 7) {
      return 'cuisine_variation'; // High variety needs
    }
    
    if (this.getCurrentSeason() !== this.getLastVariationSeason(baseMealPlan.id)) {
      return 'seasonal_rotation'; // Season has changed
    }
    
    if (engagementMetrics.adventurousness > 0.7) {
      return 'cultural_exploration'; // Adventurous customer
    }
    
    return 'ingredient_substitution'; // Safe default
  }

  private async generateVariation(
    baseMealPlan: MealPlan,
    variationType: VariationType,
    availableRecipes: Recipe[],
    customerPrefs: any,
    engagementMetrics: EngagementMetrics,
    variationParameters: any
  ): Promise<MealPlanVariation> {
    
    switch (variationType) {
      case 'seasonal_rotation':
        return await this.createSeasonalVariation(baseMealPlan);
        
      case 'cuisine_variation':
        const cuisine = variationParameters?.cuisine || 'mediterranean';
        return await this.createCuisineVariation(baseMealPlan, cuisine);
        
      case 'difficulty_progression':
        const direction = variationParameters?.direction || 'increase';
        const skillLevel = variationParameters?.skillLevel || 'intermediate';
        return await this.createDifficultyProgressionVariation(baseMealPlan, direction, skillLevel);
        
      default:
        // Create a basic ingredient substitution variation
        return await this.createIngredientSubstitutionVariation(baseMealPlan, availableRecipes);
    }
  }

  private async createIngredientSubstitutionVariation(
    baseMealPlan: MealPlan,
    availableRecipes: Recipe[]
  ): Promise<MealPlanVariation> {
    
    // Create simple ingredient-based substitutions
    const changes: MealChange[] = [];
    
    // Select 2-3 meals for substitution
    const mealsToChange = Math.min(3, Math.floor(baseMealPlan.meals.length / 3));
    const selectedMeals = this.selectRandomMeals(baseMealPlan, mealsToChange);
    
    for (const mealIndex of selectedMeals) {
      const meal = baseMealPlan.meals[mealIndex];
      const alternative = this.findSimilarRecipe(meal.recipe, availableRecipes);
      
      if (alternative) {
        const nutritionalDelta = this.calculateNutritionalDelta(meal.recipe, alternative);
        
        changes.push({
          day: meal.day,
          mealNumber: meal.mealNumber,
          originalRecipe: {
            id: meal.recipe.id,
            name: meal.recipe.name
          },
          newRecipe: {
            id: alternative.id,
            name: alternative.name
          },
          changeReason: 'Ingredient variety and nutrition optimization',
          nutritionalDelta: nutritionalDelta,
          confidenceScore: 0.7
        });
      }
    }
    
    const nutritionalImpact = this.calculateOverallNutritionalImpact(changes);
    const varietyScore = this.calculateVarietyScore(changes, baseMealPlan);
    
    return {
      baseId: baseMealPlan.id,
      variationId: this.generateVariationId('ingredient', 'substitution'),
      variationType: 'ingredient_substitution',
      changes: changes,
      nutritionalImpact: nutritionalImpact,
      varietyScore: varietyScore,
      difficultyAdjustment: 0,
      seasonalAlignment: 0.5,
      customerFitScore: 0.8,
      createdAt: new Date()
    };
  }

  private async analyzeCustomerEngagement(customerId: string): Promise<EngagementMetrics> {
    // In a real implementation, this would analyze customer behavior data
    // For now, return sensible defaults
    return {
      varietyPreference: 0.7,
      adventurousness: 0.6,
      consistencyNeeds: 0.4,
      feedbackResponsiveness: 0.8,
      boredomThreshold: 10 // days
    };
  }

  private calculateAdaptiveParameters(
    customerPrefs: any,
    engagementMetrics: EngagementMetrics
  ): AdaptiveParameters {
    return {
      learningRate: 0.1 + (engagementMetrics.feedbackResponsiveness * 0.2),
      variationAmplitude: engagementMetrics.varietyPreference * 0.8,
      nutritionalTolerance: 0.15, // 15% nutrition variance allowed
      seasonalSensitivity: 0.7,
      culturalOpenness: engagementMetrics.adventurousness
    };
  }

  private generateRotationCycles(
    planDuration: number,
    engagementMetrics: EngagementMetrics,
    adaptiveParams: AdaptiveParameters
  ): RotationCycle[] {
    
    const cycleLength = Math.ceil(planDuration / 4); // 4 cycles per plan
    const cycles: RotationCycle[] = [];
    
    const themes = ['Seasonal Focus', 'Cultural Exploration', 'Skill Building', 'Health Optimization'];
    
    for (let i = 0; i < 4 && i * cycleLength < planDuration; i++) {
      cycles.push({
        cycleNumber: i + 1,
        theme: themes[i],
        duration: Math.min(cycleLength, planDuration - (i * cycleLength)),
        focusAreas: this.getCycleFocusAreas(themes[i]),
        mealPlanVariations: [],
        expectedOutcomes: this.getCycleExpectedOutcomes(themes[i]),
        successMetrics: this.getCycleSuccessMetrics(themes[i])
      });
    }
    
    return cycles;
  }

  private getCycleFocusAreas(theme: string): string[] {
    const focusAreas: {[key: string]: string[]} = {
      'Seasonal Focus': ['seasonal_ingredients', 'local_produce', 'weather_appropriate_meals'],
      'Cultural Exploration': ['new_cuisines', 'traditional_techniques', 'diverse_flavors'],
      'Skill Building': ['cooking_techniques', 'knife_skills', 'flavor_pairing'],
      'Health Optimization': ['nutrient_density', 'macro_balance', 'inflammation_reduction']
    };
    
    return focusAreas[theme] || ['general_improvement'];
  }

  private getCycleExpectedOutcomes(theme: string): string[] {
    const outcomes: {[key: string]: string[]} = {
      'Seasonal Focus': ['improved_ingredient_quality', 'environmental_awareness', 'cost_savings'],
      'Cultural Exploration': ['expanded_palate', 'cultural_appreciation', 'cooking_confidence'],
      'Skill Building': ['technical_improvement', 'kitchen_efficiency', 'creativity_boost'],
      'Health Optimization': ['better_nutrition', 'energy_levels', 'health_markers']
    };
    
    return outcomes[theme] || ['general_satisfaction'];
  }

  private getCycleSuccessMetrics(theme: string): string[] {
    const metrics: {[key: string]: string[]} = {
      'Seasonal Focus': ['ingredient_cost_reduction', 'meal_satisfaction_scores'],
      'Cultural Exploration': ['cuisine_variety_index', 'adventure_rating'],
      'Skill Building': ['technique_mastery_score', 'cooking_time_efficiency'],
      'Health Optimization': ['nutritional_target_achievement', 'health_improvement_metrics']
    };
    
    return metrics[theme] || ['customer_satisfaction'];
  }

  private calculateOptimalVariationFrequency(engagementMetrics: EngagementMetrics): number {
    // Calculate days between variations based on boredom threshold and variety preference
    const baseFrequency = engagementMetrics.boredomThreshold;
    const varietyAdjustment = (1 - engagementMetrics.varietyPreference) * 5;
    
    return Math.max(3, Math.min(14, Math.round(baseFrequency + varietyAdjustment)));
  }

  // Utility methods for filtering and selection
  private getCurrentSeason(): 'spring' | 'summer' | 'fall' | 'winter' {
    const month = new Date().getMonth() + 1; // 1-12
    
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'fall';
    return 'winter';
  }

  private getLastVariationSeason(mealPlanId: string): string {
    // This would fetch from database in real implementation
    return 'winter'; // Placeholder
  }

  private filterSeasonalRecipes(recipes: Recipe[], seasonalMap: SeasonalIngredientMap): Recipe[] {
    return recipes.filter(recipe => {
      const ingredients = recipe.ingredientsJson || [];
      return ingredients.some((ingredient: any) =>
        seasonalMap.primaryIngredients.some(seasonal => 
          ingredient.name.toLowerCase().includes(seasonal.toLowerCase())
        ) ||
        seasonalMap.secondaryIngredients.some(seasonal =>
          ingredient.name.toLowerCase().includes(seasonal.toLowerCase())
        )
      );
    });
  }

  private filterRecipesByCuisine(recipes: Recipe[], cuisineRotation: CulturalCuisineRotation): Recipe[] {
    return recipes.filter(recipe => {
      const tags = recipe.dietaryTags || [];
      const ingredients = recipe.ingredientsJson || [];
      
      // Check if recipe matches cuisine characteristics
      const hasCuisineTag = tags.some(tag => 
        tag.toLowerCase().includes(cuisineRotation.cuisine.toLowerCase())
      );
      
      const hasKeyIngredients = cuisineRotation.keyIngredients.some(ingredient =>
        ingredients.some((recipeIng: any) =>
          recipeIng.name.toLowerCase().includes(ingredient.toLowerCase())
        )
      );
      
      return hasCuisineTag || hasKeyIngredients;
    });
  }

  private findSeasonalAlternative(
    originalRecipe: any,
    seasonalRecipes: Recipe[],
    seasonalMap: SeasonalIngredientMap
  ): Recipe | null {
    
    // Find recipes with similar nutritional profile but seasonal ingredients
    const calorieRange = 100; // ±100 calories
    const suitableAlternatives = seasonalRecipes.filter(recipe => {
      const calorieDiff = Math.abs(recipe.caloriesKcal - originalRecipe.caloriesKcal);
      const sameCategory = recipe.mealTypes?.some(type => 
        originalRecipe.mealTypes?.includes(type)
      );
      
      return calorieDiff <= calorieRange && sameCategory;
    });
    
    if (suitableAlternatives.length === 0) return null;
    
    // Select the most seasonal option
    return this.selectMostSeasonalRecipe(suitableAlternatives, seasonalMap);
  }

  private findCuisineAlternative(
    originalRecipe: any,
    cuisineRecipes: Recipe[],
    cuisineRotation: CulturalCuisineRotation,
    complexityLevel: string
  ): Recipe | null {
    
    const calorieRange = 120; // ±120 calories for cuisine variations
    const suitableAlternatives = cuisineRecipes.filter(recipe => {
      const calorieDiff = Math.abs(recipe.caloriesKcal - originalRecipe.caloriesKcal);
      const sameCategory = recipe.mealTypes?.some(type => 
        originalRecipe.mealTypes?.includes(type)
      );
      
      return calorieDiff <= calorieRange && sameCategory;
    });
    
    if (suitableAlternatives.length === 0) return null;
    
    // Select based on complexity level
    return this.selectBestCuisineMatch(suitableAlternatives, cuisineRotation, complexityLevel);
  }

  private findSimilarRecipe(originalRecipe: any, availableRecipes: Recipe[]): Recipe | null {
    const calorieRange = 80; // ±80 calories for similar recipes
    
    const similar = availableRecipes.filter(recipe => {
      const calorieDiff = Math.abs(recipe.caloriesKcal - originalRecipe.caloriesKcal);
      const sameCategory = recipe.mealTypes?.some(type => 
        originalRecipe.mealTypes?.includes(type)
      );
      const notSameRecipe = recipe.id !== originalRecipe.id;
      
      return calorieDiff <= calorieRange && sameCategory && notSameRecipe;
    });
    
    if (similar.length === 0) return null;
    
    // Return a random similar recipe
    return similar[Math.floor(Math.random() * similar.length)];
  }

  private selectMostSeasonalRecipe(recipes: Recipe[], seasonalMap: SeasonalIngredientMap): Recipe {
    // Score each recipe based on seasonal ingredient usage
    const scoredRecipes = recipes.map(recipe => {
      let seasonalScore = 0;
      const ingredients = recipe.ingredientsJson || [];
      
      ingredients.forEach((ingredient: any) => {
        const ingredientName = ingredient.name.toLowerCase();
        
        if (seasonalMap.primaryIngredients.some(s => ingredientName.includes(s))) {
          seasonalScore += 3; // High score for primary seasonal ingredients
        } else if (seasonalMap.secondaryIngredients.some(s => ingredientName.includes(s))) {
          seasonalScore += 1; // Lower score for secondary ingredients
        }
      });
      
      return { recipe, seasonalScore };
    });
    
    // Return the highest scoring recipe
    const bestMatch = scoredRecipes.sort((a, b) => b.seasonalScore - a.seasonalScore)[0];
    return bestMatch.recipe;
  }

  private selectBestCuisineMatch(
    recipes: Recipe[],
    cuisineRotation: CulturalCuisineRotation,
    complexityLevel: string
  ): Recipe {
    
    // For simplicity, return the first recipe
    // In a full implementation, you'd score based on authenticity and complexity
    return recipes[0];
  }

  private selectMealsForCuisineVariation(mealPlan: MealPlan, count: number): number[] {
    // Select diverse meal indices for cuisine variation
    const mealIndices = [];
    const totalMeals = mealPlan.meals.length;
    const interval = Math.floor(totalMeals / count);
    
    for (let i = 0; i < count && i * interval < totalMeals; i++) {
      mealIndices.push(i * interval);
    }
    
    return mealIndices;
  }

  private selectRandomMeals(mealPlan: MealPlan, count: number): number[] {
    const indices = [];
    const totalMeals = mealPlan.meals.length;
    
    while (indices.length < count && indices.length < totalMeals) {
      const randomIndex = Math.floor(Math.random() * totalMeals);
      if (!indices.includes(randomIndex)) {
        indices.push(randomIndex);
      }
    }
    
    return indices;
  }

  // Calculation and scoring methods
  private calculateNutritionalDelta(original: any, replacement: any): any {
    return {
      calories: (replacement.caloriesKcal || 0) - (original.caloriesKcal || 0),
      protein: parseFloat(replacement.proteinGrams || '0') - parseFloat(original.proteinGrams || '0'),
      carbs: parseFloat(replacement.carbsGrams || '0') - parseFloat(original.carbsGrams || '0'),
      fat: parseFloat(replacement.fatGrams || '0') - parseFloat(original.fatGrams || '0')
    };
  }

  private calculateOverallNutritionalImpact(changes: MealChange[]): NutritionalImpact {
    const totalDelta = changes.reduce((sum, change) => ({
      calories: sum.calories + change.nutritionalDelta.calories,
      protein: sum.protein + change.nutritionalDelta.protein,
      carbs: sum.carbs + change.nutritionalDelta.carbs,
      fat: sum.fat + change.nutritionalDelta.fat
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
    
    return {
      calorieChange: totalDelta.calories,
      proteinChange: totalDelta.protein,
      carbsChange: totalDelta.carbs,
      fatChange: totalDelta.fat,
      micronutrientImpact: ['improved_vitamin_variety'], // Would be calculated based on ingredients
      overallHealthScore: 0.8 // Would be calculated based on nutritional improvements
    };
  }

  private calculateVarietyScore(changes: MealChange[], baseMealPlan: MealPlan): number {
    // Score based on how much variety the changes introduce
    const changeRatio = changes.length / baseMealPlan.meals.length;
    const baseScore = Math.min(1, changeRatio * 2); // Up to 50% changes = max score
    
    // Bonus for diverse change reasons
    const uniqueReasons = new Set(changes.map(c => c.changeReason)).size;
    const reasonBonus = Math.min(0.2, uniqueReasons * 0.05);
    
    return Math.min(1, baseScore + reasonBonus);
  }

  private calculateSeasonalAlignment(changes: MealChange[], seasonalMap: SeasonalIngredientMap): number {
    // This would analyze how well changes align with seasonal ingredients
    return 0.9; // High alignment for seasonal variations
  }

  private analyzeMealPlanDifficulty(mealPlan: MealPlan): number {
    // Analyze average difficulty of current meal plan
    const totalPrepTime = mealPlan.meals.reduce((sum, meal) => 
      sum + (meal.recipe.prepTimeMinutes || 0) + (meal.recipe.cookTimeMinutes || 0), 0
    );
    const avgPrepTime = totalPrepTime / mealPlan.meals.length;
    
    // Convert prep time to difficulty score (0-1)
    return Math.min(1, avgPrepTime / 60); // 60 minutes = max difficulty
  }

  private calculateTargetDifficulty(
    currentDifficulty: number,
    direction: 'increase' | 'decrease' | 'maintain',
    skillLevel: string
  ): number {
    
    const skillMultipliers = {
      'beginner': 0.3,
      'intermediate': 0.5,
      'advanced': 0.8
    };
    
    const maxDifficulty = skillMultipliers[skillLevel as keyof typeof skillMultipliers] || 0.5;
    
    switch (direction) {
      case 'increase':
        return Math.min(maxDifficulty, currentDifficulty + 0.1);
      case 'decrease':
        return Math.max(0.2, currentDifficulty - 0.1);
      case 'maintain':
      default:
        return currentDifficulty;
    }
  }

  private selectMealsForDifficultyAdjustment(
    mealPlan: MealPlan,
    direction: 'increase' | 'decrease' | 'maintain',
    count: number
  ): number[] {
    
    // Select meals that would benefit most from difficulty adjustment
    const mealDifficulties = mealPlan.meals.map((meal, index) => {
      const totalTime = (meal.recipe.prepTimeMinutes || 0) + (meal.recipe.cookTimeMinutes || 0);
      return { index, difficulty: totalTime / 60 };
    });
    
    if (direction === 'increase') {
      // Select easiest meals to make more challenging
      mealDifficulties.sort((a, b) => a.difficulty - b.difficulty);
    } else if (direction === 'decrease') {
      // Select most difficult meals to make easier
      mealDifficulties.sort((a, b) => b.difficulty - a.difficulty);
    }
    
    return mealDifficulties.slice(0, count).map(item => item.index);
  }

  private findDifficultyAdjustedAlternative(
    originalRecipe: any,
    availableRecipes: Recipe[],
    targetDifficulty: number
  ): Recipe | null {
    
    const targetTime = targetDifficulty * 60; // Convert back to minutes
    const timeRange = 20; // ±20 minutes
    
    const suitable = availableRecipes.filter(recipe => {
      const recipeTime = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);
      const timeDiff = Math.abs(recipeTime - targetTime);
      const caloriesClose = Math.abs(recipe.caloriesKcal - originalRecipe.caloriesKcal) <= 100;
      const sameCategory = recipe.mealTypes?.some(type => 
        originalRecipe.mealTypes?.includes(type)
      );
      
      return timeDiff <= timeRange && caloriesClose && sameCategory;
    });
    
    if (suitable.length === 0) return null;
    
    return suitable[0];
  }

  private calculateDifficultyAdjustment(changes: MealChange[], target: any): number {
    // Calculate overall difficulty change from the variations
    // This would analyze prep time, technique complexity, etc.
    return 0.1; // Placeholder
  }

  private calculateSeasonalConfidenceScore(recipe: Recipe, seasonalMap: SeasonalIngredientMap): number {
    // Calculate confidence that this is a good seasonal match
    return 0.8; // High confidence for seasonal matches
  }

  private calculateCuisineConfidenceScore(recipe: Recipe, cuisineRotation: CulturalCuisineRotation): number {
    // Calculate confidence that this is a good cuisine match
    return 0.7; // Good confidence for cuisine matches
  }

  private shouldMakeSeasonalChange(original: any, replacement: Recipe, seasonalMap: SeasonalIngredientMap): boolean {
    // Determine if the seasonal change is beneficial
    const nutritionalImprovement = replacement.caloriesKcal <= original.caloriesKcal * 1.1; // Within 10%
    const hasSeasonalIngredients = replacement.ingredientsJson?.some((ingredient: any) =>
      seasonalMap.primaryIngredients.some(seasonal =>
        ingredient.name.toLowerCase().includes(seasonal.toLowerCase())
      )
    );
    
    return nutritionalImprovement && hasSeasonalIngredients;
  }

  // Utility methods
  private generateVariationId(type: string, suffix: string): string {
    const timestamp = Date.now().toString(36);
    return `var-${type}-${suffix}-${timestamp}`;
  }

  private getVariationLabel(variationType: VariationType): string {
    const labels = {
      'seasonal_rotation': 'Seasonal',
      'cuisine_variation': 'Cultural',
      'difficulty_progression': 'Skill Building',
      'ingredient_substitution': 'Fresh Variety',
      'portion_adjustment': 'Portion Optimized',
      'cooking_method_variation': 'Technique Variety',
      'cultural_exploration': 'World Cuisine',
      'dietary_adaptation': 'Diet Adapted',
      'budget_optimization': 'Budget Friendly'
    };
    
    return labels[variationType] || 'Varied';
  }
}

// Export singleton instance  
export const mealPlanVariationService = new MealPlanVariationService();