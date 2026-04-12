# QA Warfare — State Machine Specification

**Version:** 1.0.0
**Date:** 2026-04-12
**Author:** Agent C — FORGE QA Warfare v2 Cartographer
**Source of truth:** `shared/schema.ts` (all enums verified against DB)

---

## Discrepancy Report — Recon vs. Reality

| State Machine    | Recon said                                    | Reality (schema.ts)                                                                                                                                              | Delta                                                                                                        |
| ---------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Meal Plan**    | `draft → assigned → active → paused/archived` | No status column on `trainerMealPlans` or `mealPlanAssignments`. Assignment is a join-table row. Active/paused is boolean `isActive` on `sharedMealPlans` table. | **MAJOR DISCREPANCY** — recon invented states. The actual FSM is an assignment-existence model, not an enum. |
| **Recipe**       | `pending → approved/rejected/deprecated`      | Single boolean `isApproved` (default false). No rejected/deprecated column.                                                                                      | **MAJOR DISCREPANCY** — no enum. Just unapproved→approved toggle.                                            |
| **Bug Report**   | `open → claimed → resolved`                   | `open, triaged, in_progress, resolved, closed` (pgEnum). No "claimed" state.                                                                                     | **DISCREPANCY** — recon missing `triaged`, `in_progress`, `closed`; "claimed" is not a real state.           |
| **Subscription** | `trial → active → paused/canceled`            | `trialing, active, past_due, unpaid, canceled` (pgEnum). No "paused".                                                                                            | **DISCREPANCY** — "paused" does not exist. `past_due` and `unpaid` are real states not in recon.             |

> **Rule:** All tests MUST use the reality column below, not the recon doc. The recon doc is wrong on 3 of 4 machines.

---

## FSM 1 — Meal Plan (Assignment Lifecycle)

### Real Model

No status enum on meal plans. State is inferred from relationships:

- **does-not-exist** — plan not yet created in `trainerMealPlans`
- **saved** — row in `trainerMealPlans`, no row in `mealPlanAssignments` for a customer
- **assigned** — row in `mealPlanAssignments` exists linking plan to customer
- **shared** — row in `sharedMealPlans` with `isActive = true`
- **share-revoked** — row in `sharedMealPlans` with `isActive = false`
- **deleted** — no row in `trainerMealPlans` (cascade deletes assignments)

### State Definitions

| State          | DB Evidence                                                                           | Notes                    |
| -------------- | ------------------------------------------------------------------------------------- | ------------------------ |
| does-not-exist | No row in `trainerMealPlans`                                                          | Pre-creation             |
| saved          | Row in `trainerMealPlans`; no matching row in `mealPlanAssignments`                   | Trainer's library item   |
| assigned       | Row in `mealPlanAssignments` for (planId, customerId)                                 | Customer can see plan    |
| shared         | Row in `sharedMealPlans` with `isActive = true`                                       | Public share link active |
| share-revoked  | Row in `sharedMealPlans` with `isActive = false`                                      | Share link disabled      |
| deleted        | Cascade: `mealPlanAssignments` ON DELETE CASCADE; `sharedMealPlans` ON DELETE CASCADE | All downstream orphaned  |

### Transition Matrix

| From \ To          | does-not-exist | saved                                                   | assigned                                          | shared                                                     | share-revoked                                               | deleted                                                |
| ------------------ | -------------- | ------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------ |
| **does-not-exist** | —              | TRAINER `POST /api/trainer/meal-plans`                  | illegal                                           | illegal                                                    | illegal                                                     | illegal                                                |
| **saved**          | illegal        | —                                                       | TRAINER `POST /api/trainer/meal-plans/:id/assign` | TRAINER `POST /api/meal-plan-sharing`                      | illegal                                                     | TRAINER `DELETE /api/trainer/meal-plans/:id`           |
| **assigned**       | illegal        | TRAINER `DELETE /api/trainer/meal-plan-assignments/:id` | —                                                 | TRAINER `POST /api/meal-plan-sharing`                      | illegal                                                     | TRAINER `DELETE /api/trainer/meal-plans/:id` (cascade) |
| **shared**         | illegal        | illegal                                                 | illegal                                           | —                                                          | TRAINER `PATCH /api/meal-plan-sharing/:id` (isActive→false) | TRAINER `DELETE /api/trainer/meal-plans/:id` (cascade) |
| **share-revoked**  | illegal        | illegal                                                 | illegal                                           | TRAINER `PATCH /api/meal-plan-sharing/:id` (isActive→true) | —                                                           | TRAINER `DELETE /api/trainer/meal-plans/:id` (cascade) |
| **deleted**        | —              | illegal                                                 | illegal                                           | illegal                                                    | illegal                                                     | —                                                      |

### Illegal Transition Rejections

