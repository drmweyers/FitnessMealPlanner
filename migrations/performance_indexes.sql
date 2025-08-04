-- Performance Optimization Indexes Migration
-- This migration adds indexes to improve query performance across the application

-- Users table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;

-- Recipes table indexes for search and filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recipes_approved ON recipes(is_approved);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recipes_creation_timestamp ON recipes(creation_timestamp DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recipes_calories ON recipes(calories_kcal);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recipes_prep_time ON recipes(prep_time_minutes);

-- JSONB indexes for array searches (meal types, dietary tags)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recipes_meal_types_gin ON recipes USING gin(meal_types);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recipes_dietary_tags_gin ON recipes USING gin(dietary_tags);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recipes_ingredients_gin ON recipes USING gin(ingredients_json);

-- Full-text search index for recipe name and description
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recipes_search_text ON recipes USING gin(
  to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
);

-- Personalized recipes indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_personalized_recipes_customer ON personalized_recipes(customer_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_personalized_recipes_trainer ON personalized_recipes(trainer_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_personalized_recipes_recipe ON personalized_recipes(recipe_id);  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_personalized_recipes_assigned_at ON personalized_recipes(assigned_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_personalized_recipes_trainer_customer ON personalized_recipes(trainer_id, customer_id);

-- Personalized meal plans indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_personalized_meal_plans_customer ON personalized_meal_plans(customer_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_personalized_meal_plans_trainer ON personalized_meal_plans(trainer_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_personalized_meal_plans_assigned_at ON personalized_meal_plans(assigned_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_personalized_meal_plans_trainer_customer ON personalized_meal_plans(trainer_id, customer_id);

-- Trainer meal plans indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trainer_meal_plans_trainer ON trainer_meal_plans(trainer_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trainer_meal_plans_created_at ON trainer_meal_plans(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trainer_meal_plans_template ON trainer_meal_plans(is_template) WHERE is_template = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trainer_meal_plans_tags_gin ON trainer_meal_plans USING gin(tags);

-- Meal plan assignments indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_meal_plan_assignments_meal_plan ON meal_plan_assignments(meal_plan_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_meal_plan_assignments_customer ON meal_plan_assignments(customer_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_meal_plan_assignments_assigned_by ON meal_plan_assignments(assigned_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_meal_plan_assignments_assigned_at ON meal_plan_assignments(assigned_at DESC);

-- Customer invitations indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_invitations_trainer ON customer_invitations(trainer_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_invitations_token ON customer_invitations(token);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_invitations_email ON customer_invitations(customer_email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_invitations_expires_at ON customer_invitations(expires_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_invitations_used_at ON customer_invitations(used_at) WHERE used_at IS NOT NULL;

-- Password reset tokens indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Refresh tokens indexes  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Progress tracking indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_progress_measurements_customer ON progress_measurements(customer_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_progress_measurements_date ON progress_measurements(measurement_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_progress_photos_customer ON progress_photos(customer_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_progress_photos_date ON progress_photos(photo_date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_progress_photos_type ON progress_photos(photo_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_goals_customer ON customer_goals(customer_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_goals_status ON customer_goals(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_goals_target_date ON customer_goals(target_date) WHERE target_date IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_goal_milestones_goal ON goal_milestones(goal_id);

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recipes_approved_creation ON recipes(is_approved, creation_timestamp DESC) WHERE is_approved = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recipes_calories_protein ON recipes(calories_kcal, protein_grams) WHERE is_approved = true;

-- Analyze tables after index creation to update statistics
ANALYZE users;
ANALYZE recipes;  
ANALYZE personalized_recipes;
ANALYZE personalized_meal_plans;
ANALYZE trainer_meal_plans;
ANALYZE meal_plan_assignments;
ANALYZE customer_invitations;
ANALYZE password_reset_tokens;
ANALYZE refresh_tokens;
ANALYZE progress_measurements;
ANALYZE progress_photos;
ANALYZE customer_goals;
ANALYZE goal_milestones;