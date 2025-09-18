-- Rollback script for migration 0016
-- Removes meal_plan_id column and related constraints/indexes from grocery_lists table
-- Created: 2025-01-17
-- Purpose: Revert automatic grocery list generation tracking feature

BEGIN;

-- ============================================================================
-- REMOVE INDEXES
-- ============================================================================

-- Remove performance indexes
DROP INDEX IF EXISTS "idx_grocery_lists_meal_plan_id";
DROP INDEX IF EXISTS "idx_grocery_lists_customer_meal_plan";

-- ============================================================================
-- REMOVE FOREIGN KEY CONSTRAINT
-- ============================================================================

-- Remove foreign key constraint to personalized_meal_plans
ALTER TABLE "grocery_lists"
DROP CONSTRAINT IF EXISTS "grocery_lists_meal_plan_id_personalized_meal_plans_id_fk";

-- ============================================================================
-- REMOVE COLUMN
-- ============================================================================

-- Remove meal_plan_id column
ALTER TABLE "grocery_lists"
DROP COLUMN IF EXISTS "meal_plan_id";

-- ============================================================================
-- MAINTENANCE OPERATIONS
-- ============================================================================

-- Update table statistics after structural changes
ANALYZE grocery_lists;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
--
-- After rollback, verify changes:
-- 1. Check table structure: \d grocery_lists
-- 2. Verify column removed: SELECT column_name FROM information_schema.columns WHERE table_name = 'grocery_lists';
-- 3. Check constraints removed: SELECT conname FROM pg_constraint WHERE conrelid = 'grocery_lists'::regclass;
-- 4. Check indexes removed: SELECT indexname FROM pg_indexes WHERE tablename = 'grocery_lists';
--
-- ============================================================================