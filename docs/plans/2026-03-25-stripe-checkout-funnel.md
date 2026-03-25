# Stripe Checkout Funnel Integration

**Date:** 2026-03-25
**Branch:** `feature/stripe-checkout`
**Status:** In Progress

## Overview
Wire Stripe Checkout into the EvoFit Meals landing funnel pages. Public (no-auth) endpoint creates checkout sessions, funnel pages redirect to Stripe-hosted checkout.

## Tasks

### Task 1: Add .env keys and checkout route
- [x] Add STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY to .env
- [x] Create `server/routes/funnelCheckout.ts` — public endpoint `/api/create-checkout-session`
- [x] Register route in `server/index.ts`
- [x] Write tests

### Task 2: Update funnel.js and landing pages
- [x] Update `funnel.js` — replace `goToCheckout()` with Stripe Checkout redirect
- [x] Add Stripe.js to pages that need it
- [x] Wire CTA buttons on comparison.html

### Task 3: Success and cancel pages
- [x] Create `public/landing/checkout-success.html`
- [x] Create `public/landing/checkout-cancel.html`

### Task 4: Tests and commit
- [x] Unit test for checkout endpoint
- [x] All tests pass
- [x] Commit to branch

## Price IDs (TEST MODE)
| Tier | Price | Type | Price ID |
|------|-------|------|----------|
| Starter | $199 | One-time | `price_1TEwrUK8WkiKiZUJfi8FxReH` |
| Professional | $299 | One-time | `price_1TEwrVK8WkiKiZUJwA1jF6od` |
| Enterprise | $399 | One-time | `price_1TEwrWK8WkiKiZUJtAPBZwMP` |
| SaaS | $39/mo | Recurring | `price_1TEwrXK8WkiKiZUJ7bWxdu3c` |
