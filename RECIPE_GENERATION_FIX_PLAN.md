# Recipe Generation 80% Hang - Fix Plan

**Date:** October 6, 2025
**Priority:** CRITICAL
**Status:** Analysis Complete - Ready for Implementation

---

## ROOT CAUSE ANALYSIS

### Problem: Recipe Generation Hangs at 80%

**Symptoms:**
- Progress bar reaches 80% ("Validating recipes" step)
- Generation appears frozen
- No error messages
- Timeout after 5-10 minutes

**Root Cause:**
1. **Fake Progress Bar** - Frontend progress is just a timer (6s per step), not real progress
2. **Blocking Image Generation** - Backend generates ALL images synchronously BEFORE saving recipes
3. **No Database Updates Until Complete** - Recipes only saved AFTER all images generated
4. **Image Generation is SLOW** - DALL-E 3 takes 30-60 seconds PER image
5. **Sequential Processing** - 10 recipes × 60 seconds = 10 minutes of blocking!

**Code Evidence:**

```typescript
// recipeGenerator.ts:115-118
const imageUrl = await this.getOrGenerateImage(recipe);
if (!imageUrl) {
  return { success: false, error: `Image generation failed` };
}
// ❌ Recipe REJECTED if image fails
// ❌ Image generation BLOCKS recipe save
```

```typescript
// RecipeGenerationModal.tsx:100-121
useEffect(() => {
  if (isGenerating) {
    const stepDuration = 6000; // Fake 6 second timer
    const interval = setInterval(() => {
      setCurrentStep(prevStep => prevStep + 1);
      // ❌ Not tracking real backend progress
    }, stepDuration);
  }
}, [isGenerating]);
```

---

## SOLUTION ARCHITECTURE

### Phase 1: Immediate Fix (Production-Ready)

**Strategy:** Save recipes FIRST, generate images in BACKGROUND

#### Backend Changes

1. **Make Image Generation Optional**
   ```typescript
   // BEFORE (blocking):
   const imageUrl = await this.getOrGenerateImage(recipe);
   if (!imageUrl) {
     return { success: false, error: 'Image failed' };
   }

   // AFTER (non-blocking):
   const imageUrl = await this.getOrGenerateImage(recipe)
     || '/images/placeholder-recipe.jpg';
   // ✅ Always returns a URL (placeholder if generation fails)
   ```

2. **Add Timeout to Image Generation**
   ```typescript
   private async getOrGenerateImage(recipe: GeneratedRecipe): Promise<string> {
     try {
       return await Promise.race([
         this.generateImageWithRetry(recipe),
         this.timeoutAfter(30000) // 30 second timeout
       ]);
     } catch (error) {
       return '/images/placeholder-recipe.jpg'; // Fallback
     }
   }
   ```

3. **Background Image Generation**
   ```typescript
   // Save recipe with placeholder first
   await this.storeRecipe({ ...recipe, imageUrl: placeholder });

   // Generate image in background (don't wait)
   this.generateImageInBackground(recipe.id);
   ```

4. **Add Real Progress Tracking**
   ```typescript
   interface ProgressUpdate {
     phase: 'generating' | 'validating' | 'saving' | 'images';
     completed: number;
     total: number;
     percentage: number;
   }
   ```

#### Frontend Changes

1. **Real Progress from Backend**
   ```typescript
   // Replace fake timer with actual backend updates
   const { data: progress } = useQuery({
     queryKey: ['generation-progress', sessionId],
     queryFn: () => fetch('/api/admin/generate/progress').then(r => r.json()),
     refetchInterval: 1000, // Poll every second
   });
   ```

2. **Show Image Status**
   ```typescript
   "✅ 10/10 recipes saved"
   "🖼️ 3/10 images generated (processing in background)"
   ```

### Phase 2: Advanced Features (Post-Fix)

1. **WebSocket Real-Time Progress**
2. **Batch Image Generation** (parallel processing)
3. **Smart Caching** (reuse similar images)
4. **Progressive Enhancement** (show recipes immediately, images load later)

---

## IMPLEMENTATION STEPS

### Step 1: Backend Fix (recipeGenerator.ts)

**Changes:**
1. Make `getOrGenerateImage()` never return null
2. Add timeout wrapper
3. Save recipes with placeholders first
4. Generate images async after save
5. Add progress tracking

**Files to Modify:**
- `server/services/recipeGenerator.ts`
- `server/services/utils/S3Uploader.ts` (add timeout)
- `server/routes.ts` (add progress endpoint)

### Step 2: Frontend Fix (RecipeGenerationModal.tsx)

**Changes:**
1. Replace fake timer with real progress polling
2. Show detailed status (recipes saved vs images generated)
3. Handle completion when recipes saved (not when images done)
4. Add error recovery UI

