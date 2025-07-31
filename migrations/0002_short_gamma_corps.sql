CREATE TABLE "customer_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"goal_type" varchar(50) NOT NULL,
	"goal_name" varchar(255) NOT NULL,
	"description" text,
	"target_value" numeric(10, 2),
	"target_unit" varchar(20),
	"current_value" numeric(10, 2),
	"starting_value" numeric(10, 2),
	"start_date" timestamp NOT NULL,
	"target_date" timestamp,
	"achieved_date" timestamp,
	"status" varchar(20) DEFAULT 'active',
	"progress_percentage" integer DEFAULT 0,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "goal_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"milestone_name" varchar(255) NOT NULL,
	"target_value" numeric(10, 2) NOT NULL,
	"achieved_value" numeric(10, 2),
	"achieved_date" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "progress_measurements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"measurement_date" timestamp NOT NULL,
	"weight_kg" numeric(5, 2),
	"weight_lbs" numeric(6, 2),
	"neck_cm" numeric(4, 1),
	"shoulders_cm" numeric(5, 1),
	"chest_cm" numeric(5, 1),
	"waist_cm" numeric(5, 1),
	"hips_cm" numeric(5, 1),
	"bicep_left_cm" numeric(4, 1),
	"bicep_right_cm" numeric(4, 1),
	"thigh_left_cm" numeric(4, 1),
	"thigh_right_cm" numeric(4, 1),
	"calf_left_cm" numeric(4, 1),
	"calf_right_cm" numeric(4, 1),
	"body_fat_percentage" numeric(4, 1),
	"muscle_mass_kg" numeric(5, 2),
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "progress_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"photo_date" timestamp NOT NULL,
	"photo_url" text NOT NULL,
	"thumbnail_url" text,
	"photo_type" varchar(50) NOT NULL,
	"caption" text,
	"is_private" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "customer_goals" ADD CONSTRAINT "customer_goals_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_milestones" ADD CONSTRAINT "goal_milestones_goal_id_customer_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."customer_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_measurements" ADD CONSTRAINT "progress_measurements_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_photos" ADD CONSTRAINT "progress_photos_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customer_goals_customer_id_idx" ON "customer_goals" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customer_goals_status_idx" ON "customer_goals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "goal_milestones_goal_id_idx" ON "goal_milestones" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "progress_measurements_customer_id_idx" ON "progress_measurements" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "progress_measurements_date_idx" ON "progress_measurements" USING btree ("measurement_date");--> statement-breakpoint
CREATE INDEX "progress_photos_customer_id_idx" ON "progress_photos" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "progress_photos_date_idx" ON "progress_photos" USING btree ("photo_date");