| Attempt                                                  | Expected HTTP | Notes                                |
| -------------------------------------------------------- | ------------- | ------------------------------------ |
| Assign non-existent plan                                 | 404           | Plan must exist first                |
| Assign to non-existent customer                          | 404           | Customer must belong to trainer      |
| Assign customer from different trainer                   | 403           | IDOR guard                           |
| Customer `DELETE /api/trainer/meal-plans/:id`            | 403           | Customer cannot delete trainer plans |
| Anon access any meal plan endpoint                       | 401           | JWT required                         |
| Attacker assign trainer A's plan to trainer B's customer | 403           | Cross-tenant IDOR                    |

### Concurrency Hazards

| Race                                                          | Hazard                                 | Guard                                                                                          |
| ------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Two trainers assign same plan to same customer simultaneously | Duplicate `mealPlanAssignments` rows   | No unique constraint on (mealPlanId, customerId) — **gap: could create duplicate assignments** |
| Trainer deletes plan while customer is viewing                | Customer sees 404 on stale planId      | Cascade is correct; client must handle gracefully                                              |
| Two requests toggle `sharedMealPlans.isActive` concurrently   | Final state depends on last-write-wins | No optimistic lock — potential flap                                                            |

### Cascade Effects

| Trigger                   | Downstream                              | Assertion                                                             |
| ------------------------- | --------------------------------------- | --------------------------------------------------------------------- |
| `DELETE trainerMealPlans` | `mealPlanAssignments` cascade-deleted   | Customer loses access immediately                                     |
| `DELETE trainerMealPlans` | `sharedMealPlans` cascade-deleted       | Share links become invalid                                            |
| `DELETE trainerMealPlans` | `groceryLists` (linked by `mealPlanId`) | Grocery list orphaned — `mealPlanId` nullable on cascade? **Verify.** |

---

## FSM 2 — Recipe (Approval Toggle)

### Real Model

No multi-state enum. State is a single boolean + tier-level combination:

- **unapproved** — `isApproved = false` (default after creation/BMAD generation)
- **approved** — `isApproved = true` (set by admin only)
- **tier-gated** — `isApproved = true` AND `tierLevel` restricts visibility per trainer

There is no "rejected", "deprecated", or "pending" state in the DB. The recon doc invented these states.

### State Definitions

| State                 | DB Evidence                                       |
| --------------------- | ------------------------------------------------- |
| does-not-exist        | No row in `recipes`                               |
| unapproved            | `isApproved = false`                              |
| approved-starter      | `isApproved = true`, `tierLevel = 'starter'`      |
| approved-professional | `isApproved = true`, `tierLevel = 'professional'` |
| approved-enterprise   | `isApproved = true`, `tierLevel = 'enterprise'`   |
| deleted               | No row (no soft-delete column found)              |

### Transition Matrix

| From \ To          | does-not-exist | unapproved                              | approved-\*                                 | deleted                                     |
| ------------------ | -------------- | --------------------------------------- | ------------------------------------------- | ------------------------------------------- |
| **does-not-exist** | —              | ADMIN `POST /api/admin/generate` (BMAD) | illegal                                     | illegal                                     |
| **unapproved**     | illegal        | —                                       | ADMIN `POST /api/admin/recipes/:id/approve` | ADMIN `POST /api/admin/recipes/bulk-delete` |
| **approved-\***    | illegal        | ADMIN re-unapprove (if endpoint exists) | ADMIN tier upgrade/downgrade                | ADMIN `POST /api/admin/recipes/bulk-delete` |
| **deleted**        | —              | illegal                                 | illegal                                     | —                                           |

### Illegal Transition Rejections

| Attempt                                          | Expected HTTP            |
| ------------------------------------------------ | ------------------------ |
| Trainer `POST /api/admin/recipes/:id/approve`    | 403                      |
| Customer approve or delete recipe                | 403                      |
| Anon access recipe library (unapproved)          | 401 or filtered response |
| Starter trainer accessing enterprise-tier recipe | 403 (entitlement guard)  |
| Attacker approve another tenant's recipe         | 403                      |

### Concurrency Hazards

| Race                                                       | Hazard                                                                          |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Admin approves and bulk-deletes same recipe simultaneously | Delete wins — approve sets flag on non-existent row or 404                      |
| Two admins approve same batch                              | Idempotent (boolean set twice = no-op), but SSE progress events may double-fire |
| BMAD agent inserts recipe while admin is querying count    | Pagination count drifts between pages                                           |

### Cascade Effects

| Trigger                | Downstream                                                                        |
| ---------------------- | --------------------------------------------------------------------------------- |
| Recipe deleted         | `personalizedRecipes` rows cascade-deleted                                        |
| Recipe deleted         | `ratings` / `favorites` (if foreign-keyed) cascade                                |
| Recipe tier downgraded | Trainer with lower tier immediately loses access (entitlement check at read-time) |

