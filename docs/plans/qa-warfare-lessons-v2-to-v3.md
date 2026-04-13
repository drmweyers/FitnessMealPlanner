# FORGE QA Warfare v2 → v3 — Retrospective & Template Update

**Date:** 2026-04-12 (session close)
**Project:** FitnessMealPlanner
**Scope:** Lessons from tonight's first full warfare v2 run, generalized into a reusable template for other software products.

---

## Context

Tonight we took FitnessMealPlanner through a full FORGE QA Warfare v2 cycle from cold start. We built 7 actor classes, 6 sub-skills, 33 spec files (157 tests), seeded a world, ran the suite against production, and surfaced 8 real production bugs — all fixed in the same session. The process worked end-to-end. But the FIRST run exposed multiple weaknesses in the warfare methodology itself that every future project can benefit from avoiding.

This document captures what we learned, what we'd change, and what a v3 template should look like for other software.

---

## Top 15 lessons (ranked by impact on future projects)

### 1. Trust the schema, not the recon doc. Always.

Our first recon produced a "state machines" section that was **entirely invented**. Meal plans had no status column (join-table existence model). Recipes used a boolean `isApproved`, not a 4-state enum. Bug reports had 5 states, not 3. Subscriptions had `past_due` and `unpaid`, not "paused". Every single state machine in the first doc was wrong.

**Rule:** every recon artifact MUST be verified against `shared/schema.ts` (or equivalent) before anything downstream consumes it. The cartographer agent that produced the corrected doc was 3x more valuable than the agent that produced the original — _because it ran grep against the real source of truth_.

**Template change:** Phase 1 RECON must have TWO sub-phases:

- 1a. Pattern-match recon (fast, intuitive, can be wrong)
- 1b. Schema-verified recon (slow, grep-driven, source of truth)
  Nothing in Phase 2+ reads from 1a — only 1b.

### 2. The seed harness is a bug detector, not a setup step

Before a single test ran tonight, trying to seed realistic state surfaced:

- Bug #3 enum drift (bug pipeline broken in every DB, production included)
- Bug #4 meal plan create 500 (empty payload → NOT NULL crash)
- Bug #5 pickArray shape (test harness bug, but the symptom looked like a real bug until investigated)

**Rule:** a warfare cycle doesn't start with "write tests." It starts with "can the seed harness establish canonical state against the target?" If the harness can't, FIX THE APP FIRST. Tests written on a broken seed will produce noise, not signal.

**Template change:** Phase 3 SEED is the first check gate. A warfare run is BLOCKED until the seed harness runs cleanly. This catches foundational bugs before they contaminate the spec corpus.

### 3. Every SPA needs an `/api/*` 404 catch-all

Express apps with an `app.get('*', index.html)` SPA catch-all have a latent critical bug: unmatched API paths fall through to the HTML route and hang the client indefinitely. Any client typo → browser freezes → user support ticket → 30s gateway timeout → dev blames "rate limiting" → bug goes uncaught for months.

Fix is 8 lines of code:

```ts
app.all("/api/*", (req, res) =>
  res.status(404).json({
    error: "API endpoint not found",
    path: req.path,
    method: req.method,
  }),
);
```

**Rule:** this is a UNIVERSAL pattern, not an FMP quirk. Every warfare cycle for any Express/Fastify/Koa SPA should run this probe as a baseline:

```bash
curl -m 5 https://<target>/api/v1/deliberately-wrong-path-xyz
# must return JSON in <500ms, never hang
```

**Template change:** add `api-unmatched-path-probe.spec.ts` to the baseline regression suite in every warfare template. Zero configuration, runs against any web app with an API namespace.

### 4. Schema/code drift is a distinct bug class, needs its own phase

The `bug_report_category` enum had 10 values in drizzle, 3 in the actual pg database. No migration existed — the bug pipeline had shipped "working" for 5 days in production but silently crashed on every real bug submission because the default category value didn't exist in the db enum.

No adversarial test, no FSM test, no workflow test catches this. Only a direct **"grep every enum in the ORM schema, diff against `enum_range()` in the live db"** check does.

**Template change:** add Phase 1c SCHEMA DRIFT AUDIT. Auto-runs:

