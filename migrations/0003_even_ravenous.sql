CREATE TYPE "public"."payment_event_type" AS ENUM('purchase', 'upgrade', 'downgrade', 'refund', 'chargeback', 'failed');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'completed', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."subscription_item_kind" AS ENUM('tier', 'ai');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'unpaid', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."tier_level" AS ENUM('starter', 'professional', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."webhook_event_status" AS ENUM('pending', 'processed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."favorite_type" AS ENUM('standard', 'want_to_try', 'made_it', 'love_it');--> statement-breakpoint
CREATE TABLE "collection_recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"recipe_id" uuid NOT NULL,
	"order_index" integer DEFAULT 0,
	"added_at" timestamp DEFAULT now(),
	"added_by" uuid,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "email_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"weekly_progress_summaries" boolean DEFAULT true NOT NULL,
	"meal_plan_updates" boolean DEFAULT true NOT NULL,
	"recipe_recommendations" boolean DEFAULT true NOT NULL,
	"system_notifications" boolean DEFAULT true NOT NULL,
	"marketing_emails" boolean DEFAULT false NOT NULL,
	"frequency" text DEFAULT 'weekly' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "email_send_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"email_type" varchar(100) NOT NULL,
	"subject" varchar(255) NOT NULL,
	"recipient_email" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'sent' NOT NULL,
	"message_id" varchar(255),
	"error_message" text,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grocery_list_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grocery_list_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(50) DEFAULT 'produce' NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit" varchar(20) DEFAULT 'pcs' NOT NULL,
	"is_checked" boolean DEFAULT false NOT NULL,
	"priority" varchar(10) DEFAULT 'medium' NOT NULL,
	"notes" text,
	"estimated_price" numeric(6, 2),
	"brand" varchar(100),
	"recipe_id" uuid,
	"recipe_name" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grocery_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"meal_plan_id" uuid,
	"name" varchar(255) DEFAULT 'My Grocery List' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trainer_id" uuid,
	"event_type" "payment_event_type" NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'usd' NOT NULL,
	"stripe_invoice_id" varchar(255),
	"stripe_payment_intent_id" varchar(255),
	"stripe_charge_id" varchar(255),
	"status" "payment_status" NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"occurred_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rating_helpfulness" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"rating_id" uuid NOT NULL,
	"is_helpful" boolean NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "recipe_collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"cover_image_url" varchar(500),
	"is_public" boolean DEFAULT false,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "recipe_favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"recipe_id" uuid NOT NULL,
	"favorite_type" "favorite_type" DEFAULT 'standard' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "recipe_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"recipe_id" uuid NOT NULL,
	"interaction_type" varchar(50) NOT NULL,
	"interaction_value" integer,
	"session_id" varchar(255),
	"interaction_date" timestamp DEFAULT now(),
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "recipe_rating_summary" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid NOT NULL,
	"average_rating" numeric(3, 2) NOT NULL,
	"total_ratings" integer DEFAULT 0 NOT NULL,
	"total_reviews" integer DEFAULT 0 NOT NULL,
	"rating_distribution" jsonb DEFAULT '{"1":0,"2":0,"3":0,"4":0,"5":0}'::jsonb,
	"helpful_count" integer DEFAULT 0,
	"would_cook_again_count" integer DEFAULT 0,
	"average_difficulty" numeric(3, 2),
	"last_updated" timestamp DEFAULT now(),
	CONSTRAINT "recipe_rating_summary_recipe_id_unique" UNIQUE("recipe_id")
);
--> statement-breakpoint
CREATE TABLE "recipe_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"recipe_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"review_text" text,
	"is_helpful" boolean DEFAULT false,
	"cooking_difficulty" integer,
	"would_cook_again" boolean,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "recipe_recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"recipe_id" uuid NOT NULL,
	"recommendation_type" varchar(50) NOT NULL,
	"score" numeric(5, 4) NOT NULL,
	"reason" text,
	"generated_at" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_tier_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tier" "tier_level" NOT NULL,
	"allocation_month" varchar(7) NOT NULL,
	"recipe_count" integer DEFAULT 0 NOT NULL,
	"allocation_date" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_type_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"tier_level" "tier_level" NOT NULL,
	"is_seasonal" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "recipe_type_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "shared_meal_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meal_plan_id" uuid NOT NULL,
	"share_token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"expires_at" timestamp,
	"created_by" uuid NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "shared_meal_plans_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "subscription_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"kind" "subscription_item_kind" NOT NULL,
	"stripe_price_id" varchar(255) NOT NULL,
	"stripe_subscription_item_id" varchar(255) NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tier_usage_tracking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trainer_id" uuid NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"customers_count" integer DEFAULT 0 NOT NULL,
	"meal_plans_count" integer DEFAULT 0 NOT NULL,
	"ai_generations_count" integer DEFAULT 0 NOT NULL,
	"exports_csv_count" integer DEFAULT 0 NOT NULL,
	"exports_excel_count" integer DEFAULT 0 NOT NULL,
	"exports_pdf_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trainer_branding_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trainer_id" uuid NOT NULL,
	"logo_url" text,
	"logo_file_size" bigint DEFAULT 0,
	"logo_uploaded_at" timestamp,
	"primary_color" varchar(7),
	"secondary_color" varchar(7),
	"accent_color" varchar(7),
	"white_label_enabled" boolean DEFAULT false,
	"custom_domain" varchar(255),
	"custom_domain_verified" boolean DEFAULT false,
	"domain_verification_token" varchar(64),
	"domain_verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "trainer_branding_settings_trainer_id_unique" UNIQUE("trainer_id")
);
--> statement-breakpoint
CREATE TABLE "trainer_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trainer_id" uuid NOT NULL,
	"stripe_customer_id" varchar(255) NOT NULL,
	"stripe_subscription_id" varchar(255) NOT NULL,
	"tier" "tier_level" NOT NULL,
	"status" "subscription_status" DEFAULT 'trialing' NOT NULL,
	"current_period_start" timestamp NOT NULL,
	"current_period_end" timestamp NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"trial_end" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_activity_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"start_time" timestamp DEFAULT now(),
	"end_time" timestamp,
	"pages_viewed" integer DEFAULT 0,
	"recipes_viewed" integer DEFAULT 0,
	"favorites_added" integer DEFAULT 0,
	"collections_created" integer DEFAULT 0,
	"user_agent" text,
	"ip_address" varchar(45)
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar(255) NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"processed_at" timestamp,
	"status" "webhook_event_status" DEFAULT 'pending' NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"payload_metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_events_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "collection_followers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"follower_id" uuid NOT NULL,
	"followed_at" timestamp DEFAULT now(),
	"notifications_enabled" boolean DEFAULT true
);
--> statement-breakpoint
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
);
--> statement-breakpoint
ALTER TABLE "goal_milestones" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "goal_milestones" CASCADE;--> statement-breakpoint
ALTER TABLE "customer_goals" RENAME TO "branding_audit_log";--> statement-breakpoint
ALTER TABLE "branding_audit_log" DROP CONSTRAINT "customer_goals_customer_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "customer_goals_customer_id_idx";--> statement-breakpoint
DROP INDEX "customer_goals_status_idx";--> statement-breakpoint
ALTER TABLE "trainer_meal_plans" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "trainer_meal_plans" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "branding_audit_log" ADD COLUMN "trainer_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "branding_audit_log" ADD COLUMN "action" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "branding_audit_log" ADD COLUMN "field_changed" varchar(100);--> statement-breakpoint
ALTER TABLE "branding_audit_log" ADD COLUMN "old_value" text;--> statement-breakpoint
ALTER TABLE "branding_audit_log" ADD COLUMN "new_value" text;--> statement-breakpoint
ALTER TABLE "branding_audit_log" ADD COLUMN "changed_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "branding_audit_log" ADD COLUMN "ip_address" varchar(45);--> statement-breakpoint
ALTER TABLE "branding_audit_log" ADD COLUMN "user_agent" text;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "tier_level" "tier_level" DEFAULT 'starter' NOT NULL;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "is_seasonal" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "allocated_month" varchar(7);--> statement-breakpoint
ALTER TABLE "collection_recipes" ADD CONSTRAINT "collection_recipes_collection_id_favorite_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."favorite_collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_recipes" ADD CONSTRAINT "collection_recipes_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_recipes" ADD CONSTRAINT "collection_recipes_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_preferences" ADD CONSTRAINT "email_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_send_log" ADD CONSTRAINT "email_send_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_list_items" ADD CONSTRAINT "grocery_list_items_grocery_list_id_grocery_lists_id_fk" FOREIGN KEY ("grocery_list_id") REFERENCES "public"."grocery_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_list_items" ADD CONSTRAINT "grocery_list_items_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_lists" ADD CONSTRAINT "grocery_lists_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_lists" ADD CONSTRAINT "grocery_lists_meal_plan_id_personalized_meal_plans_id_fk" FOREIGN KEY ("meal_plan_id") REFERENCES "public"."personalized_meal_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_logs" ADD CONSTRAINT "payment_logs_trainer_id_users_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_helpfulness" ADD CONSTRAINT "rating_helpfulness_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_helpfulness" ADD CONSTRAINT "rating_helpfulness_rating_id_recipe_ratings_id_fk" FOREIGN KEY ("rating_id") REFERENCES "public"."recipe_ratings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_collections" ADD CONSTRAINT "recipe_collections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_favorites" ADD CONSTRAINT "recipe_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_favorites" ADD CONSTRAINT "recipe_favorites_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_interactions" ADD CONSTRAINT "recipe_interactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_interactions" ADD CONSTRAINT "recipe_interactions_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_rating_summary" ADD CONSTRAINT "recipe_rating_summary_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ratings" ADD CONSTRAINT "recipe_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ratings" ADD CONSTRAINT "recipe_ratings_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_recommendations" ADD CONSTRAINT "recipe_recommendations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_recommendations" ADD CONSTRAINT "recipe_recommendations_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_meal_plans" ADD CONSTRAINT "shared_meal_plans_meal_plan_id_trainer_meal_plans_id_fk" FOREIGN KEY ("meal_plan_id") REFERENCES "public"."trainer_meal_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_meal_plans" ADD CONSTRAINT "shared_meal_plans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_items" ADD CONSTRAINT "subscription_items_subscription_id_trainer_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."trainer_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tier_usage_tracking" ADD CONSTRAINT "tier_usage_tracking_trainer_id_users_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainer_branding_settings" ADD CONSTRAINT "trainer_branding_settings_trainer_id_users_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainer_subscriptions" ADD CONSTRAINT "trainer_subscriptions_trainer_id_users_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activity_sessions" ADD CONSTRAINT "user_activity_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_followers" ADD CONSTRAINT "collection_followers_collection_id_favorite_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."favorite_collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_followers" ADD CONSTRAINT "collection_followers_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite_collections" ADD CONSTRAINT "favorite_collections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "collection_recipes_collection_idx" ON "collection_recipes" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "collection_recipes_recipe_idx" ON "collection_recipes" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "collection_recipes_unique_idx" ON "collection_recipes" USING btree ("collection_id","recipe_id");--> statement-breakpoint
CREATE INDEX "collection_recipes_order_idx" ON "collection_recipes" USING btree ("collection_id","order_index");--> statement-breakpoint
CREATE INDEX "idx_grocery_list_items_list_id" ON "grocery_list_items" USING btree ("grocery_list_id");--> statement-breakpoint
CREATE INDEX "idx_grocery_list_items_list_category" ON "grocery_list_items" USING btree ("grocery_list_id","category");--> statement-breakpoint
CREATE INDEX "idx_grocery_list_items_list_checked" ON "grocery_list_items" USING btree ("grocery_list_id","is_checked");--> statement-breakpoint
CREATE INDEX "idx_grocery_list_items_recipe_id" ON "grocery_list_items" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "idx_grocery_lists_customer_id" ON "grocery_lists" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_grocery_lists_customer_updated" ON "grocery_lists" USING btree ("customer_id","updated_at");--> statement-breakpoint
CREATE INDEX "idx_grocery_lists_meal_plan_id" ON "grocery_lists" USING btree ("meal_plan_id");--> statement-breakpoint
CREATE INDEX "idx_payment_logs_trainer_id" ON "payment_logs" USING btree ("trainer_id");--> statement-breakpoint
CREATE INDEX "idx_payment_logs_occurred_at" ON "payment_logs" USING btree ("trainer_id","occurred_at");--> statement-breakpoint
CREATE INDEX "idx_payment_logs_invoice_id" ON "payment_logs" USING btree ("stripe_invoice_id");--> statement-breakpoint
CREATE INDEX "rating_helpfulness_user_id_idx" ON "rating_helpfulness" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "rating_helpfulness_rating_id_idx" ON "rating_helpfulness" USING btree ("rating_id");--> statement-breakpoint
CREATE INDEX "rating_helpfulness_user_rating_unique" ON "rating_helpfulness" USING btree ("user_id","rating_id");--> statement-breakpoint
CREATE INDEX "recipe_collections_user_id_idx" ON "recipe_collections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recipe_collections_public_idx" ON "recipe_collections" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "recipe_favorites_user_recipe_idx" ON "recipe_favorites" USING btree ("user_id","recipe_id");--> statement-breakpoint
CREATE INDEX "recipe_favorites_user_idx" ON "recipe_favorites" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recipe_favorites_recipe_idx" ON "recipe_favorites" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "recipe_favorites_type_idx" ON "recipe_favorites" USING btree ("favorite_type");--> statement-breakpoint
CREATE INDEX "recipe_favorites_created_at_idx" ON "recipe_favorites" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "recipe_interactions_user_id_idx" ON "recipe_interactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recipe_interactions_recipe_id_idx" ON "recipe_interactions" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "recipe_interactions_type_idx" ON "recipe_interactions" USING btree ("interaction_type");--> statement-breakpoint
CREATE INDEX "recipe_interactions_date_idx" ON "recipe_interactions" USING btree ("interaction_date");--> statement-breakpoint
CREATE INDEX "recipe_rating_summary_recipe_id_idx" ON "recipe_rating_summary" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "recipe_rating_summary_avg_rating_idx" ON "recipe_rating_summary" USING btree ("average_rating");--> statement-breakpoint
CREATE INDEX "recipe_rating_summary_total_ratings_idx" ON "recipe_rating_summary" USING btree ("total_ratings");--> statement-breakpoint
CREATE INDEX "recipe_ratings_user_id_idx" ON "recipe_ratings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recipe_ratings_recipe_id_idx" ON "recipe_ratings" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "recipe_ratings_rating_idx" ON "recipe_ratings" USING btree ("rating");--> statement-breakpoint
CREATE INDEX "recipe_ratings_user_recipe_unique" ON "recipe_ratings" USING btree ("user_id","recipe_id");--> statement-breakpoint
CREATE INDEX "recipe_recommendations_user_id_idx" ON "recipe_recommendations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recipe_recommendations_type_idx" ON "recipe_recommendations" USING btree ("recommendation_type");--> statement-breakpoint
CREATE INDEX "recipe_recommendations_score_idx" ON "recipe_recommendations" USING btree ("score");--> statement-breakpoint
CREATE INDEX "recipe_recommendations_expires_idx" ON "recipe_recommendations" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_recipe_tier_access_tier" ON "recipe_tier_access" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "idx_recipe_tier_access_month" ON "recipe_tier_access" USING btree ("allocation_month");--> statement-breakpoint
CREATE INDEX "idx_recipe_tier_access_tier_month" ON "recipe_tier_access" USING btree ("tier","allocation_month");--> statement-breakpoint
CREATE INDEX "recipe_tier_access_tier_month_unique" ON "recipe_tier_access" USING btree ("tier","allocation_month");--> statement-breakpoint
CREATE INDEX "idx_recipe_type_categories_tier" ON "recipe_type_categories" USING btree ("tier_level");--> statement-breakpoint
CREATE INDEX "idx_recipe_type_categories_seasonal" ON "recipe_type_categories" USING btree ("is_seasonal");--> statement-breakpoint
CREATE INDEX "shared_meal_plans_meal_plan_id_idx" ON "shared_meal_plans" USING btree ("meal_plan_id");--> statement-breakpoint
CREATE INDEX "shared_meal_plans_share_token_idx" ON "shared_meal_plans" USING btree ("share_token");--> statement-breakpoint
CREATE INDEX "shared_meal_plans_created_by_idx" ON "shared_meal_plans" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "shared_meal_plans_expires_at_idx" ON "shared_meal_plans" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "shared_meal_plans_is_active_idx" ON "shared_meal_plans" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "shared_meal_plans_one_active_per_plan" ON "shared_meal_plans" USING btree ("meal_plan_id");--> statement-breakpoint
CREATE INDEX "idx_subscription_items_subscription_id" ON "subscription_items" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "idx_subscription_items_kind" ON "subscription_items" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "idx_tier_usage_tracking_trainer_id" ON "tier_usage_tracking" USING btree ("trainer_id");--> statement-breakpoint
CREATE INDEX "idx_tier_usage_tracking_trainer_period" ON "tier_usage_tracking" USING btree ("trainer_id","period_start","period_end");--> statement-breakpoint
CREATE INDEX "idx_tier_usage_tracking_period_end" ON "tier_usage_tracking" USING btree ("trainer_id","period_end");--> statement-breakpoint
CREATE INDEX "idx_branding_trainer_id" ON "trainer_branding_settings" USING btree ("trainer_id");--> statement-breakpoint
CREATE INDEX "idx_branding_white_label" ON "trainer_branding_settings" USING btree ("white_label_enabled");--> statement-breakpoint
CREATE INDEX "idx_branding_custom_domain" ON "trainer_branding_settings" USING btree ("custom_domain");--> statement-breakpoint
CREATE INDEX "idx_trainer_subscriptions_trainer_id" ON "trainer_subscriptions" USING btree ("trainer_id");--> statement-breakpoint
CREATE INDEX "idx_trainer_subscriptions_trainer_period" ON "trainer_subscriptions" USING btree ("trainer_id","current_period_end");--> statement-breakpoint
CREATE INDEX "idx_trainer_subscriptions_status" ON "trainer_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "user_activity_sessions_user_id_idx" ON "user_activity_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_activity_sessions_session_id_idx" ON "user_activity_sessions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "user_activity_sessions_start_time_idx" ON "user_activity_sessions" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "idx_webhook_events_event_id" ON "webhook_events" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_events_status_created" ON "webhook_events" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "collection_followers_collection_idx" ON "collection_followers" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "collection_followers_follower_idx" ON "collection_followers" USING btree ("follower_id");--> statement-breakpoint
CREATE INDEX "collection_followers_unique_idx" ON "collection_followers" USING btree ("collection_id","follower_id");--> statement-breakpoint
CREATE INDEX "favorite_collections_user_idx" ON "favorite_collections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "favorite_collections_public_idx" ON "favorite_collections" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "favorite_collections_name_idx" ON "favorite_collections" USING btree ("name");--> statement-breakpoint
ALTER TABLE "branding_audit_log" ADD CONSTRAINT "branding_audit_log_trainer_id_users_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_branding_audit_trainer" ON "branding_audit_log" USING btree ("trainer_id","changed_at");--> statement-breakpoint
CREATE INDEX "idx_branding_audit_action" ON "branding_audit_log" USING btree ("action","changed_at");--> statement-breakpoint
CREATE INDEX "idx_recipes_tier_level" ON "recipes" USING btree ("tier_level");--> statement-breakpoint
CREATE INDEX "idx_recipes_tier_approved" ON "recipes" USING btree ("tier_level","is_approved");--> statement-breakpoint
CREATE INDEX "idx_recipes_seasonal" ON "recipes" USING btree ("is_seasonal");--> statement-breakpoint
CREATE INDEX "idx_recipes_allocated_month" ON "recipes" USING btree ("allocated_month");--> statement-breakpoint
ALTER TABLE "branding_audit_log" DROP COLUMN "customer_id";--> statement-breakpoint
ALTER TABLE "branding_audit_log" DROP COLUMN "goal_type";--> statement-breakpoint
ALTER TABLE "branding_audit_log" DROP COLUMN "goal_name";--> statement-breakpoint
ALTER TABLE "branding_audit_log" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "branding_audit_log" DROP COLUMN "target_value";--> statement-breakpoint
ALTER TABLE "branding_audit_log" DROP COLUMN "target_unit";--> statement-breakpoint
ALTER TABLE "branding_audit_log" DROP COLUMN "current_value";--> statement-breakpoint
ALTER TABLE "branding_audit_log" DROP COLUMN "starting_value";--> statement-breakpoint
ALTER TABLE "branding_audit_log" DROP COLUMN "start_date";--> statement-breakpoint
ALTER TABLE "branding_audit_log" DROP COLUMN "target_date";--> statement-breakpoint
ALTER TABLE "branding_audit_log" DROP COLUMN "achieved_date";--> statement-breakpoint
ALTER TABLE "branding_audit_log" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "branding_audit_log" DROP COLUMN "progress_percentage";--> statement-breakpoint
ALTER TABLE "branding_audit_log" DROP COLUMN "notes";--> statement-breakpoint
ALTER TABLE "branding_audit_log" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "branding_audit_log" DROP COLUMN "updated_at";