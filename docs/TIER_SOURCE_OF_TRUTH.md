# 3-Tier System Source of Truth

This document defines the canonical product and technical specifications for the 3-tier trainer platform. All other documents (PRD, UX/UI, plans) should align to this.

1) Baselines and conventions
- Year 1 baseline: 900 paid customers, $461,600 total revenue
- Trial policy: 14-day tier-limited trial (trial users experience the tier they select with limits active)
- API versioning: All endpoints are under the /api/v1 prefix
- AI subscriptions: Optional, add-on to one-time tier purchase; cancelling AI never downgrades the purchased tier

2) Tiers, features, and limits
- Tier names
  - Tier 1: New Trainer ($199)
  - Tier 2: Growing Professional ($299)
  - Tier 3: Established Business ($399)

- Customer limits
  - T1: 9 customers
  - T2: 20 customers
  - T3: Unlimited

- Meal plan library access
  - T1: 1,000 plans
  - T2: 2,500 plans
  - T3: 5,000+ plans

- Analytics & reporting
  - T1: None
  - T2: Basic analytics dashboard; Report export: CSV only
  - T3: Advanced analytics & BI; Report export: CSV, Excel, PDF; API analytics access

- API access
  - T1: None
  - T2: Read-only
  - T3: Full access

- Customer grouping and comms
  - Grouping: T1 none; T2 up to 5 basic groups; T3 advanced segmentation
  - Communication: T1 email notifications; T2 in-app messaging; T3 multi-channel

- Branding & support
  - Branding: T1 standard; T2 professional branding; T3 custom white-label
  - Support: T1 email; T2 priority email + chat; T3 dedicated account manager

3) Upgrade pricing (one-time deltas)
- 1 → 2: $100
- 2 → 3: $100
- 1 → 3: $200

4) AI subscription plans (optional add-ons)
- AI Starter: $19/month — 100 recipe generations/month, standard queue
- AI Professional: $39/month — 500 generations/month, priority processing
- AI Enterprise: $79/month — Unlimited generations, instant processing

Notes:
- AI subscriptions are additive; cancelling AI disables AI features only. One-time tier purchases remain in effect.
- Usage warnings at 80/90/95% thresholds; hard stops at limits with contextual upgrade prompts.
