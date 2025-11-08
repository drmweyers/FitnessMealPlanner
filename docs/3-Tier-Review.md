# 3 Tier Review — Technical Review for BMAD Planning Update

Status: Review Complete
Scope: Align BMAD planning artifacts, tests, and implementation for the 3‑tier trainer system and AI add‑on.
Audience: Engineering, QA, Product, DevOps

---

## 1) Executive Summary

- The current planning artifacts and tests are comprehensive but contain critical inconsistencies that must be resolved before implementation.
- Most impactful alignment decisions required:
  1) Canonicalize the tier business model (subscription vs. lifetime purchase) and unify tier naming.
  2) Centralize entitlements (server‑side), remove UI price hardcoding, and drive all payments via Stripe Subscriptions + webhooks.
  3) Update tests to consume env‑driven pricing (Price IDs), cover lifecycle events (upgrade/downgrade/cancel/dunning), and enforce gating at API.
- Recommended path: Monthly Stripe subscriptions for tiers + separate monthly AI add‑on, with a central Entitlements service and webhook‑driven invalidation.

---

## 2) Canonical Decisions Required (P0)

1. Tier Business Model (choose one and propagate everywhere):
   - Option A — Monthly Subscriptions (Recommended)
     - Pros: Native proration, clear billing cycles, simpler refunds/dunning, aligns with current E2E specs.
     - Cons: Ongoing billing and compliance surfaces.
   - Option B — One‑time Lifetime Purchases
     - Pros: Simpler billing.
     - Cons: No proration, non‑standard for SaaS tiers, current tests and docs assume subscription logic.

2. Tier Naming (unify across docs, code, and UI):
   - Canonical labels: Starter / Professional / Enterprise
   - Alternate mapping (if needed):
     - New Trainer → Starter
     - Growing Professional → Professional
     - Established Business → Enterprise

3. Pricing Source of Truth:
   - Use Stripe Price IDs from env (no hardcoded dollar amounts in UI or tests).
   - Publish a read‑only /api/v1/public/pricing endpoint (server-backed) to render UI.

4. Trials & AI Add‑on:
   - Trials: 14‑day, tier‑limited trials; all gates apply during trial.
   - AI Add‑on: Separate subscription item; canceling AI never downgrades the tier.

5. API Versioning:
   - All new endpoints under /api/v1; document and test version stability.

---

## 3) Observed Inconsistencies to Fix

- Tier model drift: Tests/docs assume proration and subscription lifecycle while source docs also describe one‑time purchases. Resolve per Section 2.
- Naming drift: Starter/Professional/Enterprise vs. New Trainer/Growing Professional/Established Business.
- Price literals in tests/UI: Replace with config‑driven values (Price IDs → amounts returned by server).
- Gating location: Some plans imply client‑side gating; must be enforced server‑side at API and mirrored in UI.
- Stripe flow: Tests use PaymentIntents patterns where Subscriptions + Checkout/Payment Element are more appropriate.
- Missing lifecycle coverage: SCA/3DS, dunning, disputes, downgrades (scheduled), time‑based resets (Test Clock), out‑of‑order webhooks.

---

## 4) Recommended Architecture

### 4.1 Stripe Subscriptions
- One Customer per trainer.
- One Subscription for tier (monthly Price); optional second Subscription Item for AI add‑on.
- Use Checkout Sessions or Payment Element for new purchases and upgrades.
- Provide Billing Portal for PM updates; rely on webhooks for entitlements.

### 4.2 Entitlements Service (authoritative)
- Central matrix of tier → features/limits, stored in code and synced with docs.
- Cache entitlements per trainer in Redis with TTL; invalidate on webhook events.
- API: GET /api/v1/entitlements (server computes, client reads; no client‑side authority).

### 4.3 Server‑Side Gates (must‑enforce)
- Block at API for:
  - Customer create beyond tier limit
  - Analytics access (starter blocked, basic vs advanced)
  - Export formats (CSV/Excel/PDF by tier)
  - API key generation (Enterprise only)
  - Bulk operations (Starter blocked, Professional+ allowed)
  - Branding settings (Enterprise only for full white‑label)

### 4.4 Data Model (Drizzle ORM)
- trainer_subscriptions
  - trainer_id (pk/uuid), stripe_customer_id, stripe_subscription_id
  - tier (enum), status, current_period_start, current_period_end
  - cancel_at_period_end (bool), created_at, updated_at
- subscription_items
  - subscription_id, kind (tier|ai), stripe_price_id, status
- tier_usage_tracking
  - trainer_id, period_start, period_end, customers, meal_plans, ai_generations, exports_csv, exports_excel, exports_pdf
