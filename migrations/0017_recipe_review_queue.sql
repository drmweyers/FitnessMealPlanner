-- Migration 0017: Recipe Review Queue System
-- Purpose: Add review queue infrastructure for large batch recipe generation
-- Date: 2025-10-06

-- =====================================================
-- Step 1: Add review_status column to recipes table
-- =====================================================
ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS review_status VARCHAR DEFAULT 'approved';

COMMENT ON COLUMN recipes.review_status IS
'Status of recipe in review workflow: draft, in_review, approved, rejected. Default is approved for backward compatibility.';

-- =====================================================
-- Step 2: Create recipe_review_queue table
-- =====================================================
CREATE TABLE IF NOT EXISTS recipe_review_queue (
  id SERIAL PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,

  -- Queue status workflow
  status VARCHAR NOT NULL DEFAULT 'pending_images',
  -- Values: 'pending_images', 'ready_for_review', 'approved', 'rejected'

  -- Image generation tracking
  image_generation_status VARCHAR DEFAULT 'pending',
  -- Values: 'pending', 'in_progress', 'completed', 'failed'

  -- Batch grouping
  batch_id VARCHAR NOT NULL,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,

  -- Review metadata
  reviewed_by UUID REFERENCES users(id),
  rejection_reason TEXT,

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('pending_images', 'ready_for_review', 'approved', 'rejected')),
  CONSTRAINT valid_image_status CHECK (image_generation_status IN ('pending', 'in_progress', 'completed', 'failed'))
);

-- =====================================================
-- Step 3: Create indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_review_queue_status
ON recipe_review_queue(status);

CREATE INDEX IF NOT EXISTS idx_review_queue_batch
ON recipe_review_queue(batch_id);

CREATE INDEX IF NOT EXISTS idx_review_queue_recipe
ON recipe_review_queue(recipe_id);

CREATE INDEX IF NOT EXISTS idx_review_queue_created_at
ON recipe_review_queue(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recipes_review_status
ON recipes(review_status);

-- =====================================================
-- Step 4: Add comments for documentation
-- =====================================================
COMMENT ON TABLE recipe_review_queue IS
'Queue for managing review and approval of batch-generated recipes. Large batches (>5 recipes) are held here until images are generated and admin approves.';

COMMENT ON COLUMN recipe_review_queue.status IS
'Current status: pending_images (waiting for DALL-E), ready_for_review (images complete), approved (admin approved), rejected (admin rejected)';

COMMENT ON COLUMN recipe_review_queue.image_generation_status IS
'Image generation progress: pending, in_progress, completed, failed';

COMMENT ON COLUMN recipe_review_queue.batch_id IS
'UUID grouping recipes from the same generation request for batch operations';

-- =====================================================
-- Step 5: Create helper function for batch progress
-- =====================================================
CREATE OR REPLACE FUNCTION get_batch_progress(p_batch_id VARCHAR)
RETURNS TABLE (
  total_recipes INTEGER,
  images_generated INTEGER,
  images_in_progress INTEGER,
  images_failed INTEGER,
  ready_for_review INTEGER,
  approved INTEGER,
  rejected INTEGER,
  percent_complete NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS total_recipes,
    COUNT(*) FILTER (WHERE image_generation_status = 'completed')::INTEGER AS images_generated,
    COUNT(*) FILTER (WHERE image_generation_status = 'in_progress')::INTEGER AS images_in_progress,
    COUNT(*) FILTER (WHERE image_generation_status = 'failed')::INTEGER AS images_failed,
    COUNT(*) FILTER (WHERE status = 'ready_for_review')::INTEGER AS ready_for_review,
    COUNT(*) FILTER (WHERE status = 'approved')::INTEGER AS approved,
    COUNT(*) FILTER (WHERE status = 'rejected')::INTEGER AS rejected,
    ROUND(
      (COUNT(*) FILTER (WHERE image_generation_status = 'completed')::NUMERIC /
       NULLIF(COUNT(*), 0)) * 100,
      2
    ) AS percent_complete
  FROM recipe_review_queue
  WHERE batch_id = p_batch_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_batch_progress(VARCHAR) IS
'Returns progress statistics for a recipe generation batch by batch_id';

-- =====================================================
-- Migration complete
-- =====================================================
