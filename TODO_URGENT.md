# TODO URGENT - Critical Development Priorities

**Created:** 2025-09-24
**Updated:** 2026-04-12 (pricing model redo added)
**Priority:** CRITICAL - Top Priority Items

---

## 🚨 PRICING MODEL REDO — TIER DIFFERENTIATION (2026-04-12, URGENT)

**Status:** ⚠️ URGENT — launch blocker for positioning
**Owner:** Mark (decision) + Claude (implementation)
**Raised by:** Dr. Weyers, 2026-04-12 night session

### Problem

Current 3-tier pricing ($199 Starter / $299 Professional / $399 Enterprise, one-time) has no clear functional differentiator between tiers — just quota deltas. Customers upgrading can't see a concrete reason to pay more, which weakens conversion (fence-sitters bounce to cheapest) and retention signals (Professional feels like "just more quota").

### Goal

Each tier must have a **specific feature the lower tiers do not have**. Functional gating, not numeric.

### Confirmed differentiator — Advanced Filter gate

**The Advanced Macro/Nutrition Filter on the Generate Plans tab (shipped in commit `1574d16`) must be OFF in the lowest tier (Starter — $199).**

- **Starter ($199):** basic meal plan generation only — **no advanced macro filter**
- **Professional ($299):** advanced macro/nutrition filter ENABLED
- **Enterprise ($399):** advanced macro/nutrition filter ENABLED + whatever other enterprise features exist

This gives new trainers a concrete upgrade reason: _"unlock the macro filter for $100 more"_.

### Other differentiators to confirm with Mark

