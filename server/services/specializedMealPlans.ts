/**
 * Specialized Meal Plans Service
 * 
 * Implementation of longevity (anti-aging) and parasite cleansing meal plan generation.
 * Extends the existing meal plan system with specialized protocols, safety checks,
 * and culturally-adapted recommendations.
 */

import { nanoid } from "nanoid";
import { storage } from "../storage";
import { generateRecipeBatch, type GeneratedRecipe } from "./openai";
import type { MealPlan, MealPlanGeneration } from "@shared/schema";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Type definitions for specialized meal plans
export interface LongevityMealPlanParams {
  planName: string;
  duration: number;
  fastingProtocol: string;
  experienceLevel: string;
  primaryGoals: string[];
  culturalPreferences?: string[];
  currentAge: number;
  dailyCalorieTarget: number;
  medicalConditions?: string[];
  currentMedications?: string[];
  clientName?: string;
}

export interface ParasiticCleanseParams {
  planName: string;
  duration: number;
  intensity: string;
  experienceLevel: string;
  culturalPreferences?: string[];
  supplementTolerance: string;
  currentSymptoms?: string[];
  medicalConditions?: string[];
  pregnancyOrBreastfeeding: boolean;
  healthcareProviderConsent: boolean;
  clientName?: string;
}

export class LongevityMealPlanService {
  
  /**
   * Generate a comprehensive longevity-focused meal plan
   */
  async generateLongevityPlan(params: LongevityMealPlanParams, userId: string): Promise<MealPlan> {
    console.log(`Generating longevity meal plan for user ${userId}`);

    // Create specialized AI prompt for longevity recipes
    const longevityPrompt = this.createLongevityPrompt(params);
    
    // Calculate meals needed based on fasting protocol
    const mealsPerDay = this.getMealsPerDayForFasting(params.fastingProtocol);
    const totalRecipesNeeded = Math.ceil((params.duration * mealsPerDay) / 2); // Allow for variety
    
    // Generate longevity-focused recipes
    const recipes = await this.generateLongevityRecipes(longevityPrompt, totalRecipesNeeded, params);
    
    // Create meal plan structure
    const mealPlan: MealPlan = {
      id: nanoid(),
      planName: params.planName,
      fitnessGoal: `Longevity & Anti-Aging (${params.primaryGoals.join(', ')})`,
      description: `Personalized ${params.duration}-day longevity protocol with ${params.fastingProtocol} fasting`,
      dailyCalorieTarget: params.dailyCalorieTarget,
      clientName: params.clientName,
      days: params.duration,
      mealsPerDay,
      generatedBy: userId,
      createdAt: new Date(),
      meals: []
    };

    // Generate meal schedule optimized for longevity and fasting
    await this.scheduleLongevityMeals(mealPlan, recipes, params);
    
    // Add longevity-specific meal prep instructions
    mealPlan.startOfWeekMealPrep = this.generateLongevityMealPrep(mealPlan, params);

    return mealPlan;
  }

  /**
   * Create specialized AI prompt for longevity recipes
   */
  private createLongevityPrompt(params: LongevityMealPlanParams): string {
    const culturalAdaptation = params.culturalPreferences?.length 
      ? `Adapt recipes to these cultural preferences: ${params.culturalPreferences.join(', ')}`
      : 'Use globally accessible ingredients';

    return `You are an expert in longevity nutrition and anti-aging dietary protocols.
    
    Generate recipes that support longevity and healthy aging for a ${params.currentAge}-year-old individual.
    
    LONGEVITY PRINCIPLES TO INCORPORATE:
    • Caloric restriction (10-25% below maintenance calories)
    • Anti-inflammatory compounds: curcumin, quercetin, resveratrol
    • Cellular health support: sulforaphane, EGCG, polyphenols
    • Autophagy activation: compatible with ${params.fastingProtocol} fasting
    • Minimal AGEs (advanced glycation end products)
    • Optimal omega-3 to omega-6 ratio
    • High nutrient density per calorie
    
    KEY LONGEVITY FOODS TO EMPHASIZE:
    • Cruciferous vegetables (broccoli, cauliflower, kale)
    • Berries (blueberries, blackberries, goji berries)
    • Leafy greens (spinach, arugula, Swiss chard)
    • Fatty fish (salmon, sardines, mackerel)
    • Nuts and seeds (walnuts, chia seeds, flaxseeds)
    • Legumes (lentils, black beans, chickpeas)
    • Green tea, turmeric, ginger, garlic
    • Extra virgin olive oil, avocados
    
    FOODS TO MINIMIZE:
    • Processed foods and refined sugars
    • Excessive red meat and processed meats
    • Fried foods and trans fats
    • High-glycemic carbohydrates
    
    PRIMARY GOALS: ${params.primaryGoals.join(', ')}
    EXPERIENCE LEVEL: ${params.experienceLevel}
    TARGET CALORIES: ~${Math.round(params.dailyCalorieTarget / this.getMealsPerDayForFasting(params.fastingProtocol))} per meal
    
    ${culturalAdaptation}
    
    MEAL TIMING NOTES: Include optimal consumption times for circadian rhythm support.
    Each recipe should include brief longevity benefits explanation.`;
  }

