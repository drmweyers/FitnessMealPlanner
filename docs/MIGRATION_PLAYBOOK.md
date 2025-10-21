# Migration Playbook: 3-Tier System

This playbook provides a simple, step-by-step guide to safely migrate to the 3-tier system with AI add-ons.

1) Prerequisites
- Stripe account with products/prices for tiers (one-time) and AI plans (recurring)
- Database backup and restore tested
- Staging environment with realistic data

2) Database
- Apply docs/CANONICAL_DATABASE_SCHEMA.sql
- Ensure RLS is enabled; set session user context on each request:

```ts
// server/middleware/dbSession.ts
import { Request, Response, NextFunction } from 'express';
import { pool } from '../db/pool';

export async function setDbSessionUser(req: Request, _res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.id;
    const client = await pool.connect();
    try {
      if (userId) {
        await client.query("SET LOCAL app.current_user_id = $1", [userId]);
      }
      (req as any).db = client; // attach for downstream
      next();
    } finally {
      client.release();
    }
  } catch (e) {
    next(e);
  }
}
```

3) Stripe configuration
- Create one-time products/prices for tiers (199, 299, 399)
- Create recurring products/prices for AI plans:
  - ai_starter: $19/mo, 100 generations
  - ai_professional: $39/mo, 500 generations
  - ai_enterprise: $79/mo, unlimited
- Configure webhook endpoint: /api/v1/webhooks/stripe
- Store STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in secrets manager

4) Payment gating (PCI)
- Implement webhook signature validation (see BMAD Complete Execution Plan, Security section)
- Use idempotency keys for payment intent creation
- Audit log all payments and tier changes
- Block paid flows until these checks pass in staging

5) Entitlements and gating
- Use the canonical entitlement rules in docs/API_ENTITLEMENTS_CONTRACT.md
- Key enforcement points:
  - Tier checks on protected endpoints
  - Export enforcement: Tier 2 CSV-only; Tier 3 all formats
  - AI generation checks against plan usage

6) Migration of existing users
- Assign recommended tier based on usage (customer counts, features used)
- Grandfather: 90-day grace period with soft limits
- Communicate tier and feature changes via email sequence

7) Rollout plan
- Phase 1: Internal users only; verify entitlements and billing
- Phase 2: 10% trainer cohort; monitor performance and support
- Phase 3: 100% rollout

8) Backout plan
- Feature flags to disable tier enforcement temporarily
- Rollback database changes if needed (keep backups)

9) Post-migration verification
- Verify /api/v1 paths, tier-gated endpoints, and export policy
- Verify AI generation quota enforcement and resets
- Confirm invoices and receipts are being generated

10) Ownership vs AI cancellation
- Cancelling AI must only disable AI features; never downgrade purchased tier
- Verify this path explicitly in staging before go-live