**Files to Modify:**
- `client/src/components/RecipeGenerationModal.tsx`

### Step 3: Testing

**Unit Tests:**
- [ ] Recipe generation without images succeeds
- [ ] Image timeout doesn't block recipe save
- [ ] Placeholder images work correctly
- [ ] Progress tracking accurate
- [ ] Multiple recipes process correctly

**Integration Tests:**
- [ ] Full generation flow (10 recipes)
- [ ] Generation with image failures
- [ ] Generation with S3 timeout
- [ ] Concurrent generation requests

**E2E Tests (Playwright):**
- [ ] Generate 5 recipes successfully
- [ ] Progress bar updates correctly
- [ ] Recipes appear after save (not after images)
- [ ] Images update in background
- [ ] Error handling displays correctly

---

## SUCCESS CRITERIA

### Performance Targets
- ✅ Generate 10 recipes in < 60 seconds (recipes saved)
- ✅ Images generate in background (< 10 minutes total)
- ✅ Progress bar updates every 1-2 seconds
- ✅ 0 failures due to image generation

### Quality Targets
- ✅ 100% test coverage for generation flow
- ✅ 100% Playwright E2E tests passing
- ✅ No blocking on image generation
- ✅ Graceful degradation (works without images)

### User Experience
- ✅ Immediate feedback (progress updates)
- ✅ Recipes available quickly (< 60s)
- ✅ Clear status messages
- ✅ Images appear progressively

---

## RISK MITIGATION

### Risks
1. **Image quality** - Placeholders may look unprofessional
2. **User confusion** - Why do some recipes lack images?
3. **Database load** - Updating images after initial save

### Mitigations
1. Use high-quality generic food placeholders
2. Show "Generating image..." status
3. Use efficient update queries
4. Implement rate limiting on image generation

---

## ROLLBACK PLAN

If issues occur:
1. Keep placeholder images permanently
2. Disable image generation entirely
3. Use stock photos from image library
4. Revert to previous version (with 80% hang but known behavior)

---

## TESTING CHECKLIST

### Before Deployment
- [ ] Unit tests: 100% passing
- [ ] Integration tests: 100% passing
- [ ] E2E tests: 100% passing
- [ ] Performance test: < 60s for 10 recipes
- [ ] Stress test: 100 concurrent generations
- [ ] Error recovery test: Image failures handled

### After Deployment
- [ ] Monitor generation success rate
- [ ] Track average generation time
- [ ] Monitor image generation background queue
- [ ] Check for database load issues

---

## IMPLEMENTATION TIMELINE

**Phase 1 (Critical Fix):** 2-3 hours
- Backend timeout and placeholder logic
- Frontend progress tracking fix
- Basic unit tests

**Phase 2 (Polish):** 1-2 hours
- Comprehensive tests
- E2E Playwright tests
- Performance optimization

**Phase 3 (Advanced):** Future
- WebSocket progress
- Parallel image generation
- Smart caching

---

## CODE CHANGES PREVIEW

### 1. Timeout Wrapper
```typescript
private async timeoutAfter(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Timeout')), ms);
  });
}

private async withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T
): Promise<T> {
  try {
    return await Promise.race([promise, this.timeoutAfter(ms)]);
  } catch {
    return fallback;
  }
}
```

### 2. Non-Blocking Image Generation
```typescript
private async processSingleRecipe(recipe: GeneratedRecipe): Promise<{ success: boolean; error?: string }> {
  const validation = await this.validateRecipe(recipe);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  // Use placeholder, don't wait for image
  const imageUrl = '/images/placeholder-recipe.jpg';

  // Save recipe immediately
  const result = await this.storeRecipe({ ...recipe, imageUrl });

  // Generate image in background (fire and forget)
  if (result.success && result.recipeId) {
    this.generateImageInBackground(result.recipeId, recipe);
  }

  return result;
}
```

### 3. Background Image Generation
```typescript
private async generateImageInBackground(recipeId: number, recipe: GeneratedRecipe): Promise<void> {
  // Don't await - runs in background
  this.withTimeout(
    this.getOrGenerateImage(recipe),
    60000, // 60 second timeout
    '/images/placeholder-recipe.jpg'
  ).then(async (imageUrl) => {
    if (imageUrl && imageUrl !== '/images/placeholder-recipe.jpg') {
      await storage.updateRecipeImage(recipeId, imageUrl);
    }
  }).catch(error => {
    console.error(`Background image generation failed for recipe ${recipeId}:`, error);
  });
}
```

---

**Status:** Ready for Implementation
**Next:** Implement backend fixes, then frontend, then tests
