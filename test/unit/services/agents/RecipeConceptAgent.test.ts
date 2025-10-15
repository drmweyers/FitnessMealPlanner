/**
 * Unit tests for RecipeConceptAgent
 * Tests concept generation, chunking strategy, and diversity enforcement
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RecipeConceptAgent } from '../../../../server/services/agents/RecipeConceptAgent';
import { GenerationOptions } from '../../../../server/services/agents/types';

describe('RecipeConceptAgent', () => {
  let agent: RecipeConceptAgent;

  beforeEach(() => {
    agent = new RecipeConceptAgent();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await agent.initialize();
      expect(agent.getStatus()).toBe('idle');
      expect(agent.getType()).toBe('concept');
    });
  });

  describe('Chunking Strategy', () => {
    it('should create strategy for 10 recipes (2 chunks)', async () => {
      const options: GenerationOptions = { count: 10 };
      const response = await agent.process({ options }, 'test-correlation-1');

      expect(response.success).toBe(true);
      expect(response.data?.strategy).toBeDefined();
      expect(response.data?.strategy.totalRecipes).toBe(10);
      expect(response.data?.strategy.chunkSize).toBe(5);
      expect(response.data?.strategy.chunks).toBe(2);
    });

    it('should create strategy for 30 recipes (6 chunks)', async () => {
      const options: GenerationOptions = { count: 30 };
      const response = await agent.process({ options }, 'test-correlation-2');

      expect(response.success).toBe(true);
      expect(response.data?.strategy.totalRecipes).toBe(30);
      expect(response.data?.strategy.chunks).toBe(6);
    });

    it('should create strategy for 7 recipes (2 chunks)', async () => {
      const options: GenerationOptions = { count: 7 };
      const response = await agent.process({ options }, 'test-correlation-3');

      expect(response.success).toBe(true);
      expect(response.data?.strategy.totalRecipes).toBe(7);
      expect(response.data?.strategy.chunks).toBe(2); // ceil(7/5) = 2
    });

    it('should estimate time correctly (5 seconds per recipe)', async () => {
      const options: GenerationOptions = { count: 10 };
      const response = await agent.process({ options }, 'test-correlation-4');

      expect(response.data?.strategy.estimatedTime).toBe(50000); // 10 * 5000ms
    });

    it('should generate unique batch ID', async () => {
      const options: GenerationOptions = { count: 5 };
      const response1 = await agent.process({ options }, 'correlation-1');
      const response2 = await agent.process({ options }, 'correlation-2');

      expect(response1.data?.strategy.batchId).toBeDefined();
      expect(response2.data?.strategy.batchId).toBeDefined();
      expect(response1.data?.strategy.batchId).not.toBe(response2.data?.strategy.batchId);
    });

    it('should use provided batch ID if given', async () => {
      const batchId = 'custom-batch-123';
      const options: GenerationOptions = { count: 5 };
      const response = await agent.process({ options, batchId }, 'correlation-1');

      expect(response.data?.strategy.batchId).toBe(batchId);
    });
  });

  describe('Recipe Concept Generation', () => {
    it('should generate correct number of concepts', async () => {
      const options: GenerationOptions = { count: 15 };
      const response = await agent.process({ options }, 'test-correlation-5');

      expect(response.data?.concepts).toHaveLength(15);
    });

    it('should generate concepts with required fields', async () => {
      const options: GenerationOptions = { count: 3 };
      const response = await agent.process({ options }, 'test-correlation-6');

      const concept = response.data?.concepts[0];
      expect(concept).toMatchObject({
        name: expect.any(String),
        description: expect.any(String),
        mealTypes: expect.arrayContaining([expect.any(String)]),
        dietaryTags: expect.any(Array),
        mainIngredientTags: expect.arrayContaining([expect.any(String)]),
        estimatedDifficulty: expect.stringMatching(/^(easy|medium|hard)$/),
        targetNutrition: {
          calories: expect.any(Number),
          protein: expect.any(Number),
          carbs: expect.any(Number),
          fat: expect.any(Number)
        }
      });
    });

    it('should respect specified meal types', async () => {
      const options: GenerationOptions = {
        count: 4,
        mealTypes: ['Breakfast', 'Lunch']
      };
      const response = await agent.process({ options }, 'test-correlation-7');

      response.data?.concepts.forEach(concept => {
        expect(['Breakfast', 'Lunch']).toContain(concept.mealTypes[0]);
      });
    });

    it('should use default meal types when none specified', async () => {
      const options: GenerationOptions = { count: 5 };
      const response = await agent.process({ options }, 'test-correlation-8');

      const mealTypes = response.data?.concepts.map(c => c.mealTypes[0]) || [];
      const uniqueMealTypes = new Set(mealTypes);
      expect(uniqueMealTypes.size).toBeGreaterThan(1); // Should have variety
    });

    it('should respect dietary restrictions', async () => {
      const options: GenerationOptions = {
        count: 3,
        dietaryRestrictions: ['Vegan', 'Gluten-Free']
      };
      const response = await agent.process({ options }, 'test-correlation-9');

      response.data?.concepts.forEach(concept => {
        expect(concept.dietaryTags).toEqual(['Vegan', 'Gluten-Free']);
      });
    });

    it('should use specified main ingredient', async () => {
      const options: GenerationOptions = {
        count: 3,
        mainIngredient: 'Salmon'
      };
      const response = await agent.process({ options }, 'test-correlation-10');

      response.data?.concepts.forEach(concept => {
        expect(concept.mainIngredientTags).toContain('Salmon');
      });
    });
  });

  describe('Nutrition Calculation', () => {
    it('should use target calories when provided', async () => {
      const options: GenerationOptions = {
        count: 2,
        targetCalories: 600
      };
      const response = await agent.process({ options }, 'test-correlation-11');

      response.data?.concepts.forEach(concept => {
        expect(concept.targetNutrition.calories).toBe(600);
      });
    });

    it('should calculate macros for muscle building goal', async () => {
      const options: GenerationOptions = {
        count: 2,
        targetCalories: 500,
        fitnessGoal: 'muscle building'
      };
      const response = await agent.process({ options }, 'test-correlation-12');

      const concept = response.data?.concepts[0];
      // Muscle building: higher protein (35%), higher carbs (45%)
      expect(concept.targetNutrition.protein).toBeGreaterThan(40); // ~44g (500*0.35/4)
      expect(concept.targetNutrition.carbs).toBeGreaterThan(50); // ~56g (500*0.45/4)
    });

    it('should calculate macros for weight loss goal', async () => {
      const options: GenerationOptions = {
        count: 2,
        targetCalories: 400,
        fitnessGoal: 'weight loss'
      };
      const response = await agent.process({ options }, 'test-correlation-13');

      const concept = response.data?.concepts[0];
      // Weight loss: high protein (40%), lower carbs (30%)
      expect(concept.targetNutrition.protein).toBeGreaterThan(35); // ~40g (400*0.40/4)
      expect(concept.targetNutrition.carbs).toBeLessThan(35); // ~30g (400*0.30/4)
    });

    it('should respect min/max protein constraints', async () => {
      const options: GenerationOptions = {
        count: 2,
        targetCalories: 500,
        minProtein: 50,
        maxProtein: 60
      };
      const response = await agent.process({ options }, 'test-correlation-14');

      response.data?.concepts.forEach(concept => {
        expect(concept.targetNutrition.protein).toBeGreaterThanOrEqual(50);
        expect(concept.targetNutrition.protein).toBeLessThanOrEqual(60);
      });
    });

    it('should apply default nutrition by meal type', async () => {
      const options: GenerationOptions = {
        count: 4,
        mealTypes: ['Breakfast']
      };
      const response = await agent.process({ options }, 'test-correlation-15');

      const concept = response.data?.concepts[0];
      // Breakfast default: ~400 calories
      expect(concept.targetNutrition.calories).toBe(400);
    });
  });

  describe('Diversity Enforcement', () => {
    it('should generate unique recipe names', async () => {
      const options: GenerationOptions = { count: 20 };
      const response = await agent.process({ options }, 'test-correlation-16');

      const names = response.data?.concepts.map(c => c.name) || [];
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(20); // All unique
    });

    it('should rotate through difficulty levels', async () => {
      const options: GenerationOptions = { count: 9 };
      const response = await agent.process({ options }, 'test-correlation-17');

      const difficulties = response.data?.concepts.map(c => c.estimatedDifficulty) || [];
      expect(difficulties).toContain('easy');
      expect(difficulties).toContain('medium');
      expect(difficulties).toContain('hard');
    });

    it('should rotate through meal types for variety', async () => {
      const options: GenerationOptions = { count: 12 };
      const response = await agent.process({ options }, 'test-correlation-18');

      const mealTypes = response.data?.concepts.map(c => c.mealTypes[0]) || [];
      const uniqueMealTypes = new Set(mealTypes);
      expect(uniqueMealTypes.size).toBeGreaterThanOrEqual(3);
    });

    it('should validate diversity successfully', async () => {
      const options: GenerationOptions = { count: 10 };
      const response = await agent.process({ options }, 'test-correlation-19');

      const isDiverse = agent.validateDiversity(response.data?.concepts || []);
      expect(isDiverse).toBe(true);
    });

    it('should rotate through different main ingredients', async () => {
      const options: GenerationOptions = { count: 15 };
      const response = await agent.process({ options }, 'test-correlation-20');

      const ingredients = response.data?.concepts.map(c => c.mainIngredientTags[0]) || [];
      const uniqueIngredients = new Set(ingredients);
      expect(uniqueIngredients.size).toBeGreaterThan(5); // At least 6 different ingredients
    });
  });

  describe('Edge Cases', () => {
    it('should handle single recipe request', async () => {
      const options: GenerationOptions = { count: 1 };
      const response = await agent.process({ options }, 'test-correlation-21');

      expect(response.success).toBe(true);
      expect(response.data?.concepts).toHaveLength(1);
      expect(response.data?.strategy.chunks).toBe(1);
    });

    it('should handle large batch request (100 recipes)', async () => {
      const options: GenerationOptions = { count: 100 };
      const response = await agent.process({ options }, 'test-correlation-22');

      expect(response.success).toBe(true);
      expect(response.data?.concepts).toHaveLength(100);
      expect(response.data?.strategy.chunks).toBe(20); // 100/5
    });

    it('should handle empty dietary restrictions', async () => {
      const options: GenerationOptions = {
        count: 2,
        dietaryRestrictions: []
      };
      const response = await agent.process({ options }, 'test-correlation-23');

      expect(response.success).toBe(true);
      response.data?.concepts.forEach(concept => {
        expect(concept.dietaryTags).toEqual([]);
      });
    });

    it('should handle all nutrition constraints', async () => {
      const options: GenerationOptions = {
        count: 2,
        targetCalories: 600,
        minProtein: 30,
        maxProtein: 40,
        minCarbs: 60,
        maxCarbs: 80,
        minFat: 15,
        maxFat: 25
      };
      const response = await agent.process({ options }, 'test-correlation-24');

      response.data?.concepts.forEach(concept => {
        expect(concept.targetNutrition.protein).toBeGreaterThanOrEqual(30);
        expect(concept.targetNutrition.protein).toBeLessThanOrEqual(40);
        expect(concept.targetNutrition.carbs).toBeGreaterThanOrEqual(60);
        expect(concept.targetNutrition.carbs).toBeLessThanOrEqual(80);
        expect(concept.targetNutrition.fat).toBeGreaterThanOrEqual(15);
        expect(concept.targetNutrition.fat).toBeLessThanOrEqual(25);
      });
    });
  });

  describe('Metrics Tracking', () => {
    it('should track successful operations', async () => {
      const options: GenerationOptions = { count: 5 };
      await agent.process({ options }, 'test-correlation-25');

      const metrics = agent.getMetrics();
      expect(metrics.successCount).toBe(1);
      expect(metrics.operationCount).toBe(1);
    });

    it('should track multiple operations', async () => {
      const options: GenerationOptions = { count: 3 };
      await agent.process({ options }, 'correlation-1');
      await agent.process({ options }, 'correlation-2');
      await agent.process({ options }, 'correlation-3');

      const metrics = agent.getMetrics();
      expect(metrics.operationCount).toBe(3);
      expect(metrics.successCount).toBe(3);
    });
  });
});
