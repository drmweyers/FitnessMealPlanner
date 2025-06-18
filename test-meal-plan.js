import { mealPlanGenerator } from './server/services/mealPlanGenerator.js';

async function testMealPlanGeneration() {
  console.log('Testing meal plan generation with 32 recipes...\n');
  
  const testParams = {
    days: 3,
    mealsPerDay: 3,
    dietaryTags: ['high-protein'],
    maxPrepTime: 20,
    caloriesMin: 300,
    caloriesMax: 500,
    proteinMin: 20
  };
  
  console.log('Test Parameters:');
  console.log(`- Days: ${testParams.days}`);
  console.log(`- Meals per day: ${testParams.mealsPerDay}`);
  console.log(`- Dietary focus: ${testParams.dietaryTags.join(', ')}`);
  console.log(`- Max prep time: ${testParams.maxPrepTime} minutes`);
  console.log(`- Calorie range: ${testParams.caloriesMin}-${testParams.caloriesMax}`);
  console.log(`- Min protein: ${testParams.proteinMin}g\n`);

  try {
    const result = await mealPlanGenerator.generateMealPlan(testParams);
    
    console.log('✓ Meal Plan Generated Successfully!\n');
    console.log('Generated Meal Plan:');
    
    result.mealPlan.days.forEach((day, index) => {
      console.log(`\nDay ${index + 1}:`);
      day.meals.forEach((meal, mealIndex) => {
        console.log(`  Meal ${mealIndex + 1}: ${meal.name}`);
        console.log(`    Calories: ${meal.caloriesKcal} | Protein: ${meal.proteinGrams}g | Prep: ${meal.prepTimeMinutes}min`);
      });
    });
    
    console.log('\nNutritional Summary:');
    console.log(`Total Calories: ${result.nutrition.total.calories}`);
    console.log(`Total Protein: ${result.nutrition.total.protein}g`);
    console.log(`Average Daily Calories: ${result.nutrition.averageDaily.calories}`);
    console.log(`Average Daily Protein: ${result.nutrition.averageDaily.protein}g`);
    
  } catch (error) {
    console.log('✗ Meal Plan Generation Failed:', error.message);
  }
}

testMealPlanGeneration();