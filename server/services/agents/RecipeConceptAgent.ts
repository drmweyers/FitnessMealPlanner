/**
 * BMAD Multi-Agent Recipe Generation System
 * Recipe Concept Agent (Planner)
 *
 * This agent is responsible for:
 * - Analyzing user requirements and constraints
 * - Creating optimal chunking strategies
 * - Generating diverse recipe concepts
 * - Enforcing diversity across batches (no duplicate concepts)
 */

import { BaseAgent } from './BaseAgent';
import {
  AgentResponse,
  ChunkStrategy,
  RecipeConcept,
  GenerationOptions
} from './types';
import { v4 as uuidv4 } from 'uuid';

interface ConceptInput {
  options: GenerationOptions;
  batchId?: string;
}

interface ConceptOutput {
  strategy: ChunkStrategy;
  concepts: RecipeConcept[];
}

/**
 * Recipe Concept Agent - Strategic planning and concept generation
 */
export class RecipeConceptAgent extends BaseAgent {
  private readonly OPTIMAL_CHUNK_SIZE = 5;
  private readonly ESTIMATED_TIME_PER_RECIPE_MS = 5000; // 5 seconds per recipe

  constructor() {
    super('concept', {
      retryLimit: 2,
      backoffMs: 5000,
      fallbackBehavior: 'queue_manual_review',
      notifyUser: true
    });
  }

  /**
   * Process recipe concept generation
   */
  async process<ConceptInput, ConceptOutput>(
    input: ConceptInput,
    correlationId: string
  ): Promise<AgentResponse<ConceptOutput>> {
    return this.executeWithMetrics(async () => {
      const { options, batchId } = input as any;

      // Create chunking strategy
      const strategy = this.createChunkingStrategy(options.count, batchId);

      // Generate recipe concepts
      const concepts = await this.generateRecipeConcepts(options, strategy);

      return {
        strategy,
        concepts
      } as ConceptOutput;
    });
  }

  /**
   * Create optimal chunking strategy based on recipe count
   */
  private createChunkingStrategy(count: number, batchId?: string): ChunkStrategy {
    const chunks = Math.ceil(count / this.OPTIMAL_CHUNK_SIZE);
    const estimatedTime = count * this.ESTIMATED_TIME_PER_RECIPE_MS;

    return {
      totalRecipes: count,
      chunkSize: this.OPTIMAL_CHUNK_SIZE,
      chunks,
      estimatedTime,
      batchId: batchId || uuidv4()
    };
  }

  /**
   * Generate diverse recipe concepts based on user requirements
   */
  private async generateRecipeConcepts(
    options: GenerationOptions,
    strategy: ChunkStrategy
  ): Promise<RecipeConcept[]> {
    const concepts: RecipeConcept[] = [];
    const usedNames = new Set<string>();

    // Determine meal types to use
    const mealTypes = options.mealTypes && options.mealTypes.length > 0
      ? options.mealTypes
      : ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

    // Determine dietary tags
    const dietaryTags = options.dietaryRestrictions && options.dietaryRestrictions.length > 0
      ? options.dietaryRestrictions
      : [];

    // Determine main ingredients pool
    const mainIngredients = this.getMainIngredientPool(options);

    // Generate concepts with diversity enforcement
    for (let i = 0; i < strategy.totalRecipes; i++) {
      const concept = this.createDiverseConcept(
        i,
        mealTypes,
        dietaryTags,
        mainIngredients,
        usedNames,
        options
      );
      concepts.push(concept);
    }

    console.log(`[RecipeConceptAgent] Generated ${concepts.length} diverse recipe concepts`);
    return concepts;
  }

  /**
   * Create a single diverse recipe concept
   */
  private createDiverseConcept(
    index: number,
    mealTypes: string[],
    dietaryTags: string[],
    mainIngredients: string[],
    usedNames: Set<string>,
    options: GenerationOptions
  ): RecipeConcept {
    // Rotate through meal types for diversity
    const mealType = mealTypes[index % mealTypes.length];

    // Select main ingredient with rotation
    const mainIngredient = mainIngredients[index % mainIngredients.length];

    // Determine difficulty (distribute evenly)
    const difficultyOptions: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];
    const difficulty = difficultyOptions[index % 3];

    // Calculate target nutrition based on options
    const targetNutrition = this.calculateTargetNutrition(options, mealType);

    // Generate unique name
    const name = this.generateUniqueName(mealType, mainIngredient, usedNames);

