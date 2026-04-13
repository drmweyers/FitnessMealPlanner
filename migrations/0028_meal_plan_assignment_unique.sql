-- Migration 0028: Unique constraint on meal_plan_assignments(meal_plan_id, customer_id)
--
-- Hotfix B8: Without this constraint, a trainer who clicks "assign" twice
-- (or two browser tabs racing) creates duplicate assignment rows silently.
-- The customer then sees the same plan twice in their list. Sprint 3 warfare
-- audit (SEC-004) flagged this as a medium-severity data integrity issue.
--
-- This migration:
--   1. Removes any pre-existing duplicate rows, keeping the OLDEST assignment
--      (the original "real" one) for each (meal_plan_id, customer_id) pair.
--   2. Adds a unique index. Future double-assigns return a constraint error
--      (handled by the route as 409 Conflict / no-op).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'meal_plan_assignments'
  ) THEN
    -- 1. Dedupe — keep the earliest assignment per (plan, customer)
    EXECUTE $sql$
      DELETE FROM meal_plan_assignments a
      USING meal_plan_assignments b
      WHERE a.meal_plan_id = b.meal_plan_id
        AND a.customer_id = b.customer_id
        AND a.assigned_at > b.assigned_at
    $sql$;

    -- Edge case: identical timestamps. Keep the smallest id.
    EXECUTE $sql$
      DELETE FROM meal_plan_assignments a
      USING meal_plan_assignments b
      WHERE a.meal_plan_id = b.meal_plan_id
        AND a.customer_id = b.customer_id
        AND a.assigned_at = b.assigned_at
        AND a.id > b.id
    $sql$;

    -- 2. Add the unique index (idempotent — IF NOT EXISTS)
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS meal_plan_assignments_plan_customer_uniq ON meal_plan_assignments (meal_plan_id, customer_id)';
  END IF;
END $$;
