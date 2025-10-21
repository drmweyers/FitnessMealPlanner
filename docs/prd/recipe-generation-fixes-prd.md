# Product Requirements Document: Recipe Generation Bug Fixes

**Project**: FitnessMealPlanner
**Type**: Brownfield Enhancement
**Created**: January 19, 2025
**BMAD Phase**: Phase 1 - Planning
**Priority**: HIGH

---

## Executive Summary

This PRD addresses 6 critical bugs in the recipe generation system that prevent core functionality from working correctly. These issues affect delete operations, background processing, data refresh, validation, and natural language generation features.

---

## Problems Identified

### Issue #1: Recipe Delete Functionality Not Working
**Severity**: HIGH
**User Impact**: Cannot remove unwanted recipes from database
**Affected Components**:
- `client/src/pages/Admin.tsx` (lines 101-137, 209-218)
- `server/routes/adminRoutes.ts` (DELETE /api/admin/recipes endpoint)
- Bulk delete mutation and individual delete handler

**Current Behavior**:
- User selects recipes and clicks Delete
- No error message appears
- Recipes remain in database

**Expected Behavior**:
- Selected recipes should be deleted
- Database updated
- UI refreshed to reflect deletion
- Toast confirmation shown

**Root Cause Hypothesis**:
- Backend DELETE endpoint may not be implemented
- recipeIds array not properly formatted
- Database foreign key constraints blocking deletion
- Query cache not properly invalidating

---

### Issue #2: Recipe Generator Blocks UI During Generation
**Severity**: MEDIUM
**User Impact**: Cannot use other tabs while recipes generate
**Affected Components**:
- `client/src/components/AdminRecipeGenerator.tsx` (lines 76-167)
- Frontend progress simulation (lines 110-158)
- Tab navigation in `client/src/pages/Admin.tsx`

**Current Behavior**:
- User starts recipe generation
- Progress bar appears
- Cannot switch to other tabs
- UI blocked for 30+ seconds

**Expected Behavior**:
- Generation runs in background (already does on backend)
- User can switch tabs immediately
- Progress notification visible across tabs
- Can monitor status from any tab

**Root Cause**:
- Frontend uses simulated progress timeouts (line 120-158)
- `isGenerating` state blocks form
- No real-time SSE progress tracking like BMAD generator
- Progress tracking not portable across tabs

---

### Issue #3: Generated Recipes Don't Appear in Queue Without Refresh
**Severity**: MEDIUM
**User Impact**: User must manually refresh browser to see generated recipes
**Affected Components**:
- `client/src/components/BMADRecipeGenerator.tsx` (SSE completion handler)
- `client/src/components/AdminRecipeGenerator.tsx` (query invalidation)
- React Query cache invalidation logic

**Current Behavior**:
- User generates 10 recipes via BMAD generator
- Progress shows "Complete"
- Recipes not visible in Review Queue
- Must refresh browser to see them

**Expected Behavior**:
- After generation completes
- Query cache automatically invalidates
- Pending recipes list refreshes
- New recipes appear in queue immediately

**Root Cause**:
- BMADRecipeGenerator SSE 'complete' handler doesn't invalidate admin queries
- Missing queryClient.invalidateQueries calls
- Cache invalidation only happens on component (not global)

---

### Issue #4: Recipe Validation Not Enforcing Nutritional Constraints
**Severity**: HIGH
**User Impact**: Generates recipes that don't meet user requirements
**Affected Components**:
- `server/services/recipeGenerator.ts` - validation logic
- `server/routes/adminRoutes.ts` - parameter passing (lines 98-178)
- Post-generation validation missing

**Current Behavior**:
- User requests recipes < 300 calories
- System generates recipes with 400+ calories
- No validation warnings
- Invalid recipes saved to database

**Expected Behavior**:
- Generate recipes matching constraints
- Validate before saving to database
- Reject recipes that don't meet criteria
- Retry generation for failed validations
- Report validation statistics

