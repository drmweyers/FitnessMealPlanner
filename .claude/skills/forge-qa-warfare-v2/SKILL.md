---
name: forge-qa-warfare-v2
description: Exhaustive actor-based QA warfare for FitnessMealPlanner. Targets 100% of the role × endpoint × state × input × assertion coverage matrix across admin/trainer/customer/anon/attacker. Wraps 6 sub-skills (surface mapping, adversarial, state machines, cross-role, side effects, chaos) into a 9-phase pipeline. Invoke with /forge-qa-warfare-v2 or trigger phrases - "warfare v2", "FMP full QA", "warfare QA for meal planner", "100 percent coverage".
---

# FORGE QA Warfare v2 — FitnessMealPlanner

**Philosophy:** _If a role can do it, we test it. If a role can abuse it, we prove it can't. If the app depends on it, we prove it survives when it fails._ No smoke tests. No page-load checks. Every test is a cell in a measurable coverage matrix.

## Source of truth

- Brainstorm: `docs/plans/2026-04-12-qa-warfare-v2-brainstorm.md`
- Surface map: `docs/plans/qa-warfare-recon-surface.md`
- Adversarial research: `docs/plans/qa-warfare-adversarial-research.md`
- Gap audit: `docs/plans/qa-warfare-gap-audit.md`
- Coverage matrix: `docs/plans/coverage-matrix.csv`

## Sub-skills this orchestrates

1. `interaction-surface-mapping` — Phase 1
2. `adversarial-test-design` — Phases 2, 4b
3. `state-machine-coverage` — Phases 2, 4
4. `cross-role-integrity` — Phases 2, 4
5. `side-effect-verification` — Phases 2, 4
6. `chaos-failure-injection` — Phases 2, 4b

---

## 9 Phases

### Phase 0 — CONTEXT LOAD (new)

Read these before anything else:

- `CLAUDE.md` (project)
- `docs/businesslogic.md` (if exists) — else flag as a gap and create one
- `server/db/schema.ts` — all enums, all relations
- `.env.example` — all external services
- `.wolf/buglog.json` — past bugs become regression cells
- `git log --since="30 days ago"` — recent changes get priority coverage
- `~/Claude/second-brain/dev-updates/fitnessmealplanner.md` — Hal's context

**Output:** `docs/plans/qa-warfare-context.md` — one page summary.

### Phase 1 — RECON (invoke `interaction-surface-mapping`)

Produces:

- `qa-warfare-recon-surface.md` (inventory)
- `state-machines.md` (FSM diagrams)
- `coverage-matrix.csv` (cell scaffold, all cells `pending`)

### Phase 2 — BATTLE PLAN

Organize tests into **5 categories × FMP-shaped suites**:

#### A. Workflow Suites — `tests/e2e/simulations/workflows/` (18 suites, replacing v1's 10)

| #   | Suite                   | Chain                                                                   |
| --- | ----------------------- | ----------------------------------------------------------------------- |
| 01  | customer-onboarding     | Trainer invites → customer registers → appears on roster                |
| 02  | meal-plan-lifecycle     | Generate → save → assign → customer views → archive                     |
| 03  | recipe-discovery        | Search → filter → favorite → collection → assign to plan                |
| 04  | grocery-list            | Auto-generate from plan → check items → persist                         |
| 05  | progress-tracking       | Customer logs measurements/photos/goals → trainer reviews               |
| 06  | bulk-generation         | Admin BMAD start → SSE progress → DB validate → library appears         |
| 07  | pdf-export              | Plan → branded PDF → content parsed → email delivery                    |
| 08  | bug-pipeline            | Customer report → admin triage → Hal claim → resolve → notify           |
| 09  | admin-operations        | User mgmt, tier grants, recipe moderation, cache clear                  |
| 10  | funnel-conversion       | Public /get-started → /professional → Stripe → tier applied → dashboard |
| 11  | tier-gating             | Starter/Pro/Enterprise limits, upgrades, downgrades                     |
| 12  | chatgpt-meal-parser     | Paste → parse → preview → save to plan                                  |
| 13  | macro-filter-generation | Advanced filter → generate → result matches                             |
| 14  | trainer-profile         | Edit profile, branding, logo, bio                                       |
| 15  | customer-profile        | Edit profile, health info, preferences                                  |
| 16  | auth-and-password       | Register, login, reset, change, deactivate                              |
| 17  | invitation-lifecycle    | Send, accept, expire, revoke                                            |
| 18  | subscription-lifecycle  | Trial, active, pause, cancel, expire                                    |

