# FORGE QA Warfare v2 — Agile Execution Plan

**Date:** 2026-04-12
**Owner:** CTO (Claude) + parallel agent streams
**Target:** 100% coverage matrix, zero `pending` cells
**Duration:** 6 sprints × ~2 days each = ~12 days total

---

## Epics → Stories → Sprints

### Epic 1 — Foundation (Sprint 1)

**Goal:** Context load, RECON, coverage matrix scaffold, actor helpers.

| Story                                       | Acceptance                                                               | Owner               |
| ------------------------------------------- | ------------------------------------------------------------------------ | ------------------- |
| 1.1 Phase 0 context load doc                | `docs/plans/qa-warfare-context.md` committed                             | main                |
| 1.2 Run `interaction-surface-mapping` skill | `recon-surface.md`, `state-machines.md`, `coverage-matrix.csv` generated | cartographer agent  |
| 1.3 Build 7 actor classes                   | `tests/e2e/simulations/actors/*.ts` compiled                             | actor-builder agent |
| 1.4 Build seed harness                      | `seed/seed-world.ts` idempotent, runs in <60s                            | seed agent          |
| 1.5 CI gate: matrix tracker                 | `scripts/coverage-matrix-report.ts` outputs % tested                     | main                |

**Sprint 1 Definition of Done:**

- Every route/API in the repo is in `coverage-matrix.csv`
- 7 actors compile and can log in
- Seed runs idempotently
- `npm run warfare:matrix` prints current coverage %

---

### Epic 2 — Workflow Suites (Sprints 2-3)

**Goal:** Build all 18 workflow suites (happy-path + realistic branches).

**Parallel streams (4 agents):**

| Stream  | Suites                                                                                            | Sprint |
| ------- | ------------------------------------------------------------------------------------------------- | ------ |
| W-Alpha | 01 onboarding, 02 meal plan, 03 recipe discovery, 04 grocery                                      | 2      |
| W-Beta  | 05 progress, 06 bulk gen, 07 PDF, 08 bug pipeline                                                 | 2      |
| W-Gamma | 09 admin ops, 10 funnel, 11 tier gating, 12 ChatGPT parser                                        | 3      |
| W-Delta | 13 macro filter, 14 trainer profile, 15 customer profile, 16 auth, 17 invitation, 18 subscription | 3      |

**Each story = one spec file.** RED → diagnose → GREEN → update coverage matrix.

**DoD per suite:**

- All happy-path workflows covered
- Each test asserts DB state + UI render + at least one side effect
- Matrix cells for the suite move from `pending` → `tested`
- Suite runs GREEN in <90s

---

### Epic 3 — Adversarial + State Machines (Sprint 4)

**Parallel streams (2 agents):**

| Stream | Deliverable                                                                                            |
| ------ | ------------------------------------------------------------------------------------------------------ |
| Adv    | Suites A1-A4 (permission matrix, IDOR, XSS/injection, auth bypass). Invokes `adversarial-test-design`. |
| SM     | Suites S1-S6 (one per stateful resource). Invokes `state-machine-coverage`.                            |

**DoD:**

- Permission matrix has 4 roles × 103 endpoints = 412 cells exercised (most via a generator test)
- Every illegal state transition is tested and rejected
- Every cascade delete is verified
- `AttackerActor` has all 7 methods implemented
- Zero regressions on past security bugs from `.wolf/buglog.json`

---

### Epic 4 — Cross-Role + Chaos (Sprint 5)

**Parallel streams (2 agents):**

| Stream | Deliverable                                                                                          |
| ------ | ---------------------------------------------------------------------------------------------------- |
| X      | Suites X1-X5 (interaction chains). Invokes `cross-role-integrity`.                                   |
| C      | Suites C1-C6 (chaos per dependency). Invokes `chaos-failure-injection` + `side-effect-verification`. |

**DoD:**

- Every cross-role touchpoint has a dual-perspective test
- Every bug-pipeline hop is exercised end-to-end
- Every external dependency has timeout/429/500/disconnect tests
- Orphan sweeper passes after every chaos suite
- Side-effect harness captures emails, SSE, webhooks, S3 writes, audit rows

---

### Epic 5 — Long-Form + Multi-Agent Verify (Sprint 6 — first half)

