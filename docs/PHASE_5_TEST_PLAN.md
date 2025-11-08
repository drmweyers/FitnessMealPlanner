# Phase 5: Testing - Comprehensive Test Plan

## Overview

**Phase:** 5 of 6 (Testing)
**Status:** 🟡 IN PROGRESS
**Estimated Duration:** 12-16 hours
**Dependencies:** Stripe configuration (partial blocker)

---

## Testing Strategy

### Two-Track Approach

**Track 1: Independent Testing (START NOW)**
- ✅ Can be completed without Stripe configuration
- ✅ Tests usage enforcement system
- ✅ Tests email template rendering
- ✅ Tests frontend components
- ✅ Tests database operations

**Track 2: Stripe Integration Testing (AFTER STRIPE CONFIG)**
- ⏳ Requires Stripe account setup
- ⏳ Requires webhook configuration
- ⏳ Requires test API keys
- ⏳ Tests payment flows end-to-end

---

## Test Categories

### 1. Usage Enforcement Testing (Track 1) ✅

**Estimated Time:** 2 hours

#### 1.1 Unit Tests - `usageEnforcement.ts`

**File:** `test/unit/middleware/usageEnforcement.test.ts`

**Test Cases:**

```typescript
describe('checkUsageLimit', () => {
  test('allows grandfathered users unlimited access', async () => {
    // User with isGrandfathered = true
    // Expected: { allowed: true }
  });

  test('allows active subscription users unlimited access', async () => {
    // User with paymentType = 'subscription', subscriptionStatus = 'active'
    // Expected: { allowed: true }
  });

  test('allows one-time user under limit', async () => {
    // Starter tier: 15/20 used
    // Expected: { allowed: true, currentUsage: 15, limit: 20 }
  });

  test('blocks one-time user at limit', async () => {
    // Starter tier: 20/20 used
    // Expected: { allowed: false, reason: '...', upgradeUrl: '/pricing?upgrade=true' }
  });

  test('blocks one-time user over limit', async () => {
    // Edge case: 25/20 used (data integrity issue)
    // Expected: { allowed: false }
  });

  test('handles users with no usage data', async () => {
    // New user, mealPlansGeneratedThisMonth = null
    // Expected: { allowed: true, currentUsage: 0, limit: 20 }
  });

  test('applies correct limits by tier', async () => {
    // Starter: 20, Professional: 50, Enterprise: 150
    // Expected: Correct limit for each tier
  });

  test('blocks canceled subscription users', async () => {
    // subscriptionStatus = 'canceled'
    // Expected: { allowed: false } (unless they have one-time payment)
  });
});

describe('incrementUsage', () => {
  test('increments usage counter correctly', async () => {
    // User with 10 plans generated
    // After increment: 11 plans generated
  });

  test('handles concurrent increments', async () => {
    // Simulate 5 simultaneous requests
    // Expected: Counter increases by exactly 5 (atomic operation)
  });

  test('does not increment for subscription users', async () => {
    // Subscription user generates plan
    // Counter should still increment for analytics (track usage even if unlimited)
  });
});

describe('resetMonthlyUsage', () => {
  test('resets one-time payment users to 0', async () => {
    // 3 one-time users with 15, 20, 50 plans generated
    // After reset: all have 0
  });

  test('does not reset subscription users', async () => {
    // Subscription users should not have mealPlansGeneratedThisMonth modified
  });

  test('sets correct usageResetDate', async () => {
    // Reset on Feb 1 → usageResetDate should be Mar 1
  });

  test('handles month-end edge cases', async () => {
    // Reset on Jan 31 → Next reset is Feb 28/29
  });
});

describe('enforceUsageLimit middleware', () => {
  test('calls next() when usage allowed', async () => {
    // User under limit
    // Expected: next() called, no response sent
  });

  test('returns 429 when limit exceeded', async () => {
    // User at limit
    // Expected: res.status(429).json({ ... })
  });

  test('attaches usageInfo to request object', async () => {
    // User allowed
    // Expected: req.usageInfo contains currentUsage, limit, etc.
  });

  test('handles database errors gracefully', async () => {
    // Database query fails
    // Expected: Fail-open (allow access) but log error
  });
});
```

**Total Test Cases:** ~20 unit tests

