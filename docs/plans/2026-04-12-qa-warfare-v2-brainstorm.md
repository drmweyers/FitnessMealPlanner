# FORGE QA Warfare v2 — Brainstorm & Enhancement Thesis

**Date:** 2026-04-12
**Author:** CTO (Claude)
**Status:** Design — pre-implementation

---

## Why v1 isn't enough

Three parallel research agents audited the original `forge-qa-warfare` skill against FitnessMealPlanner's interaction surface. They found the same structural failure from three directions:

> **The current skill tests what the app does. It does not test what the app must NEVER do.**

v1 covers happy-path actor workflows. It has no concept of an adversary, no state-machine completeness proof, no side-effect assertion, no failure injection, no tier boundary, no cross-role integrity check, no idempotency test, and no regression link back to past bugs. The 10 suite names are EvoFitTrainer-shaped and map poorly to FMP's meal-plan/recipe/grocery/bulk-gen/funnel/bug-pipeline domain.

## The FMP interaction surface (from Agent A)

- **26 client routes** (admin 5 · trainer 9 · customer 8 · public 4)
- **103 API endpoints** across 32 route files
- **139 interactive components** (pages, modals, forms, dropdowns)
- **4 resource state machines** (meal plan, recipe, bug report, subscription)
- **8 cross-role touchpoints** (trainer→customer, customer→admin, admin→all)
- **8 side-effect triggers** (email, GitHub, Hal bridge, S3, Stripe, SSE, moderation, cascade deletes)
- **7 tier-gated features** (library, monthly gens, client cap, analytics, branding)
- **13 Zod/validation schemas**

**Coverage target:** every one of those cells, with both positive and negative assertions, for every role. That is a matrix, not a list.

## The coverage matrix (the v2 unit of measurement)

v2 measures completeness as a **5-dimensional coverage matrix**:

```
Role   × Action × State × Input-Class × Assertion-Type
(4)      (103)    (avg 3)  (5)           (6)
```

- **Roles:** unauthenticated / customer / trainer / admin
- **Actions:** one per API endpoint (103)
- **States:** relevant status values of the target resource
- **Input classes:** valid / boundary / malformed / malicious / missing
- **Assertion types:** DB state / UI render / side effect / security boundary / performance / regression

A test is a cell. 100% coverage means every cell is either `tested` or `not-applicable` — never `unknown`.

This reframes "how many tests do we have" into "how much of the matrix is still dark."

## The top 15 gaps (merged from Agents B + C)

