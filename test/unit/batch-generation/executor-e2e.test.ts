import { describe, it, expect } from 'vitest';
import { validateConstraints, validateAllBatches } from '../../../scripts/batch-utils/constraint-validator';
import { extractToken } from '../../../scripts/batch-utils/auth-helpers';
import { calculateBatchDelta, shouldSkipBatch, adjustBatchTarget } from '../../../scripts/batch-utils/verification';

describe('batch-generation: executor-e2e simulation', () => {
  it('full pipeline: validate → filter infeasible → adjust targets → verify', () => {
    // Simulate the executor pipeline with mock data
    const batches = [
      { id: 'A1', name: 'Chicken Weight Loss', targetCalories: 400, maxCalories: 450, minProtein: 30, maxProtein: 45, maxFat: 12 },
      { id: 'BAD', name: 'Impossible Macros', targetCalories: 300, maxCalories: 300, minProtein: 40, minCarbs: 30, minFat: 15 },
      { id: 'E1', name: 'Keto', targetCalories: 450, maxCalories: 550, minProtein: 25, maxCarbs: 30, minFat: 20 },
    ];

    // Step 1: Validate all batches
    const results = validateAllBatches(batches);
    expect(results[0].feasible).toBe(true);   // A1 OK
    expect(results[1].feasible).toBe(false);   // BAD infeasible (415 cal min > 300 max)
    expect(results[2].feasible).toBe(true);    // E1 feasible with relaxed constraints

    // Step 2: Filter infeasible
    const feasible = batches.filter((_, i) => results[i].feasible);
    expect(feasible).toHaveLength(2);
    expect(feasible.map(b => b.id)).toEqual(['A1', 'E1']);
  });

  it('smart resume: adjusts targets based on existing DB counts', () => {
    // Simulate: batch A1 has 60 recipes, target 100
    const existing = 60;
    const target = 100;

    expect(shouldSkipBatch(existing, target)).toBe(false); // not complete
    expect(adjustBatchTarget(target, existing)).toBe(40);  // need 40 more

    // Simulate: batch B1 has 100 recipes, target 100
    expect(shouldSkipBatch(100, 100)).toBe(true);  // complete
    expect(adjustBatchTarget(100, 100)).toBe(0);   // need 0 more

    // Simulate: batch over-delivered
    expect(shouldSkipBatch(120, 100)).toBe(true);
    expect(adjustBatchTarget(100, 120)).toBe(0);
  });

  it('token extraction works for production API format', () => {
    const token = extractToken({ status: 'success', data: { accessToken: 'real_token_123' } });
    expect(token).toBe('real_token_123');
  });

  it('token extraction works for legacy format', () => {
    const token = extractToken({ token: 'legacy_token_456' });
    expect(token).toBe('legacy_token_456');
  });

  it('batch delta calculation after generation run', () => {
    // Before run: 60 recipes, after run: 95 recipes
    const delta = calculateBatchDelta(60, 95);
    expect(delta).toBe(35);

    // Edge: no new recipes (generation failed but no data lost)
    expect(calculateBatchDelta(60, 60)).toBe(0);

    // Edge: somehow fewer recipes (should never happen, but handle gracefully)
    expect(calculateBatchDelta(60, 55)).toBe(0);
  });

  it('full lifecycle simulation: validate → resume → generate → verify', () => {
    // --- Phase 1: Constraint Validation ---
    const batchSpecs = [
      { id: 'A1', name: 'Chicken', targetCalories: 400, maxCalories: 450, minProtein: 30 },
      { id: 'B1', name: 'Salmon', targetCalories: 450, maxCalories: 520, minProtein: 30 },
      { id: 'INVALID', name: 'Bad', minProtein: 100, maxProtein: 20 }, // range error
    ];

    const validation = validateAllBatches(batchSpecs);
    const validBatches = batchSpecs.filter((_, i) => validation[i].feasible);
    expect(validBatches).toHaveLength(2); // INVALID removed

    // --- Phase 2: Smart Resume ---
    const mockDbCounts: Record<string, number> = { A1: 80, B1: 0 };
    const adjustedBatches = validBatches.map(b => {
      const dbCount = mockDbCounts[b.id] || 0;
      const skip = shouldSkipBatch(dbCount, b.targetCalories || 100);
      const adjustedTarget = adjustBatchTarget(b.targetCalories || 100, dbCount);
      return { ...b, adjustedTarget, skip, existingCount: dbCount };
    });

    expect(adjustedBatches[0].adjustedTarget).toBe(320); // A1: 400 - 80
    expect(adjustedBatches[0].skip).toBe(false);
    expect(adjustedBatches[1].adjustedTarget).toBe(450); // B1: 450 - 0
    expect(adjustedBatches[1].skip).toBe(false);

    // --- Phase 3: Simulate Generation ---
    // (Mock: A1 generates 50 more, B1 generates 100)
    const mockResults = [
      { batchId: 'A1', baseline: 80, final: 130, target: 320 },
      { batchId: 'B1', baseline: 0, final: 100, target: 450 },
    ];

    // --- Phase 4: Verify ---
    for (const r of mockResults) {
      const delta = calculateBatchDelta(r.baseline, r.final);
      expect(delta).toBeGreaterThan(0);
    }

    expect(calculateBatchDelta(80, 130)).toBe(50);  // A1: +50
    expect(calculateBatchDelta(0, 100)).toBe(100);   // B1: +100
  });
});