- Every `pgEnum`/`mysqlEnum` in the ORM schema gets diffed against the live db
- Every table's columns (names + types + nullability) gets diffed
- Every required migration file exists on disk
  Output: a drift report blocking Phase 2.

### 5. Sub-agents cargo-cult each other's mistakes — fix one, THEN fan out

Three parallel spec-writing agents all invented the same wrong bug submission payload shape: `{title, description, category, priority}`. The real schema requires `{description, category, context: {url, browser, userAgent, userRole, userId}}` — title is auto-derived. This caused ~14 test failures that looked like production bugs but were actually test bugs.

Each agent read the skill doc, each agent made the same assumption, each agent copied the pattern to their other specs. The fix required editing every spec they touched.

**Rule:** when spawning multiple spec-writing agents in parallel, run ONE first with a small scope, review its output, THEN spawn the pack with its correct shapes embedded in the prompt.

**Template change:** seed harness outputs a `fixtures/canonical-payloads.json` file with one working example per mutation endpoint. Spec agents consume fixtures; they don't invent shapes.

### 6. Security-test assertions must be ranges, not exact codes

Sprint 3 adversarial 04 (role escalation) expected HTTP 403 for trainer→admin. Production returned 401 because admin middleware ran requireAuth first. **Both are secure** — the test was just too strict. 8 tests failed for this reason alone.

**Rule:** adversarial/security assertions should always use `expect([401, 403, 404]).toContain(status)` unless the spec genuinely cares about distinguishing "not authenticated" vs "authenticated but wrong role" vs "resource doesn't exist to this caller." For permission checks, any of those three is secure.

**Template change:** update `.claude/skills/adversarial-test-design/SKILL.md` with the "range assertions" rule. Add a helper: `expectDenied(status)` that accepts any of 401/403/404.

### 7. SPA pages need `page.goto + networkidle`, not raw HTTP fetch

Testing the funnel pages with `fetch()` returned empty SPA shells and the pricing tests all failed ("$199 not in HTML"). The actual page renders prices in React after the bundle loads. 5 tests failed for this reason. Fix was a separate spec using `page.goto(url, {waitUntil: 'networkidle'})` + `locator.innerText` — which then passed 7/7.

**Rule:** for any content that's client-side-rendered, the warfare skill must distinguish:

- **Shell assertions** (raw HTTP GET) — assert 200, Content-Type, minimum byte count, nothing about content
- **Render assertions** (Playwright page.goto) — assert DOM content after React renders

**Template change:** update the `workflows/` skill to include both spec patterns with names: `*-shell.spec.ts` and `*-rendered.spec.ts`. Document when to use which.

### 8. The warfare run MUST have a pre-flight phase

Finding a critical bug early (enum drift, 404 hang) means every subsequent test you run can't trust its assertions. 40 of tonight's 40 failures happened in specs that ran on a broken target. If we'd found the 404 hang on the first curl instead of after the spec pack ran, 20+ specs would have been green on the first try instead of needing fixes.

**Template change:** warfare is now 8 phases, not 7. New Phase 0.5 PRE-FLIGHT runs:

- API 404 probe
- Schema drift audit
- Seed harness dry-run
- Health check on every external dep (OpenAI, S3, Stripe, etc.)

If any fail, the whole run aborts and emits a "fix these first" report. No point running 200 adversarial specs against a hanging API.

### 9. Matrix annotation reconciliation needs tooling, not discipline

Coverage went from 0% → 9.5% even though 157 tests were written. Each parallel agent wrote `@cover` annotations in a slightly different format. The matrix tracker couldn't correlate them because the test_id naming varied.

**Rule:** annotation formats cannot be enforced by convention across parallel agents. They need a linter or an auto-generator.

**Template change:** add `scripts/warfare-annotate.ts` that reads each spec file, infers the suite from the directory, derives the test_id from the filename, and inserts the `@cover` annotation automatically. Remove the human-authored format entirely.

### 10. "Intentionally public" routes need an allowlist

Sprint 3 flagged `GET /api/recipes` as a HIGH security finding because it returned 200 without auth. It's actually intentional — the recipe library uses `optionalAuth` for marketing/SEO. This isn't a bug, it's a product decision.

