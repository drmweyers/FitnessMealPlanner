-- Migration: Create missing tables for BMAD Story implementations
-- Date: 2025-08-29
-- Purpose: Add customerMilestones and other missing tables for Story 1.4-1.7 features

-- 1. Customer Milestones table (for progress tracking)
CREATE TABLE IF NOT EXISTS "customer_milestones" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "customer_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "milestone_type" TEXT NOT NULL, -- 'weight_loss', 'strength_gain', 'consistency', 'custom'
  "title" TEXT NOT NULL,
  "description" TEXT,
  "target_value" DECIMAL(10, 2),
  "current_value" DECIMAL(10, 2),
  "unit" TEXT, -- 'kg', 'lbs', 'reps', 'days', etc.
  "target_date" TIMESTAMP,
  "achieved_date" TIMESTAMP,
  "is_achieved" BOOLEAN DEFAULT FALSE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Meal Plan Ratings table (for preference learning)
CREATE TABLE IF NOT EXISTS "meal_plan_ratings" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "customer_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "meal_plan_id" UUID NOT NULL REFERENCES "personalized_meal_plans"("id") ON DELETE CASCADE,
  "rating" INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  "feedback" TEXT,
  "rated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("customer_id", "meal_plan_id")
);

-- 3. Recipe Ratings table (for preference learning)
CREATE TABLE IF NOT EXISTS "recipe_ratings" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "customer_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "recipe_id" UUID NOT NULL REFERENCES "recipes"("id") ON DELETE CASCADE,
  "rating" INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  "feedback" TEXT,
  "rated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("customer_id", "recipe_id")
);

-- 4. Customer Preferences table (learned preferences)
CREATE TABLE IF NOT EXISTS "customer_preferences" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "customer_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "preference_type" TEXT NOT NULL, -- 'cuisine', 'ingredient', 'cooking_method', 'dietary'
  "preference_value" TEXT NOT NULL,
  "preference_score" DECIMAL(3, 2) DEFAULT 0.5, -- 0.0 to 1.0 score
  "interaction_count" INTEGER DEFAULT 0,
  "last_updated" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("customer_id", "preference_type", "preference_value")
);

-- 5. Assignment History table (tracking all assignments)
CREATE TABLE IF NOT EXISTS "assignment_history" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "trainer_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "customer_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "assignment_type" TEXT NOT NULL, -- 'meal_plan', 'recipe', 'workout', 'goal'
  "assignment_id" UUID, -- Reference to the specific item assigned
  "assignment_data" JSONB,
  "status" TEXT DEFAULT 'active', -- 'active', 'completed', 'cancelled'
  "notes" TEXT,
  "assigned_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP,
  "metadata" JSONB
);

-- 6. Customer Activity Log (for engagement tracking)
CREATE TABLE IF NOT EXISTS "customer_activity_log" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "customer_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "activity_type" TEXT NOT NULL, -- 'login', 'view_meal_plan', 'log_meal', 'update_progress', etc.
  "activity_data" JSONB,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Trainer Notes on Customers
CREATE TABLE IF NOT EXISTS "trainer_customer_notes" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "trainer_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "customer_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "note" TEXT NOT NULL,
  "note_type" TEXT, -- 'general', 'progress', 'concern', 'achievement'
  "is_private" BOOLEAN DEFAULT TRUE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. PDF Export History (tracking all PDF exports)
CREATE TABLE IF NOT EXISTS "pdf_export_history" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "export_type" TEXT NOT NULL, -- 'meal_plan', 'progress_report', 'recipe_collection'
  "export_data" JSONB,
  "file_name" TEXT,
  "file_size" INTEGER,
  "export_format" TEXT DEFAULT 'pdf',
  "status" TEXT DEFAULT 'completed', -- 'pending', 'processing', 'completed', 'failed'
  "error_message" TEXT,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Nutritional Optimization Log
CREATE TABLE IF NOT EXISTS "nutritional_optimization_log" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "meal_plan_id" UUID REFERENCES "personalized_meal_plans"("id") ON DELETE CASCADE,
  "customer_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "optimization_type" TEXT NOT NULL, -- 'macro_balance', 'calorie_adjustment', 'meal_substitution'
  "before_data" JSONB,
  "after_data" JSONB,
  "optimization_score" DECIMAL(3, 2),
  "applied" BOOLEAN DEFAULT FALSE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Meal Plan Templates (for reusable meal plans)
CREATE TABLE IF NOT EXISTS "meal_plan_templates" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "trainer_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
  "template_name" TEXT NOT NULL,
  "description" TEXT,
  "meal_plan_data" JSONB NOT NULL,
  "category" TEXT, -- 'weight_loss', 'muscle_gain', 'maintenance', 'special_diet'
  "tags" TEXT[],
  "is_public" BOOLEAN DEFAULT FALSE,
  "usage_count" INTEGER DEFAULT 0,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_milestones_customer ON customer_milestones(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_milestones_achieved ON customer_milestones(is_achieved);
CREATE INDEX IF NOT EXISTS idx_meal_plan_ratings_customer ON meal_plan_ratings(customer_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ratings_customer ON recipe_ratings(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_preferences_customer ON customer_preferences(customer_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_trainer ON assignment_history(trainer_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_customer ON assignment_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_type ON assignment_history(assignment_type);
CREATE INDEX IF NOT EXISTS idx_customer_activity_customer ON customer_activity_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_activity_type ON customer_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_trainer_notes_trainer ON trainer_customer_notes(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_notes_customer ON trainer_customer_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_pdf_export_user ON pdf_export_history(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_export_type ON pdf_export_history(export_type);
CREATE INDEX IF NOT EXISTS idx_nutritional_optimization_customer ON nutritional_optimization_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_templates_trainer ON meal_plan_templates(trainer_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_templates_public ON meal_plan_templates(is_public);

-- Add comments for documentation
COMMENT ON TABLE customer_milestones IS 'Tracks customer achievement milestones and goals';
COMMENT ON TABLE meal_plan_ratings IS 'Stores customer ratings for meal plans to learn preferences';
COMMENT ON TABLE recipe_ratings IS 'Stores customer ratings for individual recipes';
COMMENT ON TABLE customer_preferences IS 'Learned customer preferences based on interactions and ratings';
COMMENT ON TABLE assignment_history IS 'Complete history of all trainer-to-customer assignments';
COMMENT ON TABLE customer_activity_log IS 'Tracks all customer activities for engagement metrics';
COMMENT ON TABLE trainer_customer_notes IS 'Private notes trainers keep about their customers';
COMMENT ON TABLE pdf_export_history IS 'History of all PDF exports for auditing and analytics';
COMMENT ON TABLE nutritional_optimization_log IS 'Log of all AI-powered nutritional optimizations';
COMMENT ON TABLE meal_plan_templates IS 'Reusable meal plan templates created by trainers';