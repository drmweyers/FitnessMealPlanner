# Recipe Restructuring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure production recipe library to exactly 6,000 recipes (1,500 starter + 1,500 professional + 3,000 enterprise) matching the scaled EvoFit Recipe Roadmap.

**Architecture:** Three-phase approach — cleanup orphans, trim over-populated blocks, generate under-populated blocks. All operations go through the production API at evofitmeals.com. The batch executor (`scripts/recipe-batch-executor.ts`) handles generation. A new restructuring script handles precise auditing and trimming.

**Tech Stack:** TypeScript (executor), Python (audit/trim scripts), Production API, DALL-E 3 (images), DigitalOcean Spaces (S3 storage)

**Design Doc:** `docs/plans/2026-03-27-recipe-restructuring-design.md`

---

### Task 1: Delete All Orphan Recipes (NULL imageUrl)

**Files:**
- Run: inline Python script against production API

**Step 1: Scan and bulk-delete orphans**

```python
# Authenticate, scan all recipes, collect IDs with NULL imageUrl, bulk delete
# Use DELETE /api/admin/recipes with {ids: [...]}
```

Run:
```bash
python3 -c "<scan and delete script>"
```

Expected: "Found N orphan recipes" → "Successfully deleted N recipes"

**Step 2: Verify zero orphans remain**

Run same scan script.
Expected: "Found 0 orphan recipes"

**Step 3: Commit progress note**

No code changes — this is data cleanup only.

---

### Task 2: Build Precise Audit Script

**Files:**
- Create: `scripts/recipe-restructuring/audit.ts`

**Step 1: Write audit script**

Script must:
1. Authenticate as admin
2. For each block in the spec (A1-O2), query the recipe-count endpoint with exact filters (tierLevel + mainIngredient)
3. For blocks without mainIngredient (H1, H2, I1, I2, J1-J3, K1-K5, L1-L4, N1-N4, O1-O2), scan recipe names/tags to estimate counts
4. Output a table: Block | Target | Actual | Delta
5. Output total per tier vs target

Run: `npx tsx scripts/recipe-restructuring/audit.ts --target production`
Expected: Table showing exact delta per block

**Step 2: Run audit and capture baseline**

Save output to `scripts/recipe-restructuring/baseline-audit.txt`

---

### Task 3: Build Trim Script for Over-Populated Blocks

**Files:**
- Create: `scripts/recipe-restructuring/trim.ts`

**Step 1: Write trim script**

Script must:
1. Authenticate as admin
2. For a given block (tier + mainIngredient + filters), fetch all matching recipes
3. Sort by: unapproved first, then oldest creation date
4. Delete excess recipes (actual - target) using bulk delete API
5. Only delete recipes that have images (skip orphans, already handled)
6. Dry-run mode by default, `--execute` to actually delete

Run: `npx tsx scripts/recipe-restructuring/trim.ts --target production --dry-run`
Expected: "Would delete X recipes from block Y" for each over-populated block

**Step 2: Execute trim with --execute flag**

Run: `npx tsx scripts/recipe-restructuring/trim.ts --target production --execute`
Expected: Recipes deleted, counts reduced to targets

**Step 3: Re-run audit to verify trim results**

Run audit script again. All previously over-populated blocks should now be at or near target.

---

### Task 4: Update Batch Executor with New Targets

**Files:**
- Modify: `scripts/recipe-batch-executor.ts`

**Step 1: Update BATCHES array with scaled targets**

Starter blocks (1.5x):
- A1: 150, A2: 150, A3: 150, A4: 75
- B1: 150, B2: 150, B3: 150
- C1: 150, C2: 150, C3: 75
- D1: 75, D2: 75

Professional blocks (unchanged):
- E1-E4: 100 each
- F1: 100, F2: 50, F3: 50, F4: 100, F5: 100
- G1-G3: 100 each
- H1-H2: 100 each
- I1-I2: 100 each

Enterprise blocks (2x):
- J1-J3: 200 each
- K1-K5: 160 each
- L1-L4: 150 each
- M1-M4: 100 each
- N1-N4: 100 each
- O1-O2: 100 each

**Step 2: Verify constraint validation passes**

Run: `npx tsx scripts/recipe-batch-executor.ts --target production --status`
Expected: All batches listed with new targets

**Step 3: Commit**

```bash
git add scripts/recipe-batch-executor.ts
git commit -m "feat: update batch executor targets to scaled 1500/3000/6000 spec"
```

---

### Task 5: Generate Under-Populated Starter Blocks

**Step 1: Run executor for starter blocks only**

Only C1 (Legumes) and C2 (Eggs) need generation.

Run: `npx tsx scripts/recipe-batch-executor.ts --target production --batch C1 --chunk-size 10`
Run: `npx tsx scripts/recipe-batch-executor.ts --target production --batch C2 --chunk-size 10`

Expected: Smart resume detects existing count, generates only the delta.

**Step 2: Verify with audit script**

All starter blocks should be at target.

---

### Task 6: Generate Under-Populated Professional Blocks

**Step 1: Run executor for professional blocks**

Blocks needing generation: F5, G1, G2, G3, H1, H2, I1, I2

Run: `npx tsx scripts/recipe-batch-executor.ts --target production --phase 2 --chunk-size 10`

Smart resume will skip completed blocks and generate only what's needed.

**Step 2: Verify with audit script**

All professional blocks should be at target.

---

### Task 7: Generate Under-Populated Enterprise Blocks

**Step 1: Run executor for enterprise blocks**

All enterprise blocks (J1-O2) need generation. This is the largest phase (~2,000 recipes).

Run: `npx tsx scripts/recipe-batch-executor.ts --target production --phase 3 --chunk-size 10`

Note: This will take ~20+ hours due to DALL-E image generation. Monitor for 504 server crashes and restart as needed.

**Step 2: Ralph Loop — retry until all blocks hit target**

After each run, check audit. For any block still under target:

```bash
npx tsx scripts/recipe-batch-executor.ts --target production --batch <BLOCK_ID> --chunk-size 10
```

Repeat until all blocks are within +/-5 of target.

**Step 3: Verify with audit script**

All enterprise blocks should be at target.

---

### Task 8: Final Verification and Cleanup

**Step 1: Run full audit**

```bash
npx tsx scripts/recipe-restructuring/audit.ts --target production
```

Expected output:
- Starter: 1,500 (+/- 5)
- Professional: 1,500 unique (+/- 5)
- Enterprise: 3,000 unique (+/- 5)
- Total: 6,000 (+/- 15)
- Orphans: 0

**Step 2: Delete any remaining orphans**

Run orphan scan one final time.

**Step 3: Approve all pending recipes with images**

Any recipes with images that are still unapproved should be approved.

**Step 4: Final commit and push**

```bash
git add scripts/recipe-restructuring/ scripts/recipe-batch-executor.ts
git commit -m "feat: recipe restructuring complete — 6,000 recipes across 3 tiers"
git push origin main
```

---

## Execution Notes

- **Server crashes:** The production server (DigitalOcean App Platform) crashes under sustained batch load. Allow 5-10 min cooldown between large batch runs. Monitor for 504 errors.
- **DALL-E rate limits:** OpenAI limits image generation. The executor handles retries, but sustained runs may hit limits.
- **Smart resume:** The executor's DB-count fallback means interrupted runs can resume without data loss.
- **Image orphan prevention:** The deployed fix in BMADRecipeService.ts now deletes recipes when image generation fails.
