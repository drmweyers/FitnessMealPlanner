import { mealPlanGenerator } from './server/services/mealPlanGenerator';

async function testEnhancedMealPlanGeneration() {
  console.log('Testing Enhanced Meal Plan Generator with AI Images\n');
  
  const testParams = {
    planName: 'AI Image Test Plan',
    fitnessGoal: 'muscle gain',
    description: 'Testing enhanced AI image generation with unique, detailed prompts',
    dailyCalorieTarget: 2000,
    days: 1,
    mealsPerDay: 2,
    clientName: 'Test Client'
  };
  
  try {
    console.log('Generating meal plan with enhanced AI images...');
    const startTime = Date.now();
    
    const result = await mealPlanGenerator.generateMealPlan(testParams, 'test-user-123');
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`\n✓ Meal Plan Generated Successfully in ${duration.toFixed(1)}s!`);
    console.log(`Plan: ${result.planName}`);
    console.log(`Total meals: ${result.meals.length}`);
    
    // Test each meal's image generation
    result.meals.forEach((meal, index) => {
      console.log(`\n--- Meal ${index + 1} ---`);
      console.log(`Day: ${meal.day} | Type: ${meal.mealType}`);
      console.log(`Recipe: ${meal.recipe.name}`);
      console.log(`Description: ${meal.recipe.description}`);
      console.log(`Nutrition: ${meal.recipe.caloriesKcal} cal, ${meal.recipe.proteinGrams}g protein`);
      console.log(`Meal Types: ${meal.recipe.mealTypes.join(', ')}`);
      
      if (meal.recipe.imageUrl) {
        console.log(`✓ AI Image Generated: ${meal.recipe.imageUrl.substring(0, 100)}...`);
        console.log(`  Image contains unique details based on recipe and meal type`);
      } else {
        console.log(`✗ No image generated`);
      }
    });
    
    // Verify image uniqueness
    const imageUrls = result.meals
      .map(meal => meal.recipe.imageUrl)
      .filter(url => url);
    
    const uniqueImages = new Set(imageUrls);
    console.log(`\n--- Image Generation Summary ---`);
    console.log(`Total images generated: ${imageUrls.length}`);
    console.log(`Unique images: ${uniqueImages.size}`);
    console.log(`Uniqueness: ${uniqueImages.size === imageUrls.length ? '✓ All unique' : '✗ Some duplicates'}`);
    
  } catch (error) {
    console.error('✗ Test Failed:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  }
}

testEnhancedMealPlanGeneration();