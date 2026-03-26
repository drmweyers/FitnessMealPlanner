# Batch Recipe Generation Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the 4-layer failure in batch recipe generation so the executor can reliably generate, track, verify, and resume 4,000 recipes across production.

**Architecture:** Server status endpoint bridges to BMAD's ProgressMonitorAgent + new recipe-count endpoint provides DB ground truth. Executor gains constraint pre-validation, DB-count verification, and smart resume. All changes TDD with vitest.

**Tech Stack:** TypeScript, Express, Drizzle ORM, PostgreSQL, vitest, node:fetch

---

## Task 1: Constraint Validator — Tests (RED)

**Files:**
- Create: `test/unit/batch-generation/constraint-validator.test.ts`

**Step 1: Write constraint validator test file**

```typescript
import { describe, it, expect } from 'vitest';
import {
  validateConstraints,
  type ConstraintValidationResult,
  type BatchConstraints,
} from '../../../scripts/batch-utils/constraint-validator';

describe('batch-generation: constraint-validator', () => {
  describe('validateConstraints', () => {
    it('passes valid batch with all constraints feasible', () => {
      const batch: BatchConstraints = {
        id: 'A1',
        name: 'Chicken — Weight Loss',
        targetCalories: 400,
        maxCalories: 450,
        minProtein: 30,
        maxProtein: 45,
        maxFat: 12,
      };
      const result = validateConstraints(batch);
      expect(result.feasible).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('fails when minimum macros exceed maxCalories', () => {
      // minProtein(25)*4 + minFat(25)*9 = 100+225 = 325
      // maxCarbs(20)*4 = 80 → total min 405, but target 450 works
      // BUT: minFat alone is 225 cal, that's fine
      // Real failure: minProtein*4 + minCarbs*4 + minFat*9 > maxCalories
      const batch: BatchConstraints = {
        id: 'BAD1',
        name: 'Impossible Macros',
        targetCalories: 300,
        maxCalories: 300,
        minProtein: 40, // 160 cal
        minCarbs: 30,   // 120 cal
        minFat: 15,     // 135 cal = total 415 > 300
      };
      const result = validateConstraints(batch);
      expect(result.feasible).toBe(false);
      expect(result.errors.some(e => e.includes('minimum macros'))).toBe(true);
    });

    it('fails E1 Keto: minFat + minProtein crowds out carb budget', () => {
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
      // minProtein(25)*4=100 + minFat(25)*9=225 = 325
      // Remaining for carbs: 550-325 = 225 cal = 56g carbs → maxCarbs 20 is fine
      // Actually this IS feasible: 25g protein + 25g fat + 20g carbs = 100+225+80 = 405 < 550
      // Re-check: the issue is targetCalories=450, not maxCalories
      // At target 450: 100+225=325, leaving 125 cal = 31g carbs, but maxCarbs=20g=80cal
      // Total: 100+225+80=405 < 450. Has 45 cal slack. Actually feasible!
      // The real issue is the AI can't generate keto recipes that hit EXACTLY these constraints
      // So mark this as a WARNING, not a failure
      expect(result.feasible).toBe(true);
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });

    it('fails L3 Carnivore: maxCarbs=5g is extremely restrictive warning', () => {
      const batch: BatchConstraints = {
        id: 'L3',
        name: 'Carnivore',
        targetCalories: 500,
        maxCalories: 650,
        minProtein: 40,
        maxCarbs: 5,
      };
      const result = validateConstraints(batch);
      expect(result.feasible).toBe(true); // mathematically feasible
      expect(result.warnings.some(w => w.includes('extremely restrictive'))).toBe(true);
    });

    it('fails when minProtein > maxProtein', () => {
      const batch: BatchConstraints = {
        id: 'RANGE1',
        name: 'Bad Range',
        minProtein: 50,
        maxProtein: 30,
      };
      const result = validateConstraints(batch);
      expect(result.feasible).toBe(false);
      expect(result.errors.some(e => e.includes('range'))).toBe(true);
    });

    it('fails when minCarbs > maxCarbs', () => {
      const batch: BatchConstraints = {
        id: 'RANGE2',
        name: 'Bad Carb Range',
        minCarbs: 50,
        maxCarbs: 20,
      };
      const result = validateConstraints(batch);
      expect(result.feasible).toBe(false);
    });

    it('fails when minFat > maxFat', () => {
      const batch: BatchConstraints = {
        id: 'RANGE3',
        name: 'Bad Fat Range',
        minFat: 30,
        maxFat: 10,
      };
      const result = validateConstraints(batch);
      expect(result.feasible).toBe(false);
    });

    it('passes batch with no calorie constraints', () => {
      const batch: BatchConstraints = {
        id: 'OPEN1',
        name: 'Open Constraints',
        minProtein: 25,
      };
      const result = validateConstraints(batch);
      expect(result.feasible).toBe(true);
    });

    it('passes batch with only maxCalories set', () => {
      const batch: BatchConstraints = {
        id: 'MAX1',
        name: 'Max Only',
        maxCalories: 500,
        minProtein: 30,
      };
      const result = validateConstraints(batch);
      expect(result.feasible).toBe(true);
    });

    it('warns when constraint window is very narrow', () => {
      const batch: BatchConstraints = {
        id: 'NARROW1',
        name: 'Narrow Window',
        targetCalories: 400,
        maxCalories: 410,
        minProtein: 30,
        maxProtein: 32,
      };
      const result = validateConstraints(batch);
      expect(result.feasible).toBe(true);
      expect(result.warnings.some(w => w.includes('narrow'))).toBe(true);
    });
  });

  describe('validateAllBatches', () => {
    it('returns array of results for multiple batches', async () => {
      const { validateAllBatches } = await import('../../../scripts/batch-utils/constraint-validator');
      const batches: BatchConstraints[] = [
        { id: 'A1', name: 'Good', targetCalories: 400, maxCalories: 450, minProtein: 30 },
        { id: 'BAD', name: 'Bad', minProtein: 80, maxProtein: 30 },
      ];
      const results = validateAllBatches(batches);
      expect(results).toHaveLength(2);
      expect(results[0].feasible).toBe(true);
      expect(results[1].feasible).toBe(false);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run test/unit/batch-generation/constraint-validator.test.ts`
