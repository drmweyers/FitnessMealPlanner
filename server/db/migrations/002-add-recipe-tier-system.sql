-- Recipe Tier System Implementation
-- Created: 2025-02-01
-- Story: 2.14 - Recipe Tier Filtering Technical Implementation
-- Purpose: Enable progressive recipe access based on tier level (Starter: 1,000 | Professional: 2,500 | Enterprise: 4,000)

BEGIN;

-- ============================================================================
-- ENUM TYPE: tier_level (if not exists)
-- ============================================================================
-- This enum should already exist from the subscription system
-- Adding safety check to avoid errors if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tier_level') THEN
        CREATE TYPE tier_level AS ENUM ('starter', 'professional', 'enterprise');
    END IF;
END $$;

-- ============================================================================
-- RECIPES TABLE MODIFICATIONS
-- ============================================================================

-- Add tier_level column (default: starter for existing recipes)
ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS tier_level tier_level DEFAULT 'starter' NOT NULL;

-- Add seasonal recipe flag
ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS is_seasonal BOOLEAN DEFAULT FALSE NOT NULL;

-- Add monthly allocation tracking (format: 'YYYY-MM')
ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS allocated_month VARCHAR(7);

-- Add index for tier-based filtering (critical for performance)
CREATE INDEX IF NOT EXISTS idx_recipes_tier_level
ON recipes(tier_level);

-- Composite index for tier + approval filtering (most common query)
CREATE INDEX IF NOT EXISTS idx_recipes_tier_approved
ON recipes(tier_level, is_approved)
WHERE is_approved = true;

-- Index for seasonal recipe queries
CREATE INDEX IF NOT EXISTS idx_recipes_seasonal
ON recipes(is_seasonal)
WHERE is_seasonal = true;

-- Index for monthly allocation tracking
CREATE INDEX IF NOT EXISTS idx_recipes_allocated_month
ON recipes(allocated_month)
WHERE allocated_month IS NOT NULL;

-- ============================================================================
-- RECIPE TIER ACCESS TABLE
-- ============================================================================
-- Tracks monthly recipe allocations to each tier
-- Used for the +25/+50/+100 monthly recipe additions

CREATE TABLE IF NOT EXISTS recipe_tier_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier tier_level NOT NULL,
  allocation_month VARCHAR(7) NOT NULL, -- Format: 'YYYY-MM' (e.g., '2025-02')
  recipe_count INTEGER NOT NULL DEFAULT 0, -- Number of recipes allocated this month
  allocation_date TIMESTAMP DEFAULT NOW() NOT NULL,

  -- Ensure one record per tier per month
  UNIQUE(tier, allocation_month)
);

-- Index for querying allocations by tier
CREATE INDEX IF NOT EXISTS idx_recipe_tier_access_tier
ON recipe_tier_access(tier);

-- Index for querying allocations by month
CREATE INDEX IF NOT EXISTS idx_recipe_tier_access_month
ON recipe_tier_access(allocation_month);

-- Composite index for tier + month queries
CREATE INDEX IF NOT EXISTS idx_recipe_tier_access_tier_month
ON recipe_tier_access(tier, allocation_month DESC);

-- ============================================================================
-- RECIPE TYPE CATEGORIES TABLE
-- ============================================================================
-- Defines meal types available to each tier (5/10/17 types)

CREATE TABLE IF NOT EXISTS recipe_type_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE, -- e.g., 'Breakfast', 'Keto', 'Vegan'
  display_name VARCHAR(100) NOT NULL, -- User-friendly name
  tier_level tier_level NOT NULL, -- Minimum tier required
  is_seasonal BOOLEAN DEFAULT FALSE NOT NULL,
  sort_order INTEGER DEFAULT 0, -- For UI ordering
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Index for tier-based filtering
CREATE INDEX IF NOT EXISTS idx_recipe_type_categories_tier
ON recipe_type_categories(tier_level);

-- Index for seasonal types
CREATE INDEX IF NOT EXISTS idx_recipe_type_categories_seasonal
ON recipe_type_categories(is_seasonal)
WHERE is_seasonal = true;

