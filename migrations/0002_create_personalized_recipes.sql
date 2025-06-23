CREATE TABLE IF NOT EXISTS "personalized_recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"trainer_id" uuid NOT NULL,
	"recipe_id" uuid NOT NULL,
	"assigned_at" timestamp DEFAULT now(),
	CONSTRAINT "personalized_recipes_customer_id_users_id_fk" FOREIGN KEY("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "personalized_recipes_trainer_id_users_id_fk" FOREIGN KEY("trainer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "personalized_recipes_recipe_id_recipes_id_fk" FOREIGN KEY("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action
); 