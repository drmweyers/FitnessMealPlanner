# QA Warfare Gap Audit — FitnessMealPlanner Adaptation

**Date:** 2026-04-12
**Auditor:** Agent C — Warfare QA Skill Auditor
**Source Skill:** `EvoFitTrainer/.claude/skills/forge-qa-warfare/SKILL.md`
**Target Platform:** FitnessMealPlanner (admin/trainer/customer roles)

---

## Executive Summary

The `forge-qa-warfare` skill was designed for a single-domain fitness trainer platform (workouts, programs, scheduling). FitnessMealPlanner is materially different: three distinct actor roles, multi-tier subscription gating (Starter/Pro/Enterprise), a commercial sales funnel, BMAD multi-agent recipe generation with SSE streaming, S3 image storage, PDF export, bug pipeline reporting, and a complex trainer→customer data ownership model. The skill's 7-phase structure is directionally correct but is missing ~60% of what FitnessMealPlanner actually needs to test.

**Existing forge tests cover:** ~33 spec files in `/tests/e2e/forge/`. Authentication flows, basic CRUD for meal plans and recipes, tier limits (3 files), PDF export, grocery lists, and basic admin dashboard stats. These are largely smoke tests, not adversarial or cross-role workflow tests.

**Existing gaps already documented:** The `/docs/qa/assessments/test-coverage-gap-analysis.md` (Oct 2025) flagged ~60 untested API endpoints out of 150+, zero cascading delete tests, zero BMAD E2E tests, zero S3 failure injection, and no OAuth flow tests.

---

## Gap Inventory — Scored by Severity

### CRITICAL (data loss / security / revenue risk)

| #   | Gap                                                 | Dimension                    | Phase      | Specific Missing Tests                                                                                                                                                                                                                               |
| --- | --------------------------------------------------- | ---------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **No adversarial/IDOR testing**                     | Security                     | Phase 1, 4 | Trainer A accessing Trainer B's customers; Customer A reading Customer B's meal plans; Admin endpoint called without admin role; Stolen JWT used after logout                                                                                        |
| 2   | **No tier bypass / permission escalation tests**    | Tier gating, Security        | Phase 2, 4 | Starter user POSTing to enterprise-only endpoint directly; Downgrade race condition (pay, downgrade, use feature in same second); Feature flag disabled but API accepts requests                                                                     |
| 3   | **No cascading delete / data integrity assertions** | Side-effects, State machines | Phase 4    | Trainer deleted → orphaned customers; Recipe deleted → active meal plan references dangling; User deleted → S3 files orphaned; Grocery list after source meal plan deleted                                                                           |
| 4   | **No S3/external service failure injection**        | Failure injection            | Phase 3, 4 | S3 upload fails mid-recipe → DB record left without image; PDF generation timeout → what response does client get?; OpenAI 429 during BMAD batch → agent recovery; Redis down → entitlements fallback behavior                                       |
| 5   | **No BMAD E2E workflow test**                       | State machines, Side-effects | Phase 4, 5 | Full 8-agent chain (RecipeConceptAgent → ImageStorageAgent) run end-to-end; SSE stream sends correct progress events in sequence; Agent failure mid-chain → partial rollback or resume; BMAD batch + concurrent admin approve race                   |
| 6   | **No payment / Stripe webhook integrity tests**     | Side-effects, Security       | Phase 4    | Stripe webhook arrives with invalid signature; Payment succeeds but DB write fails → stripe has payment, app doesn't; Duplicate webhook delivery (idempotency); Refund webhook → tier downgrade applied; Free trial expiry → correct feature lockout |
| 7   | **No bug pipeline cross-role flow test**            | Cross-role integrity         | Phase 4    | Customer submits bug → appears in admin CTO Command Centre; Admin claims bug → status update visible to customer; Hal polling endpoint (`/api/command-centre/bugs`) returns correct next item; Duplicate claim prevention                            |

---

### HIGH (workflow correctness / revenue confidence)