    return {
      name,
      description: `A ${difficulty} ${mealType.toLowerCase()} recipe featuring ${mainIngredient}`,
      mealTypes: [mealType],
      dietaryTags: [...dietaryTags],
      mainIngredientTags: [mainIngredient],
      estimatedDifficulty: difficulty,
      targetNutrition
    };
  }

  /**
   * Get pool of main ingredients based on options
   */
  private getMainIngredientPool(options: GenerationOptions): string[] {
    if (options.mainIngredient) {
      return [options.mainIngredient];
    }

    // Default ingredient pool for diversity
    return [
      'Chicken',
      'Beef',
      'Fish',
      'Tofu',
      'Eggs',
      'Pasta',
      'Rice',
      'Quinoa',
      'Vegetables',
      'Legumes'
    ];
  }

  /**
   * Calculate target nutrition based on options and meal type
   */
  private calculateTargetNutrition(
    options: GenerationOptions,
    mealType: string
  ): { calories: number; protein: number; carbs: number; fat: number } {
    // Use provided targets if available
    if (options.targetCalories) {
      return this.calculateMacrosFromCalories(options);
    }

    // Default targets based on meal type
    const defaults: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {
      'Breakfast': { calories: 400, protein: 20, carbs: 50, fat: 15 },
      'Lunch': { calories: 600, protein: 35, carbs: 60, fat: 20 },
      'Dinner': { calories: 700, protein: 40, carbs: 70, fat: 25 },
      'Snack': { calories: 200, protein: 10, carbs: 25, fat: 8 }
    };

    return defaults[mealType] || defaults['Lunch'];
  }

  /**
   * Calculate macros from calories and fitness goal
   */
  private calculateMacrosFromCalories(options: GenerationOptions): {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } {
    const calories = options.targetCalories || 500;
    const fitnessGoal = options.fitnessGoal?.toLowerCase();

    let proteinPercent = 0.30; // 30% default
    let carbsPercent = 0.40; // 40% default
    let fatPercent = 0.30; // 30% default

    // Adjust macros based on fitness goal
    if (fitnessGoal?.includes('muscle') || fitnessGoal?.includes('bulk')) {
      proteinPercent = 0.35;
      carbsPercent = 0.45;
      fatPercent = 0.20;
    } else if (fitnessGoal?.includes('weight loss') || fitnessGoal?.includes('cut')) {
      proteinPercent = 0.40;
      carbsPercent = 0.30;
      fatPercent = 0.30;
    } else if (fitnessGoal?.includes('maintenance')) {
      proteinPercent = 0.30;
      carbsPercent = 0.40;
      fatPercent = 0.30;
    }

    // Apply user-specified min/max constraints
    const protein = Math.round((calories * proteinPercent) / 4); // 4 cal per gram
    const carbs = Math.round((calories * carbsPercent) / 4); // 4 cal per gram
    const fat = Math.round((calories * fatPercent) / 9); // 9 cal per gram

    return {
      calories,
      protein: this.constrainValue(protein, options.minProtein, options.maxProtein),
      carbs: this.constrainValue(carbs, options.minCarbs, options.maxCarbs),
      fat: this.constrainValue(fat, options.minFat, options.maxFat)
    };
  }

  /**
   * Constrain value within min/max bounds
   */
  private constrainValue(value: number, min?: number, max?: number): number {
    if (min !== undefined && value < min) return min;
    if (max !== undefined && value > max) return max;
    return value;
  }

  /**
   * Generate unique recipe name
   */
  private generateUniqueName(
    mealType: string,
    mainIngredient: string,
    usedNames: Set<string>
  ): string {
    const prefixes = ['Healthy', 'Quick', 'Easy', 'Delicious', 'Nutritious', 'Gourmet', 'Classic'];
    const suffixes = ['Bowl', 'Plate', 'Delight', 'Special', 'Supreme', 'Mix', 'Combo'];

    let attempts = 0;
    const maxAttempts = 50;

    while (attempts < maxAttempts) {
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
      const name = `${prefix} ${mainIngredient} ${suffix}`;

      if (!usedNames.has(name)) {
        usedNames.add(name);
        return name;
      }

      attempts++;
    }

    // Fallback: use timestamp for uniqueness
    const timestamp = Date.now().toString().slice(-4);
    const name = `${mainIngredient} ${mealType} ${timestamp}`;
    usedNames.add(name);
    return name;
  }

  /**
   * Validate concept diversity
   * Ensures no duplicate concepts in the batch
   */
  validateDiversity(concepts: RecipeConcept[]): boolean {
    const names = new Set(concepts.map(c => c.name));
    const mainIngredients = concepts.map(c => c.mainIngredientTags[0]);
    const uniqueIngredients = new Set(mainIngredients);

    // Check for name uniqueness
    if (names.size !== concepts.length) {
      console.warn('[RecipeConceptAgent] Duplicate recipe names detected');
      return false;
    }

    // Check for reasonable ingredient diversity (at least 50% unique)
    if (uniqueIngredients.size < concepts.length * 0.5) {
      console.warn('[RecipeConceptAgent] Insufficient ingredient diversity');
      return false;
    }

    return true;
  }
}
