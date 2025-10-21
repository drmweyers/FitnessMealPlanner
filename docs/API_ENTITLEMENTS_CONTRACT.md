# API and Entitlements Contract

Authoritative mapping of product tiers to API capabilities, limits, and routes. This consolidates behavior referenced in PRD, UX/UI, BMAD plans, and security docs.

1) Conventions
- Base path: all routes are versioned under /api/v1
- Ownership vs subscription: Tier 1-3 are one-time purchases; AI is a recurring add-on. Cancelling AI disables AI-only features but never downgrades the purchased tier.
- Export rules: Tier 2 → CSV-only; Tier 3 → CSV, Excel, PDF; Tier 3 also supports API-based analytics exports.

2) Core Tier APIs
- GET /api/v1/tiers/current
  - Returns: currentTier, tier limits, feature flags
- GET /api/v1/tiers/usage
  - Returns: per-feature usage vs limits
- POST /api/v1/tiers/upgrade
  - Body: targetTier; returns Stripe clientSecret

3) Analytics APIs (tier-gated)
- GET /api/v1/analytics/dashboard/overview (Tier 2+)
- GET /api/v1/analytics/clients/metrics (Tier 2+)
- GET /api/v1/analytics/engagement/timeline (Tier 2+)
- GET /api/v1/analytics/reports/basic (Tier 2+) — rate-limited
- GET /api/v1/analytics/predictions/churn-risk (Tier 3)
- GET /api/v1/analytics/predictions/revenue-forecast (Tier 3)
- GET /api/v1/analytics/segmentation/clusters (Tier 3)
- POST /api/v1/analytics/dashboards/custom (Tier 3) — limit: 5 dashboards
- POST /api/v1/analytics/export (Tier 2+)
  - Tier 2: format must be csv
  - Tier 3: csv|excel|pdf

4) AI APIs (subscription-gated)
- POST /api/v1/ai/subscribe — planId ∈ {ai_starter, ai_professional, ai_enterprise}
- GET  /api/v1/ai/usage — returns current monthly usage and limit
- POST /api/v1/ai/generate — Tier 3 + active AI subscription
  - Enforced against monthly plan quota: Starter=100, Professional=500, Enterprise=∞

5) Export policy (enforcement patterns)
- Server must reject Tier 2 export requests where format ≠ csv with 403 FEATURE_REQUIRES_UPGRADE (requiredTier=3)
- Client UI should:
  - Tier 2: present only CSV; hide/disable Excel/PDF
  - Tier 3: show CSV/Excel/PDF

6) Billing and entitlements
- Tier upgrades: one-time fees: 1→2=$100, 2→3=$100, 1→3=$200
- AI subscription: Starter=$19/mo (100), Professional=$39/mo (500), Enterprise=$79/mo (unlimited)
- Cancellation: disables AI features only; retains purchased tier feature set

7) Security & compliance (summary)
- PCI: Stripe webhook signature validation and idempotency required before enabling paid flows
- Audit: log tier changes, AI subscription events, and export events
- RLS: set app.current_user_id per request/session to enforce data isolation

8) Non-functional targets
- p95 latency ≤ 200ms for tier checks and dashboard reads
- Analytics export jobs use background processing for large data

This contract is the source of truth for backend and frontend integration regarding entitlement checks, routes, and export behaviors.