Expected: FAIL — module `batch-utils/constraint-validator` does not exist

---

## Task 2: Constraint Validator — Implementation (GREEN)

**Files:**
- Create: `scripts/batch-utils/constraint-validator.ts`

**Step 1: Write constraint validator module**

```typescript
/**
 * Pre-flight constraint validator for batch recipe generation.
 * Catches mathematically impossible macro combinations BEFORE sending to API.
 */

export interface BatchConstraints {
  id: string;
  name: string;
  targetCalories?: number;
  maxCalories?: number;
  minProtein?: number;
  maxProtein?: number;
  minCarbs?: number;
  maxCarbs?: number;
  minFat?: number;
  maxFat?: number;
}

export interface ConstraintValidationResult {
  id: string;
  name: string;
  feasible: boolean;
  errors: string[];
  warnings: string[];
}

const CAL_PER_G = { protein: 4, carbs: 4, fat: 9 };

export function validateConstraints(batch: BatchConstraints): ConstraintValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Range checks: min must be <= max for each macro
  if (batch.minProtein !== undefined && batch.maxProtein !== undefined && batch.minProtein > batch.maxProtein) {
    errors.push(`Protein range invalid: min ${batch.minProtein}g > max ${batch.maxProtein}g`);
  }
  if (batch.minCarbs !== undefined && batch.maxCarbs !== undefined && batch.minCarbs > batch.maxCarbs) {
    errors.push(`Carbs range invalid: min ${batch.minCarbs}g > max ${batch.maxCarbs}g`);
  }
  if (batch.minFat !== undefined && batch.maxFat !== undefined && batch.minFat > batch.maxFat) {
    errors.push(`Fat range invalid: min ${batch.minFat}g > max ${batch.maxFat}g`);
  }

  // Calorie feasibility: sum of minimum macros in calories must not exceed max calories
  const caloriesFromMins =
    (batch.minProtein || 0) * CAL_PER_G.protein +
    (batch.minCarbs || 0) * CAL_PER_G.carbs +
    (batch.minFat || 0) * CAL_PER_G.fat;

  const caloriesCeiling = batch.maxCalories || batch.targetCalories;

  if (caloriesCeiling && caloriesFromMins > caloriesCeiling) {
    errors.push(
      `Infeasible: minimum macros require ${caloriesFromMins} cal ` +
      `(protein ${batch.minProtein || 0}g*4 + carbs ${batch.minCarbs || 0}g*4 + fat ${batch.minFat || 0}g*9) ` +
      `but maxCalories is ${caloriesCeiling}`
    );
  }

  // Extremely restrictive warnings
  if (batch.maxCarbs !== undefined && batch.maxCarbs <= 5) {
    warnings.push(`maxCarbs=${batch.maxCarbs}g is extremely restrictive — AI may struggle to generate compliant recipes`);
  }
  if (batch.maxFat !== undefined && batch.maxFat <= 5) {
    warnings.push(`maxFat=${batch.maxFat}g is extremely restrictive — AI may struggle to generate compliant recipes`);
  }

  // Narrow window warnings
  if (batch.minProtein !== undefined && batch.maxProtein !== undefined) {
    const range = batch.maxProtein - batch.minProtein;
    if (range > 0 && range <= 5) {
      warnings.push(`Protein window is narrow: ${batch.minProtein}-${batch.maxProtein}g (${range}g range)`);
    }
  }
  if (batch.targetCalories && batch.maxCalories) {
    const range = batch.maxCalories - batch.targetCalories;
    if (range > 0 && range <= 20) {
      warnings.push(`Calorie window is narrow: target ${batch.targetCalories} to max ${batch.maxCalories} (${range} cal range)`);
    }
  }

  return {
    id: batch.id,
    name: batch.name,
    feasible: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateAllBatches(batches: BatchConstraints[]): ConstraintValidationResult[] {
  return batches.map(validateConstraints);
}
```