| #   | Gap                                                       | Dimension                   | Phase      | Specific Missing Tests                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | --------------------------------------------------------- | --------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 8   | **Tier gating boundary conditions undertested**           | Tier gating, State machines | Phase 2, 4 | Existing tier specs test happy-path limits but NOT: exactly-at-limit (N clients), one-over-limit (N+1 rejected), upgrade → limits immediately relaxed, downgrade → overage clients locked not deleted                                                                                                                                                                                                                                                                                      |
| 9   | **Trainer→Customer data flow not verified cross-role**    | Cross-role integrity        | Phase 4    | Trainer generates meal plan → customer sees it in real-time; Trainer assigns via library → customer's `/personalized` endpoint reflects assignment; Trainer removes assignment → customer loses access immediately                                                                                                                                                                                                                                                                         |
| 10  | **No idempotency tests**                                  | Idempotency                 | Phase 4    | POST meal plan generation twice in 500ms → single plan created; POST `/grocery-lists/generate-from-meal-plan` twice → no duplicate list; Double-submit on registration form                                                                                                                                                                                                                                                                                                                |
| 11  | **No concurrency / race condition tests**                 | Concurrency                 | Phase 4    | Two trainers assigning same recipe to same customer simultaneously; Admin bulk-approving while trainer is reading recipe list; Trainer editing meal plan while customer views it                                                                                                                                                                                                                                                                                                           |
| 12  | **PDF export side-effect assertions absent**              | Side-effects                | Phase 4    | PDF generated and stored correctly (not just HTTP 200); PDF contains correct customer name, tier branding, macro data; Enterprise white-label PDF has trainer logo not EvoFit logo; PDF generation uses `page.setContent()` not `page.goto()` (known bug pattern — buglog)                                                                                                                                                                                                                 |
| 13  | **No email side-effect assertions**                       | Side-effects                | Phase 4    | Invitation email actually sent when trainer invites client; Welcome email fires on registration; Usage limit warning email at 80%; Tier upgrade confirmation email                                                                                                                                                                                                                                                                                                                         |
| 14  | **Actor method inventory is FMP-incomplete**              | Coverage depth              | All        | TrainerActor missing: `saveToLibrary()`, `assignBulk()`, `generateMealPlan()`, `parseChatGPTMeals()`, `viewCustomerEngagement()`, `viewAssignmentHistory()`, `setCustomerStatus()`. CustomerActor missing: `reportBug()`, `viewGroceryList()`, `checkItemOff()`, `viewProgressPhoto()`, `viewAssignedMealPlan()`. AdminActor missing: `generateBMAD()`, `monitorSSEStream()`, `approveRecipeBulk()`, `deleteRecipeBulk()`, `assignRecipeToCustomer()`, `viewCommandCentre()`, `claimBug()` |
| 15  | **Funnel and checkout flows not tested as user journeys** | Coverage depth              | Phase 2, 4 | `/get-started` → `/professional` → Stripe checkout → redirect back → tier applied; Lead magnet email capture → follow-up sequence triggered; Tripwire offer accepted → `special_offer_purchased` flag set; Public page renders without auth (no 401 bleed-through)                                                                                                                                                                                                                         |

---

### MEDIUM (quality, coverage confidence)

