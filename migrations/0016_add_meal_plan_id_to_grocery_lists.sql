-- Add meal_plan_id field to grocery_lists table
-- Created: 2025-01-17
-- Purpose: Support automatic grocery list generation from meal plans
-- Features: Track which meal plan generated a grocery list, prevent duplicates

BEGIN;

-- ============================================================================
-- ADD MEAL_PLAN_ID COLUMN
-- ============================================================================

-- Add meal_plan_id column to grocery_lists table
ALTER TABLE "grocery_lists"
ADD COLUMN "meal_plan_id" uuid;

-- ============================================================================
-- ADD FOREIGN KEY CONSTRAINT
-- ============================================================================

-- Reference to meal plan (optional, null if manually created)
ALTER TABLE "grocery_lists"
ADD CONSTRAINT "grocery_lists_meal_plan_id_personalized_meal_plans_id_fk"
FOREIGN KEY ("meal_plan_id") REFERENCES "public"."personalized_meal_plans"("id")
ON DELETE set null ON UPDATE no action;

-- ============================================================================
-- ADD PERFORMANCE INDEX
-- ============================================================================

-- Index for meal plan to grocery list lookups
CREATE INDEX "idx_grocery_lists_meal_plan_id"
ON "grocery_lists" USING btree ("meal_plan_id")
WHERE "meal_plan_id" IS NOT NULL;

-- Composite index for customer + meal plan queries
CREATE INDEX "idx_grocery_lists_customer_meal_plan"
ON "grocery_lists" USING btree ("customer_id", "meal_plan_id");

-- ============================================================================
-- UPDATE DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN "grocery_lists"."meal_plan_id" IS
'Optional reference to the meal plan that generated this grocery list. NULL for manually created lists.';

-- ============================================================================
-- MAINTENANCE OPERATIONS
-- ============================================================================

-- Update table statistics for better query planning
ANALYZE grocery_lists;

COMMIT;

-- ============================================================================
-- USAGE NOTES
-- ============================================================================
--
-- New Query Patterns:
-- 1. Check if grocery list exists for meal plan:
--    SELECT id FROM grocery_lists WHERE meal_plan_id = ? AND customer_id = ?
-- 2. Get grocery list for specific meal plan:
--    SELECT * FROM grocery_lists WHERE meal_plan_id = ? AND customer_id = ?
-- 3. Find orphaned grocery lists (meal plan deleted):
--    SELECT * FROM grocery_lists WHERE meal_plan_id IS NOT NULL AND meal_plan_id NOT IN (SELECT id FROM personalized_meal_plans)
-- 4. Auto-generation prevention:
--    Check existing grocery_lists.meal_plan_id before creating new list
--
-- Automatic Generation Logic:
-- - When meal plan created: Check if grocery list already exists for that meal plan
-- - If exists: Update existing list or skip generation
-- - If not exists: Create new grocery list with meal_plan_id reference
-- - Set name to "Grocery List - {Plan Name} - {Date Range}"
-- ============================================================================