# FORGE QA Warfare v2 — Phase 0 Context Load

**Date:** 2026-04-12
**Sprint:** 1 / Story 1.1
**Purpose:** Single source of truth for every warfare-v2 actor, suite, and verification agent. Everything in Sprints 2–6 reads from this file.

---

## 1. Stack

| Layer    | Tech                                                                    |
| -------- | ----------------------------------------------------------------------- |
| Frontend | React 18, TypeScript, Vite, TailwindCSS, Framer Motion, TanStack Query  |
| Backend  | Node.js, Express, TypeScript                                            |
| DB       | PostgreSQL + Drizzle ORM                                                |
| Auth     | JWT (access 15m + refresh 30d), bcrypt, Google OAuth                    |
| Storage  | DigitalOcean Spaces (S3-compatible) via `AWS_*` env vars                |
| AI       | OpenAI GPT-4 (recipe concepts), DALL-E 3 (images)                       |
| Email    | Resend                                                                  |
| Payments | Stripe (one-time + monthly subscriptions)                               |
| Realtime | SSE (BMAD bulk generation progress)                                     |
| Deploy   | DigitalOcean App Platform → `evofitmeals.com`, auto-deploys from `main` |
| Dev      | Docker Compose, port 4000 (prod-like), port 5001 (legacy dev)           |

## 2. Roles (user_role enum)

Three in DB: `admin`, `trainer`, `customer`.
Warfare v2 adds four synthetic roles — not in DB, only in test actors:

- `anon` — unauthenticated visitor
- `attacker` — authenticated user attempting cross-tenant abuse
- `hal` — OpenClaw bot hitting bug-pipeline polling/claim endpoints with `HAL_API_KEY`
- `stripe` — webhook signer hitting `/api/subscription/webhook` and `/api/v1/stripe/webhook`

## 3. Tier levels (tier_level enum)

`starter` | `professional` | `enterprise` — gates: recipe library caps, monthly AI generations, customer capacity, analytics depth, branding, white-label.

Canonical one-time pricing: **$199 / $299 / $399**. Do not confuse with monthly legacy plans ($14.99 / $29.99 / $59.99).

## 4. Surface counts (from `qa-warfare-recon-surface.md`)

| Category                   | Count |
| -------------------------- | ----- |
| Client routes              | 26    |
| API endpoints              | 103   |
| UI components              | 139   |
| State machines             | 4     |
| Cross-role touchpoints     | 8     |
| Side-effect triggers       | 8     |
| Tier-gated feature sets    | 7     |
| Forms / validation schemas | 13    |

Route files confirmed in `server/routes/`:
accountDeletion, adminAnalytics, adminDashboard, adminRoutes, analytics, branding,
bugReports, bulkGeneration, commandCentre, customerRoutes, emailAnalytics,
emailPreferences, entitlements, export, favorites, funnelCheckout, groceryLists,
mealPlan, mealPlanSharing, mealTypes, payment, pdf, profileRoutes, progressRoutes,
progressSummaries, ratings, recipes, subscriptionRoutes, tierRoutes, trainerRoutes,
trending, usageRoutes.

## 5. State machines (from recon)

1. **Meal Plan:** `draft → assigned → active → paused | archived`
2. **Recipe:** `pending → approved | rejected | deprecated`
3. **Bug Report:** `open → claimed → resolved`
4. **Subscription:** `trial → active → paused | canceled`

Full transition matrices are produced in Sprint 1 Story 1.2 (`docs/plans/qa-warfare-state-machines.md`).

## 6. Cross-role touchpoints (must all have bidirectional tests)

1. Trainer assigns meal plan → Customer sees + email fired
2. Trainer assigns recipe → Customer sees (tier-filtered)
3. Trainer pauses customer → Customer features disable
4. Customer submits bug → Admin sees + GitHub issue + Hal polls
5. Customer rates recipe → Admin moderation alert on flag
6. Admin grants tier → Trainer unlocks features immediately
7. Admin bulk generates → Trainer recipe library grows
8. Admin clears cache → All users get fresh data

## 7. Side-effect triggers (must all assert the side effect fired, not just 200 OK)

| Trigger             | Downstream               | Verification method         |
| ------------------- | ------------------------ | --------------------------- |
| Recipe submitted    | GitHub issue             | undici interceptor snapshot |
| Bug submitted       | GitHub + Hal bridge file | file mtime + contents       |
| Meal plan assigned  | Resend email             | Resend API stub log         |
| Recipe rated (flag) | Moderation queue         | DB row assert               |
| Photo uploaded      | DO Spaces                | S3 HEAD request             |
| Bulk generation     | OpenAI + DALL-E + Spaces | interceptor + SSE stream    |
| Customer invited    | Resend email             | stub log                    |
| Account deleted     | Spaces + DB cascade      | orphan sweeper              |

## 8. External dependencies (chaos-failure-injection targets)

