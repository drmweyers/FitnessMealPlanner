-- Recipe Favoriting System + User Engagement + Social Features + Recommendations Migration
-- This migration adds comprehensive support for:
-- 1. Recipe favorites and collections
-- 2. User engagement analytics 
-- 3. Social features and trending content
-- 4. AI/ML recommendation engine

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE "public"."favorite_type" AS ENUM('standard', 'want_to_try', 'made_it', 'love_it');--> statement-breakpoint
CREATE TYPE "public"."interaction_type" AS ENUM('view', 'click', 'favorite', 'unfavorite', 'share', 'print', 'pdf_export', 'ingredient_copy', 'instruction_expand', 'nutrition_view', 'time_spent', 'scroll_depth', 'search', 'filter_applied');--> statement-breakpoint
CREATE TYPE "public"."rating_value" AS ENUM('1', '2', '3', '4', '5');--> statement-breakpoint
CREATE TYPE "public"."share_type" AS ENUM('link', 'social_media', 'email', 'message', 'copy_link', 'qr_code', 'print', 'screenshot');--> statement-breakpoint
CREATE TYPE "public"."content_type" AS ENUM('recipe', 'collection', 'user_profile', 'meal_plan');--> statement-breakpoint
CREATE TYPE "public"."recommendation_algorithm" AS ENUM('collaborative_filtering', 'content_based', 'popularity_based', 'hybrid', 'dietary_preference', 'seasonal', 'time_based', 'social', 'ai_generated');--> statement-breakpoint
CREATE TYPE "public"."recommendation_reason" AS ENUM('similar_users_liked', 'ingredients_you_like', 'matches_diet', 'trending_now', 'friends_favorite', 'seasonal_ingredient', 'quick_meal', 'similar_cuisine', 'nutritional_goal', 'recently_viewed');--> statement-breakpoint
CREATE TYPE "public"."feedback_type" AS ENUM('positive', 'negative', 'clicked', 'favorited', 'shared', 'dismissed', 'hidden');--> statement-breakpoint

-- =============================================================================
-- FAVORITES SYSTEM TABLES
-- =============================================================================

CREATE TABLE "recipe_favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"recipe_id" uuid NOT NULL,
	"favorite_type" "favorite_type" DEFAULT 'standard' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);--> statement-breakpoint

CREATE TABLE "favorite_collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT false,
	"color_theme" varchar(50) DEFAULT 'blue',
	"cover_image_url" text,
	"recipe_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);--> statement-breakpoint

CREATE TABLE "collection_recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"recipe_id" uuid NOT NULL,
	"order_index" integer DEFAULT 0,
	"added_at" timestamp DEFAULT now(),
	"added_by" uuid,
	"notes" text
);--> statement-breakpoint

CREATE TABLE "collection_followers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"follower_id" uuid NOT NULL,
	"followed_at" timestamp DEFAULT now(),
	"notifications_enabled" boolean DEFAULT true
);--> statement-breakpoint

-- =============================================================================
-- ENGAGEMENT ANALYTICS TABLES
-- =============================================================================

CREATE TABLE "user_recipe_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"recipe_id" uuid NOT NULL,
	"interaction_type" "interaction_type" NOT NULL,
	"metadata" jsonb,
	"ip_hash" varchar(64),
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);--> statement-breakpoint

CREATE TABLE "recipe_view_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid NOT NULL,
	"total_views" integer DEFAULT 0,
	"unique_views" integer DEFAULT 0,
	"daily_views" integer DEFAULT 0,
	"weekly_views" integer DEFAULT 0,
	"monthly_views" integer DEFAULT 0,
	"avg_view_duration" numeric(10, 2) DEFAULT '0',
	"avg_scroll_depth" numeric(5, 2) DEFAULT '0',
	"bounce_rate" numeric(5, 2) DEFAULT '0',
	"mobile_views" integer DEFAULT 0,
	"tablet_views" integer DEFAULT 0,
	"desktop_views" integer DEFAULT 0,
	"last_viewed_at" timestamp,
	"last_updated_at" timestamp DEFAULT now(),
	CONSTRAINT "recipe_view_metrics_recipe_id_unique" UNIQUE("recipe_id")
);--> statement-breakpoint

CREATE TABLE "recipe_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"recipe_id" uuid NOT NULL,
	"rating" "rating_value" NOT NULL,
	"review" text,
	"is_verified_made" boolean DEFAULT false,
	"would_recommend" boolean,
	"difficulty_rating" integer,
	"accurate_nutrition" boolean,
	"is_approved" boolean DEFAULT true,
	"is_flagged" boolean DEFAULT false,
	"moderation_notes" text,
	"helpful_votes" integer DEFAULT 0,
	"not_helpful_votes" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);--> statement-breakpoint