---

#### 1.2 Integration Tests - Usage Enforcement with API

**File:** `test/integration/usageEnforcement.test.ts`

**Test Cases:**

```typescript
describe('POST /api/meal-plan/generate with usage enforcement', () => {
  test('allows generation when under limit', async () => {
    // One-time user: 10/20 used
    // POST /api/meal-plan/generate
    // Expected: 201, meal plan created, usage = 11/20
  });

  test('blocks generation when at limit', async () => {
    // One-time user: 20/20 used
    // POST /api/meal-plan/generate
    // Expected: 429, error message with upgradeUrl
  });

  test('increments usage after successful generation', async () => {
    // Before: 15/20, After: 16/20
  });

  test('does not increment usage if generation fails', async () => {
    // Generation fails (invalid params)
    // Usage should remain unchanged
  });

  test('subscription users can generate unlimited', async () => {
    // Active subscription
    // Generate 100 meal plans in a loop
    // Expected: All succeed
  });

  test('grandfathered users can generate unlimited', async () => {
    // isGrandfathered = true
    // Generate 100 meal plans in a loop
    // Expected: All succeed
  });
});

describe('POST /api/meal-plan/generate-intelligent with usage enforcement', () => {
  // Same tests as above for AI endpoint
});
```

**Total Test Cases:** ~12 integration tests

---

### 2. Usage Tracking Testing (Track 1) ✅

**Estimated Time:** 1 hour

#### 2.1 Unit Tests - `usageTracking.ts`

**File:** `test/unit/services/usageTracking.test.ts`

**Test Cases:**

```typescript
describe('trackUsage', () => {
  test('logs meal plan generation event', async () => {
    // trackUsage({ userId, action: 'meal_plan_generated', resourceId: planId })
    // Expected: Event inserted into usageTracking table
  });

  test('stores metadata correctly', async () => {
    // Metadata: { customerId, planName, daysCount, generationMethod }
    // Expected: All fields stored as JSON
  });

  test('sets createdAt timestamp', async () => {
    // Expected: createdAt = current timestamp
  });
});

describe('trackMealPlanGeneration', () => {
  test('creates tracking event with correct action', async () => {
    // Expected: action = 'meal_plan_generated'
  });

  test('includes all metadata fields', async () => {
    // Expected: customerId, planName, daysCount, generationMethod in metadata
  });
});

describe('detectAbusePattern', () => {
  test('detects abuse when >50 plans in 24 hours', async () => {
    // Create 51 events in last 24 hours
    // Expected: returns true
  });

  test('does not flag normal usage', async () => {
    // 10 events in last 24 hours
    // Expected: returns false
  });

  test('only counts last 24 hours', async () => {
    // 30 events in last 24 hours, 100 events 2 days ago
    // Expected: returns false (only last 24h count)
  });
});

describe('getUserUsageStats', () => {
  test('returns current usage for one-time user', async () => {
    // Expected: { currentUsage: 15, limit: 20, isUnlimited: false, ... }
  });

  test('returns unlimited status for subscription user', async () => {
    // Expected: { isUnlimited: true, limit: null, ... }
  });

  test('calculates warning level correctly', async () => {
    // 5/20 = low, 16/20 = medium, 19/20 = high
  });

  test('includes reset date', async () => {
    // Expected: resetDate = 1st of next month
  });
});
```

**Total Test Cases:** ~15 unit tests

---

### 3. Scheduler Service Testing (Track 1) ✅

**Estimated Time:** 1 hour

#### 3.1 Unit Tests - Monthly Reset Job

**File:** `test/unit/services/schedulerService.test.ts`

**Test Cases:**

```typescript
describe('setupMonthlyUsageResetJob', () => {
  test('job registered in jobs map', () => {
    // Expected: jobs.has('monthly-usage-reset') = true
  });

  test('calculates next reset date correctly', () => {
    // Today: Jan 15
    // Expected: nextRun = Feb 1 at 00:00 UTC
  });

  test('handles month-end edge cases', () => {
    // Today: Jan 31
    // Expected: nextRun = Feb 1 at 00:00 (not Feb 31)
  });
});

describe('triggerJob - monthly-usage-reset', () => {
  test('manually triggers usage reset', async () => {
    // Call schedulerService.triggerJob('monthly-usage-reset')
    // Expected: All one-time users reset to 0
  });

  test('returns success result', async () => {
    // Expected: { success: true, result: { message: '...' } }
  });

  test('handles errors gracefully', async () => {
    // Database error during reset
    // Expected: { success: false, error: '...' }
  });
});
```