**Missing Validation**:
- maxCalories enforcement
- minCalories enforcement
- Protein range (min/max)
- Carbs range (min/max)
- Fat range (min/max)
- Prep time validation

**Required Unit Tests**:
- Test each nutritional field constraint
- Test combination of constraints
- Test edge cases (0 calories, negative values)
- Test validation error handling

---

### Issue #5: Quick Bulk Generator Buttons Don't Start Generation
**Severity**: MEDIUM
**User Impact**: One-click generation feature non-functional
**Affected Components**:
- `client/src/components/AdminRecipeGenerator.tsx` (lines 791-820)
- `handleBulkGenerate` function (line 306-308)
- `bulkGenerate` mutation (lines 169-201)

**Current Behavior**:
- User clicks "10 recipes" quick button
- Number field populates with "10"
- Nothing happens - no generation starts
- No progress bar appears

**Expected Behavior**:
- Click "10 recipes" button
- Generation starts immediately
- Progress bar appears
- Uses default "fitness-focused" parameters
- Recipes generated and saved

**Root Cause**:
- Buttons only populate count field (line 809)
- Don't call mutation to start generation
- Missing automatic form submission
- No default parameter injection

---

### Issue #6: AI Natural Language Generator Buttons Non-Functional
**Severity**: HIGH
**User Impact**: Advanced AI feature completely broken
**Affected Components**:
- `client/src/components/AdminRecipeGenerator.tsx` (lines 240-300)
- `parseNaturalLanguage` mutation (lines 203-238)
- `handleDirectGeneration` function (lines 244-300)
- `server/routes/adminRoutes.ts` - `/generate-from-prompt` endpoint (lines 181-200)

**Current Behavior ("Parse with AI")**:
- User types natural language prompt
- Clicks "Parse with AI"
- No form fields populate
- No error message
- Button shows "Parsing with AI..." then reverts

**Current Behavior ("Generate Directly")**:
- User types natural language prompt
- Clicks "Generate Directly"
- No progress bar appears
- No toast notification
- Button shows "Generating..." then reverts
- No recipes created

**Expected Behavior**:
- **Parse with AI**: Extract parameters from text, populate form fields
- **Generate Directly**: Parse → Generate → Save recipes

**Root Cause**:
- `parseNaturalLanguage` mutation uses placeholder logic (lines 205-216)
- Backend `/generate-from-prompt` endpoint creates MEAL PLAN, not RECIPES
- Endpoint mismatch - frontend expects recipe generation, backend does meal plan
- SSE progress tracking not implemented for this flow

---

## Technical Architecture Analysis

### Affected Backend Files
1. `server/routes/adminRoutes.ts` - All generation endpoints
2. `server/services/recipeGenerator.ts` - Core generation logic
3. `server/services/openai.ts` - Natural language parsing
4. `server/services/recipeValidator.ts` - **MISSING - needs creation**
5. Database schema - Recipe deletion constraints

### Affected Frontend Files
1. `client/src/pages/Admin.tsx` - Delete handlers, tab state
2. `client/src/components/AdminRecipeGenerator.tsx` - Main generator UI
3. `client/src/components/BMADRecipeGenerator.tsx` - Bulk generator
4. `client/src/components/MealPlanGenerator.tsx` - Natural language UI

### Database Tables Affected
1. `personalizedRecipes` - Delete operations, validation
2. Query relationships affecting delete cascade

---

## Proposed Solutions

### Fix #1: Recipe Delete Implementation
**Backend Changes**:
- Implement DELETE `/api/admin/recipes` endpoint
- Accept `{recipeIds: string[]}` in request body
- Delete from database with proper error handling
- Return success count and any errors

**Frontend Changes**:
- Ensure recipeIds array properly formatted
- Add error handling for delete failures
- Improve toast notifications with details

