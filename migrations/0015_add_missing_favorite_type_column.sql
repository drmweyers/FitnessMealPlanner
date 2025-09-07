-- Fix missing favorite_type column in recipe_favorites table
-- This migration adds the favorite_type column if it doesn't exist

-- First, check if the type exists, if not create it
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'favorite_type') THEN
        CREATE TYPE "public"."favorite_type" AS ENUM('standard', 'want_to_try', 'made_it', 'love_it');
    END IF;
END$$;

-- Add the column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'recipe_favorites' 
                   AND column_name = 'favorite_type') THEN
        ALTER TABLE "recipe_favorites" 
        ADD COLUMN "favorite_type" "favorite_type" DEFAULT 'standard' NOT NULL;
    END IF;
END$$;

-- Add index on favorite_type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                   WHERE tablename = 'recipe_favorites' 
                   AND indexname = 'recipe_favorites_type_idx') THEN
        CREATE INDEX "recipe_favorites_type_idx" ON "recipe_favorites" ("favorite_type");
    END IF;
END$$;

-- Add the missing 'favorite_date' column mentioned in the error hint
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'recipe_favorites' 
                   AND column_name = 'favorite_date') THEN
        ALTER TABLE "recipe_favorites" 
        ADD COLUMN "favorite_date" timestamp DEFAULT now();
    END IF;
END$$;