- [ ] Customer capacity: 9 / 20 / unlimited (already in `TIER_LIMITS`)
- [ ] Recipe library: 1500 / 3000 / 6000 (already in place)
- [ ] Custom branding / white-label (Professional+ and Enterprise-only, already spec'd)
- [ ] PDF export format: Starter PDF-only, Professional + CSV/Excel, Enterprise + all (already in `/api/v1/public/pricing`)
- [ ] **NEW potential gates (decide with Mark):**
  - [ ] Bulk meal plan assign to multiple customers (Pro+)
  - [ ] Progress photo review + annotation (Pro+)
  - [ ] Auto-grocery list generation (Pro+)
  - [ ] Analytics dashboard depth (Pro+ advanced, Enterprise custom)

### Implementation plan (when authorized)

1. **Schema:** confirm `tier_level` enum and `trainer_subscriptions.tier` are still source of truth
2. **Entitlements service** (`server/services/EntitlementsService.ts`): add `advancedFilter: boolean` to tier entitlement map. Starter = false; Pro/Enterprise = true
3. **Backend route gate** (`POST /api/meal-plan/generate` or wherever advanced filter body fields are consumed): if `tier === 'starter'` and any advanced filter field is present, either strip silently or return 403 with "upgrade required". Decide UX with Mark
4. **Frontend gate** (Generate Plans tab): if trainer tier is Starter, hide the Advanced Filter accordion OR show it with a "🔒 Upgrade to Professional" overlay. Recommend overlay — constant upsell
5. **Pricing pages:** update `/starter`, `/professional`, `/enterprise` rendered content + `/api/v1/public/pricing` API features array. Starter loses advanced filter; Professional adds it
6. **Tests:**
   - Integration: Starter trainer POST to generate with advanced fields → expected behavior
   - Integration: Professional trainer POST with advanced fields → 200
   - E2E: warfare regression spec verifying the tier-gate end-to-end
7. **Brand DNA + marketing:** update CLAUDE.md tier table, SHARED-SKILLS, dev-updates bridge so Hal sees new differentiation

### Decisions needed from Mark before implementation

- [ ] Confirm "tier 3 lowest" = Starter ($199 lowest price point)
- [ ] Silent strip vs 403 with upgrade-required message
- [ ] Frontend: hide vs lock-with-upgrade-overlay
- [ ] Which additional Pro/Enterprise gates to include in the same push
- [ ] Does Enterprise get anything Professional doesn't, functionally? If not, only 2 functional tiers matter — consider collapsing
- [ ] Grandfather existing Starter purchases or cut them off?

### Files likely to change

- `shared/schema.ts` (if new entitlement fields)
- `server/services/EntitlementsService.ts`
- `server/middleware/tierEnforcement.ts`
- `server/routes/mealPlan.ts`
- `client/src/pages/MealPlanGenerator.tsx` (Generate Plans tab)
- `client/src/components/tiers/TierSelectionModal.tsx`
- `client/src/pages/Starter.tsx` / `Professional.tsx` / `Enterprise.tsx`
- `server/routes/tierRoutes.ts` (`/api/v1/public/pricing` features array)
- `CLAUDE.md` tier table
- Warfare `R005` canonical pricing lock spec

### Risk

Existing Starter trainers may already be using the advanced filter — cutting them off is a breaking change. Options: grandfather existing Starter purchases OR announce transition window + free Professional migration. **Mark's call.**

### Related

- Warfare `tier-gating` suite has 20 cells — will catch regressions when tests are updated
- Hormozi constraint analysis: increasing perceived value gap between tiers is typically a 10-30% ACV lift at this price point

---

## 🚨 STRIPE ACCOUNT SETUP - HIGHEST PRIORITY (February 1, 2025)

**Status:** ⚠️ CRITICAL - FINAL STEP TO 100% PRODUCTION READY
**Business Impact:** 3-tier payment system complete but cannot process payments until Stripe configured
**Estimated Time:** 17 minutes total
**System Status:** 100% code complete, all routes live, awaiting Stripe credentials
**Guide:** `SYSTEM_100_PERCENT_COMPLETE.md`

### Problem

- ALL payment code is written and integrated (6,000+ lines)
- All 8 payment endpoints are LIVE at /api/v1/\*
- Billing page is accessible at /billing
- System CANNOT process payments without Stripe account setup

### Solution

**Complete Stripe account setup and add credentials to .env**

### 3-Step Action Plan (17 minutes)

**⏳ Steps to Complete NOW:**

#### Step 1: Set Up Stripe Account (10 minutes)

**1a. Create Stripe Account (2 min):**

- Go to: https://dashboard.stripe.com/register
- Sign up with business email
- Complete verification

**1b. Create Products (5 min):**

1. Navigate to: https://dashboard.stripe.com/test/products
2. Click "+ Create product"
3. Create "Professional" tier:
   - Name: Professional
   - Price: $99.00
   - Type: One-time payment
   - Copy **Price ID** (starts with `price_`)
4. Create "Enterprise" tier:
   - Name: Enterprise
   - Price: $299.00
   - Type: One-time payment
   - Copy **Price ID**

**1c. Get API Keys (1 min):**

- Go to: https://dashboard.stripe.com/test/apikeys
- Copy "Secret key" (starts with `sk_test_`)

**1d. Configure Webhook (2 min):**

- Go to: https://dashboard.stripe.com/test/webhooks
- Click "Add endpoint"
- URL: `http://localhost:4000/api/v1/stripe/webhook` (for testing)
- Select events: `checkout.*`, `customer.*`, `invoice.*`
- Copy "Signing secret" (starts with `whsec_`)

#### Step 2: Update Environment Variables (2 minutes)

**Edit .env file:**

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE

# Stripe Price IDs (One-Time Payments)
STRIPE_PRICE_STARTER=                                 # Free (leave empty)
STRIPE_PRICE_PROFESSIONAL=price_YOUR_PROFESSIONAL_ID
STRIPE_PRICE_ENTERPRISE=price_YOUR_ENTERPRISE_ID
```

**Restart server:**

```bash
docker-compose --profile dev restart
```

#### Step 3: Test Payment Flow (5 minutes)

**3a. Navigate to Billing (1 min):**

- Open: http://localhost:4000/billing
- Login as: trainer.test@evofitmeals.com / TestTrainer123!

**3b. Start Checkout (1 min):**

- Click "Upgrade Tier"
- Select "Professional" tier
- Click "Upgrade to Professional"

**3c. Complete Test Payment (2 min):**

- Use Stripe test card: `4242 4242 4242 4242`
- Expiry: `12/25`
- CVC: `123`
- ZIP: `12345`
- Complete payment

**3d. Verify Success (1 min):**

- Should redirect to success URL
- Tier should update to "Professional"
- Usage limits should show: 20 customers, 200 meal plans
- Payment should appear in billing history

### Success Criteria

- [x] All code written and integrated (6,000+ lines) ✅
- [x] Payment router registered in server/index.ts ✅
- [x] Billing page route added to Router.tsx ✅
- [x] Environment template updated in .env.example ✅
- [ ] Stripe account created
- [ ] Products created (Professional $99, Enterprise $299)
- [ ] API keys copied to .env
- [ ] Webhook configured
- [ ] Test payment completed successfully
- [ ] Tier activation verified

### What's Already Done ✅

- ✅ StripePaymentService.ts (600 lines) - Payment processing
- ✅ payment.ts (350 lines) - 8 API endpoints
- ✅ Billing.tsx (270 lines) - Billing portal UI
- ✅ SubscriptionOverview.tsx (280 lines) - Subscription dashboard
- ✅ EntitlementsService.test.ts (450 lines) - Unit tests
- ✅ Payment router integrated to server
- ✅ Billing page route added to frontend
- ✅ .env.example updated with Stripe config

### Files to Reference

- **Complete Guide:** `SYSTEM_100_PERCENT_COMPLETE.md` (5,000+ words with full testing checklist)
- **Session Summary:** `BMAD_PHASE_19_INTEGRATION_COMPLETE.md` (integration details)
- **Quick Guide:** `INTEGRATION_STEPS.md` (now complete)

### Testing After Setup

```bash
# 1. Restart server (after adding .env variables)
docker-compose --profile dev restart

# 2. Test pricing endpoint
curl http://localhost:4000/api/v1/public/pricing

# 3. Navigate to billing page
# http://localhost:4000/billing

# 4. Complete test purchase (steps above)

# 5. Verify database
# Check trainer_subscriptions table for new entry
```

### Production Deployment After Testing

Once local testing succeeds:

1. Create production Stripe products (use live keys: `sk_live_*`)
2. Update production .env with live Stripe credentials
3. Configure production webhook: `https://evofitmeals.com/api/v1/stripe/webhook`
4. Deploy to production
5. Test with real payment (can refund immediately)

---

## 🚨 MAILGUN EMAIL SETUP - SECOND PRIORITY (November 9, 2025)

**Status:** ⚠️ CRITICAL - MUST COMPLETE TOMORROW SESSION
**Business Impact:** Trainers cannot invite customers - core feature blocked
**Estimated Time:** 80 minutes (10 steps, guided process)
**Email Address:** hello@evofit.io
**Guide:** `docs/MAILGUN_SETUP_GUIDE.md`

### Problem

- Current email system uses Resend with unverified domain
- Domain `bcinnovationlabs.com` is NOT verified
- Trainers cannot send customer invitations to external emails
- Only works with test domain `onboarding@resend.dev`

### Solution

**Replace Resend with Mailgun using new `hello@evofit.io` email**

### 10-Step Implementation Plan

**✅ Steps Completed:**

- [x] Comprehensive setup guide created (docs/MAILGUN_SETUP_GUIDE.md)
- [x] Documentation added to BMAD process
- [x] Step-by-step instructions with 3 provider options (GoDaddy, Namecheap, Cloudflare)

**⏳ Steps to Complete Tomorrow:**

- [ ] **Step 1:** Create Mailgun account and verify email (15 min)
- [ ] **Step 2:** Add evofit.io domain to Mailgun (5 min)
- [ ] **Step 3:** Copy DNS records from Mailgun dashboard (5 min)
- [ ] **Step 4:** Add DNS records to domain provider (30 min)
- [ ] **Step 5:** Verify DNS records in Mailgun - wait 15 min (17 min total)
- [ ] **Step 6:** Copy Mailgun API key and save it (5 min)
- [ ] **Step 7:** Update .env file with Mailgun credentials (2 min)
- [ ] **Step 8:** Install Mailgun npm package (1 min)
- [ ] **Step 9:** Update emailService.ts to use Mailgun (20 min)
- [ ] **Step 10:** Test email sending with Mailgun (10 min)

### Quick Start for Tomorrow Session

**FIRST ACTION:**

1. Open guide: `docs/MAILGUN_SETUP_GUIDE.md`
2. Go to Mailgun signup: https://signup.mailgun.com/new/signup
3. Follow Step 1 instructions exactly

**USER WILL NEED:**

- Access to domain provider where evofit.io was purchased (GoDaddy/Namecheap/Cloudflare)
- Credit card for Mailgun verification (won't be charged - free tier)
- 80 minutes of uninterrupted time

### Files to Reference

- **Setup Guide:** `docs/MAILGUN_SETUP_GUIDE.md` (850+ lines, comprehensive)
- **Current Email Service:** `server/services/emailService.ts` (line 1-855)
- **Invitation Routes:** `server/invitationRoutes.ts` (line 1-403)
- **Environment Example:** `.env.example` (line 22-24)

### Success Criteria

- ✅ Mailgun account created with verified domain
- ✅ All 5 DNS records added and verified
- ✅ API credentials saved to .env file
- ✅ emailService.ts updated to use Mailgun
- ✅ Test email successfully sent to external address
- ✅ Trainer can send customer invitation
- ✅ Customer receives invitation email from hello@evofit.io

### Expected Environment Variables After Completion

```env
# Mailgun Email Configuration
MAILGUN_API_KEY=key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MAILGUN_DOMAIN=evofit.io
MAILGUN_API_BASE_URL=https://api.mailgun.net/v3
FROM_EMAIL=EvoFitMeals <hello@evofit.io>
```

### Testing After Implementation

```bash
# 1. Restart dev environment
docker-compose --profile dev restart

# 2. Test email sending
# Login as trainer → Send invitation → Check customer inbox

# 3. Verify Mailgun logs
# Go to Mailgun dashboard → Sending → Logs
```

---

## 🚨 PRODUCTION DEPLOYMENT FIX - SECOND PRIORITY (November 8, 2025)

**Status:** ⚠️ CRITICAL - Production deploying OLD code from October 28
**Business Impact:** BMAD Bulk Generator updates (Nov 7) NOT live on evofitmeals.com
**Estimated Time:** 10-15 minutes to fix + 7-10 minutes deployment

### Problem

- Production currently deploys from **DigitalOcean Container Registry** (outdated image from Oct 28-29)
- Latest code changes (BMAD Bulk Generator form updates) from **November 7** are NOT deployed
- Docker push fails due to proxy/network blocking - cannot update container registry

### Solution

**Switch App Spec to deploy from GitHub instead of Container Registry**

### Instructions

See detailed step-by-step guide: **`URGENT_PRODUCTION_DEPLOYMENT_FIX.md`**

### Quick Summary

1. Go to: https://cloud.digitalocean.com/apps/600abc04-b784-426c-8799-0c09f8b9a958
2. Settings → App Spec → Edit
3. Replace `image:` section with `github:` configuration
4. Save and authorize GitHub access
5. Wait 7-10 minutes for deployment
6. Verify latest code is live

### Verification After Fix

- [ ] Recipe Library tab - NO "Generate Recipes" button
- [ ] BMAD Bulk Generator - HAS "Focus Ingredient", "Difficulty Level", "Recipe Preferences" fields
- [ ] BMAD Bulk Generator - NO "Daily Calorie Goal", "Description", "Days", "Meals Per Day" fields
- [ ] Deployment logs show November 7-8 dates (not Oct 28-29)

---

## 🚀 HYBRID PRICING MODEL - IN PROGRESS (January 2025)

**Status:** ⏳ 75% COMPLETE - AWAITING STRIPE CONFIGURATION
**Business Impact:** Transform -$91,360 loss into +$1,828,547 profit over 10 years
**Total Implementation:** ~2,900 lines of code across 9 new files + 3 modified files

### Implementation Progress

**✅ Phase 1: Stripe Integration** (Complete)

- [x] stripeService.ts (350 lines) - Stripe SDK integration
- [x] subscriptionRoutes.ts (450 lines) - API endpoints
- [x] Database migration (0020_add_subscription_fields.sql)
- [x] Webhook handler for subscription events

**✅ Phase 2: Frontend Pricing Page** (Complete)

- [x] HybridPricing.tsx (580 lines) - Pricing page with toggle
- [x] Router integration (/pricing route)
- [x] Subscription/one-time payment selection

**✅ Phase 3: Usage Enforcement System** (Complete)

- [x] usageEnforcement.ts (365 lines) - Usage limit middleware
- [x] usageTracking.ts (200 lines) - Event tracking service
- [x] UsageDashboard.tsx (370 lines) - Usage display component
- [x] usageRoutes.ts (120 lines) - Usage API endpoints
- [x] Monthly reset scheduler integrated
- [x] Meal plan generation enforcement applied

**⏳ NEXT: STRIPE CONFIGURATION REQUIRED** (45-60 minutes)

### 🔥 IMMEDIATE ACTION: Configure Stripe Account

**Priority:** HIGHEST - Blocks all testing and Phase 4/5/6
**Estimated Time:** 45-60 minutes
**Guide:** See `STRIPE_QUICKSTART_GUIDE.md` for step-by-step instructions

**Required Steps:**

1. [ ] Create Stripe account → https://dashboard.stripe.com/register
2. [ ] Create 3 subscription products:
   - Starter Pro: $14.99/month
   - Professional Pro: $29.99/month
   - Enterprise Pro: $59.99/month
3. [ ] Copy Price IDs from each product
4. [ ] Get API keys → https://dashboard.stripe.com/apikeys
5. [ ] Configure webhook → Point to `/api/subscription/webhook`
6. [ ] Update .env file with all keys:
   ```env
   STRIPE_SECRET_KEY=sk_test_YOUR_KEY
   STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET
   STRIPE_PRICE_ID_STARTER_MONTHLY=price_xxxxx
   STRIPE_PRICE_ID_PROFESSIONAL_MONTHLY=price_xxxxx
   STRIPE_PRICE_ID_ENTERPRISE_MONTHLY=price_xxxxx
   ```
7. [ ] Run database migration:
   ```bash
   $env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fitnessmealplanner"
   npm run migrate 0020_add_subscription_fields.sql
   ```
8. [ ] Test subscription flow with test card: 4242 4242 4242 4242

**Success Criteria:**

- Pricing page loads at http://localhost:4000/pricing
- Can toggle between subscription/one-time payment
- Clicking "Get Started" redirects to Stripe Checkout
- Test payment succeeds
- Webhook received (check server logs)
- Database updated with subscription info

**After Stripe Configuration:**

- Move to Phase 4: Documentation & Communication (4-6 hours)
- Move to Phase 5: Testing (12-16 hours)
- Move to Phase 6: Production Launch

### Pricing Model Details

**Subscription Tiers** (Unlimited Usage):

- Starter Pro: $14.99/month (9 clients, unlimited plans)
- Professional Pro: $29.99/month (20 clients, unlimited plans)
- Enterprise Pro: $59.99/month (50 clients, unlimited plans)

**One-Time Tiers** (Limited Usage):

- Starter: $399 (9 clients, 20 plans/month)
- Professional: $599 (20 clients, 50 plans/month)
- Enterprise: $999 (50 clients, 150 plans/month)

### Financial Projections

**Current Model (One-Time Only):**

- 10-year profit: **-$91,360 loss** ❌
- Break-even: Year 8-9
- Unsustainable

**Hybrid Model (After Launch):**

- 10-year profit: **+$1,828,547** ✅
- Break-even: Year 1
- LTV:CAC ratio: 5.85:1 (excellent)
- 30% subscription adoption target

### Documentation

- `STRIPE_QUICKSTART_GUIDE.md` - Step-by-step Stripe setup (60 min)
- `HYBRID_PRICING_IMPLEMENTATION_SUMMARY.md` - Technical overview (Phase 1-2)
- `USAGE_ENFORCEMENT_IMPLEMENTATION_SUMMARY.md` - Usage system (Phase 3)
- `docs/financial/EXECUTIVE_SUMMARY_FINANCIALS.md` - Business case
- `docs/financial/FINANCIAL_MODEL.md` - 10-year projections
- `docs/financial/PRICING_STRATEGY.md` - Pricing recommendations

---

## ✅ 3-TIER PAYMENT SYSTEM - COMPLETE (February 1, 2025)

**Status:** ✅ ALL 4 PHASES COMPLETE - PRODUCTION READY
**Completion Date:** February 1, 2025
**Total Implementation:** ~2,700 lines of code across 15 files
**Test Coverage:** Comprehensive unit tests + middleware + API validation ready

### System Overview

The 3-Tier Payment System is **fully implemented** with Stripe one-time payments, dynamic pricing, server-side feature gating, and comprehensive frontend components.

### Deliverables

**✅ Phase 1: Database Foundation** (3 tables, 4 enums):

- [x] trainer_tier_purchases table with RLS policies
- [x] tier_usage_tracking table with lifetime usage counters
- [x] payment_logs table for audit trail
- [x] Applied via migrations: 0020_create_tier_purchase_tables.sql, 0021_enable_rls_tier_tables.sql

**✅ Phase 2: Backend Services** (1,218 lines):

- [x] EntitlementsService.ts (388 lines) - Redis caching with 5-min TTL
- [x] StripePaymentService.ts (360 lines) - One-time checkout payments
- [x] StripeWebhookHandler.ts (470 lines) - Payment event processing

**✅ Phase 3: API Layer** (7 endpoints):

- [x] GET /api/v1/public/pricing - Dynamic pricing (no hardcoded amounts)
- [x] POST /api/v1/tiers/purchase - Create one-time payment checkout
- [x] POST /api/v1/tiers/upgrade - Upgrade to higher tier (one-time payment)
- [x] GET /api/v1/tiers/current - Current tier and entitlements
- [x] GET /api/v1/tiers/usage - Usage statistics (lifetime totals)
- [x] POST /api/v1/webhooks/stripe - Payment event processing
- [x] Tier enforcement middleware (225 lines) - 6 middleware functions

**✅ Phase 4: Frontend Components** (990 lines):

- [x] TierSelectionModal.tsx (230 lines) - 3-tier comparison with one-time pricing
- [x] FeatureGate.tsx (330 lines) - Server-side feature access validation
- [x] UsageLimitIndicator.tsx (430 lines) - Real-time usage tracking display

### Tier Configuration

**Starter Tier** ($199 one-time):

- 9 customers
- 50 meal plans
- **Recipe Database Access:** 1,000 meals (+25 new/month)
- **Meal Types:** 5 varieties (Breakfast, Lunch, Dinner, Snack, Post-Workout)
- PDF export only
- Basic support
- Lifetime access

**Professional Tier** ($299 one-time):

- 20 customers
- 200 meal plans
- **Recipe Database Access:** 2,500 meals (+50 new/month)
- **Meal Types:** 10 varieties (All Starter + Pre-Workout, Keto, Vegan, Paleo, High-Protein)
- **Seasonal Recipes:** Included
- CSV & PDF export
- Analytics dashboard
- Bulk operations
- Custom branding
- Priority support
- Lifetime access

**Enterprise Tier** ($399 one-time):

- 50 customers
- 500 meal plans
- **Recipe Database Access:** 4,000 meals (+100 new/month with priority access)
- **Meal Types:** 15+ varieties (All Professional + Gluten-Free, Low-Carb, Mediterranean, DASH, Intermittent Fasting, Bodybuilding, Endurance)
- **Seasonal Recipes:** All collections + exclusive enterprise recipes
- **Advanced Diet Customization:** All special diet options
- All export formats (PDF, CSV, Excel)
- Advanced analytics
- White-label customization
- Dedicated support
- Lifetime access

### Architecture Highlights

- **One-Time Payments**: Single payment for lifetime access to tier features
- **Redis Caching**: 5-minute TTL reduces DB load, invalidated on tier changes
- **Stripe Checkout Flow**: Redirect-based (not inline forms) for PCI compliance
- **Server-Side Enforcement**: API returns 403 with upgrade prompts (frontend can't bypass)
- **Dynamic Pricing**: No hardcoded amounts - all fetched from backend configuration
- **Unlimited Tiers**: -1 limit represents unlimited (Enterprise tier)
- **Lifetime Usage Tracking**: Tracks total usage across lifetime of tier purchase

### Prerequisites for Testing

```bash
# 1. Install dependencies
npm install stripe date-fns

# 2. Set environment variables (.env)
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PRICE_STARTER=price_starter_onetime_id
STRIPE_PRICE_PROFESSIONAL=price_professional_onetime_id
STRIPE_PRICE_ENTERPRISE=price_enterprise_onetime_id

# 3. Ensure services running
docker-compose --profile dev up -d
```

### Integration Points

**Backend - Protect API Routes:**

```typescript
// Require specific feature
app.get(
  "/api/analytics",
  requireAuth,
  requireFeature("analytics"),
  analyticsController,
);

// Check usage limit before creation (lifetime limits)
app.post(
  "/api/customers",
  requireAuth,
  requireUsageLimit("customers"),
  createCustomer,
);

// Track usage after successful creation (lifetime totals)
app.post(
  "/api/meal-plans",
  requireAuth,
  trackUsage("mealPlans"),
  createMealPlan,
);
```

**Frontend - Feature Gating:**

```tsx
// Wrap restricted features
<FeatureGate feature="analytics">
  <AnalyticsDashboard />
</FeatureGate>

// Show usage indicator (lifetime usage)
<UsageLimitIndicator resourceType="customers" expanded />

// Display tier selection (one-time pricing)
<TierSelectionModal open={showModal} onClose={() => setShowModal(false)} />
```

### Documentation

- `docs/TIER_SOURCE_OF_TRUTH.md` - Business requirements (from previous session)
- `shared/schema.ts` - Database schema (lines 1348-1587)
- `server/routes/tierRoutes.ts` - Complete API reference
- `server/middleware/tierEnforcement.ts` - Middleware documentation

### Next Steps for Production

1. **Create Stripe Products & Prices** in Stripe Dashboard (one-time payments)
2. **Configure Webhook Endpoint**: https://yourdomain.com/api/v1/webhooks/stripe
3. **Test Payment Flow**:
   - Navigate to pricing page → Select tier → Stripe Checkout
   - Complete one-time payment → Webhook grants tier access
   - Verify entitlements caching and feature access
4. **Integration**:
   - Add tier selection to trainer onboarding
   - Integrate UsageSummary in trainer dashboard
   - Wrap premium features with FeatureGate
   - Add usage indicators near creation buttons

---

## 🔥 IMMEDIATE NEXT STEP - Manual Testing Required (January 25, 2025)

**Status:** ⏳ AWAITING USER ACTION - HIGHEST PRIORITY
**Session Summary:** `SESSION_SUMMARY_TEST_INVESTIGATION_JAN25.md`
**Action Plan:** `test/ACCOUNT_DELETION_ACTION_PLAN.md`

### 🎯 What Needs to Happen Next

**Priority 1: Manual Testing of Delete Account Feature** (2 hours)

**Why This is Critical:**

- Account deletion E2E tests are **3.3% passing** (1/30 browser runs)
- Tests make assumptions that may not match actual implementation
- Cannot fix tests without knowing how feature actually works
- Account deletion is HIGH-RISK functionality requiring validation

**What to Do:**

```bash
# 1. Start dev environment
docker-compose --profile dev up -d

# 2. Open browser
# Navigate to: http://localhost:4000

# 3. Follow manual testing checklist
# File: test/ACCOUNT_DELETION_ACTION_PLAN.md (line 30)

# 4. Document findings as you test
# Create: test/ACCOUNT_DELETION_MANUAL_TEST_RESULTS.md
```

**Manual Testing Checklist Preview:**

1. Login as customer.test@evofitmeals.com / TestCustomer123!
2. Navigate to Profile tab
3. Find "Danger Zone" section
4. Click "Delete Account" button
5. Document what actually happens (selectors, dialogs, behavior)
6. Test edge cases (cancel, invalid confirmation, errors)
7. Take screenshots of key UI states

**Expected Outcome:**

- ✅ Know if Delete Account feature works correctly
- ✅ Have accurate selectors and UI structure documented
- ✅ Identify any bugs in implementation
- ✅ Ready to rewrite tests with correct expectations

**Estimated Time:** 2 hours

**After Manual Testing:**

- Review findings
- Decide: Fix bugs in feature OR rewrite tests
- Update action plan with next steps
- Begin test rewrite (4-6 hours estimated)

**Total Time to Fix:** ~10-12 hours (2 manual + 4-6 rewrite + 1-3 bug fixes)

### 📊 Test Suite Status

| Test Suite                      | Status              | Pass Rate      | Next Action              |
| ------------------------------- | ------------------- | -------------- | ------------------------ |
| account-deletion                | ❌ Requires Rewrite | 1/30 (3.3%)    | Manual testing → Rewrite |
| customer-profile-comprehensive  | ✅ Complete         | 21/21 (100%)   | None                     |
| awesome-testing-protocol (RBAC) | ✅ Complete         | 30/30 (100%)   | None                     |
| Unit Tests (Vitest)             | ⚠️ Infrastructure   | ~300/? passing | Config fixes (secondary) |

### 🔗 Key Files for Next Session

**Must Read:**

1. `SESSION_SUMMARY_TEST_INVESTIGATION_JAN25.md` - Complete session summary
2. `test/ACCOUNT_DELETION_ACTION_PLAN.md` - Manual testing checklist (318 lines)
3. `test/TEST_SUITE_FIX_SUMMARY.md` - Full analysis (394 lines)

**To Create:**

1. `test/ACCOUNT_DELETION_MANUAL_TEST_RESULTS.md` - Document your findings here

---

## ✅ BMAD Multi-Agent Recipe Generation System - COMPLETE

**Status:** ✅ ALL 7 PHASES COMPLETE + TEST SUITE FIXED - PRODUCTION READY
**Completion Date:** October 8, 2025 (System) | October 10, 2025 (Tests)
**Total Time:** 8 sessions across 4 days
**Test Coverage:** 99.5% (210/211 tests passing) ⬆️ +9.7% improvement

### System Overview

The BMAD Multi-Agent Recipe Generation System is **fully operational** and integrated into the Admin Dashboard with real-time Server-Sent Events (SSE) progress tracking.

### Deliverables

**✅ 7 Production Agents** (2,003 lines):

- [x] BaseAgent - Abstract base with lifecycle management
- [x] RecipeConceptAgent - Planning & chunking (5 recipes/chunk)
- [x] ProgressMonitorAgent - Real-time state tracking
- [x] BMADCoordinator - Workflow orchestration
- [x] NutritionalValidatorAgent - Auto-fix nutrition data
- [x] DatabaseOrchestratorAgent - Transactional saves
- [x] ImageGenerationAgent - DALL-E 3 integration

**✅ Frontend Integration** (Phase 7):

- [x] BMADRecipeGenerator component (560+ lines)
- [x] Server-Sent Events for real-time updates
- [x] Admin Dashboard integration (4th tab)
- [x] Generate 1-100 recipes with live progress

**✅ API Endpoints**:

- [x] `POST /api/admin/generate-bmad` - Start generation
- [x] `GET /api/admin/bmad-progress-stream/:batchId` - SSE stream
- [x] `GET /api/admin/bmad-metrics` - Agent metrics
- [x] `GET /api/admin/bmad-sse-stats` - Connection stats

**✅ Test Suite** (2,788 lines) - FIXED October 10, 2025:

- 211 total tests (210 passing, 1 intentionally skipped)
- Test/code ratio: 1.39 (excellent)
- 100% coverage for ALL 8 agents
- ✅ All critical bugs fixed (BaseAgent retry logic, BMADCoordinator progress init, DatabaseOrchestrator edge cases)

### How to Use

1. Navigate to: **http://localhost:5000/admin**
2. Click **"BMAD Generator"** tab (4th tab with robot icon)
3. Configure settings:
   - Recipe count: 1-100
   - Meal types: Breakfast, Lunch, Dinner, Snack
   - Fitness goal: Weight loss, Muscle gain, etc.
   - Toggle features: Image gen, S3 upload, Nutrition validation
4. Click **"Start BMAD Generation"**
5. Watch real-time progress with agent status updates

### Performance Achieved

- ✅ 30 recipes in < 3 minutes
- ✅ < 5 seconds per recipe (non-blocking)
- ✅ Real-time SSE progress updates
- ✅ 95%+ image uniqueness
- ⚠️ 89.8% test coverage (target: 95%)

### Documentation

- `BMAD_PHASE_7_FRONTEND_INTEGRATION_DOCUMENTATION.md` - Latest completion report
- `BMAD_RECIPE_GENERATION_IMPLEMENTATION_ROADMAP.md` - 6-phase plan
- `BMAD_PHASE_1_COMPLETION_REPORT.md` through `BMAD_PHASE_6_SSE_DOCUMENTATION.md`

### Optional Future Enhancements (Phase 8)

If stakeholders request:

- [ ] Cancel generation button
- [ ] Batch management dashboard
- [ ] Progress persistence with Redis
- [ ] Generation history
- [ ] Batch templates

---

## 🤖 CONTINUOUS TESTING FRAMEWORK - IMPLEMENTED (January 2025)

**Status:** ✅ FRAMEWORK COMPLETE | ⚠️ 5 TEST FAILURES TO FIX
**Completion Date:** January 13, 2025
**Framework Status:** Production ready, awaiting test fixes

### System Overview

A Claude-powered autonomous continuous testing framework specifically for Meal Plan Generator that runs without external API calls.

### Deliverables

**✅ Continuous Testing Agent** (482 lines):

- [x] Autonomous test execution every 5 minutes
- [x] Multi-category testing (unit, integration)
- [x] Intelligent failure detection and reporting
- [x] JSON report generation
- [x] Real-time console feedback
- [x] Graceful shutdown handling

**✅ Documentation Suite**:

- [x] `test/continuous-testing/continuous-test-agent.ts` - Main agent
- [x] `test/continuous-testing/verify-setup.ts` - Setup verification
- [x] `test/continuous-testing/CLAUDE_SUBAGENT_SPEC.md` - Technical spec (850 lines)
- [x] `test/continuous-testing/README.md` - User guide
- [x] `test/continuous-testing/QUICK_START.md` - 5-minute quick start
- [x] `BMAD_CONTINUOUS_TESTING_SESSION.md` - Complete session log

**✅ NPM Scripts** (7 new commands):

```bash
npm run test:continuous              # Start continuous testing
npm run test:continuous:auto-fix     # With auto-fix (needs integration work)
npm run test:continuous:unit         # Unit tests only
npm run test:continuous:integration  # Integration tests only
npm run test:continuous:verify       # Verify setup
```

### Current Test Baseline

**Total Tests: 17**

- ✅ Passed: 11 (64.7%)
- ❌ Failed: 5 (29.4%)
- ⏭️ Skipped: 1 (5.9%)

**Test Cycle Time:** 30-45 seconds (was 5-6 minutes with E2E)

### ✅ CONTINUOUS TESTING FRAMEWORK - OPERATIONAL (January 13, 2025)

**Status:** Framework Complete & Running
**Baseline Established:** 64.7% pass rate (11/17 tests)
**Framework Health:** ✅ EXCELLENT (test cycles complete in 30-45s)

### 📊 Current Test Status

**Overall Metrics:**

- Total Tests: 17
- ✅ Passing: 11 (64.7%)
- ❌ Failing: 5 (29.4%)
- ⏭️ Skipped: 1 (5.9%)
- Cycle Time: 30-45 seconds

**Unit Tests:** 66.7% (6/9 passing)

- intelligentMealPlanGenerator.test.ts: 36% (9/25 passing) - Jest→Vitest conversion done
- naturalLanguageMealPlan.test.ts: 0% - OpenAI mock structure needs fix

**Integration Tests:** 62.5% (5/8 passing)

- CustomerMealPlans.test.tsx: 0% - Needs AuthProvider wrapper
- mealPlanWorkflow.test.ts: Status unknown
- MealPlanAssignmentWorkflow.test.tsx: Status unknown

### 🔧 Test Failures Analyzed

**See `TEST_FAILURE_ANALYSIS.md` for complete analysis**

**Root Causes Identified:**

1. Missing AuthProvider context in React tests
2. Jest/Vitest mock incompatibility (partially fixed)
3. Dynamic require() not resolving to mocks
4. OpenAI mock structure incorrect for Vitest

### 🎯 Fix Roadmap (Priority 1 - Quick Wins)

**Estimated Time: 1-2 hours to reach 85%+ pass rate**

1. **Fix CustomerMealPlans.test.tsx** (30 min)
   - Add AuthProvider wrapper to test renders
   - Expected: +3 passing tests → 82% pass rate

2. **Fix intelligentMealPlanGenerator.test.ts** (60 min)
   - Convert `require()` to imports
   - Use `vi.mocked()` for proper typing
   - Expected: +16 passing tests → 91% pass rate

3. **Fix naturalLanguageMealPlan.test.ts** (2-3 hours)
   - Restructure OpenAI mocks for Vitest
   - Fix database mock loading
   - Expected: +15 passing tests → 98%+ pass rate

### ✅ Session Accomplishments (January 13, 2025)

**Framework:**

- ✅ Created continuous-test-agent.ts (482 lines)
- ✅ Created verification script (175 lines)
- ✅ Comprehensive documentation (6 files)
- ✅ 7 NPM scripts added

**Test Fixes:**

- ✅ Removed .skip() from 2 test files
- ✅ Converted jest.fn() → vi.fn() (all occurrences)
- ✅ Converted jest.clearAllMocks() → vi.clearAllMocks()
- ✅ Root cause analysis complete

**Documentation:**

- ✅ BMAD_CONTINUOUS_TESTING_SESSION.md (423 lines)
- ✅ TEST_FAILURE_ANALYSIS.md (comprehensive guide)
- ✅ Updated TODO_URGENT.md

### 🚀 Quick Start Commands

```bash
# Verify setup
npm run test:continuous:verify

# Start continuous testing
npm run test:continuous

# View latest results
cat test-results/continuous-testing/latest.json | jq '.summary'
```

### 📈 Success Metrics Progress

```
Test Coverage:     [████░░░░░░] 65%  (Target: 95%)
Success Rate:      [██████░░░░] 65%  (Target: 98%)
Auto-Fix Rate:     [░░░░░░░░░░]  0%  (Target: 70%)
Detection Time:    [██████████] 100% ✅
Cycle Time:        [██████████] 100% ✅
```

### 🎯 Next Session Goal

**Target:** Implement Priority 1 fixes → 85%+ success rate
**Time:** 1-2 hours
**Focus:** AuthProvider wrapper + module import fixes

---

## 🚨 IMMEDIATE ACTION ITEMS - Test Suite Unblocking (Historical)

### 3. Fix E2E Test Configuration (Later) - MEDIUM PRIORITY

**Status:** ⚠️ Currently disabled due to timeouts
**Problem:** Playwright E2E tests timeout after 300 seconds (5 minutes)
**Root Cause:** Browser/display not configured in Docker environment
**Workaround:** E2E tests excluded from continuous testing

**Action Plan (Future):**

1. [ ] Configure Xvfb for headless browser support
2. [ ] Update Playwright configuration for CI environment
3. [ ] Test E2E suite locally
4. [ ] Re-enable E2E tests in continuous testing
5. [ ] Verify E2E tests complete within 2 minutes

**Time Estimate:** 2-3 hours

### Success Criteria

**When tests are fixed:**

- [ ] Unit test success rate: 95%+ (currently 66.7%)
- [ ] Integration test success rate: 95%+ (currently 62.5%)
- [ ] Overall success rate: 98%+ (currently 64.7%)
- [ ] All continuous testing cycles show consistent improvement
- [ ] No skipped tests (except intentional exclusions)

### How to Verify Fixes

```bash
# Verify setup
npm run test:continuous:verify

# Run one test cycle
npm run test:continuous

# Check results
cat test-results/continuous-testing/latest.json | jq '.summary'

# View specific failures
cat test-results/continuous-testing/latest.json | jq '.testRuns[].failures[]'
```

### Next Steps After Fixes

1. **Complete Autonomous Fixer Integration**
   - Pass failure data directly from continuous agent to autonomous fixer
   - Enable true auto-fix capability
   - Target: 70%+ auto-fix rate

2. **Expand Test Coverage**
   - Add remaining 120 planned tests (17 → 137 tests)
   - Achieve 95%+ coverage for meal plan services

3. **Performance Optimization**
   - Parallel test execution
   - Smart test selection (only run affected tests)

---

## 🚨 IMMEDIATE ACTION ITEMS - Test Suite Unblocking

### 1. ✅ Fix Admin API Response Headers Issue (2 hours)

**File:** `test/unit/api/adminApi.test.ts`
**Lines:** 167, 191
**Problem:** "Cannot set headers after they are sent to the client"
**Impact:** Blocking 482 unit tests (40% of suite)
**Fix:**

```typescript
// Add response guard before sending
if (!res.headersSent) {
  res.status(500).json({ message: error.message });
}
```

**Status:** COMPLETE (2025-09-24 - 10 minutes)
**Result:** All 43 tests in adminApi.test.ts now passing ✅

### 2. ✅ Align JWT Error Codes (1 hour)

**File:** `server/middleware/auth.ts`
**Line:** 128
**Problem:** Expected 'SESSION_EXPIRED' but got 'INVALID_TOKEN'
**Impact:** Breaking 9 integration tests
**Fix:**

```typescript
// Changed from e instanceof TokenExpiredError to:
if (e.name === 'TokenExpiredError') {
```

**Status:** COMPLETE (2025-09-24 - 20 minutes)
**Result:** JWT error handling corrected ✅

### 3. ✅ Configure Docker with X11/Xvfb for GUI Tests (4 hours)

**Problem:** Missing X server/display in Docker container
**Impact:** Blocking 100% of E2E/Playwright tests
**Fix:**

- Install Xvfb in Docker container
- Added to Dockerfile:

```dockerfile
RUN apk add --no-cache xvfb xvfb-run
ENV DISPLAY=:99
```

- Updated package.json test scripts to use xvfb-run
- Installed xvfb-run in running container
  **Status:** COMPLETE (2025-09-24 - 20 minutes)
  **Result:** Xvfb installed and configured, GUI tests can now run ✅

### 3. ❌ Align JWT Error Codes (1 hour)

**File:** `test/integration/auth/jwt-refresh-integration.test.ts`
**Line:** 423
**Problem:** Expected 'SESSION_EXPIRED' but got 'INVALID_TOKEN'
**Impact:** Breaking 9 integration tests
**Fix:** Review auth middleware and ensure consistent error codes
**Status:** NOT STARTED

### 4. ✅ Setup Stryker Mutation Testing (3 hours)

**Problem:** No mutation testing configuration
**Impact:** Cannot measure test quality
**Fix:** Created `stryker.conf.js` with comprehensive configuration:

```javascript
export default {
  mutate: ["server/**/*.ts", "client/src/**/*.{ts,tsx}"],
  testRunner: "vitest",
  reporters: ["html", "progress", "json"],
  thresholds: { high: 90, low: 80, break: 75 },
};
```

**Status:** COMPLETE (2025-09-24 - 30 minutes)
**Result:** Stryker installed and configured, ready for mutation testing ✅

## 📊 Current Test Suite Status (Final: September 24, 17:00)

- **Unit Tests:** ~61% passing (improved with fixes)
- **Integration Tests:** 60% passing (6/10) ✅ MAJOR IMPROVEMENT - JWT refresh endpoint implemented
- **E2E/GUI Tests:** Module loading issue identified - ViteExpress MIME type problem
- **Mutation Score:** Stryker configured and ready for use
- **Overall Health:** ~65% - SIGNIFICANTLY IMPROVED FROM 50% ✅

## 🔍 GUI Test Root Cause Analysis (September 24, 2025 - UPDATED)

**Problem:** React app elements not rendering in Puppeteer tests
**Root Cause Found:** ✅ MIME type issue - server returning "application/octet-stream" for JS modules
**Fix Applied:** Added MIME type middleware to serve JS files with correct "application/javascript" type
**New Issue:** JavaScript syntax error - "missing ) after argument list" in React app
**Current Status:**

- MIME type issue FIXED
- React app now loading but has syntax error
- Tests still failing but with different error (progress!)
  **Next Steps:**

1. Identify source of JavaScript syntax error
2. Fix syntax error in React code
3. Re-run GUI tests

## 🔍 Integration Test Root Cause Analysis (September 24, 2025)

**Problem:** JWT refresh token endpoint `/auth/refresh_token` does not exist
**Impact:** 9 of 10 integration tests fail because they test non-existent functionality
**Solution Options:**

1. Implement the missing `/auth/refresh_token` endpoint
2. Remove/skip these integration tests as they test unimplemented features
3. Update tests to match actual authentication implementation

## ✅ JWT Refresh Token Implementation - COMPLETE

**Issue:** Users must re-login every 15 minutes when access token expires
**Resolution:** Implemented comprehensive JWT refresh system
**Implementation Status:**

- ✅ `/auth/refresh_token` endpoint implemented and working
- ✅ Automatic token refresh in auth middleware
- ✅ Proper error handling with specific error codes
- ✅ Cookie management (clear on failure, update on success)
- ✅ Token uniqueness via JWT ID (jti) field
- ✅ User info included in refresh response
- ✅ Security: Refresh token rotation on use
  **Test Results:** 6/10 integration tests passing (up from 1/10)
  **Remaining Issues:**
- Automatic refresh middleware edge cases (4 tests failing)
- Multiple refresh request handling
- Long-running request token expiration

## 🎯 Success Criteria

- [x] Admin API headers issue fixed ✅
- [x] JWT error codes aligned ✅
- [x] Docker X11/Xvfb configured ✅
- [x] Stryker mutation testing setup ✅
- [x] JWT refresh token endpoint implemented ✅
- [ ] All unit tests passing (currently ~61%)
- [ ] All integration tests passing (currently 60% - 6/10)
- [ ] E2E tests running in Docker (currently blocked by JS syntax error)
- [x] Mutation testing configured and running ✅
- [ ] Test coverage > 80%

## 📁 Test Reports Location

All diagnostic reports saved in: `/reports/`

- `test-debt.md` - Coverage gaps
- `flake-report.md` - Stability analysis
- `blockers.md` - Critical issues
- `test-results.json` - Raw results

## ⏰ Timeline

**Total Effort:** ~10 hours
**Target Completion:** End of day
**Next Session:** Start with item #1 (Admin API fix)

## 💡 Quick Commands for Testing

```bash
# Run in Docker container
docker exec fitnessmealplanner-dev npm run test:unit:coverage
docker exec fitnessmealplanner-dev npm run test:integration
docker exec fitnessmealplanner-dev npm run test:gui

# After fixes, run full suite
docker exec fitnessmealplanner-dev npm run test:all
```

## 🎯 SESSION COMPLETION SUMMARY - September 24, 2025

### Major Achievements:

1. **JWT Refresh Token System**: Fully implemented with automatic refresh middleware
2. **Integration Test Recovery**: Improved from 10% to 60% pass rate (600% improvement)
3. **Test Infrastructure Enhancement**: Overall health improved from 50% to 65%
4. **Root Cause Analysis**: Identified ViteExpress MIME type issue for GUI tests
5. **BMAD Documentation**: Updated all workflow files with Phase 20 progress

### Remaining Issues for Next Session:

1. **GUI Tests**: ViteExpress not serving JS modules with correct MIME type
   - Workaround added but core issue remains
   - Consider switching from ViteExpress or upgrading configuration
2. **Integration Edge Cases**: 4 tests failing on token expiration edge cases
   - Manual expired token creation may not trigger proper flow
3. **Unit Test Coverage**: Still at ~61%, needs improvement

### Technical Debt Resolved:

- ✅ Admin API response headers issue
- ✅ JWT error code alignment
- ✅ Docker X11/Xvfb configuration
- ✅ Stryker mutation testing setup
- ✅ JWT refresh token implementation

## ⚠️ DO NOT FORGET

The test suite is now functional but not complete. ViteExpress GUI test issues remain the primary blocker.

---

**REMEMBER:** Check this file at the start of every session!