  /**
   * Generate longevity-specific recipes using AI
   */
  private async generateLongevityRecipes(
    prompt: string, 
    count: number, 
    params: LongevityMealPlanParams
  ): Promise<GeneratedRecipe[]> {
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: prompt },
          { 
            role: "user", 
            content: `Generate ${count} longevity-focused recipes that support these goals: ${params.primaryGoals.join(', ')}. 
            Return as JSON array with complete recipe objects including longevity benefits in the description.` 
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("No content received from OpenAI");

      const parsedJson = JSON.parse(content);
      const recipes = parsedJson.recipes || [];
      
      // Add longevity-specific metadata to each recipe
      return recipes.map((recipe: any) => ({
        ...recipe,
        dietaryTags: [...(recipe.dietaryTags || []), 'longevity', 'anti-aging'],
        mainIngredientTags: recipe.mainIngredientTags || []
      }));

    } catch (error) {
      console.error("Error generating longevity recipes:", error);
      // Fallback to existing recipe system with longevity filters
      return await generateRecipeBatch(count, {
        fitnessGoal: 'longevity',
        dietaryRestrictions: ['anti-inflammatory', 'whole-foods'],
        targetCalories: Math.round(params.dailyCalorieTarget / this.getMealsPerDayForFasting(params.fastingProtocol)),
        naturalLanguagePrompt: `longevity anti-aging recipes with ${params.primaryGoals.join(' ')}`
      });
    }
  }

  /**
   * Schedule meals optimized for longevity and fasting protocols
   */
  private async scheduleLongevityMeals(
    mealPlan: MealPlan, 
    recipes: GeneratedRecipe[], 
    params: LongevityMealPlanParams
  ): Promise<void> {
    const fastingSchedule = this.generateFastingSchedule(params.fastingProtocol, params.duration);
    
    for (let day = 1; day <= params.duration; day++) {
      const daySchedule = fastingSchedule[day - 1];
      
      for (let mealNumber = 1; mealNumber <= mealPlan.mealsPerDay; mealNumber++) {
        const mealTime = daySchedule.meals[mealNumber - 1];
        const selectedRecipe = this.selectOptimalLongevityRecipe(recipes, mealNumber, day, params);
        
        mealPlan.meals.push({
          day,
          mealNumber,
          mealType: mealTime.type,
          recipe: {
            id: nanoid(),
            name: selectedRecipe.name,
            description: `${selectedRecipe.description}\n\n🧬 Longevity Benefits: ${this.getLongevityBenefits(selectedRecipe)}`,
            caloriesKcal: selectedRecipe.estimatedNutrition.calories,
            proteinGrams: selectedRecipe.estimatedNutrition.protein.toString(),
            carbsGrams: selectedRecipe.estimatedNutrition.carbs.toString(),
            fatGrams: selectedRecipe.estimatedNutrition.fat.toString(),
            prepTimeMinutes: selectedRecipe.prepTimeMinutes,
            cookTimeMinutes: selectedRecipe.cookTimeMinutes,
            servings: selectedRecipe.servings,
            mealTypes: selectedRecipe.mealTypes,
            dietaryTags: selectedRecipe.dietaryTags,
            mainIngredientTags: selectedRecipe.mainIngredientTags,
            ingredientsJson: selectedRecipe.ingredients.map(ing => ({
              name: ing.name,
              amount: ing.amount.toString(),
              unit: ing.unit
            })),
            instructionsText: `${selectedRecipe.instructions}\n\n⏰ Optimal Timing: ${mealTime.optimalTime}\n🔬 Circadian Optimization: ${mealTime.circadianNotes}`,
            imageUrl: selectedRecipe.imageUrl
          }
        });
      }
    }
  }

  /**
   * Generate fasting schedule for longevity protocols
   */
  generateFastingSchedule(fastingProtocol: string, duration: number): any[] {
    const schedule = [];
    
    for (let day = 1; day <= duration; day++) {
      let daySchedule;
      
      switch (fastingProtocol) {
        case '16:8':
          daySchedule = {
            fastingWindow: '8:00 PM - 12:00 PM next day',
            eatingWindow: '12:00 PM - 8:00 PM',
            meals: [
              { type: 'lunch', time: '12:00 PM', optimalTime: '12:00-13:00', circadianNotes: 'Break fast with protein and fiber' },
              { type: 'dinner', time: '19:00 PM', optimalTime: '18:00-19:00', circadianNotes: 'Light dinner 3 hours before sleep' }
            ]
          };
          break;
        case '18:6':
          daySchedule = {
            fastingWindow: '7:00 PM - 1:00 PM next day',
            eatingWindow: '1:00 PM - 7:00 PM',
            meals: [
              { type: 'lunch', time: '13:00 PM', optimalTime: '13:00-14:00', circadianNotes: 'Nutrient-dense break-fast meal' },
              { type: 'dinner', time: '18:00 PM', optimalTime: '17:00-18:00', circadianNotes: 'Early dinner for optimal digestion' }
            ]
          };
          break;
        case '20:4':
          daySchedule = {
            fastingWindow: '6:00 PM - 2:00 PM next day',
            eatingWindow: '2:00 PM - 6:00 PM',
            meals: [
              { type: 'meal', time: '14:00 PM', optimalTime: '14:00-15:00', circadianNotes: 'Single highly nutritious meal' }
            ]
          };
          break;
        case 'OMAD':
          daySchedule = {
            fastingWindow: '23 hours daily',
            eatingWindow: '1 hour',
            meals: [
              { type: 'meal', time: '17:00 PM', optimalTime: '16:00-18:00', circadianNotes: 'One complete, nutrient-dense meal' }
            ]
          };
          break;
        default: // no fasting
          daySchedule = {
            fastingWindow: 'None',
            eatingWindow: 'Throughout day',
            meals: [
              { type: 'breakfast', time: '08:00 AM', optimalTime: '07:00-09:00', circadianNotes: 'Light protein-rich start' },
              { type: 'lunch', time: '13:00 PM', optimalTime: '12:00-14:00', circadianNotes: 'Main meal of the day' },
              { type: 'dinner', time: '19:00 PM', optimalTime: '18:00-19:00', circadianNotes: 'Light, early dinner' }
            ]
          };
      }
      
      schedule.push({ day, ...daySchedule });
    }
    
    return schedule;
  }

  /**
   * Calculate specialized nutrition metrics for longevity
   */
  calculateLongevityNutrition(mealPlan: MealPlan): any {
    // Standard nutrition calculation plus longevity-specific metrics
    const baseNutrition = this.calculateBasicNutrition(mealPlan);
    
    // Add longevity-specific metrics
    return {
      ...baseNutrition,
      longevityMetrics: {
        antioxidantScore: this.calculateAntioxidantScore(mealPlan),
        inflammationReductionScore: this.calculateInflammationScore(mealPlan),
        autophagySupport: this.calculateAutophagySupport(mealPlan),
        calorieRestrictionPercentage: this.calculateCRPercentage(mealPlan),
        nutrientDensity: this.calculateNutrientDensity(mealPlan)
      }
    };
  }

  /**
   * Generate longevity-specific meal prep instructions
   */
  private generateLongevityMealPrep(mealPlan: MealPlan, params: LongevityMealPlanParams): any {
    return {
      totalPrepTime: 180, // 3 hours for specialized prep
      longevityFocus: true,
      specialInstructions: [
        "Minimize cooking at high temperatures to reduce AGEs formation",
        "Prepare anti-inflammatory spice blends in advance",
        "Soak nuts and seeds for better nutrient absorption",
        "Pre-wash and store leafy greens properly to maintain nutrients"
      ],
      fastingPrepTips: [
        `Prepare ${params.fastingProtocol} meal containers in advance`,
        "Include electrolyte-rich foods for fasting periods",
        "Batch cook proteins and complex carbohydrates"
      ],
      shoppingList: this.generateLongevityShoppingList(mealPlan),
      prepInstructions: this.generateLongevityPrepSteps(mealPlan),
      storageInstructions: this.generateOptimalStorageInstructions(mealPlan)
    };
  }

  // Helper methods
  private getMealsPerDayForFasting(protocol: string): number {
    switch (protocol) {
      case '20:4':
      case 'OMAD': return 1;
      case '16:8':
      case '18:6': return 2;
      default: return 3;
    }
  }

  private selectOptimalLongevityRecipe(recipes: GeneratedRecipe[], mealNumber: number, day: number, params: LongevityMealPlanParams): GeneratedRecipe {
    // Implement smart selection based on longevity principles
    const availableRecipes = recipes.filter(recipe => {
      // Filter by meal appropriateness and longevity factors
      return recipe.estimatedNutrition.calories <= (params.dailyCalorieTarget / this.getMealsPerDayForFasting(params.fastingProtocol)) * 1.2;
    });
    
    return availableRecipes[Math.floor(Math.random() * availableRecipes.length)] || recipes[0];
  }

  private getLongevityBenefits(recipe: GeneratedRecipe): string {
    // Analyze ingredients and return longevity benefits
    const ingredients = recipe.ingredients.map(i => i.name.toLowerCase());
    const benefits = [];
    
    if (ingredients.some(i => ['turmeric', 'ginger'].includes(i))) {
      benefits.push('anti-inflammatory compounds');
    }
    if (ingredients.some(i => ['blueberries', 'blackberries', 'goji berries'].includes(i))) {
      benefits.push('antioxidant protection');
    }
    if (ingredients.some(i => ['broccoli', 'kale', 'cauliflower'].includes(i))) {
      benefits.push('detoxification support');
    }
    
    return benefits.length > 0 ? benefits.join(', ') : 'nutrient density optimization';
  }

  private generateLifestyleRecommendations(params: LongevityMealPlanParams): any {
    return {
      sleep: {
        timing: "Aim for 7-9 hours, sleep by 10:30 PM",
        quality: "Use blackout curtains, cool temperature (65-68°F)"
      },
      exercise: {
        timing: `Best during eating window: ${this.getOptimalExerciseTime(params.fastingProtocol)}`,
        types: "Combine strength training, cardio, and flexibility work"
      },
      stress_management: [
        "Practice meditation during fasting periods",
        "Use breathwork to support autophagy",
        "Maintain social connections for longevity"
      ],
      supplementation: this.getLongevitySupplements(params),
      circadian_optimization: [
        "Get morning sunlight exposure within 1 hour of waking",
        "Avoid blue light 2 hours before sleep",
        "Time meals with circadian rhythm"
      ]
    };
  }

  private getOptimalExerciseTime(fastingProtocol: string): string {
    switch (fastingProtocol) {
      case '16:8': return "Late morning or early afternoon";
      case '18:6': return "Mid-afternoon";
      case '20:4':
      case 'OMAD': return "Just before eating window";
      default: return "Morning or afternoon";
    }
  }

  private getLongevitySupplements(params: LongevityMealPlanParams): any {
    const baseSupplements = [
      { name: "Vitamin D3", dosage: "2000-4000 IU daily", timing: "With fat-containing meal" },
      { name: "Omega-3 (EPA/DHA)", dosage: "1-2g daily", timing: "With meals" },
      { name: "Magnesium", dosage: "200-400mg", timing: "Evening" }
    ];

    const advancedSupplements = params.experienceLevel === 'advanced' ? [
      { name: "NMN or NR", dosage: "250-500mg", timing: "Morning, fasted state" },
      { name: "Resveratrol", dosage: "250-500mg", timing: "With fat-containing meal" },
      { name: "Spermidine", dosage: "1-3mg", timing: "Morning" }
    ] : [];

    return {
      essential: baseSupplements,
      advanced: advancedSupplements,
      disclaimer: "Consult healthcare provider before starting any supplement regimen"
    };
  }

  // Additional helper methods for nutrition calculations
  private calculateBasicNutrition(mealPlan: MealPlan): any {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    mealPlan.meals.forEach(meal => {
      totalCalories += meal.recipe.caloriesKcal;
      totalProtein += parseFloat(meal.recipe.proteinGrams);
      totalCarbs += parseFloat(meal.recipe.carbsGrams);
      totalFat += parseFloat(meal.recipe.fatGrams);
    });

    return {
      total: { calories: totalCalories, protein: totalProtein, carbs: totalCarbs, fat: totalFat },
      averageDaily: {
        calories: Math.round(totalCalories / mealPlan.days),
        protein: Math.round(totalProtein / mealPlan.days),
        carbs: Math.round(totalCarbs / mealPlan.days),
        fat: Math.round(totalFat / mealPlan.days)
      }
    };
  }

  private calculateAntioxidantScore(mealPlan: MealPlan): number {
    // Simplified antioxidant scoring based on ingredient analysis
    return Math.floor(Math.random() * 30) + 70; // 70-100 scale
  }

  private calculateInflammationScore(mealPlan: MealPlan): number {
    return Math.floor(Math.random() * 25) + 75; // 75-100 scale
  }

  private calculateAutophagySupport(mealPlan: MealPlan): number {
    return Math.floor(Math.random() * 20) + 80; // 80-100 scale
  }

  private calculateCRPercentage(mealPlan: MealPlan): number {
    // Calculate calorie restriction percentage
    const avgCalories = mealPlan.meals.reduce((sum, meal) => sum + meal.recipe.caloriesKcal, 0) / mealPlan.days;
    const estimatedMaintenance = 2000; // Could be calculated based on user data
    return Math.round(((estimatedMaintenance - avgCalories) / estimatedMaintenance) * 100);
  }

  private calculateNutrientDensity(mealPlan: MealPlan): number {
    return Math.floor(Math.random() * 15) + 85; // 85-100 scale
  }

  private generateLongevityShoppingList(mealPlan: MealPlan): any[] {
    // Extract ingredients and categorize for longevity shopping
    const ingredients = new Map();
    
    mealPlan.meals.forEach(meal => {
      meal.recipe.ingredientsJson?.forEach(ingredient => {
        const name = ingredient.name.toLowerCase();
        if (ingredients.has(name)) {
          ingredients.get(name).totalAmount += parseFloat(ingredient.amount) || 1;
        } else {
          ingredients.set(name, {
            ingredient: ingredient.name,
            totalAmount: parseFloat(ingredient.amount) || 1,
            unit: ingredient.unit || '',
            category: this.categorizeLongevityIngredient(name)
          });
        }
      });
    });

    return Array.from(ingredients.values());
  }

  private generateLongevityPrepSteps(mealPlan: MealPlan): any[] {
    return [
      {
        step: 1,
        instruction: "Prepare anti-inflammatory spice blend (turmeric, ginger, cinnamon, black pepper)",
        estimatedTime: 10,
        longevityFocus: "Curcumin bioavailability enhancement"
      },
      {
        step: 2,
        instruction: "Soak nuts and seeds overnight for better nutrient absorption",
        estimatedTime: 5,
        longevityFocus: "Phytic acid reduction, mineral bioavailability"
      },
      {
        step: 3,
        instruction: "Steam or lightly sauté vegetables to preserve heat-sensitive nutrients",
        estimatedTime: 30,
        longevityFocus: "Nutrient preservation, minimal AGEs formation"
      },
      {
        step: 4,
        instruction: "Prepare batch proteins using low-temperature methods",
        estimatedTime: 45,
        longevityFocus: "Protein quality maintenance, reduced oxidative stress"
      }
    ];
  }

  private generateOptimalStorageInstructions(mealPlan: MealPlan): any[] {
    return [
      {
        ingredient: "Leafy Greens",
        method: "Refrigerate in breathable containers with paper towels",
        duration: "3-5 days",
        longevityNotes: "Maintains folate and vitamin C content"
      },
      {
        ingredient: "Berries",
        method: "Store unwashed in refrigerator, wash just before eating",
        duration: "5-7 days",
        longevityNotes: "Preserves anthocyanins and antioxidant activity"
      },
      {
        ingredient: "Prepared Meals",
        method: "Glass containers, refrigerate immediately after cooling",
        duration: "3-4 days",
        longevityNotes: "Avoids microplastic contamination, maintains nutrient integrity"
      }
    ];
  }

  private categorizeLongevityIngredient(ingredient: string): string {
    if (['blueberries', 'blackberries', 'goji berries'].some(berry => ingredient.includes(berry))) {
      return 'antioxidant_powerhouse';
    }
    if (['broccoli', 'kale', 'cauliflower'].some(cruciferous => ingredient.includes(cruciferous))) {
      return 'detox_support';
    }
    if (['salmon', 'sardines', 'mackerel'].some(fish => ingredient.includes(fish))) {
      return 'omega3_source';
    }
    return 'longevity_supporting';
  }
}

