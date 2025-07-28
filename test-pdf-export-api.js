/**
 * Test script for PDF export API
 * 
 * This script tests the PDF export functionality by making a request to the API
 * with sample meal plan data.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sample meal plan data for testing
const sampleMealPlan = {
  mealPlanData: {
    id: "test-plan-123",
    planName: "7-Day Muscle Building Plan",
    fitnessGoal: "muscle_building",
    description: "A comprehensive meal plan designed for muscle growth and strength gains",
    dailyCalorieTarget: 2800,
    days: 7,
    mealsPerDay: 5,
    meals: [
      {
        day: 1,
        mealNumber: 1,
        mealType: "breakfast",
        recipe: {
          id: "recipe-1",
          name: "Protein Power Oatmeal",
          description: "High-protein oatmeal with berries and nuts",
          caloriesKcal: 450,
          proteinGrams: "35",
          carbsGrams: "55",
          fatGrams: "12",
          prepTimeMinutes: 15,
          servings: 1,
          mealTypes: ["breakfast"],
          dietaryTags: ["high-protein", "vegetarian"],
          ingredientsJson: [
            { name: "Rolled oats", amount: "1", unit: "cup" },
            { name: "Protein powder", amount: "1", unit: "scoop" },
            { name: "Blueberries", amount: "0.5", unit: "cup" },
            { name: "Almond butter", amount: "2", unit: "tbsp" },
            { name: "Chia seeds", amount: "1", unit: "tbsp" }
          ],
          instructionsText: "1. Cook oats according to package directions. 2. Stir in protein powder while hot. 3. Top with berries, almond butter, and chia seeds. 4. Serve immediately."
        }
      },
      {
        day: 1,
        mealNumber: 2,
        mealType: "lunch",
        recipe: {
          id: "recipe-2",
          name: "Grilled Chicken Quinoa Bowl",
          description: "Balanced meal with lean protein and complex carbs",
          caloriesKcal: 550,
          proteinGrams: "45",
          carbsGrams: "50",
          fatGrams: "15",
          prepTimeMinutes: 30,
          servings: 1,
          mealTypes: ["lunch", "dinner"],
          dietaryTags: ["high-protein", "gluten-free"],
          ingredientsJson: [
            { name: "Chicken breast", amount: "6", unit: "oz" },
            { name: "Quinoa", amount: "1", unit: "cup" },
            { name: "Broccoli", amount: "2", unit: "cups" },
            { name: "Olive oil", amount: "1", unit: "tbsp" },
            { name: "Lemon", amount: "1", unit: "whole" }
          ],
          instructionsText: "1. Season and grill chicken breast. 2. Cook quinoa according to package. 3. Steam broccoli until tender. 4. Combine all ingredients and drizzle with olive oil and lemon juice."
        }
      }
    ]
  },
  customerName: "John Doe",
  options: {
    includeShoppingList: true,
    includeMacroSummary: true,
    includeRecipePhotos: false,
    orientation: "portrait",
    pageSize: "A4"
  }
};

// Function to test PDF export
async function testPdfExport() {
  try {
    console.log('Testing PDF export API...');
    
    // Using test endpoint that doesn't require authentication
    const response = await fetch('http://localhost:5000/api/pdf/test-export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sampleMealPlan)
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('API Error:', error);
      return;
    }

    // Save the PDF
    const buffer = await response.arrayBuffer();
    const outputPath = path.join(__dirname, 'test-output.pdf');
    fs.writeFileSync(outputPath, Buffer.from(buffer));
    
    console.log(`✅ PDF generated successfully! Saved to: ${outputPath}`);
    console.log(`File size: ${(buffer.byteLength / 1024).toFixed(2)} KB`);
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testPdfExport();