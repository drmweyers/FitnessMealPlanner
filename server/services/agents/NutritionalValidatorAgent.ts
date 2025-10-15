/**
 * NutritionalValidatorAgent - BMAD Phase 2
 * Validates and auto-fixes nutritional data for generated recipes
 * Ensures macro targets are met within acceptable tolerance
 */

import { BaseAgent } from './BaseAgent';
import { AgentResponse, RecipeConcept, ValidatedRecipe } from './types';
import type { GeneratedRecipe } from '../openai';

interface ValidationInput {
  recipes: GeneratedRecipe[];
  concepts: RecipeConcept[];
  batchId: string;
}

interface ValidationOptions {
  tolerancePercent?: number; // Default: 10% tolerance for macro targets
  autoFix?: boolean; // Default: true - automatically fix minor issues
  strictMode?: boolean; // Default: false - fail on any deviation
}

interface ValidationIssue {
  recipeIndex: number;
  recipeName: string;
  field: string;
  expected: number;
  actual: number;
  severity: 'critical' | 'warning' | 'info';
  fixed: boolean;
  fixedValue?: number;
}

export class NutritionalValidatorAgent extends BaseAgent {
  private readonly DEFAULT_TOLERANCE_PERCENT = 10;
  private readonly MACRO_TOLERANCE_GRAMS = 5; // Allow ±5g deviation

  constructor() {
    super('validator', {
      retryLimit: 2,
      backoffMs: 100,
      fallbackBehavior: 'queue_manual_review',
      notifyUser: true
    });
  }

  async process<ValidationInput, ValidationOutput>(
    input: ValidationInput,
    correlationId: string
  ): Promise<AgentResponse<ValidationOutput>> {
    return this.executeWithMetrics(async () => {
      const { recipes, concepts, batchId } = input as any;
      const options: ValidationOptions = {
        tolerancePercent: this.DEFAULT_TOLERANCE_PERCENT,
        autoFix: true,
        strictMode: false
      };

      const validatedRecipes: ValidatedRecipe[] = [];
      const issues: ValidationIssue[] = [];

      for (let i = 0; i < recipes.length; i++) {
        const recipe = recipes[i];
        const concept = concepts[i];  // ✅ Get concept from concepts array by index

        if (!concept) {
          issues.push({
            recipeIndex: i,
            recipeName: recipe.recipeName || recipe.name,
            field: 'concept',
            expected: 1,
            actual: 0,
            severity: 'critical',
            fixed: false
          });
          continue;
        }

        const validation = await this.validateSingleRecipe(recipe, concept, options);

        if (validation.isValid || validation.autoFixed) {
          validatedRecipes.push({
            recipe: validation.recipe,
            conceptId: concept.name,
            validationPassed: true,
            nutritionAccurate: validation.nutritionAccurate,
            autoFixesApplied: validation.fixesApplied
          });
        } else {
          validatedRecipes.push({
            recipe: validation.recipe,
            conceptId: concept.name,
            validationPassed: false,
            nutritionAccurate: false,
            autoFixesApplied: validation.fixesApplied,
            validationErrors: validation.errors
          });
        }

        issues.push(...validation.issues);
      }

      return {
        validatedRecipes,
        batchId,
        totalValidated: validatedRecipes.length,
        passed: validatedRecipes.filter(v => v.validationPassed).length,
        failed: validatedRecipes.filter(v => !v.validationPassed).length,
        autoFixed: validatedRecipes.filter(v => v.autoFixesApplied && v.autoFixesApplied.length > 0).length,
        issues
      } as ValidationOutput;
    });
  }