CREATE TABLE "user_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"dietary_restrictions" jsonb DEFAULT '[]'::jsonb,
	"allergies" jsonb DEFAULT '[]'::jsonb,
	"cuisine_preferences" jsonb DEFAULT '[]'::jsonb,
	"disliked_ingredients" jsonb DEFAULT '[]'::jsonb,
	"preferred_meal_types" jsonb DEFAULT '[]'::jsonb,
	"max_prep_time" integer,
	"max_cook_time" integer,
	"preferred_servings" integer DEFAULT 2,
	"calorie_goal" integer,
	"protein_goal" numeric(5, 2),
	"carb_goal" numeric(5, 2),
	"fat_goal" numeric(5, 2),
	"preferred_difficulty" varchar(20),
	"preferred_viewing_time" integer,
	"preferred_font_size" varchar(10) DEFAULT 'medium',
	"high_contrast_mode" boolean DEFAULT false,
	"preferred_language" varchar(10) DEFAULT 'en',
	"allow_personalization" boolean DEFAULT true,
	"allow_analytics" boolean DEFAULT true,
	"share_preferences" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);--> statement-breakpoint

CREATE TABLE "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar(128) NOT NULL,
	"user_id" uuid,
	"start_time" timestamp DEFAULT now(),
	"end_time" timestamp,
	"duration" integer,
	"device_type" varchar(20),
	"browser_name" varchar(50),
	"operating_system" varchar(50),
	"screen_resolution" varchar(20),
	"country" varchar(2),
	"region" varchar(100),
	"city" varchar(100),
	"timezone" varchar(50),
	"page_views" integer DEFAULT 0,
	"recipe_views" integer DEFAULT 0,
	"search_count" integer DEFAULT 0,
	"favorites_added" integer DEFAULT 0,
	"entry_page" text,
	"exit_page" text,
	"referrer" text,
	"utm_source" varchar(100),
	"utm_medium" varchar(100),
	"utm_campaign" varchar(100),
	"bounced" boolean DEFAULT false,
	"converted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_sessions_session_id_unique" UNIQUE("session_id")
);--> statement-breakpoint

-- =============================================================================
-- SOCIAL FEATURES TABLES
-- =============================================================================

CREATE TABLE "recipe_popularity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid NOT NULL,
	"view_count" integer DEFAULT 0,
	"unique_view_count" integer DEFAULT 0,
	"favorite_count" integer DEFAULT 0,
	"share_count" integer DEFAULT 0,
	"rating_count" integer DEFAULT 0,
	"average_rating" numeric(3, 2) DEFAULT '0',
	"daily_views" integer DEFAULT 0,
	"weekly_views" integer DEFAULT 0,
	"monthly_views" integer DEFAULT 0,
	"daily_favorites" integer DEFAULT 0,
	"weekly_favorites" integer DEFAULT 0,
	"monthly_favorites" integer DEFAULT 0,
	"avg_session_time" numeric(8, 2) DEFAULT '0',
	"bounce_rate" numeric(5, 2) DEFAULT '0',
	"completion_rate" numeric(5, 2) DEFAULT '0',
	"share_to_view_ratio" numeric(5, 4) DEFAULT '0',
	"favorite_to_view_ratio" numeric(5, 4) DEFAULT '0',
	"virality_score" numeric(8, 2) DEFAULT '0',
	"trending_score" numeric(10, 2) DEFAULT '0',
	"popularity_rank" integer,
	"primary_age_group" varchar(20),
	"primary_device_type" varchar(20),
	"primary_country" varchar(2),
	"momentum_score" numeric(8, 2) DEFAULT '0',
	"peak_day" timestamp,
	"is_currently_trending" boolean DEFAULT false,
	"last_calculated" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "recipe_popularity_recipe_id_unique" UNIQUE("recipe_id")
);--> statement-breakpoint

CREATE TABLE "weekly_trending" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week_start" timestamp NOT NULL,
	"recipe_id" uuid NOT NULL,
	"rank" integer NOT NULL,
	"trend_score" numeric(10, 2) NOT NULL,
	"weekly_views" integer NOT NULL,
	"weekly_favorites" integer NOT NULL,
	"weekly_shares" integer NOT NULL,
	"weekly_ratings" integer NOT NULL,
	"view_growth_rate" numeric(6, 2),
	"favorite_growth_rate" numeric(6, 2),
	"primary_meal_type" varchar(50),
	"primary_dietary_tag" varchar(50),
	"created_at" timestamp DEFAULT now()
);--> statement-breakpoint

