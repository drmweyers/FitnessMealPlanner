/**
 * Unit tests for NutritionalValidatorAgent
 * Tests validation logic, auto-fixing, and nutrition accuracy
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NutritionalValidatorAgent } from '../../../../server/services/agents/NutritionalValidatorAgent';
import { RecipeConcept } from '../../../../server/services/agents/types';
import type { GeneratedRecipe } from '../../../../server/services/openai';

describe('NutritionalValidatorAgent', () => {
  let agent: NutritionalValidatorAgent;

  beforeEach(async () => {
    agent = new NutritionalValidatorAgent();
    await agent.initialize();
  });

  const createMockConcept = (overrides?: Partial<RecipeConcept>): RecipeConcept => ({
    name: 'Grilled Chicken Breast',
    description: 'High protein meal',
    mealTypes: ['Lunch'],
    dietaryTags: [],
    mainIngredientTags: ['Chicken'],
    estimatedDifficulty: 'easy',
    targetNutrition: {
      calories: 500,
      protein: 40,
      carbs: 30,
      fat: 20
    },
    ...overrides
  });

  const createMockRecipe = (overrides?: Partial<GeneratedRecipe>): GeneratedRecipe => ({
    name: 'Grilled Chicken Breast',
    description: 'Lean protein with vegetables',
    mealTypes: ['Lunch'],
    dietaryTags: [],
    mainIngredientTags: ['Chicken'],
    ingredients: [
      { name: 'Chicken breast', amount: 200, unit: 'g' },
      { name: 'Olive oil', amount: 1, unit: 'tbsp' }
    ],
    instructions: 'Grill chicken until cooked',
    prepTimeMinutes: 10,
    cookTimeMinutes: 15,
    servings: 1,
    estimatedNutrition: {
      calories: 500,
      protein: 40,
      carbs: 30,
      fat: 20
    },
    imageUrl: 'placeholder.jpg',
    ...overrides
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await agent.initialize();
      expect(agent.getStatus()).toBe('idle');
      expect(agent.getType()).toBe('validator');
    });
  });

  describe('Basic Validation', () => {
    it('should validate recipe with perfect match', async () => {
      const concept = createMockConcept();
      const recipe = createMockRecipe();

      const response = await agent.validateBatch([recipe], [concept], 'batch-1');

      expect(response.success).toBe(true);
      expect(response.data?.passed).toBe(1);
      expect(response.data?.failed).toBe(0);
    });

    it('should detect missing required fields', async () => {
      const concept = createMockConcept();
      const recipe = createMockRecipe({ name: '' });

      const response = await agent.validateBatch([recipe], [concept], 'batch-2');

      expect(response.data?.failed).toBeGreaterThan(0);
    });

    it('should detect missing nutrition data', async () => {
      const concept = createMockConcept();
      const recipe = createMockRecipe({ estimatedNutrition: undefined as any });

      const response = await agent.validateBatch([recipe], [concept], 'batch-3');

      expect(response.data?.failed).toBe(1);
    });

    it('should detect missing ingredients', async () => {
      const concept = createMockConcept();
      const recipe = createMockRecipe({ ingredients: [] });

      const response = await agent.validateBatch([recipe], [concept], 'batch-4');

      expect(response.data?.failed).toBeGreaterThan(0);
    });
  });

  describe('Nutrition Validation', () => {
    it('should validate calories within tolerance', async () => {
      const concept = createMockConcept({ targetNutrition: { calories: 500, protein: 40, carbs: 30, fat: 20 } });
      const recipe = createMockRecipe({ estimatedNutrition: { calories: 510, protein: 40, carbs: 30, fat: 20 } });

      const response = await agent.validateBatch([recipe], [concept], 'batch-5');

      expect(response.success).toBe(true);
      expect(response.data?.passed).toBe(1);
    });

    it('should detect calories out of tolerance', async () => {
      const concept = createMockConcept({ targetNutrition: { calories: 500, protein: 40, carbs: 30, fat: 20 } });
      const recipe = createMockRecipe({ estimatedNutrition: { calories: 700, protein: 40, carbs: 30, fat: 20 } });

      const response = await agent.validateBatch([recipe], [concept], 'batch-6');

      expect(response.data?.issues).toBeDefined();
      const calorieIssues = response.data?.issues.filter((i: any) => i.field === 'calories');
      expect(calorieIssues.length).toBeGreaterThan(0);
    });

    it('should validate protein within tolerance', async () => {
      const concept = createMockConcept({ targetNutrition: { calories: 500, protein: 40, carbs: 30, fat: 20 } });
      const recipe = createMockRecipe({ estimatedNutrition: { calories: 500, protein: 42, carbs: 30, fat: 20 } });

      const response = await agent.validateBatch([recipe], [concept], 'batch-7');

      expect(response.success).toBe(true);
      expect(response.data?.passed).toBe(1);
    });

    it('should validate carbs within tolerance', async () => {
      const concept = createMockConcept({ targetNutrition: { calories: 500, protein: 40, carbs: 30, fat: 20 } });
      const recipe = createMockRecipe({ estimatedNutrition: { calories: 500, protein: 40, carbs: 33, fat: 20 } });

      const response = await agent.validateBatch([recipe], [concept], 'batch-8');

      expect(response.success).toBe(true);
      expect(response.data?.passed).toBe(1);
    });

    it('should validate fat within tolerance', async () => {
      const concept = createMockConcept({ targetNutrition: { calories: 500, protein: 40, carbs: 30, fat: 20 } });
      const recipe = createMockRecipe({ estimatedNutrition: { calories: 500, protein: 40, carbs: 30, fat: 22 } });

      const response = await agent.validateBatch([recipe], [concept], 'batch-9');

      expect(response.success).toBe(true);
      expect(response.data?.passed).toBe(1);
    });
  });

  describe('Auto-Fixing', () => {
    it('should auto-fix negative calories', async () => {
      const concept = createMockConcept();
      const recipe = createMockRecipe({ estimatedNutrition: { calories: -100, protein: 40, carbs: 30, fat: 20 } });

      const response = await agent.validateBatch([recipe], [concept], 'batch-10');

      expect(response.success).toBe(true);
      expect(response.data?.autoFixed).toBeGreaterThan(0);
      const validatedRecipe = response.data?.validatedRecipes[0];
      expect(validatedRecipe?.recipe.estimatedNutrition.calories).toBe(0);
    });

    it('should auto-fix negative protein', async () => {
      const concept = createMockConcept();
      const recipe = createMockRecipe({ estimatedNutrition: { calories: 500, protein: -10, carbs: 30, fat: 20 } });

      const response = await agent.validateBatch([recipe], [concept], 'batch-11');

      expect(response.success).toBe(true);
      const validatedRecipe = response.data?.validatedRecipes[0];
      expect(validatedRecipe?.recipe.estimatedNutrition.protein).toBe(0);
    });

    it('should auto-fix calories within 15% deviation', async () => {
      const concept = createMockConcept({ targetNutrition: { calories: 500, protein: 40, carbs: 30, fat: 20 } });
      const recipe = createMockRecipe({ estimatedNutrition: { calories: 560, protein: 40, carbs: 30, fat: 20 } });

      const response = await agent.validateBatch([recipe], [concept], 'batch-12');

      expect(response.success).toBe(true);
      const validatedRecipe = response.data?.validatedRecipes[0];
      expect(validatedRecipe?.recipe.estimatedNutrition.calories).toBe(500);
      expect(validatedRecipe?.autoFixesApplied?.length).toBeGreaterThan(0);
    });

    it('should auto-fix protein within 10g deviation', async () => {
      const concept = createMockConcept({ targetNutrition: { calories: 500, protein: 40, carbs: 30, fat: 20 } });
      const recipe = createMockRecipe({ estimatedNutrition: { calories: 500, protein: 48, carbs: 30, fat: 20 } });

      const response = await agent.validateBatch([recipe], [concept], 'batch-13');

      expect(response.success).toBe(true);
      const validatedRecipe = response.data?.validatedRecipes[0];
      expect(validatedRecipe?.recipe.estimatedNutrition.protein).toBe(40);
    });

    it('should track all auto-fixes applied', async () => {
      const concept = createMockConcept({ targetNutrition: { calories: 500, protein: 40, carbs: 30, fat: 20 } });
      const recipe = createMockRecipe({
        estimatedNutrition: { calories: 560, protein: 48, carbs: 38, fat: 28 }
      });

      const response = await agent.validateBatch([recipe], [concept], 'batch-14');

      expect(response.success).toBe(true);
      const validatedRecipe = response.data?.validatedRecipes[0];
      expect(validatedRecipe?.autoFixesApplied?.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Batch Validation', () => {
    it('should validate multiple recipes correctly', async () => {
      const concepts = [
        createMockConcept({ name: 'Recipe 1' }),
        createMockConcept({ name: 'Recipe 2' }),
        createMockConcept({ name: 'Recipe 3' })
      ];
      const recipes = [
        createMockRecipe({ name: 'Recipe 1' }),
        createMockRecipe({ name: 'Recipe 2' }),
        createMockRecipe({ name: 'Recipe 3' })
      ];

      const response = await agent.validateBatch(recipes, concepts, 'batch-15');

      expect(response.success).toBe(true);
      expect(response.data?.totalValidated).toBe(3);
      expect(response.data?.passed).toBe(3);
    });

    it('should handle mixed validation results', async () => {
      const concepts = [
        createMockConcept({ name: 'Good Recipe' }),
        createMockConcept({ name: 'Bad Recipe' })
      ];
      const recipes = [
        createMockRecipe({ name: 'Good Recipe' }),
        createMockRecipe({ name: 'Bad Recipe', ingredients: [] })
      ];

      const response = await agent.validateBatch(recipes, concepts, 'batch-16');

      expect(response.success).toBe(true);
      expect(response.data?.passed).toBe(1);
      expect(response.data?.failed).toBe(1);
    });

    it('should track issues across batch', async () => {
      const concepts = [
        createMockConcept({ targetNutrition: { calories: 500, protein: 40, carbs: 30, fat: 20 } }),
        createMockConcept({ targetNutrition: { calories: 600, protein: 45, carbs: 40, fat: 25 } })
      ];
      const recipes = [
        createMockRecipe({ estimatedNutrition: { calories: 800, protein: 40, carbs: 30, fat: 20 } }),
        createMockRecipe({ estimatedNutrition: { calories: 900, protein: 45, carbs: 40, fat: 25 } })
      ];

      const response = await agent.validateBatch(recipes, concepts, 'batch-17');

      expect(response.data?.issues).toBeDefined();
      expect(response.data?.issues.length).toBeGreaterThan(0);
    });
  });

  describe('Validation Statistics', () => {
    it('should calculate validation stats correctly', () => {
      const issues = [
        { recipeIndex: 0, recipeName: 'R1', field: 'calories', expected: 500, actual: 600, severity: 'critical' as const, fixed: false },
        { recipeIndex: 1, recipeName: 'R2', field: 'protein', expected: 40, actual: 45, severity: 'warning' as const, fixed: true },
        { recipeIndex: 2, recipeName: 'R3', field: 'carbs', expected: 30, actual: 32, severity: 'info' as const, fixed: true }
      ];

      const stats = agent.getValidationStats(issues);

      expect(stats.total).toBe(3);
      expect(stats.critical).toBe(1);
      expect(stats.warnings).toBe(1);
      expect(stats.info).toBe(1);
      expect(stats.fixed).toBe(2);
    });

    it('should handle empty issues array', () => {
      const stats = agent.getValidationStats([]);

      expect(stats.total).toBe(0);
      expect(stats.critical).toBe(0);
      expect(stats.warnings).toBe(0);
      expect(stats.info).toBe(0);
      expect(stats.fixed).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing concept for recipe', async () => {
      const concepts = [createMockConcept()];
      const recipes = [createMockRecipe(), createMockRecipe({ name: 'Extra Recipe' })];

      const response = await agent.validateBatch(recipes, concepts, 'batch-18');

      expect(response.success).toBe(true);
      expect(response.data?.issues).toBeDefined();
      const missingConceptIssues = response.data?.issues.filter((i: any) => i.field === 'concept');
      expect(missingConceptIssues.length).toBeGreaterThan(0);
    });

    it('should handle invalid ingredient format', async () => {
      const concept = createMockConcept();
      const recipe = createMockRecipe({
        ingredients: [
          { name: '', amount: 0, unit: '' }
        ]
      });

      const response = await agent.validateBatch([recipe], [concept], 'batch-19');

      expect(response.data?.validatedRecipes[0].validationPassed).toBe(false);
    });

    it('should handle zero values nutrition', async () => {
      const concept = createMockConcept({ targetNutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 } });
      const recipe = createMockRecipe({ estimatedNutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 } });

      const response = await agent.validateBatch([recipe], [concept], 'batch-20');

      expect(response.success).toBe(true);
      expect(response.data?.passed).toBe(1);
    });

    it('should handle very large deviations', async () => {
      const concept = createMockConcept({ targetNutrition: { calories: 500, protein: 40, carbs: 30, fat: 20 } });
      const recipe = createMockRecipe({ estimatedNutrition: { calories: 2000, protein: 100, carbs: 200, fat: 80 } });

      const response = await agent.validateBatch([recipe], [concept], 'batch-21');

      expect(response.data?.failed).toBeGreaterThan(0);
      const validatedRecipe = response.data?.validatedRecipes[0];
      expect(validatedRecipe?.validationPassed).toBe(false);
    });
  });

  describe('Metrics Tracking', () => {
    it('should track validation operations', async () => {
      const concept = createMockConcept();
      const recipe = createMockRecipe();

      await agent.validateBatch([recipe], [concept], 'batch-22');

      const metrics = agent.getMetrics();
      expect(metrics.operationCount).toBe(1);
      expect(metrics.successCount).toBe(1);
    });

    it('should track multiple validations', async () => {
      const concept = createMockConcept();
      const recipe = createMockRecipe();

      await agent.validateBatch([recipe], [concept], 'batch-23');
      await agent.validateBatch([recipe], [concept], 'batch-24');
      await agent.validateBatch([recipe], [concept], 'batch-25');

      const metrics = agent.getMetrics();
      expect(metrics.operationCount).toBe(3);
      expect(metrics.successCount).toBe(3);
    });
  });

  describe('Nutrition Accuracy', () => {
    it('should mark nutrition as accurate when within tolerance', async () => {
      const concept = createMockConcept({ targetNutrition: { calories: 500, protein: 40, carbs: 30, fat: 20 } });
      const recipe = createMockRecipe({ estimatedNutrition: { calories: 505, protein: 41, carbs: 31, fat: 20 } });

      const response = await agent.validateBatch([recipe], [concept], 'batch-26');

      const validatedRecipe = response.data?.validatedRecipes[0];
      expect(validatedRecipe?.nutritionAccurate).toBe(true);
    });

    it('should mark nutrition as inaccurate when out of tolerance', async () => {
      const concept = createMockConcept({ targetNutrition: { calories: 500, protein: 40, carbs: 30, fat: 20 } });
      const recipe = createMockRecipe({ estimatedNutrition: { calories: 500, protein: 60, carbs: 30, fat: 20 } });

      const response = await agent.validateBatch([recipe], [concept], 'batch-27');

      const validatedRecipe = response.data?.validatedRecipes[0];
      // Protein is 20g off (60 vs 40), which exceeds auto-fix threshold of 10g
      // So it won't be auto-fixed and nutrition won't be accurate
      expect(validatedRecipe?.nutritionAccurate).toBe(false);
    });
  });

  describe('Process Method', () => {
    it('should process validation request correctly', async () => {
      const concepts = [createMockConcept()];
      const recipes = [createMockRecipe()];

      const response = await agent.process(
        { recipes, concepts, batchId: 'batch-28' },
        'correlation-1'
      );

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
    });

    it('should handle empty batches', async () => {
      const response = await agent.process(
        { recipes: [], concepts: [], batchId: 'batch-29' },
        'correlation-2'
      );

      expect(response.success).toBe(true);
      expect(response.data?.totalValidated).toBe(0);
    });
  });
});