- payment_logs
  - id, trainer_id, event (purchase|upgrade|refund|chargeback), amount, currency, stripe_invoice_id|payment_intent_id, status, occurred_at
- webhook_events
  - event_id (unique), type, processed_at, status, error, payload_meta (no PII)

Indexes & Policies:
- Useful composite indexes: (trainer_id, current_period_end), (trainer_id, period_start, period_end)
- Enforce Row‑Level Security; ensure all read/write paths include current user context.

### 4.5 Webhook Pipeline
- Events to handle: checkout.session.completed, customer.subscription.created/updated/deleted, invoice.payment_succeeded/failed, payment_intent.succeeded/failed, customer.subscription.trial_will_end, charge.dispute.*
- Strict signature verification; store event_id; 2xx fast ack; async durable processing with retries/backoff; handle out‑of‑order updates.
- Side effects: update subscription records, recompute entitlements, invalidate cache, log payments, emit audit logs.

### 4.6 Usage Tracking & Quotas
- Increment usage counters via service layer; prevent over‑limit with 403s.
- Reset counters on new billing cycle (from webhooks/Test Clock) or daily cron reading current_period_end.
- Concurrency safety: transactional increments or atomic ops (DB/Redis) with retry.

---

## 5) API Contracts (Proposed)

- Tiers
  - POST /api/v1/tiers/purchase → creates Checkout Session (tier price)
  - POST /api/v1/tiers/upgrade → creates Checkout Session / Subscription update
  - GET  /api/v1/tiers/current → returns current tier and limits
  - GET  /api/v1/tiers/usage → returns usage counters + percentages
  - GET  /api/v1/tiers/history → payment/upgrade history

- AI Add‑on
  - POST /api/v1/ai/subscribe | /upgrade | /cancel
  - GET  /api/v1/ai/usage | /history

- Billing
  - POST /api/v1/billing/portal → Stripe Billing Portal link
  - POST /api/v1/webhooks/stripe → webhook receiver (signature‑validated, idempotent)

- Public Pricing
  - GET /api/v1/public/pricing → current amounts/benefits derived from Stripe Price IDs

Auth/Rate‑Limiting:
- Require trainer role; enforce rate limits (e.g., 100 r/m per IP + user); ensure idempotency keys on purchase/upgrade.

---

## 6) Feature Gating Matrix (Canonical)

- Starter: 9 customers; 1,000 meal plans; PDF export only; no analytics; no API; no bulk ops; standard branding.
- Professional: 20 customers; 2,500 meal plans; CSV export; basic analytics; no API; bulk ops; pro branding.
- Enterprise: Unlimited customers; 5,000+ meal plans; CSV/Excel/PDF; advanced analytics; API access; bulk ops; white‑label branding.

AI Plans (add‑on): Starter 100/mo; Professional 500/mo; Enterprise unlimited (fair use). Canceling AI leaves tier intact.

All gates enforced server‑side; UI mirrors state but never grants access by itself.

---

## 7) Test Plan Updates (High‑Value Additions)

Unit/Integration:
- Subscription lifecycle: past_due, unpaid, dunning, paused/resumed, trial_will_end.
- Webhook resilience: invalid signature, duplicate event, out‑of‑order, retry after transient DB errors.
- Idempotency: duplicate upgrade requests and duplicate webhooks.
- Concurrency: simultaneous upgrade requests, quota boundaries with many requests.
- Time travel: Stripe Test Clock for proration and cycle rollover.
- Refunds/chargebacks: entitlements reversal & logs.

E2E:
- Replace price text assertions with pricing from /public/pricing.
- 3DS/SCA challenge flow handling.
- Scheduled downgrade (effective next cycle) and grace behavior at cycle boundary.
- Cancellation now vs. at period end; verify post‑period lock.
- Network failures (payment/entitlements fetch) and retry UX.

Maintainability:
- Central fixtures for tier metadata and Price IDs.
- Tagging by feature/severity; parameterize tier cases.

---

## 8) Security & Compliance

- Payments through Stripe Checkout/Elements only; no card data on server.
- PCI scope: target SAQ A‑EP; document controls (WAF, TLS, CSP, secrets management).
- Secrets: remove any real credentials from repo; rotate leaked keys; enforce .env hygiene.
- PII: redact in logs and webhook storage; short retention for event payloads; store metadata only.
- Abuse controls: rate limits per IP/user; AI generation throttles; platform‑wide circuit breakers with fallbacks.

---

## 9) Observability & Operations

Metrics:
- Webhook success rate/latency, entitlements recompute latency, subscription status distribution, payment failure rate, AI consumption, 403 gate hits.

Alerts:
- Webhook backlog > N, failure rate spikes, entitlements lag > threshold, unpaid/past_due surge, AI over‑usage.

