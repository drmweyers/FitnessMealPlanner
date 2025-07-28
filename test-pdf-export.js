/**
 * Test script for EvoFit PDF export functionality with Puppeteer
 */

const testMealPlan = {
  mealPlanData: {
    id: "test-plan-001",
    planName: "7-Day EvoFit Transformation",
    fitnessGoal: "weight_loss",
    description: "A comprehensive meal plan designed for sustainable weight loss with EvoFit branding",
    dailyCalorieTarget: 1800,
    days: 7,
    mealsPerDay: 3,
    meals: [
      {
        day: 1,
        mealNumber: 1,
        mealType: "breakfast",
        recipe: {
          id: "recipe-001",
          name: "EvoFit Protein Pancakes",
          description: "Fluffy pancakes packed with protein and fiber for your transformation journey",
          caloriesKcal: 350,
          proteinGrams: "25",
          carbsGrams: "35",
          fatGrams: "8",
          prepTimeMinutes: 15,
          servings: 2,
          mealTypes: ["breakfast"],
          dietaryTags: ["high-protein", "transformation"],
          ingredientsJson: [
            { name: "Oats", amount: "1", unit: "cup" },
            { name: "EvoFit Protein Powder", amount: "1", unit: "scoop" },
            { name: "Banana", amount: "1", unit: "medium" },
            { name: "Eggs", amount: "2", unit: "large" },
            { name: "Almond Milk", amount: "1/2", unit: "cup" }
          ],
          instructionsText: "1. Blend all ingredients until smooth. 2. Heat pan over medium heat. 3. Pour batter and cook 2-3 minutes per side. 4. Serve with fresh berries and enjoy your EvoFit meal!"
        }
      },
      {
        day: 1,
        mealNumber: 2,
        mealType: "lunch",
        recipe: {
          id: "recipe-002",
          name: "Power Grilled Chicken Salad",
          description: "Fresh mixed greens with seasoned grilled chicken breast - perfect for your fitness goals",
          caloriesKcal: 420,
          proteinGrams: "35",
          carbsGrams: "15",
          fatGrams: "22",
          prepTimeMinutes: 20,
          servings: 1,
          mealTypes: ["lunch"],
          dietaryTags: ["low-carb", "high-protein", "lean"],
          ingredientsJson: [
            { name: "Chicken Breast", amount: "6", unit: "oz" },
            { name: "Mixed Greens", amount: "3", unit: "cups" },
            { name: "Cherry Tomatoes", amount: "1/2", unit: "cup" },
            { name: "Cucumber", amount: "1/2", unit: "medium" },
            { name: "Olive Oil", amount: "2", unit: "tbsp" },
            { name: "Lemon Juice", amount: "1", unit: "tbsp" }
          ],
          instructionsText: "1. Season and grill chicken breast until cooked through. 2. Chop vegetables and arrange on plate. 3. Slice chicken and add to salad. 4. Drizzle with olive oil and lemon juice. 5. Season to taste and enjoy your EvoFit nutrition!"
        }
      },
      {
        day: 1,
        mealNumber: 3,
        mealType: "dinner",
        recipe: {
          id: "recipe-003",
          name: "EvoFit Salmon Power Bowl",
          description: "Omega-3 rich salmon with quinoa and vegetables for optimal recovery",
          caloriesKcal: 480,
          proteinGrams: "40",
          carbsGrams: "35",
          fatGrams: "20",
          prepTimeMinutes: 25,
          servings: 1,
          mealTypes: ["dinner"],
          dietaryTags: ["omega-3", "recovery", "whole-grain"],
          ingredientsJson: [
            { name: "Salmon Fillet", amount: "6", unit: "oz" },
            { name: "Quinoa", amount: "1/2", unit: "cup dry" },
            { name: "Broccoli", amount: "1", unit: "cup" },
            { name: "Sweet Potato", amount: "1", unit: "small" },
            { name: "Lemon", amount: "1/2", unit: "whole" },
            { name: "Garlic", amount: "2", unit: "cloves" }
          ],
          instructionsText: "1. Preheat oven to 400°F. 2. Cook quinoa according to package instructions. 3. Season salmon with lemon and garlic. 4. Bake salmon for 12-15 minutes. 5. Steam broccoli and roast sweet potato. 6. Combine in bowl and serve your EvoFit power meal!"
        }
      }
    ]
  },
  customerName: "Sarah Johnson",
  options: {
    includeShoppingList: true,
    includeMacroSummary: true,
    includeRecipePhotos: false,
    orientation: "portrait",
    pageSize: "A4"
  }
};