#### B. Adversarial Suites — `tests/e2e/simulations/adversarial/` (4 suites)

| #   | Suite             | Invokes                                                  |
| --- | ----------------- | -------------------------------------------------------- |
| A1  | permission-matrix | `adversarial-test-design` → 4 roles × every endpoint     |
| A2  | idor-suite        | IDOR across every owned resource                         |
| A3  | injection-and-xss | SQL wildcards + XSS across every stored string           |
| A4  | auth-bypass       | Expired/forged/null tokens, mass-assignment, rate limits |

#### C. State Machine Suites — `tests/e2e/simulations/state-machines/` (6 suites — one per resource)

| #   | Resource                    | Invokes                  |
| --- | --------------------------- | ------------------------ |
| S1  | meal-plan-transitions       | `state-machine-coverage` |
| S2  | recipe-transitions          | `state-machine-coverage` |
| S3  | bug-report-transitions      | `state-machine-coverage` |
| S4  | subscription-transitions    | `state-machine-coverage` |
| S5  | invitation-transitions      | `state-machine-coverage` |
| S6  | bulk-generation-transitions | `state-machine-coverage` |

#### D. Cross-Role Interaction Suites — `tests/e2e/simulations/interactions/` (6 suites)

| #   | Chain                      | Invokes                                                       |
| --- | -------------------------- | ------------------------------------------------------------- |
| X1  | trainer-customer-plan-loop | Trainer assigns → customer views → progress → trainer reviews |
| X2  | bug-pipeline-chain         | Customer → admin → Hal → resolve → customer                   |
| X3  | funnel-to-tier-chain       | Anon → Stripe → webhook → tier → dashboard                    |
| X4  | bulk-gen-to-library-chain  | Admin → SSE → library → trainer assigns                       |
| X5  | recipe-moderation-chain    | Trainer submits → admin approves → library                    |
| X6  | 30-day-customer-journey    | Long-form daily simulation                                    |

#### E. Chaos Suites — `tests/e2e/simulations/chaos/` (6 suites)

| #   | Dependency    | Invokes                   |
| --- | ------------- | ------------------------- |
| C1  | openai-chaos  | `chaos-failure-injection` |
| C2  | dalle-chaos   |                           |
| C3  | s3-chaos      |                           |
| C4  | stripe-chaos  |                           |
| C5  | mailgun-chaos |                           |
| C6  | db-chaos      |                           |

#### F. UI Coverage — `tests/e2e/simulations/coverage/` (4 suites, same as v1)

Buttons, modals, forms, dropdowns — now measured against `coverage-matrix.csv`.

**Output:** `docs/plans/qa-warfare-battle-plan.md` with every suite file listed and every matrix cell it will cover.

### Phase 3 — SEED

Create `tests/e2e/simulations/seed/seed-world.ts`:

```
SEED SEQUENCE (all via API, idempotent):
1. Create: admin + 3 trainers (Starter, Pro, Enterprise) + 6 customers + 1 anon + 1 attacker
2. Each trainer creates 3 meal plans (varied macros)
3. Assign plans to customers (3 trainer-customer links)
4. Seed 10 recipes per trainer (status: pending/approved/rejected mix)
5. Admin approves half
6. Customers complete 7 days of progress logs
7. Customer-1 submits 2 bug reports
8. Admin grants 1 tier upgrade
9. Assert: all analytics endpoints return populated data
10. Write fixture snapshot to `seed/state-snapshot.json` for diff-based re-seed
```

Seed is re-run before every suite. Idempotency via stable IDs.

### Phase 4 — BUILD (parallel streams)

| Stream    | Owns                       | Agent                 |
| --------- | -------------------------- | --------------------- |
| Stream W  | Workflow suites 01-18      | workflow-builder      |
| Stream A  | Adversarial suites A1-A4   | adversarial-builder   |
| Stream S  | State machine suites S1-S6 | state-machine-builder |
| Stream X  | Cross-role suites X1-X5    | cross-role-builder    |
| Stream UI | UI coverage suites         | ui-coverage-builder   |

TDD loop per test: RED → diagnose (feature bug vs test bug) → GREEN. Every GREEN updates `coverage-matrix.csv`.

### Phase 4b — FAILURE INJECTION (new, parallel with 4)

Dedicated chaos sprint:

- Install MockAgent/undici interceptor in test bootstrap
- Build one chaos suite per external dependency (C1-C6)
- Every chaos test asserts: user-visible behavior + DB consistency + no orphans
- Orphan sweeper runs after every chaos suite

### Phase 5 — LONG-FORM (30 days, up from v1's 14)

`tests/e2e/simulations/long-form/30-day-customer-journey.spec.ts`:

Simulates a real customer across a full month:

- Week 1: onboarding, first plan, learning the app
- Week 2: full adherence, first measurements
- Week 3: compliance gap (miss 2 days), trainer follow-up
- Week 4: plan adjustment by trainer, new goals, progress review
- End: generate full analytics + PDF report + trainer review

**Data persists.** Analytics suites run AFTER this and assert on real accumulated data.

### Phase 6 — MULTI-AGENT VERIFY (7 agents, up from v1's 3)

Spawn in parallel — each audits coverage from a perspective:

| Agent                        | Lens                                       | Gap report target |
| ---------------------------- | ------------------------------------------ | ----------------- |
| Admin Auditor                | Every admin action tested?                 | admin-gap.md      |
| Trainer Auditor              | Every trainer action tested?               | trainer-gap.md    |
| Customer Auditor             | Every customer action tested?              | customer-gap.md   |
| Security Auditor (new)       | Every IDOR, XSS, auth edge?                | security-gap.md   |
| Tier-Gating Auditor (new)    | Every tier boundary? upgrades? downgrades? | tier-gap.md       |
| Revenue/Funnel Auditor (new) | Every funnel → tier conversion path?       | revenue-gap.md    |
| Data-Integrity Auditor (new) | Every cascade, orphan, audit log?          | integrity-gap.md  |

Each agent outputs a list of pending matrix cells. Main loop builds any remaining cells.

### Phase 7 — REPORT & UPDATE

1. Full suite run: `npx playwright test tests/e2e/simulations/ --reporter=html`
2. Coverage matrix heatmap: `docs/plans/qa-warfare-coverage-heatmap.md`
3. Mutation score on critical controllers (Stryker): target ≥70%
4. Update:
   - `docs/businesslogic.md` (truth)
   - `CLAUDE.md` (test counts)
   - `~/Claude/second-brain/dev-updates/fitnessmealplanner.md` (Hal bridge)
   - `.wolf/cerebrum.md` (learnings)
5. Each fixed bug → append to `.wolf/buglog.json` with a test file reference.

---

## Actor Roster (7, up from 3)

```typescript
abstract class BaseActor {
  login();
  api;
  page;
}
class AdminActor extends BaseActor {
  /* ~15 methods */
}
class TrainerActor extends BaseActor {
  tier: "starter" | "pro" | "enterprise"; /* ~25 methods */
}
class CustomerActor extends BaseActor {
  /* ~20 methods */
}
class AnonActor extends BaseActor {
  /* funnel only, no auth */
}
class AttackerActor extends BaseActor {
  /* all adversarial helpers */
}
class HalActor extends BaseActor {
  /* claims bugs, posts fixes via Hal API */
}
class StripeActor {
  /* webhook sender, valid + invalid signatures */
}
```

## Coverage Matrix — the single source of truth

`docs/plans/coverage-matrix.csv`:

```
cell_id,role,action,state,input_class,assertion_type,status,test_file,bug_regression
```

- `pending` → cell must be built
- `tested` → cell has a live passing test
- `n/a` → cell is impossible (e.g., anon on admin endpoint is tested as forbidden, not as feature)
- `known_gap` → cell is deferred with a justification

**Coverage = (tested + n/a) / total**. Target: 100%.

## Prerequisites

- Docker stack up: `docker-compose --profile dev up -d`
- Playwright installed: `npx playwright install chromium`
- Test DB seeded
- Mock external services bootstrap loaded
- Hal bridge dev URL available

## Invocation

When invoked, execute phases 0 → 7 in order. Phases 4 and 4b run in parallel. Phase 6 runs 7 agents concurrently. Do not skip phases.

**Estimated scope:** ~500-700 new tests across 38 suite files, replacing the 33 smoke specs from v1.

## Success criteria

- Coverage matrix has 0 `pending` cells
- Every suite GREEN in CI
- Mutation score ≥ 70% on critical controllers
- Every past bug in `buglog.json` has a regression test
- `docs/businesslogic.md` is up-to-date and diffs cleanly against the surface map
