# Manual Testing Protocol - Tier System Features

**Date:** November 13, 2025
**Phase:** PHASE 5 - Manual Exploratory Testing
**Status:** 🎯 **IN PROGRESS**
**Focus:** Test implemented features only (skip payment infrastructure)

---

## Executive Summary

**Objective:** Manually validate all implemented tier system features

**Scope:** Stories 2.12, 2.14, 2.15 (Feature Differentiation)
**Out of Scope:** Stories 2.1-2.8 (Payment Infrastructure - not implemented)

**Test Environment:**
- URL: http://localhost:4000
- Database: PostgreSQL (port 5433)
- Redis: Port 6379

---

## Test Accounts

### Primary Test Account (Existing)
- **Email:** `trainer.test@evofitmeals.com`
- **Password:** `TestTrainer123!`
- **Expected Tier:** Starter (no subscription)

### Additional Accounts (To Verify)
- `admin@fitmeal.pro` / `AdminPass123`
- `customer.test@evofitmeals.com` / `TestCustomer123!`

---

## Test Scenarios

### 1. SETTINGS PAGE - SUBSCRIPTION TAB ✅

**URL:** http://localhost:4000/settings

#### Test 1.1: Subscription Tab Display
- [ ] **Action:** Navigate to Settings page
- [ ] **Expected:** Tabs component visible with two tabs
- [ ] **Verify:** "Subscription" tab selected by default
- [ ] **Verify:** "Branding" tab visible

#### Test 1.2: Current Tier Display
- [ ] **Verify:** Tier badge shows "⭐ Starter"
- [ ] **Verify:** Recipe access shows "X / 1,000 recipes"
- [ ] **Verify:** Monthly growth shows "+25"
- [ ] **Note:** Badge colors: blue for Starter

#### Test 1.3: Upgrade Options (Starter Tier)
- [ ] **Verify:** "Upgrade Your Tier" card visible
- [ ] **Verify:** Professional tier option shows:
  - Icon: ⚡ Zap
  - Text: "2,500 recipes + 50 new recipes/month"
  - Price: "$100/month"
  - Button: "Upgrade Now"
- [ ] **Verify:** Enterprise tier option shows:
  - Icon: 👑 Crown
  - Text: "4,000 recipes + 100 new recipes/month"
  - Price: "$200/month"
  - Button: "Upgrade Now"

#### Test 1.4: Billing Management
- [ ] **Verify:** "Billing & Subscription" card visible
- [ ] **Verify:** Text: "Access the Stripe billing portal..."
- [ ] **Verify:** "Manage Billing" button visible
- [ ] **Click:** "Manage Billing" button
- [ ] **Expected:** API call to `/api/v1/tiers/billing-portal`
- [ ] **Expected Result:** ❌ Likely 404 or error (API not implemented)
- [ ] **Note:** Document error for future implementation

#### Test 1.5: Account Information
- [ ] **Verify:** Email displays correctly
- [ ] **Verify:** Name displays (or "Not set")
- [ ] **Verify:** Role shows "trainer"

#### Test 1.6: Upgrade Button Click
- [ ] **Click:** "Upgrade Now" button (Professional)
- [ ] **Expected:** TierSelectionModal opens
- [ ] **Verify:** Modal has close button
- [ ] **Close:** Modal
- [ ] **Verify:** Modal closes successfully

---

### 2. SETTINGS PAGE - BRANDING TAB ✅

**URL:** http://localhost:4000/settings (Branding tab)

#### Test 2.1: Branding Tab Display
- [ ] **Click:** "Branding" tab
- [ ] **Verify:** BrandingSettings component loads
- [ ] **Verify:** All branding cards visible

#### Test 2.2: Logo Upload Section (Professional+)
- [ ] **Verify:** "Logo Upload" card visible
- [ ] **Verify:** Badge shows "Locked" or "Professional+"
- [ ] **Expected (Starter):** Upload interface disabled
- [ ] **Verify:** Upgrade prompt visible for Starter tier
- [ ] **Note:** Cannot test upload without Professional tier

#### Test 2.3: Color Customization (Professional+)
- [ ] **Verify:** "Color Customization" card visible
- [ ] **Verify:** Primary color picker visible
- [ ] **Verify:** Secondary color picker visible
- [ ] **Verify:** Accent color picker visible
- [ ] **Expected (Starter):** Disabled with upgrade prompt

#### Test 2.4: White-Label Mode (Enterprise Only)
- [ ] **Verify:** "White-Label Mode" card visible
- [ ] **Verify:** Toggle switch visible
- [ ] **Expected (Starter):** Disabled
- [ ] **Verify:** "Upgrade to Enterprise" prompt visible

#### Test 2.5: Custom Domain (Enterprise Only)
- [ ] **Verify:** "Custom Domain" card visible
- [ ] **Verify:** Domain input field visible
- [ ] **Expected (Starter):** Disabled
- [ ] **Verify:** DNS verification status shows locked

#### Test 2.6: API Integration
- [ ] **Check Network Tab:** GET /api/branding
- [ ] **Expected Response:** Current branding settings
- [ ] **Verify:** Response includes logoUrl, colors, whiteLabelEnabled
- [ ] **Document:** Response format

