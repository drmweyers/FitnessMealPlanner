/**
 * Test different PDF export variations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sample meal plan data
const baseMealPlan = {
  mealPlanData: {
    id: "test-plan-456",
    planName: "Weight Loss Meal Plan",
    fitnessGoal: "weight_loss",
    description: "A balanced meal plan for healthy weight loss",
    dailyCalorieTarget: 1800,
    days: 5,
    mealsPerDay: 4,
    meals: [
      {
        day: 1,
        mealNumber: 1,
        mealType: "breakfast",
        recipe: {
          id: "recipe-breakfast",
          name: "Greek Yogurt Parfait",
          description: "High-protein breakfast with berries",
          caloriesKcal: 300,
          proteinGrams: "25",
          carbsGrams: "30",
          fatGrams: "8",
          prepTimeMinutes: 10,
          servings: 1,
          mealTypes: ["breakfast"],
          dietaryTags: ["high-protein", "vegetarian"],
          ingredientsJson: [
            { name: "Greek yogurt", amount: "1", unit: "cup" },
            { name: "Mixed berries", amount: "0.5", unit: "cup" },
            { name: "Granola", amount: "2", unit: "tbsp" }
          ],
          instructionsText: "1. Layer yogurt in bowl. 2. Add berries. 3. Top with granola."
        }
      },
      {
        day: 1,
        mealNumber: 2,
        mealType: "snack",
        recipe: {
          id: "recipe-snack",
          name: "Apple with Almond Butter",
          description: "Simple and nutritious snack",
          caloriesKcal: 200,
          proteinGrams: "6",
          carbsGrams: "25",
          fatGrams: "8",
          prepTimeMinutes: 2,
          servings: 1,
          mealTypes: ["snack"],
          dietaryTags: ["vegan", "gluten-free"],
          ingredientsJson: [
            { name: "Apple", amount: "1", unit: "medium" },
            { name: "Almond butter", amount: "1", unit: "tbsp" }
          ],
          instructionsText: "1. Slice apple. 2. Serve with almond butter for dipping."
        }
      }
    ]
  },
  customerName: "Jane Smith"
};

// Test variations
const testVariations = [
  {
    name: "minimal-options",
    options: {
      includeShoppingList: false,
      includeMacroSummary: false,
      orientation: "portrait",
      pageSize: "A4"
    }
  },
  {
    name: "landscape-letter",
    options: {
      includeShoppingList: true,
      includeMacroSummary: true,
      orientation: "landscape",
      pageSize: "Letter"
    }
  },
  {
    name: "shopping-only",
    options: {
      includeShoppingList: true,
      includeMacroSummary: false,
      orientation: "portrait",
      pageSize: "A4"
    }
  }
];

async function testPdfVariation(variation) {
  try {
    console.log(`Testing PDF variation: ${variation.name}`);
    
    const requestData = {
      ...baseMealPlan,
      options: variation.options
    };
    
    const response = await fetch('http://localhost:5000/api/pdf/test-export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('API Error:', error);
      return false;
    }

    const buffer = await response.arrayBuffer();
    const outputPath = path.join(__dirname, `test-${variation.name}.pdf`);
    fs.writeFileSync(outputPath, Buffer.from(buffer));
    
    console.log(`✅ ${variation.name}: Generated successfully! Size: ${(buffer.byteLength / 1024).toFixed(2)} KB`);
    return true;
    
  } catch (error) {
    console.error(`❌ ${variation.name}: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('Testing PDF export variations...\n');
  
  let passed = 0;
  let total = testVariations.length;
  
  for (const variation of testVariations) {
    const success = await testPdfVariation(variation);
    if (success) passed++;
    console.log(''); // Empty line for readability
  }
  
  console.log(`\n📊 Test Results: ${passed}/${total} variations passed`);
  
  if (passed === total) {
    console.log('🎉 All PDF export variations working correctly!');
  } else {
    console.log('⚠️  Some PDF export variations failed');
  }
}

runAllTests();