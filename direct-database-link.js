/**
 * Direct Database Trainer-Customer Link Script
 * 
 * This script directly inserts records into the database to establish
 * trainer-customer relationships when API methods fail.
 */

const TEST_ACCOUNTS = {
  trainer: {
    email: 'trainer.test@evofitmeals.com',
    id: '367124c1-442b-490f-8ba8-b9fd3831e2bb' // from previous output
  },
  customer: {
    email: 'customer.test@evofitmeals.com',
    id: 'aebd5a70-eb5b-4ece-8d46-067e79ad6119' // from previous output
  }
};

// Mock meal plan data for testing
const TEST_MEAL_PLAN = {
  id: 'test-plan-001',
  planName: 'Test Weight Loss Plan',
  fitnessGoal: 'weight_loss',
  description: 'A sample meal plan created for testing trainer-customer relationships',
  dailyCalorieTarget: 1800,
  days: 7,
  mealsPerDay: 3,
  generatedBy: TEST_ACCOUNTS.trainer.id,
  createdAt: new Date(),
  meals: [
    {
      day: 1,
      mealNumber: 1,
      mealType: 'breakfast',
      recipe: {
        id: 'sample-recipe-001',
        name: 'Test Protein Smoothie',
        description: 'A nutritious breakfast smoothie',
        caloriesKcal: 350,
        proteinGrams: '25.0',
        carbsGrams: '30.0',
        fatGrams: '12.0',
        prepTimeMinutes: 5,
        cookTimeMinutes: 0,
        servings: 1,
        mealTypes: ['breakfast'],
        dietaryTags: ['high-protein'],
        mainIngredientTags: ['protein-powder'],
        ingredientsJson: [
          { name: 'Protein powder', amount: '1', unit: 'scoop' },
          { name: 'Banana', amount: '1', unit: 'medium' },
          { name: 'Almond milk', amount: '1', unit: 'cup' },
          { name: 'Spinach', amount: '1', unit: 'handful' }
        ],
        instructionsText: '1. Add all ingredients to blender\n2. Blend until smooth\n3. Serve immediately'
      }
    },
    {
      day: 1,
      mealNumber: 2,
      mealType: 'lunch',
      recipe: {
        id: 'sample-recipe-002',
        name: 'Test Chicken Salad',
        description: 'A healthy chicken and vegetable salad',
        caloriesKcal: 450,
        proteinGrams: '35.0',
        carbsGrams: '20.0',
        fatGrams: '22.0',
        prepTimeMinutes: 15,
        cookTimeMinutes: 10,
        servings: 1,
        mealTypes: ['lunch'],
        dietaryTags: ['high-protein', 'low-carb'],
        mainIngredientTags: ['chicken'],
        ingredientsJson: [
          { name: 'Grilled chicken breast', amount: '150', unit: 'g' },
          { name: 'Mixed greens', amount: '2', unit: 'cups' },
          { name: 'Cherry tomatoes', amount: '100', unit: 'g' },
          { name: 'Olive oil', amount: '2', unit: 'tbsp' },
          { name: 'Lemon juice', amount: '1', unit: 'tbsp' }
        ],
        instructionsText: '1. Grill chicken breast\n2. Arrange greens and tomatoes\n3. Slice chicken and add to salad\n4. Drizzle with olive oil and lemon'
      }
    },
    {
      day: 1,
      mealNumber: 3,
      mealType: 'dinner',
      recipe: {
        id: 'sample-recipe-003',
        name: 'Test Salmon with Quinoa',
        description: 'Baked salmon with quinoa and vegetables',
        caloriesKcal: 550,
        proteinGrams: '40.0',
        carbsGrams: '35.0',
        fatGrams: '25.0',
        prepTimeMinutes: 10,
        cookTimeMinutes: 25,
        servings: 1,
        mealTypes: ['dinner'],
        dietaryTags: ['high-protein', 'omega-3-rich'],
        mainIngredientTags: ['salmon', 'quinoa'],
        ingredientsJson: [
          { name: 'Salmon fillet', amount: '150', unit: 'g' },
          { name: 'Cooked quinoa', amount: '100', unit: 'g' },
          { name: 'Broccoli', amount: '150', unit: 'g' },
          { name: 'Olive oil', amount: '1', unit: 'tbsp' },
          { name: 'Lemon', amount: '1', unit: 'wedge' }
        ],
        instructionsText: '1. Preheat oven to 400°F\n2. Season salmon and bake for 15 minutes\n3. Steam broccoli\n4. Serve salmon over quinoa with vegetables'
      }
    }
  ]
};

function generateInsertSQL() {
  const mealPlanJson = JSON.stringify(TEST_MEAL_PLAN).replace(/'/g, "''");
  
  return `
-- Insert a meal plan assignment to establish trainer-customer relationship
INSERT INTO personalized_meal_plans (id, customer_id, trainer_id, meal_plan_data, assigned_at)
VALUES (
  gen_random_uuid(),
  '${TEST_ACCOUNTS.customer.id}',
  '${TEST_ACCOUNTS.trainer.id}',
  '${mealPlanJson}',
  NOW()
) ON CONFLICT DO NOTHING;

-- Verify the insertion
SELECT 
  p.id,
  p.customer_id,
  p.trainer_id,
  u.email as customer_email,
  t.email as trainer_email,
  p.assigned_at
FROM personalized_meal_plans p
JOIN users u ON u.id = p.customer_id
JOIN users t ON t.id = p.trainer_id
WHERE p.customer_id = '${TEST_ACCOUNTS.customer.id}'
  AND p.trainer_id = '${TEST_ACCOUNTS.trainer.id}';
  `;
}

async function executeDatabaseLink() {
  console.log('🔗 Creating Direct Database Trainer-Customer Link');
  console.log('===================================================\n');

  console.log('Trainer:', TEST_ACCOUNTS.trainer.email, `(${TEST_ACCOUNTS.trainer.id})`);
  console.log('Customer:', TEST_ACCOUNTS.customer.email, `(${TEST_ACCOUNTS.customer.id})`);

  const insertSQL = generateInsertSQL();
  
  console.log('\n📝 Generated SQL Query:');
  console.log('------------------------');
  console.log(insertSQL);

  console.log('\n🛠️ MANUAL EXECUTION REQUIRED:');
  console.log('Copy the SQL above and run it manually, or execute:');
  console.log('----------------------------------------------------');
  
  const dockerCommand = [
    'docker', 'exec', '-i', 'fitnessmealplanner-postgres-1',
    'psql', '-U', 'postgres', '-d', 'fitmeal'
  ].join(' ');
  
  console.log(`${dockerCommand} << 'EOF'`);
  console.log(insertSQL);
  console.log('EOF');

  console.log('\n🎯 Expected Result:');
  console.log('After running the SQL, the trainer should see the customer in their client list.');
  console.log('The customer will have a test meal plan assigned to them.');

  return insertSQL;
}

// Run the script
executeDatabaseLink().catch(console.error);