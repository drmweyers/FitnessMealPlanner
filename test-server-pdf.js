/**
 * Quick test to verify server PDF endpoint works
 */

import fetch from 'node-fetch';

const testData = {
  mealPlanData: {
    id: "test-001",
    planName: "EvoFit Test Plan",
    fitnessGoal: "weight_loss",
    description: "Test plan for PDF generation",
    dailyCalorieTarget: 1800,
    days: 1,
    mealsPerDay: 2,
    meals: [
      {
        day: 1,
        mealNumber: 1,
        mealType: "breakfast",
        recipe: {
          id: "recipe-001",
          name: "Test Breakfast",
          description: "A simple test recipe",
          caloriesKcal: 300,
          proteinGrams: "20",
          carbsGrams: "30",
          fatGrams: "10",
          prepTimeMinutes: 10,
          servings: 1,
          mealTypes: ["breakfast"],
          dietaryTags: ["test"],
          ingredientsJson: [
            { name: "Eggs", amount: "2", unit: "large" },
            { name: "Toast", amount: "1", unit: "slice" }
          ],
          instructionsText: "1. Cook eggs. 2. Toast bread. 3. Serve together."
        }
      },
      {
        day: 1,
        mealNumber: 2,
        mealType: "lunch",
        recipe: {
          id: "recipe-002",
          name: "Test Lunch",
          description: "Another test recipe",
          caloriesKcal: 400,
          proteinGrams: "25",
          carbsGrams: "35",
          fatGrams: "15",
          prepTimeMinutes: 15,
          servings: 1,
          mealTypes: ["lunch"],
          dietaryTags: ["test"],
          ingredientsJson: [
            { name: "Chicken", amount: "4", unit: "oz" },
            { name: "Rice", amount: "1/2", unit: "cup" }
          ],
          instructionsText: "1. Cook chicken. 2. Prepare rice. 3. Combine and serve."
        }
      }
    ]
  },
  customerName: "Test User",
  options: {
    includeShoppingList: true,
    includeMacroSummary: true,
    includeRecipePhotos: false,
    orientation: "portrait",
    pageSize: "A4"
  }
};

async function testPdfEndpoint() {
  try {
    console.log('Testing PDF endpoint...');
    
    const response = await fetch('http://localhost:5000/api/pdf/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.get('content-type'));

    if (response.ok) {
      console.log('✅ PDF generation successful!');
      const buffer = await response.buffer();
      console.log('PDF size:', buffer.length, 'bytes');
      
      // Save for inspection
      const fs = await import('fs');
      fs.writeFileSync('test-output.pdf', buffer);
      console.log('✅ PDF saved as test-output.pdf');
    } else {
      const error = await response.text();
      console.log('❌ Error:', error);
    }
    
  } catch (error) {
    console.log('❌ Connection error:', error.message);
    console.log('Make sure the server is running on port 5000');
  }
}

testPdfEndpoint();