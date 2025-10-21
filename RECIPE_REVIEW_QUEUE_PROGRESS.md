# Recipe Review Queue - Implementation Progress

## ✅ Completed (Session: 2025-10-06)

### 1. OpenAI Timeout Fix
**File:** `server/services/openai.ts:7-11`

```typescript
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 120000, // 2 minutes timeout for all API calls
  maxRetries: 2, // Retry failed requests twice
});
```

**Impact:** Prevents indefinite hangs on large recipe generation requests.

### 2. Chunking Logic Implemented
**File:** `server/services/openai.ts:99-141`

- **Chunk Size:** 5 recipes per chunk
- **Smart Routing:** Batches ≤5 go directly to OpenAI, batches >5 are automatically chunked
- **Progress Logging:** Shows chunk progress (`Chunk 1/2 complete. Progress: 5/10 recipes generated`)

**Functions:**
- `generateRecipeBatch()` - Public API with automatic chunking
- `generateRecipeBatchChunked()` - Splits large batches into chunks
- `generateRecipeBatchSingle()` - Internal implementation for single API call

### 3. Database Migration Completed
**File:** `migrations/0017_recipe_review_queue.sql`

**Changes:**
1. Added `review_status` column to `recipes` table
   - Default: `'approved'` (backward compatible)
   - Values: `'draft', 'in_review', 'approved', 'rejected'`

2. Created `recipe_review_queue` table with:
   - `id` - SERIAL PRIMARY KEY
   - `recipe_id` - UUID FK to recipes(id)
   - `status` - Queue status (pending_images, ready_for_review, approved, rejected)
   - `image_generation_status` - Image progress (pending, in_progress, completed, failed)
   - `batch_id` - VARCHAR for grouping related recipes
   - `created_at`, `reviewed_at` - Timestamps
   - `reviewed_by` - UUID FK to users(id)
   - `rejection_reason` - TEXT

3. Created 5 indexes for performance:
   - `idx_review_queue_status` - Fast status lookups
   - `idx_review_queue_batch` - Batch filtering
   - `idx_review_queue_recipe` - Recipe lookups
   - `idx_review_queue_created_at` - Date sorting
   - `idx_recipes_review_status` - Recipe status filtering

4. Created helper function `get_batch_progress(batch_id)`:
   - Returns: total_recipes, images_generated, images_in_progress, images_failed, ready_for_review, approved, rejected, percent_complete
   - Used by admin UI to show progress bars

## 📋 Next Steps

### Phase 1: Update Recipe Generator (CURRENT)
**File to Modify:** `server/services/recipeGenerator.ts`

**Required Changes:**
1. Add threshold constant: `const REVIEW_QUEUE_THRESHOLD = 5;`

2. Detect large batches in `generateAndStoreRecipes()`:
   ```typescript
   if (count > REVIEW_QUEUE_THRESHOLD) {
     return await this.generateLargeBatchWithReviewQueue(count, options);
   }
   ```

3. Implement `generateLargeBatchWithReviewQueue()`:
   - Generate batch ID: `const batchId = uuidv4();`
   - Call chunked generation from openai.ts
   - Save recipes with `review_status = 'in_review'`
   - Create review queue entries with `status = 'pending_images'`
   - Start background image generation
   - Return batch ID to client

4. Update background image generation:
   - Update queue entry: `image_generation_status = 'in_progress'`
   - Generate image via DALL-E
   - On success: `image_generation_status = 'completed'`, `status = 'ready_for_review'`
   - On failure: `image_generation_status = 'failed'`

### Phase 2: Create API Endpoints
**File to Create:** `server/routes/admin-review-queue.ts`

**Endpoints:**
```typescript
GET    /api/admin/review-queue               // List all queue items
GET    /api/admin/review-queue/:batchId      // Get batch details
GET    /api/admin/review-queue/batch/:batchId/progress  // Progress stats
POST   /api/admin/review-queue/:id/approve   // Approve single recipe
POST   /api/admin/review-queue/:id/reject    // Reject single recipe
POST   /api/admin/review-queue/batch/:batchId/approve-all  // Approve entire batch
DELETE /api/admin/review-queue/:id           // Remove from queue
```

### Phase 3: Build Admin UI
**File to Create:** `client/src/pages/AdminReviewQueue.tsx`

**Components:**
- Progress bar showing image generation completion
- Filter buttons (All, Pending Images, Ready for Review, Approved, Rejected)
- Recipe cards with:
  - Status badges
  - Image preview (or placeholder)
  - Recipe details
  - Approve/Reject buttons
- Batch operations:
  - "Approve All Ready" button
  - Batch filtering dropdown

### Phase 4: Update Client Flow
**Files to Modify:**
- `client/src/components/RecipeGenerationModal.tsx`
  - Show different UI for large batches
  - Display "Recipes sent to review queue" message
  - Link to admin review queue

## Testing Strategy

### 1. Small Batch Test (≤5 recipes)
- Should work as before (direct to database)
- No review queue involvement