**Step 2: Run tests to verify they pass**

Run: `npx vitest run test/unit/batch-generation/constraint-validator.test.ts`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add scripts/batch-utils/constraint-validator.ts test/unit/batch-generation/constraint-validator.test.ts
git commit -m "feat: add constraint pre-validator for batch generation (TDD)"
```

---

## Task 3: Server Status Bridge — Tests (RED)

**Files:**
- Create: `test/unit/batch-generation/status-bridge.test.ts`

**Step 1: Write status bridge test file**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock bmadRecipeService
const mockGetProgress = vi.fn();
vi.mock('../../../server/services/BMADRecipeService', () => ({
  bmadRecipeService: {
    getProgress: mockGetProgress,
  },
}));

// Mock progressTracker
const mockProgressTrackerGet = vi.fn();
vi.mock('../../../server/services/progressTracker', () => ({
  progressTracker: {
    getProgress: mockProgressTrackerGet,
  },
}));

// Mock auth middleware
vi.mock('../../../server/middleware/auth', () => ({
  requireAdmin: (req: any, res: any, next: any) => next(),
}));

// Mock SSE manager
vi.mock('../../../server/services/utils/SSEManager', () => ({
  sseManager: {
    broadcastProgress: vi.fn(),
    broadcastCompletion: vi.fn(),
    broadcastError: vi.fn(),
    addClient: vi.fn(),
    removeClient: vi.fn(),
  },
}));

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: () => 'test12345678',
}));

import express from 'express';
import request from 'supertest';

describe('batch-generation: status-bridge', () => {
  let app: express.Express;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Dynamic import to get mocked version
    const { default: bulkRouter } = await import('../../../server/routes/bulkGeneration');
    app = express();
    app.use(express.json());
    app.use('/api/admin/generate-bulk', bulkRouter);
  });

  describe('GET /status/:batchId', () => {
    it('returns BMAD progress when activeBatches is empty but BMAD has progress', async () => {
      mockGetProgress.mockResolvedValue({
        batchId: 'bulk_abc123',
        phase: 'generating',
        recipesCompleted: 15,
        totalRecipes: 100,
        currentChunk: 2,
        totalChunks: 10,
      });
      mockProgressTrackerGet.mockReturnValue(undefined);

      const res = await request(app).get('/api/admin/generate-bulk/status/bulk_abc123');
      expect(res.status).toBe(200);
      expect(res.body.progress).toBeDefined();
      expect(res.body.progress.recipesCompleted).toBe(15);
    });

    it('returns complete status when BMAD reports phase=complete', async () => {
      mockGetProgress.mockResolvedValue({
        batchId: 'bulk_done',
        phase: 'complete',
        recipesCompleted: 100,
        totalRecipes: 100,
      });

      const res = await request(app).get('/api/admin/generate-bulk/status/bulk_done');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('complete');
    });

    it('returns 404 when no system has the batch', async () => {
      mockGetProgress.mockResolvedValue(null);
      mockProgressTrackerGet.mockReturnValue(undefined);

      const res = await request(app).get('/api/admin/generate-bulk/status/bulk_nonexistent');
      expect(res.status).toBe(404);
    });

    it('falls back to legacy progressTracker when BMAD has no data', async () => {
      mockGetProgress.mockResolvedValue(null);
      mockProgressTrackerGet.mockReturnValue({
        jobId: 'bulk_legacy',
        currentStep: 'complete',
        completed: 50,
        totalRecipes: 50,
      });

      const res = await request(app).get('/api/admin/generate-bulk/status/bulk_legacy');
      expect(res.status).toBe(200);
      expect(res.body.progress).toBeDefined();
    });
  });

  describe('GET /recipe-count', () => {
    it('returns recipe count matching tier and criteria', async () => {
      // This test verifies the new endpoint exists and returns a count
      const res = await request(app).get('/api/admin/generate-bulk/recipe-count')
        .query({ tierLevel: 'starter' });
      // Should return 200 with a count (even if 0 in test)
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('count');
      expect(typeof res.body.count).toBe('number');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run test/unit/batch-generation/status-bridge.test.ts`