Without an allowlist, every warfare run will flag this as a finding and waste time in triage.

**Template change:** add `docs/plans/qa-warfare-intentionally-public.md` to the v3 template. Adversarial specs read it and skip those routes. Every project documents its public API surface explicitly.

### 11. Non-destructive discipline is the biggest portable win

We ran 200+ tests against live evofitmeals.com with ZERO data corruption, ZERO wiped accounts. The canonical test credentials + actor cleanup pattern + afterAll hooks + read-mostly bias made this possible.

**Rule:** this is the most valuable pattern to generalize. Every warfare template should:

- Use canonical test accounts (never random-generated against prod)
- Bias toward reads; mutations only on data the test created in the same run
- Use `afterAll` cleanup of test-created rows (identifiable by a `warfare-` prefix or similar)
- Block any `DELETE /api/users/:id` or similar destructive ops against production by env check

### 12. Test-bug-to-prod-bug ratio is ~5:1 on first run — budget for it

Tonight: 8 production bugs, ~40 test bugs. That's a 1:5 ratio. The test bugs come from payload shape guesses, assertion strictness, skipped fields, and copy-paste errors. If the test bugs weren't there, the suite would have been too lax to catch the real bugs.

**Rule:** the FIRST warfare run on a new project will have a 1:5 real-bug-to-test-bug ratio. Don't panic when 30% of specs fail. Do a polish pass after the first run to reconcile shapes against what actually works.

**Template change:** add "Polish Pass" as an explicit Phase 6.5 between the first run and the coverage declaration. Expect test bug fixes to take 1-2 hours; they're NOT wasted work — they're the same work shifted left.

### 13. Security findings always need a verification pass

Every production bug found by warfare tonight was real. Every SECURITY finding had nuance:

- SEC-001 (recipe public) — intentional
- SEC-002 (/api/v1/tiers/\* hangs) — routes didn't exist, hang was the catch-all bug
- SEC-003 (Hal race) — real, fixed
- SEC-004 (assignment duplicates) — real, fixed tonight

3 of 4 security findings needed second-look before being called bugs. The workflow/regression/chaos findings were reliable on first report; security findings were not.

**Template change:** add a `security-findings-verification.md` step between the adversarial run and the bug-pipeline handoff. Every security finding gets a 2-minute manual verify. Every other finding goes straight to the pipeline.

### 14. Idempotent seed is not optional

We re-seeded the world ~6 times during the session. Not once did we get duplicates, FK violations, or stale state. The seed harness we wrote used "probe-first, create-if-missing" for every entity. This pattern saved us hours.

**Rule:** idempotent seed is table stakes for warfare. A seed that throws on re-run is a seed that blocks iteration.

**Template change:** the seed harness skeleton in the v3 template includes the probe-first pattern with a generic helper: `ensureOrCreate(entityName, probeFn, createFn)`. Copy-pasteable to any project.

### 15. "Dedupe existing rows THEN add unique index" is the safe migration pattern

