// Test meal plan generation with existing recipe data
async function testMealPlanGeneration() {
  const testData = {
    days: 3,
    mealsPerDay: 3,
    clientName: "Test Client",
    maxPrepTime: 60,
    maxCalories: 800
  };

  try {
    const response = await fetch('http://localhost:5000/api/generate-meal-plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    if (!response.ok) {
      const error = await response.json();
      console.log('Error response:', error);
      return;
    }

    const result = await response.json();
    console.log('Meal plan generated successfully:');
    console.log('Message:', result.message);
    console.log('Days:', result.mealPlan.days);
    console.log('Meals per day:', result.mealPlan.mealsPerDay);
    console.log('Total meals:', result.mealPlan.meals.length);
    console.log('Average daily calories:', result.nutrition.averageDaily.calories);
    console.log('Average daily protein:', result.nutrition.averageDaily.protein + 'g');
    
    // Show first few meals
    console.log('\nFirst few meals:');
    result.mealPlan.meals.slice(0, 3).forEach(meal => {
      console.log(`Day ${meal.day}, Meal ${meal.mealNumber}: ${meal.recipe.name} (${meal.recipe.caloriesKcal} cal)`);
    });

  } catch (error) {
    console.log('Network error:', error.message);
  }
}

// Run the test
testMealPlanGeneration();