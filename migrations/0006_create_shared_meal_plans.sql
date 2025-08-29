-- Migration: Create shared_meal_plans table for meal plan sharing functionality
-- Created: 2025-01-21

-- Create shared_meal_plans table
CREATE TABLE IF NOT EXISTS "shared_meal_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meal_plan_id" uuid NOT NULL,
	"share_token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"expires_at" timestamp,
	"created_by" uuid NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shared_meal_plans_share_token_unique" UNIQUE("share_token")
);

-- Add foreign key constraints
ALTER TABLE "shared_meal_plans" ADD CONSTRAINT "shared_meal_plans_meal_plan_id_trainer_meal_plans_id_fk" FOREIGN KEY ("meal_plan_id") REFERENCES "trainer_meal_plans"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "shared_meal_plans" ADD CONSTRAINT "shared_meal_plans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;

-- Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS "shared_meal_plans_meal_plan_id_idx" ON "shared_meal_plans" ("meal_plan_id");
CREATE INDEX IF NOT EXISTS "shared_meal_plans_share_token_idx" ON "shared_meal_plans" ("share_token");
CREATE INDEX IF NOT EXISTS "shared_meal_plans_created_by_idx" ON "shared_meal_plans" ("created_by");
CREATE INDEX IF NOT EXISTS "shared_meal_plans_expires_at_idx" ON "shared_meal_plans" ("expires_at");
CREATE INDEX IF NOT EXISTS "shared_meal_plans_is_active_idx" ON "shared_meal_plans" ("is_active");

-- Create a partial unique index to ensure only one active share per meal plan
CREATE UNIQUE INDEX IF NOT EXISTS "shared_meal_plans_one_active_per_plan" ON "shared_meal_plans" ("meal_plan_id") WHERE "is_active" = true;

-- Add a comment to explain the table purpose
COMMENT ON TABLE "shared_meal_plans" IS 'Stores shareable links for meal plans created by trainers. Allows public access to meal plans without authentication.';
COMMENT ON COLUMN "shared_meal_plans"."share_token" IS 'UUID token used in shareable URLs. Must be unique and secure.';
COMMENT ON COLUMN "shared_meal_plans"."expires_at" IS 'Optional expiration date for the share link. NULL means no expiration.';
COMMENT ON COLUMN "shared_meal_plans"."view_count" IS 'Tracks how many times the shared meal plan has been viewed.';
COMMENT ON COLUMN "shared_meal_plans"."is_active" IS 'Whether the share link is currently active. Allows disabling without deletion.';