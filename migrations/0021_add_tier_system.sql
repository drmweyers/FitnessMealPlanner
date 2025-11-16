-- Migration: Add 3-Tier System to Recipes
-- Date: 2025-01-12
-- Story: 2.14 - Recipe Tier Filtering Technical Implementation
-- Purpose: Implement progressive recipe access by tier (starter/professional/enterprise)

-- ===================================================================
-- STEP 1: Create tier_level enum type
-- ===================================================================

DO $$ BEGIN
  CREATE TYPE tier_level AS ENUM ('starter', 'professional', 'enterprise');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ===================================================================
-- STEP 2: Add tier system columns to recipes table
-- ===================================================================

-- Add tier_level column (defaults to 'starter' for existing recipes)
ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS tier_level tier_level DEFAULT 'starter' NOT NULL;

-- Add seasonal flag (Professional+ tiers only)
ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS is_seasonal BOOLEAN DEFAULT FALSE NOT NULL;

-- Add monthly allocation tracking (format: 'YYYY-MM')
ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS allocated_month VARCHAR(7);

-- ===================================================================
-- STEP 3: Create recipe_tier_access table
-- Tracks monthly recipe allocations (+25/+50/+100 per tier)
-- ===================================================================

CREATE TABLE IF NOT EXISTS recipe_tier_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier tier_level NOT NULL,
  allocation_month VARCHAR(7) NOT NULL, -- Format: 'YYYY-MM'
  recipe_count INTEGER DEFAULT 0 NOT NULL,
  allocation_date TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ===================================================================
-- STEP 4: Create recipe_type_categories table
-- Defines meal types available to each tier (5/10/17 types)
-- ===================================================================

CREATE TABLE IF NOT EXISTS recipe_type_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  tier_level tier_level NOT NULL,
  is_seasonal BOOLEAN DEFAULT FALSE NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ===================================================================
-- STEP 5: Create indexes for tier filtering performance
-- ===================================================================

-- Tier-level index for filtering recipes by tier
CREATE INDEX IF NOT EXISTS idx_recipes_tier_level ON recipes(tier_level);

-- Compound index for tier + approval status (common query pattern)
CREATE INDEX IF NOT EXISTS idx_recipes_tier_approved ON recipes(tier_level, is_approved);

-- Seasonal recipes index
CREATE INDEX IF NOT EXISTS idx_recipes_seasonal ON recipes(is_seasonal);

-- Monthly allocation index
CREATE INDEX IF NOT EXISTS idx_recipes_allocated_month ON recipes(allocated_month);

-- Recipe tier access indexes
CREATE INDEX IF NOT EXISTS idx_recipe_tier_access_tier ON recipe_tier_access(tier);
CREATE INDEX IF NOT EXISTS idx_recipe_tier_access_month ON recipe_tier_access(allocation_month);
CREATE INDEX IF NOT EXISTS idx_recipe_tier_access_tier_month ON recipe_tier_access(tier, allocation_month);

-- Ensure one record per tier per month
CREATE UNIQUE INDEX IF NOT EXISTS recipe_tier_access_tier_month_unique
  ON recipe_tier_access(tier, allocation_month);

-- Recipe type categories indexes
CREATE INDEX IF NOT EXISTS idx_recipe_type_categories_tier ON recipe_type_categories(tier_level);
CREATE INDEX IF NOT EXISTS idx_recipe_type_categories_seasonal ON recipe_type_categories(is_seasonal);

-- ===================================================================
-- STEP 6: Seed initial recipe type categories (5/10/17 types)
-- ===================================================================

-- Starter tier: 5 basic meal types
INSERT INTO recipe_type_categories (name, display_name, tier_level, is_seasonal, sort_order)
VALUES
  ('breakfast', 'Breakfast', 'starter', FALSE, 1),
  ('lunch', 'Lunch', 'starter', FALSE, 2),
  ('dinner', 'Dinner', 'starter', FALSE, 3),
  ('snack', 'Snack', 'starter', FALSE, 4),
  ('post_workout', 'Post-Workout', 'starter', FALSE, 5)
ON CONFLICT (name) DO NOTHING;

-- Professional tier: Additional 5 types (total 10)
INSERT INTO recipe_type_categories (name, display_name, tier_level, is_seasonal, sort_order)
VALUES
  ('pre_workout', 'Pre-Workout', 'professional', FALSE, 6),
  ('keto', 'Keto', 'professional', FALSE, 7),
  ('vegan', 'Vegan', 'professional', FALSE, 8),
  ('paleo', 'Paleo', 'professional', FALSE, 9),
  ('high_protein', 'High-Protein', 'professional', FALSE, 10)
ON CONFLICT (name) DO NOTHING;

-- Enterprise tier: Additional 7 types (total 17)
INSERT INTO recipe_type_categories (name, display_name, tier_level, is_seasonal, sort_order)
VALUES
  ('gluten_free', 'Gluten-Free', 'enterprise', FALSE, 11),
  ('low_carb', 'Low-Carb', 'enterprise', FALSE, 12),
  ('mediterranean', 'Mediterranean', 'enterprise', FALSE, 13),
  ('dash', 'DASH', 'enterprise', FALSE, 14),
  ('intermittent_fasting', 'Intermittent Fasting', 'enterprise', FALSE, 15),
  ('bodybuilding', 'Bodybuilding', 'enterprise', FALSE, 16),
  ('endurance', 'Endurance', 'enterprise', FALSE, 17)
ON CONFLICT (name) DO NOTHING;

-- ===================================================================
-- STEP 7: Initialize current month allocation tracking
-- ===================================================================

-- Record initial allocation for current month (all existing recipes count as starter)
INSERT INTO recipe_tier_access (tier, allocation_month, recipe_count, allocation_date)
SELECT
  'starter'::tier_level,
  TO_CHAR(NOW(), 'YYYY-MM'),
  COUNT(*),
  NOW()
FROM recipes
WHERE tier_level = 'starter'
ON CONFLICT (tier, allocation_month) DO NOTHING;

INSERT INTO recipe_tier_access (tier, allocation_month, recipe_count, allocation_date)
VALUES
  ('professional', TO_CHAR(NOW(), 'YYYY-MM'), 0, NOW()),
  ('enterprise', TO_CHAR(NOW(), 'YYYY-MM'), 0, NOW())
ON CONFLICT (tier, allocation_month) DO NOTHING;

-- ===================================================================
-- VERIFICATION QUERIES
-- ===================================================================

-- Verify tier_level column added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'recipes'
  AND column_name IN ('tier_level', 'is_seasonal', 'allocated_month');

-- Verify recipe type categories seeded
SELECT tier_level, COUNT(*) as type_count
FROM recipe_type_categories
GROUP BY tier_level
ORDER BY
  CASE tier_level
    WHEN 'starter' THEN 1
    WHEN 'professional' THEN 2
    WHEN 'enterprise' THEN 3
  END;

-- Verify recipe tier access initialized
SELECT * FROM recipe_tier_access
ORDER BY tier;

-- Count recipes by tier
SELECT tier_level, COUNT(*) as recipe_count
FROM recipes
GROUP BY tier_level
ORDER BY
  CASE tier_level
    WHEN 'starter' THEN 1
    WHEN 'professional' THEN 2
    WHEN 'enterprise' THEN 3
  END;

-- Show all indexes on recipes table
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'recipes'
  AND indexname LIKE '%tier%'
ORDER BY indexname;
