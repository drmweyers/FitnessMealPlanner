-- Migration: Allow standalone grocery lists by making meal_plan_id optional
-- This reverses the constraint added in 0017 to allow customers to create grocery lists
-- that are not tied to meal plans (manual/standalone grocery lists)
--
-- Changes:
-- 1. Remove unique constraint on meal_plan_id
-- 2. Make meal_plan_id nullable (allow NULL)
-- 3. Remove auto-creation trigger
-- 4. Update foreign key to SET NULL on delete (instead of CASCADE)

BEGIN;

-- Step 1: Remove the unique constraint that prevents multiple lists per meal plan
-- (we still allow one-to-one but don't enforce it as a constraint)
ALTER TABLE grocery_lists
DROP CONSTRAINT IF EXISTS unique_grocery_list_per_meal_plan;

-- Step 2: Make meal_plan_id nullable to allow standalone grocery lists
ALTER TABLE grocery_lists
ALTER COLUMN meal_plan_id DROP NOT NULL;

-- Step 3: Update foreign key constraint to SET NULL on delete
-- First drop the existing constraint
ALTER TABLE grocery_lists
DROP CONSTRAINT IF EXISTS grocery_lists_meal_plan_id_fkey;

-- Add the new constraint with SET NULL (so grocery lists survive meal plan deletion)
ALTER TABLE grocery_lists
ADD CONSTRAINT grocery_lists_meal_plan_id_fkey
FOREIGN KEY (meal_plan_id)
REFERENCES personalized_meal_plans(id)
ON DELETE SET NULL;

-- Step 4: Remove the auto-creation trigger (let users create lists manually)
DROP TRIGGER IF EXISTS create_grocery_list_on_meal_plan ON personalized_meal_plans;
DROP FUNCTION IF EXISTS auto_create_grocery_list();

-- Step 5: Update the name default for standalone lists
ALTER TABLE grocery_lists
ALTER COLUMN name SET DEFAULT 'My Grocery List';

-- Step 6: Add support for different list types in comments
COMMENT ON COLUMN grocery_lists.meal_plan_id IS
'Optional reference to meal plan. NULL = standalone/manual list, NOT NULL = generated from meal plan.';

COMMENT ON TABLE grocery_lists IS
'Customer grocery lists. Can be standalone (meal_plan_id = NULL) or linked to meal plans (meal_plan_id = UUID).';

-- Step 7: Update indexes to handle NULL values efficiently
-- Replace the existing meal_plan_id index with a partial index
DROP INDEX IF EXISTS idx_grocery_lists_meal_plan_id;
CREATE INDEX idx_grocery_lists_meal_plan_id
ON grocery_lists USING btree (meal_plan_id)
WHERE meal_plan_id IS NOT NULL;

-- Add index for standalone lists (NULL meal_plan_id)
CREATE INDEX idx_grocery_lists_standalone
ON grocery_lists USING btree (customer_id, updated_at DESC)
WHERE meal_plan_id IS NULL;

-- Step 8: Update table statistics
ANALYZE grocery_lists;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================================================
/*
-- Check that we can now have NULL meal_plan_id values
SELECT
  COUNT(*) as total_lists,
  COUNT(meal_plan_id) as meal_plan_linked,
  COUNT(*) - COUNT(meal_plan_id) as standalone_lists
FROM grocery_lists;

-- Test creating a standalone grocery list
INSERT INTO grocery_lists (customer_id, name)
SELECT id, 'Test Standalone List'
FROM users
WHERE email = 'customer.test@evofitmeals.com'
LIMIT 1;

-- Verify the insert worked
SELECT id, name, meal_plan_id,
       CASE WHEN meal_plan_id IS NULL THEN 'Standalone' ELSE 'Meal Plan Linked' END as list_type
FROM grocery_lists
ORDER BY created_at DESC
LIMIT 5;
*/

-- ============================================================================
-- EXPECTED BEHAVIOR AFTER MIGRATION
-- ============================================================================
--
-- 1. Customers can create standalone grocery lists (meal_plan_id = NULL)
-- 2. Customers can still generate grocery lists from meal plans (meal_plan_id = UUID)
-- 3. Multiple grocery lists can reference the same meal plan (if needed)
-- 4. When meal plans are deleted, linked grocery lists become standalone (meal_plan_id set to NULL)
-- 5. Queries must use LEFT JOIN to include both types of lists
-- 6. API responses should handle NULL meal plan data gracefully
-- ============================================================================