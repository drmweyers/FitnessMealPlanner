import { describe, test, expect, beforeEach } from 'vitest';
import {
  RecipeValidator,
  createRecipeValidator,
  validateRecipe,
  validateRecipes,
  type Recipe,
  type NutritionalConstraints
} from '../../../server/services/RecipeValidator';

describe('RecipeValidator', () => {
  let validator: RecipeValidator;

  const createTestRecipe = (overrides?: Partial<Recipe>): Recipe => ({
    id: '1',
    name: 'Test Recipe',
    calories: 500,
    protein: 30,
    carbs: 50,
    fat: 20,
    prepTime: 30,
    ...overrides
  });

  describe('Calorie Validation', () => {
    test('should pass when calories below maxCalories', () => {
      validator = new RecipeValidator({ maxCalories: 600 });
      const recipe = createTestRecipe({ calories: 500 });

      const result = validator.validate(recipe);

      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    test('should fail when calories exceed maxCalories', () => {
      validator = new RecipeValidator({ maxCalories: 400 });
      const recipe = createTestRecipe({ calories: 500 });

      const result = validator.validate(recipe);

      expect(result.isValid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toContain('Calories 500 exceeds maximum 400');
    });

    test('should pass when calories above minCalories', () => {
      validator = new RecipeValidator({ minCalories: 400 });
      const recipe = createTestRecipe({ calories: 500 });

      const result = validator.validate(recipe);

      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    test('should fail when calories below minCalories', () => {
      validator = new RecipeValidator({ minCalories: 600 });
      const recipe = createTestRecipe({ calories: 500 });

      const result = validator.validate(recipe);

      expect(result.isValid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toContain('Calories 500 below minimum 600');
    });

    test('should pass when no calorie constraints set', () => {
      validator = new RecipeValidator({});
      const recipe = createTestRecipe({ calories: 500 });

      const result = validator.validate(recipe);

      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('Protein Validation', () => {
    test('should pass when protein in range', () => {
      validator = new RecipeValidator({ minProtein: 20, maxProtein: 40 });
      const recipe = createTestRecipe({ protein: 30 });

      const result = validator.validate(recipe);

      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    test('should fail when protein exceeds max', () => {
      validator = new RecipeValidator({ maxProtein: 25 });
      const recipe = createTestRecipe({ protein: 30 });

      const result = validator.validate(recipe);

      expect(result.isValid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toContain('Protein 30g exceeds maximum 25g');
    });

    test('should fail when protein below min', () => {
      validator = new RecipeValidator({ minProtein: 35 });
      const recipe = createTestRecipe({ protein: 30 });

      const result = validator.validate(recipe);

      expect(result.isValid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toContain('Protein 30g below minimum 35g');
    });
  });

  describe('Carbs Validation', () => {
    test('should pass when carbs in range', () => {
      validator = new RecipeValidator({ minCarbs: 40, maxCarbs: 60 });
      const recipe = createTestRecipe({ carbs: 50 });

      const result = validator.validate(recipe);

      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    test('should fail when carbs exceed max', () => {
      validator = new RecipeValidator({ maxCarbs: 45 });
      const recipe = createTestRecipe({ carbs: 50 });

      const result = validator.validate(recipe);

      expect(result.isValid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toContain('Carbs 50g exceeds maximum 45g');
    });

    test('should fail when carbs below min', () => {
      validator = new RecipeValidator({ minCarbs: 55 });
      const recipe = createTestRecipe({ carbs: 50 });

      const result = validator.validate(recipe);

      expect(result.isValid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toContain('Carbs 50g below minimum 55g');
    });
  });

  describe('Fat Validation', () => {
    test('should pass when fat in range', () => {
      validator = new RecipeValidator({ minFat: 15, maxFat: 25 });
      const recipe = createTestRecipe({ fat: 20 });

      const result = validator.validate(recipe);

      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    test('should fail when fat exceeds max', () => {
      validator = new RecipeValidator({ maxFat: 15 });
      const recipe = createTestRecipe({ fat: 20 });

      const result = validator.validate(recipe);

      expect(result.isValid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toContain('Fat 20g exceeds maximum 15g');
    });

    test('should fail when fat below min', () => {
      validator = new RecipeValidator({ minFat: 25 });
      const recipe = createTestRecipe({ fat: 20 });

      const result = validator.validate(recipe);

      expect(result.isValid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toContain('Fat 20g below minimum 25g');
    });
  });

  describe('Prep Time Validation', () => {
    test('should pass when prep time below max', () => {
      validator = new RecipeValidator({ maxPrepTime: 45 });
      const recipe = createTestRecipe({ prepTime: 30 });

      const result = validator.validate(recipe);

      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    test('should fail when prep time exceeds max', () => {
      validator = new RecipeValidator({ maxPrepTime: 20 });
      const recipe = createTestRecipe({ prepTime: 30 });

      const result = validator.validate(recipe);

      expect(result.isValid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toContain('Prep time 30 minutes exceeds maximum 20 minutes');
    });

    test('should pass when prepTime is undefined', () => {
      validator = new RecipeValidator({ maxPrepTime: 20 });
      const recipe = createTestRecipe({ prepTime: undefined });

      const result = validator.validate(recipe);

      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('Multiple Constraint Validation', () => {
    test('should validate all constraints and report all violations', () => {
      validator = new RecipeValidator({
        maxCalories: 400,
        minProtein: 35,
        maxCarbs: 45,
        maxPrepTime: 20
      });
      const recipe = createTestRecipe({
        calories: 500,  // violates maxCalories
        protein: 30,    // violates minProtein
        carbs: 50,      // violates maxCarbs
        prepTime: 30    // violates maxPrepTime
      });

      const result = validator.validate(recipe);

      expect(result.isValid).toBe(false);
      expect(result.violations).toHaveLength(4);
      expect(result.violations[0]).toContain('Calories');
      expect(result.violations[1]).toContain('Protein');
      expect(result.violations[2]).toContain('Carbs');
      expect(result.violations[3]).toContain('Prep time');
    });
  });

  describe('Batch Validation', () => {
    test('should validate multiple recipes and separate valid from invalid', () => {
      validator = new RecipeValidator({ maxCalories: 400 });

      const recipes = [
        createTestRecipe({ id: '1', name: 'Valid Recipe 1', calories: 300 }),
        createTestRecipe({ id: '2', name: 'Invalid Recipe 1', calories: 500 }),
        createTestRecipe({ id: '3', name: 'Valid Recipe 2', calories: 350 }),
        createTestRecipe({ id: '4', name: 'Invalid Recipe 2', calories: 450 })
      ];

      const result = validator.validateBatch(recipes);

      expect(result.validRecipes).toHaveLength(2);
      expect(result.invalidRecipes).toHaveLength(2);
      expect(result.violations).toHaveLength(2);
      expect(result.validRecipes[0].name).toBe('Valid Recipe 1');
      expect(result.validRecipes[1].name).toBe('Valid Recipe 2');
      expect(result.invalidRecipes[0].name).toBe('Invalid Recipe 1');
      expect(result.invalidRecipes[1].name).toBe('Invalid Recipe 2');
    });

    test('should return correct stats', () => {
      validator = new RecipeValidator({ maxCalories: 400 });

      const recipes = [
        createTestRecipe({ calories: 300 }),
        createTestRecipe({ calories: 500 }),
        createTestRecipe({ calories: 350 }),
        createTestRecipe({ calories: 450 })
      ];

      const result = validator.validateBatch(recipes);

      expect(result.stats.total).toBe(4);
      expect(result.stats.valid).toBe(2);
      expect(result.stats.invalid).toBe(2);
      expect(result.stats.validationRate).toBe(50);
    });

    test('should handle empty recipe array', () => {
      validator = new RecipeValidator({ maxCalories: 400 });

      const result = validator.validateBatch([]);

      expect(result.stats.total).toBe(0);
      expect(result.stats.valid).toBe(0);
      expect(result.stats.invalid).toBe(0);
      expect(result.stats.validationRate).toBe(0);
    });
  });

  describe('Utility Methods', () => {
    test('updateConstraints should update existing constraints', () => {
      validator = new RecipeValidator({ maxCalories: 500 });

      validator.updateConstraints({ minProtein: 20 });

      const constraints = validator.getConstraints();
      expect(constraints.maxCalories).toBe(500);
      expect(constraints.minProtein).toBe(20);
    });

    test('hasConstraints should return true when constraints exist', () => {
      validator = new RecipeValidator({ maxCalories: 500 });

      expect(validator.hasConstraints()).toBe(true);
    });

    test('hasConstraints should return false when no constraints', () => {
      validator = new RecipeValidator({});

      expect(validator.hasConstraints()).toBe(false);
    });

    test('getValidationStats should return formatted string', () => {
      validator = new RecipeValidator({ maxCalories: 400 });
      const recipes = [
        createTestRecipe({ calories: 300 }),
        createTestRecipe({ calories: 500 })
      ];
      const result = validator.validateBatch(recipes);

      const stats = validator.getValidationStats(result);

      expect(stats).toContain('Validated 2 recipes');
      expect(stats).toContain('1 valid');
      expect(stats).toContain('50.0%');
      expect(stats).toContain('1 invalid');
    });
  });

  describe('Factory Functions', () => {
    test('createRecipeValidator should create validator instance', () => {
      const validator = createRecipeValidator({ maxCalories: 500 });

      expect(validator).toBeInstanceOf(RecipeValidator);
      expect(validator.getConstraints().maxCalories).toBe(500);
    });

    test('validateRecipe should validate single recipe', () => {
      const recipe = createTestRecipe({ calories: 500 });

      const result = validateRecipe(recipe, { maxCalories: 400 });

      expect(result.isValid).toBe(false);
      expect(result.violations).toHaveLength(1);
    });

    test('validateRecipes should validate multiple recipes', () => {
      const recipes = [
        createTestRecipe({ calories: 300 }),
        createTestRecipe({ calories: 500 })
      ];

      const result = validateRecipes(recipes, { maxCalories: 400 });

      expect(result.validRecipes).toHaveLength(1);
      expect(result.invalidRecipes).toHaveLength(1);
    });
  });
});
