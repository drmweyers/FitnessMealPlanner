-- Migration 0016 Verification Report
-- Database: fitnessmealplanner
-- Date: 2025-01-17
-- Purpose: Verify successful implementation of meal_plan_id in grocery_lists

-- ============================================================================
-- TABLE STRUCTURE VERIFICATION
-- ============================================================================

-- Check table structure includes new column
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'grocery_lists'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS VERIFICATION
-- ============================================================================

-- Verify foreign key constraints
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'grocery_lists';

-- ============================================================================
-- INDEX VERIFICATION
-- ============================================================================

-- Check all indexes on grocery_lists table
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'grocery_lists'
ORDER BY indexname;

-- ============================================================================
-- DATA INTEGRITY VERIFICATION
-- ============================================================================

-- Check existing data integrity
SELECT
    COUNT(*) as total_grocery_lists,
    COUNT(meal_plan_id) as linked_to_meal_plans,
    COUNT(*) - COUNT(meal_plan_id) as manual_lists
FROM grocery_lists;

-- ============================================================================
-- PERFORMANCE INDEX USAGE CHECK
-- ============================================================================

-- Verify partial index exists and is valid
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE indexname IN (
    'idx_grocery_lists_meal_plan_id',
    'idx_grocery_lists_customer_meal_plan'
);

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================
--
-- TABLE STRUCTURE:
-- Should show meal_plan_id column of type uuid, nullable
--
-- FOREIGN KEYS:
-- 1. grocery_lists_customer_id_users_id_fk -> users(id) CASCADE/CASCADE
-- 2. grocery_lists_meal_plan_id_personalized_meal_plans_id_fk -> personalized_meal_plans(id) NO ACTION/SET NULL
--
-- INDEXES:
-- 1. grocery_lists_pkey (PRIMARY KEY)
-- 2. idx_grocery_lists_meal_plan_id (WHERE meal_plan_id IS NOT NULL)
-- 3. idx_grocery_lists_customer_meal_plan (customer_id, meal_plan_id)
--
-- DATA INTEGRITY:
-- All existing records should have meal_plan_id = NULL (no data loss)
--
-- ============================================================================