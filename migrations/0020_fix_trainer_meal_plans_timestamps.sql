-- Migration: Fix trainer_meal_plans timestamps to include timezone
-- Date: 2025-01-19
-- Purpose: Update created_at and updated_at columns to use timestamp with timezone

-- Alter created_at to use timestamp with time zone
ALTER TABLE trainer_meal_plans
ALTER COLUMN created_at TYPE timestamp with time zone
USING created_at AT TIME ZONE 'UTC';

-- Alter updated_at to use timestamp with time zone
ALTER TABLE trainer_meal_plans
ALTER COLUMN updated_at TYPE timestamp with time zone
USING updated_at AT TIME ZONE 'UTC';

-- Verify the changes
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'trainer_meal_plans'
  AND column_name IN ('created_at', 'updated_at');