  private async validateSingleRecipe(
    recipe: GeneratedRecipe,
    concept: RecipeConcept,
    options: ValidationOptions
  ): Promise<{
    isValid: boolean;
    autoFixed: boolean;
    nutritionAccurate: boolean;
    recipe: GeneratedRecipe;
    fixesApplied: string[];
    errors: string[];
    issues: ValidationIssue[];
  }> {
    const fixesApplied: string[] = [];
    const errors: string[] = [];
    const issues: ValidationIssue[] = [];
    let modifiedRecipe = { ...recipe };

    // 1. Validate required fields
    const requiredFields = ['name', 'description', 'ingredients', 'instructions', 'estimatedNutrition'];
    for (const field of requiredFields) {
      if (!recipe[field as keyof GeneratedRecipe]) {
        errors.push(`Missing required field: ${field}`);
        issues.push({
          recipeIndex: 0,
          recipeName: recipe.name || 'Unknown',
          field,
          expected: 1,
          actual: 0,
          severity: 'critical',
          fixed: false
        });
      }
    }

    // 2. Validate nutrition data exists
    if (!recipe.estimatedNutrition) {
      errors.push('Missing nutrition data');
      return {
        isValid: false,
        autoFixed: false,
        nutritionAccurate: false,
        recipe: modifiedRecipe,
        fixesApplied,
        errors,
        issues
      };
    }

    // 3. Validate nutrition values are positive
    const nutrition = recipe.estimatedNutrition;
    const nutritionFields = ['calories', 'protein', 'carbs', 'fat'] as const;

    for (const field of nutritionFields) {
      if (nutrition[field] < 0) {
        if (options.autoFix) {
          modifiedRecipe.estimatedNutrition[field] = 0;
          fixesApplied.push(`Fixed negative ${field}: ${nutrition[field]} → 0`);
          issues.push({
            recipeIndex: 0,
            recipeName: recipe.name,
            field,
            expected: 0,
            actual: nutrition[field],
            severity: 'warning',
            fixed: true,
            fixedValue: 0
          });
        } else {
          errors.push(`Invalid ${field}: ${nutrition[field]} (must be >= 0)`);
        }
      }
    }

    // 4. Validate against concept targets
    const targetNutrition = concept.targetNutrition;
    const tolerance = options.tolerancePercent! / 100;

    // Calories validation
    const caloriesDeviation = Math.abs(nutrition.calories - targetNutrition.calories);
    const caloriesMaxDeviation = targetNutrition.calories * tolerance;

    if (caloriesDeviation > caloriesMaxDeviation) {
      if (options.autoFix && caloriesDeviation <= targetNutrition.calories * 0.15) { // Within 15%, auto-fix
        modifiedRecipe.estimatedNutrition.calories = targetNutrition.calories;
        fixesApplied.push(`Adjusted calories: ${nutrition.calories} → ${targetNutrition.calories}`);
        issues.push({
          recipeIndex: 0,
          recipeName: recipe.name,
          field: 'calories',
          expected: targetNutrition.calories,
          actual: nutrition.calories,
          severity: 'warning',
          fixed: true,
          fixedValue: targetNutrition.calories
        });
      } else {
        errors.push(
          `Calories out of range: ${nutrition.calories} (target: ${targetNutrition.calories} ±${options.tolerancePercent}%)`
        );
        issues.push({
          recipeIndex: 0,
          recipeName: recipe.name,
          field: 'calories',
          expected: targetNutrition.calories,
          actual: nutrition.calories,
          severity: options.strictMode ? 'critical' : 'warning',
          fixed: false
        });
      }
    }

    // Protein validation
    const proteinDeviation = Math.abs(nutrition.protein - targetNutrition.protein);
    if (proteinDeviation > this.MACRO_TOLERANCE_GRAMS) {
      if (options.autoFix && proteinDeviation <= this.MACRO_TOLERANCE_GRAMS * 2) {
        modifiedRecipe.estimatedNutrition.protein = targetNutrition.protein;
        fixesApplied.push(`Adjusted protein: ${nutrition.protein}g → ${targetNutrition.protein}g`);
        issues.push({
          recipeIndex: 0,
          recipeName: recipe.name,
          field: 'protein',
          expected: targetNutrition.protein,
          actual: nutrition.protein,
          severity: 'info',
          fixed: true,
          fixedValue: targetNutrition.protein
        });
      } else {
        errors.push(
          `Protein deviation: ${nutrition.protein}g (target: ${targetNutrition.protein}g ±${this.MACRO_TOLERANCE_GRAMS}g)`
        );
        issues.push({
          recipeIndex: 0,
          recipeName: recipe.name,
          field: 'protein',
          expected: targetNutrition.protein,
          actual: nutrition.protein,
          severity: 'warning',
          fixed: false
        });
      }
    }

    // Carbs validation
    const carbsDeviation = Math.abs(nutrition.carbs - targetNutrition.carbs);
    if (carbsDeviation > this.MACRO_TOLERANCE_GRAMS) {
      if (options.autoFix && carbsDeviation <= this.MACRO_TOLERANCE_GRAMS * 2) {
        modifiedRecipe.estimatedNutrition.carbs = targetNutrition.carbs;
        fixesApplied.push(`Adjusted carbs: ${nutrition.carbs}g → ${targetNutrition.carbs}g`);
        issues.push({
          recipeIndex: 0,
          recipeName: recipe.name,
          field: 'carbs',
          expected: targetNutrition.carbs,
          actual: nutrition.carbs,
          severity: 'info',
          fixed: true,
          fixedValue: targetNutrition.carbs
        });
      }
    }

    // Fat validation
    const fatDeviation = Math.abs(nutrition.fat - targetNutrition.fat);
    if (fatDeviation > this.MACRO_TOLERANCE_GRAMS) {
      if (options.autoFix && fatDeviation <= this.MACRO_TOLERANCE_GRAMS * 2) {
        modifiedRecipe.estimatedNutrition.fat = targetNutrition.fat;
        fixesApplied.push(`Adjusted fat: ${nutrition.fat}g → ${targetNutrition.fat}g`);
        issues.push({
          recipeIndex: 0,
          recipeName: recipe.name,
          field: 'fat',
          expected: targetNutrition.fat,
          actual: nutrition.fat,
          severity: 'info',
          fixed: true,
          fixedValue: targetNutrition.fat
        });
      }
    }

    // 5. Validate ingredients
    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      errors.push('No ingredients provided');
    } else {
      for (const ing of recipe.ingredients) {
        if (!ing.name || !ing.amount) {
          errors.push(`Invalid ingredient: ${JSON.stringify(ing)}`);
        }
      }
    }