CREATE TABLE "user_followers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"follower_id" uuid NOT NULL,
	"following_id" uuid NOT NULL,
	"followed_at" timestamp DEFAULT now(),
	"notifications_enabled" boolean DEFAULT true,
	"last_seen_activity" timestamp,
	"interaction_count" integer DEFAULT 0,
	"follow_source" varchar(50)
);--> statement-breakpoint

CREATE TABLE "shared_recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid NOT NULL,
	"shared_by" uuid,
	"share_type" "share_type" NOT NULL,
	"platform" varchar(50),
	"share_text" text,
	"recipient_email" varchar(255),
	"share_token" varchar(128),
	"click_count" integer DEFAULT 0,
	"conversion_count" integer DEFAULT 0,
	"shared_from_country" varchar(2),
	"shared_from_device" varchar(20),
	"original_share_id" uuid,
	"share_depth" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	"last_clicked_at" timestamp
);--> statement-breakpoint

CREATE TABLE "user_social_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"follower_count" integer DEFAULT 0,
	"following_count" integer DEFAULT 0,
	"mutual_follow_count" integer DEFAULT 0,
	"recipes_shared" integer DEFAULT 0,
	"total_recipes_viewed" integer DEFAULT 0,
	"favorite_recipes_count" integer DEFAULT 0,
	"collections_count" integer DEFAULT 0,
	"public_collections_count" integer DEFAULT 0,
	"total_ratings_given" integer DEFAULT 0,
	"average_rating_given" numeric(3, 2),
	"recipes_rated_by_others" integer DEFAULT 0,
	"average_rating_received" numeric(3, 2),
	"influence_score" numeric(8, 2) DEFAULT '0',
	"viral_shares_created" integer DEFAULT 0,
	"content_views_generated" integer DEFAULT 0,
	"login_streak" integer DEFAULT 0,
	"max_login_streak" integer DEFAULT 0,
	"last_active_date" timestamp,
	"badges_earned" jsonb DEFAULT '[]'::jsonb,
	"achievement_level" integer DEFAULT 1,
	"last_calculated" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_social_stats_user_id_unique" UNIQUE("user_id")
);--> statement-breakpoint

CREATE TABLE "content_discovery_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"content_id" uuid NOT NULL,
	"content_type" "content_type" NOT NULL,
	"discovery_source" varchar(50) NOT NULL,
	"discovery_context" jsonb,
	"engaged" boolean DEFAULT false,
	"converted" boolean DEFAULT false,
	"time_to_conversion" integer,
	"discovered_at" timestamp DEFAULT now()
);--> statement-breakpoint

-- =============================================================================
-- RECOMMENDATION ENGINE TABLES
-- =============================================================================

CREATE TABLE "user_similarity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id_1" uuid NOT NULL,
	"user_id_2" uuid NOT NULL,
	"overall_similarity" numeric(5, 4) NOT NULL,
	"taste_similarity" numeric(5, 4),
	"dietary_similarity" numeric(5, 4),
	"behavior_similarity" numeric(5, 4),
	"demographic_similarity" numeric(5, 4),
	"confidence_score" numeric(5, 4),
	"data_points" integer,
	"calculated_at" timestamp DEFAULT now(),
	"expires_at" timestamp
);--> statement-breakpoint

CREATE TABLE "recipe_recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"recipe_id" uuid NOT NULL,
	"algorithm" "recommendation_algorithm" NOT NULL,
	"reason" "recommendation_reason" NOT NULL,
	"recommendation_score" numeric(8, 4) NOT NULL,
	"confidence_level" numeric(5, 4),
	"personalized_factors" jsonb,
	"recommendation_context" varchar(100),
	"target_meal_type" varchar(50),
	"seasonality" varchar(20),
	"experiment_group" varchar(50),
	"test_variant" varchar(50),
	"generated_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"presented_at" timestamp,
	"interacted_at" timestamp,
	"position" integer,
	"batch_id" uuid
);--> statement-breakpoint

CREATE TABLE "recommendation_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"recommendation_id" uuid NOT NULL,
	"recipe_id" uuid NOT NULL,
	"feedback_type" "feedback_type" NOT NULL,
	"implicit_feedback" boolean DEFAULT true,
	"time_to_click" integer,
	"time_spent_viewing" integer,
	"scroll_depth" numeric(5, 2),
	"explicit_rating" integer,
	"feedback_reason" varchar(100),
	"feedback_context" varchar(100),
	"device_type" varchar(20),
	"session_duration" integer,
	"processed_for_training" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);--> statement-breakpoint