| #   | Gap                                                                           | Severity | Fix owner                |
| --- | ----------------------------------------------------------------------------- | -------- | ------------------------ |
| 1   | IDOR / cross-trainer data access (trainer A reads trainer B's clients)        | CRITICAL | adversarial-test-design  |
| 2   | Permission 4×N matrix (every role × every endpoint)                           | CRITICAL | adversarial-test-design  |
| 3   | Tier limit race conditions (concurrent invites exceed cap)                    | CRITICAL | state-machine-coverage   |
| 4   | Side-effect assertions (email queued? SSE fired? PDF stored? webhook posted?) | CRITICAL | side-effect-verification |
| 5   | Illegal state transitions (archived→assigned, draft→complete)                 | CRITICAL | state-machine-coverage   |
| 6   | External service chaos (OpenAI 429, S3 timeout, Stripe fail mid-write)        | CRITICAL | chaos-failure-injection  |
| 7   | Stripe webhook idempotency + signature validation                             | CRITICAL | side-effect-verification |
| 8   | Bug pipeline cross-role flow (customer→admin→Hal→customer)                    | CRITICAL | cross-role-integrity     |
| 9   | Idempotency (POST twice = one row)                                            | HIGH     | adversarial-test-design  |
| 10  | XSS in stored fields (plan name, recipe title, notes) rendered to other roles | HIGH     | adversarial-test-design  |
| 11  | Pagination with SQL wildcards (`%`, `_`, `\`)                                 | HIGH     | adversarial-test-design  |
| 12  | Cross-role real-time propagation (trainer edit → customer view)               | HIGH     | cross-role-integrity     |
| 13  | Cascading delete integrity (delete trainer → all children gone, no orphans)   | HIGH     | state-machine-coverage   |
| 14  | PDF content correctness (not just 200 OK — macros, branding, structure)       | HIGH     | side-effect-verification |
| 15  | Funnel purchase journey (public page → Stripe → tier applied → dashboard)     | HIGH     | cross-role-integrity     |

## Skills we must build before the warfare skill is rebuilt

| Skill                         | Owns                           | Input            | Output                                             |
| ----------------------------- | ------------------------------ | ---------------- | -------------------------------------------------- |
| `interaction-surface-mapping` | Phase 1 RECON deepening        | Codebase         | Exhaustive surface doc + coverage matrix scaffold  |
| `adversarial-test-design`     | Negative & security tests      | Surface doc      | AttackerActor, IDOR matrix, XSS/injection suite    |
| `state-machine-coverage`      | State transition proofs        | Schema enums     | Transition matrix + illegal-transition suite       |
| `cross-role-integrity`        | Multi-actor correctness        | Touchpoint list  | Interaction specs with dual-perspective assertions |
| `side-effect-verification`    | Proving "it actually happened" | Side-effect list | Email/SSE/PDF/webhook assertion harness            |
| `chaos-failure-injection`     | External service failures      | Dependency list  | Chaos harness + recovery assertions                |

Each skill is a <150-line playbook with a concrete Playwright/Node pattern. The warfare v2 skill **orchestrates** them — it does not re-invent them.

## Enhanced warfare v2 — structural changes from v1

1. **Phase 0 — CONTEXT LOAD** (new). Read `docs/businesslogic.md`, schema, env, past buglog, recent commits. Dump into RECON seed.
2. **Phase 1 — RECON** (expanded). Use `interaction-surface-mapping` skill. Output is **the coverage matrix scaffold**, not prose.
3. **Phase 2 — BATTLE PLAN** (expanded). Instead of 10 suites, **18 FMP-shaped suites** + 4 adversarial suites + 6 chaos suites + 4 cross-role suites. Each links to matrix cells it covers.
4. **Phase 3 — SEED** (unchanged in shape; idempotent API seeding).
5. **Phase 4 — BUILD** (expanded). Four parallel streams: workflows, adversarial, chaos, cross-role.
6. **Phase 4b — FAILURE INJECTION** (new). Dedicated chaos sprint with its own harness.
7. **Phase 5 — LONG-FORM** (expanded to **30-day** realistic customer journey, not 14-day).
8. **Phase 6 — MULTI-AGENT VERIFY** (expanded from 3 agents to **7 agents**: Admin, Trainer, Customer, Security, Tier, Revenue/Funnel, Data-Integrity).
9. **Phase 7 — REPORT** (adds coverage-matrix heatmap + regression-to-buglog link + mutation score).

## New actor roster (vs v1's 3)

| Actor                 | Perspective                                   |
| --------------------- | --------------------------------------------- |
| `AdminActor`          | Full platform ops                             |
| `TrainerActor`        | Tier-aware trainer (Starter/Pro/Enterprise)   |
| `CustomerActor`       | Assigned customer                             |
| `AnonActor` (new)     | Unauthenticated funnel visitor                |
| `AttackerActor` (new) | Tries every IDOR, XSS, injection, auth bypass |
| `HalActor` (new)      | Hal bridge: claims bug reports, posts fixes   |
| `StripeActor` (new)   | Webhook sender with valid/invalid signatures  |

## Success criteria for v2

- Every one of the 103 API endpoints appears in the coverage matrix
- Every state machine has a 100% transition-coverage spec
- Every cross-role touchpoint has a dual-perspective spec
- Every side effect has a side-effect-verification spec
- Every external dependency has a chaos spec
- Every past production bug (`buglog.json` in Hal bridge) has a regression spec
- Mutation score ≥ 70% on critical controllers
- Zero unknowns in the coverage matrix

## Out of scope (explicit)

- Load testing (separate tool — k6)
- Visual regression (separate — Percy/Chromatic)
- Full i18n (English only for now)
- Penetration testing (warfare is functional security, not pentest)
