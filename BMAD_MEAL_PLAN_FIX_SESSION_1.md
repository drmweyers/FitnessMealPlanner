# BMAD Meal Plan Generator Fix - Session 1 Progress

**Date**: 2025-01-13
**BMAD Phase**: Implementation (Option A - Systematic Fixes)
**Session**: 1 of N (pausing for context preservation)

---

## 🔍 ROOT CAUSE DISCOVERIES

### Issue 1: Image Duplication - **CONFIRMED ROOT CAUSE**

**Location**: `server/services/mealPlanGenerator.ts:188-193`

**Problem Code**:
```typescript
// Line 17: Import exists but never used!
import { generateMealImage } from "./openai";

// Line 188-193: Uses static placeholder for all meals
const recipeDescription = selectedRecipe.description || `Delicious ${mealType} meal`;
const recipeMealTypes = selectedRecipe.mealTypes || [mealType];

// Use the recipe's existing image URL or a placeholder
const imageUrl = selectedRecipe.imageUrl || `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=250&fit=crop`;
```

**Root Cause**:
- `generateMealImage()` is imported but **never called**
- When recipes don't have `imageUrl`, ALL meals get the same Unsplash placeholder
- No AI image generation happens during meal plan creation

**Fix Required**:
```typescript
// BEFORE (line 193):
const imageUrl = selectedRecipe.imageUrl || `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=250&fit=crop`;

// AFTER:
let imageUrl = selectedRecipe.imageUrl;

// Generate unique image if recipe doesn't have one
if (!imageUrl) {
  try {
    imageUrl = await generateMealImage(
      selectedRecipe.name,
      recipeDescription,
      recipeMealTypes
    );
  } catch (error) {
    console.error(`Failed to generate image for ${selectedRecipe.name}:`, error);
    // Fallback to placeholder with unique params
    imageUrl = `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=250&fit=crop&sig=${selectedRecipe.id}`;
  }
}
```

**Impact**: HIGH - Affects all meal plan generations

---

### Issue 2: Natural Language Generator - **NEEDS INVESTIGATION**

**Location**: `server/routes/adminRoutes.ts:181-247`

**Current Status**: Endpoint exists, needs to verify if calling meal plan service or recipe service

**Next Steps**: Read the endpoint implementation fully

---

### Issue 3: Diet Type Field Missing - **CONFIRMED**

**Location**: `client/src/components/MealPlanGenerator.tsx:~1563`

**Problem**: Advanced form has no `dietaryRestrictions` field

**Filter Preferences section exists** (lines 1567-1856) but only has:
- Meal Type filter
- Dietary filter (different from main form)
- Max Prep Time
- Max Calories
- Macro nutrient sliders

**Fix Required**: Add diet type field to main form around line 1563

---

### Issue 5: Save to Library Button - **MUTATION EXISTS BUT MAY BE BROKEN**

**Location**: `client/src/components/MealPlanGenerator.tsx:363-395`

**Code Found**:
```typescript
const saveMealPlan = useMutation({
  mutationFn: async ({ notes, tags }: { notes?: string; tags?: string[] }) => {
    if (!generatedPlan) throw new Error("No meal plan to save");

    const response = await apiRequest(
      "POST",
      "/api/trainer/meal-plans",
      {
        mealPlanData: generatedPlan.mealPlan,
        notes,
        tags,
        isTemplate: false,
      },
    );
    return response.json();
  },
  onSuccess: () => {
    toast({
      title: "Meal Plan Saved!",
      description: "The meal plan has been saved to your library.",
    });
    // Query invalidation may be wrong
    queryClient.invalidateQueries({ queryKey: ['trainer-meal-plans', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['trainer-meal-plans'] });
  },
  // ...
});
```

**Potential Issues**:
1. apiRequest signature may be wrong (uses 3 args instead of object)
2. Endpoint `/api/trainer/meal-plans` may not exist or expect different data
3. Query key invalidation may not match TrainerMealPlans component

**Next Steps**: Verify API endpoint and apiRequest usage

---

### Issue 8: Export PDF - **NEEDS VERIFICATION**

**Location**: Uses `EvoFitPDFExport` component at line 2016

**Current Status**: Component exists, needs to verify functionality

---

## 📊 SESSION PROGRESS

### Completed:
- ✅ Root cause analysis for Issue 1 (Image Duplication)
- ✅ Identified exact line numbers for all issues
- ✅ Confirmed Issue 3 (Diet Type field missing)
- ✅ Found saveMealPlan mutation implementation

### In Progress:
- 🔄 Issue 1 fix implementation (next step)

### Pending:
- ⏳ Issue 2: Natural language endpoint investigation
- ⏳ Issue 4: Filter duplication removal
- ⏳ Issue 5: Save to Library API verification
- ⏳ Issue 6: Assign to Customers button
- ⏳ Issue 7: Refresh List button
- ⏳ Issue 8: Export PDF verification
- ⏳ Issue 9: BMAD bulk generator diet type

---

## 🎯 NEXT ACTIONS

1. **Implement Fix for Issue 1** (Image Generation)
   - Modify `mealPlanGenerator.ts` line 193
   - Add async call to `generateMealImage()`
   - Add error handling with fallback
   - Add unique signature to placeholder URLs

2. **Verify apiRequest Usage** (Issue 5)
   - Check apiRequest function signature in queryClient
   - Verify trainer meal plan endpoint exists
   - Test mutation end-to-end

3. **Continue systematic fixes** for remaining issues

---

## 💾 CONTEXT PRESERVATION

**Key Files Analyzed**:
- `server/services/mealPlanGenerator.ts` (227 lines)
- `server/services/intelligentMealPlanGenerator.ts` (150+ lines read)
- `server/routes/adminRoutes.ts` (1002 lines)
- `server/services/agents/ImageGenerationAgent.ts` (100+ lines)
- `client/src/components/MealPlanGenerator.tsx` (2100+ lines, partial read)

**Critical Line Numbers**:
- Line 193: Image placeholder issue
- Line 363-395: saveMealPlan mutation
- Line 1563: Where diet type field should go
- Line 1567-1856: Filter Preferences section (duplicated)
- Line 1975: Save button onClick handler
- Line 2016: Export PDF button

---

**Session Status**: PAUSED FOR CONTEXT PRESERVATION
**Next Session**: Implement fixes starting with Issue 1