Migration 0028 (bug #8) had to add a `UNIQUE(mealPlanId, customerId)` constraint to a table that might already have duplicates in production. Doing this in the wrong order would fail the migration and block deploy.

The right order:

1. DELETE duplicates keeping the oldest row
2. Handle equal-timestamp ties by keeping smallest id
3. `CREATE UNIQUE INDEX IF NOT EXISTS`
4. All wrapped in a DO $$ block so the migration is idempotent

**Rule:** any warfare-surfaced bug that requires a unique constraint follows this 4-step pattern. Pattern goes in the skill as a copy-paste template.

---

## Template changes summary (v2 → v3)

### New phases

| Phase           | v2           | v3                                                                      |
| --------------- | ------------ | ----------------------------------------------------------------------- |
| 0.5 PRE-FLIGHT  | —            | NEW — API 404 probe + schema drift + seed dry-run + external dep health |
| 1a/1b RECON     | single phase | split: pattern-match vs schema-verified                                 |
| 1c SCHEMA DRIFT | —            | NEW — diff every enum against live db                                   |
| 6.5 POLISH PASS | —            | NEW — explicit test-bug reconciliation                                  |

### New skills to create

1. `pre-flight-probe` — runs phase 0.5 checks, blocks warfare on failure
2. `schema-drift-audit` — diffs ORM schema vs live db
3. `annotation-auto-generator` — derives `@cover` from file paths
4. `canonical-payloads-generator` — seed harness emits `fixtures/` for spec agents

### Existing skills to update

1. `adversarial-test-design` — add "range assertions" rule, add `expectDenied()` helper, add intentionally-public allowlist
2. `interaction-surface-mapping` — require schema-verified pass, enforce "nothing downstream reads from pattern-match recon"
3. `side-effect-verification` — add SPA rendered-vs-shell distinction
4. `cross-role-integrity` — add fixtures consumer pattern
5. `state-machine-coverage` — require state machine verification via schema grep BEFORE authoring transitions

### Universal baseline tests (added to every project's regression suite)

1. API-404 probe — `/api/*` unmatched returns JSON 404 in <500ms
2. SPA-shell probe — funnel pages return 200 with minimum byte count
3. Rendered-content probe — `page.goto` + `networkidle` verifies critical DOM text
4. Schema-drift probe — every ORM enum matches live db enum_range
5. Seed-harness dry-run — idempotent, converges on re-run, no duplicates
6. External-dep health — every third-party dep pings OK before suite runs

---

## Portable template structure

For copying to other projects, the v3 warfare template ships as:

```
.claude/skills/forge-qa-warfare-v3/
  SKILL.md                       # 8-phase pipeline (was 7)
  phases/
    00-pre-flight.md             # NEW
    01a-recon-pattern.md
    01b-recon-verified.md        # NEW
    01c-schema-drift.md          # NEW
    02-battle-plan.md
    03-seed.md
    04-build.md
    04b-failure-injection.md
    05-long-form.md
    06-verify.md
    06b-polish-pass.md           # NEW
    07-report.md
  templates/
    actors/                      # 7 actor base classes
    seed-world.ts.template       # idempotent probe-first pattern
    playwright.config.template
    coverage-matrix.csv.template
    fixtures-schema.ts.template
  baseline-tests/                # UNIVERSAL — copy to every project
    api-404-probe.spec.ts
    spa-shell-probe.spec.ts
    schema-drift-probe.test.ts
    seed-dry-run.test.ts
  helpers/
    expectDenied.ts              # range assertion helper
    annotation-generator.ts
    schema-differ.ts
```

Any project adopts it with:

```bash
cp -r ~/.claude/skills/forge-qa-warfare-v3 <target-project>/.claude/skills/
```

Then customizes `phases/01b-recon-verified.md` with project-specific schema paths and runs Phase 0.5 first.

---

## What we're NOT changing

Some v2 decisions were right and should stay:

1. **7-actor model** (Trainer/Client/Admin/Anon/Attacker/Hal/Stripe-analogue) — correct level of abstraction for multi-role SaaS
2. **Non-destructive production default** — saved us from a dozen data-corruption incidents
3. **Canonical test credentials** — stable, predictable, auditable
4. **Actor classes wrapping a typed API client** — better than raw fetch for maintainability
5. **Coverage matrix as a 5-D CSV** — scales to thousands of cells, stays human-readable
6. **Skill-per-sub-concern** (6 sub-skills) — right level of granularity
7. **Parallel agent spec authoring** — 10x faster than sequential, worth the test-bug churn
8. **Production as the test target** — forces shape accuracy, surfaces real bugs, keeps dev DB from diverging

---

## Top 5 rules to remember

1. **Verify recon against schema before ANY downstream work**
2. **Seed harness is phase 1. Nothing runs if seed fails.**
3. **API 404 catch-all is a universal baseline test**
4. **Fixtures > guesses. Seed emits them, agents consume them.**
5. **Security findings need a verification pass. Everything else is trusted.**

---

## Next actions

- [ ] Create `~/.claude/skills/forge-qa-warfare-v3/` as the portable template
- [ ] Extract 6 universal baseline tests into standalone specs
- [ ] Update the 6 sub-skills with the lessons above
- [ ] Add polish pass as an explicit phase in the FMP cycle (fix the 40 test bugs now)
- [ ] Port the template to a second project (EvoFitTrainer is the natural next candidate) to validate portability