Audit:
- Immutable audit trail for subscription changes; admin overrides logged with actor and reason.

---

## 10) Rollout & Migrations

- Migrations: additive tables and indexes first; backfill trainer_subscriptions from existing roles if needed.
- Feature flags: gate UI exposure separately from API enforcement to allow dark‑launch.
- Phased rollout: 10% → 25% → 50% → 100%; include rollback criteria and toggles.
- Go/No‑Go checkpoints: DB (W4), Stripe E2E (W8), Gating (W12), UI (W16), Security (W20).

---

## 11) Actionable Checklists

Engineering (Backend):
- [ ] Decide model (subscription vs. lifetime) and update all references.
- [ ] Implement data model (subs, items, usage, logs, webhooks) with RLS and indexes.
- [ ] Build Entitlements service + Redis caching + invalidation.
- [ ] Implement /public/pricing and all /api/v1 endpoints above.
- [ ] Webhook pipeline with idempotency, retries, and durable store.

Engineering (Frontend):
- [ ] Tier selection/upgrade UI driven by server pricing; remove hardcoded amounts.
- [ ] FeatureGate, UsageLimitIndicator, Tier badges; consistent ARIA and a11y.
- [ ] Billing page: history, next billing date, portal link; downgrade scheduling UI.

QA:
- [ ] Update E2E to use server pricing and add SCA/Test Clock flows.
- [ ] Add lifecycle, concurrency, idempotency, network‑failure tests.
- [ ] Ensure API‑level 403 coverage for all gated actions.

DevOps/Security:
- [ ] Provision Stripe secrets (live/test), webhook secret, and Price IDs.
- [ ] Remove/rotate any leaked credentials; enforce secret scanning.
- [ ] Add dashboards/alerts for webhook, payments, entitlements.

Docs:
- [ ] Update TIER_SOURCE_OF_TRUTH.md (names, model, features) and reference env‑driven prices.
- [ ] Sync TEST_SUITE_SUMMARY.md and COMPLETION_REPORT.md with the canonical decisions.
- [ ] Add Stripe/Entitlements design docs and runbooks (incident, rotation, rollback).

---

## 12) BMAD Docs Update Map

Update these documents with the canonical decisions and architecture above:
- docs/TIER_SOURCE_OF_TRUTH.md
  - [ ] Finalize model (subscription vs. lifetime), naming, feature matrix, AI plan details.
- test/TEST_SUITE_SUMMARY.md
  - [ ] Replace price literals; add lifecycle/SCA/Test Clock sections; assert via /public/pricing.
- docs/BMAD_3_TIER_TEST_SUITE_COMPLETION_REPORT.md
  - [ ] Align on model, lifecycle coverage, webhook/idempotency specifics, observability.
- docs/BMAD_3_TIER_TECHNICAL_GAP_ANALYSIS.md
  - [ ] Mark resolved gaps after data model, API, and entitlements are implemented.
- (If present) docs/BMAD_3_TIER_IMPLEMENTATION_ROADMAP.md
  - [ ] Reflect Entitlements service, webhook pipeline, and Test Clock milestones.

---

## 13) Open Questions (Assign Owners/Due Dates)

1) Final decision on tier model (subscription vs. lifetime). Recommendation: Subscription.
2) Final tier names for marketing vs. in‑app labels; lock mapping.
3) Internationalization and taxes (VAT/GST) and multi‑currency strategy.
4) Grace policy for downgrades when over limits (read‑only vs. block create vs. assisted cleanup).
5) AI fair use thresholds and abuse prevention strategy.

---

## Appendix A — Canonical Tier Matrix (Reference)

- Starter: 9 customers; 1,000 plans; PDF export only; no analytics; no API; no bulk ops; standard branding.
- Professional: 20 customers; 2,500 plans; CSV; basic analytics; bulk ops; pro branding.
- Enterprise: Unlimited customers; 5,000+ plans; CSV/Excel/PDF; advanced analytics; API; white‑label.
- AI Add‑on: Starter 100/mo; Professional 500/mo; Enterprise unlimited (fair use).

---

## Appendix B — Environment & Config (Do not hardcode in UI/tests)

- STRIPE_PRICE_TIER_STARTER, STRIPE_PRICE_TIER_PROFESSIONAL, STRIPE_PRICE_TIER_ENTERPRISE
- STRIPE_PRICE_AI_STARTER, STRIPE_PRICE_AI_PROFESSIONAL, STRIPE_PRICE_AI_ENTERPRISE
- STRIPE_WEBHOOK_SECRET, STRIPE_PUBLISHABLE_KEY, STRIPE_SECRET_KEY
- Pricing is derived from Stripe; tests assert against /public/pricing, not literals.