- OpenAI API (`api.openai.com`)
- DALL-E (`api.openai.com/v1/images`)
- DigitalOcean Spaces (S3-compatible)
- Resend (`api.resend.com`)
- Stripe (`api.stripe.com` + webhooks)
- GitHub API (`api.github.com`)
- Hal bridge (filesystem path + polling API)

All intercepted via undici `MockAgent`. Failure modes tested: 500, 429, timeout, network error, malformed response.

## 9. Environment contract

Required in dev: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET`.
Required for side-effect suites (can be mocked): `AWS_*`, `OPENAI_API_KEY`, `RESEND_API_KEY`, `STRIPE_SECRET_KEY`, `GITHUB_TOKEN`, `HAL_API_KEY`.
Frontend URL: `http://localhost:4000`. Production: `https://evofitmeals.com`.

## 10. Official test credentials (OFFICIAL_TEST_CREDENTIALS.md)

| Role     | Email                         | Password         |
| -------- | ----------------------------- | ---------------- |
| Admin    | admin@fitmeal.pro             | AdminPass123     |
| Trainer  | trainer.test@evofitmeals.com  | TestTrainer123!  |
| Customer | customer.test@evofitmeals.com | TestCustomer123! |

Reset: `npm run reset:test-accounts`. Credentials are immutable — do not change them in tests.

## 11. Recent shipped features (last 30 days)

- Advanced macro/nutrition filters on Generate Plans tab (1574d16)
- Trainer/customer Edit Profile wired up + ChatGPT meal parser (ea871a5)
- Admin Bulk Generator consolidation (2826dba)
- FORGE QA v1 suite — 33 specs, 124 passing (f9a1cb1)
- Bug pipeline + Hal + Command Centre (2026-04-07)
- Sales funnel (6 pages, value ladder, canonical pricing) (2026-03-28)
- Image generation orphan-prevention fix (2026-03-27)
- Production recipe restructuring → exactly 6,000 recipes

## 12. Known bug/risk register (seed for regression gate)

Memory and recent commits flag these as "fixed, do not regress":

1. **Batch executor timeouts under load** — must use 90s/recipe budget; server crashes if exceeded.
2. **Admin API pagination** — uses `page`, not `offset`. Smart resume with broad filters silently skips real work.
3. **PDF SPA trap** — never `page.goto()` for HTML→PDF; use `page.setContent()`.
4. **Image orphan prevention** — every recipe must have DO Spaces URL; orphan sweeper must find zero.
5. **Pricing canonical lock** — $199 / $299 / $399 only; monthly tiers deprecated in funnel.
6. **Profile field drift** — no `fullName` on UserProfile; Prisma-style selects break.
7. **Migration 0022** — hardened against duplicate rows.

Every bug in this list becomes a **dedicated regression test** in Sprint 4. No exceptions.

## 13. Coverage matrix dimensions

5-D cells: `role × endpoint × state × input-class × assertion-type`.

- **role**: admin, trainer, customer, anon, attacker, hal, stripe (7)
- **endpoint**: 103 API + 26 route (129)
- **state**: each resource's state enum × "no-such-resource"
- **input-class**: valid, boundary, malformed, malicious, idempotent-repeat, concurrent
- **assertion-type**: http, db-row, side-effect, cross-role-view, audit-log, invariant

Done = **zero `pending` cells** in `docs/plans/qa-warfare-coverage-matrix.csv`.

## 14. Suites in scope (38 total, up from v1's 10)

Workflows (10): onboarding, meal-plan-lifecycle, recipe-discovery, grocery-list, progress-tracking, bulk-generation, pdf-export, bug-pipeline, admin-operations, funnel-conversion.
Adversarial (8): idor, auth-bypass, role-escalation, xss, sql-injection, mass-assignment, idempotency, rate-limit.
State-machine (4): meal-plan-fsm, recipe-fsm, bug-fsm, subscription-fsm.
Cross-role (8): one per touchpoint in §6.
Side-effect (8): one per trigger in §7.
Chaos (6): one per external dep (OpenAI bundles DALL-E).
Long-form (1): 30-day progressive multi-role simulation.
Regression (∞): one per bug in §12, grows with every bug fix.

## 15. Constraints

- **Non-destructive against production:** warfare runs against dev (`localhost:4000`) or staging seed, never prod.
- **Idempotent seed:** rerunning `seed-world.ts` must converge, not duplicate.
- **Parallel-safe:** each actor gets its own auth session; no shared mutable test state.
- **CI gate:** merge blocked if matrix coverage drops or mutation score < 70%.
- **Reporting:** every run updates `docs/plans/qa-warfare-coverage-matrix.csv` and posts summary to `second-brain/dev-updates/fitnessmealplanner.md`.

---

**Next:** Sprint 1 Story 1.2 — cartographer agent produces `qa-warfare-state-machines.md` + `qa-warfare-coverage-matrix.csv` from this context.
