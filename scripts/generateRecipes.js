#!/usr/bin/env node

/**
 * Recipe Generation Script for FitMeal Pro
 * 
 * This script generates recipes using OpenAI API and stores them in the database.
 * Usage: node scripts/generateRecipes.js [count]
 */

import { recipeGenerator } from '../server/services/recipeGenerator.js';

const DEFAULT_COUNT = 50;

async function main() {
  const count = parseInt(process.argv[2]) || DEFAULT_COUNT;
  
  console.log(`🚀 Starting recipe generation for ${count} recipes...`);
  console.log('This may take several minutes due to API rate limits.\n');
  
  try {
    const result = await recipeGenerator.generateAndStoreRecipes(count);
    
    console.log('\n✅ Recipe generation completed!');
    console.log(`📊 Results:`);
    console.log(`   ✅ Successfully generated: ${result.success}`);
    console.log(`   ❌ Failed: ${result.failed}`);
    
    if (result.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered:`);
      result.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    console.log('\n🎉 Recipes are now available in the admin dashboard for review!');
    
  } catch (error) {
    console.error('\n❌ Recipe generation failed:', error.message);
    process.exit(1);
  }
}

// Handle script execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}