### 2. Large Batch Test (>5 recipes)
- Generate 10 recipes
- Verify chunking logs appear
- Check recipes in review queue with `status = 'pending_images'`
- Wait for images to generate
- Verify status changes to `ready_for_review`

### 3. Progress Tracking Test
```sql
SELECT * FROM get_batch_progress('batch-id-here');
```

### 4. Admin Approval Test
- Access `/admin/review-queue`
- View pending recipes
- Approve/reject individual recipes
- Batch approve all ready recipes

## Configuration

**Environment Variables:**
- `REVIEW_QUEUE_ENABLED` - Toggle review queue (default: true for batches >5)
- `REVIEW_QUEUE_THRESHOLD` - Batch size threshold (default: 5)
- `IMAGE_GENERATION_TIMEOUT` - Timeout for DALL-E (default: 30000ms)
- `MAX_IMAGE_RETRY_ATTEMPTS` - Retry count for failed images (default: 3)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  User Generates 10 Recipes                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │ Recipe Generator       │
         │ Detects: count > 5     │
         └───────┬───────────────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │ OpenAI Chunking (2 chunks) │
    │ Chunk 1: 5 recipes         │
    │ Chunk 2: 5 recipes         │
    └────┬───────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│ Save to Review Queue            │
│ status: 'pending_images'        │
│ review_status: 'in_review'      │
└────┬───────────────────────────┘
     │
     ▼
┌────────────────────────────────┐
│ Background Image Generation     │
│ (runs asynchronously)           │
└────┬───────────────────────────┘
     │
     ▼
┌────────────────────────────────┐
│ Update Queue Status             │
│ status: 'ready_for_review'      │
│ image_status: 'completed'       │
└────┬───────────────────────────┘
     │
     ▼
┌────────────────────────────────┐
│ Admin Reviews in UI             │
│ Approves/Rejects                │
└────┬───────────────────────────┘
     │
     ▼
┌────────────────────────────────┐
│ Approved Recipes                │
│ review_status: 'approved'       │
│ Available to users              │
└────────────────────────────────┘
```

## Benefits

1. **No Timeouts:** Chunking prevents OpenAI API timeouts
2. **Better UX:** Users get immediate feedback, not stuck waiting
3. **Quality Control:** Admin reviews recipes before they go live
4. **Scalability:** Can handle 100+ recipe batches
5. **Transparency:** Progress tracking shows exactly what's happening
6. **Flexibility:** Easy to adjust chunk size and threshold

## Files Modified/Created

### Modified:
- `server/services/openai.ts` - Added timeout and chunking
- `migrations/0017_recipe_review_queue.sql` - Fixed UUID type

### Created:
- `migrations/0017_recipe_review_queue.sql` - Database schema
- `RECIPE_REVIEW_QUEUE_IMPLEMENTATION_PLAN.md` - Full architecture
- `RECIPE_GENERATION_TIMEOUT_FIX_SUMMARY.md` - Timeout fix details
- `RECIPE_REVIEW_QUEUE_PROGRESS.md` - This file

### To Create:
- `server/routes/admin-review-queue.ts` - API endpoints
- `client/src/pages/AdminReviewQueue.tsx` - Admin UI
- `server/services/recipeGenerator.ts` - Update for review queue

## Current System State

### ✅ Working:
- OpenAI timeout prevents indefinite hangs
- Chunking automatically splits large batches
- Database schema ready for review queue
- Helper function available for progress tracking

### ⚠️ Not Yet Implemented:
- Recipe generator doesn't use review queue yet
- No API endpoints for queue management
- No admin UI for reviewing recipes
- Image generation still blocks (not using queue)

## Commands for Next Session

```bash
# Check review queue table
docker exec fitnessmealplanner-postgres-1 psql -U postgres -d fitmeal -c "\d recipe_review_queue"

# Test batch progress function
docker exec fitnessmealplanner-postgres-1 psql -U postgres -d fitmeal -c "SELECT * FROM get_batch_progress('test-batch-id');"

# Check for recipes in review
docker exec fitnessmealplanner-postgres-1 psql -U postgres -d fitmeal -c "SELECT * FROM recipes WHERE review_status = 'in_review';"

# View review queue contents
docker exec fitnessmealplanner-postgres-1 psql -U postgres -d fitmeal -c "SELECT id, recipe_id, status, image_generation_status, batch_id FROM recipe_review_queue;"
```

## Session Summary

**Session Date:** 2025-10-06
**Duration:** ~2 hours
**Completed Tasks:** 4/6

1. ✅ OpenAI timeout configuration
2. ✅ Chunking logic implementation
3. ✅ Database migration (fixed UUID type issue)
4. ✅ Documentation and planning
5. ⏳ Recipe generator integration (next session)
6. ⏳ Admin UI development (next session)

**Key Achievement:** The timeout and chunking infrastructure is now in place. A 10-recipe batch will be automatically split into 2 chunks of 5, preventing the timeout issues that occurred before.

**Next Priority:** Integrate review queue logic into `recipeGenerator.ts` so large batches automatically route through the queue system.