---

## FSM 3 — Bug Report

### Real Model (verified from schema.ts lines 2032-2038)

```
pgEnum("bug_report_status", ["open", "triaged", "in_progress", "resolved", "closed"])
```

Five states. Recon said three ("open → claimed → resolved"). Reality has five, with "triaged" and "in_progress" as real intermediate states, and "closed" as a terminal state distinct from "resolved". "Claimed" does not exist.

### State Definitions

| State          | Meaning                                       |
| -------------- | --------------------------------------------- |
| does-not-exist | No row in `bugReports`                        |
| open           | Default. Customer-submitted, not yet reviewed |
| triaged        | Admin has reviewed and categorized            |
| in_progress    | Actively being worked (by Hal or admin)       |
| resolved       | Fix confirmed                                 |
| closed         | Dismissed or duplicate — not fixed            |

### Transition Matrix

| From \ To          | does-not-exist | open                                  | triaged                            | in_progress                        | resolved                           | closed                             |
| ------------------ | -------------- | ------------------------------------- | ---------------------------------- | ---------------------------------- | ---------------------------------- | ---------------------------------- |
| **does-not-exist** | —              | CUSTOMER/AUTH `POST /api/bug-reports` | illegal                            | illegal                            | illegal                            | illegal                            |
| **open**           | illegal        | —                                     | ADMIN `PATCH /api/bug-reports/:id` | ADMIN `PATCH /api/bug-reports/:id` | ADMIN `PATCH /api/bug-reports/:id` | ADMIN `PATCH /api/bug-reports/:id` |
| **triaged**        | illegal        | ADMIN reopen                          | —                                  | ADMIN `PATCH /api/bug-reports/:id` | ADMIN `PATCH /api/bug-reports/:id` | ADMIN `PATCH /api/bug-reports/:id` |
| **in_progress**    | illegal        | ADMIN reopen                          | illegal                            | —                                  | ADMIN `PATCH /api/bug-reports/:id` | ADMIN `PATCH /api/bug-reports/:id` |
| **resolved**       | illegal        | illegal                               | illegal                            | illegal                            | —                                  | ADMIN `PATCH /api/bug-reports/:id` |
| **closed**         | illegal        | ADMIN reopen                          | illegal                            | illegal                            | illegal                            | —                                  |

### Hal Actor Integration

Hal polls `GET /api/command-centre/bugs` (with `HAL_API_KEY` header). Hal claims a bug by PATCHing to `in_progress`. Key invariants:

- `assignedToHal = true` must be set atomically with status transition to `in_progress`
- Two Hal instances racing the same `open` bug could both claim it — **no row-level lock or atomic claim endpoint observed** — **HIGH RISK**
- `resolvedAt` timestamp must be set when transitioning to `resolved`
- `assignedAt` timestamp must be set on claim

### Illegal Transition Rejections

| Attempt                                                   | Expected HTTP                          |
| --------------------------------------------------------- | -------------------------------------- |
| Customer `PATCH /api/bug-reports/:id` (any status change) | 403                                    |
| Trainer `PATCH /api/bug-reports/:id`                      | 403                                    |
| Anon `POST /api/bug-reports`                              | 401                                    |
| `resolved → in_progress`                                  | 422 (no back-transition from terminal) |
| `closed → in_progress`                                    | 422 (unless admin explicitly reopens)  |
| Attacker read another user's bug report                   | 403                                    |

### Concurrency Hazards

| Race                                                      | Hazard                                                       | Severity               |
| --------------------------------------------------------- | ------------------------------------------------------------ | ---------------------- |
| Hal instances A and B both poll and claim same `open` bug | Duplicate `in_progress`, both set `assignedToHal = true`     | HIGH — no atomic claim |
| Admin and Hal claim same bug simultaneously               | Same as above                                                | HIGH                   |
| Reporter deletes account while bug is `in_progress`       | `reporterId` set to null (ON DELETE SET NULL) — bug survives | Low                    |

### Cascade Effects (Side Effects)

| Trigger              | Downstream                                                     |
| -------------------- | -------------------------------------------------------------- |
| Bug `open` submitted | GitHub issue created via API (async)                           |
| Bug `open` submitted | Hal bridge file written                                        |
| Bug `resolved`       | No automated notification found (gap — should email reporter?) |
| User deleted         | `reporterId → null` (bugReport persists, reporter anonymous)   |

---

## FSM 4 — Subscription

### Real Model (verified from schema.ts lines 1664-1670)

```
pgEnum("subscription_status", ["trialing", "active", "past_due", "unpaid", "canceled"])
```

Five states. Recon said four (`trial → active → paused/canceled`). Reality: no "paused" state. `past_due` and `unpaid` are real states driven by Stripe webhook events. Two tables: `trainerSubscriptions` (per-trainer) and `subscriptionItems` (per-item kind: tier | ai).

