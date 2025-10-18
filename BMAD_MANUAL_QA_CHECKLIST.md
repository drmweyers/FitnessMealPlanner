# BMAD Meal Plan Generator - Manual QA Verification Checklist
**Date**: 2025-10-18
**Purpose**: Verify all 9 bug fixes through manual testing
**Estimated Time**: 1 hour
**Status**: Ready for Execution

---

## 🎯 PRE-TESTING SETUP

### Prerequisites
- [ ] Development server running (`docker-compose --profile dev up -d`)
- [ ] Access to test accounts:
  - Admin: `admin@fitmeal.pro` / `AdminPass123`
  - Trainer: `trainer.test@evofitmeals.com` / `TestTrainer123!`
  - Customer: `customer.test@evofitmeals.com` / `TestCustomer123!`
- [ ] Browser DevTools open (F12) for debugging
- [ ] Clean browser cache and cookies

### Test Environment
- **URL**: http://localhost:4000
- **Browser**: Chrome/Edge (latest version)
- **Database**: PostgreSQL (via Docker)
- **Test Data**: Use existing recipes and meal plans

---

## 📋 BUG FIX VERIFICATION CHECKLIST

### ✅ Issue 1: Image Duplication Fix
**Bug**: Meal plan images were duplicates across different meals
**Fix**: Implemented unique image generation per recipe

**Test Steps**:
1. [ ] Login as Admin/Trainer
2. [ ] Navigate to "Meal Plan Builder" tab
3. [ ] Fill minimal form:
   - Plan Name: "QA Image Test"
   - Daily Calories: 2000
   - Fitness Goal: Weight Loss
   - Days: 3
   - Meals Per Day: 3
4. [ ] Click "Generate Meal Plan"
5. [ ] Wait for generation (may take 30-60 seconds)

**Verification**:
- [ ] All meal images are different (no duplicates)
- [ ] Each meal has a unique image URL
- [ ] Images are high quality and relevant to meals
- [ ] No placeholder images (unless intentional fallback)

**Expected Result**: ✅ PASS - All images unique
**Actual Result**: _____________
**Screenshots**: _____________

---

### ✅ Issue 2: AI Natural Language Generator Fix
**Bug**: Natural language meal plan generation wasn't working
**Fix**: Implemented AI-powered natural language parser

**Test Steps**:
1. [ ] Login as Admin
2. [ ] Navigate to "Meal Plan Builder" tab
3. [ ] Locate "AI-Powered Natural Language Generator" section (blue card)
4. [ ] In the large textarea, enter:
   ```
   Create a 7-day weight loss meal plan for Sarah with 1800 calories per day,
   3 meals daily, focusing on lean proteins and vegetables, avoiding gluten
   ```
5. [ ] Click "Parse with AI" button
6. [ ] Wait for parsing (5-10 seconds)

**Verification**:
- [ ] Form populates automatically OR success message appears
- [ ] Plan Name field populated (e.g., "Sarah's Weight Loss Plan")
- [ ] Days = 7
- [ ] Daily Calories = 1800
- [ ] Fitness Goal = Weight Loss
- [ ] Dietary Tags include "Gluten-Free"
- [ ] No error messages

