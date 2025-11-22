-- Add created_at column to recipe_favorites table
-- This migration adds the created_at column if it doesn't exist
-- It also handles the case where favorite_date exists and can be migrated

BEGIN;

-- Add created_at column if it doesn't exist
DO $$
BEGIN
    -- Check if created_at column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'recipe_favorites' 
        AND column_name = 'created_at'
    ) THEN
        -- If favorite_date exists, use it as the source for created_at
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'recipe_favorites' 
            AND column_name = 'favorite_date'
        ) THEN
            -- Add created_at and populate from favorite_date
            ALTER TABLE recipe_favorites 
            ADD COLUMN created_at timestamp DEFAULT now();
            
            -- Copy data from favorite_date to created_at where created_at is null
            UPDATE recipe_favorites 
            SET created_at = favorite_date 
            WHERE created_at IS NULL AND favorite_date IS NOT NULL;
            
            RAISE NOTICE 'Added created_at column and populated from favorite_date';
        ELSE
            -- No favorite_date, just add created_at with default
            ALTER TABLE recipe_favorites 
            ADD COLUMN created_at timestamp DEFAULT now() NOT NULL;
            
            RAISE NOTICE 'Added created_at column with default value';
        END IF;
    ELSE
        RAISE NOTICE 'created_at column already exists';
    END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'recipe_favorites' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE recipe_favorites 
        ADD COLUMN updated_at timestamp DEFAULT now();
        
        -- Set updated_at to created_at for existing records
        UPDATE recipe_favorites 
        SET updated_at = created_at 
        WHERE updated_at IS NULL AND created_at IS NOT NULL;
        
        RAISE NOTICE 'Added updated_at column';
    ELSE
        RAISE NOTICE 'updated_at column already exists';
    END IF;
END $$;

-- Create index on created_at if it doesn't exist
DROP INDEX IF EXISTS recipe_favorites_created_at_idx;
CREATE INDEX recipe_favorites_created_at_idx ON recipe_favorites(created_at);

COMMIT;