**Total Test Cases:** ~8 unit tests

---

### 4. Email Template Testing (Track 1) ✅

**Estimated Time:** 2 hours

#### 4.1 Template Rendering Tests

**File:** `test/unit/email/emailTemplates.test.ts`

**Test Cases:**

```typescript
describe('Email Template Rendering', () => {
  test('replaces all variables in grandfather announcement', () => {
    // Template with [Customer Name], [Launch Date]
    // Expected: All variables replaced with actual values
  });

  test('handles missing variables gracefully', () => {
    // Variable [Middle Name] not provided
    // Expected: Either empty string or original placeholder (configurable)
  });

  test('escapes HTML in user input', () => {
    // Customer name: "<script>alert('XSS')</script>"
    // Expected: Escaped to prevent XSS
  });

  test('formats currency correctly', () => {
    // [Amount] = 49
    // Expected: "$49.00" or "$49/month"
  });

  test('formats dates correctly', () => {
    // [Renewal Date] = 2025-02-15
    // Expected: "February 15, 2025"
  });
});

describe('Grandfather Policy Announcement Email', () => {
  test('renders complete email', () => {
    // All sections present: subject, body, footer
  });

  test('includes correct CTAs', () => {
    // Links to FAQ, help center
  });
});

describe('New Customer Welcome Email', () => {
  test('shows correct plan details for subscription', () => {
    // Plan: Professional Subscription
    // Expected: "UNLIMITED meal plans"
  });

  test('shows correct plan details for one-time', () => {
    // Plan: Starter One-Time
    // Expected: "20 meal plans per month"
  });

  test('includes all 3 quick start steps', () => {
    // Complete Profile, Generate Meal Plan, Invite Clients
  });
});

describe('Usage Limit Warning Email', () => {
  test('shows correct usage percentage', () => {
    // 16/20 used
    // Expected: "80%" in email
  });

  test('calculates remaining correctly', () => {
    // 16/20 used
    // Expected: "4 meal plans remaining"
  });

  test('includes upgrade CTA', () => {
    // Link to /pricing?upgrade=true&from=usage-warning
  });
});

describe('Usage Limit Exceeded Email', () => {
  test('includes discount code', () => {
    // Expected: "UPGRADE20" code mentioned
  });

  test('shows reset date', () => {
    // Expected: "Your usage counter resets on [Date]"
  });

  test('includes usage statistics', () => {
    // Total generated, peak week, average per week
  });
});

describe('Subscription Renewal Reminder Email', () => {
  test('shows renewal date 3 days ahead', () => {
    // Today: Jan 12, Billing date: Jan 15
    // Expected: "renews in 3 days"
  });

  test('shows last 4 digits of card', () => {
    // Card: 4242424242424242
    // Expected: "ending in 4242"
  });

  test('includes cancel link', () => {
    // Link to /billing/cancel
  });
});

describe('Subscription Cancelled Email', () => {
  test('shows access until date', () => {
    // Cancel on Jan 10, billing period ends Feb 15
    // Expected: "You have access until February 15, 2025"
  });

  test('includes comeback discount code', () => {
    // Expected: "COMEBACK20" code mentioned
  });

  test('explains reversion to one-time plan', () => {
    // Expected: After [Date], converts to one-time with limits
  });
});
```

**Total Test Cases:** ~25 email template tests

---

#### 4.2 Email Sending Tests (Mock SMTP)

**File:** `test/integration/emailSending.test.ts`

**Test Cases:**

