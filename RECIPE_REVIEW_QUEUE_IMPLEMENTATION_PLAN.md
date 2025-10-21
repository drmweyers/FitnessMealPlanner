# Recipe Review Queue Implementation Plan

## Overview
System to handle large batch recipe generation by using a review queue where recipes wait for image generation before admin approval.

## Architecture

### 1. Review Queue Flow

```
User Generates Large Batch (>5 recipes)
    ↓
Recipes created with placeholder images → Review Queue (status: 'pending_images')
    ↓
Background image generation starts
    ↓
As each image completes → Recipe status: 'ready_for_review'
    ↓
Admin reviews and approves → Recipe status: 'approved' → Main database
```

### 2. Database Schema Changes

#### New Table: `recipe_review_queue`
```sql
CREATE TABLE recipe_review_queue (
  id SERIAL PRIMARY KEY,
  recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
  status VARCHAR NOT NULL, -- 'pending_images', 'ready_for_review', 'approved', 'rejected'
  image_generation_status VARCHAR, -- 'pending', 'in_progress', 'completed', 'failed'
  batch_id VARCHAR NOT NULL, -- Groups recipes from same generation
  created_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  reviewed_by UUID REFERENCES users(id),
  rejection_reason TEXT
);

CREATE INDEX idx_review_queue_status ON recipe_review_queue(status);
CREATE INDEX idx_review_queue_batch ON recipe_review_queue(batch_id);
```

#### Update `recipes` table
```sql
ALTER TABLE recipes ADD COLUMN review_status VARCHAR DEFAULT 'approved';
-- 'draft', 'in_review', 'approved', 'rejected'
```

### 3. Generation Logic

**Small Batches (≤5 recipes):**
- Generate normally with immediate image generation
- Save directly to main database
- Current behavior maintained

**Large Batches (>5 recipes):**
1. Split into chunks of 5
2. For each chunk:
   - Generate recipes via OpenAI
   - Save to recipes table with `review_status = 'in_review'`
   - Create review queue entry with `status = 'pending_images'`
   - Start background image generation
3. As images complete:
   - Update recipe image_url
   - Update queue entry: `status = 'ready_for_review'`, `image_generation_status = 'completed'`

### 4. Admin Review Interface

**New Admin Page: `/admin/review-queue`**

Components:
- **Progress Bar:** Shows `X / Y images generated` for current batch
- **Recipe Cards:** Display recipes with status badges
- **Actions:** Approve, Reject, Edit
- **Filters:** By status, batch, date

### 5. API Endpoints

```typescript
// Get review queue items
GET /api/admin/review-queue
  ?status=pending_images|ready_for_review|all
  &batchId=xxx

// Get batch progress
GET /api/admin/review-queue/batch/:batchId/progress
Response: { total: 10, imagesComplete: 7, readyForReview: 5 }

// Approve recipe
POST /api/admin/review-queue/:id/approve

// Reject recipe
POST /api/admin/review-queue/:id/reject
Body: { reason: string }

// Bulk approve batch
POST /api/admin/review-queue/batch/:batchId/approve-all
```

### 6. Progress Tracking

**Real-time updates via:**
- Polling every 5 seconds when batch is active
- WebSocket (future enhancement)

**Progress calculation:**
```typescript
{
  batchId: string,
  totalRecipes: number,
  imagesGenerated: number,
  imagesInProgress: number,
  imagesFailed: number,
  readyForReview: number,
  approved: number,
  percentComplete: number
}
```

### 7. Image Generation Worker

Background service that:
1. Picks up recipes with `image_generation_status = 'pending'`
2. Generates image via DALL-E
3. Uploads to S3 (if configured) or uses OpenAI URL
4. Updates recipe and queue entry
5. Handles retries for failures (max 3 attempts)

### 8. User Experience

**Trainer/User:**
- Submits large batch request
- Sees immediate confirmation: "Generating 20 recipes... This may take a few minutes"
- Progress indicator shows: "5/20 recipes ready for admin review"
- Notification when all recipes are ready for admin approval

**Admin:**
- Receives notification: "20 new recipes awaiting review"
- Opens review queue dashboard
- Sees progress: "15/20 images generated"
- Reviews recipes as they become ready
- Bulk approve when satisfied

### 9. Configuration

```typescript
// server/config/recipeGeneration.ts
export const RECIPE_GEN_CONFIG = {
  CHUNK_SIZE: 5,
  USE_REVIEW_QUEUE_THRESHOLD: 5, // Batches > 5 use review queue
  IMAGE_GENERATION_TIMEOUT: 30000,
  MAX_IMAGE_RETRY_ATTEMPTS: 3,
  PROGRESS_POLL_INTERVAL: 5000
};
```

### 10. Rollout Plan

**Phase 1: Backend (Current)**
- ✅ Add timeout to OpenAI client
- [ ] Create database migration
- [ ] Update recipe generator with chunking
- [ ] Implement review queue logic
- [ ] Create admin API endpoints

**Phase 2: Frontend**
- [ ] Admin review queue page
- [ ] Progress bar component
- [ ] Recipe review cards
- [ ] Approve/reject actions

**Phase 3: Background Worker**
- [ ] Image generation queue processor
- [ ] Retry logic
- [ ] Status notifications

**Phase 4: Testing & Polish**
- [ ] Test with 10, 20, 50 recipe batches
- [ ] Performance optimization
- [ ] Error handling improvements

## Benefits

1. **No Timeouts:** Chunking prevents OpenAI timeout issues
2. **Better UX:** Users see immediate feedback, admins control quality
3. **Scalability:** Can handle 100+ recipe batches
4. **Quality Control:** Admin reviews before recipes go live
5. **Transparency:** Clear progress tracking

## Migration Strategy

Existing recipes are unaffected (they have `review_status = 'approved'`).
Review queue only applies to new large batch generations.
