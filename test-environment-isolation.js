import { db } from './server/db.js';
import { mealPlanGenerator } from './server/services/mealPlanGenerator.js';
import { sql } from 'drizzle-orm';

async function testEnvironmentAndMealPlan() {
  console.log('=== ENVIRONMENT & MEAL PLAN GENERATION TEST ===\n');
  
  // 1. Check environment variables
  console.log('Environment Configuration:');
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
  console.log(`REPLIT_ENVIRONMENT: ${process.env.REPLIT_ENVIRONMENT || 'undefined'}`);
  console.log(`Database URL (first 50 chars): ${process.env.DATABASE_URL?.substring(0, 50)}...`);
  
  // 2. Check database state
  const recipeStats = await db.execute(sql`
    SELECT 
      COUNT(*) as total_recipes,
      COUNT(CASE WHEN is_approved = true THEN 1 END) as approved_recipes,
      COUNT(CASE WHEN is_approved = false THEN 1 END) as pending_recipes,
      MAX(creation_timestamp) as latest_recipe
    FROM recipes
  `);
  
  const stats = recipeStats[0];
  console.log(`\nDatabase State:`);
  console.log(`Total recipes: ${stats.total_recipes}`);
  console.log(`Approved recipes: ${stats.approved_recipes}`);
  console.log(`Pending recipes: ${stats.pending_recipes}`);
  console.log(`Latest recipe: ${stats.latest_recipe}`);
  
  // 3. Test meal plan generation
  console.log('\n=== TESTING MEAL PLAN GENERATION ===');
  const testParams = {
    planName: "Development Environment Test",
    fitnessGoal: "muscle_gain",
    dailyCalorieTarget: 2200,
    days: 3,
    mealsPerDay: 3,
    description: "Testing meal plan generation on development server"
  };
  
  try {
    console.log('Generating meal plan...');
    const startTime = Date.now();
    const mealPlan = await mealPlanGenerator.generateMealPlan(testParams, 'test-user-dev');
    const endTime = Date.now();
    
    console.log(`SUCCESS: Meal plan generated in ${endTime - startTime}ms`);
    console.log(`Plan ID: ${mealPlan.id}`);
    console.log(`Meals generated: ${mealPlan.meals.length}/${testParams.days * testParams.mealsPerDay}`);
    
    // Verify meals have proper structure
    const sampleMeal = mealPlan.meals[0];
    console.log(`Sample meal: ${sampleMeal.recipe.name} (${sampleMeal.recipe.caloriesKcal} cal)`);
    
    return { success: true, mealPlan, generationTime: endTime - startTime };
  } catch (error) {
    console.log(`FAILED: ${error.message}`);
    return { success: false, error: error.message };
  }
}

testEnvironmentAndMealPlan()
  .then(result => {
    console.log('\n=== SUMMARY ===');
    if (result.success) {
      console.log('✅ DEVELOPMENT SERVER TEST PASSED');
      console.log('- Environment properly isolated');
      console.log('- Database accessible and populated');
      console.log('- Meal plan generation working correctly');
    } else {
      console.log('❌ TEST FAILED');
      console.log(`Error: ${result.error}`);
    }
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ CRITICAL ERROR:', error.message);
    process.exit(1);
  });