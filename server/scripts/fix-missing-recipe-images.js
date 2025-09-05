/**
 * Fix Missing Recipe Images
 * 
 * This script identifies recipes without images and assigns appropriate
 * placeholder image URLs following the existing pattern in the database.
 */

import { Pool } from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Database connection
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5433/fitmeal";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: false // Using development database
});

// DigitalOcean Spaces base URL (following existing pattern)
const SPACES_BASE_URL = 'https://bci.nyc3.digitaloceanspaces.com/recipe-images';

// Fallback image URLs that match the existing pattern
const FALLBACK_IMAGES = {
  breakfast: [
    `${SPACES_BASE_URL}/breakfast-omelette.jpg`,
    `${SPACES_BASE_URL}/breakfast-pancakes.jpg`,
    `${SPACES_BASE_URL}/breakfast-smoothie.jpg`,
    `${SPACES_BASE_URL}/breakfast-toast.jpg`,
    `${SPACES_BASE_URL}/breakfast-bowl.jpg`
  ],
  lunch: [
    `${SPACES_BASE_URL}/lunch-salad.jpg`,
    `${SPACES_BASE_URL}/lunch-sandwich.jpg`,
    `${SPACES_BASE_URL}/lunch-soup.jpg`,
    `${SPACES_BASE_URL}/lunch-wrap.jpg`,
    `${SPACES_BASE_URL}/lunch-bowl.jpg`
  ],
  dinner: [
    `${SPACES_BASE_URL}/dinner-chicken.jpg`,
    `${SPACES_BASE_URL}/dinner-salmon.jpg`,
    `${SPACES_BASE_URL}/dinner-pasta.jpg`,
    `${SPACES_BASE_URL}/dinner-steak.jpg`,
    `${SPACES_BASE_URL}/dinner-curry.jpg`
  ],
  snack: [
    `${SPACES_BASE_URL}/snack-fruit.jpg`,
    `${SPACES_BASE_URL}/snack-nuts.jpg`,
    `${SPACES_BASE_URL}/snack-yogurt.jpg`,
    `${SPACES_BASE_URL}/snack-smoothie.jpg`,
    `${SPACES_BASE_URL}/snack-bar.jpg`
  ]
};

// Generic fallback for recipes without specific meal type
const GENERIC_IMAGES = [
  `${SPACES_BASE_URL}/healthy-meal-1.jpg`,
  `${SPACES_BASE_URL}/healthy-meal-2.jpg`,
  `${SPACES_BASE_URL}/healthy-meal-3.jpg`,
  `${SPACES_BASE_URL}/healthy-meal-4.jpg`,
  `${SPACES_BASE_URL}/healthy-meal-5.jpg`
];

/**
 * Get appropriate image URL based on recipe name and meal type
 */
function getImageForRecipe(recipe) {
  const { name, meal_types } = recipe;
  const mealTypesArray = Array.isArray(meal_types) ? meal_types : [];
  
  // Determine primary meal type
  let primaryMealType = 'generic';
  if (mealTypesArray.length > 0) {
    // Use first meal type as primary
    primaryMealType = mealTypesArray[0].toLowerCase();
  }
  
  // Get images for the meal type
  const availableImages = FALLBACK_IMAGES[primaryMealType] || GENERIC_IMAGES;
  
  // Use recipe name hash to get consistent image assignment
  const nameHash = name.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  const imageIndex = Math.abs(nameHash) % availableImages.length;
  return availableImages[imageIndex];
}

/**
 * Main function to fix missing recipe images
 */
