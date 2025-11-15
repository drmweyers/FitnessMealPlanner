-- Fix favorite_type column casting issue
-- The column appears to be a timestamp type instead of favorite_type enum
-- This migration will drop and recreate the column with the correct type

BEGIN;

-- Ensure the enum type exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'favorite_type') THEN
        CREATE TYPE favorite_type AS ENUM('standard', 'want_to_try', 'made_it', 'love_it');
    END IF;
END $$;

-- Fix the column by dropping and recreating it
DO $$
BEGIN
    -- Check if column exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'recipe_favorites' 
        AND column_name = 'favorite_type'
    ) THEN
        -- Drop the existing column (if it's the wrong type)
        ALTER TABLE recipe_favorites DROP COLUMN favorite_type;
        
        RAISE NOTICE 'Dropped existing favorite_type column';
    END IF;
    
    -- Add the column with the correct enum type
    ALTER TABLE recipe_favorites 
    ADD COLUMN favorite_type favorite_type DEFAULT 'standard'::favorite_type NOT NULL;
    
    RAISE NOTICE 'Successfully created favorite_type column with correct enum type';
END $$;

-- Recreate the index
DROP INDEX IF EXISTS recipe_favorites_type_idx;
CREATE INDEX recipe_favorites_type_idx ON recipe_favorites(favorite_type);

COMMIT;