**Testing**:
- Unit test: DELETE endpoint with valid IDs
- Unit test: DELETE endpoint with invalid IDs
- Integration test: Bulk delete multiple recipes
- E2E test: Delete from UI and verify removal

---

### Fix #2: Background Recipe Generation
**Frontend Changes**:
- Remove blocking progress simulation
- Use SSE progress like BMAD generator
- Add minimizable progress widget
- Make progress portable across tabs
- Store active jobs in localStorage

**Backend Changes**:
- Add SSE endpoint for generation progress
- Update progressTracker to emit events
- Return jobId for tracking

**Testing**:
- E2E test: Start generation, switch tabs, verify continues
- E2E test: Close/reopen browser, verify reconnects
- Unit test: SSE connection management

---

### Fix #3: Auto-Refresh Queue After Generation
**Frontend Changes**:
- Add queryClient invalidation to SSE complete handler
- Invalidate these query keys:
  - `["admin-recipes", { approved: false }]` (pending queue)
  - `["admin-stats"]` (stats counter)
  - `["/api/admin/recipes"]` (all admin recipes)

**Code Changes** (BMADRecipeGenerator.tsx line ~203):
```typescript
eventSource.addEventListener('complete', (event) => {
  const result = JSON.parse(event.data);

  // CRITICAL FIX: Invalidate queries to refresh UI
  queryClient.invalidateQueries({ queryKey: ["admin-recipes"] });
  queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
  queryClient.invalidateQueries({ queryKey: ["/api/admin/recipes"] });

  setIsGenerating(false);
  toast({
    title: "Generation Complete!",
    description: `Successfully generated ${result.savedRecipes?.length || 0} recipes`,
  });

  eventSource.close();
});
```

**Testing**:
- Integration test: Generate → Wait → Verify query refetch
- E2E test: Generate recipes → Check queue updates automatically
- E2E test: Monitor network calls for query invalidation

---

### Fix #4: Recipe Validation Service
**New Service Creation**: `server/services/recipeValidator.ts`

```typescript
export interface ValidationConstraints {
  maxCalories?: number;
  minCalories?: number;
  maxPrepTime?: number;
  minProtein?: number;
  maxProtein?: number;
  minCarbs?: number;
  maxCarbs?: number;
  minFat?: number;
  maxFat?: number;
}

export class RecipeValidator {
  validate(recipe: GeneratedRecipe, constraints: ValidationConstraints): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Calorie validation
    if (constraints.maxCalories && recipe.nutrition.calories > constraints.maxCalories) {
      errors.push(`Calories ${recipe.nutrition.calories} exceeds max ${constraints.maxCalories}`);
    }
    if (constraints.minCalories && recipe.nutrition.calories < constraints.minCalories) {
      errors.push(`Calories ${recipe.nutrition.calories} below min ${constraints.minCalories}`);
    }

    // Protein validation
    if (constraints.maxProtein && recipe.nutrition.protein > constraints.maxProtein) {
      errors.push(`Protein ${recipe.nutrition.protein}g exceeds max ${constraints.maxProtein}g`);
    }
    // ... similar for all constraints

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
```

**Integration**:
- Call validator before saving recipes
- Reject invalid recipes
- Log validation failures
- Return validation stats to frontend

**Testing**:
- Unit test: Each validation field independently
- Unit test: Combined constraints
- Unit test: Edge cases (null, undefined, negative)
- Integration test: Generate with constraints → All valid
- E2E test: Request <300 cal → Verify all under 300

---

### Fix #5: Quick Bulk Generator Auto-Start
**Frontend Changes** (AdminRecipeGenerator.tsx):