async function fixMissingRecipeImages() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking for recipes without images...');
    
    // Find recipes missing images
    const missingImagesQuery = `
      SELECT id, name, meal_types, image_url
      FROM recipes 
      WHERE image_url IS NULL OR image_url = '' 
      ORDER BY creation_timestamp ASC
    `;
    
    const result = await client.query(missingImagesQuery);
    const recipesNeedingImages = result.rows;
    
    console.log(`📊 Found ${recipesNeedingImages.length} recipes without images`);
    
    if (recipesNeedingImages.length === 0) {
      console.log('✅ All recipes already have images!');
      return;
    }
    
    // Display recipes that need images
    console.log('\n🍽️  Recipes missing images:');
    recipesNeedingImages.forEach((recipe, index) => {
      console.log(`${index + 1}. ${recipe.name} (${recipe.meal_types?.join(', ') || 'No meal type'})`);
    });
    
    console.log('\n🎨 Assigning images to recipes...');
    
    let updatedCount = 0;
    
    // Update each recipe with an appropriate image
    for (const recipe of recipesNeedingImages) {
      const imageUrl = getImageForRecipe(recipe);
      
      const updateQuery = `
        UPDATE recipes 
        SET image_url = $1, last_updated_timestamp = CURRENT_TIMESTAMP
        WHERE id = $2
      `;
      
      await client.query(updateQuery, [imageUrl, recipe.id]);
      console.log(`✅ Updated "${recipe.name}" with image: ${imageUrl}`);
      updatedCount++;
    }
    
    console.log(`\n🎉 Successfully updated ${updatedCount} recipes with images!`);
    
    // Verify the fix
    const verifyQuery = `
      SELECT 
        COUNT(*) as total_recipes,
        COUNT(CASE WHEN image_url IS NOT NULL AND image_url != '' THEN 1 END) as recipes_with_images,
        COUNT(CASE WHEN image_url IS NULL OR image_url = '' THEN 1 END) as recipes_without_images
      FROM recipes
    `;
    
    const verifyResult = await client.query(verifyQuery);
    const stats = verifyResult.rows[0];
    
    console.log('\n📈 Final Statistics:');
    console.log(`Total recipes: ${stats.total_recipes}`);
    console.log(`Recipes with images: ${stats.recipes_with_images}`);
    console.log(`Recipes without images: ${stats.recipes_without_images}`);
    console.log(`Coverage: ${((stats.recipes_with_images / stats.total_recipes) * 100).toFixed(1)}%`);
    
    if (stats.recipes_without_images === '0') {
      console.log('\n🎯 SUCCESS: All recipes now have images!');
    }
    
  } catch (error) {
    console.error('❌ Error fixing recipe images:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Display current recipe image status
 */
async function showCurrentStatus() {
  const client = await pool.connect();
  
  try {
    console.log('📊 Current Recipe Image Status\n');
    
    // Get overall statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_recipes,
        COUNT(CASE WHEN image_url IS NOT NULL AND image_url != '' THEN 1 END) as with_images,
        COUNT(CASE WHEN image_url IS NULL OR image_url = '' THEN 1 END) as without_images
      FROM recipes
    `;
    
    const statsResult = await client.query(statsQuery);
    const stats = statsResult.rows[0];
    
    console.log(`Total recipes: ${stats.total_recipes}`);
    console.log(`With images: ${stats.with_images}`);
    console.log(`Without images: ${stats.without_images}`);
    console.log(`Coverage: ${((stats.with_images / stats.total_recipes) * 100).toFixed(1)}%\n`);
    
    // Show sample of existing images
    const sampleQuery = `
      SELECT name, image_url 
      FROM recipes 
      WHERE image_url IS NOT NULL AND image_url != ''
      LIMIT 5
    `;
    
    const sampleResult = await client.query(sampleQuery);
    console.log('🖼️  Sample recipes with images:');
    sampleResult.rows.forEach((recipe, index) => {
      console.log(`${index + 1}. ${recipe.name}`);
      console.log(`   ${recipe.image_url}\n`);
    });
    
    // Show recipes without images
    const missingQuery = `
      SELECT name, meal_types
      FROM recipes 
      WHERE image_url IS NULL OR image_url = ''
      ORDER BY name
    `;
    
    const missingResult = await client.query(missingQuery);
    if (missingResult.rows.length > 0) {
      console.log('❌ Recipes missing images:');
      missingResult.rows.forEach((recipe, index) => {
        console.log(`${index + 1}. ${recipe.name} (${recipe.meal_types?.join(', ') || 'No meal type'})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error showing status:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Command line interface
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === __filename;

if (isMainModule) {
  const command = process.argv[2];
  
  if (command === 'status') {
    showCurrentStatus()
      .then(() => {
        console.log('\n✅ Status check complete');
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Status check failed:', error);
        process.exit(1);
      });
  } else {
    fixMissingRecipeImages()
      .then(() => {
        console.log('\n✅ Recipe image fix complete');
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Recipe image fix failed:', error.message);
        process.exit(1);
      });
  }
}

export {
  fixMissingRecipeImages,
  showCurrentStatus,
  getImageForRecipe
};