```typescript
describe('Email Trigger - New Customer Welcome', () => {
  test('sends email on new user registration', async () => {
    // Create new user via API
    // Expected: Welcome email sent to user's email
  });

  test('does not send duplicate emails', async () => {
    // Register, then try to trigger again
    // Expected: Only 1 email sent
  });
});

describe('Email Trigger - Usage Warning (80%)', () => {
  test('sends email when usage reaches 80%', async () => {
    // User at 15/20 → generate plan → 16/20 (80%)
    // Expected: Warning email sent
  });

  test('only sends once per month', async () => {
    // Reach 80%, then generate more
    // Expected: Only 1 warning email per month
  });
});

describe('Email Trigger - Usage Exceeded (100%)', () => {
  test('sends email when limit exceeded', async () => {
    // User at 19/20 → generate plan → 20/20
    // Expected: Limit exceeded email sent
  });

  test('includes upgrade URL in email', async () => {
    // Expected: Email contains /pricing?upgrade=true link
  });
});
```

**Total Test Cases:** ~10 email sending tests

---

### 5. Frontend Testing (Track 1) ✅

**Estimated Time:** 3 hours

#### 5.1 Unit Tests - UsageDashboard Component

**File:** `test/unit/components/UsageDashboard.test.tsx`

**Test Cases:**

```typescript
describe('<UsageDashboard />', () => {
  test('renders loading state initially', () => {
    // Before API response
    // Expected: "Loading..." or spinner
  });

  test('fetches usage stats on mount', () => {
    // Expected: GET /api/usage/stats called
  });

  test('displays usage for one-time user', () => {
    // Stats: { currentUsage: 15, limit: 20, isUnlimited: false }
    // Expected: "15 of 20 plans"
  });

  test('displays unlimited status for subscription user', () => {
    // Stats: { isUnlimited: true }
    // Expected: "Unlimited" badge, no progress bar
  });

  test('shows progress bar with correct percentage', () => {
    // 15/20 = 75%
    // Expected: Progress bar width = 75%
  });

  test('progress bar color changes with usage level', () => {
    // 0-60%: green, 60-80%: yellow, 80-100%: red
  });

  test('shows warning message at 80%', () => {
    // 16/20 = 80%
    // Expected: Warning message visible
  });

  test('shows upgrade CTA at high usage', () => {
    // 18/20 used
    // Expected: "Upgrade to Unlimited" button visible
  });

  test('hides upgrade CTA for subscription users', () => {
    // Subscription user
    // Expected: No upgrade button
  });

  test('displays reset date for one-time users', () => {
    // Expected: "Resets on February 1, 2025"
  });

  test('handles API errors gracefully', () => {
    // API returns 500 error
    // Expected: Error message displayed, no crash
  });
});
```

**Total Test Cases:** ~15 frontend component tests

---

#### 5.2 E2E Tests - Usage Dashboard Flow

**File:** `test/e2e/usage-dashboard.spec.ts` (Playwright)

**Test Cases:**

```typescript
test.describe('Usage Dashboard', () => {
  test('one-time user sees usage stats', async ({ page }) => {
    // Login as one-time user with 15/20 used
    // Navigate to /usage dashboard
    // Expected: "15 of 20 plans" visible
  });

  test('progress bar reflects correct percentage', async ({ page }) => {
    // 15/20 used
    // Expected: Progress bar ~75% width
  });

  test('subscription user sees unlimited status', async ({ page }) => {
    // Login as subscription user
    // Navigate to dashboard
    // Expected: "Unlimited" badge, no progress bar
  });

  test('upgrade button links to pricing page', async ({ page }) => {
    // Click "Upgrade to Unlimited"
    // Expected: Redirects to /pricing?upgrade=true
  });

  test('usage updates after generating meal plan', async ({ page }) => {
    // Start: 15/20, generate plan, refresh
    // Expected: 16/20 shown
  });
});
```

**Total Test Cases:** ~8 E2E tests

---

### 6. Database Migration Testing (Track 1) ✅

**Estimated Time:** 1 hour

#### 6.1 Schema Validation

**File:** `test/integration/databaseSchema.test.ts`

**Test Cases:**

