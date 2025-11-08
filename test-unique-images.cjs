/**
 * Test script to verify unique image generation for meal cards
 *
 * This tests the fix for ensuring each meal card has a unique image,
 * even when the same recipe appears multiple times in a meal plan.
 */

// Native fetch is available in Node 18+

const API_BASE = 'http://localhost:4000';
const TEST_CREDENTIALS = {
  trainer: {
    email: 'trainer.test@evofitmeals.com',
    password: 'TestTrainer123!'
  }
};

async function login() {
  console.log('🔐 Logging in as trainer...');
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(TEST_CREDENTIALS.trainer)
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.statusText}`);
  }

  const data = await response.json();
  console.log('✅ Logged in successfully');
  return data.user;
}

async function generateMealPlan(token) {
  console.log('\n📋 Generating test meal plan...');

  const mealPlanParams = {
    planName: "Unique Image Test Plan",
    fitnessGoal: "muscle gain",
    description: "Test plan to verify unique images",
    dailyCalorieTarget: 2000,
    days: 3,
    mealsPerDay: 3,
    clientName: "Test Client",
    maxIngredients: 0,
    generateMealPrep: false
  };

  const response = await fetch(`${API_BASE}/api/meal-plans/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `connect.sid=${token}`
    },
    body: JSON.stringify(mealPlanParams)
  });

  if (!response.ok) {
    throw new Error(`Meal plan generation failed: ${response.statusText}`);
  }

  const mealPlan = await response.json();
  console.log('✅ Meal plan generated successfully');
  console.log(`   Plan: ${mealPlan.planName}`);
  console.log(`   Days: ${mealPlan.days}`);
  console.log(`   Meals: ${mealPlan.meals.length} total meals`);

  return mealPlan;
}

function analyzeImageUniqueness(mealPlan) {
  console.log('\n🔍 Analyzing image uniqueness...\n');

  const imageUrls = mealPlan.meals.map(meal => meal.recipe.imageUrl);
  const uniqueImages = new Set(imageUrls);

  console.log(`Total meals: ${mealPlan.meals.length}`);
  console.log(`Unique images: ${uniqueImages.size}`);
  console.log(`Duplicate images: ${mealPlan.meals.length - uniqueImages.size}\n`);

  // Check for same recipe appearing multiple times
  const recipeCount = {};
  mealPlan.meals.forEach(meal => {
    const recipeId = meal.recipe.id;
    recipeCount[recipeId] = (recipeCount[recipeId] || 0) + 1;
  });

  const duplicateRecipes = Object.entries(recipeCount).filter(([_, count]) => count > 1);

  if (duplicateRecipes.length > 0) {
    console.log('📊 Recipes appearing multiple times:');
    duplicateRecipes.forEach(([recipeId, count]) => {
      const recipeName = mealPlan.meals.find(m => m.recipe.id === recipeId).recipe.name;
      const recipeImages = mealPlan.meals
        .filter(m => m.recipe.id === recipeId)
        .map(m => m.recipe.imageUrl);

      const uniqueImagesForRecipe = new Set(recipeImages).size;

      console.log(`   • "${recipeName}": appears ${count}x, ${uniqueImagesForRecipe} unique images`);

      if (uniqueImagesForRecipe < count) {
        console.log(`     ⚠️  WARNING: Same recipe using duplicate images!`);
      } else {
        console.log(`     ✅ Each instance has a unique image`);
      }
    });
  } else {
    console.log('✅ No duplicate recipes in this meal plan');
  }

  // Display all meal images
  console.log('\n📸 Image URLs by day and meal:');
  for (let day = 1; day <= mealPlan.days; day++) {
    const dayMeals = mealPlan.meals.filter(m => m.day === day);
    console.log(`\n   Day ${day}:`);
    dayMeals.forEach(meal => {
      const imagePreview = meal.recipe.imageUrl.length > 60
        ? meal.recipe.imageUrl.substring(0, 60) + '...'
        : meal.recipe.imageUrl;
      console.log(`      ${meal.mealType}: ${meal.recipe.name}`);
      console.log(`         ${imagePreview}`);
    });
  }

  // Final verdict
  console.log('\n' + '='.repeat(70));
  if (uniqueImages.size === mealPlan.meals.length) {
    console.log('✅ SUCCESS: All meal cards have unique images!');
  } else if (uniqueImages.size >= mealPlan.meals.length * 0.9) {
    console.log('⚠️  PARTIAL: Most meal cards have unique images (90%+)');
  } else {
    console.log('❌ FAILURE: Many duplicate images detected');
  }
  console.log('='.repeat(70));
}

async function main() {
  try {
    console.log('🧪 Testing Unique Image Generation for Meal Cards\n');
    console.log('This test verifies that each meal card gets a unique image,');
    console.log('even when the same recipe appears multiple times in a plan.\n');

    const user = await login();
    const token = user.token || user.id; // Adjust based on actual auth implementation

    const mealPlan = await generateMealPlan(token);
    analyzeImageUniqueness(mealPlan);

    console.log('\n✅ Test completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

main();