    // 6. Determine if validation passed
    const criticalErrors = errors.filter(e =>
      e.includes('Missing required') ||
      e.includes('No ingredients') ||
      e.includes('Missing nutrition')
    );

    const isValid = criticalErrors.length === 0 && (
      errors.length === 0 || (options.autoFix && fixesApplied.length > 0)
    );

    const nutritionAccurate =
      Math.abs(modifiedRecipe.estimatedNutrition.calories - targetNutrition.calories) <= caloriesMaxDeviation &&
      Math.abs(modifiedRecipe.estimatedNutrition.protein - targetNutrition.protein) <= this.MACRO_TOLERANCE_GRAMS &&
      Math.abs(modifiedRecipe.estimatedNutrition.carbs - targetNutrition.carbs) <= this.MACRO_TOLERANCE_GRAMS &&
      Math.abs(modifiedRecipe.estimatedNutrition.fat - targetNutrition.fat) <= this.MACRO_TOLERANCE_GRAMS;

    return {
      isValid,
      autoFixed: fixesApplied.length > 0,
      nutritionAccurate,
      recipe: modifiedRecipe,
      fixesApplied,
      errors,
      issues
    };
  }

  /**
   * Validate a batch of recipes and return summary statistics
   */
  async validateBatch(
    recipes: GeneratedRecipe[],
    concepts: RecipeConcept[],
    batchId: string
  ): Promise<AgentResponse<any>> {
    return this.process({ recipes, concepts, batchId }, batchId);
  }

  /**
   * Get validation statistics for a specific batch
   */
  getValidationStats(issues: ValidationIssue[]): {
    total: number;
    critical: number;
    warnings: number;
    info: number;
    fixed: number;
  } {
    return {
      total: issues.length,
      critical: issues.filter(i => i.severity === 'critical').length,
      warnings: issues.filter(i => i.severity === 'warning').length,
      info: issues.filter(i => i.severity === 'info').length,
      fixed: issues.filter(i => i.fixed).length
    };
  }
}
