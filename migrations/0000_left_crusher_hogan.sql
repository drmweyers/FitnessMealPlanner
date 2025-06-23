CREATE TYPE "public"."user_role" AS ENUM('admin', 'trainer', 'customer');--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"meal_types" jsonb DEFAULT '[]'::jsonb,
	"dietary_tags" jsonb DEFAULT '[]'::jsonb,
	"main_ingredient_tags" jsonb DEFAULT '[]'::jsonb,
	"ingredients_json" jsonb NOT NULL,
	"instructions_text" text NOT NULL,
	"prep_time_minutes" integer NOT NULL,
	"cook_time_minutes" integer NOT NULL,
	"servings" integer NOT NULL,
	"calories_kcal" integer NOT NULL,
	"protein_grams" numeric(5, 2) NOT NULL,
	"carbs_grams" numeric(5, 2) NOT NULL,
	"fat_grams" numeric(5, 2) NOT NULL,
	"image_url" varchar(500),
	"source_reference" varchar(255),
	"creation_timestamp" timestamp DEFAULT now(),
	"last_updated_timestamp" timestamp DEFAULT now(),
	"is_approved" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"password" text NOT NULL,
	"role" "user_role" DEFAULT 'customer' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;