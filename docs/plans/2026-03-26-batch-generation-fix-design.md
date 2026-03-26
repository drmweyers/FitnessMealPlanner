# Batch Recipe Generation Fix — Design Document

**Date:** 2026-03-26
**Status:** Approved
**Approach:** A — "Fix the Plumbing" (Minimal Server Fix + Smart Executor)

---

## Problem Statement

The batch executor ran 31 batches against production over ~10 hours. All were marked "failed: 0 recipes generated" but production actually received 1,373 new recipes. The executor was blind to success due to 4 distinct failure layers.

### Root Causes

| # | Failure | Location | Impact |
|---|---------|----------|--------|
| 1 | **Status Polling Disconnect** | `bulkGeneration.ts:168-218` queries `progressTracker`, but BMAD uses `ProgressMonitorAgent` — separate systems, never connected | Executor always sees 0 recipes, times out |
| 2 | **Batch Cleanup Race** | `bulkGeneration.ts:315` deletes from `activeBatches` on completion → status returns 404 | Executor can't detect completion |
| 3 | **Impossible Constraints** | Batches E1, I1, L3 have mathematically infeasible macro combinations | 100% validation rejection, wasted API credits |
| 4 | **Login Token Format** | API returns `{ data: { accessToken } }`, executor expected `{ token }` | Auth failures (partially fixed) |

---

## Design

### Section 1: Server-Side Status Bridge

**File:** `server/routes/bulkGeneration.ts:168-218`

Add `bmadRecipeService.progressAgent` as a lookup source in the status endpoint:

```
Status lookup chain:
1. activeBatches Map (currently running)
2. bmadRecipeService.progressAgent.getProgress(batchId)  ← NEW
3. progressTracker.getProgress(batchId) (legacy)
4. 404 not found
```

**New endpoint:** `GET /api/admin/generate-bulk/recipe-count`

Query params: `tierLevel`, `mealTypes`, `mainIngredient`, `dietaryRestrictions`, `createdAfter`

Returns actual DB count of recipes matching criteria — ground truth for executor verification.

### Section 2: Executor Constraint Pre-Validation

**File:** `scripts/recipe-batch-executor.ts` — new `validateConstraints()` function

Pre-flight checks before any API call:
- Macro math: `minProtein*4 + minCarbs*4 + minFat*9 <= maxCalories`
- Range sanity: `min <= max` for each macro pair
- Calorie budget: minimum calories from all mins must fit within max calories

Failed batches get auto-relaxed (widen constraints 20%) or skipped with diagnostic.

**Batches to fix:** E1 (Keto), I1 (Endurance), L3 (Carnivore)

### Section 3: Executor Hardening

**3a. Login Token Fix**
```typescript
const token = data.data?.accessToken || data.token;
if (!token) throw new Error(`No token in response: ${JSON.stringify(data)}`);
```

**3b. DB-Count Verification (Ground Truth)**
```
Per batch:
1. GET recipe-count (baseline)
2. POST generate-bulk (start)
3. Poll status (informational)
4. GET recipe-count (final)
5. actual = final - baseline
6. Success if actual > 0
```

**3c. Smart Resume**
On any run, for batches marked "failed"/"running":
1. Query recipe-count endpoint for actual DB count matching criteria
2. If count >= target → mark completed
3. If partial → adjust target to remaining need
4. Only run batches that genuinely need more recipes

### Section 4: TDD Strategy & Ralph Loop

**Test files (written FIRST, RED phase):**

| File | Tests | Purpose |
|------|-------|---------|
| `test/batch-generation/constraint-validator.test.ts` | 15 | Macro math, range sanity, auto-relax |
| `test/batch-generation/status-bridge.test.ts` | 8 | Status endpoint returns BMAD progress |
| `test/batch-generation/executor-login.test.ts` | 5 | Token parsing both formats |
| `test/batch-generation/executor-verification.test.ts` | 12 | Baseline→delta→resume flow |
| `test/batch-generation/executor-e2e.test.ts` | 6 | Full dry-run simulation |

**Ralph Loop criteria:** `npm test -- --grep "batch-generation"` — all 46 tests pass.

**Local simulation before production:**
```bash
npx tsx scripts/recipe-batch-executor.ts --target local --batch A1 --chunk-size 5 --no-images
```

### Section 5: Multi-Agent Team

| Agent | Responsibility | Files |
|-------|---------------|-------|
| Server Bridge | Fix status endpoint + add recipe-count API | `server/routes/bulkGeneration.ts`, `server/services/BMADRecipeService.ts` |
| Constraint Validator | Pre-flight checks + fix E1/I1/L3 specs | `scripts/recipe-batch-executor.ts` |
| Executor Hardening | Login, DB-count verify, resume | `scripts/recipe-batch-executor.ts` |
| Test Writer | All 5 test files (RED phase first) | `test/batch-generation/*.test.ts` |
| Review Agent | Post-implementation code review | Read-only |

**Parallel execution:** Server Bridge + Test Writer run simultaneously. Constraint Validator + Executor Hardening run sequentially (same file).

### New Skill: batch-generation-diagnostics

Diagnostic companion for the executor:
- Query production recipe counts by tier/category
- Validate all batch specs for feasibility
- Compare progress file vs actual DB
- Generate gap report
- Recommend next batches

---

## Execution Order

```
Phase 0: Test Writer writes ALL tests (RED — all fail)
Phase 1: Server Bridge + Constraint Validator (parallel)
Phase 2: Executor Hardening
Phase 3: Ralph Loop until all 46 tests pass (GREEN)
Phase 4: Local simulation (E2E proof)
Phase 5: Review Agent examines changes
Phase 6: User approval → merge → production run
```

---

## Success Criteria

- [ ] All 46 tests pass
- [ ] Local simulation: executor starts batch, tracks progress, reports correct recipe count
- [ ] Constraint validator catches E1/I1/L3 before API call
- [ ] Resume correctly identifies existing recipes and adjusts targets
- [ ] Review agent finds no critical issues