| Story                            | Deliverable                                                                |
| -------------------------------- | -------------------------------------------------------------------------- |
| 5.1 30-day customer journey spec | `long-form/30-day-customer-journey.spec.ts` — runs in <5 min               |
| 5.2 Analytics-after-data spec    | `long-form/analytics-after-data.spec.ts` — asserts charts render real data |
| 5.3 Spawn 7 verification agents  | Each writes a gap report                                                   |
| 5.4 Close all identified gaps    | Every gap → new test or `known_gap` justification                          |

**DoD:**

- 30-day sim fills DB with realistic accumulated data and passes
- Analytics suites assert on real numbers
- 7 gap reports merged
- Coverage matrix < 1% `pending`

---

### Epic 6 — Report, Regression Link, CI (Sprint 6 — second half)

| Story                                                  | Deliverable                                                                                                  |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| 6.1 Coverage heatmap                                   | `docs/plans/qa-warfare-coverage-heatmap.md` auto-generated                                                   |
| 6.2 Mutation testing (Stryker) on critical controllers | ≥70% mutation score on `controllers/meals`, `controllers/recipes`, `controllers/bulkGen`, `controllers/auth` |
| 6.3 Link every buglog entry to regression test         | `.wolf/buglog.json` gets `regression_test` field                                                             |
| 6.4 Businesslogic doc generated from matrix            | `docs/businesslogic.md` diffs cleanly vs matrix                                                              |
| 6.5 Wire into CI                                       | GitHub Actions: fail if coverage matrix < 100% or mutation < 70%                                             |
| 6.6 Update Hal bridge                                  | `~/Claude/second-brain/dev-updates/fitnessmealplanner.md` with results                                       |

**DoD:**

- CI blocks merges on matrix regression
- Hal can see results without reading code
- `CLAUDE.md` test counts updated

---

## Sprint Cadence

```
Sprint 1: Days 1-2   Foundation
Sprint 2: Days 3-4   Workflow suites Alpha + Beta (parallel)
Sprint 3: Days 5-6   Workflow suites Gamma + Delta (parallel)
Sprint 4: Days 7-8   Adversarial + State Machines (parallel)
Sprint 5: Days 9-10  Cross-Role + Chaos (parallel)
Sprint 6: Days 11-12 Long-Form + Verify + Report + CI
```

## Daily Standup Template

Appended to `docs/plans/qa-warfare-standup.md` each day:

```
## Day N — YYYY-MM-DD
- Streams running: X, Y
- Suites built: N
- Matrix coverage: N%
- Blockers: ...
- Tomorrow: ...
```

## Definition of Done — Whole Epic

- [ ] Every cell in `coverage-matrix.csv` is `tested` or justified `known_gap`
- [ ] Every suite runs GREEN in CI
- [ ] Mutation score ≥70% on critical controllers
- [ ] Every past bug has a regression test
- [ ] Heatmap generated and reviewed
- [ ] Hal bridge updated
- [ ] `CLAUDE.md` test counts updated
- [ ] Surface map diffs cleanly against `docs/businesslogic.md`

## Risk Register

| Risk                                           | Mitigation                                                              |
| ---------------------------------------------- | ----------------------------------------------------------------------- |
| Dev server flake under parallel load           | Serialize heavy suites; use `--workers=2` for chaos suites              |
| External sandbox keys (Stripe/Mailgun) needed  | Use mocks via undici MockAgent; only wire real sandboxes in nightly job |
| 30-day sim slow (>10 min)                      | Split into 6 × 5-day chunks that can run in parallel                    |
| Coverage matrix drift vs code                  | Regenerate matrix scaffold nightly; diff against last snapshot          |
| Agent context bloat during multi-stream sprint | Each stream runs in isolated worktree; main context only holds matrix   |

## Agent Assignments (parallelizable streams)

| Stream                            | Agent type                                          | Isolation     |
| --------------------------------- | --------------------------------------------------- | ------------- |
| W-Alpha, W-Beta, W-Gamma, W-Delta | general-purpose with Playwright                     | worktree each |
| Adv                               | general-purpose with skill: adversarial-test-design | worktree      |
| SM                                | general-purpose with skill: state-machine-coverage  | worktree      |
| X                                 | general-purpose with skill: cross-role-integrity    | worktree      |
| C                                 | general-purpose with skill: chaos-failure-injection | worktree      |
| 7 verification agents (Phase 6)   | Explore-style read-only                             | in-context    |

Each worktree commits to a branch like `warfare-v2/stream-<name>`; they are merged into `warfare-v2/integration` daily.

## Kickoff command

When ready:

```
/forge-qa-warfare-v2
```

(or trigger phrase "start warfare v2"). This executes Phase 0 immediately and Phase 1 RECON after context load.