| #   | Gap                                                         | Dimension                | Phase      | Specific Missing Tests                                                                                                                                                                                                                  |
| --- | ----------------------------------------------------------- | ------------------------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 16  | **No data volume / pagination boundary tests**              | Data volume              | Phase 3, 4 | Empty state: trainer with 0 customers, customer with 0 meal plans; Single item edge case; 50-recipe paginated list (page 1 / page 2); Admin recipe list with 6,000 recipes — scroll pagination                                          |
| 17  | **No accessibility (axe-core) assertions**                  | Accessibility            | Phase 4    | Every page role scanned; WCAG 2.1 AA violations flagged; Focus order on modals; ARIA labels on icon-only buttons                                                                                                                        |
| 18  | **Mobile / multi-viewport coverage minimal**                | Mobile/responsive        | Phase 4    | 375px, 768px, 1024px for every major flow not just one responsive spec file; Sticky nav behavior; Touch-friendly tap targets; PDF export on mobile viewport                                                                             |
| 19  | **No regression traceability**                              | Traceability, Regression | Phase 7    | No test → user story mapping; No link from test to past bugs in buglog.json; Known production bugs (profile image, PDF SPA trap) have no regression guards                                                                              |
| 20  | **14-day simulation too EvoFit-specific**                   | Realistic persona        | Phase 5    | Simulation doesn't model: meal plan swap mid-week; Recipe favoriting and collection building; Grocery list check-off sequence; Progress photo upload at day 7; Customer submitting bug at day 10; Trainer responding via note at day 12 |
| 21  | **Multi-agent verification misses 2 critical perspectives** | Coverage measurement     | Phase 6    | No Security Auditor agent; No Tier-Gating Auditor agent; No Funnel/Revenue Auditor agent; 3-agent model only covers happy-path role perspectives                                                                                        |
| 22  | **No flake resistance / wait strategy specification**       | Flake resistance         | Phase 4    | No `waitForResponse()` patterns specified for API calls; No retry spec for SSE connection; No deterministic seed IDs (UUID collisions possible on re-seed)                                                                              |
| 23  | **No coverage measurement definition**                      | Coverage measurement     | Phase 7    | No coverage matrix (workflow × role × tier); No mutation score target; "100% coverage" undefined — no method for verifying it                                                                                                           |
| 24  | **No CI integration spec**                                  | CI integration           | Phase 7    | No GitHub Actions workflow reference; No failure threshold (X failing = block merge); No parallelization config for CI runners; No artifact upload for screenshots/reports                                                              |
| 25  | **Sharing / collaboration flows missing**                   | Coverage depth           | Phase 2, 4 | Meal plan sharing token generation; Shared plan viewed by non-customer; Share link expiry; Sharing with/without trainer branding                                                                                                        |

---

## Phase-by-Phase Assessment

### Phase 1: RECON

**Does well:** Competitive scan concept + codebase mapping structure.
**Misses:**

- Does not specify scanning `server/routes/bugReports.ts`, `commandCentre.ts`, `funnelCheckout.ts`, `branding.ts`, `mealPlanSharing.ts`, `entitlements.ts`, `payment.ts`, `subscriptionRoutes.ts`, `bulkGeneration.ts`, `pdf.ts` — all have significant untested surface.
- No SSE endpoint discovery step (`/bmad-progress-stream`, `/recipe-progress-stream`).
- No Stripe webhook endpoint discovery.
- Competitive scan targets are PT platforms (Trainerize etc.) — wrong category. FMP competes with nutrition apps (MacroFactor, Cronometer, MyFitnessPal for trainers). Scan targets need updating.

**Fix:** Add explicit route-by-route inventory step. Add `docs/API_ENTITLEMENTS_CONTRACT.md` as mandatory read. Add SSE and webhook endpoint categories.

---

### Phase 2: BATTLE PLAN

**Does well:** Suite-per-workflow organization is correct. Cross-role interaction concept is right.
**Misses:**

- 10 workflow suites cover EvoFit's domain (workouts, scheduling, AI builder, exercise library). FMP needs completely different suites: BMAD generation, bulk operations, PDF export, grocery list generation, tier gating, bug pipeline, funnel checkout, meal plan sharing, branding customization.
- No adversarial test category (auth bypass, IDOR, permission escalation).
- No side-effect assertion category (emails, SSE, S3, webhooks).
- No failure injection category (OpenAI down, S3 down, DB timeout).
- No state machine test category (tier transitions, assignment lifecycle, BMAD batch states).

**Fix:** Replace 10 workflow suites with FMP-specific ones. Add 4 new test categories: Adversarial, Side-Effect, Failure-Injection, State-Machine.

---

### Phase 3: SEED

**Does well:** API-only seeding, idempotency intent, realistic data.
**Misses:**

- No seed for: 3 tiers with different client/plan counts; bug reports in various states; BMAD batch jobs; trainer branding settings; sharing tokens; Stripe payment records; usage tracking counters at 80%/100% thresholds.
- Seed script described has no deterministic IDs — re-seeding creates duplicate entities, not idempotent updates.
- No fixture strategy for S3 (mock vs. real); no mock strategy for OpenAI in seed.

**Fix:** Spec deterministic email-based lookup for idempotency. Spec tier-aware seeding (one trainer per tier). Add `seedBugPipeline()`, `seedBMADBatch()`, `seedStripeWebhookHistory()` steps.

---

### Phase 4: BUILD

