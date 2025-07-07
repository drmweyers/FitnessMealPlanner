CREATE TABLE IF NOT EXISTS "personalized_meal_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"trainer_id" uuid NOT NULL,
	"meal_plan_data" jsonb NOT NULL,
	"assigned_at" timestamp DEFAULT now(),
	CONSTRAINT "personalized_meal_plans_customer_id_users_id_fk" FOREIGN KEY("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "personalized_meal_plans_trainer_id_users_id_fk" FOREIGN KEY("trainer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
); 