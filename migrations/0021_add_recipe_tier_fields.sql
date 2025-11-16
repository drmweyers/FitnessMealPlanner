-- Add recipe tier fields to support tier-based filtering in admin recipe search
-- Fixes runtime error: column "tier_level" does not exist

BEGIN;

-- Ensure tier_level enum exists (used by subscription system)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tier_level') THEN
        CREATE TYPE tier_level AS ENUM ('starter', 'professional', 'enterprise');
    END IF;
END $$;

-- Add tier metadata columns to recipes table
ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS tier_level tier_level DEFAULT 'starter' NOT NULL;

ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS is_seasonal BOOLEAN DEFAULT FALSE NOT NULL;

ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS allocated_month VARCHAR(7);

-- Supporting indexes for tier-based queries
CREATE INDEX IF NOT EXISTS idx_recipes_tier_level
ON recipes(tier_level);

CREATE INDEX IF NOT EXISTS idx_recipes_tier_approved
ON recipes(tier_level, is_approved)
WHERE is_approved = true;

CREATE INDEX IF NOT EXISTS idx_recipes_seasonal
ON recipes(is_seasonal)
WHERE is_seasonal = true;

CREATE INDEX IF NOT EXISTS idx_recipes_allocated_month
ON recipes(allocated_month)
WHERE allocated_month IS NOT NULL;

COMMIT;