Update button handler (line ~809):
```typescript
<Button
  key={count}
  variant="outline"
  onClick={() => {
    // Set count in form
    form.setValue('count', count);
    // Submit form with default fitness-focused params
    form.handleSubmit((data) => {
      generateRecipes.mutate({
        ...data,
        count,
        fitnessGoal: 'fitness-focused',
        // Default nutritional targets
        minProtein: 20,
        maxCalories: 800,
      });
    })();
  }}
  disabled={bulkGenerate.isPending || isGenerating}
  className="h-16 flex flex-col items-center justify-center"
>
  <span className="text-lg font-bold">{count}</span>
  <span className="text-xs text-slate-600">recipes</span>
</Button>
```

**Testing**:
- E2E test: Click "10 recipes" → Verify generation starts
- E2E test: Click "20 recipes" → Verify count correct
- E2E test: Verify progress bar appears
- E2E test: Verify recipes created with defaults

---

### Fix #6: AI Natural Language Generator Backend
**Backend Changes**:

Create new endpoint `/api/admin/generate-recipes-from-prompt`:
```typescript
adminRouter.post('/generate-recipes-from-prompt', requireAdmin, async (req, res) => {
  try {
    const { prompt } = req.body;

    // Parse natural language to recipe parameters
    const parsedParams = await parseNaturalLanguageRecipeRequirements(prompt);

    // Create job for tracking
    const jobId = progressTracker.createJob({
      totalRecipes: parsedParams.count,
      metadata: { naturalLanguagePrompt: prompt }
    });

    // Map to generation options
    const generationOptions = {
      count: parsedParams.count || 10,
      mealTypes: parsedParams.mealTypes,
      dietaryRestrictions: parsedParams.dietaryRestrictions,
      maxCalories: parsedParams.maxCalories,
      minCalories: parsedParams.minCalories,
      maxPrepTime: parsedParams.maxPrepTime,
      mainIngredient: parsedParams.mainIngredient,
      // ... all other params
      jobId
    };

    // Start background generation
    recipeGenerator.generateAndStoreRecipes(generationOptions);

    res.status(202).json({
      message: "Recipe generation started from natural language",
      jobId,
      parsedParameters: parsedParams,
      count: parsedParams.count
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to parse prompt" });
  }
});
```

**Frontend Changes**:
- Update `handleDirectGeneration` to call new endpoint
- Add SSE progress tracking
- Update `parseNaturalLanguage` to call real backend parse endpoint (if exists) or implement client-side parsing

**Testing**:
- Unit test: Parse prompt → Extract parameters
- Unit test: Various prompt formats
- Integration test: Full flow parse → generate → save
- E2E test: Type prompt → Click "Generate Directly" → Verify recipes

---

## Testing Strategy

### Unit Tests to Create
1. `recipeValidator.test.ts` - All validation fields (15 tests)
2. `adminRoutes.test.ts` - DELETE endpoint (5 tests)
3. `recipeGenerator.test.ts` - Constraint enforcement (10 tests)
4. `naturalLanguageParsing.test.ts` - Prompt parsing (8 tests)

**Total New Unit Tests**: ~38 tests

### Integration Tests to Create
1. Recipe delete with foreign key constraints
2. Background generation with SSE progress
3. Query invalidation after generation
4. Natural language end-to-end flow

**Total New Integration Tests**: 4 tests

### E2E Tests to Create
1. Delete recipes from UI
2. Generate while switching tabs
3. Queue auto-refresh verification
4. Constraint validation end-to-end
5. Quick bulk buttons functionality
6. Natural language generator full flow

**Total New E2E Tests**: 6 tests

---

## Implementation Plan

### Phase 1: Fix Delete Functionality (4 hours)
- [ ] Implement DELETE endpoint backend
- [ ] Fix frontend delete handler
- [ ] Add unit tests
- [ ] Add integration test
- [ ] Add E2E test

### Phase 2: Background Generation (6 hours)
- [ ] Add SSE progress endpoint
- [ ] Remove blocking UI progress
- [ ] Add portable progress widget
- [ ] Add localStorage persistence
- [ ] Add E2E tests

