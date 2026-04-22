# Launch Blockers Plan — 2026-04-22

**Status:** Fixing meal plan generator repetition/variety + pricing tier functional differentiator.
**Branch:** feature/launch-blockers (off main)
**Deadline:** Complete today. Mark handles Stripe + OAuth tonight after dinner.

---

## Triangulated findings (not what TODO_URGENT.md said)

1. **Dietary tag catastrophe — ALREADY FIXED in production.** Prod has 14 dietary tags. Keto request returns real keto recipes. No action needed. (Stale memory from 2026-04-12; backfilled since.)

2. **Recipe repetition — CONFIRMED.** `maxIngredients:3` → "Silken Tofu and Berry Puree" × 9 on prod. No dedup working.

3. **Variety — CONFIRMED.** `minProtein:30, maxCalories:800` → 9 unique but all BEEF (0% non-beef). Variety cap not firing.

4. **Baseline works.** No filters → 9 unique recipes, diverse ingredients. Bugs only trigger with narrow filters.

## Root cause

`server/services/mealPlanGenerator.ts:69` + `:256` — hardcoded `limit: 100` on `storage.searchRecipes`. With 6,000 approved recipes, narrow filters (maxIngredients, minProtein+maxCalories) applied AFTER the 100-cap leave the pool at 1-3 recipes. Variety + dedup logic (lines 547-586) can't save a pool of 1.

Secondary: `availableTags` at line 258-263 computed from same 100-sample → misleading error messages when rare tags exist but weren't in sample.

## Decisions made (flagged for Mark, will proceed unless overridden)

| Decision                     | Choice                                                   | Why                                             |
| ---------------------------- | -------------------------------------------------------- | ----------------------------------------------- |
| Meal plan pool size          | Remove `limit: 100`, filter at DB level                  | Indexing already in place                       |
| Variety cap                  | 40% max same main ingredient                             | Per 2026-04-12 recommendation                   |
| Dedup strictness             | Never repeat within 7 days; relax only if pool exhausted | Better UX than silent repetition                |
| Tier gate field              | `advancedFilters: boolean` on `TierFeatures`             | Matches existing shape                          |
| Tier gate enforcement        | Silent strip + client overlay                            | Better UX than 403; doesn't break stale clients |
| Grandfather existing Starter | No                                                       | Product launched days ago; small blast radius   |
| Dietary tag UI               | Dynamic fetch from new `/api/recipes/dietary-tags`       | Future-proof; fixes case mismatch               |

## Stream A — Meal Plan Generator Fixes

### TDD tests (write first)

- `test/integration/mealPlanGeneratorVariety.test.ts` — extend with:
  - `maxIngredients=3` → assert `new Set(recipeIds).size === 9` (full dedup)
  - `minProtein=30, maxCalories=800` → assert no single `mainIngredientTags[0]` > 40% of meals
  - No filters → assert ≥9 unique recipes (regression guard on baseline)
- `test/integration/dietaryTagsEndpoint.test.ts` — new: `GET /api/recipes/dietary-tags` returns ≥10 tags, all lowercase-hyphenated

### Code changes

1. `server/services/mealPlanGenerator.ts:69` — remove `limit: 100`, rely on filter columns
2. `server/services/mealPlanGenerator.ts:253-297` — rewrite availability check to query distinct tags from DB, not sample
3. `server/storage.ts:searchRecipes` — add default sane limit (2000) only if caller doesn't pass one; ensure dietary filter is case-insensitive
4. `server/routes/recipes.ts` — add `GET /api/recipes/dietary-tags` endpoint
5. `client/src/components/MealPlanGenerator.tsx:1719-1772` — replace hardcoded SelectItems with `useQuery` from new endpoint

## Stream B — Pricing Tier Advanced Filter Gate

### TDD tests (write first)

- `tests/e2e/forge/tiers/tier-01-starter-limits.spec.ts` — add assertion: Advanced Filter accordion shows upgrade overlay for Starter
- `tests/e2e/forge/tiers/tier-02-professional-limits.spec.ts` — add assertion: Advanced Filter visible and interactive
- New `test/integration/mealPlanTierGate.test.ts` — POST /api/meal-plan/generate with `minProtein: 30` + Starter auth → advanced fields stripped silently, plan generates successfully

### Code changes

1. `server/services/EntitlementsService.ts:35-41` — add `advancedFilters: boolean` to `TierFeatures`
2. `server/services/EntitlementsService.ts:96-124` — starter=false, pro=true, enterprise=true
3. `server/routes/entitlements.ts:130-155` — include `advancedFilters` in `/api/entitlements` response
4. `server/routes/mealPlan.ts:41` — silent-strip advanced fields if `tier === 'starter'`
5. `client/src/components/MealPlanGenerator.tsx:1979-2307` — wrap Advanced Recipe Filters block with upgrade overlay for Starter (reuse `UpgradePrompt` component)
6. `server/routes/tierRoutes.ts:55-102` — update feature arrays
7. `tests/e2e/forge/tiers/tier-0{1,2,3}-limits.spec.ts` — update mocked entitlements to include `advancedFilters`

## Stream C — Housekeeping

- Review `scripts/audit-landing-pages.mjs`, `compare-trainer-dash.mjs`, `compare-ui.mjs`, `screenshot-new-pages.mjs` — commit useful ones, delete ad-hoc debug scripts
- Reset test state files OR commit current QA snapshot

## Verification gates

1. Unit/integration tests pass on localhost: `npm test`
2. Playwright E2E on localhost: `npx playwright test`
3. Local smoke (real docker): trainer.test generates plan with maxIngredients=3 → unique recipes; Starter user sees upgrade overlay on Advanced Filter
4. Push to main, wait for DO deploy
5. Production smoke via curl + Playwright against https://meals.evofit.io
6. `@spec-reviewer` and `@quality-reviewer` both PASS

## Out of scope (separate tickets)

- Dietary tag BMAD backfill (already done in prod)
- Mark's Stripe + OAuth tasks (tonight after dinner)
- Pricing sales page copy rewrite (nice-to-have; do if time)