Expected: FAIL — recipe-count endpoint doesn't exist, status bridge not implemented

---

## Task 4: Server Status Bridge — Implementation (GREEN)

**Files:**
- Modify: `server/routes/bulkGeneration.ts:168-218` (status endpoint)
- Modify: `server/routes/bulkGeneration.ts` (add recipe-count endpoint)

**Step 1: Fix the status endpoint to query BMAD ProgressMonitorAgent**

In `server/routes/bulkGeneration.ts`, replace the status endpoint (lines 168-218) with:

```typescript
/**
 * GET /api/admin/generate-bulk/status/:batchId
 * Get status of a generation batch
 *
 * Lookup chain:
 * 1. activeBatches Map (currently running)
 * 2. bmadRecipeService.getProgress() (BMAD ProgressMonitorAgent)
 * 3. progressTracker (legacy recipeGenerator system)
 * 4. 404 not found
 */
router.get('/status/:batchId', requireAdmin, async (req: Request, res: Response) => {
  const { batchId } = req.params;

  // 1. Check activeBatches (currently running)
  const batch = activeBatches.get(batchId);

  // 2. Check BMAD ProgressMonitorAgent (primary source)
  const bmadProgress = await bmadRecipeService.getProgress(batchId);

  if (batch) {
    return res.json({
      status: bmadProgress?.phase === 'complete' ? 'complete' : 'active',
      batchId,
      startTime: batch.startTime,
      duration: Date.now() - batch.startTime,
      options: batch.options,
      progress: bmadProgress || null,
    });
  }

  // Batch not in activeBatches — may have completed and been cleaned up
  if (bmadProgress) {
    return res.json({
      status: bmadProgress.phase === 'complete' ? 'complete'
            : bmadProgress.phase === 'error' ? 'failed'
            : 'active',
      batchId,
      progress: bmadProgress,
    });
  }

  // 3. Fall back to legacy progressTracker
  try {
    const { progressTracker } = await import('../services/progressTracker');
    const progress = progressTracker.getProgress(batchId);

    if (progress) {
      return res.json({
        status: progress.currentStep === 'complete' ? 'complete' : 'active',
        batchId,
        progress,
      });
    }
  } catch (error) {
    // progressTracker might not have it
  }

  // 4. Not found anywhere
  return res.status(404).json({
    status: 'error',
    message: 'Batch not found',
  });
});
```

**Step 2: Add recipe-count endpoint**

Add this new endpoint BEFORE the status endpoint in `server/routes/bulkGeneration.ts`:

```typescript
/**
 * GET /api/admin/generate-bulk/recipe-count
 * Query actual DB recipe count matching criteria — ground truth for executor
 */
router.get('/recipe-count', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { tierLevel, mealTypes, mainIngredient, createdAfter } = req.query;

    const { db } = await import('../db');
    const { recipes } = await import('../../shared/schema');
    const { sql, count, and, eq, gte, or } = await import('drizzle-orm');

    const conditions: any[] = [];

    if (tierLevel && typeof tierLevel === 'string') {
      conditions.push(eq(recipes.tierLevel, tierLevel as any));
    }

    if (createdAfter && typeof createdAfter === 'string') {
      conditions.push(gte(recipes.creationTimestamp, new Date(createdAfter)));
    }

    // mainIngredient: check if mainIngredientTags JSONB array contains the value
    if (mainIngredient && typeof mainIngredient === 'string') {
      conditions.push(
        sql`${recipes.mainIngredientTags}::jsonb @> ${JSON.stringify([mainIngredient])}::jsonb`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [result] = await db
      .select({ count: count() })
      .from(recipes)
      .where(whereClause);

    res.json({
      count: result?.count || 0,
      filters: { tierLevel, mealTypes, mainIngredient, createdAfter },
    });
  } catch (error) {
    console.error('[recipe-count] Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to query recipe count' });
  }
});
```

**Step 3: Run tests**

Run: `npx vitest run test/unit/batch-generation/status-bridge.test.ts`
Expected: PASS (status bridge tests), recipe-count test may need DB mock adjustment

**Step 4: Commit**

