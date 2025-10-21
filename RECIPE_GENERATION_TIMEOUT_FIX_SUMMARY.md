# Recipe Generation Timeout & Review Queue - Implementation Summary

## What Was Fixed

### ✅ 1. OpenAI Timeout Added
**File:** `server/services/openai.ts`

```typescript
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 120000, // 2 minutes timeout for all API calls
  maxRetries: 2, // Retry failed requests twice
});
```

**Impact:** All OpenAI API calls now have a 2-minute timeout, preventing indefinite hangs.

### 📋 2. Complete Implementation Plan Created
**File:** `RECIPE_REVIEW_QUEUE_IMPLEMENTATION_PLAN.md`

Contains full architecture for:
- Review queue workflow for large batches
- Database schema changes
- Admin review interface
- Progress tracking system
- API endpoints needed

## What Still Needs to Be Done

### Immediate Next Steps:

#### 1. Add Chunking to `openai.ts`
The file needs these additions (but is being modified by linter):

```typescript
// Add after parsePartialJson function:
const OPTIMAL_CHUNK_SIZE = 5;

// Replace generateRecipeBatch with:
export async function generateRecipeBatch(
  count: number,
  options: GenerateOptions = {}
): Promise<GeneratedRecipe[]> {
  if (count > OPTIMAL_CHUNK_SIZE) {
    console.log(`Large batch (${count} recipes). Splitting into chunks of ${OPTIMAL_CHUNK_SIZE}...`);
    return await generateRecipeBatchChunked(count, options);
  }
  return await generateRecipeBatchSingle(count, options);
}

async function generateRecipeBatchChunked(
  totalCount: number,
  options: GenerateOptions
): Promise<GeneratedRecipe[]> {
  const allRecipes: GeneratedRecipe[] = [];
  const chunks = Math.ceil(totalCount / OPTIMAL_CHUNK_SIZE);

  for (let i = 0; i < chunks; i++) {
    const chunkSize = Math.min(OPTIMAL_CHUNK_SIZE, totalCount - allRecipes.length);
    console.log(`Generating chunk ${i + 1}/${chunks} (${chunkSize} recipes)...`);

    const chunkRecipes = await generateRecipeBatchSingle(chunkSize, options);
    allRecipes.push(...chunkRecipes);
    console.log(`Chunk ${i + 1} complete. Total: ${allRecipes.length}/${totalCount}`);
  }

  return allRecipes;
}

// Rename existing generateRecipeBatch to generateRecipeBatchSingle
async function generateRecipeBatchSingle(...) {
  // existing logic
}
```

#### 2. Create Database Migration
```sql
-- Add review_status to recipes table
ALTER TABLE recipes ADD COLUMN review_status VARCHAR DEFAULT 'approved';

-- Create review queue table
CREATE TABLE recipe_review_queue (
  id SERIAL PRIMARY KEY,
  recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
  status VARCHAR NOT NULL, -- 'pending_images', 'ready_for_review', 'approved', 'rejected'
  image_generation_status VARCHAR, -- 'pending', 'in_progress', 'completed', 'failed'
  batch_id VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  reviewed_by UUID REFERENCES users(id),
  rejection_reason TEXT
);

CREATE INDEX idx_review_queue_status ON recipe_review_queue(status);
CREATE INDEX idx_review_queue_batch ON recipe_review_queue(batch_id);
```

#### 3. Update Recipe Generator Service
Modify `recipeGenerator.ts` to:
- Check if batch size > 5
- If yes, save recipes to review queue with status 'pending_images'
- Start background image generation
- Update status to 'ready_for_review' when images complete

#### 4. Create Admin Review Queue UI
- New admin page: `/admin/review-queue`
- Components:
  - Progress bar showing `X/Y images generated`
  - Recipe cards with status badges
  - Approve/Reject actions
  - Batch filtering

#### 5. Add API Endpoints
```typescript
// GET /api/admin/review-queue
// GET /api/admin/review-queue/batch/:batchId/progress
// POST /api/admin/review-queue/:id/approve
// POST /api/admin/review-queue/:id/reject
// POST /api/admin/review-queue/batch/:batchId/approve-all
```

## Current System State

### ✅ Working:
- OpenAI client has timeout (prevents indefinite hangs)
- Small batches (≤5) work normally
- Existing recipe generation flow unchanged

### ⚠️ Still Issues:
- Large batches (>5) will still timeout without chunking
- No review queue system yet
- Admin can't track image generation progress

## Testing the Timeout Fix

1. Restart the dev server:
```bash
docker restart fitnessmealplanner-dev
```

2. Try generating 10 recipes again - should now timeout after 2 minutes instead of hanging forever

3. Check logs for timeout error message

## Next Session Priority

1. ✅ **Apply chunking to openai.ts** (prevents timeout by splitting large batches)
2. Create database migration for review queue
3. Update recipe generator to use review queue for batches >5
4. Build admin review interface

## Files Modified This Session

1. ✅ `server/services/openai.ts` - Added timeout config
2. ✅ `RECIPE_REVIEW_QUEUE_IMPLEMENTATION_PLAN.md` - Full architecture plan
3. ✅ `RECIPE_GENERATION_TIMEOUT_FIX_SUMMARY.md` - This file

## Key Decisions Made

1. **Chunk Size: 5 recipes** - Balances speed vs API limits
2. **Review Queue Threshold: 5 recipes** - Small batches go directly to database
3. **Timeout: 120 seconds** - Prevents indefinite hangs
4. **Progress Tracking: Admin-only** - Keeps UI simple for trainers/users
5. **Images: Placeholder first** - Recipes immediately usable, images added later

## Commands to Continue

```bash
# View the implementation plan
cat RECIPE_REVIEW_QUEUE_IMPLEMENTATION_PLAN.md

# View timeout fix summary
cat RECIPE_GENERATION_TIMEOUT_FIX_SUMMARY.md

# Restart server to apply timeout fix
docker restart fitnessmealplanner-dev

# Test with 10 recipes (will still timeout but faster now)
# Then apply chunking to fix completely
```