-- ============================================================================
-- SEED DATA: Recipe Type Categories (17 meal types)
-- ============================================================================

-- Starter Tier (5 meal types)
INSERT INTO recipe_type_categories (name, display_name, tier_level, sort_order) VALUES
  ('breakfast', 'Breakfast', 'starter', 1),
  ('lunch', 'Lunch', 'starter', 2),
  ('dinner', 'Dinner', 'starter', 3),
  ('snack', 'Snack', 'starter', 4),
  ('post-workout', 'Post-Workout', 'starter', 5)
ON CONFLICT (name) DO NOTHING;

-- Professional Tier (Additional 5 meal types = 10 total)
INSERT INTO recipe_type_categories (name, display_name, tier_level, sort_order) VALUES
  ('pre-workout', 'Pre-Workout', 'professional', 6),
  ('keto', 'Keto', 'professional', 7),
  ('vegan', 'Vegan', 'professional', 8),
  ('paleo', 'Paleo', 'professional', 9),
  ('high-protein', 'High-Protein', 'professional', 10)
ON CONFLICT (name) DO NOTHING;

-- Enterprise Tier (Additional 7 meal types = 17 total)
INSERT INTO recipe_type_categories (name, display_name, tier_level, sort_order) VALUES
  ('gluten-free', 'Gluten-Free', 'enterprise', 11),
  ('low-carb', 'Low-Carb', 'enterprise', 12),
  ('mediterranean', 'Mediterranean', 'enterprise', 13),
  ('dash', 'DASH Diet', 'enterprise', 14),
  ('intermittent-fasting', 'Intermittent Fasting', 'enterprise', 15),
  ('bodybuilding', 'Bodybuilding', 'enterprise', 16),
  ('endurance', 'Endurance Athlete', 'enterprise', 17)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- INITIAL DATA: Recipe Tier Allocation Tracking
-- ============================================================================
-- Initialize current month allocations for all tiers

DO $$
DECLARE
  current_month VARCHAR(7) := TO_CHAR(NOW(), 'YYYY-MM');
BEGIN
  INSERT INTO recipe_tier_access (tier, allocation_month, recipe_count, allocation_date) VALUES
    ('starter', current_month, 0, NOW()),
    ('professional', current_month, 0, NOW()),
    ('enterprise', current_month, 0, NOW())
  ON CONFLICT (tier, allocation_month) DO NOTHING;
END $$;

-- ============================================================================
-- MAINTENANCE OPERATIONS
-- ============================================================================

-- Update table statistics for better query planning
ANALYZE recipes;
ANALYZE recipe_tier_access;
ANALYZE recipe_type_categories;

-- ============================================================================
-- VERIFICATION QUERIES (for testing)
-- ============================================================================

-- Verify tier_level column exists and has default value
-- SELECT COUNT(*) FROM recipes WHERE tier_level = 'starter';

-- Verify recipe_type_categories seed data (should be 17 rows)
-- SELECT tier_level, COUNT(*) as type_count FROM recipe_type_categories GROUP BY tier_level;

-- Verify indexes were created
-- SELECT indexname FROM pg_indexes WHERE tablename = 'recipes' AND indexname LIKE 'idx_recipes_tier%';

COMMIT;

-- ============================================================================
-- ROLLBACK SCRIPT (for reference, do not execute)
-- ============================================================================
--
-- BEGIN;
-- DROP INDEX IF EXISTS idx_recipes_tier_level;
-- DROP INDEX IF EXISTS idx_recipes_tier_approved;
-- DROP INDEX IF EXISTS idx_recipes_seasonal;
-- DROP INDEX IF EXISTS idx_recipes_allocated_month;
-- DROP TABLE IF EXISTS recipe_tier_access CASCADE;
-- DROP TABLE IF EXISTS recipe_type_categories CASCADE;
-- ALTER TABLE recipes DROP COLUMN IF EXISTS tier_level;
-- ALTER TABLE recipes DROP COLUMN IF EXISTS is_seasonal;
-- ALTER TABLE recipes DROP COLUMN IF EXISTS allocated_month;
-- COMMIT;
--
-- ============================================================================