---

### 3. RECIPE TIER FILTERING ✅

**URL:** http://localhost:4000/trainer (Browse Recipes tab)

#### Test 3.1: Recipe Count Display
- [ ] **Navigate:** Trainer dashboard
- [ ] **Verify:** RecipeCountDisplay visible
- [ ] **Verify:** Shows "X / 1,000 recipes" (Starter tier)
- [ ] **Verify:** Progress bar visible
- [ ] **Verify:** Percentage displayed
- [ ] **Note:** Actual count may vary

#### Test 3.2: Tier Badge in Navbar
- [ ] **Look:** Top-right of navbar
- [ ] **Verify:** TierBadge visible (desktop only)
- [ ] **Verify:** Shows "⭐ Starter"
- [ ] **Verify:** Badge has blue background
- [ ] **Note:** May be hidden on mobile

#### Test 3.3: Recipe API Tier Filtering
- [ ] **Open Network Tab:** DevTools
- [ ] **Navigate:** Browse Recipes
- [ ] **Find:** GET /api/recipes request
- [ ] **Verify:** Middleware attaches tier to request
- [ ] **Check Response:** Recipes returned
- [ ] **Verify:** Total count matches tier limit (≤1,000)
- [ ] **Note:** Backend filtering automatic

#### Test 3.4: Recipe Search Tier Filtering
- [ ] **Use:** Recipe search feature
- [ ] **Search:** Any keyword
- [ ] **Check Network:** GET /api/recipes/search
- [ ] **Verify:** Results respect tier filtering
- [ ] **Verify:** No recipes beyond Starter tier shown

---

### 4. MEAL TYPE FILTERING ✅

**URL:** http://localhost:4000/trainer (Generate Plans tab)

#### Test 4.1: MealTypeDropdown in AI Generator
- [ ] **Navigate:** Generate Plans tab
- [ ] **Expand:** Advanced form
- [ ] **Find:** "Meal Type (Tier Filtered)" dropdown
- [ ] **Click:** Dropdown
- [ ] **Verify:** 5 accessible meal types (Starter tier)
- [ ] **Verify:** 12 locked meal types with 🔒 icon
- [ ] **Hover:** Locked meal type
- [ ] **Verify:** Tooltip shows "Upgrade to professional/enterprise"

#### Test 4.2: Accessible Meal Types (Starter)
**Expected Accessible:**
- [ ] Standard
- [ ] High Protein
- [ ] Low Carb
- [ ] Balanced
- [ ] Weight Loss

**Expected Locked:**
- [ ] Keto
- [ ] Paleo
- [ ] Vegan
- [ ] Vegetarian
- [ ] Mediterranean
- [ ] Intermittent Fasting
- [ ] Clean Eating
- [ ] Gluten Free
- [ ] Dairy Free
- [ ] Low FODMAP
- [ ] Anti-Inflammatory
- [ ] Heart Healthy

#### Test 4.3: MealTypeDropdown in Manual Creator
- [ ] **Navigate:** Create Custom tab
- [ ] **Add:** Some meals
- [ ] **Continue:** To preview
- [ ] **Find:** "Meal Type (Optional - Tier Filtered)" dropdown
- [ ] **Click:** Dropdown
- [ ] **Verify:** Same 5 accessible + 12 locked types
- [ ] **Select:** Accessible meal type
- [ ] **Verify:** Selection works

#### Test 4.4: Meal Type API
- [ ] **Check Network:** GET /api/meal-types/all
- [ ] **Verify:** Response includes all 17 meal types
- [ ] **Verify:** Each has `accessible: boolean` property
- [ ] **Verify:** Starter tier has 5 accessible types

---

### 5. TIER ENTITLEMENTS API ✅

**API:** GET /api/entitlements

#### Test 5.1: Entitlements Response (Starter)
- [ ] **Open:** Browser DevTools Network tab
- [ ] **Refresh:** Any authenticated page
- [ ] **Find:** GET /api/entitlements request
- [ ] **Verify Response:**
```json
{
  "success": true,
  "tier": "starter",
  "status": "none" or "active",
  "features": {
    "recipeCount": 1000,
    "mealTypeCount": 5,
    "canUploadLogo": false,
    "canCustomizeColors": false,
    "canEnableWhiteLabel": false,
    "canSetCustomDomain": false
  }
}
```

#### Test 5.2: Entitlements Caching
- [ ] **First Request:** Note response time
- [ ] **Refresh Page:** Multiple times
- [ ] **Verify:** Consistent response times
- [ ] **Note:** Redis caching may be in effect
- [ ] **Expected:** <200ms response times

---

### 6. FRONTEND COMPONENTS ✅

#### Test 6.1: useTier Hook
- [ ] **Component:** Any that uses useTier
- [ ] **Verify:** Hook fetches from /api/entitlements
- [ ] **Verify:** Returns tier, features, isLoading
- [ ] **Verify:** canAccess() function works
- [ ] **Check Console:** No errors