**Does well:** TDD RED-GREEN methodology, actor pattern, parallel streams.
**Misses:**

- Only 3 actor classes. FMP needs: `TrainerActor` (extended), `CustomerActor` (extended), `AdminActor` (extended), `AnonActor` (public funnel pages), `AttackerActor` (adversarial tests — uses wrong tokens, wrong role, expired sessions).
- No specification of `waitForResponse()` or `waitForEvent()` patterns for SSE streams.
- No mock injection specification (how to make OpenAI return a 500 in test?).
- Parallel streams A-D are EvoFit-domain specific. Need FMP streams.

**Fix:** Define `AnonActor` and `AttackerActor`. Add mock injection guide for external services. Redefine parallel streams around FMP domains.

---

### Phase 5: LONG-FORM SIMULATION

**Does well:** Progressive data accumulation concept, day-by-day scripting.
**Misses:**

- 14 days is the right duration but wrong activities: all workout-focused (EvoFit domain). Zero FMP activities (meal plans, recipes, grocery lists, progress photos, bug reports).
- No multi-tier simulation (simulate Starter, Pro, Enterprise in parallel — 3 trainers, each with different client counts).
- No adverse events: customer hits usage limit on day 8, upgrade flow triggered; trainer's account downgraded on day 11 (simulate expired subscription); bug submitted by customer on day 10.
- No persona modeling for the 14-day script (realistic human: opens app, scrolls, clicks wrong thing, goes back, reloads).

**Fix:** Full rewrite of day-by-day script for FMP domain. Add 3-tier parallel simulation tracks. Add adverse event days.

---

### Phase 6: MULTI-AGENT VERIFICATION

**Does well:** Parallel agent perspective concept is sound.
**Misses:**

- 3 agents (Trainer/Client/Admin) only cover happy-path role perspectives.
- Missing: Security Auditor Agent (every auth token verified, every endpoint role-gated), Tier-Gating Auditor (every feature blocked correctly for each tier), Revenue/Funnel Auditor (every payment touch-point tested, every Stripe webhook handled), Data Integrity Auditor (every cascade delete tested, every orphan prevented).
- Agent prompts don't reference the actual route files or known gap analysis doc.

**Fix:** Expand to 7 verification agents. Give each agent specific file references: route files, gap analysis doc, entitlements contract.

---

### Phase 7: REPORT & UPDATE

**Does well:** Full suite run + documentation updates.
**Misses:**