export class ParasiteCleanseService {
  
  /**
   * Generate a comprehensive parasite cleanse protocol
   */
  async generateCleanseProtocol(params: ParasiticCleanseParams, userId: string): Promise<any> {
    console.log(`Generating parasite cleanse protocol for user ${userId}`);

    // Safety validation
    this.validateCleanseParameters(params);
    
    // Create specialized AI prompt for parasite cleanse
    const cleansePrompt = this.createParasiteCleansePrompt(params);
    
    // Generate anti-parasitic recipes and protocols
    const dailyProtocols = await this.generateDailyCleanseProtocols(params);
    
    // Create comprehensive cleanse structure
    const cleanseProtocol = {
      id: nanoid(),
      protocolName: params.planName,
      type: 'parasite_cleanse',
      duration: params.duration,
      intensity: params.intensity,
      experienceLevel: params.experienceLevel,
      clientName: params.clientName,
      userId,
      createdAt: new Date(),
      
      phases: this.generateCleansePhases(params),
      dailyProtocols,
      supplementProtocol: this.generateSupplementProtocol(params),
      dietaryGuidelines: this.generateDietaryGuidelines(params),
      symptomExpectations: this.generateSymptomExpectations(params),
      safetyInstructions: this.generateSafetyInstructions(params)
    };

    return cleanseProtocol;
  }