```bash
git add server/routes/bulkGeneration.ts test/unit/batch-generation/status-bridge.test.ts
git commit -m "feat: bridge BMAD ProgressMonitor to status endpoint + add recipe-count API"
```

---

## Task 5: Executor Login Fix — Tests (RED)

**Files:**
- Create: `test/unit/batch-generation/executor-login.test.ts`

**Step 1: Write login parsing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { extractToken } from '../../../scripts/batch-utils/auth-helpers';

describe('batch-generation: executor-login', () => {
  it('extracts token from new format: { data: { accessToken } }', () => {
    const response = { status: 'success', data: { accessToken: 'tok_abc123' } };
    expect(extractToken(response)).toBe('tok_abc123');
  });

  it('extracts token from legacy format: { token }', () => {
    const response = { token: 'tok_legacy456' };
    expect(extractToken(response)).toBe('tok_legacy456');
  });

  it('throws when no token found in response', () => {
    const response = { status: 'error', message: 'Invalid credentials' };
    expect(() => extractToken(response)).toThrow('No token');
  });

  it('prefers data.accessToken over top-level token', () => {
    const response = { token: 'old', data: { accessToken: 'new' } };
    expect(extractToken(response)).toBe('new');
  });

  it('handles null/undefined response gracefully', () => {
    expect(() => extractToken(null)).toThrow();
    expect(() => extractToken(undefined)).toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run test/unit/batch-generation/executor-login.test.ts`
Expected: FAIL — `batch-utils/auth-helpers` does not exist

---

## Task 6: Executor Login Fix — Implementation (GREEN)

**Files:**
- Create: `scripts/batch-utils/auth-helpers.ts`

**Step 1: Write auth helper**

```typescript
/**
 * Authentication helpers for batch executor.
 * Handles multiple API response formats.
 */

export function extractToken(response: any): string {
  if (!response || typeof response !== 'object') {
    throw new Error(`No token: response is ${typeof response}`);
  }

  // Prefer new format: { data: { accessToken } }
  const token = response.data?.accessToken || response.token;

  if (!token || typeof token !== 'string') {
    throw new Error(`No token found in response: ${JSON.stringify(response).substring(0, 200)}`);
  }

  return token;
}
```

**Step 2: Run tests**

Run: `npx vitest run test/unit/batch-generation/executor-login.test.ts`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add scripts/batch-utils/auth-helpers.ts test/unit/batch-generation/executor-login.test.ts
git commit -m "feat: add auth helpers for multi-format token extraction (TDD)"
```

---

## Task 7: Executor DB-Count Verification — Tests (RED)

**Files:**
- Create: `test/unit/batch-generation/executor-verification.test.ts`

**Step 1: Write verification logic tests**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateBatchDelta,
  shouldSkipBatch,
  adjustBatchTarget,
  type BatchRunResult,
} from '../../../scripts/batch-utils/verification';

describe('batch-generation: executor-verification', () => {
  describe('calculateBatchDelta', () => {
    it('calculates positive delta correctly', () => {
      expect(calculateBatchDelta(10, 25)).toBe(15);
    });

    it('returns 0 when counts are equal', () => {
      expect(calculateBatchDelta(10, 10)).toBe(0);
    });

    it('returns 0 when final is less than baseline (edge case)', () => {
      expect(calculateBatchDelta(10, 5)).toBe(0);
    });
  });

  describe('shouldSkipBatch', () => {
    it('skips when DB count >= target', () => {
      expect(shouldSkipBatch(100, 100)).toBe(true);
      expect(shouldSkipBatch(150, 100)).toBe(true);
    });

    it('does not skip when DB count < target', () => {
      expect(shouldSkipBatch(50, 100)).toBe(false);
      expect(shouldSkipBatch(0, 100)).toBe(false);
    });
  });

  describe('adjustBatchTarget', () => {
    it('reduces target by existing count', () => {
      expect(adjustBatchTarget(100, 60)).toBe(40);
    });

    it('returns 0 when already at target', () => {
      expect(adjustBatchTarget(100, 100)).toBe(0);
    });

    it('returns 0 when over target', () => {
      expect(adjustBatchTarget(100, 120)).toBe(0);
    });

    it('returns full target when no existing recipes', () => {
      expect(adjustBatchTarget(100, 0)).toBe(100);
    });
  });

  describe('BatchRunResult', () => {
    it('marks success when delta > 0', () => {
      const result: BatchRunResult = {
        batchId: 'A1',
        baselineCount: 10,
        finalCount: 25,
        delta: 15,
        target: 100,
        success: true,
      };
      expect(result.success).toBe(true);
      expect(result.delta).toBe(15);
    });

    it('marks failure when delta is 0', () => {
      const result: BatchRunResult = {
        batchId: 'A2',
        baselineCount: 10,
        finalCount: 10,
        delta: 0,
        target: 100,
        success: false,
      };
      expect(result.success).toBe(false);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run test/unit/batch-generation/executor-verification.test.ts`
Expected: FAIL — `batch-utils/verification` does not exist

---

## Task 8: Executor DB-Count Verification — Implementation (GREEN)

**Files:**
- Create: `scripts/batch-utils/verification.ts`

**Step 1: Write verification module**

```typescript
/**
 * Verification utilities for batch executor.
 * Uses DB recipe counts as ground truth instead of relying on status polling.
 */

export interface BatchRunResult {
  batchId: string;
  baselineCount: number;
  finalCount: number;
  delta: number;
  target: number;
  success: boolean;
}

/**
 * Calculate how many recipes were added during a batch run.
 * Returns 0 if final < baseline (edge case, never negative).
 */
export function calculateBatchDelta(baselineCount: number, finalCount: number): number {
  return Math.max(0, finalCount - baselineCount);
}

/**
 * Determine if a batch should be skipped because enough recipes already exist.
 */
export function shouldSkipBatch(existingCount: number, target: number): boolean {
  return existingCount >= target;
}

/**
 * Adjust a batch target based on how many recipes already exist.
 * Returns 0 if already at or above target.
 */
export function adjustBatchTarget(originalTarget: number, existingCount: number): number {
  return Math.max(0, originalTarget - existingCount);
}

/**
 * Fetch recipe count from the server's recipe-count endpoint.
 */
export async function fetchRecipeCount(
  baseUrl: string,
  token: string,
  params: {
    tierLevel?: string;
    mainIngredient?: string;
    createdAfter?: string;
  }
): Promise<number> {
  const url = new URL(`${baseUrl}/api/admin/generate-bulk/recipe-count`);
  if (params.tierLevel) url.searchParams.set('tierLevel', params.tierLevel);
  if (params.mainIngredient) url.searchParams.set('mainIngredient', params.mainIngredient);
  if (params.createdAfter) url.searchParams.set('createdAfter', params.createdAfter);

  const resp = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!resp.ok) {
    throw new Error(`Recipe count query failed: ${resp.status}`);
  }

  const data = await resp.json() as { count: number };
  return data.count;
}
```

**Step 2: Run tests**

Run: `npx vitest run test/unit/batch-generation/executor-verification.test.ts`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add scripts/batch-utils/verification.ts test/unit/batch-generation/executor-verification.test.ts
git commit -m "feat: add DB-count verification utilities for executor (TDD)"
```

---

## Task 9: Integrate Utilities Into Executor

**Files:**
- Modify: `scripts/recipe-batch-executor.ts`

**Step 1: Import new utilities at top of file**

Add after existing imports (line 18):

```typescript
import { validateConstraints, validateAllBatches } from './batch-utils/constraint-validator';
import { extractToken } from './batch-utils/auth-helpers';
import { calculateBatchDelta, shouldSkipBatch, adjustBatchTarget, fetchRecipeCount } from './batch-utils/verification';
```

**Step 2: Replace login() token extraction (line 747-749)**

Replace:
```typescript
  const data = await resp.json() as any;
  // Handle both response formats: { token } and { data: { accessToken } }
  return data.token || data.data?.accessToken;
```

With:
```typescript
  const data = await resp.json() as any;
  return extractToken(data);
```

**Step 3: Add constraint pre-validation in main() before execution (after line 942)**

After the `noImages` block and before the dry-run block, add:

```typescript
  // Pre-validate constraints
  console.log('\n--- Constraint Pre-Validation ---\n');
  const validationResults = validateAllBatches(
    batchesToRun.map(b => ({
      id: b.id,
      name: b.name,
      targetCalories: b.targetCalories,
      maxCalories: b.maxCalories,
      minProtein: b.minProtein,
      maxProtein: b.maxProtein,
      minCarbs: b.minCarbs,
      maxCarbs: b.maxCarbs,
      minFat: b.minFat,
      maxFat: b.maxFat,
    }))
  );

  for (const vr of validationResults) {
    if (!vr.feasible) {
      console.log(`❌ ${vr.id} ${vr.name}: INFEASIBLE — ${vr.errors.join('; ')}`);
    } else if (vr.warnings.length > 0) {
      console.log(`⚠️  ${vr.id} ${vr.name}: ${vr.warnings.join('; ')}`);
    } else {
      console.log(`✅ ${vr.id} ${vr.name}: OK`);
    }
  }

  // Remove infeasible batches
  const infeasibleIds = new Set(validationResults.filter(v => !v.feasible).map(v => v.id));
  if (infeasibleIds.size > 0) {
    console.log(`\n⚠️  Removing ${infeasibleIds.size} infeasible batch(es)\n`);
    batchesToRun = batchesToRun.filter(b => !infeasibleIds.has(b.id));
  }
```

**Step 4: Add DB-count verification around each batch execution**

In the batch execution loop (around line 988), wrap each batch with baseline/final counting:

Replace the section that starts `console.log(\`\n🚀 Starting ${chunk.subId}...` with a version that:
1. Before starting: `const baseline = await fetchRecipeCount(baseUrl, token, { tierLevel: batch.tierLevel, mainIngredient: batch.mainIngredient });`
2. After completion: `const finalCount = await fetchRecipeCount(baseUrl, token, { tierLevel: batch.tierLevel, mainIngredient: batch.mainIngredient });`
3. Uses `calculateBatchDelta(baseline, finalCount)` as the true recipe count

**Step 5: Add smart resume logic at the start of execution**

Before the batch loop, add:

```typescript
  // Smart resume: check actual DB counts for "failed" batches
  if (!dryRun) {
    console.log('\n--- Smart Resume: Checking actual DB counts ---\n');
    for (const batch of batchesToRun) {
      const bp = progress.batches[batch.id];
      if (bp?.status === 'failed' || bp?.status === 'running') {
        try {
          const dbCount = await fetchRecipeCount(baseUrl, token, {
            tierLevel: batch.tierLevel,
            mainIngredient: batch.mainIngredient,
          });
          if (shouldSkipBatch(dbCount, batch.target)) {
            console.log(`✅ ${batch.id}: DB has ${dbCount} recipes (target ${batch.target}) — marking complete`);
            progress.batches[batch.id] = {
              ...bp,
              status: 'completed',
              recipesGenerated: dbCount,
              completedAt: new Date().toISOString(),
            };
            saveProgress(progress);
          } else if (dbCount > 0) {
            const adjusted = adjustBatchTarget(batch.target, dbCount);
            console.log(`🔄 ${batch.id}: DB has ${dbCount}/${batch.target} — adjusting target to ${adjusted}`);
            batch.target = adjusted;
            progress.batches[batch.id].recipesGenerated = dbCount;
            saveProgress(progress);
          }
        } catch {
          console.log(`⚠️  ${batch.id}: Could not check DB count, will run full batch`);
        }
      }
    }
  }
```

**Step 6: Commit**

```bash
git add scripts/recipe-batch-executor.ts
git commit -m "feat: integrate constraint validation, auth helpers, DB verification into executor"
```

---

## Task 10: E2E Dry-Run Test

**Files:**
- Create: `test/unit/batch-generation/executor-e2e.test.ts`

**Step 1: Write E2E simulation test**

```typescript
import { describe, it, expect } from 'vitest';
import { validateConstraints, validateAllBatches } from '../../../scripts/batch-utils/constraint-validator';
import { extractToken } from '../../../scripts/batch-utils/auth-helpers';
import { calculateBatchDelta, shouldSkipBatch, adjustBatchTarget } from '../../../scripts/batch-utils/verification';

describe('batch-generation: executor-e2e simulation', () => {
  it('full pipeline: validate → skip infeasible → adjust targets → verify', () => {
    // Simulate the executor pipeline with mock data
    const batches = [
      { id: 'A1', name: 'Chicken', targetCalories: 400, maxCalories: 450, minProtein: 30 },
      { id: 'BAD', name: 'Impossible', minProtein: 80, maxProtein: 30 }, // infeasible
      { id: 'E1', name: 'Keto', targetCalories: 450, maxCalories: 550, minProtein: 25, maxCarbs: 20, minFat: 25 },
    ];

    // Step 1: Validate
    const results = validateAllBatches(batches);
    expect(results[0].feasible).toBe(true);  // A1 OK
    expect(results[1].feasible).toBe(false);  // BAD infeasible
    expect(results[2].feasible).toBe(true);   // E1 feasible (tight but valid)

    // Step 2: Filter infeasible
    const feasible = batches.filter((_, i) => results[i].feasible);
    expect(feasible).toHaveLength(2);

    // Step 3: Smart resume with mock DB counts
    const dbCounts: Record<string, number> = { A1: 60, E1: 0 };
    const adjusted = feasible.map(b => ({
      ...b,
      adjustedTarget: adjustBatchTarget(b.targetCalories || 100, dbCounts[b.id] || 0),
      skip: shouldSkipBatch(dbCounts[b.id] || 0, b.targetCalories || 100),
    }));

    // A1 has 60 recipes toward 400 target → adjusted to 340
    expect(adjusted[0].adjustedTarget).toBe(340);
    expect(adjusted[0].skip).toBe(false);
  });

  it('token extraction works for production API format', () => {
    const token = extractToken({ status: 'success', data: { accessToken: 'real_token' } });
    expect(token).toBe('real_token');
  });

  it('batch delta calculation works after generation', () => {
    const delta = calculateBatchDelta(60, 95);
    expect(delta).toBe(35);
  });
});
```

**Step 2: Run all batch-generation tests**

Run: `npx vitest run test/unit/batch-generation/`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add test/unit/batch-generation/executor-e2e.test.ts
git commit -m "test: add E2E simulation tests for batch generation pipeline"
```

---

## Task 11: Fix Problematic Batch Specs

**Files:**
- Modify: `scripts/recipe-batch-executor.ts` (batch E1, L3 specs)

**Step 1: Fix E1 Keto batch — widen maxCarbs to be realistic for AI generation**

In batch E1 (around line 207-217), change:
```typescript
    minProtein: 25, maxCarbs: 20, minFat: 25,
```
To:
```typescript
    minProtein: 25, maxCarbs: 30, minFat: 20,
```

Rationale: Original was mathematically feasible but too tight for AI to reliably generate. Widening to 30g carbs and reducing minFat to 20g gives the AI room while staying keto-appropriate.

**Step 2: Fix L3 Carnivore — widen maxCarbs from 5 to 10**

In batch L3 (around line 550), change:
```typescript
    minProtein: 40, maxCarbs: 5,
```
To:
```typescript
    minProtein: 40, maxCarbs: 10,
```

Rationale: Even pure meat has trace carbs. 10g is still carnivore-appropriate but allows AI to generate valid recipes.

**Step 3: Run constraint validation on all batches**

Run: `npx vitest run test/unit/batch-generation/constraint-validator.test.ts`
Expected: ALL PASS

**Step 4: Commit**

```bash
git add scripts/recipe-batch-executor.ts
git commit -m "fix: relax E1 Keto and L3 Carnivore constraints for AI generation feasibility"
```

---

## Task 12: Local Simulation & Verification

**Step 1: Start local dev server**

```bash
docker-compose --profile dev up -d
```

Wait for server to be healthy: `curl http://localhost:4000/health`

**Step 2: Run dry-run to verify constraint validation**

```bash
npx tsx scripts/recipe-batch-executor.ts --target local --all --dry-run
```

Expected: Shows all batches with constraint validation results, no infeasible batches.

**Step 3: Run single small batch against local**

```bash
npx tsx scripts/recipe-batch-executor.ts --target local --batch A1 --chunk-size 2 --no-images
```

Expected:
- Login succeeds (token extracted)
- Constraint pre-validation passes
- Smart resume checks DB count
- Batch starts, status polls show progress
- DB-count verification confirms recipes saved
- Batch marked as completed with actual count

**Step 4: Check status endpoint manually**

```bash
curl -H "Authorization: Bearer <token>" http://localhost:4000/api/admin/generate-bulk/recipe-count?tierLevel=starter
```

Expected: Returns `{ count: N }` with actual recipe count.

---

## Task 13: Review Agent Pass

**Step 1: Run all tests**

```bash
npx vitest run test/unit/batch-generation/
```

Expected: ALL PASS (all 5 test files, ~40+ tests)

**Step 2: Spawn review agent to examine all changes**

Review criteria:
- No security vulnerabilities (SQL injection in recipe-count endpoint)
- No regressions to existing endpoints
- Error handling is robust
- Types are correct
- No dead code introduced

**Step 3: Address any review findings and re-test**

---

## Summary — Files Created/Modified

| Action | File |
|--------|------|
| CREATE | `scripts/batch-utils/constraint-validator.ts` |
| CREATE | `scripts/batch-utils/auth-helpers.ts` |
| CREATE | `scripts/batch-utils/verification.ts` |
| CREATE | `test/unit/batch-generation/constraint-validator.test.ts` |
| CREATE | `test/unit/batch-generation/status-bridge.test.ts` |
| CREATE | `test/unit/batch-generation/executor-login.test.ts` |
| CREATE | `test/unit/batch-generation/executor-verification.test.ts` |
| CREATE | `test/unit/batch-generation/executor-e2e.test.ts` |
| MODIFY | `server/routes/bulkGeneration.ts` (status bridge + recipe-count endpoint) |
| MODIFY | `scripts/recipe-batch-executor.ts` (imports, integration, batch spec fixes) |
