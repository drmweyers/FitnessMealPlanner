-- Migration: Create customer_invitations table
-- This table stores invitation tokens that trainers send to customers

CREATE TABLE IF NOT EXISTS "customer_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trainer_id" uuid NOT NULL,
	"customer_email" varchar(255) NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "customer_invitations_token_unique" UNIQUE("token")
);

-- Add foreign key constraint to trainer
ALTER TABLE "customer_invitations" 
ADD CONSTRAINT "customer_invitations_trainer_id_users_id_fk" 
FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE cascade;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_customer_invitations_trainer_id" ON "customer_invitations" ("trainer_id");
CREATE INDEX IF NOT EXISTS "idx_customer_invitations_token" ON "customer_invitations" ("token");
CREATE INDEX IF NOT EXISTS "idx_customer_invitations_expires_at" ON "customer_invitations" ("expires_at");
CREATE INDEX IF NOT EXISTS "idx_customer_invitations_customer_email" ON "customer_invitations" ("customer_email");

-- Update journal
INSERT INTO "__drizzle_migrations" ("hash", "created_at") 
VALUES ('0004_create_customer_invitations', NOW())
ON CONFLICT DO NOTHING;