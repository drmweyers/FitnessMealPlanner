# FitnessMealPlanner QA Warfare Interaction Surface Cartography

**Audit Date:** 2026-04-12
**Scope:** Complete user interaction inventory for 100 percent coverage QA methodology

---

## COUNTS SUMMARY

| Category                   | Count |
| -------------------------- | ----- |
| Routes (Client)            | 26    |
| API Endpoints              | 103   |
| UI Components              | 139   |
| State Machines             | 4     |
| Cross-Role Touchpoints     | 8     |
| Side-Effect Triggers       | 8     |
| Tier-Gated Feature Sets    | 7     |
| Forms & Validation Schemas | 13    |

---

## ADMIN SURFACE (5 routes, 17 APIs)

Routes: /admin, /admin/analytics, /admin/dashboard, /admin/bulk-generation, /admin/profile

Key APIs:

- POST /api/admin/generate (Bulk recipe gen 1-500; S3, DALL-E, SSE, DB inserts)
- GET /api/admin/generate/progress/:batchId (SSE stream)
- POST /api/admin/generate/stop/:batchId (Halt generation)
- POST /api/admin/grant-tier (Set trainer tier)
- POST /api/admin/recipes/:id/approve (Approve recipe)
- POST /api/admin/recipes/bulk-delete (Delete recipes)
- GET /api/admin/analytics/\* (Metrics endpoints)
- POST /api/admin/cache/clear (Flush caches)

## TRAINER SURFACE (9 routes, 18 APIs)

Routes: /trainer, /trainer/customers, /trainer/meal-plans, /trainer/profile, /recipes, /favorites, /billing

Key APIs:

- GET /api/trainer/profile/stats
- POST /api/trainer/customers/:id/invite (email side effect)
- POST /api/trainer/meal-plans (email side effect)
- POST /api/trainer/meal-plans/:id/assign (status change + email)
- POST /api/trainer/recipes/:id/assign

## CUSTOMER SURFACE (8 routes, 24 APIs)

Routes: /customer, /my-meal-plans, /customer/progress, /grocery-list, /nutrition, /customer/profile, /shared/:token

Key APIs:

- GET /api/meal-plans
- POST /api/meal-plans/:id/start
- POST /api/meal-plans/:id/complete (email to trainer)
- POST /api/progress/photos (S3 upload)
- GET /api/grocery-lists
- POST /api/nutrition/log

## STATE MACHINES (4)

1. Meal Plan: draft -> assigned -> active -> paused/archived
2. Recipe: pending -> approved/rejected/deprecated
3. Bug Report: open -> claimed -> resolved
4. Subscription: trial -> active -> paused/canceled

## CROSS-ROLE TOUCHPOINTS (8)

1. Trainer assigns meal plan -> Customer sees + email
2. Trainer assigns recipe -> Customer sees (tier-filtered)
3. Trainer pauses customer -> Customer status + features disabled
4. Customer submits bug -> Admin sees + GitHub issue
5. Customer rates recipe -> Admin alert if flagged
6. Admin grants tier -> Trainer unlocks features
7. Admin bulk generates -> Trainer sees recipes
8. Admin clears cache -> All users get fresh data

## SIDE EFFECTS (8 triggers)

Recipe submitted -> GitHub API (async)
Bug submitted -> GitHub, Hal (async)
Meal plan assigned -> Email service (async)
Recipe rated -> Moderation (async)
Photo uploaded -> AWS S3 (async)
Bulk generation -> OpenAI, S3 (async)
Customer invited -> Email service (async)
Account deleted -> S3, Database (async)

## TIER-GATED FEATURES (7)

Recipe Library: Starter 200, Pro 500+, Enterprise Unlimited
Monthly AI Gen: Starter 5, Pro Unlimited, Enterprise Unlimited
Customer Capacity: Starter 5, Pro 50+, Enterprise Unlimited
Analytics: Starter Basic, Pro Advanced, Enterprise Custom
Branding: Starter None, Pro Custom Logo, Enterprise White-label

## RISK AREAS FOR 100 PERCENT COVERAGE

1. SSE Connection Stability during bulk gen
2. Tier Enforcement edge cases (trainer downgraded)
3. Concurrent operations (multiple trainers)
4. Async side effects ordering
5. Stripe webhook idempotency
6. S3 cleanup on failure
7. Cache invalidation race conditions
8. Auth token expiry handling
9. DALLE rate limiting
10. Database cascade deletes

---

**Document Version:** 1.0
**Last Updated:** 2026-04-12
**Purpose:** 100 percent Interaction Coverage QA Methodology