```typescript
describe('Users table hybrid pricing fields', () => {
  test('paymentType field exists', async () => {
    // Query schema
    // Expected: Column 'paymentType' exists with values: subscription, onetime, grandfather
  });

  test('subscriptionStatus field exists', async () => {
    // Expected: Column 'subscriptionStatus' exists
  });

  test('usageLimit field exists', async () => {
    // Expected: Column 'usageLimit' exists (integer, nullable)
  });

  test('mealPlansGeneratedThisMonth field exists', async () => {
    // Expected: Column exists with default 0
  });

  test('usageResetDate field exists', async () => {
    // Expected: Column exists (date type)
  });

  test('stripeCustomerId field exists', async () => {
    // Expected: Column exists (string, nullable)
  });

  test('stripeSubscriptionId field exists', async () => {
    // Expected: Column exists (string, nullable)
  });
});

describe('usageTracking table', () => {
  test('table exists with correct columns', async () => {
    // Expected: id, userId, action, resourceId, metadata, createdAt
  });

  test('userId has foreign key to users', async () => {
    // Expected: FK constraint exists
  });

  test('metadata is JSON type', async () => {
    // Expected: Can store JSON objects
  });
});
```

**Total Test Cases:** ~12 database tests

---

### 7. Stripe Integration Testing (Track 2) ⏳

**Estimated Time:** 4 hours
**Prerequisite:** ⚠️ Stripe account configured

#### 7.1 Subscription Creation

**File:** `test/integration/stripeSubscription.test.ts`

**Test Cases (PENDING STRIPE CONFIG):**

```typescript
describe('POST /api/subscription/create', () => {
  test('creates Stripe customer for new user', async () => {
    // User without stripeCustomerId
    // Expected: Customer created, ID stored in database
  });

  test('creates Stripe subscription', async () => {
    // Select Professional tier
    // Expected: Subscription created with correct price ID
  });

  test('updates user record with subscription data', async () => {
    // Expected: stripeSubscriptionId, subscriptionStatus, subscriptionRenewalDate set
  });

  test('handles payment method collection', async () => {
    // Expected: Payment method attached to customer
  });

  test('handles 3D Secure authentication', async () => {
    // Test card requiring 3DS
    // Expected: Returns client secret for confirmation
  });
});

describe('Subscription Webhook Handling', () => {
  test('handles invoice.paid event', async () => {
    // Stripe sends invoice.paid webhook
    // Expected: Update subscriptionStatus to 'active'
  });

  test('handles invoice.payment_failed event', async () => {
    // Payment fails
    // Expected: Update subscriptionStatus to 'past_due'
  });

  test('handles customer.subscription.updated event', async () => {
    // Subscription upgraded/downgraded
    // Expected: Update user tier and pricing
  });

  test('handles customer.subscription.deleted event', async () => {
    // Subscription canceled
    // Expected: Update subscriptionStatus to 'canceled'
  });
});
```

**Total Test Cases:** ~15 Stripe integration tests (BLOCKED until Stripe configured)

---

### 8. Payment Flow Testing (Track 2) ⏳

**Estimated Time:** 3 hours
**Prerequisite:** ⚠️ Stripe account configured

#### 8.1 End-to-End Payment Tests

**File:** `test/e2e/payment-flow.spec.ts` (Playwright)

**Test Cases (PENDING STRIPE CONFIG):**

```typescript
test.describe('Subscription Purchase Flow', () => {
  test('complete subscription signup flow', async ({ page }) => {
    // 1. Go to /pricing
    // 2. Select Professional Subscription
    // 3. Click "Subscribe"
    // 4. Enter test card (4242 4242 4242 4242)
    // 5. Submit payment
    // Expected: Redirected to success page, subscription active
  });

  test('handles declined card', async ({ page }) => {
    // Use declined test card (4000 0000 0000 0002)
    // Expected: Error message shown, no charge
  });

  test('handles expired card', async ({ page }) => {
    // Use expired test card
    // Expected: Validation error
  });
});

test.describe('One-Time Payment Flow', () => {
  test('complete one-time purchase', async ({ page }) => {
    // Purchase Starter tier one-time
    // Expected: Payment processed, usage limit set to 20
  });
});

test.describe('Upgrade Flow', () => {
  test('upgrade from one-time to subscription', async ({ page }) => {
    // Start with one-time payment
    // Click upgrade button
    // Complete subscription signup
    // Expected: Subscription active, unlimited access
  });

  test('upgrade subscription tier (pro-rated)', async ({ page }) => {
    // Starter → Professional mid-month
    // Expected: Pro-rated charge, tier upgraded
  });
});
```

**Total Test Cases:** ~10 payment E2E tests (BLOCKED until Stripe configured)