- No coverage matrix definition (how to prove "100%"?).
- No mutation testing target.
- No CI gate specification (fail build if X tests fail).
- "Update Hal bridge" references EvoFit path — wrong for FMP.
- No accessibility report output.
- No performance metrics (what's acceptable page load time under test?).

**Fix:** Add coverage matrix template. Add mutation score target (>=70%). Add CI gate spec. Fix Hal bridge path to `~/Claude/second-brain/dev-updates/fitnessmealplanner.md`.

---

## Missing Workflow Suites (FMP-Specific)

The 10 EvoFit suites must be replaced. Minimum FMP suites:

| Suite                  | Workflow                                                      | Priority |
| ---------------------- | ------------------------------------------------------------- | -------- |
| 01-auth-roles          | Login/logout × 4 roles; route guards; invitation registration | CRITICAL |
| 02-trainer-onboarding  | Register → profile → invite client → client accepts           | CRITICAL |
| 03-meal-plan-lifecycle | Generate → save → assign → customer views → unassign          | CRITICAL |
| 04-bmad-generation     | Admin triggers BMAD → SSE streams → recipes approved          | CRITICAL |
| 05-tier-gating         | Each tier: limit enforcement + upgrade flow + downgrade       | CRITICAL |
| 06-pdf-export          | Generate PDF → correct content → correct branding by tier     | HIGH     |
| 07-grocery-list        | Generate from meal plan → check off items → delete            | HIGH     |
| 08-progress-tracking   | Log measurements → photos → goals → trainer views             | HIGH     |
| 09-bug-pipeline        | Customer reports → admin sees → claims → resolves             | HIGH     |
| 10-funnel-checkout     | Public page → Stripe → tier applied → dashboard access        | HIGH     |
| 11-admin-operations    | Bulk approve/delete → recipe management → BMAD metrics        | HIGH     |
| 12-meal-plan-sharing   | Generate share token → shared view → expiry                   | MEDIUM   |
| 13-branding            | Enterprise trainer logo → PDF has logo → customer sees it     | MEDIUM   |
| 14-recipe-management   | Search → filter → favorite → assign to customer               | MEDIUM   |
| 15-adversarial         | IDOR attempts, auth bypass, tier bypass, replay attacks       | CRITICAL |
| 16-failure-injection   | OpenAI down, S3 timeout, DB disconnect, Redis miss            | HIGH     |
| 17-data-integrity      | Cascade deletes, orphan prevention, FK violations             | CRITICAL |
| 18-concurrency         | Dual-actor simultaneous operations, race conditions           | HIGH     |

---

## Missing Actor Methods (FMP)

### TrainerActor — Missing

```typescript
generateMealPlan(params: MealPlanParams): Promise<MealPlan>
savePlanToLibrary(planId: string): Promise<void>
assignPlanBulk(planId: string, customerIds: string[]): Promise<void>
parseChatGPTMeals(text: string): Promise<ParsedMeal[]>
viewCustomerEngagement(customerId: string): Promise<void>
viewAssignmentHistory(filters?: AssignmentFilters): Promise<void>
setCustomerStatus(customerId: string, status: string): Promise<void>
exportPDF(planId: string, options: PDFOptions): Promise<Buffer>
viewProgressSummary(customerId: string): Promise<void>
addRelationshipNote(customerId: string, note: string): Promise<void>
```

### CustomerActor — Missing

```typescript
viewAssignedMealPlan(planId: string): Promise<void>
generateGroceryList(planId: string): Promise<void>
checkOffGroceryItem(listId: string, itemId: string): Promise<void>
uploadProgressPhoto(file: File): Promise<void>
reportBug(data: BugReportInput): Promise<void>
viewSharedMealPlan(token: string): Promise<void>
viewMacroBreakdown(): Promise<void>
```

### AdminActor — Missing

```typescript
triggerBMADGeneration(params: BMADParams): Promise<{ batchId: string }>
monitorSSEStream(batchId: string): Promise<SSEEvent[]>
approveRecipesBulk(recipeIds: string[]): Promise<void>
deleteRecipesBulk(recipeIds: string[]): Promise<void>
assignRecipeToCustomers(recipeId: string, customerIds: string[]): Promise<void>
viewCommandCentre(): Promise<void>
claimBug(bugId: string): Promise<void>
viewEntitlements(userId: string): Promise<EntitlementState>
```

### New Actor Classes Needed

```typescript
class AnonActor {
  visitPublicPage(route: string): Promise<void>;
  submitLeadMagnetForm(email: string): Promise<void>;
  initStripeCheckout(tier: Tier): Promise<void>;
  verifyNoAuthBleed(): Promise<void>; // confirms no user data leaks
}

class AttackerActor {
  useExpiredToken(token: string): Promise<Response>;
  useWrongRoleToken(token: string, targetRoute: string): Promise<Response>;
  attemptIDOR(
    victimId: string,
    attackerToken: string,
    route: string,
  ): Promise<Response>;
  submitMalformedPayload(route: string, payload: unknown): Promise<Response>;
  replayWebhook(webhookPayload: unknown): Promise<Response>;
}
```

---

## 14-Day Simulation — FMP Rewrite

The EvoFit simulation (bench press, squat, deadlift) must be replaced with:

| Day | Events                                                                                              |
| --- | --------------------------------------------------------------------------------------------------- |
| 1   | Admin triggers BMAD batch (50 recipes); Starter trainer registers; Pro trainer invites 3 customers  |
| 2   | BMAD completes; Admin approves 40 recipes; Starter trainer generates first meal plan                |
| 3   | Pro trainer assigns meal plan to customer-1; Customer-1 views plan, generates grocery list          |
| 4   | Customer-1 checks off 8 grocery items; Logs first measurement (weight, BF%)                         |
| 5   | Starter trainer hits client limit (9th invite rejected); Upgrade flow triggered                     |
| 6   | Customer-1 uploads progress photo; Enterprise trainer configures white-label branding               |
| 7   | Pro trainer generates PDF for customer-1; verifies brand-correct output                             |
| 8   | Customer-2 reports bug via bug pipeline; Admin sees in Command Centre                               |
| 9   | Admin claims bug, marks resolved; Customer-2 sees status change                                     |
| 10  | Starter→Pro upgrade completes; New client limit reflected immediately                               |
| 11  | Customer-1 submits progress measurement; Trainer views engagement dashboard                         |
| 12  | Trainer creates manual meal plan (ChatGPT paste); Assigns to customer-3                             |
| 13  | Customer-3 views shared meal plan via public share link                                             |
| 14  | Full analytics validation: all charts render; all tier limits correct; all cascade deletes verified |

---

## Coverage Measurement Definition (Missing from Skill)

The skill says "100% coverage" but defines no method. FMP warfare must define:

1. **API Coverage Matrix** — every route × every role × every HTTP method. Target: 100%.
2. **Workflow Coverage Matrix** — every user story × test existence. Target: 100%.
3. **State Coverage Matrix** — every resource state (BMAD: pending/running/complete/failed; meal plan: draft/assigned/unassigned; tier: starter/pro/enterprise/expired). Target: 100%.
4. **Mutation Score** — run Stryker on service layer. Target: ≥70%.
5. **Accessibility Score** — axe-core zero critical violations on all 15+ pages.
6. **Flake Rate** — <2% over 20 consecutive runs.

---

## Top 15 Gaps Ranked by Severity

| Rank | Gap                                                                                    | Severity |
| ---- | -------------------------------------------------------------------------------------- | -------- |
| 1    | No IDOR / auth bypass / permission escalation adversarial tests                        | CRITICAL |
| 2    | No tier bypass boundary tests (exactly-at-limit, one-over, downgrade race)             | CRITICAL |
| 3    | No cascading delete / data integrity tests (known P0 gap since Oct 2025)               | CRITICAL |
| 4    | No external service failure injection (OpenAI, S3, Redis, Stripe)                      | CRITICAL |
| 5    | No BMAD full E2E workflow + SSE stream assertion                                       | CRITICAL |
| 6    | No Stripe webhook integrity + idempotency tests                                        | CRITICAL |
| 7    | No bug pipeline cross-role flow test (customer→admin→Hal)                              | CRITICAL |
| 8    | Tier gating only tests happy-path; missing at-limit / over-limit / upgrade-unlock      | HIGH     |
| 9    | Trainer→Customer data flow not verified cross-role in real time                        | HIGH     |
| 10   | No idempotency tests (double-submit, double-webhook, duplicate generation)             | HIGH     |
| 11   | No concurrency / race condition tests (dual actor, simultaneous operations)            | HIGH     |
| 12   | PDF export has no content/branding/correctness assertions (only HTTP 200)              | HIGH     |
| 13   | Email side-effects never asserted                                                      | HIGH     |
| 14   | Actor method inventory missing ~30 FMP-specific methods; no AnonActor or AttackerActor | HIGH     |
| 15   | Funnel/checkout never tested as full purchase journey                                  | HIGH     |

---

## Recommended New Skill Structure

**Phases to add to current 7:**

- Phase 0: **CONTEXT LOAD** — Read `docs/API_ENTITLEMENTS_CONTRACT.md`, `docs/TIER_SOURCE_OF_TRUTH.md`, `.wolf/buglog.json` (known bugs → regression guards). Required before RECON.
- Phase 2b: **ADVERSARIAL PLAN** — Dedicated battle plan for attack vectors, separate from workflow plan.
- Phase 4b: **FAILURE INJECTION BUILD** — Build tests with mock injection for all external services.

**Agents to add to Phase 6 (current: 3, recommended: 7):**

1. Trainer Perspective (exists)
2. Customer Perspective (exists)
3. Admin Perspective (exists)
4. Security Auditor — every auth/IDOR/escalation path
5. Tier-Gating Auditor — every entitlement boundary
6. Revenue/Funnel Auditor — every payment touch-point
7. Data Integrity Auditor — every cascade and orphan scenario

---

_Output by Agent C. Write rebuilt skill to: `C:\Users\drmwe\Claude\FitnessMealPlanner\.claude\skills\forge-qa-warfare-fmp\SKILL.md`_