### Phase 3: Auto-Refresh Queue (2 hours)
- [ ] Add query invalidation to SSE handlers
- [ ] Test across components
- [ ] Add E2E test

### Phase 4: Recipe Validation (8 hours)
- [ ] Create RecipeValidator service
- [ ] Add all constraint validations
- [ ] Integrate into generation flow
- [ ] Create 15 unit tests
- [ ] Add integration test
- [ ] Add E2E test

### Phase 5: Quick Bulk Generator (3 hours)
- [ ] Update button handlers
- [ ] Add default parameters
- [ ] Add E2E test

### Phase 6: Natural Language Generator (6 hours)
- [ ] Create new backend endpoint
- [ ] Update frontend handlers
- [ ] Add SSE progress
- [ ] Create unit tests
- [ ] Add E2E test

**Total Estimated Time**: 29 hours

---

## Success Metrics

### Functional Metrics
- [ ] Delete removes 100% of selected recipes
- [ ] Can switch tabs during generation
- [ ] Queue refreshes within 2 seconds of completion
- [ ] 100% of generated recipes meet constraints
- [ ] Quick bulk buttons work on first click
- [ ] Natural language generates correct recipes

### Quality Metrics
- [ ] 95%+ unit test coverage on new code
- [ ] All E2E tests passing
- [ ] Zero console errors during normal operation
- [ ] Response time < 200ms for delete
- [ ] Validation overhead < 50ms per recipe

---

## Dependencies

### External Libraries
- None (all existing dependencies sufficient)

### Backend Services
- OpenAI API (existing)
- PostgreSQL database (existing)
- S3/DigitalOcean Spaces (existing)

### Frontend Components
- React Query (existing)
- EventSource API (browser native)
- Toast notifications (existing)

---

## Risks & Mitigation

### Risk 1: Delete Cascade Constraints
**Mitigation**: Check foreign key relationships, add cascade delete or handle orphans

### Risk 2: SSE Connection Stability
**Mitigation**: Add reconnection logic, localStorage persistence, graceful degradation

### Risk 3: Validation Performance Impact
**Mitigation**: Validate only before save, not during generation; parallel validation

### Risk 4: Natural Language Parsing Accuracy
**Mitigation**: Use GPT-4 for parsing, add example prompts, test edge cases

---

## Acceptance Criteria

### Issue #1 - Delete
- [ ] Selecting recipes and clicking Delete removes them from database
- [ ] Toast notification confirms deletion
- [ ] Recipe list refreshes automatically
- [ ] Works for both bulk and individual delete

### Issue #2 - Background Generation
- [ ] Can switch tabs immediately after starting generation
- [ ] Progress visible from all tabs
- [ ] Page refresh doesn't lose progress
- [ ] Generation completes even if tab closed

### Issue #3 - Auto-Refresh
- [ ] Generated recipes appear in queue without manual refresh
- [ ] Stats update immediately
- [ ] Happens for both BMAD and regular generation

### Issue #4 - Validation
- [ ] All recipes meet specified constraints
- [ ] Invalid recipes rejected
- [ ] Validation errors logged
- [ ] Unit tests verify each field

### Issue #5 - Quick Bulk
- [ ] Click "10 recipes" starts generation immediately
- [ ] Uses fitness-focused defaults
- [ ] Progress bar appears
- [ ] Recipes generated successfully

### Issue #6 - Natural Language
- [ ] "Parse with AI" populates form fields
- [ ] "Generate Directly" creates recipes
- [ ] Progress tracking works
- [ ] Prompt variations handled correctly

---

## Rollback Plan

If issues arise:
1. Feature flags to disable new validation
2. Revert to frontend-only delete (hide UI, don't delete)
3. Disable natural language feature
4. Keep manual refresh button as backup

---

**Status**: BMAD Phase 1 Complete - Ready for Architecture Review
**Next Phase**: Architect reviews affected code areas
**Estimated Start Date**: January 19, 2025
