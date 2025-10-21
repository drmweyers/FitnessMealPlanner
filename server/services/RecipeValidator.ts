/**
 * Recipe Validation Service
 *
 * Validates generated recipes against nutritional constraints
 * to ensure AI-generated recipes meet user requirements.
 */

export interface NutritionalConstraints {
  maxCalories?: number;
  minCalories?: number;
  maxProtein?: number;
  minProtein?: number;
  maxCarbs?: number;
  minCarbs?: number;
  maxFat?: number;
  minFat?: number;
  maxPrepTime?: number;
}

export interface Recipe {
  id?: string | number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prepTime?: number;
  [key: string]: any;
}

export interface ValidationResult {
  isValid: boolean;
  violations: string[];
  recipe: Recipe;
}

export interface BatchValidationResult {
  validRecipes: Recipe[];
  invalidRecipes: Recipe[];
  stats: {
    total: number;
    valid: number;
    invalid: number;
    validationRate: number;
  };
  violations: {
    recipe: Recipe;
    violations: string[];
  }[];
}

export class RecipeValidator {
  private constraints: NutritionalConstraints;

  constructor(constraints: NutritionalConstraints = {}) {
    this.constraints = constraints;
  }

  /**
   * Validate a single recipe against constraints
   */
  validate(recipe: Recipe): ValidationResult {
    const violations: string[] = [];

    // Validate calories
    if (this.constraints.maxCalories !== undefined && recipe.calories > this.constraints.maxCalories) {
      violations.push(`Calories ${recipe.calories} exceeds maximum ${this.constraints.maxCalories}`);
    }

    if (this.constraints.minCalories !== undefined && recipe.calories < this.constraints.minCalories) {
      violations.push(`Calories ${recipe.calories} below minimum ${this.constraints.minCalories}`);
    }

    // Validate protein
    if (this.constraints.maxProtein !== undefined && recipe.protein > this.constraints.maxProtein) {
      violations.push(`Protein ${recipe.protein}g exceeds maximum ${this.constraints.maxProtein}g`);
    }

    if (this.constraints.minProtein !== undefined && recipe.protein < this.constraints.minProtein) {
      violations.push(`Protein ${recipe.protein}g below minimum ${this.constraints.minProtein}g`);
    }

    // Validate carbs
    if (this.constraints.maxCarbs !== undefined && recipe.carbs > this.constraints.maxCarbs) {
      violations.push(`Carbs ${recipe.carbs}g exceeds maximum ${this.constraints.maxCarbs}g`);
    }

    if (this.constraints.minCarbs !== undefined && recipe.carbs < this.constraints.minCarbs) {
      violations.push(`Carbs ${recipe.carbs}g below minimum ${this.constraints.minCarbs}g`);
    }

    // Validate fat
    if (this.constraints.maxFat !== undefined && recipe.fat > this.constraints.maxFat) {
      violations.push(`Fat ${recipe.fat}g exceeds maximum ${this.constraints.maxFat}g`);
    }

    if (this.constraints.minFat !== undefined && recipe.fat < this.constraints.minFat) {
      violations.push(`Fat ${recipe.fat}g below minimum ${this.constraints.minFat}g`);
    }

    // Validate prep time
    if (this.constraints.maxPrepTime !== undefined && recipe.prepTime && recipe.prepTime > this.constraints.maxPrepTime) {
      violations.push(`Prep time ${recipe.prepTime} minutes exceeds maximum ${this.constraints.maxPrepTime} minutes`);
    }

    return {
      isValid: violations.length === 0,
      violations,
      recipe
    };
  }

  /**
   * Validate multiple recipes and separate valid from invalid
   */
  validateBatch(recipes: Recipe[]): BatchValidationResult {
    const validRecipes: Recipe[] = [];
    const invalidRecipes: Recipe[] = [];
    const violations: { recipe: Recipe; violations: string[] }[] = [];

    recipes.forEach(recipe => {
      const result = this.validate(recipe);

      if (result.isValid) {
        validRecipes.push(recipe);
      } else {
        invalidRecipes.push(recipe);
        violations.push({
          recipe,
          violations: result.violations
        });
      }
    });

    return {
      validRecipes,
      invalidRecipes,
      stats: {
        total: recipes.length,
        valid: validRecipes.length,
        invalid: invalidRecipes.length,
        validationRate: recipes.length > 0 ? (validRecipes.length / recipes.length) * 100 : 0
      },
      violations
    };
  }

  /**
   * Get validation statistics for reporting
   */
  getValidationStats(batchResult: BatchValidationResult): string {
    return `Validated ${batchResult.stats.total} recipes: ${batchResult.stats.valid} valid (${batchResult.stats.validationRate.toFixed(1)}%), ${batchResult.stats.invalid} invalid`;
  }

  /**
   * Log validation violations for debugging
   */
  logViolations(batchResult: BatchValidationResult): void {
    if (batchResult.violations.length === 0) {
      console.log('[RecipeValidator] ✅ All recipes passed validation');
      return;
    }

    console.log(`[RecipeValidator] ⚠️  ${batchResult.violations.length} recipes failed validation:`);
    batchResult.violations.forEach(({ recipe, violations }, index) => {
      console.log(`  ${index + 1}. "${recipe.name}"`);
      violations.forEach(violation => {
        console.log(`     - ${violation}`);
      });
    });
  }

  /**
   * Update constraints for this validator instance
   */
  updateConstraints(constraints: NutritionalConstraints): void {
    this.constraints = { ...this.constraints, ...constraints };
  }

  /**
   * Get current constraints
   */
  getConstraints(): NutritionalConstraints {
    return { ...this.constraints };
  }

  /**
   * Check if validator has any constraints set
   */
  hasConstraints(): boolean {
    return Object.keys(this.constraints).length > 0;
  }
}

/**
 * Factory function to create validator with constraints
 */
export function createRecipeValidator(constraints?: NutritionalConstraints): RecipeValidator {
  return new RecipeValidator(constraints);
}

/**
 * Utility function to quickly validate a single recipe
 */
export function validateRecipe(recipe: Recipe, constraints: NutritionalConstraints): ValidationResult {
  const validator = new RecipeValidator(constraints);
  return validator.validate(recipe);
}

/**
 * Utility function to quickly validate multiple recipes
 */
export function validateRecipes(recipes: Recipe[], constraints: NutritionalConstraints): BatchValidationResult {
  const validator = new RecipeValidator(constraints);
  return validator.validateBatch(recipes);
}