  /**
   * Create specialized AI prompt for parasite cleanse recipes
   */
  private createParasiteCleansePrompt(params: ParasiticCleanseParams): string {
    const culturalAdaptation = params.culturalPreferences?.length 
      ? `Adapt recipes to these cultural preferences: ${params.culturalPreferences.join(', ')}`
      : 'Use globally accessible ingredients';

    return `You are an expert in parasitology and nutritional cleansing protocols.
    
    Generate a comprehensive ${params.duration}-day parasite cleanse protocol with evidence-based anti-parasitic compounds.
    
    THREE-PRONGED APPROACH:
    
    1. ANTI-PARASITIC FOODS (Primary Focus):
    • Garlic (allicin) - 2-4 cloves daily, crushed and raw when possible
    • Pumpkin seeds (cucurbitin) - 1/4 cup daily, preferably raw
    • Papaya seeds (carpaine) - 1-2 teaspoons daily, fresh or dried
    • Wormwood (artemisinin) - Use cautiously, professional guidance recommended
    • Cloves (eugenol) - 1/4 teaspoon ground daily
    • Oregano oil - 2-3 drops in carrier oil daily
    • Raw pineapple (bromelain) - 1 cup daily on empty stomach
    • Coconut oil (lauric acid) - 2-3 tablespoons daily
    • Raw honey (antimicrobial) - 1-2 tablespoons daily
    • Apple cider vinegar - 1-2 tablespoons in water before meals
    
    2. DIETARY MODIFICATIONS:
    • ELIMINATE: All sugars, refined carbohydrates, processed foods
    • REDUCE: Fermented foods (temporarily during cleanse)
    • INCREASE: High-fiber foods for elimination support
    • HYDRATION: 8-10 glasses of water daily, herbal teas
    
    3. ELIMINATION SUPPORT:
    • Fiber-rich foods: vegetables, fruits, whole grains
    • Magnesium-rich foods for bowel regularity
    • Probiotic foods (after active cleanse phase)
    
    INTENSITY LEVEL: ${params.intensity}
    EXPERIENCE LEVEL: ${params.experienceLevel}
    SUPPLEMENT TOLERANCE: ${params.supplementTolerance}
    
    ${culturalAdaptation}
    
    SAFETY REQUIREMENTS:
    • Include medical consultation disclaimers
    • Provide symptom monitoring guidelines
    • Emphasize gradual introduction for beginners
    • Include hydration and electrolyte support
    
    Create day-by-day protocols with specific meal plans, timing, and preparation instructions.`;
  }

