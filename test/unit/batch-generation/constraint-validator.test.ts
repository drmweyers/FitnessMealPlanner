import { describe, it, expect } from 'vitest';
import {
  validateConstraints,
  validateAllBatches,
  ConstraintValidationResult,
  BatchConstraints,
} from '../../../scripts/batch-utils/constraint-validator';

describe('constraint-validator', () => {
  describe('validateConstraints', () => {
    it('passes valid batch with all constraints feasible (A1-style)', () => {
      const batch: BatchConstraints = {
        id: 'A1',
        name: 'Standard Healthy',
        targetCalories: 400,
        maxCalories: 450,
        minProtein: 30,
        maxProtein: 45,
        maxFat: 12,
      };

      const result = validateConstraints(batch);

      expect(result.feasible).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.id).toBe('A1');
      expect(result.name).toBe('Standard Healthy');
    });

    it('fails when minimum macros exceed maxCalories', () => {
      // minProtein 40*4 + minCarbs 30*4 + minFat 15*9 = 160+120+135 = 415 > maxCal 300
      const batch: BatchConstraints = {
        id: 'X1',
        name: 'Impossible Macros',
        maxCalories: 300,
        minProtein: 40,
        minCarbs: 30,
        minFat: 15,
      };

      const result = validateConstraints(batch);

      expect(result.feasible).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => /calorie/i.test(e) || /exceed/i.test(e))).toBe(true);
    });

    it('E1 Keto batch is feasible but may warn', () => {
      const batch: BatchConstraints = {
        id: 'E1',
        name: 'Keto',
        targetCalories: 450,
        maxCalories: 550,
        minProtein: 25,
        maxCarbs: 20,
        minFat: 25,
      };

      const result = validateConstraints(batch);

      expect(result.feasible).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('L3 Carnivore: feasible but warns about extremely restrictive maxCarbs=5', () => {
      const batch: BatchConstraints = {
        id: 'L3',
        name: 'Carnivore',
        targetCalories: 500,
        maxCalories: 600,
        minProtein: 40,
        maxCarbs: 5,
        minFat: 20,
      };

      const result = validateConstraints(batch);

      expect(result.feasible).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => /restrictive/i.test(w) || /carb/i.test(w))).toBe(true);
    });

    it('fails when minProtein > maxProtein', () => {
      const batch: BatchConstraints = {
        id: 'R1',
        name: 'Reversed Protein',
        targetCalories: 500,
        minProtein: 50,
        maxProtein: 30,
      };

      const result = validateConstraints(batch);

      expect(result.feasible).toBe(false);
      expect(result.errors.some((e) => /protein/i.test(e))).toBe(true);
    });

    it('fails when minCarbs > maxCarbs', () => {
      const batch: BatchConstraints = {
        id: 'R2',
        name: 'Reversed Carbs',
        targetCalories: 500,
        minCarbs: 60,
        maxCarbs: 20,
      };

      const result = validateConstraints(batch);

      expect(result.feasible).toBe(false);
      expect(result.errors.some((e) => /carb/i.test(e))).toBe(true);
    });

    it('fails when minFat > maxFat', () => {
      const batch: BatchConstraints = {
        id: 'R3',
        name: 'Reversed Fat',
        targetCalories: 500,
        minFat: 25,
        maxFat: 10,
      };

      const result = validateConstraints(batch);

      expect(result.feasible).toBe(false);
      expect(result.errors.some((e) => /fat/i.test(e))).toBe(true);
    });

    it('passes batch with no calorie constraints', () => {
      const batch: BatchConstraints = {
        id: 'N1',
        name: 'No Calorie Limits',
        minProtein: 30,
        maxProtein: 50,
        minCarbs: 20,
        maxCarbs: 60,
        minFat: 10,
        maxFat: 25,
      };

      const result = validateConstraints(batch);

      expect(result.feasible).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('passes batch with only maxCalories set', () => {
      const batch: BatchConstraints = {
        id: 'N2',
        name: 'Max Calories Only',
        maxCalories: 600,
        minProtein: 25,
        minCarbs: 30,
        minFat: 10,
      };

      // min cals = 25*4 + 30*4 + 10*9 = 100+120+90 = 310 <= 600
      const result = validateConstraints(batch);

      expect(result.feasible).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('warns when constraint window is very narrow', () => {
      const batch: BatchConstraints = {
        id: 'W1',
        name: 'Narrow Window',
        targetCalories: 400,
        maxCalories: 410,
        minProtein: 30,
        maxProtein: 32,
      };

      const result = validateConstraints(batch);

      expect(result.feasible).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(
        result.warnings.some((w) => /narrow/i.test(w) || /tight/i.test(w) || /protein/i.test(w))
      ).toBe(true);
    });
  });

  describe('validateAllBatches', () => {
    it('returns array of results for multiple batches', () => {
      const batches: BatchConstraints[] = [
        {
          id: 'A1',
          name: 'Valid Batch',
          targetCalories: 400,
          maxCalories: 450,
          minProtein: 30,
          maxProtein: 45,
        },
        {
          id: 'X1',
          name: 'Invalid Batch',
          maxCalories: 200,
          minProtein: 40,
          minCarbs: 30,
          minFat: 15,
        },
      ];

      const results = validateAllBatches(batches);

      expect(results).toHaveLength(2);
      expect(results[0].feasible).toBe(true);
      expect(results[0].id).toBe('A1');
      expect(results[1].feasible).toBe(false);
      expect(results[1].id).toBe('X1');
    });
  });
});
