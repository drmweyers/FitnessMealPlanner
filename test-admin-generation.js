// Test script to verify admin recipe generation functionality
import { recipeGenerator } from './server/services/recipeGenerator.js';
import { storage } from './server/storage.js';

async function testAdminRecipeGeneration() {
  console.log('Starting admin recipe generation test...');
  
  // Get initial recipe count
  const initialStats = await storage.getRecipeStats();
  console.log(`Initial recipe count: ${initialStats.total}`);
  
  try {
    // Test the recipe generator directly
    console.log('Generating 3 test recipes...');
    await recipeGenerator.generateAndStoreRecipes(3);
    
    // Check new recipe count
    const finalStats = await storage.getRecipeStats();
    console.log(`Final recipe count: ${finalStats.total}`);
    console.log(`Generated: ${finalStats.total - initialStats.total} new recipes`);
    
    // Get the latest recipes
    const latestRecipes = await storage.searchRecipes({
      approved: false,
      limit: 5,
      page: 1
    });
    
    console.log('\nLatest generated recipes:');
    latestRecipes.recipes.forEach(recipe => {
      console.log(`- ${recipe.name} (${recipe.mealTypes?.join(', ')}) - ${recipe.caloriesKcal} cal`);
    });
    
    console.log('\nAdmin recipe generation test completed successfully!');
    
  } catch (error) {
    console.error('Recipe generation failed:', error.message);
    if (error.message.includes('API key')) {
      console.log('Note: OpenAI API key is required for recipe generation');
    }
  }
}

testAdminRecipeGeneration().catch(console.error);