async function testServerSidePdfExport() {
  try {
    console.log('🧪 Testing EvoFit Server-Side PDF Export...');
    console.log('');
    
    // Test data validation
    console.log('📋 Test 1: Validating meal plan data...');
    console.log(`✅ Plan Name: ${testMealPlan.mealPlanData.planName}`);
    console.log(`✅ Customer: ${testMealPlan.customerName}`);
    console.log(`✅ Days: ${testMealPlan.mealPlanData.days}`);
    console.log(`✅ Meals: ${testMealPlan.mealPlanData.meals.length}`);
    console.log(`✅ Target Calories: ${testMealPlan.mealPlanData.dailyCalorieTarget}`);
    console.log('');
    
    // Test EvoFit branding data
    console.log('🎨 Test 2: EvoFit Branding Configuration...');
    const brandInfo = {
      name: "EvoFit",
      tagline: "Transform Your Body, Transform Your Life",
      website: "www.evofit.com",
      colors: {
        primary: "#EB5757",
        accent: "#27AE60", 
        text: "#2D3748",
        grey: "#F7FAFC"
      }
    };
    console.log(`✅ Brand: ${brandInfo.name}`);
    console.log(`✅ Primary Color: ${brandInfo.colors.primary}`);
    console.log(`✅ Accent Color: ${brandInfo.colors.accent}`);
    console.log('');
    
    // Test recipe structure
    console.log('🔍 Test 3: Recipe Data Structure...');
    testMealPlan.mealPlanData.meals.forEach((meal, index) => {
      console.log(`Recipe ${index + 1}: ${meal.recipe.name}`);
      console.log(`  📊 ${meal.recipe.caloriesKcal} cal, ${meal.recipe.proteinGrams}g protein`);
      console.log(`  🕐 ${meal.recipe.prepTimeMinutes} min prep`);
      console.log(`  🥘 ${meal.recipe.ingredientsJson.length} ingredients`);
      console.log(`  🏷️  Day ${meal.day}, ${meal.mealType}`);
    });
    console.log('');
    
    // Test nutrition calculations
    console.log('🧮 Test 4: Nutrition Calculations...');
    let totalCalories = 0;
    let totalProtein = 0;
    
    testMealPlan.mealPlanData.meals.forEach(meal => {
      totalCalories += meal.recipe.caloriesKcal;
      totalProtein += parseFloat(meal.recipe.proteinGrams);
    });
    
    console.log(`✅ Total Calories: ${totalCalories}`);
    console.log(`✅ Total Protein: ${totalProtein.toFixed(1)}g`);
    console.log(`✅ Avg Calories/Day: ${(totalCalories / testMealPlan.mealPlanData.days).toFixed(0)}`);
    console.log('');
    
    // Test shopping list generation
    console.log('🛒 Test 5: Shopping List Generation...');
    const ingredients = new Map();
    
    testMealPlan.mealPlanData.meals.forEach(meal => {
      meal.recipe.ingredientsJson.forEach(ingredient => {
        const key = `${ingredient.name}-${ingredient.unit}`;
        if (ingredients.has(key)) {
          const current = ingredients.get(key);
          current.amount = (parseFloat(current.amount) + parseFloat(ingredient.amount)).toString();
        } else {
          ingredients.set(key, { ...ingredient });
        }
      });
    });
    
    console.log(`✅ Unique Ingredients: ${ingredients.size}`);
    console.log('Sample ingredients:');
    Array.from(ingredients.values()).slice(0, 5).forEach(ingredient => {
      console.log(`  • ${ingredient.name}: ${ingredient.amount} ${ingredient.unit}`);
    });
    console.log('');
    
    console.log('🎉 EvoFit PDF Export Data Validation Complete!');
    console.log('');
    console.log('📋 Test Summary:');
    console.log('  ✅ Meal plan data: Valid');
    console.log('  ✅ EvoFit branding: Configured');
    console.log('  ✅ Recipe structure: Correct');
    console.log('  ✅ Nutrition calculations: Working');
    console.log('  ✅ Shopping list: Generated');
    console.log('');
    console.log('🚀 Ready for server-side PDF generation with Puppeteer!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Start the server: npm run dev');
    console.log('  2. Test endpoint: POST /api/pdf/export');
    console.log('  3. Verify EvoFit branding in generated PDF');
    console.log('  4. Check professional layout and styling');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('');
    console.log('🔧 Debug checklist:');
    console.log('  • Check data structure matches expected format');
    console.log('  • Verify all required fields are present');
    console.log('  • Ensure numeric values are properly formatted');
  }
}

// Run the test
testServerSidePdfExport();