CREATE TABLE "ml_model_performance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_name" varchar(100) NOT NULL,
	"model_version" varchar(50) NOT NULL,
	"algorithm" "recommendation_algorithm" NOT NULL,
	"precision" numeric(6, 4),
	"recall" numeric(6, 4),
	"f1_score" numeric(6, 4),
	"map_score" numeric(6, 4),
	"ndcg_score" numeric(6, 4),
	"click_through_rate" numeric(6, 4),
	"conversion_rate" numeric(6, 4),
	"user_satisfaction_score" numeric(6, 4),
	"diversity_score" numeric(6, 4),
	"test_data_size" integer,
	"training_data_size" integer,
	"test_period_start" timestamp,
	"test_period_end" timestamp,
	"hyperparameters" jsonb,
	"feature_set" jsonb,
	"is_production" boolean DEFAULT false,
	"traffic_percentage" numeric(5, 2),
	"created_at" timestamp DEFAULT now(),
	"deployed_at" timestamp,
	"retired_at" timestamp
);--> statement-breakpoint

CREATE TABLE "feature_store" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(20) NOT NULL,
	"entity_id" varchar(100) NOT NULL,
	"demographic_features" jsonb,
	"behavioral_features" jsonb,
	"preference_features" jsonb,
	"social_features" jsonb,
	"content_features" jsonb,
	"feature_version" varchar(20) NOT NULL,
	"computed_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"computation_time" integer
);--> statement-breakpoint

-- =============================================================================
-- FOREIGN KEY CONSTRAINTS
-- =============================================================================