**Alternative Test** (if Parse doesn't populate form):
7. [ ] Click "Generate Plan Directly" button
8. [ ] Wait for generation (30-90 seconds)

**Verification**:
- [ ] Meal plan generated successfully
- [ ] Matches natural language requirements
- [ ] 7 days of meals created
- [ ] Approximately 1800 calories per day
- [ ] No gluten-containing ingredients

**Expected Result**: ✅ PASS - Natural language parsed and plan generated
**Actual Result**: _____________
**Screenshots**: _____________

---

### ✅ Issue 3: Diet Type Field Fix
**Bug**: Diet type field wasn't appearing in meal plan generator
**Fix**: Added diet type dropdown with proper options

**Test Steps**:
1. [ ] Login as Admin/Trainer
2. [ ] Navigate to "Meal Plan Builder" tab
3. [ ] Click "Manual Configuration" to show advanced form
4. [ ] Scroll through form fields

**Verification**:
- [ ] "Diet Type" dropdown/select field is visible
- [ ] Field shows options: Vegetarian, Vegan, Keto, Paleo, etc.
- [ ] Can select a diet type
- [ ] Selection persists after clicking other fields

**Test Generation with Diet Type**:
5. [ ] Select "Vegetarian" from Diet Type
6. [ ] Fill other required fields:
   - Plan Name: "QA Vegetarian Test"
   - Daily Calories: 2000
   - Fitness Goal: Maintenance
   - Days: 1
   - Meals Per Day: 3
7. [ ] Click "Generate Meal Plan"
8. [ ] Wait for generation

**Verification**:
- [ ] All meals are vegetarian (no meat/fish)
- [ ] Recipes tagged with "Vegetarian"
- [ ] Nutritionally complete vegetarian meals

**Expected Result**: ✅ PASS - Diet type field present and functional
**Actual Result**: _____________
**Screenshots**: _____________

---

### ✅ Issue 4: No Filter Duplication Fix
**Bug**: Dietary filter options were duplicated in dropdowns
**Fix**: Removed duplicate filter options

**Test Steps**:
1. [ ] Login as Admin/Trainer
2. [ ] Navigate to "Meal Plan Builder" tab
3. [ ] Click "Manual Configuration"
4. [ ] Examine all dropdowns:
   - Fitness Goal dropdown
   - Diet Type dropdown
   - Any dietary restriction checkboxes
   - Meal type selectors

**Verification**:
- [ ] No duplicate options in Fitness Goal (Weight Loss, Muscle Gain, etc.)
- [ ] No duplicate options in Diet Type (Vegetarian appears only once)
- [ ] No duplicate dietary restriction checkboxes
- [ ] All options are unique and properly labeled

**Expected Result**: ✅ PASS - No duplicates in any filter
**Actual Result**: _____________
**Screenshots**: _____________

---

### ✅ Issue 5: Save to Library Button Fix
**Bug**: "Save to Library" button wasn't visible or functional
**Fix**: Added Save to Library button with proper API integration

**Test Steps**:
1. [ ] Login as Trainer
2. [ ] Navigate to "Meal Plan Builder" tab
3. [ ] Generate a simple meal plan:
   - Plan Name: "QA Save Test"
   - Daily Calories: 2000
   - Days: 1
   - Meals Per Day: 3
4. [ ] Click "Generate Meal Plan"
5. [ ] Wait for generation

**Verification**:
- [ ] "Save to Library" button is visible after generation
- [ ] Button is enabled (not grayed out)
- [ ] Button has clear label "Save to Library" or similar

**Click Save Button**:
6. [ ] Click "Save to Library" button

**Verification**:
- [ ] Success message appears ("Meal plan saved successfully")
- [ ] No error messages
- [ ] Button changes state (disabled or "Saved" label)

**Verify Saved Plan**:
7. [ ] Scroll down to "Saved Meal Plans" section
8. [ ] OR Click "Refresh List" button if visible

**Verification**:
- [ ] "QA Save Test" appears in saved plans list
- [ ] Plan shows correct details (calories, days, etc.)
- [ ] Can click on saved plan to view details

**Expected Result**: ✅ PASS - Save to Library fully functional
**Actual Result**: _____________
**Screenshots**: _____________

---

### ✅ Issue 6: Assign to Customers Button Fix
**Bug**: "Assign to Customers" button wasn't loading customer list
**Fix**: Fixed customer list API and modal display

**Test Steps**:
1. [ ] Login as Trainer
2. [ ] Generate OR select an existing meal plan
3. [ ] Look for "Assign to Customers" button

**Verification**:
- [ ] "Assign to Customers" button is visible
- [ ] Button is enabled

**Click Assign Button**:
4. [ ] Click "Assign to Customers" button

**Verification**:
- [ ] Modal dialog appears
- [ ] Modal title: "Assign Meal Plan to Customers" or similar
- [ ] Customer list is visible within 3-5 seconds
- [ ] At least one test customer visible (customer.test@evofitmeals.com)
- [ ] Checkboxes or selection mechanism visible
- [ ] "Assign" or "Save" button in modal
- [ ] "Cancel" or "Close" button in modal

**Test Assignment**:
5. [ ] Select test customer (customer.test@evofitmeals.com)
6. [ ] Click "Assign" button in modal

**Verification**:
- [ ] Success message appears
- [ ] Modal closes
- [ ] No error messages

**Verify Customer Received Plan** (Optional):
7. [ ] Logout
8. [ ] Login as Customer (customer.test@evofitmeals.com / TestCustomer123!)
9. [ ] Navigate to "My Meal Plans"

**Verification**:
- [ ] Assigned meal plan appears in customer's list
- [ ] Plan shows correct details

**Expected Result**: ✅ PASS - Assign to Customers fully functional
**Actual Result**: _____________
**Screenshots**: _____________

---

### ✅ Issue 7: Refresh List Button Fix
**Bug**: "Refresh List" button wasn't invalidating query cache
**Fix**: Implemented proper query invalidation

**Test Steps**:
1. [ ] Login as Trainer
2. [ ] Navigate to "Meal Plan Builder" tab
3. [ ] Scroll to "Saved Meal Plans" section
4. [ ] Note current number of saved plans: _____ plans

**Verification**:
- [ ] "Refresh List" button is visible
- [ ] Button is enabled

**Test Refresh**:
5. [ ] Click "Refresh List" button

**Verification**:
- [ ] Button shows loading state (spinner or disabled)
- [ ] List re-renders (even if no new plans)
- [ ] Loading state clears within 2-3 seconds
- [ ] No error messages

**Test with New Plan**:
6. [ ] Create and save a new meal plan: "QA Refresh Test"
7. [ ] Click "Refresh List" button
8. [ ] Wait for list to reload

**Verification**:
- [ ] New plan "QA Refresh Test" appears in list
- [ ] Plan count increased by 1
- [ ] List is sorted properly (newest first or alphabetical)

**Test Cache Invalidation**:
9. [ ] Open browser DevTools Network tab
10. [ ] Click "Refresh List" button again
11. [ ] Check Network tab

**Verification**:
- [ ] New API request made (not cached response)
- [ ] Request URL: `/api/trainer/meal-plans` or similar
- [ ] Response status: 200 OK
- [ ] Response contains fresh data

**Expected Result**: ✅ PASS - Refresh List properly invalidates cache
**Actual Result**: _____________
**Screenshots**: _____________

---

### ✅ Issue 8: Export PDF Button Fix
**Bug**: "Export PDF" button wasn't generating PDFs
**Fix**: Implemented server-side PDF generation with Puppeteer

**Test Steps**:
1. [ ] Login as Trainer
2. [ ] Generate OR select an existing saved meal plan
3. [ ] Look for "Export PDF" or "Download PDF" button

**Verification**:
- [ ] "Export PDF" button is visible
- [ ] Button is enabled
- [ ] Button has PDF icon or clear label

**Click Export Button**:
4. [ ] Click "Export PDF" button

**Verification**:
- [ ] Button shows loading state (spinner or "Generating...")
- [ ] No immediate errors

**Wait for PDF Generation**:
5. [ ] Wait up to 10 seconds

**Verification**:
- [ ] PDF downloads automatically OR
- [ ] Download prompt appears
- [ ] PDF file downloads successfully
- [ ] No error messages

**Verify PDF Content**:
6. [ ] Open downloaded PDF in PDF viewer

**Verification**:
- [ ] PDF opens without errors
- [ ] Shows "EvoFit Meals" branding
- [ ] Contains meal plan name
- [ ] Shows all meals with:
  - [ ] Meal names
  - [ ] Ingredients
  - [ ] Nutritional information
  - [ ] Images (if applicable)
- [ ] Readable formatting
- [ ] No overlapping text
- [ ] Multiple pages if needed

**Expected Result**: ✅ PASS - PDF export fully functional
**Actual Result**: _____________
**PDF File Name**: _____________
**Screenshots**: _____________

---

### ✅ Issue 9: BMAD Bulk Generator Diet Type Fix
**Bug**: BMAD bulk generator wasn't respecting selected diet types
**Fix**: Implemented diet type filter in BMAD generation

**Test Steps**:
1. [ ] Login as Admin
2. [ ] Navigate to "BMAD Generator" tab (4th tab with robot icon)
3. [ ] Locate diet type filter section

**Verification**:
- [ ] Diet type checkboxes visible (Vegetarian, Vegan, Keto, etc.)
- [ ] Can select multiple diet types
- [ ] Checkboxes toggle properly

**Test Bulk Generation with Diet Filter**:
4. [ ] Select "Vegetarian" checkbox ONLY
5. [ ] Set count to 3 recipes (small number for faster test)
6. [ ] Select Breakfast meal type
7. [ ] Uncheck "Generate AI Images" (faster test)
8. [ ] Click "Start BMAD Generation"

**Verification**:
- [ ] Generation starts (progress indicator appears)
- [ ] Real-time SSE progress updates visible
- [ ] Shows agent status (RecipeConceptAgent, etc.)

**Wait for Completion**:
9. [ ] Wait for generation to complete (1-3 minutes)

**Verification**:
- [ ] Success message appears
- [ ] 3 recipes generated
- [ ] No critical errors

**Verify Generated Recipes**:
10. [ ] Navigate to "Recipe Library" tab
11. [ ] Look for newly generated recipes (should be first 3)

**Verification**:
- [ ] All 3 recipes are Vegetarian (no meat/fish)
- [ ] Recipes tagged with "Vegetarian" badge
- [ ] Meal type = Breakfast
- [ ] Nutritionally complete vegetarian recipes

**Test Multiple Diet Types**:
12. [ ] Go back to BMAD Generator
13. [ ] Select both "Vegetarian" AND "Gluten-Free"
14. [ ] Generate 2 more recipes
15. [ ] Verify recipes are both Vegetarian AND Gluten-Free

**Expected Result**: ✅ PASS - BMAD generator respects diet type filters
**Actual Result**: _____________
**Generated Recipe Names**: _____________
**Screenshots**: _____________

---

## 📊 QA RESULTS SUMMARY

### Overall Status
**Total Tests**: 9 bug fixes
**Tests Passed**: _____ / 9
**Tests Failed**: _____ / 9
**Tests Skipped**: _____ / 9

### Pass Rate
**Target**: 100% (9/9 passing)
**Actual**: _____ %

### Individual Results
| Issue # | Bug Fix | Status | Notes |
|---------|---------|--------|-------|
| 1 | Image Duplication | ⬜ PASS / ⬜ FAIL | _____________ |
| 2 | AI Natural Language Generator | ⬜ PASS / ⬜ FAIL | _____________ |
| 3 | Diet Type Field | ⬜ PASS / ⬜ FAIL | _____________ |
| 4 | No Filter Duplication | ⬜ PASS / ⬜ FAIL | _____________ |
| 5 | Save to Library Button | ⬜ PASS / ⬜ FAIL | _____________ |
| 6 | Assign to Customers Button | ⬜ PASS / ⬜ FAIL | _____________ |
| 7 | Refresh List Button | ⬜ PASS / ⬜ FAIL | _____________ |
| 8 | Export PDF Button | ⬜ PASS / ⬜ FAIL | _____________ |
| 9 | BMAD Bulk Generator Diet Type | ⬜ PASS / ⬜ FAIL | _____________ |

---

## 🐛 ISSUES FOUND DURING QA

### Critical Issues (Block Release)
_List any blocking issues found:_

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Major Issues (Should Fix Before Release)
_List any major issues found:_

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Minor Issues (Can Fix Later)
_List any minor issues found:_

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

---

## 📝 ADDITIONAL OBSERVATIONS

### Performance Notes
_Any performance issues observed:_

- _______________________________________________
- _______________________________________________

### UI/UX Feedback
_Any user experience concerns:_

- _______________________________________________
- _______________________________________________

### Browser Compatibility
_Tested browsers:_

- [ ] Chrome: Version _____ - ⬜ PASS / ⬜ FAIL
- [ ] Firefox: Version _____ - ⬜ PASS / ⬜ FAIL
- [ ] Edge: Version _____ - ⬜ PASS / ⬜ FAIL
- [ ] Safari: Version _____ - ⬜ PASS / ⬜ FAIL

### Mobile Responsiveness
_Tested devices:_

- [ ] Desktop (1920x1080): ⬜ PASS / ⬜ FAIL
- [ ] Tablet (768x1024): ⬜ PASS / ⬜ FAIL
- [ ] Mobile (375x667): ⬜ PASS / ⬜ FAIL

---

## ✅ FINAL APPROVAL

### QA Sign-Off
- [ ] All critical bugs verified as fixed
- [ ] All test cases executed
- [ ] No blocking issues found
- [ ] Documentation updated

**QA Tester**: _____________
**Date**: _____________
**Signature**: _____________

### Release Recommendation
⬜ **APPROVE FOR RELEASE** - All tests passed, no blocking issues
⬜ **CONDITIONAL APPROVAL** - Minor issues found, can release with notes
⬜ **REJECT** - Critical issues found, must fix before release

**Justification**:
_______________________________________________
_______________________________________________
_______________________________________________

---

## 🚀 NEXT STEPS

### If QA Passes (9/9 tests passing)
1. [ ] Update PLANNING.md with QA completion
2. [ ] Update BMAD_PROGRESS_SUMMARY.md
3. [ ] Create completion summary document
4. [ ] Mark BMAD session as 100% complete
5. [ ] Prepare for deployment/release

### If QA Finds Issues
1. [ ] Document all issues in ISSUES_FOUND.md
2. [ ] Prioritize fixes (Critical > Major > Minor)
3. [ ] Create fix tasks in TODO_URGENT.md
4. [ ] Schedule fix implementation
5. [ ] Re-run QA after fixes

---

**Checklist Created**: 2025-10-18 18:15:00
**Status**: Ready for Manual Testing
**Estimated Completion**: 1 hour
