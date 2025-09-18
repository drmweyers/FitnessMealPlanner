-- Migration: Make grocery lists strictly tied to meal plans
-- Each grocery list MUST belong to an active meal plan
-- When a meal plan is deleted, its grocery list is automatically deleted

BEGIN;

-- Step 1: Delete all grocery lists that don't have a valid meal plan
DELETE FROM grocery_lists
WHERE meal_plan_id IS NULL
   OR meal_plan_id NOT IN (
     SELECT id FROM personalized_meal_plans
   );

-- Step 2: Make meal_plan_id NOT NULL (required field)
ALTER TABLE grocery_lists
ALTER COLUMN meal_plan_id SET NOT NULL;

-- Step 3: Update the foreign key constraint to CASCADE on delete
-- First drop the existing constraint if it exists
ALTER TABLE grocery_lists
DROP CONSTRAINT IF EXISTS grocery_lists_meal_plan_id_fkey;

-- Add the new constraint with CASCADE DELETE
ALTER TABLE grocery_lists
ADD CONSTRAINT grocery_lists_meal_plan_id_fkey
FOREIGN KEY (meal_plan_id)
REFERENCES personalized_meal_plans(id)
ON DELETE CASCADE;

-- Step 4: Add a unique constraint to ensure one grocery list per meal plan
ALTER TABLE grocery_lists
ADD CONSTRAINT unique_grocery_list_per_meal_plan
UNIQUE (meal_plan_id);

-- Step 5: Create a trigger to auto-generate grocery list when meal plan is created
CREATE OR REPLACE FUNCTION auto_create_grocery_list()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically create a grocery list for the new meal plan
  INSERT INTO grocery_lists (
    customer_id,
    meal_plan_id,
    name,
    is_active
  ) VALUES (
    NEW.customer_id,
    NEW.id,
    'Meal Plan Grocery List',
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS create_grocery_list_on_meal_plan ON personalized_meal_plans;
CREATE TRIGGER create_grocery_list_on_meal_plan
AFTER INSERT ON personalized_meal_plans
FOR EACH ROW
EXECUTE FUNCTION auto_create_grocery_list();

-- Step 6: Clean up duplicate grocery lists for same meal plan (keep the one with most items)
WITH ranked_lists AS (
  SELECT
    id,
    meal_plan_id,
    ROW_NUMBER() OVER (
      PARTITION BY meal_plan_id
      ORDER BY (
        SELECT COUNT(*) FROM grocery_list_items WHERE grocery_list_id = grocery_lists.id
      ) DESC,
      created_at ASC
    ) as rn
  FROM grocery_lists
)
DELETE FROM grocery_lists
WHERE id IN (
  SELECT id FROM ranked_lists WHERE rn > 1
);

COMMIT;

-- Verification queries (run these after migration to confirm)
/*
-- Check that all grocery lists have meal plans
SELECT COUNT(*) as orphaned_lists
FROM grocery_lists gl
WHERE NOT EXISTS (
  SELECT 1 FROM personalized_meal_plans mp
  WHERE mp.id = gl.meal_plan_id
);

-- Check one list per meal plan
SELECT meal_plan_id, COUNT(*) as list_count
FROM grocery_lists
GROUP BY meal_plan_id
HAVING COUNT(*) > 1;

-- Check that all active meal plans have grocery lists
SELECT COUNT(*) as meal_plans_without_lists
FROM personalized_meal_plans mp
WHERE NOT EXISTS (
  SELECT 1 FROM grocery_lists gl
  WHERE gl.meal_plan_id = mp.id
);
*/