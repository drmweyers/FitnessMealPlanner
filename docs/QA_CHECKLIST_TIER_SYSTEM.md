# QA Checklist: 3-Tier System

Use this checklist to verify functionality end-to-end before and after launch.

1) Routing & Versioning
- [ ] All documented routes use /api/v1 in server and client
- [ ] Reverse proxy (NGINX) forwards /api/v1/* to app

2) Tier Entitlements
- [ ] Tier 1: No analytics; PDF meal plan exports only
- [ ] Tier 2: Basic analytics; CSV export only; report limit enforced; grouped customers (≤5)
- [ ] Tier 3: Advanced analytics & BI; CSV/Excel/PDF exports; API analytics; unlimited reports

3) Customer Limits
- [ ] Tier 1: 9 max customers; soft warnings at 80/90/95%; hard stop at 9
- [ ] Tier 2: 20 max customers; same warning thresholds; hard stop at 20
- [ ] Tier 3: Unlimited

4) AI Subscription
- [ ] Plans: Starter(100), Professional(500), Enterprise(unlimited)
- [ ] AI usage counts correctly and resets monthly
- [ ] Cancelling AI disables AI features only; tier features remain intact

5) Payments & PCI
- [ ] Stripe webhook signature validated; idempotency keys used
- [ ] No card data stored; tokens only
- [ ] Payment audit logs written for every tier/AI transaction

6) RLS & Data Isolation
- [ ] app.current_user_id set per request/session
- [ ] Queries blocked when user context missing
- [ ] Cross-trainer access attempts denied

7) Analytics & Exports
- [ ] Tier 2 export returns 403 if format != CSV
- [ ] Tier 3 export supports CSV/Excel/PDF and large downloads via background jobs
- [ ] Analytics dashboard loads ≤200ms p95 with caching enabled

8) Upgrade/Downgrade Flows
- [ ] 1→2 and 2→3 upgrades compute correct delta
- [ ] 1→3 upgrade supported
- [ ] Downgrade never violates ownership; only disables AI upon AI cancel

9) Observability
- [ ] Monitoring dashboards show error rate, latency, usage warnings, and payment failures
- [ ] Alerts configured for high 4xx/5xx rates, webhook failures, and export errors

10) Documentation
- [ ] docs/TIER_SOURCE_OF_TRUTH.md matches implementation
- [ ] docs/API_ENTITLEMENTS_CONTRACT.md matches server routes and client behavior
- [ ] PRD feature matrix matches ‘Corrected Analytics & Reporting (Authoritative)’ table