### State Definitions

| State          | Meaning                                         |
| -------------- | ----------------------------------------------- |
| does-not-exist | No row in `trainerSubscriptions`                |
| trialing       | Default on creation; Stripe trial period active |
| active         | Paid and in good standing                       |
| past_due       | Payment failed; grace period in effect          |
| unpaid         | Grace period expired; access suspended          |
| canceled       | Subscription ended; tier features locked        |

### Transition Matrix (driven by Stripe webhooks + admin grant)

| From \ To          | does-not-exist | trialing                                                                             | active                                                                | past_due                        | unpaid                 | canceled                                                                     |
| ------------------ | -------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------- | ------------------------------- | ---------------------- | ---------------------------------------------------------------------------- |
| **does-not-exist** | —              | STRIPE webhook `customer.subscription.created` OR ADMIN `POST /api/admin/grant-tier` | ADMIN `POST /api/admin/grant-tier` (direct)                           | illegal                         | illegal                | illegal                                                                      |
| **trialing**       | illegal        | —                                                                                    | STRIPE `customer.subscription.updated` (trial ends, payment succeeds) | STRIPE `invoice.payment_failed` | illegal                | STRIPE `customer.subscription.deleted` OR TRAINER `POST /api/payment/cancel` |
| **active**         | illegal        | illegal                                                                              | —                                                                     | STRIPE `invoice.payment_failed` | illegal                | STRIPE `customer.subscription.deleted` OR TRAINER cancel                     |
| **past_due**       | illegal        | illegal                                                                              | STRIPE `invoice.payment_succeeded` (retry success)                    | —                               | STRIPE retry exhausted | STRIPE `customer.subscription.deleted`                                       |
| **unpaid**         | illegal        | illegal                                                                              | STRIPE payment recovery                                               | illegal                         | —                      | STRIPE `customer.subscription.deleted`                                       |
| **canceled**       | —              | illegal                                                                              | ADMIN re-grant                                                        | illegal                         | illegal                | —                                                                            |

### Illegal Transition Rejections

| Attempt                                           | Expected HTTP    |
| ------------------------------------------------- | ---------------- |
| Customer `POST /api/admin/grant-tier`             | 403              |
| Trainer `POST /api/admin/grant-tier`              | 403              |
| Stripe webhook without valid signature            | 400              |
| Duplicate Stripe webhook (idempotency key reused) | 200 (idempotent) |
| `canceled → past_due` (no direct path)            | 422 or ignored   |
| `unpaid → trialing` (no back-path to trial)       | 422              |

### Concurrency Hazards

| Race                                                          | Hazard                                                         | Severity                                                            |
| ------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------- |
| Admin grants tier while Stripe webhook arrives simultaneously | Two writes to `trainerSubscriptions.tier`; last-write wins     | HIGH — potential state divergence                                   |
| Payment succeeded webhook arrives twice (Stripe retry)        | Duplicate `active` write — should be idempotent                | MEDIUM — `webhookEventStatusEnum` idempotency table must guard this |
| Trainer upgrades while trainer is mid-generation (AI quota)   | Quota counter mid-flight; new tier limit applies at next check | LOW                                                                 |
| Downgrade while over-limit clients exist                      | Clients not immediately deleted — overage state unclear        | HIGH — no downgrade grace logic observed                            |

### Cascade Effects

| Trigger                            | Downstream                                                                              |
| ---------------------------------- | --------------------------------------------------------------------------------------- |
| Subscription `canceled`            | Trainer tier features locked (entitlement check at request time)                        |
| Subscription `canceled`            | Customer capacity enforced at 0 new adds                                                |
| Subscription `unpaid`              | AI generation endpoint should return 402/403                                            |
| Admin `POST /api/admin/grant-tier` | `tierLevel` on trainer record updated immediately; entitlements reflect on next request |
| Subscription downgrade             | Trainers with N > new-tier customer limit need overage handling                         |

---

## Cross-Machine Risk Register

| Risk                                                                                            | Machines     | Severity |
| ----------------------------------------------------------------------------------------------- | ------------ | -------- |
| Bug report "claimed" state referenced in test code / Hal docs but does not exist in DB          | Bug Report   | HIGH     |
| Meal plan has no status enum — tests written against invented states will all pass vacuously    | Meal Plan    | HIGH     |
| Subscription "paused" state referenced in recon but not in DB — any test relying on it is wrong | Subscription | HIGH     |
| Hal dual-claim race with no atomic lock                                                         | Bug Report   | HIGH     |
| Admin grant-tier race vs Stripe webhook                                                         | Subscription | HIGH     |
| Meal plan cascade to grocery lists not confirmed (nullable FK)                                  | Meal Plan    | MEDIUM   |
| Recipe re-unapproval endpoint existence unverified                                              | Recipe       | MEDIUM   |
