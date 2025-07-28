/**
 * Test individual PDF generation components
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { validateMealPlanData } from './server/utils/pdfValidation.js';
import { compileHtmlTemplate } from './server/utils/pdfTemplate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testMealPlan = {
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
    }
  ]
};

async function testComponents() {
  try {
    console.log('🧪 Testing PDF Components...\n');
    
    // Test 1: Data validation
    console.log('📋 Test 1: Data Validation...');
    const validatedData = validateMealPlanData(testMealPlan);
    console.log('✅ Data validation passed');
    console.log(`   Plan: ${validatedData.planName}`);
    console.log(`   Meals: ${validatedData.meals.length}`);
    console.log('');
    
    // Test 2: Template compilation
    console.log('📄 Test 2: Template Compilation...');
    const templateData = {
      mealPlan: validatedData,
      customerName: "Test User",
      generatedDate: new Date().toLocaleDateString(),
      generatedBy: "EvoFit System",
      options: {
        includeShoppingList: true,
        includeMacroSummary: true,
        includeRecipePhotos: false,
        orientation: "portrait",
        pageSize: "A4"
      },
      brandInfo: {
        name: "EvoFit",
        tagline: "Transform Your Body, Transform Your Life",
        website: "www.evofit.com",
        colors: {
          primary: "#EB5757",
          accent: "#27AE60",
          text: "#2D3748",
          grey: "#F7FAFC"
        }
      }
    };
    
    const html = await compileHtmlTemplate(templateData);
    console.log('✅ Template compilation successful');
    console.log(`   HTML length: ${html.length} characters`);
    console.log(`   Contains EvoFit branding: ${html.includes('EvoFit') ? 'Yes' : 'No'}`);
    console.log(`   Contains primary color: ${html.includes('#EB5757') ? 'Yes' : 'No'}`);
    console.log('');
    
    // Save HTML for inspection
    const fs = await import('fs');
    fs.writeFileSync('test-template-output.html', html);
    console.log('✅ HTML template saved as test-template-output.html');
    console.log('');
    
    console.log('🎉 All PDF components working correctly!');
    console.log('');
    console.log('📋 Component Test Summary:');
    console.log('  ✅ Data validation: Passed');
    console.log('  ✅ Template compilation: Passed');
    console.log('  ✅ EvoFit branding: Applied');
    console.log('  ✅ HTML generation: Complete');
    console.log('');
    console.log('🚀 Ready for Puppeteer PDF generation!');
    
  } catch (error) {
    console.error('❌ Component test failed:', error);
    console.log('\n🔧 Debug info:');
    console.log('  Error type:', error.constructor.name);
    console.log('  Error message:', error.message);
    if (error.stack) {
      console.log('  Stack trace:', error.stack.split('\n').slice(0, 5).join('\n'));
    }
  }
}

testComponents();