---

## Test Execution Plan

### Week 1: Track 1 Testing (Independent)

**Day 1-2: Usage Enforcement (3 hours)**
- [ ] Write unit tests for `usageEnforcement.ts` (~20 tests)
- [ ] Write integration tests for API endpoints (~12 tests)
- [ ] Run tests and verify 100% pass rate
- [ ] Fix any issues found

**Day 3: Usage Tracking & Scheduler (2 hours)**
- [ ] Write unit tests for `usageTracking.ts` (~15 tests)
- [ ] Write unit tests for scheduler service (~8 tests)
- [ ] Test manual trigger of monthly reset
- [ ] Verify tracking events stored correctly

**Day 4: Email Templates (2 hours)**
- [ ] Write template rendering tests (~25 tests)
- [ ] Set up mock SMTP for testing
- [ ] Test all 6 email templates
- [ ] Verify variable replacement works

**Day 5: Frontend Testing (3 hours)**
- [ ] Write UsageDashboard component tests (~15 tests)
- [ ] Write E2E tests for usage dashboard (~8 tests)
- [ ] Test responsive design
- [ ] Test error handling

**Day 6: Database Testing (1 hour)**
- [ ] Verify schema migrations applied
- [ ] Test all new database fields
- [ ] Test foreign key constraints
- [ ] Verify data types correct

**Day 7: Documentation & Bug Fixes (1 hour)**
- [ ] Document all test results
- [ ] Create test coverage report
- [ ] Fix any bugs found during testing
- [ ] Prepare for Track 2 (Stripe testing)

**Total Track 1 Time:** ~12 hours

---

### Week 2: Track 2 Testing (Stripe Integration)

**Prerequisites:**
- ⚠️ Stripe account created
- ⚠️ Test API keys configured
- ⚠️ Webhook endpoint set up
- ⚠️ Products created in Stripe

**Day 1-2: Stripe Integration Tests (4 hours)**
- [ ] Test subscription creation flow
- [ ] Test webhook handling (all events)
- [ ] Test customer creation
- [ ] Test payment method handling
- [ ] Test 3D Secure flow

**Day 3: Payment Flow E2E Tests (3 hours)**
- [ ] Test complete subscription signup
- [ ] Test one-time payment
- [ ] Test upgrade flows
- [ ] Test downgrade flows
- [ ] Test payment failures

**Day 4: Staging Deployment (2 hours)**
- [ ] Deploy to staging environment
- [ ] Configure staging Stripe keys
- [ ] Set up staging webhook
- [ ] Run full test suite on staging

**Total Track 2 Time:** ~9 hours

---

## Test Coverage Goals

**Target Coverage:**
- ✅ **Unit Tests:** 90%+ code coverage
- ✅ **Integration Tests:** All API endpoints covered
- ✅ **E2E Tests:** All critical user flows covered
- ✅ **Manual Testing:** All edge cases verified

**Coverage by Module:**

| Module | Unit Tests | Integration Tests | E2E Tests | Total |
|--------|-----------|-------------------|-----------|-------|
| usageEnforcement.ts | 20 | 12 | - | 32 |
| usageTracking.ts | 15 | - | - | 15 |
| schedulerService.ts | 8 | - | - | 8 |
| Email Templates | 25 | 10 | - | 35 |
| UsageDashboard | 15 | - | 8 | 23 |
| Database Schema | 12 | - | - | 12 |
| Stripe Integration | - | 15 | 10 | 25 |
| **TOTAL** | **95** | **37** | **18** | **150** |

---

## Testing Tools & Setup

### Required Tools

**Already Installed:**
- ✅ Vitest (unit/integration tests)
- ✅ Playwright (E2E tests)
- ✅ @testing-library/react (React component tests)

**Need to Install:**
- [ ] `nodemailer` (mock SMTP for email testing)
- [ ] `stripe-mock` (mock Stripe API for testing)
- [ ] `msw` (Mock Service Worker for API mocking)

**Installation:**
```bash
npm install --save-dev nodemailer stripe-mock msw
```

---

### Test Environment Setup