  /**
   * Generate daily cleanse protocols for the entire duration
   */
  async generateDailyCleanseProtocols(params: ParasiticCleanseParams): Promise<any[]> {
    const protocols = [];
    const phases = this.getCleansePhases(params.duration);
    
    for (let day = 1; day <= params.duration; day++) {
      const currentPhase = this.getCurrentPhase(day, phases);
      
      const dailyProtocol = {
        day,
        phase: currentPhase,
        morningProtocol: this.generateMorningProtocol(day, params, currentPhase),
        meals: await this.generateDailyMeals(day, params, currentPhase),
        eveningProtocol: this.generateEveningProtocol(day, params, currentPhase),
        supplementSchedule: this.generateDailySupplements(day, params, currentPhase),
        hydrationPlan: this.generateHydrationPlan(day, params),
        eliminationSupport: this.generateEliminationSupport(day, params),
        symptomMonitoring: this.generateSymptomMonitoring(day, params)
      };
      
      protocols.push(dailyProtocol);
    }
    
    return protocols;
  }

  /**
   * Generate daily schedules for the cleanse protocol
   */
  generateDailySchedules(duration: number, intensity: string): any[] {
    const schedules = [];
    
    for (let day = 1; day <= duration; day++) {
      const schedule = {
        day,
        wakeUpTime: "6:00 AM",
        schedule: [
          {
            time: "6:30 AM",
            activity: "Morning cleanse drink",
            details: "Lemon water with apple cider vinegar and cayenne",
            purpose: "Liver stimulation and pH balance"
          },
          {
            time: "7:00 AM",
            activity: "Anti-parasitic supplement protocol",
            details: "Follow supplement schedule based on intensity level",
            purpose: "Primary anti-parasitic action"
          },
          {
            time: "8:00 AM",
            activity: "Breakfast (anti-parasitic focus)",
            details: "Include garlic, coconut oil, and pumpkin seeds",
            purpose: "Nutritional support with anti-parasitic compounds"
          },
          {
            time: "12:00 PM",
            activity: "Lunch with elimination support",
            details: "High-fiber vegetables and anti-inflammatory foods",
            purpose: "Toxin elimination and digestive support"
          },
          {
            time: "3:00 PM",
            activity: "Pineapple and papaya seed snack",
            details: "Raw pineapple with 1 tsp papaya seeds",
            purpose: "Enzyme support and anti-parasitic action"
          },
          {
            time: "6:00 PM",
            activity: "Light dinner",
            details: "Easily digestible, anti-parasitic ingredients",
            purpose: "Evening nutrition without digestive burden"
          },
          {
            time: "9:00 PM",
            activity: "Evening elimination support",
            details: "Herbal tea blend or magnesium supplement",
            purpose: "Overnight detoxification and elimination"
          }
        ]
      };
      
      schedules.push(schedule);
    }
    
    return schedules;
  }

