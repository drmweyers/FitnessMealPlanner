-- Database Index Optimization for Customer Visibility and Performance
-- Migration: 0014_optimize_customer_visibility_indexes
-- Date: 2025-09-02
-- Purpose: Add optimized indexes for customer visibility queries and general performance

BEGIN;

-- 1. Customer visibility optimization indexes
-- These indexes are critical for trainer-customer relationship queries

-- Optimize trainer-customer lookup queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_created 
ON users(role, created_at DESC) 
WHERE role IN ('trainer', 'customer');

-- Optimize customer assignment queries (trainer can see their customers)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_invitations_trainer_accepted 
ON customer_invitations(trainer_id, accepted_at) 
WHERE accepted_at IS NOT NULL;

-- Optimize meal plan assignments by trainer and customer
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_personalized_meal_plans_trainer_customer 
ON personalized_meal_plans(trainer_id, customer_id, created_at DESC);

-- Optimize recipe assignments by trainer and customer
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_personalized_recipes_trainer_customer 
ON personalized_recipes(trainer_id, customer_id, created_at DESC);

-- 2. Performance optimization for frequently queried tables

-- Optimize recipe searches with compound indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recipes_approved_calories_protein 
ON recipes(is_approved, calories_kcal, protein_grams) 
WHERE is_approved = true;

-- Optimize recipe search by dietary tags and meal types
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recipes_approved_dietary_meal 
ON recipes USING gin(dietary_tags, meal_types) 
WHERE is_approved = true;

-- 3. User activity and session optimization

-- Optimize user login and activity tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_role_active 
ON users(email, role) 
WHERE created_at IS NOT NULL;

-- Optimize session and authentication queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_password_reset_tokens_active 
ON password_reset_tokens(email, expires_at) 
WHERE used = false;

-- 4. Engagement and analytics optimization

-- Optimize favorites queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_favorites_user_type_created 
ON favorites(user_id, favorite_type, created_at DESC);

-- Optimize rating queries for recommendations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recipe_ratings_customer_rating 
ON recipe_ratings(customer_id, rating DESC, rated_at DESC);

-- Optimize meal plan rating queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_meal_plan_ratings_customer_rating 
ON meal_plan_ratings(customer_id, rating DESC, rated_at DESC);

-- 5. Progress tracking optimization

-- Optimize progress queries by customer and date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_progress_entries_customer_date 
ON progress_entries(customer_id, recorded_at DESC);

-- Optimize milestone tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_milestones_customer_achieved 
ON customer_milestones(customer_id, is_achieved, target_date);

-- 6. Assignment and workflow optimization

-- Optimize assignment history queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assignment_history_trainer_customer_type 
ON assignment_history(trainer_id, customer_id, assignment_type, assigned_at DESC);

-- Optimize customer activity tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_activity_customer_type_date 
ON customer_activity_log(customer_id, activity_type, created_at DESC);

-- 7. Email and communication optimization

-- Optimize email preferences queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_preferences_user_enabled 
ON email_preferences(user_id) 
WHERE weekly_progress_summaries = true OR meal_plan_updates = true;

-- 8. PDF export and file tracking

-- Optimize PDF export history queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pdf_export_user_type_date 
ON pdf_export_history(user_id, export_type, created_at DESC);

-- 9. Audit and security optimization

-- Optimize audit log queries (if audit table exists)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_action_date 
ON audit_logs(user_id, action, created_at DESC) 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs');

-- 10. Partial indexes for common filtered queries

-- Optimize active user queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active_by_role 
ON users(role, created_at DESC) 
WHERE updated_at > NOW() - INTERVAL '30 days'; -- Active users

-- Optimize recent recipe queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recipes_recent_approved 
ON recipes(creation_timestamp DESC) 
WHERE is_approved = true AND creation_timestamp > NOW() - INTERVAL '7 days';

-- Optimize pending approval recipes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recipes_pending_approval 
ON recipes(creation_timestamp DESC) 
WHERE is_approved = false;

-- 11. Composite indexes for complex queries

-- Optimize trainer dashboard queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trainer_dashboard_composite 
ON personalized_meal_plans(trainer_id, created_at DESC, customer_id);

-- Optimize customer dashboard queries  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_dashboard_composite 
ON personalized_meal_plans(customer_id, created_at DESC, trainer_id);

-- 12. Text search optimization improvements

-- Add trigram extension for fuzzy text search (if not exists)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Optimize recipe name fuzzy search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recipes_name_trgm 
ON recipes USING gin(name gin_trgm_ops) 
WHERE is_approved = true;

-- Optimize user name search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_name_trgm 
ON users USING gin(name gin_trgm_ops) 
WHERE name IS NOT NULL;

-- 13. Statistics and maintenance

-- Update table statistics for query planner optimization
ANALYZE users;
ANALYZE recipes;
ANALYZE personalized_meal_plans;
ANALYZE personalized_recipes;
ANALYZE customer_invitations;
ANALYZE favorites;
ANALYZE recipe_ratings;
ANALYZE meal_plan_ratings;
ANALYZE progress_entries;
ANALYZE customer_milestones;

-- Add comments for documentation
COMMENT ON INDEX idx_users_role_created IS 'Optimizes role-based user queries with creation date sorting';
COMMENT ON INDEX idx_customer_invitations_trainer_accepted IS 'Optimizes trainer-customer relationship queries';
COMMENT ON INDEX idx_personalized_meal_plans_trainer_customer IS 'Optimizes meal plan assignment queries';
COMMENT ON INDEX idx_recipes_approved_calories_protein IS 'Optimizes recipe search by nutritional values';
COMMENT ON INDEX idx_favorites_user_type_created IS 'Optimizes user favorites queries with type filtering';
COMMENT ON INDEX idx_progress_entries_customer_date IS 'Optimizes customer progress tracking queries';
COMMENT ON INDEX idx_assignment_history_trainer_customer_type IS 'Optimizes trainer assignment workflow queries';
COMMENT ON INDEX idx_recipes_name_trgm IS 'Enables fuzzy text search on recipe names';

COMMIT;

-- Note: CONCURRENTLY indexes are created without blocking reads/writes
-- This migration can be run safely in production