#### Test 6.2: TierBadge Component
- [ ] **Location:** Navbar (desktop only)
- [ ] **Verify:** Renders with correct tier
- [ ] **Verify:** Icon matches tier (⭐ for Starter)
- [ ] **Verify:** Color matches tier (blue for Starter)

#### Test 6.3: RecipeCountDisplay Component
- [ ] **Location:** Trainer dashboard
- [ ] **Verify:** Shows current/maximum recipes
- [ ] **Verify:** Progress bar renders
- [ ] **Verify:** Upgrade button visible (non-Enterprise)
- [ ] **Verify:** Click upgrade button opens modal

---

### 7. ERROR HANDLING & EDGE CASES ⚠️

#### Test 7.1: Unauthenticated Access
- [ ] **Logout:** Clear session
- [ ] **Navigate:** http://localhost:4000/settings
- [ ] **Expected:** Redirect to login
- [ ] **Verify:** No tier data exposed

#### Test 7.2: API Errors
- [ ] **Simulate:** Network offline (DevTools)
- [ ] **Refresh:** Settings page
- [ ] **Expected:** Graceful error handling
- [ ] **Verify:** Default to Starter tier
- [ ] **Verify:** Error message shown

#### Test 7.3: Missing Subscription
- [ ] **Current State:** Trainer with no subscription
- [ ] **Verify:** Defaults to Starter tier
- [ ] **Verify:** All Starter limits applied
- [ ] **Verify:** Upgrade prompts visible

---

### 8. RESPONSIVE DESIGN 📱

#### Test 8.1: Mobile View (375px)
- [ ] **Resize:** Browser to 375px width
- [ ] **Settings Page:**
  - [ ] Tabs stack properly
  - [ ] Cards remain readable
  - [ ] Buttons accessible
- [ ] **Tier Badge:**
  - [ ] Hidden on mobile (per design)
- [ ] **Recipe Count:**
  - [ ] Visible and readable
  - [ ] Progress bar scales

#### Test 8.2: Tablet View (768px)
- [ ] **Resize:** Browser to 768px width
- [ ] **Verify:** All features accessible
- [ ] **Verify:** No horizontal scroll
- [ ] **Verify:** Touch targets adequate

#### Test 8.3: Desktop View (1920px)
- [ ] **Resize:** Browser to 1920px width
- [ ] **Verify:** All components render correctly
- [ ] **Verify:** No excessive whitespace
- [ ] **Verify:** Tier badge visible

---

## Testing Checklist Summary

### Core Features (MUST PASS)
- [ ] Settings page loads with tabs
- [ ] Branding tab displays all sections
- [ ] Recipe tier filtering works (backend)
- [ ] Meal type filtering shows correct accessible/locked types
- [ ] Entitlements API returns correct data
- [ ] Tier badge displays in navbar
- [ ] Recipe count displays correctly

### Nice-to-Have (SHOULD PASS)
- [ ] Upgrade buttons open modal
- [ ] Responsive design works on all viewports
- [ ] Error handling graceful
- [ ] API response times <200ms

### Known Failures (EXPECTED)
- [ ] ❌ Billing portal button (API not implemented)
- [ ] ❌ Actual tier purchases (Stripe not integrated)
- [ ] ❌ Tier upgrades (API not implemented)

---

## Test Results Template

### Feature: [Feature Name]
**Status:** ✅ PASS / ⚠️ PARTIAL / ❌ FAIL

**Tests Run:** X / Y

**Pass Rate:** X%

**Failures:**
1. [Test name] - [Description of failure]

**Screenshots:** [Attach if relevant]

**Notes:** [Additional observations]

---

## Bug Report Template

### Bug #X: [Title]

**Severity:** P0 (Critical) / P1 (High) / P2 (Medium) / P3 (Low)

**Feature:** [Which feature]

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected:** [What should happen]

**Actual:** [What actually happens]

**Environment:**
- Browser: Chrome/Firefox/Edge
- Viewport: Desktop/Mobile
- Tier: Starter/Professional/Enterprise

**Screenshot:** [Attach if helpful]

**Logs:** [Console errors, network errors]

---

## Test Execution Log

**Start Time:** [Time]

**Tester:** Claude AI

**Environment:** Local Development (http://localhost:4000)

### Test 1: Settings Page - Subscription Tab
- **Start:** [Time]
- **Result:** [Pass/Fail]
- **Notes:** [Observations]

### Test 2: Settings Page - Branding Tab
- **Start:** [Time]
- **Result:** [Pass/Fail]
- **Notes:** [Observations]

[Continue for all tests...]

**End Time:** [Time]

**Total Duration:** [Duration]

---

## Next Steps After Testing

1. **If All Core Tests Pass:**
   - Document success
   - Create production readiness report
   - Recommend deployment (with payment gap documented)

2. **If Critical Failures Found:**
   - Create GitHub issues for P0 bugs
   - Fix blocking issues
   - Re-test
   - Proceed when stable

3. **Document Gaps:**
   - Payment infrastructure missing
   - Usage limits enforcement (to verify)
   - Storage quotas (to verify)

---

**Protocol Created:** November 13, 2025
**Status:** Ready for execution
**Estimated Duration:** 2-3 hours