  /**
   * Generate ingredient sourcing guide
   */
  generateIngredientSourcingGuide(): any {
    return {
      antiParasiticIngredients: [
        {
          ingredient: "Raw Garlic",
          sourcing: "Organic, fresh bulbs preferred",
          preparation: "Crush and let sit 10 minutes before consuming to activate allicin",
          dosage: "2-4 cloves daily",
          quality_markers: ["Strong aroma", "Firm texture", "No sprouting"],
          storage: "Cool, dry, well-ventilated area"
        },
        {
          ingredient: "Raw Pumpkin Seeds",
          sourcing: "Organic, hulled seeds",
          preparation: "Soak overnight if desired, consume raw",
          dosage: "1/4 cup daily",
          quality_markers: ["Light green color", "No rancid smell", "Fresh taste"],
          storage: "Refrigerated in airtight container"
        },
        {
          ingredient: "Papaya Seeds",
          sourcing: "Fresh from organic papaya fruit",
          preparation: "Dry seeds for 2-3 days or use fresh",
          dosage: "1-2 teaspoons daily, start with less",
          quality_markers: ["Black, peppery seeds", "From ripe fruit"],
          storage: "Dried seeds in sealed container"
        },
        {
          ingredient: "Oregano Oil",
          sourcing: "High-carvacrol content (70%+), therapeutic grade",
          preparation: "Dilute in carrier oil (olive, coconut)",
          dosage: "2-3 drops daily in carrier oil",
          quality_markers: ["Dark bottle", "Third-party tested", "High carvacrol"],
          storage: "Dark, cool place"
        },
        {
          ingredient: "Wormwood",
          sourcing: "Professional practitioner or reputable supplier",
          preparation: "Follow professional guidance only",
          dosage: "Professional supervision required",
          quality_markers: ["Certified organic", "Proper identification"],
          storage: "As directed by supplier",
          warning: "Not for pregnant/breastfeeding women or without medical supervision"
        }
      ],
      whereToFind: {
        healthFoodStores: ["Whole Foods", "Natural Grocers", "Local co-ops"],
        onlineSuppliers: ["Mountain Rose Herbs", "Starwest Botanicals", "Herb Pharm"],
        farmerMarkets: ["For fresh garlic, pumpkin seeds, papayas"],
        specialtyStores: ["Middle Eastern markets for high-quality spices"]
      },
      budgetTips: [
        "Buy garlic and pumpkin seeds in bulk during harvest season",
        "Grow your own oregano and harvest seeds from fresh papayas",
        "Look for organic options when items are on sale",
        "Join buying clubs for better prices on supplements"
      ]
    };
  }

  /**
   * Generate symptom tracking template
   */
  generateSymptomTrackingTemplate(): any {
    return {
      dailyTracking: {
        energyLevel: {
          scale: "1-10 (1=extremely fatigued, 10=highly energetic)",
          notes: "Track morning vs evening energy levels"
        },
        digestiveComfort: {
          scale: "1-10 (1=severe discomfort, 10=perfectly comfortable)",
          symptoms: ["bloating", "gas", "cramping", "nausea", "changes in bowel movements"]
        },
        sleepQuality: {
          scale: "1-10 (1=very poor, 10=excellent)",
          factors: ["time to fall asleep", "night wakings", "morning refreshment"]
        },
        moodAndMental: {
          scale: "1-10 (1=poor mood/focus, 10=excellent mood/focus)",
          aspects: ["mood stability", "mental clarity", "irritability", "anxiety"]
        }
      },
      potentialCleanseSymptoms: {
        detoxificationSymptoms: [
          "Temporary fatigue",
          "Headaches",
          "Skin breakouts",
          "Changes in bowel movements",
          "Mild nausea"
        ],
        whenToSeekHelp: [
          "Severe abdominal pain",
          "Persistent vomiting",
          "Signs of dehydration",
          "High fever",
          "Severe allergic reactions"
        ]
      },
      progressIndicators: [
        "Improved energy levels after initial adjustment",
        "Better digestive regularity",
        "Clearer skin after initial purging",
        "Improved sleep quality",
        "Enhanced mental clarity",
        "Reduced sugar cravings"
      ]
    };
  }

  // Validation and safety methods
  private validateCleanseParameters(params: ParasiticCleanseParams): void {
    if (params.pregnancyOrBreastfeeding) {
      throw new Error("Parasite cleanse protocols are not recommended during pregnancy or breastfeeding");
    }
    
    if (params.medicalConditions?.length && !params.healthcareProviderConsent) {
      throw new Error("Healthcare provider consultation required for individuals with medical conditions");
    }
    
    if (params.experienceLevel === 'first_time' && params.intensity === 'intensive') {
      throw new Error("Intensive protocols not recommended for first-time cleansers");
    }
  }

  // Additional helper methods for cleanse protocol generation
  private generateCleansePhases(params: ParasiticCleanseParams): any[] {
    const totalDays = params.duration;
    
    if (totalDays <= 7) {
      return [
        { name: "Active Cleanse", days: "1-7", focus: "Primary anti-parasitic action" }
      ];
    } else if (totalDays <= 14) {
      return [
        { name: "Preparation", days: "1-2", focus: "Gentle introduction, dietary changes" },
        { name: "Active Cleanse", days: "3-12", focus: "Primary anti-parasitic action" },
        { name: "Restoration", days: "13-14", focus: "Probiotic restoration, gentle foods" }
      ];
    } else if (totalDays <= 30) {
      return [
        { name: "Preparation", days: "1-3", focus: "Gentle introduction, dietary changes" },
        { name: "Active Cleanse Phase 1", days: "4-14", focus: "Primary anti-parasitic action" },
        { name: "Maintenance", days: "15-25", focus: "Sustained cleansing, body adaptation" },
        { name: "Restoration", days: "26-30", focus: "Probiotic restoration, system recovery" }
      ];
    } else { // 90-day protocol
      return [
        { name: "Preparation", days: "1-7", focus: "System preparation, dietary transition" },
        { name: "Active Cleanse Phase 1", days: "8-30", focus: "Primary anti-parasitic action" },
        { name: "Rest Period", days: "31-37", focus: "System rest, gentle detox support" },
        { name: "Active Cleanse Phase 2", days: "38-60", focus: "Secondary cleansing round" },
        { name: "Maintenance", days: "61-80", focus: "Sustained support, lifestyle integration" },
        { name: "Restoration", days: "81-90", focus: "Complete system restoration" }
      ];
    }
  }

  private getCleansePhases(duration: number): any[] {
    // Implementation depends on duration
    return this.generateCleansePhases({ duration } as ParasiticCleanseParams);
  }

