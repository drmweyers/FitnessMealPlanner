-- Recipe Rating and Review System Migration
-- Created: 2025-08-28
-- Purpose: Add comprehensive recipe rating and review functionality

-- Create recipe_ratings table
CREATE TABLE recipe_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    is_helpful BOOLEAN DEFAULT FALSE,
    cooking_difficulty INTEGER CHECK (cooking_difficulty >= 1 AND cooking_difficulty <= 5),
    would_cook_again BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure each user can only rate a recipe once
    UNIQUE(user_id, recipe_id)
);

-- Create recipe_rating_summary table for performance optimization
CREATE TABLE recipe_rating_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE UNIQUE,
    average_rating DECIMAL(3,2) NOT NULL CHECK (average_rating >= 1.00 AND average_rating <= 5.00),
    total_ratings INTEGER DEFAULT 0 NOT NULL,
    total_reviews INTEGER DEFAULT 0 NOT NULL,
    rating_distribution JSONB DEFAULT '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}'::jsonb,
    helpful_count INTEGER DEFAULT 0,
    would_cook_again_count INTEGER DEFAULT 0,
    average_difficulty DECIMAL(3,2),
    last_updated TIMESTAMP DEFAULT NOW()
);

-- Create rating_helpfulness table for community moderation
CREATE TABLE rating_helpfulness (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating_id UUID NOT NULL REFERENCES recipe_ratings(id) ON DELETE CASCADE,
    is_helpful BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure each user can only vote once per rating
    UNIQUE(user_id, rating_id)
);

-- Create indexes for performance
CREATE INDEX recipe_ratings_user_id_idx ON recipe_ratings(user_id);
CREATE INDEX recipe_ratings_recipe_id_idx ON recipe_ratings(recipe_id);
CREATE INDEX recipe_ratings_rating_idx ON recipe_ratings(rating);
CREATE INDEX recipe_ratings_created_at_idx ON recipe_ratings(created_at);

CREATE INDEX recipe_rating_summary_recipe_id_idx ON recipe_rating_summary(recipe_id);
CREATE INDEX recipe_rating_summary_avg_rating_idx ON recipe_rating_summary(average_rating);
CREATE INDEX recipe_rating_summary_total_ratings_idx ON recipe_rating_summary(total_ratings);

CREATE INDEX rating_helpfulness_user_id_idx ON rating_helpfulness(user_id);
CREATE INDEX rating_helpfulness_rating_id_idx ON rating_helpfulness(rating_id);

-- Function to update recipe rating summary
CREATE OR REPLACE FUNCTION update_recipe_rating_summary(recipe_id_param UUID) 
RETURNS VOID AS $$
DECLARE
    avg_rating DECIMAL(3,2);
    total_count INTEGER;
    review_count INTEGER;
    helpful_total INTEGER;
    cook_again_count INTEGER;
    avg_difficulty DECIMAL(3,2);
    distribution JSONB;
BEGIN
    -- Calculate aggregated statistics
    SELECT 
        ROUND(AVG(rating), 2),
        COUNT(*),
        COUNT(*) FILTER (WHERE review_text IS NOT NULL AND review_text != ''),
        COUNT(*) FILTER (WHERE is_helpful = TRUE),
        COUNT(*) FILTER (WHERE would_cook_again = TRUE),
        ROUND(AVG(cooking_difficulty), 2)
    INTO 
        avg_rating, total_count, review_count, helpful_total, cook_again_count, avg_difficulty
    FROM recipe_ratings 
    WHERE recipe_id = recipe_id_param;
    
    -- Calculate rating distribution
    WITH rating_counts AS (
        SELECT 
            rating,
            COUNT(*) as count
        FROM recipe_ratings 
        WHERE recipe_id = recipe_id_param
        GROUP BY rating
    )
    SELECT jsonb_object_agg(rating::TEXT, count)
    INTO distribution
    FROM rating_counts;
    
    -- Ensure all rating levels are represented
    IF distribution IS NULL THEN
        distribution := '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}'::jsonb;
    ELSE
        -- Fill in missing ratings with 0
        FOR i IN 1..5 LOOP
            IF NOT distribution ? i::TEXT THEN
                distribution := jsonb_set(distribution, ARRAY[i::TEXT], '0');
            END IF;
        END LOOP;
    END IF;
    
    -- Insert or update summary
    INSERT INTO recipe_rating_summary (
        recipe_id, 
        average_rating, 
        total_ratings, 
        total_reviews,
        rating_distribution,
        helpful_count,
        would_cook_again_count,
        average_difficulty,
        last_updated
    ) VALUES (
        recipe_id_param,
        COALESCE(avg_rating, 0),
        total_count,
        review_count,
        distribution,
        helpful_total,
        cook_again_count,
        avg_difficulty,
        NOW()
    )
    ON CONFLICT (recipe_id) 
    DO UPDATE SET
        average_rating = COALESCE(EXCLUDED.average_rating, 0),
        total_ratings = EXCLUDED.total_ratings,
        total_reviews = EXCLUDED.total_reviews,
        rating_distribution = EXCLUDED.rating_distribution,
        helpful_count = EXCLUDED.helpful_count,
        would_cook_again_count = EXCLUDED.would_cook_again_count,
        average_difficulty = EXCLUDED.average_difficulty,
        last_updated = NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update summary when ratings change
CREATE OR REPLACE FUNCTION trigger_update_rating_summary() 
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT, UPDATE, DELETE
    IF TG_OP = 'DELETE' THEN
        PERFORM update_recipe_rating_summary(OLD.recipe_id);
        RETURN OLD;
    ELSE
        PERFORM update_recipe_rating_summary(NEW.recipe_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER recipe_ratings_summary_update
    AFTER INSERT OR UPDATE OR DELETE ON recipe_ratings
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_rating_summary();

-- Add updated_at trigger for recipe_ratings
CREATE OR REPLACE FUNCTION update_updated_at_column() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recipe_ratings_updated_at
    BEFORE UPDATE ON recipe_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Initialize rating summaries for existing recipes (optional, for existing data)
-- INSERT INTO recipe_rating_summary (recipe_id, average_rating, total_ratings, total_reviews)
-- SELECT id, 0, 0, 0 FROM recipes 
-- WHERE NOT EXISTS (SELECT 1 FROM recipe_rating_summary WHERE recipe_id = recipes.id);