-- Favorites System
ALTER TABLE "recipe_favorites" ADD CONSTRAINT "recipe_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_favorites" ADD CONSTRAINT "recipe_favorites_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite_collections" ADD CONSTRAINT "favorite_collections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_recipes" ADD CONSTRAINT "collection_recipes_collection_id_favorite_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."favorite_collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_recipes" ADD CONSTRAINT "collection_recipes_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_recipes" ADD CONSTRAINT "collection_recipes_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_followers" ADD CONSTRAINT "collection_followers_collection_id_favorite_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."favorite_collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_followers" ADD CONSTRAINT "collection_followers_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Engagement Analytics
ALTER TABLE "user_recipe_interactions" ADD CONSTRAINT "user_recipe_interactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_recipe_interactions" ADD CONSTRAINT "user_recipe_interactions_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_view_metrics" ADD CONSTRAINT "recipe_view_metrics_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ratings" ADD CONSTRAINT "recipe_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ratings" ADD CONSTRAINT "recipe_ratings_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Social Features
ALTER TABLE "recipe_popularity" ADD CONSTRAINT "recipe_popularity_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_trending" ADD CONSTRAINT "weekly_trending_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_followers" ADD CONSTRAINT "user_followers_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_followers" ADD CONSTRAINT "user_followers_following_id_users_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_recipes" ADD CONSTRAINT "shared_recipes_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_recipes" ADD CONSTRAINT "shared_recipes_shared_by_users_id_fk" FOREIGN KEY ("shared_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_recipes" ADD CONSTRAINT "shared_recipes_original_share_id_shared_recipes_id_fk" FOREIGN KEY ("original_share_id") REFERENCES "public"."shared_recipes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_social_stats" ADD CONSTRAINT "user_social_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_discovery_sources" ADD CONSTRAINT "content_discovery_sources_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Recommendation Engine
ALTER TABLE "user_similarity" ADD CONSTRAINT "user_similarity_user_id_1_users_id_fk" FOREIGN KEY ("user_id_1") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_similarity" ADD CONSTRAINT "user_similarity_user_id_2_users_id_fk" FOREIGN KEY ("user_id_2") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_recommendations" ADD CONSTRAINT "recipe_recommendations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_recommendations" ADD CONSTRAINT "recipe_recommendations_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_feedback" ADD CONSTRAINT "recommendation_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_feedback" ADD CONSTRAINT "recommendation_feedback_recommendation_id_recipe_recommendations_id_fk" FOREIGN KEY ("recommendation_id") REFERENCES "public"."recipe_recommendations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_feedback" ADD CONSTRAINT "recommendation_feedback_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- =============================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =============================================================================

-- Favorites System Indexes
CREATE INDEX "recipe_favorites_user_recipe_idx" ON "recipe_favorites" ("user_id", "recipe_id");--> statement-breakpoint
CREATE INDEX "recipe_favorites_user_idx" ON "recipe_favorites" ("user_id");--> statement-breakpoint
CREATE INDEX "recipe_favorites_recipe_idx" ON "recipe_favorites" ("recipe_id");--> statement-breakpoint
CREATE INDEX "recipe_favorites_type_idx" ON "recipe_favorites" ("favorite_type");--> statement-breakpoint
CREATE INDEX "recipe_favorites_created_at_idx" ON "recipe_favorites" ("created_at");--> statement-breakpoint

CREATE INDEX "favorite_collections_user_idx" ON "favorite_collections" ("user_id");--> statement-breakpoint
CREATE INDEX "favorite_collections_public_idx" ON "favorite_collections" ("is_public");--> statement-breakpoint
CREATE INDEX "favorite_collections_name_idx" ON "favorite_collections" ("name");--> statement-breakpoint

CREATE INDEX "collection_recipes_collection_idx" ON "collection_recipes" ("collection_id");--> statement-breakpoint
CREATE INDEX "collection_recipes_recipe_idx" ON "collection_recipes" ("recipe_id");--> statement-breakpoint
CREATE INDEX "collection_recipes_unique_idx" ON "collection_recipes" ("collection_id", "recipe_id");--> statement-breakpoint
CREATE INDEX "collection_recipes_order_idx" ON "collection_recipes" ("collection_id", "order_index");--> statement-breakpoint

CREATE INDEX "collection_followers_collection_idx" ON "collection_followers" ("collection_id");--> statement-breakpoint
CREATE INDEX "collection_followers_follower_idx" ON "collection_followers" ("follower_id");--> statement-breakpoint
CREATE INDEX "collection_followers_unique_idx" ON "collection_followers" ("collection_id", "follower_id");--> statement-breakpoint

-- Engagement Analytics Indexes
CREATE INDEX "user_recipe_interactions_user_idx" ON "user_recipe_interactions" ("user_id");--> statement-breakpoint
CREATE INDEX "user_recipe_interactions_recipe_idx" ON "user_recipe_interactions" ("recipe_id");--> statement-breakpoint
CREATE INDEX "user_recipe_interactions_type_idx" ON "user_recipe_interactions" ("interaction_type");--> statement-breakpoint
CREATE INDEX "user_recipe_interactions_created_at_idx" ON "user_recipe_interactions" ("created_at");--> statement-breakpoint
CREATE INDEX "user_recipe_interactions_user_recipe_idx" ON "user_recipe_interactions" ("user_id", "recipe_id");--> statement-breakpoint
CREATE INDEX "user_recipe_interactions_recipe_type_idx" ON "user_recipe_interactions" ("recipe_id", "interaction_type");--> statement-breakpoint
CREATE INDEX "user_recipe_interactions_user_type_idx" ON "user_recipe_interactions" ("user_id", "interaction_type");--> statement-breakpoint
CREATE INDEX "user_recipe_interactions_daily_idx" ON "user_recipe_interactions" ("created_at", "interaction_type");--> statement-breakpoint
CREATE INDEX "user_recipe_interactions_weekly_idx" ON "user_recipe_interactions" ("created_at", "recipe_id");--> statement-breakpoint

CREATE INDEX "recipe_view_metrics_recipe_idx" ON "recipe_view_metrics" ("recipe_id");--> statement-breakpoint
CREATE INDEX "recipe_view_metrics_total_views_idx" ON "recipe_view_metrics" ("total_views");--> statement-breakpoint
CREATE INDEX "recipe_view_metrics_daily_views_idx" ON "recipe_view_metrics" ("daily_views");--> statement-breakpoint
CREATE INDEX "recipe_view_metrics_weekly_views_idx" ON "recipe_view_metrics" ("weekly_views");--> statement-breakpoint
CREATE INDEX "recipe_view_metrics_last_viewed_idx" ON "recipe_view_metrics" ("last_viewed_at");--> statement-breakpoint

CREATE INDEX "recipe_ratings_user_idx" ON "recipe_ratings" ("user_id");--> statement-breakpoint
CREATE INDEX "recipe_ratings_recipe_idx" ON "recipe_ratings" ("recipe_id");--> statement-breakpoint
CREATE INDEX "recipe_ratings_rating_idx" ON "recipe_ratings" ("rating");--> statement-breakpoint
CREATE INDEX "recipe_ratings_approved_idx" ON "recipe_ratings" ("is_approved");--> statement-breakpoint
CREATE INDEX "recipe_ratings_user_recipe_unique_idx" ON "recipe_ratings" ("user_id", "recipe_id");--> statement-breakpoint
CREATE INDEX "recipe_ratings_helpful_idx" ON "recipe_ratings" ("helpful_votes");--> statement-breakpoint
CREATE INDEX "recipe_ratings_verified_idx" ON "recipe_ratings" ("is_verified_made");--> statement-breakpoint

CREATE INDEX "user_preferences_user_idx" ON "user_preferences" ("user_id");--> statement-breakpoint
CREATE INDEX "user_preferences_personalization_idx" ON "user_preferences" ("allow_personalization");--> statement-breakpoint
CREATE INDEX "user_preferences_updated_at_idx" ON "user_preferences" ("updated_at");--> statement-breakpoint

CREATE INDEX "user_sessions_session_idx" ON "user_sessions" ("session_id");--> statement-breakpoint
CREATE INDEX "user_sessions_user_idx" ON "user_sessions" ("user_id");--> statement-breakpoint
CREATE INDEX "user_sessions_start_time_idx" ON "user_sessions" ("start_time");--> statement-breakpoint
CREATE INDEX "user_sessions_device_type_idx" ON "user_sessions" ("device_type");--> statement-breakpoint
CREATE INDEX "user_sessions_country_idx" ON "user_sessions" ("country");--> statement-breakpoint
CREATE INDEX "user_sessions_converted_idx" ON "user_sessions" ("converted");--> statement-breakpoint
CREATE INDEX "user_sessions_daily_idx" ON "user_sessions" ("start_time", "device_type");--> statement-breakpoint
CREATE INDEX "user_sessions_user_activity_idx" ON "user_sessions" ("user_id", "start_time");--> statement-breakpoint

-- Social Features Indexes
CREATE INDEX "recipe_popularity_recipe_idx" ON "recipe_popularity" ("recipe_id");--> statement-breakpoint
CREATE INDEX "recipe_popularity_trending_score_idx" ON "recipe_popularity" ("trending_score");--> statement-breakpoint
CREATE INDEX "recipe_popularity_rank_idx" ON "recipe_popularity" ("popularity_rank");--> statement-breakpoint
CREATE INDEX "recipe_popularity_currently_trending_idx" ON "recipe_popularity" ("is_currently_trending");--> statement-breakpoint
CREATE INDEX "recipe_popularity_view_count_idx" ON "recipe_popularity" ("view_count");--> statement-breakpoint
CREATE INDEX "recipe_popularity_favorite_count_idx" ON "recipe_popularity" ("favorite_count");--> statement-breakpoint
CREATE INDEX "recipe_popularity_rating_idx" ON "recipe_popularity" ("average_rating");--> statement-breakpoint
CREATE INDEX "recipe_popularity_daily_views_idx" ON "recipe_popularity" ("daily_views");--> statement-breakpoint
CREATE INDEX "recipe_popularity_weekly_views_idx" ON "recipe_popularity" ("weekly_views");--> statement-breakpoint
CREATE INDEX "recipe_popularity_monthly_views_idx" ON "recipe_popularity" ("monthly_views");--> statement-breakpoint
CREATE INDEX "recipe_popularity_momentum_idx" ON "recipe_popularity" ("momentum_score");--> statement-breakpoint
CREATE INDEX "recipe_popularity_last_calculated_idx" ON "recipe_popularity" ("last_calculated");--> statement-breakpoint

CREATE INDEX "weekly_trending_week_start_idx" ON "weekly_trending" ("week_start");--> statement-breakpoint
CREATE INDEX "weekly_trending_recipe_idx" ON "weekly_trending" ("recipe_id");--> statement-breakpoint
CREATE INDEX "weekly_trending_rank_idx" ON "weekly_trending" ("week_start", "rank");--> statement-breakpoint
CREATE INDEX "weekly_trending_week_rank_idx" ON "weekly_trending" ("week_start", "rank");--> statement-breakpoint
CREATE INDEX "weekly_trending_recipe_week_idx" ON "weekly_trending" ("recipe_id", "week_start");--> statement-breakpoint
CREATE INDEX "weekly_trending_trend_score_idx" ON "weekly_trending" ("trend_score");--> statement-breakpoint

CREATE INDEX "user_followers_follower_idx" ON "user_followers" ("follower_id");--> statement-breakpoint
CREATE INDEX "user_followers_following_idx" ON "user_followers" ("following_id");--> statement-breakpoint
CREATE INDEX "user_followers_unique_idx" ON "user_followers" ("follower_id", "following_id");--> statement-breakpoint
CREATE INDEX "user_followers_follower_activity_idx" ON "user_followers" ("follower_id", "last_seen_activity");--> statement-breakpoint
CREATE INDEX "user_followers_notifications_idx" ON "user_followers" ("notifications_enabled");--> statement-breakpoint
CREATE INDEX "user_followers_followed_at_idx" ON "user_followers" ("followed_at");--> statement-breakpoint

CREATE INDEX "shared_recipes_recipe_idx" ON "shared_recipes" ("recipe_id");--> statement-breakpoint
CREATE INDEX "shared_recipes_shared_by_idx" ON "shared_recipes" ("shared_by");--> statement-breakpoint
CREATE INDEX "shared_recipes_share_type_idx" ON "shared_recipes" ("share_type");--> statement-breakpoint
CREATE INDEX "shared_recipes_share_token_idx" ON "shared_recipes" ("share_token");--> statement-breakpoint
CREATE INDEX "shared_recipes_platform_idx" ON "shared_recipes" ("platform");--> statement-breakpoint
CREATE INDEX "shared_recipes_created_at_idx" ON "shared_recipes" ("created_at");--> statement-breakpoint
CREATE INDEX "shared_recipes_click_count_idx" ON "shared_recipes" ("click_count");--> statement-breakpoint
CREATE INDEX "shared_recipes_conversion_idx" ON "shared_recipes" ("conversion_count");--> statement-breakpoint
CREATE INDEX "shared_recipes_original_share_idx" ON "shared_recipes" ("original_share_id");--> statement-breakpoint
CREATE INDEX "shared_recipes_share_depth_idx" ON "shared_recipes" ("share_depth");--> statement-breakpoint

CREATE INDEX "user_social_stats_user_idx" ON "user_social_stats" ("user_id");--> statement-breakpoint
CREATE INDEX "user_social_stats_follower_count_idx" ON "user_social_stats" ("follower_count");--> statement-breakpoint
CREATE INDEX "user_social_stats_influence_score_idx" ON "user_social_stats" ("influence_score");--> statement-breakpoint
CREATE INDEX "user_social_stats_achievement_level_idx" ON "user_social_stats" ("achievement_level");--> statement-breakpoint
CREATE INDEX "user_social_stats_last_active_idx" ON "user_social_stats" ("last_active_date");--> statement-breakpoint
CREATE INDEX "user_social_stats_last_calculated_idx" ON "user_social_stats" ("last_calculated");--> statement-breakpoint

CREATE INDEX "content_discovery_sources_user_idx" ON "content_discovery_sources" ("user_id");--> statement-breakpoint
CREATE INDEX "content_discovery_sources_content_idx" ON "content_discovery_sources" ("content_id");--> statement-breakpoint
CREATE INDEX "content_discovery_sources_source_idx" ON "content_discovery_sources" ("discovery_source");--> statement-breakpoint
CREATE INDEX "content_discovery_sources_engaged_idx" ON "content_discovery_sources" ("engaged");--> statement-breakpoint
CREATE INDEX "content_discovery_sources_converted_idx" ON "content_discovery_sources" ("converted");--> statement-breakpoint
CREATE INDEX "content_discovery_sources_discovered_at_idx" ON "content_discovery_sources" ("discovered_at");--> statement-breakpoint
CREATE INDEX "content_discovery_sources_content_type_idx" ON "content_discovery_sources" ("content_type");--> statement-breakpoint
CREATE INDEX "content_discovery_sources_conversion_time_idx" ON "content_discovery_sources" ("time_to_conversion");--> statement-breakpoint
CREATE INDEX "content_discovery_sources_source_conversion_idx" ON "content_discovery_sources" ("discovery_source", "converted");--> statement-breakpoint

-- Recommendation Engine Indexes
CREATE INDEX "user_similarity_user1_idx" ON "user_similarity" ("user_id_1");--> statement-breakpoint
CREATE INDEX "user_similarity_user2_idx" ON "user_similarity" ("user_id_2");--> statement-breakpoint
CREATE INDEX "user_similarity_unique_pair_idx" ON "user_similarity" ("user_id_1", "user_id_2");--> statement-breakpoint
CREATE INDEX "user_similarity_overall_idx" ON "user_similarity" ("overall_similarity");--> statement-breakpoint
CREATE INDEX "user_similarity_confidence_idx" ON "user_similarity" ("confidence_score");--> statement-breakpoint
CREATE INDEX "user_similarity_calculated_at_idx" ON "user_similarity" ("calculated_at");--> statement-breakpoint
CREATE INDEX "user_similarity_expires_at_idx" ON "user_similarity" ("expires_at");--> statement-breakpoint
CREATE INDEX "user_similarity_high_idx" ON "user_similarity" ("user_id_1", "overall_similarity");--> statement-breakpoint

CREATE INDEX "recipe_recommendations_user_idx" ON "recipe_recommendations" ("user_id");--> statement-breakpoint
CREATE INDEX "recipe_recommendations_recipe_idx" ON "recipe_recommendations" ("recipe_id");--> statement-breakpoint
CREATE INDEX "recipe_recommendations_algorithm_idx" ON "recipe_recommendations" ("algorithm");--> statement-breakpoint
CREATE INDEX "recipe_recommendations_score_idx" ON "recipe_recommendations" ("recommendation_score");--> statement-breakpoint
CREATE INDEX "recipe_recommendations_user_score_idx" ON "recipe_recommendations" ("user_id", "recommendation_score");--> statement-breakpoint
CREATE INDEX "recipe_recommendations_context_idx" ON "recipe_recommendations" ("recommendation_context");--> statement-breakpoint
CREATE INDEX "recipe_recommendations_experiment_idx" ON "recipe_recommendations" ("experiment_group");--> statement-breakpoint
CREATE INDEX "recipe_recommendations_variant_idx" ON "recipe_recommendations" ("test_variant");--> statement-breakpoint
CREATE INDEX "recipe_recommendations_generated_at_idx" ON "recipe_recommendations" ("generated_at");--> statement-breakpoint
CREATE INDEX "recipe_recommendations_expires_at_idx" ON "recipe_recommendations" ("expires_at");--> statement-breakpoint
CREATE INDEX "recipe_recommendations_presented_at_idx" ON "recipe_recommendations" ("presented_at");--> statement-breakpoint
CREATE INDEX "recipe_recommendations_batch_idx" ON "recipe_recommendations" ("batch_id");--> statement-breakpoint
CREATE INDEX "recipe_recommendations_active_idx" ON "recipe_recommendations" ("user_id", "expires_at");--> statement-breakpoint

CREATE INDEX "recommendation_feedback_user_idx" ON "recommendation_feedback" ("user_id");--> statement-breakpoint
CREATE INDEX "recommendation_feedback_recommendation_idx" ON "recommendation_feedback" ("recommendation_id");--> statement-breakpoint
CREATE INDEX "recommendation_feedback_recipe_idx" ON "recommendation_feedback" ("recipe_id");--> statement-breakpoint
CREATE INDEX "recommendation_feedback_type_idx" ON "recommendation_feedback" ("feedback_type");--> statement-breakpoint
CREATE INDEX "recommendation_feedback_training_idx" ON "recommendation_feedback" ("processed_for_training");--> statement-breakpoint
CREATE INDEX "recommendation_feedback_explicit_rating_idx" ON "recommendation_feedback" ("explicit_rating");--> statement-breakpoint
CREATE INDEX "recommendation_feedback_time_to_click_idx" ON "recommendation_feedback" ("time_to_click");--> statement-breakpoint
CREATE INDEX "recommendation_feedback_implicit_idx" ON "recommendation_feedback" ("implicit_feedback");--> statement-breakpoint
CREATE INDEX "recommendation_feedback_created_at_idx" ON "recommendation_feedback" ("created_at");--> statement-breakpoint
CREATE INDEX "recommendation_feedback_context_idx" ON "recommendation_feedback" ("feedback_context");--> statement-breakpoint
CREATE INDEX "recommendation_feedback_device_idx" ON "recommendation_feedback" ("device_type");--> statement-breakpoint

CREATE INDEX "ml_model_performance_model_name_idx" ON "ml_model_performance" ("model_name");--> statement-breakpoint
CREATE INDEX "ml_model_performance_algorithm_idx" ON "ml_model_performance" ("algorithm");--> statement-breakpoint
CREATE INDEX "ml_model_performance_production_idx" ON "ml_model_performance" ("is_production");--> statement-breakpoint
CREATE INDEX "ml_model_performance_precision_idx" ON "ml_model_performance" ("precision");--> statement-breakpoint
CREATE INDEX "ml_model_performance_ctr_idx" ON "ml_model_performance" ("click_through_rate");--> statement-breakpoint
CREATE INDEX "ml_model_performance_conversion_idx" ON "ml_model_performance" ("conversion_rate");--> statement-breakpoint
CREATE INDEX "ml_model_performance_created_at_idx" ON "ml_model_performance" ("created_at");--> statement-breakpoint
CREATE INDEX "ml_model_performance_test_period_idx" ON "ml_model_performance" ("test_period_start", "test_period_end");--> statement-breakpoint
CREATE INDEX "ml_model_performance_deployed_at_idx" ON "ml_model_performance" ("deployed_at");--> statement-breakpoint

CREATE INDEX "feature_store_entity_type_idx" ON "feature_store" ("entity_type");--> statement-breakpoint
CREATE INDEX "feature_store_entity_id_idx" ON "feature_store" ("entity_id");--> statement-breakpoint
CREATE INDEX "feature_store_unique_entity_idx" ON "feature_store" ("entity_type", "entity_id", "feature_version");--> statement-breakpoint
CREATE INDEX "feature_store_version_idx" ON "feature_store" ("feature_version");--> statement-breakpoint
CREATE INDEX "feature_store_computed_at_idx" ON "feature_store" ("computed_at");--> statement-breakpoint
CREATE INDEX "feature_store_expires_at_idx" ON "feature_store" ("expires_at");--> statement-breakpoint
CREATE INDEX "feature_store_fresh_idx" ON "feature_store" ("entity_type", "expires_at");--> statement-breakpoint