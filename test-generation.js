// Direct test of the recipe generation service
const { recipeGenerator } = require('./server/services/recipeGenerator.js');

async function testGeneration() {
  console.log('Testing recipe generation service...');
  
  try {
    // Test with 2 recipes to avoid long wait times
    console.log('Starting generation of 2 test recipes...');
    await recipeGenerator.generateAndStoreRecipes(2);
    console.log('Generation completed successfully!');
  } catch (error) {
    console.log('Generation failed:', error.message);
    
    if (error.message.includes('API key') || error.message.includes('OpenAI')) {
      console.log('OpenAI API key issue detected');
    } else if (error.message.includes('database') || error.message.includes('storage')) {
      console.log('Database connection issue detected');
    } else {
      console.log('Unexpected error:', error.stack);
    }
  }
}

testGeneration();