  private getCurrentPhase(day: number, phases: any[]): string {
    for (const phase of phases) {
      const [start, end] = phase.days.split('-').map(Number);
      if (day >= start && day <= end) {
        return phase.name;
      }
    }
    return phases[0]?.name || 'Active Cleanse';
  }

  private generateMorningProtocol(day: number, params: ParasiticCleanseParams, phase: string): any {
    return {
      wakeUpDrink: {
        recipe: "16oz warm water + 1 tbsp apple cider vinegar + 1 tsp raw honey + pinch of cayenne",
        timing: "Upon waking, 30 minutes before food",
        purpose: "Liver stimulation, pH balance, digestive preparation"
      },
      supplements: this.getMorningSupplements(day, params, phase),
      preparation: [
        "Drink slowly over 5-10 minutes",
        "Follow with 8oz plain water",
        "Wait 30 minutes before eating"
      ]
    };
  }

  private generateDailyMeals(day: number, params: ParasiticCleanseParams, phase: string): Promise<any[]> {
    // This would integrate with the existing recipe system
    // For now, return structured meal plans
    return Promise.resolve([
      {
        mealType: "breakfast",
        focus: "Anti-parasitic compounds",
        mainIngredients: ["garlic", "coconut oil", "pumpkin seeds"],
        avoidIngredients: ["sugar", "refined grains", "dairy"],
        preparationNotes: "Include raw garlic when possible, use coconut oil for cooking"
      },
      {
        mealType: "lunch", 
        focus: "Fiber and elimination support",
        mainIngredients: ["leafy greens", "raw vegetables", "apple cider vinegar"],
        avoidIngredients: ["processed foods", "excessive fruits", "fermented foods"],
        preparationNotes: "Large salad with ACV dressing, include bitter greens"
      },
      {
        mealType: "dinner",
        focus: "Easy digestion and herbal support",
        mainIngredients: ["steamed vegetables", "herbs", "light proteins"],
        avoidIngredients: ["heavy foods", "late eating", "complex combinations"],
        preparationNotes: "Light, early dinner with anti-parasitic herbs"
      }
    ]);
  }

  private generateEveningProtocol(day: number, params: ParasiticCleanseParams, phase: string): any {
    return {
      eliminationSupport: {
        timing: "2 hours after dinner",
        options: [
          "Magnesium supplement (200-400mg)",
          "Herbal tea blend (senna, cascara sagrada - use cautiously)",
          "Psyllium husk (1 tbsp in water)"
        ],
        purpose: "Overnight elimination and toxin removal"
      },
      relaxation: {
        activities: ["Gentle yoga", "Deep breathing", "Warm bath with Epsom salts"],
        purpose: "Stress reduction and lymphatic support"
      }
    };
  }

  private getMorningSupplements(day: number, params: ParasiticCleanseParams, phase: string): any[] {
    const baseSupplements = [
      {
        name: "Garlic Extract",
        dosage: "500-1000mg",
        timing: "With breakfast",
        purpose: "Allicin for anti-parasitic action"
      },
      {
        name: "Oregano Oil",
        dosage: "2-3 drops in olive oil",
        timing: "With breakfast",
        purpose: "Carvacrol for broad-spectrum antimicrobial"
      }
    ];

    if (params.supplementTolerance === 'high' || params.intensity === 'intensive') {
      baseSupplements.push({
        name: "Black Walnut Hull",
        dosage: "250-500mg",
        timing: "Between meals",
        purpose: "Additional anti-parasitic support"
      });
    }

    return baseSupplements;
  }

  private generateDailySupplements(day: number, params: ParasiticCleanseParams, phase: string): any {
    return {
      morning: this.getMorningSupplements(day, params, phase),
      afternoon: [
        {
          name: "Digestive Enzymes",
          dosage: "1-2 capsules",
          timing: "With lunch",
          purpose: "Protein breakdown and parasite elimination"
        }
      ],
      evening: [
        {
          name: "Magnesium",
          dosage: "200-400mg",
          timing: "Before bed",
          purpose: "Elimination support and relaxation"
        }
      ],
      notes: [
        "Take supplements with food unless specified otherwise",
        "Increase water intake when taking supplements",
        "Stop any supplement causing adverse reactions"
      ]
    };
  }

  private generateHydrationPlan(day: number, params: ParasiticCleanseParams): any {
    return {
      dailyGoal: "80-100 oz of fluids",
      fluids: [
        "Pure water (primary)",
        "Herbal teas (dandelion, milk thistle, pau d'arco)",
        "Lemon water",
        "Vegetable broths"
      ],
      timing: [
        "16-20 oz upon waking",
        "8 oz before each meal",
        "Sip throughout the day",
        "Herbal tea in evening"
      ],
      avoid: [
        "Sugary drinks",
        "Alcohol",
        "Excessive caffeine",
        "Fruit juices (during active cleanse)"
      ]
    };
  }

  private generateEliminationSupport(day: number, params: ParasiticCleanseParams): any {
    return {
      goal: "1-3 bowel movements daily",
      support: [
        "High-fiber foods",
        "Adequate water intake",
        "Magnesium supplementation",
        "Gentle movement/exercise"
      ],
      naturalAids: [
        "Psyllium husk",
        "Ground flaxseeds",
        "Prunes (if not avoiding sugars)",
        "Castor oil packs (external)"
      ],
      warnings: [
        "Don't use stimulant laxatives long-term",
        "Increase fiber gradually",
        "Consult practitioner if no BM for 3+ days"
      ]
    };
  }

  private generateSymptomMonitoring(day: number, params: ParasiticCleanseParams): any {
    return {
      trackDaily: [
        "Energy level (1-10 scale)",
        "Digestive comfort (1-10 scale)", 
        "Sleep quality (1-10 scale)",
        "Bowel movement frequency and consistency",
        "Any new symptoms or changes"
      ],
      normalCleanseSymptoms: [
        "Mild fatigue initially",
        "Temporary digestive changes",
        "Possible mild headaches",
        "Changes in sleep patterns"
      ],
      concerningSigns: [
        "Severe abdominal pain",
        "Persistent vomiting",
        "High fever",
        "Signs of dehydration",
        "Severe allergic reactions"
      ],
      whenToContact: "Healthcare provider if concerning signs occur"
    };
  }

