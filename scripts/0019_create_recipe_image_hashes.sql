-- Migration: Add Recipe Image Hashes Table
-- Purpose: Store perceptual hashes for recipe images to prevent duplicates across sessions
-- Created: 2025-01-16
-- BMAD Phase 3: Perceptual Hashing Implementation

-- Create recipe_image_hashes table for persistent duplicate detection
CREATE TABLE IF NOT EXISTS recipe_image_hashes (
    id SERIAL PRIMARY KEY,
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    perceptual_hash VARCHAR(255) NOT NULL,
    similarity_hash VARCHAR(255),  -- Legacy basic hash (for backward compatibility)
    image_url TEXT NOT NULL,
    dalle_prompt TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on perceptual_hash for fast duplicate lookup
CREATE INDEX idx_recipe_image_hashes_perceptual_hash
    ON recipe_image_hashes(perceptual_hash);

-- Create index on recipe_id for fast recipe lookups
CREATE INDEX idx_recipe_image_hashes_recipe_id
    ON recipe_image_hashes(recipe_id);

-- Create index on created_at for time-based queries
CREATE INDEX idx_recipe_image_hashes_created_at
    ON recipe_image_hashes(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE recipe_image_hashes IS 'Stores perceptual hashes of recipe images to prevent duplicate image generation';
COMMENT ON COLUMN recipe_image_hashes.perceptual_hash IS 'Perceptual hash (pHash) of the image for visual similarity detection';
COMMENT ON COLUMN recipe_image_hashes.similarity_hash IS 'Legacy basic hash based on recipe name + URL (deprecated, kept for backward compatibility)';
COMMENT ON COLUMN recipe_image_hashes.image_url IS 'Full S3/CDN URL of the generated image';
COMMENT ON COLUMN recipe_image_hashes.dalle_prompt IS 'DALL-E 3 prompt used to generate this image';
