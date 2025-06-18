import { recipeGenerator } from './server/services/recipeGenerator.js';

async function testAdminRecipeGeneration() {
  console.log('Testing admin recipe generation with database storage...\n');
  
  try {
    console.log('Starting generation of 3 test recipes...');
    const result = await recipeGenerator.generateAndStoreRecipes(3);
    
    console.log('\nGeneration Results:');
    console.log(`✓ Successfully stored: ${result.success} recipes`);
    console.log(`✗ Failed to store: ${result.failed} recipes`);
    
    if (result.errors.length > 0) {
      console.log('\nErrors encountered:');
      result.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    console.log('\nAdmin recipe generation test completed');
    
  } catch (error) {
    console.log(`✗ Recipe generation failed: ${error.message}`);
  }
}

testAdminRecipeGeneration();