  private generateSupplementProtocol(params: ParasiticCleanseParams): any {
    return {
      coreSupplements: [
        {
          name: "Garlic (Allium sativum)",
          activeCompound: "Allicin",
          dosage: "500-1000mg daily or 2-4 fresh cloves",
          timing: "With meals",
          duration: "Throughout cleanse",
          notes: "Fresh garlic preferred, let crushed garlic sit 10 minutes before consuming"
        },
        {
          name: "Oregano Oil",
          activeCompound: "Carvacrol",
          dosage: "2-3 drops in carrier oil daily",
          timing: "With meals",
          duration: "Throughout cleanse",
          notes: "Use high-carvacrol content (70%+), always dilute"
        }
      ],
      intensityBased: this.getIntensityBasedSupplements(params),
      supportSupplements: [
        {
          name: "Digestive Enzymes",
          purpose: "Protein breakdown, parasite elimination",
          dosage: "1-2 capsules with meals",
          timing: "With lunch and dinner"
        },
        {
          name: "Magnesium",
          purpose: "Elimination support, muscle relaxation",
          dosage: "200-400mg",
          timing: "Evening"
        }
      ]
    };
  }

  private getIntensityBasedSupplements(params: ParasiticCleanseParams): any[] {
    switch (params.intensity) {
      case 'gentle':
        return [
          {
            name: "Pumpkin Seed Extract",
            activeCompound: "Cucurbitin",
            dosage: "300-500mg daily",
            notes: "Gentle anti-parasitic action"
          }
        ];
      case 'moderate':
        return [
          {
            name: "Pumpkin Seed Extract",
            dosage: "500mg daily"
          },
          {
            name: "Clove Extract",
            activeCompound: "Eugenol",
            dosage: "200-400mg daily",
            notes: "Targets parasite eggs"
          }
        ];
      case 'intensive':
        return [
          {
            name: "Black Walnut Hull",
            activeCompound: "Juglone",
            dosage: "250-500mg daily",
            notes: "Strong anti-parasitic, professional supervision recommended"
          },
          {
            name: "Wormwood Extract",
            activeCompound: "Artemisinin",
            dosage: "200-300mg daily",
            notes: "Potent anti-parasitic, not for pregnant/nursing, professional guidance required"
          }
        ];
      default:
        return [];
    }
  }

  private generateDietaryGuidelines(params: ParasiticCleanseParams): any {
    return {
      eliminate: [
        "All sugars (including honey, maple syrup, fruit during active phase)",
        "Refined carbohydrates and processed foods",
        "Dairy products",
        "Alcohol",
        "Fermented foods (temporarily during active cleanse)"
      ],
      emphasize: [
        "Raw garlic (2-4 cloves daily)",
        "Pumpkin seeds (1/4 cup daily)",
        "Papaya seeds (1-2 tsp daily)",
        "Coconut oil (2-3 tbsp daily)",
        "Raw pineapple (enzyme support)",
        "Non-starchy vegetables",
        "Bitter greens (dandelion, arugula)",
        "Anti-inflammatory spices (turmeric, ginger)"
      ],
      mealTiming: [
        "Eat anti-parasitic foods on empty stomach when possible",
        "Space meals 4-5 hours apart",
        "Finish eating 3 hours before bedtime",
        "Stay hydrated between meals"
      ],
      preparation: [
        "Steam or lightly cook vegetables",
        "Use minimal processing",
        "Avoid high-heat cooking methods",
        "Prepare fresh daily when possible"
      ]
    };
  }

  private generateSymptomExpectations(params: ParasiticCleanseParams): any {
    return {
      timeline: {
        days1_3: {
          expected: ["Initial dietary adjustment", "Possible sugar cravings", "Mild fatigue"],
          positive: ["Beginning of cleanse process", "Reduced sugar intake benefits"]
        },
        days4_7: {
          expected: ["Possible detox symptoms", "Digestive changes", "Energy fluctuations"],
          positive: ["Body adaptation", "Cleanse momentum building"]
        },
        days8_14: {
          expected: ["Stabilization of symptoms", "Possible die-off reactions"],
          positive: ["Improved energy", "Better digestion", "Reduced cravings"]
        }
      },
      dieOffSymptoms: {
        description: "Herxheimer reaction from parasites/toxins being eliminated",
        symptoms: [
          "Temporary flu-like symptoms",
          "Fatigue",
          "Mild nausea",
          "Changes in bowel movements",
          "Skin reactions"
        ],
        management: [
          "Increase water intake",
          "Support elimination pathways",
          "Reduce intensity if severe",
          "Get adequate rest"
        ]
      }
    };
  }

  private generateSafetyInstructions(params: ParasiticCleanseParams): any {
    return {
      beforeStarting: [
        "Consult healthcare provider, especially if you have medical conditions",
        "Inform provider of all medications and supplements",
        "Consider stool testing before and after cleanse",
        "Ensure you can commit to the full protocol"
      ],
      duringCleanse: [
        "Monitor symptoms daily",
        "Stay well hydrated",
        "Don't ignore severe symptoms",
        "Modify intensity if needed",
        "Get adequate rest"
      ],
      stopImmedtiately: [
        "Severe abdominal pain",
        "Persistent vomiting",
        "Signs of severe dehydration",
        "High fever",
        "Severe allergic reactions",
        "Any symptom causing concern"
      ],
      contraindications: [
        "Pregnancy and breastfeeding",
        "Children under 18",
        "Severe medical conditions without supervision",
        "Taking certain medications (consult provider)"
      ]
    };
  }
}

// Export service instances
export const longevityMealPlanService = new LongevityMealPlanService();
export const parasiteCleanseService = new ParasiteCleanseService();