**Environment Variables:**
```bash
# test/.env.test
NODE_ENV=test
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fitnessmealplanner_test
STRIPE_SECRET_KEY=sk_test_... # Test key (when available)
STRIPE_WEBHOOK_SECRET=whsec_test_... # Webhook secret (when available)
EMAIL_FROM=test@evofitmeals.com
EMAIL_SERVICE=mock # Use mock SMTP
```

**Test Database:**
```bash
# Create test database
createdb fitnessmealplanner_test

# Run migrations on test DB
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fitnessmealplanner_test npm run db:push
```

---

## Success Criteria

**Phase 5 is COMPLETE when:**

### Track 1 (Independent Testing)
- ✅ All 95 unit tests passing (100%)
- ✅ All 37 integration tests passing (100%)
- ✅ All 18 E2E tests passing (100%)
- ✅ Code coverage >90% for usage enforcement modules
- ✅ Email templates render correctly with all variables
- ✅ Frontend components display usage data correctly
- ✅ Database schema validated
- ✅ No critical bugs found

### Track 2 (Stripe Integration)
- ✅ Stripe test account configured
- ✅ All 15 Stripe integration tests passing (100%)
- ✅ All 10 payment E2E tests passing (100%)
- ✅ Webhook handling works correctly (all events)
- ✅ Test payments process successfully
- ✅ Staging environment deployed and tested
- ✅ No payment processing bugs

### Overall
- ✅ **150 total tests passing (100%)**
- ✅ All critical user flows tested and working
- ✅ Test coverage report generated
- ✅ All bugs documented and fixed
- ✅ Staging environment ready for beta testing

---

## Risk Assessment

### High Risk Areas

**1. Concurrent Usage Increment**
- **Risk:** Race condition when multiple requests increment usage counter simultaneously
- **Mitigation:** Use atomic database operations (tested in unit tests)
- **Test:** Simulate concurrent requests

**2. Monthly Reset Timing**
- **Risk:** Reset job fails or runs at wrong time
- **Mitigation:** Comprehensive scheduler tests, manual trigger for emergency
- **Test:** Test timezone handling, month-end edge cases

**3. Stripe Webhook Failures**
- **Risk:** Webhook not received, subscription status out of sync
- **Mitigation:** Implement retry logic, manual sync endpoint
- **Test:** Test all webhook event types, test failure scenarios

**4. Email Delivery Failures**
- **Risk:** Critical emails (usage limit) not delivered
- **Mitigation:** Email queue with retry, fallback to in-app notifications
- **Test:** Test SMTP failures, test retry logic

---

## Next Steps After Phase 5

**After Track 1 Complete:**
1. Review test results
2. Fix any bugs found
3. Generate coverage report
4. Update documentation with findings

**After Track 2 Complete:**
1. Full staging deployment
2. Invite beta testers
3. Monitor for issues
4. Prepare for Phase 6: Production Launch

**Phase 6: Production Launch**
1. Switch to live Stripe keys
2. Deploy to production
3. Set up production monitoring
4. Send grandfather announcement emails
5. Announce hybrid pricing model
6. Monitor first transactions

---

## Appendix: Test Data

### Test Users

**Grandfathered User:**
```json
{
  "email": "grandfather@test.com",
  "isGrandfathered": true,
  "mealPlansGeneratedThisMonth": 999
}
```

**Active Subscription User:**
```json
{
  "email": "subscription@test.com",
  "paymentType": "subscription",
  "subscriptionStatus": "active",
  "tierLevel": "professional"
}
```

**One-Time User (Under Limit):**
```json
{
  "email": "onetime-under@test.com",
  "paymentType": "onetime",
  "tierLevel": "starter",
  "usageLimit": 20,
  "mealPlansGeneratedThisMonth": 15
}
```

**One-Time User (At Limit):**
```json
{
  "email": "onetime-limit@test.com",
  "paymentType": "onetime",
  "tierLevel": "starter",
  "usageLimit": 20,
  "mealPlansGeneratedThisMonth": 20
}
```

**Test Stripe Cards:**
```
Success: 4242 4242 4242 4242
Declined: 4000 0000 0000 0002
3D Secure: 4000 0027 6000 3184
```

---

**Phase 5 Test Plan Created**
**Status:** 🟡 READY TO BEGIN
**Next Action:** Start Track 1 testing (usage enforcement unit tests)
